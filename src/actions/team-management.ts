// @ts-nocheck
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath as nextRevalidatePath } from 'next/cache'
import { createClient as createBaseClient } from '@supabase/supabase-js'

async function revalidatePath(path: string, type?: 'page' | 'layout') {
    if (path.startsWith('/team-management/managers/')) {
        const parts = path.split('/')
        const idOrSlug = parts[parts.length - 1]
        if (idOrSlug && idOrSlug.length > 20) {
            try {
                const supabase = await createClient()
                const { data: mgr } = await supabase
                    .from('managers')
                    .select('last_name')
                    .eq('id', idOrSlug)
                    .maybeSingle()
                if (mgr?.last_name) {
                    nextRevalidatePath(`/team-management/managers/${encodeURIComponent(mgr.last_name)}`, type)
                }
            } catch (e) {
                console.error("Error in custom revalidatePath:", e)
            }
        } else {
            nextRevalidatePath(path, type)
        }
    } else {
        nextRevalidatePath(path, type)
    }
}

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
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        const hasActiveContract = contractArr.some((con: any) => con.active === true)
        return isActiveStatus && notDepartedYet && hasActiveContract
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


    // 3. Monthly Recurring Revenue (MRR) — use only the active contract
    const mrr = activeSyndicates.reduce((acc, c) => {
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        const activeContract = contractArr.find((con: any) => con.active === true) || contractArr[0]
        const fee = Number(activeContract?.monthly_fee || c.package_pricing || 0)
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
        .select('status, quote_origin, total')
        .eq('manager_id', managerId)

    const approvedQuotesCount = (managerQuotes || []).filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const deniedQuotesCount = (managerQuotes || []).filter(q => q.status === 'denied').length
    const sentQuotesCount = (managerQuotes || []).filter(q => q.status === 'sent').length
    const quotesTotalPresented = approvedQuotesCount + deniedQuotesCount + sentQuotesCount
    const quoteApprovalRate = quotesTotalPresented > 0 ? Math.round((approvedQuotesCount / quotesTotalPresented) * 100) : 0

    const reportQuotes = (managerQuotes || []).filter(q => q.quote_origin === 'operations_report' || !q.quote_origin)
    const additionalQuotes = (managerQuotes || []).filter(q => q.quote_origin === 'additional_manager_request')

    // Report quotes stats
    const reportQuotesSent = reportQuotes.filter(q => ['sent', 'approved', 'completed', 'billed', 'denied'].includes(q.status || '')).length
    const reportQuotesAccepted = reportQuotes.filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const reportQuotesRejected = reportQuotes.filter(q => q.status === 'denied').length
    const reportQuoteApprovalRate = reportQuotesSent > 0 ? Math.round((reportQuotesAccepted / reportQuotesSent) * 100) : 0

    // Additional requests stats
    const additionalQuotesSent = additionalQuotes.filter(q => ['sent', 'approved', 'completed', 'billed', 'denied'].includes(q.status || '')).length
    const additionalQuotesAccepted = additionalQuotes.filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const additionalQuotesRejected = additionalQuotes.filter(q => q.status === 'denied').length
    const additionalQuoteApprovalRate = additionalQuotesSent > 0 ? Math.round((additionalQuotesAccepted / additionalQuotesSent) * 100) : 0

    const additionalQuotesAcceptedValue = additionalQuotes
        .filter(q => ['approved', 'completed', 'billed'].includes(q.status || ''))
        .reduce((sum, q) => sum + Number(q.total || 0), 0)

    const additionalQuotesGeneratedValue = additionalQuotes
        .filter(q => ['sent', 'approved', 'completed', 'billed', 'denied'].includes(q.status || ''))
        .reduce((sum, q) => sum + Number(q.total || 0), 0)

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
        sentQuotesCount,
        reportQuotesSent,
        reportQuotesAccepted,
        reportQuotesRejected,
        reportQuoteApprovalRate,
        additionalQuotesSent,
        additionalQuotesAccepted,
        additionalQuotesRejected,
        additionalQuoteApprovalRate,
        additionalQuotesAcceptedValue,
        additionalQuotesGeneratedValue
    }
}

