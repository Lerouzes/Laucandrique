'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAISettings() {
    const supabase = await createClient()
    const { data, error } = await (supabase
        .from('settings')
        .select('id, ai_engine, global_system_prompt, role_behavior_prompt')
        .limit(1)
        .single() as any)

    if (error || !data) {
        return {
            id: null,
            ai_engine: 'Google Gemini 1.5 Pro',
            global_system_prompt: 'You are Gustav, an elite property co-pilot for Gestion Laucandrique. Maintain an impeccably courteous, clear French-Canadian business tone.',
            role_behavior_prompt: 'Focus explicitly on contractor follow-ups. If an item exceeds $1500, flag it for the Operations department.'
        }
    }

    return {
        id: data.id,
        ai_engine: data.ai_engine || 'Google Gemini 1.5 Pro',
        global_system_prompt: data.global_system_prompt || '',
        role_behavior_prompt: data.role_behavior_prompt || ''
    }
}

export async function updateAISettingsAction(
    id: string | null,
    payload: {
        ai_engine: string
        global_system_prompt: string
        role_behavior_prompt: string
    }
) {
    const supabase = await createClient()

    if (!payload.ai_engine) {
        throw new Error("L'Active AI Engine est requis.")
    }

    const dataToSave = {
        ai_engine: payload.ai_engine,
        global_system_prompt: payload.global_system_prompt,
        role_behavior_prompt: payload.role_behavior_prompt,
        updated_at: new Date().toISOString()
    }

    if (id) {
        const { error } = await (supabase
            .from('settings')
            .update(dataToSave)
            .eq('id', id) as any)
        if (error) throw new Error(error.message)
    } else {
        const { data: existing } = await (supabase
            .from('settings')
            .select('id')
            .limit(1)
            .single() as any)

        if (existing?.id) {
            const { error } = await (supabase
                .from('settings')
                .update(dataToSave)
                .eq('id', existing.id) as any)
            if (error) throw new Error(error.message)
        } else {
            const { error } = await (supabase
                .from('settings')
                .insert({
                    company_name: 'Laucandrique Maintenance',
                    ...dataToSave
                }) as any)
            if (error) throw new Error(error.message)
        }
    }

    revalidatePath('/manager/ai-settings')
    return { success: true }
}
