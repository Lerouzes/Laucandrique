'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getContractors(query?: string) {
  const supabase = await createClient()
  let request = supabase.from('contractors').select('*').order('created_at', { ascending: false })
  if (query) request = request.ilike('full_name', `%${query}%`)
  const { data, error } = await request
  if (error) return []
  return data
}

export async function createContractorAction(formData: FormData) {
  const supabase = await createClient()
  const rawSkills = formData.getAll('skills').map(v => String(v))
  const payload = {
    full_name: String(formData.get('full_name') || ''),
    email: String(formData.get('email') || '') || null,
    phone: String(formData.get('phone') || '') || null,
    color: String(formData.get('color') || '#185FAD'),
    skills: rawSkills,
    notes: String(formData.get('notes') || '') || null,
  }
  const { error } = await supabase.from('contractors').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/contractors')
  revalidatePath('/quotes/new')
  revalidatePath('/analytics')
  return { success: true }
}

export async function getContractorById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('contractors').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function updateContractorAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const payload = {
    full_name: String(formData.get('full_name') || '').trim(),
    email: String(formData.get('email') || '') || null,
    phone: String(formData.get('phone') || '') || null,
    color: String(formData.get('color') || '#185FAD'),
    skills: formData.getAll('skills').map(v => String(v)),
    notes: String(formData.get('notes') || '') || null,
  }
  const { error } = await supabase.from('contractors').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/contractors')
  revalidatePath(`/contractors/${id}`)
  revalidatePath('/quotes/new')
  revalidatePath('/quotes')
  revalidatePath('/analytics')
  return { success: true }
}
