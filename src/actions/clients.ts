'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(query?: string) {
    const supabase = await createClient()

    let request = supabase.from('clients').select('*, managers(first_name,last_name,email)').order('created_at', { ascending: false })

    if (query) {
        request = request.or(`full_name.ilike.%${query}%,company_name.ilike.%${query}%`)
    }

    const { data, error } = await request

    if (error) {
        console.error('Error fetching clients:', error)
        return []
    }

    return data
}

export async function createClientAction(formData: FormData) {
    const supabase = await createClient()

    const newClient = {
        full_name: formData.get('full_name') as string || '',
        company_name: formData.get('company_name') as string || null,
        email: formData.get('email') as string || null,
        phone: formData.get('phone') as string || null,
        address: formData.get('address') as string || null,
        city: formData.get('city') as string || null,
        province: formData.get('province') as string || null,
        postal_code: formData.get('postal_code') as string || null,
        manager: (formData.get('manager') as string) || (formData.get('full_name') as string) || null,
        manager_id: formData.get('manager_id') as string || null,
        notes: formData.get('notes') as string || null,
    }

    console.log('Inserting novel client:', newClient)

    try {
        let { error } = await supabase.from('clients').insert(newClient)
        if (error && error.message.includes('manager_id')) {
            const { manager_id, ...fallbackClient } = newClient as any
            const retry = await supabase.from('clients').insert(fallbackClient)
            error = retry.error
        }

        if (error) {
            console.error('SUPABASE INSERT ERROR on client:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/clients')
        return { success: true }
    } catch (err: any) {
        console.error('SERVER ACTION EXCEPTION:', err)
        return { success: false, error: err.message }
    }
}

export async function importClients(clientsData: any[]) {
    const supabase = await createClient()

    const { error } = await supabase.from('clients').insert(clientsData)

    if (error) throw new Error(error.message)

    revalidatePath('/clients')
    return { success: true }
}

export async function getClientById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
    if (error) return null
    return data
}

