'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
    createOneOnOneAction, 
    getOneOnOneSnapshotAction,
    getCategoryComplaintHistoryAction,
    getSyndicateAuditDetailsAction,
    getAssemblyEvaluationDetailsAction
} from '@/actions/team-management'
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
    X,
    ArrowLeft,
    RefreshCw,
    Clock
} from 'lucide-react'
import { SearchableClientSelect } from './SearchableClientSelect'
import { SearchableManagerSelect } from './SearchableManagerSelect'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

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

const ASSEMBLY_LABELS: Record<string, string> = {
    agenda_sent_on_time: "Ordre du jour envoyé dans les délais",
    quorum_respected: "Quorum respecté",
    voting_controlled: "Contrôle des votes efficace",
    duration_reasonable: "Durée raisonnable",
    technical_prep_complete: "Préparation technique complète",
    manager_controlled_room: "Maîtrise de la salle par le gestionnaire",
    discussions_on_track: "Discussions cadrées et sur les rails",
    conflict_handled_professionally: "Gestion professionnelle des conflits",
    answers_clear_confident: "Réponses claires et affirmées",
    pv_drafted_quickly: "PV rédigé rapidement",
    templates_respected: "Gabarits / Templates respectés",
    resolutions_clear: "Résolutions claires",
    followup_tasks_created: "Tâches de suivi créées"
}

