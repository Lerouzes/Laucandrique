'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
    const supabase = await createClient()
    const { data, error } = await (supabase.from('settings' as any).select('*').limit(1).single() as any)

    if (error || !data) {
        return {
            id: null,
            company_name: 'Gustav Inc.',
            default_admin_percentage: 10,
            default_profit_percentage: 15,
            gst_rate: 0.05,
            qst_rate: 0.09975,
            monthly_goal_enabled: false,
            monthly_goal_amount: 0,
            work_types_options: ["Peinture", "Plâtre", "Maçonnerie", "Menuiserie", "Électricité", "Plomberie"],
            pdf_template_url: '',
            communication_target_index: 2.50,
        }
    }
    return data as any
}

export async function updateSettingsAction(formData: FormData, hasId: string | null) {
    const supabase = await createClient()

    const companyName = formData.get('company_name')

    if (typeof companyName !== 'string' || !companyName.trim()) {
        throw new Error("Le nom de l'entreprise est requis")
    }

    const pdfTemplateUrl = formData.get('pdf_template_url')

    const payload = {
        company_name: companyName.trim(),
        default_admin_percentage: parseFloat(formData.get('default_admin_percentage') as string || '0'),
        default_profit_percentage: parseFloat(formData.get('default_profit_percentage') as string || '0'),
        gst_rate: parseFloat(formData.get('gst_rate') as string || '0.05'),
        qst_rate: parseFloat(formData.get('qst_rate') as string || '0.09975'),
        monthly_goal_enabled: formData.get('monthly_goal_enabled') === 'on',
        monthly_goal_amount: parseFloat(formData.get('monthly_goal_amount') as string || '0'),
        work_types_options: (formData.get('work_types_options') as string || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        pdf_template_url: typeof pdfTemplateUrl === 'string' ? pdfTemplateUrl.trim() : null,
        communication_target_index: parseFloat(formData.get('communication_target_index') as string || '2.50'),
        updated_at: new Date().toISOString()
    }

    const fallbackPayload = {
        company_name: payload.company_name,
        default_admin_percentage: payload.default_admin_percentage,
        default_profit_percentage: payload.default_profit_percentage,
        gst_rate: payload.gst_rate,
        qst_rate: payload.qst_rate,
        work_types_options: payload.work_types_options,
        pdf_template_url: payload.pdf_template_url,
        communication_target_index: payload.communication_target_index,
        updated_at: payload.updated_at,
    }

    if (hasId) {
        let result = await (supabase.from('settings' as any).update(payload).eq('id', hasId) as any)
        if (result.error && (result.error.message.includes('monthly_goal_enabled') || result.error.message.includes('monthly_goal_amount'))) {
            result = await (supabase.from('settings' as any).update(fallbackPayload).eq('id', hasId) as any)
        }
        if (result.error) throw new Error(result.error.message)
    } else {
        let result = await (supabase.from('settings' as any).insert(payload) as any)
        if (result.error && (result.error.message.includes('monthly_goal_enabled') || result.error.message.includes('monthly_goal_amount'))) {
            result = await (supabase.from('settings' as any).insert(fallbackPayload) as any)
        }
        if (result.error) throw new Error(result.error.message)
    }

    revalidatePath('/settings')
    return { success: true }
}
