'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAssemblyEvaluationAction, updateAssemblyEvaluationAction } from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchableClientSelect } from './SearchableClientSelect'
import { UsersRound, Save, HelpCircle, CheckCircle2 } from 'lucide-react'

const OPERATIONAL_CRITERIA = [
    { key: 'agenda_sent_on_time', text: 'Ordre du jour envoyé dans les délais' },
    { key: 'quorum_respected', text: 'Quorum atteint et règles d\'ouverture respectées' },
    { key: 'voting_controlled', text: 'Gestion et contrôle des votes/procurations' },
    { key: 'duration_reasonable', text: 'Durée raisonnable de la séance' }
]

const LEADERSHIP_CRITERIA = [
    { key: 'manager_controlled_room', text: 'Contrôle de la salle par le gestionnaire' },
    { key: 'discussions_on_track', text: 'Maintien des discussions sur l\'ordre du jour' },
    { key: 'conflict_handled_professionally', text: 'Gestion professionnelle des conflits/tensions' },
    { key: 'answers_clear_confident', text: 'Réponses claires et assurées de l\'animateur' },
    { key: 'board_confidence_level', text: 'Niveau de confiance témoigné par le CA' },
    { key: 'financial_statement_quality', text: 'Qualité de la présentation des états financiers' }
]

const DOCUMENTATION_CRITERIA = [
    { key: 'pv_drafted_quickly', text: 'Procès-verbal rédigé rapidement' },
    { key: 'templates_respected', text: 'Respect des modèles standardisés Laucandrique' },
    { key: 'resolutions_clear', text: 'Clarté de la formulation des résolutions' },
    { key: 'followup_tasks_created', text: 'Création des tâches de suivi post-assemblée' }
]

const DEFAULT_ASSEMBLY_DESCRIPTIONS: Record<string, string> = {
    agenda_sent_on_time: "Vérifier que les convocations et l'ordre du jour ont été transmis aux copropriétaires dans les délais légaux (ex. 10 à 15 jours avant la séance).",
    quorum_respected: "Vérifier que les feuilles de présence sont complétées et que les conditions de quorum sont formellement validées avant d'ouvrir la séance.",
    voting_controlled: "Contrôler la validité des procurations et s'assurer que la saisie et le calcul des voix (tantièmes) sont gérés avec rigueur durant les votes.",
    duration_reasonable: "S'assurer que le déroulement de l'assemblée respecte le temps imparti et évite les débats improductifs.",
    manager_controlled_room: "Évaluer l'autorité naturelle de l'animateur, sa capacité à maintenir le calme et à distribuer équitablement la parole.",
    discussions_on_track: "S'assurer que les interventions restent concentrées sur les points de l'ordre du jour sans s'égarer dans des cas particuliers.",
    conflict_handled_professionally: "Observer la diplomatie et le professionnalisme de l'animateur face aux tensions, critiques ou comportements agressifs.",
    answers_clear_confident: "S'assurer que les réponses fournies par le gestionnaire sont claires, appuyées sur les faits et juridiquement ou techniquement justes.",
    board_confidence_level: "Mesurer la relation de confiance et le soutien manifesté par les membres du CA envers le travail du gestionnaire.",
    financial_statement_quality: "Évaluer la clarté des explications du budget et des états financiers présentés aux copropriétaires.",
    pv_drafted_quickly: "Rédiger et valider le projet de procès-verbal de l'assemblée dans un délai optimal (ex. 5 à 10 jours après la séance).",
    templates_respected: "S'assurer de l'utilisation rigoureuse des modèles officiels et de la charte graphique de Laucandrique.",
    resolutions_clear: "Valider que la formulation et le libellé des résolutions votées sont précis, sans ambiguïté juridique.",
    followup_tasks_created: "Vérifier que toutes les décisions nécessitant des actions (travaux, courriers, etc.) ont fait l'objet de tâches de suivi créées dans le système."
}

