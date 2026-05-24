'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(query?: string) {
    try {
        const supabase = await createClient()

        let request = supabase
            .from('clients')
            .select('*, managers(first_name,last_name,email)')
            .order('created_at', { ascending: false })

        if (query) {
            request = request.or(`full_name.ilike.%${query}%,company_name.ilike.%${query}%`)
        }

        const { data, error } = await request

        if (error) {
            console.error('Error fetching clients (with join):', error)
            // Fall back to simple select without managers join
            const fallback = supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false })
            if (query) fallback.or(`full_name.ilike.%${query}%,company_name.ilike.%${query}%`)
            const { data: fallbackData, error: fallbackError } = await fallback
            if (fallbackError) {
                console.error('Error fetching clients (fallback):', fallbackError)
                return []
            }
            return fallbackData ?? []
        }

        return data ?? []
    } catch (err: any) {
        if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || String(err.message).includes('Dynamic server usage'))) {
            throw err
        }
        console.error('getClients exception:', err)
        return []
    }
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
    const { data, error } = await supabase
        .from('clients')
        .select('*, contracts(*), doors(id)')
        .eq('id', id)
        .single()
    if (error) {
        console.error('Error fetching client by id:', error)
        return null
    }
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
        status: String(formData.get('status') || 'active') as 'active' | 'inactive',
    }

    const { error } = await supabase.from('clients').update(payload).eq('id', clientId)
    if (error) throw new Error(error.message)

    // Contract details
    const package_name = formData.get('package_name') as string | null
    const monthly_fee_raw = formData.get('monthly_fee')
    const financial_year_raw = formData.get('financial_year')

    const monthly_fee = monthly_fee_raw != null ? Number(monthly_fee_raw) : 0
    const start_date = financial_year_raw ? parseDateSafe(financial_year_raw) : '2026-01-01'
    const active = payload.status !== 'inactive'

    const { error: contractErr } = await supabase
        .from('contracts')
        .upsert(
            { client_id: clientId, package_name: package_name || 'Non spécifié', monthly_fee: isNaN(monthly_fee) ? 0 : monthly_fee, start_date, active },
            { onConflict: 'client_id' }
        )
    if (contractErr) {
        console.error('Error updating contract on client update:', contractErr.message)
    }

    // Doors count
    const doors_count_raw = formData.get('doors_count')
    if (doors_count_raw !== null && doors_count_raw !== '') {
        const doorsNum = Math.floor(Number(doors_count_raw))
        if (!isNaN(doorsNum) && doorsNum >= 0) {
            const { error: deleteErr } = await supabase.from('doors').delete().eq('client_id', clientId)
            if (deleteErr) {
                console.error('Error deleting doors on client update:', deleteErr.message)
            }
            if (doorsNum > 0) {
                const doorsToInsert = Array.from({ length: doorsNum }, (_, i) => ({
                    client_id: clientId,
                    door_number: `Porte ${i + 1}`,
                }))
                const { error: insertErr } = await supabase.from('doors').insert(doorsToInsert)
                if (insertErr) {
                    console.error('Error inserting doors on client update:', insertErr.message)
                }
            } else {
                const { error: placeholderErr } = await supabase.from('doors').insert({
                    client_id: clientId,
                    door_number: 'Porte non spécifiée',
                })
                if (placeholderErr) {
                    console.error('Error inserting placeholder door on client update:', placeholderErr.message)
                }
            }
        }
    }

    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/syndicates')
    return { success: true }
}

