// @ts-nocheck
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

export async function createQuoteAction(quoteData: any, itemsData: any[], imagesData: any[], planningData?: any) {
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

    // Save planning sections and rooms
    const tempToRealRoomId: Record<string, string> = {}
    if (planningData && planningData.sections && planningData.sections.length > 0) {
        for (const section of planningData.sections) {
            const sectionPayload = {
                quote_id: quote.id,
                name: section.name,
                description: section.description || null
            }
            const { data: insertedSection, error: secErr } = await supabase
                .from('quote_planning_sections')
                .insert(sectionPayload)
                .select()
                .single()

            if (secErr) throw new Error(secErr.message)

            if (section.rooms && section.rooms.length > 0) {
                for (const room of section.rooms) {
                    const roomPayload = {
                        quote_id: quote.id,
                        section_id: insertedSection.id,
                        name: room.name,
                        description: room.description || null,
                        height: room.height ? Number(room.height) : null,
                        points: room.points || []
                    }
                    const { data: insertedRoom, error: roomErr } = await supabase
                        .from('quote_planning_rooms')
                        .insert(roomPayload)
                        .select()
                        .single()

                    if (roomErr) throw new Error(roomErr.message)

                    if (room.id) {
                        tempToRealRoomId[room.id] = insertedRoom.id
                    }
                }
            }
        }
    }

    if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map(item => {
            let planning_room_id = item.planning_room_id || null
            if (planning_room_id && tempToRealRoomId[planning_room_id]) {
                planning_room_id = tempToRealRoomId[planning_room_id]
            }
            return {
                ...item,
                quote_id: quote.id,
                planning_room_id,
                planning_measurement_source: item.planning_measurement_source || null
            }
        })
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

export async function updateQuoteAction(quoteId: string, quoteData: any, itemsData: any[], imagesData: any[], keepExistingImages: boolean = false, planningData?: any) {
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

    // Delete old sections and rooms (rooms cascade delete)
    const { error: deleteSecErr } = await supabase.from('quote_planning_sections').delete().eq('quote_id', quoteId)
    if (deleteSecErr) throw new Error(deleteSecErr.message)

    // Save planning sections and rooms
    const tempToRealRoomId: Record<string, string> = {}
    if (planningData && planningData.sections && planningData.sections.length > 0) {
        for (const section of planningData.sections) {
            const sectionPayload = {
                quote_id: quoteId,
                name: section.name,
                description: section.description || null
            }
            const { data: insertedSection, error: secErr } = await supabase
                .from('quote_planning_sections')
                .insert(sectionPayload)
                .select()
                .single()

            if (secErr) throw new Error(secErr.message)

            if (section.rooms && section.rooms.length > 0) {
                for (const room of section.rooms) {
                    const roomPayload = {
                        quote_id: quoteId,
                        section_id: insertedSection.id,
                        name: room.name,
                        description: room.description || null,
                        height: room.height ? Number(room.height) : null,
                        points: room.points || []
                    }
                    const { data: insertedRoom, error: roomErr } = await supabase
                        .from('quote_planning_rooms')
                        .insert(roomPayload)
                        .select()
                        .single()

                    if (roomErr) throw new Error(roomErr.message)

                    if (room.id) {
                        tempToRealRoomId[room.id] = insertedRoom.id
                    }
                }
            }
        }
    }

    // Replace all items
    await supabase.from('quote_items').delete().eq('quote_id', quoteId)
    if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map(item => {
            let planning_room_id = item.planning_room_id || null
            if (planning_room_id && tempToRealRoomId[planning_room_id]) {
                planning_room_id = tempToRealRoomId[planning_room_id]
            }
            return {
                ...item,
                quote_id: quoteId,
                planning_room_id,
                planning_measurement_source: item.planning_measurement_source || null
            }
        })
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
        const { data: existingProj } = await supabase
            .from('projects')
            .select('id, start_date')
            .eq('quote_id', quoteId)
            .maybeSingle()

        const { data: quoteMeta } = await supabase.from('quotes').select('contractor_id, project_type').eq('id', quoteId).single()
        const projectPayload: any = {
            quote_id: quoteId,
            client_id: clientId,
            contractor_id: quoteMeta?.contractor_id || null,
            project_type: quoteMeta?.project_type || 'interior',
            title: titleStr,
            status: existingProj?.start_date ? 'planned' : 'unplanned',
            estimated_duration_days: durDays,
            completed_at: null,
            completed_months: []
        }

        if (existingProj) {
            const { error: projErr } = await supabase
                .from('projects')
                .update(projectPayload)
                .eq('id', existingProj.id)
            if (projErr) throw new Error(projErr.message)
        } else {
            let inserted = await supabase.from('projects').insert(projectPayload)
            if (inserted.error && inserted.error.message.includes('project_type')) {
                delete projectPayload.project_type
                inserted = await supabase.from('projects').insert(projectPayload)
            }
            if (inserted.error) throw new Error(inserted.error.message)
        }
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
        .select('*, clients(*), contractors(*), quote_items(*), quote_images(*), projects(status, completed_at), bills(id, bill_number, status), quote_planning_sections(*, quote_planning_rooms(*))')
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

    // Reset the associated project to unplanned instead of deleting it.
    // Deleting forces a new INSERT on re-approval (new row ID), which causes
    // phantom duplication in analytics and planning views. By keeping the row
    // and resetting its fields we stay idempotent: re-approving finds the
    // existing row and does an UPDATE, never a duplicate INSERT.
    const { error: projectError } = await supabase
        .from('projects')
        .update({
            status: 'unplanned',
            start_date: null,
            end_date: null,
            completed_at: null,
            completed_months: [],
            planned_months: [],
        })
        .eq('quote_id', quoteId)

    if (projectError) throw new Error(projectError.message)

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    revalidatePath('/planification')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

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
    status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed' | 'deferred' | 'cancelled'
    import_action: 'create' | 'update' | 'skip'
    planned_months?: string[]
    completed_months?: string[]
}[]) {
    const supabase = await createClient()

    let quotesCreated = 0
    let quotesUpdated = 0
    let clientsCreated = 0
    let skipped = 0
    let failed = 0

    // Load settings to calculate taxes and administration/profit percentage
    const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle()

    const defaultAdminPerc = settings?.default_admin_percentage ?? 10
    const defaultProfitPerc = settings?.default_profit_percentage ?? 15
    const gstRate = settings?.gst_rate ?? 0.05
    const qstRate = settings?.qst_rate ?? 0.09975

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

        const subtotal = Number(row.amount.toFixed(2))
        const adminAmount = Number((subtotal * (defaultAdminPerc / 100)).toFixed(2))
        const subtotalWithAdmin = Number((subtotal + adminAmount).toFixed(2))
        const profitAmount = Number((subtotalWithAdmin * (defaultProfitPerc / 100)).toFixed(2))
        const totalWithoutTaxes = Number((subtotal + adminAmount + profitAmount).toFixed(2))
        const gstAmount = Number((totalWithoutTaxes * gstRate).toFixed(2))
        const qstAmount = Number((totalWithoutTaxes * qstRate).toFixed(2))
        const total = Number((totalWithoutTaxes + gstAmount + qstAmount).toFixed(2))

        // 2. Insert or Update Quote
        const quotePayload: any = {
            quote_number: row.quote_number,
            client_id: clientId,
            title: row.title.trim(),
            status: row.status,
            manager_id: row.manager_id || null,
            contractor_id: row.contractor_id || null,
            subtotal: subtotal,
            admin_percentage: defaultAdminPerc,
            admin_amount: adminAmount,
            profit_percentage: defaultProfitPerc,
            profit_amount: profitAmount,
            gst_amount: gstAmount,
            qst_amount: qstAmount,
            total: total,
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

            const pMonths = [...(row.planned_months || [])]
            const cMonths = [...(row.completed_months || [])]

            if (pMonths.length === 0 && startDate) {
                const sDate = new Date(startDate)
                const monthStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`
                pMonths.push(monthStr)
            }
            if (cMonths.length === 0 && projectStatus === 'completed') {
                const now = new Date()
                const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                cMonths.push(monthStr)
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
                completed_at: row.status === 'completed' ? new Date().toISOString() : null,
                planned_months: pMonths,
                completed_months: cMonths
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

export async function deleteQuoteAction(quoteId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('quotes').delete().eq('id', quoteId)
    if (error) throw new Error(error.message)
    
    revalidatePath('/quotes')
    revalidatePath('/planification')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')
    return { success: true }
}

export async function deleteQuotesAction(quoteIds: string[]) {
    const supabase = await createClient()
    const { error } = await supabase.from('quotes').delete().in('id', quoteIds)
    if (error) throw new Error(error.message)
    
    revalidatePath('/quotes')
    revalidatePath('/planification')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')
    return { success: true }
}

export async function updateQuotesStatusAction(
    quoteIds: string[],
    status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed' | 'billed'
) {
    const supabase = await createClient()

    // Fetch details of quotes to handle project logic
    const { data: quotes, error: fetchError } = await supabase
        .from('quotes')
        .select('id, client_id, title, estimated_duration_days, contractor_id')
        .in('id', quoteIds)

    if (fetchError) throw new Error(fetchError.message)

    for (const quote of quotes || []) {
        const updatePayload: any = {
            status,
            approved_at: (status === 'approved' || status === 'completed') ? new Date().toISOString() : null,
            denied_at: status === 'denied' ? new Date().toISOString() : null
        }
        if (status === 'sent') {
            updatePayload.sent_at = new Date().toISOString()
        }

        let updateResult = await supabase.from('quotes').update(updatePayload).eq('id', quote.id)
        if (updateResult.error && status === 'sent' && updateResult.error.message.includes('sent_at')) {
            delete updatePayload.sent_at
            updateResult = await supabase.from('quotes').update(updatePayload).eq('id', quote.id)
        }

        if (updateResult.error) throw new Error(updateResult.error.message)

        if (status === 'approved' || status === 'completed') {
            const { data: existingProject } = await supabase
                .from('projects')
                .select('id, start_date')
                .eq('quote_id', quote.id)
                .maybeSingle()

            if (existingProject) {
                if (status === 'completed') {
                    const now = new Date()
                    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                    const { data: projData } = await supabase
                        .from('projects')
                        .select('completed_months')
                        .eq('id', existingProject.id)
                        .single()
                    const existingCompleted = projData?.completed_months || []
                    const newCompleted = existingCompleted.includes(currentMonth)
                        ? existingCompleted
                        : [...existingCompleted, currentMonth]

                    await supabase
                        .from('projects')
                        .update({
                            status: 'completed',
                            completed_at: now.toISOString(),
                            completed_months: newCompleted
                        })
                        .eq('id', existingProject.id)
                } else if (status === 'approved') {
                    await supabase
                        .from('projects')
                        .update({
                            status: existingProject.start_date ? 'planned' : 'unplanned',
                            completed_at: null,
                            completed_months: []
                        })
                        .eq('id', existingProject.id)
                }
            } else {
                const projectPayload: any = {
                    quote_id: quote.id,
                    client_id: quote.client_id,
                    contractor_id: quote.contractor_id || null,
                    title: quote.title,
                    status: status === 'completed' ? 'completed' : 'unplanned',
                    estimated_duration_days: quote.estimated_duration_days || 1,
                    completed_at: status === 'completed' ? new Date().toISOString() : null,
                    completed_months: status === 'completed' ? [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`] : []
                }
                let inserted = await supabase.from('projects').insert(projectPayload)
                if (inserted.error && inserted.error.message.includes('project_type')) {
                    delete projectPayload.project_type
                    inserted = await supabase.from('projects').insert(projectPayload)
                }
                if (inserted.error) throw new Error(inserted.error.message)
            }
        } else {
            // draft, sent, denied: delete project if exists
            await supabase.from('projects').delete().eq('quote_id', quote.id)
        }
    }

    revalidatePath('/quotes')
    revalidatePath('/planification')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return { success: true }
}

