import { getManagerStats } from '@/actions/team-management'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Network, Users, Building2, DoorOpen, BarChart3, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'

export default async function TeamsListPage() {
    const supabase = await createClient()

    // 1. Get all teams
    const { data: teams } = await supabase
        .from('manager_teams')
        .select('*')
        .order('name')

    // 2. Get all managers
    const { data: managers } = await supabase
        .from('managers')
        .select('*')

    // 3. Get all active clients with their contracts and doors
    const { data: clients } = await supabase
        .from('clients')
        .select('*, contracts(*), doors(id)')

    const now = new Date()
    const activeClients = (clients || []).filter(c => {
        const isActiveStatus = c.status === 'active' || !c.status
        const notDepartedYet = !c.departure_date || new Date(c.departure_date) > now
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        return isActiveStatus && notDepartedYet && contractArr.some((con: any) => con.active === true)
    })

    // 4. Compute stats for all managers in parallel
    const managerStatsMap: Record<string, any> = {}
    if (managers && managers.length > 0) {
        const statsList = await Promise.all(
            managers.map(async (m) => {
                try {
                    const stats = await getManagerStats(m.id)
                    return { id: m.id, stats }
                } catch (e) {
                    console.error('Error fetching stats for manager', m.id, e)
                    return { id: m.id, stats: null }
                }
            })
        )
        statsList.forEach(item => {
            if (item.stats) {
                managerStatsMap[item.id] = item.stats
            }
        })
    }

    // 5. Compute stats for each team
    const teamStatsList = []

    for (const team of teams || []) {
        const teamManagers = (managers || []).filter(m => m.team_id === team.id)
        const teamClients = activeClients.filter(c => c.team === team.name)
        
        const totalSyndicates = teamClients.length
        const totalDoors = teamClients.reduce((sum, c) => sum + ((c.doors as any[])?.length || 0), 0)
        const totalMrr = teamClients.reduce((sum, c) => {
            const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
            const activeContract = contractArr.find((con: any) => con.active === true) || contractArr[0]
            const fee = Number(activeContract?.monthly_fee || c.package_pricing || 0)
            return sum + fee
        }, 0)

        let sumWorkloadIndex = 0
        let sumPerformanceScore = 0
        let riskCount = 0
        let managersWithStats = 0
        let totalApprovedQuotes = 0
        let totalDeniedQuotes = 0
        let totalSentQuotes = 0
        let teamReportQuotesSent = 0
        let teamReportQuotesAccepted = 0
        let teamReportQuotesRejected = 0
        let teamAdditionalQuotesSent = 0
        let teamAdditionalQuotesAccepted = 0
        let teamAdditionalQuotesRejected = 0
        let teamAdditionalQuotesAcceptedValue = 0
        let teamAdditionalQuotesGeneratedValue = 0

        const managerDetails = []

        for (const m of teamManagers) {
            const stats = managerStatsMap[m.id]
            if (stats) {
                sumWorkloadIndex += stats.workloadIndex
                sumPerformanceScore += stats.performanceScore
                totalApprovedQuotes += stats.approvedQuotesCount || 0
                totalDeniedQuotes += stats.deniedQuotesCount || 0
                totalSentQuotes += stats.sentQuotesCount || 0
                
                teamReportQuotesSent += stats.reportQuotesSent || 0
                teamReportQuotesAccepted += stats.reportQuotesAccepted || 0
                teamReportQuotesRejected += stats.reportQuotesRejected || 0
                teamAdditionalQuotesSent += stats.additionalQuotesSent || 0
                teamAdditionalQuotesAccepted += stats.additionalQuotesAccepted || 0
                teamAdditionalQuotesRejected += stats.additionalQuotesRejected || 0
                teamAdditionalQuotesAcceptedValue += stats.additionalQuotesAcceptedValue || 0
                teamAdditionalQuotesGeneratedValue += stats.additionalQuotesGeneratedValue || 0

                if (stats.riskLevel === 'Critique' || stats.riskLevel === 'Élevé') {
                    riskCount++
                }
                managersWithStats++
                managerDetails.push({
                    id: m.id,
                    name: `${m.first_name} ${m.last_name}`,
                    lastName: m.last_name,
                    stats
                })
            }
        }

        const avgWorkload = managersWithStats > 0 ? Math.round(sumWorkloadIndex / managersWithStats) : 0
        const avgPerformance = managersWithStats > 0 ? Math.round(sumPerformanceScore / managersWithStats) : 0
        const totalPresentedQuotes = totalApprovedQuotes + totalDeniedQuotes + totalSentQuotes
        const teamQuoteApprovalRate = totalPresentedQuotes > 0 ? Math.round((totalApprovedQuotes / totalPresentedQuotes) * 100) : 0
        
        const teamReportQuoteApprovalRate = teamReportQuotesSent > 0 ? Math.round((teamReportQuotesAccepted / teamReportQuotesSent) * 100) : 0
        const teamAdditionalQuoteApprovalRate = teamAdditionalQuotesSent > 0 ? Math.round((teamAdditionalQuotesAccepted / teamAdditionalQuotesSent) * 100) : 0
        
        const teamTotalSalary = teamManagers.reduce((sum, m) => sum + Number(m.salary || 0), 0)
        const monthlyTeamCost = teamTotalSalary / 12
        const teamCostToMrrRatio = totalMrr > 0 ? (monthlyTeamCost / totalMrr) * 100 : 0

        teamStatsList.push({
            team,
            managersCount: teamManagers.length,
            totalSyndicates,
            totalDoors,
            totalMrr,
            avgWorkload,
            avgPerformance,
            riskCount,
            teamManagersList: managerDetails,
            quoteApprovalRate: teamQuoteApprovalRate,
            totalApprovedQuotes,
            totalPresentedQuotes,
            teamReportQuotesSent,
            teamReportQuotesAccepted,
            teamReportQuotesRejected,
            teamReportQuoteApprovalRate,
            teamAdditionalQuotesSent,
            teamAdditionalQuotesAccepted,
            teamAdditionalQuotesRejected,
            teamAdditionalQuoteApprovalRate,
            teamAdditionalQuotesAcceptedValue,
            teamAdditionalQuotesGeneratedValue,
            monthlyTeamCost,
            teamCostToMrrRatio
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">Équipes de Gestion</h2>
                <p className="text-xs text-zinc-400">
                    Gérer la structure organisationnelle des équipes de gestion immobilière de Laucandrique.
                </p>
            </div>

            {/* Teams Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {teamStatsList.map(({ team, managersCount, totalSyndicates, totalDoors, totalMrr, avgWorkload, avgPerformance, riskCount, teamManagersList, quoteApprovalRate, totalApprovedQuotes, totalPresentedQuotes, teamReportQuotesSent, teamReportQuotesAccepted, teamReportQuoteApprovalRate, teamAdditionalQuotesSent, teamAdditionalQuotesAccepted, teamAdditionalQuoteApprovalRate, teamAdditionalQuotesAcceptedValue, teamAdditionalQuotesGeneratedValue, monthlyTeamCost, teamCostToMrrRatio }) => {
                    const workloadColor = 
                        avgWorkload > 120 ? 'text-rose-450 text-rose-500' :
                        avgWorkload > 80 ? 'text-amber-400' : 'text-emerald-450 text-emerald-400'

                    return (
                        <Card key={team.id} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md flex flex-col justify-between">
                            <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/20">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                            <Network className="h-4 w-4 text-purple-400" />
                                            {team.name}
                                        </CardTitle>
                                        <CardDescription className="text-xxs text-zinc-400">
                                            Équipe de gestion · {managersCount} gestionnaire(s)
                                        </CardDescription>
                                    </div>
                                    <Link 
                                        href={`/team-management/teams/${team.id}`}
                                        className="h-7 rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 text-xxs text-zinc-300 flex items-center gap-1 hover:bg-zinc-800 transition-all"
                                    >
                                        Détails
                                        <ArrowRight className="h-3 w-3 text-purple-400" />
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {/* Statistics Grid */}
                                <div className="grid grid-cols-2 gap-3 text-xxs">
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase tracking-wider font-bold">Syndicats / Portes</span>
                                        <span className="text-xs font-bold text-zinc-200 mt-1 block">
                                            {totalSyndicates} syndicats · {totalDoors} portes
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase tracking-wider font-bold">Honoraires Mensuels</span>
                                        <span className="text-xs font-bold text-emerald-400 mt-1 block">
                                            ${totalMrr.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase tracking-wider font-bold">Score Performance Moyen</span>
                                        <span className="text-xs font-bold text-purple-400 mt-1 block">
                                            {avgPerformance}%
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase tracking-wider font-bold">Index de Charge Moyen</span>
                                        <span className={cn("text-xs font-bold mt-1 block", workloadColor)}>
                                            {avgWorkload}
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl border-purple-900/20">
                                        <span className="text-purple-400 block uppercase tracking-wider font-bold text-purple-400">Rapports d'opération</span>
                                        <span className="text-xs font-bold text-zinc-200 mt-1 block">
                                            {teamReportQuoteApprovalRate}% <span className="text-[10px] font-normal text-zinc-500 ml-1">({teamReportQuotesAccepted}/{teamReportQuotesSent})</span>
                                        </span>
                                    </div>
                                                                   <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl border-emerald-900/20">
                                        <span className="text-emerald-400 block uppercase tracking-wider font-bold text-emerald-400">Demandes additionnelles</span>
                                        <span className="text-xs font-bold text-zinc-200 mt-1 block">
                                            ${teamAdditionalQuotesAcceptedValue.toLocaleString('fr-CA')} <span className="text-[10px] font-normal text-zinc-500 ml-1">({teamAdditionalQuoteApprovalRate}%)</span>
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase tracking-wider font-bold">Coût Salaires (Mensuel)</span>
                                        <span className="text-xs font-bold text-zinc-200 mt-1 block">
                                            ${monthlyTeamCost.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase tracking-wider font-bold">Ratio Coût / MRR</span>
                                        <span className={cn(
                                            "text-xs font-bold mt-1 block",
                                            teamCostToMrrRatio <= 25 ? "text-emerald-400" : "text-amber-400"
                                        )}>
                                            {teamCostToMrrRatio.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Active alert warnings inside team */}
                                {riskCount > 0 && (
                                    <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center gap-2 text-xxs text-rose-300">
                                        <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse text-rose-500" />
                                        <span>
                                            Attention : {riskCount} gestionnaire(s) de cette équipe affiche(nt) un niveau de risque élevé ou critique.
                                        </span>
                                    </div>
                                )}

                                {/* Managers list summary */}
                                <div className="space-y-2">
                                    <h4 className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Gestionnaires</h4>
                                    {teamManagersList.length === 0 ? (
                                        <span className="text-xxs text-zinc-600 italic">Aucun gestionnaire assigné à cette équipe.</span>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {teamManagersList.map(mgr => (
                                                <Link 
                                                    key={mgr.id} 
                                                    href={`/team-management/managers/${encodeURIComponent(mgr.lastName)}`}
                                                    className="p-2 bg-zinc-950/30 border border-zinc-850/80 rounded-lg hover:border-purple-800/40 hover:bg-zinc-950/60 transition-all flex items-center justify-between text-xxs"
                                                >
                                                    <span className="text-zinc-300 truncate font-semibold">
                                                        {mgr.name} <span className="text-purple-400 ml-1 font-mono">({mgr.stats?.reportQuoteApprovalRate ?? 0}%)</span>
                                                    </span>
                                                    <span className={cn(
                                                        "h-1.5 w-1.5 rounded-full shrink-0",
                                                        mgr.stats?.riskLevel === 'Critique' ? 'bg-rose-500' :
                                                        mgr.stats?.riskLevel === 'Élevé' ? 'bg-amber-400' : 'bg-emerald-400'
                                                    )}></span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
