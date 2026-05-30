'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { getCallsHistoryAction, getWorkloadHistoryAction } from '@/actions/team-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Phone,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Loader2,
    BarChart3,
    Calendar,
    History,
    X,
    CheckSquare,
    Mail
} from 'lucide-react'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Cell
} from 'recharts'

// ─── helpers ────────────────────────────────────────────────────────────────

type CallRow = {
    managerId: string
    managerName: string
    yearMonth: string
    totalCalls?: number
    answeredCalls?: number
    openTasks?: number
    closedTasks?: number
    communicationsReceived?: number
    pct: number | null
}

function pctColor(pct: number | null): string {
    if (pct === null) return 'text-zinc-500'
    if (pct >= 80) return 'text-emerald-400'
    if (pct > 55) return 'text-amber-400'
    return 'text-rose-500'
}

function pctBgColor(pct: number | null): string {
    if (pct === null) return 'bg-zinc-900/30 border-zinc-800'
    if (pct >= 80) return 'bg-emerald-950/20 border-emerald-800/30'
    if (pct > 55) return 'bg-amber-950/20 border-amber-800/30'
    return 'bg-rose-950/20 border-rose-800/30'
}

function pctBarColor(pct: number | null): string {
    if (pct === null) return 'bg-zinc-700'
    if (pct >= 80) return 'bg-emerald-500'
    if (pct > 55) return 'bg-amber-500'
    return 'bg-rose-500'
}

function prevMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatYearMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number)
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    return `${months[m - 1]} ${y}`
}

function nowYearMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Manager History Modal ───────────────────────────────────────────────────

