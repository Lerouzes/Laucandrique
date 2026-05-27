'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createBaseClient } from '@supabase/supabase-js'

// ==========================================
// 1. DYNAMIC STATISTICS & KPI ENGINE
// ==========================================

export async function getManagerStats(managerId: string) {
    const supabase = await createClient()
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()

    // 1. Basic Manager and Team info
    const { data: manager } = await supabase
        .from('managers')
        .select('*, manager_teams(*)')
        .eq('id', managerId)
        .single()

    if (!manager) return null

    // 2. Syndicates (Clients) count and doors
    // Active if status is active or departure date is in the future
    const { data: syndicates } = await supabase
        .from('clients')
        .select('*, contracts(*)')
        .eq('manager_id', managerId)

    const activeSyndicates = (syndicates || []).filter(c => {
        const isActiveStatus = c.status === 'active' || !c.status
        const notDepartedYet = !c.departure_date || new Date(c.departure_date) > now
        return isActiveStatus && notDepartedYet
    })

    const syndicatesCount = activeSyndicates.length

    // Sum doors count from buildings/doors in a single query
    const activeSyndicateIds = activeSyndicates.map(c => c.id)
    let doorsCount = 0
    if (activeSyndicateIds.length > 0) {
        const { count } = await supabase
            .from('doors')
            .select('id', { count: 'exact', head: true })
            .in('client_id', activeSyndicateIds)
        doorsCount = count || 0
    }


    // 3. Monthly Recurring Revenue (MRR)
    const mrr = activeSyndicates.reduce((acc, c) => {
        const contract = Array.isArray(c.contracts) ? c.contracts[0] : c.contracts
        const fee = Number(contract?.monthly_fee || 0)
        return acc + fee
    }, 0)

    // 4. Lost Syndicates YTD
    const { data: lostList } = await supabase
        .from('lost_syndicates')
        .select('*')
        .eq('manager_id', managerId)
        .gte('departure_date', startOfYear.substring(0, 10))

    const lostYtd = lostList?.length || 0

    // 5. New Syndicates YTD
    const { data: newList } = await supabase
        .from('clients')
        .select('*')
        .eq('manager_id', managerId)
        .gte('created_at', startOfYear)
    
    // Filter active new ones
    const newYtd = (newList || []).filter(c => {
        const hasDeparture = !!c.departure_date
        return !hasDeparture || new Date(c.departure_date as string) > now
    }).length

    // 6. Last One-on-One
    const { data: last1v1 } = await supabase
        .from('one_on_ones')
        .select('meeting_date')
        .eq('manager_id', managerId)
        .eq('status', 'completed')
        .order('meeting_date', { ascending: false })
        .limit(1)

    const lastOneOnOneDate = last1v1?.[0]?.meeting_date || null

    // 7. Call stats (Latest Month)
    const { data: latestCalls } = await supabase
        .from('manager_monthly_calls')
        .select('*')
        .eq('manager_id', managerId)
        .order('year_month', { ascending: false })
        .limit(1)

    const totalCalls = latestCalls?.[0]?.total_calls || 0
    const answeredCalls = latestCalls?.[0]?.answered_calls || 0
    const callsAnsweredPct = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

    // 8. Workload Manual Inputs (Latest Month)
    const { data: latestWorkload } = await supabase
        .from('manager_monthly_workload')
        .select('*')
        .eq('manager_id', managerId)
        .order('year_month', { ascending: false })
        .limit(1)

    const communicationsReceived = latestWorkload?.[0]?.communications_received || 0
    const openTasks = latestWorkload?.[0]?.open_tasks || 0
    const closedTasks = latestWorkload?.[0]?.closed_tasks || 0

    // 9. Weighted Workload Index Calculation
    // Scale: Syndicates * 6 + Doors * 0.15 + Comms * 0.2 + Open Tasks * 0.8 + Calls * 0.1
    const workloadIndex = Math.round(
        (syndicatesCount * 6) +
        (doorsCount * 0.15) +
        (communicationsReceived * 0.2) +
        (openTasks * 0.8) +
        (totalCalls * 0.1)
    )

    // 10. Performance Score Calculation
    // Composition: Call answer rate (30%), task completion rate (30%), audit average score (40%)
    let taskCompletionPct = 100
    if (openTasks + closedTasks > 0) {
        taskCompletionPct = Math.round((closedTasks / (openTasks + closedTasks)) * 100)
    }

    // Get audit average for manager's syndicates
    const clientIds = activeSyndicates.map(c => c.id)
    let auditScoreAvg = 80 // Default benchmark
    if (clientIds.length > 0) {
        const { data: audits } = await supabase
            .from('syndicate_audits')
            .select('health_score')
            .in('client_id', clientIds)
            .order('audit_date', { ascending: false })
        
        if (audits && audits.length > 0) {
            const sum = audits.reduce((acc, a) => acc + Number(a.health_score || 0), 0)
            auditScoreAvg = sum / audits.length
        }
    }

    const performanceScore = Math.round(
        (callsAnsweredPct * 0.3) +
        (taskCompletionPct * 0.3) +
        (auditScoreAvg * 0.4)
    ) || 75

    // 11. Risk Level & Alerts
    let riskPoints = 0
    const alerts: string[] = []

    // Check last 1-on-1 delay
    if (lastOneOnOneDate) {
        const diffDays = Math.floor((now.getTime() - new Date(lastOneOnOneDate).getTime()) / 86400000)
        if (diffDays > 30) {
            riskPoints += 20
            alerts.push('Pas de rencontre 1-à-1 depuis plus de 30 jours')
        }
    } else {
        riskPoints += 30
        alerts.push('Aucun 1-à-1 complété')
    }

    // Check audit alerts
    if (clientIds.length > 0) {
        const { data: criticalAudits } = await supabase
            .from('syndicate_audits')
            .select('health_score, clients(company_name)')
            .in('client_id', clientIds)
            .lt('health_score', 60)
        
        if (criticalAudits && criticalAudits.length > 0) {
            riskPoints += 30
            criticalAudits.forEach(a => {
                const name = (a.clients as any)?.company_name || 'Syndicate'
                alerts.push(`Santé critique (${Math.round(Number(a.health_score))}%): ${name}`)
            })
        }
    }

    // Check open complaints
    const { data: openComplaints } = await supabase
        .from('complaints')
        .select('*')
        .eq('manager_id', managerId)
        .eq('status', 'open')

    if (openComplaints && openComplaints.length > 0) {
        riskPoints += openComplaints.length * 10
        if (openComplaints.some(c => c.severity === 'critical' || c.severity === 'high')) {
            riskPoints += 15
            alerts.push(`Plainte client sévère en attente de résolution`)
        }
    }

    let riskLevel: 'Faible' | 'Modéré' | 'Élevé' | 'Critique' = 'Faible'
    if (riskPoints >= 60) riskLevel = 'Critique'
    else if (riskPoints >= 40) riskLevel = 'Élevé'
    else if (riskPoints >= 20) riskLevel = 'Modéré'

    // 12. Package Changes Count
    const { data: pLogs } = await supabase
        .from('package_change_logs')
        .select('*')
        .in('client_id', clientIds)
    const packageChangesCount = pLogs?.length || 0

    // 13. Operation Tab Quotes / Projects stats
    const { data: managerQuotes } = await supabase
        .from('quotes')
        .select('status')
        .eq('manager_id', managerId)

    const approvedQuotesCount = (managerQuotes || []).filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const deniedQuotesCount = (managerQuotes || []).filter(q => q.status === 'denied').length
    const sentQuotesCount = (managerQuotes || []).filter(q => q.status === 'sent').length
    const quotesTotalPresented = approvedQuotesCount + deniedQuotesCount + sentQuotesCount
    const quoteApprovalRate = quotesTotalPresented > 0 ? Math.round((approvedQuotesCount / quotesTotalPresented) * 100) : 0

    return {
        manager,
        syndicatesCount,
        doorsCount,
        mrr,
        lostYtd,
        newYtd,
        lastOneOnOneDate,
        totalCalls,
        answeredCalls,
        callsAnsweredPct,
        communicationsReceived,
        openTasks,
        closedTasks,
        workloadIndex,
        performanceScore,
        riskLevel,
        alerts,
        packageChangesCount,
        quoteApprovalRate,
        approvedQuotesCount,
        deniedQuotesCount,
        sentQuotesCount
    }
}

