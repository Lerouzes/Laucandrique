'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type ManagerPayload = {
  first_name: string
  last_name: string
  email: string | null
  phone?: string | null
  team_id?: string | null
}

function normalizeManagerPayload(formData: FormData): ManagerPayload {
  return {
    first_name: String(formData.get('first_name') || '').trim(),
    last_name: String(formData.get('last_name') || '').trim(),
    email: String(formData.get('email') || '') || null,
    phone: String(formData.get('phone') || '') || null,
    team_id: String(formData.get('team_id') || '') || null,
  }
}

function isColumnError(errorMessage: string, column: string) {
  const normalized = errorMessage.toLowerCase()
  return normalized.includes(column.toLowerCase()) && normalized.includes('column')
}

function isMissingTableError(errorMessage: string, tableName: string) {
  const normalized = errorMessage.toLowerCase()
  return normalized.includes('could not find the table') && normalized.includes(tableName.toLowerCase())
}

export async function getManagers(ignoreContext = false) {
  const supabase = await createClient()

  let query = supabase.from('managers').select('*')
  if (!ignoreContext) {
    const { getActiveTeamContext } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    if (context.teamId) {
      query = query.eq('team_id', context.teamId)
    }
  }

  const { data: managers, error: managersError } = await query
    .order('last_name')

  if (managersError) {
    console.error('Error fetching managers:', managersError)
    return []
  }

  const { data: teams } = await supabase
    .from('manager_teams')
    .select('id, name')

  const teamById = new Map((teams || []).map((team: { id: string; name: string }) => [team.id, team]))

  return (managers || []).map((manager: any) => {
    const teamId = manager?.team_id
    return {
      ...manager,
      manager_teams: teamId ? teamById.get(teamId) || null : null,
    }
  })
}

export async function getManagerTeams() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('manager_teams').select('*').order('name')
  if (error && isMissingTableError(error.message || '', 'manager_teams')) return []
  if (error) {
    console.error('Error fetching manager teams:', error)
    return []
  }
  return data
}

export async function createManagerTeamAction(formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get('team_name') || '').trim()
  if (!name) throw new Error('Le nom de l’équipe est requis')
  const { data, error } = await supabase.from('manager_teams').insert({ name }).select('*').single()
  if (error || !data) throw new Error(error?.message || "Impossible d'ajouter l'équipe")
  revalidatePath('/settings')
  revalidatePath('/managers')
  return { success: true, team: data }
}

export async function createManagerAction(formData: FormData) {
  const supabase = await createClient()
  const first_name = String(formData.get('first_name') || '').trim()
  const last_name = String(formData.get('last_name') || '').trim()
  const email = String(formData.get('email') || '') || null
  const phone = String(formData.get('phone') || '') || null
  const team_id = String(formData.get('team_id') || '') || null

  // Check if a manager with this exact name already exists
  const { data: existing } = await supabase
    .from('managers')
    .select('id')
    .ilike('first_name', first_name)
    .ilike('last_name', last_name)
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error(`Un gestionnaire nommé "${first_name} ${last_name}" existe déjà.`)
  }

  const payload: any = {
    first_name,
    last_name,
    email,
    phone,
    team_id,
  }

  let result = await supabase.from('managers').insert(payload).select('*').single()
  if (result.error && (result.error.message.includes('phone') || result.error.message.includes('team_id'))) {
    delete payload.phone
    delete payload.team_id
    result = await supabase.from('managers').insert(payload).select('*').single()
  }

  if (result.error || !result.data) throw new Error(result.error?.message || "Impossible d'ajouter le gestionnaire")
  revalidatePath('/settings')
  revalidatePath('/clients')
  return { success: true, manager: result.data }
}

export async function getManagerById(id: string) {
  const supabase = await createClient()

  const { data: manager, error } = await supabase.from('managers').select('*').eq('id', id).single()
  if (error || !manager) return null

  const teamId = (manager as any)?.team_id
  if (!teamId) return { ...manager, manager_teams: null }

  const { data: team } = await supabase
    .from('manager_teams')
    .select('id, name')
    .eq('id', teamId)
    .single()

  return {
    ...manager,
    manager_teams: team || null,
  }
}

export async function updateManagerAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const payload: any = {
    first_name: String(formData.get('first_name') || '').trim(),
    last_name: String(formData.get('last_name') || '').trim(),
    email: String(formData.get('email') || '') || null,
    phone: String(formData.get('phone') || '') || null,
    team_id: String(formData.get('team_id') || '') || null,
  }

  let result = await supabase.from('managers').update(payload).eq('id', id)
  if (result.error && (result.error.message.includes('phone') || result.error.message.includes('team_id'))) {
    delete payload.phone
    delete payload.team_id
    result = await supabase.from('managers').update(payload).eq('id', id)
  }

  if (result.error) throw new Error(result.error.message)
  revalidatePath('/settings')
  revalidatePath('/clients')
  revalidatePath(`/managers/${id}`)
  return { success: true }
}

export async function deleteManagerAction(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('managers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  
  revalidatePath('/settings')
  revalidatePath('/managers')
  revalidatePath('/clients')
  return { success: true }
}

export async function addManagerFromImportAction(fullName: string, active: boolean) {
  const supabase = await createClient()
  const parts = fullName.trim().split(/\s+/)
  const first_name = parts[0] || 'Gestionnaire'
  const last_name = parts.slice(1).join(' ') || 'Importé'
  const email = null

  // Check if a manager with this exact name already exists
  const { data: existing } = await supabase
    .from('managers')
    .select('id')
    .ilike('first_name', first_name)
    .ilike('last_name', last_name)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true, managerId: existing[0].id }
  }

  const { data, error } = await supabase
    .from('managers')
    .insert({
      first_name,
      last_name,
      email,
      active
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create manager' }
  }

  revalidatePath('/settings')
  revalidatePath('/clients')
  return { success: true, managerId: data.id }
}

