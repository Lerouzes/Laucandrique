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

  let result = await supabase.from('managers').select('*, manager_teams(id, name)').order('last_name')
  if (result.error) {
    console.error('Error fetching managers with teams:', result.error)
    result = await supabase.from('managers').select('*').order('last_name')
  }

  if (result.error) {
    console.error('Error fetching managers:', result.error)
    return []
  }

  return result.data || []
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

  let result = await supabase.from('managers').select('*, manager_teams(id, name)').eq('id', id).single()
  if (result.error) {
    console.error('Error fetching manager with team:', result.error)
    result = await supabase.from('managers').select('*').eq('id', id).single()
  }

  if (result.error) return null
  return result.data
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
