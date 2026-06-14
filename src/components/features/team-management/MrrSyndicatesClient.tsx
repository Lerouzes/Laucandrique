'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    ArrowUpRight,
    Loader2,
    BarChart3,
} from 'lucide-react'

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
    mrrByManager: Record<string, { count: number; mrr: number; name: string }>
    mrrByPackage: Record<string, { count: number; mrr: number }>
}

type Manager = { id: string; name: string; team_id: string | null; team_name: string | null }
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

function StatCard({ icon: Icon, label, value, sub, color = 'text-emerald-400' }: {
    icon: any; label: string; value: string; sub?: string; color?: string
}) {
    return (
        <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-4 flex items-start gap-4 shadow-md">
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
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
    stats,
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
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('monthly_fee')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [teamId, setTeamId] = useState(currentTeamId || 'all')
    const [managerId, setManagerId] = useState(currentManagerId || 'all')

    const handleFilter = (newTeamId: string, newManagerId: string) => {
        const params = new URLSearchParams()
        if (newTeamId && newTeamId !== 'all') params.set('teamId', newTeamId)
        if (newManagerId && newManagerId !== 'all') params.set('managerId', newManagerId)
        startTransition(() => {
            router.push(`/team-management/mrr?${params.toString()}`)
        })
    }

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir(key === 'monthly_fee' ? 'desc' : 'asc')
        }
    }

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-zinc-600" />
        return sortDir === 'asc'
            ? <ChevronUp className="h-3 w-3 text-purple-400" />
            : <ChevronDown className="h-3 w-3 text-purple-400" />
    }

    const filtered = initialSyndicates
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

    const filteredMrr = filtered.reduce((s, x) => s + x.monthly_fee, 0)

    // Top managers breakdown
    const topManagers = Object.entries(stats.mrrByManager)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.mrr - a.mrr)
        .slice(0, 5)

    // Package breakdown
    const packageBreakdown = Object.entries(stats.mrrByPackage)
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
            </div>

            {/* Filters */}
            <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4 shadow-md">
                {/* Team filter */}
                {!isRestricted && (
                    <div className="space-y-1.5 flex-1 max-w-[220px]">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-purple-400" />
                            Équipe
                        </label>
                        <select
                            value={teamId}
                            onChange={e => {
                                setTeamId(e.target.value)
                                setManagerId('all')
                                handleFilter(e.target.value, 'all')
                            }}
                            disabled={isPending}
                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 text-xs font-semibold outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/20 h-9 cursor-pointer"
                        >
                            <option value="all">Toutes les équipes</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Manager filter */}
                <div className="space-y-1.5 flex-1 max-w-[260px]">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-purple-400" />
                        Gestionnaire
                    </label>
                    <select
                        value={managerId}
                        onChange={e => {
                            setManagerId(e.target.value)
                            handleFilter(teamId, e.target.value)
                        }}
                        disabled={isPending}
                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 text-xs font-semibold outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/20 h-9 cursor-pointer"
                    >
                        <option value="all">Tous les gestionnaires</option>
                        {managers.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name}{m.team_name ? ` · ${m.team_name}` : ''}
                            </option>
                        ))}
                    </select>
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
                <StatCard
                    icon={DollarSign}
                    label="MRR Total"
                    value={`$${fmt(stats.totalMrr)}`}
                    sub="Revenus récurrents mensuels"
                    color="text-emerald-400"
                />
                <StatCard
                    icon={Building2}
                    label="Syndicats actifs"
                    value={String(stats.totalSyndicates)}
                    sub="Avec contrat actif"
                    color="text-purple-400"
                />
                <StatCard
                    icon={TrendingUp}
                    label="MRR Moyen / Syndic."
                    value={`$${fmt(stats.avgMrr)}`}
                    sub="Par syndicat actif"
                    color="text-sky-400"
                />
                <StatCard
                    icon={BarChart3}
                    label="Nombre d'équipes"
                    value={String(Object.keys(stats.mrrByTeam).length)}
                    sub="Équipes avec syndicats actifs"
                    color="text-amber-400"
                />
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
                        {Object.entries(stats.mrrByTeam)
                            .sort(([, a], [, b]) => b.mrr - a.mrr)
                            .map(([team, { count, mrr }]) => {
                                const pct = stats.totalMrr > 0 ? (mrr / stats.totalMrr) * 100 : 0
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
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-zinc-600 mt-0.5">{pct.toFixed(1)}% du MRR total</p>
                                    </div>
                                )
                            })}
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
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Top Managers by MRR */}
                <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-5 shadow-md">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        Top Gestionnaires
                    </h3>
                    <div className="space-y-3">
                        {topManagers.map(({ name, count, mrr }, i) => {
                            const pct = stats.totalMrr > 0 ? (mrr / stats.totalMrr) * 100 : 0
                            return (
                                <div key={name} className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-zinc-600 w-4 text-right">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-semibold text-zinc-300 truncate">{name}</span>
                                            <span className="text-[10px] font-bold text-emerald-400 ml-2 shrink-0">${fmt(mrr)}</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-zinc-600 mt-0.5">{count} syndicats</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl shadow-md overflow-hidden">
                {/* Table toolbar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 gap-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Building2 className="h-3.5 w-3.5 text-purple-400" />
                        <span className="font-semibold text-white">{filtered.length}</span>
                        <span>syndicats</span>
                        {filtered.length !== initialSyndicates.length && (
                            <span className="text-zinc-600">· filtrés sur {initialSyndicates.length}</span>
                        )}
                        <span className="ml-3 text-emerald-400 font-bold">${fmt(filteredMrr)}</span>
                        <span>MRR affiché</span>
                    </div>
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

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-zinc-800/60 bg-zinc-900/30">
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
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                        Aucun syndicat trouvé
                                    </td>
                                </tr>
                            )}
                            {filtered.map((s, idx) => {
                                const teamColor = s.team ? (TEAM_COLORS[s.team] || 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40') : 'bg-zinc-900/40 text-zinc-500 border-zinc-800/40'
                                const pkgColor = s.package_name ? (PACKAGE_COLORS[s.package_name] || 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40') : 'bg-zinc-900/40 text-zinc-600 border-zinc-800/40'

                                return (
                                    <tr
                                        key={s.id}
                                        className="hover:bg-zinc-800/20 transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-purple-950/40 border border-purple-900/30 flex items-center justify-center text-[10px] font-black text-purple-300 shrink-0">
                                                    {s.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="font-semibold text-zinc-200 truncate max-w-[200px]">{s.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${teamColor}`}>
                                                {s.team || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {s.manager_name ? (
                                                <span className="text-zinc-300 font-medium">{s.manager_name}</span>
                                            ) : (
                                                <span className="text-zinc-600 italic">Non assigné</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pkgColor}`}>
                                                {s.package_name || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-bold tabular-nums ${s.monthly_fee > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
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
