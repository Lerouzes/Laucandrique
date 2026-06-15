// @ts-nocheck
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Mail, Phone, Calendar, TrendingUp, TrendingDown, ArrowRight, Trash2, Network } from 'lucide-react'
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
    Bar
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

export function ClientCommunicationTrends({ stats: initialStats, clientId }: ClientCommunicationTrendsProps) {
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
                emails: null, // split not saved monthly, we'll hide emails/calls text or show total
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

    // Multi-run trend comparisons
    const multiRunTrend = useMemo(() => {
        if (stats.length < 2) return null
        
        const last = stats[stats.length - 1]
        const prev = stats[stats.length - 2]
        
        const lastUnits = Number(last.analysis_summary?.total_units || 90)
        const prevUnits = Number(prev.analysis_summary?.total_units || 90)

        let lastInclusions = 0
        if (last.analysis_summary?.deptCounts) {
            Object.entries(last.analysis_summary.deptCounts).forEach(([d, v]) => {
                if (d !== "Sinistres" && d !== "Technique") lastInclusions += Number(v || 0)
            })
        } else {
            lastInclusions = last.total_communications
        }

        let prevInclusions = 0
        if (prev.analysis_summary?.deptCounts) {
            Object.entries(prev.analysis_summary.deptCounts).forEach(([d, v]) => {
                if (d !== "Sinistres" && d !== "Technique") prevInclusions += Number(v || 0)
            })
        } else {
            prevInclusions = prev.total_communications
        }

        const lastLoad = lastInclusions / lastUnits
        const prevLoad = prevInclusions / prevUnits

        const change = lastLoad - prevLoad
        const pct = prevLoad > 0 ? Math.round((change / prevLoad) * 100) : 0

        return {
            change,
            pct: Math.abs(pct),
            isUp: change > 0,
            lastLoad: lastLoad.toFixed(2),
            prevLoad: prevLoad.toFixed(2)
        }
    }, [stats])

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

                        {multiRunTrend && (
                            <div className="flex items-center gap-2 text-xxs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg shrink-0">
                                <span className="text-zinc-500">Tendance multi-runs:</span>
                                {multiRunTrend.isUp ? (
                                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                                        <TrendingUp className="h-3 w-3" /> +{multiRunTrend.pct}%
                                    </span>
                                ) : (
                                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                        <TrendingDown className="h-3 w-3" /> -{multiRunTrend.pct}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Summary Row */}
                    {filteredStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Indice de Charge Réel</span>
                                    <span className="text-2xl font-black text-white mt-1 block">
                                        {filteredStats.ratio.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-zinc-450 block mt-1">
                                        Moyenne de <strong>{filteredStats.ratio.toFixed(2)}</strong> comms incluses par porte
                                    </span>
                                </div>
                                <div className="h-8 w-8 rounded-lg bg-indigo-950/40 flex items-center justify-center">
                                    <Network className="h-4 w-4 text-indigo-400" />
                                </div>
                            </Card>

                            <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Volume de Communications</span>
                                    <span className="text-2xl font-black text-zinc-200 mt-1 block">
                                        {filteredStats.totalComms} <span className="text-xs font-medium text-zinc-500">interactions</span>
                                    </span>
                                    {filteredStats.emails !== null ? (
                                        <span className="text-[9px] text-zinc-450 block mt-1">
                                            {filteredStats.emails} courriels &middot; {filteredStats.calls} appels
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-zinc-450 block mt-1">
                                            {filteredStats.inclusionsVolume} comms incluses &middot; {filteredStats.exclusionsVolume} exclues
                                        </span>
                                    )}
                                </div>
                            </Card>

                            <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Période Cible</span>
                                    <div className="flex items-center gap-2 mt-1.5 text-zinc-200 font-bold text-sm">
                                        <Calendar className="h-4 w-4 text-indigo-400" />
                                        <span>{filteredStats.periodText}</span>
                                    </div>
                                    <span className="text-[9px] text-zinc-500 block mt-1">
                                        Nombre total de portes: <strong>{totalUnits}</strong>
                                    </span>
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
