'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getManagers() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('managers').select('*').order('last_name')
  if (error) return []
  return data
}

export async function createManagerAction(formData: FormData) {
  const supabase = await createClient()
  const payload = {
    first_name: String(formData.get('first_name') || '').trim(),
    last_name: String(formData.get('last_name') || '').trim(),
    email: String(formData.get('email') || '') || null,
  }
  const { error } = await supabase.from('managers').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/clients')
  return { success: true }
}

export async function getManagerById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('managers').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function updateManagerAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const payload = {
    first_name: String(formData.get('first_name') || '').trim(),
    last_name: String(formData.get('last_name') || '').trim(),
    email: String(formData.get('email') || '') || null,
  }
  const { error } = await supabase.from('managers').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/clients')
  revalidatePath(`/managers/${id}`)
  return { success: true }
}