function ManagerHistoryModal({
    managerId,
    managerName,
    activityType,
    open,
    onClose
}: {
    managerId: string
    managerName: string
    activityType: 'calls' | 'tasks' | 'emails'
    open: boolean
    onClose: () => void
}) {
    const [rows, setRows] = useState<CallRow[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        setLoading(true)
        const fetchAction = activityType === 'calls'
            ? getCallsHistoryAction({ managerId, monthsBack: 24 })
            : getWorkloadHistoryAction({ managerId, monthsBack: 24 })

        fetchAction
            .then(data => setRows(data as CallRow[]))
            .finally(() => setLoading(false))
    }, [open, managerId, activityType])

    // Build MoM deltas (rows are sorted desc)
    const withMoM = rows.map((r, i) => {
        const prev = rows[i + 1]
        let delta: number | null = null
        if (prev) {
            if (activityType === 'emails') {
                if (r.communicationsReceived !== undefined && prev.communicationsReceived !== undefined) {
                    delta = r.communicationsReceived - prev.communicationsReceived
                }
            } else if (r.pct !== null && prev.pct !== null) {
                delta = r.pct - prev.pct
            }
        }
        return { ...r, delta }
    })

    // Reversed chronological sequence for chart
    const chartData = [...rows].reverse()

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-2xl w-full bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] flex flex-col p-0 rounded-xl shadow-2xl">
                <DialogHeader className="p-5 border-b border-zinc-900 shrink-0">
                    <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
                        <History className="h-4 w-4 text-purple-400" />
                        {activityType === 'calls' ? "Historique d'Appels" : activityType === 'tasks' ? "Historique de Complétion des Tâches" : "Historique des Courriels"} — {managerName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                            <span className="text-xs">Chargement...</span>
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-center text-xs text-zinc-500 italic py-8">
                            Aucun historique disponible pour ce gestionnaire.
                        </p>
                    ) : (
                        <>
                            {/* Chronological Trend Graph */}
                            {chartData.length > 1 && (
                                <div className="space-y-1.5">
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tendance de Progression</h4>
                                    <div className="h-44 w-full bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-3">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                                <XAxis
                                                    dataKey="yearMonth"
                                                    stroke="#71717a"
                                                    fontSize={9}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(ym) => {
                                                        const [_, m] = ym.split('-')
                                                        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
                                                        return months[parseInt(m, 10) - 1]
                                                    }}
                                                />
                                                <YAxis
                                                    stroke="#71717a"
                                                    fontSize={9}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    domain={activityType === 'emails' ? ['auto', 'auto'] : [0, 100]}
                                                    tickFormatter={(v) => activityType === 'emails' ? String(v) : `${v}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                        borderColor: '#27272a',
                                                        borderRadius: '12px',
                                                        fontSize: 10,
                                                        color: '#fff'
                                                    }}
                                                    formatter={(v: any) => activityType === 'emails' ? [v, "Courriels Reçus"] : [`${v}%`, activityType === 'calls' ? "Taux de Réponse" : "Taux de Complétion"]}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey={activityType === 'emails' ? 'communicationsReceived' : 'pct'}
                                                    stroke="#a855f7"
                                                    strokeWidth={2}
                                                    dot={{ r: 3, fill: '#a855f7' }}
                                                    activeDot={{ r: 5 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Table List */}
                            <div className="space-y-1.5">
                                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Historique Détaillé</h4>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="pb-2 text-left">Mois</th>
                                            <th className="pb-2 text-center">{activityType === 'calls' ? "Total Appels" : activityType === 'tasks' ? "Total Tâches" : "Courriels Reçus"}</th>
                                            {activityType !== 'emails' && <th className="pb-2 text-center">{activityType === 'calls' ? "Répondus" : "Complétées"}</th>}
                                            {activityType !== 'emails' && <th className="pb-2 text-center">Taux</th>}
                                            <th className="pb-2 text-center">MoM</th>
                                            {activityType !== 'emails' && <th className="pb-2 text-right pr-2">Barre</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {withMoM.map((r) => {
                                            const total = activityType === 'calls' ? r.totalCalls : activityType === 'tasks' ? ((r.openTasks ?? 0) + (r.closedTasks ?? 0)) : r.communicationsReceived
                                            const answered = activityType === 'calls' ? r.answeredCalls : r.closedTasks

                                            return (
                                                <tr key={r.yearMonth} className="hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-2.5 font-mono text-zinc-300">{formatYearMonth(r.yearMonth)}</td>
                                                    <td className="py-2.5 text-center text-zinc-400">{total}</td>
                                                    {activityType !== 'emails' && <td className="py-2.5 text-center text-zinc-400">{answered}</td>}
                                                    {activityType !== 'emails' && <td className={`py-2.5 text-center font-bold ${pctColor(r.pct)}`}>
                                                        {r.pct !== null ? `${r.pct}%` : 'N/A'}
                                                    </td>}
                                                    <td className="py-2.5 text-center">
                                                        {r.delta === null ? (
                                                            <span className="text-zinc-600">—</span>
                                                        ) : r.delta > 0 ? (
                                                            <span className={`${activityType === 'emails' ? 'text-rose-400' : 'text-emerald-400'} flex items-center justify-center gap-0.5 font-bold`}>
                                                                <TrendingUp className="h-3 w-3" />+{r.delta}{activityType === 'emails' ? '' : '%'}
                                                            </span>
                                                        ) : r.delta < 0 ? (
                                                            <span className={`${activityType === 'emails' ? 'text-emerald-400' : 'text-rose-400'} flex items-center justify-center gap-0.5 font-bold`}>
                                                                <TrendingDown className="h-3 w-3" />{r.delta}{activityType === 'emails' ? '' : '%'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-500 flex items-center justify-center"><Minus className="h-3 w-3" /></span>
                                                        )}
                                                    </td>
                                                    {activityType !== 'emails' && <td className="py-2.5 pr-2">
                                                        <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden ml-auto">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${pctBarColor(r.pct)}`}
                                                                style={{ width: `${r.pct ?? 0}%` }}
                                                            />
                                                        </div>
                                                    </td>}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface CallsStatsPanelProps {
    /** If given, filter to only this manager. Otherwise shows all managers. */
    managerId?: string
    /** Title override */
    title?: string
}

export function CallsStatsPanel({ managerId, title }: CallsStatsPanelProps) {
    const [isPending, startTransition] = useTransition()
    const [currentMonth, setCurrentMonth] = useState(nowYearMonth())
    const [rows, setRows] = useState<CallRow[]>([])

    // Activity & View Modes
    const [activityType, setActivityType] = useState<'calls' | 'tasks' | 'emails'>('calls')
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

    // Custom date range mode
    const [useRange, setUseRange] = useState(false)
    const [fromMonth, setFromMonth] = useState(() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 5)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const [toMonth, setToMonth] = useState(nowYearMonth())

    // History drill-down
    const [historyModal, setHistoryModal] = useState<{ id: string; name: string } | null>(null)

    const load = useCallback(() => {
        startTransition(async () => {
            const opts = useRange
                ? { managerId, fromMonth, toMonth }
                : { managerId, fromMonth: currentMonth, toMonth: currentMonth }

            const data = activityType === 'calls'
                ? await getCallsHistoryAction(opts)
                : await getWorkloadHistoryAction(opts)

            setRows(data as CallRow[])
        })
    }, [managerId, useRange, currentMonth, fromMonth, toMonth, activityType])

    useEffect(() => { load() }, [load])

    // Aggregate for range mode: group by manager, average percentage rate
    const displayRows: (CallRow & { monthCount?: number })[] = useRange
        ? (() => {
            const map: Record<string, { managerId: string; managerName: string; totalVal1: number; totalVal2: number; count: number }> = {}
            rows.forEach(r => {
                if (!map[r.managerId]) {
                    map[r.managerId] = {
                        managerId: r.managerId,
                        managerName: r.managerName,
                        totalVal1: 0,
                        totalVal2: 0,
                        count: 0
                    }
                }
                if (activityType === 'calls') {
                    map[r.managerId].totalVal1 += (r.totalCalls ?? 0)
                    map[r.managerId].totalVal2 += (r.answeredCalls ?? 0)
                } else {
                    map[r.managerId].totalVal1 += ((r.openTasks ?? 0) + (r.closedTasks ?? 0))
                    map[r.managerId].totalVal2 += (r.closedTasks ?? 0)
                }
                map[r.managerId].count++
            })
            return Object.values(map).map(m => {
                const pct = activityType !== 'emails' ? (m.totalVal1 > 0 ? Math.round((m.totalVal2 / m.totalVal1) * 100) : null) : null
                return {
                    managerId: m.managerId,
                    managerName: m.managerName,
                    yearMonth: `${fromMonth} → ${toMonth}`,
                    ...(activityType === 'calls' ? {
                        totalCalls: m.totalVal1,
                        answeredCalls: m.totalVal2,
                    } : activityType === 'tasks' ? {
                        openTasks: m.totalVal1 - m.totalVal2,
                        closedTasks: m.totalVal2,
                    } : {
                        communicationsReceived: m.totalVal1
                    }),
                    pct,
                    monthCount: m.count
                }
            }).sort((a, b) => activityType === 'emails' ? (b.communicationsReceived ?? 0) - (a.communicationsReceived ?? 0) : ((b.pct ?? -1) - (a.pct ?? -1)))
        })()
        : [...rows].sort((a, b) => activityType === 'emails' ? (b.communicationsReceived ?? 0) - (a.communicationsReceived ?? 0) : ((b.pct ?? -1) - (a.pct ?? -1)))

    // Global stats summary values
    let totalAll = 0
    let answeredAll = 0
    if (activityType === 'calls') {
        totalAll = displayRows.reduce((s, r) => s + (r.totalCalls ?? 0), 0)
        answeredAll = displayRows.reduce((s, r) => s + (r.answeredCalls ?? 0), 0)
    } else if (activityType === 'tasks') {
        totalAll = displayRows.reduce((s, r) => s + ((r.openTasks ?? 0) + (r.closedTasks ?? 0)), 0)
        answeredAll = displayRows.reduce((s, r) => s + (r.closedTasks ?? 0), 0)
    } else if (activityType === 'emails') {
        totalAll = displayRows.reduce((s, r) => s + (r.communicationsReceived ?? 0), 0)
    }
    const globalPct = activityType !== 'emails' ? (totalAll > 0 ? Math.round((answeredAll / totalAll) * 100) : null) : null

    return (
        <div className="space-y-4">
            {/* Header / Global Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {activityType === 'calls' ? (
                        <Phone className="h-4 w-4 text-purple-400" />
                    ) : activityType === 'tasks' ? (
                        <CheckSquare className="h-4 w-4 text-purple-400" />
                    ) : (
                        <Mail className="h-4 w-4 text-purple-400" />
                    )}
                    <h3 className="text-sm font-bold text-white">
                        {title ?? (activityType === 'calls' ? "Statistiques d'Appels" : activityType === 'tasks' ? "Taux de Complétion des Tâches" : "Statistiques des Courriels")}
                    </h3>
                    {activityType !== 'emails' && globalPct !== null && (
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${pctBgColor(globalPct)} ${pctColor(globalPct)}`}>
                            {globalPct}% global
                        </span>
                    )}
                    {activityType === 'emails' && (
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full border bg-zinc-900 border-zinc-800 text-purple-400">
                            {totalAll} global
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setUseRange(v => !v)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${useRange ? 'bg-purple-600/20 border-purple-700 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                    >
                        <Calendar className="h-3 w-3" />
                        Période personnalisée
                    </button>
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />}
                </div>
            </div>

            {/* Toggle Rows for Activity Filter and View Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/20 p-2 rounded-xl border border-zinc-850/60">
                {/* Mode Select Tabs */}
                <div className="flex bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-800/80 w-fit">
                    <button
                        onClick={() => setActivityType('calls')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                            activityType === 'calls'
                                ? 'bg-purple-600 text-white shadow-sm font-extrabold'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Phone className="h-3 w-3" />
                        Téléphonie (Appels)
                    </button>
                    <button
                        onClick={() => setActivityType('tasks')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                            activityType === 'tasks'
                                ? 'bg-purple-600 text-white shadow-sm font-extrabold'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <CheckSquare className="h-3 w-3" />
                        Gestion des Tâches
                    </button>
                    <button
                        onClick={() => setActivityType('emails')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                            activityType === 'emails'
                                ? 'bg-purple-600 text-white shadow-sm font-extrabold'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Mail className="h-3 w-3" />
                        Courriels
                    </button>
                </div>

                {/* View Selection: Table / Chart */}
                <div className="flex bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-800/80 w-fit">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                            viewMode === 'table'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/40'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        📋 Tableau
                    </button>
                    <button
                        onClick={() => setViewMode('chart')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                            viewMode === 'chart'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/40'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        📊 Graphique
                    </button>
                </div>
            </div>

            {/* Month Nav or Range Picker */}
            {useRange ? (
                <div className="flex flex-wrap items-end gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                    <div className="space-y-1">
                        <Label className="text-zinc-500 text-[10px]">Du mois</Label>
                        <Input
                            type="month"
                            value={fromMonth}
                            onChange={e => setFromMonth(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 h-8 text-[16px] md:text-xs text-white w-36"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-zinc-500 text-[10px]">Au mois</Label>
                        <Input
                            type="month"
                            value={toMonth}
                            onChange={e => setToMonth(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 h-8 text-[16px] md:text-xs text-white w-36"
                        />
                    </div>
                    <Button
                        onClick={load}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 rounded-lg"
                    >
                        <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                        Appliquer
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentMonth(prevMonth(currentMonth))}
                        className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-white min-w-[140px] text-center">
                        {formatYearMonth(currentMonth)}
                    </span>
                    <button
                        onClick={() => setCurrentMonth(nextMonth(currentMonth))}
                        disabled={currentMonth >= nowYearMonth()}
                        className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(nowYearMonth())}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 px-2 py-1 rounded border border-purple-800/40 bg-purple-950/20 hover:bg-purple-950/40 transition-all"
                    >
                        Aujourd'hui
                    </button>
                </div>
            )}

            {/* Legend */}
            {activityType !== 'emails' && <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />≥ 80%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />55–79%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />{'< 55%'}</span>
            </div>}

            {/* Content: Table OR Chart */}
            {isPending ? (
                <div className="flex items-center justify-center py-10 gap-2 text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    <span className="text-xs">Chargement...</span>
                </div>
            ) : displayRows.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs italic border border-zinc-800 rounded-xl bg-zinc-950/30">
                    Aucune donnée pour cette période.
                </div>
            ) : viewMode === 'chart' ? (
                /* Recharts Bar Chart View */
                <div className="h-[280px] w-full bg-zinc-950/40 border border-zinc-800 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayRows} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                            <XAxis
                                dataKey="managerName"
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                domain={activityType === 'emails' ? ['auto', 'auto'] : [0, 100]}
                                tickFormatter={(v) => activityType === 'emails' ? String(v) : `${v}%`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(39, 39, 42, 0.2)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                    borderColor: '#27272a',
                                    borderRadius: '12px',
                                }}
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload.length) return null
                                    const data = payload[0].payload
                                    const rate = data.pct !== null ? `${data.pct}%` : 'N/A'
                                    return (
                                        <div className="bg-zinc-950 border border-zinc-805 p-3 rounded-lg text-xs space-y-1.5 shadow-2xl">
                                            <p className="font-bold text-white">{data.managerName}</p>
                                            {activityType !== 'emails' && <p className="text-purple-400">
                                                {activityType === 'calls' ? "Taux de Réponse" : "Taux de Complétion"} : <span className="font-extrabold">{rate}</span>
                                            </p>}
                                            {activityType === 'calls' ? (
                                                <p className="text-zinc-400">
                                                    Appels : <span className="text-zinc-200">{data.answeredCalls} répondus / {data.totalCalls} total</span>
                                                </p>
                                            ) : activityType === 'tasks' ? (
                                                <p className="text-zinc-400">
                                                    Tâches : <span className="text-zinc-200">{data.closedTasks} fermées / {((data.openTasks ?? 0) + (data.closedTasks ?? 0))} total</span>
                                                </p>
                                            ) : (
                                                <p className="text-zinc-400">
                                                    Courriels : <span className="text-zinc-200">{data.communicationsReceived} reçus</span>
                                                </p>
                                            )}
                                        </div>
                                    )
                                }}
                            />
                            <Bar dataKey={activityType === 'emails' ? 'communicationsReceived' : 'pct'} radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {displayRows.map((entry, index) => {
                                    const rate = entry.pct ?? 0
                                    const color = activityType === 'emails' ? '#a855f7' : (rate >= 80 ? '#10b981' : rate > 55 ? '#f59e0b' : '#ef4444')
                                    return <Cell key={`cell-${index}`} fill={color} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                /* Table View */
                <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950/20">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-bold tracking-wider bg-zinc-900/40">
                                {!managerId && <th className="p-3">Gestionnaire</th>}
                                {useRange && <th className="p-3 text-center">Mois</th>}
                                <th className="p-3 text-center">
                                    {activityType === 'calls' ? "Total Appels" : activityType === 'tasks' ? "Total Tâches" : "Courriels Reçus"}
                                </th>
                                {activityType !== 'emails' && <th className="p-3 text-center">
                                    {activityType === 'calls' ? "Répondus" : "Complétées"}
                                </th>}
                                {activityType !== 'emails' && <th className="p-3 text-center">Taux</th>}
                                {activityType !== 'emails' && <th className="p-3">Progression</th>}
                                {!managerId && <th className="p-3 text-right">Historique</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {displayRows.map((r) => {
                                const totalVal = activityType === 'calls' ? r.totalCalls : activityType === 'tasks' ? ((r.openTasks ?? 0) + (r.closedTasks ?? 0)) : r.communicationsReceived
                                const answeredVal = activityType === 'calls' ? r.answeredCalls : r.closedTasks

                                return (
                                    <tr key={`${r.managerId}-${r.yearMonth}`} className="hover:bg-zinc-900/20 transition-colors">
                                        {!managerId && (
                                            <td className="p-3 font-semibold text-zinc-200">{r.managerName}</td>
                                        )}
                                        {useRange && (
                                            <td className="p-3 text-center text-zinc-500 text-[10px]">
                                                {r.monthCount} mois
                                            </td>
                                        )}
                                        <td className="p-3 text-center text-zinc-400">{totalVal}</td>
                                        {activityType !== 'emails' && <td className="p-3 text-center text-zinc-400">{answeredVal}</td>}
                                        {activityType !== 'emails' && <td className="p-3 text-center">
                                            <span className={`font-extrabold text-sm ${pctColor(r.pct)}`}>
                                                {r.pct !== null ? `${r.pct}%` : 'N/A'}
                                            </span>
                                        </td>}
                                        {activityType !== 'emails' && <td className="p-3">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${pctBgColor(r.pct)}`} style={{ minWidth: 140 }}>
                                                <div className="h-1.5 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${pctBarColor(r.pct)}`}
                                                        style={{ width: `${r.pct ?? 0}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-bold shrink-0 ${pctColor(r.pct)}`}>
                                                    {r.pct !== null ? `${r.pct}%` : '—'}
                                                </span>
                                            </div>
                                        </td>}
                                        {!managerId && (
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => setHistoryModal({ id: r.managerId, name: r.managerName })}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 hover:text-purple-300 px-2 py-1 rounded border border-purple-800/30 bg-purple-950/10 hover:bg-purple-950/30 transition-all"
                                                >
                                                    <History className="h-3 w-3" />
                                                    Historique
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Manager History Modal */}
            {historyModal && (
                <ManagerHistoryModal
                    managerId={historyModal.id}
                    managerName={historyModal.name}
                    activityType={activityType}
                    open={!!historyModal}
                    onClose={() => setHistoryModal(null)}
                />
            )}
        </div>
    )
}