export async function getGlobalTeamStats() {
    const supabase = await createClient()
    const now = new Date()

    // Count Active clients (Syndicates)
    const { data: clients } = await supabase
        .from('clients')
        .select('*, contracts(*)')

    const activeClients = (clients || []).filter(c => {
        const isActiveStatus = c.status === 'active' || !c.status
        const notDepartedYet = !c.departure_date || new Date(c.departure_date) > now
        return isActiveStatus && notDepartedYet
    })

    // Doors sum (optimized single query)
    const activeClientIds = activeClients.map(c => c.id)
    let totalDoors = 0
    if (activeClientIds.length > 0) {
        const { count } = await supabase
            .from('doors')
            .select('id', { count: 'exact', head: true })
            .in('client_id', activeClientIds)
        totalDoors = count || 0
    }


    // Monthly recurring revenue
    const mrr = activeClients.reduce((acc, c) => {
        const contract = Array.isArray(c.contracts) ? c.contracts[0] : c.contracts
        const fee = Number(contract?.monthly_fee || 0)
        return acc + fee
    }, 0)

    // Contract counts by package
    const packageCounts = {
        Bronze: 0,
        Argent: 0,
        'Argent+': 0,
        Or: 0,
        Platinum: 0
    }

    activeClients.forEach(c => {
        const contract = Array.isArray(c.contracts) ? c.contracts[0] : c.contracts
        const pkgName = contract?.package_name as keyof typeof packageCounts
        if (pkgName && pkgName in packageCounts) {
            packageCounts[pkgName]++
        }
    })

    // Meetings count (1v1s)
    const { count: meetingsCount } = await supabase
        .from('one_on_ones')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')

    // At risk and critical syndicates
    const { data: audits } = await supabase
        .from('syndicate_audits')
        .select('client_id, health_score')
        .order('audit_date', { ascending: false })

    const latestAuditMap: Record<string, number> = {}
    audits?.forEach(a => {
        if (!latestAuditMap[a.client_id]) {
            latestAuditMap[a.client_id] = Number(a.health_score)
        }
    })

    let atRiskCount = 0
    let criticalCount = 0
    Object.values(latestAuditMap).forEach(score => {
        if (score < 60) criticalCount++
        else if (score < 75) atRiskCount++
    })

    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().substring(0, 10)

    // Lost Syndicates YTD
    const { count: lostCount } = await supabase
        .from('lost_syndicates')
        .select('id', { count: 'exact', head: true })
        .gte('departure_date', startOfYear)

    // New Syndicates YTD
    const { count: newCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfYear)

    // Global quote stats
    const { data: allQuotes } = await supabase
        .from('quotes')
        .select('status')

    const globalApproved = (allQuotes || []).filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const globalDenied = (allQuotes || []).filter(q => q.status === 'denied').length
    const globalSent = (allQuotes || []).filter(q => q.status === 'sent').length
    const globalTotalPresented = globalApproved + globalDenied + globalSent
    const quoteApprovalRate = globalTotalPresented > 0 ? Math.round((globalApproved / globalTotalPresented) * 105) : 0 // Wait, why * 105? Ah, Math.round((globalApproved / globalTotalPresented) * 100)
    const normalizedQuoteApprovalRate = globalTotalPresented > 0 ? Math.round((globalApproved / globalTotalPresented) * 100) : 0

    return {
        totalSyndicates: activeClients.length,
        totalDoors,
        mrr,
        packageCounts,
        meetingsCount: meetingsCount || 0,
        atRiskCount,
        criticalCount,
        lostYtd: lostCount || 0,
        newYtd: newCount || 0,
        quoteApprovalRate: normalizedQuoteApprovalRate
    }
}

// ==========================================
// 2. MANUAL STATS / KPI INSERTS
// ==========================================

export async function saveMonthlyCallsAction(formData: FormData) {
    const supabase = await createClient()
    const managerId = formData.get('manager_id') as string
    const yearMonth = formData.get('year_month') as string
    const totalCalls = parseInt(formData.get('total_calls') as string, 10)
    const answeredCalls = parseInt(formData.get('answered_calls') as string, 10)

    const { error } = await supabase
        .from('manager_monthly_calls')
        .upsert({
            manager_id: managerId,
            year_month: yearMonth,
            total_calls: totalCalls,
            answered_calls: answeredCalls
        }, { onConflict: 'manager_id,year_month' })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath(`/team-management/managers/${managerId}`)
}

export async function saveMonthlyWorkloadAction(formData: FormData) {
    const supabase = await createClient()
    const managerId = formData.get('manager_id') as string
    const yearMonth = formData.get('year_month') as string
    const communicationsReceived = parseInt(formData.get('communications_received') as string, 10)
    const openTasks = parseInt(formData.get('open_tasks') as string, 10)
    const closedTasks = parseInt(formData.get('closed_tasks') as string, 10)

    const { error } = await supabase
        .from('manager_monthly_workload')
        .upsert({
            manager_id: managerId,
            year_month: yearMonth,
            communications_received: communicationsReceived,
            open_tasks: openTasks,
            closed_tasks: closedTasks
        }, { onConflict: 'manager_id,year_month' })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath(`/team-management/managers/${managerId}`)
}

