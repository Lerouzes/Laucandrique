'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
    updateOneOnOneAction, 
    deleteOneOnOneAction,
    addOneOnOneItemNoteAction,
    getOneOnOneItemNotesAction,
    getItemNotesAction,
    updateOneOnOneItemNoteAction,
    deleteOneOnOneItemNoteAction,
    purgeOverdue2025AssembliesAction,
    getAssemblyTrackingForManagerAction,
    updateAssemblyTrackingAction,
    confirmAssemblyCompletedAction,
    deleteAssemblyTrackingAction,
    getCategoryComplaintHistoryAction,
    getSyndicateAuditDetailsAction,
    getAssemblyEvaluationDetailsAction,
    getOneOnOneSnapshotAction
} from '@/actions/team-management'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    Sparkles,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Search,
    BookOpen,
    HelpCircle,
    Sliders,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    Lock,
    Unlock,
    X,
    ArrowLeft,
    RefreshCw,
    Clock,
    FileText,
    Network,
    Plus,
    Check,
    CheckSquare,
    AlertTriangle,
    Eye,
    ChevronUp as ArrowUp,
    ChevronDown as ArrowDown,
    Edit
} from 'lucide-react'
import { SearchableClientSelect } from './SearchableClientSelect'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { CallsStatsPanel } from './CallsStatsPanel'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { toast } from 'sonner'

const formatYearMonthFr = (ym: string | null) => {
    if (!ym) return ''
    if (ym.startsWith('Réunion')) return ym
    const parts = ym.split('-')
    if (parts.length < 2) return ym
    const [year, month] = parts.map(Number)
    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    if (month < 1 || month > 12) return ym
    return `${months[month - 1]} ${year}`
}

const getEvalYearMonth = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length < 2) return ''
    let year = Number(parts[0])
    let month = Number(parts[1])
    month -= 1
    if (month === 0) {
        month = 12
        year -= 1
    }
    return `${year}-${String(month).padStart(2, '0')}`
}

const getPrevEvalYearMonth = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length < 2) return ''
    let year = Number(parts[0])
    let month = Number(parts[1])
    month -= 2
    if (month <= 0) {
        month += 12
        year -= 1
    }
    return `${year}-${String(month).padStart(2, '0')}`
}

