'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('settings').select('*').limit(1).single()

    if (error || !data) {
        return {
            company_name: 'Gustav Inc.',
            default_admin_percentage: 10,
            default_profit_percentage: 15,
            gst_rate: 0.05,
            qst_rate: 0.09975,
        }
    }
    return data
}

export async function updateSettingsAction(formData: FormData, hasId: string | null) {
    const supabase = await createClient()

    const payload = {
        company_name: formData.get('company_name'),
        default_admin_percentage: parseFloat(formData.get('default_admin_percentage') as string || '0'),
        default_profit_percentage: parseFloat(formData.get('default_profit_percentage') as string || '0'),
        gst_rate: parseFloat(formData.get('gst_rate') as string || '0.05'),
        qst_rate: parseFloat(formData.get('qst_rate') as string || '0.09975'),
        updated_at: new Date().toISOString()
    }

    if (hasId) {
        await supabase.from('settings').update(payload).eq('id', hasId)
    } else {
        await supabase.from('settings').insert(payload)
    }

    revalidatePath('/settings')
    return { success: true }
}
