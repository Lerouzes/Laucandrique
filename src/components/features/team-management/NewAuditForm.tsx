'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
    createSyndicateAuditAction, 
    updateSyndicateAuditAction, 
    saveSyndicateWorkloadAction, 
    getSyndicateWorkloadAction, 
    getClientHistoryAction,
    deleteSyndicateWorkloadAction,
    getSyndicateTasksAction,
    saveSyndicateTaskAction,
    deleteSyndicateTaskAction,
    getManagerTaskCountsAction
} from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
    ClipboardCheck, 
    ShieldAlert, 
    CheckCircle, 
    Save, 
    HelpCircle, 
    Calendar, 
    BookOpen, 
    Activity, 
    MessageSquare,
    AlertCircle,
    User,
    ChevronDown,
    ChevronUp,
    Trash2,
    ArrowLeft,
    Star
} from 'lucide-react'
import { SearchableClientSelect } from './SearchableClientSelect'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { toast } from 'sonner'

const QUESTIONS = [
    // Governance questions (out of 5)
    { key: 'contrats_condo_web', category: 'governance', text: 'Tous les contrats sont-ils sur Condo Web ?' },
    { key: 'rapports_maintenance', category: 'governance', text: 'Tous les rapports de Laucandrique Maintenance sont-ils présents ?' },
    { key: 'proces_verbaux_ca', category: 'governance', text: 'Les procès-verbaux des CA sont-ils présents ?' },
    { key: 'proces_verbaux_assemblees', category: 'governance', text: 'Les procès-verbaux des assemblées sont-ils présents ?' },
    
    // Financial questions (out of 5) for Last Year
    { key: 'respect_franchise_assurance_last', category: 'financial_last', text: 'Respect de la franchise d\'assurance basée sur le budget' },
    { key: 'fonds_prevoyance_last', category: 'financial_last', text: 'Fonds de prévoyance (étude + cotisations) conforme' },
    { key: 'qualite_budget_cree_last', category: 'financial_last', text: 'Qualité du budget créé' },
    
    // Financial questions (out of 5) for Current Year
    { key: 'respect_franchise_assurance_curr', category: 'financial_curr', text: 'Respect de la franchise d\'assurance basée sur le budget' },
    { key: 'fonds_prevoyance_curr', category: 'financial_curr', text: 'Fonds de prévoyance (étude + cotisations) conforme' },
    { key: 'qualite_budget_cree_curr', category: 'financial_curr', text: 'Qualité du budget créé' },

    // Financial calculations keys (so they are automatically managed in state)
    { key: 'financial_year_target_last', category: 'financial_meta', text: 'Année ciblée' },
    { key: 'financial_year_target_curr', category: 'financial_meta', text: 'Année ciblée' },
    
    { key: 'respect_postes_budgetaires_score_last', category: 'financial_meta', text: 'Score respect postes budgetaires' },
    { key: 'respect_postes_budgetaires_score_curr', category: 'financial_meta', text: 'Score respect postes budgetaires' },
    
    { key: 'total_budget_items_last', category: 'financial_meta', text: 'Postes budgétaires totaux' },
    { key: 'total_budget_items_curr', category: 'financial_meta', text: 'Postes budgétaires totaux' },
    
    { key: 'exceeded_budget_items_last', category: 'financial_meta', text: 'Postes budgétaires dépassés' },
    { key: 'exceeded_budget_items_curr', category: 'financial_meta', text: 'Postes budgétaires dépassés' },
    
    { key: 'unrealized_budget_items_last', category: 'financial_meta', text: 'Projets non réalisés' },
    { key: 'unrealized_budget_items_curr', category: 'financial_meta', text: 'Projets non réalisés' },
    
    { key: 'unplanned_budget_items_last', category: 'financial_meta', text: 'Postes non prévus' },
    { key: 'unplanned_budget_items_curr', category: 'financial_meta', text: 'Postes non prévus' }
]

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
    contrats_condo_web: 'Vérifier si tous les contrats de fournisseurs et de services sont téléversés et accessibles sur Condo Web.',
    rapports_maintenance: 'S\'assurer que tous les rapports de visite et d\'entretien de Laucandrique Maintenance sont archivés.',
    proces_verbaux_ca: 'Vérifier la présence et le classement des procès-verbaux pour chaque réunion du conseil d\'administration.',
    proces_verbaux_assemblees: 'Vérifier la présence, l\'archivage et la conformité des procès-verbaux d\'assemblées générales.',
    
    respect_franchise_assurance_last: 'S\'assurer que la franchise d\'assurance est respectée sur la base du budget voté.',
    respect_franchise_assurance_curr: 'S\'assurer que la franchise d\'assurance est respectée sur la base du budget voté.',
    fonds_prevoyance_last: 'S\'assurer de la conformité de l\'étude du fonds de prévoyance et du versement régulier des cotisations.',
    fonds_prevoyance_curr: 'S\'assurer de la conformité de l\'étude du fonds de prévoyance et du versement régulier des cotisations.',
    qualite_budget_cree_last: 'Évaluer la précision, la cohérence et la qualité générale du budget annuel produit.',
    qualite_budget_cree_curr: 'Évaluer la précision, la cohérence et la qualité générale du budget annuel produit.'
}

const MONTHS = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
]