export async function getGlobalTeamStats(opts?: {
    range?: string
    fromMonth?: string
    toMonth?: string
    teamId?: string | null
}) {
    const supabase = await createClient()
    const { getActiveTeamContext } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    
    // Determine the target team ID to filter by
    let targetTeamId = context.teamId
    if (!context.isRestricted && opts && opts.teamId !== undefined) {
        targetTeamId = opts.teamId === 'all' ? null : opts.teamId
    }

    // Resolve team name for client-based filtering (clients.team is the source of truth)
    let targetTeamName: string | null = null
    if (targetTeamId) {
        const { data: teamRow } = await supabase
            .from('manager_teams')
            .select('name')
            .eq('id', targetTeamId)
            .single()
        targetTeamName = teamRow?.name || null
    }

    // Get managers in current team context (for salary & activity stats)
    let query = supabase.from('managers').select('*')
    if (targetTeamId) {
        query = query.eq('team_id', targetTeamId)
    }
    const { data: managersData, error: managersError } = await query.order('last_name')
    if (managersError) {
        console.error('Error fetching managers for stats:', managersError)
    }
    const teamManagers = managersData || []
    const managerIds = teamManagers.map(m => m.id)

    const range = opts?.range || 'current-year'
    const fromMonth = opts?.fromMonth
    const toMonth = opts?.toMonth

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth()

    let startMonth = `${currentYear}-01`
    let endMonth = `${currentYear}-12`
    
    if (range === 'this-month') {
        const m = String(currentMonthNum + 1).padStart(2, '0')
        startMonth = `${currentYear}-${m}`
        endMonth = `${currentYear}-${m}`
    } else if (range === 'last-month') {
        let y = currentYear
        let mVal = currentMonthNum
        if (mVal === 0) {
            y = currentYear - 1
            mVal = 12
        }
        const mStr = String(mVal).padStart(2, '0')
        startMonth = `${y}-${mStr}`
        endMonth = `${y}-${mStr}`
    } else if (range === 'current-quarter') {
        const q = Math.floor(currentMonthNum / 3)
        const start = String(q * 3 + 1).padStart(2, '0')
        const end = String(q * 3 + 3).padStart(2, '0')
        startMonth = `${currentYear}-${start}`
        endMonth = `${currentYear}-${end}`
    } else if (range === 'current-year') {
        startMonth = `${currentYear}-01`
        endMonth = `${currentYear}-12`
    } else if (range === 'custom' && fromMonth && toMonth) {
        startMonth = fromMonth
        endMonth = toMonth
    }

    const startDate = `${startMonth}-01`
    const [endYear, endM] = endMonth.split('-').map(Number)
    const lastDay = new Date(endYear, endM, 0).getDate()
    const endDate = `${endMonth}-${String(lastDay).padStart(2, '0')}`

    // Count Active clients (Syndicates)
    const { data: clients } = await supabase
        .from('clients')
        .select('*, contracts(*)')

    let activeClients = (clients || []).filter(c => {
        const isActiveStatus = c.status === 'active' || !c.status
        const notDepartedYet = !c.departure_date || new Date(c.departure_date) > now
        
        // Find if contract is active:
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        const hasActiveContract = contractArr.some((con: any) => con.active === true)
        
        return isActiveStatus && notDepartedYet && hasActiveContract
    })

    if (targetTeamId && targetTeamName) {
        // Filter by the client's own team column — this is the source of truth.
        // A client's team is set directly on their record and may not match their
        // manager's team assignment (e.g., during reassignments or imports).
        activeClients = activeClients.filter(c => c.team === targetTeamName)
    }

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
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        const activeContract = contractArr.find((con: any) => con.active === true) || contractArr[0]
        const fee = Number(activeContract?.monthly_fee || c.package_pricing || 0)
        return acc + fee
    }, 0)

    // Team salaries (using managers list in current team context)
    const teamTotalSalary = teamManagers.reduce((sum, m) => sum + Number(m.salary || 0), 0)
    const monthlySalaryCost = teamTotalSalary / 12
    const costToMrrRatio = mrr > 0 ? (monthlySalaryCost / mrr) * 100 : 0

    // Contract counts by package
    const packageCounts = {
        Bronze: 0,
        Argent: 0,
        'Argent+': 0,
        Or: 0,
        Platinum: 0
    }

    activeClients.forEach(c => {
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        const activeContract = contractArr.find((con: any) => con.active === true) || contractArr[0]
        const pkgName = activeContract?.package_name as keyof typeof packageCounts
        if (pkgName && pkgName in packageCounts) {
            packageCounts[pkgName]++
        }
    })

    // Meetings count (1v1s)
    let meetingsQuery = supabase
        .from('one_on_ones')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('meeting_date', startDate)
        .lte('meeting_date', endDate)

    if (targetTeamId) {
        meetingsQuery = meetingsQuery.in('manager_id', managerIds)
    }
    const { count: meetingsCount } = await meetingsQuery

    // At risk and critical syndicates
    let auditsQuery = supabase
        .from('syndicate_audits')
        .select('client_id, health_score')
        .order('audit_date', { ascending: false })
        .gte('audit_date', startDate)
        .lte('audit_date', endDate)

    // Always restrict to active clients to avoid counting audits of inactive syndicates/contracts
    if (activeClientIds.length > 0) {
        auditsQuery = auditsQuery.in('client_id', activeClientIds)
    } else {
        auditsQuery = auditsQuery.in('client_id', ['00000000-0000-0000-0000-000000000000'])
    }
    const { data: audits } = await auditsQuery

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

    // Lost Syndicates YTD
    let lostQuery = supabase
        .from('lost_syndicates')
        .select('id', { count: 'exact', head: true })
        .gte('departure_date', startDate)
        .lte('departure_date', endDate)

    if (targetTeamId) {
        lostQuery = lostQuery.in('manager_id', managerIds)
    }
    const { count: lostCount } = await lostQuery

    // New Syndicates YTD
    let newQuery = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (targetTeamId) {
        newQuery = newQuery.in('manager_id', managerIds)
    }
    const { count: newCount } = await newQuery

    // Global quote stats
    let quotesQuery = supabase
        .from('quotes')
        .select('status, quote_origin, total')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (targetTeamId) {
        quotesQuery = quotesQuery.in('manager_id', managerIds)
    }
    const { data: allQuotes } = await quotesQuery

    const globalApproved = (allQuotes || []).filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const globalDenied = (allQuotes || []).filter(q => q.status === 'denied').length
    const globalSent = (allQuotes || []).filter(q => q.status === 'sent').length
    const globalTotalPresented = globalApproved + globalDenied + globalSent
    const quoteApprovalRate = globalTotalPresented > 0 ? Math.round((globalApproved / globalTotalPresented) * 100) : 0

    const reportQuotes = (allQuotes || []).filter(q => q.quote_origin === 'operations_report' || !q.quote_origin)
    const additionalQuotes = (allQuotes || []).filter(q => q.quote_origin === 'additional_manager_request')

    // Report quotes stats
    const reportQuotesSent = reportQuotes.filter(q => ['sent', 'approved', 'completed', 'billed', 'denied'].includes(q.status || '')).length
    const reportQuotesAccepted = reportQuotes.filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const reportQuotesRejected = reportQuotes.filter(q => q.status === 'denied').length
    const reportQuoteApprovalRate = reportQuotesSent > 0 ? Math.round((reportQuotesAccepted / reportQuotesSent) * 100) : 0

    // Additional requests stats
    const additionalQuotesSent = additionalQuotes.filter(q => ['sent', 'approved', 'completed', 'billed', 'denied'].includes(q.status || '')).length
    const additionalQuotesAccepted = additionalQuotes.filter(q => ['approved', 'completed', 'billed'].includes(q.status || '')).length
    const additionalQuotesRejected = additionalQuotes.filter(q => q.status === 'denied').length
    const additionalQuoteApprovalRate = additionalQuotesSent > 0 ? Math.round((additionalQuotesAccepted / additionalQuotesSent) * 100) : 0

    const additionalQuotesAcceptedValue = additionalQuotes
        .filter(q => ['approved', 'completed', 'billed'].includes(q.status || ''))
        .reduce((sum, q) => sum + Number(q.total || 0), 0)

    const additionalQuotesGeneratedValue = additionalQuotes
        .filter(q => ['sent', 'approved', 'completed', 'billed', 'denied'].includes(q.status || ''))
        .reduce((sum, q) => sum + Number(q.total || 0), 0)

    // Fetch phone call statistics
    let callsQuery = supabase
        .from('manager_monthly_calls')
        .select('year_month, total_calls, answered_calls')
        .gte('year_month', startMonth)
        .lte('year_month', endMonth)

    if (targetTeamId) {
        callsQuery = callsQuery.in('manager_id', managerIds)
    }
    const { data: callsData } = await callsQuery

    const totalCalls = (callsData || []).reduce((acc, curr) => acc + (curr.total_calls || 0), 0)
    const answeredCalls = (callsData || []).reduce((acc, curr) => acc + (curr.answered_calls || 0), 0)
    const callsAnsweredPct = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

    // Fetch workload statistics
    let workloadQuery = supabase
        .from('manager_monthly_workload')
        .select('year_month, communications_received, open_tasks, closed_tasks')
        .gte('year_month', startMonth)
        .lte('year_month', endMonth)

    if (targetTeamId) {
        workloadQuery = workloadQuery.in('manager_id', managerIds)
    }
    const { data: workloadData } = await workloadQuery

    const totalCommunications = (workloadData || []).reduce((acc, curr) => acc + (curr.communications_received || 0), 0)
    const totalOpenTasks = (workloadData || []).reduce((acc, curr) => acc + (curr.open_tasks || 0), 0)
    const totalClosedTasks = (workloadData || []).reduce((acc, curr) => acc + (curr.closed_tasks || 0), 0)
    const taskCompletionRate = (totalOpenTasks + totalClosedTasks) > 0 
        ? Math.round((totalClosedTasks / (totalOpenTasks + totalClosedTasks)) * 100) 
        : 0
    const activeManagersCount = teamManagers.length
    const communicationsPerManager = activeManagersCount > 0 ? Math.round(totalCommunications / activeManagersCount) : 0

    // Aggregate monthly trends
    const callsByMonth: Record<string, { total: number; answered: number }> = {}
    ;(callsData || []).forEach(c => {
        if (!callsByMonth[c.year_month]) {
            callsByMonth[c.year_month] = { total: 0, answered: 0 }
        }
        callsByMonth[c.year_month].total += (c.total_calls || 0)
        callsByMonth[c.year_month].answered += (c.answered_calls || 0)
    })

    const workloadByMonth: Record<string, { comms: number; open: number; closed: number }> = {}
    ;(workloadData || []).forEach(w => {
        if (!workloadByMonth[w.year_month]) {
            workloadByMonth[w.year_month] = { comms: 0, open: 0, closed: 0 }
        }
        workloadByMonth[w.year_month].comms += (w.communications_received || 0)
        workloadByMonth[w.year_month].open += (w.open_tasks || 0)
        workloadByMonth[w.year_month].closed += (w.closed_tasks || 0)
    })

    const allMonths = Array.from(new Set([
        ...Object.keys(callsByMonth),
        ...Object.keys(workloadByMonth)
    ])).sort()

    const monthlyTrends = allMonths.map(month => {
        const c = callsByMonth[month] || { total: 0, answered: 0 }
        const w = workloadByMonth[month] || { comms: 0, open: 0, closed: 0 }
        const callRate = c.total > 0 ? Math.round((c.answered / c.total) * 100) : 0
        const taskRate = (w.open + w.closed) > 0 ? Math.round((w.closed / (w.open + w.closed)) * 100) : 0
        return {
            month,
            totalCalls: c.total,
            answeredCalls: c.answered,
            callRate,
            communications: w.comms,
            openTasks: w.open,
            closedTasks: w.closed,
            taskRate
        }
    })

    return {
        totalSyndicates: activeClients.length,
        totalDoors,
        mrr,
        monthlySalaryCost,
        costToMrrRatio,
        packageCounts,
        meetingsCount: meetingsCount || 0,
        atRiskCount,
        criticalCount,
        lostYtd: lostCount || 0,
        newYtd: newCount || 0,
        quoteApprovalRate,
        reportQuotesSent,
        reportQuotesAccepted,
        reportQuotesRejected,
        reportQuoteApprovalRate,
        additionalQuotesSent,
        additionalQuotesAccepted,
        additionalQuotesRejected,
        additionalQuoteApprovalRate,
        additionalQuotesAcceptedValue,
        additionalQuotesGeneratedValue,
        totalCalls,
        answeredCalls,
        callsAnsweredPct,
        totalCommunications,
        communicationsPerManager,
        totalOpenTasks,
        totalClosedTasks,
        taskCompletionRate,
        monthlyTrends
    }
}

