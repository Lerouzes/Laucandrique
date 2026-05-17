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

export async function getManagers() {
  const supabase = await createClient()

  const { data: managers, error: managersError } = await supabase
    .from('managers')
    .select('*')
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
  if (error) return []
  return data
}

export async function createManagerTeamAction(formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get('team_name') || '').trim()
  if (!name) throw new Error('Le nom de l’équipe est requis')
  const { error } = await supabase.from('manager_teams').insert({ name })
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/managers')
  return { success: true }
}

export async function createManagerAction(formData: FormData) {
  const supabase = await createClient()
  const payload: any = {
    first_name: String(formData.get('first_name') || '').trim(),
    last_name: String(formData.get('last_name') || '').trim(),
    email: String(formData.get('email') || '') || null,
    phone: String(formData.get('phone') || '') || null,
    team_id: String(formData.get('team_id') || '') || null,
  }

  let result = await supabase.from('managers').insert(payload)
  if (result.error && (result.error.message.includes('phone') || result.error.message.includes('team_id'))) {
    delete payload.phone
    delete payload.team_id
    result = await supabase.from('managers').insert(payload)
  }

  if (result.error) throw new Error(result.error.message)
  revalidatePath('/settings')
  revalidatePath('/clients')
  return { success: true }
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
