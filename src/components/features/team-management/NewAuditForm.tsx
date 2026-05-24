'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSyndicateAuditAction } from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck, ShieldAlert, CheckCircle, Save } from 'lucide-react'

// Define the 14 questions
const QUESTIONS = [
    { key: 'registre_coproprietaires', category: 'governance', text: 'Registre des copropriétaires à jour' },
    { key: 'convocations_assemblee', category: 'governance', text: 'Convocations d\'assemblées conformes' },
    { key: 'reglement_immeuble', category: 'governance', text: 'Règlements de l\'immeuble respectés' },
    { key: 'proces_verbaux', category: 'governance', text: 'Procès-verbaux rédigés et archivés' },
    { key: 'contrats_fournisseurs', category: 'governance', text: 'Contrats de fournisseurs signés et classés' },
    
    { key: 'budget_annuel', category: 'financial', text: 'Budget annuel voté et respecté' },
    { key: 'fonds_prevoyance', category: 'financial', text: 'Fonds de prévoyance (étude + cotisations) conforme' },
    { key: 'conciliation_bancaire', category: 'financial', text: 'Conciliations bancaires mensuelles complétées' },
    { key: 'perception_charges', category: 'financial', text: 'Perception des charges et gestion des retards' },
    { key: 'etats_financiers', category: 'financial', text: 'États financiers de fin d\'année à jour' },
    
    { key: 'carnet_entretien', category: 'operations', text: 'Carnet d\'entretien de l\'immeuble à jour' },
    { key: 'inspections_preventives', category: 'operations', text: 'Inspections préventives complétées et consignées' },
    { key: 'sinistres_assurance', category: 'operations', text: 'Suivi rigoureux des sinistres et réclamations' },
    { key: 'appels_offres', category: 'operations', text: 'Appels d\'offres conformes pour grands travaux' }
]

export function NewAuditForm({ clients }: { clients: any[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clientId, setClientId] = useState(clients[0]?.id || '')
    const [notes, setNotes] = useState('')
    
    // Scores and individual notes for the 14 questions
    const [scores, setScores] = useState<Record<string, number>>(
        QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: 3 }), {})
    )
    const [qNotes, setQNotes] = useState<Record<string, string>>(
        QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: '' }), {})
    )

    const handleScoreChange = (key: string, val: number) => {
        setScores({ ...scores, [key]: val })
    }

    const handleNoteChange = (key: string, val: string) => {
        setQNotes({ ...qNotes, [key]: val })
    }

    // Realtime Calculations
    const totalPoints = Object.values(scores).reduce((sum, s) => sum + s, 0)
    const healthScore = Math.round((totalPoints / 70) * 100)

    const getHealthRating = (score: number) => {
        if (score >= 90) return { label: 'Excellent', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40' }
        if (score >= 75) return { label: 'Stable', style: 'bg-blue-500/20 text-blue-400 border-blue-800/40' }
        if (score >= 60) return { label: 'À Risque', style: 'bg-amber-500/20 text-amber-400 border-amber-800/40' }
        return { label: 'Critique', style: 'bg-rose-500/20 text-rose-400 border-rose-800/40' }
    }

    const healthRating = getHealthRating(healthScore)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) {
            alert('Sélectionnez un syndicat.')
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

            await createSyndicateAuditAction({
                client_id: clientId,
                notes,
                answers
            })

            router.push('/team-management/audits')
        } catch (err) {
            alert('Erreur lors de la création de l\'audit : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
            {/* Header / Meta Selection */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <ClipboardCheck className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase">Nouvel Audit de Syndicat</h2>
                        <p className="text-[10px] text-zinc-400">Évaluez la qualité de gestion de la copropriété sur 14 points critiques.</p>
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
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold flex items-center gap-1"
                    >
                        <Save className="h-3.5 w-3.5" />
                        Enregistrer l'Audit
                    </Button>
                </div>
            </div>

            {/* Selector Card */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xs font-bold text-white">Sélection du Dossier</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xxs">
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Syndicat / Copropriété</Label>
                        <select 
                            value={clientId} 
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9"
                            required
                        >
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name || c.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-zinc-500">Notes d'Audit Globales</Label>
                        <Input 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Observations globales sur ce dossier..." 
                            className="bg-[#121318] border-zinc-800 h-9 text-xxs text-white" 
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Questions Categories */}
            {(['governance', 'financial', 'operations'] as const).map(cat => {
                const catQuestions = QUESTIONS.filter(q => q.category === cat)
                const catTitle = 
                    cat === 'governance' ? 'Gouvernance & Conformité Juridique' :
                    cat === 'financial' ? 'Santé Financière & Budgets' : 'Opérations & Maintenance'

                return (
                    <Card key={cat} className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                {catTitle}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {catQuestions.map(q => (
                                <div key={q.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-zinc-900 pb-4 last:border-b-0 last:pb-0">
                                    {/* Question Text */}
                                    <div className="md:col-span-5 text-xxs font-semibold text-zinc-200">
                                        {q.text}
                                    </div>
                                    {/* Score Selector */}
                                    <div className="md:col-span-3">
                                        <select 
                                            value={scores[q.key]}
                                            onChange={(e) => handleScoreChange(q.key, Number(e.target.value))}
                                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-xxs font-semibold"
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
                                    <div className="md:col-span-4">
                                        <Input 
                                            value={qNotes[q.key]}
                                            onChange={(e) => handleNoteChange(q.key, e.target.value)}
                                            placeholder="Remarque spécifique..." 
                                            className="bg-[#121318] border-zinc-800 h-8 text-[10px] text-white" 
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )
            })}
        </form>
    )
}
