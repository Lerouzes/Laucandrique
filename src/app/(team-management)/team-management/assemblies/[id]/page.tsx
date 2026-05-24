import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsersRound, ArrowLeft, Star, FileText } from 'lucide-react'

const CRITERIA_LABELS: Record<string, string> = {
    agenda_sent_on_time: 'Ordre du jour envoyé dans les délais (Convocations)',
    quorum_respected: 'Quorum atteint et respect des règles d\'ouverture',
    voting_controlled: 'Gestion et contrôle des votes/procurations',
    duration_reasonable: 'Durée de la séance raisonnable et efficace',
    technical_prep_complete: 'Préparation technique complète (plateforme/salle)',
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

    const clientName = evalData.clients ? (evalData.clients.company_name || evalData.clients.full_name) : 'Copropriété inconnue'
    const managerName = evalData.managers ? `${evalData.managers.first_name} ${evalData.managers.last_name}` : 'Inconnu'
    
    const opsSum = evalData.agenda_sent_on_time + evalData.quorum_respected + evalData.voting_controlled + evalData.duration_reasonable + evalData.technical_prep_complete
    const ldrSum = evalData.manager_controlled_room + evalData.discussions_on_track + evalData.conflict_handled_professionally + evalData.answers_clear_confident + evalData.board_confidence_level + evalData.financial_statement_quality
    const docSum = evalData.pv_drafted_quickly + evalData.templates_respected + evalData.resolutions_clear + evalData.followup_tasks_created
    
    const totalPoints = opsSum + ldrSum + docSum
    const maxPoints = 15 * 5 // 75 max points
    const scorePct = Math.round((totalPoints / maxPoints) * 100)

    const scoreColor = 
        scorePct >= 90 ? 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20' :
        scorePct >= 75 ? 'text-blue-400 border-blue-800/40 bg-blue-950/20' :
        scorePct >= 60 ? 'text-amber-400 border-amber-800/40 bg-amber-950/20' :
        'text-rose-400 border-rose-800/40 bg-rose-950/20'

    const opQuestions = [
        { key: 'agenda_sent_on_time', val: evalData.agenda_sent_on_time },
        { key: 'quorum_respected', val: evalData.quorum_respected },
        { key: 'voting_controlled', val: evalData.voting_controlled },
        { key: 'duration_reasonable', val: evalData.duration_reasonable },
        { key: 'technical_prep_complete', val: evalData.technical_prep_complete }
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

    return (
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
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
                        <h2 className="text-sm font-bold text-white uppercase">{clientName}</h2>
                        <p className="text-[10px] text-zinc-400">
                            Gestionnaire : <strong className="text-zinc-300">{managerName}</strong> · 
                            Séance du {new Date(evalData.assembly_date).toLocaleDateString('fr-CA')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[8px] uppercase font-bold text-zinc-500 block">Score Global</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-extrabold text-white">{scorePct}%</span>
                            <Badge variant="outline" className={`text-[8px] font-bold px-2 py-0.5 ${scoreColor}`}>
                                {totalPoints} / {maxPoints} points
                            </Badge>
                        </div>
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
                { title: 'Opérationnel (Sur 25 points)', list: opQuestions, score: opsSum },
                { title: 'Leadership & Animation (Sur 30 points)', list: ldrQuestions, score: ldrSum },
                { title: 'Documentation & Suivis (Sur 20 points)', list: docQuestions, score: docSum }
            ].map((sect, idx) => (
                <Card key={idx} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                            {sect.title}
                        </CardTitle>
                        <Badge variant="outline" className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[9px]">
                            {sect.score} / {sect.list.length * 5} pts
                        </Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-xxs">
                        {sect.list.map(c => {
                            const label = CRITERIA_LABELS[c.key] || c.key
                            return (
                                <div key={c.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0">
                                    <div className="md:col-span-8 font-semibold text-zinc-200">
                                        {label}
                                    </div>
                                    <div className="md:col-span-4 flex items-center gap-2 justify-end md:justify-start">
                                        <div className="flex text-purple-400">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`h-3.5 w-3.5 ${i < c.val ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="font-bold text-zinc-300">{c.val}/5</span>
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
