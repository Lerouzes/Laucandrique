'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getQuotes(query?: string, statusFilter?: string) {
    const supabase = await createClient()

    let request = supabase
        .from('quotes')
        .select('*, clients(full_name, company_name, manager_id), managers(first_name,last_name), contractors(id, full_name, color)')
        .order('created_at', { ascending: false })

    if (query) {
        const sanitized = query.trim()
        if (sanitized) {
            if (/^\d+$/.test(sanitized)) {
                request = request.or(`title.ilike.%${sanitized}%,quote_number.eq.${sanitized}`)
            } else {
                request = request.ilike('title', `%${sanitized}%`)
            }
        }
    }

    if (statusFilter && statusFilter !== 'all') {
        request = request.eq('status', statusFilter as 'draft' | 'sent' | 'approved' | 'denied')
    }

    const { data, error } = await request

    if (error) {
        console.error('Error fetching quotes:', error)
        return []
    }

    return data
}

export async function createQuoteAction(quoteData: any, itemsData: any[], imagesData: any[]) {
    const supabase = await createClient()

    const { data: clientData } = await supabase.from('clients').select('manager_id').eq('id', quoteData.client_id).single()

    const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
        ...quoteData,
        manager_id: clientData?.manager_id || null,
        status: 'draft',
    }).select().single()

    if (quoteError || !quote) {
        throw new Error(quoteError?.message || 'Erreur lors de la création de la soumission')
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
        status: 'draft',
        approved_at: null,
        denied_at: null,
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
        .select('*, clients(*), contractors(*), quote_items(*), quote_images(*)')
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
