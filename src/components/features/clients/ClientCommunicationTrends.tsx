// @ts-nocheck
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Mail, Phone, Calendar, TrendingUp, TrendingDown, ArrowRight, Trash2, Network, Users, ShieldAlert } from 'lucide-react'
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
    Cell,
    ReferenceLine
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
    targetIndex?: number
}

const DEPT_LIST = ["Gestion", "Administration", "Comptabilité", "Technique", "Sinistres", "Assurance", "Direction", "Chargé d’opération", "Conseil d'Administration"]

const DEPT_COLORS: Record<string, string> = {
    "Gestion": "#3b82f6", // Blue
    "Administration": "#0d9488", // Teal
    "Comptabilité": "#8b5cf6", // Purple
    "Technique": "#f97316", // Orange
    "Sinistres": "#ef4444", // Red
    "Assurance": "#ec4899", // Pink
    "Direction": "#64748b", // Slate
    "Chargé d’opération": "#6366f1", // Indigo
    "Chargé d'opération": "#6366f1",
    "Conseil d'Administration": "#f59e0b" // Amber
}

export function ClientCommunicationTrends({ 
    stats: initialStats, 
    clientId, 
    teamComparison = [], 
    targetIndex = 2.50 
}: ClientCommunicationTrendsProps) {
    const [stats, setStats] = useState<CommStatRecord[]>(initialStats)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedRunId, setSelectedRunId] = useState<string>('')
    
    // Date filter states
    const [filterMode, setFilterMode] = useState<'all' | 'year' | 'custom'>('all')
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [customStartMonth, setCustomStartMonth] = useState<string>('')
    const [customEndMonth, setCustomEndMonth] = useState<string>('')

    const formatLocalDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return '?'
        const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]
        const parts = cleanStr.split('-')
        if (parts.length === 3) {
            return `${parts[0]}-${parts[1]}-${parts[2]}`
        }
        return dateStr
    }

    const formatMonthLabel = (p: string) => {
        try {
            const [y, m] = p.split('-')
            const date = new Date(Number(y), Number(m) - 1, 1)
            return date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })
        } catch (_) {
            return p
        }
    }

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

    const detectedYears = useMemo(() => {
        const years = new Set<string>()
        runMonths.forEach((m: string) => {
            const y = m.split('-')[0]
            if (y && y.length === 4 && !isNaN(Number(y))) {
                years.add(y)
            }
        })
        return Array.from(years).sort()
    }, [runMonths])

    // Reset date range filters when changing selected run
    useEffect(() => {
        setFilterMode('all')
        if (runMonths.length > 0) {
            setCustomStartMonth(runMonths[0])
            setCustomEndMonth(runMonths[runMonths.length - 1])
        }
        if (detectedYears.length > 0) {
            setSelectedYear(detectedYears[detectedYears.length - 1])
        }
    }, [selectedRunId, runMonths, detectedYears])

    // Filter timeline dynamically based on filters
    const filteredTimelineList = useMemo(() => {
        if (!selectedRun) return []
        
        return timelineList.filter((t: any) => {
            if (filterMode === 'all') return true
            if (filterMode === 'year') {
                return t.period.startsWith(selectedYear)
            }
            if (filterMode === 'custom') {
                return t.period >= customStartMonth && t.period <= customEndMonth
            }
            return true
        }).sort((a: any, b: any) => a.period.localeCompare(b.period))
    }, [selectedRun, timelineList, filterMode, selectedYear, customStartMonth, customEndMonth])

    // Calculate aggregated stats over filtered timeline range
    const filteredStats = useMemo(() => {
        if (!selectedRun || filteredTimelineList.length === 0) return null

        let totalComms = 0
        let inclusionsVolume = 0
        let exclusionsVolume = 0

        filteredTimelineList.forEach((t: any) => {
            inclusionsVolume += Number(t.contractVolume || 0)
            exclusionsVolume += Number(t.outOfContractVolume || 0)
        })

        totalComms = inclusionsVolume + exclusionsVolume
        const monthsCount = filteredTimelineList.length
        const ratio = Number((inclusionsVolume / (totalUnits * monthsCount)).toFixed(2))

        // Range description string
        const sortedPeriods = [...filteredTimelineList].map(t => t.period).sort()
        const startText = sortedPeriods[0]
        const endText = sortedPeriods[sortedPeriods.length - 1]

        const periodText = startText === endText 
            ? formatMonthLabel(startText)
            : `${formatMonthLabel(startText)} au ${formatMonthLabel(endText)}`

        return {
            totalComms,
            emails: null,
            calls: null,
            inclusionsVolume,
            exclusionsVolume,
            ratio,
            periodText,
            monthsCount
        }
    }, [selectedRun, filteredTimelineList, totalUnits])

    // Department Breakdown counts aggregated over filtered timeline
    const filteredDeptCounts = useMemo(() => {
        if (!selectedRun) return {}
        const monthlyDeptHistory = runSummary.monthlyDeptHistory || {}
        const periods = filteredTimelineList.map((t: any) => t.period)

        const counts: Record<string, number> = {}
        DEPT_LIST.forEach(dept => {
            const history = monthlyDeptHistory[dept] || {}
            let sum = 0
            periods.forEach(p => {
                sum += Number(history[p] || 0)
            })
            counts[dept] = sum
        })
        return counts
    }, [selectedRun, runSummary, filteredTimelineList])

    // Unit Breakdown counts aggregated over filtered timeline
    const filteredUnitCounts = useMemo(() => {
        if (!selectedRun) return []

        const monthlyUnitHistory = runSummary.monthlyUnitHistory
        const periods = filteredTimelineList.map((t: any) => t.period)
        const totalComms = filteredStats?.totalComms || 1

        if (monthlyUnitHistory) {
            // Compute dynamic unit counts based on active periods
            const counts: Record<string, number> = {}
            Object.entries(monthlyUnitHistory).forEach(([unit, history]: [string, any]) => {
                let sum = 0
                periods.forEach(p => {
                    sum += Number(history[p] || 0)
                })
                if (sum > 0) {
                    counts[unit] = sum
                }
            })

            return Object.entries(counts)
                .map(([unit, count]) => {
                    const percentage = totalComms > 0 ? Math.round((count / totalComms) * 100) : 0
                    const avgPerMonth = Number((count / (filteredTimelineList.length || 1)).toFixed(2))
                    return { unit, count, percentage, avgPerMonth }
                })
                .sort((a, b) => b.count - a.count)
        } else {
            // Fallback for older saved runs
            const sortedUnits = runSummary.sortedUnits || []
            const runTotal = Number(selectedRun.total_communications || 1)
            return sortedUnits.map((u: any) => {
                const percentage = runTotal > 0 ? Math.round((u.count / runTotal) * 100) : 0
                return {
                    unit: u.unit,
                    count: u.count,
                    percentage,
                    avgPerMonth: null
                }
            })
        }
    }, [selectedRun, runSummary, filteredTimelineList, filteredStats])

    // Chronological timeline data formatted for Chart
    const runChartData = useMemo(() => {
        return filteredTimelineList.map((t: any) => {
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
    }, [filteredTimelineList])

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

            // Find months count for this run to compute monthly average index
            let monthsCount = 1
            if (sum.timelineList && Array.isArray(sum.timelineList) && sum.timelineList.length > 0) {
                monthsCount = sum.timelineList.length
            } else if (tc.period_start && tc.period_end) {
                try {
                    const start = new Date(tc.period_start + 'T00:00:00')
                    const end = new Date(tc.period_end + 'T00:00:00')
                    const diffY = end.getFullYear() - start.getFullYear()
                    const diffM = end.getMonth() - start.getMonth()
                    monthsCount = Math.max(1, (diffY * 12) + diffM + 1)
                } catch (_) {}
            }

            const loadRate = Number((inclusions / (units * monthsCount)).toFixed(2))

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
        const target = targetIndex
        const moderateLimit = target * 1.2
        const criticalLimit = target * 1.8
        
        if (rate > criticalLimit) {
            return {
                label: 'Surcharge Critique',
                css: 'bg-rose-950/40 text-rose-450 border border-rose-800/40',
                color: 'text-rose-400'
            }
        } else if (rate > moderateLimit) {
            return {
                label: 'Surcharge Modérée',
                css: 'bg-amber-950/40 text-amber-450 border border-amber-800/40',
                color: 'text-amber-400'
            }
        } else {
            return {
                label: 'Usage Stable',
                css: 'bg-emerald-950/40 text-emerald-450 border border-emerald-800/40',
                color: 'text-emerald-400'
            }
        }
    }

    const loadStatus = filteredStats ? getLoadStatus(filteredStats.ratio) : null

    return (
        <div className="space-y-8 animate-fade-in text-xs w-full max-w-full">
            {stats.length === 0 ? (
                <Card className="bg-[#0c0d12] border border-zinc-850 py-16 flex flex-col items-center justify-center text-center rounded-2xl shadow-xl">
                    <Info className="h-10 w-10 text-zinc-600 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-zinc-350">Aucune statistique de communication disponible</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                        Rendez-vous dans la <strong>Configuration Globale &gt; Analyse Communications</strong> pour importer et analyser les volumes de ce syndicat.
                    </p>
                </Card>
            ) : (
                <>
                    {/* Control Row: Select Analysis Run & Date Filters */}
                    <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-[#0d0e12]/80 p-4 border border-zinc-850 rounded-xl shadow-lg backdrop-blur-md">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Rapport d'analyse :</span>
                                <select
                                    value={selectedRunId}
                                    onChange={(e) => setSelectedRunId(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                >
                                    {stats.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            Analyse du {formatLocalDate(s.analysis_date)} ({s.total_communications} comms)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {runMonths.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Filtrer par :</span>
                                        <select
                                            value={filterMode}
                                            onChange={(e) => setFilterMode(e.target.value as any)}
                                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                        >
                                            <option value="all">Toutes les dates</option>
                                            {detectedYears.length > 0 && <option value="year">Par Année</option>}
                                            <option value="custom">Période personnalisée</option>
                                        </select>
                                    </div>

                                    {filterMode === 'year' && detectedYears.length > 0 && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Année :</span>
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                            >
                                                {detectedYears.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {filterMode === 'custom' && (
                                        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">De :</span>
                                            <select
                                                value={customStartMonth}
                                                onChange={(e) => setCustomStartMonth(e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                            >
                                                {runMonths.map(m => (
                                                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                                                ))}
                                            </select>

                                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">À :</span>
                                            <select
                                                value={customEndMonth}
                                                onChange={(e) => setCustomEndMonth(e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                            >
                                                {runMonths.map(m => (
                                                    <option key={m} value={m} disabled={m < customStartMonth}>{formatMonthLabel(m)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* KPI Summary Row */}
                    {filteredStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Main Load Index */}
                            <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Indice de Charge Réel</span>
                                    
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black text-indigo-400 tracking-tight font-mono">
                                            {filteredStats.ratio.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-zinc-500 font-medium">interactions / porte / mois</span>
                                    </div>

                                    {loadStatus && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <Badge className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${loadStatus.css}`}>
                                                {loadStatus.label}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 font-medium font-mono">Cible: {targetIndex.toFixed(2)}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card 2: Communication Volume & Channel Split */}
                            <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Volume de Communications</span>

                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black text-zinc-150 tracking-tight font-mono">
                                            {filteredStats.totalComms}
                                        </span>
                                        <span className="text-xs text-zinc-500 font-medium">communications</span>
                                    </div>

                                    <div className="mt-4 pt-1 flex items-center gap-4 text-[10px]">
                                        <span className="flex items-center gap-1 font-semibold text-zinc-400">
                                            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                                            {filteredStats.inclusionsVolume} forfaitaires
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-zinc-400">
                                            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                                            {filteredStats.exclusionsVolume} hors-forfait
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Team Comparison */}
                            <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Positionnement Équipe</span>

                                    {clientRankInTeam ? (
                                        <>
                                            <div className="flex items-baseline gap-2 mt-2">
                                                <span className={`text-5xl font-black tracking-tight font-mono ${clientRankInTeam.isDeviationUp ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                    {clientRankInTeam.isDeviationUp ? '+' : ''}{clientRankInTeam.deviationPct}%
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium">vs moyenne équipe</span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2">
                                                <Badge className="bg-[#1e1a3a] text-indigo-300 border border-indigo-900/60 px-2 py-0.5 rounded-full text-[9px] font-bold">
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
                            </Card>
                        </div>
                    )}

                    {/* Timeline & Department Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 1. Month-by-month timeline chart */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Évolution de la charge par mois</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">Visualisation de la charge de travail forfaitaire (Gestion/Admin/Compta) vs exclue (Sinistres/Tech).</CardDescription>
                            </CardHeader>
                            <CardContent className="h-72 pt-2">
                                {runChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={runChartData}>
                                            <defs>
                                                <linearGradient id="colorForfait" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorExclus" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222530" vertical={false} />
                                            <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                            <Area type="monotone" dataKey="Forfait (Inclus)" name="Inclus (Gestion, Admin, Compta)" stroke="#818cf8" fillOpacity={1} fill="url(#colorForfait)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="Exclus (Sinistre/Tech)" name="Hors-Forfait (Sinistres, Tech)" stroke="#f97316" fillOpacity={1} fill="url(#colorExclus)" strokeWidth={1.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-600 italic">Aucune donnée mensuelle.</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Department Breakdown Bar Chart */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indices de Charge par Service</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Ventilation de la charge de travail moyenne par porte par mois.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-72 pt-2">
                                {filteredTimelineList.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-zinc-600 italic text-center p-4">
                                        Sélectionnez un intervalle de dates contenant des données.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            layout="vertical"
                                            data={DEPT_LIST.map(dept => {
                                                const count = filteredDeptCounts[dept] || 0
                                                const monthsCount = filteredTimelineList.length || 1
                                                return {
                                                    name: dept,
                                                    value: Number((count / (totalUnits * monthsCount)).toFixed(2))
                                                }
                                            }).filter(d => d.value > 0)}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222530" horizontal={false} vertical={true} />
                                            <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={80} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }} />
                                            <Bar dataKey="value" name="Indice / porte / mois" fill="#818cf8" radius={[0, 4, 4, 0]}>
                                                {DEPT_LIST.map(dept => (
                                                    <Cell key={dept} fill={DEPT_COLORS[dept] || '#818cf8'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Department Workload Breakdown Cards Grid */}
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Répartition de la charge par Service</h3>
                            <span className="text-[10px] text-zinc-500 font-mono">Période: {filteredStats?.periodText}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {DEPT_LIST.map(dept => {
                                const count = filteredDeptCounts[dept] || 0
                                const monthsCount = filteredTimelineList.length || 1
                                const loadRate = Number((count / (totalUnits * monthsCount)).toFixed(2))
                                const totalComms = filteredStats?.totalComms || 1
                                const percentage = Math.round((count / totalComms) * 100)
                                const color = DEPT_COLORS[dept] || '#818cf8'

                                return (
                                    <Card 
                                        key={dept} 
                                        className="bg-[#121318]/90 border border-zinc-850 hover:border-zinc-800 transition-all shadow-md relative overflow-hidden group cursor-default"
                                    >
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-350 block tracking-tight truncate max-w-[150px]" title={dept}>
                                                        {dept}
                                                    </span>
                                                    <span className="text-xxs text-zinc-500 font-medium font-mono">
                                                        {count} comms ({percentage}%)
                                                    </span>
                                                </div>
                                                <span 
                                                    className="h-2 w-2 rounded-full" 
                                                    style={{ backgroundColor: color }}
                                                />
                                            </div>

                                            <div className="flex items-baseline justify-between pt-1">
                                                <span className="text-2xl font-black text-zinc-150 font-mono tracking-tight">
                                                    {loadRate.toFixed(2)}
                                                </span>
                                                <span className="text-[9px] text-zinc-550 font-mono">
                                                    index / porte / mois
                                                </span>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="space-y-1">
                                                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-500" 
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: color 
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>

                    {/* Unit Breakdown Card */}
                    <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Volume de communication par Unité (Porte)</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Répartition du volume total de communications par unité/porte sur la période sélectionnée ({filteredStats?.periodText}).
                                </CardDescription>
                            </div>
                            <Badge className="bg-[#1e1a3a] text-indigo-300 border border-indigo-900/60 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                {filteredUnitCounts.length} Unités actives
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            {filteredUnitCounts.length === 0 ? (
                                <div className="text-center py-8 text-zinc-555 italic text-xxs">
                                    Aucune donnée par unité pour cette période.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                                    {filteredUnitCounts.map((u, idx) => (
                                        <div 
                                            key={u.unit} 
                                            className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl hover:border-zinc-800 transition-all flex flex-col justify-between space-y-2 group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-bold text-zinc-400">
                                                    Unité <strong className="text-zinc-200">{u.unit}</strong>
                                                </span>
                                                <span className="text-[9px] text-zinc-500 font-mono font-bold">
                                                    #{idx + 1}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-base font-black text-indigo-400 font-mono">
                                                        {u.count}
                                                    </span>
                                                    <span className="text-[9px] text-zinc-550 font-mono">
                                                        comms
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px]">
                                                    <span className="text-zinc-500 font-mono">Part:</span>
                                                    <span className="text-zinc-350 font-bold font-mono">{u.percentage}%</span>
                                                </div>
                                                {u.avgPerMonth !== null && (
                                                    <div className="flex justify-between items-center text-[9px] border-t border-zinc-900/60 pt-1 mt-1">
                                                        <span className="text-zinc-500 font-mono">Moyenne:</span>
                                                        <span className="text-emerald-400 font-mono font-bold">{u.avgPerMonth}/m</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 3. Team Comparison Chart */}
                    {teamComparisonStats.length > 1 && (
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Positionnement de l'usage forfaitaire au sein de l'équipe</CardTitle>
                                    <CardDescription className="text-xxs text-zinc-500">Comparaison de l'indice de charge (interactions/porte) avec les autres syndicats de la même équipe.</CardDescription>
                                </div>
                                <div className="text-right text-xxs font-bold text-zinc-500">
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
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222530" horizontal={false} vertical={true} />
                                        <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={120} />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-[#0c0d12] border border-zinc-800 p-2.5 rounded-lg text-xxs space-y-1 shadow-xl">
                                                            <div className="font-bold text-white">{data.name} <span className="font-mono text-zinc-400">({data.code})</span></div>
                                                            <div className="text-indigo-400 font-bold">Indice: {data.loadRate.toFixed(2)} / porte / mois</div>
                                                            <div className="text-zinc-400">Volume Total: {data.totalVolume} comms</div>
                                                            {data.isCurrent && <div className="text-amber-400 font-semibold mt-0.5">&middot; Ce syndicat</div>}
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <ReferenceLine 
                                            x={teamAverageLoad} 
                                            stroke="#6366f1" 
                                            strokeDasharray="4 4"
                                            label={{ value: `Moyenne: ${teamAverageLoad}`, fill: '#818cf8', fontSize: 8, position: 'top' }}
                                        />
                                        <Bar dataKey="loadRate" radius={[0, 4, 4, 0]}>
                                            {teamComparisonStats.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.isCurrent ? '#6366f1' : '#27272a'} 
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
                    <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historique des analyses de communications</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto text-xxs">
                                <table className="w-full">
                                    <thead className="bg-[#0c0d12] text-zinc-500 border-b border-zinc-850 text-left font-bold uppercase tracking-wider">
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
                                    <tbody className="divide-y divide-zinc-850">
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
                                                <tr key={row.id} className={`hover:bg-zinc-900/10 text-zinc-300 ${selectedRunId === row.id ? 'bg-indigo-950/5 font-semibold border-l-2 border-indigo-500' : ''}`}>
                                                    <td className="p-3 font-semibold">
                                                        <button 
                                                            onClick={() => setSelectedRunId(row.id)}
                                                            className="text-left hover:underline text-indigo-400 font-bold cursor-pointer"
                                                        >
                                                            {formatLocalDate(row.analysis_date)}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-zinc-400">
                                                        {row.period_start ? formatLocalDate(row.period_start) : '?'} au {row.period_end ? formatLocalDate(row.period_end) : '?'}
                                                    </td>
                                                    <td className="p-3 font-mono font-medium">{runUnits} SDC</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">{inclusionsLoadRate}</td>
                                                    <td className="p-3 text-zinc-400 font-mono">
                                                        {row.total_emails} M / {row.total_phone_calls} A
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-indigo-450 text-indigo-400">{row.total_communications}</td>
                                                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                        {deletingId === row.id ? (
                                                            <div className="flex justify-end gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleDelete(row.id)}
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] h-5 px-2 rounded cursor-pointer"
                                                                >
                                                                    Oui
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setDeletingId(null)}
                                                                    className="border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[9px] h-5 px-2 rounded cursor-pointer"
                                                                >
                                                                    Non
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setDeletingId(row.id)}
                                                                className="hover:bg-rose-950/20 text-zinc-500 hover:text-rose-450 h-6 w-6 p-0 rounded-md cursor-pointer"
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
