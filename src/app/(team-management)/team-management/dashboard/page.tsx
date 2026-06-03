import { getGlobalTeamStats, getComplaintCategoriesAction } from '@/actions/team-management'
import { getManagers, getManagerTeams } from '@/actions/managers'
import { getClients } from '@/actions/clients'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CallsStatsPanel } from '@/components/features/team-management/CallsStatsPanel'
import { DashboardFilterBar } from '@/components/features/team-management/DashboardFilterBar'
import { ManualStatsEntryCards } from '@/components/features/team-management/ManualStatsEntryCards'
import { WeeklyAssessmentGrid } from '@/components/features/team-management/WeeklyAssessmentGrid'
import { DashboardQuickNote } from '@/components/features/team-management/DashboardQuickNote'
import { TeamTrendsCharts } from '@/components/features/team-management/TeamTrendsCharts'
import { 
    Building2, 
    DoorOpen, 
    DollarSign, 
    Handshake, 
    ShieldAlert, 
    UserMinus, 
    UserPlus, 
    FileSpreadsheet, 
    PhoneCall,
    Mail,
    CheckSquare,
    TrendingUp,
    TrendingDown,
    Activity
} from 'lucide-react'

import { getActiveTeamContext } from '@/utils/team-context'

export default async function TeamManagementDashboard(props: {
    searchParams: Promise<{ range?: string; from?: string; to?: string; teamId?: string }>
}) {
    const searchParams = await props.searchParams
    const range = searchParams.range || 'current-year'
    const from = searchParams.from
    const to = searchParams.to
    const teamId = searchParams.teamId || undefined

    const context = await getActiveTeamContext()

    const [stats, managers, teams, categories, clients] = await Promise.all([
        getGlobalTeamStats({ range, fromMonth: from, toMonth: to, teamId }),
        getManagers(),
        getManagerTeams(),
        getComplaintCategoriesAction(),
        getClients()
    ])

    const packageData = Object.entries(stats.packageCounts).map(([name, count]) => ({
        name,
        count
    }))

    const getCallColor = (pct: number) => {
        if (pct >= 80) return 'text-emerald-400'
        if (pct > 55) return 'text-amber-450 text-amber-400'
        return 'text-rose-500'
    }

    const getFrenchRangeLabel = (rangeStr: string) => {
        if (rangeStr === 'this-month') return 'ce mois'
        if (rangeStr === 'last-month') return 'le mois dernier'
        if (rangeStr === 'current-quarter') return 'ce trimestre'
        if (rangeStr === 'custom') return 'la période personnalisée'
        return 'cette année'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase">Tableau de bord Gestion d'Équipe</h2>
                    <p className="text-xs text-zinc-400">
                        Aperçu stratégique de la charge de travail, de la conformité réglementaire et de la satisfaction client.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <DashboardFilterBar 
                teams={teams}
                currentTeamId={teamId}
                isRestricted={context.isRestricted}
            />

            {/* Metrics cards grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                {/* 1. Calls stats */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Appels Répondus</CardTitle>
                        <PhoneCall className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white flex items-baseline gap-1.5">
                            {stats.totalCalls > 0 ? (
                                <>
                                    <span className={getCallColor(stats.callsAnsweredPct)}>{stats.callsAnsweredPct}%</span>
                                    <span className="text-[10px] text-zinc-500 font-normal">({stats.answeredCalls}/{stats.totalCalls})</span>
                                </>
                            ) : (
                                <span className="text-zinc-500 italic text-xs">Aucun appel</span>
                            )}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Appels reçus sur {getFrenchRangeLabel(range)}</p>
                    </CardContent>
                </Card>

                {/* 2. Communications */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Communications</CardTitle>
                        <Mail className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.totalCommunications}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Moyenne: {stats.communicationsPerManager} / gestionnaire</p>
                    </CardContent>
                </Card>

                {/* 3. Tasks */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Complétion Tâches</CardTitle>
                        <CheckSquare className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.taskCompletionRate}%</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Ouvertes: {stats.totalOpenTasks} | Fermées: {stats.totalClosedTasks}</p>
                    </CardContent>
                </Card>

                {/* 4. Active Portfolio */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Syndicats & Portes</CardTitle>
                        <Building2 className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.totalSyndicates} <span className="text-xs text-zinc-500 font-normal">({stats.totalDoors} portes)</span></div>
                        <p className="text-[10px] text-zinc-500 mt-1">Total des actifs administrés</p>
                    </CardContent>
                </Card>

                {/* 5. Recurring Revenue */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Revenu Récurrent (MRR)</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-emerald-400">${stats.mrr.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Honoraires de gestion récurrents</p>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Secondary indicators */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Alignements 1v1</span>
                        <Handshake className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-lg font-extrabold text-white">{stats.meetingsCount}</div>
                        <p className="text-[9px] text-zinc-500">Rencontres complétées</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Syndicats à Risque</span>
                        <Activity className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent className="pb-3 flex items-center justify-between">
                        <div className="text-lg font-extrabold text-amber-400">{stats.atRiskCount}</div>
                        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xxs font-bold text-rose-400 uppercase tracking-wider">Dossiers Critiques</span>
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent className="pb-3 flex items-center justify-between">
                        <div className="text-lg font-extrabold text-rose-500">{stats.criticalCount}</div>
                        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Nouveaux</span>
                        <UserPlus className="h-4 w-4 text-emerald-450 text-emerald-400" />
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-lg font-extrabold text-white">+{stats.newYtd}</div>
                        <p className="text-[9px] text-zinc-500">Mouvement entrant</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Perdus</span>
                        <UserMinus className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-lg font-extrabold text-white">-{stats.lostYtd}</div>
                        <p className="text-[9px] text-zinc-500">Mouvement sortant</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quote Maintenance Performance Section */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-400" />
                            Statistiques des Soumissions (Rapports d'opération)
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Performances globales sur le suivi des rapports d'opérations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Total Envoyé</span>
                                <span className="text-lg font-bold text-zinc-200 mt-1 block">{stats.reportQuotesSent}</span>
                            </div>
                            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Total Accepté</span>
                                <span className="text-lg font-bold text-emerald-400 mt-1 block">{stats.reportQuotesAccepted}</span>
                            </div>
                            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl border-purple-900/30">
                                <span className="text-[10px] text-purple-400 uppercase font-bold block">Taux d'approbation</span>
                                <span className="text-lg font-bold text-zinc-150 mt-1 block">{stats.reportQuoteApprovalRate}%</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xxs font-medium text-zinc-400">
                                <span>Taux de conversion global (Cible 80%)</span>
                                <span>{stats.reportQuoteApprovalRate}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-purple-600 rounded-full" 
                                    style={{ 
                                        width: `${stats.reportQuoteApprovalRate}%`,
                                        backgroundColor: stats.reportQuoteApprovalRate >= 80 ? '#10b981' : '#f43f5e' 
                                    }} 
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            Statistiques des Soumissions (Demandes additionnelles)
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Génération proactive de maintenance par les gestionnaires.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-4 gap-2 text-center text-xxs">
                            <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold block">Total Envoyé</span>
                                <span className="text-xs font-bold text-zinc-200 mt-1 block">{stats.additionalQuotesSent}</span>
                            </div>
                            <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold block">Total Accepté</span>
                                <span className="text-xs font-bold text-emerald-400 mt-1 block">{stats.additionalQuotesAccepted}</span>
                            </div>
                            <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold block">Taux d'approbation</span>
                                <span className="text-xs font-bold text-zinc-150 mt-1 block">{stats.additionalQuoteApprovalRate}%</span>
                            </div>
                            <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold block">Revenu Généré</span>
                                <span className="text-xs font-bold text-zinc-300 mt-1 block">${stats.additionalQuotesGeneratedValue.toLocaleString('fr-CA')}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex justify-between items-center text-xxs">
                            <span className="font-bold text-zinc-300 uppercase tracking-wider">Revenu Total Accepté</span>
                            <span className="text-sm font-extrabold text-emerald-400">${stats.additionalQuotesAcceptedValue.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Trends Analytics Charts */}
            <TeamTrendsCharts trends={stats.monthlyTrends || []} />

            {/* Split Content: Manual entry logs & Add a Note (replaces Forfaits de Gestion) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Manual stats entry split component */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            Saisie Manuelle des Indicateurs
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Enregistrer les appels, les courriels reçus et le suivi des tâches des gestionnaires.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <ManualStatsEntryCards managers={managers} teams={teams} />
                    </CardContent>
                </Card>

                {/* Dashboard Quick Note instead of Forfaits de Gestion */}
                <DashboardQuickNote managers={managers} categories={categories} clients={clients} />
            </div>

            {/* Activity History & Analytics Panel */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        Rapports d'Activité Historiques & Analytiques — Tous les Gestionnaires
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Visualisez et comparez les performances d'appels et la complétion des tâches. Utilisez le mode graphique pour comparer les gestionnaires ou voir leur courbe de tendance d'historique.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CallsStatsPanel 
                        range={range}
                        fromMonth={from}
                        toMonth={to}
                        teamId={teamId}
                    />
                </CardContent>
            </Card>

            {/* Weekly Assessment Grid at the very bottom (Togglable) */}
            <WeeklyAssessmentGrid managers={managers} teams={teams} />
        </div>
    )
}
