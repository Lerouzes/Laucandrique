// @ts-nocheck
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsersRound, ArrowLeft, Star, FileText, Calendar } from 'lucide-react'
import { DeleteAssemblyButton } from '@/components/features/team-management/DeleteAssemblyButton'

const CRITERIA_LABELS: Record<string, string> = {
    agenda_sent_on_time: 'Ordre du jour envoyé dans les délais (Convocations)',
    quorum_respected: 'Quorum atteint et respect des règles d\'ouverture',
    voting_controlled: 'Gestion et contrôle des votes/procurations',
    duration_reasonable: 'Durée de la séance raisonnable et efficace',
    manager_controlled_room: 'Contrôle et gestion de la salle par le gestionnaire',
    discussions_on_track: 'Maintien des discussions autour de l\'ordre du jour',
    conflict_handled_professionally: 'Gestion professionnelle des conflits et tensions',
    answers_clear_confident: 'Réponses claires, précises et assurées',
    board_confidence_level: 'Niveau de confiance témoigné par le CA',
    financial_statement_quality: 'Qualité et clarté de la présentation financière',
    pv_drafted_quickly: 'Procès-verbal rédigé dans les délais requis',
    templates_respected: 'Respect des gabarits standardisés Laucandrique',
    resolutions_clear: 'Formulation claire des résolutions votées',
    followup_tasks_created: 'Création des tâches de suivi post-assemblée'
}