// ==========================================
// MRR SYNDICATES LIST
// ==========================================

export async function getMrrSyndicates(opts?: {
    teamId?: string | null
    managerId?: string | null
}) {
    const supabase = await createClient()
    const { getActiveTeamContext } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()

    // Resolve target team ID
    let targetTeamId = context.teamId
    if (!context.isRestricted && opts && opts.teamId !== undefined) {
        targetTeamId = opts.teamId === 'all' ? null : opts.teamId
    }

    // Resolve team name for client-based filtering
    let targetTeamName: string | null = null
    if (targetTeamId) {
        const { data: teamRow } = await supabase
            .from('manager_teams')
            .select('name')
            .eq('id', targetTeamId)
            .single()
        targetTeamName = teamRow?.name || null
    }

    // Fetch all manager teams for lookup
    const { data: allTeams } = await supabase.from('manager_teams').select('id, name')
    const teamNameById = new Map((allTeams || []).map((t: any) => [t.id, t.name]))

    // Fetch all managers for lookup (include salary for cost % calculation)
    const { data: allManagers } = await supabase
        .from('managers')
        .select('id, first_name, last_name, team_id, salary')
    const managerMap = new Map((allManagers || []).map((m: any) => [m.id, m]))

    // Fetch active clients with contracts
    const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name, team, status, departure_date, manager_id, package_pricing, contracts(*)')
        .order('full_name')

    const now = new Date()
    let syndicates = (clients || [])
        .filter((c: any) => {
            const isActiveStatus = c.status === 'active' || !c.status
            const notDepartedYet = !c.departure_date || new Date(c.departure_date) > now
            const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
            const hasActiveContract = contractArr.some((con: any) => con.active === true)
            return isActiveStatus && notDepartedYet && hasActiveContract
        })
        .map((c: any) => {
            const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
            const activeContract = contractArr.find((con: any) => con.active === true) || contractArr[0]
            const manager = c.manager_id ? managerMap.get(c.manager_id) : null
            const managerTeamId = manager?.team_id
            const managerTeamName = managerTeamId ? (teamNameById.get(managerTeamId) || null) : null

            return {
                id: c.id,
                full_name: c.full_name,
                team: c.team || null,
                manager_id: c.manager_id || null,
                manager_name: manager ? `${manager.first_name} ${manager.last_name}` : null,
                manager_team_name: managerTeamName,
                package_name: activeContract?.package_name || null,
                monthly_fee: Number(activeContract?.monthly_fee || c.package_pricing || 0),
                contract_start: activeContract?.start_date || null,
                contract_end: activeContract?.end_date || null,
            }
        })

    // Apply team filter (by client's team column — source of truth)
    if (targetTeamId && targetTeamName) {
        syndicates = syndicates.filter((s: any) => s.team === targetTeamName)
    }

    // Apply manager filter
    if (opts?.managerId && opts.managerId !== 'all') {
        syndicates = syndicates.filter((s: any) => s.manager_id === opts.managerId)
    }

    // Build aggregate stats
    const totalMrr = syndicates.reduce((sum: number, s: any) => sum + s.monthly_fee, 0)
    const totalSyndicates = syndicates.length
    const avgMrr = totalSyndicates > 0 ? totalMrr / totalSyndicates : 0

    const mrrByTeam: Record<string, { count: number; mrr: number }> = {}
    syndicates.forEach((s: any) => {
        const t = s.team || 'Non assigné'
        if (!mrrByTeam[t]) mrrByTeam[t] = { count: 0, mrr: 0 }
        mrrByTeam[t].count++
        mrrByTeam[t].mrr += s.monthly_fee
    })

    const mrrByManager: Record<string, { count: number; mrr: number; name: string; monthly_cost: number; cost_pct: number }> = {}
    syndicates.forEach((s: any) => {
        const key = s.manager_id || 'none'
        if (!mrrByManager[key]) {
            const mgr = s.manager_id ? managerMap.get(s.manager_id) : null
            const annualSalary = Number(mgr?.salary || 0)
            const monthly_cost = annualSalary / 12
            mrrByManager[key] = { count: 0, mrr: 0, name: s.manager_name || 'Non assigné', monthly_cost, cost_pct: 0 }
        }
        mrrByManager[key].count++
        mrrByManager[key].mrr += s.monthly_fee
    })
    // Compute cost_pct after all MRR is summed
    Object.values(mrrByManager).forEach((m: any) => {
        m.cost_pct = m.mrr > 0 ? (m.monthly_cost / m.mrr) * 100 : 0
    })

    const mrrByPackage: Record<string, { count: number; mrr: number }> = {}
    syndicates.forEach((s: any) => {
        const pkg = s.package_name || 'Non assigné'
        if (!mrrByPackage[pkg]) mrrByPackage[pkg] = { count: 0, mrr: 0 }
        mrrByPackage[pkg].count++
        mrrByPackage[pkg].mrr += s.monthly_fee
    })

    const allManagersList = (allManagers || [])
        .map((m: any) => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            team_id: m.team_id,
            team_name: m.team_id ? (teamNameById.get(m.team_id) || null) : null,
            monthly_cost: Number(m.salary || 0) / 12,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))

    return {
        syndicates,
        stats: {
            totalMrr,
            totalSyndicates,
            avgMrr,
            mrrByTeam,
            mrrByManager,
            mrrByPackage,
        },
        managers: allManagersList,
        teams: (allTeams || []).sort((a: any, b: any) => a.name.localeCompare(b.name)),
        isRestricted: context.isRestricted,
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

export async function saveBatchMonthlyCallsAction(data: {
    yearMonth: string
    entries: {
        managerId: string
        totalCalls: number
        answeredCalls: number
    }[]
}) {
    const supabase = await createClient()
    const { yearMonth, entries } = data

    const records = entries.map(entry => ({
        manager_id: entry.managerId,
        year_month: yearMonth,
        total_calls: entry.totalCalls,
        answered_calls: entry.answeredCalls
    }))

    const { error } = await supabase
        .from('manager_monthly_calls')
        .upsert(records, { onConflict: 'manager_id,year_month' })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    for (const entry of entries) {
        revalidatePath(`/team-management/managers/${entry.managerId}`)
    }
}

export async function getBatchMonthlyCallsAction(yearMonth: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('manager_monthly_calls')
        .select('manager_id, total_calls, answered_calls')
        .eq('year_month', yearMonth)

    if (error) {
        console.error('Error fetching batch monthly calls:', error)
        return []
    }

    return (data || []).map(row => ({
        managerId: row.manager_id,
        totalCalls: row.total_calls,
        answeredCalls: row.answered_calls
    }))
}

export async function getCallsHistoryAction(opts: {
    managerId?: string   // if undefined => all managers
    teamId?: string
    monthsBack?: number  // default 12
    fromMonth?: string   // e.g. '2024-01'
    toMonth?: string     // e.g. '2025-05'
}) {
    const supabase = await createClient()

    let query = supabase
        .from('manager_monthly_calls')
        .select('manager_id, year_month, total_calls, answered_calls, managers(first_name, last_name)')
        .order('year_month', { ascending: false })

    if (opts.managerId) {
        query = query.eq('manager_id', opts.managerId)
    }

    if (opts.teamId && opts.teamId !== 'all') {
        const { data: managers } = await supabase
            .from('managers')
            .select('id')
            .eq('team_id', opts.teamId)
        const managerIds = (managers || []).map(m => m.id)
        if (managerIds.length === 0) return []
        query = query.in('manager_id', managerIds)
    }

    if (opts.fromMonth) {
        query = query.gte('year_month', opts.fromMonth)
    } else if (!opts.toMonth) {
        // default: last N months
        const n = opts.monthsBack ?? 12
        const d = new Date()
        d.setMonth(d.getMonth() - n)
        const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        query = query.gte('year_month', from)
    }

    if (opts.toMonth) {
        query = query.lte('year_month', opts.toMonth)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching call history:', error)
        return []
    }

    return (data || []).map(row => {
        const m = row.managers as any
        const managerName = m ? `${m.first_name} ${m.last_name}` : 'Inconnu'
        const pct = row.total_calls > 0 ? Math.round((row.answered_calls / row.total_calls) * 100) : null
        return {
            managerId: row.manager_id,
            managerName,
            yearMonth: row.year_month,
            totalCalls: row.total_calls,
            answeredCalls: row.answered_calls,
            pct
        }
    })
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
    summary?: string
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
        taken_at?: string | null
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
    const { data: { user } } = await supabase.auth.getUser()
    const conducted_by = user?.id || null

    // Insert 1v1
    const { data: meeting, error: err } = await supabase
        .from('one_on_ones')
        .insert({
            manager_id: data.manager_id,
            meeting_date: data.meeting_date,
            status: data.status,
            conducted_by,
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
            meeting_score: data.meeting_score || null,
            summary: data.summary || null
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
            client_id: c.client_id || null,
            taken_at: c.taken_at || meeting.meeting_date
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
    summary?: string
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
        taken_at?: string | null
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
        .select('manager_id, conducted_by')
        .eq('id', id)
        .single()

    if (!oldMeeting) throw new Error("One-on-One meeting not found")
    const managerId = oldMeeting.manager_id

    const { data: { user } } = await supabase.auth.getUser()
    const conducted_by = user?.id || null

    // Update meeting
    const { error: err } = await supabase
        .from('one_on_ones')
        .update({
            meeting_date: data.meeting_date,
            status: data.status,
            conducted_by: oldMeeting.conducted_by || conducted_by,
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
            meeting_score: data.meeting_score || null,
            summary: data.summary || null
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
                    client_id: c.client_id || null,
                    taken_at: c.taken_at || null
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
                    client_id: c.client_id || null,
                    taken_at: c.taken_at || data.meeting_date
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
    current_year_active?: boolean
    board_meetings_fiscal_year?: number | null
    board_meetings_count?: number | null
    cotisation_fonds_exploitation?: number | null
    cotisation_fonds_prevoyance?: number | null
    cotisation_fonds_assurance?: number | null
    cotisation_fonds_total?: number | null
    answers: Array<{ category: 'governance' | 'financial' | 'operations'; question_key: string; score: number; note?: string }>
}) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const audited_by = user?.id || null

        const GRADED_KEYS = [
            'contrats_condo_web',
            'rapports_maintenance',
            'proces_verbaux_ca',
            'proces_verbaux_assemblees',
            
            'respect_franchise_assurance_last',
            'fonds_prevoyance_last',
            'qualite_budget_cree_last',
            'respect_postes_budgetaires_score_last'
        ]

        if (data.current_year_active !== false) {
            GRADED_KEYS.push(
                'respect_franchise_assurance_curr',
                'fonds_prevoyance_curr',
                'qualite_budget_cree_curr',
                'respect_postes_budgetaires_score_curr'
            )
        }

        // Calculate overall health score dynamically using only actual graded items that are not null/undefined
        const gradedAnswers = data.answers.filter(a => GRADED_KEYS.includes(a.question_key) && a.score !== null && a.score !== undefined)
        const sum = gradedAnswers.reduce((acc, a) => acc + a.score, 0)
        const maxPoints = gradedAnswers.length > 0 ? gradedAnswers.length * 5 : 1
        const health_score = Math.round((sum / maxPoints) * 100)

        const { data: audit, error: err } = await supabase
            .from('syndicate_audits')
            .insert({
                client_id: data.client_id,
                health_score,
                notes: data.notes || null,
                audited_by,
                current_year_active: data.current_year_active !== false,
                board_meetings_fiscal_year: data.board_meetings_fiscal_year || null,
                board_meetings_count: data.board_meetings_count || null,
                cotisation_fonds_exploitation: data.cotisation_fonds_exploitation !== undefined ? data.cotisation_fonds_exploitation : null,
                cotisation_fonds_prevoyance: data.cotisation_fonds_prevoyance !== undefined ? data.cotisation_fonds_prevoyance : null,
                cotisation_fonds_assurance: data.cotisation_fonds_assurance !== undefined ? data.cotisation_fonds_assurance : null,
                cotisation_fonds_total: data.cotisation_fonds_total !== undefined ? data.cotisation_fonds_total : null
            })
            .select()
            .single()

        if (err) return { success: false, error: err.message }

        // Insert answers
        const answersToInsert = data.answers.map(a => ({
            audit_id: audit.id,
            category: a.category,
            question_key: a.question_key,
            score: a.score,
            note: a.note || null
        }))

        const { error: ansErr } = await supabase.from('syndicate_audit_answers').insert(answersToInsert)
        if (ansErr) return { success: false, error: ansErr.message }

        revalidatePath('/team-management/dashboard')
        revalidatePath('/team-management/audits')
        revalidatePath('/team-management/syndicates')
        return { success: true, data: audit }
    } catch (e: any) {
        return { success: false, error: e.message || "Une erreur inconnue est survenue" }
    }
}

// ==========================================
// 6. ASSEMBLY EVALUATIONS ACTIONS
// ==========================================

export async function createAssemblyEvaluationAction(data: {
    client_id: string
    manager_id: string
    assembly_date: string
    assembly_type?: string
    status?: string
    agenda_sent_on_time: number | null
    quorum_respected: number | null
    voting_controlled: number | null
    duration_reasonable: number | null
    technical_prep_complete?: number | null
    manager_controlled_room: number | null
    discussions_on_track: number | null
    conflict_handled_professionally: number | null
    answers_clear_confident: number | null
    board_confidence_level: number | null
    financial_statement_quality: number | null
    pv_drafted_quickly?: number | null
    templates_respected?: number | null
    resolutions_clear?: number | null
    followup_tasks_created?: number | null
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
            assembly_type: data.assembly_type || 'annual',
            status: data.status || 'completed',
            agenda_sent_on_time: data.agenda_sent_on_time,
            quorum_respected: data.quorum_respected,
            voting_controlled: data.voting_controlled,
            duration_reasonable: data.duration_reasonable,
            technical_prep_complete: data.technical_prep_complete ?? null,
            manager_controlled_room: data.manager_controlled_room,
            discussions_on_track: data.discussions_on_track,
            conflict_handled_professionally: data.conflict_handled_professionally,
            answers_clear_confident: data.answers_clear_confident,
            board_confidence_level: data.board_confidence_level,
            financial_statement_quality: data.financial_statement_quality,
            pv_drafted_quickly: data.pv_drafted_quickly ?? null,
            templates_respected: data.templates_respected ?? null,
            resolutions_clear: data.resolutions_clear ?? null,
            followup_tasks_created: data.followup_tasks_created ?? null,
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

export async function updateAssemblyEvaluationAction(id: string, data: {
    client_id?: string
    manager_id?: string
    assembly_date?: string
    assembly_type?: string
    status?: string
    agenda_sent_on_time?: number | null
    quorum_respected?: number | null
    voting_controlled?: number | null
    duration_reasonable?: number | null
    technical_prep_complete?: number | null
    manager_controlled_room?: number | null
    discussions_on_track?: number | null
    conflict_handled_professionally?: number | null
    answers_clear_confident?: number | null
    board_confidence_level?: number | null
    financial_statement_quality?: number | null
    pv_drafted_quickly?: number | null
    templates_respected?: number | null
    resolutions_clear?: number | null
    followup_tasks_created?: number | null
    notes?: string
    recommendations?: string
    item_notes?: Record<string, string>
}) {
    const supabase = await createClient()

    const { data: evalData, error: err } = await supabase
        .from('assembly_evaluations')
        .update({
            client_id: data.client_id,
            manager_id: data.manager_id,
            assembly_date: data.assembly_date,
            assembly_type: data.assembly_type,
            status: data.status,
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
            notes: data.notes,
            recommendations: data.recommendations,
            item_notes: data.item_notes
        })
        .eq('id', id)
        .select()
        .single()

    if (err) throw new Error(err.message)

    revalidatePath('/team-management/assemblies')
    if (data.manager_id) {
        revalidatePath(`/team-management/managers/${data.manager_id}`)
    }
    return evalData
}

export async function deleteAssemblyEvaluationAction(id: string) {
    const supabase = await createClient()

    // Enforce role security: only Master or Direction can delete evaluations
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Non authentifié.')

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (currentProfile?.role !== 'Master' && currentProfile?.role !== 'Direction') {
        throw new Error('Sécurité : Seul le rôle Master ou Direction peut supprimer des évaluations d\'assemblées.')
    }

    const { error: err } = await supabase
        .from('assembly_evaluations')
        .delete()
        .eq('id', id)

    if (err) throw new Error(err.message)

    revalidatePath('/team-management/assemblies')
    return { success: true }
}

export async function updateAssemblyQuestionConfigAction(key: string, description: string) {
    const supabase = await createClient()

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Non authentifié.')

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (currentProfile?.role !== 'Master') {
        throw new Error('Accès refusé.')
    }

    const { data, error } = await supabase
        .from('assembly_question_configs')
        .upsert({ key, description })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
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

    // Get all active clients/syndicates for dropdown lists (Only those the manager is in charge of!)
    const { data: clientsList } = await supabase
        .from('clients')
        .select('id, company_name, full_name')
        .eq('manager_id', managerId)
        .eq('status', 'active')
        .order('company_name')

    // Fetch monthly calls history (only months containing call data)
    const { data: callsHistory } = await supabase
        .from('manager_monthly_calls')
        .select('*')
        .eq('manager_id', managerId)
        .gt('total_calls', 0)
        .order('year_month', { ascending: false })
        .limit(6)

    // Fetch monthly workload history (only months containing workload/task data)
    const { data: workloadHistory } = await supabase
        .from('manager_monthly_workload')
        .select('*')
        .eq('manager_id', managerId)
        .or('communications_received.gt.0,open_tasks.gt.0,closed_tasks.gt.0')
        .order('year_month', { ascending: false })
        .limit(6)

    // Fetch recent performance logs (weekly ad-hoc assessments)
    const { data: statsLogs } = await supabase
        .from('manager_stats_logs')
        .select('*')
        .eq('manager_id', managerId)
        .order('logged_at', { ascending: false })
        .limit(30)

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
                    completed: false,
                    taken_at: c.taken_at || lastMeeting.meeting_date
                }))
        }
    }

    // Fetch active complaints and notes for the manager
    const { data: openComplaints } = await supabase
        .from('complaints')
        .select(`
            id,
            title,
            description,
            type,
            severity,
            received_date,
            clients(company_name, full_name),
            complaint_categories(name, id)
        `)
        .eq('manager_id', managerId)
        .eq('status', 'open') as any

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

    // Fetch completed meetings for this manager to exclude already reviewed audits/assemblies
    const { data: completedMeetings } = await supabase
        .from('one_on_ones')
        .select('id')
        .eq('manager_id', managerId)
        .eq('status', 'completed')
    
    const completedMeetingIds = (completedMeetings || []).map(m => m.id)

    // Fetch reviewed syndicate audits for these meetings
    let reviewedAuditIds: string[] = []
    if (completedMeetingIds.length > 0) {
        const { data: reviewed } = await supabase
            .from('one_on_one_syndicate_audits')
            .select('audit_id')
            .eq('reviewed', true)
            .in('one_on_one_id', completedMeetingIds)
        reviewedAuditIds = Array.from(new Set((reviewed || []).map(r => r.audit_id)))
    }

    // Fetch reviewed assembly evaluations for these meetings
    let reviewedAssemblyIds: string[] = []
    if (completedMeetingIds.length > 0) {
        const { data: reviewed } = await supabase
            .from('one_on_one_assemblies')
            .select('assembly_evaluation_id')
            .eq('reviewed', true)
            .in('one_on_one_id', completedMeetingIds)
        reviewedAssemblyIds = Array.from(new Set((reviewed || []).map(r => r.assembly_evaluation_id)))
    }

    // Fetch syndicate audits for manager's clients for review
    let syndicateAudits: any[] = []
    if (clientIds.length > 0) {
        let query = supabase
            .from('syndicate_audits')
            .select('*, clients(company_name, full_name)')
            .in('client_id', clientIds)
            .order('audit_date', { ascending: false })
            .limit(5)
        
        if (reviewedAuditIds.length > 0) {
            query = query.not('id', 'in', `(${reviewedAuditIds.join(',')})`)
        }
        
        const { data: audits } = await query
        syndicateAudits = audits || []
    }

    // Fetch assembly evaluations for review
    let assembliesQuery = supabase
        .from('assembly_evaluations')
        .select('*, clients(company_name, full_name)')
        .eq('manager_id', managerId)
        .order('assembly_date', { ascending: false })
        .limit(5)
    
    if (reviewedAssemblyIds.length > 0) {
        assembliesQuery = assembliesQuery.not('id', 'in', `(${reviewedAssemblyIds.join(',')})`)
    }
    
    const { data: assemblies } = await assembliesQuery

    // Fetch operational risks for manager
    const { data: risks } = await supabase
        .from('manager_operational_risks')
        .select('*')
        .eq('manager_id', managerId)
        .order('created_at', { ascending: false })

    return {
        // Current metrics (fall back to 0 if history is empty)
        calls_total: callsHistory?.[0]?.total_calls ?? 0,
        calls_answered: callsHistory?.[0]?.answered_calls ?? 0,
        late_tasks: workloadHistory?.[0]?.open_tasks ?? 0,
        op_reports_closed: workloadHistory?.[0]?.closed_tasks ?? 0,
        emails_received: workloadHistory?.[0]?.communications_received ?? 0,
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

        // Period labels
        calls_month_current: callsHistory?.[0]?.year_month || null,
        calls_month_prev: callsHistory?.[1]?.year_month || (lastMeeting ? `Réunion (${new Date(lastMeeting.meeting_date).toLocaleDateString('fr-CA')})` : null),
        workload_month_current: workloadHistory?.[0]?.year_month || null,
        workload_month_prev: workloadHistory?.[1]?.year_month || (lastMeeting ? `Réunion (${new Date(lastMeeting.meeting_date).toLocaleDateString('fr-CA')})` : null),

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
        callsHistory: callsHistory || [],
        workloadHistory: workloadHistory || [],
        statsLogs: statsLogs || [],
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

export async function getGustavUsersAction() {
    const supabase = await createClient()

    // Security: only Master can list users
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Non authentifié.')

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (currentProfile?.role !== 'Master') {
        throw new Error('Accès refusé.')
    }

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return profiles || []
}

export async function updateUserRoleAction(userId: string, newRole: string) {
    const supabase = await createClient()

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Non authentifié.')

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (currentProfile?.role !== 'Master') {
        throw new Error('Seul le rôle Master peut modifier les rôles.')
    }

    // Prevent demoting yourself
    if (userId === currentUser.id) {
        throw new Error('Vous ne pouvez pas modifier votre propre rôle.')
    }

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/settings')
    return { success: true }
}

export async function setSelectedTeamCookieAction(teamId: string | null) {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    if (!teamId || teamId === 'all') {
        cookieStore.set('selected_team_id', 'all', { path: '/' })
    } else {
        cookieStore.set('selected_team_id', teamId, { path: '/' })
    }
}

export async function deleteComplaintAction(id: string) {
    const supabase = await createClient()

    const { data: comp } = await supabase
        .from('complaints')
        .select('manager_id')
        .eq('id', id)
        .maybeSingle()

    const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/complaints')
    if (comp?.manager_id) revalidatePath(`/team-management/managers/${comp.manager_id}`)
}

export async function saveMonthlyCommunicationsAction(formData: FormData) {
    const supabase = await createClient()
    const managerId = formData.get('manager_id') as string
    const yearMonth = formData.get('year_month') as string
    const communicationsReceived = parseInt(formData.get('communications_received') as string, 10)

    if (!managerId || !yearMonth || isNaN(communicationsReceived)) {
        throw new Error('Données manquantes ou invalides')
    }

    const { data: existing } = await supabase
        .from('manager_monthly_workload')
        .select('*')
        .eq('manager_id', managerId)
        .eq('year_month', yearMonth)
        .maybeSingle()

    const { error } = await supabase
        .from('manager_monthly_workload')
        .upsert({
            manager_id: managerId,
            year_month: yearMonth,
            communications_received: communicationsReceived,
            open_tasks: existing ? existing.open_tasks : 0,
            closed_tasks: existing ? existing.closed_tasks : 0
        }, { onConflict: 'manager_id,year_month' })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath(`/team-management/managers/${managerId}`)
}

export async function saveMonthlyTasksAction(formData: FormData) {
    const supabase = await createClient()
    const managerId = formData.get('manager_id') as string
    const yearMonth = formData.get('year_month') as string
    const openTasks = parseInt(formData.get('open_tasks') as string, 10)
    const closedTasks = parseInt(formData.get('closed_tasks') as string, 10)

    if (!managerId || !yearMonth || isNaN(openTasks) || isNaN(closedTasks)) {
        throw new Error('Données manquantes ou invalides')
    }

    const { data: existing } = await supabase
        .from('manager_monthly_workload')
        .select('*')
        .eq('manager_id', managerId)
        .eq('year_month', yearMonth)
        .maybeSingle()

    const { error } = await supabase
        .from('manager_monthly_workload')
        .upsert({
            manager_id: managerId,
            year_month: yearMonth,
            communications_received: existing ? existing.communications_received : 0,
            open_tasks: openTasks,
            closed_tasks: closedTasks
        }, { onConflict: 'manager_id,year_month' })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath(`/team-management/managers/${managerId}`)
}

export async function checkExistingStatsAction(managerId: string, yearMonth: string) {
    const supabase = await createClient()
    const [callsRes, workloadRes] = await Promise.all([
        supabase.from('manager_monthly_calls').select('id, total_calls').eq('manager_id', managerId).eq('year_month', yearMonth).maybeSingle(),
        supabase.from('manager_monthly_workload').select('id, communications_received, open_tasks, closed_tasks').eq('manager_id', managerId).eq('year_month', yearMonth).maybeSingle()
    ])

    return {
        hasCalls: !!callsRes.data,
        hasCommunications: !!workloadRes.data && workloadRes.data.communications_received > 0,
        hasTasks: !!workloadRes.data && (workloadRes.data.open_tasks > 0 || workloadRes.data.closed_tasks > 0)
    }
}

export async function deleteMonthlyStatsAction(managerId: string, yearMonth: string, type: 'calls' | 'comms' | 'tasks' | 'all') {
    const supabase = await createClient()

    if (type === 'all') {
        const { error: callsErr } = await supabase
            .from('manager_monthly_calls')
            .delete()
            .eq('manager_id', managerId)
            .eq('year_month', yearMonth)
        if (callsErr) throw new Error(callsErr.message)

        const { error: workloadErr } = await supabase
            .from('manager_monthly_workload')
            .delete()
            .eq('manager_id', managerId)
            .eq('year_month', yearMonth)
        if (workloadErr) throw new Error(workloadErr.message)
    } else if (type === 'calls') {
        const { error } = await supabase
            .from('manager_monthly_calls')
            .delete()
            .eq('manager_id', managerId)
            .eq('year_month', yearMonth)

        if (error) throw new Error(error.message)
    } else if (type === 'comms') {
        const { data: existing } = await supabase
            .from('manager_monthly_workload')
            .select('*')
            .eq('manager_id', managerId)
            .eq('year_month', yearMonth)
            .maybeSingle()

        if (existing) {
            if (existing.open_tasks === 0 && existing.closed_tasks === 0) {
                const { error } = await supabase
                    .from('manager_monthly_workload')
                    .delete()
                    .eq('id', existing.id)
                if (error) throw new Error(error.message)
            } else {
                const { error } = await supabase
                    .from('manager_monthly_workload')
                    .update({ communications_received: 0 })
                    .eq('id', existing.id)
                if (error) throw new Error(error.message)
            }
        }
    } else if (type === 'tasks') {
        const { data: existing } = await supabase
            .from('manager_monthly_workload')
            .select('*')
            .eq('manager_id', managerId)
            .eq('year_month', yearMonth)
            .maybeSingle()

        if (existing) {
            if (existing.communications_received === 0) {
                const { error } = await supabase
                    .from('manager_monthly_workload')
                    .delete()
                    .eq('id', existing.id)
                if (error) throw new Error(error.message)
            } else {
                const { error } = await supabase
                    .from('manager_monthly_workload')
                    .update({ open_tasks: 0, closed_tasks: 0 })
                    .eq('id', existing.id)
                if (error) throw new Error(error.message)
            }
        }
    }

    revalidatePath('/team-management/dashboard')
    revalidatePath(`/team-management/managers/${managerId}`)
}

export async function updateManagerSensitiveInfoAction(managerId: string, formData: FormData) {
    const supabase = await createClient()
    const { getActiveTeamContext } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()

    if (context.role !== 'Master' && context.role !== 'Direction') {
        throw new Error('Non autorisé à modifier les informations sensibles.')
    }

    const salaryRaw = formData.get('salary')
    const salary = salaryRaw ? parseFloat(salaryRaw as string) : 0.00
    const directionNotes = String(formData.get('direction_notes') || '').trim()

    const { error } = await supabase
        .from('managers')
        .update({
            salary: isNaN(salary) ? 0.00 : salary,
            direction_notes: directionNotes || null
        })
        .eq('id', managerId)

    if (error) {
        console.error('Error updating manager sensitive info:', error)
        throw new Error(error.message)
    }

    revalidatePath('/team-management/dashboard')
    revalidatePath(`/team-management/managers/${managerId}`)
    return { success: true }
}

export async function getWorkloadHistoryAction(opts: {
    managerId?: string   // if undefined => all managers
    teamId?: string
    monthsBack?: number  // default 12
    fromMonth?: string   // e.g. '2024-01'
    toMonth?: string     // e.g. '2025-05'
}) {
    const supabase = await createClient()

    let query = supabase
        .from('manager_monthly_workload')
        .select('manager_id, year_month, open_tasks, closed_tasks, communications_received, managers(first_name, last_name)')
        .order('year_month', { ascending: false })

    if (opts.managerId) {
        query = query.eq('manager_id', opts.managerId)
    }

    if (opts.teamId && opts.teamId !== 'all') {
        const { data: managers } = await supabase
            .from('managers')
            .select('id')
            .eq('team_id', opts.teamId)
        const managerIds = (managers || []).map(m => m.id)
        if (managerIds.length === 0) return []
        query = query.in('manager_id', managerIds)
    }

    if (opts.fromMonth) {
        query = query.gte('year_month', opts.fromMonth)
    } else if (!opts.toMonth) {
        // default: last N months
        const n = opts.monthsBack ?? 12
        const d = new Date()
        d.setMonth(d.getMonth() - n)
        const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        query = query.gte('year_month', from)
    }

    if (opts.toMonth) {
        query = query.lte('year_month', opts.toMonth)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching workload history:', error)
        return []
    }

    return (data || []).map(row => {
        const m = row.managers as any
        const managerName = m ? `${m.first_name} ${m.last_name}` : 'Inconnu'
        const pct = (row.open_tasks + row.closed_tasks) > 0
            ? Math.round((row.closed_tasks / (row.open_tasks + row.closed_tasks)) * 100)
            : null
        return {
            managerId: row.manager_id,
            managerName,
            yearMonth: row.year_month,
            openTasks: row.open_tasks,
            closedTasks: row.closed_tasks,
            communicationsReceived: row.communications_received,
            pct
        }
    })
}

export async function updateSyndicateAuditAction(id: string, data: {
    notes?: string
    current_year_active?: boolean
    board_meetings_fiscal_year?: number | null
    board_meetings_count?: number | null
    cotisation_fonds_exploitation?: number | null
    cotisation_fonds_prevoyance?: number | null
    cotisation_fonds_assurance?: number | null
    cotisation_fonds_total?: number | null
    answers: Array<{ category: 'governance' | 'financial' | 'operations'; question_key: string; score: number; note?: string }>
}) {
    try {
        const supabase = await createClient()

        // Enforce Master check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Non authentifié" }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'Master') {
            return { success: false, error: "Sécurité : Seul le rôle Master peut modifier un audit." }
        }

        const GRADED_KEYS = [
            'contrats_condo_web',
            'rapports_maintenance',
            'proces_verbaux_ca',
            'proces_verbaux_assemblees',
            
            'respect_franchise_assurance_last',
            'fonds_prevoyance_last',
            'qualite_budget_cree_last',
            'respect_postes_budgetaires_score_last'
        ]

        if (data.current_year_active !== false) {
            GRADED_KEYS.push(
                'respect_franchise_assurance_curr',
                'fonds_prevoyance_curr',
                'qualite_budget_cree_curr',
                'respect_postes_budgetaires_score_curr'
            )
        }

        // Calculate overall health score dynamically using only actual graded items that are not null/undefined
        const gradedAnswers = data.answers.filter(a => GRADED_KEYS.includes(a.question_key) && a.score !== null && a.score !== undefined)
        const sum = gradedAnswers.reduce((acc, a) => acc + a.score, 0)
        const maxPoints = gradedAnswers.length > 0 ? gradedAnswers.length * 5 : 1
        const health_score = Math.round((sum / maxPoints) * 100)

        const { error: err } = await supabase
            .from('syndicate_audits')
            .update({
                health_score,
                notes: data.notes || null,
                current_year_active: data.current_year_active !== false,
                board_meetings_fiscal_year: data.board_meetings_fiscal_year || null,
                board_meetings_count: data.board_meetings_count || null,
                cotisation_fonds_exploitation: data.cotisation_fonds_exploitation !== undefined ? data.cotisation_fonds_exploitation : null,
                cotisation_fonds_prevoyance: data.cotisation_fonds_prevoyance !== undefined ? data.cotisation_fonds_prevoyance : null,
                cotisation_fonds_assurance: data.cotisation_fonds_assurance !== undefined ? data.cotisation_fonds_assurance : null,
                cotisation_fonds_total: data.cotisation_fonds_total !== undefined ? data.cotisation_fonds_total : null
            })
            .eq('id', id)

        if (err) return { success: false, error: err.message }

        // Delete existing answers and insert new ones
        const { error: delErr } = await supabase.from('syndicate_audit_answers').delete().eq('audit_id', id)
        if (delErr) return { success: false, error: delErr.message }

        const answersToInsert = data.answers.map(a => ({
            audit_id: id,
            category: a.category,
            question_key: a.question_key,
            score: a.score,
            note: a.note || null
        }))

        const { error: ansErr } = await supabase.from('syndicate_audit_answers').insert(answersToInsert)
        if (ansErr) return { success: false, error: ansErr.message }

        revalidatePath('/team-management/dashboard')
        revalidatePath('/team-management/audits')
        revalidatePath(`/team-management/audits/${id}`)
        revalidatePath('/team-management/syndicates')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message || "Une erreur inconnue est survenue" }
    }
}

