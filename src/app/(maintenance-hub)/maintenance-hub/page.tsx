// @ts-nocheck
// src/app/(team-management)/team-management/maintenance/page.tsx
import { 
    getMaintenanceDashboardStatsAction, 
    getCampaignsAction 
} from '@/actions/maintenance'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
    Wrench, 
    Plus, 
    Activity, 
    Users, 
    CheckCircle, 
    Calendar,
    Hammer,
    UserCheck,
    ChevronRight,
    TrendingUp,
    FileSpreadsheet
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MaintenanceDashboardPage() {
    const [stats, campaigns] = await Promise.all([
        getMaintenanceDashboardStatsAction(),
        getCampaignsAction()
    ])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-500/20 text-emerald-450 text-emerald-400 border-emerald-800/40'
            case 'completed':
                return 'bg-blue-500/20 text-blue-400 border-blue-800/40'
            case 'cancelled':
                return 'bg-rose-500/20 text-rose-400 border-rose-800/40'
            default:
                return 'bg-zinc-800/50 text-zinc-400 border-zinc-700/60'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Actif'
            case 'completed': return 'Complété'
            case 'cancelled': return 'Annulé'
            default: return 'Brouillon'
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-amber-500" />
                        Maintenance Hub
                    </h1>
                    <p className="text-xs text-zinc-400">
                        Gérer les campagnes de maintenance, la planification des accès et l'historique permanent des unités.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/maintenance-hub/services"
                        className="h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xxs flex items-center px-4 hover:bg-zinc-850 hover:text-white transition-all cursor-pointer"
                    >
                        <Hammer className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                        Bibliothèque de services
                    </Link>
                    <Link
                        href="/maintenance-hub/campaigns/new"
                        className="h-8 rounded-xl bg-purple-650 hover:bg-purple-700 text-white font-bold text-xxs flex items-center px-4 shadow transition-all hover:scale-[1.02] cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Nouvelle Campagne
                    </Link>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider block">Campagnes actives</span>
                            <span className="text-xl font-extrabold text-white block">{stats.activeCampaigns}</span>
                            <span className="text-[9px] text-zinc-400">{stats.totalCampaigns} au total</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider block">Unités gérées</span>
                            <span className="text-xl font-extrabold text-white block">{stats.totalUnitsCount}</span>
                            <span className="text-[9px] text-zinc-400">{stats.completedUnits} complétées</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center">
                            <Users className="h-4 w-4 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider block">Taux de participation</span>
                            <span className="text-xl font-extrabold text-white block">{stats.participationRate}%</span>
                            {/* Simple progress indicator */}
                            <div className="w-24 h-1 bg-zinc-850 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: `${stats.participationRate}%` }}></div>
                            </div>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-blue-950/40 border border-blue-800/40 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider block">Taux de complétion</span>
                            <span className="text-xl font-extrabold text-white block">{stats.completionRate}%</span>
                            {/* Simple progress indicator */}
                            <div className="w-24 h-1 bg-zinc-850 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${stats.completionRate}%` }}></div>
                            </div>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign grid & Team stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Campaigns List (Left - 2 Columns) */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-purple-400" />
                                Campagnes actives & récentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {campaigns.length === 0 ? (
                                <div className="p-8 text-center text-xxs text-zinc-500">
                                    Aucune campagne créée pour le moment.
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-900">
                                    {campaigns.map(c => (
                                        <Link 
                                            key={c.id} 
                                            href={`/maintenance-hub/campaigns/${c.id}`}
                                            className="flex items-center justify-between p-4 hover:bg-zinc-900/20 transition-all group"
                                        >
                                            <div className="space-y-1 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xxs text-zinc-100 group-hover:text-purple-400 transition-colors">
                                                        {c.name}
                                                    </span>
                                                    <Badge variant="outline" className={`text-[7px] font-extrabold uppercase px-1.5 py-0 ${getStatusBadge(c.status)}`}>
                                                        {getStatusLabel(c.status)}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-zinc-400 line-clamp-1">
                                                    {c.clients?.company_name || c.clients?.full_name} · du {new Date(c.start_date).toLocaleDateString('fr-CA')} au {new Date(c.end_date).toLocaleDateString('fr-CA')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 text-right">
                                                <div className="text-xxs hidden sm:block">
                                                    <span className="text-zinc-500 uppercase block font-bold text-[7px]">Contracteur</span>
                                                    <span className="text-zinc-300 font-medium">{c.contractors?.full_name || 'Non assigné'}</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-zinc-650 group-hover:text-zinc-450 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Team Management Stats (Right - 1 Column) */}
                <div className="space-y-4">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <UserCheck className="h-4 w-4 text-purple-400" />
                                Performance par gestionnaire
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {stats.teamStats.length === 0 ? (
                                <p className="text-xxs italic text-zinc-500 text-center py-4">
                                    Aucune statistique disponible.
                                </p>
                            ) : (
                                <div className="space-y-3.5">
                                    {stats.teamStats.map(m => (
                                        <div key={m.managerName} className="p-3 bg-zinc-900/35 border border-zinc-850 rounded-xl space-y-2 text-xxs">
                                            <div className="flex justify-between items-center border-b border-zinc-850/50 pb-1.5">
                                                <span className="font-extrabold text-zinc-200">{m.managerName}</span>
                                                <span className="text-[9px] text-zinc-500 font-bold">{m.campaignsCreated} campagne(s)</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-zinc-500">Unités ciblées:</span>
                                                <strong className="text-zinc-300">{m.unitsProcessed}</strong>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-zinc-500">Complétion:</span>
                                                    <strong className="text-emerald-400 font-bold">{m.completionRate}%</strong>
                                                </div>
                                                <div className="w-full h-1 bg-zinc-850 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${m.completionRate}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
