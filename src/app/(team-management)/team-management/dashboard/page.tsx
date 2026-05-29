import { getGlobalTeamStats } from '@/actions/team-management'
import { getManagers, getManagerTeams } from '@/actions/managers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CallsStatsPanel } from '@/components/features/team-management/CallsStatsPanel'
import { DashboardFilterBar } from '@/components/features/team-management/DashboardFilterBar'
import { ManualStatsEntryCards } from '@/components/features/team-management/ManualStatsEntryCards'
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

    const [stats, managers, teams] = await Promise.all([
        getGlobalTeamStats({ range, fromMonth: from, toMonth: to, teamId }),
        getManagers(),
        getManagerTeams()
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

            {/* Split Content: Packages breakdown and Manual entry logs */}
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

                {/* Contracts package breakdown card */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                            Forfaits de Gestion
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Répartition des forfaits de services.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {packageData.map((pkg) => {
                                const total = stats.totalSyndicates || 1
                                const percent = Math.round((pkg.count / total) * 105)
                                const cappedPercent = Math.min(100, percent)
                                return (
                                    <div key={pkg.name} className="space-y-1">
                                        <div className="flex justify-between text-xxs font-medium">
                                            <span className="text-zinc-300">{pkg.name}</span>
                                            <span className="text-zinc-550 text-zinc-400">{pkg.count} contr. ({Math.round((pkg.count / total) * 100)}%)</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                                            <div 
                                                className="h-full bg-purple-600 rounded-full" 
                                                style={{ width: `${cappedPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Calls Statistics Panel */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        Tableau des Appels — Tous les Gestionnaires
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Naviguez par mois ou définissez une période personnalisée. Cliquez sur "Historique" pour voir l'évolution MoM par gestionnaire.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CallsStatsPanel />
                </CardContent>
            </Card>
        </div>
    )
}