// ==========================================
// 3. SYNDICATE LIFE CYCLE ACTIONS
// ==========================================

export async function recordNewSyndicateAction(formData: FormData) {
    const supabase = await createClient()
    const full_name = formData.get('full_name') as string
    const company_name = formData.get('company_name') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const manager_id = formData.get('manager_id') as string
    const package_name = formData.get('package_name') as string
    const monthly_fee = parseFloat(formData.get('monthly_fee') as string)
    const doors_count = parseInt(formData.get('doors_count') as string, 10)

    // Insert Client
    const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({
            full_name,
            company_name,
            address,
            city,
            manager_id,
            status: 'active'
        })
        .select()
        .single()

    if (cErr) throw new Error(cErr.message)

    // Insert Contract
    const { error: contractErr } = await supabase
        .from('contracts')
        .insert({
            client_id: client.id,
            package_name,
            monthly_fee,
            start_date: new Date().toISOString().substring(0, 10),
            active: true
        })

    if (contractErr) throw new Error(contractErr.message)

    // Create a Building for the client
    const { data: bld, error: bldErr } = await supabase
        .from('buildings')
        .insert({
            client_id: client.id,
            name: company_name,
            address
        })
        .select()
        .single()

    if (bldErr) throw new Error(bldErr.message)

    // Create doors bulk
    if (doors_count > 0) {
        const doorsData = []
        for (let i = 1; i <= doors_count; i++) {
            doorsData.push({
                building_id: bld.id,
                client_id: client.id,
                door_number: `Apt ${100 + i}`,
                notes: 'Généré automatiquement'
            })
        }
        await supabase.from('doors').insert(doorsData)
    }

    // Log package change
    await supabase.from('package_change_logs').insert({
        client_id: client.id,
        new_package: package_name,
        notes: 'Initialisation à la création du syndicat'
    })

    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/managers')
    if (manager_id) revalidatePath(`/team-management/managers/${manager_id}`)
}

