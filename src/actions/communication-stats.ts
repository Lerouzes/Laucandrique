'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCommunicationStatsByClient(clientId: string): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await (supabase
        .from('client_communication_stats' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('analysis_date', { ascending: true }) as any)

    if (error) {
        console.error('Error fetching client communication stats:', error)
        return []
    }

    return (data || []) as any[]
}

export async function saveCommunicationStatsAction(
    clientId: string,
    stats: {
        period_start: string | null
        period_end: string | null
        total_emails: number
        total_phone_calls: number
        total_communications: number
        analysis_summary: any
    }
): Promise<any> {
    const supabase = await createClient()

    if (!clientId) throw new Error("ID du client requis")

    const { data, error } = await (supabase
        .from('client_communication_stats' as any)
        .insert({
            client_id: clientId,
            period_start: stats.period_start,
            period_end: stats.period_end,
            total_emails: stats.total_emails,
            total_phone_calls: stats.total_phone_calls,
            total_communications: stats.total_communications,
            analysis_summary: stats.analysis_summary
        })
        .select('*')
        .single() as any)

    if (error) throw new Error(error.message)

    revalidatePath(`/global-settings/clients/${clientId}`)
    revalidatePath('/global-settings')
    return { success: true, stats: data }
}

export async function deleteCommunicationStatsAction(id: string, clientId?: string): Promise<any> {
    const supabase = await createClient()

    const { error } = await (supabase
        .from('client_communication_stats' as any)
        .delete()
        .eq('id', id) as any)

    if (error) throw new Error(error.message)

    if (clientId) {
        revalidatePath(`/global-settings/clients/${clientId}`)
    }
    revalidatePath('/global-settings')
    return { success: true }
}
