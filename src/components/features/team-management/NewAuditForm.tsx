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
    deleteSyndicateWorkloadAction
} from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
    ArrowLeft
} from 'lucide-react'
import { SearchableClientSelect } from './SearchableClientSelect'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { toast } from 'sonner'

const QUESTIONS = [
    { key: 'registre_coproprietaires', category: 'governance', text: 'Registre des documents complets' },
    { key: 'convocations_assemblee', category: 'governance', text: 'Convocations d\'assemblées conformes' },
    { key: 'proces_verbaux', category: 'governance', text: 'Procès-verbaux rédigés et archivés' },
    { key: 'contrats_fournisseurs', category: 'governance', text: 'Contrats de fournisseurs signés et classés' },
    
    { key: 'budget_annuel', category: 'financial', text: 'Budget annuel voté et respecté' },
    { key: 'fonds_prevoyance', category: 'financial', text: 'Fonds de prévoyance (étude + cotisations) conforme' },
    { key: 'qualite_budget_cree', category: 'financial', text: 'Qualité du budget créé' }
]

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
    registre_coproprietaires: 'Vérifier que les documents juridiques, registres de copropriété, procès-verbaux et règlements sont complets.',
    convocations_assemblee: 'Vérifier que les avis de convocation et procès-verbaux d\'assemblées sont conformes aux délais légaux.',
    proces_verbaux: 'S\'assurer que les procès-verbaux des assemblées et réunions de CA sont signés, archivés et à jour.',
    contrats_fournisseurs: 'Contrôler la signature, l\'archivage et le classement de tous les contrats de fournisseurs.',
    budget_annuel: 'Valider que le budget de fonctionnement annuel est voté en assemblée générale et respecté.',
    fonds_prevoyance: 'S\'assurer de la conformité de l\'étude du fonds de prévoyance et du versement régulier des cotisations.',
    qualite_budget_cree: 'Évaluer la précision, la cohérence et la qualité générale du budget annuel produit.'
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

    // Map custom configs to a lookup record
    const descriptionsMap: Record<string, string> = {
        ...DEFAULT_DESCRIPTIONS,
        ...questionConfigs.reduce((acc, c) => ({ ...acc, [c.key]: c.description }), {})
    }
    
    // Scores and individual notes for the questions
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const base = QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: 3 }), {})
        if (initialAnswers && initialAnswers.length > 0) {
            initialAnswers.forEach(ans => {
                base[ans.question_key] = ans.score
            })
        }
        return base
    })
    const [qNotes, setQNotes] = useState<Record<string, string>>(() => {
        const base = QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: '' }), {})
        if (initialAnswers && initialAnswers.length > 0) {
            initialAnswers.forEach(ans => {
                base[ans.question_key] = ans.note || ''
            })
        }
        return base
    })

    // History and workload state
    const [clientHistory, setClientHistory] = useState<{ complaints: any[], audits: any[] }>({
        complaints: [],
        audits: []
    })
    const [savedWorkloads, setSavedWorkloads] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [activeComplaint, setActiveComplaint] = useState<any | null>(null)

    // Independent Workload State
    const [workloadYear, setWorkloadYear] = useState(new Date().getFullYear())
    const [workloadType, setWorkloadType] = useState<'annual' | 'monthly'>('annual')
    const [workloadMonth, setWorkloadMonth] = useState(new Date().getMonth() + 1)
    const [tasksCount, setTasksCount] = useState<string>('')
    const [commsCount, setCommsCount] = useState<string>('')
    const [savingWorkload, setSavingWorkload] = useState(false)
    const [showWorkloadForm, setShowWorkloadForm] = useState(false)
    const [workloadToDelete, setWorkloadToDelete] = useState<string | null>(null)

    // Fetch complaints, past audits, and workload details on client change
    useEffect(() => {
        if (!clientId) return
        setLoadingHistory(true)
        Promise.all([
            getClientHistoryAction(clientId),
            getSyndicateWorkloadAction(clientId)
        ]).then(([history, workloads]) => {
            setClientHistory({
                complaints: history.complaints,
                audits: history.audits.filter(a => a.id !== initialAudit?.id)
            })
            setSavedWorkloads(workloads || [])
        }).catch(err => {
            console.error("Error loading client details:", err)
        }).finally(() => {
            setLoadingHistory(false)
        })
    }, [clientId, initialAudit])

    const handleScoreChange = (key: string, val: number) => {
        setScores({ ...scores, [key]: val })
    }

    const handleNoteChange = (key: string, val: string) => {
        setQNotes({ ...qNotes, [key]: val })
    }

    // Realtime Calculations
    const totalPoints = Object.values(scores).reduce((sum, s) => sum + s, 0)
    // Dynamic max points: questions count * 5
    const maxPoints = QUESTIONS.length * 5
    const healthScore = Math.round((totalPoints / maxPoints) * 100)

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
                comms_count: commsCount === '' ? null : Number(commsCount)
            })
            // Refresh saved workloads list
            const workloads = await getSyndicateWorkloadAction(clientId)
            setSavedWorkloads(workloads || [])
            setTasksCount('')
            setCommsCount('')
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) {
            toast.error('Sélectionnez un syndicat.')
            return
        }

        setLoading(true)
        try {
            const answers = QUESTIONS.map(q => ({
                category: q.category as 'governance' | 'financial' | 'operations',
                question_key: q.key,
                score: scores[q.key],
                note: qNotes[q.key]
            }))

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
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1 w-fit transition-colors"
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
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-9 px-4 rounded-lg font-bold flex items-center gap-1.5 shadow-lg transition-all"
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
                                        className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-600 resize-y" 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions Categories */}
                    {(['governance', 'financial'] as const).map(cat => {
                        const catQuestions = QUESTIONS.filter(q => q.category === cat)
                        if (catQuestions.length === 0) return null
                        const catTitle = 
                            cat === 'governance' ? 'Gouvernance & Conformité Juridique' : 'Santé Financière & Budgets'

                        return (
                            <Card key={cat} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                        {catTitle}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-5">
                                    {catQuestions.map(q => (
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
                                                    value={scores[q.key]}
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
                                            {/* Comment field (Textarea instead of input) */}
                                            <div className="md:col-span-5">
                                                <Label className="text-[8px] text-zinc-500 md:hidden block mb-1">Remarques</Label>
                                                <Textarea 
                                                    value={qNotes[q.key]}
                                                    onChange={(e) => handleNoteChange(q.key, e.target.value)}
                                                    placeholder="Remarque ou observation spécifique à ce point..." 
                                                    rows={2}
                                                    className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-600 resize-y min-h-[50px] py-1.5" 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Right Context Panels: Workload & Past Data (1 Column) */}
                <div className="space-y-6">
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
                                                className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8"
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
                                                className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8"
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
                                                className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8"
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
                                                className="bg-[#121318] border-zinc-850 h-8 text-xxs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Communications</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="ex: 800"
                                                value={commsCount}
                                                onChange={(e) => setCommsCount(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xxs"
                                            />
                                        </div>
                                    </div>

                                    <Button 
                                        type="button" 
                                        onClick={handleSaveWorkload} 
                                        disabled={savingWorkload || !clientId}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xxs h-8 font-semibold rounded-lg mt-2 shadow"
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
                                                        <div className="text-[9px] text-zinc-400 flex gap-2.5 mt-0.5">
                                                            <span>Tâches: <strong className="text-purple-400 font-bold">{wl.tasks_count ?? '-'}</strong></span>
                                                            <span>Comms: <strong className="text-cyan-400 font-bold">{wl.comms_count ?? '-'}</strong></span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setWorkloadToDelete(wl.id)}
                                                        className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
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
                                                        className="w-full text-left p-2 rounded-lg bg-rose-950/10 hover:bg-rose-950/20 border border-rose-900/30 text-[10px] text-zinc-200 transition-colors flex justify-between items-center group"
                                                    >
                                                        <span className="truncate pr-1 group-hover:text-purple-400 transition-colors font-medium">{c.title}</span>
                                                        <Badge variant="outline" className="text-[7px] uppercase font-mono px-1 shrink-0 bg-rose-500/10 border-rose-500/20 text-rose-400">
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
                                                            <strong className="text-zinc-300">{a.health_score}%</strong>
                                                            <span className="text-zinc-500 ml-1">({a.audit_date ? new Date(a.audit_date).toLocaleDateString('fr-CA') : 'N/A'})</span>
                                                            <p className="text-[8px] text-zinc-500 mt-0.5">Par: {a.profiles?.full_name || 'Évaluateur'}</p>
                                                        </div>
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            className="text-purple-400 hover:text-purple-300 font-bold p-0 h-6 text-[9px]"
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
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white text-base font-black transition-colors"
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
                            <Button type="button" onClick={() => setActiveComplaint(null)} className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 font-bold rounded-lg shadow-lg">
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
