'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Mail, Phone, Calendar, TrendingUp, TrendingDown, ArrowRight, Trash2, Network } from 'lucide-react'
import { useState, useMemo } from 'react'
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

const DEPT_LIST = ["Gestion", "Administration", "Comptabilité", "Technique", "Sinistres", "Assurance", "Direction", "Conseil d'Administration"]

const DEPT_COLORS: Record<string, string> = {
    "Gestion": "#0284c7",
    "Administration": "#0d9488",
    "Comptabilité": "#7c3aed",
    "Technique": "#ea580c",
    "Sinistres": "#dc2626",
    "Assurance": "#db2777",
    "Direction": "#475569",
    "Conseil d'Administration": "#f59e0b"
}

export function ClientCommunicationTrends({ stats: initialStats, clientId }: ClientCommunicationTrendsProps) {
    const [stats, setStats] = useState<CommStatRecord[]>(initialStats)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteCommunicationStatsAction(id, clientId)
            if (res.success) {
                toast.success("Rapport d'analyse supprimé.")
                setStats(prev => prev.filter(s => s.id !== id))
            }
        } catch (err: any) {
            toast.error("Erreur lors de la suppression.")
        }
    }

    // Format historical runs for the Line/Area Chart
    const chartData = useMemo(() => {
        return stats.map(s => {
            const dateObj = new Date(s.analysis_date)
            const summary = s.analysis_summary || {}
            const totalUnits = Number(summary.total_units || 90)

            const formatted: any = {
                name: dateObj.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' }),
                date: dateObj.toLocaleDateString('fr-CA'),
                'Total': s.total_communications,
                'Emails': s.total_emails,
                'Appels': s.total_phone_calls,
            }

            // Add department-specific counts/loads if available
            if (summary.deptCounts) {
                DEPT_LIST.forEach(dept => {
                    const count = summary.deptCounts[dept] || 0
                    // We store the load index (comms per door)
                    formatted[dept] = Number((count / totalUnits).toFixed(2))
                })
            }

            return formatted
        })
    }, [stats])

    // Get the latest analysis metrics
    const latestAnalysis = useMemo(() => {
        if (stats.length === 0) return null
        const latest = stats[stats.length - 1]
        const summary = latest.analysis_summary || {}
        const totalUnits = Number(summary.total_units || 90)

        // Calculate contract inclusions load index (comms from depts except Technique & Sinistres)
        let inclusionsVolume = 0
        if (summary.deptCounts) {
            Object.entries(summary.deptCounts).forEach(([dept, val]) => {
                if (dept !== "Sinistres" && dept !== "Technique") {
                    inclusionsVolume += Number(val || 0)
                }
            })
        } else {
            // fallback
            inclusionsVolume = latest.total_communications - latest.total_emails * 0.1 // rough proxy
        }

        const inclusionsLoadRate = Number((inclusionsVolume / totalUnits).toFixed(2))

        return {
            record: latest,
            totalUnits,
            inclusionsVolume,
            inclusionsLoadRate,
            deptCounts: summary.deptCounts || {}
        }
    }, [stats])

    // Calculate trend details based on last two analysis runs
    const trend = useMemo(() => {
        if (stats.length < 2) return null
        
        const last = stats[stats.length - 1]
        const prev = stats[stats.length - 2]
        
        const lastUnits = Number(last.analysis_summary?.total_units || 90)
        const prevUnits = Number(prev.analysis_summary?.total_units || 90)

        // Calculate contract inclusions for both
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
        const pct = prevLoad > 0 
            ? Math.round((change / prevLoad) * 100) 
            : 0

        const isUp = change > 0

        return {
            change,
            pct: Math.abs(pct),
            isUp,
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
                    {/* Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {latestAnalysis && (
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Indice Réel du Forfait (Dernier Run)</span>
                                    <span className="text-2xl font-black text-white mt-1 block">
                                        {latestAnalysis.inclusionsLoadRate}
                                    </span>
                                    <span className="text-[9px] text-zinc-450 block mt-1">
                                        Sur la base de <strong>{latestAnalysis.totalUnits}</strong> portes &middot; {latestAnalysis.inclusionsVolume} comms incluses
                                    </span>
                                </div>
                                <div className="h-8 w-8 rounded-lg bg-indigo-950/40 flex items-center justify-center">
                                    <Network className="h-4 w-4 text-indigo-400" />
                                </div>
                            </Card>
                        )}

                        <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Canaux de communication (Dernier Run)</span>
                                <div className="flex gap-4 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="font-bold text-zinc-200">
                                            {stats[stats.length - 1].total_emails} <span className="font-normal text-zinc-550">emails</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="font-bold text-zinc-200">
                                            {stats[stats.length - 1].total_phone_calls} <span className="font-normal text-zinc-550">appels</span>
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[9px] text-zinc-500 mt-1 block">
                                    Total: {stats[stats.length - 1].total_communications} comms valides
                                </span>
                            </div>
                        </Card>

                        <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 shadow-sm flex items-center justify-between">
                            {trend ? (
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Tendance d'utilisation du forfait</span>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {trend.isUp ? (
                                            <div className="flex items-center gap-1 bg-rose-500/10 text-rose-455 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                                                <TrendingUp className="h-3.5 w-3.5" />
                                                +{trend.pct}%
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                                <TrendingDown className="h-3.5 w-3.5" />
                                                -{trend.pct}%
                                            </div>
                                        )}
                                        <span className="text-[10px] text-zinc-500 font-medium">
                                            ({trend.prevLoad} <ArrowRight className="h-2 w-2 inline" /> {trend.lastLoad})
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-zinc-450 block mt-1">
                                        {trend.isUp ? "Attention: Ce client montre une surcharge forfaitaire." : "Usage stable ou en réduction."}
                                    </span>
                                </div>
                            ) : (
                                <div className="text-zinc-500 italic flex items-center py-2">
                                    Un second run d'analyse est requis pour calculer la tendance.
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Department Load Rate Charts (Visualizes Trends over time) */}
                    {chartData.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Forfaitaire / Hors-Forfait Trend Area Chart */}
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Évolution Chronologique de l'Indice Forfaitaire vs Exclus</CardTitle>
                                </CardHeader>
                                <CardContent className="h-64 pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                            <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '10px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                            <Area type="monotone" dataKey="Total" name="Total Comms" stroke="#818cf8" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="Emails" name="Emails" stroke="#a78bfa" fillOpacity={0} strokeWidth={1.5} />
                                            <Area type="monotone" dataKey="Appels" name="Appels" stroke="#34d399" fillOpacity={0} strokeWidth={1.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Department Index Load Breakdown for Latest Run */}
                            {latestAnalysis && (
                                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indices de charge par service (Dernier Run)</CardTitle>
                                        <CardDescription className="text-xxs text-zinc-500">Moyenne d'interactions par porte.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-64 pt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                layout="vertical"
                                                data={DEPT_LIST.map(dept => ({
                                                    name: dept,
                                                    value: Number(((latestAnalysis.deptCounts[dept] || 0) / latestAnalysis.totalUnits).toFixed(2))
                                                }))}
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
                                    </CardContent>
                                </Card>
                            )}
                        </div>
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
                                            const totalUnits = Number(row.analysis_summary?.total_units || 90)
                                            let inclusionsVolume = 0
                                            if (row.analysis_summary?.deptCounts) {
                                                Object.entries(row.analysis_summary.deptCounts).forEach(([d, v]) => {
                                                    if (d !== "Sinistres" && d !== "Technique") inclusionsVolume += Number(v || 0)
                                                })
                                            } else {
                                                inclusionsVolume = row.total_communications
                                            }
                                            const inclusionsLoadRate = (inclusionsVolume / totalUnits).toFixed(2)

                                            return (
                                                <tr key={row.id} className="hover:bg-zinc-900/30 text-zinc-300">
                                                    <td className="p-3 font-semibold">
                                                        {new Date(row.analysis_date).toLocaleDateString('fr-CA')}
                                                    </td>
                                                    <td className="p-3 text-zinc-400">
                                                        {row.period_start ? new Date(row.period_start).toLocaleDateString('fr-CA') : '?'} au {row.period_end ? new Date(row.period_end).toLocaleDateString('fr-CA') : '?'}
                                                    </td>
                                                    <td className="p-3 font-mono font-medium">{totalUnits} SDC</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">{inclusionsLoadRate}</td>
                                                    <td className="p-3 text-zinc-400 font-mono">
                                                        {row.total_emails} M / {row.total_phone_calls} A
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-indigo-400">{row.total_communications}</td>
                                                    <td className="p-3 text-right">
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
