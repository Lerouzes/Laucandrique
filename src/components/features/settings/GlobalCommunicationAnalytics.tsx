// @ts-nocheck
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    Info, 
    Search, 
    Users, 
    TrendingUp, 
    TrendingDown, 
    Activity, 
    AlertTriangle,
    ShieldAlert,
    Calendar,
    ArrowRight,
    Download,
    Loader2
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
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
    ReferenceLine,
    ScatterChart,
    Scatter,
    ZAxis
} from 'recharts'
import Link from 'next/link'

interface GlobalCommunicationAnalyticsProps {
    stats: any[]
    teams: any[]
    targetIndex?: number
}

export function GlobalCommunicationAnalytics({
    stats = [],
    teams = [],
    targetIndex = 2.50
}: GlobalCommunicationAnalyticsProps) {
    const [filterTeamId, setFilterTeamId] = useState<string>('all')
    const [startPeriod, setStartPeriod] = useState<string>('')
    const [endPeriod, setEndPeriod] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [isExporting, setIsExporting] = useState(false)

    const handleExportPDF = async () => {
        setIsExporting(true)
        try {
            const html2canvas = (await import('html2canvas')).default
            const { jsPDF } = await import('jspdf')
            
            const element = document.getElementById('global-analytics-content')
            if (!element) {
                alert('Contenu à exporter introuvable')
                return
            }

            const canvas = await html2canvas(element, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: '#0c0d12',
                windowWidth: 1400
            })

            const imgData = canvas.toDataURL('image/png')
            const imgWidth = 210
            const pageHeight = 297
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            
            const pdf = new jsPDF('p', 'mm', 'a4')
            let heightLeft = imgHeight
            let position = 0
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight
            
            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }
            
            pdf.save(`analyse_globale_communications_${startPeriod}_to_${endPeriod}.pdf`)
        } catch (error) {
            console.error('PDF export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    // 1. Filter stats to only keep the latest run per client_id
    const latestClientRuns = useMemo(() => {
        const latestMap = new Map<string, any>()
        stats.forEach(run => {
            const existing = latestMap.get(run.client_id)
            if (!existing || new Date(run.analysis_date) > new Date(existing.analysis_date)) {
                latestMap.set(run.client_id, run)
            }
        })
        return Array.from(latestMap.values())
    }, [stats])

    // 2. Extract all distinct chronological monthly periods
    const allPeriods = useMemo(() => {
        const periods = new Set<string>()
        latestClientRuns.forEach(run => {
            const timeline = run.analysis_summary?.timelineList || []
            timeline.forEach((t: any) => {
                if (t.period) periods.add(t.period)
            })
        })
        return Array.from(periods).sort()
    }, [latestClientRuns])

    // 3. Set default date ranges on load
    useEffect(() => {
        if (allPeriods.length > 0) {
            if (!startPeriod) setStartPeriod(allPeriods[0])
            if (!endPeriod) setEndPeriod(allPeriods[allPeriods.length - 1])
        }
    }, [allPeriods, startPeriod, endPeriod])

    const formatMonthLabel = (p: string) => {
        if (!p) return ''
        try {
            const [y, m] = p.split('-')
            const date = new Date(Number(y), Number(m) - 1, 1)
            return date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })
        } catch (_) {
            return p
        }
    }

    // 4. Calculate dynamic stats per client based on selected range and team
    const processedClients = useMemo(() => {
        if (!startPeriod || !endPeriod) return []

        return latestClientRuns.map(run => {
            const client = run.clients || {}
            const manager = client.managers || {}
            const team = manager.manager_teams || {}

            // Skip inactive clients
            if (client.status === 'inactive') return null
            
            // Team Filter
            if (filterTeamId !== 'all') {
                if (team.id !== filterTeamId) return null
            }

            const timelineList = run.analysis_summary?.timelineList || []
            
            // Filter timeline within date range
            const activeTimeline = timelineList.filter((t: any) => 
                t.period >= startPeriod && t.period <= endPeriod
            )

            if (activeTimeline.length === 0) return null

            let inclusions = 0
            let exclusions = 0
            activeTimeline.forEach((t: any) => {
                inclusions += Number(t.contractVolume || 0)
                exclusions += Number(t.outOfContractVolume || 0)
            })

            const totalComms = inclusions + exclusions
            const monthsCount = activeTimeline.length
            const doors = Number(client.doors?.length || run.analysis_summary?.total_units || 90)
            
            const ratio = Number((inclusions / Math.max(1, doors * monthsCount)).toFixed(2))

            return {
                id: client.id,
                name: client.company_name || 'Syndicat sans nom',
                code: client.full_name,
                managerName: manager.first_name && manager.last_name ? `${manager.first_name} ${manager.last_name}` : 'Non assigné',
                teamName: team.name || 'Sans équipe',
                teamId: team.id || 'none',
                doors,
                totalComms,
                inclusions,
                exclusions,
                ratio,
                monthsCount,
                activePeriods: activeTimeline.map((t: any) => t.period),
                runDate: run.analysis_date
            }
        }).filter(Boolean) as any[]
    }, [latestClientRuns, filterTeamId, startPeriod, endPeriod])

    // 5. Apply search query
    const searchedClients = useMemo(() => {
        if (!searchQuery) return processedClients
        const query = searchQuery.toLowerCase().trim()
        return processedClients.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.code.toLowerCase().includes(query) ||
            c.managerName.toLowerCase().includes(query)
        )
    }, [processedClients, searchQuery])

    // 6. Calculate Aggregated KPIs
    const kpis = useMemo(() => {
        const totalClients = processedClients.length
        if (totalClients === 0) {
            return {
                avgRatio: 0,
                totalComms: 0,
                surchargePct: 0,
                topOutlier: null
            }
        }

        const sumRatio = processedClients.reduce((acc, curr) => acc + curr.ratio, 0)
        const avgRatio = Number((sumRatio / totalClients).toFixed(2))

        const totalComms = processedClients.reduce((acc, curr) => acc + curr.totalComms, 0)

        const surchargeCount = processedClients.filter(c => c.ratio > targetIndex).length
        const surchargePct = Math.round((surchargeCount / totalClients) * 100)

        const sortedByRatio = [...processedClients].sort((a, b) => b.ratio - a.ratio)
        const topOutlier = sortedByRatio[0] || null

        return {
            avgRatio,
            totalComms,
            surchargePct,
            topOutlier
        }
    }, [processedClients, targetIndex])

    // 7. Get Load Rating Styling
    const getLoadStyle = (rate: number) => {
        const moderateLimit = targetIndex * 1.2
        const criticalLimit = targetIndex * 1.8
        
        if (rate > criticalLimit) {
            return {
                label: 'Surcharge Critique',
                color: '#ef4444', // Red
                bg: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
                border: 'border-rose-900/40'
            }
        } else if (rate > moderateLimit) {
            return {
                label: 'Surcharge Modérée',
                color: '#f97316', // Orange
                bg: 'bg-amber-950/40 text-amber-450 border-amber-800/40',
                border: 'border-amber-900/40'
            }
        } else {
            return {
                label: 'Usage Stable',
                color: '#10b981', // Green
                bg: 'bg-emerald-950/40 text-emerald-450 border-emerald-800/40',
                border: 'border-emerald-900/40'
            }
        }
    }

    // 8. Scatter Plot Data (Outlier Matrix)
    const scatterData = useMemo(() => {
        return processedClients.map(c => ({
            name: c.name,
            code: c.code,
            doors: c.doors,
            ratio: c.ratio,
            totalComms: c.totalComms,
            monthsCount: c.monthsCount,
            manager: c.managerName
        }))
    }, [processedClients])

    // 9. Top Outliers Bar Chart (Top 10)
    const topOutliersData = useMemo(() => {
        return [...processedClients]
            .sort((a, b) => b.ratio - a.ratio)
            .slice(0, 10)
            .map(c => ({
                name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
                full_name: c.name,
                value: c.ratio
            }))
    }, [processedClients])

    // 10. Team Average Comparison
    const teamAveragesData = useMemo(() => {
        const teamMap: Record<string, { sum: number; count: number; name: string }> = {}
        processedClients.forEach(c => {
            const tId = c.teamId
            if (!teamMap[tId]) {
                teamMap[tId] = { sum: 0, count: 0, name: c.teamName }
            }
            teamMap[tId].sum += c.ratio
            teamMap[tId].count++
        })

        return Object.entries(teamMap)
            .map(([id, t]) => ({
                name: t.name,
                value: Number((t.sum / Math.max(1, t.count)).toFixed(2))
            }))
            .sort((a, b) => b.value - a.value)
    }, [processedClients])

    // 11. Timeline Tendency Line Chart (Average Index Month-by-Month)
    const timelineTrendData = useMemo(() => {
        if (!startPeriod || !endPeriod) return []

        const periodsInRange = allPeriods.filter(p => p >= startPeriod && p <= endPeriod)
        
        return periodsInRange.map(period => {
            let sumRatio = 0
            let count = 0

            latestClientRuns.forEach(run => {
                const client = run.clients || {}
                const manager = client.managers || {}
                const team = manager.manager_teams || {}

                if (client.status === 'inactive') return
                if (filterTeamId !== 'all' && team.id !== filterTeamId) return

                const timelineList = run.analysis_summary?.timelineList || []
                const match = timelineList.find((t: any) => t.period === period)

                if (match) {
                    const doors = Number(client.doors?.length || run.analysis_summary?.total_units || 90)
                    const ratio = match.contractVolume / Math.max(1, doors)
                    sumRatio += ratio
                    count++
                }
            })

            let label = period
            try {
                const [y, m] = period.split('-')
                const date = new Date(Number(y), Number(m) - 1, 1)
                label = date.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' })
            } catch (_) {}

            return {
                name: label,
                period,
                'Index Moyen': Number((sumRatio / Math.max(1, count)).toFixed(2))
            }
        })
    }, [latestClientRuns, filterTeamId, startPeriod, endPeriod, allPeriods])

    return (
        <div className="space-y-6 text-xs w-full max-w-full">
            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-[#0d0e12]/80 p-4 border border-zinc-850 rounded-xl shadow-lg backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Team Filter */}
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Équipe :</span>
                        <select
                            value={filterTeamId}
                            onChange={(e) => setFilterTeamId(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                        >
                            <option value="all">Toutes les équipes</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range selectors */}
                    {allPeriods.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Période De :</span>
                            <select
                                value={startPeriod}
                                onChange={(e) => setStartPeriod(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                            >
                                {allPeriods.map(p => (
                                    <option key={p} value={p}>{formatMonthLabel(p)}</option>
                                ))}
                            </select>

                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">À :</span>
                            <select
                                value={endPeriod}
                                onChange={(e) => setEndPeriod(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                            >
                                {allPeriods.map(p => (
                                    <option key={p} value={p} disabled={p < startPeriod}>{formatMonthLabel(p)}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* SDC Search & PDF Export */}
                <div className="flex items-center gap-2 w-full xl:max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            type="search"
                            placeholder="Rechercher syndicat ou manager..."
                            className="w-full bg-zinc-950 border-zinc-800 text-zinc-150 pl-9 placeholder:text-zinc-550 focus-visible:ring-indigo-650/30 text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={handleExportPDF} 
                        disabled={isExporting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-3 text-xs flex items-center gap-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-lg shadow-indigo-600/10 animate-fade-in"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Export...</span>
                            </>
                        ) : (
                            <>
                                <Download className="h-3.5 w-3.5" />
                                <span>Exporter PDF</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {processedClients.length === 0 ? (
                <Card className="bg-[#0c0d12] border border-zinc-850 py-16 flex flex-col items-center justify-center text-center rounded-2xl shadow-xl">
                    <Info className="h-10 w-10 text-zinc-600 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-zinc-355">Aucune statistique disponible pour les filtres sélectionnés</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                        Sélectionnez un autre intervalle ou importez des données de communication.
                    </p>
                </Card>
            ) : (
                <div id="global-analytics-content" className="space-y-6 bg-[#0c0d12] p-2 rounded-xl">
                    {/* KPI Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* KPI 1: Average Workload Ratio */}
                        <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                            <CardContent className="p-6">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Moyenne de Charge</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-4xl font-black text-indigo-400 tracking-tight font-mono">
                                        {kpis.avgRatio.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-zinc-500 font-medium">interactions / porte / mois</span>
                                </div>
                                <div className="mt-3 flex items-center gap-1 text-[10px]">
                                    <Badge className={`px-2 py-0.5 rounded-full ${getLoadStyle(kpis.avgRatio).bg}`}>
                                        {getLoadStyle(kpis.avgRatio).label}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* KPI 2: Total Volume */}
                        <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                            <CardContent className="p-6">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Volume global analysé</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-4xl font-black text-zinc-150 tracking-tight font-mono">
                                        {kpis.totalComms}
                                    </span>
                                    <span className="text-xs text-zinc-500 font-medium">communications</span>
                                </div>
                                <div className="mt-3.5 text-[10px] text-zinc-500 font-medium font-mono">
                                    Couvrant {processedClients.length} syndicat{processedClients.length > 1 ? 's' : ''} actif{processedClients.length > 1 ? 's' : ''}
                                </div>
                            </CardContent>
                        </Card>

                        {/* KPI 3: Surcharge Pct */}
                        <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                            <CardContent className="p-6">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Taux de Surcharge (CA)</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className={`text-4xl font-black tracking-tight font-mono ${kpis.surchargePct > 30 ? 'text-rose-455 text-rose-400' : 'text-emerald-400'}`}>
                                        {kpis.surchargePct}%
                                    </span>
                                    <span className="text-xs text-zinc-500 font-medium">excluent la cible de {targetIndex.toFixed(2)}</span>
                                </div>
                                <div className="mt-3.5 text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                                    <AlertTriangle className={`h-3.5 w-3.5 ${kpis.surchargePct > 30 ? 'text-rose-400' : 'text-emerald-400'}`} />
                                    <span>{processedClients.filter(c => c.ratio > targetIndex).length} syndicats surchargés</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* KPI 4: Top Outlier */}
                        <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                            <CardContent className="p-6">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Plus forte surcharge</span>
                                {kpis.topOutlier ? (
                                    <>
                                        <div className="flex items-baseline gap-2 mt-2">
                                            <span className="text-4xl font-black text-rose-455 text-rose-400 tracking-tight font-mono">
                                                {kpis.topOutlier.ratio.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-semibold truncate max-w-[130px] inline-block" title={kpis.topOutlier.name}>
                                                {kpis.topOutlier.name}
                                            </span>
                                        </div>
                                        <div className="mt-3.5 text-[10px] text-zinc-500 truncate" title={`Manager: ${kpis.topOutlier.managerName}`}>
                                            Manager: <strong className="text-zinc-300">{kpis.topOutlier.managerName}</strong>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-zinc-500 italic py-6">Aucune surcharge détectée.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Matrix Scatter Plot & Top Outliers */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Outlier Matrix Scatter Plot */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Matrice des Surcharges (Portes vs Indice)</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Visualisation de la taille du syndicat (Axe X) par rapport à son indice de charge réel (Axe Y). Utile pour isoler rapidement les surcharges.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222530" vertical={false} />
                                        <XAxis 
                                            type="number" 
                                            dataKey="doors" 
                                            name="Portes" 
                                            stroke="#4b5563" 
                                            fontSize={9} 
                                            tickLine={false}
                                            label={{ value: 'Nombre de portes (SDC)', fill: '#4b5563', fontSize: 8, position: 'bottom', offset: 5 }} 
                                        />
                                        <YAxis 
                                            type="number" 
                                            dataKey="ratio" 
                                            name="Indice" 
                                            stroke="#4b5563" 
                                            fontSize={9} 
                                            tickLine={false} 
                                            axisLine={false}
                                            label={{ value: 'Indice / porte / mois', fill: '#4b5563', fontSize: 8, angle: -90, position: 'left', offset: 0 }} 
                                        />
                                        <ZAxis type="number" dataKey="totalComms" range={[60, 450]} name="Communications" />
                                        <Tooltip 
                                            cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }}
                                            contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-[#0c0d12] border border-zinc-800 p-2.5 rounded-lg text-xxs space-y-1 shadow-xl text-zinc-300">
                                                            <div className="font-bold text-white">{data.name} <span className="font-mono text-zinc-500">({data.code})</span></div>
                                                            <div className="text-zinc-400">Manager: <span className="font-semibold text-zinc-300">{data.manager}</span></div>
                                                            <div className="text-indigo-400 font-bold">Indice: {data.ratio.toFixed(2)} / porte / m</div>
                                                            <div className="text-zinc-400">Taille: {data.doors} portes</div>
                                                            <div className="text-zinc-400">Comms: {data.totalComms} ({data.monthsCount} mois)</div>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <ReferenceLine 
                                            y={targetIndex} 
                                            stroke="#f59e0b" 
                                            strokeDasharray="4 4" 
                                            label={{ value: `Cible: ${targetIndex}`, fill: '#f59e0b', fontSize: 8, position: 'top' }} 
                                        />
                                        <Scatter name="Syndicats" data={scatterData}>
                                            {scatterData.map((entry, index) => {
                                                const style = getLoadStyle(entry.ratio)
                                                return <Cell key={`cell-${index}`} fill={style.color} fillOpacity={0.8} />
                                            })}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Top Outliers bar chart */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Top 10 Surcharges</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Syndicats affichant les plus hauts indices de charge.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80 pt-2">
                                {topOutliersData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            layout="vertical"
                                            data={topOutliersData}
                                            margin={{ left: 5, right: 10 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222530" horizontal={false} vertical={true} />
                                            <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={100} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload
                                                        return (
                                                            <div className="bg-[#0c0d12] border border-zinc-800 p-2.5 rounded-lg text-xxs shadow-xl text-zinc-300">
                                                                <div className="font-bold text-white mb-0.5">{data.full_name}</div>
                                                                <div className="text-indigo-400 font-bold">Indice: {data.value.toFixed(2)}</div>
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                }}
                                            />
                                            <ReferenceLine x={targetIndex} stroke="#f59e0b" strokeDasharray="3 3" />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {topOutliersData.map((entry, index) => {
                                                    const style = getLoadStyle(entry.value)
                                                    return <Cell key={`cell-${index}`} fill={style.color} />
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-600 italic">Aucune donnée.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Team Comparison & Trend over time */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Team Comparison Chart */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indices Moyens par Équipe</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Comparaison de la charge de travail moyenne par porte par mois entre les différentes équipes de gestionnaires.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                {teamAveragesData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={teamAveragesData}
                                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222530" vertical={false} />
                                            <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }} />
                                            <ReferenceLine y={targetIndex} stroke="#f59e0b" strokeDasharray="3 3" />
                                            <Bar dataKey="value" name="Indice Moyen" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                                {teamAveragesData.map((entry, index) => {
                                                    const style = getLoadStyle(entry.value)
                                                    return <Cell key={`cell-${index}`} fill={style.color} />
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-600 italic">Aucune donnée par équipe.</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Trend Chart (Volume Tendency) */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tendance de charge temporelle</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Évolution de l'indice de charge moyen global mois par mois sur la période de temps filtrée.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                {timelineTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timelineTrendData}>
                                            <defs>
                                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222530" vertical={false} />
                                            <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }} />
                                            <ReferenceLine y={targetIndex} stroke="#f59e0b" strokeDasharray="3 3" />
                                            <Area type="monotone" dataKey="Index Moyen" stroke="#818cf8" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-600 italic">Aucune donnée temporelle.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* SDC Outlier List / Registry */}
                    <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Registre global des syndicats audités</CardTitle>
                            <CardDescription className="text-xxs text-zinc-500">
                                Liste détaillée de tous les syndicats analysés avec leur indice de charge dynamique calculé sur la période ({startPeriod} à {endPeriod}).
                              </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto text-xxs">
                                <table className="w-full">
                                    <thead className="bg-[#0c0d12] text-zinc-500 border-b border-zinc-850 text-left font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3 font-semibold text-zinc-400">Nom du Syndicat (SDC)</th>
                                            <th className="p-3 font-semibold text-zinc-400">Manager</th>
                                            <th className="p-3 font-semibold text-zinc-400">Équipe</th>
                                            <th className="p-3 font-semibold text-zinc-400">Portes</th>
                                            <th className="p-3 font-semibold text-zinc-400">Communications</th>
                                            <th className="p-3 font-semibold text-zinc-400">Indice de Charge</th>
                                            <th className="p-3 font-semibold text-zinc-400">Statut Charge</th>
                                            <th className="p-3 font-semibold text-zinc-400 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {searchedClients.map((c) => {
                                            const loadStyle = getLoadStyle(c.ratio)
                                            return (
                                                <tr key={c.id} className="hover:bg-zinc-900/10 text-zinc-300">
                                                    <td className="p-3 font-bold text-zinc-200">
                                                        {c.name} <span className="text-[10px] text-zinc-550 font-mono font-normal">({c.code})</span>
                                                    </td>
                                                    <td className="p-3 text-zinc-400">{c.managerName}</td>
                                                    <td className="p-3 text-zinc-400">{c.teamName}</td>
                                                    <td className="p-3 font-mono text-zinc-400">{c.doors} SDC</td>
                                                    <td className="p-3 font-mono text-zinc-400">
                                                        {c.totalComms} ({c.monthsCount} mois)
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-indigo-400">{c.ratio.toFixed(2)}</td>
                                                    <td className="p-3">
                                                        <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${loadStyle.bg}`}>
                                                            {loadStyle.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Link 
                                                            href={`/global-settings/clients/${c.id}?tab=communications`}
                                                            className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline inline-flex items-center gap-0.5"
                                                        >
                                                            Inspecter <ArrowRight className="h-3 w-3" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
