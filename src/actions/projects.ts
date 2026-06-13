'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

function getMonthsSpanned(startIso: string, endIso: string): string[] {
    const start = new Date(startIso)
    const end = new Date(endIso)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
    
    const months: string[] = []
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    const endLimit = new Date(end.getFullYear(), end.getMonth(), 1)
    
    while (current <= endLimit) {
        const year = current.getFullYear()
        const month = String(current.getMonth() + 1).padStart(2, '0')
        months.push(`${year}-${month}`)
        current.setMonth(current.getMonth() + 1)
    }
    return months
}

export async function getProjects(query?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('projects')
        .select('*, clients(id, full_name, address, status, departure_date, contracts(active)), contractors(full_name, color), quotes(quote_number, total, contractor_id, manager_id, approved_at, contractors(full_name, color), managers(first_name, last_name, team_id))')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects', error)
        return []
    }

    // Fetch all manager teams to manually map them
    const { data: teams } = await supabase
        .from('manager_teams')
        .select('id, name')

    const teamById = new Map((teams || []).map((t: any) => [t.id, t]))
    const mappedData = (data || []).map((project: any) => {
        if (project.quotes && project.quotes.managers) {
            const teamId = project.quotes.managers.team_id
            project.quotes.managers.manager_teams = teamId ? teamById.get(teamId) || null : null
        }
        return project
    })

    if (!query) return mappedData
    const normalized = query.trim().toLowerCase()
    if (!normalized) return mappedData

    return mappedData.filter((project: any) => {
        const clientName = String(project.clients?.full_name || '').toLowerCase()
        const address = String(project.clients?.address || '').toLowerCase()
        const quoteNumber = String(project.quotes?.quote_number || '')
        const title = String(project.title || '').toLowerCase()
        return clientName.includes(normalized) || address.includes(normalized) || quoteNumber.includes(normalized) || title.includes(normalized)
    })
}

export async function updateProjectDates(projectId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    const plannedMonths = getMonthsSpanned(startDate, endDate)

    // if dates are updated via calendar, it becomes 'planned' if it was unplanned
    const { error } = await supabase.from('projects').update({
        start_date: startDate,
        end_date: endDate,
        status: 'planned',
        planned_months: plannedMonths
    }).eq('id', projectId)

    if (error) throw new Error(error.message)

    revalidatePath('/planification')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateProjectStatus(
    projectId: string, 
    status: 'unplanned' | 'planned' | 'in_progress' | 'completed' | 'deferred' | 'cancelled'
) {
    const supabase = await createClient()

    const updates: any = { status }
    if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
    } else {
        updates.completed_at = null
        updates.completed_months = []
    }

    if (status === 'unplanned') {
        updates.start_date = null
        updates.end_date = null
        updates.planned_months = []
    }

    if (status === 'deferred') {
        updates.start_date = null
        updates.end_date = null
        updates.planned_months = []
        updates.contractor_id = null
    }

    const { data: project, error: projectFetchError } = await supabase
        .from('projects')
        .select('quote_id, completed_months')
        .eq('id', projectId)
        .maybeSingle()

    if (projectFetchError) throw new Error(projectFetchError.message)

    if (status === 'completed') {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const existingCompleted = project?.completed_months || []
        if (!existingCompleted.includes(currentMonth)) {
            updates.completed_months = [...existingCompleted, currentMonth]
        }
    }

    const { error } = await supabase.from('projects').update(updates).eq('id', projectId)
    if (error) throw new Error(error.message)

    if (project?.quote_id) {
        let quoteStatus: 'completed' | 'draft' | 'sent' | 'approved' | 'denied' | 'billed' = 'approved'
        if (status === 'completed') quoteStatus = 'completed'
        else if (status === 'cancelled') quoteStatus = 'denied'

        const { error: quoteError } = await supabase
            .from('quotes')
            .update({ status: quoteStatus })
            .eq('id', project.quote_id)

        if (quoteError) throw new Error(quoteError.message)
        revalidatePath(`/quotes/${project.quote_id}`)
    }

    revalidatePath('/planification')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')
    return { success: true }
}


export async function markProjectCompletedByQuote(quoteId: string) {
    const supabase = await createClient()

    const { data: project, error: findError } = await supabase
        .from('projects')
        .select('id, completed_months')
        .eq('quote_id', quoteId)
        .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (!project?.id) throw new Error('Aucun projet lié à cette soumission.')

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const existingCompleted = project?.completed_months || []
    const newCompleted = existingCompleted.includes(currentMonth)
        ? existingCompleted
        : [...existingCompleted, currentMonth]

    const { error } = await supabase
        .from('projects')
        .update({ 
            status: 'completed', 
            completed_at: now.toISOString(),
            completed_months: newCompleted
        })
        .eq('id', project.id)

    if (error) throw new Error(error.message)

    const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'completed' })
        .eq('id', quoteId)

    if (quoteError) throw new Error(quoteError.message)

    revalidatePath('/planification')
    revalidatePath('/analytics')
    revalidatePath(`/quotes/${quoteId}`)
    return { success: true }
}


export async function scheduleProjectStartByQuote(quoteId: string, startDateIso: string) {
    const supabase = await createClient()

    const { data: project, error: findError } = await supabase
        .from('projects')
        .select('id, estimated_duration_days')
        .eq('quote_id', quoteId)
        .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (!project?.id) throw new Error('Aucun projet lié à cette soumission.')

    const durationDays = Math.max(0.01, Number(project.estimated_duration_days || 1))

    const start = new Date(startDateIso)
    if (Number.isNaN(start.getTime())) throw new Error('Date de début invalide.')

    const end = new Date(start.getTime())
    if (durationDays < 1) {
        const durationMinutes = Math.max(15, Math.round(durationDays * 24 * 60))
        end.setTime(start.getTime() + durationMinutes * 60 * 1000)
    } else {
        // Inclusive duration: 1 day => same start/end day
        end.setDate(end.getDate() + (Math.ceil(durationDays) - 1))
    }

    const plannedMonths = getMonthsSpanned(start.toISOString(), end.toISOString())

    const { error } = await supabase
        .from('projects')
        .update({
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            status: 'planned',
            planned_months: plannedMonths,
            completed_at: null,
            completed_months: []
        })
        .eq('id', project.id)

    if (error) throw new Error(error.message)

    revalidatePath('/quotes')
    revalidatePath('/planification')
    return { success: true }
}

export async function getProjectDetails(projectId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            clients (*),
            contractors (*),
            quotes (
                *,
                quote_images (*),
                quote_items (*),
                quote_planning_sections (
                    *,
                    quote_planning_rooms (*)
                )
            )
        `)
        .eq('id', projectId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching project details:', error)
        throw new Error(error.message)
    }

    return data
}

