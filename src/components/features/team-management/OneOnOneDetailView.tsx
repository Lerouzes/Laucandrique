'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    updateOneOnOneAction, 
    getOneOnOneSnapshotAction, 
    deleteOneOnOneAction,
    getCategoryComplaintHistoryAction
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
    Lock,
    Unlock,
    X
} from 'lucide-react'
import { SearchableClientSelect } from './SearchableClientSelect'

export function OneOnOneDetailView({ 
    oneOnOne, 
    commitments,
    manager,
    lastMeeting,
    discussedComplaints = [],
    reviewedAudits = [],
    reviewedAssemblies = [],
    taskEmailAudits: initialTaskEmailAudits = [],
    operationalRisks: initialOperationalRisks = []
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
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(oneOnOne.status === 'draft')
    
    // Collapsible coaching section
    const [coachingOpen, setCoachingOpen] = useState(false)

    // Form fields
    const [meetingDate, setMeetingDate] = useState(oneOnOne.meeting_date)
    const [emailsOver48h, setEmailsOver48h] = useState(oneOnOne.emails_over_48h || 0)
    const [lateTasks, setLateTasks] = useState(oneOnOne.late_tasks || 0)
    const [callsTotal, setCallsTotal] = useState(oneOnOne.calls_total || 0)
    const [callsAnswered, setCallsAnswered] = useState(oneOnOne.calls_answered || 0)
    const [billsNoNotes, setBillsNoNotes] = useState(oneOnOne.bills_no_notes_over_7d || 0)

    // Snapshot comparisons (fetched from DB)
    const [callsTotalPrev, setCallsTotalPrev] = useState(0)
    const [callsAnsweredPrev, setCallsAnsweredPrev] = useState(0)
    const [lateTasksPrev, setLateTasksPrev] = useState(0)
    const [emailsReceived, setEmailsReceived] = useState(0)
    const [emailsReceivedPrev, setEmailsReceivedPrev] = useState(0)
    const [billsNoNotesPrev, setBillsNoNotesPrev] = useState(0)
    const [openComplaintsPrev, setOpenComplaintsPrev] = useState(0)

    // Global Stats
    const [quoteApprovalRate, setQuoteApprovalRate] = useState(0)
    const [doorsCount, setDoorsCount] = useState(0)
    const [syndicatesCount, setSyndicatesCount] = useState(0)

    // Section 2: Previous Commitments (Carried Forward)
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
    const [taskEmailAudits, setTaskEmailAudits] = useState<any[]>(initialTaskEmailAudits || [])
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
    const [operationalRisks, setOperationalRisks] = useState<any[]>(initialOperationalRisks || [])
    const [showRiskForm, setShowRiskForm] = useState(false)
    const [newRiskDesc, setNewRiskDesc] = useState('')
    const [newRiskSeverity, setNewRiskSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')

    // Section 5: Coaching States
    const [workloadNotes, setWorkloadNotes] = useState(oneOnOne.workload_notes || '')
    const [prioritizationNotes, setPrioritizationNotes] = useState(oneOnOne.prioritization_notes || '')
    const [stressNotes, setStressNotes] = useState(oneOnOne.stress_notes || '')
    const [organizationNotes, setOrganizationNotes] = useState(oneOnOne.organization_notes || '')
    const [supportNeeded, setSupportNeeded] = useState(oneOnOne.support_needed || '')
    const [trainingNeeded, setTrainingNeeded] = useState(oneOnOne.training_needed || '')

    // Section 6: New Agreed Actions (This Meeting Commitments)
    const [newAgreedActions, setNewAgreedActions] = useState<any[]>([])
    const [newActionText, setNewActionText] = useState('')
    const [newActionOwner, setNewActionOwner] = useState('Manager')
    const [newActionDueDate, setNewActionDueDate] = useState('')
    const [newActionNextReview, setNewActionNextReview] = useState(true)

    // Additional custom states for dropdowns and interactive cards/modal
    const [clientsList, setClientsList] = useState<any[]>([])
    const [activeEditingComplaint, setActiveEditingComplaint] = useState<any | null>(null)
    const [editingComplaintTitle, setEditingComplaintTitle] = useState('')
    const [editingComplaintDesc, setEditingComplaintDesc] = useState('')
    const [editingComplaintSeverity, setEditingComplaintSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
    const [editingComplaintMyNotes, setEditingComplaintMyNotes] = useState('')
    const [editingComplaintManagerNotes, setEditingComplaintManagerNotes] = useState('')
    const [editingComplaintStatus, setEditingComplaintStatus] = useState<'not_discussed' | 'postponed' | 'resolved'>('not_discussed')

    const [newRiskClientId, setNewRiskClientId] = useState('')
    const [newRiskFutureActions, setNewRiskFutureActions] = useState('')
    const [newActionClientId, setNewActionClientId] = useState('')

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
        const isChecked = editingComplaintStatus !== 'not_discussed'
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

    // Load initial states for edit/draft views from DB snapshot
    useEffect(() => {
        if (!oneOnOne?.manager_id) return
        async function fetchSnapshot() {
            try {
                const snapshot = await getOneOnOneSnapshotAction(oneOnOne.manager_id)
                // Set comparison previous values
                setCallsTotalPrev(snapshot.calls_total_prev)
                setCallsAnsweredPrev(snapshot.calls_answered_prev)
                setLateTasksPrev(snapshot.late_tasks_prev)
                setEmailsReceived(snapshot.emails_received)
                setEmailsReceivedPrev(snapshot.emails_received_prev)
                setBillsNoNotesPrev(snapshot.bills_no_notes_prev)
                setOpenComplaintsPrev(snapshot.open_complaints_count_prev)

                // Global stats
                setQuoteApprovalRate(snapshot.quote_approval_rate)
                setDoorsCount(snapshot.doors_count)
                setSyndicatesCount(snapshot.syndicates_count)

                // Merge open items for review
                setSyndicateAudits(snapshot.syndicateAudits || [])
                setAssemblyEvaluations(snapshot.assemblyEvaluations || [])
                setClientsList(snapshot.clientsList || [])

                // Merge open complaints and discussed ones
                const open = snapshot.openComplaints || []
                const activeAndDiscussed = [...open]
                discussedComplaints.forEach(dc => {
                    if (dc.complaints && !activeAndDiscussed.some(oc => oc.id === dc.complaint_id)) {
                        activeAndDiscussed.push({
                            ...dc.complaints,
                            id: dc.complaint_id
                        })
                    }
                })
                setManagerComplaints(activeAndDiscussed)

                // Map reviewed audits already saved for this meeting
                const audLookup: Record<string, any> = {}
                reviewedAudits.forEach(ra => {
                    audLookup[ra.audit_id] = {
                        checked: ra.reviewed,
                        my_notes: ra.my_notes || '',
                        manager_notes: ra.manager_notes || ''
                    }
                })
                setReviewedAuditsState(audLookup)

                // Map reviewed assemblies
                const assLookup: Record<string, any> = {}
                reviewedAssemblies.forEach(ras => {
                    assLookup[ras.assembly_evaluation_id] = {
                        checked: ras.reviewed,
                        my_notes: ras.my_notes || '',
                        manager_notes: ras.manager_notes || ''
                    }
                })
                setReviewedAssembliesState(assLookup)

                // Map reviewed complaints
                const compLookup: Record<string, any> = {}
                discussedComplaints.forEach(dc => {
                    compLookup[dc.complaint_id] = {
                        checked: dc.reviewed,
                        my_notes: dc.my_notes || dc.discussion_notes || '',
                        manager_notes: dc.manager_notes || dc.resolution_plan || '',
                        resolved_in_meeting: dc.resolved_in_meeting || false,
                        title: dc.title || dc.complaints?.title || '',
                        description: dc.description || dc.complaints?.description || '',
                        severity: dc.severity || dc.complaints?.severity || 'medium',
                        category_id: dc.complaints?.category_id
                    }
                })
                setReviewedComplaintsState(compLookup)

                // Map commitments from this meeting
                // Previous meeting commitments carried over
                const prevMeetingComms = commitments.filter(c => c.carried_forward)
                setPreviousCommitments(prevMeetingComms)

                // New commitments created in this meeting
                const newComms = commitments.filter(c => !c.carried_forward)
                setNewAgreedActions(newComms)

            } catch (err) {
                console.error("Error loading snapshot data in details view:", err)
            }
        }
        fetchSnapshot()
    }, [oneOnOne?.id])

    // Dynamic Scoring Engine
    const callsPct = callsTotal > 0 ? (callsAnswered / callsTotal) * 100 : 100
    const prevCallsPct = callsTotalPrev > 0 ? (callsAnsweredPrev / callsTotalPrev) * 100 : 0
    
    const taskHygiene = Math.max(0, 100 - lateTasks * 5)
    const emailHygiene = Math.max(0, 100 - emailsOver48h * 10)
    const billHygiene = Math.max(0, 100 - billsNoNotes * 10)

    const resolvedPrevCommsCount = previousCommitments.filter(c => c.status === 'Resolved' || c.completed).length
    const totalPrevCommsCount = previousCommitments.length
    const commitmentResolutionPct = totalPrevCommsCount > 0 ? (resolvedPrevCommsCount / totalPrevCommsCount) * 100 : 100

    const computedScore = Math.round(
        (callsPct * 0.3) +
        (taskHygiene * 0.3) +
        (emailHygiene * 0.2) +
        (billHygiene * 0.1) +
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

    // Section 2: Previous Commitments State Handlers
    const handlePrevCommitmentChange = (idx: number, field: string, value: any) => {
        if (!isEditing) return
        const copy = [...previousCommitments]
        copy[idx] = { ...copy[idx], [field]: value }
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
            const list = await getCategoryComplaintHistoryAction(manager.id, complaint.category_id)
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
        if (!isEditing) return
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

    // Section 6: New Agreed Actions Handlers
    const handleAddAgreedAction = () => {
        if (!newActionText.trim()) return
        const newAction = {
            commitment_text: newActionText.trim(),
            owner: newActionOwner,
            due_date: newActionNextReview ? null : newActionDueDate,
            due_next_review: newActionNextReview,
            status: 'Open',
            notes: '',
            completed: false,
            client_id: newActionClientId || null
        }
        setNewAgreedActions([...newAgreedActions, newAction])
        setNewActionText('')
        setNewActionDueDate('')
        setNewActionNextReview(true)
        setNewActionClientId('')
    }

    const handleRemoveAgreedAction = (idx: number) => {
        if (!isEditing) return
        setNewAgreedActions(newAgreedActions.filter((_, i) => i !== idx))
    }

    // Revert to draft flow
    const handleRevertToDraft = async () => {
        setLoading(true)
        try {
            await updateOneOnOneAction(oneOnOne.id, {
                meeting_date: meetingDate,
                status: 'draft',
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
                workload_notes: workloadNotes,
                prioritization_notes: prioritizationNotes,
                stress_notes: stressNotes,
                organization_notes: organizationNotes,
                support_needed: supportNeeded,
                training_needed: trainingNeeded,
                meeting_score: computedScore,
                commitments: [
                    ...previousCommitments.map(c => ({
                        id: c.id,
                        commitment_text: c.commitment_text,
                        owner: c.owner,
                        due_date: c.due_date,
                        due_next_review: c.due_next_review,
                        status: c.status,
                        notes: c.notes,
                        completed: c.completed,
                        client_id: c.client_id || null
                    })),
                    ...newAgreedActions.map(c => ({
                        id: c.id,
                        commitment_text: c.commitment_text,
                        owner: c.owner,
                        due_date: c.due_date,
                        due_next_review: c.due_next_review,
                        status: c.status,
                        notes: c.notes,
                        completed: c.completed,
                        client_id: c.client_id || null
                    }))
                ],
                complaints: Object.entries(reviewedComplaintsState)
                    .filter(([_, item]) => item.checked)
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
                            title: (item as any).title || complaintObj?.title,
                            description: (item as any).description || complaintObj?.description,
                            severity: (item as any).severity || complaintObj?.severity
                        }
                    }),
                reviewedAudits: Object.entries(reviewedAuditsState)
                    .filter(([_, item]) => item.checked)
                    .map(([auditId, item]) => ({
                        audit_id: auditId,
                        my_notes: item.my_notes,
                        manager_notes: item.manager_notes,
                        reviewed: true
                    })),
                reviewedAssemblies: Object.entries(reviewedAssembliesState)
                    .filter(([_, item]) => item.checked)
                    .map(([assId, item]) => ({
                        assembly_evaluation_id: assId,
                        my_notes: item.my_notes,
                        manager_notes: item.manager_notes,
                        reviewed: true
                    })),
                taskEmailAudits,
                operationalRisks
            })
            setIsEditing(true)
            router.refresh()
        } catch (err) {
            alert('Erreur lors de la remise en brouillon : ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteMeeting = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette rencontre ? Cette action est irréversible.")) {
            return
        }
        setLoading(true)
        try {
            await deleteOneOnOneAction(oneOnOne.id)
            router.push('/team-management/one-on-ones')
        } catch (err) {
            alert('Erreur lors de la suppression : ' + (err as Error).message)
            setLoading(false)
        }
    }

    // Save and Lock meeting handler
    const handleSave = async (status: 'draft' | 'completed') => {
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
                .filter(([_, item]) => item.checked)
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
                        title: (item as any).title || complaintObj?.title,
                        description: (item as any).description || complaintObj?.description,
                        severity: (item as any).severity || complaintObj?.severity
                    }
                })

            // Merge commitments
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
                    client_id: c.client_id || null
                })),
                ...newAgreedActions.map(c => ({
                    id: c.id,
                    commitment_text: c.commitment_text,
                    owner: c.owner,
                    due_date: c.due_date,
                    due_next_review: c.due_next_review,
                    status: c.status,
                    notes: c.notes,
                    completed: c.completed,
                    client_id: c.client_id || null
                }))
            ]

            await updateOneOnOneAction(oneOnOne.id, {
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
                operationalRisks
            })
            
            if (status === 'completed') {
                setIsEditing(false)
            }
            router.refresh()
        } catch (err) {
            alert('Erreur lors de la modification: ' + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto px-4 md:px-8 pb-20">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 p-6 bg-[#16171e]/70 border border-zinc-800 rounded-2xl shadow-xl justify-between items-start md:items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center">
                        <Handshake className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
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

                <div className="flex flex-wrap gap-2.5">
                    {oneOnOne.status === 'completed' && (
                        <Button 
                            onClick={handleRevertToDraft}
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5"
                        >
                            <Unlock className="h-3.5 w-3.5" />
                            Remettre en Brouillon
                        </Button>
                    )}

                    {oneOnOne.status === 'draft' && !isEditing && (
                        <Button 
                            onClick={() => setIsEditing(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-4 rounded-lg font-bold"
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
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs h-8 px-4 rounded-lg font-bold"
                            >
                                Sauvegarder Brouillon
                            </Button>
                            <Button 
                                onClick={() => handleSave('completed')}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-4 rounded-lg font-bold"
                            >
                                Finaliser & Verrouiller
                            </Button>
                        </>
                    )}

                    <Button 
                        onClick={handleDeleteMeeting}
                        disabled={loading}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                    </Button>
                </div>
            </div>

            {/* dynamic performance scorecard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-400" />
                            Détails de la Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Gestionnaire</Label>
                            <Input value={`${manager.first_name} ${manager.last_name}`} disabled className="bg-[#121318] border-zinc-800 h-9 text-zinc-400 text-xs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-zinc-500">Date de la Rencontre</Label>
                            <Input 
                                type="date" 
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                disabled={!isEditing}
                                className="bg-[#121318] border-zinc-800 h-9 text-xs text-white" 
                            />
                        </div>
                    </CardContent>
                </Card>

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
                            <span className={`mt-2 border px-2 py-0.5 rounded text-[9px] font-black uppercase ${rating.color}`}>
                                {rating.label} - {rating.comment}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="p-2 bg-zinc-900/20 border border-zinc-850 rounded-lg space-y-0.5">
                                <span className="text-zinc-500 text-[8px] uppercase font-bold">Appels Répondus</span>
                                <span className="text-xs font-bold text-zinc-300 block">{callsTotal > 0 ? `${Math.round(callsPct)}%` : '100%'}</span>
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
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                        1. Instantané Métriques (Revue & Comparaison)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isEditing && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pb-2 border-b border-zinc-900/60">
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
                                <Input type="number" value={callsAnswered} onChange={(e) => setCallsAnswered(Number(e.target.value))} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500 text-[10px]">Total Appels</Label>
                                <Input type="number" value={callsTotal} onChange={(e) => setCallsTotal(Number(e.target.value))} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500 text-[10px]">Factures sans note &gt;7j</Label>
                                <Input type="number" value={billsNoNotes} onChange={(e) => setBillsNoNotes(Number(e.target.value))} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto pt-2">
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
                                    <td className="p-2 text-center font-bold text-white">{emailsOver48h}</td>
                                    <td className="p-2 text-center text-zinc-500">{emailsReceivedPrev || 'N/A'}</td>
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
                                    <td className="p-2 text-center font-bold text-white">{lateTasks}</td>
                                    <td className="p-2 text-center text-zinc-500">{lateTasksPrev}</td>
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
                                    <td className="p-2 text-center font-bold text-white">{callsTotal > 0 ? `${Math.round(callsPct)}%` : '100%'}</td>
                                    <td className="p-2 text-center text-zinc-500">{callsTotalPrev > 0 ? `${Math.round(prevCallsPct)}%` : 'N/A'}</td>
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
                                    <td className="p-2 text-center font-bold text-white">{managerComplaints.length}</td>
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
                                    <td className="p-2 text-center font-bold text-white">{billsNoNotes}</td>
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
                                <strong className="text-sm text-white font-mono">{quoteApprovalRate}%</strong>
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
                </CardContent>
            </Card>

            {/* SECTION 2: Previous Meeting Follow-Up */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-purple-400" />
                        2. Suivi des Engagements de la Rencontre Précédente (Responsabilisation)
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto text-xs">
                    {previousCommitments.length === 0 ? (
                        <p className="text-xxs text-zinc-500 italic text-center py-4">Aucun engagement de la rencontre précédente en suspens.</p>
                    ) : (
                        <table className="w-full text-left text-xxs text-zinc-300">
                            <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-850">
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
                                        <td className="p-2 font-medium text-zinc-200">
                                            {c.commitment_text}
                                            <div className="text-[8px] text-zinc-500 mt-0.5 flex gap-2">
                                                <span>Propriétaire: {c.owner || 'Manager'}</span>
                                                {c.client_id && <span>· Syndicat: {getClientName(c.client_id)}</span>}
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <select
                                                value={c.status || 'Open'}
                                                onChange={(e) => handlePrevCommitmentChange(idx, 'status', e.target.value)}
                                                disabled={!isEditing}
                                                className="bg-[#121318] border border-zinc-850 rounded p-1 text-zinc-300 outline-none text-[10px]"
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
                                                    disabled={!isEditing}
                                                    className="w-full bg-[#121318] border border-zinc-850 rounded p-1 text-[10px] text-zinc-400 outline-none"
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
                                            <Input
                                                placeholder="Notes explicatives..."
                                                value={c.notes || ''}
                                                onChange={(e) => handlePrevCommitmentChange(idx, 'notes', e.target.value)}
                                                disabled={!isEditing}
                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs"
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
                </CardHeader>
                <CardContent className="space-y-6 text-xxs">
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
                                            <div key={a.id} className="p-2.5 bg-zinc-950/20 border border-zinc-850 rounded-lg space-y-2">
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
                                                            onChange={(e) => {
                                                                if (!isEditing) return
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
                                                            disabled={!isEditing}
                                                            className="rounded border-zinc-800 text-purple-600 h-4 w-4 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                {(isChecked || reviewedAuditsState[a.id]?.my_notes || reviewedAuditsState[a.id]?.manager_notes) && (
                                                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-zinc-850 animate-in fade-in duration-200">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que j'ai dit (Notes Direction)</Label>
                                                            <Input 
                                                                value={reviewedAuditsState[a.id]?.my_notes || ''} 
                                                                onChange={(e) => setReviewedAuditsState(prev => ({ ...prev, [a.id]: { ...prev[a.id], my_notes: e.target.value } }))} 
                                                                disabled={!isEditing}
                                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs" 
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que le gestionnaire a dit</Label>
                                                            <Input 
                                                                value={reviewedAuditsState[a.id]?.manager_notes || ''} 
                                                                onChange={(e) => setReviewedAuditsState(prev => ({ ...prev, [a.id]: { ...prev[a.id], manager_notes: e.target.value } }))} 
                                                                disabled={!isEditing}
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
                                            <div key={ae.id} className="p-2.5 bg-zinc-950/20 border border-zinc-850 rounded-lg space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-zinc-300 block">{ae.clients?.company_name || ae.clients?.full_name || 'Syndicat'}</span>
                                                        <span className="text-[8px] text-zinc-500">Date AGA: {new Date(ae.assembly_date).toLocaleDateString('fr-CA')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (!isEditing) return
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
                                                            disabled={!isEditing}
                                                            className="rounded border-zinc-800 text-purple-600 h-4 w-4 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                {(isChecked || reviewedAssembliesState[ae.id]?.my_notes || reviewedAssembliesState[ae.id]?.manager_notes) && (
                                                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-zinc-850 animate-in fade-in duration-200">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que j'ai dit (Notes Direction)</Label>
                                                            <Input 
                                                                value={reviewedAssembliesState[ae.id]?.my_notes || ''} 
                                                                onChange={(e) => setReviewedAssembliesState(prev => ({ ...prev, [ae.id]: { ...prev[ae.id], my_notes: e.target.value } }))} 
                                                                disabled={!isEditing}
                                                                className="bg-[#121318] border-zinc-850 h-7 text-xxs" 
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <Label className="text-zinc-500 text-[8px]">Ce que le gestionnaire a dit</Label>
                                                            <Input 
                                                                value={reviewedAssembliesState[ae.id]?.manager_notes || ''} 
                                                                onChange={(e) => setReviewedAssembliesState(prev => ({ ...prev, [ae.id]: { ...prev[ae.id], manager_notes: e.target.value } }))} 
                                                                disabled={!isEditing}
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

                    {/* Part B: Complaints review */}
                    <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3">
                        <span className="font-bold text-zinc-200 uppercase text-[9px] tracking-wider block border-b border-zinc-800 pb-1.5">Revue des Plaintes Actives ({managerComplaints.length})</span>
                        {managerComplaints.length === 0 ? (
                            <p className="italic text-zinc-500 py-1 text-center">Aucune plainte active.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {managerComplaints.map(c => {
                                    const state = reviewedComplaintsState[c.id] || { checked: false, my_notes: '', manager_notes: '', resolved_in_meeting: false }
                                    const isDiscussed = state.checked
                                    const isResolved = state.resolved_in_meeting
                                    const clientName = c.clients ? (c.clients.company_name || c.clients.full_name) : 'Copropriété'
                                    const catLabel = c.complaint_categories?.name || 'Général'
                                    
                                    const sevColors = 
                                        c.severity === 'critical' ? 'bg-rose-955/30 text-rose-400 border-rose-900/40' :
                                        c.severity === 'high' ? 'bg-orange-955/30 text-orange-400 border-orange-900/40' :
                                        'bg-zinc-900 text-zinc-400 border-zinc-800'

                                    return (
                                        <div 
                                            key={c.id} 
                                            onClick={() => openComplaintModal(c)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-purple-500/50 hover:shadow-lg flex flex-col justify-between space-y-3 ${
                                                isDiscussed 
                                                    ? isResolved 
                                                        ? 'bg-emerald-950/10 border-emerald-500/30' 
                                                        : 'bg-amber-955/10 border-amber-500/30'
                                                    : 'bg-zinc-950/20 border-zinc-850'
                                            }`}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="font-bold text-zinc-200 text-xs line-clamp-1">{c.title}</span>
                                                    <Badge variant="outline" className={`text-[8px] font-bold shrink-0 ${sevColors}`}>{c.severity}</Badge>
                                                </div>
                                                <p className="text-zinc-400 text-[10px] line-clamp-2 leading-relaxed">{c.description || "Aucune description."}</p>
                                            </div>
                                            <div className="pt-2 border-t border-zinc-800/50 flex justify-between items-center text-[9px]">
                                                <span className="text-zinc-500 truncate max-w-[120px]">
                                                    {clientName} · <strong className="text-purple-400">{catLabel}</strong>
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {isDiscussed ? (
                                                        isResolved ? (
                                                            <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Résolue</span>
                                                        ) : (
                                                            <span className="text-amber-400 font-bold flex items-center gap-0.5"><AlertCircle className="h-3 w-3" /> Reportée</span>
                                                        )
                                                    ) : (
                                                        <span className="text-zinc-500">Non discutée</span>
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
                            {isEditing && (
                                <Button 
                                    onClick={() => setShowAuditForm(!showAuditForm)}
                                    className="h-6 px-3 bg-purple-600 hover:bg-purple-700 text-white text-[8px] font-bold flex items-center gap-1"
                                >
                                    <PlusCircle className="h-3 w-3" />
                                    {showAuditForm ? 'Annuler' : 'Ajouter un Audit'}
                                </Button>
                            )}
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
                                    <div key={idx} className="p-3 bg-zinc-950/20 border border-zinc-800 rounded-xl relative space-y-2">
                                        {isEditing && (
                                            <Button 
                                                onClick={() => handleRemoveTaskEmailAudit(idx)}
                                                variant="ghost" 
                                                className="h-5 w-5 p-0 absolute top-2 right-2 text-zinc-500 hover:text-rose-500 hover:bg-transparent"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}

                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className={a.type === 'task' ? 'bg-cyan-950/20 text-cyan-400 border-cyan-800/40 text-[7px]' : 'bg-amber-955/20 text-amber-400 border-amber-800/40 text-[7px]'}>
                                                {a.type === 'task' ? 'Tâche' : 'Courriel'}
                                            </Badge>
                                            <span className="font-bold text-zinc-200 text-xxs truncate max-w-[80%]">{a.title}</span>
                                        </div>
                                        {a.client_id && (
                                            <div className="text-[8px] text-zinc-500">
                                                Syndicat: <strong className="text-zinc-400">{a.clients?.company_name || a.clients?.full_name || getClientName(a.client_id)}</strong>
                                            </div>
                                        )}

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
                                            <div className="bg-zinc-950/40 p-1.5 rounded text-[8px] text-zinc-400 border border-zinc-900 leading-normal">
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
                        {isEditing && (
                            <Button 
                                onClick={() => setShowRiskForm(!showRiskForm)}
                                className="h-6 px-3 bg-purple-600 hover:bg-purple-700 text-white text-[8px] font-bold flex items-center gap-1"
                            >
                                <PlusCircle className="h-3 w-3" />
                                {showRiskForm ? 'Annuler' : 'Signaler un Risque'}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xxs">
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
                        <p className="text-zinc-500 italic text-center py-2">Aucun risque enregistré.</p>
                    ) : (
                        <div className="space-y-2">
                            {operationalRisks.map((r, idx) => {
                                const sevBadge = 
                                    r.severity === 'critical' ? 'bg-rose-950/20 text-rose-400 border-rose-800/40 font-bold' :
                                    r.severity === 'high' ? 'bg-orange-950/20 text-orange-400 border-orange-800/40 font-bold' :
                                    r.severity === 'medium' ? 'bg-amber-950/20 text-amber-400 border-amber-800/40 font-bold' :
                                    'bg-zinc-900 text-zinc-400 border-zinc-800'

                                return (
                                    <div key={idx} className="p-3 bg-zinc-900/20 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-[8px] px-1.5 ${sevBadge}`}>{r.severity}</Badge>
                                                <span className={r.status === 'resolved' ? 'line-through text-zinc-500 text-xs font-semibold' : 'text-zinc-200 text-xs font-semibold'}>{r.description}</span>
                                            </div>
                                            {r.status === 'resolved' && r.resolution_notes && (
                                                <div className="text-[9px] text-zinc-400 bg-zinc-950/40 p-1.5 rounded border border-zinc-900 max-w-2xl">
                                                    <strong>Résolution:</strong> {r.resolution_notes} {r.resolved_date && `(${r.resolved_date})`}
                                                </div>
                                            )}
                                        </div>

                                        {r.status === 'active' && isEditing ? (
                                            <div className="flex gap-2 items-center">
                                                <Input 
                                                    id={`risk-res-input-${idx}`}
                                                    placeholder="Notes de résolution..." 
                                                    className="bg-[#121318] border-zinc-800 h-7 text-xxs w-40 text-white" 
                                                />
                                                <Button 
                                                    onClick={() => {
                                                        const el = document.getElementById(`risk-res-input-${idx}`) as HTMLInputElement
                                                        handleResolveRisk(idx, el?.value || 'Résolu en 1v1')
                                                    }}
                                                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                >
                                                    Résoudre
                                                </Button>
                                            </div>
                                        ) : r.status === 'active' ? (
                                            <Badge variant="outline" className="bg-amber-950/20 text-amber-400 border-amber-800/40 font-bold text-[8px] shrink-0">Risque Actif</Badge>
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
                    <CardContent className="pt-2 border-t border-zinc-900/60 animate-in fade-in duration-200 text-xxs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Charge de Travail (Workload)</Label>
                                <Textarea value={workloadNotes} onChange={(e) => setWorkloadNotes(e.target.value)} disabled={!isEditing} placeholder="Notes sur la charge de travail ressentie..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Priorisation des dossiers (Prioritization)</Label>
                                <Textarea value={prioritizationNotes} onChange={(e) => setPrioritizationNotes(e.target.value)} disabled={!isEditing} placeholder="Comment le gestionnaire gère ses priorités..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Gestion du Stress (Stress & Mood)</Label>
                                <Textarea value={stressNotes} onChange={(e) => setStressNotes(e.target.value)} disabled={!isEditing} placeholder="Observations sur le stress ou le moral..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Organisation personnelle</Label>
                                <Textarea value={organizationNotes} onChange={(e) => setOrganizationNotes(e.target.value)} disabled={!isEditing} placeholder="Notes sur la structure d'organisation..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Support Requis de la Direction</Label>
                                <Textarea value={supportNeeded} onChange={(e) => setSupportNeeded(e.target.value)} disabled={!isEditing} placeholder="Besoins de support spécifiques..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500">Besoins en Formation / Mentorat</Label>
                                <Textarea value={trainingNeeded} onChange={(e) => setTrainingNeeded(e.target.value)} disabled={!isEditing} placeholder="Formations ou accompagnement à prévoir..." rows={2} className="bg-[#121318] border-zinc-800 text-xs text-white" />
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* SECTION 6: Agreed Actions Section */}
            <Card className="bg-[#16171e]/70 border-zinc-800 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-purple-400" />
                        6. Plan d'Action & Engagements Réciproques (Moteur d'Alignement)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xxs">
                    {/* Add action row */}
                    {isEditing && (
                        <div className="p-4 bg-zinc-950/50 border border-zinc-850 rounded-xl space-y-4 animate-in slide-in-from-top-1 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-3 space-y-1">
                                    <Label className="text-zinc-500">Nouvel Engagement / Action</Label>
                                    <Textarea 
                                        placeholder="ex: Contacter le syndicat pour la mise à jour du budget..." 
                                        value={newActionText} 
                                        onChange={(e) => setNewActionText(e.target.value)} 
                                        className="bg-[#121318] border-zinc-800 text-xs text-white" 
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Propriétaire</Label>
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
                                        <Label className="text-zinc-500">Copropriété (Syndicat associé)</Label>
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
                                        <label htmlFor="next-rev-check" className="text-zinc-400 font-semibold cursor-pointer select-none">
                                            À revoir à la prochaine rencontre
                                        </label>
                                    </div>
                                    
                                    {!newActionNextReview && (
                                        <Input 
                                            type="date"
                                            value={newActionDueDate} 
                                            onChange={(e) => setNewActionDueDate(e.target.value)} 
                                            className="bg-[#121318] border-zinc-800 h-8 text-xs text-white" 
                                        />
                                    )}
                                </div>
                                
                                {!newActionNextReview && (
                                    <div className="md:col-span-1 flex justify-end">
                                        <Button 
                                            onClick={handleAddAgreedAction}
                                            disabled={!newActionText.trim() || (!newActionDueDate && !newActionNextReview)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-8 rounded-lg w-full"
                                        >
                                            Créer l'Action
                                        </Button>
                                    </div>
                                )}

                                {newActionNextReview && (
                                    <div className="md:col-span-1 flex justify-end">
                                        <Button 
                                            onClick={handleAddAgreedAction}
                                            disabled={!newActionText.trim()}
                                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-8 rounded-lg w-full"
                                        >
                                            Créer l'Action
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions list */}
                    {newAgreedActions.length === 0 ? (
                        <p className="text-zinc-500 italic text-center py-2">Aucun nouvel engagement acté.</p>
                    ) : (
                        <div className="space-y-2">
                            {newAgreedActions.map((a, idx) => (
                                <div key={idx} className="p-3 bg-zinc-900/20 border border-zinc-850 rounded-xl flex justify-between items-center gap-3">
                                    <div className="space-y-0.5">
                                        <span className="text-zinc-200 text-xs font-semibold block">{a.commitment_text}</span>
                                        <div className="flex gap-2 text-[8px] text-zinc-500">
                                            <span>Propriétaire: <strong className="text-zinc-400">{a.owner}</strong></span>
                                            <span>Échéance: <strong className="text-purple-400">{a.due_next_review ? 'Prochaine rencontre' : a.due_date}</strong></span>
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <Button 
                                            onClick={() => handleRemoveAgreedAction(idx)}
                                            variant="ghost" 
                                            className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-500 hover:bg-transparent"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Complaint History Popup Modal */}
            {historyPopupComplaint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-xl w-full text-xxs text-zinc-300">
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
                                Historique des plaintes de même catégorie. Utile pour détecter les récurrences.
                            </p>

                            {loadingHistory ? (
                                <p className="text-center italic text-zinc-500">Chargement de l'historique...</p>
                            ) : complaintHistoryList.length === 0 ? (
                                <p className="text-center italic text-zinc-500">Aucun historique similaire trouvé.</p>
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
                    <div className="bg-[#16171e] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-xs text-zinc-300">
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
                                    <Label className="text-zinc-500">Titre de la plainte</Label>
                                    <Input 
                                        value={editingComplaintTitle}
                                        onChange={(e) => setEditingComplaintTitle(e.target.value)}
                                        disabled={!isEditing}
                                        className="bg-[#121318] border-zinc-850 h-9 text-xs text-white disabled:opacity-75 disabled:text-zinc-400"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Gravité</Label>
                                    <select 
                                        value={editingComplaintSeverity}
                                        onChange={(e) => setEditingComplaintSeverity(e.target.value as any)}
                                        disabled={!isEditing}
                                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-9 text-xs disabled:opacity-75 disabled:text-zinc-400"
                                    >
                                        <option value="low">Faible (Low)</option>
                                        <option value="medium">Moyenne (Medium)</option>
                                        <option value="high">Élevée (High)</option>
                                        <option value="critical">Critique (Critical)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-zinc-500">Description de la plainte</Label>
                                <Textarea 
                                    value={editingComplaintDesc}
                                    onChange={(e) => setEditingComplaintDesc(e.target.value)}
                                    disabled={!isEditing}
                                    className="bg-[#121318] border-zinc-800 text-xs text-white disabled:opacity-75 disabled:text-zinc-400"
                                    rows={4}
                                />
                            </div>

                            <div className="p-3 bg-zinc-955/40 border border-zinc-900 rounded-xl space-y-1.5 text-xxs">
                                <span className="text-zinc-500 block">Détails additionnels:</span>
                                <div>Syndicat: <strong className="text-zinc-300">{activeEditingComplaint.clients?.company_name || activeEditingComplaint.clients?.full_name || 'Copropriété'}</strong></div>
                                <div className="flex justify-between items-center">
                                    <div>Catégorie: <strong className="text-purple-400">{activeEditingComplaint.complaint_categories?.name || 'Général'}</strong></div>
                                    <Button 
                                        type="button"
                                        onClick={() => handleShowComplaintHistory(activeEditingComplaint)}
                                        variant="outline" 
                                        className="h-6 px-2.5 bg-zinc-900 border-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-purple-400 flex items-center gap-1.5"
                                    >
                                        <Search className="h-3 w-3" />
                                        Voir Historique Catégorie
                                    </Button>
                                </div>
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
                                        disabled={!isEditing}
                                        placeholder="Indiquer vos notes ou directives..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white disabled:opacity-75 disabled:text-zinc-400"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Notes du Gestionnaire (Plan d'action)</Label>
                                    <Textarea 
                                        value={editingComplaintManagerNotes}
                                        onChange={(e) => setEditingComplaintManagerNotes(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="Plan de résolution ou retour du gestionnaire..."
                                        className="bg-[#121318] border-zinc-800 text-xs text-white disabled:opacity-75 disabled:text-zinc-400"
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
                                        onClick={() => isEditing && setEditingComplaintStatus('not_discussed')}
                                        disabled={!isEditing}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'not_discussed'
                                                ? 'bg-zinc-900 border-zinc-700 text-white'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        } disabled:opacity-75`}
                                    >
                                        Non discutée
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => isEditing && setEditingComplaintStatus('postponed')}
                                        disabled={!isEditing}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'postponed'
                                                ? 'bg-amber-955/20 border-amber-600/30 text-amber-400'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        } disabled:opacity-75`}
                                    >
                                        Reporter (Postpone)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => isEditing && setEditingComplaintStatus('resolved')}
                                        disabled={!isEditing}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-xxs font-bold transition-all ${
                                            editingComplaintStatus === 'resolved'
                                                ? 'bg-emerald-950/20 border-emerald-600/30 text-emerald-400'
                                                : 'bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                                        } disabled:opacity-75`}
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
                                {isEditing ? 'Annuler' : 'Fermer'}
                            </Button>
                            {isEditing && (
                                <Button 
                                    type="button"
                                    onClick={handleSaveComplaintChanges}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4"
                                >
                                    Enregistrer les modifications
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