export async function deleteSyndicateAuditAction(id: string) {
    const supabase = await createClient()

    // Enforce Master check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Non authentifié")
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Master') {
        throw new Error("Sécurité : Seul le rôle Master peut supprimer un audit.")
    }

    const { error } = await supabase.from('syndicate_audits').delete().eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    revalidatePath('/team-management/audits')
    revalidatePath('/team-management/syndicates')
}

export async function saveSyndicateWorkloadAction(data: {
    client_id: string
    year: number
    month: number | null
    tasks_count: number | null
    comms_count: number | null
    syndicate_comms_count?: number | null
    manager_comms_count?: number | null
    board_meetings_count?: number | null
    tasks_completed_count?: number | null
}) {
    try {
        const supabase = await createClient()

        const payload = {
            client_id: data.client_id,
            year: data.year,
            month: data.month,
            tasks_count: data.tasks_count,
            comms_count: data.comms_count,
            syndicate_comms_count: data.syndicate_comms_count || null,
            manager_comms_count: data.manager_comms_count || null,
            board_meetings_count: data.board_meetings_count || null,
            tasks_completed_count: data.tasks_completed_count || null,
            updated_at: new Date().toISOString()
        }

        const { error } = await supabase
            .from('syndicate_workload')
            .upsert(payload, { onConflict: 'client_id, year, month' })

        if (error) {
            console.error("Upsert failed, trying manual fallback:", error.message)
            let query = supabase
                .from('syndicate_workload')
                .select('id')
                .eq('client_id', data.client_id)
                .eq('year', data.year)

            if (data.month === null) {
                query = query.is('month', null)
            } else {
                query = query.eq('month', data.month)
            }

            const { data: existing } = await query.maybeSingle()

            if (existing?.id) {
                const { error: updErr } = await supabase
                    .from('syndicate_workload')
                    .update({
                        tasks_count: data.tasks_count,
                        comms_count: data.comms_count,
                        syndicate_comms_count: data.syndicate_comms_count || null,
                        manager_comms_count: data.manager_comms_count || null,
                        board_meetings_count: data.board_meetings_count || null,
                        tasks_completed_count: data.tasks_completed_count || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                if (updErr) return { success: false, error: updErr.message }
            } else {
                const { error: insErr } = await supabase
                    .from('syndicate_workload')
                    .insert(payload)
                if (insErr) return { success: false, error: insErr.message }
            }
        }

        revalidatePath('/clients')
        revalidatePath(`/clients/${data.client_id}`)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message || "Une erreur inconnue est survenue" }
    }
}

export async function getSyndicateWorkloadAction(clientId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('syndicate_workload')
        .select('*')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: true, nullsFirst: true })

    if (error) {
        console.error("Error fetching syndicate workload:", error.message)
        return []
    }
    return data || []
}

export async function deleteSyndicateWorkloadAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('syndicate_workload')
        .delete()
        .eq('id', id)

    if (error) {
        console.error("Error deleting syndicate workload:", error.message)
        throw new Error(error.message)
    }

    revalidatePath('/clients')
    return { success: true }
}

export async function getSyndicateTasksAction(clientId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('syndicate_tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_date', { ascending: false })

    if (error) {
        console.error("Error fetching syndicate tasks:", error.message)
        return []
    }
    return data || []
}

export async function saveSyndicateTaskAction(data: {
    id?: string
    client_id: string
    manager_id?: string | null
    title: string
    category?: string | null
    status?: 'open' | 'completed' | 'late'
    created_date?: string
    due_date?: string | null
}) {
    const supabase = await createClient()

    const payload: any = {
        client_id: data.client_id,
        manager_id: data.manager_id || null,
        title: data.title,
        category: data.category || null,
        status: data.status || 'late',
        due_date: data.due_date || null
    }

    if (data.created_date) {
        payload.created_date = data.created_date
    }

    if (data.id) {
        payload.id = data.id
        payload.updated_at = new Date().toISOString()
        const { data: res, error } = await supabase
            .from('syndicate_tasks')
            .upsert(payload)
            .select()
            .single()
        if (error) throw new Error(error.message)
        return res
    } else {
        const { data: res, error } = await supabase
            .from('syndicate_tasks')
            .insert(payload)
            .select()
            .single()
        if (error) throw new Error(error.message)
        return res
    }
}

