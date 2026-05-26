'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAssemblyEvaluationAction } from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchableClientSelect } from './SearchableClientSelect'
import { UsersRound, Save, Sparkles, CheckCircle2 } from 'lucide-react'

const OPERATIONAL_CRITERIA = [
    { key: 'agenda_sent_on_time', text: 'Ordre du jour envoyé dans les délais' },
    { key: 'quorum_respected', text: 'Quorum atteint et règles d\'ouverture respectées' },
    { key: 'voting_controlled', text: 'Gestion et contrôle des votes/procurations' },
    { key: 'duration_reasonable', text: 'Durée raisonnable de la séance' },
    { key: 'technical_prep_complete', text: 'Préparation technique complète (plateforme/salle)' }
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

export function NewAssemblyEvaluationForm({ 
    clients, 
    managers 
}: { 
    clients: any[]
    managers: any[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clientId, setClientId] = useState(clients[0]?.id || '')
    const [managerId, setManagerId] = useState(managers[0]?.id || '')
    const [assemblyDate, setAssemblyDate] = useState(new Date().toISOString().substring(0, 10))
    const [notes, setNotes] = useState('')
    const [recommendations, setRecommendations] = useState('')

    // Transform clients for SearchableClientSelect
    const clientOptions = clients.map(c => ({
        id: c.id,
        name: c.company_name || c.full_name,
        sdc: c.full_name
    }))

    // Scoring state
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initialScores: Record<string, number> = {}
        const allCriteria = [...OPERATIONAL_CRITERIA, ...LEADERSHIP_CRITERIA, ...DOCUMENTATION_CRITERIA]
        allCriteria.forEach(c => {
            initialScores[c.key] = 3
        })
        return initialScores
    })

    // Item notes state
    const [itemNotes, setItemNotes] = useState<Record<string, string>>(() => {
        const initialNotes: Record<string, string> = {}
        const allCriteria = [...OPERATIONAL_CRITERIA, ...LEADERSHIP_CRITERIA, ...DOCUMENTATION_CRITERIA]
        allCriteria.forEach(c => {
            initialNotes[c.key] = ''
        })
        return initialNotes
    })

    const handleScoreChange = (key: string, val: number) => {
        setScores({ ...scores, [key]: val })
    }

    const handleItemNoteChange = (key: string, val: string) => {
        setItemNotes({ ...itemNotes, [key]: val })
    }

    // Realtime Score aggregate
    const opsSum = OPERATIONAL_CRITERIA.reduce((acc, c) => acc + scores[c.key], 0)
    const ldrSum = LEADERSHIP_CRITERIA.reduce((acc, c) => acc + scores[c.key], 0)
    const docSum = DOCUMENTATION_CRITERIA.reduce((acc, c) => acc + scores[c.key], 0)
    
    const totalPoints = opsSum + ldrSum + docSum
    const maxPoints = 15 * 5 // 15 criteria * 5 points max = 75
    const scorePct = Math.round((totalPoints / maxPoints) * 100)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId || !managerId) {
            alert('Sélectionnez un syndicat et un gestionnaire.')
            return
        }

        setLoading(true)
        try {
            await createAssemblyEvaluationAction({
                client_id: clientId,
                manager_id: managerId,
                assembly_date: assemblyDate,
                agenda_sent_on_time: scores.agenda_sent_on_time,
                quorum_respected: scores.quorum_respected,
                voting_controlled: scores.voting_controlled,
                duration_reasonable: scores.duration_reasonable,
                technical_prep_complete: scores.technical_prep_complete,
                manager_controlled_room: scores.manager_controlled_room,
                discussions_on_track: scores.discussions_on_track,
                conflict_handled_professionally: scores.conflict_handled_professionally,
                answers_clear_confident: scores.answers_clear_confident,
                board_confidence_level: scores.board_confidence_level,
                financial_statement_quality: scores.financial_statement_quality,
                pv_drafted_quickly: scores.pv_drafted_quickly,
                templates_respected: scores.templates_respected,
                resolutions_clear: scores.resolutions_clear,
                followup_tasks_created: scores.followup_tasks_created,
                notes,
                recommendations,
                item_notes: itemNotes
            })

            router.push('/team-management/assemblies')
        } catch (err) {
            alert('Erreur lors de la création de l\'évaluation : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <UsersRound className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase">Évaluation d'Assemblée Générale</h2>
                        <p className="text-[10px] text-zinc-400">Évaluez la performance opérationnelle du gestionnaire lors de l'assemblée.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[8px] uppercase font-bold text-zinc-500 block">Performance</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-extrabold text-white">{scorePct}%</span>
                            <Badge variant="outline" className="text-[8px] font-bold bg-purple-950/20 text-purple-300 border-purple-800/40">
                                {totalPoints} / {maxPoints} pts
                            </Badge>
                        </div>
                    </div>
                    <Button 
                        type="submit"
                        disabled={loading || !clientId || !managerId}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold flex items-center gap-1"
                    >
                        <Save className="h-3.5 w-3.5" />
                        Enregistrer
                    </Button>
                </div>
            </div>

            {/* General Info Card */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xs font-bold text-white">Informations Générales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xxs">
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
                { key: 'ops', title: 'Critères Opérationnels (Sur 25 points)', list: OPERATIONAL_CRITERIA, score: opsSum },
                { key: 'ldr', title: 'Critères de Leadership (Sur 30 points)', list: LEADERSHIP_CRITERIA, score: ldrSum },
                { key: 'doc', title: 'Critères Rétroaction & Procès-Verbal (Sur 20 points)', list: DOCUMENTATION_CRITERIA, score: docSum }
            ].map(sect => (
                <Card key={sect.key} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                            {sect.title}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[9px]">
                            {sect.score} pts
                        </Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {sect.list.map(c => (
                            <div key={c.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0 text-xxs">
                                <div className="md:col-span-5 font-semibold text-zinc-200">
                                    {c.text}
                                </div>
                                <div className="md:col-span-3">
                                    <select 
                                        value={scores[c.key]}
                                        onChange={(e) => handleScoreChange(c.key, Number(e.target.value))}
                                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 font-semibold text-[16px] md:text-[10px]"
                                    >
                                        <option value="5">5/5 - Parfaitement maîtrisé / Conforme</option>
                                        <option value="4">4/5 - Bon niveau / Améliorations mineures</option>
                                        <option value="3">3/5 - Correct / Dans les normes</option>
                                        <option value="2">2/5 - Passable / Lacunes observables</option>
                                        <option value="1">1/5 - Insuffisant / Dérives sérieuses</option>
                                        <option value="0">0/5 - Non exécuté / Échec critique</option>
                                    </select>
                                </div>
                                <div className="md:col-span-4">
                                    <Input
                                        value={itemNotes[c.key]}
                                        onChange={(e) => handleItemNoteChange(c.key, e.target.value)}
                                        placeholder="Note ou remarque sur ce point..."
                                        className="bg-[#121318] border-zinc-800 h-8 text-[16px] md:text-[10px] text-white"
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
        </form>
    )
}
