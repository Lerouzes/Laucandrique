'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getQuotes(query?: string, statusFilter?: string) {
    const supabase = await createClient()

    let request = supabase
        .from('quotes')
        .select('*, clients(full_name, company_name, manager_id), managers(first_name,last_name,team_id), contractors(id, full_name, color), projects(start_date, completed_at, status)')
        .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
        request = request.eq('status', statusFilter as 'draft' | 'sent' | 'approved' | 'denied' | 'completed')
    }

    const { data, error } = await request

    if (error) {
        console.error('Error fetching quotes:', error)
        return []
    }

    // Fetch all manager teams to manually map them
    const { data: teams } = await supabase
        .from('manager_teams')
        .select('id, name')

    const teamById = new Map((teams || []).map((t: any) => [t.id, t]))
    const mappedData = (data || []).map((quote: any) => {
        if (quote.managers) {
            const teamId = quote.managers.team_id
            quote.managers.manager_teams = teamId ? teamById.get(teamId) || null : null
        }
        return quote
    })

    if (!query) {
        return mappedData
    }

    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
        return mappedData
    }

    return mappedData.filter((quote: any) => {
        const quoteNumber = String(quote.quote_number || '').toLowerCase()
        const quoteTitle = String(quote.title || '').toLowerCase()
        const clientFullName = String(quote.clients?.full_name || '').toLowerCase()
        const clientCompanyName = String(quote.clients?.company_name || '').toLowerCase()

        return quoteNumber.includes(normalizedQuery)
            || quoteTitle.includes(normalizedQuery)
            || clientFullName.includes(normalizedQuery)
            || clientCompanyName.includes(normalizedQuery)
    })
}

export async function createQuoteAction(quoteData: any, itemsData: any[], imagesData: any[]) {
    const supabase = await createClient()

    const { data: clientData } = await supabase.from('clients').select('manager_id').eq('id', quoteData.client_id).single()

    const quotePayload: any = {
        ...quoteData,
        manager_id: clientData?.manager_id || null,
        status: 'draft',
    }

    let quoteInsert = await supabase.from('quotes').insert(quotePayload).select().single()
    if (quoteInsert.error && quoteInsert.error.message.includes('project_type')) {
        delete quotePayload.project_type
        quoteInsert = await supabase.from('quotes').insert(quotePayload).select().single()
    }

    const quote = quoteInsert.data
    if (quoteInsert.error || !quote) {
        throw new Error(quoteInsert.error?.message || 'Erreur lors de la création de la soumission')
    }

    if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map(item => ({ ...item, quote_id: quote.id }))
        const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert)
        if (itemsError) throw new Error(itemsError.message)
    }

    if (imagesData && imagesData.length > 0) {
        const imagesToInsert = imagesData.map(img => ({ ...img, quote_id: quote.id }))
        const { error: imagesError } = await supabase.from('quote_images').insert(imagesToInsert)
        if (imagesError) throw new Error(imagesError.message)
    }

    revalidatePath('/quotes')
    return { success: true, id: quote.id }
}

export async function updateQuoteAction(quoteId: string, quoteData: any, itemsData: any[], imagesData: any[], keepExistingImages: boolean = false) {
    const supabase = await createClient()

    const { data: clientData } = await supabase.from('clients').select('manager_id').eq('id', quoteData.client_id).single()
    const quotePayload: any = {
        ...quoteData,
        manager_id: clientData?.manager_id || null,
    }

    let quoteUpdate = await supabase.from('quotes').update(quotePayload).eq('id', quoteId)
    if (quoteUpdate.error && quoteUpdate.error.message.includes('project_type')) {
        delete quotePayload.project_type
        quoteUpdate = await supabase.from('quotes').update(quotePayload).eq('id', quoteId)
    }
    if (quoteUpdate.error) throw new Error(quoteUpdate.error.message)

    // Replace all items
    await supabase.from('quote_items').delete().eq('quote_id', quoteId)
    if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map(item => ({ ...item, quote_id: quoteId }))
        const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert)
        if (itemsError) throw new Error(itemsError.message)
    }

    // Add new images (keep existing unless caller requests a full replace)
    if (!keepExistingImages) {
        await supabase.from('quote_images').delete().eq('quote_id', quoteId)
    }
    if (imagesData && imagesData.length > 0) {
        const imagesToInsert = imagesData.map(img => ({ ...img, quote_id: quoteId }))
        const { error: imagesError } = await supabase.from('quote_images').insert(imagesToInsert)
        if (imagesError) throw new Error(imagesError.message)
    }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { success: true, id: quoteId }
}