export async function deleteSyndicateTaskAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('syndicate_tasks')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function getClientHistoryAction(clientId: string) {
    const supabase = await createClient()

    const [complaintsRes, auditsRes] = await Promise.all([
        supabase
            .from('complaints')
            .select('*')
            .eq('client_id', clientId)
            .order('received_date', { ascending: false }),
        supabase
            .from('syndicate_audits')
            .select('*, profiles(full_name)')
            .eq('client_id', clientId)
            .order('audit_date', { ascending: false })
    ])

    return {
        complaints: complaintsRes.data || [],
        audits: auditsRes.data || []
    }
}

export async function getSyndicateAuditDetailsAction(auditId: string) {
    const supabase = await createClient()
    const [auditRes, answersRes] = await Promise.all([
        supabase
            .from('syndicate_audits')
            .select('*, clients(id, company_name, full_name, managers(first_name, last_name)), profiles:audited_by(full_name)')
            .eq('id', auditId)
            .single(),
        supabase
            .from('syndicate_audit_answers')
            .select('*')
            .eq('audit_id', auditId)
    ])
    
    return {
        audit: auditRes.data || null,
        answers: answersRes.data || []
    }
}

export async function getAssemblyEvaluationDetailsAction(assemblyId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('assembly_evaluations')
        .select('*, clients(id, company_name, full_name, managers(first_name, last_name))')
        .eq('id', assemblyId)
        .single()

    if (error) {
        console.error("Error fetching assembly evaluation details:", error.message)
        return null
    }
    return data
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
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
        throw new Error('Sécurité : Seul le rôle Master est autorisé à réinitialiser les mots de passe.')
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères.')
    }

    // Call the SECURITY DEFINER RPC function to update password in auth.users
    const { error } = await supabase
        .rpc('admin_reset_user_password', {
            target_user_id: userId,
            new_password: newPassword
        })

    if (error) {
        throw new Error(`Erreur lors de la réinitialisation du mot de passe : ${error.message}`)
    }

    return { success: true }
}

