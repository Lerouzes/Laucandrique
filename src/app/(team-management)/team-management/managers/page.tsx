import { getManagerStats } from '@/actions/team-management'
import { createClient } from '@/utils/supabase/server'
import { getManagers } from '@/actions/managers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { recordLostSyndicateAction, recordPackageChangeAction, recordNewSyndicateAction } from '@/actions/team-management'
import { SearchableClientSelect } from '@/components/features/team-management/SearchableClientSelect'
import { SearchableManagerSelect } from '@/components/features/team-management/SearchableManagerSelect'
import Link from 'next/link'
import { 
    UserCheck, 
    Network, 
    Building2, 
    DoorOpen, 
    DollarSign, 
    BarChart3, 
    AlertTriangle, 
    Handshake, 
    PlusCircle,
    UserMinus,
    ArrowRightLeft,
    TrendingUp,
    ArrowRight
} from 'lucide-react'

export default async function ManagersControlTowerPage() {
    const supabase = await createClient()
    const { getActiveTeamContext } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()

    // 1. Get managers
    const managersList = await getManagers()
    const managerIds = managersList.map(m => m.id)

    // 2. Compute stats for each manager in parallel
    const managerStatsList = (await Promise.all(
        managersList.map(m => getManagerStats(m.id))
    )).filter((s): s is NonNullable<typeof s> => s !== null)

    // 3. Get all active syndicates/clients for loss and package actions
    let clientsQuery = supabase
        .from('clients')
        .select('*')

    if (context.teamId) {
        clientsQuery = clientsQuery.in('manager_id', managerIds)
    }

    const { data: clients } = await clientsQuery.order('company_name')

    const activeClients = (clients || []).filter(c => c.status === 'active' || !c.status)

    // 4. Get all teams
    const { data: teams } = await supabase
        .from('manager_teams')
        .select('*')
        .order('name')

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-purple-400" />
                        Tour de Contrôle des Gestionnaires
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Suivi en temps réel des charges, de l'état des portefeuilles et de la performance globale.
                    </p>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-3 bg-zinc-950/20">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                        Actions Rapides de Portefeuille
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Déclarer des mouvements de contrats, pertes de mandats ou nouveaux mandats clients.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Record New Syndicate */}
                    <form action={recordNewSyndicateAction} className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-xxs font-bold text-emerald-400 uppercase tracking-wider">
                            <PlusCircle className="h-4 w-4" />
                            Nouveau Syndicat
                        </div>
                        <div className="space-y-2 text-xxs">
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Nom du Syndicat (ex: SDC Rue Saint-Denis)</Label>
                                <Input type="text" name="company_name" required placeholder="SDC..." className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                            </div>
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Adresse physique</Label>
                                <Input type="text" name="address" required placeholder="Adresse..." className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Représentant</Label>
                                    <Input type="text" name="full_name" required placeholder="Conseil..." className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Nombre de Portes</Label>
                                    <Input type="number" name="doors_count" required defaultValue="10" min="1" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                    <Label className="text-zinc-500 mb-0.5 block">Gestionnaire</Label>
                                    <SearchableManagerSelect
                                        managers={managersList}
                                        name="manager_id"
                                        placeholder="Sélectionner..."
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Forfait Contrat</Label>
                                    <select name="package_name" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-xs" required>
                                        <option value="Bronze">Bronze</option>
                                        <option value="Argent">Argent</option>
                                        <option value="Argent+">Argent+</option>
                                        <option value="Or">Or</option>
                                        <option value="Platinum">Platinum</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Frais Mensuels ($)</Label>
                                <Input type="number" name="monthly_fee" step="0.01" required placeholder="ex: 350.00" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                            </div>
                        </div>
                        <Button type="submit" size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 rounded-lg mt-1">
                            Créer et Assigner le Mandat
                        </Button>
                    </form>

                    {/* Record Lost Syndicate */}
                    <form action={recordLostSyndicateAction} className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-xxs font-bold text-rose-400 uppercase tracking-wider">
                            <UserMinus className="h-4 w-4" />
                            Déclarer la Perte d'un Mandat
                        </div>
                        <div className="space-y-2 text-xxs">
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Syndicat Perdu</Label>
                                <SearchableClientSelect 
                                    clients={activeClients.map(c => ({ 
                                        id: c.id, 
                                        name: c.company_name || c.full_name,
                                        sdc: c.full_name || undefined
                                    }))}
                                    name="client_id"
                                    placeholder="Sélectionner le syndicat..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Date de Départ</Label>
                                    <Input type="date" name="departure_date" required className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Relation Conseil</Label>
                                    <select name="board_relationship_score" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-xs" required>
                                        <option value="5">5/5 - Excellente</option>
                                        <option value="4">4/5 - Bonne</option>
                                        <option value="3">3/5 - Neutre</option>
                                        <option value="2">2/5 - Difficile</option>
                                        <option value="1">1/5 - Conflictuelle</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Motif de Départ</Label>
                                <select name="reason_category" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-xs" required>
                                    <option value="Poor communication">Communication insuffisante</option>
                                    <option value="Lack of follow-up">Manque de suivi</option>
                                    <option value="Financial dissatisfaction">Mécontentement financier</option>
                                    <option value="Personality conflict">Conflit de personnalité</option>
                                    <option value="Pricing">Tarifs de gestion</option>
                                    <option value="Governance issues">Gouvernance difficile</option>
                                    <option value="Delays">Délais de traitement</option>
                                    <option value="Lack of presence">Manque de présence physique</option>
                                    <option value="Board politics">Politique interne du CA</option>
                                    <option value="Major incident mishandled">Incident majeur mal géré</option>
                                    <option value="Company reputation">Réputation de l'entreprise</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Concurrent Repreneur (si connu)</Label>
                                <Input type="text" name="competitor" placeholder="Concurrent..." className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="preventable" id="preventable" value="true" defaultChecked className="rounded border-zinc-800 text-purple-600" />
                                <Label htmlFor="preventable" className="text-zinc-400">Départ Évitable</Label>
                            </div>
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Cause Racine / Détails</Label>
                                <Textarea name="root_cause" required placeholder="Détails..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                        </div>
                        <Button type="submit" size="sm" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8 rounded-lg mt-1">
                            Enregistrer la Perte du Mandat
                        </Button>
                    </form>

                    {/* Record Package Upgrade/Downgrade */}
                    <form action={recordPackageChangeAction} className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-xxs font-bold text-purple-400 uppercase tracking-wider">
                            <ArrowRightLeft className="h-4 w-4" />
                            Ajuster un Forfait Client
                        </div>
                        <div className="space-y-2 text-xxs">
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Syndicat / Copropriété</Label>
                                <SearchableClientSelect 
                                    clients={activeClients.map(c => ({ 
                                        id: c.id, 
                                        name: c.company_name || c.full_name,
                                        sdc: c.full_name || undefined
                                    }))}
                                    name="client_id"
                                    placeholder="Sélectionner le syndicat..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Nouveau Forfait</Label>
                                    <select name="new_package" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-xs" required>
                                        <option value="Bronze">Bronze</option>
                                        <option value="Argent">Argent</option>
                                        <option value="Argent+">Argent+</option>
                                        <option value="Or">Or</option>
                                        <option value="Platinum">Platinum</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-zinc-500 mb-0.5 block">Nouveaux Frais ($)</Label>
                                    <Input type="number" name="monthly_fee" step="0.01" required placeholder="ex: 450.00" className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-500 mb-0.5 block">Notes explicatives</Label>
                                <Textarea name="notes" placeholder="Notes sur le changement..." rows={3} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                        </div>
                        <Button type="submit" size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 rounded-lg mt-1">
                            Enregistrer l'Ajustement
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Managers Table List */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white">Tableau des indicateurs par Gestionnaire</CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Liste consolidée des données de charge, performance, alertes et MRR des gestionnaires.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-xxs text-zinc-300">
                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                                <th className="p-3">Nom</th>
                                <th className="p-3">Équipe</th>
                                <th className="p-3 text-center">Syndicats</th>
                                <th className="p-3 text-center">Portes</th>
                                <th className="p-3 text-right">Revenue (MRR)</th>
                                <th className="p-3 text-center">Charge (Index)</th>
                                <th className="p-3 text-center">Performance</th>
                                <th className="p-3 text-center">Niveau Risque</th>
                                <th className="p-3 text-center">Rencontre 1v1</th>
                                <th className="p-3 text-right">Détail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                            {managerStatsList.map((m) => {
                                const workloadColor = 
                                    m.workloadIndex > 120 ? 'text-rose-400 font-bold' :
                                    m.workloadIndex > 80 ? 'text-amber-400' : 'text-emerald-400'

                                const performanceColor = 
                                    m.performanceScore > 85 ? 'text-purple-400 font-bold' :
                                    m.performanceScore > 70 ? 'text-zinc-200' : 'text-rose-400'

                                const riskBadge = 
                                    m.riskLevel === 'Critique' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                                    m.riskLevel === 'Élevé' ? 'bg-amber-500/20 text-amber-400 border-amber-800/40' :
                                    m.riskLevel === 'Modéré' ? 'bg-blue-500/20 text-blue-400 border-blue-800/40' :
                                    'bg-emerald-500/20 text-emerald-400 border-emerald-800/40'

                                return (
                                    <tr key={m.manager.id} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-3 font-bold text-zinc-100">
                                            {m.manager.first_name} {m.manager.last_name}
                                        </td>
                                        <td className="p-3 text-zinc-400">
                                            {m.manager.manager_teams?.name || 'Aucune'}
                                        </td>
                                        <td className="p-3 text-center font-bold">{m.syndicatesCount}</td>
                                        <td className="p-3 text-center">{m.doorsCount}</td>
                                        <td className="p-3 text-right text-emerald-400 font-semibold">
                                            ${m.mrr.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={workloadColor}>{m.workloadIndex}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={performanceColor}>{m.performanceScore}%</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <Badge variant="outline" className={`text-[8px] font-bold ${riskBadge}`}>
                                                {m.riskLevel}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-center text-zinc-400 font-mono">
                                            {m.lastOneOnOneDate ? new Date(m.lastOneOnOneDate).toLocaleDateString('fr-CA') : 'Aucun'}
                                        </td>
                                        <td className="p-3 text-right">
                                            <Link 
                                                href={`/team-management/managers/${encodeURIComponent(m.manager.last_name)}`}
                                                className="text-purple-400 hover:text-purple-300 font-bold hover:underline inline-flex items-center gap-1"
                                            >
                                                Voir
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