export async function fixExistingImportedQuotesAction() {
    const supabase = await createClient()

    // 1. Fetch settings
    const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle()

    const defaultAdminPerc = settings?.default_admin_percentage ?? 10
    const defaultProfitPerc = settings?.default_profit_percentage ?? 15
    const gstRate = settings?.gst_rate ?? 0.05
    const qstRate = settings?.qst_rate ?? 0.09975

    // 2. Fetch all quotes where admin_amount = 0 and gst_amount = 0 and subtotal > 0
    const { data: quotes, error: fetchErr } = await supabase
        .from('quotes')
        .select('id, quote_number, subtotal, admin_amount, gst_amount')

    if (fetchErr) {
        console.error('Error fetching quotes to fix:', fetchErr)
        return { success: false, error: fetchErr.message }
    }

    const quotesToFix = (quotes || []).filter(q => 
        Number(q.admin_amount || 0) === 0 && 
        Number(q.gst_amount || 0) === 0 && 
        Number(q.subtotal || 0) > 0
    )

    let updatedCount = 0

    for (const q of quotesToFix) {
        const subtotal = Number(q.subtotal || 0)
        const adminAmount = Number((subtotal * (defaultAdminPerc / 100)).toFixed(2))
        const subtotalWithAdmin = Number((subtotal + adminAmount).toFixed(2))
        const profitAmount = Number((subtotalWithAdmin * (defaultProfitPerc / 100)).toFixed(2))
        const totalWithoutTaxes = Number((subtotal + adminAmount + profitAmount).toFixed(2))
        const gstAmount = Number((totalWithoutTaxes * gstRate).toFixed(2))
        const qstAmount = Number((totalWithoutTaxes * qstRate).toFixed(2))
        const total = Number((totalWithoutTaxes + gstAmount + qstAmount).toFixed(2))

        const { error: updateErr } = await supabase
            .from('quotes')
            .update({
                admin_percentage: defaultAdminPerc,
                admin_amount: adminAmount,
                profit_percentage: defaultProfitPerc,
                profit_amount: profitAmount,
                gst_amount: gstAmount,
                qst_amount: qstAmount,
                total: total
            })
            .eq('id', q.id)

        if (updateErr) {
            console.error(`Failed to fix quote #${q.quote_number}:`, updateErr)
        } else {
            updatedCount++
        }
    }

    revalidatePath('/quotes')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return { success: true, count: updatedCount }
}