export async function deleteUserAction(userId: string) {
    const supabase = await createClient()

    // Enforce Master role security check
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
        throw new Error('Sécurité : Seul le rôle Master est autorisé à supprimer des comptes.')
    }

    if (userId === currentUser.id) {
        throw new Error('Vous ne pouvez pas supprimer votre propre compte.')
    }

    // Call the SECURITY DEFINER RPC function to delete user from auth.users
    const { error } = await supabase
        .rpc('admin_delete_user', {
            target_user_id: userId,
        })

    if (error) {
        throw new Error(`Erreur lors de la suppression du compte : ${error.message}`)
    }

    return { success: true }
}

// ==========================================
// 10. WEEKLY ASSESSMENT & MANAGER NOTES ACTIONS
// ==========================================

export async function createManagerNoteAction(data: {
    manager_id: string
    client_id?: string | null
    description: string
    category_id: string
    date_occurred: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('complaints')
        .insert({
            manager_id: data.manager_id,
            client_id: data.client_id || null,
            title: 'Note de suivi',
            description: data.description,
            severity: 'low',
            status: 'open',
            category_id: data.category_id || null,
            received_date: data.date_occurred,
            type: 'note'
        })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
    if (data.manager_id) {
        revalidatePath(`/team-management/managers/${data.manager_id}`)
    }
}

export async function savePerformanceLogAction(data: {
    manager_id: string
    metric_type: 'emails_over_48h' | 'late_tasks' | 'bills_no_notes_over_7d'
    value: number
    logged_at?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('manager_stats_logs')
        .insert({
            manager_id: data.manager_id,
            metric_type: data.metric_type,
            value: data.value,
            logged_at: data.logged_at ? new Date(data.logged_at).toISOString() : new Date().toISOString()
        })

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
}

export async function deletePerformanceLogAction(logId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('manager_stats_logs')
        .delete()
        .eq('id', logId)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/dashboard')
}

export async function getPerformanceLogsAction(managerId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('manager_stats_logs')
        .select('*')
        .eq('manager_id', managerId)
        .order('logged_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}

export async function getLatestTeamPerformanceLogsAction(): Promise<any[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('manager_stats_logs' as any)
        .select('*')
        .order('logged_at', { ascending: false }) as any

    if (error) throw new Error(error.message)
    return (data || []) as any[]
}

export async function updateComplaintNotesAndStatusAction(
    id: string,
    data: {
        my_notes?: string | null
        manager_notes?: string | null
        status?: 'open' | 'resolved'
    }
) {
    const supabase = await createClient()

    // Fetch complaint to find manager_id
    const { data: comp } = await supabase
        .from('complaints')
        .select('manager_id')
        .eq('id', id)
        .maybeSingle()

    const updateFields: any = {}
    if (data.my_notes !== undefined) updateFields.my_notes = data.my_notes
    if (data.manager_notes !== undefined) updateFields.manager_notes = data.manager_notes
    if (data.status !== undefined) {
        updateFields.status = data.status
        if (data.status === 'resolved') {
            updateFields.resolved_date = new Date().toISOString().substring(0, 10)
        } else {
            updateFields.resolved_date = null
        }
    }

    const { error } = await supabase
        .from('complaints')
        .update(updateFields)
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/team-management/complaints')
    if (comp?.manager_id) {
        revalidatePath(`/team-management/managers/${comp.manager_id}`)
    }
}

export async function getManagerTaskCountsAction(managerId: string) {
    const supabase = await createClient()
    
    // Get latest monthly workload for tasks count
    const { data: workload } = await supabase
        .from('manager_monthly_workload')
        .select('open_tasks, closed_tasks')
        .eq('manager_id', managerId)
        .order('year_month', { ascending: false })
        .limit(1)
        .maybeSingle()

    // Get latest stats log for late tasks
    const { data: log } = await supabase
        .from('manager_stats_logs')
        .select('value')
        .eq('manager_id', managerId)
        .eq('metric_type', 'late_tasks')
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return {
        total_tasks: workload ? ((workload.open_tasks || 0) + (workload.closed_tasks || 0)) : 0,
        late_tasks: log ? (log.value || 0) : 0
    }
}




