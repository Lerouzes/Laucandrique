'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProjects() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('projects')
        .select('*, clients(full_name)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects', error)
        return []
    }
    return data
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
    if (status === 'unplanned') {
        updates.start_date = null
        updates.end_date = null
    }

    const { error } = await supabase.from('projects').update(updates).eq('id', projectId)
    if (error) throw new Error(error.message)

    revalidatePath('/planification')
    return { success: true }
}