export async function updateClientAction(clientId: string, formData: FormData) {
    const supabase = await createClient()
    const payload = {
        full_name: String(formData.get('full_name') || '').trim(),
        company_name: String(formData.get('company_name') || '') || null,
        email: String(formData.get('email') || '') || null,
        phone: String(formData.get('phone') || '') || null,
        address: String(formData.get('address') || '') || null,
        city: String(formData.get('city') || '') || null,
        province: String(formData.get('province') || '') || null,
        postal_code: String(formData.get('postal_code') || '') || null,
        manager: String(formData.get('full_name') || '').trim() || null,
        manager_id: String(formData.get('manager_id') || '') || null,
        notes: String(formData.get('notes') || '') || null,
    }

    const { error } = await supabase.from('clients').update(payload).eq('id', clientId)
    if (error) throw new Error(error.message)

    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

function parseDateSafe(val: any): string {
    if (!val) return '2000-01-01'
    const str = String(val).trim()
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return '2000-01-01'
    
    const y = parseInt(match[1], 10)
    const m = parseInt(match[2], 10) - 1
    const d = parseInt(match[3], 10)
    
    const date = new Date(Date.UTC(y, m, d))
    if (isNaN(date.getTime())) return '2000-01-01'
    
    return str
}

export async function confirmBulkImportAction(rows: {
    id?: string
    full_name: string
    company_name?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    manager?: string | null
    manager_id?: string | null
    import_action: 'create' | 'update' | 'skip'
    
    // New Columns
    doors_count?: number | null
    package_name?: string | null
    monthly_fee?: number | null
    financial_year?: string | null
    status?: 'active' | 'inactive' | null
}[]) {
    const supabase = await createClient()

    let imported = 0
    let updated = 0
    let skipped = 0
    let failed = 0

    // Ensure 'Non spécifié' package exists in packages table
    await supabase.from('packages').upsert({ name: 'Non spécifié' }, { onConflict: 'name' })

    for (const row of rows) {
        if (row.import_action === 'skip') {
            skipped++
            continue
        }

        // Backend required fields & basic validations
        if (!row.full_name || row.full_name.trim() === '') {
            failed++
            continue
        }

        const clientPayload = {
            full_name: row.full_name.trim(),
            company_name: row.company_name || null,
            email: row.email || null,
            phone: row.phone || null,
            address: row.address || null,
            city: row.city || null,
            province: row.province || null,
            postal_code: row.postal_code || null,
            manager: row.manager || row.full_name.trim(),
            manager_id: row.manager_id || null,
            status: row.status || 'active'
        }

        let clientId = row.id

        if (row.import_action === 'update' && clientId) {
            const { error } = await supabase
                .from('clients')
                .update(clientPayload)
                .eq('id', clientId)
            
            if (error) {
                console.error('Bulk Import update error:', error)
                failed++
                continue
            }
            updated++
        } else {
            // Check if it already exists to prevent duplicate key violations (fallback)
            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('full_name', clientPayload.full_name)
                .maybeSingle()

            if (existing?.id) {
                clientId = existing.id
                const { error } = await supabase
                    .from('clients')
                    .update(clientPayload)
                    .eq('id', clientId)
                if (error) {
                    console.error('Bulk Import insert-retry update error:', error)
                    failed++
                    continue
                }
                updated++
            } else {
                const { data: insertedClient, error } = await supabase
                    .from('clients')
                    .insert(clientPayload)
                    .select('id')
                    .single()
                
                if (error || !insertedClient) {
                    console.error('Bulk Import insert error:', error)
                    failed++
                    continue
                }
                clientId = insertedClient.id
                imported++
            }
        }

        // Handle contract upsert
        const package_name = row.package_name || 'Non spécifié'
        let monthly_fee = row.monthly_fee !== null && row.monthly_fee !== undefined ? Number(row.monthly_fee) : 0.00
        if (isNaN(monthly_fee)) {
            monthly_fee = 0.00
        }
        const start_date = parseDateSafe(row.financial_year)
        const active = row.status !== 'inactive'

        const { error: contractErr } = await supabase
            .from('contracts')
            .upsert({
                client_id: clientId,
                package_name,
                monthly_fee,
                start_date,
                active
            }, { onConflict: 'client_id' })

        if (contractErr) {
            console.error('Error upserting contract for client:', clientId, contractErr)
        }

        // Handle doors count
        let doorsNum = row.doors_count !== null && row.doors_count !== undefined ? Math.floor(Number(row.doors_count)) : 0
        if (isNaN(doorsNum) || doorsNum < 0) {
            doorsNum = 0
        }
        
        // Delete existing doors first to prevent duplicates/incorrect count on update
        const { error: deleteDoorsErr } = await supabase
            .from('doors')
            .delete()
            .eq('client_id', clientId)

        if (deleteDoorsErr) {
            console.error('Error deleting doors for client:', clientId, deleteDoorsErr)
        }

        if (doorsNum > 0) {
            const doorsToInsert = Array.from({ length: doorsNum }).map((_, i) => ({
                client_id: clientId,
                door_number: `Porte ${i + 1}`
            }))
            const { error: insertDoorsErr } = await supabase
                .from('doors')
                .insert(doorsToInsert)
            if (insertDoorsErr) {
                console.error('Error inserting doors for client:', clientId, insertDoorsErr)
            }
        } else {
            // Missing/Zero doors: Insert a placeholder door to easily identify it
            const { error: insertPlaceholderErr } = await supabase
                .from('doors')
                .insert({
                    client_id: clientId,
                    door_number: 'Porte non spécifiée'
                })
            if (insertPlaceholderErr) {
                console.error('Error inserting placeholder door for client:', clientId, insertPlaceholderErr)
            }
        }
    }

    revalidatePath('/clients')
    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/teams')
    revalidatePath('/team-management/managers')

    return {
        success: true,
        summary: {
            total: rows.length,
            imported,
            updated,
            skipped,
            failed
        }
    }
}

export async function deleteClientAction(clientId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

    if (error) {
        console.error('Error deleting client:', error)
        if (error.code === '23503') {
            return { success: false, error: 'Impossible de supprimer ce client car il est lié à des soumissions ou des projets existants.' }
        }
        return { success: false, error: error.message }
    }

    revalidatePath('/clients')
    return { success: true }
}
