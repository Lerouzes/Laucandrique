import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsersRound, PlusCircle, ArrowRight, Calendar } from 'lucide-react'

export default async function AssembliesListPage() {
    const supabase = await createClient()
    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    // Fetch assembly evaluations including client and manager details
    let query = supabase
        .from('assembly_evaluations')
        .select('*, clients(company_name, full_name), managers(first_name, last_name)')

    if (context.teamId) {
        query = query.in('manager_id', managerIds)
    }

    const { data: evals } = await query.order('assembly_date', { ascending: false })

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <UsersRound className="h-5 w-5 text-purple-400" />
                        Évaluations des Assemblées Générales
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Suivi de la tenue, de la direction de salle et de la production documentaire post-assemblée.
                    </p>
                </div>
                <Link
                    href="/team-management/assemblies/new"
                    className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 px-4 shadow-lg transition-all"
                >
                    <PlusCircle className="h-4 w-4" />
                    Évaluer Assemblée
                </Link>
            </div>

            {/* List */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white">Rapports d'Évaluation d'Assemblées</CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Liste de toutes les assemblées évaluées.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-xxs text-zinc-300">
                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                                <th className="p-3">Copropriété</th>
                                <th className="p-3">Gestionnaire Responsable</th>
                                <th className="p-3">Date Assemblée</th>
                                <th className="p-3 text-center">Score Opérationnel</th>
                                <th className="p-3 text-center">Score Leadership</th>
                                <th className="p-3 text-center">Score Documentaire</th>
                                <th className="p-3 text-center">Note Globale</th>
                                <th className="p-3 text-right">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                            {(!evals || evals.length === 0) ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center italic text-zinc-500">
                                        Aucun rapport d'évaluation enregistré.
                                    </td>
                                </tr>
                            ) : (
                                evals.map((e) => {
                                    const clientName = e.clients ? (e.clients.company_name || e.clients.full_name) : 'Copropriété inconnue'
                                    const managerName = e.managers ? `${e.managers.first_name} ${e.managers.last_name}` : 'Inconnu'
                                    
                                    const opsSum = (e.agenda_sent_on_time || 0) + (e.quorum_respected || 0) + (e.voting_controlled || 0) + (e.duration_reasonable || 0) + (e.technical_prep_complete || 0)
                                    const ldrSum = (e.manager_controlled_room || 0) + (e.discussions_on_track || 0) + (e.conflict_handled_professionally || 0) + (e.answers_clear_confident || 0) + (e.board_confidence_level || 0) + (e.financial_statement_quality || 0)
                                    const docSum = (e.pv_drafted_quickly || 0) + (e.templates_respected || 0) + (e.resolutions_clear || 0) + (e.followup_tasks_created || 0)
                                    
                                    const totalPoints = opsSum + ldrSum + docSum
                                    const maxPoints = 15 * 5 // 75 max points
                                    const scorePct = Math.round((totalPoints / maxPoints) * 100)

                                    const scoreColor = 
                                        scorePct >= 90 ? 'text-emerald-400 font-bold' :
                                        scorePct >= 75 ? 'text-blue-400 font-bold' :
                                        scorePct >= 60 ? 'text-amber-400 font-bold' :
                                        'text-rose-500 font-bold'

                                    return (
                                        <tr key={e.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-zinc-200">
                                                {clientName}
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                {managerName}
                                            </td>
                                            <td className="p-3 text-zinc-300 font-mono">
                                                {new Date(e.assembly_date).toLocaleDateString('fr-CA')}
                                            </td>
                                            <td className="p-3 text-center text-zinc-300 font-semibold">{opsSum} / 25</td>
                                            <td className="p-3 text-center text-zinc-300 font-semibold">{ldrSum} / 30</td>
                                            <td className="p-3 text-center text-zinc-300 font-semibold">{docSum} / 20</td>
                                            <td className="p-3 text-center">
                                                <span className={scoreColor}>{scorePct}%</span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Link
                                                    href={`/team-management/assemblies/${e.id}`}
                                                    className="text-purple-400 hover:text-purple-300 font-bold hover:underline inline-flex items-center gap-1"
                                                >
                                                    Fiche
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
