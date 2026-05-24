import { createClient } from '@/utils/supabase/server'
import { getManagerStats } from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, AlertTriangle, ShieldAlert, Award, PhoneCall, CheckSquare } from 'lucide-react'

export default async function PerformanceReportsPage() {
    const supabase = await createClient()

    // 1. Fetch managers
    const { data: managers } = await supabase
        .from('managers')
        .select('*, manager_teams(name)')
        .order('first_name')

    // 2. Fetch computed KPIs for each manager
    const managerKPIs = []
    let totalPortfolioMRR = 0
    let totalDoors = 0
    let sumPerformanceScore = 0
    let sumWorkloadIndex = 0
    let activeManagersCount = 0

    for (const m of managers || []) {
        const stats = await getManagerStats(m.id)
        if (stats) {
            managerKPIs.push({
                manager: m,
                ...stats
            })
            totalPortfolioMRR += stats.mrr
            totalDoors += stats.doorsCount
            sumPerformanceScore += stats.performanceScore
            sumWorkloadIndex += stats.workloadIndex
            activeManagersCount++
        }
    }

    const avgPerformance = activeManagersCount > 0 ? Math.round(sumPerformanceScore / activeManagersCount) : 0
    const avgWorkload = activeManagersCount > 0 ? Math.round(sumWorkloadIndex / activeManagersCount) : 0

    // 3. Fetch lost syndicates analysis
    const { data: lostSyndicates } = await supabase
        .from('lost_syndicates')
        .select('*')

    const totalLost = lostSyndicates?.length || 0
    const preventableLost = lostSyndicates?.filter(l => l.preventable).length || 0
    const nonPreventableLost = totalLost - preventableLost
    const preventablePct = totalLost > 0 ? Math.round((preventableLost / totalLost) * 100) : 0

    // Group loss reasons
    const lossReasons: Record<string, number> = {}
    lostSyndicates?.forEach(l => {
        const category = l.reason_category || 'Autre'
        lossReasons[category] = (lossReasons[category] || 0) + 1
    })

    const sortedLossReasons = Object.entries(lossReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

    // Sort managers by performance (Leaderboard)
    const leaderboard = [...managerKPIs].sort((a, b) => b.performanceScore - a.performanceScore)

    // Sort managers by workload index
    const workloadList = [...managerKPIs].sort((a, b) => b.workloadIndex - a.workloadIndex)

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Rapports de Performance Consolidés
                </h2>
                <p className="text-xs text-zinc-400">
                    Analyses statistiques des indices de charge, scores de performance et motifs d'attrition.
                </p>
            </div>

            {/* Executive KPI Overview Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xxs">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider flex items-center gap-1">
                            <Award className="h-3.5 w-3.5 text-purple-400" />
                            Performance Moyenne
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xl font-extrabold text-white">{avgPerformance}%</span>
                        <div className="h-2 w-full bg-zinc-950 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-purple-600" style={{ width: `${avgPerformance}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                            Index de Charge Moyen
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xl font-extrabold text-white">{avgWorkload}</span>
                        <p className="text-zinc-500 text-[9px] mt-2">Cible recommandée &lt; 100</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider flex items-center gap-1">
                            <PhoneCall className="h-3.5 w-3.5 text-purple-400" />
                            MRR Total Portefeuille
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xl font-extrabold text-emerald-400">${totalPortfolioMRR.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}</span>
                        <p className="text-zinc-500 text-[9px] mt-2">{totalDoors} portes actives gérées</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                            Mandats Perdus YTD
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xl font-extrabold text-rose-400">{totalLost}</span>
                        <p className="text-zinc-500 text-[9px] mt-2">{preventableLost} départs évitables ({preventablePct}%)</p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Leaderboard & Workload Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Leaderboard */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Classement de la Performance</CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">Scores calculés combinant taux d'appels, résolutions de tâches et résultats d'audits.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xxs">
                        {leaderboard.map((item, idx) => (
                            <div key={item.manager.id} className="space-y-1">
                                <div className="flex justify-between font-semibold">
                                    <span className="text-zinc-200">{idx + 1}. {item.manager.first_name} {item.manager.last_name} ({item.manager.manager_teams?.name || 'Aucune'})</span>
                                    <span className="text-purple-400 font-bold">{item.performanceScore}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${item.performanceScore}%` }} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Workload Index Breakdown */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Indices de Charge de Travail</CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">Surcharge critique détectée pour les gestionnaires au-delà du seuil de 120.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xxs">
                        {workloadList.map((item) => {
                            const indexVal = item.workloadIndex
                            // Scale index for CSS progress bar (assuming max 200 for index)
                            const cssPct = Math.min(100, Math.round((indexVal / 200) * 100))
                            const color = 
                                indexVal > 120 ? 'bg-rose-600' :
                                indexVal > 80 ? 'bg-amber-500' : 'bg-emerald-500'

                            return (
                                <div key={item.manager.id} className="space-y-1">
                                    <div className="flex justify-between font-semibold">
                                        <span className="text-zinc-200">{item.manager.first_name} {item.manager.last_name}</span>
                                        <span className="text-zinc-300 font-bold">{indexVal} pts</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                                        <div className={`h-full ${color} rounded-full`} style={{ width: `${cssPct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* Attrition & At-Risk analysis */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Analyse de l'Attrition (Départs Mandats)</CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">Comprendre les causes racines des résiliations de contrats pour préserver les revenus récurrents.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xxs">
                    {/* Preventable Loss Indicator */}
                    <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-4 flex flex-col justify-center items-center text-center">
                        <h4 className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Évitabilité des Départs</h4>
                        <div className="relative h-24 w-24 flex items-center justify-center">
                            {/* Radial/Concentric indicators or simple text badge */}
                            <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                            <div className="absolute inset-0 border-4 border-rose-600 rounded-full" style={{ clipPath: `inset(0px ${100 - preventablePct}% 0px 0px)` }} />
                            <span className="text-xl font-extrabold text-white">{preventablePct}%</span>
                        </div>
                        <p className="text-zinc-500 max-w-[250px] leading-relaxed">
                            des résiliations de mandats de copropriété sont considérées comme évitables (défauts de suivi, retards, mauvaise communication).
                        </p>
                    </div>

                    {/* Common departure reason breakdown */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Top 5 des motifs de départs</h4>
                        {sortedLossReasons.length === 0 ? (
                            <p className="text-zinc-500 italic">Aucune perte de mandat consignée.</p>
                        ) : (
                            sortedLossReasons.map(([reason, count]) => {
                                const reasonPct = Math.round((count / totalLost) * 100)
                                return (
                                    <div key={reason} className="space-y-1">
                                        <div className="flex justify-between text-zinc-300 font-semibold text-[10px]">
                                            <span>{reason}</span>
                                            <span>{count} ({reasonPct}%)</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-600 rounded-full" style={{ width: `${reasonPct}%` }} />
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