export function NewAuditForm({ 
    clients,
    questionConfigs = [],
    initialAudit,
    initialAnswers = [],
    currentUser
}: { 
    clients: any[] 
    questionConfigs?: Array<{ key: string; description: string }>
    initialAudit?: any
    initialAnswers?: any[]
    currentUser?: { full_name: string }
}) {
    const router = useRouter()
    const isEditMode = !!initialAudit
    const [loading, setLoading] = useState(false)
    const [clientId, setClientId] = useState(initialAudit?.client_id || clients[0]?.id || '')
    const [notes, setNotes] = useState(initialAudit?.notes || '')

    // Transform clients for SearchableClientSelect
    const clientOptions = clients.map(c => ({
        id: c.id,
        name: c.company_name || c.full_name,
        sdc: c.full_name
    }))

    const activeClientObj = clients.find(c => c.id === clientId)

    // Map custom configs to a lookup record
    const descriptionsMap: Record<string, string> = {
        ...DEFAULT_DESCRIPTIONS,
        ...questionConfigs.reduce((acc, c) => ({ ...acc, [c.key]: c.description }), {})
    }
    
    // Scores and individual notes for the questions
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const base: Record<string, number> = QUESTIONS.reduce((acc, q) => {
            let defVal = 3
            if (q.key.includes('total_budget_items')) defVal = 0
            else if (q.key.includes('exceeded_budget_items')) defVal = 0
            else if (q.key.includes('unrealized_budget_items')) defVal = 0
            else if (q.key.includes('unplanned_budget_items')) defVal = 0
            else if (q.key === 'financial_year_target_last') defVal = new Date().getFullYear() - 1
            else if (q.key === 'financial_year_target_curr') defVal = new Date().getFullYear()
            return { ...acc, [q.key]: defVal }
        }, {})
        if (initialAnswers && initialAnswers.length > 0) {
            initialAnswers.forEach(ans => {
                base[ans.question_key] = ans.score
            })
        }
        return base
    })
    
    const [qNotes, setQNotes] = useState<Record<string, string>>(() => {
        const base: Record<string, string> = QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: '' }), {})
        if (initialAnswers && initialAnswers.length > 0) {
            initialAnswers.forEach(ans => {
                base[ans.question_key] = ans.note || ''
            })
        }
        return base
    })

    // History, tasks and workload state
    const [clientHistory, setClientHistory] = useState<{ complaints: any[], audits: any[] }>({
        complaints: [],
        audits: []
    })
    const [savedWorkloads, setSavedWorkloads] = useState<any[]>([])
    const [syndicateTasks, setSyndicateTasks] = useState<any[]>([])
    const [managerTaskCounts, setManagerTaskCounts] = useState<{ total_tasks: number, late_tasks: number }>({
        total_tasks: 0,
        late_tasks: 0
    })
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [activeComplaint, setActiveComplaint] = useState<any | null>(null)

    // Independent Workload State
    const [workloadYear, setWorkloadYear] = useState(new Date().getFullYear())
    const [workloadType, setWorkloadType] = useState<'annual' | 'monthly'>('annual')
    const [workloadMonth, setWorkloadMonth] = useState(new Date().getMonth() + 1)
    const [tasksCount, setTasksCount] = useState<string>('')
    const [commsCount, setCommsCount] = useState<string>('')
    
    // New workload fields
    const [syndicateCommsCount, setSyndicateCommsCount] = useState<string>('')
    const [managerCommsCount, setManagerCommsCount] = useState<string>('')
    const [boardMeetingsCount, setBoardMeetingsCount] = useState<string>('')

    const [savingWorkload, setSavingWorkload] = useState(false)
    const [showWorkloadForm, setShowWorkloadForm] = useState(false)
    const [workloadToDelete, setWorkloadToDelete] = useState<string | null>(null)

    // Inline task form state
    const [addingTask, setAddingTask] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskCategory, setNewTaskCategory] = useState('Opérations')
    const [newTaskCreatedDate, setNewTaskCreatedDate] = useState(new Date().toISOString().substring(0, 10))

    // Fetch complaints, past audits, workload details and tasks on client change
    useEffect(() => {
        if (!clientId) return
        setLoadingHistory(true)
        
        const clientObj = clients.find(c => c.id === clientId)
        const managerId = clientObj?.manager_id

        const promises: Promise<any>[] = [
            getClientHistoryAction(clientId),
            getSyndicateWorkloadAction(clientId),
            getSyndicateTasksAction(clientId)
        ]

        if (managerId) {
            promises.push(getManagerTaskCountsAction(managerId))
        } else {
            promises.push(Promise.resolve({ total_tasks: 0, late_tasks: 0 }))
        }

        Promise.all(promises).then(([history, workloads, tasks, mgrCounts]) => {
            setClientHistory({
                complaints: history.complaints,
                audits: history.audits.filter((a: any) => a.id !== initialAudit?.id)
            })
            setSavedWorkloads(workloads || [])
            setSyndicateTasks(tasks || [])
            setManagerTaskCounts(mgrCounts || { total_tasks: 0, late_tasks: 0 })
        }).catch(err => {
            console.error("Error loading client details:", err)
        }).finally(() => {
            setLoadingHistory(false)
        })
    }, [clientId, initialAudit, clients])

    const handleScoreChange = (key: string, val: number) => {
        setScores(prev => ({ ...prev, [key]: val }))
    }

    const handleNoteChange = (key: string, val: string) => {
        setQNotes(prev => ({ ...prev, [key]: val }))
    }

    // Graded questions calculation
    const GRADED_KEYS = [
        'contrats_condo_web',
        'rapports_maintenance',
        'proces_verbaux_ca',
        'proces_verbaux_assemblees',
        
        'respect_franchise_assurance_last',
        'fonds_prevoyance_last',
        'qualite_budget_cree_last',
        'respect_postes_budgetaires_score_last',
        
        'respect_franchise_assurance_curr',
        'fonds_prevoyance_curr',
        'qualite_budget_cree_curr',
        'respect_postes_budgetaires_score_curr'
    ]

    const getHealthScore = () => {
        const gradedKeysPresent = GRADED_KEYS.filter(k => scores[k] !== undefined && scores[k] !== null)
        const sum = gradedKeysPresent.reduce((acc, k) => acc + (scores[k] || 0), 0)
        const maxPoints = gradedKeysPresent.length > 0 ? gradedKeysPresent.length * 5 : 1
        return Math.round((sum / maxPoints) * 100)
    }

    const healthScore = getHealthScore()

    const getHealthRating = (score: number) => {
        if (score >= 90) return { label: 'Excellent', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40' }
        if (score >= 75) return { label: 'Stable', style: 'bg-blue-500/20 text-blue-400 border-blue-800/40' }
        if (score >= 60) return { label: 'À Risque', style: 'bg-amber-500/20 text-amber-400 border-amber-800/40' }
        return { label: 'Critique', style: 'bg-rose-500/20 text-rose-400 border-rose-800/40' }
    }

    const healthRating = getHealthRating(healthScore)

    const handleSaveWorkload = async () => {
        if (!clientId) {
            toast.error('Veuillez sélectionner un syndicat.')
            return
        }
        setSavingWorkload(true)
        try {
            await saveSyndicateWorkloadAction({
                client_id: clientId,
                year: Number(workloadYear),
                month: workloadType === 'monthly' ? Number(workloadMonth) : null,
                tasks_count: tasksCount === '' ? null : Number(tasksCount),
                comms_count: commsCount === '' ? null : Number(commsCount),
                syndicate_comms_count: syndicateCommsCount === '' ? null : Number(syndicateCommsCount),
                manager_comms_count: managerCommsCount === '' ? null : Number(managerCommsCount),
                board_meetings_count: boardMeetingsCount === '' ? null : Number(boardMeetingsCount)
            })
            // Refresh saved workloads list
            const workloads = await getSyndicateWorkloadAction(clientId)
            setSavedWorkloads(workloads || [])
            setTasksCount('')
            setCommsCount('')
            setSyndicateCommsCount('')
            setManagerCommsCount('')
            setBoardMeetingsCount('')
            toast.success('Volume de travail enregistré avec succès.')
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement du volume de travail : ' + (err as Error).message)
        } finally {
            setSavingWorkload(false)
        }
    }

    const handleDeleteWorkload = async () => {
        if (!workloadToDelete) return
        setSavingWorkload(true)
        try {
            await deleteSyndicateWorkloadAction(workloadToDelete)
            // Refresh saved workloads list
            const workloads = await getSyndicateWorkloadAction(clientId)
            setSavedWorkloads(workloads || [])
            toast.success('Volume de travail supprimé avec succès.')
        } catch (err) {
            toast.error('Erreur lors de la suppression : ' + (err as Error).message)
        } finally {
            setSavingWorkload(false)
            setWorkloadToDelete(null)
        }
    }

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) {
            toast.error("Veuillez saisir un intitulé pour la tâche.")
            return
        }
        setSavingWorkload(true)
        try {
            const managerId = activeClientObj?.manager_id
            await saveSyndicateTaskAction({
                client_id: clientId,
                manager_id: managerId,
                title: newTaskTitle.trim(),
                category: newTaskCategory,
                status: 'late',
                created_date: newTaskCreatedDate
            })

            const tasks = await getSyndicateTasksAction(clientId)
            setSyndicateTasks(tasks || [])
            setNewTaskTitle('')
            setAddingTask(false)
            toast.success("Tâche ajoutée avec succès.")
        } catch (err: any) {
            toast.error("Erreur lors de la création de la tâche: " + err.message)
        } finally {
            setSavingWorkload(false)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        setSavingWorkload(true)
        try {
            await deleteSyndicateTaskAction(taskId)
            const tasks = await getSyndicateTasksAction(clientId)
            setSyndicateTasks(tasks || [])
            toast.success("Tâche supprimée.")
        } catch (err: any) {
            toast.error("Erreur lors de la suppression de la tâche: " + err.message)
        } finally {
            setSavingWorkload(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) {
            toast.error('Sélectionnez un syndicat.')
            return
        }

        setLoading(true)
        try {
            const answers = QUESTIONS.map(q => {
                let dbCategory: 'governance' | 'financial' | 'operations' = 'governance'
                if (q.category === 'governance') dbCategory = 'governance'
                else if (q.category.startsWith('financial')) dbCategory = 'financial'
                else dbCategory = 'operations'

                return {
                    category: dbCategory,
                    question_key: q.key,
                    score: scores[q.key] !== undefined ? scores[q.key] : 0,
                    note: qNotes[q.key] || undefined
                }
            })

            if (isEditMode) {
                await updateSyndicateAuditAction(initialAudit.id, {
                    notes,
                    answers
                })
                toast.success('Audit mis à jour avec succès.')
                router.push(`/team-management/audits/${initialAudit.id}`)
            } else {
                await createSyndicateAuditAction({
                    client_id: clientId,
                    notes,
                    answers
                })
                toast.success('Audit créé avec succès.')
                router.push('/team-management/audits')
            }
            router.refresh()
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement de l\'audit : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full px-1">
            {/* Back button */}
            <div className="mb-2">
                <Link
                    href="/team-management/audits"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1 w-fit transition-colors animate-fade-in"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Retour aux Audits
                </Link>
            </div>

            {/* Header Control Panel */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <ClipboardCheck className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase">
                            {isEditMode ? "Modifier l'Audit" : "Nouvel Audit de Syndicat"}
                        </h2>
                        <p className="text-[10px] text-zinc-400">
                            {isEditMode ? "Modifiez l'évaluation de conformité" : "Évaluez la qualité de gestion de la copropriété"} · 
                            Auditeur : <strong className="text-zinc-300">{currentUser?.full_name || 'Évaluateur'}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[8px] uppercase font-bold text-zinc-500 block">Indice de Santé</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-extrabold text-white">{healthScore}%</span>
                            <Badge variant="outline" className={`text-[8px] font-bold ${healthRating.style}`}>
                                {healthRating.label}
                            </Badge>
                        </div>
                    </div>
                    <Button 
                        type="submit"
                        disabled={loading || !clientId}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-9 px-4 rounded-lg font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isEditMode ? "Mettre à jour l'Audit" : "Enregistrer l'Audit"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Main Audit Entry (Left 2 Columns) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Selector Card */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md !overflow-visible">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-white">Sélection du Dossier & Notes Globales</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xxs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1 md:col-span-1">
                                    <Label className="text-zinc-500">Syndicat / Copropriété</Label>
                                    {isEditMode ? (
                                        <div className="bg-[#121318] border border-zinc-800 rounded-lg px-2.5 flex items-center h-9 text-xs text-zinc-400 font-semibold">
                                            {clients.find(c => c.id === clientId)?.company_name || clients.find(c => c.id === clientId)?.full_name || 'Syndicat sélectionné'}
                                        </div>
                                    ) : (
                                        <SearchableClientSelect 
                                            clients={clientOptions}
                                            name="client_id"
                                            placeholder="Rechercher un syndicat..."
                                            required
                                            defaultValue={clientId}
                                            onChange={(val) => setClientId(val)}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-zinc-500">Notes d'Audit Globales</Label>
                                    <Textarea 
                                        value={notes} 
                                        onChange={(e) => setNotes(e.target.value)} 
                                        placeholder="Observations globales qualitatives sur ce dossier (plusieurs paragraphes acceptés)..." 
                                        rows={3}
                                        className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-650 resize-y font-normal" 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 1: Governance Questions */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 text-purple-400" />
                                Gouvernance & Conformité Juridique
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-5">
                            {QUESTIONS.filter(q => q.category === 'governance').map(q => (
                                <div key={q.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0">
                                    {/* Question Text */}
                                    <div className="md:col-span-4 text-xxs font-semibold text-zinc-200 flex items-center gap-1.5 pt-2">
                                        <span>{q.text}</span>
                                        {descriptionsMap[q.key] && (
                                            <div className="relative group cursor-pointer inline-flex items-center">
                                                <HelpCircle className="h-3.5 w-3.5 text-zinc-500 hover:text-purple-400 transition-colors shrink-0" />
                                                <div className="absolute left-0 bottom-6 hidden group-hover:block z-50 w-64 p-2.5 bg-[#121318] border border-zinc-800 rounded-lg text-[10px] text-zinc-400 shadow-2xl pointer-events-none font-normal leading-relaxed">
                                                    {descriptionsMap[q.key]}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Score Selector */}
                                    <div className="md:col-span-3">
                                        <Label className="text-[8px] text-zinc-500 md:hidden block mb-1">Cote d'évaluation</Label>
                                        <select 
                                            value={scores[q.key] !== undefined ? scores[q.key] : 3}
                                            onChange={(e) => handleScoreChange(q.key, Number(e.target.value))}
                                            className="w-full bg-[#121318] border border-zinc-850 rounded-lg py-1.5 px-2.5 text-zinc-100 outline-none focus:border-purple-600 h-9 text-xs font-semibold"
                                        >
                                            <option value="5">5/5 - Parfait / Conforme</option>
                                            <option value="4">4/5 - Bon / Dérives mineures</option>
                                            <option value="3">3/5 - Moyen / Suivi régulier requis</option>
                                            <option value="2">2/5 - Insuffisant / Dérives notables</option>
                                            <option value="1">1/5 - Urgent / Déficiences majeures</option>
                                            <option value="0">0/5 - Critique / Absence totale</option>
                                        </select>
                                    </div>
                                    {/* Comment field */}
                                    <div className="md:col-span-5">
                                        <Label className="text-[8px] text-zinc-500 md:hidden block mb-1">Remarques</Label>
                                        <Textarea 
                                            value={qNotes[q.key] || ''}
                                            onChange={(e) => handleNoteChange(q.key, e.target.value)}
                                            placeholder="Remarque ou observation spécifique à ce point..." 
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-650 resize-y min-h-[50px] py-1.5" 
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Section 2: Financial Questions (Stacked Last Year & Current Year) */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <Activity className="h-4 w-4 text-purple-400" />
                                Santé Financière & Budgets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-8">
                            {/* LAST YEAR FINANCIAL ANALYSES */}
                            <div className="space-y-4 p-4 bg-zinc-900/35 border border-zinc-850/80 rounded-2xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">
                                    <h4 className="text-xxs font-bold text-white uppercase tracking-wider text-purple-400">
                                        Dernière Année Financière (Last Year)
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-zinc-500 text-[9px] uppercase font-bold">Année</Label>
                                        <Input 
                                            type="number"
                                            value={scores.financial_year_target_last || (new Date().getFullYear() - 1)}
                                            onChange={(e) => handleScoreChange('financial_year_target_last', Number(e.target.value))}
                                            placeholder="2025"
                                            className="bg-[#121318] border-zinc-850 h-7 text-xxs w-16"
                                        />
                                        <Label className="text-zinc-500 text-[9px] uppercase font-bold ml-1">Vérifié le</Label>
                                        <Input 
                                            type="date"
                                            value={qNotes.financial_year_target_last || ''}
                                            onChange={(e) => handleNoteChange('financial_year_target_last', e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-7 text-xxs w-28"
                                        />
                                    </div>
                                </div>

                                {/* Budget count parameters */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/20 p-3 rounded-lg border border-zinc-900">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Postes budgétaires totaux</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            value={scores.total_budget_items_last || 0}
                                            onChange={(e) => handleScoreChange('total_budget_items_last', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Postes dépassés (excès +5% à 10%)</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            max={scores.total_budget_items_last || 0}
                                            value={scores.exceeded_budget_items_last || 0}
                                            onChange={(e) => handleScoreChange('exceeded_budget_items_last', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Projets non réalisés</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            max={scores.total_budget_items_last || 0}
                                            value={scores.unrealized_budget_items_last || 0}
                                            onChange={(e) => handleScoreChange('unrealized_budget_items_last', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Postes non prévus</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            value={scores.unplanned_budget_items_last || 0}
                                            onChange={(e) => handleScoreChange('unplanned_budget_items_last', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                </div>

                                {/* Live stats */}
                                {(() => {
                                    const T = scores.total_budget_items_last || 0
                                    const E = scores.exceeded_budget_items_last || 0
                                    const U = scores.unrealized_budget_items_last || 0
                                    const compliance = T > 0 ? Math.max(0, Math.round(((T - E - U) / T) * 100)) : 100
                                    
                                    let autoRating = 3
                                    if (T > 0) {
                                        if (compliance === 100) autoRating = 5
                                        else if (compliance >= 90) autoRating = 4
                                        else if (compliance >= 80) autoRating = 3
                                        else if (compliance >= 70) autoRating = 2
                                        else if (compliance >= 50) autoRating = 1
                                        else autoRating = 0
                                    }

                                    if (scores.respect_postes_budgetaires_score_last !== autoRating) {
                                        setTimeout(() => handleScoreChange('respect_postes_budgetaires_score_last', autoRating), 0)
                                    }

                                    return (
                                        <div className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 text-xxs">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Taux de respect du budget</span>
                                                    <strong className="text-sm font-extrabold text-purple-400 mt-0.5 block">{compliance}%</strong>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Cote automatique</span>
                                                    <strong className="text-sm font-extrabold text-zinc-200 mt-0.5 block">{autoRating}/5</strong>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                                Respect des postes budgétaires (+5% à 10% acceptable)
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Comments for last year metrics */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Notes - Respect postes budgétaires</Label>
                                        <Textarea 
                                            value={qNotes.exceeded_budget_items_last || ''}
                                            onChange={(e) => handleNoteChange('exceeded_budget_items_last', e.target.value)}
                                            placeholder="Commentaires sur les dépassements..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xxs text-zinc-200 resize-none font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Notes - Réalisation projets</Label>
                                        <Textarea 
                                            value={qNotes.unrealized_budget_items_last || ''}
                                            onChange={(e) => handleNoteChange('unrealized_budget_items_last', e.target.value)}
                                            placeholder="Notes sur les projets budgétés non réalisés..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xxs text-zinc-200 resize-none font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Notes - Postes imprévus</Label>
                                        <Textarea 
                                            value={qNotes.unplanned_budget_items_last || ''}
                                            onChange={(e) => handleNoteChange('unplanned_budget_items_last', e.target.value)}
                                            placeholder="Notes sur les postes imprévus..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xxs text-zinc-200 resize-none font-normal"
                                        />
                                    </div>
                                </div>

                                {/* Rest of standard graded questions */}
                                <div className="space-y-4 pt-3 border-t border-zinc-900">
                                    {[
                                        { key: 'respect_franchise_assurance_last', text: 'Respect de la franchise d\'assurance basée sur le budget' },
                                        { key: 'fonds_prevoyance_last', text: 'Fonds de prévoyance (étude + cotisations) conforme' },
                                        { key: 'qualite_budget_cree_last', text: 'Qualité du budget créé' }
                                    ].map(q => (
                                        <div key={q.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0">
                                            <div className="md:col-span-4 text-xxs font-semibold text-zinc-200 pt-2 flex items-center gap-1.5">
                                                <span>{q.text}</span>
                                                {descriptionsMap[q.key] && (
                                                    <div className="relative group cursor-pointer inline-flex items-center">
                                                        <HelpCircle className="h-3.5 w-3.5 text-zinc-500 hover:text-purple-400 transition-colors shrink-0" />
                                                        <div className="absolute left-0 bottom-6 hidden group-hover:block z-50 w-64 p-2.5 bg-[#121318] border border-zinc-800 rounded-lg text-[10px] text-zinc-400 shadow-2xl pointer-events-none font-normal leading-relaxed">
                                                            {descriptionsMap[q.key]}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="md:col-span-3">
                                                <select 
                                                    value={scores[q.key] !== undefined ? scores[q.key] : 3}
                                                    onChange={(e) => handleScoreChange(q.key, Number(e.target.value))}
                                                    className="w-full bg-[#121318] border border-zinc-850 rounded-lg py-1.5 px-2.5 text-zinc-100 outline-none focus:border-purple-600 h-9 text-xs font-semibold"
                                                >
                                                    <option value="5">5/5 - Parfait / Conforme</option>
                                                    <option value="4">4/5 - Bon / Dérives mineures</option>
                                                    <option value="3">3/5 - Moyen / Suivi régulier requis</option>
                                                    <option value="2">2/5 - Insuffisant / Dérives notables</option>
                                                    <option value="1">1/5 - Urgent / Déficiences majeures</option>
                                                    <option value="0">0/5 - Critique / Absence totale</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-5">
                                                <Textarea 
                                                    value={qNotes[q.key] || ''}
                                                    onChange={(e) => handleNoteChange(q.key, e.target.value)}
                                                    placeholder="Remarque spécifique..." 
                                                    rows={2}
                                                    className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-650 min-h-[45px] py-1.5 font-normal" 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CURRENT YEAR FINANCIAL ANALYSES */}
                            <div className="space-y-4 p-4 bg-zinc-900/35 border border-zinc-850/80 rounded-2xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">
                                    <h4 className="text-xxs font-bold text-white uppercase tracking-wider text-purple-400">
                                        Année Financière Courante (Current Year)
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-zinc-500 text-[9px] uppercase font-bold">Année</Label>
                                        <Input 
                                            type="number"
                                            value={scores.financial_year_target_curr || new Date().getFullYear()}
                                            onChange={(e) => handleScoreChange('financial_year_target_curr', Number(e.target.value))}
                                            placeholder="2026"
                                            className="bg-[#121318] border-zinc-850 h-7 text-xxs w-16"
                                        />
                                        <Label className="text-zinc-500 text-[9px] uppercase font-bold ml-1">Vérifié le</Label>
                                        <Input 
                                            type="date"
                                            value={qNotes.financial_year_target_curr || ''}
                                            onChange={(e) => handleNoteChange('financial_year_target_curr', e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-7 text-xxs w-28"
                                        />
                                    </div>
                                </div>

                                {/* Budget count parameters */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/20 p-3 rounded-lg border border-zinc-900">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Postes budgétaires totaux</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            value={scores.total_budget_items_curr || 0}
                                            onChange={(e) => handleScoreChange('total_budget_items_curr', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Postes dépassés (excès +5% à 10%)</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            max={scores.total_budget_items_curr || 0}
                                            value={scores.exceeded_budget_items_curr || 0}
                                            onChange={(e) => handleScoreChange('exceeded_budget_items_curr', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Projets non réalisés</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            max={scores.total_budget_items_curr || 0}
                                            value={scores.unrealized_budget_items_curr || 0}
                                            onChange={(e) => handleScoreChange('unrealized_budget_items_curr', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Postes non prévus</Label>
                                        <Input 
                                            type="number"
                                            min="0"
                                            value={scores.unplanned_budget_items_curr || 0}
                                            onChange={(e) => handleScoreChange('unplanned_budget_items_curr', Number(e.target.value))}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs font-semibold text-white"
                                        />
                                    </div>
                                </div>

                                {/* Live stats */}
                                {(() => {
                                    const T = scores.total_budget_items_curr || 0
                                    const E = scores.exceeded_budget_items_curr || 0
                                    const U = scores.unrealized_budget_items_curr || 0
                                    const compliance = T > 0 ? Math.max(0, Math.round(((T - E - U) / T) * 100)) : 100
                                    
                                    let autoRating = 3
                                    if (T > 0) {
                                        if (compliance === 100) autoRating = 5
                                        else if (compliance >= 90) autoRating = 4
                                        else if (compliance >= 80) autoRating = 3
                                        else if (compliance >= 70) autoRating = 2
                                        else if (compliance >= 50) autoRating = 1
                                        else autoRating = 0
                                    }

                                    if (scores.respect_postes_budgetaires_score_curr !== autoRating) {
                                        setTimeout(() => handleScoreChange('respect_postes_budgetaires_score_curr', autoRating), 0)
                                    }

                                    return (
                                        <div className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 text-xxs">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Taux de respect du budget</span>
                                                    <strong className="text-sm font-extrabold text-purple-400 mt-0.5 block">{compliance}%</strong>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Cote automatique</span>
                                                    <strong className="text-sm font-extrabold text-zinc-200 mt-0.5 block">{autoRating}/5</strong>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                                Respect des postes budgétaires (+5% à 10% acceptable)
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Comments for current year metrics */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Notes - Respect postes budgétaires</Label>
                                        <Textarea 
                                            value={qNotes.exceeded_budget_items_curr || ''}
                                            onChange={(e) => handleNoteChange('exceeded_budget_items_curr', e.target.value)}
                                            placeholder="Commentaires sur les dépassements..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xxs text-zinc-200 resize-none font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Notes - Réalisation projets</Label>
                                        <Textarea 
                                            value={qNotes.unrealized_budget_items_curr || ''}
                                            onChange={(e) => handleNoteChange('unrealized_budget_items_curr', e.target.value)}
                                            placeholder="Notes sur les projets budgétés non réalisés..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xxs text-zinc-200 resize-none font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-[9px]">Notes - Postes imprévus</Label>
                                        <Textarea 
                                            value={qNotes.unplanned_budget_items_curr || ''}
                                            onChange={(e) => handleNoteChange('unplanned_budget_items_curr', e.target.value)}
                                            placeholder="Notes sur les postes imprévus..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-xxs text-zinc-200 resize-none font-normal"
                                        />
                                    </div>
                                </div>

                                {/* Rest of standard graded questions */}
                                <div className="space-y-4 pt-3 border-t border-zinc-900">
                                    {[
                                        { key: 'respect_franchise_assurance_curr', text: 'Respect de la franchise d\'assurance basée sur le budget' },
                                        { key: 'fonds_prevoyance_curr', text: 'Fonds de prévoyance (étude + cotisations) conforme' },
                                        { key: 'qualite_budget_cree_curr', text: 'Qualité du budget créé' }
                                    ].map(q => (
                                        <div key={q.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0">
                                            <div className="md:col-span-4 text-xxs font-semibold text-zinc-200 pt-2 flex items-center gap-1.5">
                                                <span>{q.text}</span>
                                                {descriptionsMap[q.key] && (
                                                    <div className="relative group cursor-pointer inline-flex items-center">
                                                        <HelpCircle className="h-3.5 w-3.5 text-zinc-500 hover:text-purple-400 transition-colors shrink-0" />
                                                        <div className="absolute left-0 bottom-6 hidden group-hover:block z-50 w-64 p-2.5 bg-[#121318] border border-zinc-800 rounded-lg text-[10px] text-zinc-400 shadow-2xl pointer-events-none font-normal leading-relaxed">
                                                            {descriptionsMap[q.key]}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="md:col-span-3">
                                                <select 
                                                    value={scores[q.key] !== undefined ? scores[q.key] : 3}
                                                    onChange={(e) => handleScoreChange(q.key, Number(e.target.value))}
                                                    className="w-full bg-[#121318] border border-zinc-850 rounded-lg py-1.5 px-2.5 text-zinc-100 outline-none focus:border-purple-600 h-9 text-xs font-semibold"
                                                >
                                                    <option value="5">5/5 - Parfait / Conforme</option>
                                                    <option value="4">4/5 - Bon / Dérives mineures</option>
                                                    <option value="3">3/5 - Moyen / Suivi régulier requis</option>
                                                    <option value="2">2/5 - Insuffisant / Dérives notables</option>
                                                    <option value="1">1/5 - Urgent / Déficiences majeures</option>
                                                    <option value="0">0/5 - Critique / Absence totale</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-5">
                                                <Textarea 
                                                    value={qNotes[q.key] || ''}
                                                    onChange={(e) => handleNoteChange(q.key, e.target.value)}
                                                    placeholder="Remarque spécifique..." 
                                                    rows={2}
                                                    className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-650 min-h-[45px] py-1.5 font-normal" 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Syndicate Tasks Checklist Section */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-purple-400" />
                                Suivi des Tâches Opérationnelles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {/* Manager overall metrics */}
                            <div className="grid grid-cols-2 gap-4 bg-[#121318] p-3 rounded-lg border border-zinc-900 text-xxs">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 uppercase font-bold">Tâches totales du gestionnaire</span>
                                    <strong className="text-sm font-extrabold text-zinc-100">{managerTaskCounts.total_tasks}</strong>
                                </div>
                                <div className="flex justify-between items-center border-l border-zinc-850 pl-4">
                                    <span className="text-zinc-500 uppercase font-bold">Tâches en retard du gestionnaire</span>
                                    <strong className="text-sm font-extrabold text-rose-455 text-rose-400">{managerTaskCounts.late_tasks}</strong>
                                </div>
                            </div>

                            {/* List of late tasks for this syndicate specifically */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                        Tâches en retard du syndicat ({syndicateTasks.filter(t => t.status === 'late').length})
                                    </span>
                                    <Button 
                                        type="button" 
                                        onClick={() => setAddingTask(!addingTask)}
                                        className="bg-purple-900/40 hover:bg-purple-800/40 text-purple-400 text-[9px] font-bold h-6 px-2.5 rounded border border-purple-800/40 cursor-pointer"
                                    >
                                        + Ajouter une tâche
                                    </Button>
                                </div>

                                {/* Form to add a new task */}
                                {addingTask && (
                                    <div className="p-3 bg-[#121318] border border-zinc-850 rounded-lg space-y-3 text-xxs animate-in fade-in slide-in-from-top-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-zinc-500">Intitulé de la tâche</Label>
                                                <Input 
                                                    placeholder="ex: Réparer la pompe"
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-zinc-500">Catégorie</Label>
                                                <select 
                                                    value={newTaskCategory}
                                                    onChange={(e) => setNewTaskCategory(e.target.value)}
                                                    className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8 text-xxs font-semibold cursor-pointer"
                                                >
                                                    <option value="Gouvernance">Gouvernance</option>
                                                    <option value="Financier">Financier</option>
                                                    <option value="Opérations">Opérations</option>
                                                    <option value="Entretien">Entretien</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-zinc-500">Date de création</Label>
                                                <Input 
                                                    type="date"
                                                    value={newTaskCreatedDate}
                                                    onChange={(e) => setNewTaskCreatedDate(e.target.value)}
                                                    className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                type="button" 
                                                onClick={() => setAddingTask(false)}
                                                className="bg-transparent border border-zinc-800 text-zinc-400 text-[9px] font-bold h-7 px-3 rounded hover:bg-zinc-900 cursor-pointer"
                                            >
                                                Annuler
                                            </Button>
                                            <Button 
                                                type="button" 
                                                onClick={handleAddTask}
                                                className="bg-purple-600 text-white text-[9px] font-bold h-7 px-3 rounded hover:bg-purple-700 cursor-pointer"
                                            >
                                                Enregistrer
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Syndicate tasks table list */}
                                {syndicateTasks.length === 0 ? (
                                    <p className="text-xxs italic text-zinc-500 text-center py-4 bg-zinc-950/20 border border-zinc-900 rounded-lg">
                                        Aucune tâche en retard enregistrée pour ce syndicat.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto border border-zinc-850 rounded-lg">
                                        <table className="w-full text-left text-xxs text-zinc-300">
                                            <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800 uppercase">
                                                <tr>
                                                    <th className="p-2.5">Tâche</th>
                                                    <th className="p-2.5">Catégorie</th>
                                                    <th className="p-2.5">Date de création</th>
                                                    <th className="p-2.5">Statut</th>
                                                    <th className="p-2.5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-850">
                                                {syndicateTasks.map(t => (
                                                    <tr key={t.id} className="hover:bg-zinc-900/20">
                                                        <td className="p-2.5 font-semibold text-zinc-200">{t.title}</td>
                                                        <td className="p-2.5">
                                                            <Badge variant="outline" className="text-[8px] bg-purple-950/20 text-purple-300 border-purple-800/40 px-1.5 py-0.5 font-bold">
                                                                {t.category || 'Opérations'}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2.5 font-mono text-[10px] text-zinc-400">
                                                            {t.created_date ? new Date(t.created_date).toLocaleDateString('fr-CA') : 'N/A'}
                                                        </td>
                                                        <td className="p-2.5">
                                                            <Badge variant="outline" className={`text-[8px] font-bold uppercase ${
                                                                t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-800/30' : 'bg-rose-500/10 text-rose-400 border-rose-800/30'
                                                            }`}>
                                                                {t.status === 'completed' ? 'complétée' : 'en retard'}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2.5 text-right">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteTask(t.id)}
                                                                className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Context Panels: Workload & Past Data (1 Column) */}
                <div className="space-y-6">
                    {/* Syndicate Statistics Card */}
                    {activeClientObj && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-purple-400" />
                                    Statistiques du Syndicat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xxs leading-relaxed">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Nombre de Portes</span>
                                        <strong className="text-sm font-extrabold text-zinc-100 block mt-0.5">
                                            {activeClientObj.doors ? activeClientObj.doors.length : 0} portes
                                        </strong>
                                    </div>
                                    <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Revenu Mensuel (MRR)</span>
                                        <strong className="text-sm font-extrabold text-emerald-450 text-emerald-400 block mt-0.5">
                                            {activeClientObj.contracts && activeClientObj.contracts[0] 
                                                ? `$${Number(activeClientObj.contracts[0].monthly_fee || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}` 
                                                : 'Aucun contrat'}
                                        </strong>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-zinc-500 uppercase font-bold">Gestionnaire en charge</span>
                                        <span className="text-purple-400 font-bold">
                                            {activeClientObj.managers 
                                                ? `${activeClientObj.managers.first_name} ${activeClientObj.managers.last_name}` 
                                                : 'Non assigné'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] border-t border-zinc-850/60 pt-1 mt-1">
                                        <span className="text-zinc-500 uppercase font-bold">Assigné depuis le</span>
                                        <span className="text-zinc-300 font-mono">
                                            {activeClientObj.manager_assigned_at 
                                                ? new Date(activeClientObj.manager_assigned_at).toLocaleDateString('fr-CA') 
                                                : activeClientObj.created_at 
                                                    ? new Date(activeClientObj.created_at).toLocaleDateString('fr-CA')
                                                    : 'Non définie'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Collapsible Workload Stats Panel */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 flex flex-row justify-between items-center cursor-pointer select-none" onClick={() => setShowWorkloadForm(!showWorkloadForm)}>
                            <div>
                                <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                                    <Activity className="h-4 w-4 text-purple-400" />
                                    Volume de Travail (Optionnel)
                                </CardTitle>
                                <CardDescription className="text-[9px] text-zinc-500">Enregistrez les tâches/communications.</CardDescription>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-zinc-400">
                                {showWorkloadForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </CardHeader>
                        {showWorkloadForm && (
                            <CardContent className="space-y-4 border-t border-zinc-900 pt-4 text-xxs">
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Année</Label>
                                            <select 
                                                value={workloadYear} 
                                                onChange={(e) => setWorkloadYear(Number(e.target.value))}
                                                className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8 cursor-pointer"
                                            >
                                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                                                <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Fréquence de saisie</Label>
                                            <select 
                                                value={workloadType} 
                                                onChange={(e) => setWorkloadType(e.target.value as any)}
                                                className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8 cursor-pointer"
                                            >
                                                <option value="annual">Annuelle (Total global)</option>
                                                <option value="monthly">Mensuelle</option>
                                            </select>
                                        </div>
                                    </div>

                                    {workloadType === 'monthly' && (
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Mois</Label>
                                            <select 
                                                value={workloadMonth} 
                                                onChange={(e) => setWorkloadMonth(Number(e.target.value))}
                                                className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8 cursor-pointer"
                                            >
                                                {MONTHS.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Volume de Tâches</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="ex: 150"
                                                value={tasksCount}
                                                onChange={(e) => setTasksCount(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Comms Totales Syndicat</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="ex: 1000"
                                                value={syndicateCommsCount}
                                                onChange={(e) => setSyndicateCommsCount(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Comms Assignées Gest.</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="ex: 400"
                                                value={managerCommsCount}
                                                onChange={(e) => setManagerCommsCount(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Réunions de CA / an</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="ex: 6"
                                                value={boardMeetingsCount}
                                                onChange={(e) => setBoardMeetingsCount(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100"
                                            />
                                        </div>
                                    </div>

                                    <Button 
                                        type="button" 
                                        onClick={handleSaveWorkload} 
                                        disabled={savingWorkload || !clientId}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xxs h-8 font-semibold rounded-lg mt-2 shadow cursor-pointer"
                                    >
                                        {savingWorkload ? 'Enregistrement...' : 'Sauvegarder le volume'}
                                    </Button>
                                </div>

                                {/* Previously saved workload table list */}
                                {savedWorkloads.length > 0 && (
                                    <div className="border-t border-zinc-900 pt-3 space-y-2 max-h-48 overflow-y-auto pr-1 mt-2">
                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Saisies existantes</span>
                                        <div className="space-y-1.5 text-[10px]">
                                            {savedWorkloads.map((wl) => (
                                                <div key={wl.id} className="flex justify-between items-center bg-zinc-950/40 p-2 border border-zinc-900 rounded-lg group/item">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1">
                                                            <strong className="text-zinc-300">{wl.year}</strong>
                                                            <span className="text-zinc-500 text-[9px]">
                                                                {wl.month ? `(${MONTHS.find(m => m.value === wl.month)?.label})` : '(Annuel)'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[9px] text-zinc-400 flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 font-mono">
                                                            <span>Tâches: <strong className="text-purple-400 font-bold">{wl.tasks_count ?? '-'}</strong></span>
                                                            <span>CA / an: <strong className="text-amber-400 font-bold">{wl.board_meetings_count ?? '-'}</strong></span>
                                                            <span>Comms Syndicat: <strong className="text-cyan-400 font-bold">{wl.syndicate_comms_count ?? '-'}</strong></span>
                                                            <span>Comms Gest.: <strong className="text-blue-400 font-bold">{wl.manager_comms_count ?? '-'}</strong></span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setWorkloadToDelete(wl.id)}
                                                        className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* Past Complaints & General Notes Context Card */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                                <MessageSquare className="h-4 w-4 text-purple-400" />
                                Plaintes & Audits Passés
                            </CardTitle>
                            <CardDescription className="text-[9px] text-zinc-500">Suivi historique pour ce syndicat.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xxs">
                            {loadingHistory ? (
                                <p className="italic text-zinc-500 text-center py-4">Chargement de l'historique...</p>
                            ) : (
                                <>
                                    {/* Complaints */}
                                    <div className="space-y-2">
                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-900 pb-1">Plaintes Clients ({clientHistory.complaints.length})</span>
                                        {clientHistory.complaints.length === 0 ? (
                                            <p className="italic text-zinc-600">Aucune plainte enregistrée.</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                                {clientHistory.complaints.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setActiveComplaint(c)}
                                                        className="w-full text-left p-2 rounded-lg bg-rose-955 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-900/30 text-[10px] text-zinc-200 transition-colors flex justify-between items-center group cursor-pointer"
                                                    >
                                                        <span className="truncate pr-1 group-hover:text-purple-400 transition-colors font-medium">{c.title}</span>
                                                        <Badge variant="outline" className="text-[7px] uppercase font-mono px-1 shrink-0 bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold">
                                                            {c.severity}
                                                        </Badge>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Audits History */}
                                    <div className="space-y-2 border-t border-zinc-900 pt-3">
                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-900 pb-1">Historique des Audits ({clientHistory.audits.length})</span>
                                        {clientHistory.audits.length === 0 ? (
                                            <p className="italic text-zinc-600">Aucun audit historique disponible.</p>
                                        ) : (
                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                                {clientHistory.audits.map((a) => (
                                                    <div
                                                        key={a.id}
                                                        className="p-2 rounded-lg bg-zinc-950/40 border border-zinc-850 flex justify-between items-center text-[10px]"
                                                    >
                                                        <div>
                                                            <strong className="text-zinc-300">{Math.round(a.health_score)}%</strong>
                                                            <span className="text-zinc-500 ml-1">({a.audit_date ? new Date(a.audit_date).toLocaleDateString('fr-CA') : 'N/A'})</span>
                                                            <p className="text-[8px] text-zinc-500 mt-0.5">Par: {a.profiles?.full_name || 'Évaluateur'}</p>
                                                        </div>
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            className="text-purple-400 hover:text-purple-300 font-bold p-0 h-6 text-[9px] cursor-pointer"
                                                            onClick={() => router.push(`/team-management/audits/${a.id}`)}
                                                        >
                                                            Fiche
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Past Complaint Popup Details Overlay Modal */}
            {activeComplaint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#16171e] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative">
                        <button 
                            type="button" 
                            onClick={() => setActiveComplaint(null)} 
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white text-base font-black transition-colors cursor-pointer"
                        >
                            ✕
                        </button>
                        <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-1.5 border-b border-zinc-850 pb-2">
                            <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
                            Détail de la Plainte
                        </h3>
                        <div className="space-y-4 text-xxs text-zinc-300">
                            <div>
                                <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Titre</span>
                                <strong className="text-white text-xs font-bold">{activeComplaint.title}</strong>
                            </div>
                            <div>
                                <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Description</span>
                                <p className="bg-[#121318] p-3 rounded-lg border border-zinc-850 text-[10px] leading-relaxed text-zinc-200 max-h-36 overflow-y-auto font-medium">
                                    {activeComplaint.description || 'Aucune description fournie.'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Gravité</span>
                                    <Badge variant="outline" className={
                                        activeComplaint.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20 font-bold uppercase text-[7px]' :
                                        activeComplaint.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 font-bold uppercase text-[7px]' :
                                        activeComplaint.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 font-bold uppercase text-[7px]' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold uppercase text-[7px]'
                                    }>
                                        {activeComplaint.severity}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Statut</span>
                                    <Badge variant="outline" className={
                                        activeComplaint.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold uppercase text-[7px]' :
                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold uppercase text-[7px]'
                                    }>
                                        {activeComplaint.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
                                <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Date de réception</span>
                                    <span className="font-semibold text-zinc-300">
                                        {activeComplaint.received_date ? new Date(activeComplaint.received_date).toLocaleDateString('fr-CA') : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Date de résolution</span>
                                    <span className="font-semibold text-zinc-300">
                                        {activeComplaint.resolved_date ? new Date(activeComplaint.resolved_date).toLocaleDateString('fr-CA') : 'Non résolue'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button type="button" onClick={() => setActiveComplaint(null)} className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 font-bold rounded-lg shadow-lg cursor-pointer">
                                Fermer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationDialog
                open={!!workloadToDelete}
                onOpenChange={(open) => !open && setWorkloadToDelete(null)}
                title="Supprimer la saisie de volume"
                description="Voulez-vous vraiment supprimer cette saisie de volume de travail ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                onConfirm={handleDeleteWorkload}
                loading={savingWorkload}
                variant="danger"
            />
        </form>
    )
}
