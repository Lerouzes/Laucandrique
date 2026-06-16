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

export async function getTeamCommunicationComparison(clientId: string): Promise<any[]> {
    try {
        const supabase = await createClient()

        // 1. Get client's manager and their team_id
        const { data: clientData, error: clientErr } = await (supabase
            .from('clients' as any)
            .select('id, manager_id, managers(id, team_id)')
            .eq('id', clientId)
            .single() as any)

        if (clientErr || !clientData) {
            console.error('Error fetching client details for comparison:', clientErr)
            return []
        }

        const managerId = clientData.manager_id
        const teamId = clientData.managers?.team_id

        let clientIds: string[] = []

        if (teamId) {
            // Find all managers belonging to the same team_id
            const { data: teamManagers } = await (supabase
                .from('managers' as any)
                .select('id')
                .eq('team_id', teamId) as any)

            const managerIds = (teamManagers || []).map((m: any) => m.id)

            // Find all clients belonging to these managers
            const { data: teamClients } = await (supabase
                .from('clients' as any)
                .select('id')
                .in('manager_id', managerIds) as any)

            clientIds = (teamClients || []).map((c: any) => c.id)
        } else if (managerId) {
            // Fall back to clients under the same manager
            const { data: managerClients } = await (supabase
                .from('clients' as any)
                .select('id')
                .eq('manager_id', managerId) as any)

            clientIds = (managerClients || []).map((c: any) => c.id)
        } else {
            // Fall back to all active clients if no manager is assigned
            const { data: allClients } = await (supabase
                .from('clients' as any)
                .select('id')
                .eq('status', 'active')
                .limit(20) as any)

            clientIds = (allClients || []).map((c: any) => c.id)
        }

        if (clientIds.length === 0) return []

        // Fetch all client communication stats for these clients
        const { data: statsData, error: statsErr } = await (supabase
            .from('client_communication_stats' as any)
            .select('*, clients(id, full_name, company_name)')
            .in('client_id', clientIds)
            .order('analysis_date', { ascending: false }) as any)

        if (statsErr) {
            console.error('Error fetching team communication stats:', statsErr)
            return []
        }

        // Get only the latest stats record for each client to avoid duplicates
        const latestMap = new Map()
        for (const stat of (statsData || [])) {
            if (!latestMap.has(stat.client_id)) {
                latestMap.set(stat.client_id, stat)
            }
        }

        return Array.from(latestMap.values())
    } catch (err) {
        console.error('getTeamCommunicationComparison exception:', err)
        return []
    }
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