export async function updateQuoteStatus(quoteId: string, status: 'approved' | 'denied', clientId: string, titleStr: string, durDays: number) {
    const supabase = await createClient()

    const { error: updateError } = await supabase.from('quotes').update({
        status,
        ...(status === 'approved' ? { approved_at: new Date().toISOString() } : { denied_at: new Date().toISOString() })
    }).eq('id', quoteId)

    if (updateError) throw new Error(updateError.message)

    if (status === 'approved') {
        const { data: quoteMeta } = await supabase.from('quotes').select('contractor_id, project_type').eq('id', quoteId).single()
        const projectPayload: any = {
            quote_id: quoteId,
            client_id: clientId,
            contractor_id: quoteMeta?.contractor_id || null,
            project_type: quoteMeta?.project_type || 'interior',
            title: titleStr,
            status: 'unplanned',
            estimated_duration_days: durDays,
        }
        let inserted = await supabase.from('projects').insert(projectPayload)
        if (inserted.error && inserted.error.message.includes('project_type')) {
            delete projectPayload.project_type
            inserted = await supabase.from('projects').insert(projectPayload)
        }

        if (inserted.error) throw new Error(inserted.error.message)
    }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    revalidatePath('/planification')

    return { success: true }
}

export async function markQuoteAsSent(quoteId: string) {
    const supabase = await createClient()

    const sentPayload: any = {
        status: 'sent',
        sent_at: new Date().toISOString(),
        denied_at: null,
    }

    let result = await supabase.from('quotes').update(sentPayload).eq('id', quoteId)
    if (result.error && result.error.message.includes('sent_at')) {
        delete sentPayload.sent_at
        result = await supabase.from('quotes').update(sentPayload).eq('id', quoteId)
    }
    if (result.error) throw new Error(result.error.message)

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { success: true }
}

export async function getQuote(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('quotes')
        .select('*, clients(*), contractors(*), quote_items(*), quote_images(*), projects(status, completed_at)')
        .eq('id', id)
        .single()

    if (error) return null
    return data
}

export async function revertQuoteToPending(quoteId: string) {
    const supabase = await createClient()

    // Status back to draft (for modifications)
    const { error: quoteError } = await supabase.from('quotes').update({
        status: 'draft' as const,
        approved_at: null
    }).eq('id', quoteId)

    if (quoteError) throw new Error(quoteError.message)

    // Delete associated project
    const { error: projectError } = await supabase.from('projects').delete().eq('quote_id', quoteId)

    if (projectError) throw new Error(projectError.message)

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    revalidatePath('/planification')
    revalidatePath('/dashboard')

    return { success: true }
}

