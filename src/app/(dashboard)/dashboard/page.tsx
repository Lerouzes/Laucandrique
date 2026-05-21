import Link from 'next/link'
import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { getSettings } from '@/actions/settings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    Banknote, 
    CheckCircle, 
    Clock, 
    Send, 
    PlusCircle, 
    Calendar, 
    UserPlus, 
    Settings as SettingsIcon, 
    AlertTriangle,
    ArrowRight,
    TrendingUp,
    FileText,
    SlidersHorizontal,
    Briefcase
} from 'lucide-react'
import { AnalyticsCharts } from '@/components/features/analytics/AnalyticsCharts'

function getRange(period: string, start?: string, end?: string) {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), 0, 1)
    const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    if (period === 'last_30_days') return { start: new Date(now.getTime() - 29 * 86400000), end: now }
    if (period === 'next_30_days') return { start: now, end: new Date(now.getTime() + 30 * 86400000) }
    if (period === 'custom' && start && end) return { start: new Date(start), end: new Date(`${end}T23:59:59.999`) }
    return { start: firstDay, end: lastDay }
}

export default async function DashboardPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ 
        period?: string
        start?: string
        end?: string
        managers?: string | string[]
        teams?: string | string[]
        showFilters?: string
    }> 
}) {
    const params = await searchParams
    const asArray = (value?: string | string[]) => {
        if (!value) return []
        return Array.isArray(value) ? value : String(value).split(',').filter(Boolean)
    }

    const selectedManagers = asArray(params.managers)
    const selectedTeams = asArray(params.teams)
    const period = params.period || 'current_year'
    const range = getRange(period, params.start, params.end)
    const showFilters = params.showFilters === 'true'

    // Parallel Server Fetching
    const [quotes, projects, settings] = await Promise.all([
        getQuotes(),
        getProjects(),
        getSettings()
    ])

    // Filter logic
    const filteredQuotes = quotes.filter((q: any) => {
        const managerId = q.manager_id || 'none'
        const teamName = q.managers?.manager_teams?.name || ''
        const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(managerId)
        const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(teamName)
        return managerMatch && teamMatch
    })

    const totalQuotesCount = filteredQuotes.length
    const approvedQuotes = filteredQuotes.filter((q: any) => q.status === 'approved')
    const sentQuotes = filteredQuotes.filter((q: any) => q.status === 'sent')
    const totalApprovedValue = approvedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)

    const activeProjects = projects.filter((p: any) => {
        if (!(p.status === 'in_progress' || p.status === 'planned')) return false
        const managerId = p.quotes?.manager_id || 'none'
        const teamName = p.quotes?.managers?.manager_teams?.name || ''
        const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(managerId)
        const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(teamName)
        return managerMatch && teamMatch
    })

    // Unplanned projects (approved quotes with no calendar date yet)
    const unplannedProjects = projects.filter((p: any) => {
        if (p.status !== 'unplanned') return false
        const managerId = p.quotes?.manager_id || 'none'
        const teamName = p.quotes?.managers?.manager_teams?.name || ''
        const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(managerId)
        const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(teamName)
        return managerMatch && teamMatch
    })

    // Monthly aggregation
    const monthlyMap: Record<string, number> = {}
    filteredQuotes
        .filter((q: any) => q.status === 'approved')
        .forEach((q: any) => {
            const project = q.projects?.[0]
            const dateStr = project?.start_date || q.approved_at || q.created_at
            const d = new Date(dateStr)
            if (d >= range.start && d <= range.end) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                monthlyMap[key] = (monthlyMap[key] || 0) + (q.total || 0)
            }
        })
    const monthlyRevenue = Object.entries(monthlyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, total]) => ({ month, total }))

    const availableManagers = Array.from(new Set(quotes.map((q: any) => q.manager_id).filter(Boolean)))
    const availableTeams = Array.from(new Set(quotes.map((q: any) => q.managers?.manager_teams?.name).filter(Boolean)))

    // Calculate win rate
    const approvedCount = approvedQuotes.length
    const deniedCount = filteredQuotes.filter((q: any) => q.status === 'denied').length
    const winRate = approvedCount + deniedCount > 0 ? Math.round((approvedCount / (approvedCount + deniedCount)) * 100) : 0

    // Recent activity list
    const recentQuotes = [...filteredQuotes]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

    // Monthly Target Progress computation
    const monthlyGoalEnabled = settings?.monthly_goal_enabled || false
    const monthlyGoalAmount = settings?.monthly_goal_amount || 0
    
    // Sum approved revenue in current month
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const currentMonthRevenue = approvedQuotes
        .filter((q: any) => {
            const project = q.projects?.[0]
            const d = new Date(project?.start_date || q.approved_at || q.created_at)
            return d >= startOfCurrentMonth && d <= endOfCurrentMonth
        })
        .reduce((acc, q) => acc + (q.total || 0), 0)

    const goalProgressPercentage = monthlyGoalAmount > 0 ? Math.min(Math.round((currentMonthRevenue / monthlyGoalAmount) * 100), 100) : 0

    return (
        <div className="space-y-6 pb-12">
            
            {/* Header section with monthly goal info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Tableau de bord</h2>
                    <p className="text-sm text-zinc-400">
                        Aperçu en temps réel de vos opérations, goulots d'étranglement et opportunités de vente.
                    </p>
                </div>

                {/* Monthly Goal widget */}
                {monthlyGoalEnabled && monthlyGoalAmount > 0 && (
                    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-4 w-full md:w-auto min-w-[280px]">
                        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="22" cy="22" r="18" stroke="#1f1f23" strokeWidth="3" fill="transparent" />
                                <circle cx="22" cy="22" r="18" stroke="#06b6d4" strokeWidth="3.5" fill="transparent" 
                                    strokeDasharray={2 * Math.PI * 18} 
                                    strokeDashoffset={2 * Math.PI * 18 * (1 - goalProgressPercentage / 100)} 
                                />
                            </svg>
                            <span className="absolute text-xxs font-bold text-zinc-100">{goalProgressPercentage}%</span>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Objectif Mensuel</p>
                            <p className="text-xs text-zinc-300">
                                <strong className="text-zinc-100">${Math.round(currentMonthRevenue).toLocaleString('fr-CA')}</strong> / ${monthlyGoalAmount.toLocaleString('fr-CA')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Toggle Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-zinc-950/40 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2">
                    <Link 
                        href={`/dashboard?showFilters=${!showFilters}&period=${period}`}
                        className="h-8 rounded-lg bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-300 flex items-center gap-1.5 hover:bg-zinc-800 transition-all"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-500" />
                        {showFilters ? 'Masquer les filtres' : 'Filtres de segmentation'}
                        {(selectedManagers.length > 0 || selectedTeams.length > 0) && (
                            <Badge className="bg-cyan-500 text-zinc-950 text-xxs font-bold px-1.5 ml-1">
                                {selectedManagers.length + selectedTeams.length}
                            </Badge>
                        )}
                    </Link>
                </div>
                
                {/* Time Range Quick Selectors */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                    <Link href={`/dashboard?period=current_year`} className={`px-3 py-1 rounded-md text-xxs font-bold transition-all ${period === 'current_year' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'}`}>Année</Link>
                    <Link href={`/dashboard?period=last_30_days`} className={`px-3 py-1 rounded-md text-xxs font-bold transition-all ${period === 'last_30_days' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'}`}>30 Derniers Jours</Link>
                    <Link href={`/dashboard?period=next_30_days`} className={`px-3 py-1 rounded-md text-xxs font-bold transition-all ${period === 'next_30_days' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'}`}>30 Prochains Jours</Link>
                </div>
            </div>

            {/* Collapsible Filters Card */}
            {showFilters && (
                <Card className="bg-zinc-950/70 border-zinc-800 backdrop-blur-md p-5 rounded-2xl animate-in fade-in duration-200">
                    <form className="space-y-4">
                        <input type="hidden" name="period" value={period} />
                        <input type="hidden" name="showFilters" value="true" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Managers Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Filtrer par gestionnaire</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {availableManagers.map((id: any) => {
                                        const q = quotes.find((x: any) => x.manager_id === id)
                                        const label = q?.managers ? `${q.managers.first_name} ${q.managers.last_name}` : id
                                        const checked = selectedManagers.includes(id)
                                        return (
                                            <label 
                                                key={id} 
                                                className={`cursor-pointer transition-all text-xxs px-2.5 py-1 rounded-full border flex items-center gap-1.5 select-none ${
                                                    checked
                                                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800'
                                                        : 'bg-transparent text-zinc-400 border-zinc-850 hover:border-zinc-700'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    name="managers" 
                                                    value={id} 
                                                    defaultChecked={checked}
                                                    className="sr-only" 
                                                    onChange={(e) => {
                                                        const form = e.target.form
                                                        if (form) form.requestSubmit()
                                                    }}
                                                />
                                                {label}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Teams Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Filtrer par équipe</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {availableTeams.map((team: any) => {
                                        const checked = selectedTeams.includes(team)
                                        return (
                                            <label 
                                                key={team} 
                                                className={`cursor-pointer transition-all text-xxs px-2.5 py-1 rounded-full border flex items-center gap-1.5 select-none ${
                                                    checked
                                                        ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800'
                                                        : 'bg-transparent text-zinc-400 border-zinc-850 hover:border-zinc-700'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    name="teams" 
                                                    value={team} 
                                                    defaultChecked={checked}
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        const form = e.target.form
                                                        if (form) form.requestSubmit()
                                                    }}
                                                />
                                                {team}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                            <Link href="/dashboard" className="h-8 rounded-lg bg-transparent px-3 text-xs text-zinc-400 flex items-center hover:text-zinc-200">
                                Réinitialiser les filtres
                            </Link>
                        </div>
                    </form>
                </Card>
            )}

            {/* Premium Metric Cards Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Projected Revenue */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-cyan-950/50 p-2 border border-cyan-800/30 group-hover:scale-110 transition-transform">
                        <Banknote className="h-5 w-5 text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Revenus Projetés</p>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(totalApprovedValue).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500 flex items-center gap-1">
                        Sur {approvedQuotes.length} soumissions approuvées
                    </p>
                </div>

                {/* Win Rate */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-indigo-950/50 p-2 border border-indigo-800/30 group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-5 w-5 text-indigo-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Taux d'Approbation</p>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                        {winRate}%
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        {approvedCount} gagnées · {deniedCount} perdues
                    </p>
                </div>

                {/* Sent Quotes */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-amber-950/50 p-2 border border-amber-800/30 group-hover:scale-110 transition-transform">
                        <Send className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Envoyées en attente</p>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                        {sentQuotes.length}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        En attente d'une décision client
                    </p>
                </div>

                {/* Active Projects */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-emerald-950/50 p-2 border border-emerald-800/30 group-hover:scale-110 transition-transform">
                        <Clock className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Projets Actifs</p>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                        {activeProjects.length}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        En planification ou en cours de réalisation
                    </p>
                </div>
            </div>

            {/* Split Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT SECTION (Takes 2/3 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Monthly Chart Card */}
                    <AnalyticsCharts monthlyRevenue={monthlyRevenue} />

                    {/* Recent Activity Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-cyan-500" />
                                Soumissions Récentes
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Historique des cinq dernières soumissions enregistrées.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {recentQuotes.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-4 text-center">Aucune soumission enregistrée.</p>
                                ) : (
                                    recentQuotes.map((q: any) => {
                                        const badgeStyle = 
                                            q.status === 'approved' ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800' :
                                            q.status === 'denied' ? 'bg-rose-950/40 text-rose-300 border-rose-800' :
                                            q.status === 'sent' ? 'bg-amber-950/40 text-amber-300 border-amber-800' :
                                            'bg-zinc-950 text-zinc-400 border-zinc-850'
                                        
                                        const statusLabel = 
                                            q.status === 'approved' ? 'Approuvée' :
                                            q.status === 'denied' ? 'Refusée' :
                                            q.status === 'sent' ? 'Envoyée' : 'Brouillon'

                                        return (
                                            <Link
                                                key={q.id}
                                                href={`/quotes/${q.id}`}
                                                className="flex justify-between items-center p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/30 hover:bg-zinc-950/60 hover:border-zinc-700 transition-all gap-3"
                                            >
                                                <div className="space-y-0.5 truncate">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xxs font-bold text-zinc-500">#{q.quote_number || 'N/A'}</span>
                                                        {q.managers && (
                                                            <span className="text-xxs text-zinc-400">
                                                                · {q.managers.first_name} {q.managers.last_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-200 truncate">{q.title || 'Sans titre'}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-sm font-bold text-zinc-100">
                                                        ${Math.round(q.total || 0).toLocaleString('fr-CA')}
                                                    </span>
                                                    <Badge variant="outline" className={`text-xxs px-2 py-0.5 font-semibold ${badgeStyle}`}>
                                                        {statusLabel}
                                                    </Badge>
                                                </div>
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT SECTION (Takes 1/3 col) */}
                <div className="space-y-6">
                    
                    {/* Quick Actions Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-cyan-500" />
                                Actions Rapides
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Accédez rapidement aux tâches fréquentes pour accélérer vos processus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700 text-white justify-start gap-2 h-10 rounded-xl font-semibold">
                                <Link href="/quotes/new">
                                    <PlusCircle className="h-4 w-4" />
                                    Créer une soumission
                                </Link>
                            </Button>
                            
                            <Button asChild variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl font-semibold border-zinc-800 hover:bg-zinc-800/40 text-zinc-200 hover:text-zinc-100">
                                <Link href="/planification">
                                    <Calendar className="h-4 w-4 text-indigo-400" />
                                    Planifier un projet
                                </Link>
                            </Button>

                            <Button asChild variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl font-semibold border-zinc-800 hover:bg-zinc-800/40 text-zinc-200 hover:text-zinc-100">
                                <Link href="/clients">
                                    <UserPlus className="h-4 w-4 text-emerald-400" />
                                    Ajouter un client / Importer
                                </Link>
                            </Button>

                            <Button asChild variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl font-semibold border-zinc-800 hover:bg-zinc-800/40 text-zinc-200 hover:text-zinc-100">
                                <Link href="/settings">
                                    <SettingsIcon className="h-4 w-4 text-zinc-400" />
                                    Ajuster les taux & objectifs
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Operational Bottlenecks: Unplanned Projects */}
                    <Card className="bg-zinc-900 border-zinc-850 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                                Goulots d'Étranglement
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Projets signés en attente d'être planifiés sur le calendrier.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {unplannedProjects.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-cyan-950/10 border border-cyan-900/30 text-center">
                                        <p className="text-xxs font-bold text-cyan-400">Opérations Fluides</p>
                                        <p className="text-xxs text-zinc-400 mt-1">Tous les projets signés sont planifiés sur le calendrier!</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                            {unplannedProjects.map((p: any) => (
                                                <div 
                                                    key={p.id} 
                                                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 flex justify-between items-center gap-2 hover:bg-zinc-900/30 transition-all"
                                                >
                                                    <div className="truncate space-y-0.5">
                                                        <span className="text-xxs font-bold text-zinc-500">#{p.quotes?.quote_number || 'Signé'}</span>
                                                        <p className="text-xs font-bold text-zinc-200 truncate">{p.title}</p>
                                                    </div>
                                                    <Badge className="bg-amber-950/40 text-amber-400 border border-amber-800 shrink-0 text-xxs font-semibold">
                                                        À Planifier
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <Button asChild className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 gap-1.5 h-9 rounded-lg text-xs mt-1 font-semibold">
                                            <Link href="/planification">
                                                Planifier ces projets
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
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
