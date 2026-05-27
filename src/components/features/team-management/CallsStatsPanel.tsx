'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { getCallsHistoryAction } from '@/actions/team-management'
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
    X
} from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

type CallRow = {
    managerId: string
    managerName: string
    yearMonth: string
    totalCalls: number
    answeredCalls: number
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
    open,
    onClose
}: {
    managerId: string
    managerName: string
    open: boolean
    onClose: () => void
}) {
    const [rows, setRows] = useState<CallRow[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        setLoading(true)
        getCallsHistoryAction({ managerId, monthsBack: 24 })
            .then(data => setRows(data as CallRow[]))
            .finally(() => setLoading(false))
    }, [open, managerId])

    // Build MoM deltas (rows are sorted desc)
    const withMoM = rows.map((r, i) => {
        const prev = rows[i + 1]
        let delta: number | null = null
        if (prev && r.pct !== null && prev.pct !== null) {
            delta = r.pct - prev.pct
        }
        return { ...r, delta }
    })

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-2xl w-full bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] flex flex-col p-0 rounded-xl shadow-2xl">
                <DialogHeader className="p-5 border-b border-zinc-900 shrink-0">
                    <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
                        <History className="h-4 w-4 text-purple-400" />
                        Historique d'Appels — {managerName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                            <span className="text-xs">Chargement...</span>
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-center text-xs text-zinc-500 italic py-8">
                            Aucun historique d'appels disponible pour ce gestionnaire.
                        </p>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-bold tracking-wider">
                                    <th className="pb-2 text-left">Mois</th>
                                    <th className="pb-2 text-center">Total</th>
                                    <th className="pb-2 text-center">Répondus</th>
                                    <th className="pb-2 text-center">Taux</th>
                                    <th className="pb-2 text-center">MoM</th>
                                    <th className="pb-2 text-right pr-2">Barre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {withMoM.map((r) => (
                                    <tr key={r.yearMonth} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="py-2.5 font-mono text-zinc-300">{formatYearMonth(r.yearMonth)}</td>
                                        <td className="py-2.5 text-center text-zinc-400">{r.totalCalls}</td>
                                        <td className="py-2.5 text-center text-zinc-400">{r.answeredCalls}</td>
                                        <td className={`py-2.5 text-center font-bold ${pctColor(r.pct)}`}>
                                            {r.pct !== null ? `${r.pct}%` : 'N/A'}
                                        </td>
                                        <td className="py-2.5 text-center">
                                            {r.delta === null ? (
                                                <span className="text-zinc-600">—</span>
                                            ) : r.delta > 0 ? (
                                                <span className="text-emerald-400 flex items-center justify-center gap-0.5 font-bold">
                                                    <TrendingUp className="h-3 w-3" />+{r.delta}%
                                                </span>
                                            ) : r.delta < 0 ? (
                                                <span className="text-rose-400 flex items-center justify-center gap-0.5 font-bold">
                                                    <TrendingDown className="h-3 w-3" />{r.delta}%
                                                </span>
                                            ) : (
                                                <span className="text-zinc-500 flex items-center justify-center"><Minus className="h-3 w-3" /></span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-2">
                                            <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden ml-auto">
                                                <div
                                                    className={`h-full rounded-full transition-all ${pctBarColor(r.pct)}`}
                                                    style={{ width: `${r.pct ?? 0}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
            const data = await getCallsHistoryAction(opts)
            setRows(data as CallRow[])
        })
    }, [managerId, useRange, currentMonth, fromMonth, toMonth])

    useEffect(() => { load() }, [load])

    // Aggregate for range mode: group by manager, avg pct
    const displayRows: (CallRow & { monthCount?: number })[] = useRange
        ? (() => {
            const map: Record<string, { managerId: string; managerName: string; totalCalls: number; answeredCalls: number; count: number }> = {}
            rows.forEach(r => {
                if (!map[r.managerId]) map[r.managerId] = { managerId: r.managerId, managerName: r.managerName, totalCalls: 0, answeredCalls: 0, count: 0 }
                map[r.managerId].totalCalls += r.totalCalls
                map[r.managerId].answeredCalls += r.answeredCalls
                map[r.managerId].count++
            })
            return Object.values(map).map(m => ({
                ...m,
                yearMonth: `${fromMonth} → ${toMonth}`,
                pct: m.totalCalls > 0 ? Math.round((m.answeredCalls / m.totalCalls) * 100) : null,
                monthCount: m.count
            })).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
        })()
        : rows.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

    // Global aggregate
    const totalAll = displayRows.reduce((s, r) => s + r.totalCalls, 0)
    const answeredAll = displayRows.reduce((s, r) => s + r.answeredCalls, 0)
    const globalPct = totalAll > 0 ? Math.round((answeredAll / totalAll) * 100) : null

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">
                        {title ?? 'Statistiques d\'Appels'}
                    </h3>
                    {globalPct !== null && (
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${pctBgColor(globalPct)} ${pctColor(globalPct)}`}>
                            {globalPct}% global
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
            <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />≥ 80%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />55–79%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />{'< 55%'}</span>
            </div>

            {/* Table */}
            {isPending ? (
                <div className="flex items-center justify-center py-10 gap-2 text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    <span className="text-xs">Chargement...</span>
                </div>
            ) : displayRows.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs italic border border-zinc-800 rounded-xl bg-zinc-950/30">
                    Aucune donnée d'appels pour cette période.
                </div>
            ) : (
                <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950/20">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-bold tracking-wider bg-zinc-900/40">
                                {!managerId && <th className="p-3">Gestionnaire</th>}
                                {useRange && <th className="p-3 text-center">Mois</th>}
                                <th className="p-3 text-center">Total Appels</th>
                                <th className="p-3 text-center">Répondus</th>
                                <th className="p-3 text-center">Taux</th>
                                <th className="p-3">Progression</th>
                                {!managerId && <th className="p-3 text-right">Historique</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {displayRows.map((r) => (
                                <tr key={`${r.managerId}-${r.yearMonth}`} className="hover:bg-zinc-900/20 transition-colors">
                                    {!managerId && (
                                        <td className="p-3 font-semibold text-zinc-200">{r.managerName}</td>
                                    )}
                                    {useRange && (
                                        <td className="p-3 text-center text-zinc-500 text-[10px]">
                                            {(r as any).monthCount} mois
                                        </td>
                                    )}
                                    <td className="p-3 text-center text-zinc-400">{r.totalCalls}</td>
                                    <td className="p-3 text-center text-zinc-400">{r.answeredCalls}</td>
                                    <td className="p-3 text-center">
                                        <span className={`font-extrabold text-sm ${pctColor(r.pct)}`}>
                                            {r.pct !== null ? `${r.pct}%` : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-3">
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
                                    </td>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Manager History Modal */}
            {historyModal && (
                <ManagerHistoryModal
                    managerId={historyModal.id}
                    managerName={historyModal.name}
                    open={!!historyModal}
                    onClose={() => setHistoryModal(null)}
                />
            )}
        </div>
    )
}
