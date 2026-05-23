'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBillAction(billData: any, itemsData: any[]) {
    const supabase = await createClient()

    // 1. Insert the bill
    const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert(billData)
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

    // 3. Update the linked quote's status to 'billed'
    if (billData.quote_id) {
        const { error: quoteUpdateError } = await supabase
            .from('quotes')
            .update({ status: 'billed' })
            .eq('id', billData.quote_id)

        if (quoteUpdateError) {
            console.error('Error updating quote status:', quoteUpdateError)
            // Roll back by deleting the bill
            await supabase.from('bills').delete().eq('id', bill.id)
            throw new Error(quoteUpdateError.message)
        }
    }

    // 4. Revalidate paths
    revalidatePath('/quotes')
    if (billData.quote_id) {
        revalidatePath(`/quotes/${billData.quote_id}`)
    }
    revalidatePath('/analytics')
    revalidatePath('/dashboard')

    return { success: true, billId: bill.id }
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
        .select('*, bill_items(*), contractors(*)')
        .eq('quote_id', quoteId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching bill for quote:', error)
        return null
    }

    return data
}
