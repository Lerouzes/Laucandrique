import { getManagerStats } from '@/actions/team-management'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network, Users, Building2, DoorOpen, DollarSign, Calendar, BarChart3, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function TeamDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Get team details
    const { data: team } = await supabase
        .from('manager_teams')
        .select('*')
        .eq('id', id)
        .single()

    if (!team) notFound()

    // 2. Get managers in this team
    const { data: managers } = await supabase
        .from('managers')
        .select('*')
        .eq('team_id', id)

    // Get active clients for this team directly
    const { data: clients } = await supabase
        .from('clients')
        .select('*, contracts(*), doors(id)')

    const now = new Date()
    const activeClients = (clients as any[] || []).filter(c => {
        const isActiveStatus = c.status === 'active' || !c.status
        const notDepartedYet = !c.departure_date || new Date(c.departure_date) > now
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        return isActiveStatus && notDepartedYet && contractArr.some((con: any) => con.active === true)
    })

    const teamClients = activeClients.filter(c => c.team === team.name)
    const totalSyndicates = teamClients.length
    const totalDoors = teamClients.reduce((sum, c) => sum + ((c.doors as any[])?.length || 0), 0)
    const totalMrr = teamClients.reduce((sum, c) => {
        const contractArr = Array.isArray(c.contracts) ? c.contracts : c.contracts ? [c.contracts] : []
        const activeContract = contractArr.find((con: any) => con.active === true) || contractArr[0]
        const fee = Number(activeContract?.monthly_fee || c.package_pricing || 0)
        return sum + fee
    }, 0)

    const managerStats = []
    let sumWorkloadIndex = 0
    let sumPerformanceScore = 0
    let totalApprovedQuotes = 0
    let totalDeniedQuotes = 0
    let totalSentQuotes = 0
    let teamReportQuotesSent = 0
    let teamReportQuotesAccepted = 0
    let teamReportQuotesRejected = 0
    let teamAdditionalQuotesSent = 0
    let teamAdditionalQuotesAccepted = 0
    let teamAdditionalQuotesRejected = 0
    let teamAdditionalQuotesGeneratedValue = 0
    let teamAdditionalQuotesAcceptedValue = 0
    const allAlerts: string[] = []

    if (managers && managers.length > 0) {
        const statsList = await Promise.all(
            managers.map(async (m) => {
                try {
                    const stats = await getManagerStats(m.id)
                    return { manager: m, stats }
                } catch (e) {
                    console.error('Error fetching stats for manager', m.id, e)
                    return { manager: m, stats: null }
                }
            })
        )

        for (const { manager: m, stats } of statsList) {
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
                teamAdditionalQuotesGeneratedValue += stats.additionalQuotesGeneratedValue || 0
                teamAdditionalQuotesAcceptedValue += stats.additionalQuotesAcceptedValue || 0

                stats.alerts?.forEach(a => allAlerts.push(`${m.first_name} ${m.last_name}: ${a}`))
                managerStats.push({
                    manager: m,
                    stats
                })
            }
        }
    }

    const avgWorkload = managerStats.length > 0 ? Math.round(sumWorkloadIndex / managerStats.length) : 0
    const avgPerformance = managerStats.length > 0 ? Math.round(sumPerformanceScore / managerStats.length) : 0
    const totalPresentedQuotes = totalApprovedQuotes + totalDeniedQuotes + totalSentQuotes
    const teamQuoteApprovalRate = totalPresentedQuotes > 0 ? Math.round((totalApprovedQuotes / totalPresentedQuotes) * 100) : 0
    
    const teamReportQuoteApprovalRate = teamReportQuotesSent > 0 ? Math.round((teamReportQuotesAccepted / teamReportQuotesSent) * 100) : 0
    const teamAdditionalQuoteApprovalRate = teamAdditionalQuotesSent > 0 ? Math.round((teamAdditionalQuotesAccepted / teamAdditionalQuotesSent) * 100) : 0

    const teamTotalSalary = (managers || []).reduce((sum, m) => sum + Number(m.salary || 0), 0)
    const monthlyTeamCost = teamTotalSalary / 12
    const teamCostToMrrRatio = totalMrr > 0 ? (monthlyTeamCost / totalMrr) * 100 : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link href="/team-management/teams" className="text-xxs text-zinc-400 hover:text-white transition-colors">
                    ← Retour aux équipes
                </Link>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase mt-2 flex items-center gap-2">
                    <Network className="h-5 w-5 text-purple-400" />
                    Équipe : {team.name}
                </h2>
                <p className="text-xs text-zinc-400">
                    Aperçu opérationnel et indicateurs de performance de cette équipe de gestion.
                </p>
            </div>

            {/* Metrics cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-7">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Syndicats Actifs</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-baseline justify-between">
                        <div className="text-xl font-extrabold text-white">{totalSyndicates}</div>
                        <Building2 className="h-4 w-4 text-purple-400" />
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Portes Gérées</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-baseline justify-between">
                        <div className="text-xl font-extrabold text-white">{totalDoors}</div>
                        <DoorOpen className="h-4 w-4 text-purple-400" />
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Honoraires d'Équipe</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-baseline justify-between">
                        <div className="text-xl font-extrabold text-emerald-400">${totalMrr.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</div>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Performance Globale</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-baseline justify-between">
                        <div className="text-xl font-extrabold text-purple-400">{avgPerformance}%</div>
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 border-purple-900/30 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-purple-400 uppercase tracking-wider">Rapports d'opération</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-baseline justify-between">
                        <div>
                            <div className="text-xl font-extrabold text-white">{teamReportQuoteApprovalRate}%</div>
                            <span className="text-[9px] text-zinc-500 font-normal">({teamReportQuotesAccepted}/{teamReportQuotesSent})</span>
                        </div>
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 border-emerald-900/30 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-emerald-450 uppercase tracking-wider text-emerald-450">Demandes additionnelles</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-between h-full">
                        <div>
                            <div className="text-base font-extrabold text-white">${teamAdditionalQuotesAcceptedValue.toLocaleString('fr-CA')}</div>
                            <span className="text-[9px] text-zinc-500 font-normal block">Généré: ${teamAdditionalQuotesGeneratedValue.toLocaleString('fr-CA')}</span>
                            <span className="text-[9px] text-zinc-450 font-normal text-zinc-400">({teamAdditionalQuotesAccepted}/{teamAdditionalQuotesSent} acc. · {teamAdditionalQuoteApprovalRate}%)</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Ratio Coût / MRR</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-baseline justify-between">
                        <div>
                            <div className={cn(
                                "text-xl font-extrabold",
                                teamCostToMrrRatio <= 25 ? "text-emerald-400" : "text-amber-400"
                            )}>
                                {teamCostToMrrRatio.toFixed(1)}%
                            </div>
                            <span className="text-[9px] text-zinc-500 font-normal block mt-1">
                                Mensuel: ${monthlyTeamCost.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <DollarSign className="h-4 w-4 text-purple-400" />
                    </CardContent>
                </Card>
            </div>


            {/* Split Content: Managers and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Managers Detail List (2/3 cols) */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <Users className="h-4 w-4 text-purple-400" />
                                Membres de l'Équipe ({managerStats.length})
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Répartition individuelle de la charge et scores de performance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3.5">
                                {managerStats.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucun gestionnaire dans cette équipe.</p>
                                ) : (
                                    managerStats.map(({ manager, stats }) => {
                                        const riskColor = 
                                            stats.riskLevel === 'Faible' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40' :
                                            stats.riskLevel === 'Modéré' ? 'bg-amber-500/20 text-amber-400 border-amber-800/40' :
                                            'bg-rose-500/20 text-rose-400 border-rose-800/40'

                                        return (
                                            <Link
                                                key={manager.id}
                                                href={`/team-management/managers/${encodeURIComponent(manager.last_name)}`}
                                                className="flex flex-col sm:flex-row justify-between sm:items-center p-3.5 rounded-xl border border-zinc-805 bg-zinc-950/20 hover:bg-zinc-950/50 hover:border-zinc-700 transition-all gap-4 text-xxs"
                                            >
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-zinc-200">{manager.first_name} {manager.last_name}</p>
                                                    <p className="text-zinc-500">{manager.email || 'Pas de courriel'}</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 rounded-lg">
                                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Charge (Index)</span>
                                                        <span className="text-zinc-300 font-bold mt-0.5 block">{stats.workloadIndex}</span>
                                                    </div>
                                                    <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 rounded-lg border-purple-900/20">
                                                        <span className="text-purple-400 block uppercase font-bold text-[8px]">Rapports (Conv.)</span>
                                                        <span className="text-zinc-300 font-bold mt-0.5 block">{stats.reportQuoteApprovalRate ?? 0}%</span>
                                                    </div>
                                                    <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 rounded-lg border-emerald-900/20">
                                                        <span className="text-emerald-400 block uppercase font-bold text-[8px]">Demandes ($)</span>
                                                        <span className="text-emerald-400 font-bold mt-0.5 block">${stats.additionalQuotesAcceptedValue?.toLocaleString('fr-CA')}</span>
                                                    </div>
                                                    <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 rounded-lg">
                                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Performance</span>
                                                        <span className="text-purple-400 font-bold mt-0.5 block">{stats.performanceScore}%</span>
                                                    </div>
                                                    <Badge variant="outline" className={`h-6 text-[9px] font-bold ${riskColor}`}>
                                                        Risque: {stats.riskLevel}
                                                    </Badge>
                                                    <ArrowRight className="h-4 w-4 text-zinc-600 self-center hidden sm:block" />
                                                </div>
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Team Alerts Drawer (1/3 col) */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                            Alerte de Risques Actifs
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Risques opérationnels détectés automatiquement pour l'équipe.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {allAlerts.length === 0 ? (
                            <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-900/30 text-center">
                                <p className="text-xxs font-bold text-emerald-400">Aucun Risque Détecté</p>
                                <p className="text-[10px] text-zinc-500 mt-1">L'équipe respecte tous les standards opérationnels!</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                                {allAlerts.map((alert, idx) => (
                                    <div 
                                        key={idx} 
                                        className="p-3 rounded-xl border border-zinc-805 bg-zinc-950/30 flex items-start gap-2.5 text-xxs text-zinc-300"
                                    >
                                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">{alert}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