export default async function AssemblyDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch assembly details
    const { data: evalData } = await supabase
        .from('assembly_evaluations')
        .select('*, clients(company_name, full_name), managers(first_name, last_name)')
        .eq('id', id)
        .single()

    if (!evalData) {
        notFound()
    }

    // Get current user role
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    let userRole = 'Operations'
    if (currentUser) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()
        userRole = profile?.role || 'Operations'
    }

    const canEdit = userRole === 'Master' || userRole === 'Direction' || userRole === 'Managers'
    const canDelete = userRole === 'Master' || userRole === 'Direction'

    const clientName = evalData.clients ? (evalData.clients.company_name || evalData.clients.full_name) : 'Copropriété inconnue'
    const managerName = evalData.managers ? `${evalData.managers.first_name} ${evalData.managers.last_name}` : 'Inconnu'
    
    // Operational criteria (technical_prep_complete always excluded)
    const opQuestions = [
        { key: 'agenda_sent_on_time', val: evalData.agenda_sent_on_time },
        { key: 'quorum_respected', val: evalData.quorum_respected },
        { key: 'voting_controlled', val: evalData.voting_controlled },
        { key: 'duration_reasonable', val: evalData.duration_reasonable }
    ]

    const ldrQuestions = [
        { key: 'manager_controlled_room', val: evalData.manager_controlled_room },
        { key: 'discussions_on_track', val: evalData.discussions_on_track },
        { key: 'conflict_handled_professionally', val: evalData.conflict_handled_professionally },
        { key: 'answers_clear_confident', val: evalData.answers_clear_confident },
        { key: 'board_confidence_level', val: evalData.board_confidence_level },
        { key: 'financial_statement_quality', val: evalData.financial_statement_quality }
    ]

    const docQuestions = [
        { key: 'pv_drafted_quickly', val: evalData.pv_drafted_quickly },
        { key: 'templates_respected', val: evalData.templates_respected },
        { key: 'resolutions_clear', val: evalData.resolutions_clear },
        { key: 'followup_tasks_created', val: evalData.followup_tasks_created }
    ]

    const opsGraded = opQuestions.filter(q => q.val !== null && q.val !== undefined).length
    const opsSum = opQuestions.reduce((acc, q) => acc + (q.val || 0), 0)

    const ldrGraded = ldrQuestions.filter(q => q.val !== null && q.val !== undefined).length
    const ldrSum = ldrQuestions.reduce((acc, q) => acc + (q.val || 0), 0)

    const docGraded = docQuestions.filter(q => q.val !== null && q.val !== undefined).length
    const docSum = docQuestions.reduce((acc, q) => acc + (q.val || 0), 0)
    
    const gradedCount = opsGraded + ldrGraded + docGraded
    const totalPoints = opsSum + ldrSum + docSum
    const maxPoints = gradedCount * 5
    const scorePct = gradedCount > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0

    const scoreColor = 
        scorePct >= 90 ? 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20' :
        scorePct >= 75 ? 'text-blue-400 border-blue-800/40 bg-blue-950/20' :
        scorePct >= 60 ? 'text-amber-400 border-amber-800/40 bg-amber-950/20' :
        'text-rose-400 border-rose-800/40 bg-rose-950/20'

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
            case 'annual': return 'AGA - Mandatoire'
            case 'age': return 'AGE - Extraordinaire'
            case 'agi': return 'AGI - Informative'
            case 'others': return 'Autre'
            default: return 'AGA - Mandatoire'
        }
    }

    const range = getFollowupRange(evalData.assembly_date)

    return (
        <div className="space-y-6 pb-12 w-full">
            {/* Back button */}
            <div>
                <Link
                    href="/team-management/assemblies"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Retour aux Assemblées
                </Link>
            </div>

            {/* Header Summary */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <UsersRound className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2 flex-wrap">
                            {clientName}
                            <Badge variant="outline" className="text-[8px] bg-zinc-950 text-zinc-400 border-zinc-800 uppercase font-mono">
                                {getAssemblyTypeLabel(evalData.assembly_type)}
                            </Badge>
                        </h2>
                        <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-3 gap-y-1 items-center mt-1">
                            <span>Gestionnaire : <strong className="text-zinc-300">{managerName}</strong></span>
                            <span>·</span>
                            <span>Séance du {new Date(evalData.assembly_date).toLocaleDateString('fr-CA')}</span>
                            <span>·</span>
                            {evalData.status === 'partial' ? (
                                <div className="flex items-center gap-1.5">
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-800/40 text-[7px] px-1 py-0 h-4 uppercase font-bold">
                                        À finaliser (PV)
                                    </Badge>
                                    <span className="text-[8.5px] text-zinc-500 font-semibold flex items-center gap-0.5">
                                        <Calendar className="h-2.5 w-2.5 text-amber-500" />
                                        Échéance PV: {range.start} au {range.end}
                                    </span>
                                </div>
                            ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-800/40 text-[7px] px-1 py-0 h-4 uppercase font-bold">
                                    Complété
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-left sm:text-right">
                        <span className="text-[8px] uppercase font-bold text-zinc-500 block">Score Global ({gradedCount}/14 critères)</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-extrabold text-white">{gradedCount > 0 ? `${scorePct}%` : '-'}</span>
                            <Badge variant="outline" className={`text-[8px] font-bold px-2 py-0.5 ${scoreColor}`}>
                                {totalPoints} / {maxPoints} points
                            </Badge>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <Link
                                href={`/team-management/assemblies/${evalData.id}/edit`}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5 shadow-md transition-all border border-purple-800/40"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Modifier
                            </Link>
                        )}
                        {canDelete && (
                            <DeleteAssemblyButton assemblyId={evalData.id} />
                        )}
                    </div>
                </div>
            </div>

            {/* Notes & Recommendations */}
            {(evalData.notes || evalData.recommendations) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xxs text-zinc-300">
                    {evalData.notes && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Notes & Commentaires</CardTitle>
                            </CardHeader>
                            <CardContent className="leading-relaxed whitespace-pre-wrap font-semibold">
                                {evalData.notes}
                            </CardContent>
                        </Card>
                    )}
                    {evalData.recommendations && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Recommandations d'Amélioration</CardTitle>
                            </CardHeader>
                            <CardContent className="leading-relaxed text-purple-400 whitespace-pre-wrap font-semibold">
                                {evalData.recommendations}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Detailed Scores */}
            {[
                { title: '1. Séance - Critères Opérationnels (Sur 20 points)', list: opQuestions, score: opsSum, max: 20 },
                { title: '2. Séance - Critères de Leadership (Sur 30 points)', list: ldrQuestions, score: ldrSum, max: 30 },
                { title: '3. Documentation & Suivis - 5 à 10 jours après (Sur 20 points)', list: docQuestions, score: docSum, max: 20 }
            ].map((sect, idx) => (
                <Card key={idx} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                            {sect.title}
                        </CardTitle>
                        <Badge variant="outline" className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[9px]">
                            {sect.score} / {sect.max} pts
                        </Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-xxs">
                        {sect.list.map(c => {
                            const label = CRITERIA_LABELS[c.key] || c.key
                            const itemNotes = (evalData.item_notes as Record<string, string> | null) || {}
                            const note = itemNotes[c.key]
                            return (
                                <div key={c.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0">
                                    <div className="md:col-span-8 font-semibold text-zinc-200">
                                        <div>{label}</div>
                                        {note && <div className="text-[10px] text-zinc-400 italic mt-1 font-normal bg-zinc-950/20 p-1.5 rounded border border-zinc-900/60 max-w-lg">Remarque: {note}</div>}
                                    </div>
                                    <div className="md:col-span-4 flex items-center gap-2 justify-end md:justify-start pt-1">
                                        {c.val !== null && c.val !== undefined ? (
                                            <>
                                                <div className="flex text-purple-400">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`h-3.5 w-3.5 ${i < c.val! ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-bold text-zinc-300">{c.val}/5</span>
                                            </>
                                        ) : (
                                            <Badge className="bg-zinc-800/40 text-zinc-500 border border-zinc-800 text-[8px]">À venir / Non évalué</Badge>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
