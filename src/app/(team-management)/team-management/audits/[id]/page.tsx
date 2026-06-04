// @ts-nocheck
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    ClipboardCheck, 
    Calendar, 
    User, 
    ArrowLeft, 
    Star, 
    Activity, 
    Building2, 
    DollarSign,
    CheckCircle,
    TrendingUp,
    MessageSquare,
    CheckSquare
} from 'lucide-react'
import { DeleteAuditButton } from '@/components/features/team-management/DeleteAuditButton'
import { AuditTasksSection } from '@/components/features/team-management/AuditTasksSection'

const QUESTION_LABELS: Record<string, string> = {
    // Governance
    contrats_condo_web: 'Tous les contrats sont-ils sur Condo Web ?',
    rapports_maintenance: 'Tous les rapports de Laucandrique Maintenance sont-ils présents ?',
    proces_verbaux_ca: 'Les procès-verbaux des CA sont-ils présents ?',
    proces_verbaux_assemblees: 'Les procès-verbaux des assemblées sont-ils présents ?',
    
    // Financial Last Year
    respect_franchise_assurance_last: 'Respect de la franchise d\'assurance',
    fonds_prevoyance_last: 'Fonds de prévoyance (étude + cotisations) conforme',
    qualite_budget_cree_last: 'Qualité du budget créé',
    
    // Financial Current Year
    respect_franchise_assurance_curr: 'Respect de la franchise d\'assurance',
    fonds_prevoyance_curr: 'Fonds de prévoyance (étude + cotisations) conforme',
    qualite_budget_cree_curr: 'Qualité du budget créé',

    // Older / Backward Compatibility
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
    appels_offres: 'Appels d\'offres conformes pour grands travaux',
    qualite_budget_cree: 'Qualité du budget créé'
}

const STACKED_FINANCIAL_KEYS = [
    'respect_franchise_assurance_last',
    'fonds_prevoyance_last',
    'qualite_budget_cree_last',
    'financial_year_target_last',
    'respect_postes_budgetaires_score_last',
    'total_budget_items_last',
    'exceeded_budget_items_last',
    'unrealized_budget_items_last',
    'unplanned_budget_items_last',
    'respect_franchise_assurance_curr',
    'fonds_prevoyance_curr',
    'qualite_budget_cree_curr',
    'financial_year_target_curr',
    'respect_postes_budgetaires_score_curr',
    'total_budget_items_curr',
    'exceeded_budget_items_curr',
    'unrealized_budget_items_curr',
    'unplanned_budget_items_curr'
]