function parseDateSafe(val: any): string {
    if (!val) return '2000-01-01'
    const str = String(val).trim()
    // Accept YYYY-MM-DD format
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
        const y = parseInt(isoMatch[1], 10)
        const m = parseInt(isoMatch[2], 10) - 1
        const d = parseInt(isoMatch[3], 10)
        const date = new Date(Date.UTC(y, m, d))
        if (!isNaN(date.getTime())) return str
    }
    // Accept DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
        const a = parseInt(slashMatch[1], 10)
        const b = parseInt(slashMatch[2], 10)
        const y = parseInt(slashMatch[3], 10)
        // Assume DD/MM/YYYY (French convention)
        const date = new Date(Date.UTC(y, b - 1, a))
        if (!isNaN(date.getTime())) {
            return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
        }
    }
    // Accept year only
    const yearMatch = str.match(/^(\d{4})$/)
    if (yearMatch) {
        return `${yearMatch[1]}-01-01`
    }
    return '2000-01-01'
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
    // Top-level try/catch ensures this server action NEVER crashes the app
    try {
        const supabase = await createClient()

        let imported = 0
        let updated = 0
        let skipped = 0
        let failed = 0

        // Seed all known package names so FK constraints never block contract inserts
        try {
            const packageNames = ['Bronze', 'Argent', 'Argent+', 'Argent +', 'Or', 'Platine', 'Platinum', 'Non spécifié']
            const { error: seedErr } = await supabase.from('packages').upsert(
                packageNames.map(name => ({ name })),
                { onConflict: 'name' }
            )
            if (seedErr) {
                console.error('Error seeding packages in confirmBulkImportAction:', seedErr.message)
            }
        } catch (seedEx) {
            console.error('Exception seeding packages in confirmBulkImportAction:', seedEx)
            // packages table may not exist yet — contract inserts will just skip silently
        }

        for (const row of rows) {
            // Skip rows explicitly marked to skip
            if (row.import_action === 'skip') {
                skipped++
                continue
            }

            // Require at minimum a full_name
            if (!row.full_name || row.full_name.trim() === '') {
                failed++
                continue
            }

            // Full payload (with all new columns)
            const fullPayload: Record<string, any> = {
                full_name: row.full_name.trim(),
                company_name: row.company_name?.trim() || null,
                email: row.email?.trim() || null,
                phone: row.phone?.trim() || null,
                address: row.address?.trim() || null,
                city: row.city?.trim() || null,
                province: row.province?.trim() || null,
                postal_code: row.postal_code?.trim() || null,
                manager: row.manager || row.full_name.trim(),
                manager_id: row.manager_id || null,
                status: row.status || 'active',
            }

            // Core payload — falls back to this if DB hasn't been migrated with new columns
            const corePayload: Record<string, any> = {
                full_name: fullPayload.full_name,
                company_name: fullPayload.company_name,
                email: fullPayload.email,
                phone: fullPayload.phone,
                address: fullPayload.address,
                city: fullPayload.city,
                province: fullPayload.province,
                postal_code: fullPayload.postal_code,
                manager: fullPayload.manager,
            }

            let clientId: string | undefined = row.id

            try {
                if (row.import_action === 'update' && clientId) {
                    // Try full payload first, fall back to core if column errors
                    let { error } = await supabase
                        .from('clients')
                        .update(fullPayload)
                        .eq('id', clientId)

                    if (error && (
                        error.message.toLowerCase().includes('column') ||
                        error.message.includes('status') ||
                        error.message.includes('manager_id')
                    )) {
                        const res = await supabase.from('clients').update(corePayload).eq('id', clientId)
                        error = res.error
                    }

                    if (error) {
                        console.error('Bulk update error:', error.message)
                        failed++
                        continue
                    }
                    updated++

                } else {
                    // Check if the record already exists (avoid duplicate key violations)
                    const { data: existing } = await supabase
                        .from('clients')
                        .select('id')
                        .eq('full_name', fullPayload.full_name)
                        .maybeSingle()

                    if (existing?.id) {
                        clientId = existing.id
                        let { error } = await supabase
                            .from('clients')
                            .update(fullPayload)
                            .eq('id', clientId)

                        if (error && (
                            error.message.toLowerCase().includes('column') ||
                            error.message.includes('status') ||
                            error.message.includes('manager_id')
                        )) {
                            const res = await supabase.from('clients').update(corePayload).eq('id', clientId)
                            error = res.error
                        }

                        if (error) {
                            console.error('Bulk update-existing error:', error.message)
                            failed++
                            continue
                        }
                        updated++

                    } else {
                        // Insert — try full payload, fall back to core if column errors
                        let { data: inserted, error } = await supabase
                            .from('clients')
                            .insert(fullPayload)
                            .select('id')
                            .single()

                        if (error && (
                            error.message.toLowerCase().includes('column') ||
                            error.message.includes('status') ||
                            error.message.includes('manager_id')
                        )) {
                            const res = await supabase
                                .from('clients')
                                .insert(corePayload)
                                .select('id')
                                .single()
                            inserted = res.data
                            error = res.error
                        }

                        if (error || !inserted) {
                            console.error('Bulk insert error:', error?.message)
                            failed++
                            continue
                        }

                        clientId = inserted.id
                        imported++
                    }
                }

                if (!clientId) continue

                // --- Contracts (fully isolated — never crashes the client import) ---
                try {
                    const package_name = row.package_name || 'Non spécifié'
                    let monthly_fee = row.monthly_fee != null ? Number(row.monthly_fee) : 0
                    if (isNaN(monthly_fee)) monthly_fee = 0
                    const start_date = parseDateSafe(row.financial_year)
                    const active = row.status !== 'inactive'

                    const { error: contractError } = await supabase
                        .from('contracts')
                        .upsert(
                            { client_id: clientId, package_name, monthly_fee, start_date, active },
                            { onConflict: 'client_id' }
                        )
                    if (contractError) {
                        console.error('Database error upserting contract for client:', row.full_name, contractError.message)
                    }
                } catch (contractEx) {
                    console.error('Exception processing contract for client:', row.full_name, contractEx)
                    // contracts table may not be migrated yet — skip silently
                }

                // --- Doors (fully isolated — never crashes the client import) ---
                try {
                    let doorsNum = row.doors_count != null ? Math.floor(Number(row.doors_count)) : 0
                    if (isNaN(doorsNum) || doorsNum < 0) doorsNum = 0

                    // Delete existing doors first to prevent duplicates on re-import
                    const { error: deleteDoorsErr } = await supabase.from('doors').delete().eq('client_id', clientId)
                    if (deleteDoorsErr) {
                        console.error('Database error deleting existing doors for client:', row.full_name, deleteDoorsErr.message)
                    }

                    if (doorsNum > 0) {
                        const doorsToInsert = Array.from({ length: doorsNum }, (_, i) => ({
                            client_id: clientId,
                            door_number: `Porte ${i + 1}`,
                        }))
                        const { error: insertDoorsErr } = await supabase.from('doors').insert(doorsToInsert)
                        if (insertDoorsErr) {
                            console.error('Database error inserting doors for client:', row.full_name, insertDoorsErr.message)
                        }
                    } else {
                        // Insert a placeholder so we can identify missing door data
                        const { error: insertPlaceholderErr } = await supabase.from('doors').insert({
                            client_id: clientId,
                            door_number: 'Porte non spécifiée',
                        })
                        if (insertPlaceholderErr) {
                            console.error('Database error inserting doors placeholder for client:', row.full_name, insertPlaceholderErr.message)
                        }
                    }
                } catch (doorsEx) {
                    console.error('Exception processing doors for client:', row.full_name, doorsEx)
                    // doors table may not be migrated yet — skip silently
                }

            } catch (rowEx: any) {
                // Unexpected per-row error — log and continue instead of crashing
                console.error('Unexpected error processing row:', row.full_name, rowEx?.message)
                failed++
            }
        }

        // Revalidate caches
        try {
            revalidatePath('/clients')
            revalidatePath('/team-management/dashboard')
            revalidatePath('/team-management/teams')
            revalidatePath('/team-management/managers')
        } catch (_) {
            // revalidation errors are non-fatal
        }

        return {
            success: true,
            summary: { total: rows.length, imported, updated, skipped, failed },
        }

    } catch (fatalErr: any) {
        console.error('Fatal error in confirmBulkImportAction:', fatalErr)
        return {
            success: false,
            summary: { total: rows.length, imported: 0, updated: 0, skipped: 0, failed: rows.length },
            error: fatalErr?.message || "Erreur inconnue lors de l'importation.",
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
