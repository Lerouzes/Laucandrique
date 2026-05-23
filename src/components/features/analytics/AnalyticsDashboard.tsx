'use client'

import { useState, useMemo } from 'react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    TrendingUp,
    CheckCircle2,
    XCircle,
    Calendar,
    Users,
    Briefcase,
    DollarSign,
    Target,
    Layers,
    UserCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'

// Premium Harmonious Palettes
const COLORS = {
    cyan: '#06b6d4',
    emerald: '#10b981',
    indigo: '#6366f1',
    amber: '#f59e0b',
    rose: '#f43f5e',
    violet: '#8b5cf6',
}

const PIE_COLORS = [COLORS.indigo, COLORS.cyan, COLORS.emerald, COLORS.amber, COLORS.violet, COLORS.rose]

export function AnalyticsDashboard({
    initialQuotes,
    initialProjects,
    settings,
    allTeams = [],
    allManagers = [],
    initialBills = []
}: {
    initialQuotes: any[]
    initialProjects: any[]
    settings: any
    allTeams?: any[]
    allManagers?: any[]
    initialBills?: any[]
}) {
    // 1. Time Period presets and custom state
    const [period, setPeriod] = useState<'all' | 'this_year' | 'last_90_days' | 'next_90_days' | 'custom'>('this_year')
    const [customStart, setCustomStart] = useState<string>('')
    const [customEnd, setCustomEnd] = useState<string>('')

    // 2. Multiselect / Segmentation States
    const [selectedManagers, setSelectedManagers] = useState<string[]>([])
    const [selectedTeams, setSelectedTeams] = useState<string[]>([])
    const [selectedContractors, setSelectedContractors] = useState<string[]>([])

    // 3. Tab State for active visualization view
    const [activeTab, setActiveTab] = useState<'revenues' | 'managers' | 'teams' | 'contractors'>('revenues')

    // 4. Pipeline mode (approved vs all pending+approved)
    const [pipelineMode, setPipelineMode] = useState<'approved' | 'all'>('approved')

    // List of all unique managers, teams, and contractors in the system for filter dropdowns
    const availableManagers = useMemo(() => {
        if (allManagers && allManagers.length > 0) {
            return allManagers.map((m: any) => ({
                id: m.id,
                label: `${m.first_name} ${m.last_name}`
            }))
        }
        const map = new Map<string, string>()
        initialQuotes.forEach((q: any) => {
            if (q.manager_id && q.managers) {
                map.set(q.manager_id, `${q.managers.first_name} ${q.managers.last_name}`)
            }
        })
        return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
    }, [initialQuotes, allManagers])

    const availableTeams = useMemo(() => {
        if (allTeams && allTeams.length > 0) {
            return allTeams.map((t: any) => t.name)
        }
        const set = new Set<string>()
        initialQuotes.forEach((q: any) => {
            const team = q.managers?.manager_teams?.name
            if (team) set.add(team)
        })
        return Array.from(set)
    }, [initialQuotes, allTeams])

    const availableContractors = useMemo(() => {
        const set = new Set<string>()
        initialProjects.forEach((p: any) => {
            const name = p.contractors?.full_name || p.quotes?.contractors?.full_name
            if (name) set.add(name)
        })
        initialQuotes.forEach((q: any) => {
            const name = q.contractors?.full_name
            if (name) set.add(name)
        })
        return Array.from(set).filter(Boolean)
    }, [initialProjects, initialQuotes])

    // Date Range calculation based on period selection
    const dateRange = useMemo(() => {
        const now = new Date()
        if (period === 'this_year') {
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
            }
        }
        if (period === 'last_90_days') {
            const start = new Date()
            start.setDate(now.getDate() - 90)
            return { start, end: now }
        }
        if (period === 'next_90_days') {
            const end = new Date()
            end.setDate(now.getDate() + 90)
            return { start: now, end }
        }
        if (period === 'custom' && customStart && customEnd) {
            return {
                start: new Date(customStart),
                end: new Date(`${customEnd}T23:59:59.999`)
            }
        }
        return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31) }
    }, [period, customStart, customEnd])

    // Helper: Determine a quote's projected/realized target date based on scheduling or approval
    const getQuoteTargetDate = (q: any) => {
        const project = q.projects?.[0]
        if (project?.start_date) {
            return new Date(project.start_date)
        }
        if (q.approved_at) {
            return new Date(q.approved_at)
        }
        return new Date(q.created_at)
    }

    // Dynamic Filtered Data Sets based on ALL selected states
    const filteredQuotes = useMemo(() => {
        return initialQuotes.filter((q: any) => {
            const d = getQuoteTargetDate(q)
            const dateMatch = d >= dateRange.start && d <= dateRange.end

            const managerId = q.manager_id || 'none'
            const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(managerId)

            const teamName = q.managers?.manager_teams?.name || ''
            const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(teamName)

            const contractorName = q.contractors?.full_name || 'Sans contracteur'
            const contractorMatch = selectedContractors.length === 0 || selectedContractors.includes(contractorName)

            return dateMatch && managerMatch && teamMatch && contractorMatch
        })
    }, [initialQuotes, dateRange, selectedManagers, selectedTeams, selectedContractors])

    const filteredProjects = useMemo(() => {
        return initialProjects.filter((p: any) => {
            const d = p.start_date ? new Date(p.start_date) : (p.quotes?.approved_at ? new Date(p.quotes.approved_at) : null)
            if (!d) return false
            const dateMatch = d >= dateRange.start && d <= dateRange.end

            const managerId = p.quotes?.manager_id || 'none'
            const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(managerId)

            const teamName = p.quotes?.managers?.manager_teams?.name || ''
            const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(teamName)

            const contractorName = p.contractors?.full_name || p.quotes?.contractors?.full_name || 'Sans contracteur'
            const contractorMatch = selectedContractors.length === 0 || selectedContractors.includes(contractorName)

            return dateMatch && managerMatch && teamMatch && contractorMatch
        })
    }, [initialProjects, dateRange, selectedManagers, selectedTeams, selectedContractors])

    // --- METRIC CALCULATIONS ---
    const approvedQuotes = useMemo(() => filteredQuotes.filter((q: any) => q.status === 'approved' || q.status === 'completed' || q.status === 'billed'), [filteredQuotes])
    const completedProjects = useMemo(() => filteredProjects.filter((p: any) => p.status === 'completed'), [filteredProjects])
    const deniedQuotes = useMemo(() => filteredQuotes.filter((q: any) => q.status === 'denied'), [filteredQuotes])
    const sentQuotes = useMemo(() => filteredQuotes.filter((q: any) => q.status === 'sent'), [filteredQuotes])

    const filteredBills = useMemo(() => {
        return (initialBills || []).filter((b: any) => {
            const d = new Date(b.bill_date)
            const dateMatch = d >= dateRange.start && d <= dateRange.end

            const managerId = b.quotes?.manager_id || 'none'
            const teamName = b.quotes?.managers?.manager_teams?.name || ''
            const contractorName = b.contractors?.full_name || ''

            const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(managerId)
            const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(teamName)
            const contractorMatch = selectedContractors.length === 0 || selectedContractors.includes(contractorName)

            return dateMatch && managerMatch && teamMatch && contractorMatch
        })
    }, [initialBills, dateRange, selectedManagers, selectedTeams, selectedContractors])

    const totalSentRevenue = useMemo(() => {
        return sentQuotes.reduce((acc, q) => acc + (q.total || 0), 0)
    }, [sentQuotes])

    const totalProjectedRevenue = useMemo(() => {
        const approvedSum = approvedQuotes.reduce((acc, q) => acc + (q.total || 0), 0)
        if (pipelineMode === 'all') {
            return approvedSum + totalSentRevenue
        }
        return approvedSum
    }, [approvedQuotes, totalSentRevenue, pipelineMode])

    const totalRealizedRevenue = useMemo(() => {
        return filteredBills.reduce((acc, b) => acc + Number(b.total || 0), 0)
    }, [filteredBills])

    const totalBilledWork = useMemo(() => filteredBills.reduce((sum, b) => sum + Number(b.subtotal || 0), 0), [filteredBills])
    const totalAdminAmount = useMemo(() => filteredBills.reduce((sum, b) => sum + Number(b.admin_amount || 0), 0), [filteredBills])
    const totalProfitAmount = useMemo(() => filteredBills.reduce((sum, b) => sum + Number(b.profit_amount || 0), 0), [filteredBills])
    const totalSubtotal = useMemo(() => totalBilledWork + totalAdminAmount + totalProfitAmount, [totalBilledWork, totalAdminAmount, totalProfitAmount])
    const totalGstAmount = useMemo(() => filteredBills.reduce((sum, b) => sum + Number(b.gst_amount || 0), 0), [filteredBills])
    const totalQstAmount = useMemo(() => filteredBills.reduce((sum, b) => sum + Number(b.qst_amount || 0), 0), [filteredBills])

    const totalDeniedValue = useMemo(() => {
        return deniedQuotes.reduce((acc, q) => acc + (q.total || 0), 0)
    }, [deniedQuotes])

    const winRate = useMemo(() => {
        const totalPresented = approvedQuotes.length + deniedQuotes.length + sentQuotes.length
        return totalPresented > 0 ? (approvedQuotes.length / totalPresented) * 100 : 0
    }, [approvedQuotes, deniedQuotes, sentQuotes])

    const averageDealSize = useMemo(() => {
        const count = pipelineMode === 'all' ? (approvedQuotes.length + sentQuotes.length) : approvedQuotes.length
        return count > 0 ? totalProjectedRevenue / count : 0
    }, [approvedQuotes, sentQuotes, totalProjectedRevenue, pipelineMode])

    // --- CHART DATA GENERATION ---

    // 1. Monthly revenue trend (Projected vs. Realized)
    const monthlyRevenueData = useMemo(() => {
        const trendMap: Record<string, { month: string, projected: number, realized: number, sortKey: string }> = {}

        // Populate months in range
        const startYear = dateRange.start.getFullYear()
        const startMonth = dateRange.start.getMonth()
        const endYear = dateRange.end.getFullYear()
        const endMonth = dateRange.end.getMonth()

        let currY = startYear
        let currM = startMonth
        while (currY < endYear || (currY === endYear && currM <= endMonth)) {
            const dummy = new Date(currY, currM, 1)
            const label = dummy.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' })
            const key = `${currY}-${String(currM + 1).padStart(2, '0')}`
            trendMap[key] = { month: label, projected: 0, realized: 0, sortKey: key }
            currM++
            if (currM > 11) {
                currM = 0
                currY++
            }
        }

        // Add projected from approved quotes (and sent quotes if pipelineMode is 'all')
        const targetQuotes = pipelineMode === 'all' ? [...approvedQuotes, ...sentQuotes] : approvedQuotes
        targetQuotes.forEach((q) => {
            const d = getQuoteTargetDate(q)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (trendMap[key]) {
                trendMap[key].projected += q.total || 0
            }
        })

        // Add realized from bills
        filteredBills.forEach((b) => {
            const d = new Date(b.bill_date)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (trendMap[key]) {
                trendMap[key].realized += Number(b.total || 0)
            }
        })

        return Object.values(trendMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    }, [dateRange, approvedQuotes, sentQuotes, completedProjects, pipelineMode])

    // 2. Status breakdown (Pie Chart)
    const statusData = useMemo(() => {
        const statuses = [
            { name: 'Brouillons', value: filteredQuotes.filter((q: any) => q.status === 'draft').length, color: COLORS.indigo },
            { name: 'Envoyées', value: sentQuotes.length, color: COLORS.amber },
            { name: 'Approuvées', value: approvedQuotes.length, color: COLORS.cyan },
            { name: 'Refusées', value: deniedQuotes.length, color: COLORS.rose },
        ]
        return statuses.filter(s => s.value > 0)
    }, [filteredQuotes, sentQuotes, approvedQuotes, deniedQuotes])

    // 3. Manager Performance Segmentation
    const managerSegmentation = useMemo(() => {
        const stats: Record<string, { name: string, total: number, approved: number, denied: number, revenue: number, presented: number }> = {}

        filteredQuotes.forEach((q: any) => {
            const name = q.managers ? `${q.managers.first_name} ${q.managers.last_name}` : 'Sans gestionnaire'
            if (!stats[name]) {
                stats[name] = { name, total: 0, approved: 0, denied: 0, revenue: 0, presented: 0 }
            }
            stats[name].total += 1
            const isApproved = q.status === 'approved' || q.status === 'completed' || q.status === 'billed'
            const isSent = q.status === 'sent'
            const isDenied = q.status === 'denied'
            const countsAsRevenue = isApproved || (pipelineMode === 'all' && isSent)

            if (isApproved || isSent || isDenied) {
                stats[name].presented += 1
            }

            if (isApproved) {
                stats[name].approved += 1
            } else if (isDenied) {
                stats[name].denied += 1
            }

            if (countsAsRevenue) {
                stats[name].revenue += q.total || 0
            }
        })

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue)
    }, [filteredQuotes, pipelineMode])

    // 4. Team Revenue Segmentation
    const teamSegmentation = useMemo(() => {
        const stats: Record<string, { team: string, value: number }> = {}

        const targetQuotes = pipelineMode === 'all' ? [...approvedQuotes, ...sentQuotes] : approvedQuotes
        targetQuotes.forEach((q: any) => {
            const teamName = q.managers?.manager_teams?.name || 'Sans équipe'
            if (!stats[teamName]) {
                stats[teamName] = { team: teamName, value: 0 }
            }
            stats[teamName].value += q.total || 0
        })

        return Object.values(stats).sort((a, b) => b.value - a.value)
    }, [approvedQuotes, sentQuotes, pipelineMode])

    // 5. Contractor Segmentation
    const contractorSegmentation = useMemo(() => {
        const stats: Record<string, { name: string, jobs: number, revenue: number }> = {}

        filteredBills.forEach((b: any) => {
            const name = b.contractors?.full_name || 'Sans contracteur'
            if (!stats[name]) {
                stats[name] = { name, jobs: 0, revenue: 0 }
            }
            stats[name].jobs += 1
            stats[name].revenue += Number(b.total || 0)
        })

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue)
    }, [filteredBills])

    // --- RESET FILTERS ---
    const resetFilters = () => {
        setPeriod('this_year')
        setSelectedManagers([])
        setSelectedTeams([])
        setSelectedContractors([])
        setPipelineMode('approved')
    }

    const toggleManager = (id: string) => {
        setSelectedManagers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleTeam = (team: string) => {
        setSelectedTeams(prev => prev.includes(team) ? prev.filter(x => x !== team) : [...prev, team])
    }

    const toggleContractor = (name: string) => {
        setSelectedContractors(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
    }

    return (
        <div className="space-y-6">
            {/* Filter controls panel */}
            <Card className="bg-zinc-950/70 border-zinc-800 backdrop-blur-md shadow-2xl p-6 rounded-2xl">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5 text-cyan-500" />
                                Période & Segmentations
                            </h3>
                            <p className="text-xs text-zinc-400">
                                Affinez vos analyses en filtrant par date, visualisation, gestionnaire, équipe et contracteur.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={resetFilters}
                            className="text-xs text-zinc-300 border-zinc-800 hover:bg-zinc-900"
                        >
                            Réinitialiser
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-2 border-t border-zinc-900">
                        {/* Time Presets */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Période</label>
                            <select
                                value={period}
                                onChange={(e: any) => setPeriod(e.target.value)}
                                className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                <option value="this_year">Année en cours</option>
                                <option value="last_90_days">90 derniers jours</option>
                                <option value="next_90_days">90 prochains jours (Prévisions)</option>
                                <option value="all">Historique complet</option>
                                <option value="custom">Plage personnalisée</option>
                            </select>

                            {period === 'custom' && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-100 focus:outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-100 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Visualisation Mode (Pipeline Mode) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Visualisation</label>
                            <select
                                value={pipelineMode}
                                onChange={(e: any) => setPipelineMode(e.target.value as 'approved' | 'all')}
                                className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                <option value="approved">Signé uniquement</option>
                                <option value="all">Pipeline complet (Signé + Envoyé)</option>
                            </select>
                        </div>

                        {/* Managers */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                                <Users className="h-3 w-3 text-cyan-500" /> Gestionnaires
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {availableManagers.map(({ id, label }) => {
                                    const active = selectedManagers.includes(id)
                                    return (
                                        <Badge
                                            key={id}
                                            variant="outline"
                                            onClick={() => toggleManager(id)}
                                            className={`cursor-pointer transition-all border ${
                                                active
                                                    ? 'bg-cyan-950/40 text-cyan-300 border-cyan-700'
                                                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            {label}
                                        </Badge>
                                    )
                                })}
                                {availableManagers.length === 0 && <span className="text-xs text-zinc-500">Aucun gestionnaire</span>}
                            </div>
                        </div>

                        {/* Teams */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                                <Layers className="h-3 w-3 text-cyan-500" /> Équipes
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {availableTeams.map((team) => {
                                    const active = selectedTeams.includes(team)
                                    return (
                                        <Badge
                                            key={team}
                                            variant="outline"
                                            onClick={() => toggleTeam(team)}
                                            className={`cursor-pointer transition-all border ${
                                                active
                                                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-700'
                                                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            {team}
                                        </Badge>
                                    )
                                })}
                                {availableTeams.length === 0 && <span className="text-xs text-zinc-500">Aucune équipe</span>}
                            </div>
                        </div>

                        {/* Contractors */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-cyan-500" /> Contracteurs
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {availableContractors.map((name) => {
                                    const active = selectedContractors.includes(name)
                                    return (
                                        <Badge
                                            key={name}
                                            variant="outline"
                                            onClick={() => toggleContractor(name)}
                                            className={`cursor-pointer transition-all border ${
                                                active
                                                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700'
                                                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            {name}
                                        </Badge>
                                    )
                                })}
                                {availableContractors.length === 0 && <span className="text-xs text-zinc-500">Aucun contracteur</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Premium Interactive Metric Cards Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Projected Revenue */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-cyan-950/50 p-2 border border-cyan-800/30 group-hover:scale-110 transition-transform">
                        <DollarSign className="h-5 w-5 text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        {pipelineMode === 'all' ? 'Pipeline Total (Signé + Envoyé)' : 'Revenu Projeté (Signé)'}
                    </p>
                    <h3 className="mt-3 text-3xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(totalProjectedRevenue).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                        {pipelineMode === 'all'
                            ? `Sur ${approvedQuotes.length} approuvées & ${sentQuotes.length} envoyées`
                            : `Sur ${approvedQuotes.length} soumissions approuvées`
                        }
                    </p>
                </div>

                {/* Realized Revenue */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-emerald-950/50 p-2 border border-emerald-800/30 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Revenu Réalisé</p>
                    <h3 className="mt-3 text-3xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(totalRealizedRevenue).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Sur {filteredBills.length} facture(s) enregistrée(s)
                    </p>
                </div>

                {/* Conversion Win Rate */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-indigo-950/50 p-2 border border-indigo-800/30 group-hover:scale-110 transition-transform">
                        <Target className="h-5 w-5 text-indigo-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Taux d'Approbation</p>
                    <h3 className="mt-3 text-3xl font-extrabold text-zinc-100 tracking-tight">
                        {Math.round(winRate)}%
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                        {approvedQuotes.length} acceptées · {deniedQuotes.length} refusées · {sentQuotes.length} en attente
                    </p>
                </div>

                {/* Average Ticket Size */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-amber-950/50 p-2 border border-amber-800/30 group-hover:scale-110 transition-transform">
                        <UserCheck className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Panier Moyen</p>
                    <h3 className="mt-3 text-3xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(averageDealSize).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500 flex items-center gap-1">
                        {pipelineMode === 'all'
                            ? "Valeur moyenne par soumission (signée ou envoyée)"
                            : "Valeur moyenne par soumission signée"
                        }
                    </p>
                </div>
            </div>

            {/* Interactive Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl w-fit">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('revenues')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === 'revenues' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Tendances Revenus
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('managers')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === 'managers' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Par Gestionnaire
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('teams')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === 'teams' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Par Équipe
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('contractors')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === 'contractors' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Par Contracteur
                </Button>
            </div>

            {/* TAB VIEWS */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Visual Graphic Representation (Takes 2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'revenues' && (
                        <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="text-zinc-100 text-base">Évolution des Revenus Mensuels</CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    {pipelineMode === 'all'
                                        ? "Visualisez le pipeline total (soumissions approuvées + envoyées) par rapport au chiffre d'affaires réel (projets complétés)."
                                        : "Visualisez le chiffre d'affaires projeté (soumissions approuvées) par rapport au chiffre d'affaires réel (projets complétés)."
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="h-[340px] w-full mt-4">
                                    {monthlyRevenueData.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                                            Aucune donnée de revenu sur la période sélectionnée.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={monthlyRevenueData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString('fr-CA')}`} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                        borderColor: '#27272a',
                                                        borderRadius: '12px',
                                                        backdropFilter: 'blur(8px)',
                                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                                                    }}
                                                    formatter={(v: number, name: string) => [
                                                        `$${v.toLocaleString('fr-CA')}`,
                                                        name
                                                    ]}
                                                    labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: '12px' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                                                <Area type="monotone" name={pipelineMode === 'all' ? 'Pipeline (Signé + Envoyé)' : 'Projeté (Signé)'} dataKey="projected" stroke={COLORS.cyan} strokeWidth={2.5} fillOpacity={1} fill="url(#colorProjected)" />
                                                <Area type="monotone" name="Réel (Complété)" dataKey="realized" stroke={COLORS.emerald} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRealized)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'revenues' && (
                        <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                                    Analyse Détaillée des Gains Réalisés (Facturés)
                                </CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    Répartition des montants facturés pour les {filteredBills.length} facture(s) de la période sélectionnée.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pb-0 space-y-6">
                                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                                    <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Montant Chantier (Travail)</p>
                                        <p className="text-lg font-bold text-zinc-200 mt-1">
                                            ${totalBilledWork.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Marge Administration</p>
                                        <p className="text-lg font-bold text-zinc-200 mt-1">
                                            ${totalAdminAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Marge Profit</p>
                                        <p className="text-lg font-bold text-zinc-200 mt-1">
                                            ${totalProfitAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Sous-total (Hors Taxes)</p>
                                        <p className="text-lg font-bold text-emerald-400 mt-1">
                                            ${totalSubtotal.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl col-span-2 md:col-span-1">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Taxes (TPS + TVQ)</p>
                                        <p className="text-sm font-bold text-zinc-200 mt-1">
                                            ${(totalGstAmount + totalQstAmount).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xxs text-zinc-500 mt-0.5">
                                            TPS: ${totalGstAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} <br /> TVQ: ${totalQstAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-emerald-950/20 p-4 border border-emerald-900/40 rounded-xl col-span-2 md:col-span-1">
                                        <p className="text-xxs font-bold text-emerald-400 uppercase tracking-wider">Total Facturé</p>
                                        <p className="text-lg font-extrabold text-zinc-100 mt-1">
                                            ${grandTotalBilled.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes et Commentaires de Facturation</h4>
                                    <div className="max-h-[200px] overflow-y-auto space-y-2.5 pr-1">
                                        {filteredBills.filter(b => b.notes || b.description).map((b) => (
                                            <div key={b.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xxs">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-zinc-300">Facture #{b.bill_number} · Soumission #{b.quotes?.quote_number || 'N/A'}</span>
                                                    <span className="text-zinc-500">{new Date(b.bill_date).toLocaleDateString('fr-CA')}</span>
                                                </div>
                                                <p className="text-zinc-200 font-semibold mb-1">{b.title}</p>
                                                {b.description && <p className="text-zinc-400 italic mb-1">{b.description}</p>}
                                                {b.notes && <p className="text-zinc-300 bg-zinc-950 p-2 rounded-lg">{b.notes}</p>}
                                            </div>
                                        ))}
                                        {filteredBills.filter(b => b.notes || b.description).length === 0 && (
                                            <p className="text-xxs text-zinc-500 italic py-2 text-center bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl">
                                                Aucune note enregistrée pour les factures de cette période.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'managers' && (
                        <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="text-zinc-100 text-base">Performance par Gestionnaire</CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    {pipelineMode === 'all'
                                        ? "Comparatif du pipeline (soumissions signées + envoyées) par chaque gestionnaire sur la période."
                                        : "Comparatif du volume d'affaires signé par chaque gestionnaire sur la période."
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="h-[340px] w-full mt-4">
                                    {managerSegmentation.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                                            Aucune donnée disponible.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={managerSegmentation} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString('fr-CA')}`} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                        borderColor: '#27272a',
                                                        borderRadius: '12px',
                                                        backdropFilter: 'blur(8px)',
                                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                                                    }}
                                                    formatter={(v: number, name: string) => {
                                                        const isRevenue = name === 'Revenu Signé' || name === 'Pipeline (Signé + Envoyé)' || name === 'revenue';
                                                        return [
                                                            isRevenue ? `$${v.toLocaleString('fr-CA')}` : v,
                                                            name
                                                        ];
                                                    }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                                                <Bar name={pipelineMode === 'all' ? 'Pipeline (Signé + Envoyé)' : 'Revenu Signé'} dataKey="revenue" fill={COLORS.indigo} radius={[4, 4, 0, 0]} maxBarSize={45} />
                                                <Bar name="Approuvées" dataKey="approved" fill={COLORS.cyan} radius={[4, 4, 0, 0]} maxBarSize={45} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'teams' && (
                        <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="text-zinc-100 text-base">Répartition par Équipe</CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    {pipelineMode === 'all'
                                        ? "Répartition en volume du pipeline (approuvé + envoyé) par équipe de gestion."
                                        : "Répartition en volume de chiffre d'affaires approuvé par équipe de gestion."
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="h-[340px] w-full mt-4 flex items-center justify-center">
                                    {teamSegmentation.length === 0 ? (
                                        <div className="text-sm text-zinc-500">Aucune donnée disponible.</div>
                                    ) : (
                                        <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                            <div className="h-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={teamSegmentation}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={90}
                                                            paddingAngle={3}
                                                            dataKey="value"
                                                            nameKey="team"
                                                        >
                                                            {teamSegmentation.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                                borderColor: '#27272a',
                                                                borderRadius: '12px',
                                                            }}
                                                            formatter={(v: number) => `$${v.toLocaleString('fr-CA')}`}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="space-y-3">
                                                {teamSegmentation.map((item, index) => (
                                                    <div key={item.team} className="flex items-center gap-3">
                                                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                        <div className="flex-1 flex justify-between text-xs text-zinc-300">
                                                            <span className="font-semibold">{item.team}</span>
                                                            <span>${Math.round(item.value).toLocaleString('fr-CA')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'contractors' && (
                        <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="text-zinc-100 text-base">Revenus générés par Contracteur</CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    Somme des revenus réels (projets complétés) par contracteur sur la période.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                <div className="h-[340px] w-full mt-4">
                                    {contractorSegmentation.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                                            Aucune donnée disponible.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={contractorSegmentation} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1f1f23" />
                                                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString('fr-CA')}`} />
                                                <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                        borderColor: '#27272a',
                                                        borderRadius: '12px',
                                                    }}
                                                    formatter={(v: number, name: string) => [
                                                        `$${v.toLocaleString('fr-CA')}`,
                                                        name
                                                    ]}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                                                <Bar name="Revenu Réalisé" dataKey="revenue" fill={COLORS.amber} radius={[0, 4, 4, 0]} maxBarSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Dynamic Segmentation Lists & Ring Chart (Takes 1 Col) */}
                <div className="space-y-6">
                    {/* Ring Status Distribution Chart */}
                    <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-zinc-100 text-sm">Distribution des Soumissions</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            {statusData.length === 0 ? (
                                <div className="text-center py-6 text-xs text-zinc-500">Aucune soumission sur cette période.</div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="h-[120px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={35}
                                                    outerRadius={50}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                        borderColor: '#27272a',
                                                        borderRadius: '8px',
                                                        fontSize: '11px'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xxs text-zinc-400">
                                        {statusData.map((item) => (
                                            <div key={item.name} className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                <span className="truncate">{item.name}: <strong className="text-zinc-200">{item.value}</strong></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Detailed Segmentation Performance List */}
                    <Card className="bg-zinc-950/40 border-zinc-800 p-6 rounded-2xl shadow-xl">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-zinc-100 text-sm">Top Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0 max-h-[300px] overflow-y-auto pr-1">
                            <div className="space-y-3.5">
                                {activeTab === 'revenues' && (
                                    <>
                                        <span className="text-xxs font-bold text-zinc-500 uppercase tracking-wider block">
                                            {pipelineMode === 'all' ? 'Pipeline par Gestionnaire' : 'Revenus par Gestionnaire'}
                                        </span>
                                        {managerSegmentation.slice(0, 4).map((mgr) => {
                                            const conversion = mgr.presented ? Math.round((mgr.approved / mgr.presented) * 100) : 0
                                            return (
                                                <div key={mgr.name} className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-zinc-200">{mgr.name}</p>
                                                        <p className="text-xxs text-zinc-500">{mgr.presented} présentées · {conversion}% conversion</p>
                                                    </div>
                                                    <span className="font-bold text-cyan-400">${Math.round(mgr.revenue).toLocaleString('fr-CA')}</span>
                                                </div>
                                            )
                                        })}
                                        {managerSegmentation.length === 0 && <span className="text-xs text-zinc-500 block">Aucun résultat</span>}
                                    </>
                                )}

                                {activeTab === 'managers' && (
                                    <>
                                        <span className="text-xxs font-bold text-zinc-500 uppercase tracking-wider block">Conversion par Gestionnaire</span>
                                        {managerSegmentation.map((mgr) => {
                                            const conversion = mgr.presented ? Math.round((mgr.approved / mgr.presented) * 100) : 0
                                            return (
                                                <div key={mgr.name} className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-zinc-200">{mgr.name}</p>
                                                        <p className="text-xxs text-zinc-500">{mgr.approved} approuvées / {mgr.presented} présentées</p>
                                                    </div>
                                                    <Badge className={`${conversion >= 60 ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800' : conversion >= 40 ? 'bg-amber-950/40 text-amber-300 border-amber-800' : 'bg-rose-950/40 text-rose-300 border-rose-800'} text-xxs border`}>
                                                        {conversion}%
                                                    </Badge>
                                                </div>
                                            )
                                        })}
                                    </>
                                )}

                                {activeTab === 'teams' && (
                                    <>
                                        <span className="text-xxs font-bold text-zinc-500 uppercase tracking-wider block">
                                            {pipelineMode === 'all' ? 'Pipeline par Équipe' : 'Revenus par Équipe'}
                                        </span>
                                        {teamSegmentation.map((item) => (
                                            <div key={item.team} className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
                                                <span className="font-semibold text-zinc-200">{item.team}</span>
                                                <span className="font-bold text-emerald-400">${Math.round(item.value).toLocaleString('fr-CA')}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {activeTab === 'contractors' && (
                                    <>
                                        <span className="text-xxs font-bold text-zinc-500 uppercase tracking-wider block">Volume par Contracteur</span>
                                        {contractorSegmentation.map((c) => (
                                            <div key={c.name} className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-zinc-200">{c.name}</p>
                                                    <p className="text-xxs text-zinc-500">{c.jobs} projets complétés</p>
                                                </div>
                                                <span className="font-bold text-amber-400">${Math.round(c.revenue).toLocaleString('fr-CA')}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