const AUDIT_LABELS: Record<string, string> = {
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

export function OneOnOneDetailView({
    oneOnOne, 
    commitments: initialCommitments = [],
    manager,
    lastMeeting,
    discussedComplaints = [],
    reviewedAudits = [],
    reviewedAssemblies = [],
    taskEmailAudits: initialTaskEmailAudits = [],
    operationalRisks: initialOperationalRisks = [],
    communicationStats = []
}: { 
    oneOnOne: any
    commitments: any[]
    manager: any
    lastMeeting: any | null
    discussedComplaints?: any[]
    reviewedAudits?: any[]
    reviewedAssemblies?: any[]
    taskEmailAudits?: any[]
    operationalRisks?: any[]
    communicationStats?: any[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(oneOnOne.status === 'draft')
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    
    // Meeting Header
    const [meetingDate, setMeetingDate] = useState(oneOnOne.meeting_date)
    const [nextMeetingDate, setNextMeetingDate] = useState(oneOnOne.next_meeting_date || '')
    const [mainObjectives, setMainObjectives] = useState(oneOnOne.main_objectives || '')
    const [summary, setSummary] = useState(oneOnOne.summary || '') // Acts as General Meeting Notes

    // Employee Check-In
    const [checkinPortfolioStatus, setCheckinPortfolioStatus] = useState(oneOnOne.checkin_portfolio_status || '')
    const [checkinCompletedAt, setCheckinCompletedAt] = useState(oneOnOne.checkin_completed_at || '')
    const [checkinWentWell, setCheckinWentWell] = useState(oneOnOne.checkin_went_well || '')
    const [checkinMostConcerning, setCheckinMostConcerning] = useState(oneOnOne.checkin_most_concerning || '')
    const [checkinSlowingDown, setCheckinSlowingDown] = useState(oneOnOne.checkin_slowing_down || '')
    const [checkinSupportNeeded, setCheckinSupportNeeded] = useState(oneOnOne.checkin_support_needed || '')

    // Support and Coaching
    const [coachingSuccess, setCoachingSuccess] = useState(oneOnOne.coaching_success || '')
    const [coachingImprovement, setCoachingImprovement] = useState(oneOnOne.coaching_improvement || '')
    const [coachingClarification, setCoachingClarification] = useState(oneOnOne.coaching_clarification || '')
    const [coachingPromised, setCoachingPromised] = useState(oneOnOne.coaching_promised || '')

    // Meeting Conclusion
    const [conclusionPortfolioStatus, setConclusionPortfolioStatus] = useState(oneOnOne.conclusion_portfolio_status || '')
    const [conclusionGoingWell, setConclusionGoingWell] = useState(oneOnOne.conclusion_going_well || '')
    const [conclusionNeedsAttention, setConclusionNeedsAttention] = useState(oneOnOne.conclusion_needs_attention || '')
    const [conclusionDecisions, setConclusionDecisions] = useState(oneOnOne.conclusion_decisions || '')
    const [conclusionPriorities, setConclusionPriorities] = useState(oneOnOne.conclusion_priorities || '')

    // Operational Metrics from meeting details
    const [emailsOver48h, setEmailsOver48h] = useState(oneOnOne.emails_over_48h || 0)
    const [lateTasks, setLateTasks] = useState(oneOnOne.late_tasks || 0)
    const [callsTotal, setCallsTotal] = useState(oneOnOne.calls_total || 0)
    const [callsAnswered, setCallsAnswered] = useState(oneOnOne.calls_answered || 0)
    const [billsNoNotes, setBillsNoNotes] = useState(oneOnOne.bills_no_notes_over_7d || 0)

    // Unified notes state (historical item-level notes)
    const [itemNotes, setItemNotes] = useState<any[]>([])
    const [newNoteTexts, setNewNoteTexts] = useState<Record<string, string>>({})

    // Assemblies tracking
    const [assemblyTrackings, setAssemblyTrackings] = useState<any[]>([])
    const [assemblyNotesTexts, setAssemblyNotesTexts] = useState<Record<string, string>>({})
    const [confirmingAssemblyId, setConfirmingAssemblyId] = useState<string | null>(null)
    const [actualAssemblyDate, setActualAssemblyDate] = useState('')
    const [editingNoteIndex, setEditingNoteIndex] = useState<Record<string, number | null>>({})
    const [editingNoteText, setEditingNoteText] = useState<string>('')

    // Priorities
    const [prioritiesList, setPrioritiesList] = useState<any[]>(oneOnOne.priorities || [])
    const [manualPriorityText, setManualPriorityText] = useState('')

    // Commitments
    const [previousCommitments, setPreviousCommitments] = useState<any[]>([])
    const [newAgreedActions, setNewAgreedActions] = useState<any[]>([])
    
    // New commitment form states
    const [newActionText, setNewActionText] = useState('')
    const [newActionOwner, setNewActionOwner] = useState<'Employee' | 'Team Leader'>('Employee')
    const [newActionDueDate, setNewActionDueDate] = useState('')
    const [newActionClientId, setNewActionClientId] = useState('')
    const [newActionExpectedResult, setNewActionExpectedResult] = useState('')

    // Client lists and other details
    const [clientsList, setClientsList] = useState<any[]>([])
    const [operationalRisks, setOperationalRisks] = useState<any[]>(initialOperationalRisks || [])
    const [managerComplaints, setManagerComplaints] = useState<any[]>([])

    // Reviewed items state (complaints, audits, assemblies)
    const [reviewedComplaintsState, setReviewedComplaintsState] = useState<Record<string, {
        checked: boolean
        my_notes: string
        manager_notes: string
        resolved_in_meeting: boolean
        title?: string
        description?: string
        severity?: 'low' | 'medium' | 'high' | 'critical'
        category_id?: string
    }>>({})

    const [reviewedAuditsState, setReviewedAuditsState] = useState<Record<string, {
        checked: boolean
        my_notes: string
        manager_notes: string
    }>>({})

    const [reviewedAssembliesState, setReviewedAssembliesState] = useState<Record<string, {
        checked: boolean
        my_notes: string
        manager_notes: string
    }>>({})

    // Modal editing state for commitments & complaints
    const [activeCommitment, setActiveCommitment] = useState<any | null>(null)
    const [commitmentNotesHistory, setCommitmentNotesHistory] = useState<any[]>([])
    const [newCommitmentNoteText, setNewCommitmentNoteText] = useState('')
    const [activeEditingComplaint, setActiveEditingComplaint] = useState<any | null>(null)
    const [editingComplaintTitle, setEditingComplaintTitle] = useState('')
    const [editingComplaintDesc, setEditingComplaintDesc] = useState('')
    const [editingComplaintSeverity, setEditingComplaintSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
    const [editingComplaintMyNotes, setEditingComplaintMyNotes] = useState('')
    const [editingComplaintManagerNotes, setEditingComplaintManagerNotes] = useState('')
    const [activePage, setActivePage] = useState<'page1' | 'page2'>('page1')
    const [editingItemNoteId, setEditingItemNoteId] = useState<string | null>(null)
    const [editingItemNoteText, setEditingItemNoteText] = useState<string>('')
    const [editingComplaintStatus, setEditingComplaintStatus] = useState<'not_discussed' | 'in_progress' | 'resolved'>('not_discussed')

    const [historyPopupComplaint, setHistoryPopupComplaint] = useState<any | null>(null)
    const [complaintHistoryList, setComplaintHistoryList] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Collapsible statistics
    const [statsCollapsed, setStatsCollapsed] = useState(true)

    // Audits and Quality Review
    const [syndicateAudits, setSyndicateAudits] = useState<any[]>([])
    const [assemblyEvaluations, setAssemblyEvaluations] = useState<any[]>([])

    // Snapshot comparisons
    const [callsTotalPrev, setCallsTotalPrev] = useState(0)
    const [callsAnsweredPrev, setCallsAnsweredPrev] = useState(0)
    const [lateTasksPrev, setLateTasksPrev] = useState(0)
    const [emailsReceived, setEmailsReceived] = useState(0)
    const [emailsReceivedPrev, setEmailsReceivedPrev] = useState(0)
    const [billsNoNotesPrev, setBillsNoNotesPrev] = useState(0)
    const [openComplaintsPrev, setOpenComplaintsPrev] = useState(0)
    const [quoteApprovalRate, setQuoteApprovalRate] = useState(100)
    const [doorsCount, setDoorsCount] = useState(0)
    const [syndicatesCount, setSyndicatesCount] = useState(0)

    const [callsMonthPrev, setCallsMonthPrev] = useState<string | null>(null)
    const [workloadMonthPrev, setWorkloadMonthPrev] = useState<string | null>(null)

    // Load comparison snapshot dynamically on mount
    useEffect(() => {
        const fetchSnapshot = async () => {
            try {
                const snapshot = await getOneOnOneSnapshotAction(manager.id)
                if (snapshot) {
                    setCallsTotalPrev(snapshot.calls_total_prev || 0)
                    setCallsAnsweredPrev(snapshot.calls_answered_prev || 0)
                    setLateTasksPrev(snapshot.late_tasks_prev || 0)
                    setEmailsReceived(snapshot.emails_received || 0)
                    setEmailsReceivedPrev(snapshot.emails_received_prev || 0)
                    setBillsNoNotesPrev(snapshot.bills_no_notes_prev || 0)
                    setOpenComplaintsPrev(snapshot.open_complaints_count_prev || 0)
                    setQuoteApprovalRate(snapshot.quote_approval_rate ?? 100)
                    setDoorsCount(snapshot.doors_count || 0)
                    setSyndicatesCount(snapshot.syndicates_count || 0)
                    setCallsMonthPrev(snapshot.calls_month_prev)
                    setWorkloadMonthPrev(snapshot.workload_month_prev)
                }
            } catch (err) {
                console.error("Error fetching one on one snapshot:", err)
            }
        }
        fetchSnapshot()
    }, [manager.id])

    // Load comparison from lastMeeting if available initially
    useEffect(() => {
        if (lastMeeting) {
            setCallsTotalPrev(lastMeeting.calls_total || 0)
            setCallsAnsweredPrev(lastMeeting.calls_answered || 0)
            setLateTasksPrev(lastMeeting.late_tasks || 0)
            setBillsNoNotesPrev(lastMeeting.bills_no_notes_over_7d || 0)
        }
    }, [lastMeeting])

    // Load initial states and historical notes
    const loadNotesAndAssemblies = useCallback(async () => {
        try {
            // Load assembly trackings
            const trackings = await getAssemblyTrackingForManagerAction(manager.id)
            setAssemblyTrackings(trackings || [])

            // Load item notes
            const notes = await getOneOnOneItemNotesAction(oneOnOne.id)
            setItemNotes(notes || [])
        } catch (err) {
            console.error("Error loading notes or assemblies:", err)
        }
    }, [oneOnOne.id, manager.id])

    useEffect(() => {
        loadNotesAndAssemblies()
    }, [oneOnOne.id, loadNotesAndAssemblies])

    // Load lists & separate commitments
    useEffect(() => {
        // Map clients list
        const uniqueClients = new Map()
        communicationStats.forEach(c => {
            uniqueClients.set(c.client_id || c.id, {
                id: c.client_id || c.id,
                company_name: c.client_company_name || c.company_name || 'Syndicat sans nom',
                full_name: c.client_full_name || c.full_name || ''
            })
        })
        setClientsList(Array.from(uniqueClients.values()))

        // Separate commitments
        const prev = initialCommitments.filter(c => c.carried_forward || c.taken_at !== oneOnOne.meeting_date)
        const curr = initialCommitments.filter(c => !c.carried_forward && c.taken_at === oneOnOne.meeting_date)
        setPreviousCommitments(prev)
        setNewAgreedActions(curr)

        // Set complaints
        const open = discussedComplaints.map(dc => ({
            ...dc.complaints,
            id: dc.complaint_id,
            discussion_notes: dc.discussion_notes || dc.my_notes || '',
            resolution_plan: dc.resolution_plan || dc.manager_notes || '',
            resolved_in_meeting: dc.resolved_in_meeting
        }))
        setManagerComplaints(open)

        const complaintStateMap: Record<string, any> = {}
        discussedComplaints.forEach(dc => {
            complaintStateMap[dc.complaint_id] = {
                checked: dc.reviewed || dc.resolved_in_meeting || true,
                my_notes: dc.my_notes || dc.discussion_notes || '',
                manager_notes: dc.manager_notes || dc.resolution_plan || '',
                resolved_in_meeting: Boolean(dc.resolved_in_meeting),
                title: dc.complaints?.title,
                description: dc.complaints?.description,
                severity: dc.complaints?.severity,
                category_id: dc.complaints?.category_id
            }
        })
        setReviewedComplaintsState(complaintStateMap)

        const auditStateMap: Record<string, any> = {}
        reviewedAudits.forEach(ra => {
            auditStateMap[ra.audit_id] = {
                checked: ra.reviewed || true,
                my_notes: ra.my_notes || '',
                manager_notes: ra.manager_notes || ''
            }
        })
        setReviewedAuditsState(auditStateMap)

        const assemblyStateMap: Record<string, any> = {}
        reviewedAssemblies.forEach(ra => {
            assemblyStateMap[ra.assembly_evaluation_id] = {
                checked: ra.reviewed || true,
                my_notes: ra.my_notes || '',
                manager_notes: ra.manager_notes || ''
            }
        })
        setReviewedAssembliesState(assemblyStateMap)

        // Set audits
        setSyndicateAudits(reviewedAudits.map(ra => ({
            ...ra.syndicate_audits,
            my_notes: ra.my_notes,
            manager_notes: ra.manager_notes,
            reviewed: ra.reviewed
        })))

        setAssemblyEvaluations(reviewedAssemblies.map(ra => ({
            ...ra.assembly_evaluations,
            my_notes: ra.my_notes,
            manager_notes: ra.manager_notes,
            reviewed: ra.reviewed
        })))
    }, [initialCommitments, discussedComplaints, reviewedAudits, reviewedAssemblies, communicationStats, oneOnOne.meeting_date])

    const openCommitmentModal = async (c: any) => {
        setActiveCommitment(c)
        setNewCommitmentNoteText('')
        try {
            const notes = await getItemNotesAction(c.id)
            setCommitmentNotesHistory(notes || [])
        } catch (err) {
            setCommitmentNotesHistory([])
        }
    }

    const handleAddNoteToItem = async (itemType: 'commitment' | 'complaint' | 'risk', itemId: string, noteText: string) => {
        if (!noteText.trim()) return
        try {
            const note = await addOneOnOneItemNoteAction({
                one_on_one_id: oneOnOne.id,
                item_type: itemType,
                item_id: itemId,
                note_text: noteText.trim(),
                author_name: oneOnOne.profiles?.full_name || 'Évaluateur'
            })
            if (itemType === 'commitment') {
                setCommitmentNotesHistory(prev => [...prev, note])
                setNewCommitmentNoteText('')
            }
            toast.success("Note enregistrée avec succès !")
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement de la note")
        }
    }

    const handleUpdateNote = async (itemType: 'commitment' | 'complaint' | 'risk', itemId: string, noteId: string, text: string) => {
        if (!text.trim()) return
        try {
            await updateOneOnOneItemNoteAction(noteId, text.trim())
            toast.success("Note modifiée avec succès !")
            setEditingItemNoteId(null)
            setEditingItemNoteText('')
            const notes = await getItemNotesAction(itemId)
            if (itemType === 'commitment') setCommitmentNotesHistory(notes)
        } catch (err) {
            toast.error("Erreur lors de la modification")
        }
    }

    const handleDeleteNote = async (itemType: 'commitment' | 'complaint' | 'risk', noteId: string) => {
        try {
            await deleteOneOnOneItemNoteAction(noteId)
            toast.success("Note supprimée !")
            if (itemType === 'commitment') setCommitmentNotesHistory(prev => prev.filter(n => n.id !== noteId))
        } catch (err) {
            toast.error("Erreur lors de la suppression")
        }
    }

    const openComplaintModal = (c: any) => {
        setActiveEditingComplaint(c)
        setEditingComplaintTitle(c.title || '')
        setEditingComplaintDesc(c.description || '')
        setEditingComplaintSeverity(c.severity || 'medium')

        const state = reviewedComplaintsState[c.id] || { 
            checked: false, 
            my_notes: c.discussion_notes || c.my_notes || '', 
            manager_notes: c.resolution_plan || c.manager_notes || '', 
            resolved_in_meeting: Boolean(c.resolved_in_meeting) 
        }
        setEditingComplaintMyNotes(state.my_notes || '')
        setEditingComplaintManagerNotes(state.manager_notes || '')
        
        if (!state.checked && !c.last_status) {
            setEditingComplaintStatus('not_discussed')
        } else if (state.resolved_in_meeting || c.last_status === 'resolved') {
            setEditingComplaintStatus('resolved')
        } else {
            setEditingComplaintStatus('in_progress')
        }
    }

    const handleSaveComplaintChanges = () => {
        if (!activeEditingComplaint) return
        
        const id = activeEditingComplaint.id
        const hasNotes = Boolean((editingComplaintMyNotes && editingComplaintMyNotes.trim() !== '') || (editingComplaintManagerNotes && editingComplaintManagerNotes.trim() !== ''))
        const isChecked = hasNotes || editingComplaintStatus !== 'not_discussed' || editingComplaintTitle !== activeEditingComplaint.title
        const isResolved = editingComplaintStatus === 'resolved'

        setReviewedComplaintsState(prev => ({
            ...prev,
            [id]: {
                checked: isChecked,
                my_notes: editingComplaintMyNotes,
                manager_notes: editingComplaintManagerNotes,
                resolved_in_meeting: isResolved,
                status: editingComplaintStatus,
                title: editingComplaintTitle,
                description: editingComplaintDesc,
                severity: editingComplaintSeverity,
                category_id: activeEditingComplaint.category_id
            }
        }))

        setManagerComplaints(prev => prev.map(comp => {
            if (comp.id === id) {
                return {
                    ...comp,
                    title: editingComplaintTitle,
                    description: editingComplaintDesc,
                    severity: editingComplaintSeverity,
                    discussion_notes: editingComplaintMyNotes,
                    my_notes: editingComplaintMyNotes,
                    resolution_plan: editingComplaintManagerNotes,
                    manager_notes: editingComplaintManagerNotes,
                    resolved_in_meeting: isResolved,
                    status: editingComplaintStatus
                }
            }
            return comp
        }))

        setActiveEditingComplaint(null)
    }

    // Dynamic Priorities Generation (Draft meeting only)
    useEffect(() => {
        if (oneOnOne.status !== 'draft' || (oneOnOne.priorities && oneOnOne.priorities.length > 0)) {
            return
        }

        const callsPct = callsTotal > 0 ? (callsAnswered / callsTotal) * 100 : 0
        const list: any[] = []

        // Calls answered metric below target
        if (callsTotal > 0 && callsPct < 80) {
            list.push({
                id: 'metric_calls_answered',
                type: 'metric',
                title: "Taux d'appels répondus",
                subtitle: `Actuel: ${Math.round(callsPct)}% (Cible: 80%)`,
                status: 'to_discuss',
                details: { metric: 'calls_answered', current: Math.round(callsPct), target: 80 }
            })
        }

        // Late tasks metric above limit
        if (lateTasks > 4) {
            list.push({
                id: 'metric_late_tasks',
                type: 'metric',
                title: "Tâches en retard",
                subtitle: `${lateTasks} tâches en retard (Seuil: 4)`,
                status: 'to_discuss',
                details: { metric: 'late_tasks', current: lateTasks, target: 4 }
            })
        }

        // Emails older than 48 hours above limit
        if (emailsOver48h > 2) {
            list.push({
                id: 'metric_emails_over_48h',
                type: 'metric',
                title: "Courriels en attente > 48h",
                subtitle: `${emailsOver48h} courriels en attente (Seuil: 2)`,
                status: 'to_discuss',
                details: { metric: 'emails_over_48h', current: emailsOver48h, target: 2 }
            })
        }

        // Overdue bills
        if (billsNoNotes > 2) {
            list.push({
                id: 'metric_bills_no_notes_over_7d',
                type: 'metric',
                title: "Factures sans note > 7j",
                subtitle: `${billsNoNotes} factures sans note (Seuil: 2)`,
                status: 'to_discuss',
                details: { metric: 'bills_no_notes_over_7d', current: billsNoNotes, target: 2 }
            })
        }

        // Previous commitments still open
        previousCommitments.forEach(c => {
            if (c.status !== 'Resolved' && !c.completed) {
                list.push({
                    id: `commitment_${c.id}`,
                    type: 'commitment',
                    title: `Engagement: ${c.commitment_text}`,
                    subtitle: `Responsable: ${c.owner} · Échéance: ${c.due_date ? new Date(c.due_date).toLocaleDateString('fr-CA') : 'Prochaine revue'}`,
                    status: 'to_discuss',
                    details: { id: c.id }
                })
            }
        })

        // Active complaints
        managerComplaints.forEach(c => {
            if (c.status !== 'resolved') {
                list.push({
                    id: `complaint_${c.id}`,
                    type: 'complaint',
                    title: `Plainte: ${c.title || 'Sans titre'}`,
                    subtitle: `Syndicat: ${c.clients?.company_name || c.clients?.full_name || 'Inconnu'} · Gravité: ${c.severity}`,
                    status: 'to_discuss',
                    details: { id: c.id }
                })
            }
        })

        // Active operational risks
        operationalRisks.forEach(r => {
            if (r.status === 'active') {
                list.push({
                    id: `risk_${r.id}`,
                    type: 'risk',
                    title: `Risque: ${r.description}`,
                    subtitle: `Gravité: ${r.severity}`,
                    status: 'to_discuss',
                    details: { id: r.id }
                })
            }
        })

        // Approaching assemblies
        assemblyTrackings.forEach(a => {
            if (a.status !== 'completed') {
                const targetDate = new Date(a.target_date)
                const diffTime = targetDate.getTime() - new Date().getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (diffDays <= 60) {
                    list.push({
                        id: `assembly_${a.id}`,
                        type: 'assembly',
                        title: `Assemblée: ${a.clients?.company_name || a.clients?.full_name || 'Syndicat'}`,
                        subtitle: `${diffDays <= 0 ? 'En retard' : `Dans ${diffDays} jours`} · Cible: ${new Date(a.target_date).toLocaleDateString('fr-CA')}`,
                        status: 'to_discuss',
                        details: { id: a.id }
                    })
                }
            }
        })

        setPrioritiesList(list)
    }, [oneOnOne.status, oneOnOne.priorities, callsTotal, callsAnswered, lateTasks, emailsOver48h, billsNoNotes, previousCommitments, managerComplaints, operationalRisks, assemblyTrackings])

    // Save notes handler
    const handleSaveItemNote = async (itemType: string, itemId: string) => {
        const text = newNoteTexts[itemId] || ''
        if (!text.trim()) return

        try {
            const author = oneOnOne.profiles?.full_name || 'Évaluateur'
            const note = await addOneOnOneItemNoteAction({
                one_on_one_id: oneOnOne.id,
                item_type: itemType as any,
                item_id: itemId,
                note_text: text.trim(),
                author_name: author
            })
            setItemNotes(prev => [...prev, note])
            setNewNoteTexts(prev => ({ ...prev, [itemId]: '' }))
            toast.success("Note ajoutéehistoriquement.")
        } catch (err) {
            toast.error("Erreur lors de l'ajout de la note: " + (err as Error).message)
        }
    }

    // Assembly planned date change handler
    const handleAssemblyDateChange = async (assembly: any, newDate: string) => {
        const oldDate = assembly.planned_date || 'Non défini'
        const changedBy = oneOnOne.profiles?.full_name || 'Évaluateur'
        const timestamp = new Date().toISOString()
        const newHistory = [...(assembly.date_history || []), {
            old_date: oldDate,
            new_date: newDate,
            changed_by: changedBy,
            timestamp
        }]

        const trackingNotes = [...(assembly.notes || []), {
            note: `Date planifiée modifiée de ${oldDate} à ${newDate} par ${changedBy}.`,
            author: changedBy,
            timestamp
        }]

        try {
            await updateAssemblyTrackingAction(assembly.id, {
                planned_date: newDate || null,
                notes: trackingNotes,
                date_history: newHistory
            })
            setAssemblyTrackings(prev => prev.map(a => a.id === assembly.id ? { ...a, planned_date: newDate || null, notes: trackingNotes, date_history: newHistory } : a))
            toast.success("Date planifiée de l'assemblée mise à jour.")
        } catch (err) {
            toast.error("Erreur lors de la mise à jour de la date: " + (err as Error).message)
        }
    }

    // Assembly status change handler
    const handleAssemblyStatusChange = async (assembly: any, nextStatus: any) => {
        const changedBy = oneOnOne.profiles?.full_name || 'Évaluateur'
        const timestamp = new Date().toISOString()
        const trackingNotes = [...(assembly.notes || []), {
            note: `Statut modifié à "${nextStatus}" par ${changedBy}.`,
            author: changedBy,
            timestamp
        }]

        try {
            await updateAssemblyTrackingAction(assembly.id, {
                status: nextStatus,
                notes: trackingNotes
            })
            setAssemblyTrackings(prev => prev.map(a => a.id === assembly.id ? { ...a, status: nextStatus, notes: trackingNotes } : a))
            toast.success("Statut de l'assemblée mis à jour.")
        } catch (err) {
            toast.error("Erreur lors de la mise à jour du statut: " + (err as Error).message)
        }
    }

    // Assembly add note handler
    const handleAddAssemblyNote = async (assembly: any) => {
        const text = assemblyNotesTexts[assembly.id] || ''
        if (!text.trim()) return

        const author = oneOnOne.profiles?.full_name || 'Évaluateur'
        const timestamp = new Date().toISOString()
        const nextNotes = [...(assembly.notes || []), {
            note: text.trim(),
            author,
            timestamp,
            one_on_one_id: oneOnOne.id
        }]

        try {
            await updateAssemblyTrackingAction(assembly.id, {
                notes: nextNotes
            })
            setAssemblyTrackings(prev => prev.map(a => a.id === assembly.id ? { ...a, notes: nextNotes } : a))
            setAssemblyNotesTexts(prev => ({ ...prev, [assembly.id]: '' }))
            toast.success("Note ajoutée à l'assemblée.")
        } catch (err) {
            toast.error("Erreur lors de l'ajout de la note: " + (err as Error).message)
        }
    }

    const handleEditAssemblyNoteStart = (assemblyId: string, index: number, currentText: string) => {
        setEditingNoteIndex(prev => ({ ...prev, [assemblyId]: index }))
        setEditingNoteText(currentText)
    }

    const handleCancelAssemblyNoteEdit = (assemblyId: string) => {
        setEditingNoteIndex(prev => ({ ...prev, [assemblyId]: null }))
        setEditingNoteText('')
    }

    const handleSaveAssemblyNote = async (assembly: any, index: number) => {
        if (!editingNoteText.trim()) return

        const updatedNotes = (assembly.notes || []).map((n: any, idx: number) => {
            if (idx === index) {
                return { ...n, note: editingNoteText.trim(), timestamp: new Date().toISOString() }
            }
            return n
        })

        try {
            await updateAssemblyTrackingAction(assembly.id, {
                notes: updatedNotes
            })
            setAssemblyTrackings(prev => prev.map(a => a.id === assembly.id ? { ...a, notes: updatedNotes } : a))
            setEditingNoteIndex(prev => ({ ...prev, [assembly.id]: null }))
            setEditingNoteText('')
            toast.success("Note de l'assemblée mise à jour.")
        } catch (err) {
            toast.error("Erreur lors de la mise à jour de la note: " + (err as Error).message)
        }
    }

    const handleDeleteAssemblyNote = async (assembly: any, index: number) => {
        if (!confirm("Voulez-vous supprimer cette note ?")) return

        const updatedNotes = (assembly.notes || []).filter((_: any, idx: number) => idx !== index)

        try {
            await updateAssemblyTrackingAction(assembly.id, {
                notes: updatedNotes
            })
            setAssemblyTrackings(prev => prev.map(a => a.id === assembly.id ? { ...a, notes: updatedNotes } : a))
            toast.success("Note de l'assemblée supprimée.")
        } catch (err) {
            toast.error("Erreur lors de la suppression de la note: " + (err as Error).message)
        }
    }

    const handleDeleteAssemblyTracking = async (assemblyId: string) => {
        if (!confirm("Voulez-vous supprimer définitivement ce suivi d'assemblée ? Cette action est irréversible et supprimera le suivi pour cette année fiscale.")) return

        try {
            await deleteAssemblyTrackingAction(assemblyId)
            setAssemblyTrackings(prev => prev.filter(a => a.id !== assemblyId))
            toast.success("Suivi d'assemblée supprimé.")
        } catch (err) {
            toast.error("Erreur lors de la suppression du suivi: " + (err as Error).message)
        }
    }

    // Confirm Assembly Completed handler
    const handleConfirmAssemblyCompleted = async () => {
        if (!confirmingAssemblyId || !actualAssemblyDate) return

        try {
            const author = oneOnOne.profiles?.full_name || 'Évaluateur'
            await confirmAssemblyCompletedAction(confirmingAssemblyId, {
                actual_assembly_date: actualAssemblyDate,
                confirmed_by: author
            })
            
            // Reload assemblies
            const trackings = await getAssemblyTrackingForManagerAction(manager.id)
            setAssemblyTrackings(trackings || [])
            
            setConfirmingAssemblyId(null)
            setActualAssemblyDate('')
            toast.success("Assemblée confirmée comme complétée et nouvelle période ouverte.")
        } catch (err) {
            toast.error("Erreur lors de la complétion: " + (err as Error).message)
        }
    }

    // Action: create commitment from assembly
    const handleCreateCommitmentFromAssembly = async (assembly: any) => {
        const commitmentText = `Compléter la préparation de l'assemblée pour ${assembly.clients?.company_name || 'Syndicat'}`
        const newComm = {
            commitment_text: commitmentText,
            owner: 'Employee',
            due_date: assembly.target_date,
            client_id: assembly.client_id,
            status: 'Open',
            notes: `Créé automatiquement à partir du suivi d'assemblée annuelle (${assembly.fiscal_year_end}).`,
            completed: false,
            taken_at: oneOnOne.meeting_date
        }
        setNewAgreedActions(prev => [...prev, newComm])
        toast.success("Engagement créé à partir de l'assemblée.")
    }

    // Add priority manual card
    const handleAddManualPriority = () => {
        if (!manualPriorityText.trim()) return
        const newPriority = {
            id: `manual_${Date.now()}`,
            type: 'manual',
            title: manualPriorityText.trim(),
            subtitle: "Ajouté manuellement par le chef d'équipe",
            status: 'to_discuss'
        }
        setPrioritiesList(prev => [...prev, newPriority])
        setManualPriorityText('')
        toast.success("Priorité manuelle ajoutée.")
    }

    // Priority status changer
    const handlePriorityStatusChange = (id: string, nextStatus: any) => {
        setPrioritiesList(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p))
    }

    // Priorities reorder handlers
    const movePriority = (index: number, direction: 'up' | 'down') => {
        if (!isEditing) return
        const newList = [...prioritiesList]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newList.length) return

        const temp = newList[index]
        newList[index] = newList[targetIndex]
        newList[targetIndex] = temp
        setPrioritiesList(newList)
    }

    // Add new reciprocal commitment handler
    const handleAddNewCommitment = () => {
        if (!newActionText.trim()) {
            toast.error("Le texte de l'action est obligatoire.")
            return
        }

        const maxEmployee = 3
        const maxLeader = 2
        
        const countEmp = newAgreedActions.filter(a => a.owner === 'Employee').length
        const countLead = newAgreedActions.filter(a => a.owner === 'Team Leader').length

        if (newActionOwner === 'Employee' && countEmp >= maxEmployee) {
            toast.warning(`Recommandation dépassée: maximum ${maxEmployee} engagements pour le gestionnaire.`)
        }
        if (newActionOwner === 'Team Leader' && countLead >= maxLeader) {
            toast.warning(`Recommandation dépassée: maximum ${maxLeader} engagements pour le chef d'équipe.`)
        }

        const newComm = {
            commitment_text: newActionText.trim(),
            owner: newActionOwner,
            due_date: newActionDueDate || null,
            client_id: newActionClientId || null,
            notes: newActionExpectedResult.trim(), // Storing expected result in notes field
            status: 'Open',
            completed: false,
            taken_at: oneOnOne.meeting_date
        }

        setNewAgreedActions(prev => [...prev, newComm])
        setNewActionText('')
        setNewActionDueDate('')
        setNewActionClientId('')
        setNewActionExpectedResult('')
        toast.success("Engagement ajouté.")
    }

    const handleRemoveNewCommitment = (idx: number) => {
        setNewAgreedActions(prev => prev.filter((_, i) => i !== idx))
    }

    const handleStartEditItemNote = (id: string, text: string) => {
        setEditingItemNoteId(id)
        setEditingItemNoteText(text)
    }

    const handleSaveItemNoteEdit = async (id: string) => {
        if (!editingItemNoteText.trim()) return
        try {
            await updateOneOnOneItemNoteAction(id, editingItemNoteText.trim())
            setItemNotes(prev => prev.map(n => n.id === id ? { ...n, note_text: editingItemNoteText.trim() } : n))
            setEditingItemNoteId(null)
            toast.success("Note mise à jour.")
        } catch (err) {
            toast.error("Erreur lors de la modification de la note : " + (err as Error).message)
        }
    }

    const handleDeleteItemNote = async (id: string) => {
        try {
            await deleteOneOnOneItemNoteAction(id)
            setItemNotes(prev => prev.filter(n => n.id !== id))
            toast.success("Note supprimée.")
        } catch (err) {
            toast.error("Erreur lors de la suppression de la note : " + (err as Error).message)
        }
    }

    const handleDeletePriorityItem = (priorityId: string) => {
        setPrioritiesList(prev => prev.filter(p => p.id !== priorityId))
        toast.success("Sujet retiré de l'ordre du jour.")
    }

    const handlePurgeOverdueAssemblies = async () => {
        try {
            setLoading(true)
            const purgedCount = await purgeOverdue2025AssembliesAction(manager?.id)
            toast.success(`${purgedCount || 0} assemblée(s) en retard (>100j) purguée(s) avec succès.`)
            if (manager?.id) {
                const trackings = await getAssemblyTrackingForManagerAction(manager.id)
                setAssemblyTrackings(trackings || [])
            }
        } catch (err) {
            toast.error("Erreur lors de la purge : " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const handlePrevCommitmentChange = (idx: number, field: string, value: any) => {
        setPreviousCommitments(prev => prev.map((c, i) => {
            if (i === idx) {
                const updated = { ...c, [field]: value }
                if (field === 'status') {
                    updated.completed = value === 'Resolved'
                }
                return updated
            }
            return c
        }))
    }

    // Save and Lock meeting handler
    const handleSave = async (status: 'draft' | 'completed') => {
        setLoading(true)
        try {
            // Check-in dates
            let checkinDate = checkinCompletedAt
            if (checkinPortfolioStatus && !checkinDate) {
                checkinDate = new Date().toISOString()
            }

            // Merge commitments
            const finalCommitments = [
                ...previousCommitments.map(c => ({
                    id: c.id,
                    commitment_text: c.commitment_text,
                    owner: c.owner,
                    due_date: c.due_date,
                    status: c.status,
                    notes: c.notes,
                    completed: c.completed,
                    client_id: c.client_id || null,
                    taken_at: c.taken_at || null,
                    carried_forward: true
                })),
                ...newAgreedActions.map(c => ({
                    id: c.id,
                    commitment_text: c.commitment_text,
                    owner: c.owner,
                    due_date: c.due_date,
                    status: c.status,
                    notes: c.notes,
                    completed: c.completed,
                    client_id: c.client_id || null,
                    taken_at: c.taken_at || meetingDate,
                    carried_forward: false
                }))
            ]

            const finalReviewedComplaints = Object.entries(reviewedComplaintsState)
                .filter(([_, item]) => (
                    item.checked || 
                    (item.my_notes && item.my_notes.trim() !== '') || 
                    (item.manager_notes && item.manager_notes.trim() !== '') || 
                    item.resolved_in_meeting || 
                    Boolean(item.title)
                ))
                .map(([compId, item]) => {
                    const complaintObj = managerComplaints.find(mc => mc.id === compId)
                    return {
                        complaint_id: compId,
                        my_notes: item.my_notes,
                        manager_notes: item.manager_notes,
                        reviewed: true,
                        resolved_in_meeting: item.resolved_in_meeting,
                        discussion_notes: item.my_notes,
                        resolution_plan: item.manager_notes,
                        title: item.title || complaintObj?.title,
                        description: item.description || complaintObj?.description,
                        severity: item.severity || complaintObj?.severity
                    }
                })

            const finalReviewedAudits = Object.entries(reviewedAuditsState)
                .filter(([_, item]) => item.checked || (item.my_notes && item.my_notes.trim() !== '') || (item.manager_notes && item.manager_notes.trim() !== ''))
                .map(([auditId, item]) => ({
                    audit_id: auditId,
                    my_notes: item.my_notes,
                    manager_notes: item.manager_notes,
                    reviewed: true
                }))

            const finalReviewedAssemblies = Object.entries(reviewedAssembliesState)
                .filter(([_, item]) => item.checked || (item.my_notes && item.my_notes.trim() !== '') || (item.manager_notes && item.manager_notes.trim() !== ''))
                .map(([assId, item]) => ({
                    assembly_evaluation_id: assId,
                    my_notes: item.my_notes,
                    manager_notes: item.manager_notes,
                    reviewed: true
                }))

            await updateOneOnOneAction(oneOnOne.id, {
                meeting_date: meetingDate,
                status,
                emails_over_48h: Number(emailsOver48h),
                late_tasks: Number(lateTasks),
                calls_total: Number(callsTotal),
                calls_answered: Number(callsAnswered),
                bills_no_notes_over_7d: Number(billsNoNotes),
                op_reports_closed: oneOnOne.op_reports_closed || 0,
                agenda_templates_used: oneOnOne.agenda_templates_used || 0,
                assemblies_on_time: oneOnOne.assemblies_on_time || 0,
                syndicates_lost: oneOnOne.syndicates_lost || 0,
                package_changes: oneOnOne.package_changes || 0,
                current_issues: oneOnOne.current_issues || '',
                recent_wins: oneOnOne.recent_wins || '',
                difficult_situations: oneOnOne.difficult_situations || '',
                priority_1: oneOnOne.priority_1 || '',
                priority_2: oneOnOne.priority_2 || '',
                priority_3: oneOnOne.priority_3 || '',
                training_requested: oneOnOne.training_requested || '',
                escalation_needed: oneOnOne.escalation_needed || '',
                operational_blockers: oneOnOne.operational_blockers || '',
                conflict_resolution: oneOnOne.conflict_resolution || '',
                
                main_objectives: mainObjectives,
                summary: summary,

                // Redesign fields
                checkin_portfolio_status: checkinPortfolioStatus || null,
                checkin_completed_at: checkinDate || null,
                checkin_went_well: checkinWentWell || null,
                checkin_most_concerning: checkinMostConcerning || null,
                checkin_slowing_down: checkinSlowingDown || null,
                checkin_support_needed: checkinSupportNeeded || null,
                
                coaching_success: coachingSuccess || null,
                coaching_improvement: coachingImprovement || null,
                coaching_clarification: coachingClarification || null,
                coaching_promised: coachingPromised || null,

                conclusion_portfolio_status: conclusionPortfolioStatus || null,
                conclusion_going_well: conclusionGoingWell || null,
                conclusion_needs_attention: conclusionNeedsAttention || null,
                conclusion_decisions: conclusionDecisions || null,
                conclusion_priorities: conclusionPriorities || null,
                
                next_meeting_date: nextMeetingDate || null,
                priorities: prioritiesList,

                commitments: finalCommitments,
                complaints: finalReviewedComplaints,
                reviewedAudits: finalReviewedAudits,
                reviewedAssemblies: finalReviewedAssemblies,
                taskEmailAudits: initialTaskEmailAudits,
                operationalRisks
            })
            
            if (status === 'completed') {
                setIsEditing(false)
            }
            router.refresh()
            toast.success("Suivi de rencontre enregistré.")
        } catch (err) {
            toast.error("Erreur lors de la modification : " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const handleRevertToDraft = async () => {
        setLoading(true)
        try {
            const finalReviewedComplaints = Object.entries(reviewedComplaintsState)
                .filter(([_, item]) => (
                    item.checked || 
                    (item.my_notes && item.my_notes.trim() !== '') || 
                    (item.manager_notes && item.manager_notes.trim() !== '') || 
                    item.resolved_in_meeting || 
                    Boolean(item.title)
                ))
                .map(([compId, item]) => {
                    const complaintObj = managerComplaints.find(mc => mc.id === compId)
                    return {
                        complaint_id: compId,
                        my_notes: item.my_notes,
                        manager_notes: item.manager_notes,
                        reviewed: true,
                        resolved_in_meeting: item.resolved_in_meeting,
                        discussion_notes: item.my_notes,
                        resolution_plan: item.manager_notes,
                        title: item.title || complaintObj?.title,
                        description: item.description || complaintObj?.description,
                        severity: item.severity || complaintObj?.severity
                    }
                })

            const finalReviewedAudits = Object.entries(reviewedAuditsState)
                .filter(([_, item]) => item.checked || (item.my_notes && item.my_notes.trim() !== '') || (item.manager_notes && item.manager_notes.trim() !== ''))
                .map(([auditId, item]) => ({
                    audit_id: auditId,
                    my_notes: item.my_notes,
                    manager_notes: item.manager_notes,
                    reviewed: true
                }))

            const finalReviewedAssemblies = Object.entries(reviewedAssembliesState)
                .filter(([_, item]) => item.checked || (item.my_notes && item.my_notes.trim() !== '') || (item.manager_notes && item.manager_notes.trim() !== ''))
                .map(([assId, item]) => ({
                    assembly_evaluation_id: assId,
                    my_notes: item.my_notes,
                    manager_notes: item.manager_notes,
                    reviewed: true
                }))

            await updateOneOnOneAction(oneOnOne.id, {
                meeting_date: meetingDate,
                status: 'draft',
                emails_over_48h: Number(emailsOver48h),
                late_tasks: Number(lateTasks),
                calls_total: Number(callsTotal),
                calls_answered: Number(callsAnswered),
                bills_no_notes_over_7d: Number(billsNoNotes),
                op_reports_closed: oneOnOne.op_reports_closed || 0,
                agenda_templates_used: oneOnOne.agenda_templates_used || 0,
                assemblies_on_time: oneOnOne.assemblies_on_time || 0,
                syndicates_lost: oneOnOne.syndicates_lost || 0,
                package_changes: oneOnOne.package_changes || 0,
                current_issues: oneOnOne.current_issues || '',
                recent_wins: oneOnOne.recent_wins || '',
                difficult_situations: oneOnOne.difficult_situations || '',
                priority_1: oneOnOne.priority_1 || '',
                priority_2: oneOnOne.priority_2 || '',
                priority_3: oneOnOne.priority_3 || '',
                training_requested: oneOnOne.training_requested || '',
                escalation_needed: oneOnOne.escalation_needed || '',
                operational_blockers: oneOnOne.operational_blockers || '',
                conflict_resolution: oneOnOne.conflict_resolution || '',
                
                main_objectives: mainObjectives,
                summary: summary,
                checkin_portfolio_status: checkinPortfolioStatus || null,
                checkin_completed_at: checkinCompletedAt || null,
                checkin_went_well: checkinWentWell || null,
                checkin_most_concerning: checkinMostConcerning || null,
                checkin_slowing_down: checkinSlowingDown || null,
                checkin_support_needed: checkinSupportNeeded || null,
                coaching_success: coachingSuccess || null,
                coaching_improvement: coachingImprovement || null,
                coaching_clarification: coachingClarification || null,
                coaching_promised: coachingPromised || null,
                conclusion_portfolio_status: conclusionPortfolioStatus || null,
                conclusion_going_well: conclusionGoingWell || null,
                conclusion_needs_attention: conclusionNeedsAttention || null,
                conclusion_decisions: conclusionDecisions || null,
                conclusion_priorities: conclusionPriorities || null,
                next_meeting_date: nextMeetingDate || null,
                priorities: prioritiesList,
                commitments: [
                    ...previousCommitments.map(c => ({ ...c, carried_forward: true })),
                    ...newAgreedActions.map(c => ({ ...c, carried_forward: false }))
                ],
                complaints: finalReviewedComplaints,
                reviewedAudits: finalReviewedAudits,
                reviewedAssemblies: finalReviewedAssemblies,
                taskEmailAudits: initialTaskEmailAudits,
                operationalRisks
            })
            setIsEditing(true)
            router.refresh()
            toast.success("Rencontre remise en mode brouillon.")
        } catch (err) {
            toast.error("Erreur lors de la remise en brouillon : " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteMeeting = async () => {
        setLoading(true)
        try {
            await deleteOneOnOneAction(oneOnOne.id)
            toast.success("Rencontre supprimée avec succès.")
            router.push('/team-management/one-on-ones')
        } catch (err) {
            toast.error("Erreur de suppression : " + (err as Error).message)
            setLoading(false)
        } finally {
            setDeleteConfirmOpen(false)
        }
    }

    // Dynamic Scoring Engine for Stats
    const callsPct = callsTotal > 0 ? (callsAnswered / callsTotal) * 100 : 0
    const prevCallsPct = callsTotalPrev > 0 ? (callsAnsweredPrev / callsTotalPrev) * 100 : 0
    
    const taskHygiene = Math.max(0, 100 - lateTasks * 5)
    const emailHygiene = Math.max(0, 100 - emailsOver48h * 10)
    const billHygiene = Math.max(0, 100 - billsNoNotes * 10)

    const resolvedPrevCommsCount = previousCommitments.filter(c => c.status === 'Resolved' || c.completed).length
    const totalPrevCommsCount = previousCommitments.length
    const commitmentResolutionPct = totalPrevCommsCount > 0 ? (resolvedPrevCommsCount / totalPrevCommsCount) * 100 : 100

    const computedScore = Math.round(
        (callsPct * 0.25) +
        (taskHygiene * 0.25) +
        (emailHygiene * 0.2) +
        (billHygiene * 0.1) +
        ((quoteApprovalRate ?? 100) * 0.1) +
        (commitmentResolutionPct * 0.1)
    )

    const getGrade = (score: number) => {
        if (score >= 90) return { label: 'A+', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20', comment: 'Excellent' }
        if (score >= 80) return { label: 'A', color: 'text-emerald-300 border-emerald-600/30 bg-emerald-950/10', comment: 'Très Bien' }
        if (score >= 70) return { label: 'B', color: 'text-purple-400 border-purple-500/30 bg-purple-950/20', comment: 'Bien' }
        if (score >= 60) return { label: 'C', color: 'text-amber-400 border-amber-500/30 bg-amber-950/20', comment: 'Satisfaisant' }
        if (score >= 50) return { label: 'D', color: 'text-orange-400 border-orange-500/30 bg-orange-950/20', comment: 'À Améliorer' }
        return { label: 'E', color: 'text-rose-400 border-rose-500/30 bg-rose-950/20', comment: 'Insuffisant' }
    }

    const rating = getGrade(computedScore)

    // Color helpers for metrics
    const getEmailsColor = (count: number) => {
        if (count === 0) return 'text-emerald-400 font-bold'
        if (count <= 2) return 'text-emerald-300 font-bold'
        if (count <= 4) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    const getLateTasksColor = (count: number) => {
        if (count <= 4) return 'text-emerald-400 font-bold'
        if (count <= 9) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    const getCallsColor = (pct: number, total: number) => {
        if (total === 0) return 'text-white'
        if (pct >= 80) return 'text-emerald-400 font-bold'
        if (pct >= 70) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    const getBillsColor = (count: number) => {
        if (count === 0) return 'text-emerald-400 font-bold'
        if (count <= 2) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    // Assembly risk colors and indicators
    const getAssemblyIndicator = (assembly: any) => {
        if (assembly.status === 'completed') {
            return { color: 'text-emerald-400 border-emerald-800 bg-emerald-950/20', dot: 'bg-emerald-400', label: 'Complétée' }
        }

        const targetDate = new Date(assembly.target_date)
        const today = new Date()
        const diffTime = targetDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return { color: 'text-rose-500 border-rose-900 bg-rose-955 bg-rose-600/10', dot: 'bg-rose-500', label: 'En retard' }
        }

        if (assembly.status === 'scheduled' || assembly.planned_date) {
            const planned = new Date(assembly.planned_date)
            if (planned > targetDate) {
                return { color: 'text-rose-500 border-rose-900 bg-rose-955 bg-rose-600/10', dot: 'bg-rose-500', label: 'Planifiée tardive' }
            }
            return { color: 'text-blue-400 border-blue-900 bg-blue-950/30', dot: 'bg-blue-400', label: 'Planifiée' }
        }

        if (diffDays <= 30) {
            return { color: 'text-orange-500 border-orange-900 bg-orange-950/20', dot: 'bg-orange-500', label: 'À haut risque' }
        }

        if (diffDays <= 60) {
            return { color: 'text-amber-400 border-amber-900 bg-amber-950/15', dot: 'bg-amber-400', label: 'Attention' }
        }

        return { color: 'text-zinc-400 border-zinc-800 bg-zinc-900/10', dot: 'bg-zinc-500', label: 'À préparer' }
    }

    // Client select props helper
    const searchableClients = clientsList.map(c => ({
        id: c.id,
        name: c.company_name,
        sdc: c.full_name
    }))

    const getClientName = (id: string) => {
        const found = clientsList.find(c => c.id === id)
        if (!found) return 'Syndicat inconnu'
        const company = found.company_name || found.name || ''
        const sdc = found.full_name || found.sdc || ''
        if (company && sdc && company !== sdc) {
            return `${company} (${sdc})`
        }
        return company || sdc || 'Syndicat'
    }

    return (
        <div className="space-y-6 w-full max-w-[1400px] mx-auto px-4 pb-20 text-zinc-100 font-sans">
            {/* Back button */}
            <div className="mb-2">
                <Link
                    href="/team-management/one-on-ones"
                    className="text-sm text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1.5 w-fit transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la liste des séances
                </Link>
            </div>

            {/* Controls and locking Header */}
            <div className="flex flex-col md:flex-row gap-4 p-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start md:items-center backdrop-blur-md">
                <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-purple-950/20 border border-purple-800/60 flex items-center justify-center">
                        <Handshake className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                            Alignement 1-à-1 avec {manager.first_name} {manager.last_name}
                            {oneOnOne.status === 'completed' && <Lock className="h-4 w-4 text-zinc-500" />}
                        </h2>
                        <p className="text-sm text-zinc-400 mt-0.5">
                            Séance tenue le {new Date(meetingDate).toLocaleDateString('fr-CA')} · 
                            Animé par : <strong className="text-zinc-300">{oneOnOne.profiles?.full_name || 'Évaluateur'}</strong> · 
                            Statut : 
                            <span className={oneOnOne.status === 'completed' ? 'text-emerald-400 font-bold ml-1' : 'text-amber-400 font-bold ml-1'}>
                                {oneOnOne.status === 'completed' ? 'Complétée (Verrouillée)' : 'Brouillon'}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {oneOnOne.status === 'completed' && (
                        <Button 
                            onClick={handleRevertToDraft}
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-sm h-9 px-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-amber-900/20"
                        >
                            <Unlock className="h-4 w-4" />
                            Remettre en Brouillon
                        </Button>
                    )}

                    {oneOnOne.status === 'draft' && !isEditing && (
                        <Button 
                            onClick={() => setIsEditing(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-9 px-4 rounded-xl font-bold shadow-lg shadow-purple-900/20"
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
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-sm h-9 px-4 rounded-xl font-bold"
                            >
                                Enregistrer Brouillon
                            </Button>
                            <Button 
                                onClick={() => handleSave('completed')}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-9 px-4 rounded-xl font-bold shadow-lg shadow-purple-900/20"
                            >
                                Finaliser &amp; Verrouiller
                            </Button>
                        </>
                    )}

                    <Button 
                        onClick={() => setDeleteConfirmOpen(true)}
                        disabled={loading}
                        className="bg-rose-600/90 hover:bg-rose-700 text-white text-sm h-9 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/20"
                    >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                    </Button>
                </div>
            </div>
            {/* Page Navigation Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-3">
                <button
                    type="button"
                    onClick={() => setActivePage('page1')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                        activePage === 'page1'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                            : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                >
                    <Sliders className="h-4 w-4" />
                    Page 1 : Alignement, Ordre du Jour &amp; Bilan
                </button>
                <button
                    type="button"
                    onClick={() => setActivePage('page2')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                        activePage === 'page2'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                            : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                >
                    <Network className="h-4 w-4" />
                    Page 2 : Confirmation des Assemblées
                </button>
            </div>

            {activePage === 'page1' && (
                <div className="space-y-6">
                    {/* 1. MEETING HEADER SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-md col-span-2">
                    <CardHeader className="pb-3 border-b border-zinc-800/40">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <Sliders className="h-4 w-4 text-purple-400" />
                            1. Objectifs &amp; Informations Générales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 text-sm font-semibold">Objectif Principal de la Rencontre</Label>
                            {isEditing ? (
                                <Input 
                                    value={mainObjectives} 
                                    onChange={(e) => setMainObjectives(e.target.value)} 
                                    placeholder="Ex. Confirmer que le portefeuille est sous contrôle, prioriser les tâches complexes..."
                                    className="bg-zinc-950 border-zinc-800 text-sm text-white rounded-xl h-10"
                                />
                            ) : (
                                <p className="text-sm text-zinc-300 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/40 italic">
                                    {mainObjectives || "Aucun objectif défini."}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 text-sm font-semibold">Notes Générales de la Rencontre</Label>
                            {isEditing ? (
                                <Textarea 
                                    value={summary} 
                                    onChange={(e) => setSummary(e.target.value)} 
                                    placeholder="Observations générales, notes de contexte, résumé des discussions..."
                                    rows={4}
                                    className="bg-zinc-950 border-zinc-800 text-sm text-white rounded-xl p-3"
                                />
                            ) : (
                                <p className="text-sm text-zinc-300 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/40 whitespace-pre-wrap">
                                    {summary || "Aucune note générale rédigée."}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-800/40">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-400" />
                            Dates Clés
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 text-sm">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 text-[11px]">Date de la Session Actuelle</Label>
                            <Input 
                                type="date" 
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                disabled={!isEditing}
                                className="bg-zinc-950 border-zinc-800 h-9 text-sm text-white rounded-lg" 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 text-[11px]">Prochaine Rencontre Prévue (Optionnel)</Label>
                            <Input 
                                type="date" 
                                value={nextMeetingDate}
                                onChange={(e) => setNextMeetingDate(e.target.value)}
                                disabled={!isEditing}
                                className="bg-zinc-950 border-zinc-800 h-9 text-sm text-white rounded-lg" 
                            />
                        </div>

                        {lastMeeting && (
                            <div className="pt-2 border-t border-zinc-800/60 mt-4 text-[11px] text-zinc-400">
                                Rencontre précédente le : <strong className="text-zinc-200">{new Date(lastMeeting.meeting_date).toLocaleDateString('fr-CA')}</strong>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 2. EMPLOYEE CHECK-IN SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-400" />
                            2. Check-in de l'employé
                        </CardTitle>
                        {checkinCompletedAt && (
                            <span className="text-[10px] text-zinc-500 font-mono">
                                Complété le {new Date(checkinCompletedAt).toLocaleString('fr-CA')}
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1.5 md:col-span-1">
                            <Label className="text-zinc-400 text-sm font-semibold">État Général du Portefeuille</Label>
                            {isEditing ? (
                                <select 
                                    value={checkinPortfolioStatus} 
                                    onChange={(e) => setCheckinPortfolioStatus(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="under_control">Sous contrôle</option>
                                    <option value="needs_attention">Nécessite de l'attention</option>
                                    <option value="difficult">Difficile à gérer</option>
                                </select>
                            ) : (
                                <div className="text-sm font-bold capitalize">
                                    {checkinPortfolioStatus === 'under_control' && <span className="text-emerald-400">✔ Sous contrôle</span>}
                                    {checkinPortfolioStatus === 'needs_attention' && <span className="text-amber-400">⚠ Nécessite de l'attention</span>}
                                    {checkinPortfolioStatus === 'difficult' && <span className="text-rose-500">❌ Difficile à gérer</span>}
                                    {!checkinPortfolioStatus && <span className="text-zinc-500 italic">Non spécifié</span>}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-3">
                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 text-sm font-semibold">Qu'est-ce qui s'est bien passé depuis la dernière rencontre ?</Label>
                                {isEditing ? (
                                    <Input value={checkinWentWell} onChange={(e) => setCheckinWentWell(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{checkinWentWell || 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 text-sm font-semibold">Quel dossier ou syndicat vous préoccupe le plus ?</Label>
                                {isEditing ? (
                                    <Input value={checkinMostConcerning} onChange={(e) => setCheckinMostConcerning(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{checkinMostConcerning || 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 text-sm font-semibold">Qu'est-ce qui vous ralentit actuellement ?</Label>
                                {isEditing ? (
                                    <Input value={checkinSlowingDown} onChange={(e) => setCheckinSlowingDown(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{checkinSlowingDown || 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 text-sm font-semibold">Quel soutien ou décision attendez-vous de votre chef d'équipe ?</Label>
                                {isEditing ? (
                                    <Input value={checkinSupportNeeded} onChange={(e) => setCheckinSupportNeeded(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{checkinSupportNeeded || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. MEETING PRIORITIES SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-purple-400" />
                            3. Priorités de la rencontre (Ordre du jour)
                        </CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Points clés identifiés automatiquement ou manuellement à aborder pendant la séance. Utilisez les flèches pour les réordonner.
                        </CardDescription>
                    </div>
                    {isEditing && (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Input 
                                value={manualPriorityText} 
                                onChange={(e) => setManualPriorityText(e.target.value)} 
                                placeholder="Ajouter un sujet manuellement..."
                                className="bg-zinc-950 border-zinc-800 text-xs h-8 w-full sm:w-64 rounded-lg"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddManualPriority()}
                            />
                            <Button onClick={handleAddManualPriority} className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Ajouter
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-6">
                    {prioritiesList.length === 0 ? (
                        <p className="italic text-zinc-500 text-sm text-center py-6">Aucune priorité identifiée pour cette rencontre.</p>
                    ) : (
                        <div className="space-y-3">
                            {prioritiesList.map((item, idx) => {
                                // Find item notes
                                const notesForItem = itemNotes.filter(n => n.item_type === item.type && n.item_id === item.id)
                                return (
                                    <div key={item.id} className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-800 transition-colors">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-purple-900/60 bg-purple-950/20 text-purple-400">
                                                    {item.type}
                                                </Badge>
                                                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                            </div>
                                            <p className="text-xs text-zinc-400">{item.subtitle}</p>
                                            
                                            {/* Historic notes list inside priorities card */}
                                            {notesForItem.length > 0 && (
                                                <div className="mt-2.5 pt-2 border-t border-zinc-900 space-y-2 max-w-2xl">
                                                    <span className="text-[9px] font-bold text-zinc-500 block uppercase">Historique des notes :</span>
                                                    {notesForItem.map((n) => {
                                                        const isEditingNote = editingItemNoteId === n.id
                                                        return (
                                                            <div key={n.id} className="text-xs text-zinc-300 leading-normal pl-2.5 border-l-2 border-purple-500/60 py-1 space-y-1 bg-zinc-900/30 rounded-r-md">
                                                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                                    <span>
                                                                        <strong className="text-zinc-200 font-bold">{n.author_name}</strong> · <span>{new Date(n.created_at).toLocaleString('fr-CA')}</span>
                                                                    </span>
                                                                    {isEditing && (
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleStartEditItemNote(n.id, n.note_text)}
                                                                                className="text-zinc-500 hover:text-purple-400 p-0.5 rounded transition-all"
                                                                                title="Modifier la note"
                                                                            >
                                                                                <Edit className="h-3 w-3" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteItemNote(n.id)}
                                                                                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-all"
                                                                                title="Supprimer la note"
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {isEditingNote ? (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Textarea
                                                                            value={editingItemNoteText}
                                                                            onChange={(e) => setEditingItemNoteText(e.target.value)}
                                                                            rows={2}
                                                                            className="text-xs bg-zinc-950 border-zinc-800 text-white rounded-lg p-2 w-full"
                                                                        />
                                                                        <Button
                                                                            size="icon"
                                                                            type="button"
                                                                            onClick={() => handleSaveItemNoteEdit(n.id)}
                                                                            className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0"
                                                                        >
                                                                            <Check className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            type="button"
                                                                            onClick={() => setEditingItemNoteId(null)}
                                                                            className="h-7 w-7 text-zinc-400 hover:text-white rounded-lg shrink-0"
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-zinc-200 whitespace-pre-wrap">{n.note_text}</p>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* Add note field */}
                                            {isEditing && (
                                                <div className="space-y-2 mt-3 max-w-2xl bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                                                    <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Ajouter une note de suivi</Label>
                                                    <Textarea 
                                                        value={newNoteTexts[item.id] || ''}
                                                        onChange={(e) => setNewNoteTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        placeholder="Saisissez des détails ou notes sur ce sujet..."
                                                        rows={2}
                                                        className="bg-zinc-900 border-zinc-800 text-xs text-white rounded-lg p-2.5 focus:border-purple-600"
                                                    />
                                                    <div className="flex justify-end">
                                                        <Button onClick={() => handleSaveItemNote(item.type, item.id)} className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-1">
                                                            <Plus className="h-3.5 w-3.5" /> Enregistrer la note
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                            {/* Discussed controls */}
                                            <div className="flex items-center gap-1.5">
                                                {isEditing ? (
                                                    <select 
                                                        value={item.status} 
                                                        onChange={(e) => handlePriorityStatusChange(item.id, e.target.value)}
                                                        className="bg-zinc-900 border border-zinc-800 text-xs p-1.5 rounded-lg text-white"
                                                    >
                                                        <option value="to_discuss">À aborder</option>
                                                        <option value="discussed">Discuté</option>
                                                        <option value="carried_over">Reporter</option>
                                                        <option value="removed">Retirer</option>
                                                    </select>
                                                ) : (
                                                    <Badge variant="outline" className={`text-[9px] capitalize ${
                                                        item.status === 'discussed' ? 'border-emerald-800 bg-emerald-950/20 text-emerald-400' :
                                                        item.status === 'carried_over' ? 'border-amber-800 bg-amber-950/20 text-amber-400' :
                                                        'border-zinc-800 text-zinc-400'
                                                    }`}>
                                                        {item.status === 'discussed' ? 'Discuté' : item.status === 'carried_over' ? 'Reporté' : 'À aborder'}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Reorder actions & Delete */}
                                            {isEditing && (
                                                <div className="flex gap-1 items-center">
                                                    <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white rounded" onClick={() => movePriority(idx, 'up')} disabled={idx === 0}>
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white rounded" onClick={() => movePriority(idx, 'down')} disabled={idx === prioritiesList.length - 1}>
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded" onClick={() => handleDeletePriorityItem(item.id)} title="Supprimer ce sujet">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. PREVIOUS COMMITMENTS SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-purple-400" />
                        4. Suivi des engagements précédents
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-xs">
                    {previousCommitments.length === 0 ? (
                        <p className="italic text-zinc-500 text-sm text-center py-6">Aucun engagement précédent à suivre.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {previousCommitments.map((c, idx) => {
                                const st = c.status || 'Open'
                                const badgeStyle = 
                                    st === 'Resolved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' :
                                    st === 'Improved' ? 'bg-blue-950/40 text-blue-400 border-blue-800/50' :
                                    st === 'Partial' ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' :
                                    'bg-zinc-900 text-zinc-400 border-zinc-800'

                                return (
                                    <div 
                                        key={c.id || idx}
                                        onClick={() => openCommitmentModal(c)}
                                        className="p-3.5 bg-zinc-950/40 border border-zinc-850 hover:border-purple-600/50 rounded-xl cursor-pointer transition-all space-y-2 group shadow-sm text-xs"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-bold text-zinc-200 group-hover:text-purple-300 text-xs transition-colors line-clamp-2">
                                                {c.commitment_text}
                                            </h4>
                                            <Badge variant="outline" className={`text-[9px] font-bold shrink-0 ${badgeStyle}`}>
                                                {st === 'Open' ? 'En attente' : st === 'Improved' ? 'Amélioré' : st === 'Partial' ? 'Partiel' : st === 'Not resolved' ? 'Non résolu' : 'Résolu'}
                                            </Badge>
                                        </div>

                                        <div className="text-[10px] text-zinc-500 space-y-0.5 font-sans">
                                            <div>Propriétaire : <strong className="text-zinc-300">{c.owner || 'Gestionnaire'}</strong></div>
                                            {c.client_id && <div>Syndicat : <strong className="text-purple-400">{getClientName(c.client_id)}</strong></div>}
                                            {c.taken_at && <div>Convenue le : <span className="text-zinc-400">{c.taken_at}</span></div>}
                                            {c.failure_reason && <div className="text-amber-400 font-semibold">Raison : {c.failure_reason}</div>}
                                        </div>

                                        <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] text-purple-400 group-hover:text-purple-300 font-medium">
                                            <span>💬 Gérer les notes &amp; le statut</span>
                                            <ArrowRightLeft className="h-3 w-3" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

                    <div className="flex justify-end pt-4">
                        <Button 
                            type="button"
                            onClick={() => setActivePage('page2')}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-5 rounded-xl flex items-center gap-2 shadow-lg"
                        >
                            Confirmer la date des assemblées (Page 2) &rarr;
                        </Button>
                    </div>
                </div>
            )}

            {/* 5. ANNUAL ASSEMBLIES TO TRACK SECTION */}
            {activePage === 'page2' && (
                <div className="space-y-6">
                    <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <Network className="h-4 w-4 text-purple-400" />
                            5. Suivi des Assemblées Annuelles (Track)
                        </CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Période cible : 90 jours après la fin d'exercice fiscal (FYE) du syndicat.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={handlePurgeOverdueAssemblies}
                        disabled={loading}
                        variant="outline"
                        className="bg-rose-950/30 text-rose-300 border-rose-800/50 hover:bg-rose-900/50 text-xs font-bold h-8 px-3 rounded-lg flex items-center gap-1.5 shrink-0"
                    >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        Purger les assemblées 2025 en retard (&gt;100j)
                    </Button>
                </CardHeader>
                <CardContent className="p-6">
                    {assemblyTrackings.length === 0 ? (
                        <p className="italic text-zinc-500 text-sm text-center py-6">Aucun syndicat actif sous gestion n'a de date de fin d'exercice fiscal définie.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assemblyTrackings.map((assembly) => {
                                const ind = getAssemblyIndicator(assembly)
                                const targetDate = new Date(assembly.target_date)
                                const today = new Date()
                                const diffTime = targetDate.getTime() - today.getTime()
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                                // Date history logs formatted
                                const dateLogs = assembly.date_history || []

                                return (
                                    <div key={assembly.id} className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-3.5 hover:border-zinc-800 transition-colors">
                                        <div className="flex justify-between items-start gap-2.5">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-bold text-white">{assembly.clients?.company_name || 'Syndicat'}</h4>
                                                <p className="text-[10px] text-zinc-500">
                                                    Fin d'exercice fiscal : <strong className="text-zinc-400">{new Date(assembly.fiscal_year_end).toLocaleDateString('fr-CA')}</strong> · 
                                                    Période cible : <span className="text-zinc-400">{new Date(assembly.target_date).toLocaleDateString('fr-CA')}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${ind.color}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${ind.dot}`} />
                                                    {ind.label}
                                                </Badge>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteAssemblyTracking(assembly.id)}
                                                    className="h-6 w-6 text-zinc-550 hover:text-rose-400 hover:bg-rose-950/20 rounded"
                                                    title="Supprimer définitivement ce suivi d'assemblée"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3.5 text-xs border-t border-zinc-900 pt-3">
                                            <div>
                                                <span className="text-zinc-500 block">Jours restants / retard :</span>
                                                <strong className={`font-mono text-sm ${diffDays < 0 ? 'text-rose-500' : 'text-zinc-200'}`}>
                                                    {diffDays < 0 ? `${Math.abs(diffDays)}j retard` : `${diffDays}j restants`}
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 block">Date planifiée :</span>
                                                {isEditing && assembly.status !== 'completed' ? (
                                                    <Input 
                                                        type="date" 
                                                        value={assembly.planned_date || ''} 
                                                        onChange={(e) => handleAssemblyDateChange(assembly, e.target.value)}
                                                        className="bg-zinc-950 border-zinc-800 text-[10px] h-7 mt-0.5 p-1 text-white rounded"
                                                    />
                                                ) : (
                                                    <strong className="font-mono text-sm text-zinc-200">
                                                        {assembly.planned_date ? new Date(assembly.planned_date).toLocaleDateString('fr-CA') : 'Non planifiée'}
                                                    </strong>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status dropdown in edit mode */}
                                        {isEditing && assembly.status !== 'completed' && (
                                            <div className="space-y-1 pt-1">
                                                <Label className="text-zinc-500 text-[9px] uppercase block font-bold">Changer le statut :</Label>
                                                <select 
                                                    value={assembly.status}
                                                    onChange={(e) => handleAssemblyStatusChange(assembly, e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-850 rounded text-xs p-1.5 text-white"
                                                >
                                                    <option value="to_prepare">À préparer (Brouillon)</option>
                                                    <option value="scheduled">Planifiée / Date fixée</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Date modification logs */}
                                        {dateLogs.length > 0 && (
                                            <div className="bg-zinc-900/10 p-2 border border-zinc-850/60 rounded text-[9px] space-y-1 text-zinc-400 font-mono">
                                                <span className="text-zinc-550 block font-bold uppercase text-[8px] tracking-wider mb-1">Historique des dates :</span>
                                                {dateLogs.map((log: any, lIdx: number) => (
                                                    <div key={lIdx} className="flex justify-between items-center gap-1.5">
                                                        <span>{new Date(log.timestamp).toLocaleDateString('fr-CA')} : de <strong className="text-zinc-400">{log.old_date}</strong> à <strong className="text-zinc-200">{log.new_date}</strong></span>
                                                        <span className="text-zinc-600">par {log.changed_by}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Assembly Notes list */}
                                        {assembly.notes && assembly.notes.length > 0 && (
                                            <div className="pt-2 border-t border-zinc-900/40 space-y-1.5">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Notes de suivi :</span>
                                                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                                    {assembly.notes.map((n: any, nIdx: number) => {
                                                        const isEditingThisNote = editingNoteIndex[assembly.id] === nIdx
                                                        return (
                                                            <div key={nIdx} className="text-xs text-zinc-400 pl-2 border-l border-purple-500/40 py-1 space-y-1">
                                                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                                    <span>
                                                                        <strong className="text-zinc-350">{n.author}</strong> · <span>{new Date(n.timestamp).toLocaleDateString('fr-CA')}</span>
                                                                    </span>
                                                                    {assembly.status !== 'completed' && (
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={() => handleEditAssemblyNoteStart(assembly.id, nIdx, n.note)}
                                                                                className="text-zinc-550 hover:text-purple-400 p-0.5 rounded transition-all"
                                                                                title="Modifier la note"
                                                                            >
                                                                                <Edit className="h-2.5 w-2.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteAssemblyNote(assembly, nIdx)}
                                                                                className="text-zinc-555 text-zinc-550 hover:text-rose-450 p-0.5 rounded transition-all"
                                                                                title="Supprimer la note"
                                                                            >
                                                                                <Trash2 className="h-2.5 w-2.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {isEditingThisNote ? (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <Input
                                                                            value={editingNoteText}
                                                                            onChange={(e) => setEditingNoteText(e.target.value)}
                                                                            className="h-7 text-xs bg-zinc-950 border-zinc-800 text-white rounded px-2 w-full"
                                                                        />
                                                                        <Button
                                                                            size="icon"
                                                                            onClick={() => handleSaveAssemblyNote(assembly, nIdx)}
                                                                            className="h-7 w-7 bg-emerald-650 hover:bg-emerald-750 text-white rounded-lg shrink-0"
                                                                        >
                                                                            <Check className="h-3 w-3" />
                                                                        </Button>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => handleCancelAssemblyNoteEdit(assembly.id)}
                                                                            className="h-7 w-7 text-zinc-400 hover:text-white rounded-lg shrink-0"
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-zinc-200 break-words leading-normal">{n.note}</p>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Add assembly note field */}
                                        {assembly.status !== 'completed' && (
                                            <div className="flex gap-2 pt-1.5">
                                                <Input 
                                                    value={assemblyNotesTexts[assembly.id] || ''}
                                                    onChange={(e) => setAssemblyNotesTexts(prev => ({ ...prev, [assembly.id]: e.target.value }))}
                                                    placeholder="Saisir note de suivi..."
                                                    className="bg-zinc-950 border-zinc-800 text-xs h-8 rounded"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddAssemblyNote(assembly)}
                                                />
                                                <Button onClick={() => handleAddAssemblyNote(assembly)} className="h-8 px-3 text-xs bg-zinc-900 hover:bg-zinc-805 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded font-bold">
                                                    Note
                                                </Button>
                                            </div>
                                        )}

                                        {/* Assembly actions */}
                                        {isEditing && assembly.status !== 'completed' && (
                                            <div className="flex gap-2 pt-2 border-t border-zinc-900/40">
                                                <Button 
                                                    onClick={() => setConfirmingAssemblyId(assembly.id)} 
                                                    className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                                                >
                                                    Confirmer complétée
                                                </Button>
                                                <Button 
                                                    onClick={() => handleCreateCommitmentFromAssembly(assembly)} 
                                                    variant="outline" 
                                                    className="w-full h-7 text-[10px] bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 rounded"
                                                >
                                                    Créer un engagement
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
                </div>
            )}

            {activePage === 'page1' && (
                <div className="space-y-6">
                    {/* 6. ACTIVE RISKS, COMPLAINTS, AND CONCERNS SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-purple-400" />
                        6. Risques Actifs, Plaintes et Alertes Clientèle
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {managerComplaints.length === 0 && operationalRisks.length === 0 ? (
                        <p className="italic text-zinc-500 text-sm text-center py-6">Aucun risque ou plainte active à signaler.</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Grouped list of risks & complaints */}
                            {managerComplaints.map((comp) => {
                                const notesForComp = itemNotes.filter(n => n.item_type === 'complaint' && n.item_id === comp.id)
                                const state = reviewedComplaintsState[comp.id] || { checked: false, my_notes: '', manager_notes: '', resolved_in_meeting: false }
                                const isDiscussed = state.checked || comp.discussion_notes || comp.my_notes
                                const isResolved = state.resolved_in_meeting || comp.resolved_in_meeting

                                return (
                                    <div key={comp.id} className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-3.5 hover:border-purple-500/40 transition-all">
                                        <div className="flex justify-between items-start gap-2.5">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="text-[9px] bg-rose-955 bg-rose-600/10 text-rose-500 font-bold border border-rose-500/20">Plainte</Badge>
                                                    <h4 className="text-sm font-bold text-white">{comp.title || 'Plainte client'}</h4>
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-1">{comp.description}</p>
                                                <span className="text-[10px] text-zinc-550 block mt-1">Syndicat : <strong className="text-zinc-400">{comp.clients?.company_name || comp.clients?.full_name || 'Copropriété'}</strong></span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <Badge variant="outline" className="text-[8px] uppercase border-rose-900 bg-rose-950/15 text-rose-455">
                                                    {comp.severity || 'Medium'}
                                                </Badge>
                                                <Button 
                                                    type="button"
                                                    onClick={() => openComplaintModal(comp)} 
                                                    className="h-6 px-2 text-[9px] font-bold bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 border border-purple-800/50 rounded flex items-center gap-1"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                    Détails & Revue
                                                </Button>
                                            </div>
                                        </div>

                                        {(comp.discussion_notes || comp.my_notes || comp.resolution_plan || comp.manager_notes) && (
                                            <div className="pt-2 border-t border-zinc-900/60 pl-2 space-y-1 text-xs">
                                                {(comp.discussion_notes || comp.my_notes) && (
                                                    <div><span className="text-[9px] font-bold text-purple-400 uppercase">Notes Direction : </span><span className="text-zinc-300">{comp.discussion_notes || comp.my_notes}</span></div>
                                                )}
                                                {(comp.resolution_plan || comp.manager_notes) && (
                                                    <div><span className="text-[9px] font-bold text-amber-400 uppercase">Plan / Notes Gestionnaire : </span><span className="text-zinc-300">{comp.resolution_plan || comp.manager_notes}</span></div>
                                                )}
                                            </div>
                                        )}

                                        {notesForComp.length > 0 && (
                                            <div className="pt-2 border-t border-zinc-900/60 pl-2 space-y-1.5">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Notes historiques :</span>
                                                {notesForComp.map(n => (
                                                    <div key={n.id} className="text-[10px] text-zinc-400 pl-1.5 border-l border-purple-500/50">
                                                        <strong className="text-zinc-350">{n.author_name}</strong> · <span className="text-[9px] text-zinc-650">{new Date(n.created_at).toLocaleString('fr-CA')}</span>
                                                        <p className="text-zinc-350 font-sans">{n.note_text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {isEditing && (
                                            <div className="flex gap-2 max-w-md pt-1">
                                                <Input 
                                                    value={newNoteTexts[comp.id] || ''}
                                                    onChange={(e) => setNewNoteTexts(prev => ({ ...prev, [comp.id]: e.target.value }))}
                                                    placeholder="Saisir note de suivi..."
                                                    className="bg-zinc-950 border-zinc-800 text-[10px] h-7 rounded"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveItemNote('complaint', comp.id)}
                                                />
                                                <Button onClick={() => handleSaveItemNote('complaint', comp.id)} className="h-7 px-2.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded">
                                                    Note
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {operationalRisks.filter(r => r.status === 'active').map((risk) => {
                                const notesForRisk = itemNotes.filter(n => n.item_type === 'risk' && n.item_id === risk.id)
                                return (
                                    <div key={risk.id} className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="text-[9px] bg-amber-955 bg-amber-600/10 text-amber-450 border border-amber-500/20">Risque</Badge>
                                                    <h4 className="text-sm font-bold text-white">{risk.description}</h4>
                                                </div>
                                                {risk.client_id && <span className="text-[10px] text-zinc-500 block mt-1">Syndicat : <strong className="text-zinc-400">{getClientName(risk.client_id)}</strong></span>}
                                            </div>
                                            <Badge variant="outline" className={`text-[8px] uppercase ${
                                                risk.severity === 'critical' || risk.severity === 'high' ? 'border-rose-900 bg-rose-955 bg-rose-600/10 text-rose-500' :
                                                'border-amber-900 bg-amber-955 bg-amber-600/10 text-amber-450'
                                            }`}>
                                                {risk.severity}
                                            </Badge>
                                        </div>

                                        {notesForRisk.length > 0 && (
                                            <div className="pt-2 border-t border-zinc-900/60 pl-2 space-y-1.5">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Notes historiques :</span>
                                                {notesForRisk.map(n => (
                                                    <div key={n.id} className="text-[10px] text-zinc-400 pl-1.5 border-l border-purple-500/50">
                                                        <strong className="text-zinc-350">{n.author_name}</strong> · <span className="text-[9px] text-zinc-650">{new Date(n.created_at).toLocaleString('fr-CA')}</span>
                                                        <p className="text-zinc-350 font-sans">{n.note_text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {isEditing && (
                                            <div className="flex gap-2 max-w-md pt-1">
                                                <Input 
                                                    value={newNoteTexts[risk.id] || ''}
                                                    onChange={(e) => setNewNoteTexts(prev => ({ ...prev, [risk.id]: e.target.value }))}
                                                    placeholder="Saisir note de suivi..."
                                                    className="bg-zinc-950 border-zinc-800 text-[10px] h-7 rounded"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveItemNote('risk', risk.id)}
                                                />
                                                <Button onClick={() => handleSaveItemNote('risk', risk.id)} className="h-7 px-2.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded">
                                                    Note
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 7. AUDITS AND QUALITY REVIEW SECTION */}
            {((syndicateAudits && syndicateAudits.length > 0) || (assemblyEvaluations && assemblyEvaluations.length > 0)) && (
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-800/40">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-purple-400" />
                            7. Audits et Revue de Qualité Récents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {syndicateAudits.map((audit) => (
                                <div key={audit.id} className="p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Badge className="text-[8px] bg-zinc-900 border border-zinc-850 text-zinc-350 font-bold uppercase">Audit Syndicat</Badge>
                                        <span className="text-[10px] text-zinc-500">{new Date(audit.audit_date).toLocaleDateString('fr-CA')}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white">{audit.clients?.company_name || 'Syndicat'}</h4>
                                    <div className="flex justify-between items-center pt-2.5 text-xs text-zinc-400">
                                        <span>Score de santé :</span>
                                        <strong className={`font-mono text-base ${audit.health_score >= 80 ? 'text-emerald-400' : audit.health_score >= 60 ? 'text-amber-400' : 'text-rose-500'}`}>
                                            {audit.health_score}%
                                        </strong>
                                    </div>
                                </div>
                            ))}

                            {assemblyEvaluations.map((evalItem) => (
                                <div key={evalItem.id} className="p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Badge className="text-[8px] bg-zinc-900 border border-zinc-850 text-zinc-350 font-bold uppercase">Évaluation Assemblée</Badge>
                                        <span className="text-[10px] text-zinc-500">{new Date(evalItem.assembly_date).toLocaleDateString('fr-CA')}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white">{evalItem.clients?.company_name || 'Syndicat'}</h4>
                                    <p className="text-xs text-zinc-400 italic">Notes: {evalItem.notes || 'Sans notes.'}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 8. SUPPORT AND COACHING SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        8. Soutien, Accompagnement et Coaching
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 font-semibold">Succès, progrès ou bon coup à reconnaître</Label>
                            {isEditing ? (
                                <Textarea value={coachingSuccess} onChange={(e) => setCoachingSuccess(e.target.value)} placeholder="Reconnaissance, améliorations concrètes de l'employé..." rows={3} className="bg-zinc-950 border-zinc-800 text-sm text-white rounded-xl" />
                            ) : (
                                <p className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/40 min-h-[70px] whitespace-pre-wrap">{coachingSuccess || 'Aucune observation.'}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 font-semibold">Axe de développement, compétence ou habitude à améliorer</Label>
                            {isEditing ? (
                                <Textarea value={coachingImprovement} onChange={(e) => setCoachingImprovement(e.target.value)} placeholder="Prochain focus d'amélioration..." rows={3} className="bg-zinc-950 border-zinc-800 text-sm text-white rounded-xl" />
                            ) : (
                                <p className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/40 min-h-[70px] whitespace-pre-wrap">{coachingImprovement || 'Aucune observation.'}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 font-semibold">Processus, règle ou point de méthode à clarifier</Label>
                            {isEditing ? (
                                <Textarea value={coachingClarification} onChange={(e) => setCoachingClarification(e.target.value)} placeholder="Besoin de formation, clarification de processus..." rows={3} className="bg-zinc-950 border-zinc-800 text-sm text-white rounded-xl" />
                            ) : (
                                <p className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/40 min-h-[70px] whitespace-pre-wrap">{coachingClarification || 'Aucune observation.'}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-zinc-400 font-semibold">Soutien promis par le chef d'équipe (Promesses &amp; Décisions)</Label>
                            {isEditing ? (
                                <Textarea value={coachingPromised} onChange={(e) => setCoachingPromised(e.target.value)} placeholder="Actions concrètes ou décisions promises de votre part..." rows={3} className="bg-zinc-950 border-zinc-800 text-sm text-white rounded-xl" />
                            ) : (
                                <p className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/40 min-h-[70px] whitespace-pre-wrap">{coachingPromised || 'Aucune promesse enregistrée.'}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 9. NEW RECIPROCAL COMMITMENTS SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-purple-400" />
                        9. Nouveaux Engagements Réciproques
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                        Ajoutez des engagements précis et quantifiables pour chacun. Recommandé : max 3 pour le gestionnaire, max 2 pour le chef d'équipe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Commitment creation inline form */}
                    {isEditing && (
                        <div className="p-4 bg-zinc-950/50 border border-zinc-850 rounded-xl space-y-4">
                            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Ajouter un engagement</span>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end text-sm">
                                <div className="md:col-span-4 space-y-1.5">
                                    <Label className="text-zinc-500 text-[10px]">Action concrète à réaliser</Label>
                                    <Input value={newActionText} onChange={(e) => setNewActionText(e.target.value)} placeholder="Ex. Envoyer 3 dates d'assemblée au CA par écrit..." className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-zinc-500 text-[10px]">Propriétaire</Label>
                                    <select value={newActionOwner} onChange={(e) => setNewActionOwner(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-purple-600 h-9">
                                        <option value="Employee">Gestionnaire (Employé)</option>
                                        <option value="Team Leader">Chef d'équipe (Superviseur)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-zinc-500 text-[10px]">Échéance</Label>
                                    <Input type="date" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white h-9" />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-zinc-500 text-[10px]">Syndicat lié (Optionnel)</Label>
                                    <SearchableClientSelect clients={searchableClients} name="new_action_client_id" defaultValue={newActionClientId} onChange={setNewActionClientId} placeholder="Syndicat..." />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-zinc-500 text-[10px]">Résultat attendu / Critère</Label>
                                    <Input value={newActionExpectedResult} onChange={(e) => setNewActionExpectedResult(e.target.value)} placeholder="Ex. Confirmation écrite reçue..." className="bg-zinc-950 border-zinc-800 text-sm text-white h-9" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-1">
                                <Button onClick={handleAddNewCommitment} className="h-8.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg px-4 flex items-center gap-1">
                                    <Plus className="h-4 w-4" /> Ajouter l'engagement
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* Employee Commitments column */}
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <h4 className="text-sm font-black uppercase text-zinc-350 tracking-wider flex items-center gap-2">
                                    <User className="h-4 w-4 text-purple-400" />
                                    Engagements du Gestionnaire ({newAgreedActions.filter(a => a.owner === 'Employee').length} / 3)
                                </h4>
                            </div>

                            {newAgreedActions.filter(a => a.owner === 'Employee').length === 0 ? (
                                <p className="italic text-zinc-650 text-xs py-4 pl-1">Aucun engagement défini pour l'employé.</p>
                            ) : (
                                <div className="space-y-2">
                                    {newAgreedActions.filter(a => a.owner === 'Employee').map((comm, idx) => (
                                        <div key={idx} className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl text-xs flex justify-between items-start gap-3">
                                            <div className="space-y-1 flex-1">
                                                <strong className="text-zinc-200 block text-sm">{comm.commitment_text}</strong>
                                                <div className="text-[10px] text-zinc-550 space-y-0.5">
                                                    <div>Échéance : <span className="text-zinc-400 font-mono">{comm.due_date ? new Date(comm.due_date).toLocaleDateString('fr-CA') : 'Prochaine revue'}</span></div>
                                                    {comm.client_id && <div>Syndicat : <span className="text-zinc-400">{getClientName(comm.client_id)}</span></div>}
                                                    {comm.notes && <div>Résultat attendu : <span className="text-purple-400 italic">{comm.notes}</span></div>}
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <Button size="icon" variant="outline" className="h-6 w-6 border-zinc-800 text-zinc-550 hover:text-rose-500 rounded-md bg-zinc-900 shrink-0" onClick={() => handleRemoveNewCommitment(newAgreedActions.indexOf(comm))}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Team Leader Commitments column */}
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <h4 className="text-sm font-black uppercase text-zinc-350 tracking-wider flex items-center gap-2">
                                    <User className="h-4 w-4 text-purple-400" />
                                    Engagements du Chef d'équipe ({newAgreedActions.filter(a => a.owner === 'Team Leader').length} / 2)
                                </h4>
                            </div>

                            {newAgreedActions.filter(a => a.owner === 'Team Leader').length === 0 ? (
                                <p className="italic text-zinc-650 text-xs py-4 pl-1">Aucun engagement défini pour le superviseur.</p>
                            ) : (
                                <div className="space-y-2">
                                    {newAgreedActions.filter(a => a.owner === 'Team Leader').map((comm, idx) => (
                                        <div key={idx} className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl text-xs flex justify-between items-start gap-3">
                                            <div className="space-y-1 flex-1">
                                                <strong className="text-zinc-200 block text-sm">{comm.commitment_text}</strong>
                                                <div className="text-[10px] text-zinc-550 space-y-0.5">
                                                    <div>Échéance : <span className="text-zinc-400 font-mono">{comm.due_date ? new Date(comm.due_date).toLocaleDateString('fr-CA') : 'Prochaine revue'}</span></div>
                                                    {comm.client_id && <div>Syndicat : <span className="text-zinc-400">{getClientName(comm.client_id)}</span></div>}
                                                    {comm.notes && <div>Résultat attendu : <span className="text-purple-400 italic">{comm.notes}</span></div>}
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <Button size="icon" variant="outline" className="h-6 w-6 border-zinc-800 text-zinc-550 hover:text-rose-500 rounded-md bg-zinc-900 shrink-0" onClick={() => handleRemoveNewCommitment(newAgreedActions.indexOf(comm))}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 10. MEETING CONCLUSION SECTION */}
            <Card className="bg-zinc-900/40 border-zinc-800 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-800/40">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                        10. Conclusion de la rencontre
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1.5 md:col-span-1">
                            <Label className="text-zinc-400 text-sm font-semibold">Statut Global Final du Portefeuille</Label>
                            {isEditing ? (
                                <select 
                                    value={conclusionPortfolioStatus} 
                                    onChange={(e) => setConclusionPortfolioStatus(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="under_control">Sous contrôle</option>
                                    <option value="needs_attention">Nécessite de l'attention</option>
                                    <option value="critical">Critique / Alerte rouge</option>
                                </select>
                            ) : (
                                <div className="text-sm font-bold capitalize">
                                    {conclusionPortfolioStatus === 'under_control' && <span className="text-emerald-400">✔ Sous contrôle</span>}
                                    {conclusionPortfolioStatus === 'needs_attention' && <span className="text-amber-400">⚠ Nécessite de l'attention</span>}
                                    {conclusionPortfolioStatus === 'critical' && <span className="text-rose-500">❌ Critique / Alerte</span>}
                                    {!conclusionPortfolioStatus && <span className="text-zinc-500 italic">Non spécifié</span>}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-3 text-sm">
                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 font-semibold">Ce qui va bien dans le portefeuille</Label>
                                {isEditing ? (
                                    <Input value={conclusionGoingWell} onChange={(e) => setConclusionGoingWell(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{conclusionGoingWell || 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 font-semibold">Ce qui requiert une attention particulière</Label>
                                {isEditing ? (
                                    <Input value={conclusionNeedsAttention} onChange={(e) => setConclusionNeedsAttention(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{conclusionNeedsAttention || 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 font-semibold">Décisions arrêtées</Label>
                                {isEditing ? (
                                    <Input value={conclusionDecisions} onChange={(e) => setConclusionDecisions(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{conclusionDecisions || 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 font-semibold">Priorités principales d'ici le prochain suivi</Label>
                                {isEditing ? (
                                    <Input value={conclusionPriorities} onChange={(e) => setConclusionPriorities(e.target.value)} className="bg-zinc-950 border-zinc-800 text-sm text-white" />
                                ) : (
                                    <p className="text-sm text-zinc-300 p-2.5 bg-zinc-950/40 rounded-lg">{conclusionPriorities || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 11. COLLAPSIBLE STATISTICS AND PERFORMANCE DATA SECTION */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-[#16171e]/75 shadow-lg">
                <button 
                    onClick={() => setStatsCollapsed(!statsCollapsed)}
                    className="w-full p-5 flex justify-between items-center bg-[#121318]/60 hover:bg-[#121318]/90 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <TrendingUp className="h-4.5 w-4.5 text-purple-400" />
                        <span className="text-base font-bold text-white uppercase tracking-tight">11. Consulter les statistiques de performance détaillées</span>
                    </div>
                    {statsCollapsed ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronUp className="h-4 w-4 text-zinc-400" />}
                </button>

                {!statsCollapsed && (
                    <div className="p-6 border-t border-zinc-800/80 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-1">
                                <span className="text-zinc-550 block font-bold uppercase tracking-wider">Score Gustav</span>
                                <strong className="text-xl text-purple-400 block">{computedScore}% ({rating.label})</strong>
                                <span className="text-zinc-500 font-medium">Imputabilité globale</span>
                            </div>
                            <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-1">
                                <span className="text-zinc-550 block font-bold uppercase tracking-wider">Appels Répondus</span>
                                <strong className="text-xl text-emerald-400 block">{callsTotal > 0 ? `${Math.round(callsPct)}%` : 'N/A'}</strong>
                                <span className="text-zinc-500 font-medium">{callsAnswered} répondus / {callsTotal} total</span>
                            </div>
                            <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-1">
                                <span className="text-zinc-550 block font-bold uppercase tracking-wider">Hygiène Tâches en retard</span>
                                <strong className="text-xl text-amber-400 block">{taskHygiene}%</strong>
                                <span className="text-zinc-500 font-medium">{lateTasks} tâches en retard</span>
                            </div>
                            <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-1">
                                <span className="text-zinc-550 block font-bold uppercase tracking-wider">Hygiène Factures en retard</span>
                                <strong className="text-xl text-zinc-200 block">{billHygiene}%</strong>
                                <span className="text-zinc-500 font-medium">{billsNoNotes} sans note &gt;7j</span>
                            </div>
                        </div>

                        {/* Calls and workload charts from original scorecard */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                            <Card className="bg-[#121318]/50 border-zinc-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Historique mensuel des appels</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <CallsStatsPanel managerId={manager.id} title="" />
                                </CardContent>
                            </Card>
                            <Card className="bg-[#121318]/50 border-zinc-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Volume de communications (SDCs)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-2 text-xs text-zinc-400">
                                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                                        <span>Total syndicats sous gestion :</span>
                                        <strong className="text-white font-mono">{syndicatesCount}</strong>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                                        <span>Total portes gérées :</span>
                                        <strong className="text-white font-mono">{doorsCount}</strong>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                                        <span>Taux d'approbation soumissions :</span>
                                        <strong className="text-white font-mono">{quoteApprovalRate}%</strong>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )}

            {/* Confirm assembly modal */}
            <Dialog open={confirmingAssemblyId !== null} onOpenChange={() => setConfirmingAssemblyId(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-white">Confirmer l'assemblée complétée</DialogTitle>
                        <DialogDescription className="text-xs text-zinc-400 mt-1">
                            Veuillez entrer la date réelle à laquelle l'assemblée annuelle s'est tenue. Cela mettra à jour la fiche du syndicat et ouvrira le cycle de suivi pour l'année suivante.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2 text-sm">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Date réelle de l'assemblée</Label>
                            <Input 
                                type="date" 
                                value={actualAssemblyDate} 
                                onChange={(e) => setActualAssemblyDate(e.target.value)} 
                                className="bg-zinc-950 border-zinc-800 text-sm text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setConfirmingAssemblyId(null)} className="h-8.5 text-xs bg-zinc-900 border-zinc-800 text-zinc-300">
                            Annuler
                        </Button>
                        <Button onClick={handleConfirmAssemblyCompleted} disabled={!actualAssemblyDate} className="h-8.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                            Confirmer la complétion
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Commitment Detail Modal */}
            {activeCommitment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#16171e] border border-zinc-800 rounded-2xl w-full max-w-[95vw] md:max-w-[75vw] lg:max-w-[65vw] xl:max-w-[55vw] max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-xs text-zinc-300">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                            <div>
                                <span className="text-purple-400 uppercase font-black text-[9px] tracking-widest block mb-1">Suivi de l'Engagement Convenu</span>
                                <h3 className="text-base font-bold text-white uppercase">{activeCommitment.commitment_text}</h3>
                                <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap gap-3 font-sans">
                                    <span>Propriétaire : <strong className="text-zinc-200">{activeCommitment.owner || 'Gestionnaire'}</strong></span>
                                    {activeCommitment.client_id && <span>Syndicat : <strong className="text-purple-400">{getClientName(activeCommitment.client_id)}</strong></span>}
                                    {activeCommitment.taken_at && <span>Convenu le : <strong className="text-zinc-200">{activeCommitment.taken_at}</strong></span>}
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setActiveCommitment(null)} 
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Controls: Status & Failure Reason */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/40 p-4 border border-zinc-850 rounded-xl">
                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 font-semibold text-xs">Statut de Suivi</Label>
                                <select
                                    value={activeCommitment.status || 'Open'}
                                    onChange={(e) => {
                                        const newStatus = e.target.value
                                        const idx = previousCommitments.findIndex(c => c.id === activeCommitment.id)
                                        if (idx !== -1) handlePrevCommitmentChange(idx, 'status', newStatus)
                                        setActiveCommitment((prev: any) => ({ ...prev, status: newStatus }))
                                    }}
                                    className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 text-xs font-semibold"
                                >
                                    <option value="Open">En attente (Open)</option>
                                    <option value="Improved">Amélioré (Improved)</option>
                                    <option value="Partial">Résolution Partielle (Partial)</option>
                                    <option value="Not resolved">Non Résolu (Not resolved)</option>
                                    <option value="Resolved">Résolu (Resolved)</option>
                                </select>
                            </div>

                            {activeCommitment.status !== 'Resolved' && (
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400 font-semibold text-xs">Raison d'Échec / Bloqueur</Label>
                                    <select
                                        value={activeCommitment.failure_reason || 'Lack of organization'}
                                        onChange={(e) => {
                                            const newReason = e.target.value
                                            const idx = previousCommitments.findIndex(c => c.id === activeCommitment.id)
                                            if (idx !== -1) handlePrevCommitmentChange(idx, 'failure_reason', newReason)
                                            setActiveCommitment((prev: any) => ({ ...prev, failure_reason: newReason }))
                                        }}
                                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 text-xs font-semibold"
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
                                </div>
                            )}
                        </div>

                        {/* Multi-Note History Section */}
                        <div className="space-y-3 pt-2">
                            <h4 className="font-bold text-white text-xs flex items-center justify-between">
                                Historique des Notes de Suivi
                                <span className="text-[10px] text-zinc-500 font-normal">{commitmentNotesHistory.length} note(s)</span>
                            </h4>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {commitmentNotesHistory.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 italic py-3 text-center bg-zinc-950/20 rounded-xl border border-zinc-900">
                                        Aucune note d'historique enregistrée pour cet engagement.
                                    </p>
                                ) : (
                                    commitmentNotesHistory.map((n) => (
                                        <div key={n.id} className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-1.5 text-xs">
                                            <div className="flex justify-between items-center text-[10px] text-zinc-400 border-b border-zinc-900/80 pb-1">
                                                <span className="font-semibold text-purple-300">{n.author_name}</span>
                                                <span className="text-zinc-500">{new Date(n.created_at).toLocaleString('fr-CA')}</span>
                                            </div>

                                            {editingItemNoteId === n.id ? (
                                                <div className="space-y-2 pt-1">
                                                    <Textarea 
                                                        value={editingItemNoteText}
                                                        onChange={(e) => setEditingItemNoteText(e.target.value)}
                                                        className="bg-zinc-900 border-zinc-700 text-xs text-white min-h-[60px]"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="xs" variant="outline" onClick={() => setEditingItemNoteId(null)} className="h-6 text-[10px]">
                                                            Annuler
                                                        </Button>
                                                        <Button size="xs" onClick={() => handleUpdateNote('commitment', activeCommitment.id, n.id, editingItemNoteText)} className="h-6 text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-bold">
                                                            Sauvegarder
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start gap-3">
                                                    <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed flex-1">{n.note_text}</p>
                                                    <div className="flex gap-1.5 shrink-0">
                                                        <button 
                                                            type="button"
                                                            onClick={() => { setEditingItemNoteId(n.id); setEditingItemNoteText(n.note_text); }}
                                                            className="text-zinc-500 hover:text-purple-300 p-1 rounded hover:bg-zinc-900"
                                                            title="Éditer la note"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteNote('commitment', n.id)}
                                                            className="text-rose-500 hover:text-rose-300 p-1 rounded hover:bg-zinc-900"
                                                            title="Supprimer la note"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add New Note Box */}
                            <div className="space-y-2 pt-3 border-t border-zinc-900">
                                <Label className="text-zinc-400 font-semibold text-[11px]">Ajouter une note de suivi (Direction / Gestionnaire)</Label>
                                <Textarea 
                                    value={newCommitmentNoteText}
                                    onChange={(e) => setNewCommitmentNoteText(e.target.value)}
                                    placeholder="Écrire une note explicative pour cet engagement..."
                                    className="bg-zinc-950 border-zinc-800 text-xs min-h-[65px]"
                                />
                                <div className="flex justify-end">
                                    <Button 
                                        type="button"
                                        disabled={!newCommitmentNoteText.trim()}
                                        onClick={() => handleAddNoteToItem('commitment', activeCommitment.id, newCommitmentNoteText)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 rounded-lg"
                                    >
                                        Enregistrer la note
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-3 border-t border-zinc-850">
                            <Button 
                                type="button" 
                                onClick={() => setActiveCommitment(null)} 
                                className="bg-zinc-900 hover:bg-zinc-850 text-white text-xs h-9 px-5 rounded-xl font-bold"
                            >
                                Fermer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complaint Edit Modal */}
            {activeEditingComplaint && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#16171e] border border-zinc-800 rounded-2xl w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[75vw] max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-xs text-zinc-300">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                            <div>
                                <span className="text-purple-400 uppercase font-black text-[9px] tracking-widest block mb-1">Revue de Plainte Active</span>
                                <h3 className="text-sm font-bold text-white uppercase">Détails & Modification</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setActiveEditingComplaint(null)} 
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Complaint Edit/View Section */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">{activeEditingComplaint.type === 'note' ? 'Titre de la note' : 'Titre de la plainte'}</Label>
                                    <Input 
                                        value={editingComplaintTitle}
                                        onChange={(e) => setEditingComplaintTitle(e.target.value)}
                                        className="bg-[#121318] border-zinc-850 h-9 text-xs text-white"
                                    />
                                </div>
                                {activeEditingComplaint.type !== 'note' && (
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Gravité</Label>
                                        <select 
                                            value={editingComplaintSeverity}
                                            onChange={(e) => setEditingComplaintSeverity(e.target.value as any)}
                                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9 text-xs"
                                        >
                                            <option value="low">Faible (Low)</option>
                                            <option value="medium">Moyenne (Medium)</option>
                                            <option value="high">Élevée (High)</option>
                                            <option value="critical">Critique (Critical)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-zinc-500">{activeEditingComplaint.type === 'note' ? 'Description de la note' : 'Description de la plainte'}</Label>
                                <Textarea 
                                    value={editingComplaintDesc}
                                    onChange={(e) => setEditingComplaintDesc(e.target.value)}
                                    className="bg-[#121318] border-zinc-800 text-xs text-white"
                                    rows={4}
                                />
                            </div>

                            <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1 text-xs">
                                <span className="text-zinc-500 block font-semibold text-[10px] uppercase">Détails additionnels:</span>
                                <div>Syndicat: <strong className="text-zinc-300">{activeEditingComplaint.clients?.company_name || activeEditingComplaint.clients?.full_name || 'Copropriété'}</strong></div>
                                <div>Catégorie: <strong className="text-purple-400">{activeEditingComplaint.complaint_categories?.name || 'Général'}</strong></div>
                                {activeEditingComplaint.received_date && <div>Date de réception: <strong className="text-zinc-300">{new Date(activeEditingComplaint.received_date).toLocaleDateString('fr-CA')}</strong></div>}
                            </div>
                        </div>

                        {/* Discussion Notes Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                            <h4 className="font-bold text-white text-xs">Alignement & Rétroaction en Rencontre</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes de la Direction (Ce que j'ai dit)</Label>
                                    <Textarea 
                                        value={editingComplaintMyNotes}
                                        onChange={(e) => setEditingComplaintMyNotes(e.target.value)}
                                        placeholder="Indiquer vos notes ou directives..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes du Gestionnaire (Plan d'action)</Label>
                                    <Textarea 
                                        value={editingComplaintManagerNotes}
                                        onChange={(e) => setEditingComplaintManagerNotes(e.target.value)}
                                        placeholder="Plan de résolution ou retour du gestionnaire..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Resolution status buttons */}
                            <div className="space-y-2">
                                <Label className="text-zinc-500">Statut de discussion de la plainte</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingComplaintStatus('not_discussed')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'not_discussed'
                                                ? 'bg-zinc-900 border-zinc-700 text-white'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        }`}
                                    >
                                        Non discutée
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingComplaintStatus('in_progress')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'in_progress'
                                                ? 'bg-amber-950/20 border-amber-600/30 text-amber-400'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        }`}
                                    >
                                        En cours
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingComplaintStatus('resolved')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'resolved'
                                                ? 'bg-emerald-950/20 border-emerald-600/30 text-emerald-400'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        }`}
                                    >
                                        Résoudre (Resolve)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-850">
                            <Button 
                                type="button"
                                variant="outline" 
                                onClick={() => setActiveEditingComplaint(null)}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs h-9 px-4"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="button"
                                onClick={handleSaveComplaintChanges}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4"
                            >
                                Appliquer les modifications
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation dialog for deleting meeting */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => setDeleteConfirmOpen(open)}
                onConfirm={handleDeleteMeeting}
                title="Supprimer la rencontre"
                description="Êtes-vous certain de vouloir supprimer définitivement cette rencontre d'alignement ? Cette action est irréversible."
                confirmText="Supprimer définitivement"
                cancelText="Annuler"
                variant="danger"
            />
        </div>
    )
}
