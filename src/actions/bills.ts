'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBillAction(billData: any, itemsData: any[], imagesData: any[] = []) {
    const supabase = await createClient()

    // 1. Insert the bill
    const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
            ...billData,
            status: billData.status || 'sent'
        })
        .select()
        .single()

    if (billError || !bill) {
        console.error('Error inserting bill:', billError)
        throw new Error(billError?.message || 'Erreur lors de la création de la facture')
    }

    // 2. Insert the bill items
    if (itemsData.length > 0) {
        const itemsPayload = itemsData.map(item => ({
            bill_id: bill.id,
            title: item.title || null,
            description: item.description || null,
            quantity: Number(item.quantity || 0),
            unit: item.unit || '',
            unit_cost: Number(item.unit_cost || 0),
            total: Number(item.total || 0),
            notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(itemsPayload)

        if (itemsError) {
            console.error('Error inserting bill items:', itemsError)
            // Roll back the bill by deleting it
            await supabase.from('bills').delete().eq('id', bill.id)
            throw new Error(itemsError.message)
        }
    }

    // 3. Insert the bill images
    if (imagesData && imagesData.length > 0) {
        const imagesPayload = imagesData.map(img => ({
            bill_id: bill.id,
            image_url: img.image_url,
            caption: img.caption || null
        }))

        const { error: imagesError } = await supabase
            .from('bill_images')
            .insert(imagesPayload)

        if (imagesError) {
            console.error('Error inserting bill images:', imagesError)
            // Roll back by deleting the bill
            await supabase.from('bills').delete().eq('id', bill.id)
            throw new Error(imagesError.message)
        }
    }

    // 4. Update the linked quote's status depending on bill status
    if (billData.quote_id) {
        const targetStatus = billData.status === 'draft' ? 'completed' : 'billed'
        const { error: quoteUpdateError } = await supabase
            .from('quotes')
            .update({ status: targetStatus })
            .eq('id', billData.quote_id)

        if (quoteUpdateError) {
            console.error('Error updating quote status:', quoteUpdateError)
            // Roll back by deleting the bill
            await supabase.from('bills').delete().eq('id', bill.id)
            throw new Error(quoteUpdateError.message)
        }
    }

    // 5. Revalidate paths
    revalidatePath('/quotes')
    if (billData.quote_id) {
        revalidatePath(`/quotes/${billData.quote_id}`)
    }
    revalidatePath('/bills')
    revalidatePath('/analytics')
    revalidatePath('/dashboard')

    return { success: true, billId: bill.id }
}

export async function updateBillAction(billId: string, billData: any, itemsData: any[], imagesData: any[] = []) {
    const supabase = await createClient()

    // 1. Update the bill
    const { error: billError } = await supabase
        .from('bills')
        .update(billData)
        .eq('id', billId)

    if (billError) {
        console.error('Error updating bill:', billError)
        throw new Error(billError.message)
    }

    // 2. Replace bill items
    const { error: deleteItemsError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId)

    if (deleteItemsError) {
        console.error('Error deleting old bill items:', deleteItemsError)
        throw new Error(deleteItemsError.message)
    }

    if (itemsData.length > 0) {
        const itemsPayload = itemsData.map(item => ({
            bill_id: billId,
            title: item.title || null,
            description: item.description || null,
            quantity: Number(item.quantity || 0),
            unit: item.unit || '',
            unit_cost: Number(item.unit_cost || 0),
            total: Number(item.total || 0),
            notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(itemsPayload)

        if (itemsError) {
            console.error('Error inserting bill items:', itemsError)
            throw new Error(itemsError.message)
        }
    }

    // 3. Replace bill images
    const { error: deleteImagesError } = await supabase
        .from('bill_images')
        .delete()
        .eq('bill_id', billId)

    if (deleteImagesError) {
        console.error('Error deleting old bill images:', deleteImagesError)
        throw new Error(deleteImagesError.message)
    }

    if (imagesData && imagesData.length > 0) {
        const imagesPayload = imagesData.map(img => ({
            bill_id: billId,
            image_url: img.image_url,
            caption: img.caption || null
        }))

        const { error: imagesError } = await supabase
            .from('bill_images')
            .insert(imagesPayload)

        if (imagesError) {
            console.error('Error inserting bill images:', imagesError)
            throw new Error(imagesError.message)
        }
    }

    // 4. Update the linked quote's status depending on bill status
    if (billData.quote_id) {
        const targetStatus = billData.status === 'draft' ? 'completed' : 'billed'
        const { error: quoteUpdateError } = await supabase
            .from('quotes')
            .update({ status: targetStatus })
            .eq('id', billData.quote_id)

        if (quoteUpdateError) {
            console.error('Error updating quote status:', quoteUpdateError)
            throw new Error(quoteUpdateError.message)
        }
    }

    // 5. Revalidate paths
    revalidatePath('/quotes')
    if (billData.quote_id) {
        revalidatePath(`/quotes/${billData.quote_id}`)
    }
    revalidatePath('/bills')
    revalidatePath(`/bills/${billId}`)
    revalidatePath('/analytics')
    revalidatePath('/dashboard')

    return { success: true }
}

export async function revertBillToDraftAction(billId: string) {
    const supabase = await createClient()

    // 1. Get quote_id associated with bill
    const { data: bill } = await supabase
        .from('bills')
        .select('quote_id')
        .eq('id', billId)
        .single()

    // 2. Set bill status to 'draft'
    const { error: billError } = await supabase
        .from('bills')
        .update({ status: 'draft' })
        .eq('id', billId)

    if (billError) throw new Error(billError.message)

    // 3. Set quote status to 'completed'
    if (bill?.quote_id) {
        const { error: quoteError } = await supabase
            .from('quotes')
            .update({ status: 'completed' })
            .eq('id', bill.quote_id)

        if (quoteError) throw new Error(quoteError.message)
    }

    revalidatePath('/quotes')
    if (bill?.quote_id) {
        revalidatePath(`/quotes/${bill.quote_id}`)
    }
    revalidatePath('/bills')
    revalidatePath(`/bills/${billId}`)
    revalidatePath('/analytics')
    revalidatePath('/dashboard')

    return { success: true }
}

export async function deleteBillAction(billId: string) {
    const supabase = await createClient()

    // 1. Get quote_id associated with bill
    const { data: bill } = await supabase
        .from('bills')
        .select('quote_id')
        .eq('id', billId)
        .single()

    // 2. Delete the bill (bill_items and bill_images cascade delete)
    const { error: billError } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId)

    if (billError) throw new Error(billError.message)

    // 3. Set quote status back to 'completed'
    if (bill?.quote_id) {
        const { error: quoteError } = await supabase
            .from('quotes')
            .update({ status: 'completed' })
            .eq('id', bill.quote_id)

        if (quoteError) throw new Error(quoteError.message)
    }

    revalidatePath('/quotes')
    if (bill?.quote_id) {
        revalidatePath(`/quotes/${bill.quote_id}`)
    }
    revalidatePath('/bills')
    revalidatePath('/analytics')
    revalidatePath('/dashboard')

    return { success: true }
}

export async function getBills() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bills')
        .select('*, quotes(quote_number, title, manager_id, managers(first_name, last_name, manager_teams(name))), clients(full_name, company_name), contractors(full_name)')
        .order('bill_date', { ascending: false })

    if (error) {
        console.error('Error fetching bills:', error)
        return []
    }

    return data || []
}

export async function getBillForQuote(quoteId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bills')
        .select('*, bill_items(*), bill_images(*), contractors(*)')
        .eq('quote_id', quoteId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching bill for quote:', error)
        return null
    }

    return data
}

export async function getBillWithItems(billId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bills')
        .select('*, bill_items(*), bill_images(*), contractors(*), quotes(quote_number, title, manager_id, managers(first_name, last_name)), clients(full_name, company_name)')
        .eq('id', billId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching bill details:', error)
        return null
    }

    return data
}
