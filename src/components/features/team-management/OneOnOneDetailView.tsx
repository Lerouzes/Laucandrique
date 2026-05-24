'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateOneOnOneAction, getOneOnOneSnapshotAction } from '@/actions/team-management'
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
    Sparkles,
    Check,
    X,
    Lock
} from 'lucide-react'

export function OneOnOneDetailView({ 
    oneOnOne, 
    commitments,
    manager,
    lastMeeting,
    discussedComplaints = []
}: { 
    oneOnOne: any
    commitments: any[]
    manager: any
    lastMeeting: any | null
    discussedComplaints?: any[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(oneOnOne.status === 'draft')
    
    // Form fields
    const [meetingDate, setMeetingDate] = useState(oneOnOne.meeting_date)
    const [emailsOver48h, setEmailsOver48h] = useState(oneOnOne.emails_over_48h)
    const [lateTasks, setLateTasks] = useState(oneOnOne.late_tasks)
    const [callsTotal, setCallsTotal] = useState(oneOnOne.calls_total)
    const [callsAnswered, setCallsAnswered] = useState(oneOnOne.calls_answered)
    const [billsNoNotes, setBillsNoNotes] = useState(oneOnOne.bills_no_notes_over_7d)
    const [opReportsClosed, setOpReportsClosed] = useState(oneOnOne.op_reports_closed)
    const [syndicatesLost, setSyndicatesLost] = useState(oneOnOne.syndicates_lost)
    const [packageChanges, setPackageChanges] = useState(oneOnOne.package_changes)

    // Live Snapshot Metrics
    const [quoteApprovalRate, setQuoteApprovalRate] = useState(0)
    const [doorsCount, setDoorsCount] = useState(0)
    const [syndicatesCount, setSyndicatesCount] = useState(0)
    const [emailsReceived, setEmailsReceived] = useState(0)

    // Complaints states
    const [managerComplaints, setManagerComplaints] = useState<any[]>(() => {
        return discussedComplaints.map(dc => ({
            id: dc.complaint_id,
            title: dc.complaints?.title,
            description: dc.complaints?.description,
            severity: dc.complaints?.severity,
            clients: dc.complaints?.clients,
            complaint_categories: dc.complaints?.complaint_categories
        }))
    })

    const [complaintDiscussions, setComplaintDiscussions] = useState<Record<string, {
        checked: boolean
        discussion_notes: string
        resolution_plan: string
        resolved_in_meeting: boolean
    }>>(() => {
        const lookup: Record<string, any> = {}
        discussedComplaints.forEach(dc => {
            lookup[dc.complaint_id] = {
                checked: true,
                discussion_notes: dc.discussion_notes || '',
                resolution_plan: dc.resolution_plan || '',
                resolved_in_meeting: dc.resolved_in_meeting || false
            }
        })
        return lookup
    })

    // Load manager live statistics on edit
    useEffect(() => {
        if (!oneOnOne?.manager_id) return
        async function fetchLiveStats() {
            try {
                const snapshot = await getOneOnOneSnapshotAction(oneOnOne.manager_id)
                setQuoteApprovalRate(snapshot.quote_approval_rate)
                setDoorsCount(snapshot.doors_count)
                setSyndicatesCount(snapshot.syndicates_count)
                setEmailsReceived(snapshot.emails_received)

                // Merge open complaints that are not already in managerComplaints
                const openComplaints = snapshot.openComplaints || []
                setManagerComplaints(prev => {
                    const existingIds = new Set(prev.map(c => c.id))
                    const merged = [...prev]
                    openComplaints.forEach(oc => {
                        if (!existingIds.has(oc.id)) {
                            merged.push(oc)
                        }
                    })
                    return merged
                })
            } catch (err) {
                console.error("Error loading live stats in detail view:", err)
            }
        }
        fetchLiveStats()
    }, [oneOnOne?.manager_id])

    // Commitments
    const [meetingCommitments, setMeetingCommitments] = useState<any[]>(commitments || [])
    const [newCommitmentText, setNewCommitmentText] = useState('')

    // Discussion fields
    const [currentIssues, setCurrentIssues] = useState(oneOnOne.current_issues || '')
    const [mainObjectives, setMainObjectives] = useState(oneOnOne.main_objectives || '')
    const [recentWins, setRecentWins] = useState(oneOnOne.recent_wins || '')
    const [difficultSituations, setDifficultSituations] = useState(oneOnOne.difficult_situations || '')

    // Next Priorities
    const [priority1, setPriority1] = useState(oneOnOne.priority_1 || '')
    const [priority2, setPriority2] = useState(oneOnOne.priority_2 || '')
    const [priority3, setPriority3] = useState(oneOnOne.priority_3 || '')

    // Support Required
    const [trainingRequested, setTrainingRequested] = useState(oneOnOne.training_requested || '')
    const [escalationNeeded, setEscalationNeeded] = useState(oneOnOne.escalation_needed || '')
    const [operationalBlockers, setOperationalBlockers] = useState(oneOnOne.operational_blockers || '')
    const [conflictResolution, setConflictResolution] = useState(oneOnOne.conflict_resolution || '')

    const handleAddCommitment = () => {
        if (!newCommitmentText.trim()) return
        setMeetingCommitments([
            ...meetingCommitments, 
            { 
                commitment_text: newCommitmentText.trim(), 
                completed: false,
                why_not: null,
                failure_reason: null,
                carried_forward: false
            }
        ])
        setNewCommitmentText('')
    }

    const handleRemoveCommitment = (idx: number) => {
        setMeetingCommitments(meetingCommitments.filter((_, i) => i !== idx))
    }

    const handleCommitmentChange = (idx: number, field: string, value: any) => {
        const copy = [...meetingCommitments]
        copy[idx] = { ...copy[idx], [field]: value }
        setMeetingCommitments(copy)
    }

    const handleSave = async (status: 'draft' | 'completed') => {
        setLoading(true)
        try {
            const finalComplaints = Object.entries(complaintDiscussions)
                .filter(([_, data]) => data.checked)
                .map(([id, data]) => ({
                    complaint_id: id,
                    discussion_notes: data.discussion_notes,
                    resolution_plan: data.resolution_plan,
                    resolved_in_meeting: data.resolved_in_meeting
                }))

            await updateOneOnOneAction(oneOnOne.id, {
                meeting_date: meetingDate,
                status,
                emails_over_48h: Number(emailsOver48h),
                late_tasks: Number(lateTasks),
                calls_total: Number(callsTotal),
                calls_answered: Number(callsAnswered),
                bills_no_notes_over_7d: Number(billsNoNotes),
                op_reports_closed: Number(opReportsClosed),
                agenda_templates_used: 0,
                assemblies_on_time: 0,
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
                commitments: meetingCommitments,
                complaints: finalComplaints
            })
            
            if (status === 'completed') {
                setIsEditing(false)
            }
            router.refresh()
        } catch (err) {
            alert('Erreur lors de la modification : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start md:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <Handshake className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                            Alignement 1-à-1 avec {manager.first_name} {manager.last_name}
                            {oneOnOne.status === 'completed' && <Lock className="h-3.5 w-3.5 text-zinc-500" />}
                        </h2>
                        <p className="text-[10px] text-zinc-400">
                            Séance tenue le {new Date(oneOnOne.meeting_date).toLocaleDateString('fr-CA')} · Statut : 
                            <span className={oneOnOne.status === 'completed' ? 'text-emerald-400 font-bold ml-1' : 'text-amber-400 font-bold ml-1'}>
                                {oneOnOne.status === 'completed' ? 'Complétée (Verrouillée)' : 'Brouillon'}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {oneOnOne.status === 'draft' && !isEditing && (
                        <Button 
                            onClick={() => setIsEditing(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold"
                        >
                            Modifier le Brouillon
                        </Button>
                    )}

                    {isEditing && (
                        <>
                            <Button 
                                onClick={() => handleSave('draft')}
                                disabled={loading}
                                variant="outline" 
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xxs h-8 px-4 rounded-lg font-bold"
                            >
                                Sauvegarder Brouillon
                            </Button>
                            <Button 
                                onClick={() => handleSave('completed')}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xxs h-8 px-4 rounded-lg font-bold"
                            >
                                Finaliser & Verrouiller
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Read-Only Layout */}
            {!isEditing ? (
                <div className="space-y-6">
                    {/* Read-Only Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Taux de Réponse</span>
                            <span className="text-xs font-bold text-white block">
                                {callsTotal > 0 ? `${Math.round((callsAnswered / callsTotal) * 100)}% (${callsAnswered}/${callsTotal})` : 'Aucun appel'}
                            </span>
                        </div>
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Syndicats perdus YTD</span>
                            <span className="text-xs font-bold text-white block">{syndicatesLost}</span>
                        </div>
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Forfaits modifiés YTD</span>
                            <span className="text-xs font-bold text-white block">{packageChanges}</span>
                        </div>
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Tâches en retard</span>
                            <span className="text-xs font-bold text-white block">{lateTasks}</span>
                        </div>
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Courriels &gt; 48h</span>
                            <span className="text-xs font-bold text-white block">{emailsOver48h}</span>
                        </div>
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Factures sans note</span>
                            <span className="text-xs font-bold text-white block">{billsNoNotes}</span>
                        </div>
                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Rapports clos</span>
                            <span className="text-xs font-bold text-white block">{opReportsClosed}</span>
                        </div>
                    </div>

                    {/* Manager Live stats panel (only shown if loaded) */}
                    {syndicatesCount > 0 && (
                        <div className="space-y-3 p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                            <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[9px]">Indicateurs du Gestionnaire (Temps réel)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-3 bg-[#16171e]/40 border border-zinc-850 rounded-xl space-y-1">
                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Taux d'Approbation</span>
                                    <span className="text-xs font-bold text-zinc-200 block">{quoteApprovalRate}%</span>
                                </div>
                                <div className="p-3 bg-[#16171e]/40 border border-zinc-850 rounded-xl space-y-1">
                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Syndicats Actifs</span>
                                    <span className="text-xs font-bold text-zinc-200 block">{syndicatesCount}</span>
                                </div>
                                <div className="p-3 bg-[#16171e]/40 border border-zinc-850 rounded-xl space-y-1">
                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Nombre de Portes</span>
                                    <span className="text-xs font-bold text-zinc-200 block">{doorsCount}</span>
                                </div>
                                <div className="p-3 bg-[#16171e]/40 border border-zinc-850 rounded-xl space-y-1">
                                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">Volume Courriels (Mensuel)</span>
                                    <span className="text-xs font-bold text-zinc-200 block">{emailsReceived}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Last meeting review notes */}
                    {lastMeeting && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 border-b border-zinc-900/60 bg-zinc-950/10">
                                <CardTitle className="text-xs font-bold text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-purple-400" />
                                        Rétroaction de la rencontre précédente ({new Date(lastMeeting.meeting_date).toLocaleDateString('fr-CA')})
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xxs text-zinc-350">
                                <div className="space-y-3">
                                    {lastMeeting.recent_wins && (
                                        <div>
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px] mb-1">Succès précédents</span>
                                            <p className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 leading-relaxed whitespace-pre-wrap">{lastMeeting.recent_wins}</p>
                                        </div>
                                    )}
                                    {lastMeeting.difficult_situations && (
                                        <div>
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px] mb-1">Difficultés relevées</span>
                                            <p className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 leading-relaxed whitespace-pre-wrap">{lastMeeting.difficult_situations}</p>
                                        </div>
                                    )}
                                    {lastMeeting.current_issues && (
                                        <div>
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px] mb-1">Dossiers chauds / points critiques</span>
                                            <p className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 leading-relaxed whitespace-pre-wrap">{lastMeeting.current_issues}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {/* Previous priorities */}
                                    <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2">
                                        <span className="text-zinc-500 block font-bold uppercase text-[8px]">Dernières priorités fixées</span>
                                        {lastMeeting.priority_1 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/20 text-purple-400 border border-purple-800/40 text-[8px]">P1</Badge> <span>{lastMeeting.priority_1}</span></div>}
                                        {lastMeeting.priority_2 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/20 text-purple-400 border border-purple-800/40 text-[8px]">P2</Badge> <span>{lastMeeting.priority_2}</span></div>}
                                        {lastMeeting.priority_3 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/20 text-purple-400 border border-purple-800/40 text-[8px]">P3</Badge> <span>{lastMeeting.priority_3}</span></div>}
                                    </div>

                                    {/* Previous commitments list */}
                                    {lastMeeting.commitments && lastMeeting.commitments.length > 0 && (
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2">
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px]">Tous les engagements pris</span>
                                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                                                {lastMeeting.commitments.map((c: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center gap-2 text-[10px] pb-1 border-b border-zinc-850/50 last:border-b-0 last:pb-0">
                                                        <span className={c.completed ? "line-through text-zinc-500" : "font-semibold text-zinc-300"}>{c.commitment_text}</span>
                                                        <Badge variant="outline" className={c.completed ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/40 text-[8px]" : "bg-rose-950/20 text-rose-400 border-rose-800/40 text-[8px]"}>
                                                            {c.completed ? 'Fait' : 'En attente'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Discussion notes read-only */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Notes & Discussions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xxs text-zinc-300">
                                {recentWins && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Succès & Bons Coups</h4>
                                        <p className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 leading-relaxed whitespace-pre-wrap">{recentWins}</p>
                                    </div>
                                )}
                                {difficultSituations && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Difficultés Opérationnelles</h4>
                                        <p className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 leading-relaxed whitespace-pre-wrap">{difficultSituations}</p>
                                    </div>
                                )}
                                {currentIssues && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Points & Dossiers Critiques</h4>
                                        <p className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 leading-relaxed whitespace-pre-wrap">{currentIssues}</p>
                                    </div>
                                )}
                                {mainObjectives && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Objectifs de la Rencontre</h4>
                                        <p className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 leading-relaxed whitespace-pre-wrap">{mainObjectives}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Priorités & Support Demandé</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xxs text-zinc-300">
                                {/* Priorities */}
                                <div className="space-y-2 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Les 3 Priorités Opérationnelles</h4>
                                    {priority1 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 text-[8px] font-bold">P1</Badge> <span>{priority1}</span></div>}
                                    {priority2 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 text-[8px] font-bold">P2</Badge> <span>{priority2}</span></div>}
                                    {priority3 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 text-[8px] font-bold">P3</Badge> <span>{priority3}</span></div>}
                                </div>

                                {/* Support fields */}
                                {trainingRequested && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Formation & Mentorat</h4>
                                        <p className="bg-zinc-950/40 p-2 rounded border border-zinc-900">{trainingRequested}</p>
                                    </div>
                                )}
                                {escalationNeeded && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Escalades Direction</h4>
                                        <p className="bg-zinc-950/40 p-2 rounded border border-zinc-900">{escalationNeeded}</p>
                                    </div>
                                )}
                                {operationalBlockers && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Bloqueurs Processus / Systèmes</h4>
                                        <p className="bg-zinc-950/40 p-2 rounded border border-zinc-900">{operationalBlockers}</p>
                                    </div>
                                )}
                                {conflictResolution && (
                                    <div>
                                        <h4 className="text-zinc-500 font-bold uppercase text-[9px] mb-1">Médiations / Conflits</h4>
                                        <p className="bg-zinc-950/40 p-2 rounded border border-zinc-900">{conflictResolution}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Commitments Table Read-Only */}
                    {meetingCommitments.length > 0 && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                                    Engagements Actés & Suivi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-left text-xxs text-zinc-300">
                                    <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800">
                                        <tr>
                                            <th className="p-3 w-1/2">Engagement</th>
                                            <th className="p-3 text-center">Statut</th>
                                            <th className="p-3">Raison d'échec</th>
                                            <th className="p-3 text-right">Reporté ?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {meetingCommitments.map((c, idx) => (
                                            <tr key={idx} className="hover:bg-zinc-900/10">
                                                <td className="p-3 font-semibold text-zinc-200">{c.commitment_text}</td>
                                                <td className="p-3 text-center">
                                                    {c.completed ? (
                                                        <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-800/40 text-[8px] font-bold">
                                                            Complété
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-rose-950/20 text-rose-400 border-rose-800/40 text-[8px] font-bold">
                                                            En attente
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="p-3 text-zinc-400 italic">
                                                    {!c.completed && c.failure_reason ? (
                                                        <span>
                                                            <strong>{c.failure_reason}</strong>
                                                            {c.why_not && ` - ${c.why_not}`}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {c.carried_forward ? 'Oui' : 'Non'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Discussed Complaints Read-Only */}
                    {discussedComplaints.length > 0 && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-purple-400" />
                                    Plaintes Client abordées lors de la rencontre ({discussedComplaints.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xxs">
                                {discussedComplaints.map((dc: any) => {
                                    const c = dc.complaints
                                    const clientName = c?.clients ? (c.clients.company_name || c.clients.full_name) : 'Copropriété inconnue'
                                    const sdcNum = c?.clients?.full_name || 'Inconnu'
                                    const categoryName = c?.complaint_categories?.name || 'Non spécifiée'

                                    const sevStyle = 
                                        c?.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                                        c?.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-850/40' :
                                        c?.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-800/40' :
                                        'bg-zinc-900 text-zinc-400 border-zinc-850'

                                    return (
                                        <div key={dc.id} className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-zinc-200 block text-xs">{c?.title}</span>
                                                    <span className="text-zinc-500 text-[10px]">
                                                        Syndicat: <strong className="text-zinc-400">{clientName} [{sdcNum}]</strong>
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-[8px] font-bold bg-purple-950/20 text-purple-400 border-purple-800/30">{categoryName}</Badge>
                                                    <Badge variant="outline" className={`text-[8px] font-bold ${sevStyle}`}>{c?.severity}</Badge>
                                                    <Badge variant="outline" className={dc.resolved_in_meeting ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/40 text-[8px] font-bold" : "bg-rose-950/20 text-rose-400 border-rose-800/40 text-[8px] font-bold"}>
                                                        {dc.resolved_in_meeting ? 'Résolue en séance' : 'Discutée'}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {c?.description && (
                                                <div className="text-zinc-400 bg-zinc-950/25 p-2 rounded-lg border border-zinc-900 leading-relaxed text-[10px]">
                                                    <strong className="text-zinc-500 block text-[9px] uppercase mb-1">Détails de la plainte:</strong>
                                                    {c.description}
                                                </div>
                                            )}

                                            {(dc.discussion_notes || dc.resolution_plan) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-850/50">
                                                    {dc.discussion_notes && (
                                                        <div>
                                                            <strong className="text-zinc-500 block text-[8px] uppercase mb-1">Notes de discussion:</strong>
                                                            <p className="bg-zinc-950/25 p-2.5 rounded-lg border border-zinc-900 text-zinc-350 whitespace-pre-wrap leading-relaxed">{dc.discussion_notes}</p>
                                                        </div>
                                                    )}
                                                    {dc.resolution_plan && (
                                                        <div>
                                                            <strong className="text-zinc-500 block text-[8px] uppercase mb-1">Plan de résolution:</strong>
                                                            <p className="bg-zinc-950/25 p-2.5 rounded-lg border border-zinc-900 text-zinc-350 whitespace-pre-wrap leading-relaxed">{dc.resolution_plan}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* Editable layout (Draft State) */
                <div className="space-y-6">
                    {/* Setup / Metrics Input */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-purple-400" />
                                    Date de Rencontre
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xxs">
                                <Label className="text-zinc-500">Date</Label>
                                <Input 
                                    type="date" 
                                    value={meetingDate} 
                                    onChange={(e) => setMeetingDate(e.target.value)} 
                                    className="bg-[#121318] border-zinc-800 h-9 text-xxs mt-1 text-white" 
                                />
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-400" />
                                    Aperçu Opérationnel
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 text-xxs">
                                {/* Section 1: Inputs manually filled during the 1-on-1 */}
                                <div className="space-y-3">
                                    <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[9px]">Indicateurs à renseigner</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Tâches en retard</Label>
                                            <Input type="number" value={lateTasks} onChange={(e) => setLateTasks(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Courriels &gt; 48 heures</Label>
                                            <Input type="number" value={emailsOver48h} onChange={(e) => setEmailsOver48h(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Factures sans notes &gt; 7j</Label>
                                            <Input type="number" value={billsNoNotes} onChange={(e) => setBillsNoNotes(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-500">Rapports opérationnels clos</Label>
                                            <Input type="number" value={opReportsClosed} onChange={(e) => setOpReportsClosed(Number(e.target.value))} className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Snapshotted statistics (computed & saved on publish, read-only) */}
                                <div className="space-y-3 border-t border-zinc-900 pt-4">
                                    <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[9px]">Statistiques du mois (Capture automatique)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Appels Répondus / Total</span>
                                            <span className="text-xs font-bold text-zinc-200 block">
                                                {callsTotal > 0 ? `${Math.round((callsAnswered / callsTotal) * 100)}% (${callsAnswered}/${callsTotal})` : 'Aucun appel'}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Syndicats perdus YTD</span>
                                            <span className="text-xs font-bold text-zinc-200 block">{syndicatesLost}</span>
                                        </div>
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Changements forfait YTD</span>
                                            <span className="text-xs font-bold text-zinc-200 block">{packageChanges}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Manager Live stats at time of interview */}
                                <div className="space-y-3 border-t border-zinc-900 pt-4">
                                    <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[9px]">Indicateurs du Gestionnaire (Temps réel)</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Taux d'Approbation</span>
                                            <span className="text-xs font-bold text-zinc-200 block">{quoteApprovalRate}%</span>
                                        </div>
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Syndicats Actifs</span>
                                            <span className="text-xs font-bold text-zinc-200 block">{syndicatesCount}</span>
                                        </div>
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Nombre de Portes</span>
                                            <span className="text-xs font-bold text-zinc-200 block">{doorsCount}</span>
                                        </div>
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                            <span className="text-zinc-500 block uppercase font-bold text-[8px]">Volume Courriels (Mensuel)</span>
                                            <span className="text-xs font-bold text-zinc-200 block">{emailsReceived}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Last meeting review notes */}
                    {lastMeeting && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 border-b border-zinc-900/60 bg-zinc-950/10">
                                <CardTitle className="text-xs font-bold text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-purple-400" />
                                        Rétroaction de la rencontre précédente ({new Date(lastMeeting.meeting_date).toLocaleDateString('fr-CA')})
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xxs text-zinc-350">
                                <div className="space-y-3">
                                    {lastMeeting.recent_wins && (
                                        <div>
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px] mb-1">Succès précédents</span>
                                            <p className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 leading-relaxed whitespace-pre-wrap">{lastMeeting.recent_wins}</p>
                                        </div>
                                    )}
                                    {lastMeeting.difficult_situations && (
                                        <div>
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px] mb-1">Difficultés relevées</span>
                                            <p className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 leading-relaxed whitespace-pre-wrap">{lastMeeting.difficult_situations}</p>
                                        </div>
                                    )}
                                    {lastMeeting.current_issues && (
                                        <div>
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px] mb-1">Dossiers chauds / points critiques</span>
                                            <p className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 leading-relaxed whitespace-pre-wrap">{lastMeeting.current_issues}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {/* Previous priorities */}
                                    <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2">
                                        <span className="text-zinc-500 block font-bold uppercase text-[8px]">Dernières priorités fixées</span>
                                        {lastMeeting.priority_1 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/20 text-purple-400 border border-purple-800/40 text-[8px]">P1</Badge> <span>{lastMeeting.priority_1}</span></div>}
                                        {lastMeeting.priority_2 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/20 text-purple-400 border border-purple-800/40 text-[8px]">P2</Badge> <span>{lastMeeting.priority_2}</span></div>}
                                        {lastMeeting.priority_3 && <div className="flex items-center gap-2"><Badge className="bg-purple-900/20 text-purple-400 border border-purple-800/40 text-[8px]">P3</Badge> <span>{lastMeeting.priority_3}</span></div>}
                                    </div>

                                    {/* Previous commitments list */}
                                    {lastMeeting.commitments && lastMeeting.commitments.length > 0 && (
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2">
                                            <span className="text-zinc-500 block font-bold uppercase text-[8px]">Tous les engagements pris</span>
                                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                                                {lastMeeting.commitments.map((c: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center gap-2 text-[10px] pb-1 border-b border-zinc-850/50 last:border-b-0 last:pb-0">
                                                        <span className={c.completed ? "line-through text-zinc-500" : "font-semibold text-zinc-300"}>{c.commitment_text}</span>
                                                        <Badge variant="outline" className={c.completed ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/40 text-[8px]" : "bg-rose-950/20 text-rose-400 border-rose-800/40 text-[8px]"}>
                                                            {c.completed ? 'Fait' : 'En attente'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Complaints section (Editable) */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md mb-6">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                <AlertCircle className="h-4.5 w-4.5 text-purple-400" />
                                Plaintes Actives à aborder ({managerComplaints.length})
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Sélectionnez les plaintes du gestionnaire à discuter pendant la rencontre, saisissez les notes de discussion et marquez-les comme résolues au besoin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xxs">
                            {managerComplaints.length === 0 ? (
                                <p className="text-xxs text-zinc-500 italic py-3 text-center">Aucune plainte active pour ce gestionnaire.</p>
                            ) : (
                                <div className="space-y-4">
                                    {managerComplaints.map((c) => {
                                        const isChecked = !!complaintDiscussions[c.id]?.checked
                                        const clientName = c.clients ? (c.clients.company_name || c.clients.full_name) : 'Copropriété inconnue'
                                        const sdcNum = c.clients?.full_name || 'Inconnu'
                                        const categoryName = c.complaint_categories?.name || 'Non spécifiée'
                                        
                                        const sevStyle = 
                                            c.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                                            c.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-850/40' :
                                            c.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-800/40' :
                                            'bg-zinc-900 text-zinc-400 border-zinc-850'

                                        return (
                                            <div key={c.id} className="p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <input 
                                                            type="checkbox"
                                                            id={`comp-${c.id}`}
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                setComplaintDiscussions(prev => ({
                                                                    ...prev,
                                                                    [c.id]: {
                                                                        checked,
                                                                        discussion_notes: prev[c.id]?.discussion_notes || '',
                                                                        resolution_plan: prev[c.id]?.resolution_plan || '',
                                                                        resolved_in_meeting: prev[c.id]?.resolved_in_meeting || false
                                                                    }
                                                                }))
                                                            }}
                                                            className="rounded border-zinc-800 text-purple-600 h-4.5 w-4.5 mt-0.5"
                                                        />
                                                        <div className="space-y-1">
                                                            <label htmlFor={`comp-${c.id}`} className="text-xs font-bold text-zinc-200 cursor-pointer hover:text-white transition-colors">
                                                                {c.title}
                                                            </label>
                                                            <p className="text-zinc-500 text-[10px]">
                                                                Syndicat: <strong className="text-zinc-400">{clientName} [{sdcNum}]</strong>
                                                            </p>
                                                            {c.description && (
                                                                <p className="text-[10px] text-zinc-400 bg-zinc-950/30 p-2 rounded-lg border border-zinc-900 leading-relaxed mt-1.5 max-w-2xl">
                                                                    {c.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5 shrink-0">
                                                        <Badge variant="outline" className="text-[8px] font-bold bg-purple-950/20 text-purple-400 border-purple-800/30">{categoryName}</Badge>
                                                        <Badge variant="outline" className={`text-[8px] font-bold ${sevStyle}`}>{c.severity}</Badge>
                                                    </div>
                                                </div>

                                                {isChecked && (
                                                    <div className="pl-7 space-y-3 pt-2 border-t border-zinc-850/60 animate-in fade-in duration-200">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500">Notes de discussion (lors du 1v1)</Label>
                                                                <Textarea 
                                                                    value={complaintDiscussions[c.id]?.discussion_notes || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        setComplaintDiscussions(prev => ({
                                                                            ...prev,
                                                                            [c.id]: { ...prev[c.id], discussion_notes: val }
                                                                        }))
                                                                    }}
                                                                    placeholder="Qu'est-ce qui a été discuté ?" 
                                                                    rows={2} 
                                                                    className="bg-[#121318] border-zinc-800 text-xxs text-white" 
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-zinc-500">Plan de résolution</Label>
                                                                <Textarea 
                                                                    value={complaintDiscussions[c.id]?.resolution_plan || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        setComplaintDiscussions(prev => ({
                                                                            ...prev,
                                                                            [c.id]: { ...prev[c.id], resolution_plan: val }
                                                                        }))
                                                                    }}
                                                                    placeholder="Plan d'action pour résoudre le problème..." 
                                                                    rows={2} 
                                                                    className="bg-[#121318] border-zinc-800 text-xxs text-white" 
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="checkbox"
                                                                id={`resolve-${c.id}`}
                                                                checked={!!complaintDiscussions[c.id]?.resolved_in_meeting}
                                                                onChange={(e) => {
                                                                    const resolved_in_meeting = e.target.checked
                                                                    setComplaintDiscussions(prev => ({
                                                                        ...prev,
                                                                        [c.id]: { ...prev[c.id], resolved_in_meeting }
                                                                    }))
                                                                }}
                                                                className="rounded border-zinc-800 text-emerald-600 h-4 w-4"
                                                            />
                                                            <label htmlFor={`resolve-${c.id}`} className="text-zinc-400 cursor-pointer font-semibold text-[10px] hover:text-zinc-200 select-none">
                                                                Marquer comme résolue à l'issue de cette rencontre
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Discussions & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-purple-400" />
                                    Thématiques de Discussion
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xxs">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Succès & Bonnes Coups</Label>
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

                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-purple-400" />
                                    Priorités & Besoins de Support
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xxs">
                                {/* 3 Priorities */}
                                <div className="space-y-3 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[9px]">Les 3 Prochaines Priorités</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 font-bold text-[9px]">P1</Badge>
                                            <Input value={priority1} onChange={(e) => setPriority1(e.target.value)} placeholder="Première priorité..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 font-bold text-[9px]">P2</Badge>
                                            <Input value={priority2} onChange={(e) => setPriority2(e.target.value)} placeholder="Deuxième priorité..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-purple-900/30 text-purple-400 border border-purple-800 font-bold text-[9px]">P3</Badge>
                                            <Input value={priority3} onChange={(e) => setPriority3(e.target.value)} placeholder="Troisième priorité..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Support fields */}
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Demandes de Formation / Mentorat</Label>
                                        <Input value={trainingRequested} onChange={(e) => setTrainingRequested(e.target.value)} placeholder="Formations suggérées..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Sujets à Escalader à la Direction</Label>
                                        <Input value={escalationNeeded} onChange={(e) => setEscalationNeeded(e.target.value)} placeholder="Dossiers nécessitant une intervention..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Bloqueurs Opérationnels Processus / Outils</Label>
                                        <Input value={operationalBlockers} onChange={(e) => setOperationalBlockers(e.target.value)} placeholder="Outils ou processus inefficaces..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Médiations / Conflits clients</Label>
                                        <Input value={conflictResolution} onChange={(e) => setConflictResolution(e.target.value)} placeholder="Médiation client ou conseil..." className="bg-[#121318] border-zinc-800 h-8 text-xxs text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Commitments list editor */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                                Suivi des Engagements
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xxs">
                            {/* Existing commitments table */}
                            {meetingCommitments.length > 0 && (
                                <div className="overflow-x-auto border-b border-zinc-850 pb-4">
                                    <table className="w-full text-left text-xxs text-zinc-300">
                                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800">
                                            <tr>
                                                <th className="p-3 w-1/3">Engagement</th>
                                                <th className="p-3 text-center w-20">Complété</th>
                                                <th className="p-3">Raison d'Échec</th>
                                                <th className="p-3">Explication</th>
                                                <th className="p-3 text-center">Reporté ?</th>
                                                <th className="p-3 text-right w-16">Supprimer</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-850">
                                            {meetingCommitments.map((c, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-900/10">
                                                    <td className="p-3 font-semibold text-zinc-200">
                                                        {c.commitment_text}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={c.completed}
                                                            onChange={(e) => handleCommitmentChange(idx, 'completed', e.target.checked)}
                                                            className="rounded border-zinc-800 text-purple-600 h-4 w-4" 
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        {!c.completed && (
                                                            <select 
                                                                value={c.failure_reason || 'Lack of organization'} 
                                                                onChange={(e) => handleCommitmentChange(idx, 'failure_reason', e.target.value)}
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
                                                                onChange={(e) => handleCommitmentChange(idx, 'why_not', e.target.value)}
                                                                className="bg-[#121318] border-zinc-800 h-7 text-xxs" 
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={c.carried_forward}
                                                            onChange={(e) => handleCommitmentChange(idx, 'carried_forward', e.target.checked)}
                                                            className="rounded border-zinc-800 text-purple-600 h-4 w-4" 
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button 
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveCommitment(idx)}
                                                            className="h-6 w-6 p-0 hover:bg-zinc-850 text-rose-400"
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

                            {/* Add new commitment */}
                            <div className="flex gap-2">
                                <Input 
                                    value={newCommitmentText} 
                                    onChange={(e) => setNewCommitmentText(e.target.value)}
                                    placeholder="Ajouter un engagement pris lors de cette séance..." 
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
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