export function NewOneOnOneForm({ managers }: { managers: any[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [managerId, setManagerId] = useState(managers[0]?.id || '')
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().substring(0, 10))
    const [summary, setSummary] = useState('')
    
    // Collapsible coaching section
    const [coachingOpen, setCoachingOpen] = useState(false)

    // Manual entered metrics
    const [emailsOver48h, setEmailsOver48h] = useState(0)
    const [lateTasks, setLateTasks] = useState(0)
    const [callsTotal, setCallsTotal] = useState(0)
    const [callsAnswered, setCallsAnswered] = useState(0)
    const [billsNoNotes, setBillsNoNotes] = useState(0)

    // Snapshot comparisons (fetched from DB)
    const [callsTotalPrev, setCallsTotalPrev] = useState(0)
    const [callsAnsweredPrev, setCallsAnsweredPrev] = useState(0)
    const [lateTasksPrev, setLateTasksPrev] = useState(0)
    const [emailsReceived, setEmailsReceived] = useState(0)
    const [emailsReceivedPrev, setEmailsReceivedPrev] = useState(0)
    const [billsNoNotesPrev, setBillsNoNotesPrev] = useState(0)
    const [openComplaintsPrev, setOpenComplaintsPrev] = useState(0)

    const [callsMonthCurrent, setCallsMonthCurrent] = useState<string | null>(null)
    const [callsMonthPrev, setCallsMonthPrev] = useState<string | null>(null)
    const [workloadMonthCurrent, setWorkloadMonthCurrent] = useState<string | null>(null)
    const [workloadMonthPrev, setWorkloadMonthPrev] = useState<string | null>(null)

    // Global Stats
    const [quoteApprovalRate, setQuoteApprovalRate] = useState(0)
    const [doorsCount, setDoorsCount] = useState(0)
    const [syndicatesCount, setSyndicatesCount] = useState(0)

    const [callsHistory, setCallsHistory] = useState<any[]>([])
    const [workloadHistory, setWorkloadHistory] = useState<any[]>([])
    const [statsLogs, setStatsLogs] = useState<any[]>([])

    // Section 2: Previous Commitments
    const [previousCommitments, setPreviousCommitments] = useState<any[]>([])

    // Section 3: Audit review details
    const [syndicateAudits, setSyndicateAudits] = useState<any[]>([])
    const [assemblyEvaluations, setAssemblyEvaluations] = useState<any[]>([])
    const [managerComplaints, setManagerComplaints] = useState<any[]>([])
    
    // Notes for reviewed audits
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

    // Complaint History Popup State
    const [historyPopupComplaint, setHistoryPopupComplaint] = useState<any | null>(null)
    const [complaintHistoryList, setComplaintHistoryList] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Task & Email Audits list
    const [taskEmailAudits, setTaskEmailAudits] = useState<any[]>([])
    const [showAuditForm, setShowAuditForm] = useState(false)
    
    // Audit Form States
    const [newAuditType, setNewAuditType] = useState<'task' | 'email'>('task')
    const [newAuditTitle, setNewAuditTitle] = useState('')
    const [newAuditClientId, setNewAuditClientId] = useState('')
    const [newAuditFollowUp, setNewAuditFollowUp] = useState(false)
    const [newAuditDesc, setNewAuditDesc] = useState(false)
    const [newAuditActions, setNewAuditActions] = useState(false)
    const [newAuditCatSelected, setNewAuditCatSelected] = useState(false)
    const [newAuditCreatedDate, setNewAuditCreatedDate] = useState('')
    const [newAuditComplexity, setNewAuditComplexity] = useState<'low' | 'medium' | 'high'>('medium')
    const [newAuditNotes, setNewAuditNotes] = useState('')

    // Section 4: Operational Risks
    const [operationalRisks, setOperationalRisks] = useState<any[]>([])
    const [showRiskForm, setShowRiskForm] = useState(false)
    const [newRiskDesc, setNewRiskDesc] = useState('')
    const [newRiskSeverity, setNewRiskSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')

    // Section 5: Coaching States
    const [workloadNotes, setWorkloadNotes] = useState('')
    const [prioritizationNotes, setPrioritizationNotes] = useState('')
    const [stressNotes, setStressNotes] = useState('')
    const [organizationNotes, setOrganizationNotes] = useState('')
    const [supportNeeded, setSupportNeeded] = useState('')
    const [trainingNeeded, setTrainingNeeded] = useState('')

    // Section 6: New Agreed Actions
    const [newAgreedActions, setNewAgreedActions] = useState<any[]>([])
    const [newActionText, setNewActionText] = useState('')
    const [newActionOwner, setNewActionOwner] = useState('Manager')
    const [newActionDueDate, setNewActionDueDate] = useState('')
    const [newActionNextReview, setNewActionNextReview] = useState(true)
    const [section6DialogOpen, setSection6DialogOpen] = useState(false)

    // Additional custom states for dropdowns and interactive cards/modal
    const [clientsList, setClientsList] = useState<any[]>([])
    const [activeEditingComplaint, setActiveEditingComplaint] = useState<any | null>(null)
    const [editingComplaintTitle, setEditingComplaintTitle] = useState('')
    const [editingComplaintDesc, setEditingComplaintDesc] = useState('')
    const [editingComplaintSeverity, setEditingComplaintSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
    const [editingComplaintMyNotes, setEditingComplaintMyNotes] = useState('')
    const [editingComplaintManagerNotes, setEditingComplaintManagerNotes] = useState('')
    const [editingComplaintStatus, setEditingComplaintStatus] = useState<'not_discussed' | 'postponed' | 'resolved'>('not_discussed')

    const [activeAudit, setActiveAudit] = useState<any | null>(null)
    const [activeAuditDetails, setActiveAuditDetails] = useState<any | null>(null)
    const [loadingAuditDetails, setLoadingAuditDetails] = useState(false)
    const [auditMyNotes, setAuditMyNotes] = useState('')
    const [auditManagerNotes, setAuditManagerNotes] = useState('')
    const [auditReviewed, setAuditReviewed] = useState(false)

    const [activeAssembly, setActiveAssembly] = useState<any | null>(null)
    const [activeAssemblyDetails, setActiveAssemblyDetails] = useState<any | null>(null)
    const [loadingAssemblyDetails, setLoadingAssemblyDetails] = useState(false)
    const [assemblyMyNotes, setAssemblyMyNotes] = useState('')
    const [assemblyManagerNotes, setAssemblyManagerNotes] = useState('')
    const [assemblyReviewed, setAssemblyReviewed] = useState(false)

    const [newRiskClientId, setNewRiskClientId] = useState('')
    const [newRiskFutureActions, setNewRiskFutureActions] = useState('')
    const [newActionClientId, setNewActionClientId] = useState('')

    // Dialog modal selection states for Audits & Risks
    const [selectedAuditIdx, setSelectedAuditIdx] = useState<number | null>(null)
    const [selectedRiskIdx, setSelectedRiskIdx] = useState<number | null>(null)

    const [modalAuditTitle, setModalAuditTitle] = useState('')
    const [modalAuditType, setModalAuditType] = useState<'task' | 'email'>('task')
    const [modalAuditClientId, setModalAuditClientId] = useState('')
    const [modalAuditFollowUp, setModalAuditFollowUp] = useState(false)
    const [modalAuditDesc, setModalAuditDesc] = useState(false)
    const [modalAuditActions, setModalAuditActions] = useState(false)
    const [modalAuditCatSelected, setModalAuditCatSelected] = useState(false)
    const [modalAuditCreatedDate, setModalAuditCreatedDate] = useState('')
    const [modalAuditComplexity, setModalAuditComplexity] = useState<'low' | 'medium' | 'high'>('medium')
    const [modalAuditNotes, setModalAuditNotes] = useState('')

    const [modalRiskDesc, setModalRiskDesc] = useState('')
    const [modalRiskSeverity, setModalRiskSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
    const [modalRiskClientId, setModalRiskClientId] = useState('')
    const [modalRiskFutureActions, setModalRiskFutureActions] = useState('')
    const [modalRiskStatus, setModalRiskStatus] = useState<'active' | 'resolved'>('active')
    const [modalRiskResolutionNotes, setModalRiskResolutionNotes] = useState('')
    const [modalRiskResolvedDate, setModalRiskResolvedDate] = useState('')

    const openTaskEmailAuditModal = (idx: number) => {
        const audit = taskEmailAudits[idx]
        if (!audit) return
        setSelectedAuditIdx(idx)
        setModalAuditTitle(audit.title || '')
        setModalAuditType(audit.type || 'task')
        setModalAuditClientId(audit.client_id || '')
        setModalAuditFollowUp(!!audit.has_followup_date)
        setModalAuditDesc(!!audit.has_good_description)
        setModalAuditActions(!!audit.has_actions)
        setModalAuditCatSelected(!!audit.has_category_selected)
        setModalAuditCreatedDate(audit.task_created_date || '')
        setModalAuditComplexity(audit.complexity || 'medium')
        setModalAuditNotes(audit.review_notes || '')
    }

    const openRiskModal = (idx: number) => {
        const risk = operationalRisks[idx]
        if (!risk) return
        setSelectedRiskIdx(idx)
        setModalRiskDesc(risk.description || '')
        setModalRiskSeverity(risk.severity || 'medium')
        setModalRiskClientId(risk.client_id || '')
        setModalRiskFutureActions(risk.future_actions || '')
        setModalRiskStatus(risk.status || 'active')
        setModalRiskResolutionNotes(risk.resolution_notes || '')
        setModalRiskResolvedDate(risk.resolved_date || '')
    }

    const handleSaveModalAudit = () => {
        if (selectedAuditIdx === null) return
        const updated = [...taskEmailAudits]
        updated[selectedAuditIdx] = {
            ...updated[selectedAuditIdx],
            title: modalAuditTitle.trim(),
            type: modalAuditType,
            client_id: modalAuditClientId || null,
            has_followup_date: modalAuditFollowUp,
            has_good_description: modalAuditDesc,
            has_actions: modalAuditActions,
            has_category_selected: modalAuditCatSelected,
            task_created_date: modalAuditCreatedDate || null,
            complexity: modalAuditType === 'task' ? modalAuditComplexity : null,
            review_notes: modalAuditNotes.trim()
        }
        setTaskEmailAudits(updated)
        setSelectedAuditIdx(null)
    }

    const handleSaveModalRisk = () => {
        if (selectedRiskIdx === null) return
        const updated = [...operationalRisks]
        updated[selectedRiskIdx] = {
            ...updated[selectedRiskIdx],
            description: modalRiskDesc.trim(),
            severity: modalRiskSeverity,
            client_id: modalRiskClientId || null,
            future_actions: modalRiskFutureActions.trim(),
            status: modalRiskStatus,
            resolution_notes: modalRiskStatus === 'resolved' ? modalRiskResolutionNotes.trim() : '',
            resolved_date: modalRiskStatus === 'resolved' ? (modalRiskResolvedDate || new Date().toISOString().substring(0, 10)) : null
        }
        setOperationalRisks(updated)
        setSelectedRiskIdx(null)
    }

    const handleDeleteModalAudit = () => {
        if (selectedAuditIdx === null) return
        setTaskEmailAudits(taskEmailAudits.filter((_, i) => i !== selectedAuditIdx))
        setSelectedAuditIdx(null)
    }

    const handleDeleteModalRisk = () => {
        if (selectedRiskIdx === null) return
        setOperationalRisks(operationalRisks.filter((_, i) => i !== selectedRiskIdx))
        setSelectedRiskIdx(null)
    }

    const getClientName = (id: string) => {
        const found = clientsList.find(c => c.id === id)
        return found ? (found.company_name || found.full_name) : id
    }

    const openComplaintModal = (c: any) => {
        setActiveEditingComplaint(c)
        setEditingComplaintTitle(c.title || '')
        setEditingComplaintDesc(c.description || '')
        setEditingComplaintSeverity(c.severity || 'medium')

        const state = reviewedComplaintsState[c.id] || { checked: false, my_notes: '', manager_notes: '', resolved_in_meeting: false }
        setEditingComplaintMyNotes(state.my_notes || '')
        setEditingComplaintManagerNotes(state.manager_notes || '')
        
        if (!state.checked) {
            setEditingComplaintStatus('not_discussed')
        } else if (state.resolved_in_meeting) {
            setEditingComplaintStatus('resolved')
        } else {
            setEditingComplaintStatus('postponed')
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
                    severity: editingComplaintSeverity
                }
            }
            return comp
        }))

        setActiveEditingComplaint(null)
    }

    const openAuditModal = async (audit: any) => {
        setActiveAudit(audit)
        setLoadingAuditDetails(true)
        const state = reviewedAuditsState[audit.id] || { checked: false, my_notes: '', manager_notes: '' }
        setAuditMyNotes(state.my_notes || '')
        setAuditManagerNotes(state.manager_notes || '')
        setAuditReviewed(state.checked || false)

        try {
            const data = await getSyndicateAuditDetailsAction(audit.id)
            setActiveAuditDetails(data)
        } catch (err) {
            console.error("Error loading audit details:", err)
        } finally {
            setLoadingAuditDetails(false)
        }
    }

    const handleSaveAuditChanges = () => {
        if (!activeAudit) return
        setReviewedAuditsState(prev => ({
            ...prev,
            [activeAudit.id]: {
                checked: auditReviewed,
                my_notes: auditMyNotes,
                manager_notes: auditManagerNotes
            }
        }))
        setActiveAudit(null)
        setActiveAuditDetails(null)
    }

    const openAssemblyModal = async (assembly: any) => {
        setActiveAssembly(assembly)
        setLoadingAssemblyDetails(true)
        const state = reviewedAssembliesState[assembly.id] || { checked: false, my_notes: '', manager_notes: '' }
        setAssemblyMyNotes(state.my_notes || '')
        setAssemblyManagerNotes(state.manager_notes || '')
        setAssemblyReviewed(state.checked || false)

        try {
            const data = await getAssemblyEvaluationDetailsAction(assembly.id)
            setActiveAssemblyDetails(data)
        } catch (err) {
            console.error("Error loading assembly details:", err)
        } finally {
            setLoadingAssemblyDetails(false)
        }
    }

    const handleSaveAssemblyChanges = () => {
        if (!activeAssembly) return
        setReviewedAssembliesState(prev => ({
            ...prev,
            [activeAssembly.id]: {
                checked: assemblyReviewed,
                my_notes: assemblyMyNotes,
                manager_notes: assemblyManagerNotes
            }
        }))
        setActiveAssembly(null)
        setActiveAssemblyDetails(null)
    }

    const [loadingSnapshot, setLoadingSnapshot] = useState(false)

    // Fetch snapshot metrics — extracted as a callback so it can be triggered manually (refresh)
    const loadManagerData = useCallback(async (id: string) => {
        if (!id) return
        setLoadingSnapshot(true)
        try {
            const snapshot = await getOneOnOneSnapshotAction(id, meetingDate)
            // Set current values
            setCallsTotal(snapshot.calls_total)
            setCallsAnswered(snapshot.calls_answered)
            setLateTasks(snapshot.late_tasks)
            setBillsNoNotes(snapshot.bills_no_notes)
            setEmailsOver48h(snapshot.emails_over_48h || 0)
            
            // Set comparison previous values
            setCallsTotalPrev(snapshot.calls_total_prev)
            setCallsAnsweredPrev(snapshot.calls_answered_prev)
            setLateTasksPrev(snapshot.late_tasks_prev)
            setEmailsReceived(snapshot.emails_received)
            setEmailsReceivedPrev(snapshot.emails_received_prev)
            setBillsNoNotesPrev(snapshot.bills_no_notes_prev)
            setOpenComplaintsPrev(snapshot.open_complaints_count_prev)
 
            setCallsMonthCurrent(snapshot.calls_month_current)
            setCallsMonthPrev(snapshot.calls_month_prev)
            setWorkloadMonthCurrent(snapshot.workload_month_current)
            setWorkloadMonthPrev(snapshot.workload_month_prev)
 
            // Global Stats
            setQuoteApprovalRate(snapshot.quote_approval_rate)
            setDoorsCount(snapshot.doors_count)
            setSyndicatesCount(snapshot.syndicates_count)
 
            setCallsHistory(snapshot.callsHistory || [])
            setWorkloadHistory(snapshot.workloadHistory || [])
            setStatsLogs(snapshot.statsLogs || [])
 
            // Set pending commitments to carry forward
            setPreviousCommitments(snapshot.pendingCommitments || [])
 
            // Review items
            setSyndicateAudits(snapshot.syndicateAudits || [])
            setAssemblyEvaluations(snapshot.assemblyEvaluations || [])
            setManagerComplaints(snapshot.openComplaints || [])
            setOperationalRisks(snapshot.operationalRisks || [])
            setClientsList(snapshot.clientsList || [])
 
            // Reset review states
            setReviewedAuditsState({})
            setReviewedAssembliesState({})
            setReviewedComplaintsState({})
            setTaskEmailAudits([])
            setNewAgreedActions([])
        } catch (err) {
            console.error("Error loading snapshot data:", err)
        } finally {
            setLoadingSnapshot(false)
        }
    }, [meetingDate])
 
    // Fetch snapshot metrics when managerId or meetingDate changes
    useEffect(() => {
        if (!managerId) return
        loadManagerData(managerId)
    }, [managerId, meetingDate, loadManagerData])

    // Dynamic Scoring Engine
    const callsPct = callsTotal > 0 ? (callsAnswered / callsTotal) * 100 : 0
    const prevCallsPct = callsTotalPrev > 0 ? (callsAnsweredPrev / callsTotalPrev) * 100 : 0
    
    const taskHygiene = Math.max(0, 100 - lateTasks * 5)
    const emailHygiene = Math.max(0, 100 - emailsOver48h * 10)
    const billHygiene = Math.max(0, 100 - billsNoNotes * 10)

    const resolvedPrevCommsCount = previousCommitments.filter(c => c.status === 'Resolved').length
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

    // Color helpers for Section 1 metrics
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

    const getComplaintsColor = (count: number) => {
        if (count === 0) return 'text-emerald-400 font-bold'
        if (count === 1) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    const getBillsColor = (count: number) => {
        if (count === 0) return 'text-emerald-400 font-bold'
        if (count <= 2) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    const getApprovalRateColor = (rate: number | null | undefined) => {
        if (rate === null || rate === undefined) return 'text-white'
        if (rate >= 80) return 'text-emerald-400 font-bold'
        if (rate >= 70) return 'text-amber-400 font-bold'
        return 'text-rose-500 font-bold'
    }

    // Section 2: Previous Commitments State Handlers
    const handlePrevCommitmentChange = (idx: number, field: string, value: any) => {
        const copy = [...previousCommitments]
        copy[idx] = { ...copy[idx], [field]: value }
        
        // Also map to completed boolean for consistency
        if (field === 'status') {
            copy[idx].completed = value === 'Resolved'
        }
        
        setPreviousCommitments(copy)
    }

    // Section 3: Complaint History Action
    const handleShowComplaintHistory = async (complaint: any) => {
        if (!complaint?.category_id) return
        setHistoryPopupComplaint(complaint)
        setLoadingHistory(true)
        try {
            const list = await getCategoryComplaintHistoryAction(managerId, complaint.category_id)
            setComplaintHistoryList(list.filter(c => c.id !== complaint.id))
        } catch (err) {
            console.error("Error loading complaint history:", err)
        } finally {
            setLoadingHistory(false)
        }
    }

    // Section 3: Add Task/Email Audit
    const handleAddTaskEmailAudit = () => {
        if (!newAuditTitle.trim()) return
        const newAudit = {
            type: newAuditType,
            title: newAuditTitle.trim(),
            client_id: newAuditClientId || null,
            has_followup_date: newAuditFollowUp,
            has_good_description: newAuditDesc,
            has_actions: newAuditActions,
            has_category_selected: newAuditCatSelected,
            task_created_date: newAuditCreatedDate || null,
            complexity: newAuditType === 'task' ? newAuditComplexity : null,
            review_notes: newAuditNotes.trim()
        }
        setTaskEmailAudits([...taskEmailAudits, newAudit])
        
        // Reset states
        setNewAuditTitle('')
        setNewAuditClientId('')
        setNewAuditFollowUp(false)
        setNewAuditDesc(false)
        setNewAuditActions(false)
        setNewAuditCatSelected(false)
        setNewAuditCreatedDate('')
        setNewAuditNotes('')
        setShowAuditForm(false)
    }

    const handleRemoveTaskEmailAudit = (idx: number) => {
        setTaskEmailAudits(taskEmailAudits.filter((_, i) => i !== idx))
    }

    // Section 4: Operational Risk Handlers
    const handleAddRisk = () => {
        if (!newRiskDesc.trim()) return
        const newRisk = {
            description: newRiskDesc.trim(),
            severity: newRiskSeverity,
            status: 'active',
            resolution_notes: '',
            resolved_date: null,
            client_id: newRiskClientId || null,
            future_actions: newRiskFutureActions.trim() || null
        }
        setOperationalRisks([...operationalRisks, newRisk])
        setNewRiskDesc('')
        setNewRiskClientId('')
        setNewRiskFutureActions('')
        setShowRiskForm(false)
    }

    const handleResolveRisk = (idx: number, notes: string) => {
        const copy = [...operationalRisks]
        copy[idx] = {
            ...copy[idx],
            status: 'resolved',
            resolution_notes: notes,
            resolved_date: new Date().toISOString().substring(0, 10)
        }
        setOperationalRisks(copy)
    }

    // Section 6: Agreed Actions Handlers
    const handleAddAgreedAction = () => {
        if (!newActionText.trim()) return
        const newAction = {
            commitment_text: newActionText.trim(),
            owner: newActionOwner,
            due_date: newActionNextReview ? null : newActionDueDate,
            due_next_review: newActionNextReview,
            status: 'Open',
            notes: '',
            client_id: newActionClientId || null
        }
        setNewAgreedActions([...newAgreedActions, newAction])
        setNewActionText('')
        setNewActionDueDate('')
        setNewActionNextReview(true)
        setNewActionClientId('')
    }

    const handleRemoveAgreedAction = (idx: number) => {
        setNewAgreedActions(newAgreedActions.filter((_, i) => i !== idx))
    }

    // Submit form handler
    const handleSubmit = async (status: 'draft' | 'completed') => {
        if (!managerId) return
        setLoading(true)

        try {
            // Build reviewed lists
            const finalReviewedAudits = Object.entries(reviewedAuditsState)
                .filter(([_, item]) => item.checked)
                .map(([auditId, item]) => ({
                    audit_id: auditId,
                    my_notes: item.my_notes,
                    manager_notes: item.manager_notes,
                    reviewed: true
                }))

            const finalReviewedAssemblies = Object.entries(reviewedAssembliesState)
                .filter(([_, item]) => item.checked)
                .map(([assId, item]) => ({
                    assembly_evaluation_id: assId,
                    my_notes: item.my_notes,
                    manager_notes: item.manager_notes,
                    reviewed: true
                }))

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

            // Merge carried over commitments (previousCommitments) and new agreed actions
            const finalCommitments = [
                ...previousCommitments.map(c => ({
                    id: c.id,
                    commitment_text: c.commitment_text,
                    owner: c.owner,
                    due_date: c.due_date,
                    due_next_review: c.due_next_review,
                    status: c.status,
                    notes: c.notes,
                    completed: c.completed,
                    client_id: c.client_id || null,
                    taken_at: c.taken_at || null
                })),
                ...newAgreedActions.map(c => ({
                    commitment_text: c.commitment_text,
                    owner: c.owner,
                    due_date: c.due_date,
                    due_next_review: c.due_next_review,
                    status: c.status,
                    notes: c.notes,
                    completed: false,
                    client_id: c.client_id || null,
                    taken_at: meetingDate
                }))
            ]

            const createdMeeting = await createOneOnOneAction({
                manager_id: managerId,
                meeting_date: meetingDate,
                status,
                emails_over_48h: Number(emailsOver48h),
                late_tasks: Number(lateTasks),
                calls_total: Number(callsTotal),
                calls_answered: Number(callsAnswered),
                bills_no_notes_over_7d: Number(billsNoNotes),
                op_reports_closed: 0,
                agenda_templates_used: 0,
                assemblies_on_time: 0,
                syndicates_lost: 0,
                package_changes: 0,
                current_issues: '',
                main_objectives: '',
                recent_wins: '',
                difficult_situations: '',
                priority_1: '',
                priority_2: '',
                priority_3: '',
                training_requested: '',
                escalation_needed: '',
                operational_blockers: '',
                conflict_resolution: '',
                // Redesigned fields
                workload_notes: workloadNotes,
                prioritization_notes: prioritizationNotes,
                stress_notes: stressNotes,
                organization_notes: organizationNotes,
                support_needed: supportNeeded,
                training_needed: trainingNeeded,
                meeting_score: computedScore,
                commitments: finalCommitments,
                complaints: finalReviewedComplaints,
                reviewedAudits: finalReviewedAudits,
                reviewedAssemblies: finalReviewedAssemblies,
                taskEmailAudits,
                operationalRisks,
                summary
            })

            if (createdMeeting?.id) {
                router.push(`/team-management/one-on-ones/${createdMeeting.id}`)
            } else {
                router.push('/team-management/one-on-ones')
            }
        } catch (err) {
            alert('Erreur lors de la création de la rencontre: ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    // Merge calls history and workload history by month
    const mergedHistoryMap: Record<string, { year_month: string; total_calls?: number; answered_calls?: number; open_tasks?: number; closed_tasks?: number; communications_received?: number }> = {}
    
    callsHistory.forEach(item => {
        if (!mergedHistoryMap[item.year_month]) {
            mergedHistoryMap[item.year_month] = { year_month: item.year_month }
        }
        mergedHistoryMap[item.year_month].total_calls = item.total_calls
        mergedHistoryMap[item.year_month].answered_calls = item.answered_calls
    })

    workloadHistory.forEach(item => {
        if (!mergedHistoryMap[item.year_month]) {
            mergedHistoryMap[item.year_month] = { year_month: item.year_month }
        }
        mergedHistoryMap[item.year_month].open_tasks = item.open_tasks
        mergedHistoryMap[item.year_month].closed_tasks = item.closed_tasks
        mergedHistoryMap[item.year_month].communications_received = item.communications_received
    })

    const alignedHistory = Object.values(mergedHistoryMap).sort((a, b) => b.year_month.localeCompare(a.year_month))

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto px-4 md:px-8 pb-20">
            {/* Back button */}
            <div className="mb-2">
                <Link
                    href="/team-management/one-on-ones"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1 w-fit transition-colors"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Retour aux 1-à-1
                </Link>
            </div>

            {/* Header / Main Configuration */}
            <div className="flex flex-col md:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800 rounded-2xl shadow-xl justify-between items-start md:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <Handshake className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white uppercase">Nouvel Alignement 1-à-1</h2>
                        <p className="text-[10px] text-zinc-400">Suivi rigoureux de l'imputabilité, des audits opérationnels et des engagements.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button 
                        onClick={() => handleSubmit('draft')}
                        disabled={loading || !managerId}
                        variant="outline" 
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs h-8 px-4 rounded-lg font-bold"
                    >
                        Sauvegarder Brouillon
                    </Button>
                    <Button 
                        onClick={() => handleSubmit('completed')}
                        disabled={loading || !managerId}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-4 rounded-lg font-bold"
                    >
                        Finaliser & Publier
                    </Button>
                </div>
            </div>

            {/* Summary / Overview */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader className="py-3 border-b border-zinc-900 bg-zinc-950/10">
                    <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-purple-400">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        Résumé & Aperçu de la Rencontre
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-xs">
                    <div className="space-y-1">
                        <Label className="text-zinc-500 font-bold text-[9px] uppercase">Notes de synthèse / Vue d'ensemble de la rencontre</Label>
                        <Textarea 
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Saisissez les faits saillants, résumé des discussions ou notes de cadrage pour cette rencontre..."
                            className="bg-[#121318] border-zinc-850 text-xs text-zinc-200 focus-visible:ring-purple-650 min-h-[70px] resize-y"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Core parameters & Score banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Configuration inputs */}
                <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-400" />
                            Configuration Initiale
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Sélectionner un Gestionnaire</Label>
                            <SearchableManagerSelect
                                managers={managers}
                                name="manager_id"
                                placeholder="Rechercher un gestionnaire..."
                                required
                                defaultValue={managerId}
                                onChange={(val) => setManagerId(val)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Date de la Rencontre</Label>
                            <Input 
                                type="date" 
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                className="bg-[#121318] border-zinc-800 h-9 text-[16px] md:text-xs text-white" 
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* dynamic performance scorecard */}
                <Card className="md:col-span-2 bg-[#16171e]/70 border-zinc-800 shadow-md flex flex-col justify-between">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            Imputabilité Opérationnelle & Score Gustav
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-6 items-center flex-1 text-xs">
                        <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl w-32 shrink-0">
                            <span className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider mb-1">Score Gustav</span>
                            <div className="h-16 w-16 rounded-full border-4 border-purple-500 flex items-center justify-center text-xl font-black text-white font-mono bg-purple-950/15">
                                {computedScore}%
                            </div>
                            <div className="relative group mt-2">
                                <span className={`border px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 cursor-help ${rating.color}`}>
                                    {rating.label} - {rating.comment}
                                    <HelpCircle className="h-2.5 w-2.5 opacity-60" />
                                </span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#121318] border border-zinc-800 rounded-xl p-3 text-[10px] text-zinc-300 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                                    <p className="font-bold text-zinc-100 mb-2 border-b border-zinc-800 pb-1 flex items-center gap-1">
                                        <HelpCircle className="h-3 w-3 text-purple-400" />
                                        Calcul du Score Gustav
                                    </p>
                                    <div className="space-y-1.5 mb-2.5">
                                        <div className="flex justify-between"><span>Appels répondus</span><span className="text-purple-400 font-bold">25%</span></div>
                                        <div className="flex justify-between"><span>Hygiène tâches</span><span className="text-purple-400 font-bold">25%</span></div>
                                        <div className="flex justify-between"><span>Hygiène courriels</span><span className="text-blue-400 font-bold">20%</span></div>
                                        <div className="flex justify-between"><span>Approbation soumissions</span><span className="text-amber-400 font-bold">10%</span></div>
                                        <div className="flex justify-between"><span>Hygiène factures</span><span className="text-amber-400 font-bold">10%</span></div>
                                        <div className="flex justify-between"><span>Résolution engagements</span><span className="text-amber-400 font-bold">10%</span></div>
                                    </div>
                                    <div className="pt-2 border-t border-zinc-800 space-y-1">
                                        <div className="flex gap-1.5"><span className="text-emerald-400 font-bold w-5">A+</span><span className="text-zinc-400">≥ 90 · Excellent</span></div>
                                        <div className="flex gap-1.5"><span className="text-emerald-300 font-bold w-5">A</span><span className="text-zinc-400">≥ 80 · Très Bien</span></div>
                                        <div className="flex gap-1.5"><span className="text-purple-400 font-bold w-5">B</span><span className="text-zinc-400">≥ 70 · Bien</span></div>
                                        <div className="flex gap-1.5"><span className="text-amber-400 font-bold w-5">C</span><span className="text-zinc-400">≥ 60 · Satisfaisant</span></div>
                                        <div className="flex gap-1.5"><span className="text-orange-400 font-bold w-5">D</span><span className="text-zinc-400">≥ 50 · À Améliorer</span></div>
                                        <div className="flex gap-1.5"><span className="text-rose-400 font-bold w-5">E</span><span className="text-zinc-400">&lt; 50 · Insuffisant</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="p-2 bg-zinc-900/20 border border-zinc-850 rounded-lg space-y-0.5">
                                <span className="text-zinc-500 text-[8px] uppercase font-bold">Appels Répondus</span>
                                <span className="text-xs font-bold text-zinc-300 block">{callsTotal > 0 ? `${Math.round(callsPct)}%` : 'N/A'}</span>
                            </div>
                            <div className="p-2 bg-zinc-900/20 border border-zinc-850 rounded-lg space-y-0.5">
                                <span className="text-zinc-500 text-[8px] uppercase font-bold">Hygiène Tâches</span>
                                <span className="text-xs font-bold text-zinc-300 block">{taskHygiene}%</span>
                            </div>
                            <div className="p-2 bg-zinc-900/20 border border-zinc-850 rounded-lg space-y-0.5">
                                <span className="text-zinc-500 text-[8px] uppercase font-bold">Hygiène Courriels</span>
                                <span className="text-xs font-bold text-zinc-300 block">{emailHygiene}%</span>
                            </div>
                            <div className="p-2 bg-zinc-900/20 border border-zinc-850 rounded-lg space-y-0.5">
                                <span className="text-zinc-500 text-[8px] uppercase font-bold">Résolution Engagements</span>
                                <span className="text-xs font-bold text-zinc-300 block">{commitmentResolutionPct}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 1: Snapshot / Compare Section */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                            1. Instantané Métriques (Date de Rencontre)
                        </CardTitle>
                        {managerId && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => loadManagerData(managerId)}
                                disabled={loadingSnapshot}
                                className="h-7 px-3 text-[10px] font-semibold bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-1.5 rounded-lg transition-all"
                            >
                                <RefreshCw className={`h-3 w-3 ${loadingSnapshot ? 'animate-spin' : ''}`} />
                                {loadingSnapshot ? 'Actualisation...' : 'Actualiser les données'}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Tâches en Retard</Label>
                            <Input type="number" value={lateTasks} onChange={(e) => setLateTasks(Number(e.target.value))} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Courriels &gt;48h</Label>
                            <Input type="number" value={emailsOver48h} onChange={(e) => setEmailsOver48h(Number(e.target.value))} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Appels Répondus</Label>
                            <Input type="number" value={callsAnswered} readOnly disabled className="bg-zinc-950/60 border-zinc-800 text-xs text-zinc-400 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Total Appels</Label>
                            <Input type="number" value={callsTotal} readOnly disabled className="bg-zinc-950/60 border-zinc-800 text-xs text-zinc-400 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Factures sans note &gt;7j</Label>
                            <Input type="number" value={billsNoNotes} onChange={(e) => setBillsNoNotes(Number(e.target.value))} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                        </div>
                    </div>

                    <div className="overflow-x-auto pt-2 border-t border-zinc-850">
                        <table className="w-full text-left text-xxs text-zinc-300">
                            <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase border-b border-zinc-850">
                                <tr>
                                    <th className="p-2">Indicateur</th>
                                    <th className="p-2 text-center">Période Actuelle</th>
                                    <th className="p-2 text-center">Période Précédente</th>
                                    <th className="p-2 text-center">Évolution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-850">
                                <tr>
                                    <td className="p-2 font-semibold text-zinc-200">Courriels &gt; 48 heures</td>
                                    <td className="p-2 text-center font-bold">
                                        <div className={getEmailsColor(emailsOver48h)}>{emailsOver48h}</div>
                                        <div className="text-[9px] text-zinc-500 font-normal mt-0.5">{formatYearMonthFr(getEvalYearMonth(meetingDate))}</div>
                                    </td>
                                    <td className="p-2 text-center text-zinc-500">
                                        <div>{emailsReceivedPrev || 'N/A'}</div>
                                        <div className="text-[9px] text-zinc-650 font-normal mt-0.5">{formatYearMonthFr(workloadMonthPrev || getPrevEvalYearMonth(meetingDate))}</div>
                                    </td>
                                    <td className="p-2 text-center">
                                        {emailsOver48h < (emailsReceivedPrev || 0) ? (
                                            <span className="text-emerald-400 flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3 shrink-0" /> Amélioration</span>
                                        ) : emailsOver48h > (emailsReceivedPrev || 0) ? (
                                            <span className="text-rose-400 flex items-center justify-center gap-0.5"><TrendingDown className="h-3 w-3 shrink-0" /> Dégradation</span>
                                        ) : <span className="text-zinc-400">-</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-semibold text-zinc-200">Tâches en Retard</td>
                                    <td className="p-2 text-center font-bold">
                                        <div className={getLateTasksColor(lateTasks)}>{lateTasks}</div>
                                        <div className="text-[9px] text-zinc-500 font-normal mt-0.5">{formatYearMonthFr(getEvalYearMonth(meetingDate))}</div>
                                    </td>
                                    <td className="p-2 text-center text-zinc-500">
                                        <div>{lateTasksPrev}</div>
                                        <div className="text-[9px] text-zinc-650 font-normal mt-0.5">{formatYearMonthFr(workloadMonthPrev || getPrevEvalYearMonth(meetingDate))}</div>
                                    </td>
                                    <td className="p-2 text-center">
                                        {lateTasks < lateTasksPrev ? (
                                            <span className="text-emerald-400 flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3 shrink-0" /> Amélioration</span>
                                        ) : lateTasks > lateTasksPrev ? (
                                            <span className="text-rose-400 flex items-center justify-center gap-0.5"><TrendingDown className="h-3 w-3 shrink-0" /> Dégradation</span>
                                        ) : <span className="text-zinc-400">-</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-semibold text-zinc-200">Taux d'Appels Répondus</td>
                                    <td className="p-2 text-center font-bold">
                                        <div className={getCallsColor(callsPct, callsTotal)}>{callsTotal > 0 ? `${Math.round(callsPct)}%` : 'N/A'}</div>
                                        <div className="text-[9px] text-zinc-500 font-normal mt-0.5">{formatYearMonthFr(getEvalYearMonth(meetingDate))}</div>
                                    </td>
                                    <td className="p-2 text-center text-zinc-500">
                                        <div>{callsTotalPrev > 0 ? `${Math.round(prevCallsPct)}%` : 'N/A'}</div>
                                        <div className="text-[9px] text-zinc-650 font-normal mt-0.5">{formatYearMonthFr(callsMonthPrev || getPrevEvalYearMonth(meetingDate))}</div>
                                    </td>
                                    <td className="p-2 text-center">
                                        {callsPct > prevCallsPct ? (
                                            <span className="text-emerald-400 flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3 shrink-0" /> Amélioration</span>
                                        ) : callsPct < prevCallsPct ? (
                                            <span className="text-rose-400 flex items-center justify-center gap-0.5"><TrendingDown className="h-3 w-3 shrink-0" /> Dégradation</span>
                                        ) : <span className="text-zinc-400">-</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-semibold text-zinc-200">Plaintes Client Ouvertes</td>
                                    <td className={`p-2 text-center font-bold ${getComplaintsColor(managerComplaints.length)}`}>{managerComplaints.length}</td>
                                    <td className="p-2 text-center text-zinc-500">{openComplaintsPrev}</td>
                                    <td className="p-2 text-center">
                                        {managerComplaints.length < openComplaintsPrev ? (
                                            <span className="text-emerald-400 flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3 shrink-0" /> Amélioration</span>
                                        ) : managerComplaints.length > openComplaintsPrev ? (
                                            <span className="text-rose-400 flex items-center justify-center gap-0.5"><TrendingDown className="h-3 w-3 shrink-0" /> Dégradation</span>
                                        ) : <span className="text-zinc-400">-</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-semibold text-zinc-200">Factures sans notes &gt; 7 jours</td>
                                    <td className={`p-2 text-center font-bold ${getBillsColor(billsNoNotes)}`}>{billsNoNotes}</td>
                                    <td className="p-2 text-center text-zinc-500">{billsNoNotesPrev}</td>
                                    <td className="p-2 text-center">
                                        {billsNoNotes < billsNoNotesPrev ? (
                                            <span className="text-emerald-400 flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3 shrink-0" /> Amélioration</span>
                                        ) : billsNoNotes > billsNoNotesPrev ? (
                                            <span className="text-rose-400 flex items-center justify-center gap-0.5"><TrendingDown className="h-3 w-3 shrink-0" /> Dégradation</span>
                                        ) : <span className="text-zinc-400">-</span>}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl">
                        <span className="text-purple-400 uppercase font-bold text-[8px] tracking-wider block mb-2">Statistiques Globales</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-zinc-300 text-xxs">
                            <div>
                                <span className="text-zinc-500 block">Taux d'Approbation Laucandrique</span>
                                <strong className={`text-sm font-mono ${getApprovalRateColor(quoteApprovalRate)}`}>{quoteApprovalRate}%</strong>
                            </div>
                            <div>
                                <span className="text-zinc-500 block">Total Syndicats Actifs</span>
                                <strong className="text-sm text-white font-mono">{syndicatesCount} syndicats ({doorsCount} portes)</strong>
                            </div>
                            <div>
                                <span className="text-zinc-500 block">Volume Courriels Entrants</span>
                                <strong className="text-sm text-white font-mono">{emailsReceived} courriels</strong>
                            </div>
                        </div>
                    </div>

                    {/* Sub-section: Historique & Mesures Hebdomadaires */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-zinc-900 pt-4 mt-2">
                        {/* Part A: 3-6 Month historical trends table */}
                        <div className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                            <span className="font-bold text-zinc-200 uppercase text-[9px] tracking-wider block border-b border-zinc-800 pb-1.5 flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                                Historique de Rendement (3 à 6 derniers mois)
                            </span>
                            {alignedHistory.length === 0 ? (
                                <p className="italic text-zinc-500 text-xxs py-4 text-center">Aucun historique disponible.</p>
                            ) : (
                                <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1">
                                    <table className="w-full text-left text-[10px] text-zinc-300">
                                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-850 uppercase">
                                            <tr>
                                                <th className="p-1.5">Mois</th>
                                                <th className="p-1.5 text-center">Appels</th>
                                                <th className="p-1.5 text-center">Tâches (O/F)</th>
                                                <th className="p-1.5 text-center">Courriels</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-850/60 font-mono">
                                            {alignedHistory.map((item, idx) => {
                                                const callsPct = item.total_calls ? Math.round((item.answered_calls || 0) / item.total_calls * 105) : 0
                                                const cappedCallsPct = Math.min(100, callsPct)
                                                return (
                                                    <tr key={idx} className="hover:bg-zinc-900/10">
                                                        <td className="p-1.5 font-bold text-zinc-200">{formatYearMonthFr(item.year_month)}</td>
                                                        <td className="p-1.5 text-center">
                                                            {item.total_calls ? (
                                                                <span>{cappedCallsPct}% ({item.answered_calls}/{item.total_calls})</span>
                                                            ) : (
                                                                <span className="text-zinc-650">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-1.5 text-center">
                                                            {item.open_tasks !== undefined || item.closed_tasks !== undefined ? (
                                                                <span>{item.open_tasks || 0} O / {item.closed_tasks || 0} F</span>
                                                            ) : (
                                                                <span className="text-zinc-650">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-1.5 text-center">
                                                            {item.communications_received !== undefined ? (
                                                                <span>{item.communications_received}</span>
                                                            ) : (
                                                                <span className="text-zinc-650">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Part B: Granular stats logs feed */}
                        <div className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                            <span className="font-bold text-zinc-200 uppercase text-[9px] tracking-wider block border-b border-zinc-800 pb-1.5 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-purple-400" />
                                Mesures & Indicateurs Hebdomadaires Récents (Dashboard)
                            </span>
                            {statsLogs.length === 0 ? (
                                <p className="italic text-zinc-500 text-xxs py-4 text-center">Aucun relevé récent enregistré.</p>
                            ) : (
                                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                    {statsLogs.map((log, idx) => {
                                        const formattedDate = new Date(log.logged_at).toLocaleDateString('fr-CA', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        const metricLabel = 
                                            log.metric_type === 'emails_over_48h' ? 'Courriels > 48h' :
                                            log.metric_type === 'late_tasks' ? 'Tâches en retard' :
                                            log.metric_type === 'bills_no_notes_over_7d' ? 'Factures sans notes > 7j' :
                                            log.metric_type
                                        
                                        const badgeColor = 
                                            log.metric_type === 'emails_over_48h' ? 'bg-blue-950/30 text-blue-400 border-blue-900/40' :
                                            log.metric_type === 'late_tasks' ? 'bg-purple-950/30 text-purple-400 border-purple-900/40' :
                                            'bg-amber-950/30 text-amber-400 border-amber-900/40'

                                        return (
                                            <div key={log.id || idx} className="flex justify-between items-center text-[10px] text-zinc-300 bg-zinc-900/10 p-1.5 rounded border border-zinc-850/60">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className={`text-[8px] font-bold py-0.5 px-1 shrink-0 ${badgeColor}`}>
                                                        {metricLabel}
                                                    </Badge>
                                                    <span className="font-extrabold text-white">{log.value}</span>
                                                </div>
                                                <span className="text-[8px] text-zinc-500 font-mono flex items-center gap-0.5">
                                                    <Clock className="h-2 w-2" /> {formattedDate}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 2: Previous Meeting Follow-Up */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-purple-400" />
                        2. Suivi des Engagements de la Rencontre Précédente (Responsabilisation)
                    </CardTitle>
                    <CardDescription className="text-[10px] text-zinc-400">
                        Passez en revue chaque engagement convenu. S'il n'est pas "Résolu", il sera automatiquement reporté à la prochaine rencontre.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto text-xs">
                    {previousCommitments.length === 0 ? (
                        <p className="text-xxs text-zinc-500 italic text-center py-4">Aucun engagement de la rencontre précédente en suspens.</p>
                    ) : (
                        <table className="w-full text-left text-xs text-zinc-300">
                            <thead className="bg-zinc-950/40 text-zinc-450 font-bold border-b border-zinc-850">
                                <tr>
                                    <th className="p-2 w-1/3">Engagement Convenu</th>
                                    <th className="p-2 text-center w-28">Statut de Suivi</th>
                                    <th className="p-2">Raison d'Échec / Bloqueur</th>
                                    <th className="p-2 w-1/3">Notes / Rétroaction</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-850">
                                {previousCommitments.map((c, idx) => (
                                    <tr key={c.id || idx} className="hover:bg-zinc-900/10">
                                        <td className="p-2 font-semibold text-zinc-200">
                                            {c.commitment_text}
                                            <div className="text-[10px] text-zinc-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 font-bold">
                                                <span>Propriétaire: {c.owner || 'Manager'}</span>
                                                {c.client_id && <span>· Syndicat: {getClientName(c.client_id)}</span>}
                                                {c.taken_at && <span className="text-purple-400">· Discuté le: {c.taken_at}</span>}
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <select
                                                value={c.status || 'Open'}
                                                onChange={(e) => handlePrevCommitmentChange(idx, 'status', e.target.value)}
                                                className="bg-[#121318] border border-zinc-850 rounded p-1 text-zinc-300 outline-none text-xs font-semibold"
                                            >
                                                <option value="Open">En attente (Open)</option>
                                                <option value="Improved">Amélioré (Improved)</option>
                                                <option value="Partial">Résolution Partielle (Partial)</option>
                                                <option value="Not resolved">Non Résolu (Not resolved)</option>
                                                <option value="Resolved">Résolu (Resolved)</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            {c.status !== 'Resolved' && (
                                                <select
                                                    value={c.failure_reason || 'Lack of organization'}
                                                    onChange={(e) => handlePrevCommitmentChange(idx, 'failure_reason', e.target.value)}
                                                    className="w-full bg-[#121318] border border-zinc-850 rounded p-1 text-xs font-semibold text-zinc-400 outline-none"
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
                                        <td className="p-2">
                                            <Textarea
                                                placeholder="Laisser une note explicative..."
                                                value={c.notes || ''}
                                                onChange={(e) => handlePrevCommitmentChange(idx, 'notes', e.target.value)}
                                                className="bg-[#121318] border-zinc-850 text-xs min-h-[50px] resize-y py-1 px-2"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* SECTION 3: Audit Review Section */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <BookOpen className="h-4.5 w-4.5 text-purple-400" />
                        3. Section Revue d'Audits & Imputabilité Tâches/Courriels
                    </CardTitle>
                    <CardDescription className="text-[10px] text-zinc-400">
                        Visualisez et évaluez les audits de syndicats, les évaluations d'assemblées ou les plaintes clients récentes. Faites des audits ponctuels de courriels et tâches ci-dessous.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-xs sm:text-sm">
                    {/* Part A: Syndicate Audits & Assemblies */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Syndicate Audits */}
                        <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3">
                            <span className="font-bold text-zinc-200 uppercase text-[9px] tracking-wider block border-b border-zinc-800 pb-1.5">Audits de Syndicats Récents ({syndicateAudits.length})</span>
                            {syndicateAudits.length === 0 ? (
                                <p className="italic text-zinc-500 py-2">Aucun audit syndicat disponible.</p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {syndicateAudits.map(a => {
                                        const isChecked = !!reviewedAuditsState[a.id]?.checked
                                        return (
                                            <div 
                                                key={a.id} 
                                                onClick={() => openAuditModal(a)}
                                                className={`p-2.5 bg-zinc-955 border border-zinc-850 rounded-lg space-y-2 cursor-pointer hover:border-purple-500/50 transition-all ${isChecked ? 'bg-purple-950/5 border-purple-900/30' : ''}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-zinc-300 block">{a.clients?.company_name || a.clients?.full_name || 'Syndicat'}</span>
                                                        <span className="text-[8px] text-zinc-500">Date: {new Date(a.audit_date).toLocaleDateString('fr-CA')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={a.health_score < 60 ? "bg-rose-950/20 text-rose-400 border-rose-800/40 font-mono text-[8px]" : "bg-purple-950/20 text-purple-400 border-purple-800/40 font-mono text-[8px]"}>
                                                            Santé: {a.health_score}%
                                                        </Badge>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                setReviewedAuditsState(prev => ({
                                                                    ...prev,
                                                                    [a.id]: {
                                                                        checked,
                                                                        my_notes: prev[a.id]?.my_notes || '',
                                                                        manager_notes: prev[a.id]?.manager_notes || ''
                                                                    }
                                                                }))
                                                            }}
                                                            className="rounded border-zinc-800 text-purple-600 h-4 w-4 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                {isChecked && (
                                                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-zinc-850 animate-in fade-in duration-200">
                                                        <div className="space-y-1">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que j'ai dit (Notes Direction)</Label>
                                                            <Input 
                                                                value={reviewedAuditsState[a.id]?.my_notes || ''} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setReviewedAuditsState(prev => ({ ...prev, [a.id]: { ...prev[a.id], my_notes: e.target.value } }))} 
                                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs" 
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que le gestionnaire a dit</Label>
                                                            <Input 
                                                                value={reviewedAuditsState[a.id]?.manager_notes || ''} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setReviewedAuditsState(prev => ({ ...prev, [a.id]: { ...prev[a.id], manager_notes: e.target.value } }))} 
                                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs" 
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Assembly Evaluations */}
                        <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3">
                            <span className="font-bold text-zinc-200 uppercase text-[9px] tracking-wider block border-b border-zinc-800 pb-1.5">Évaluations d'Assemblées Récentes ({assemblyEvaluations.length})</span>
                            {assemblyEvaluations.length === 0 ? (
                                <p className="italic text-zinc-500 py-2">Aucune évaluation d'assemblée disponible.</p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {assemblyEvaluations.map(ae => {
                                        const isChecked = !!reviewedAssembliesState[ae.id]?.checked
                                        return (
                                            <div 
                                                key={ae.id} 
                                                onClick={() => openAssemblyModal(ae)}
                                                className={`p-2.5 bg-zinc-955 border border-zinc-850 rounded-lg space-y-2 cursor-pointer hover:border-purple-500/50 transition-all ${isChecked ? 'bg-purple-950/5 border-purple-900/30' : ''}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-zinc-300 block">{ae.clients?.company_name || ae.clients?.full_name || 'Syndicat'}</span>
                                                        <span className="text-[8px] text-zinc-500">Date AGA: {new Date(ae.assembly_date).toLocaleDateString('fr-CA')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                setReviewedAssembliesState(prev => ({
                                                                    ...prev,
                                                                    [ae.id]: {
                                                                        checked,
                                                                        my_notes: prev[ae.id]?.my_notes || '',
                                                                        manager_notes: prev[ae.id]?.manager_notes || ''
                                                                    }
                                                                }))
                                                            }}
                                                            className="rounded border-zinc-800 text-purple-600 h-4 w-4 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                {isChecked && (
                                                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-zinc-850 animate-in fade-in duration-200">
                                                        <div className="space-y-1">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que j'ai dit (Notes Direction)</Label>
                                                            <Input 
                                                                value={reviewedAssembliesState[ae.id]?.my_notes || ''} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setReviewedAssembliesState(prev => ({ ...prev, [ae.id]: { ...prev[ae.id], my_notes: e.target.value } }))} 
                                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs" 
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que le gestionnaire a dit</Label>
                                                            <Input 
                                                                value={reviewedAssembliesState[ae.id]?.manager_notes || ''} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setReviewedAssembliesState(prev => ({ ...prev, [ae.id]: { ...prev[ae.id], manager_notes: e.target.value } }))} 
                                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs" 
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Part B: New/Open Complaints & Notes Review */}
                    <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3">
                        <span className="font-bold text-zinc-200 uppercase text-xs tracking-wider block border-b border-zinc-800 pb-1.5">Revue des Plaintes & Notes Actives ({managerComplaints.length})</span>
                        {managerComplaints.length === 0 ? (
                            <p className="italic text-zinc-500 py-1 text-center text-xs">Aucune plainte ni note active pour ce gestionnaire.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {managerComplaints.map(c => {
                                    const state = reviewedComplaintsState[c.id] || { checked: false, my_notes: '', manager_notes: '', resolved_in_meeting: false }
                                    const isDiscussed = state.checked
                                    const isResolved = state.resolved_in_meeting
                                    const clientName = c.clients ? (c.clients.company_name || c.clients.full_name) : 'Copropriété'
                                    const catLabel = c.complaint_categories?.name || 'Général'
                                    
                                    const isNote = c.type === 'note'
                                    const typeBadgeColor = isNote 
                                        ? 'bg-purple-950/30 text-purple-400 border-purple-900/40' 
                                        : 'bg-rose-950/30 text-rose-400 border-rose-900/40'
                                    const typeLabel = isNote ? 'Note de Suivi' : 'Plainte Client'

                                    const sevColors = 
                                        c.severity === 'critical' ? 'bg-rose-950/30 text-rose-400 border-rose-900/40' :
                                        c.severity === 'high' ? 'bg-orange-950/30 text-orange-400 border-orange-900/40' :
                                        'bg-zinc-900 text-zinc-400 border-zinc-800'

                                    return (
                                        <div 
                                            key={c.id} 
                                            onClick={() => openComplaintModal(c)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-purple-500/50 hover:shadow-lg flex flex-col justify-between space-y-3 ${
                                                isDiscussed 
                                                    ? isResolved 
                                                        ? 'bg-emerald-950/10 border-emerald-500/30' 
                                                        : 'bg-amber-950/10 border-amber-500/30'
                                                    : 'bg-zinc-950/20 border-zinc-850'
                                            }`}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="font-bold text-zinc-200 text-xs line-clamp-1">{isNote ? 'Note de Suivi' : c.title}</span>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        <Badge variant="outline" className={`text-[8px] font-bold shrink-0 ${typeBadgeColor}`}>{typeLabel}</Badge>
                                                        {!isNote && <Badge variant="outline" className={`text-[8px] font-bold shrink-0 ${sevColors}`}>{c.severity}</Badge>}
                                                    </div>
                                                </div>
                                                <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">{c.description || "Aucune description."}</p>
                                            </div>
                                            <div className="pt-2 border-t border-zinc-800/50 flex justify-between items-center text-[10px] font-medium">
                                                <span className="text-zinc-500 truncate max-w-[120px]">
                                                    {clientName} · <strong className="text-purple-400">{catLabel}</strong>
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {isDiscussed ? (
                                                        isResolved ? (
                                                            <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle2 className="h-3.5 w-3.5" /> Résolu</span>
                                                        ) : (
                                                            <span className="text-amber-400 font-bold flex items-center gap-0.5"><AlertCircle className="h-3.5 w-3.5" /> Reporté</span>
                                                        )
                                                    ) : (
                                                        <span className="text-zinc-500 font-semibold">Non discuté</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Part C: Task & Email Auditing */}
                    <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-4">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                            <span className="font-bold text-zinc-200 uppercase text-[9px] tracking-wider block">Audits Tâches & Courriels du Gestionnaire ({taskEmailAudits.length})</span>
                            <Button 
                                onClick={() => setShowAuditForm(!showAuditForm)}
                                className="h-6 px-3 bg-purple-600 hover:bg-purple-700 text-white text-[8px] font-bold flex items-center gap-1"
                            >
                                <PlusCircle className="h-3 w-3" />
                                {showAuditForm ? 'Annuler' : 'Ajouter un Audit'}
                            </Button>
                        </div>

                        {showAuditForm && (
                            <div className="p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-0.5">
                                            <Label className="text-zinc-500">Type d'Audit</Label>
                                            <select 
                                                value={newAuditType} 
                                                onChange={(e) => setNewAuditType(e.target.value as any)}
                                                className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2 text-white outline-none focus:border-purple-600 h-8 text-xs"
                                            >
                                                <option value="task">Tâche (Task)</option>
                                                <option value="email">Courriel (Email)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label className="text-zinc-500">Copropriété (Syndicat)</Label>
                                            <SearchableClientSelect
                                                clients={clientsList.map(c => ({
                                                    id: c.id,
                                                    name: c.company_name || c.full_name,
                                                    sdc: c.full_name
                                                }))}
                                                name="audit_client_id"
                                                placeholder="Choisir un syndicat..."
                                                defaultValue={newAuditClientId}
                                                onChange={(val) => setNewAuditClientId(val)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <Label className="text-zinc-500">{newAuditType === 'task' ? 'Nom de la Tâche' : 'Sujet du Courriel'}</Label>
                                        <Input 
                                            placeholder={newAuditType === 'task' ? "ex: Réparer porte garage..." : "ex: Demande de soumission toiture..."} 
                                            value={newAuditTitle} 
                                            onChange={(e) => setNewAuditTitle(e.target.value)} 
                                            className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" 
                                            required
                                        />
                                    </div>

                                    {newAuditType === 'task' && (
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="space-y-0.5">
                                                <Label className="text-zinc-500">Date de création</Label>
                                                <Input 
                                                    type="date"
                                                    value={newAuditCreatedDate} 
                                                    onChange={(e) => setNewAuditCreatedDate(e.target.value)} 
                                                    className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" 
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label className="text-zinc-500">Complexité</Label>
                                                <select 
                                                    value={newAuditComplexity} 
                                                    onChange={(e) => setNewAuditComplexity(e.target.value as any)}
                                                    className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2 text-white outline-none focus:border-purple-600 h-8 text-xs"
                                                >
                                                    <option value="low">Faible (Low)</option>
                                                    <option value="medium">Moyenne (Medium)</option>
                                                    <option value="high">Élevée (High)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 flex flex-col justify-between">
                                    {newAuditType === 'task' ? (
                                        <div className="space-y-1.5 pt-1">
                                            <Label className="text-zinc-500 block mb-1">Critères d'évaluation de la Tâche:</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <label className="flex items-center gap-1.5 text-zinc-300 font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={newAuditFollowUp} onChange={(e) => setNewAuditFollowUp(e.target.checked)} className="rounded border-zinc-800 text-purple-600 h-3.5 w-3.5" />
                                                    Date de suivi ?
                                                </label>
                                                <label className="flex items-center gap-1.5 text-zinc-300 font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={newAuditDesc} onChange={(e) => setNewAuditDesc(e.target.checked)} className="rounded border-zinc-800 text-purple-600 h-3.5 w-3.5" />
                                                    Bonne description ?
                                                </label>
                                                <label className="flex items-center gap-1.5 text-zinc-300 font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={newAuditActions} onChange={(e) => setNewAuditActions(e.target.checked)} className="rounded border-zinc-800 text-purple-600 h-3.5 w-3.5" />
                                                    Actions définies ?
                                                </label>
                                                <label className="flex items-center gap-1.5 text-zinc-300 font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={newAuditCatSelected} onChange={(e) => setNewAuditCatSelected(e.target.checked)} className="rounded border-zinc-800 text-purple-600 h-3.5 w-3.5" />
                                                    Catégorie sélectionnée ?
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-zinc-400 italic pt-1">
                                            L'audit de courriel évalue la qualité de la réponse, le professionnalisme de la communication et le respect du délai cible de 48 heures.
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Rétroaction / Remarques d'Audit</Label>
                                        <Textarea 
                                            placeholder="Indiquer les correctifs à apporter..." 
                                            value={newAuditNotes} 
                                            onChange={(e) => setNewAuditNotes(e.target.value)} 
                                            className="bg-[#121318] border-zinc-800 text-xs text-white" 
                                            rows={3}
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleAddTaskEmailAudit}
                                        disabled={!newAuditTitle.trim()}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold h-8 rounded"
                                    >
                                        Valider l'Audit de Tâche/Courriel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {taskEmailAudits.length === 0 ? (
                            <p className="text-zinc-500 italic py-1 text-center">Aucun audit de tâche ou de courriel effectué pour le moment.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                {taskEmailAudits.map((a, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => openTaskEmailAuditModal(idx)}
                                        className="p-3 bg-zinc-950/20 border border-zinc-800 rounded-xl relative space-y-2 cursor-pointer hover:border-purple-500/50 hover:bg-zinc-950/40 transition-all"
                                    >
                                        <Button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveTaskEmailAudit(idx)
                                            }}
                                            variant="ghost" 
                                            className="h-5 w-5 p-0 absolute top-2 right-2 text-zinc-500 hover:text-rose-500 hover:bg-transparent z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>

                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className={a.type === 'task' ? 'bg-cyan-950/20 text-cyan-400 border-cyan-800/40 text-[7px]' : 'bg-amber-950/20 text-amber-400 border-amber-800/40 text-[7px]'}>
                                                {a.type === 'task' ? 'Tâche' : 'Courriel'}
                                            </Badge>
                                            <span className="font-bold text-zinc-200 text-xxs truncate max-w-[80%]">{a.title}</span>
                                        </div>
                                        {a.client_id && <div className="text-[8px] text-zinc-500">Syndicat: <strong className="text-zinc-400">{getClientName(a.client_id)}</strong></div>}

                                        {a.type === 'task' && (
                                            <div className="grid grid-cols-2 gap-1 text-[7px] text-zinc-400 pt-1 border-t border-zinc-900">
                                                <div>Suivi: <strong className={a.has_followup_date ? 'text-emerald-400' : 'text-rose-400'}>{a.has_followup_date ? 'Oui' : 'Non'}</strong></div>
                                                <div>Description: <strong className={a.has_good_description ? 'text-emerald-400' : 'text-rose-400'}>{a.has_good_description ? 'Oui' : 'Non'}</strong></div>
                                                <div>Actions: <strong className={a.has_actions ? 'text-emerald-400' : 'text-rose-400'}>{a.has_actions ? 'Oui' : 'Non'}</strong></div>
                                                <div>Catégorie: <strong className={a.has_category_selected ? 'text-emerald-400' : 'text-rose-400'}>{a.has_category_selected ? 'Oui' : 'Non'}</strong></div>
                                                {a.complexity && <div className="col-span-2">Complexité: <strong className="text-zinc-300 capitalize">{a.complexity}</strong></div>}
                                            </div>
                                        )}

                                        {a.review_notes && (
                                            <div className="bg-zinc-950/40 p-1.5 rounded text-[8px] text-zinc-400 border border-zinc-900 leading-normal whitespace-pre-wrap">
                                                <strong>Notes:</strong> {a.review_notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 4: Active Operational Risks */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <ShieldAlert className="h-4.5 w-4.5 text-purple-400" />
                            4. Suivi des Risques Opérationnels Actifs ({operationalRisks.filter(r => r.status === 'active').length})
                        </CardTitle>
                        <Button 
                            onClick={() => setShowRiskForm(!showRiskForm)}
                            className="h-6 px-3 bg-purple-600 hover:bg-purple-700 text-white text-[8px] font-bold flex items-center gap-1"
                        >
                            <PlusCircle className="h-3 w-3" />
                            {showRiskForm ? 'Annuler' : 'Signaler un Risque'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                    {showRiskForm && (
                        <div className="p-4 bg-zinc-950/50 border border-zinc-850 rounded-xl space-y-4 animate-in slide-in-from-top-1 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-zinc-500">Description du Risque Opérationnel</Label>
                                    <Textarea 
                                        placeholder="ex: Risque de perte du syndicat X dû à un manque de communication..." 
                                        value={newRiskDesc} 
                                        onChange={(e) => setNewRiskDesc(e.target.value)} 
                                        className="bg-[#121318] border-zinc-800 text-xs text-white" 
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-4 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Copropriété (Syndicat)</Label>
                                        <SearchableClientSelect
                                            clients={clientsList.map(c => ({
                                                id: c.id,
                                                name: c.company_name || c.full_name,
                                                sdc: c.full_name
                                            }))}
                                            name="risk_client_id"
                                            placeholder="Aucun syndicat (Général)..."
                                            defaultValue={newRiskClientId}
                                            onChange={(val) => setNewRiskClientId(val)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Gravité du Risque</Label>
                                        <select 
                                            value={newRiskSeverity} 
                                            onChange={(e) => setNewRiskSeverity(e.target.value as any)}
                                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9 text-xs"
                                        >
                                            <option value="low">Faible (Low)</option>
                                            <option value="medium">Moyen (Medium)</option>
                                            <option value="high">Élevé (High)</option>
                                            <option value="critical">Critique (Critical)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-zinc-500">Actions futures à entreprendre</Label>
                                    <Textarea 
                                        placeholder="ex: Contacter le président d'ici la fin de semaine..." 
                                        value={newRiskFutureActions} 
                                        onChange={(e) => setNewRiskFutureActions(e.target.value)} 
                                        className="bg-[#121318] border-zinc-800 text-xs text-white" 
                                        rows={2}
                                    />
                                </div>
                                <Button 
                                    onClick={handleAddRisk}
                                    disabled={!newRiskDesc.trim()}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-9 rounded-lg w-full"
                                >
                                    Valider le Risque Opérationnel
                                </Button>
                            </div>
                        </div>
                    )}

                    {operationalRisks.length === 0 ? (
                        <p className="text-zinc-500 italic text-center py-2">Aucun risque opérationnel actif ou passé enregistré.</p>
                    ) : (
                        <div className="space-y-2">
                            {operationalRisks.map((r, idx) => {
                                const sevBadge = 
                                    r.severity === 'critical' ? 'bg-rose-950/20 text-rose-400 border-rose-800/40 font-bold' :
                                    r.severity === 'high' ? 'bg-orange-950/20 text-orange-400 border-orange-800/40 font-bold' :
                                    r.severity === 'medium' ? 'bg-amber-950/20 text-amber-400 border-amber-800/40 font-bold' :
                                    'bg-zinc-900 text-zinc-400 border-zinc-800'

                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => openRiskModal(idx)}
                                        className="p-3 bg-zinc-900/20 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer hover:border-purple-500/50 hover:bg-zinc-900/40 transition-all"
                                    >
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-start gap-2 flex-wrap">
                                                <Badge variant="outline" className={`text-[8px] px-1.5 shrink-0 ${sevBadge}`}>{r.severity}</Badge>
                                                <span className={`${r.status === 'resolved' ? 'line-through text-zinc-500' : 'text-zinc-200'} text-xs font-semibold whitespace-pre-wrap block`}>{r.description}</span>
                                            </div>
                                            <div className="flex gap-4 text-[9px] text-zinc-500 flex-wrap">
                                                {r.client_id && (
                                                    <span>Syndicat: <strong className="text-zinc-400">{getClientName(r.client_id)}</strong></span>
                                                )}
                                                {r.future_actions && (
                                                    <span className="whitespace-pre-wrap block">Actions futures: <strong className="text-purple-400">{r.future_actions}</strong></span>
                                                )}
                                            </div>
                                            {r.status === 'resolved' && r.resolution_notes && (
                                                <div className="text-[9px] text-zinc-400 bg-zinc-950/40 p-1.5 rounded border border-zinc-900 max-w-2xl whitespace-pre-wrap">
                                                    <strong>Résolution:</strong> {r.resolution_notes} {r.resolved_date && `(${r.resolved_date})`}
                                                </div>
                                            )}
                                        </div>

                                        {r.status === 'active' ? (
                                            <Badge variant="outline" className="bg-purple-950/20 text-purple-400 border-purple-800/40 font-bold text-[8px] self-start sm:self-center shrink-0">Risque Actif</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-800/40 font-bold text-[8px] self-start sm:self-center shrink-0">Risque Résolu</Badge>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SECTION 5: Coaching & Support Section */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <button 
                    type="button"
                    onClick={() => setCoachingOpen(!coachingOpen)}
                    className="w-full flex justify-between items-center p-6 text-left border-none focus:outline-none"
                >
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2 select-none">
                        <Sliders className="h-4.5 w-4.5 text-purple-400" />
                        5. Coaching & Rétroaction Support (Cliquable pour Développer)
                    </CardTitle>
                    {coachingOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </button>
                {coachingOpen && (
                    <CardContent className="pt-2 border-t border-zinc-900/60 animate-in fade-in duration-200 text-xs sm:text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Charge de Travail (Workload)</Label>
                                <Textarea value={workloadNotes} onChange={(e) => setWorkloadNotes(e.target.value)} placeholder="Notes sur la charge de travail ressentie..." rows={2} className="bg-[#121318] border-zinc-800 text-sm text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Priorisation des dossiers (Prioritization)</Label>
                                <Textarea value={prioritizationNotes} onChange={(e) => setPrioritizationNotes(e.target.value)} placeholder="Comment le gestionnaire gère ses priorités..." rows={2} className="bg-[#121318] border-zinc-800 text-sm text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Gestion du Stress (Stress & Mood)</Label>
                                <Textarea value={stressNotes} onChange={(e) => setStressNotes(e.target.value)} placeholder="Observations sur le stress ou le moral..." rows={2} className="bg-[#121318] border-zinc-800 text-sm text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Organisation personnelle</Label>
                                <Textarea value={organizationNotes} onChange={(e) => setOrganizationNotes(e.target.value)} placeholder="Notes sur la structure d'organisation..." rows={2} className="bg-[#121318] border-zinc-800 text-sm text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Support Requis de la Direction</Label>
                                <Textarea value={supportNeeded} onChange={(e) => setSupportNeeded(e.target.value)} placeholder="Besoins de support spécifiques..." rows={2} className="bg-[#121318] border-zinc-800 text-sm text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Besoins en Formation / Mentorat</Label>
                                <Textarea value={trainingNeeded} onChange={(e) => setTrainingNeeded(e.target.value)} placeholder="Formations ou accompagnement à prévoir..." rows={2} className="bg-[#121318] border-zinc-800 text-sm text-white" />
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* SECTION 6: Agreed Actions Section */}
            <Card 
                className="bg-[#16171e]/70 border-zinc-800 shadow-md cursor-pointer hover:border-purple-500/50 transition-all duration-200"
                onClick={() => setSection6DialogOpen(true)}
            >
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4.5 w-4.5 text-purple-400" />
                            6. Plan d'Action & Engagements Réciproques (Moteur d'Alignement)
                        </span>
                        <Badge className="bg-purple-900/30 border border-purple-500/30 text-purple-300 font-bold hover:bg-purple-900/50">
                            {newAgreedActions.length} engagement{newAgreedActions.length > 1 ? 's' : ''}
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-[10px] text-zinc-400">
                        Définissez des actions précises à accomplir. Cliquez pour ajouter ou modifier les engagements.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm">
                    {newAgreedActions.length === 0 ? (
                        <p className="text-zinc-500 italic text-center py-2">Aucun nouvel engagement acté. Cliquez pour en ajouter un.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {newAgreedActions.slice(0, 3).map((a, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs text-zinc-300 bg-zinc-900/10 p-1.5 rounded border border-zinc-850">
                                    <span className="truncate max-w-[70%] font-semibold text-left">{a.commitment_text}</span>
                                    <span className="text-[10px] text-purple-450 text-purple-400 font-semibold">{a.owner} - {a.due_next_review ? 'Prochaine rencontre' : a.due_date}</span>
                                </div>
                            ))}
                            {newAgreedActions.length > 3 && (
                                <p className="text-[9px] text-zinc-400 text-right font-semibold">+ {newAgreedActions.length - 3} autres engagements...</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Complaint History Popup Modal */}
            {historyPopupComplaint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl w-full max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] text-xxs text-zinc-300">
                        <CardHeader className="border-b border-zinc-900/60 pb-3">
                            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                                Historique par catégorie : {historyPopupComplaint.complaint_categories?.name}
                                <Button 
                                    onClick={() => setHistoryPopupComplaint(null)} 
                                    variant="ghost" 
                                    className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-200"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-[10px] text-zinc-400">
                                Historique des plaintes de même catégorie pour le gestionnaire. Utile pour détecter les récurrences.
                            </p>

                            {loadingHistory ? (
                                <p className="text-center italic text-zinc-500">Chargement de l'historique...</p>
                            ) : complaintHistoryList.length === 0 ? (
                                <p className="text-center italic text-zinc-500">Aucun historique de plainte similaire pour ce gestionnaire.</p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {complaintHistoryList.map(h => (
                                        <div key={h.id} className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg space-y-1">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-zinc-200">{h.title}</span>
                                                <Badge variant="outline" className="text-[7px] bg-zinc-950 font-bold">{h.status}</Badge>
                                            </div>
                                            <span className="text-[8px] text-zinc-500 block">Date: {h.received_date} · Copropriété: {h.clients?.company_name || h.clients?.full_name}</span>
                                            {h.description && <p className="text-zinc-400 mt-1 leading-normal">{h.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
                                <div>Syndicat: <strong className="text-zinc-355 text-zinc-300">{activeEditingComplaint.clients?.company_name || activeEditingComplaint.clients?.full_name || 'Copropriété'}</strong></div>
                                <div>Catégorie: <strong className="text-purple-400">{activeEditingComplaint.complaint_categories?.name || 'Général'}</strong></div>
                                {activeEditingComplaint.received_date && <div>Date de réception: <strong className="text-zinc-355 text-zinc-300">{new Date(activeEditingComplaint.received_date).toLocaleDateString('fr-CA')}</strong></div>}
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
                                        onClick={() => setEditingComplaintStatus('postponed')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'postponed'
                                                ? 'bg-amber-950/20 border-amber-600/30 text-amber-400'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        }`}
                                    >
                                        Reporter (Postpone)
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
                                Enregistrer les modifications
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Detail / Review Modal */}
            {activeAudit && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#16171e] border border-zinc-800 rounded-2xl w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[75vw] max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-xs text-zinc-300">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                            <div>
                                <span className="text-purple-400 uppercase font-black text-[9px] tracking-widest block mb-1">Détails de l'Audit de Syndicat</span>
                                <h3 className="text-sm font-bold text-white uppercase">
                                    {activeAudit.clients?.company_name || activeAudit.clients?.full_name || 'Syndicat'}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => { setActiveAudit(null); setActiveAuditDetails(null); }} 
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Audit Details */}
                        {loadingAuditDetails ? (
                            <p className="italic text-zinc-500 py-12 text-center text-xs">Chargement des détails de l'audit...</p>
                        ) : (
                            <div className="space-y-5">
                                {/* Top metadata cards grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Core Metrics */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                                        <span className="text-zinc-500 block uppercase font-bold tracking-wider text-[9px]">Informations Générales</span>
                                        <div className="space-y-1.5 text-xs text-zinc-300">
                                            <div>Date d'Audit: <strong className="text-white">{new Date(activeAudit.audit_date).toLocaleDateString('fr-CA')}</strong></div>
                                            <div>Indice de Santé: <strong className="text-purple-400 font-bold text-sm">{activeAudit.health_score}%</strong></div>
                                            <div>Auditeur: <strong className="text-white">{activeAuditDetails?.audit?.profiles?.full_name || 'Évaluateur'}</strong></div>
                                        </div>
                                    </div>

                                    {/* Governance & Meetings */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                                        <span className="text-zinc-500 block uppercase font-bold tracking-wider text-[9px]">Gouvernance & Réunions</span>
                                        <div className="space-y-1.5 text-xs text-zinc-300">
                                            <div>Exercice financier à jour: {activeAuditDetails?.audit?.current_year_active ? (
                                                <span className="px-2 py-0.5 bg-green-950/40 border border-green-800/60 rounded text-green-400 font-bold text-[10px]">Oui</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-rose-950/40 border border-rose-800/60 rounded text-rose-450 font-bold text-[10px]">Non</span>
                                            )}</div>
                                            <div>Nombre de CA (Requis/Fait): <strong className="text-white">{activeAuditDetails?.audit?.board_meetings_count ?? 0} / {activeAuditDetails?.audit?.board_meetings_fiscal_year ?? 0}</strong></div>
                                        </div>
                                    </div>

                                    {/* Budgets de Cotisations (Fonds) */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                                        <span className="text-zinc-500 block uppercase font-bold tracking-wider text-[9px]">Budgets de Cotisations (Fonds)</span>
                                        <div className="space-y-1 text-xs text-zinc-300">
                                            <div className="flex justify-between">
                                                <span>Fonds d'Exploitation:</span>
                                                <strong className="text-white">${Number(activeAuditDetails?.audit?.cotisation_fonds_exploitation || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Fonds de Prévoyance:</span>
                                                <strong className="text-white">${Number(activeAuditDetails?.audit?.cotisation_fonds_prevoyance || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Fonds d'Assurance:</span>
                                                <strong className="text-white">${Number(activeAuditDetails?.audit?.cotisation_fonds_assurance || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1 font-bold text-purple-400">
                                                <span>Total des Cotisations:</span>
                                                <span>${Number(activeAuditDetails?.audit?.cotisation_fonds_total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Information added in the Syndicate (Client notes) */}
                                {activeAuditDetails?.audit?.clients?.notes && (
                                    <div className="p-4 bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-xl space-y-1.5">
                                        <span className="text-[#818cf8] block uppercase font-bold tracking-wider text-[9px]">Informations / Notes du Syndicat</span>
                                        <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-medium">{activeAuditDetails.audit.clients.notes}</p>
                                    </div>
                                )}

                                {/* Observations Globales from Audit */}
                                {activeAuditDetails?.audit?.notes && (
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-1.5">
                                        <span className="text-zinc-500 block uppercase font-bold tracking-wider text-[9px]">Observations Globales de l'Audit</span>
                                        <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-medium">{activeAuditDetails.audit.notes}</p>
                                    </div>
                                )}

                                {/* Answers Section */}
                                {activeAuditDetails?.answers && activeAuditDetails.answers.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] uppercase font-black text-zinc-500 block border-b border-zinc-850 pb-1">Évaluation Détaillée des Critères</span>
                                        <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                                            {activeAuditDetails.answers.map((ans: any) => {
                                                const label = AUDIT_LABELS[ans.question_key] || ans.question_key
                                                return (
                                                    <div key={ans.id} className="p-3 bg-zinc-950/20 border border-zinc-850 rounded-xl text-xs flex justify-between items-start gap-4 hover:border-zinc-800 transition-colors">
                                                        <div className="flex-1 space-y-1">
                                                            <span className="font-semibold text-zinc-200 block text-xs">{label}</span>
                                                            {ans.note && (
                                                                <p className="text-zinc-400 italic text-[11px] leading-normal font-medium bg-zinc-950/25 p-2 rounded-lg border border-zinc-900/60 mt-1">
                                                                    {ans.note}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="px-2.5 py-1 bg-purple-950/40 border border-purple-900/40 rounded text-purple-400 font-bold shrink-0 text-xs">
                                                            {ans.score}/5
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Review Inputs inside Modal */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                            <h4 className="font-bold text-white text-xs">Alignement & Rétroaction en Rencontre</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes de la Direction (Ce que j'ai dit)</Label>
                                    <Textarea 
                                        value={auditMyNotes}
                                        onChange={(e) => setAuditMyNotes(e.target.value)}
                                        placeholder="Indiquer vos notes ou directives..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes du Gestionnaire (Ce que le gestionnaire a dit)</Label>
                                    <Textarea 
                                        value={auditManagerNotes}
                                        onChange={(e) => setAuditManagerNotes(e.target.value)}
                                        placeholder="Indiquer la rétroaction du gestionnaire..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-zinc-950/40 p-3 border border-zinc-900 rounded-xl">
                                <div className="space-y-0.5">
                                    <Label className="text-zinc-300 font-bold text-xs">Revue complétée</Label>
                                    <span className="text-zinc-550 block text-[10px]">Cochez pour marquer cet audit comme traité dans cette réunion</span>
                                </div>
                                <input 
                                    type="checkbox"
                                    checked={auditReviewed}
                                    onChange={(e) => setAuditReviewed(e.target.checked)}
                                    className="rounded border-zinc-800 text-purple-600 h-5 w-5 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => { setActiveAudit(null); setActiveAuditDetails(null); }}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xs h-9 px-4 font-bold rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="button" 
                                onClick={handleSaveAuditChanges}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4 font-bold rounded-lg shadow-lg"
                            >
                                Enregistrer la revue
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assembly Detail / Review Modal */}
            {activeAssembly && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#16171e] border border-zinc-800 rounded-2xl w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[75vw] max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-xs text-zinc-300">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                            <div>
                                <span className="text-purple-400 uppercase font-black text-[9px] tracking-widest block mb-1">Détails Évaluation d'Assemblée</span>
                                <h3 className="text-sm font-bold text-white uppercase">
                                    {activeAssembly.clients?.company_name || activeAssembly.clients?.full_name || 'Syndicat'}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => { setActiveAssembly(null); setActiveAssemblyDetails(null); }} 
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Assembly Details */}
                        {loadingAssemblyDetails ? (
                            <p className="italic text-zinc-500 py-6 text-center text-xxs">Chargement des détails de l'assemblée...</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl text-xxs grid grid-cols-2 gap-4">
                                    <div>Date AGA: <strong className="text-zinc-300">{new Date(activeAssembly.assembly_date).toLocaleDateString('fr-CA')}</strong></div>
                                    <div className="col-span-2 border-t border-zinc-900 pt-2 mt-2">
                                        <span className="text-zinc-500 block mb-0.5 font-bold uppercase tracking-wider text-[8px]">Observations Globales:</span>
                                        <p className="text-zinc-300 text-[10px] leading-relaxed whitespace-pre-wrap font-medium">{activeAssemblyDetails?.notes || 'Aucune note globale.'}</p>
                                    </div>
                                    {activeAssemblyDetails?.recommendations && (
                                        <div className="col-span-2 border-t border-zinc-900 pt-2 mt-1">
                                            <span className="text-zinc-500 block mb-0.5 font-bold uppercase tracking-wider text-[8px]">Recommandations direction:</span>
                                            <p className="text-zinc-300 text-[10px] leading-relaxed whitespace-pre-wrap font-medium">{activeAssemblyDetails.recommendations}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Checklist Grid */}
                                <div className="space-y-2.5">
                                    <span className="text-[9px] uppercase font-bold text-zinc-500 block border-b border-zinc-900 pb-1">Critères Évalués</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-48 overflow-y-auto pr-1">
                                        {Object.entries(ASSEMBLY_LABELS).map(([key, label]) => {
                                            const val = activeAssemblyDetails?.[key]
                                            const displayVal = typeof val === 'boolean' 
                                                ? (val ? 'Oui' : 'Non') 
                                                : typeof val === 'number'
                                                    ? `${val}/5`
                                                    : val ? String(val) : 'N/A'
                                            return (
                                                <div key={key} className="flex justify-between items-center py-1.5 border-b border-zinc-900/60 last:border-0 text-xxs">
                                                    <span className="text-zinc-400">{label}</span>
                                                    <strong className="text-purple-400 font-bold">{displayVal}</strong>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Review Inputs inside Modal */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                            <h4 className="font-bold text-white text-xs">Alignement & Rétroaction en Rencontre</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes de la Direction (Ce que j'ai dit)</Label>
                                    <Textarea 
                                        value={assemblyMyNotes}
                                        onChange={(e) => setAssemblyMyNotes(e.target.value)}
                                        placeholder="Indiquer vos notes ou directives..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes du Gestionnaire (Ce que le gestionnaire a dit)</Label>
                                    <Textarea 
                                        value={assemblyManagerNotes}
                                        onChange={(e) => setAssemblyManagerNotes(e.target.value)}
                                        placeholder="Indiquer la rétroaction du gestionnaire..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-zinc-950/40 p-3 border border-zinc-900 rounded-xl">
                                <div className="space-y-0.5">
                                    <Label className="text-zinc-300 font-bold text-xs">Revue complétée</Label>
                                    <span className="text-zinc-550 block text-[10px]">Cochez pour marquer cette évaluation d'assemblée comme traitée dans cette réunion</span>
                                </div>
                                <input 
                                    type="checkbox"
                                    checked={assemblyReviewed}
                                    onChange={(e) => setAssemblyReviewed(e.target.checked)}
                                    className="rounded border-zinc-800 text-purple-600 h-5 w-5 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => { setActiveAssembly(null); setActiveAssemblyDetails(null); }}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xs h-9 px-4 font-bold rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="button" 
                                onClick={handleSaveAssemblyChanges}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4 font-bold rounded-lg shadow-lg"
                            >
                                Enregistrer la revue
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Detail / Edit Modal */}
            <Dialog open={selectedAuditIdx !== null} onOpenChange={(open) => { if (!open) setSelectedAuditIdx(null); }}>
                <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[75vw] w-full bg-[#16171e]/95 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-purple-400" />
                            Détails de l'Audit de {modalAuditType === 'task' ? 'Tâche' : 'Courriel'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 my-4 max-h-[70vh] overflow-y-auto pr-2 text-xxs">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Titre / Sujet de l'audit</Label>
                                    <Input 
                                        value={modalAuditTitle} 
                                        onChange={(e) => setModalAuditTitle(e.target.value)} 
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                        placeholder="Ex: Demande de soumission toiture"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Type d'audit</Label>
                                    <select
                                        value={modalAuditType}
                                        onChange={(e) => setModalAuditType(e.target.value as 'task' | 'email')}
                                        className="bg-[#121318] border border-zinc-800 text-zinc-300 text-xs rounded-lg p-2.5 w-full outline-none"
                                    >
                                        <option value="task">Tâche</option>
                                        <option value="email">Courriel</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-zinc-400">Copropriété (Optionnel)</Label>
                                <SearchableClientSelect
                                    clients={clientsList.map(c => ({
                                        id: c.id,
                                        name: c.company_name || c.full_name,
                                        sdc: c.full_name
                                    }))}
                                    name="modal_audit_client_id"
                                    placeholder="Aucune copropriété"
                                    defaultValue={modalAuditClientId}
                                    onChange={(val) => setModalAuditClientId(val)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Date de création de la tâche</Label>
                                    <Input 
                                        type="date"
                                        value={modalAuditCreatedDate}
                                        onChange={(e) => setModalAuditCreatedDate(e.target.value)}
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                    />
                                </div>
                                {modalAuditType === 'task' && (
                                    <div className="space-y-1">
                                        <Label className="text-zinc-400">Complexité</Label>
                                        <select
                                            value={modalAuditComplexity}
                                            onChange={(e) => setModalAuditComplexity(e.target.value as 'low' | 'medium' | 'high')}
                                            className="bg-[#121318] border border-zinc-800 text-zinc-300 text-xs rounded-lg p-2.5 w-full outline-none"
                                        >
                                            <option value="low">Faible</option>
                                            <option value="medium">Moyenne</option>
                                            <option value="high">Élevée</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {modalAuditType === 'task' && (
                                <div className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                                    <span className="font-bold text-[8px] uppercase tracking-wider text-zinc-400">Paramètres de conformité (Checklist)</span>
                                    <div className="grid grid-cols-2 gap-2 text-xxs">
                                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                                            <input 
                                                type="checkbox" 
                                                checked={modalAuditFollowUp} 
                                                onChange={(e) => setModalAuditFollowUp(e.target.checked)}
                                                className="rounded border-zinc-800 bg-[#121318]" 
                                            />
                                            Date de suivi indiquée
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                                            <input 
                                                type="checkbox" 
                                                checked={modalAuditDesc} 
                                                onChange={(e) => setModalAuditDesc(e.target.checked)}
                                                className="rounded border-zinc-800 bg-[#121318]" 
                                            />
                                            Bonne description du problème
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                                            <input 
                                                type="checkbox" 
                                                checked={modalAuditActions} 
                                                onChange={(e) => setModalAuditActions(e.target.checked)}
                                                className="rounded border-zinc-800 bg-[#121318]" 
                                            />
                                            Plan d'actions claires
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                                            <input 
                                                type="checkbox" 
                                                checked={modalAuditCatSelected} 
                                                onChange={(e) => setModalAuditCatSelected(e.target.checked)}
                                                className="rounded border-zinc-800 bg-[#121318]" 
                                            />
                                            Catégorie bien sélectionnée
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label className="text-zinc-400">Notes d'analyse / Rétroaction</Label>
                                <Textarea 
                                    value={modalAuditNotes}
                                    onChange={(e) => setModalAuditNotes(e.target.value)}
                                    placeholder="Notes détaillées sur l'audit du courriel ou de la tâche..."
                                    rows={4}
                                    className="bg-[#121318] border-zinc-800 text-xs text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between gap-3 border-t border-zinc-900/60 pt-4">
                        <Button
                            type="button"
                            onClick={handleDeleteModalAudit}
                            className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/50 text-xxs h-8 px-4 rounded-lg font-bold"
                        >
                            Supprimer
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedAuditIdx(null)}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xxs h-8 px-4 rounded-lg font-semibold"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveModalAudit}
                                disabled={!modalAuditTitle.trim()}
                                className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-800 text-xxs h-8 px-4 rounded-lg font-bold"
                            >
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Operational Risk Detail / Edit Modal */}
            <Dialog open={selectedRiskIdx !== null} onOpenChange={(open) => { if (!open) setSelectedRiskIdx(null); }}>
                <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[75vw] w-full bg-[#16171e]/95 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-purple-400" />
                            Détails du Risque Opérationnel
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 my-4 max-h-[70vh] overflow-y-auto pr-2 text-xxs">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-zinc-400">Description du risque</Label>
                                <Textarea 
                                    value={modalRiskDesc} 
                                    onChange={(e) => setModalRiskDesc(e.target.value)} 
                                    className="bg-[#121318] border-zinc-800 text-xs text-white"
                                    placeholder="Décrivez le risque de façon détaillée..."
                                    rows={4}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Gravité / Sévérité</Label>
                                    <select
                                        value={modalRiskSeverity}
                                        onChange={(e) => setModalRiskSeverity(e.target.value as any)}
                                        className="bg-[#121318] border border-zinc-800 text-zinc-300 text-xs rounded-lg p-2.5 w-full outline-none"
                                    >
                                        <option value="low">Faible</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Élevée</option>
                                        <option value="critical">Critique</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Copropriété (Optionnel)</Label>
                                    <SearchableClientSelect
                                        clients={clientsList.map(c => ({
                                            id: c.id,
                                            name: c.company_name || c.full_name,
                                            sdc: c.full_name
                                        }))}
                                        name="modal_risk_client_id"
                                        placeholder="Aucune copropriété"
                                        defaultValue={modalRiskClientId}
                                        onChange={(val) => setModalRiskClientId(val)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Statut du Risque</Label>
                                    <select
                                        value={modalRiskStatus}
                                        onChange={(e) => {
                                            const newStatus = e.target.value as 'active' | 'resolved'
                                            setModalRiskStatus(newStatus)
                                            if (newStatus === 'resolved' && !modalRiskResolutionNotes.trim()) {
                                                setModalRiskResolutionNotes('Résolu en 1v1')
                                            }
                                        }}
                                        className="bg-[#121318] border border-zinc-800 text-zinc-300 text-xs rounded-lg p-2.5 w-full outline-none"
                                    >
                                        <option value="active">Actif (Active)</option>
                                        <option value="resolved">Résolu (Resolved)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Date de Résolution</Label>
                                    <Input
                                        type="date"
                                        disabled={modalRiskStatus !== 'resolved'}
                                        value={modalRiskStatus === 'resolved' ? (modalRiskResolvedDate || new Date().toISOString().substring(0, 10)) : ''}
                                        onChange={(e) => setModalRiskResolvedDate(e.target.value)}
                                        className="bg-[#121318] border-zinc-800 text-xs text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {modalRiskStatus === 'resolved' && (
                                <div className="space-y-1">
                                    <Label className="text-zinc-400">Notes de Résolution (Paragraphe)</Label>
                                    <Textarea 
                                        value={modalRiskResolutionNotes}
                                        onChange={(e) => setModalRiskResolutionNotes(e.target.value)}
                                        placeholder="Notes de résolution..."
                                        rows={4}
                                        className="bg-[#121318] border-zinc-800 text-xs text-white"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label className="text-zinc-400">Actions Futures (Mitigation)</Label>
                                <Textarea 
                                    value={modalRiskFutureActions}
                                    onChange={(e) => setModalRiskFutureActions(e.target.value)}
                                    placeholder="Décrivez les actions futures recommandées..."
                                    rows={3}
                                    className="bg-[#121318] border-zinc-800 text-xs text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between gap-3 border-t border-zinc-900/60 pt-4">
                        <Button
                            type="button"
                            onClick={handleDeleteModalRisk}
                            className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/50 text-xxs h-8 px-4 rounded-lg font-bold"
                        >
                            Supprimer
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedRiskIdx(null)}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xxs h-8 px-4 rounded-lg font-semibold"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveModalRisk}
                                disabled={!modalRiskDesc.trim()}
                                className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-800 text-xxs h-8 px-4 rounded-lg font-bold"
                            >
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* SECTION 6: Dialog Modal */}
            <Dialog open={section6DialogOpen} onOpenChange={setSection6DialogOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] w-full bg-[#16171e]/95 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 text-white overflow-hidden max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="h-4.5 w-4.5 text-purple-400" />
                            6. Plan d'Action & Engagements Réciproques (Moteur d'Alignement)
                        </DialogTitle>
                        <DialogDescription className="text-[10px] text-zinc-400">
                            Définissez des actions précises à accomplir. Si "Prochaine rencontre" est cochée, l'engagement est reporté automatiquement si non complété.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2 text-xxs">
                        {/* Add action row */}
                        <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-4 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-zinc-500 text-left block">Action à Accomplir</Label>
                                    <Textarea 
                                        placeholder="ex: Finaliser la soumission toiture de la copropriété..." 
                                        value={newActionText} 
                                        onChange={(e) => setNewActionText(e.target.value)} 
                                        className="bg-[#121318] border-zinc-800 text-xs text-white" 
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-left block">Propriétaire</Label>
                                        <select 
                                            value={newActionOwner} 
                                            onChange={(e) => setNewActionOwner(e.target.value)}
                                            className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9 text-xs"
                                        >
                                            <option value="Manager">Gestionnaire (Manager)</option>
                                            <option value="Direction">Direction (Director)</option>
                                            <option value="Gustav">Gustav Admin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500 text-left block">Copropriété (Syndicat associé)</Label>
                                        <SearchableClientSelect
                                            clients={clientsList.map(c => ({
                                                id: c.id,
                                                name: c.company_name || c.full_name,
                                                sdc: c.full_name
                                            }))}
                                            name="action_client_id"
                                            placeholder="Aucun (Général / Interne)"
                                            defaultValue={newActionClientId}
                                            onChange={(val) => setNewActionClientId(val)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="md:col-span-2 flex flex-col justify-end">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <input 
                                            type="checkbox" 
                                            id="next-rev-check"
                                            checked={newActionNextReview} 
                                            onChange={(e) => setNewActionNextReview(e.target.checked)} 
                                            className="rounded border-zinc-800 text-purple-600 h-3.5 w-3.5 cursor-pointer" 
                                        />
                                        <label htmlFor="next-rev-check" className="text-zinc-400 font-semibold cursor-pointer select-none text-[10px]">
                                            Échéance : Prochaine rencontre
                                        </label>
                                    </div>
                                    
                                    {!newActionNextReview && (
                                        <div className="space-y-1 text-left">
                                            <Label className="text-zinc-500">Date d'échéance spécifique</Label>
                                            <Input 
                                                type="date"
                                                value={newActionDueDate} 
                                                onChange={(e) => setNewActionDueDate(e.target.value)} 
                                                className="bg-[#121318] border-zinc-800 h-9 text-xs text-white" 
                                            />
                                        </div>
                                    )}
                                </div>

                                <Button 
                                    onClick={handleAddAgreedAction}
                                    disabled={!newActionText.trim() || (!newActionDueDate && !newActionNextReview)}
                                    className="bg-purple-600 hover:bg-purple-750 text-white text-xs font-bold h-9 rounded-lg w-full"
                                >
                                    Créer l'Action
                                </Button>
                            </div>
                        </div>

                        {/* List of actions */}
                        <div className="space-y-2 text-left">
                            <span className="text-zinc-400 font-bold block mb-1">Actions actées pour cette rencontre :</span>
                            {newAgreedActions.length === 0 ? (
                                <p className="text-zinc-500 italic text-center py-4 bg-zinc-900/10 border border-zinc-850 rounded-xl">Aucun engagement acté.</p>
                            ) : (
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                    {newAgreedActions.map((a, idx) => (
                                        <div key={idx} className="p-3 bg-zinc-900/20 border border-zinc-850 rounded-xl flex justify-between items-center gap-3">
                                            <div className="space-y-1 flex-1 text-left">
                                                <span className="text-zinc-200 text-xs font-semibold block">{a.commitment_text}</span>
                                                <div className="flex gap-3 text-[8px] text-zinc-500 flex-wrap">
                                                    <span>Propriétaire: <strong className="text-zinc-400">{a.owner}</strong></span>
                                                    <span>Échéance: <strong className="text-purple-400">{a.due_next_review ? 'Prochaine rencontre' : a.due_date}</strong></span>
                                                    {a.client_id && (
                                                        <span>Syndicat: <strong className="text-zinc-400">{getClientName(a.client_id)}</strong></span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveAgreedAction(idx); }}
                                                variant="ghost" 
                                                className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-500 hover:bg-transparent shrink-0"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-4 border-t border-zinc-900/60 pt-4">
                        <Button
                            onClick={() => setSection6DialogOpen(false)}
                            className="bg-purple-600 hover:bg-purple-750 text-white text-xs h-8 px-4 rounded-lg font-bold"
                        >
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
