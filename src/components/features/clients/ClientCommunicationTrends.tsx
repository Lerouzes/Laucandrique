// @ts-nocheck
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Mail, Phone, Calendar, TrendingUp, TrendingDown, ArrowRight, Trash2, Network, Users } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { deleteCommunicationStatsAction } from '@/actions/communication-stats'
import { toast } from 'sonner'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    Cell
} from 'recharts'

interface CommStatRecord {
    id: string
    client_id: string
    analysis_date: string
    period_start: string | null
    period_end: string | null
    total_emails: number
    total_phone_calls: number
    total_communications: number
    analysis_summary: any
    created_at: string
}

interface ClientCommunicationTrendsProps {
    stats: CommStatRecord[]
    clientId: string
    teamComparison?: any[]
}

const DEPT_LIST = ["Gestion", "Administration", "Comptabilité", "Technique", "Sinistres", "Assurance", "Direction", "Chargé d’opération", "Conseil d'Administration"]

const DEPT_COLORS: Record<string, string> = {
    "Gestion": "#0284c7",
    "Administration": "#0d9488",
    "Comptabilité": "#7c3aed",
    "Technique": "#ea580c",
    "Sinistres": "#dc2626",
    "Assurance": "#db2777",
    "Direction": "#475569",
    "Chargé d’opération": "#6366f1",
    "Chargé d'opération": "#6366f1",
    "Conseil d'Administration": "#f59e0b"
}

