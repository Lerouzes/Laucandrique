'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(query?: string) {
    const supabase = await createClient()

    let request = supabase.from('clients').select('*').order('created_at', { ascending: false })

    if (query) {
        request = request.ilike('full_name', `%${query}%`)
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
        manager: formData.get('manager') as string || null,
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
            const fs = require('fs')
            fs.writeFileSync('client_error_log.txt', JSON.stringify(error, null, 2))
            return { success: false, error: error.message }
        }

        revalidatePath('/clients')
        return { success: true }
    } catch (err: any) {
        console.error('SERVER ACTION EXCEPTION:', err)
        const fs = require('fs')
        fs.writeFileSync('client_error_log.txt', String(err.stack || err.message))
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