export async function recordLostSyndicateAction(formData: FormData) {
    const supabase = await createClient()
    const client_id = formData.get('client_id') as string
    const departure_date = formData.get('departure_date') as string
    const reason_category = formData.get('reason_category') as string
    const reason_details = formData.get('reason_details') as string
    const preventable = formData.get('preventable') === 'true'
    const root_cause = formData.get('root_cause') as string
    const board_relationship_score = parseInt(formData.get('board_relationship_score') as string, 10)
    const competitor = formData.get('competitor') as string

    // Fetch details to find manager_id
    const { data: client } = await supabase
        .from('clients')
        .select('manager_id')
        .eq('id', client_id)
        .single()

    const managerId = client?.manager_id

    // Update Client Status
    const { error: updErr } = await supabase
        .from('clients')
        .update({
            status: 'inactive',
            departure_date
        })
        .eq('id', client_id)

    if (updErr) throw new Error(updErr.message)

    // Insert Lost Syndicate stats
    const { error: insErr } = await supabase
        .from('lost_syndicates')
        .insert({
            client_id,
            manager_id: managerId,
            departure_date,
            reason_category,
            reason_details,
            preventable,
            root_cause,
            board_relationship_score,
            competitor
        })

    if (insErr) throw new Error(insErr.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/managers')
    if (managerId) revalidatePath(`/team-management/managers/${managerId}`)
}

export async function recordPackageChangeAction(formData: FormData) {
    const supabase = await createClient()
    const client_id = formData.get('client_id') as string
    const new_package = formData.get('new_package') as string
    const monthly_fee = parseFloat(formData.get('monthly_fee') as string)
    const notes = formData.get('notes') as string

    // Fetch current contract
    const { data: oldContract } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', client_id)
        .single()

    const oldPackage = oldContract?.package_name || null

    // Update contract
    const { error: updErr } = await supabase
        .from('contracts')
        .upsert({
            client_id,
            package_name: new_package,
            monthly_fee,
            active: true
        }, { onConflict: 'client_id' })

    if (updErr) throw new Error(updErr.message)

    // Log the change
    const { error: logErr } = await supabase
        .from('package_change_logs')
        .insert({
            client_id,
            old_package: oldPackage,
            new_package,
            notes
        })

    if (logErr) throw new Error(logErr.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/managers')
}

// ==========================================
// 4. ONE-ON-ONE MEETING ACTIONS
// ==========================================

export async function createOneOnOneAction(data: {
    manager_id: string
    meeting_date: string
    status: 'draft' | 'completed'
    emails_over_48h: number
    late_tasks: number
    calls_total: number
    calls_answered: number
    bills_no_notes_over_7d: number
    op_reports_closed: number
    agenda_templates_used: number
    assemblies_on_time: number
    syndicates_lost: number
    package_changes: number
    current_issues: string
    main_objectives: string
    recent_wins: string
    difficult_situations: string
    priority_1: string
    priority_2: string
    priority_3: string
    training_requested: string
    escalation_needed: string
    operational_blockers: string
    conflict_resolution: string
    workload_notes?: string
    prioritization_notes?: string
    stress_notes?: string
    organization_notes?: string
    support_needed?: string
    training_needed?: string
    meeting_score?: number
    commitments?: Array<{
        commitment_text: string
        owner?: string
        due_date?: string | null
        due_next_review?: boolean
        status?: string
        notes?: string
        completed?: boolean
        why_not?: string
        failure_reason?: string
        carried_forward?: boolean
        client_id?: string | null
    }>
    complaints?: Array<{
        complaint_id: string
        discussion_notes?: string
        resolution_plan?: string
        resolved_in_meeting?: boolean
        my_notes?: string
        manager_notes?: string
        reviewed?: boolean
        title?: string
        description?: string
        severity?: 'low' | 'medium' | 'high' | 'critical'
        category_id?: string | null
    }>
    reviewedAudits?: Array<{
        audit_id: string
        my_notes?: string
        manager_notes?: string
        reviewed?: boolean
    }>
    reviewedAssemblies?: Array<{
        assembly_evaluation_id: string
        my_notes?: string
        manager_notes?: string
        reviewed?: boolean
    }>
    taskEmailAudits?: Array<{
        type: 'task' | 'email'
        title: string
        client_id?: string | null
        has_followup_date?: boolean
        has_good_description?: boolean
        has_actions?: boolean
        has_category_selected?: boolean
        task_created_date?: string | null
        complexity?: 'low' | 'medium' | 'high' | null
        review_notes?: string
    }>
    operationalRisks?: Array<{
        id?: string
        description: string
        severity: 'low' | 'medium' | 'high' | 'critical'
        status: 'active' | 'resolved'
        resolution_notes?: string
        resolved_date?: string | null
        client_id?: string | null
        future_actions?: string | null
    }>
}) {
    const supabase = await createClient()

    // Insert 1v1
    const { data: meeting, error: err } = await supabase
        .from('one_on_ones')
        .insert({
            manager_id: data.manager_id,
            meeting_date: data.meeting_date,
            status: data.status,
            emails_over_48h: data.emails_over_48h,
            late_tasks: data.late_tasks,
            calls_total: data.calls_total,
            calls_answered: data.calls_answered,
            bills_no_notes_over_7d: data.bills_no_notes_over_7d,
            op_reports_closed: data.op_reports_closed,
            agenda_templates_used: data.agenda_templates_used,
            assemblies_on_time: data.assemblies_on_time,
            syndicates_lost: data.syndicates_lost,
            package_changes: data.package_changes,
            current_issues: data.current_issues,
            main_objectives: data.main_objectives,
            recent_wins: data.recent_wins,
            difficult_situations: data.difficult_situations,
            priority_1: data.priority_1,
            priority_2: data.priority_2,
            priority_3: data.priority_3,
            training_requested: data.training_requested,
            escalation_needed: data.escalation_needed,
            operational_blockers: data.operational_blockers,
            conflict_resolution: data.conflict_resolution,
            workload_notes: data.workload_notes || null,
            prioritization_notes: data.prioritization_notes || null,
            stress_notes: data.stress_notes || null,
            organization_notes: data.organization_notes || null,
            support_needed: data.support_needed || null,
            training_needed: data.training_needed || null,
            meeting_score: data.meeting_score || null
        })
        .select()
        .single()

    if (err) throw new Error(err.message)

    // Insert Commitments
    if (data.commitments && data.commitments.length > 0) {
        const comms = data.commitments.map(c => ({
            one_on_one_id: meeting.id,
            commitment_text: c.commitment_text,
            owner: c.owner || 'Manager',
            due_date: c.due_date || null,
            due_next_review: c.due_next_review || false,
            status: c.status || 'Open',
            notes: c.notes || null,
            completed: c.completed || false,
            why_not: c.why_not || null,
            failure_reason: (c.failure_reason as any) || null,
            carried_forward: c.carried_forward || false,
            client_id: c.client_id || null
        }))
        const { error: commsErr } = await supabase.from('one_on_one_commitments').insert(comms)
        if (commsErr) throw new Error(commsErr.message)
    }

    // Insert Complaints Discussions
    if (data.complaints && data.complaints.length > 0) {
        const compData = data.complaints.map(c => ({
            one_on_one_id: meeting.id,
            complaint_id: c.complaint_id,
            discussion_notes: c.discussion_notes || c.my_notes || null,
            resolution_plan: c.resolution_plan || null,
            resolved_in_meeting: c.resolved_in_meeting || false,
            my_notes: c.my_notes || null,
            manager_notes: c.manager_notes || null,
            reviewed: c.reviewed || false
        }))
        const { error: compErr } = await supabase.from('one_on_one_complaints').insert(compData)
        if (compErr) throw new Error(compErr.message)

        // Resolve addressed complaints if marked as resolved, and update modified details
        for (const c of data.complaints) {
            const updates: Record<string, any> = {}
            if (c.resolved_in_meeting) {
                updates.status = 'resolved'
                updates.resolved_date = data.meeting_date
            }
            if (c.title) updates.title = c.title
            if (c.description) updates.description = c.description
            if (c.severity) updates.severity = c.severity
            if (c.category_id !== undefined) updates.category_id = c.category_id

            if (Object.keys(updates).length > 0) {
                await supabase
                    .from('complaints')
                    .update(updates)
                    .eq('id', c.complaint_id)
            }
        }
    }

    // Insert Reviewed Audits
    if (data.reviewedAudits && data.reviewedAudits.length > 0) {
        const auditData = data.reviewedAudits.map(a => ({
            one_on_one_id: meeting.id,
            audit_id: a.audit_id,
            my_notes: a.my_notes || null,
            manager_notes: a.manager_notes || null,
            reviewed: a.reviewed || false
        }))
        const { error: auditErr } = await supabase.from('one_on_one_syndicate_audits').insert(auditData)
        if (auditErr) throw new Error(auditErr.message)
    }

    // Insert Reviewed Assemblies
    if (data.reviewedAssemblies && data.reviewedAssemblies.length > 0) {
        const assemblyData = data.reviewedAssemblies.map(a => ({
            one_on_one_id: meeting.id,
            assembly_evaluation_id: a.assembly_evaluation_id,
            my_notes: a.my_notes || null,
            manager_notes: a.manager_notes || null,
            reviewed: a.reviewed || false
        }))
        const { error: assErr } = await supabase.from('one_on_one_assemblies').insert(assemblyData)
        if (assErr) throw new Error(assErr.message)
    }

    // Insert Task/Email Audits
    if (data.taskEmailAudits && data.taskEmailAudits.length > 0) {
        const auditData = data.taskEmailAudits.map(t => ({
            one_on_one_id: meeting.id,
            type: t.type,
            title: t.title,
            client_id: t.client_id || null,
            has_followup_date: t.has_followup_date || false,
            has_good_description: t.has_good_description || false,
            has_actions: t.has_actions || false,
            has_category_selected: t.has_category_selected || false,
            task_created_date: t.task_created_date || null,
            complexity: t.complexity || null,
            review_notes: t.review_notes || null
        }))
        const { error: taskErr } = await supabase.from('one_on_one_task_email_audits').insert(auditData)
        if (taskErr) throw new Error(taskErr.message)
    }

    // Insert/Update Operational Risks
    if (data.operationalRisks && data.operationalRisks.length > 0) {
        for (const r of data.operationalRisks) {
            if (r.id) {
                await supabase
                    .from('manager_operational_risks')
                    .update({
                        description: r.description,
                        severity: r.severity,
                        status: r.status,
                        resolution_notes: r.resolution_notes || null,
                        resolved_date: r.resolved_date || null,
                        client_id: r.client_id || null,
                        future_actions: r.future_actions || null
                    })
                    .eq('id', r.id)
            } else {
                await supabase
                    .from('manager_operational_risks')
                    .insert({
                        manager_id: data.manager_id,
                        one_on_one_id: meeting.id,
                        description: r.description,
                        severity: r.severity,
                        status: r.status,
                        resolution_notes: r.resolution_notes || null,
                        resolved_date: r.resolved_date || null,
                        client_id: r.client_id || null,
                        future_actions: r.future_actions || null
                    })
            }
        }
    }

    revalidatePath('/team-management/one-on-ones')
    revalidatePath('/team-management/complaints')
    revalidatePath(`/team-management/managers/${data.manager_id}`)
    return meeting
}

export async function updateOneOnOneAction(id: string, data: {
    meeting_date: string
    status: 'draft' | 'completed'
    emails_over_48h: number
    late_tasks: number
    calls_total: number
    calls_answered: number
    bills_no_notes_over_7d: number
    op_reports_closed: number
    agenda_templates_used: number
    assemblies_on_time: number
    syndicates_lost: number
    package_changes: number
    current_issues: string
    main_objectives: string
    recent_wins: string
    difficult_situations: string
    priority_1: string
    priority_2: string
    priority_3: string
    training_requested: string
    escalation_needed: string
    operational_blockers: string
    conflict_resolution: string
    workload_notes?: string
    prioritization_notes?: string
    stress_notes?: string
    organization_notes?: string
    support_needed?: string
    training_needed?: string
    meeting_score?: number
    commitments: Array<{
        id?: string
        commitment_text: string
        owner?: string
        due_date?: string | null
        due_next_review?: boolean
        status?: string
        notes?: string
        completed?: boolean
        why_not?: string
        failure_reason?: string
        carried_forward?: boolean
        client_id?: string | null
    }>
    complaints?: Array<{
        complaint_id: string
        my_notes?: string
        manager_notes?: string
        reviewed?: boolean
        resolved_in_meeting?: boolean
        discussion_notes?: string
        resolution_plan?: string
        title?: string
        description?: string
        severity?: 'low' | 'medium' | 'high' | 'critical'
        category_id?: string | null
    }>
    reviewedAudits?: Array<{
        audit_id: string
        my_notes?: string
        manager_notes?: string
        reviewed?: boolean
    }>
    reviewedAssemblies?: Array<{
        assembly_evaluation_id: string
        my_notes?: string
        manager_notes?: string
        reviewed?: boolean
    }>
    taskEmailAudits?: Array<{
        type: 'task' | 'email'
        title: string
        client_id?: string | null
        has_followup_date?: boolean
        has_good_description?: boolean
        has_actions?: boolean
        has_category_selected?: boolean
        task_created_date?: string | null
        complexity?: 'low' | 'medium' | 'high' | null
        review_notes?: string
    }>
    operationalRisks?: Array<{
        id?: string
        description: string
        severity: 'low' | 'medium' | 'high' | 'critical'
        status: 'active' | 'resolved'
        resolution_notes?: string
        resolved_date?: string | null
        client_id?: string | null
        future_actions?: string | null
    }>
}) {
    const supabase = await createClient()

    // Fetch manager_id for cache revalidation
    const { data: oldMeeting } = await supabase
        .from('one_on_ones')
        .select('manager_id')
        .eq('id', id)
        .single()

    if (!oldMeeting) throw new Error("One-on-One meeting not found")
    const managerId = oldMeeting.manager_id

    // Update meeting
    const { error: err } = await supabase
        .from('one_on_ones')
        .update({
            meeting_date: data.meeting_date,
            status: data.status,
            emails_over_48h: data.emails_over_48h,
            late_tasks: data.late_tasks,
            calls_total: data.calls_total,
            calls_answered: data.calls_answered,
            bills_no_notes_over_7d: data.bills_no_notes_over_7d,
            op_reports_closed: data.op_reports_closed,
            agenda_templates_used: data.agenda_templates_used,
            assemblies_on_time: data.assemblies_on_time,
            syndicates_lost: data.syndicates_lost,
            package_changes: data.package_changes,
            current_issues: data.current_issues,
            main_objectives: data.main_objectives,
            recent_wins: data.recent_wins,
            difficult_situations: data.difficult_situations,
            priority_1: data.priority_1,
            priority_2: data.priority_2,
            priority_3: data.priority_3,
            training_requested: data.training_requested,
            escalation_needed: data.escalation_needed,
            operational_blockers: data.operational_blockers,
            conflict_resolution: data.conflict_resolution,
            workload_notes: data.workload_notes || null,
            prioritization_notes: data.prioritization_notes || null,
            stress_notes: data.stress_notes || null,
            organization_notes: data.organization_notes || null,
            support_needed: data.support_needed || null,
            training_needed: data.training_needed || null,
            meeting_score: data.meeting_score || null
        })
        .eq('id', id)

    if (err) throw new Error(err.message)

    // Handle commitments sync
    const updatedCommitmentIds = data.commitments.map(c => c.id).filter(Boolean) as string[]
    if (updatedCommitmentIds.length > 0) {
        await supabase
            .from('one_on_one_commitments')
            .delete()
            .eq('one_on_one_id', id)
            .not('id', 'in', `(${updatedCommitmentIds.join(',')})`)
    } else {
        await supabase
            .from('one_on_one_commitments')
            .delete()
            .eq('one_on_one_id', id)
    }

    // Insert new or update existing commitments
    for (const c of data.commitments) {
        if (c.id) {
            await supabase
                .from('one_on_one_commitments')
                .update({
                    commitment_text: c.commitment_text,
                    completed: c.completed || false,
                    why_not: c.why_not || null,
                    failure_reason: (c.failure_reason as any) || null,
                    carried_forward: c.carried_forward || false,
                    owner: c.owner || 'Manager',
                    due_date: c.due_date || null,
                    due_next_review: c.due_next_review || false,
                    status: c.status || 'Open',
                    notes: c.notes || null,
                    client_id: c.client_id || null
                })
                .eq('id', c.id)
        } else {
            await supabase
                .from('one_on_one_commitments')
                .insert({
                    one_on_one_id: id,
                    commitment_text: c.commitment_text,
                    completed: c.completed || false,
                    why_not: c.why_not || null,
                    failure_reason: (c.failure_reason as any) || null,
                    carried_forward: c.carried_forward || false,
                    owner: c.owner || 'Manager',
                    due_date: c.due_date || null,
                    due_next_review: c.due_next_review || false,
                    status: c.status || 'Open',
                    notes: c.notes || null,
                    client_id: c.client_id || null
                })
        }
    }

    // Sync complaints discussions
    await supabase.from('one_on_one_complaints').delete().eq('one_on_one_id', id)
    if (data.complaints && data.complaints.length > 0) {
        const compData = data.complaints.map(c => ({
            one_on_one_id: id,
            complaint_id: c.complaint_id,
            discussion_notes: c.discussion_notes || c.my_notes || null,
            resolution_plan: c.resolution_plan || null,
            resolved_in_meeting: c.resolved_in_meeting || false,
            my_notes: c.my_notes || null,
            manager_notes: c.manager_notes || null,
            reviewed: c.reviewed || false
        }))
        const { error: compErr } = await supabase.from('one_on_one_complaints').insert(compData)
        if (compErr) throw new Error(compErr.message)

        for (const c of data.complaints) {
            const updates: Record<string, any> = {}
            if (c.resolved_in_meeting) {
                updates.status = 'resolved'
                updates.resolved_date = data.meeting_date
            }
            if (c.title) updates.title = c.title
            if (c.description) updates.description = c.description
            if (c.severity) updates.severity = c.severity
            if (c.category_id !== undefined) updates.category_id = c.category_id

            if (Object.keys(updates).length > 0) {
                await supabase
                    .from('complaints')
                    .update(updates)
                    .eq('id', c.complaint_id)
            }
        }
    }

    // Sync reviewed syndicate audits
    await supabase.from('one_on_one_syndicate_audits').delete().eq('one_on_one_id', id)
    if (data.reviewedAudits && data.reviewedAudits.length > 0) {
        const auditData = data.reviewedAudits.map(a => ({
            one_on_one_id: id,
            audit_id: a.audit_id,
            my_notes: a.my_notes || null,
            manager_notes: a.manager_notes || null,
            reviewed: a.reviewed || false
        }))
        const { error: auditErr } = await supabase.from('one_on_one_syndicate_audits').insert(auditData)
        if (auditErr) throw new Error(auditErr.message)
    }

    // Sync reviewed assemblies
    await supabase.from('one_on_one_assemblies').delete().eq('one_on_one_id', id)
    if (data.reviewedAssemblies && data.reviewedAssemblies.length > 0) {
        const assemblyData = data.reviewedAssemblies.map(a => ({
            one_on_one_id: id,
            assembly_evaluation_id: a.assembly_evaluation_id,
            my_notes: a.my_notes || null,
            manager_notes: a.manager_notes || null,
            reviewed: a.reviewed || false
        }))
        const { error: assErr } = await supabase.from('one_on_one_assemblies').insert(assemblyData)
        if (assErr) throw new Error(assErr.message)
    }

    // Sync Task/Email audits
    await supabase.from('one_on_one_task_email_audits').delete().eq('one_on_one_id', id)
    if (data.taskEmailAudits && data.taskEmailAudits.length > 0) {
        const auditData = data.taskEmailAudits.map(t => ({
            one_on_one_id: id,
            type: t.type,
            title: t.title,
            client_id: t.client_id || null,
            has_followup_date: t.has_followup_date || false,
            has_good_description: t.has_good_description || false,
            has_actions: t.has_actions || false,
            has_category_selected: t.has_category_selected || false,
            task_created_date: t.task_created_date || null,
            complexity: t.complexity || null,
            review_notes: t.review_notes || null
        }))
        const { error: taskErr } = await supabase.from('one_on_one_task_email_audits').insert(auditData)
        if (taskErr) throw new Error(taskErr.message)
    }

    // Sync Operational Risks
    if (data.operationalRisks) {
        const currentMeetingRiskIds = data.operationalRisks.map(r => r.id).filter(Boolean) as string[]
        if (currentMeetingRiskIds.length > 0) {
            await supabase
                .from('manager_operational_risks')
                .delete()
                .eq('one_on_one_id', id)
                .not('id', 'in', `(${currentMeetingRiskIds.join(',')})`)
        } else {
            await supabase
                .from('manager_operational_risks')
                .delete()
                .eq('one_on_one_id', id)
        }

        for (const r of data.operationalRisks) {
            if (r.id) {
                await supabase
                    .from('manager_operational_risks')
                    .update({
                        description: r.description,
                        severity: r.severity,
                        status: r.status,
                        resolution_notes: r.resolution_notes || null,
                        resolved_date: r.resolved_date || null,
                        client_id: r.client_id || null,
                        future_actions: r.future_actions || null
                    })
                    .eq('id', r.id)
            } else {
                await supabase
                    .from('manager_operational_risks')
                    .insert({
                        manager_id: managerId,
                        one_on_one_id: id,
                        description: r.description,
                        severity: r.severity,
                        status: r.status,
                        resolution_notes: r.resolution_notes || null,
                        resolved_date: r.resolved_date || null,
                        client_id: r.client_id || null,
                        future_actions: r.future_actions || null
                    })
            }
        }
    }

    revalidatePath('/team-management/one-on-ones')
    revalidatePath('/team-management/complaints')
    revalidatePath(`/team-management/one-on-ones/${id}`)
    revalidatePath(`/team-management/managers/${managerId}`)
}

// ==========================================
// 5. SYNDICATE AUDITS ACTIONS
// ==========================================

export async function createSyndicateAuditAction(data: {
    client_id: string
    notes?: string
    answers: Array<{ category: 'governance' | 'financial' | 'operations'; question_key: string; score: number; note?: string }>
}) {
    const supabase = await createClient()

    // Calculate overall health score dynamically
    const sum = data.answers.reduce((acc, a) => acc + a.score, 0)
    const maxPoints = data.answers.length > 0 ? data.answers.length * 5 : 1
    const health_score = Math.round((sum / maxPoints) * 100)

    const { data: audit, error: err } = await supabase
        .from('syndicate_audits')
        .insert({
            client_id: data.client_id,
            health_score,
            notes: data.notes || null
        })
        .select()
        .single()

    if (err) throw new Error(err.message)

    // Insert answers
    const answersToInsert = data.answers.map(a => ({
        audit_id: audit.id,
        category: a.category,
        question_key: a.question_key,
        score: a.score,
        note: a.note || null
    }))

    const { error: ansErr } = await supabase.from('syndicate_audit_answers').insert(answersToInsert)
    if (ansErr) throw new Error(ansErr.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/audits')
    revalidatePath('/team-management/syndicates')
    return audit
}

// ==========================================
// 6. ASSEMBLY EVALUATIONS ACTIONS
// ==========================================

export async function createAssemblyEvaluationAction(data: {
    client_id: string
    manager_id: string
    assembly_date: string
    agenda_sent_on_time: number
    quorum_respected: number
    voting_controlled: number
    duration_reasonable: number
    technical_prep_complete: number
    manager_controlled_room: number
    discussions_on_track: number
    conflict_handled_professionally: number
    answers_clear_confident: number
    board_confidence_level: number
    financial_statement_quality: number
    pv_drafted_quickly: number
    templates_respected: number
    resolutions_clear: number
    followup_tasks_created: number
    notes?: string
    recommendations?: string
    item_notes?: Record<string, string>
}) {
    const supabase = await createClient()

    const { data: evalData, error: err } = await supabase
        .from('assembly_evaluations')
        .insert({
            client_id: data.client_id,
            manager_id: data.manager_id,
            assembly_date: data.assembly_date,
            agenda_sent_on_time: data.agenda_sent_on_time,
            quorum_respected: data.quorum_respected,
            voting_controlled: data.voting_controlled,
            duration_reasonable: data.duration_reasonable,
            technical_prep_complete: data.technical_prep_complete,
            manager_controlled_room: data.manager_controlled_room,
            discussions_on_track: data.discussions_on_track,
            conflict_handled_professionally: data.conflict_handled_professionally,
            answers_clear_confident: data.answers_clear_confident,
            board_confidence_level: data.board_confidence_level,
            financial_statement_quality: data.financial_statement_quality,
            pv_drafted_quickly: data.pv_drafted_quickly,
            templates_respected: data.templates_respected,
            resolutions_clear: data.resolutions_clear,
            followup_tasks_created: data.followup_tasks_created,
            notes: data.notes || null,
            recommendations: data.recommendations || null,
            item_notes: data.item_notes || {}
        })
        .select()
        .single()

    if (err) throw new Error(err.message)

    revalidatePath('/team-management/assemblies')
    revalidatePath(`/team-management/managers/${data.manager_id}`)
    return evalData
}

// ==========================================
// 7. COMPLAINTS ACTIONS
// ==========================================

export async function createComplaintAction(formData: FormData) {
    const supabase = await createClient()
    const client_id = formData.get('client_id') as string
    const manager_id = formData.get('manager_id') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const severity = formData.get('severity') as string
    const category_id = formData.get('category_id') as string

    const { error } = await supabase
        .from('complaints')
        .insert({
            client_id,
            manager_id: manager_id || null,
            title,
            description,
            severity,
            status: 'open',
            category_id: category_id || null
        })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/complaints')
    if (manager_id) revalidatePath(`/team-management/managers/${manager_id}`)
}

export async function resolveComplaintAction(id: string) {
    const supabase = await createClient()

    // Fetch complaint to find manager_id
    const { data: comp } = await supabase
        .from('complaints')
        .select('manager_id')
        .eq('id', id)
        .single()

    const { error } = await supabase
        .from('complaints')
        .update({
            status: 'resolved',
            resolved_date: new Date().toISOString().substring(0, 10)
        })
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/complaints')
    if (comp?.manager_id) revalidatePath(`/team-management/managers/${comp.manager_id}`)
}

export async function getOneOnOneSnapshotAction(managerId: string) {
    const supabase = await createClient()
    const stats = await getManagerStats(managerId)

    // Get manager's active clients
    const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('manager_id', managerId)
        .eq('status', 'active')
    
    const clientIds = (clients || []).map(c => c.id)

    // Get all active clients/syndicates for dropdown lists
    const { data: clientsList } = await supabase
        .from('clients')
        .select('id, company_name, full_name')
        .eq('status', 'active')
        .order('company_name')

    // Fetch monthly calls history
    const { data: callsHistory } = await supabase
        .from('manager_monthly_calls')
        .select('*')
        .eq('manager_id', managerId)
        .order('year_month', { ascending: false })
        .limit(2)

    // Fetch monthly workload history
    const { data: workloadHistory } = await supabase
        .from('manager_monthly_workload')
        .select('*')
        .eq('manager_id', managerId)
        .order('year_month', { ascending: false })
        .limit(2)

    // Calculate current bills without notes older than 7 days
    let billsNoNotesCount = 0
    let billsNoNotesCountPrev = 0
    if (clientIds.length > 0) {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { data: currentOverdueBills } = await supabase
            .from('bills')
            .select('id, notes')
            .in('client_id', clientIds)
            .lt('bill_date', sevenDaysAgo.toISOString().substring(0, 10))
        billsNoNotesCount = (currentOverdueBills || []).filter(b => !b.notes || b.notes.trim() === '').length

        const thirtySevenDaysAgo = new Date()
        thirtySevenDaysAgo.setDate(thirtySevenDaysAgo.getDate() - 37)
        const { data: prevOverdueBills } = await supabase
            .from('bills')
            .select('id, notes')
            .in('client_id', clientIds)
            .lt('bill_date', thirtySevenDaysAgo.toISOString().substring(0, 10))
        billsNoNotesCountPrev = (prevOverdueBills || []).filter(b => !b.notes || b.notes.trim() === '').length
    }

    // Fetch last completed 1v1 meeting for review and commitments
    const { data: lastMeetingList } = await supabase
        .from('one_on_ones')
        .select(`
            id,
            meeting_date,
            status,
            emails_over_48h,
            late_tasks,
            calls_total,
            calls_answered,
            bills_no_notes_over_7d,
            current_issues,
            main_objectives,
            recent_wins,
            difficult_situations,
            priority_1,
            priority_2,
            priority_3,
            training_requested,
            escalation_needed,
            operational_blockers,
            conflict_resolution,
            workload_notes,
            prioritization_notes,
            stress_notes,
            organization_notes,
            support_needed,
            training_needed
        `)
        .eq('manager_id', managerId)
        .eq('status', 'completed')
        .order('meeting_date', { ascending: false })
        .limit(1)

    const lastMeeting = lastMeetingList?.[0] || null
    let lastMeetingCommitments: any[] = []
    let pendingCommitments: any[] = []

    if (lastMeeting) {
        const { data: commitments } = await supabase
            .from('one_on_one_commitments')
            .select('*')
            .eq('one_on_one_id', lastMeeting.id)
        if (commitments) {
            lastMeetingCommitments = commitments
            pendingCommitments = commitments
                .filter(c => c.status !== 'Resolved' && !c.completed)
                .map(c => ({
                    id: c.id,
                    commitment_text: c.commitment_text,
                    owner: c.owner || 'Manager',
                    due_date: c.due_date || null,
                    due_next_review: c.due_next_review || false,
                    status: c.status || 'Open',
                    notes: c.notes || '',
                    completed: false
                }))
        }
    }

    // Fetch active complaints for the manager
    const { data: openComplaints } = await supabase
        .from('complaints')
        .select(`
            id,
            title,
            description,
            severity,
            received_date,
            clients(company_name, full_name),
            complaint_categories(name)
        `)
        .eq('manager_id', managerId)
        .eq('status', 'open')

    let openComplaintsPrev = 0
    if (lastMeeting) {
        const { count } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('manager_id', managerId)
            .lte('received_date', lastMeeting.meeting_date)
            .or(`resolved_date.gt.${lastMeeting.meeting_date},status.eq.open`)
        openComplaintsPrev = count || 0
    }

    // Fetch syndicate audits for manager's clients for review
    let syndicateAudits: any[] = []
    if (clientIds.length > 0) {
        const { data: audits } = await supabase
            .from('syndicate_audits')
            .select('*, clients(company_name, full_name)')
            .in('client_id', clientIds)
            .order('audit_date', { ascending: false })
            .limit(5)
        syndicateAudits = audits || []
    }

    // Fetch assembly evaluations for review
    const { data: assemblies } = await supabase
        .from('assembly_evaluations')
        .select('*, clients(company_name, full_name)')
        .eq('manager_id', managerId)
        .order('assembly_date', { ascending: false })
        .limit(5)

    // Fetch operational risks for manager
    const { data: risks } = await supabase
        .from('manager_operational_risks')
        .select('*')
        .eq('manager_id', managerId)
        .order('created_at', { ascending: false })

    return {
        // Current metrics
        calls_total: callsHistory?.[0]?.total_calls || stats?.totalCalls || 0,
        calls_answered: callsHistory?.[0]?.answered_calls || stats?.answeredCalls || 0,
        late_tasks: workloadHistory?.[0]?.open_tasks || stats?.openTasks || 0,
        op_reports_closed: workloadHistory?.[0]?.closed_tasks || stats?.closedTasks || 0,
        emails_received: workloadHistory?.[0]?.communications_received || stats?.communicationsReceived || 0,
        bills_no_notes: billsNoNotesCount,
        open_complaints_count: openComplaints?.length || 0,

        // Previous metrics
        calls_total_prev: callsHistory?.[1]?.total_calls || lastMeeting?.calls_total || 0,
        calls_answered_prev: callsHistory?.[1]?.answered_calls || lastMeeting?.calls_answered || 0,
        late_tasks_prev: workloadHistory?.[1]?.open_tasks || lastMeeting?.late_tasks || 0,
        op_reports_closed_prev: workloadHistory?.[1]?.closed_tasks || 0,
        emails_received_prev: workloadHistory?.[1]?.communications_received || 0,
        bills_no_notes_prev: billsNoNotesCountPrev || lastMeeting?.bills_no_notes_over_7d || 0,
        open_complaints_count_prev: openComplaintsPrev,

        // Global stats
        quote_approval_rate: stats?.quoteApprovalRate || 0,
        doors_count: stats?.doorsCount || 0,
        syndicates_count: stats?.syndicatesCount || 0,
        syndicates_lost: stats?.lostYtd || 0,
        package_changes: stats?.packageChangesCount || 0,

        pendingCommitments,
        openComplaints: openComplaints || [],
        syndicateAudits,
        assemblyEvaluations: assemblies || [],
        operationalRisks: risks || [],
        clientsList: clientsList || [],
        lastMeeting: lastMeeting ? {
            ...lastMeeting,
            commitments: lastMeetingCommitments
        } : null
    }
}

// Helpers for Redesigned 1v1 Features
export async function getCategoryComplaintHistoryAction(managerId: string, categoryId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('complaints')
        .select('*, clients(company_name, full_name), complaint_categories(name)')
        .eq('manager_id', managerId)
        .eq('category_id', categoryId)
        .order('received_date', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createOperationalRiskAction(data: {
    manager_id: string
    one_on_one_id?: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
}) {
    const supabase = await createClient()
    const { data: risk, error } = await supabase
        .from('manager_operational_risks')
        .insert({
            manager_id: data.manager_id,
            one_on_one_id: data.one_on_one_id || null,
            description: data.description,
            severity: data.severity,
            status: 'active'
        })
        .select()
        .single()
    if (error) throw new Error(error.message)
    return risk
}

export async function resolveOperationalRiskAction(id: string, notes: string) {
    const supabase = await createClient()
    const { data: risk, error } = await supabase
        .from('manager_operational_risks')
        .update({
            status: 'resolved',
            resolution_notes: notes,
            resolved_date: new Date().toISOString().substring(0, 10)
        })
        .eq('id', id)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return risk
}

// ==========================================
// 8. SETTINGS & CONFIGURATION ACTIONS
// ==========================================

export async function getComplaintCategoriesAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('complaint_categories')
        .select('*')
        .order('name')

    if (error) throw new Error(error.message)
    return data || []
}

export async function createComplaintCategoryAction(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('complaint_categories')
        .insert({ name })
        .select()
        .single()

    if (error) throw new Error(error.message)
    
    revalidatePath('/team-management/settings')
    revalidatePath('/team-management/complaints')
    return data
}

export async function updateComplaintCategoryAction(id: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('complaint_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/settings')
    revalidatePath('/team-management/complaints')
    return data
}

export async function deleteComplaintCategoryAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('complaint_categories')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/settings')
    revalidatePath('/team-management/complaints')
}

export async function getAuditQuestionConfigsAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('audit_question_configs')
        .select('*')

    if (error) throw new Error(error.message)
    return data || []
}

export async function updateAuditQuestionConfigAction(key: string, description: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('audit_question_configs')
        .upsert({ key, description })
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/settings')
    revalidatePath('/team-management/audits')
    return data
}

export async function deleteOneOnOneAction(id: string) {
    const supabase = await createClient()

    // Fetch meeting to find manager_id for cache revalidation
    const { data: meeting } = await supabase
        .from('one_on_ones')
        .select('manager_id')
        .eq('id', id)
        .single()

    const { error } = await supabase
        .from('one_on_ones')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/one-on-ones')
    if (meeting?.manager_id) {
        revalidatePath(`/team-management/managers/${meeting.manager_id}`)
    }
}

export async function createGustavAccountAction(formData: FormData) {
    const supabase = await createClient()

    // 1. Enforce Master role security check
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
        throw new Error('Non authentifié. Veuillez vous connecter.')
    }

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (currentProfile?.role !== 'Master') {
        throw new Error('Sécurité : Seul le rôle Master est autorisé à créer de nouveaux comptes.')
    }

    // 2. Extract inputs
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string || 'Operations'

    if (!email || !password || !fullName) {
        throw new Error('Courriel, mot de passe et nom complet sont requis.')
    }

    if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères.')
    }

    // 3. Create unpersisted client (avoid disrupting the Master user\'s session cookies)
    const cleanSupabase = createBaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    )

    // 4. Register the new account
    const { data: signUpData, error: signUpError } = await cleanSupabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName
            }
        }
    })

    if (signUpError) {
        throw new Error(signUpError.message)
    }

    const newUser = signUpData.user
    if (!newUser) {
        throw new Error("L'inscription du compte a échoué.")
    }

    // 5. Update the profiles table row inserted by the database trigger
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            role,
            full_name: fullName
        })
        .eq('id', newUser.id)

    if (profileError) {
        throw new Error(`Compte authentifié créé, mais le rôle n'a pas pu être mis à jour: ${profileError.message}`)
    }

    revalidatePath('/team-management/settings')
    return { success: true, email: newUser.email }
}



