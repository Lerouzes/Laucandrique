import { getGlobalTeamStats, saveMonthlyCallsAction, saveMonthlyWorkloadAction } from '@/actions/team-management'
import { getManagers } from '@/actions/managers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BatchCallStatsModal } from '@/components/features/team-management/BatchCallStatsModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    Building2, 
    DoorOpen, 
    DollarSign, 
    Handshake, 
    ShieldAlert, 
    UserMinus, 
    UserPlus, 
    AlertTriangle,
    FileSpreadsheet,
    PlusCircle,
    Calendar,
    Award
} from 'lucide-react'

export default async function TeamManagementDashboard() {
    const [stats, managers] = await Promise.all([
        getGlobalTeamStats(),
        getManagers()
    ])

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const packageData = Object.entries(stats.packageCounts).map(([name, count]) => ({
        name,
        count
    }))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">Tableau de bord Gestion d'Équipe</h2>
                <p className="text-xs text-zinc-400">
                    Aperçu stratégique de la charge de travail, de la conformité réglementaire et de la satisfaction client.
                </p>
            </div>

            {/* Metrics cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Syndicats Actifs</CardTitle>
                        <Building2 className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.totalSyndicates}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Syndicats sous contrat actif</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Portes Totales</CardTitle>
                        <DoorOpen className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.totalDoors}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Unités administrées</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Revenu Mensuel Récurrent</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-emerald-400">${stats.mrr.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Honoraires de gestion récurrents</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Rencontres YTD</CardTitle>
                        <Handshake className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.meetingsCount}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Rencontres 1-à-1 complétées</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 border-purple-900/30 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-purple-400 uppercase tracking-wider">Projets Approuvés</CardTitle>
                        <Award className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-extrabold text-white">{stats.quoteApprovalRate}%</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Taux d'approbation global (Ops)</p>
                    </CardContent>
                </Card>
            </div>

            {/* Risk, Lost & New Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Syndicats à Risque</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="text-lg font-bold text-amber-400">{stats.atRiskCount}</div>
                        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Dossiers Critiques</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="text-lg font-bold text-rose-500">{stats.criticalCount}</div>
                        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Nouveaux YTD</CardTitle>
                        <UserPlus className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-white">+{stats.newYtd}</div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Perdus YTD</CardTitle>
                        <UserMinus className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-white">-{stats.lostYtd}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Split Content: Packages breakdown and Manual entry logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contracts package breakdown card */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                            Répartition des Forfaits de Gestion
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Nombre de contrats actifs classés par type de forfait de services.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {packageData.map((pkg) => {
                                const total = stats.totalSyndicates || 1
                                const percent = Math.round((pkg.count / total) * 100)
                                return (
                                    <div key={pkg.name} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-zinc-200">{pkg.name}</span>
                                            <span className="text-zinc-400">{pkg.count} contrat(s) ({percent}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-purple-600 rounded-full" 
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Manual entry card */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <PlusCircle className="h-4 w-4 text-purple-400" />
                            Saisie Manuelle des Indicateurs
                        </CardTitle>
                        <CardDescription className="text-xxs text-zinc-400">
                            Enregistrer les appels et la charge de travail mensuelle des gestionnaires.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Call Stats Input */}
                        <form action={saveMonthlyCallsAction} className="space-y-3 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Statistiques d'Appels</h4>
                                <BatchCallStatsModal managers={managers} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xxs">
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Gestionnaire</Label>
                                    <select name="manager_id" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600" required>
                                        {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Mois</Label>
                                    <Input type="month" name="year_month" defaultValue={currentMonth} required className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Appels Totaux</Label>
                                    <Input type="number" name="total_calls" placeholder="Ex: 150" required min="0" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Appels Répondus</Label>
                                    <Input type="number" name="answered_calls" placeholder="Ex: 132" required min="0" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                            </div>
                            <Button type="submit" size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 rounded-lg mt-1">
                                Enregistrer les Appels
                            </Button>
                        </form>

                        {/* Workload Stats Input */}
                        <form action={saveMonthlyWorkloadAction} className="space-y-3 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                            <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Tâches & Communications</h4>
                            <div className="grid grid-cols-2 gap-2 text-xxs">
                                <div className="col-span-2">
                                    <Label className="text-zinc-400 mb-1 block">Gestionnaire</Label>
                                    <select name="manager_id" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600" required>
                                        {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Mois</Label>
                                    <Input type="month" name="year_month" defaultValue={currentMonth} required className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Communications Reçues</Label>
                                    <Input type="number" name="communications_received" placeholder="Ex: 400" required min="0" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Tâches Ouvertes</Label>
                                    <Input type="number" name="open_tasks" placeholder="Ex: 45" required min="0" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 mb-1 block">Tâches Fermées</Label>
                                    <Input type="number" name="closed_tasks" placeholder="Ex: 38" required min="0" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                            </div>
                            <Button type="submit" size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 rounded-lg mt-1">
                                Enregistrer la Charge
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
