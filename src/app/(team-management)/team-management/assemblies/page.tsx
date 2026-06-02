// @ts-nocheck
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsersRound, PlusCircle, ArrowRight, Calendar, AlertCircle } from 'lucide-react'
import { AgaTrackingSection } from '@/components/features/team-management/AgaTrackingSection'

export default async function AssembliesListPage({
    searchParams
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const supabase = await createClient()
    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    const params = await searchParams
    const currentStatus = params?.status || 'all'

    // Fetch assembly evaluations including client and manager details
    let query = supabase
        .from('assembly_evaluations')
        .select('*, clients(company_name, full_name), managers(first_name, last_name)')

    if (context.teamId) {
        query = query.in('manager_id', managerIds)
    }

    if (currentStatus === 'completed') {
        query = query.eq('status', 'completed')
    } else if (currentStatus === 'partial') {
        query = query.eq('status', 'partial')
    }

    const { data: evals } = await query.order('assembly_date', { ascending: false })

    // Fetch active syndicates/clients (with manager information)
    let clientsQuery = supabase
        .from('clients')
        .select('*, managers(first_name, last_name), contracts(start_date)')
        .eq('status', 'active')
        .order('company_name')

    if (context.teamId) {
        clientsQuery = clientsQuery.in('manager_id', managerIds)
    }

    const { data: clientsData } = await clientsQuery

    const getFollowupRange = (dateStr: string) => {
        const date = new Date(dateStr)
        const date5 = new Date(date)
        date5.setDate(date5.getDate() + 5)
        const date10 = new Date(date)
        date10.setDate(date10.getDate() + 10)
        return {
            start: date5.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }),
            end: date10.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' })
        }
    }

    const getAssemblyTypeLabel = (type?: string) => {
        switch (type) {
            case 'annual': return 'AGA'
            case 'age': return 'AGE'
            case 'agi': return 'AGI'
            case 'others': return 'Autre'
            default: return 'AGA'
        }
    }

    return (
        <div className="space-y-6 pb-12 w-full">
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

            {/* Filter Bar */}
            <div className="flex border-b border-zinc-850 pb-3 gap-2">
                <Link
                    href="/team-management/assemblies?status=all"
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        currentStatus === 'all'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Tous ({evals?.length || 0})
                </Link>
                <Link
                    href="/team-management/assemblies?status=completed"
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        currentStatus === 'completed'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Complétés ({evals?.filter(e => e.status === 'completed').length || 0})
                </Link>
                <Link
                    href="/team-management/assemblies?status=partial"
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        currentStatus === 'partial'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    À finaliser / PV en attente ({evals?.filter(e => e.status === 'partial').length || 0})
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
                                <th className="p-3">Type</th>
                                <th className="p-3">Gestionnaire</th>
                                <th className="p-3">Date Assemblée</th>
                                <th className="p-3">Statut / Échéance PV</th>
                                <th className="p-3 text-center">Score Séance</th>
                                <th className="p-3 text-center">Score Doc.</th>
                                <th className="p-3 text-center">Note Globale</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                            {(!evals || evals.length === 0) ? (
                                <tr>
                                    <td colSpan={9} className="p-4 text-center italic text-zinc-500">
                                        Aucun rapport d'évaluation trouvé.
                                    </td>
                                </tr>
                            ) : (
                                evals.map((e) => {
                                    const clientName = e.clients ? (e.clients.company_name || e.clients.full_name) : 'Copropriété inconnue'
                                    const managerName = e.managers ? `${e.managers.first_name} ${e.managers.last_name}` : 'Inconnu'
                                    
                                    // Operational criteria (technical_prep_complete is null, always excluded)
                                    const opsGraded = [e.agenda_sent_on_time, e.quorum_respected, e.voting_controlled, e.duration_reasonable].filter(s => s !== null).length
                                    const opsSum = (e.agenda_sent_on_time || 0) + (e.quorum_respected || 0) + (e.voting_controlled || 0) + (e.duration_reasonable || 0)
                                    
                                    // Leadership criteria
                                    const ldrGraded = [e.manager_controlled_room, e.discussions_on_track, e.conflict_handled_professionally, e.answers_clear_confident, e.board_confidence_level, e.financial_statement_quality].filter(s => s !== null).length
                                    const ldrSum = (e.manager_controlled_room || 0) + (e.discussions_on_track || 0) + (e.conflict_handled_professionally || 0) + (e.answers_clear_confident || 0) + (e.board_confidence_level || 0) + (e.financial_statement_quality || 0)
                                    
                                    // Documentation criteria
                                    const docGraded = [e.pv_drafted_quickly, e.templates_respected, e.resolutions_clear, e.followup_tasks_created].filter(s => s !== null).length
                                    const docSum = (e.pv_drafted_quickly || 0) + (e.templates_respected || 0) + (e.resolutions_clear || 0) + (e.followup_tasks_created || 0)
                                    
                                    const gradedCount = opsGraded + ldrGraded + docGraded
                                    const totalPoints = opsSum + ldrSum + docSum
                                    const maxPoints = gradedCount * 5
                                    const scorePct = gradedCount > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0

                                    const scoreColor = 
                                        scorePct >= 90 ? 'text-emerald-400 font-bold' :
                                        scorePct >= 75 ? 'text-blue-400 font-bold' :
                                        scorePct >= 60 ? 'text-amber-400 font-bold' :
                                        'text-rose-500 font-bold'

                                    const isPartial = e.status === 'partial'
                                    const range = getFollowupRange(e.assembly_date)

                                    return (
                                        <tr key={e.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-zinc-200">
                                                {clientName}
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                <Badge variant="outline" className="text-[8px] bg-zinc-950 text-zinc-400 border-zinc-800">
                                                    {getAssemblyTypeLabel(e.assembly_type)}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                {managerName}
                                            </td>
                                            <td className="p-3 text-zinc-300 font-mono">
                                                {new Date(e.assembly_date).toLocaleDateString('fr-CA')}
                                            </td>
                                            <td className="p-3 text-zinc-300">
                                                {isPartial ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-800/40 w-fit text-[8px] px-1 py-0 h-4">
                                                            À finaliser (PV)
                                                        </Badge>
                                                        <span className="text-[8px] text-zinc-500 flex items-center gap-1 font-semibold mt-0.5">
                                                            <Calendar className="h-2.5 w-2.5 text-amber-500" />
                                                            Suivi: {range.start} au {range.end}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-800/40 text-[8px] px-1 py-0 h-4">
                                                        Complété
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-zinc-300 font-semibold">
                                                {opsGraded > 0 ? `${opsSum + ldrSum} / ${(opsGraded + ldrGraded) * 5}` : '-'}
                                            </td>
                                            <td className="p-3 text-center text-zinc-300 font-semibold">
                                                {docGraded > 0 ? `${docSum} / ${docGraded * 5}` : '--'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={scoreColor}>{scorePct}%</span>
                                                    {isPartial && <span className="text-[7px] text-zinc-550 font-bold uppercase">(Partiel)</span>}
                                                </div>
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

            {/* Section Suivi des AGA */}
            <div className="mt-8">
                <AgaTrackingSection clients={(clientsData || []) as any} />
            </div>
        </div>
    )
}
