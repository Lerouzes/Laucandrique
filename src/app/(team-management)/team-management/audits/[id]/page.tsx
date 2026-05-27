import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardCheck, Calendar, User, ArrowLeft, Star, FileText } from 'lucide-react'

const QUESTION_LABELS: Record<string, string> = {
    registre_coproprietaires: 'Registre des documents complets',
    convocations_assemblee: 'Convocations d\'assemblées conformes',
    reglement_immeuble: 'Règlements de l\'immeuble respectés',
    proces_verbaux: 'Procès-verbaux rédigés et archivés',
    contrats_fournisseurs: 'Contrats de fournisseurs signés et classés',
    budget_annuel: 'Budget annuel voté et respecté',
    fonds_prevoyance: 'Fonds de prévoyance (étude + cotisations) conforme',
    conciliation_bancaire: 'Conciliations bancaires mensuelles complétées',
    perception_charges: 'Perception des charges et gestion des retards',
    etats_financiers: 'États financiers de fin d\'année à jour',
    carnet_entretien: 'Carnet d\'entretien de l\'immeuble à jour',
    inspections_preventives: 'Inspections préventives complétées et consignées',
    sinistres_assurance: 'Suivi rigoureux des sinistres et réclamations',
    appels_offres: 'Appels d\'offres conformes pour grands travaux'
}

export default async function AuditDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch audit details
    const { data: audit } = await supabase
        .from('syndicate_audits')
        .select('*, clients(id, company_name, full_name, managers(first_name, last_name))')
        .eq('id', id)
        .single()

    if (!audit) {
        notFound()
    }

    // 2. Fetch answers
    const { data: answers } = await supabase
        .from('syndicate_audit_answers')
        .select('*')
        .eq('audit_id', id)

    const clientName = audit.clients ? (audit.clients.company_name || audit.clients.full_name) : 'Copropriété inconnue'
    const managerName = audit.clients?.managers ? `${audit.clients.managers.first_name} ${audit.clients.managers.last_name}` : 'Non assigné'
    const score = Number(audit.health_score || 0)

    const getHealthBadge = (s: number) => {
        if (s >= 90) return 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40'
        if (s >= 75) return 'bg-blue-500/20 text-blue-400 border-blue-800/40'
        if (s >= 60) return 'bg-amber-500/20 text-amber-400 border-amber-800/40'
        return 'bg-rose-500/20 text-rose-400 border-rose-800/40'
    }

    const getHealthLabel = (s: number) => {
        if (s >= 90) return 'Excellent'
        if (s >= 75) return 'Stable'
        if (s >= 60) return 'À Risque'
        return 'Critique'
    }

    // Group answers by category
    const govAnswers = (answers || []).filter(a => a.category === 'governance')
    const finAnswers = (answers || []).filter(a => a.category === 'financial')
    const opAnswers = (answers || []).filter(a => a.category === 'operations')

    return (
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
            {/* Back button */}
            <div>
                <Link
                    href="/team-management/audits"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Retour aux Audits
                </Link>
            </div>

            {/* Header / Summary Card */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <ClipboardCheck className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase">{clientName}</h2>
                        <p className="text-[10px] text-zinc-400">
                            Gestionnaire responsable : <strong className="text-zinc-300">{managerName}</strong> · 
                            Audit du {audit.audit_date ? new Date(audit.audit_date).toLocaleDateString('fr-CA') : 'Inconnue'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[8px] uppercase font-bold text-zinc-500 block">Indice de Santé</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-extrabold text-white">{Math.round(score)}%</span>
                            <Badge variant="outline" className={`text-[8px] font-bold ${getHealthBadge(score)}`}>
                                {getHealthLabel(score)}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Global Notes */}
            {audit.notes && (
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Observations globales de l'auditeur</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xxs text-zinc-300 leading-relaxed font-semibold">
                        {audit.notes}
                    </CardContent>
                </Card>
            )}

            {/* Scorecard grids by category */}
            {([
                { key: 'gov', title: 'Gouvernance & Conformité Juridique', list: govAnswers },
                { key: 'fin', title: 'Santé Financière & Budgets', list: finAnswers },
                { key: 'op', title: 'Opérations & Maintenance', list: opAnswers }
            ]).filter(cat => cat.list.length > 0).map(cat => (
                <Card key={cat.key} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                            {cat.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {cat.list.length === 0 ? (
                            <p className="text-xxs italic text-zinc-500">Aucune évaluation enregistrée pour cette catégorie.</p>
                        ) : (
                            cat.list.map(ans => {
                                const questionText = QUESTION_LABELS[ans.question_key] || ans.question_key
                                return (
                                    <div key={ans.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0 text-xxs">
                                        <div className="md:col-span-5 font-semibold text-zinc-200">
                                            {questionText}
                                        </div>
                                        <div className="md:col-span-3 flex items-center gap-1.5">
                                            <div className="flex text-purple-400">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star 
                                                        key={i} 
                                                        className={`h-3 w-3 ${i < (ans.score || 0) ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                    />
                                                ))}
                                            </div>
                                            <span className="font-bold text-zinc-300">{(ans.score || 0)}/5</span>
                                        </div>
                                        <div className="md:col-span-4 text-[10px] text-zinc-400 italic">
                                            {ans.note || '-'}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
