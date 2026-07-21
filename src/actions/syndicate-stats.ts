'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type YearlyStatInput = {
    id?: string
    year: number
    building_valuation: number
    regular_condo_fees: number
    prevention_fund_fees: number
    insurance_fund_fees: number
}

export type SpecialAssessmentInput = {
    id?: string
    year: number
    amount: number
    fund_type: 'regular' | 'prevention' | 'insurance'
    title: string
}

export async function getSyndicateStatsAction(clientId: string) {
    const supabase = await createClient()

    // 1. Fetch total_square_feet and construction_year from clients (with fallback)
    let total_square_feet: number | null = null
    let construction_year: number | null = null

    const { data: clientDataBoth, error: clientErrBoth } = await supabase
        .from('clients')
        .select('total_square_feet, construction_year')
        .eq('id', clientId)
        .single()

    if (!clientErrBoth && clientDataBoth) {
        total_square_feet = clientDataBoth.total_square_feet
        construction_year = clientDataBoth.construction_year
    } else {
        const { data: clientDataFallback, error: clientErrFallback } = await supabase
            .from('clients')
            .select('total_square_feet')
            .eq('id', clientId)
            .single()
        if (clientDataFallback) {
            total_square_feet = clientDataFallback.total_square_feet
        }
        if (clientErrFallback) {
            console.error('Error fetching client total_square_feet:', clientErrFallback)
        }
    }

    // 2. Fetch yearly stats
    const { data: yearlyStats, error: yearlyErr } = await supabase
        .from('client_yearly_stats')
        .select('*')
        .eq('client_id', clientId)
        .order('year', { ascending: false })

    if (yearlyErr) {
        console.error('Error fetching client_yearly_stats:', yearlyErr)
    }

    // 3. Fetch special assessments
    const { data: specialAssessments, error: specialErr } = await supabase
        .from('client_special_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('year', { ascending: false })

    if (specialErr) {
        console.error('Error fetching client_special_assessments:', specialErr)
    }

    return {
        total_square_feet,
        construction_year,
        yearlyStats: yearlyStats || [],
        specialAssessments: specialAssessments || []
    }
}

export async function saveSyndicateStatsAction(
    clientId: string,
    totalSquareFeet: number | null,
    constructionYear: number | null,
    yearlyStats: YearlyStatInput[],
    specialAssessments: SpecialAssessmentInput[]
) {
    const supabase = await createClient()

    // 1. Update total_square_feet and construction_year on public.clients (with fallback)
    let clientErr: any = null
    const { error: errBoth } = await supabase
        .from('clients')
        .update({ 
            total_square_feet: totalSquareFeet,
            construction_year: constructionYear
        })
        .eq('id', clientId)

    if (errBoth) {
        // Fallback to only updating total_square_feet in case construction_year doesn't exist yet
        const { error: errFallback } = await supabase
            .from('clients')
            .update({ total_square_feet: totalSquareFeet })
            .eq('id', clientId)
        clientErr = errFallback
        if (errFallback) {
            throw new Error(`Failed to update client stats: ${errFallback.message}`)
        }
    }

    // 2. Save client_yearly_stats
    // Fetch existing stats to determine what to delete
    const { data: existingYearly } = await supabase
        .from('client_yearly_stats')
        .select('id')
        .eq('client_id', clientId)

    const keepYearlyIds = yearlyStats.map(y => y.id).filter(Boolean) as string[]
    const deleteYearlyIds = (existingYearly || [])
        .map(y => y.id)
        .filter(id => !keepYearlyIds.includes(id))

    if (deleteYearlyIds.length > 0) {
        await supabase
            .from('client_yearly_stats')
            .delete()
            .in('id', deleteYearlyIds)
    }

    // Upsert yearly stats
    for (const stat of yearlyStats) {
        const payload = {
            client_id: clientId,
            year: stat.year,
            building_valuation: stat.building_valuation || 0,
            regular_condo_fees: stat.regular_condo_fees || 0,
            prevention_fund_fees: stat.prevention_fund_fees || 0,
            insurance_fund_fees: stat.insurance_fund_fees || 0
        }
        if (stat.id) {
            await supabase
                .from('client_yearly_stats')
                .update(payload)
                .eq('id', stat.id)
        } else {
            await supabase
                .from('client_yearly_stats')
                .insert(payload)
        }
    }

    // 3. Save client_special_assessments
    // Delete all existing assessments for simplicity and insert new list
    const { error: deleteAssessErr } = await supabase
        .from('client_special_assessments')
        .delete()
        .eq('client_id', clientId)

    if (deleteAssessErr) {
        throw new Error(`Failed to delete existing special assessments: ${deleteAssessErr.message}`)
    }

    if (specialAssessments.length > 0) {
        const payload = specialAssessments.map(s => ({
            client_id: clientId,
            year: s.year,
            amount: s.amount || 0,
            fund_type: s.fund_type,
            title: s.title || ''
        }))
        const { error: insertAssessErr } = await supabase
            .from('client_special_assessments')
            .insert(payload)

        if (insertAssessErr) {
            throw new Error(`Failed to insert special assessments: ${insertAssessErr.message}`)
        }
    }

    revalidatePath(`/global-settings/clients/${clientId}`)
    revalidatePath('/global-settings')
}

export async function getGlobalSyndicateStatsAction() {
    const supabase = await createClient()

    // 1. Fetch active clients
    const { data: clients, error: clientsErr } = await supabase
        .from('clients')
        .select('id, company_name, full_name, total_square_feet')
        .eq('status', 'active')
        .order('company_name')

    if (clientsErr || !clients) return []

    // 2. Fetch all yearly stats
    const { data: allYearly, error: yearlyErr } = await supabase
        .from('client_yearly_stats')
        .select('*')

    // 3. Fetch all special assessments
    const { data: allAssessments, error: assessErr } = await supabase
        .from('client_special_assessments')
        .select('*')

    // Group yearly stats by client
    const yearlyMap = new Map<string, any[]>()
    for (const y of (allYearly || [])) {
        if (!yearlyMap.has(y.client_id)) yearlyMap.set(y.client_id, [])
        yearlyMap.get(y.client_id)!.push(y)
    }

    // Group assessments by client
    const assessMap = new Map<string, any[]>()
    for (const s of (allAssessments || [])) {
        if (!assessMap.has(s.client_id)) assessMap.set(s.client_id, [])
        assessMap.get(s.client_id)!.push(s)
    }

    return clients.map(c => {
        const yearly = (yearlyMap.get(c.id) || []).sort((a, b) => b.year - a.year) // descending order
        const assessments = assessMap.get(c.id) || []

        const latestYearly = yearly[0] || null

        // Sum of all special assessments
        const totalAssessments = assessments.reduce((sum, s) => sum + Number(s.amount || 0), 0)

        return {
            id: c.id,
            company_name: c.company_name,
            full_name: c.full_name,
            total_square_feet: c.total_square_feet || null,
            latestYearly,
            yearlyStats: yearly,
            specialAssessments: assessments,
            totalAssessments
        }
    })
}