export function NewAssemblyEvaluationForm({ 
    clients, 
    managers,
    questionConfigs = [],
    initialEvaluation
}: { 
    clients: any[]
    managers: any[]
    questionConfigs?: any[]
    initialEvaluation?: any
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clientId, setClientId] = useState(initialEvaluation?.client_id || clients[0]?.id || '')
    const [managerId, setManagerId] = useState(initialEvaluation?.manager_id || managers[0]?.id || '')
    const [assemblyDate, setAssemblyDate] = useState(initialEvaluation?.assembly_date || new Date().toISOString().substring(0, 10))
    const [assemblyType, setAssemblyType] = useState(initialEvaluation?.assembly_type || 'annual')
    const [notes, setNotes] = useState(initialEvaluation?.notes || '')
    const [recommendations, setRecommendations] = useState(initialEvaluation?.recommendations || '')

    // Transform clients for SearchableClientSelect
    const clientOptions = clients.map(c => ({
        id: c.id,
        name: c.company_name || c.full_name,
        sdc: c.full_name
    }))

    // Build question configurations lookup
    const descriptionsMap: Record<string, string> = {
        ...DEFAULT_ASSEMBLY_DESCRIPTIONS,
        ...questionConfigs.reduce((acc, c) => ({ ...acc, [c.key]: c.description }), {})
    }

    // Scoring state (supports nullable values for partial evaluation)
    const [scores, setScores] = useState<Record<string, number | null>>(() => {
        const initialScores: Record<string, number | null> = {}
        const allCriteria = [...OPERATIONAL_CRITERIA, ...LEADERSHIP_CRITERIA, ...DOCUMENTATION_CRITERIA]
        allCriteria.forEach(c => {
            if (initialEvaluation && initialEvaluation[c.key] !== undefined) {
                const val = initialEvaluation[c.key]
                initialScores[c.key] = val !== null ? Number(val) : null
            } else {
                // If it is a new evaluation, default operational & leadership to 3, and documentation to null
                const isDoc = DOCUMENTATION_CRITERIA.some(d => d.key === c.key)
                initialScores[c.key] = isDoc ? null : 3
            }
        })
        return initialScores
    })

    // Item notes state
    const [itemNotes, setItemNotes] = useState<Record<string, string>>(() => {
        const initialNotes: Record<string, string> = {}
        const allCriteria = [...OPERATIONAL_CRITERIA, ...LEADERSHIP_CRITERIA, ...DOCUMENTATION_CRITERIA]
        allCriteria.forEach(c => {
            if (initialEvaluation?.item_notes && initialEvaluation.item_notes[c.key] !== undefined) {
                initialNotes[c.key] = initialEvaluation.item_notes[c.key] || ''
            } else {
                initialNotes[c.key] = ''
            }
        })
        return initialNotes
    })

    const handleScoreChange = (key: string, val: number | null) => {
        setScores(prev => ({ ...prev, [key]: val }))
    }

    const handleItemNoteChange = (key: string, val: string) => {
        setItemNotes(prev => ({ ...prev, [key]: val }))
    }

    // Realtime Score aggregate
    const opsSum = OPERATIONAL_CRITERIA.reduce((acc, c) => acc + (scores[c.key] || 0), 0)
    const ldrSum = LEADERSHIP_CRITERIA.reduce((acc, c) => acc + (scores[c.key] || 0), 0)
    const docSum = DOCUMENTATION_CRITERIA.reduce((acc, c) => acc + (scores[c.key] || 0), 0)
    
    const totalPoints = opsSum + ldrSum + docSum
    const gradedCount = Object.keys(scores).filter(k => scores[k] !== null).length
    const maxPoints = gradedCount > 0 ? gradedCount * 5 : 70
    const scorePct = Math.round((totalPoints / maxPoints) * 100)

    const handleSave = async (targetStatus: 'partial' | 'completed') => {
        if (!clientId || !managerId) {
            alert('Sélectionnez un syndicat et un gestionnaire.')
            return
        }

        // Validate if completing
        if (targetStatus === 'completed') {
            const allCriteria = [...OPERATIONAL_CRITERIA, ...LEADERSHIP_CRITERIA, ...DOCUMENTATION_CRITERIA]
            const missing = allCriteria.filter(c => scores[c.key] === null || scores[c.key] === undefined)
            if (missing.length > 0) {
                alert(`Veuillez évaluer tous les critères avant de finaliser l'évaluation. Critères manquants : \n${missing.map(m => `- ${m.text}`).join('\n')}`)
                return
            }
        }

        setLoading(true)
        try {
            const payload = {
                client_id: clientId,
                manager_id: managerId,
                assembly_date: assemblyDate,
                assembly_type: assemblyType,
                status: targetStatus,
                agenda_sent_on_time: scores.agenda_sent_on_time ?? null,
                quorum_respected: scores.quorum_respected ?? null,
                voting_controlled: scores.voting_controlled ?? null,
                duration_reasonable: scores.duration_reasonable ?? null,
                technical_prep_complete: null, // Removed from UI, force null
                manager_controlled_room: scores.manager_controlled_room ?? null,
                discussions_on_track: scores.discussions_on_track ?? null,
                conflict_handled_professionally: scores.conflict_handled_professionally ?? null,
                answers_clear_confident: scores.answers_clear_confident ?? null,
                board_confidence_level: scores.board_confidence_level ?? null,
                financial_statement_quality: scores.financial_statement_quality ?? null,
                pv_drafted_quickly: scores.pv_drafted_quickly ?? null,
                templates_respected: scores.templates_respected ?? null,
                resolutions_clear: scores.resolutions_clear ?? null,
                followup_tasks_created: scores.followup_tasks_created ?? null,
                notes: notes || null,
                recommendations: recommendations || null,
                item_notes: itemNotes
            }

            if (initialEvaluation) {
                await updateAssemblyEvaluationAction(initialEvaluation.id, payload)
            } else {
                await createAssemblyEvaluationAction(payload)
            }

            router.push('/team-management/assemblies')
            router.refresh()
        } catch (err) {
            alert('Erreur lors de l\'enregistrement de l\'évaluation : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 w-full">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <UsersRound className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase">
                            {initialEvaluation ? 'Modifier l\'Évaluation d\'Assemblée' : 'Évaluation d\'Assemblée Générale'}
                        </h2>
                        <p className="text-[10px] text-zinc-400">Évaluez la performance opérationnelle du gestionnaire lors de l'assemblée.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-left sm:text-right">
                        <span className="text-[8px] uppercase font-bold text-zinc-500 block">Performance ({gradedCount}/14 critères)</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-extrabold text-white">{gradedCount > 0 ? `${scorePct}%` : '-'}</span>
                            <Badge variant="outline" className="text-[8px] font-bold bg-purple-950/20 text-purple-300 border-purple-800/40">
                                {totalPoints} / {maxPoints} pts
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            type="button"
                            onClick={() => handleSave('partial')}
                            disabled={loading || !clientId || !managerId}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xxs h-8 px-3 rounded-lg font-bold flex items-center gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5 text-zinc-400" />
                            Sauvegarder la séance
                        </Button>
                        <Button 
                            type="button"
                            onClick={() => handleSave('completed')}
                            disabled={loading || !clientId || !managerId}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-3 rounded-lg font-bold flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 text-purple-200" />
                            Finaliser l'évaluation
                        </Button>
                    </div>
                </div>
            </div>

            {/* General Info Card */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md !overflow-visible">
                <CardHeader>
                    <CardTitle className="text-xs font-bold text-white">Informations Générales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xxs">
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Syndicat / Copropriété</Label>
                        <SearchableClientSelect
                            clients={clientOptions}
                            name="client_id"
                            placeholder="Rechercher un syndicat..."
                            required
                            defaultValue={clientId}
                            onChange={(val) => setClientId(val)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Gestionnaire Animateur</Label>
                        <select 
                            value={managerId} 
                            onChange={(e) => setManagerId(e.target.value)} 
                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9 text-[16px] md:text-xs"
                            required
                        >
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Type d'Assemblée</Label>
                        <select 
                            value={assemblyType} 
                            onChange={(e) => setAssemblyType(e.target.value)} 
                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9 text-[16px] md:text-xs font-semibold"
                            required
                        >
                            <option value="annual">AGA - Mandatoire</option>
                            <option value="age">AGE - Extraordinaire</option>
                            <option value="agi">AGI - Informative</option>
                            <option value="others">Autre</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Date de l'Assemblée</Label>
                        <Input 
                            type="date" 
                            value={assemblyDate} 
                            onChange={(e) => setAssemblyDate(e.target.value)} 
                            className="bg-[#121318] border-zinc-800 h-9 text-[16px] md:text-xxs text-white" 
                            required
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Categories Fields */}
            {[
                { key: 'ops', title: '1. Séance - Critères Opérationnels (Sur 20 points)', list: OPERATIONAL_CRITERIA, score: opsSum, max: 20 },
                { key: 'ldr', title: '2. Séance - Critères de Leadership (Sur 30 points)', list: LEADERSHIP_CRITERIA, score: ldrSum, max: 30 },
                { key: 'doc', title: '3. Documentation & Suivis - 5 à 10 jours après (Sur 20 points)', list: DOCUMENTATION_CRITERIA, score: docSum, max: 20 }
            ].map(sect => (
                <Card key={sect.key} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                            {sect.title}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[9px]">
                            {sect.score} / {sect.max} pts
                        </Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {sect.list.map(c => (
                            <div key={c.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0 text-xxs">
                                {/* Criterion Title & Tooltip */}
                                <div className="md:col-span-5 font-semibold text-zinc-200 flex items-center gap-1.5 pt-2">
                                    <span>{c.text}</span>
                                    {descriptionsMap[c.key] && (
                                        <div className="relative group cursor-pointer inline-flex items-center">
                                            <HelpCircle className="h-3.5 w-3.5 text-zinc-500 hover:text-purple-400 transition-colors shrink-0" />
                                            <div className="absolute left-0 bottom-6 hidden group-hover:block z-50 w-64 p-2.5 bg-[#121318] border border-zinc-800 rounded-lg text-[10px] text-zinc-400 shadow-2xl pointer-events-none font-normal leading-relaxed">
                                                {descriptionsMap[c.key]}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Score dropdown */}
                                <div className="md:col-span-3">
                                    <Label className="text-[8px] text-zinc-500 md:hidden block mb-1">Cote d'évaluation</Label>
                                    <select 
                                        value={scores[c.key] ?? ''}
                                        onChange={(e) => handleScoreChange(c.key, e.target.value === '' ? null : Number(e.target.value))}
                                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 font-semibold text-[16px] md:text-[10px]"
                                    >
                                        <option value="">-- Non évalué / À venir --</option>
                                        <option value="5">5/5 - Parfaitement maîtrisé / Conforme</option>
                                        <option value="4">4/5 - Bon niveau / Améliorations mineures</option>
                                        <option value="3">3/5 - Correct / Dans les normes</option>
                                        <option value="2">2/5 - Passable / Lacunes observables</option>
                                        <option value="1">1/5 - Insuffisant / Dérives sérieuses</option>
                                        <option value="0">0/5 - Non exécuté / Échec critique</option>
                                    </select>
                                </div>
                                {/* Comment textarea */}
                                <div className="md:col-span-4">
                                    <Label className="text-[8px] text-zinc-500 md:hidden block mb-1">Remarques</Label>
                                    <Textarea
                                        value={itemNotes[c.key]}
                                        onChange={(e) => handleItemNoteChange(c.key, e.target.value)}
                                        placeholder="Remarque ou observation sur ce point..."
                                        rows={2}
                                        className="bg-[#121318] border-zinc-800 text-[16px] md:text-[10px] text-white focus-visible:ring-purple-600 resize-y min-h-[50px] py-1.5"
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            {/* Notes & Recommendations Card */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xs font-bold text-white">Rétroaction Qualitative</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xxs">
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Notes & Commentaires additionnels</Label>
                        <Textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Points forts de la séance, attitude générale, accueil des copropriétaires..." 
                            rows={3} 
                            className="bg-[#121318] border-zinc-800 text-xxs text-white" 
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Recommandations opérationnelles pour le gestionnaire</Label>
                        <Textarea 
                            value={recommendations} 
                            onChange={(e) => setRecommendations(e.target.value)} 
                            placeholder="Actions d'amélioration ciblées, formations, conseils de posture..." 
                            rows={3} 
                            className="bg-[#121318] border-zinc-800 text-xxs text-white" 
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-end items-center gap-3 pt-4 pb-12">
                <Button 
                    type="button"
                    onClick={() => handleSave('partial')}
                    disabled={loading || !clientId || !managerId}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs h-9 px-4 rounded-lg font-bold flex items-center gap-1.5"
                >
                    <Save className="h-4 w-4 text-zinc-400" />
                    Sauvegarder la séance (Partiel)
                </Button>
                <Button 
                    type="button"
                    onClick={() => handleSave('completed')}
                    disabled={loading || !clientId || !managerId}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4 rounded-lg font-bold flex items-center gap-1.5"
                >
                    <CheckCircle2 className="h-4 w-4 text-purple-200" />
                    Finaliser l'évaluation (Complet)
                </Button>
            </div>
        </div>
    )
}
