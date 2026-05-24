'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOneOnOneAction, getOneOnOneSnapshotAction } from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
    Handshake, 
    Calendar, 
    User, 
    ClipboardList, 
    CheckCircle2, 
    AlertCircle, 
    PlusCircle, 
    Trash2, 
    ArrowRightLeft, 
    Sparkles 
} from 'lucide-react'

export function NewOneOnOneForm({ managers }: { managers: any[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [managerId, setManagerId] = useState(managers[0]?.id || '')
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().substring(0, 10))
    
    // Snapshot metrics state
    const [emailsOver48h, setEmailsOver48h] = useState(0)
    const [lateTasks, setLateTasks] = useState(0)
    const [callsTotal, setCallsTotal] = useState(0)
    const [callsAnswered, setCallsAnswered] = useState(0)
    const [billsNoNotes, setBillsNoNotes] = useState(0)
    const [opReportsClosed, setOpReportsClosed] = useState(0)
    const [agendaTemplatesUsed, setAgendaTemplatesUsed] = useState(0)
    const [assembliesOnTime, setAssembliesOnTime] = useState(100)
    const [syndicatesLost, setSyndicatesLost] = useState(0)
    const [packageChanges, setPackageChanges] = useState(0)

    // Previous commitments state (carried forward)
    const [previousCommitments, setPreviousCommitments] = useState<any[]>([])

    // New commitments state
    const [newCommitments, setNewCommitments] = useState<string[]>([])
    const [newCommitmentText, setNewCommitmentText] = useState('')

    // Discussion fields state
    const [currentIssues, setCurrentIssues] = useState('')
    const [mainObjectives, setMainObjectives] = useState('')
    const [recentWins, setRecentWins] = useState('')
    const [difficultSituations, setDifficultSituations] = useState('')

    // Next Priorities state
    const [priority1, setPriority1] = useState('')
    const [priority2, setPriority2] = useState('')
    const [priority3, setPriority3] = useState('')

    // Support Required state
    const [trainingRequested, setTrainingRequested] = useState('')
    const [escalationNeeded, setEscalationNeeded] = useState('')
    const [operationalBlockers, setOperationalBlockers] = useState('')
    const [conflictResolution, setConflictResolution] = useState('')

    // Load manager snapshot details
    useEffect(() => {
        if (!managerId) return
        async function fetchSnapshot() {
            try {
                const snapshot = await getOneOnOneSnapshotAction(managerId)
                setCallsTotal(snapshot.calls_total)
                setCallsAnswered(snapshot.calls_answered)
                setLateTasks(snapshot.late_tasks)
                setOpReportsClosed(snapshot.op_reports_closed)
                setSyndicatesLost(snapshot.syndicates_lost)
                setPackageChanges(snapshot.package_changes)
                
                // Set carried over commitments
                setPreviousCommitments(
                    snapshot.pendingCommitments.map((c: any) => ({
                        ...c,
                        why_not: '',
                        failure_reason: 'Lack of organization',
                        carried_forward: true
                    }))
                )
            } catch (err) {
                console.error('Error fetching one-on-one snapshot:', err)
            }
        }
        fetchSnapshot()
    }, [managerId])

    const handleAddCommitment = () => {
        if (!newCommitmentText.trim()) return
        setNewCommitments([...newCommitments, newCommitmentText.trim()])
        setNewCommitmentText('')
    }

    const handleRemoveCommitment = (idx: number) => {
        setNewCommitments(newCommitments.filter((_, i) => i !== idx))
    }

    const handlePreviousCommitmentChange = (idx: number, field: string, value: any) => {
        const copy = [...previousCommitments]
        copy[idx] = { ...copy[idx], [field]: value }
        setPreviousCommitments(copy)
    }

    const handleSubmit = async (status: 'draft' | 'completed') => {
        setLoading(true)
        try {
            // Combine previous commitments and new ones for saving
            const finalCommitments = [
                // Carried over commitments (from previous 1v1)
                ...previousCommitments.map(c => ({
                    commitment_text: c.commitment_text,
                    completed: c.completed,
                    why_not: c.completed ? null : c.why_not,
                    failure_reason: c.completed ? null : c.failure_reason,
                    carried_forward: c.carried_forward
                })),
                // Brand new commitments made during this 1v1
                ...newCommitments.map(c => ({
                    commitment_text: c,
                    completed: false,
                    why_not: null,
                    failure_reason: null,
                    carried_forward: false
                }))
            ]

            await createOneOnOneAction({
                manager_id: managerId,
                meeting_date: meetingDate,
                status,
                emails_over_48h: Number(emailsOver48h),
                late_tasks: Number(lateTasks),
                calls_total: Number(callsTotal),
                calls_answered: Number(callsAnswered),
                bills_no_notes_over_7d: Number(billsNoNotes),
                op_reports_closed: Number(opReportsClosed),
                agenda_templates_used: Number(agendaTemplatesUsed),
                assemblies_on_time: Number(assembliesOnTime),
                syndicates_lost: Number(syndicatesLost),
                package_changes: Number(packageChanges),
                current_issues: currentIssues,
                main_objectives: mainObjectives,
                recent_wins: recentWins,
                difficult_situations: difficultSituations,
                priority_1: priority1,
                priority_2: priority2,
                priority_3: priority3,
                training_requested: trainingRequested,
                escalation_needed: escalationNeeded,
                operational_blockers: operationalBlockers,
                conflict_resolution: conflictResolution,
                commitments: finalCommitments
            })

            router.push('/team-management/one-on-ones')
        } catch (err) {
            alert('Erreur lors de la création de la rencontre: ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header metadata */}
            <div className="flex flex-col md:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start md:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <Handshake className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase">Nouvel Alignement 1-à-1</h2>
                        <p className="text-[10px] text-zinc-400">Configurez et enregistrez une nouvelle rencontre de suivi individuel.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button 
                        onClick={() => handleSubmit('draft')}
                        disabled={loading || !managerId}
                        variant="outline" 
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xxs h-8 px-4 rounded-lg font-bold"
                    >
                        Sauvegarder Brouillon
                    </Button>
                    <Button 
                        onClick={() => handleSubmit('completed')}
                        disabled={loading || !managerId}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold"
                    >
                        Finaliser & Publier
                    </Button>
                </div>
            </div>

            {/* Core details & Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left section: Manager & Date Selection */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-400" />
                            Configuration Initiale
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xxs">
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Sélectionner un Gestionnaire</Label>
                            <select 
                                value={managerId} 
                                onChange={(e) => setManagerId(e.target.value)}
                                className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9"
                                required
                            >
                                {managers.map(m => (
                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Date de la Rencontre</Label>
                            <Input 
                                type="date" 
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                className="bg-[#121318] border-zinc-800 h-9 text-xxs text-white" 
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Right section: Prepopulated Operational Snapshot */}
                <Card className="md:col-span-2 bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            Aperçu Opérationnel (Calculé pour le mois en cours)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xxs">
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Appels Total / Répondus</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" value={callsTotal} onChange={(e) => setCallsTotal(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                                <span className="text-zinc-600">/</span>
                                <Input type="number" value={callsAnswered} onChange={(e) => setCallsAnswered(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Tâches en retard</Label>
                            <Input type="number" value={lateTasks} onChange={(e) => setLateTasks(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Courriels &gt; 48 heures</Label>
                            <Input type="number" value={emailsOver48h} onChange={(e) => setEmailsOver48h(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Factures sans notes &gt; 7 jours</Label>
                            <Input type="number" value={billsNoNotes} onChange={(e) => setBillsNoNotes(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Rapports d'opérations clos</Label>
                            <Input type="number" value={opReportsClosed} onChange={(e) => setOpReportsClosed(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Gabarits d'ordre du jour utilisés</Label>
                            <Input type="number" value={agendaTemplatesUsed} onChange={(e) => setAgendaTemplatesUsed(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Assemblées tenues à temps (%)</Label>
                            <Input type="number" value={assembliesOnTime} onChange={(e) => setAssembliesOnTime(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Syndicats perdus YTD</Label>
                            <Input type="number" value={syndicatesLost} readOnly className="bg-[#121318]/55 border-zinc-850 h-8 text-xxs text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Modifications forfait YTD</Label>
                            <Input type="number" value={packageChanges} readOnly className="bg-[#121318]/55 border-zinc-850 h-8 text-xxs text-zinc-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Previous commitments / accountability */}
            {previousCommitments.length > 0 && (
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-purple-400" />
                            Suivi des Engagements Précédents (Responsabilisation)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xxs text-zinc-300">
                                <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800">
                                    <tr>
                                        <th className="p-3 w-1/3">Engagement</th>
                                        <th className="p-3 text-center w-24">Complété</th>
                                        <th className="p-3">Raison Échec (si non-complété)</th>
                                        <th className="p-3">Détails / Rétroaction</th>
                                        <th className="p-3 text-center w-28">Reporter ?</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-850">
                                    {previousCommitments.map((c, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-900/20">
                                            <td className="p-3 font-semibold text-zinc-200">
                                                {c.commitment_text}
                                            </td>
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={c.completed}
                                                    onChange={(e) => handlePreviousCommitmentChange(idx, 'completed', e.target.checked)}
                                                    className="rounded border-zinc-800 text-purple-600 h-4 w-4" 
                                                />
                                            </td>
                                            <td className="p-3">
                                                {!c.completed && (
                                                    <select 
                                                        value={c.failure_reason || 'Lack of organization'} 
                                                        onChange={(e) => handlePreviousCommitmentChange(idx, 'failure_reason', e.target.value)}
                                                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-1.5 text-zinc-300 outline-none text-[10px]"
                                                    >
                                                        <option value="Lack of organization">Manque d'organisation</option>
                                                        <option value="Lack of training">Besoin de formation</option>
                                                        <option value="Work overload">Surcharge de travail</option>
                                                        <option value="Waiting on board">Attente après le CA</option>
                                                        <option value="Waiting on supplier">Attente après fournisseur</option>
                                                        <option value="Avoidance">Évitement de tâche</option>
                                                        <option value="Prioritization issue">Problème de priorité</option>
                                                        <option value="Process/system issue">Bloqueur système/procédure</option>
                                                        <option value="External issue">Facteur externe</option>
                                                    </select>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {!c.completed && (
                                                    <Input 
                                                        placeholder="Détails expliquant le retard..." 
                                                        value={c.why_not || ''}
                                                        onChange={(e) => handlePreviousCommitmentChange(idx, 'why_not', e.target.value)}
                                                        className="bg-[#121318] border-zinc-800 h-7 text-xxs" 
                                                    />
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {!c.completed && (
                                                    <Badge variant="outline" className="bg-amber-950/20 text-amber-400 border-amber-800/40 text-[9px] font-bold">
                                                        Automatique
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notes & Discussions sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Discussion details */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-purple-400" />
                            Thématiques de Discussion
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xxs">
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Succès & Bonnes Coups Récents</Label>
                            <Textarea value={recentWins} onChange={(e) => setRecentWins(e.target.value)} placeholder="Décrire les réussites..." rows={3} className="bg-[#121318] border-zinc-800 text-xxs text-white" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Difficultés Opérationnelles</Label>
                            <Textarea value={difficultSituations} onChange={(e) => setDifficultSituations(e.target.value)} placeholder="Difficultés rencontrées..." rows={3} className="bg-[#121318] border-zinc-800 text-xxs text-white" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Points & Dossiers Critiques</Label>
                            <Textarea value={currentIssues} onChange={(e) => setCurrentIssues(e.target.value)} placeholder="Problématiques à surveiller..." rows={3} className="bg-[#121318] border-zinc-800 text-xxs text-white" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Objectifs de la Rencontre</Label>
                            <Textarea value={mainObjectives} onChange={(e) => setMainObjectives(e.target.value)} placeholder="Quels sont les buts ciblés..." rows={3} className="bg-[#121318] border-zinc-800 text-xxs text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Next Priorities & Support */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-purple-400" />
                            Priorités & Besoins de Support
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xxs">
                        {/* Priorities */}
                        <div className="space-y-3 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                            <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[9px]">Les 3 Prochaines Priorités Opérationnelles</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 font-bold text-[9px]">P1</Badge>
                                    <Input value={priority1} onChange={(e) => setPriority1(e.target.value)} placeholder="Première priorité..." className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 font-bold text-[9px]">P2</Badge>
                                    <Input value={priority2} onChange={(e) => setPriority2(e.target.value)} placeholder="Deuxième priorité..." className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 font-bold text-[9px]">P3</Badge>
                                    <Input value={priority3} onChange={(e) => setPriority3(e.target.value)} placeholder="Troisième priorité..." className="bg-[#121318] border-zinc-800 h-8 text-xxs" />
                                </div>
                            </div>
                        </div>

                        {/* Support details */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Demandes de Formation / Mentorat</Label>
                                <Input value={trainingRequested} onChange={(e) => setTrainingRequested(e.target.value)} placeholder="Formations suggérées..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Sujets à Escalader à la Direction</Label>
                                <Input value={escalationNeeded} onChange={(e) => setEscalationNeeded(e.target.value)} placeholder="Dossiers nécessitant une intervention..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Bloqueurs Opérationnels Systèmes / Processus</Label>
                                <Input value={operationalBlockers} onChange={(e) => setOperationalBlockers(e.target.value)} placeholder="Outils ou processus inefficaces..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Résolution de Conflits à gérer</Label>
                                <Input value={conflictResolution} onChange={(e) => setConflictResolution(e.target.value)} placeholder="Médiation client ou conseil..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* New commitments log */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                        Nouveaux Engagements Actés
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xxs">
                    <div className="flex gap-2">
                        <Input 
                            value={newCommitmentText} 
                            onChange={(e) => setNewCommitmentText(e.target.value)}
                            placeholder="Saisir un nouvel engagement pour la prochaine rencontre..." 
                            className="bg-[#121318] border-zinc-800 h-9 text-xxs text-white flex-1" 
                        />
                        <Button 
                            onClick={handleAddCommitment}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 px-4 rounded-lg flex items-center gap-1.5"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Ajouter
                        </Button>
                    </div>

                    {newCommitments.length > 0 && (
                        <div className="space-y-2 pt-2">
                            {newCommitments.map((c, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-zinc-900 border border-zinc-850 rounded-xl">
                                    <span className="font-semibold text-zinc-200">{c}</span>
                                    <Button 
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveCommitment(idx)}
                                        className="h-6 w-6 p-0 hover:bg-zinc-800 text-rose-400 hover:text-rose-300"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
