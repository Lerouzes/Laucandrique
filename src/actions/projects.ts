'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProjects(query?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('projects')
        .select('*, clients(full_name, address), contractors(full_name, color), quotes(quote_number, total, contractor_id, contractors(full_name, color))')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects', error)
        return []
    }

    if (!query) return data
    const normalized = query.trim().toLowerCase()
    if (!normalized) return data

    return (data || []).filter((project: any) => {
        const clientName = String(project.clients?.full_name || '').toLowerCase()
        const address = String(project.clients?.address || '').toLowerCase()
        const quoteNumber = String(project.quotes?.quote_number || '')
        const title = String(project.title || '').toLowerCase()
        return clientName.includes(normalized) || address.includes(normalized) || quoteNumber.includes(normalized) || title.includes(normalized)
    })
}

export async function updateProjectDates(projectId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    // if dates are updated via calendar, it becomes 'planned' if it was unplanned
    const { error } = await supabase.from('projects').update({
        start_date: startDate,
        end_date: endDate,
        status: 'planned'
    }).eq('id', projectId)

    if (error) throw new Error(error.message)

    revalidatePath('/planification')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateProjectStatus(projectId: string, status: 'unplanned' | 'planned' | 'in_progress' | 'completed') {
    const supabase = await createClient()

    const updates: any = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'unplanned') {
        updates.start_date = null
        updates.end_date = null
    }

    const { data: project, error: projectFetchError } = await supabase
        .from('projects')
        .select('quote_id')
        .eq('id', projectId)
        .maybeSingle()

    if (projectFetchError) throw new Error(projectFetchError.message)

    const { error } = await supabase.from('projects').update(updates).eq('id', projectId)
    if (error) throw new Error(error.message)

    if (project?.quote_id) {
        const quoteStatus = status === 'completed' ? 'completed' : 'approved'
        const { error: quoteError } = await supabase
            .from('quotes')
            .update({ status: quoteStatus })
            .eq('id', project.quote_id)

        if (quoteError) throw new Error(quoteError.message)
        revalidatePath(`/quotes/${project.quote_id}`)
    }

    revalidatePath('/planification')
    return { success: true }
}


export async function markProjectCompletedByQuote(quoteId: string) {
    const supabase = await createClient()

    const { data: project, error: findError } = await supabase
        .from('projects')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (!project?.id) throw new Error('Aucun projet lié à cette soumission.')

    const { error } = await supabase
        .from('projects')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
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


export async function scheduleProjectStartByQuote(quoteId: string, startDate: string) {
    const supabase = await createClient()

    const { data: project, error: findError } = await supabase
        .from('projects')
        .select('id, estimated_duration_days')
        .eq('quote_id', quoteId)
        .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (!project?.id) throw new Error('Aucun projet lié à cette soumission.')

    const durationDays = Math.max(1, Math.ceil(Number(project.estimated_duration_days || 1)))

    const [y, m, d] = String(startDate).split('-').map(Number)
    if (!y || !m || !d) throw new Error('Date de début invalide.')

    // Use UTC midnight from explicit YYYY-MM-DD to avoid timezone shifts.
    const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
    const end = new Date(start)
    // Inclusive duration: 1 day => same start/end day.
    end.setUTCDate(end.getUTCDate() + (durationDays - 1))

    const { error } = await supabase
        .from('projects')
        .update({
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            status: 'planned',
        })
        .eq('id', project.id)

    if (error) throw new Error(error.message)

    revalidatePath('/quotes')
    revalidatePath('/planification')
    return { success: true }
}