export async function confirmBulkQuoteImportAction(rows: {
    id?: string
    quote_number: number
    sdc_num: string
    client_name?: string | null
    manager_id?: string | null
    contractor_id?: string | null
    title: string
    start_date_str?: string | null
    amount: number
    status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed'
    import_action: 'create' | 'update' | 'skip'
}[]) {
    const supabase = await createClient()

    let quotesCreated = 0
    let quotesUpdated = 0
    let clientsCreated = 0
    let skipped = 0
    let failed = 0

    // Load existing clients to pre-populate the cache
    const { data: existingClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name')
    if (clientsError) {
        console.error('Error fetching clients for cache:', clientsError)
        return { success: false, error: clientsError.message }
    }

    const sdcToClientIdMap = new Map<string, string>()
    for (const ec of existingClients || []) {
        if (ec.full_name) {
            sdcToClientIdMap.set(ec.full_name.trim().toLowerCase(), ec.id)
        }
    }

    for (const row of rows) {
        if (row.import_action === 'skip') {
            skipped++
            continue
        }

        // Basic validation
        if (!row.quote_number || !row.sdc_num || !row.title) {
            failed++
            continue
        }

        // 1. Resolve or Create Client
        const sdcClean = row.sdc_num.trim()
        const sdcLower = sdcClean.toLowerCase()
        let clientId = sdcToClientIdMap.get(sdcLower)

        if (!clientId) {
            const newClientPayload = {
                full_name: sdcClean,
                company_name: row.client_name?.trim() || `SDC ${sdcClean}`,
                manager: sdcClean,
                manager_id: row.manager_id || null,
            }
            const { data: newClient, error: clientErr } = await supabase
                .from('clients')
                .insert(newClientPayload)
                .select('id')
                .single()

            if (clientErr || !newClient) {
                console.error('Failed to create client in bulk import:', clientErr)
                failed++
                continue
            }
            clientId = newClient.id
            sdcToClientIdMap.set(sdcLower, clientId)
            clientsCreated++
        }

        // 2. Insert or Update Quote
        const quotePayload: any = {
            quote_number: row.quote_number,
            client_id: clientId,
            title: row.title.trim(),
            status: row.status,
            manager_id: row.manager_id || null,
            contractor_id: row.contractor_id || null,
            total: row.amount,
            subtotal: row.amount,
            admin_percentage: 0.00,
            admin_amount: 0.00,
            profit_percentage: 0.00,
            profit_amount: 0.00,
            gst_amount: 0.00,
            qst_amount: 0.00,
            approved_at: row.status === 'approved' || row.status === 'completed' ? new Date().toISOString() : null,
            denied_at: row.status === 'denied' ? new Date().toISOString() : null,
        }

        let quoteId = row.id

        if (row.import_action === 'update' && quoteId) {
            const { error: quoteUpdateErr } = await supabase
                .from('quotes')
                .update(quotePayload)
                .eq('id', quoteId)
            
            if (quoteUpdateErr) {
                console.error(`Failed to update quote #${row.quote_number}:`, quoteUpdateErr)
                failed++
                continue
            }
            quotesUpdated++
        } else {
            // Check if quote_number already exists, to avoid unique constraint violations if user chose to create but it existed
            // (though UI would warn, let's be safe)
            const { data: duplicateCheck } = await supabase
                .from('quotes')
                .select('id')
                .eq('quote_number', row.quote_number)
                .maybeSingle()
            
            if (duplicateCheck?.id) {
                // If it exists, update it instead of inserting to avoid failure
                quoteId = duplicateCheck.id
                const { error: quoteUpdateErr } = await supabase
                    .from('quotes')
                    .update(quotePayload)
                    .eq('id', quoteId)
                
                if (quoteUpdateErr) {
                    console.error(`Failed to update duplicate quote #${row.quote_number}:`, quoteUpdateErr)
                    failed++
                    continue
                }
                quotesUpdated++
            } else {
                const { data: newQuote, error: quoteInsertErr } = await supabase
                    .from('quotes')
                    .insert(quotePayload)
                    .select('id')
                    .single()
                
                if (quoteInsertErr || !newQuote) {
                    console.error(`Failed to insert quote #${row.quote_number}:`, quoteInsertErr)
                    failed++
                    continue
                }
                quoteId = newQuote.id
                quotesCreated++
            }
        }

        // 3. Project handling
        const shouldHaveProject = row.status === 'approved' || row.status === 'completed' || !!row.start_date_str

        // Check if project exists
        const { data: existingProject } = await supabase
            .from('projects')
            .select('id')
            .eq('quote_id', quoteId)
            .maybeSingle()

        if (shouldHaveProject) {
            let startDate: string | null = null
            let endDate: string | null = null
            let projectStatus: 'unplanned' | 'planned' | 'completed' = 'unplanned'

            if (row.start_date_str) {
                const dateParts = row.start_date_str.split('-')
                if (dateParts.length === 3) {
                    const year = parseInt(dateParts[0], 10)
                    const month = parseInt(dateParts[1], 10) - 1
                    const day = parseInt(dateParts[2], 10)
                    
                    const startObj = new Date(year, month, day, 8, 0, 0)
                    const endObj = new Date(year, month, day, 17, 0, 0)
                    
                    startDate = startObj.toISOString()
                    endDate = endObj.toISOString()
                    projectStatus = 'planned'
                }
            }

            if (row.status === 'completed') {
                projectStatus = 'completed'
            }

            const projectPayload: any = {
                quote_id: quoteId,
                client_id: clientId,
                contractor_id: row.contractor_id || null,
                title: row.title.trim(),
                status: projectStatus,
                estimated_duration_days: 1.0000,
                start_date: startDate,
                end_date: endDate,
                completed_at: row.status === 'completed' ? new Date().toISOString() : null
            }

            if (existingProject?.id) {
                const { error: projUpdateErr } = await supabase
                    .from('projects')
                    .update(projectPayload)
                    .eq('id', existingProject.id)
                if (projUpdateErr) {
                    console.error('Failed to update project for quote:', projUpdateErr)
                }
            } else {
                const { error: projInsertErr } = await supabase
                    .from('projects')
                    .insert(projectPayload)
                if (projInsertErr) {
                    console.error('Failed to insert project for quote:', projInsertErr)
                }
            }
        } else if (existingProject?.id) {
            // Delete project if it shouldn't exist anymore
            await supabase.from('projects').delete().eq('id', existingProject.id)
        }
    }

    revalidatePath('/quotes')
    revalidatePath('/planification')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return {
        success: true,
        summary: {
            total: rows.length,
            imported: quotesCreated,
            updated: quotesUpdated,
            clientsCreated,
            skipped,
            failed
        }
    }
}