export function ClientCommunicationTrends({ stats: initialStats, clientId, teamComparison = [] }: ClientCommunicationTrendsProps) {
    const [stats, setStats] = useState<CommStatRecord[]>(initialStats)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedRunId, setSelectedRunId] = useState<string>('')
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all')

    // Initialize selected run to the latest one
    useEffect(() => {
        if (stats.length > 0 && !selectedRunId) {
            setSelectedRunId(stats[stats.length - 1].id)
        }
    }, [stats, selectedRunId])

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteCommunicationStatsAction(id, clientId)
            if (res.success) {
                toast.success("Rapport d'analyse supprimé.")
                setStats(prev => prev.filter(s => s.id !== id))
                if (selectedRunId === id) {
                    const remaining = stats.filter(s => s.id !== id)
                    setSelectedRunId(remaining[remaining.length - 1]?.id || '')
                }
            }
        } catch (err: any) {
            toast.error("Erreur lors de la suppression.")
        }
    }

    const selectedRun = useMemo(() => {
        if (stats.length === 0) return null
        return stats.find(s => s.id === selectedRunId) || stats[stats.length - 1] || null
    }, [stats, selectedRunId])

    const runSummary = useMemo(() => {
        return selectedRun?.analysis_summary || {}
    }, [selectedRun])

    const totalUnits = useMemo(() => {
        return Number(runSummary.total_units || 90)
    }, [runSummary])

    const timelineList = useMemo(() => {
        return runSummary.timelineList || []
    }, [runSummary])

    const runMonths = useMemo(() => {
        return timelineList.map((t: any) => t.period).sort()
    }, [timelineList])

    // Reset month filter when changing selected run
    useEffect(() => {
        setSelectedMonthFilter('all')
    }, [selectedRunId])

    // Month details helper
    const filteredStats = useMemo(() => {
        if (!selectedRun) return null

        if (selectedMonthFilter === 'all') {
            let inclusionsVolume = 0
            if (runSummary.deptCounts) {
                Object.entries(runSummary.deptCounts).forEach(([dept, val]) => {
                    if (dept !== "Sinistres" && dept !== "Technique") {
                        inclusionsVolume += Number(val || 0)
                    }
                })
            } else {
                inclusionsVolume = selectedRun.total_communications
            }
            
            return {
                totalComms: selectedRun.total_communications,
                emails: selectedRun.total_emails,
                calls: selectedRun.total_phone_calls,
                inclusionsVolume,
                exclusionsVolume: selectedRun.total_communications - inclusionsVolume,
                ratio: Number((inclusionsVolume / totalUnits).toFixed(2)),
                periodText: `${selectedRun.period_start ? new Date(selectedRun.period_start).toLocaleDateString('fr-CA') : '?'} au ${selectedRun.period_end ? new Date(selectedRun.period_end).toLocaleDateString('fr-CA') : '?'}`
            }
        } else {
            const entry = timelineList.find((t: any) => t.period === selectedMonthFilter)
            const contract = Number(entry?.contractVolume || 0)
            const outOfContract = Number(entry?.outOfContractVolume || 0)
            const total = contract + outOfContract
            const ratio = Number(entry?.ratio || 0)
            
            // Format month text (e.g. "2026-05" -> "Mai 2026")
            let periodText = selectedMonthFilter
            try {
                const [y, m] = selectedMonthFilter.split('-')
                const date = new Date(Number(y), Number(m) - 1, 1)
                periodText = date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })
            } catch (_) {}

            return {
                totalComms: total,
                emails: null,
                calls: null,
                inclusionsVolume: contract,
                exclusionsVolume: outOfContract,
                ratio,
                periodText
            }
        }
    }, [selectedRun, selectedMonthFilter, timelineList, runSummary, totalUnits])

    // Department Breakdown counts for selected Month / Run
    const filteredDeptCounts = useMemo(() => {
        if (!selectedRun) return {}
        const deptCounts = runSummary.deptCounts || {}
        const monthlyDeptHistory = runSummary.monthlyDeptHistory || {}

        if (selectedMonthFilter === 'all') {
            return deptCounts
        }

        const counts: Record<string, number> = {}
        DEPT_LIST.forEach(dept => {
            const history = monthlyDeptHistory[dept] || {}
            counts[dept] = Number(history[selectedMonthFilter] || 0)
        })
        return counts
    }, [selectedRun, runSummary, selectedMonthFilter])

    const hasMonthlyDeptHistory = useMemo(() => {
        return runSummary.monthlyDeptHistory && Object.keys(runSummary.monthlyDeptHistory).length > 0
    }, [runSummary])

    // Chronological timeline data of selected run (Month-by-month)
    const runChartData = useMemo(() => {
        return timelineList.map((t: any) => {
            let label = t.period
            try {
                const [y, m] = t.period.split('-')
                const date = new Date(Number(y), Number(m) - 1, 1)
                label = date.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' })
            } catch (_) {}

            return {
                name: label,
                period: t.period,
                'Forfait (Inclus)': t.contractVolume,
                'Exclus (Sinistre/Tech)': t.outOfContractVolume,
                'Total': t.contractVolume + t.outOfContractVolume,
                'Indice': t.ratio
            }
        }).sort((a: any, b: any) => a.period.localeCompare(b.period))
    }, [timelineList])

    // Normalize team comparison statistics
    const teamComparisonStats = useMemo(() => {
        if (!teamComparison || teamComparison.length === 0) return []

        return teamComparison.map((tc: any) => {
            const sum = tc.analysis_summary || {}
            const units = Number(sum.total_units || 90)
            
            let inclusions = 0
            if (sum.deptCounts) {
                Object.entries(sum.deptCounts).forEach(([dept, val]) => {
                    if (dept !== "Sinistres" && dept !== "Technique") {
                        inclusions += Number(val || 0)
                    }
                })
            } else {
                inclusions = tc.total_communications
            }

            const loadRate = Number((inclusions / units).toFixed(2))

            return {
                id: tc.client_id,
                name: tc.clients?.company_name || tc.clients?.full_name || 'Autre SDC',
                code: tc.clients?.full_name || '',
                loadRate,
                totalVolume: tc.total_communications,
                isCurrent: tc.client_id === clientId
            }
        }).sort((a: any, b: any) => b.loadRate - a.loadRate)
    }, [teamComparison, clientId])

    // Team average index
    const teamAverageLoad = useMemo(() => {
        if (teamComparisonStats.length === 0) return 0
        const sum = teamComparisonStats.reduce((acc: number, curr: any) => acc + curr.loadRate, 0)
        return Number((sum / teamComparisonStats.length).toFixed(2))
    }, [teamComparisonStats])

    // Rank of current client in team
    const clientRankInTeam = useMemo(() => {
        if (teamComparisonStats.length === 0 || !filteredStats) return null
        const idx = teamComparisonStats.findIndex((tc: any) => tc.id === clientId)
        const deviationPct = teamAverageLoad > 0 
            ? Math.round(((filteredStats.ratio - teamAverageLoad) / teamAverageLoad) * 100)
            : 0

        return {
            rank: idx + 1,
            total: teamComparisonStats.length,
            deviationPct,
            isDeviationUp: deviationPct > 0
        }
    }, [teamComparisonStats, clientId, filteredStats, teamAverageLoad])

    const getLoadStatus = (rate: number) => {
        if (rate > 4.5) {
            return {
                label: 'Surcharge Critique',
                css: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                color: 'text-rose-400'
            }
        } else if (rate > 2.5) {
            return {
                label: 'Surcharge Modérée',
                css: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                color: 'text-amber-400'
            }
        } else {
            return {
                label: 'Usage Forfaitaire Stable',
                css: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                color: 'text-emerald-400'
            }
        }
    }

    const loadStatus = filteredStats ? getLoadStatus(filteredStats.ratio) : null

    return (
        <div className="space-y-6 animate-fade-in text-xs">
            {stats.length === 0 ? (
                <Card className="bg-[#16171e]/50 border-zinc-850 py-16 flex flex-col items-center justify-center text-center">
                    <Info className="h-10 w-10 text-zinc-650 mb-3" />
                    <h3 className="text-sm font-bold text-zinc-400">Aucune statistique de communication disponible</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                        Rendez-vous dans la <strong>Configuration Globale &gt; Analyse Communications</strong> pour importer et analyser les volumes de ce syndicat.
                    </p>
                </Card>
            ) : (
                <>
                    {/* Control Row: Select Analysis Run & Month Filter */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-zinc-950/40 p-4 border border-zinc-850 rounded-xl">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Rapport d'analyse :</span>
                                <select
                                    value={selectedRunId}
                                    onChange={(e) => setSelectedRunId(e.target.value)}
                                    className="bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer"
                                >
                                    {stats.map((s, idx) => (
                                        <option key={s.id} value={s.id}>
                                            Analyse du {new Date(s.analysis_date).toLocaleDateString('fr-CA')} ({s.total_communications} comms)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {runMonths.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Filtrer par mois :</span>
                                    <select
                                        value={selectedMonthFilter}
                                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                                        className="bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer"
                                    >
                                        <option value="all">Tous les mois</option>
                                        {runMonths.map((m: string) => {
                                            let label = m
                                            try {
                                                const [year, month] = m.split('-')
                                                const date = new Date(Number(year), Number(month) - 1, 1)
                                                label = date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })
                                            } catch (_) {}
                                            return (
                                                <option key={m} value={m}>
                                                    {label}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Highly Visible KPI Summary Row */}
                    {filteredStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Main Load Index */}
                            <Card className="bg-gradient-to-tr from-[#16171e] to-indigo-950/15 border-zinc-800/80 shadow-lg relative overflow-hidden">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold block">Indice de Charge Réel</span>
                                    
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black text-indigo-400 tracking-tight">
                                            {filteredStats.ratio.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium">interactions / porte</span>
                                    </div>

                                    {loadStatus && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <Badge className={`px-2 py-0.5 rounded text-[10px] font-bold ${loadStatus.css}`}>
                                                {loadStatus.label}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 font-medium font-mono">Forfait cible: 2.50</span>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                                    <Network className="h-24 w-24 text-indigo-400" />
                                </div>
                            </Card>

                            {/* Card 2: Communication Volume & Channel Split */}
                            <Card className="bg-gradient-to-tr from-[#16171e] to-emerald-950/10 border-zinc-800/80 shadow-lg relative overflow-hidden">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold block">Volume de Communications</span>

                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black text-zinc-100 tracking-tight">
                                            {filteredStats.totalComms}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium">comms valides</span>
                                    </div>

                                    <div className="mt-4 pt-1 flex items-center gap-4 text-[10px]">
                                        {filteredStats.emails !== null ? (
                                            <>
                                                <span className="flex items-center gap-1 font-bold text-zinc-350">
                                                    <Mail className="h-3.5 w-3.5 text-indigo-400" /> {filteredStats.emails} emails
                                                </span>
                                                <span className="flex items-center gap-1 font-bold text-zinc-350">
                                                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> {filteredStats.calls} appels
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex items-center gap-1 font-semibold text-zinc-400">
                                                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                                                    {filteredStats.inclusionsVolume} inclusions
                                                </span>
                                                <span className="flex items-center gap-1 font-semibold text-zinc-400">
                                                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                                    {filteredStats.exclusionsVolume} hors-forfait
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Team Comparison */}
                            <Card className="bg-gradient-to-tr from-[#16171e] to-purple-950/10 border-zinc-800/80 shadow-lg relative overflow-hidden">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold block">Positionnement Équipe</span>

                                    {clientRankInTeam ? (
                                        <>
                                            <div className="flex items-baseline gap-2 mt-2">
                                                <span className={`text-5xl font-black tracking-tight ${clientRankInTeam.isDeviationUp ? 'text-purple-400' : 'text-emerald-400'}`}>
                                                    {clientRankInTeam.isDeviationUp ? '+' : ''}{clientRankInTeam.deviationPct}%
                                                </span>
                                                <span className="text-xs text-zinc-400 font-medium">vs moyenne équipe</span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2">
                                                <Badge className="bg-purple-950/40 text-purple-400 border border-purple-800/40 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    Rang: #{clientRankInTeam.rank} / {clientRankInTeam.total}
                                                </Badge>
                                                <span className="text-[10px] text-zinc-500 font-medium font-mono">Moyenne: {teamAverageLoad.toFixed(2)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col justify-center text-zinc-500 italic mt-6">
                                            Aucun autre client dans cette équipe pour comparer.
                                        </div>
                                    )}
                                </CardContent>
                                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                                    <Users className="h-24 w-24 text-purple-450" />
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Timeline & Department Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 1. Month-by-month timeline chart of this run */}
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Évolution de la charge par mois (Ce rapport)</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">Visualisation de la charge de travail forfaitaire (Gestion/Comptabilité/Administration/etc) vs exclue (Sinistre/Tech).</CardDescription>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                {runChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={runChartData}>
                                            <defs>
                                                <linearGradient id="colorForfait" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorExclus" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                            <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '10px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                            <Area type="monotone" dataKey="Forfait (Inclus)" name="Inclus (Gestion, Admin, Compta)" stroke="#818cf8" fillOpacity={1} fill="url(#colorForfait)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="Exclus (Sinistre/Tech)" name="Hors-Forfait (Sinistres, Tech)" stroke="#ea580c" fillOpacity={1} fill="url(#colorExclus)" strokeWidth={1.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-550 italic">Aucune donnée mensuelle.</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Department Breakdown Bar Chart */}
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indices de Charge par Service</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    {selectedMonthFilter === 'all' ? "Indices globaux de cette analyse." : `Indices pour le mois de ${filteredStats?.periodText}.`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                {selectedMonthFilter !== 'all' && !hasMonthlyDeptHistory ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <Info className="h-6 w-6 text-zinc-650 mb-2" />
                                        <span className="text-zinc-500 text-xxs">Ventilation par service indisponible pour ce mois spécifique.</span>
                                        <span className="text-[9px] text-zinc-600 mt-1">Les anciennes analyses enregistrées ne supportent pas le filtre mensuel de service. Lancez une nouvelle analyse pour l'activer.</span>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            layout="vertical"
                                            data={DEPT_LIST.map(dept => ({
                                                name: dept,
                                                value: Number(((filteredDeptCounts[dept] || 0) / totalUnits).toFixed(2))
                                            })).filter(d => d.value > 0)}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                                            <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={80} />
                                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '10px' }} />
                                            <Bar dataKey="value" name="Indice / porte" fill="#818cf8" radius={[0, 4, 4, 0]}>
                                                {DEPT_LIST.map(dept => (
                                                    <Bar key={dept} dataKey="value" fill={DEPT_COLORS[dept] || '#818cf8'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 3. Team Comparison Chart */}
                    {teamComparisonStats.length > 1 && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Positionnement de l'usage forfaitaire au sein de l'équipe</CardTitle>
                                    <CardDescription className="text-xxs text-zinc-500">Comparaison de l'indice de charge (interactions/porte) avec les autres syndicats de la même équipe.</CardDescription>
                                </div>
                                <div className="text-right text-xxs font-bold text-zinc-450">
                                    Moyenne Équipe : <span className="text-indigo-400 font-mono">{teamAverageLoad.toFixed(2)}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        layout="vertical"
                                        data={teamComparisonStats}
                                        margin={{ left: 10, right: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                                        <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={120} />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-[#111827] border border-zinc-700 p-2.5 rounded-lg text-xxs space-y-1 shadow-xl">
                                                            <div className="font-bold text-white">{data.name} <span className="font-mono text-zinc-400">({data.code})</span></div>
                                                            <div className="text-indigo-400 font-bold">Indice: {data.loadRate.toFixed(2)} / porte</div>
                                                            <div className="text-zinc-400">Volume Total: {data.totalVolume} comms</div>
                                                            {data.isCurrent && <div className="text-amber-400 font-semibold mt-0.5">&middot; Ce syndicat (S671)</div>}
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Bar dataKey="loadRate" radius={[0, 4, 4, 0]}>
                                            {teamComparisonStats.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.isCurrent ? '#818cf8' : '#3f3f46'} 
                                                    fillOpacity={entry.isCurrent ? 1 : 0.6}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Historical Runs Table */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historique des analyses de communications</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto text-xxs">
                                <table className="w-full">
                                    <thead className="bg-zinc-950/40 text-zinc-550 border-b border-zinc-900 text-left font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3 font-semibold text-zinc-400">Date d'Analyse</th>
                                            <th className="p-3 font-semibold text-zinc-400">Période Couverte</th>
                                            <th className="p-3 font-semibold text-zinc-400">Portes</th>
                                            <th className="p-3 font-semibold text-zinc-400">Indice Forfaitaire</th>
                                            <th className="p-3 font-semibold text-zinc-400">Emails / Appels</th>
                                            <th className="p-3 font-semibold text-zinc-400">Total Volume</th>
                                            <th className="p-3 font-semibold text-zinc-400 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {stats.map((row) => {
                                            const runUnits = Number(row.analysis_summary?.total_units || 90)
                                            let inclusionsVolume = 0
                                            if (row.analysis_summary?.deptCounts) {
                                                Object.entries(row.analysis_summary.deptCounts).forEach(([d, v]) => {
                                                    if (d !== "Sinistres" && d !== "Technique") inclusionsVolume += Number(v || 0)
                                                })
                                            } else {
                                                inclusionsVolume = row.total_communications
                                            }
                                            const inclusionsLoadRate = (inclusionsVolume / runUnits).toFixed(2)

                                            return (
                                                <tr key={row.id} className={`hover:bg-zinc-900/30 text-zinc-300 ${selectedRunId === row.id ? 'bg-indigo-950/10 font-bold border-l-2 border-indigo-500' : ''}`}>
                                                    <td className="p-3 font-semibold">
                                                        <button 
                                                            onClick={() => setSelectedRunId(row.id)}
                                                            className="text-left hover:underline text-indigo-400 font-bold"
                                                        >
                                                            {new Date(row.analysis_date).toLocaleDateString('fr-CA')}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-zinc-400">
                                                        {row.period_start ? new Date(row.period_start).toLocaleDateString('fr-CA') : '?'} au {row.period_end ? new Date(row.period_end).toLocaleDateString('fr-CA') : '?'}
                                                    </td>
                                                    <td className="p-3 font-mono font-medium">{runUnits} SDC</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">{inclusionsLoadRate}</td>
                                                    <td className="p-3 text-zinc-400 font-mono">
                                                        {row.total_emails} M / {row.total_phone_calls} A
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-indigo-400">{row.total_communications}</td>
                                                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                        {deletingId === row.id ? (
                                                            <div className="flex justify-end gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleDelete(row.id)}
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] h-5 px-2 rounded"
                                                                >
                                                                    Oui
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setDeletingId(null)}
                                                                    className="border-zinc-800 text-zinc-450 text-[9px] h-5 px-2 rounded"
                                                                >
                                                                    Non
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setDeletingId(row.id)}
                                                                className="hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 h-6 w-6 p-0 rounded-md"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
