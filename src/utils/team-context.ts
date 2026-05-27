import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export interface TeamContext {
    role: string
    teamId: string | null // null means all teams (only valid for Master/Direction)
    isRestricted: boolean // true if Managers (hard-locked to their team)
    managedTeamId: string | null // the manager's actual team id if Managers
}

export async function getActiveTeamContext(): Promise<TeamContext> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { role: 'Operations', teamId: null, isRestricted: true, managedTeamId: null }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'Operations'

    // Find the manager associated with this email
    let managedTeamId: string | null = null
    if (user.email) {
        const { data: manager } = await supabase
            .from('managers')
            .select('team_id')
            .eq('email', user.email)
            .maybeSingle()
        if (manager) {
            managedTeamId = manager.team_id
        }
    }

    if (role === 'Managers') {
        return {
            role,
            teamId: managedTeamId,
            isRestricted: true,
            managedTeamId
        }
    }

    // For Master and Direction, check cookie
    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team_id')?.value || null

    return {
        role,
        teamId: selectedTeamId === 'all' ? null : selectedTeamId,
        isRestricted: false,
        managedTeamId: null
    }
}

export async function getFilteredManagers() {
    const supabase = await createClient()
    const context = await getActiveTeamContext()
    let query = supabase.from('managers').select('*')
    if (context.teamId) {
        query = query.eq('team_id', context.teamId)
    }
    const { data, error } = await query.order('last_name')
    if (error) {
        console.error('Error fetching filtered managers:', error)
        return []
    }
    
    // Map manager teams
    const { data: teams } = await supabase.from('manager_teams').select('id, name')
    const teamById = new Map((teams || []).map(t => [t.id, t]))
    return (data || []).map(manager => ({
        ...manager,
        manager_teams: manager.team_id ? teamById.get(manager.team_id) || null : null
    }))
}
