'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    DollarSign,
    Building2,
    TrendingUp,
    Users,
    Filter,
    Search,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Loader2,
    BarChart3,
    X,
    EyeOff,
    Eye,
    RotateCcw,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react'
import { SearchableManagerSelect } from '@/components/features/team-management/SearchableManagerSelect'

type Syndicate = {
    id: string
    full_name: string
    team: string | null
    manager_id: string | null
    manager_name: string | null
    manager_team_name: string | null
    package_name: string | null
    monthly_fee: number
    contract_start: string | null
    contract_end: string | null
}

type Stats = {
    totalMrr: number
    totalSyndicates: number
    avgMrr: number
    mrrByTeam: Record<string, { count: number; mrr: number }>
    mrrByManager: Record<string, { count: number; mrr: number; name: string; monthly_cost: number; cost_pct: number }>
    mrrByPackage: Record<string, { count: number; mrr: number }>
}

type Manager = { id: string; name: string; team_id: string | null; team_name: string | null; monthly_cost: number }
type Team = { id: string; name: string }

const PACKAGE_COLORS: Record<string, string> = {
    Bronze: 'bg-amber-900/30 text-amber-400 border-amber-800/40',
    Argent: 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40',
    'Argent+': 'bg-zinc-700/60 text-zinc-200 border-zinc-600/40',
    Or: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
    Platinum: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/40',
}

const TEAM_COLORS: Record<string, string> = {
    Classique: 'bg-blue-900/30 text-blue-300 border-blue-800/40',
    Essentiel: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40',
    Tremblant: 'bg-purple-900/30 text-purple-300 border-purple-800/40',
    Direction: 'bg-rose-900/30 text-rose-300 border-rose-800/40',
}

function fmt(n: number) {
    return n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: number) {
    return n.toFixed(1) + '%'
}