export default async function AuditDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch current user context for role check
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const isMaster = profile?.role === 'Master'

    // 2. Fetch audit details with contracts, doors, manager details
    const { data: audit } = await supabase
        .from('syndicate_audits')
        .select(`
            *, 
            clients(
                id, 
                company_name, 
                full_name, 
                manager_assigned_at, 
                created_at, 
                manager_id, 
                contracts(*), 
                doors(id), 
                managers(id, first_name, last_name)
            ), 
            profiles:audited_by(full_name)
        `)
        .eq('id', id)
        .single()

    if (!audit) {
        notFound()
    }

    // 3. Fetch answers
    const { data: answers } = await supabase
        .from('syndicate_audit_answers')
        .select('*')
        .eq('audit_id', id)

    // 4. Fetch workload history
    const { data: workloads } = await supabase
        .from('syndicate_workload')
        .select('*')
        .eq('client_id', audit.client_id)
        .order('year', { ascending: false })
        .order('month', { ascending: true, nullsFirst: true })

    const client = audit.clients
    const clientName = client ? (client.company_name || client.full_name) : 'Copropriété inconnue'
    const managerName = client?.managers ? `${client.managers.first_name} ${client.managers.last_name}` : 'Non assigné'
    const managerId = client?.managers?.id || null
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

    // Helper map of answers for easy lookup
    const scoresMap: Record<string, number> = {}
    const notesMap: Record<string, string> = {}
    ;(answers || []).forEach(ans => {
        scoresMap[ans.question_key] = ans.score
        notesMap[ans.question_key] = ans.note || ''
    })

    // Group answers
    const govAnswers = (answers || []).filter(a => a.category === 'governance')
    
    // Legacy operational answers (if any exist)
    const opAnswers = (answers || []).filter(a => a.category === 'operations')

    // Legacy financial answers (category is financial but not in the new stacked keys)
    const legacyFinAnswers = (answers || []).filter(
        a => a.category === 'financial' && !STACKED_FINANCIAL_KEYS.includes(a.question_key)
    )

    // Calculate Last Year and Current Year Financial Math
    const parseFinancialYearBlock = (suffix: 'last' | 'curr') => {
        const targetYear = scoresMap[`financial_year_target_${suffix}`] || (suffix === 'last' ? new Date().getFullYear() - 1 : new Date().getFullYear())
        const verificationDate = notesMap[`financial_year_target_${suffix}`] || ''
        const total = scoresMap[`total_budget_items_${suffix}`] || 0
        const exceeded = scoresMap[`exceeded_budget_items_${suffix}`] || 0
        const unrealized = scoresMap[`unrealized_budget_items_${suffix}`] || 0
        const unplanned = scoresMap[`unplanned_budget_items_${suffix}`] || 0
        const compliancePct = total > 0 ? Math.max(0, Math.round(((total - exceeded - unrealized) / total) * 100)) : 100
        const respectScore = scoresMap[`respect_postes_budgetaires_score_${suffix}`] || 0

        const qInsuranceScore = scoresMap[`respect_franchise_assurance_${suffix}`]
        const qInsuranceNote = notesMap[`respect_franchise_assurance_${suffix}`]
        const qFondsScore = scoresMap[`fonds_prevoyance_${suffix}`]
        const qFondsNote = notesMap[`fonds_prevoyance_${suffix}`]
        const qBudgetScore = scoresMap[`qualite_budget_cree_${suffix}`]
        const qBudgetNote = notesMap[`qualite_budget_cree_${suffix}`]

        return {
            targetYear,
            verificationDate,
            total,
            exceeded,
            unrealized,
            unplanned,
            compliancePct,
            respectScore,
            questions: [
                { key: `respect_franchise_assurance_${suffix}`, label: 'Respect de la franchise d\'assurance', score: qInsuranceScore, note: qInsuranceNote },
                { key: `fonds_prevoyance_${suffix}`, label: 'Fonds de prévoyance (étude + cotisations) conforme', score: qFondsScore, note: qFondsNote },
                { key: `qualite_budget_cree_${suffix}`, label: 'Qualité du budget créé', score: qBudgetScore, note: qBudgetNote }
            ].filter(q => q.score !== undefined)
        }
    }

    const lastYearFin = parseFinancialYearBlock('last')
    const currYearFin = parseFinancialYearBlock('curr')

    // Syndicate statistics
    const doorsCount = client?.doors?.length || 0
    const activeContract = client?.contracts?.[0]
    const mrr = activeContract ? Number(activeContract.monthly_fee || 0) : 0

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4">
            {/* Top Navigation & Actions */}
            <div className="flex justify-between items-center animate-fade-in">
                <Link
                    href="/team-management/audits"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1.5 transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour aux Audits
                </Link>

                {isMaster && (
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/team-management/audits/${id}/edit`}
                            className="h-8 rounded-xl bg-purple-650 hover:bg-purple-700 text-white font-bold text-xxs flex items-center justify-center px-4 shadow transition-all hover:scale-[1.02] cursor-pointer"
                        >
                            Modifier
                        </Link>
                        <DeleteAuditButton auditId={id} />
                    </div>
                )}
            </div>

            {/* Header / Summary Card */}
            <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start md:items-center">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center">
                        <ClipboardCheck className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-white uppercase tracking-wide">{clientName}</h2>
                        <p className="text-[10px] text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>Gestionnaire : <strong className="text-zinc-200">{managerName}</strong></span>
                            <span className="text-zinc-650">•</span>
                            <span>Date d'audit : <strong className="text-zinc-200">{audit.audit_date ? new Date(audit.audit_date).toLocaleDateString('fr-CA') : 'Inconnue'}</strong></span>
                            <span className="text-zinc-650">•</span>
                            <span>Auditeur : <strong className="text-purple-400">{audit.profiles?.full_name || 'Évaluateur'}</strong></span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-950/20 p-3 rounded-xl border border-zinc-900/60">
                    <div className="text-right">
                        <span className="text-[8px] uppercase font-extrabold text-zinc-500 block tracking-wider">Indice de Santé Global</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xl font-extrabold text-white">{Math.round(score)}%</span>
                            <Badge variant="outline" className={`text-[8px] font-bold uppercase px-2 py-0.5 ${getHealthBadge(score)}`}>
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
                        <CardTitle className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Observations globales de l'auditeur</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xxs text-zinc-300 leading-relaxed font-medium">
                        {audit.notes}
                    </CardContent>
                </Card>
            )}

            {/* Two-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT / MAIN COLUMN (2 spans) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 1. Governance Section */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <Activity className="h-4 w-4 text-purple-400" />
                                Gouvernance & Conformité Juridique
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {govAnswers.length === 0 ? (
                                <p className="text-xxs italic text-zinc-500">Aucune évaluation enregistrée pour la gouvernance.</p>
                            ) : (
                                govAnswers.map(ans => {
                                    const questionText = QUESTION_LABELS[ans.question_key] || ans.question_key
                                    return (
                                        <div key={ans.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0 text-xxs">
                                            <div className="md:col-span-6 font-semibold text-zinc-200">
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
                                            <div className="md:col-span-3 text-[10px] text-zinc-400 italic">
                                                {ans.note || '-'}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. Financial Stack Section (Last & Current Year Divisions) */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <TrendingUp className="h-4 w-4 text-purple-400" />
                                Santé Financière & Budgets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-6">
                            
                            {/* LAST YEAR BLOCK */}
                            <div className="space-y-4 p-4 bg-zinc-900/35 border border-zinc-850/80 rounded-xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">
                                    <div>
                                        <h4 className="text-xxs font-bold text-white uppercase tracking-wider text-purple-400">
                                            Dernière Année Financière (Last Year)
                                        </h4>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">
                                            Année ciblée: <strong className="text-zinc-200">{lastYearFin.targetYear}</strong>
                                            {lastYearFin.verificationDate && (
                                                <> · Vérifié le: <strong className="text-zinc-200">{new Date(lastYearFin.verificationDate).toLocaleDateString('fr-CA')}</strong></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-[#121318] px-3 py-1.5 rounded-lg border border-zinc-850 text-right">
                                        <span className="text-[8px] text-zinc-500 uppercase block font-bold">Conformité Budgétaire</span>
                                        <span className="text-xs font-extrabold text-emerald-400">{lastYearFin.compliancePct}%</span>
                                    </div>
                                </div>

                                {/* Budget parameters grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/45 p-3 rounded-lg border border-zinc-900 text-xxs font-semibold">
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Postes Totaux</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{lastYearFin.total}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Postes Dépassés</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{lastYearFin.exceeded}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Projets Non Réalisés</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{lastYearFin.unrealized}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Postes Non Prévus</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{lastYearFin.unplanned}</span>
                                    </div>
                                </div>

                                {/* Budget score row */}
                                <div className="flex items-center justify-between p-2.5 bg-zinc-900/20 border border-zinc-850 rounded-lg text-xxs">
                                    <span className="font-semibold text-zinc-200">Respect des postes budgétaires (Score auto)</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex text-purple-400">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`h-3 w-3 ${i < lastYearFin.respectScore ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="font-bold text-zinc-300">{lastYearFin.respectScore}/5</span>
                                    </div>
                                </div>

                                {/* Questions list */}
                                <div className="space-y-3 pt-2">
                                    {lastYearFin.questions.map(q => (
                                        <div key={q.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-zinc-900/60 pb-3 last:border-b-0 last:pb-0 text-xxs">
                                            <div className="md:col-span-6 font-semibold text-zinc-200">
                                                {q.label}
                                            </div>
                                            <div className="md:col-span-3 flex items-center gap-1.5">
                                                <div className="flex text-purple-400">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`h-3 w-3 ${i < (q.score || 0) ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-bold text-zinc-300">{(q.score || 0)}/5</span>
                                            </div>
                                            <div className="md:col-span-3 text-[10px] text-zinc-400 italic">
                                                {q.note || '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CURRENT YEAR BLOCK */}
                            <div className="space-y-4 p-4 bg-zinc-900/35 border border-zinc-850/80 rounded-xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">
                                    <div>
                                        <h4 className="text-xxs font-bold text-white uppercase tracking-wider text-purple-400">
                                            Année Financière Courante (Current Year)
                                        </h4>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">
                                            Année ciblée: <strong className="text-zinc-200">{currYearFin.targetYear}</strong>
                                            {currYearFin.verificationDate && (
                                                <> · Vérifié le: <strong className="text-zinc-200">{new Date(currYearFin.verificationDate).toLocaleDateString('fr-CA')}</strong></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-[#121318] px-3 py-1.5 rounded-lg border border-zinc-850 text-right">
                                        <span className="text-[8px] text-zinc-500 uppercase block font-bold">Conformité Budgétaire</span>
                                        <span className="text-xs font-extrabold text-emerald-400">{currYearFin.compliancePct}%</span>
                                    </div>
                                </div>

                                {/* Budget parameters grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/45 p-3 rounded-lg border border-zinc-900 text-xxs font-semibold">
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Postes Totaux</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{currYearFin.total}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Postes Dépassés</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{currYearFin.exceeded}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Projets Non Réalisés</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{currYearFin.unrealized}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Postes Non Prévus</span>
                                        <span className="text-zinc-200 text-xs block mt-0.5">{currYearFin.unplanned}</span>
                                    </div>
                                </div>

                                {/* Budget score row */}
                                <div className="flex items-center justify-between p-2.5 bg-zinc-900/20 border border-zinc-850 rounded-lg text-xxs">
                                    <span className="font-semibold text-zinc-200">Respect des postes budgétaires (Score auto)</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex text-purple-400">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`h-3 w-3 ${i < currYearFin.respectScore ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="font-bold text-zinc-300">{currYearFin.respectScore}/5</span>
                                    </div>
                                </div>

                                {/* Questions list */}
                                <div className="space-y-3 pt-2">
                                    {currYearFin.questions.map(q => (
                                        <div key={q.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-zinc-900/60 pb-3 last:border-b-0 last:pb-0 text-xxs">
                                            <div className="md:col-span-6 font-semibold text-zinc-200">
                                                {q.label}
                                            </div>
                                            <div className="md:col-span-3 flex items-center gap-1.5">
                                                <div className="flex text-purple-400">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`h-3 w-3 ${i < (q.score || 0) ? 'fill-purple-400 text-purple-400' : 'text-zinc-800'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-bold text-zinc-300">{(q.score || 0)}/5</span>
                                            </div>
                                            <div className="md:col-span-3 text-[10px] text-zinc-400 italic">
                                                {q.note || '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Legacy Financial/Operations Questions (if any exist in old audits) */}
                    {((legacyFinAnswers.length > 0) || (opAnswers.length > 0)) && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-zinc-400">
                                    Autres Évaluations & Historique
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {[...legacyFinAnswers, ...opAnswers].map(ans => {
                                    const questionText = QUESTION_LABELS[ans.question_key] || ans.question_key
                                    return (
                                        <div key={ans.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0 text-xxs">
                                            <div className="md:col-span-6 font-semibold text-zinc-300">
                                                {questionText}
                                            </div>
                                            <div className="md:col-span-3 flex items-center gap-1.5">
                                                <div className="flex text-purple-400">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`h-3 w-3 ${i < (ans.score || 0) ? 'fill-purple-400 text-purple-400' : 'text-zinc-850'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-bold text-zinc-450">{(ans.score || 0)}/5</span>
                                            </div>
                                            <div className="md:col-span-3 text-[10px] text-zinc-550 italic">
                                                {ans.note || '-'}
                                            </div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}

                </div>

                {/* RIGHT / SIDEBAR COLUMN (1 span) */}
                <div className="space-y-6">
                    
                    {/* 1. Syndicate Statistics Card */}
                    {client && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-2 border-b border-zinc-900/60">
                                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-450 flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4 text-purple-400" />
                                    Fiche du Syndicat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-xxs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Nombre de portes</span>
                                        <strong className="text-sm font-extrabold text-zinc-100 block mt-0.5">{doorsCount}</strong>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Revenu Mensuel (MRR)</span>
                                        <strong className="text-sm font-extrabold text-emerald-450 text-emerald-400 block mt-0.5">
                                            {mrr > 0 ? `$${mrr.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}` : 'Aucun'}
                                        </strong>
                                    </div>
                                </div>

                                <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-500 uppercase font-bold text-[8px]">Gestionnaire assigné</span>
                                        <span className="text-purple-400 font-bold text-[10px]">
                                            {managerName}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-zinc-850/60 pt-1.5 mt-1">
                                        <span className="text-zinc-500 uppercase font-bold text-[8px]">Date d'affectation</span>
                                        <span className="text-zinc-300 font-mono text-[9px]">
                                            {client.manager_assigned_at 
                                                ? new Date(client.manager_assigned_at).toLocaleDateString('fr-CA') 
                                                : client.created_at 
                                                    ? new Date(client.created_at).toLocaleDateString('fr-CA')
                                                    : 'Non définie'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. Interactive Operational Tasks Section */}
                    {client && (
                        <AuditTasksSection 
                            clientId={client.id} 
                            managerId={managerId} 
                        />
                    )}

                    {/* 3. Workload History Card */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-2 border-b border-zinc-900/60">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-450 flex items-center gap-1.5">
                                <Activity className="h-4 w-4 text-purple-400" />
                                Volume de Travail & Outlook
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {workloads && workloads.length > 0 ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {workloads.map(wl => (
                                        <div key={wl.id} className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-2 text-xxs">
                                            <div className="flex justify-between items-center border-b border-zinc-850/50 pb-1.5">
                                                <span className="font-extrabold text-zinc-200">
                                                    {wl.month 
                                                        ? `${['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][wl.month - 1]} ${wl.year}`
                                                        : `Annuel ${wl.year}`
                                                    }
                                                </span>
                                                <Badge variant="outline" className="text-[7px] font-extrabold uppercase border-zinc-800/80 bg-zinc-950/20 text-zinc-400 px-1 py-0">
                                                    {wl.month ? 'Mensuel' : 'Annuel'}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                                                {wl.tasks_count !== null && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">Tâches:</span>
                                                        <strong className="text-zinc-300">{wl.tasks_count}</strong>
                                                    </div>
                                                )}
                                                {wl.board_meetings_count !== null && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">CA par an:</span>
                                                        <strong className="text-zinc-350 text-zinc-300">{wl.board_meetings_count}</strong>
                                                    </div>
                                                )}
                                                {wl.syndicate_comms_count !== null && (
                                                    <div className="flex justify-between col-span-2 border-t border-zinc-850/30 pt-1 mt-1">
                                                        <span className="text-zinc-500">Comms Syndicat:</span>
                                                        <strong className="text-purple-400 font-mono font-bold">{wl.syndicate_comms_count}</strong>
                                                    </div>
                                                )}
                                                {wl.manager_comms_count !== null && (
                                                    <div className="flex justify-between col-span-2">
                                                        <span className="text-zinc-500">Comms assignées au gestionnaire:</span>
                                                        <strong className="text-purple-405 text-purple-400 font-mono font-bold">{wl.manager_comms_count}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xxs italic text-zinc-500 text-center py-4 bg-zinc-950/20 border border-zinc-900 rounded-lg">
                                    Aucun historique de volume de travail saisi pour ce syndicat.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                </div>

            </div>
        </div>
    )
}