function CostPctBadge({ pct }: { pct: number }) {
    if (pct <= 0) return <span className="text-zinc-600 text-[10px]">—</span>
    const isGood = pct <= 25
    const color = isGood ? 'text-emerald-400' : 'text-amber-400'
    const icon = isGood
        ? <CheckCircle className="h-3 w-3" />
        : <AlertTriangle className="h-3 w-3" />
    return (
        <span className={`flex items-center gap-1 font-bold text-[11px] tabular-nums ${color}`}>
            {icon}
            {fmtPct(pct)}
        </span>
    )
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-emerald-400' }: {
    icon: any; label: string; value: string; sub?: string; color?: string
}) {
    return (
        <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-4 flex items-start gap-4 shadow-md">
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50 shrink-0">
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

type SortKey = 'full_name' | 'team' | 'manager_name' | 'package_name' | 'monthly_fee'
type SortDir = 'asc' | 'desc'

export function MrrSyndicatesClient({
    syndicates: initialSyndicates,
    stats: initialStats,
    managers,
    teams,
    isRestricted,
    currentTeamId,
    currentManagerId,
}: {
    syndicates: Syndicate[]
    stats: Stats
    managers: Manager[]
    teams: Team[]
    isRestricted: boolean
    currentTeamId?: string
    currentManagerId?: string
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Filters
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('monthly_fee')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [teamId, setTeamId] = useState(currentTeamId || 'all')
    const [managerId, setManagerId] = useState(currentManagerId || 'all')

    // Excluded syndicate IDs (client-side exclusion for custom analysis)
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
    const [showExcluded, setShowExcluded] = useState(true)

    const excludeCount = excludedIds.size

    const toggleExclude = (id: string) => {
        setExcludedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const resetExclusions = () => setExcludedIds(new Set())

    const handleFilter = (newTeamId: string, newManagerId: string) => {
        const params = new URLSearchParams()
        if (newTeamId && newTeamId !== 'all') params.set('teamId', newTeamId)
        if (newManagerId && newManagerId !== 'all') params.set('managerId', newManagerId)
        startTransition(() => {
            router.push(`/team-management/mrr?${params.toString()}`)
        })
    }

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir(key === 'monthly_fee' ? 'desc' : 'asc') }
    }

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-zinc-600" />
        return sortDir === 'asc'
            ? <ChevronUp className="h-3 w-3 text-purple-400" />
            : <ChevronDown className="h-3 w-3 text-purple-400" />
    }

    // Syndicates after search + sort (before exclusion)
    const displayed = useMemo(() => {
        return initialSyndicates
            .filter(s => {
                if (!search.trim()) return true
                const q = search.toLowerCase()
                return (
                    s.full_name?.toLowerCase().includes(q) ||
                    s.manager_name?.toLowerCase().includes(q) ||
                    s.team?.toLowerCase().includes(q) ||
                    s.package_name?.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => {
                let va: any = a[sortKey]
                let vb: any = b[sortKey]
                if (va == null) va = ''
                if (vb == null) vb = ''
                if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
                return sortDir === 'asc'
                    ? String(va).localeCompare(String(vb))
                    : String(vb).localeCompare(String(va))
            })
    }, [initialSyndicates, search, sortKey, sortDir])

    // Active syndicates = displayed minus excluded ones
    const activeSyndicates = useMemo(
        () => displayed.filter(s => !excludedIds.has(s.id)),
        [displayed, excludedIds]
    )

    // Recompute stats from active syndicates
    const liveStats = useMemo(() => {
        const totalMrr = activeSyndicates.reduce((s, x) => s + x.monthly_fee, 0)
        const totalSyndicates = activeSyndicates.length
        const avgMrr = totalSyndicates > 0 ? totalMrr / totalSyndicates : 0

        const mrrByTeam: Record<string, { count: number; mrr: number }> = {}
        activeSyndicates.forEach(s => {
            const t = s.team || 'Non assigné'
            if (!mrrByTeam[t]) mrrByTeam[t] = { count: 0, mrr: 0 }
            mrrByTeam[t].count++
            mrrByTeam[t].mrr += s.monthly_fee
        })

        const mrrByManager: Record<string, { count: number; mrr: number; name: string; monthly_cost: number; cost_pct: number }> = {}
        activeSyndicates.forEach(s => {
            const key = s.manager_id || 'none'
            if (!mrrByManager[key]) {
                const orig = initialStats.mrrByManager[key]
                mrrByManager[key] = {
                    count: 0, mrr: 0,
                    name: orig?.name || s.manager_name || 'Non assigné',
                    monthly_cost: orig?.monthly_cost || 0,
                    cost_pct: 0,
                }
            }
            mrrByManager[key].count++
            mrrByManager[key].mrr += s.monthly_fee
        })
        Object.values(mrrByManager).forEach(m => {
            m.cost_pct = m.mrr > 0 ? (m.monthly_cost / m.mrr) * 100 : 0
        })

        const mrrByPackage: Record<string, { count: number; mrr: number }> = {}
        activeSyndicates.forEach(s => {
            const pkg = s.package_name || 'Non assigné'
            if (!mrrByPackage[pkg]) mrrByPackage[pkg] = { count: 0, mrr: 0 }
            mrrByPackage[pkg].count++
            mrrByPackage[pkg].mrr += s.monthly_fee
        })

        return { totalMrr, totalSyndicates, avgMrr, mrrByTeam, mrrByManager, mrrByPackage }
    }, [activeSyndicates, initialStats])

    const topManagers = Object.entries(liveStats.mrrByManager)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.mrr - a.mrr)

    const packageBreakdown = Object.entries(liveStats.mrrByPackage)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.mrr - a.mrr)

    const maxPkgMrr = Math.max(...packageBreakdown.map(p => p.mrr), 1)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        Revenus Récurrents (MRR)
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Analyse du portefeuille actif — syndicats, gestionnaires et forfaits
                    </p>
                </div>
                {excludeCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300">
                        <EyeOff className="h-3.5 w-3.5" />
                        <span><strong>{excludeCount}</strong> syndicat{excludeCount > 1 ? 's' : ''} exclus de l'analyse</span>
                        <button
                            onClick={resetExclusions}
                            className="ml-1 flex items-center gap-1 text-amber-400 hover:text-white font-bold hover:underline transition-colors"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Réinitialiser
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4 shadow-md">
                {!isRestricted && (
                    <div className="space-y-1.5 flex-1 max-w-[220px]">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-purple-400" />
                            Équipe
                        </label>
                        <select
                            value={teamId}
                            onChange={e => { setTeamId(e.target.value); setManagerId('all'); handleFilter(e.target.value, 'all') }}
                            disabled={isPending}
                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 text-xs font-semibold outline-none focus:border-purple-600/50 h-9 cursor-pointer"
                        >
                            <option value="all">Toutes les équipes</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="space-y-1.5 flex-1 max-w-[260px]">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-purple-400" />
                        Gestionnaire
                    </label>
                    <SearchableManagerSelect
                        managers={managers.map(m => ({
                            id: m.id,
                            first_name: m.name.split(' ')[0],
                            last_name: m.name.split(' ').slice(1).join(' '),
                            team_name: m.team_name || undefined,
                        }))}
                        name="managerId"
                        placeholder="Rechercher un gestionnaire…"
                        defaultValue={managerId !== 'all' ? managerId : ''}
                        onChange={(id) => {
                            const newId = id || 'all'
                            setManagerId(newId)
                            handleFilter(teamId, newId)
                        }}
                        className="w-full"
                    />
                    {managerId !== 'all' && (
                        <button
                            onClick={() => { setManagerId('all'); handleFilter(teamId, 'all') }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                        >
                            <X className="h-3 w-3" /> Effacer le filtre
                        </button>
                    )}
                </div>

                {isPending && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400 pb-1">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                        Chargement…
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard icon={DollarSign} label="MRR (sélection)" value={`$${fmt(liveStats.totalMrr)}`}
                    sub={excludeCount > 0 ? `${excludeCount} exclus · base: $${fmt(initialStats.totalMrr)}` : 'Revenus récurrents mensuels'}
                    color="text-emerald-400" />
                <StatCard icon={Building2} label="Syndicats actifs" value={String(liveStats.totalSyndicates)}
                    sub={excludeCount > 0 ? `sur ${initialStats.totalSyndicates} au total` : 'Avec contrat actif'}
                    color="text-purple-400" />
                <StatCard icon={TrendingUp} label="MRR Moyen / Syndic." value={`$${fmt(liveStats.avgMrr)}`}
                    sub="Par syndicat inclus" color="text-sky-400" />
                <StatCard icon={BarChart3} label="Équipes représentées" value={String(Object.keys(liveStats.mrrByTeam).length)}
                    sub="Dans la sélection" color="text-amber-400" />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* MRR by Team */}
                <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-5 shadow-md">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-purple-400" />
                        MRR par Équipe
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(liveStats.mrrByTeam)
                            .sort(([, a], [, b]) => b.mrr - a.mrr)
                            .map(([team, { count, mrr }]) => {
                                const pct = liveStats.totalMrr > 0 ? (mrr / liveStats.totalMrr) * 100 : 0
                                const color = TEAM_COLORS[team] || 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40'
                                return (
                                    <div key={team}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{team}</span>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-white">${fmt(mrr)}</span>
                                                <span className="text-[10px] text-zinc-500 ml-1.5">{count} synd.</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-[9px] text-zinc-600 mt-0.5">{pct.toFixed(1)}% du MRR</p>
                                    </div>
                                )
                            })}
                        {Object.keys(liveStats.mrrByTeam).length === 0 && (
                            <p className="text-xs text-zinc-600 italic">Aucun syndicat inclus</p>
                        )}
                    </div>
                </div>

                {/* MRR by Package */}
                <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-5 shadow-md">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                        MRR par Forfait
                    </h3>
                    <div className="space-y-3">
                        {packageBreakdown.map(({ name, count, mrr }) => {
                            const pct = maxPkgMrr > 0 ? (mrr / maxPkgMrr) * 100 : 0
                            const color = PACKAGE_COLORS[name] || 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40'
                            return (
                                <div key={name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{name}</span>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-white">${fmt(mrr)}</span>
                                            <span className="text-[10px] text-zinc-500 ml-1.5">{count} synd.</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                        {packageBreakdown.length === 0 && (
                            <p className="text-xs text-zinc-600 italic">Aucun syndicat inclus</p>
                        )}
                    </div>
                </div>

                {/* Managers — MRR + Cost % */}
                <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-5 shadow-md">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        Gestionnaires · MRR &amp; Coût
                    </h3>
                    <p className="text-[9px] text-zinc-600 mb-4">% Coût = salaire mensuel ÷ MRR géré</p>
                    <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                        {topManagers.map(({ name, count, mrr, monthly_cost, cost_pct }, i) => {
                            const mrrPct = liveStats.totalMrr > 0 ? (mrr / liveStats.totalMrr) * 100 : 0
                            return (
                                <div key={name} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[10px] font-black text-zinc-600 w-4 text-right shrink-0">{i + 1}</span>
                                            <span className="text-[10px] font-semibold text-zinc-300 truncate">{name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[10px] font-bold text-emerald-400 tabular-nums">${fmt(mrr)}</span>
                                            <CostPctBadge pct={cost_pct} />
                                        </div>
                                    </div>
                                    <div className="pl-6 space-y-1">
                                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-500" style={{ width: `${mrrPct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-zinc-600">
                                            <span>{count} syndicats</span>
                                            {monthly_cost > 0 && <span>Coût: ${fmt(monthly_cost)}/mois</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {topManagers.length === 0 && (
                            <p className="text-xs text-zinc-600 italic">Aucun gestionnaire</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl shadow-md overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 gap-3">
                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-purple-400" />
                            <span className="font-semibold text-white">{activeSyndicates.length}</span>
                            <span>syndicats actifs</span>
                        </div>
                        <span className="text-emerald-400 font-bold">${fmt(liveStats.totalMrr)}</span>
                        {excludeCount > 0 && (
                            <button
                                onClick={() => setShowExcluded(v => !v)}
                                className="flex items-center gap-1 text-amber-400 hover:text-white transition-colors font-semibold"
                            >
                                {showExcluded ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                {showExcluded ? 'Masquer' : 'Afficher'} exclus ({excludeCount})
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {excludeCount > 0 && (
                            <button
                                onClick={resetExclusions}
                                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-amber-800/50 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 text-xs font-semibold transition-all"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Réinitialiser
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Rechercher…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-[#121318] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-purple-600/50 w-52 h-8"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-zinc-800/60 bg-zinc-900/30">
                                <th className="px-4 py-3 text-left w-10">
                                    <span className="sr-only">Exclure</span>
                                </th>
                                {([
                                    ['full_name', 'Syndicat'],
                                    ['team', 'Équipe'],
                                    ['manager_name', 'Gestionnaire'],
                                    ['package_name', 'Forfait'],
                                    ['monthly_fee', 'MRR Mensuel'],
                                ] as [SortKey, string][]).map(([key, label]) => (
                                    <th
                                        key={key}
                                        onClick={() => handleSort(key)}
                                        className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {label}
                                            <SortIcon k={key} />
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    Contrat
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                            {displayed.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                        Aucun syndicat trouvé
                                    </td>
                                </tr>
                            )}
                            {displayed.map(s => {
                                const isExcluded = excludedIds.has(s.id)
                                if (isExcluded && !showExcluded) return null

                                const teamColor = s.team
                                    ? (TEAM_COLORS[s.team] || 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40')
                                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800/40'
                                const pkgColor = s.package_name
                                    ? (PACKAGE_COLORS[s.package_name] || 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40')
                                    : 'bg-zinc-900/40 text-zinc-600 border-zinc-800/40'

                                return (
                                    <tr
                                        key={s.id}
                                        className={`transition-all group ${
                                            isExcluded
                                                ? 'opacity-35 bg-zinc-900/10'
                                                : 'hover:bg-zinc-800/20'
                                        }`}
                                    >
                                        {/* Exclude toggle */}
                                        <td className="px-3 py-3">
                                            <button
                                                onClick={() => toggleExclude(s.id)}
                                                title={isExcluded ? 'Réinclure ce syndicat' : 'Exclure de l\'analyse'}
                                                className={`h-6 w-6 rounded-md border flex items-center justify-center transition-all ${
                                                    isExcluded
                                                        ? 'bg-amber-950/40 border-amber-700/50 text-amber-400 hover:bg-amber-950/60'
                                                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 hover:border-rose-700/50 hover:text-rose-400 hover:bg-rose-950/20'
                                                }`}
                                            >
                                                {isExcluded
                                                    ? <Eye className="h-3 w-3" />
                                                    : <X className="h-3 w-3" />
                                                }
                                            </button>
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-purple-950/40 border border-purple-900/30 flex items-center justify-center text-[10px] font-black text-purple-300 shrink-0">
                                                    {s.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className={`font-semibold truncate max-w-[200px] ${isExcluded ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                                    {s.full_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${teamColor}`}>
                                                {s.team || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {s.manager_name
                                                ? <span className="text-zinc-300 font-medium">{s.manager_name}</span>
                                                : <span className="text-zinc-600 italic">Non assigné</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pkgColor}`}>
                                                {s.package_name || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-bold tabular-nums ${
                                                isExcluded ? 'text-zinc-600 line-through' :
                                                s.monthly_fee > 0 ? 'text-emerald-400' : 'text-zinc-600'
                                            }`}>
                                                ${fmt(s.monthly_fee)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-500">
                                            {s.contract_start ? (
                                                <span className="text-[10px]">
                                                    {new Date(s.contract_start).toLocaleDateString('fr-CA')}
                                                    {s.contract_end ? ` → ${new Date(s.contract_end).toLocaleDateString('fr-CA')}` : ''}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-700 italic text-[10px]">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
