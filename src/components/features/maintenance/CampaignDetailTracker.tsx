// @ts-nocheck
// src/components/features/maintenance/CampaignDetailTracker.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { 
    updateCampaignStatusAction, 
    importResidentsAction,
    getCampaignDetailsAction,
    advanceCampaignPhaseAction,
    deleteCampaignAction,
    updateCampaignSettingsAction,
    updateCampaignNotesAction,
    triggerCampaignRemindersAction,
    sendSingleResidentEmailAction
} from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { 
    Activity, 
    Users, 
    CheckCircle, 
    Clock, 
    UserCheck,
    Hammer,
    Calendar,
    Send,
    Upload,
    Copy,
    Check,
    Search,
    SlidersHorizontal,
    FileSpreadsheet,
    HelpCircle,
    XCircle,
    AlertTriangle,
    Eye,
    ChevronRight,
    Wrench,
    Save,
    FileText,
    Download,
    Mail,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function CampaignDetailTracker({ 
    campaign, 
    services, 
    units: initialUnits,
    isMaster = false
}: { 
    campaign: any
    services: any[]
    units: any[]
    isMaster?: boolean
}) {
    const router = useRouter()
    const [units, setUnits] = useState<any[]>(initialUnits)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [advancingPhase, setAdvancingPhase] = useState(false)
    const [campaignNotes, setCampaignNotes] = useState(campaign.notes || '')
    const [savingNotes, setSavingNotes] = useState(false)

    // Deletion states
    const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false)
    const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false)
    const [deletingCampaign, setDeletingCampaign] = useState(false)

    const handleDelete1 = () => {
        setShowDeleteConfirm1(false)
        setShowDeleteConfirm2(true)
    }

    const handleDelete2 = async () => {
        setShowDeleteConfirm2(false)
        setDeletingCampaign(true)
        try {
            await deleteCampaignAction(campaign.id)
            toast.success("Campagne supprimée avec succès.")
            router.push('/maintenance-hub')
        } catch (err) {
            toast.error("Erreur lors de la suppression: " + (err as Error).message)
        } finally {
            setDeletingCampaign(false)
        }
    }

    // Settings modal state
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [allowReschedule, setAllowReschedule] = useState<boolean>(campaign.allow_reschedule !== false)
    const [rescheduleCutoff, setRescheduleCutoff] = useState<string>(String(campaign.reschedule_cutoff_hours ?? 24))
    const [deadlineDate, setDeadlineDate] = useState<string>(() => {
        if (!campaign.response_deadline_date) return ''
        const d = new Date(campaign.response_deadline_date)
        const tzoffset = d.getTimezoneOffset() * 60000
        return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16)
    })
    const [workStart, setWorkStart] = useState<string>(campaign.availability_settings?.workingHours?.start ?? '08:00')
    const [workEnd, setWorkEnd] = useState<string>(campaign.availability_settings?.workingHours?.end ?? '17:00')
    const [techsCount, setTechsCount] = useState<string>(String(campaign.availability_settings?.techniciansCount ?? 1))
    const [buffer, setBuffer] = useState<string>(String(campaign.availability_settings?.bufferMinutes ?? 10))
    const [breakPeriods, setBreakPeriods] = useState<Array<{ start: string; end: string }>>(
        campaign.availability_settings?.breakPeriods ?? [{ start: '12:00', end: '13:00' }]
    )
    const [newBreakStart, setNewBreakStart] = useState('')
    const [newBreakEnd, setNewBreakEnd] = useState('')
    const [savingSettings, setSavingSettings] = useState(false)

    // Transition modal state
    const [showTransitionModal, setShowTransitionModal] = useState(false)
    const [transStartDate, setTransStartDate] = useState(new Date().toISOString().substring(0, 10))
    const [transEndDate, setTransEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10))
    const [transWorkStart, setTransWorkStart] = useState(campaign.availability_settings?.workingHours?.start ?? '08:00')
    const [transWorkEnd, setTransWorkEnd] = useState(campaign.availability_settings?.workingHours?.end ?? '17:00')
    const [transTechsCount, setTransTechsCount] = useState(String(campaign.availability_settings?.techniciansCount ?? 1))
    const [transBuffer, setTransBuffer] = useState(String(campaign.availability_settings?.bufferMinutes ?? 10))
    const [transBreakPeriods, setTransBreakPeriods] = useState<Array<{ start: string; end: string }>>(
        campaign.availability_settings?.breakPeriods ?? [{ start: '12:00', end: '13:00' }]
    )
    const [transNewBreakStart, setTransNewBreakStart] = useState('')
    const [transNewBreakEnd, setTransNewBreakEnd] = useState('')
    const [transSchedulingDeadline, setTransSchedulingDeadline] = useState(
        campaign.scheduling_deadline ? new Date(campaign.scheduling_deadline).toISOString().substring(0, 10) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    )
    const [savingTransition, setSavingTransition] = useState(false)

    // View mode and appointment detail modal state
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
    const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any | null>(null)
    const [isApptModalOpen, setIsApptModalOpen] = useState(false)

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingSettings(true)
        try {
            await updateCampaignSettingsAction(campaign.id, {
                allow_reschedule: allowReschedule,
                reschedule_cutoff_hours: Number(rescheduleCutoff),
                response_deadline_date: deadlineDate ? new Date(deadlineDate).toISOString() : null,
                availability_settings: {
                    workingHours: { start: workStart, end: workEnd },
                    techniciansCount: Number(techsCount),
                    bufferMinutes: Number(buffer),
                    breakPeriods: breakPeriods
                }
            })
            toast.success("Réglages de la campagne mis à jour avec succès.")
            setShowSettingsModal(false)
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de la mise à jour des réglages: " + (err as Error).message)
        } finally {
            setSavingSettings(false)
        }
    }

    const handleConfirmTransition = async (e: React.FormEvent) => {
        e.preventDefault()
        const start = new Date(transStartDate)
        const end = new Date(transEndDate)
        if (start > end) {
            toast.error("La date de début ne peut pas être postérieure à la date de fin.")
            return
        }

        setSavingTransition(true)
        try {
            await advanceCampaignPhaseAction(campaign.id, {
                start_date: transStartDate,
                end_date: transEndDate,
                scheduling_deadline: transSchedulingDeadline || null,
                availability_settings: {
                    workingHours: { start: transWorkStart, end: transWorkEnd },
                    techniciansCount: Number(transTechsCount),
                    bufferMinutes: Number(transBuffer),
                    breakPeriods: transBreakPeriods
                }
            })
            toast.success("La campagne de maintenance est passée à la phase de planification.")
            setShowTransitionModal(false)
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors du changement de phase: " + (err as Error).message)
        } finally {
            setSavingTransition(false)
        }
    }

    // Excel import modal state
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState('')
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<{
        success: boolean
        importedCount: number
        missingUnits: string[]
        conflicts: string[]
    } | null>(null)

    // Copy indicator state
    const [copiedToken, setCopiedToken] = useState<string | null>(null)
    const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({})
    const [sendingReminders, setSendingReminders] = useState(false)

    // Stats calculations
    const totalUnits = units.length
    const completedCount = units.filter(u => u.participation === 'completed').length
    const interestedCount = units.filter(u => u.participation === 'interested').length
    const declinedCount = units.filter(u => u.participation === 'not_interested').length
    const pendingCount = units.filter(u => u.participation === 'pending').length
    const moreInfoCount = units.filter(u => u.participation === 'more_info').length

    const participationRate = totalUnits > 0 
        ? Math.round(((completedCount + interestedCount + moreInfoCount) / totalUnits) * 100) 
        : 0

    const completionRate = totalUnits > 0 
        ? Math.round((completedCount / totalUnits) * 100) 
        : 0

    const handleStatusChange = async (nextStatus: 'draft' | 'active' | 'completed' | 'cancelled') => {
        setUpdatingStatus(true)
        try {
            await updateCampaignStatusAction(campaign.id, nextStatus)
            toast.success(`Statut de la campagne mis à jour vers: ${nextStatus}`)
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de la modification du statut: " + (err as Error).message)
        } finally {
            setUpdatingStatus(false)
        }
    }

    const handleAdvancePhase = async () => {
        setAdvancingPhase(true)
        try {
            await advanceCampaignPhaseAction(campaign.id)
            toast.success("Campagne de maintenance passée à la phase de planification.")
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors du changement de phase: " + (err as Error).message)
        } finally {
            setAdvancingPhase(false)
        }
    }

    const handleCopyInviteLink = (token: string) => {
        const origin = window.location.origin
        const link = `${origin}/maintenance/invite/${token}`
        navigator.clipboard.writeText(link)
        setCopiedToken(token)
        toast.success("Lien d'invitation copié dans le presse-papiers.")
        setTimeout(() => setCopiedToken(null), 2000)
    }

    const getAutoDetectedTemplateKey = (unit: any, currentPhase: 'survey' | 'scheduling') => {
        if (currentPhase === 'survey') {
            if (unit.participation === 'pending') {
                return 'new_campaign'
            } else {
                return 'participation_reminder'
            }
        } else { // scheduling
            if (!unit.appointment) {
                return 'scheduling_invite'
            } else {
                return 'booking_confirmation'
            }
        }
    }

    const handleSendIndividualEmail = async (unitId: string, templateKey: any) => {
        setSendingEmails(prev => ({ ...prev, [unitId]: true }))
        try {
            await sendSingleResidentEmailAction(unitId, templateKey)
            toast.success(`Courriel de type "${templateKey}" envoyé avec succès.`)
        } catch (err: any) {
            toast.error(`Erreur d'envoi du courriel : ${err.message}`)
        } finally {
            setSendingEmails(prev => ({ ...prev, [unitId]: false }))
        }
    }

    const handleTriggerReminders = async () => {
        setSendingReminders(true)
        try {
            const res = await triggerCampaignRemindersAction(campaign.id)
            toast.success(`Rappels terminés : ${res.sentCount} envoyés, ${res.failedCount} échecs.`)
            router.refresh()
        } catch (err: any) {
            toast.error("Erreur lors du déclenchement des rappels : " + err.message)
        } finally {
            setSendingReminders(false)
        }
    }

    const handleImportResidents = async () => {
        if (!importData.trim()) {
            toast.error("Veuillez coller ou saisir les données des résidents.")
            return
        }

        setImporting(true)
        setImportResult(null)

        try {
            // Parse CSV / tab-separated data
            // Expect columns: Unit | Full Name | Email | Phone
            const lines = importData.split('\n')
            const parsedRows: any[] = []

            lines.forEach((line, index) => {
                if (!line.trim()) return
                
                // Split by tabs or commas
                const columns = line.split(/\t|,/)
                
                // Assume column 0 is unit number, 1 is name, 2 is email, 3 is phone
                const door_number = columns[0]?.trim()
                const full_name = columns[1]?.trim()
                
                if (door_number && full_name) {
                    parsedRows.push({
                        door_number,
                        full_name,
                        email: columns[2]?.trim() || '',
                        phone: columns[3]?.trim() || ''
                    })
                }
            })

            if (parsedRows.length === 0) {
                toast.error("Aucune ligne valide détectée. Assurez-vous d'avoir au moins le numéro d'unité et le nom du résident.")
                setImporting(false)
                return
            }

            const res = await importResidentsAction(campaign.client_id, parsedRows)
            setImportResult(res)
            
            // Reload details to get fresh resident info
            const freshDetails = await getCampaignDetailsAction(campaign.id)
            setUnits(freshDetails.units)
            
            toast.success(`${res.importedCount} résidents importés avec succès!`)
        } catch (err) {
            toast.error("Erreur lors de l'import: " + (err as Error).message)
        } finally {
            setImporting(false)
        }
    }

    const filteredUnits = units.filter(u => {
        const matchesSearch = String(u.door?.door_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (u.resident?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (u.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesStatus = statusFilter === 'All' || u.participation === statusFilter
        return matchesSearch && matchesStatus
    })

    const events = units
        .filter(u => u.appointment)
        .map(u => {
            const dateStr = u.appointment.appointment_date
            const startStr = `${dateStr}T${u.appointment.start_time}`
            const endStr = `${dateStr}T${u.appointment.end_time}`
            return {
                id: u.appointment.id,
                title: `Unité ${u.door?.door_number} - ${u.contact_name || u.resident?.full_name || 'Résident'}`,
                start: startStr,
                end: endStr,
                extendedProps: {
                    unit: u,
                    appointment: u.appointment
                }
            }
        })

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'interested': return 'Intéressé'
            case 'not_interested': return 'Refusé'
            case 'completed_elsewhere': return 'Déjà effectué'
            case 'completed': return 'Complété'
            case 'more_info': return 'Plus d\'infos'
            default: return 'En attente'
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'interested':
                return 'bg-purple-950/40 text-purple-300 border-purple-800/40'
            case 'not_interested':
                return 'bg-rose-950/40 text-rose-400 border-rose-900/40'
            case 'completed_elsewhere':
                return 'bg-blue-950/45 text-blue-300 border-blue-800/40'
            case 'completed':
                return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
            case 'more_info':
                return 'bg-blue-950/40 text-blue-400 border-blue-900/40'
            default:
                return 'bg-zinc-900/40 text-zinc-400 border-zinc-800'
        }
    }

    const handleSaveNotes = async () => {
        setSavingNotes(true)
        try {
            await updateCampaignNotesAction(campaign.id, campaignNotes)
            toast.success("Notes de la campagne enregistrées.")
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement des notes: " + (err as Error).message)
        } finally {
            setSavingNotes(false)
        }
    }

    const handleExportExcel = () => {
        const escapeCSV = (val: any) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = [
            "Unité",
            "Résident (Nom)",
            "Résident (Courriel)",
            "Résident (Téléphone)",
            "Statut de Participation",
            "Contact Nom",
            "Contact Courriel",
            "Contact Téléphone",
            "Date de réalisation",
            "Nom de l'entrepreneur",
            "Consignes résident"
        ]

        const isPhase2 = campaign.current_phase === 'scheduling'
        if (isPhase2) {
            headers.push("Date Rendez-vous", "Heure Début", "Heure Fin", "Statut RDV")
        }

        const rows = units.map(u => {
            const row = [
                u.door?.door_number || '',
                u.resident?.full_name || '',
                u.resident?.email || '',
                u.resident?.phone || '',
                getStatusLabel(u.participation),
                u.contact_name || u.resident?.full_name || '',
                u.contact_email || u.resident?.email || '',
                u.contact_phone || u.resident?.phone || '',
                u.completed_elsewhere_date || '',
                u.completed_elsewhere_contractor || '',
                u.resident_notes || ''
            ]
            if (isPhase2) {
                row.push(
                    u.appointment?.appointment_date || '',
                    u.appointment?.start_time ? u.appointment.start_time.substring(0, 5) : '',
                    u.appointment?.end_time ? u.appointment.end_time.substring(0, 5) : '',
                    u.appointment?.status || ''
                )
            }
            return row
        })

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n')

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `reponses_campagne_${campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Liste exportée avec succès.")
    }

    return (
        <div className="space-y-6 text-xs text-zinc-300">
            
            {/* Header Tracker Overview */}
            <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start md:items-center animate-fade-in">
                <div className="space-y-2 pr-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 ${
                            campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-450 text-emerald-400 border-emerald-800/40' :
                            campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-800/40' :
                            campaign.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                            'bg-zinc-800/50 text-zinc-400 border-zinc-700/60'
                        }`}>
                            {campaign.status === 'active' ? 'Actif' :
                             campaign.status === 'completed' ? 'Complété' :
                             campaign.status === 'cancelled' ? 'Annulé' : 'Brouillon'}
                        </Badge>
                        {campaign.survey_required && (
                            <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 ${
                                campaign.current_phase === 'survey' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/25'
                            }`}>
                                {campaign.current_phase === 'survey' ? 'Phase 1 : Sondage d\'intérêt' : 'Phase 2 : Planification'}
                            </Badge>
                        )}
                        <h2 className="text-base font-extrabold text-white uppercase tracking-wider">{campaign.name}</h2>
                    </div>
                    <p className="text-xs text-zinc-400">
                        Syndicat : <strong className="text-zinc-200">{campaign.clients?.company_name || campaign.clients?.full_name}</strong> · 
                        Contracteur : <strong className="text-purple-400">{campaign.contractors?.full_name || 'Non assigné'}</strong> · 
                        Période : <strong className="text-zinc-200">{new Date(campaign.start_date).toLocaleDateString('fr-CA')} au {new Date(campaign.end_date).toLocaleDateString('fr-CA')}</strong>
                    </p>
                </div>

                {/* Status Changer Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-zinc-800/80 pt-4 md:pt-0 md:pl-6">
                    {campaign.status === 'draft' && (
                        <Button
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('active')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow cursor-pointer transition-colors"
                        >
                            Lancer la Campagne
                        </Button>
                    )}
                    {campaign.status === 'active' && (
                        <>
                            {campaign.survey_required && campaign.current_phase === 'survey' && (
                                <Button
                                    disabled={advancingPhase || updatingStatus}
                                    onClick={() => setShowTransitionModal(true)}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow cursor-pointer transition-colors"
                                >
                                    Passer à la planification
                                </Button>
                            )}
                            <Button
                                disabled={updatingStatus}
                                onClick={() => handleStatusChange('completed')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow cursor-pointer transition-colors"
                            >
                                Marquer comme Complété
                            </Button>
                            <Button
                                disabled={updatingStatus}
                                onClick={() => handleStatusChange('cancelled')}
                                className="bg-zinc-900 border border-zinc-800 text-rose-400 font-bold text-xs h-9 px-4 rounded-xl hover:bg-zinc-850 cursor-pointer transition-colors"
                            >
                                Annuler
                            </Button>
                        </>
                    )}
                    {campaign.status === 'completed' && (
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            Campagne archivée
                        </span>
                    )}
                    {campaign.status !== 'completed' && campaign.status !== 'cancelled' && (
                        <Button
                            type="button"
                            onClick={() => setShowSettingsModal(true)}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs h-9 px-4 rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors flex items-center gap-1"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Réglages
                        </Button>
                    )}
                    {isMaster && (
                        <Button
                            type="button"
                            disabled={updatingStatus || deletingCampaign}
                            onClick={() => setShowDeleteConfirm1(true)}
                            className="bg-rose-950/20 border border-rose-900/50 hover:bg-rose-900/30 text-rose-400 font-bold text-xs h-9 px-4 rounded-xl cursor-pointer transition-colors"
                        >
                            Supprimer la Campagne
                        </Button>
                    )}
                </div>
            </div>

            {/* Campaign Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Participation</span>
                            <span className="text-xl font-extrabold text-white block">{participationRate}%</span>
                            <span className="text-xs text-zinc-400">{completedCount + interestedCount + moreInfoCount} / {totalUnits} unités</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center">
                            <Users className="h-4 w-4 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Complétion</span>
                            <span className="text-xl font-extrabold text-white block">{completionRate}%</span>
                            <span className="text-xs text-zinc-400">{completedCount} / {totalUnits} unités</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Refus (Opt-Out)</span>
                            <span className="text-xl font-extrabold text-rose-455 text-rose-400 block">{declinedCount}</span>
                            <span className="text-xs text-zinc-400">{Math.round((declinedCount / (totalUnits || 1)) * 100)}% de désintérêt</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-rose-950/40 border border-rose-900/40 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-rose-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Sans Réponse</span>
                            <span className="text-xl font-extrabold text-amber-400 block">{pendingCount}</span>
                            <span className="text-xs text-zinc-400">{Math.round((pendingCount / (totalUnits || 1)) * 100)}% en attente</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center">
                            <HelpCircle className="h-4 w-4 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Services & Actions Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Services summary */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Services et interventions inclus</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {services.map(svc => (
                                <div key={svc.id} className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl flex items-center justify-between">
                                    <span className="font-semibold text-zinc-300 text-xs">{svc.name}</span>
                                    <div className="flex gap-1.5 items-center">
                                        <Badge variant="outline" className="text-[10px] border-zinc-800/60 bg-zinc-950/20 text-zinc-400">
                                            {svc.category}
                                        </Badge>
                                        <span className="text-zinc-400 text-xs font-mono flex items-center gap-0.5">
                                            <Clock className="h-3.5 w-3.5" /> {svc.duration}m
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar column: Outils & Notes */}
                <div className="space-y-6">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Outils & Gestion des contacts</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2 space-y-3">
                            <Button
                                onClick={() => setShowImportModal(true)}
                                className="w-full bg-purple-900/40 hover:bg-purple-800/40 text-purple-400 border border-purple-800/40 text-xs font-bold h-10 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Importer la liste des résidents (Excel)
                            </Button>
                            <Button
                                onClick={handleTriggerReminders}
                                disabled={pendingCount === 0 || sendingReminders}
                                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 text-xs font-bold h-10 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                                {sendingReminders ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 text-zinc-500" />
                                        Relancer les résidents ({pendingCount})
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                                <FileText className="h-4 w-4 text-purple-450" />
                                Notes internes / Commentaires
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2 space-y-3">
                            <Textarea
                                value={campaignNotes}
                                onChange={(e) => setCampaignNotes(e.target.value)}
                                placeholder="Ajoutez des notes ou commentaires pour les futures instructions de cette campagne..."
                                rows={4}
                                className="bg-[#121318] border-zinc-850 text-xs text-white py-2 focus-visible:ring-purple-650"
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSaveNotes}
                                    disabled={savingNotes}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
                                >
                                    {savingNotes ? 'Enregistrement...' : <><Save className="h-3.5 w-3.5" /> Enregistrer</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Excel Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900">
                            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <FileSpreadsheet className="h-4 w-4" />
                                Importation Excel / CSV des résidents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Collez des lignes copiées directement depuis Excel ou un fichier CSV. 
                                Format attendu (séparation par tabulation ou virgule) :<br />
                                <strong className="text-zinc-300 font-mono text-xs">Numéro d'unité (ex: 304) | Nom Complet (ex: Alice Roy) | Email (optionnel) | Téléphone (optionnel)</strong>
                            </p>

                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Données à importer (Excel/CSV)</Label>
                                <Textarea
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    placeholder="304&#9;Alice Roy&#9;alice@email.com&#9;514-123-4567&#10;305&#9;Marc Tremblay&#9;marc@email.com"
                                    rows={8}
                                    className="bg-[#121318] border-zinc-850 text-xs text-white py-2 font-mono"
                                />
                            </div>

                            {/* Result log */}
                            {importResult && (
                                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 max-h-[150px] overflow-y-auto text-xs">
                                    <p className="font-bold text-emerald-450 text-emerald-400">
                                        Import réussi : {importResult.importedCount} résidents configurés.
                                    </p>
                                    {importResult.missingUnits.length > 0 && (
                                        <div className="text-rose-400">
                                            <span className="font-bold">Unités manquantes dans Gustav ({importResult.missingUnits.length}) :</span>
                                            <p className="font-mono text-xs mt-0.5">{importResult.missingUnits.join(', ')}</p>
                                        </div>
                                    )}
                                    {importResult.conflicts.length > 0 && (
                                        <div className="text-amber-400">
                                            <span className="font-bold">Conflits rencontrés :</span>
                                            <ul className="list-disc list-inside font-mono text-xs mt-0.5 space-y-0.5">
                                                {importResult.conflicts.map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowImportModal(false)
                                        setImportData('')
                                        setImportResult(null)
                                    }}
                                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xs font-bold h-10 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                >
                                    Fermer
                                </Button>
                                <Button
                                    onClick={handleImportResidents}
                                    disabled={importing}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                                >
                                    {importing ? 'Importation...' : 'Lancer l\'import'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Section 4: Units Enrollment Listing Table */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                            <Users className="h-4 w-4" />
                            Unités & Planification des rendez-vous
                        </CardTitle>
                        
                        {/* View Switcher Toggle */}
                        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`text-[9px] font-bold h-7 px-3 rounded-lg transition-colors cursor-pointer ${
                                    viewMode === 'list'
                                        ? 'bg-purple-650 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Vue Liste
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('calendar')}
                                className={`text-[9px] font-bold h-7 px-3 rounded-lg transition-colors cursor-pointer ${
                                    viewMode === 'calendar'
                                        ? 'bg-purple-650 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Vue Calendrier
                            </button>
                        </div>
                    </div>
                    
                    {/* Filters bar - only show when in list mode */}
                    {viewMode === 'list' && (
                        <div className="flex gap-3 w-full sm:w-auto items-center">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Unité or résident..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-[#121318] border-zinc-850 h-10 text-xs pl-9 text-white focus-visible:ring-purple-650"
                                />
                            </div>
                            <SearchableSelect
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: 'All', label: 'Tous les statuts' },
                                    { value: 'pending', label: 'En attente' },
                                    { value: 'interested', label: 'Intéressé' },
                                    { value: 'not_interested', label: 'Refusé' },
                                    { value: 'completed', label: 'Complété' }
                                ]}
                                placeholder="Statut..."
                                searchPlaceholder="Rechercher..."
                                className="h-10 w-48"
                            />
                            <Button
                                onClick={handleExportExcel}
                                className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm shrink-0"
                            >
                                <Download className="h-4 w-4" />
                                Exporter Excel
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className={viewMode === 'list' ? 'p-0' : 'p-4'}>
                    {viewMode === 'list' ? (
                        filteredUnits.length === 0 ? (
                            <p className="text-xs italic text-zinc-500 text-center py-8">
                                Aucune unité ne correspond aux critères de filtrage.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-zinc-300">
                                    <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="p-3">Unité</th>
                                            <th className="p-3">Résident actuel</th>
                                            <th className="p-3">Contact (Campagne)</th>
                                            <th className="p-3">Participation</th>
                                            <th className="p-3">Rendez-vous</th>
                                            <th className="p-3 text-right">Lien d'invitation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {filteredUnits.map(u => (
                                            <tr key={u.id} className="hover:bg-zinc-900/15">
                                                <td className="p-3">
                                                    <Link 
                                                        href={`/maintenance-hub/units/${u.door_id}`}
                                                        className="font-extrabold text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 text-xs"
                                                    >
                                                        Unit {u.door?.door_number}
                                                        <ChevronRight className="h-3.5 w-3.5 text-zinc-650" />
                                                    </Link>
                                                </td>
                                                <td className="p-3 font-semibold text-zinc-200">
                                                    {u.resident?.full_name || 'Non défini (Import requis)'}
                                                </td>
                                                <td className="p-3">
                                                    <div className="space-y-0.5">
                                                        <span className="font-semibold block text-zinc-300 text-xs">
                                                            {u.contact_name || u.resident?.full_name || '-'}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 block font-mono">
                                                            {[u.contact_email || u.resident?.email, u.contact_phone || u.resident?.phone].filter(Boolean).join(' · ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className={`text-[10px] font-bold px-2.5 py-0.5 ${getStatusBadge(u.participation)}`}>
                                                        {getStatusLabel(u.participation)}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    {u.appointment ? (
                                                        <div className="space-y-0.5 text-zinc-300">
                                                            <span className="font-semibold block flex items-center gap-1 font-mono text-xs">
                                                                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                                                                {new Date(u.appointment.appointment_date).toLocaleDateString('fr-CA')}
                                                            </span>
                                                            <span className="text-xs text-zinc-500 block font-mono">
                                                                Slot : {u.appointment.start_time.substring(0,5)} à {u.appointment.end_time.substring(0,5)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-600 italic">Non planifié</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {u.contact_email || u.resident?.email ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    const templateKey = getAutoDetectedTemplateKey(u, campaign.current_phase)
                                                                    handleSendIndividualEmail(u.id, templateKey)
                                                                }}
                                                                disabled={sendingEmails[u.id]}
                                                                className="h-8 w-8 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
                                                                title={`Envoyer le courriel approprié (${getAutoDetectedTemplateKey(u, campaign.current_phase)})`}
                                                            >
                                                                {sendingEmails[u.id] ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                                                ) : (
                                                                    <Mail className="h-4 w-4 text-purple-400/80 hover:text-purple-400" />
                                                                )}
                                                            </Button>
                                                        ) : (
                                                            <span className="h-8 w-8 flex items-center justify-center text-zinc-800 opacity-30" title="Pas d'adresse courriel">
                                                                <Mail className="h-4 w-4" />
                                                            </span>
                                                        )}
                                                        <Link
                                                            href={`/maintenance/invite/${u.invite_token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-8 w-8 items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                                                            title="Tester le lien résident"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleCopyInviteLink(u.invite_token)}
                                                            className="h-8 w-8 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
                                                        >
                                                            {copiedToken === u.invite_token ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        /* Calendar view mode */
                        <div className="fc-dark-theme-wrapper min-h-[500px]">
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                }}
                                events={events}
                                eventClick={(info) => {
                                    setSelectedAppointmentDetails(info.event.extendedProps)
                                    setIsApptModalOpen(true)
                                }}
                                height="auto"
                                locale="fr"
                                firstDay={1}
                                buttonText={{
                                    today: "Aujourd'hui",
                                    month: 'Mois',
                                    week: 'Semaine',
                                    day: 'Jour',
                                }}
                                eventDidMount={(info) => {
                                    info.el.style.backgroundColor = '#6b21a8'
                                    info.el.style.borderColor = '#7e22ce'
                                }}
                            />
                            <style dangerouslySetInnerHTML={{
                                __html: `
                        .fc-dark-theme-wrapper { color: #f4f4f5; }
                        .fc-theme-standard .fc-scrollgrid { border-color: #27272a; }
                        .fc-theme-standard td, .fc-theme-standard th { border-color: #27272a; }
                        .fc-button-primary { background-color: #18181b !important; border-color: #27272a !important; color: #f4f4f5 !important; font-size: 11px !important; padding: 4px 8px !important; }
                        .fc-button-primary:hover { background-color: #27272a !important; }
                        .fc-button-active { background-color: #3f3f46 !important; }
                        .fc-v-event { border: none; }
                        .fc-h-event { border: none; }
                        .fc-toolbar-title { font-size: 13px !important; font-weight: 600; text-transform: capitalize; color: #fff; }
                        .fc .fc-daygrid-day-number { color: #a1a1aa; font-size: 11px; }
                        .fc .fc-col-header-cell-cushion { color: #f4f4f5; font-weight: 500; font-size: 11px; }
                        .fc .fc-day-today { background-color: #18181b !important; }
                        .fc-event { cursor: pointer; font-size: 11px; }
                        `}} />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation de suppression - Étape 1 */}
            <ConfirmationDialog
                open={showDeleteConfirm1}
                onOpenChange={setShowDeleteConfirm1}
                title="Supprimer la campagne (Étape 1 de 2)"
                description={`Êtes-vous sûr de vouloir supprimer la campagne "${campaign.name}" ? Tous les rendez-vous et invitations des copropriétaires seront supprimés définitivement.`}
                confirmText="Continuer"
                cancelText="Annuler"
                variant="danger"
                onConfirm={handleDelete1}
            />

            {/* Confirmation de suppression - Étape 2 */}
            <ConfirmationDialog
                open={showDeleteConfirm2}
                onOpenChange={setShowDeleteConfirm2}
                title="Confirmation finale (Étape 2 de 2)"
                description={`Dernière confirmation: Cette action est irréversible. Veuillez confirmer que vous souhaitez supprimer définitivement la campagne "${campaign.name}" et toutes ses données associées.`}
                confirmText="Supprimer définitivement"
                cancelText="Annuler"
                variant="danger"
                onConfirm={handleDelete2}
                loading={deletingCampaign}
            />

            {/* Modal Réglages de la Campagne */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                Réglages de la Campagne
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="allowReschedule"
                                        checked={allowReschedule}
                                        onChange={(e) => setAllowReschedule(e.target.checked)}
                                        className="h-4 w-4 mt-0.5 rounded border-zinc-850 bg-[#121318] text-purple-650 focus:ring-purple-650 cursor-pointer"
                                    />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="allowReschedule" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                                            Autoriser le déplacement de rendez-vous
                                        </Label>
                                        <p className="text-[10px] text-zinc-500 font-medium">
                                            Si activé, les copropriétaires pourront déplacer leur rendez-vous directement depuis leur portail.
                                        </p>
                                    </div>
                                </div>

                                {allowReschedule && (
                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 uppercase font-bold text-[8px]">Délai limite de modification (Heures)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={rescheduleCutoff}
                                            onChange={(e) => setRescheduleCutoff(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                        />
                                        <p className="text-[10px] text-zinc-500 font-medium">
                                            Nombre d'heures avant le rendez-vous où la modification reste possible (ex: 24h).
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2 border-t border-zinc-900 pt-3">
                                    <Label className="text-zinc-550 uppercase font-bold text-[8px]">Date limite de réponse</Label>
                                    <Input
                                        type="datetime-local"
                                        value={deadlineDate}
                                        onChange={(e) => setDeadlineDate(e.target.value)}
                                        className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                    />
                                    <p className="text-[10px] text-zinc-500 font-medium">
                                        Après cette date, les résidents ne pourront plus répondre ni modifier leurs choix. Laissez vide pour aucune limite.
                                    </p>
                                </div>

                                <div className="space-y-3 border-t border-zinc-900 pt-3">
                                    <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Planification & Capacité</h4>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-550 uppercase font-bold text-[8px]">Heure de début</Label>
                                            <Input
                                                type="time"
                                                value={workStart}
                                                onChange={(e) => setWorkStart(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-550 uppercase font-bold text-[8px]">Heure de fin</Label>
                                            <Input
                                                type="time"
                                                value={workEnd}
                                                onChange={(e) => setWorkEnd(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-zinc-555 text-zinc-550 uppercase font-bold text-[8px]">Techniciens (Capacité)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={techsCount}
                                                onChange={(e) => setTechsCount(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-zinc-550 uppercase font-bold text-[8px]">Zone tampon (min)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={buffer}
                                                onChange={(e) => setBuffer(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Break Periods List Management inside settings modal */}
                                    <div className="space-y-2 border-t border-zinc-900 pt-3">
                                        <Label className="text-zinc-550 uppercase font-bold text-[8px]">Plages horaires réservées (ex: Repas)</Label>
                                        
                                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                            {breakPeriods.map((bp, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-[#121318] border border-zinc-850 rounded-lg">
                                                    <span className="font-mono text-xs text-zinc-300">
                                                        {bp.start} à {bp.end}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setBreakPeriods(prev => prev.filter((_, i) => i !== idx))}
                                                        className="text-rose-450 text-rose-400 hover:text-rose-300 text-xxs font-semibold cursor-pointer"
                                                    >
                                                        Retirer
                                                    </button>
                                                </div>
                                            ))}
                                            {breakPeriods.length === 0 && (
                                                <span className="text-[10px] text-zinc-600 italic block">Aucune plage réservée.</span>
                                            )}
                                        </div>

                                        <div className="flex gap-2 items-center pt-1">
                                            <Input
                                                type="time"
                                                value={newBreakStart}
                                                onChange={(e) => setNewBreakStart(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white flex-1"
                                            />
                                            <span className="text-zinc-550 text-xs">à</span>
                                            <Input
                                                type="time"
                                                value={newBreakEnd}
                                                onChange={(e) => setNewBreakEnd(e.target.value)}
                                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    if (!newBreakStart || !newBreakEnd) {
                                                        toast.error("Veuillez saisir une heure de début et de fin.")
                                                        return
                                                    }
                                                    if (newBreakStart >= newBreakEnd) {
                                                        toast.error("L'heure de début doit être antérieure à l'heure de fin.")
                                                        return
                                                    }
                                                    setBreakPeriods(prev => [...prev, { start: newBreakStart, end: newBreakEnd }].sort((a,b) => a.start.localeCompare(b.start)))
                                                    setNewBreakStart('')
                                                    setNewBreakEnd('')
                                                }}
                                                className="bg-[#121318] hover:bg-zinc-800 text-zinc-300 text-xxs font-bold h-8 px-3 rounded-lg border border-zinc-800 cursor-pointer"
                                            >
                                                Ajouter
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                    <Button
                                        type="button"
                                        onClick={() => setShowSettingsModal(false)}
                                        className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                    >
                                        Fermer
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={savingSettings}
                                        className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-5 rounded-xl shadow cursor-pointer transition-all text-xxs"
                                    >
                                        {savingSettings ? 'Enregistrement...' : 'Enregistrer'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal de transition vers la planification */}
            {showTransitionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                Paramètres de planification (Phase 2)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form onSubmit={handleConfirmTransition} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date de début *</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={transStartDate}
                                            onChange={(e) => setTransStartDate(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date de fin *</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={transEndDate}
                                            onChange={(e) => setTransEndDate(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date limite réponse *</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={transSchedulingDeadline}
                                            onChange={(e) => setTransSchedulingDeadline(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-900 pt-3">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-550 text-zinc-500 font-semibold uppercase tracking-wider">Début de journée</Label>
                                        <Input
                                            type="time"
                                            required
                                            value={transWorkStart}
                                            onChange={(e) => setTransWorkStart(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Fin de journée</Label>
                                        <Input
                                            type="time"
                                            required
                                            value={transWorkEnd}
                                            onChange={(e) => setTransWorkEnd(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Techniciens</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            required
                                            value={transTechsCount}
                                            onChange={(e) => setTransTechsCount(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Zone tampon (min)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            required
                                            value={transBuffer}
                                            onChange={(e) => setTransBuffer(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                                        />
                                    </div>
                                </div>

                                {/* Break periods list management inside transition modal */}
                                <div className="space-y-2 border-t border-zinc-900 pt-3">
                                    <Label className="text-zinc-550 uppercase font-bold text-[10px] tracking-wider">Plages horaires réservées (ex: Repas)</Label>
                                    
                                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                        {transBreakPeriods.map((bp, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-[#121318] border border-zinc-850 rounded-lg">
                                                <span className="font-mono text-xs text-zinc-300">
                                                    {bp.start} à {bp.end}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTransBreakPeriods(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-rose-450 text-rose-400 hover:text-rose-300 text-xxs font-semibold cursor-pointer"
                                                >
                                                    Retirer
                                                </button>
                                            </div>
                                        ))}
                                        {transBreakPeriods.length === 0 && (
                                            <span className="text-[10px] text-zinc-650 italic block">Aucune plage réservée.</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 items-center pt-1">
                                        <Input
                                            type="time"
                                            value={transNewBreakStart}
                                            onChange={(e) => setTransNewBreakStart(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white flex-1"
                                        />
                                        <span className="text-zinc-550 text-xs">à</span>
                                        <Input
                                            type="time"
                                            value={transNewBreakEnd}
                                            onChange={(e) => setTransNewBreakEnd(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-8 text-xs text-white flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                if (!transNewBreakStart || !transNewBreakEnd) {
                                                    toast.error("Veuillez saisir une heure de début et de fin.")
                                                    return
                                                }
                                                if (transNewBreakStart >= transNewBreakEnd) {
                                                    toast.error("L'heure de début doit être antérieure à l'heure de fin.")
                                                    return
                                                }
                                                setTransBreakPeriods(prev => [...prev, { start: transNewBreakStart, end: transNewBreakEnd }].sort((a,b) => a.start.localeCompare(b.start)))
                                                setTransNewBreakStart('')
                                                setTransNewBreakEnd('')
                                            }}
                                            className="bg-[#121318] hover:bg-zinc-800 text-zinc-300 text-xxs font-bold h-8 px-3 rounded-lg border border-zinc-800 cursor-pointer"
                                        >
                                            Ajouter
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                    <Button
                                        type="button"
                                        onClick={() => setShowTransitionModal(false)}
                                        className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                    >
                                        Fermer
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={savingTransition}
                                        className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-5 rounded-xl shadow cursor-pointer transition-all text-xxs"
                                    >
                                        {savingTransition ? 'Transition...' : 'Lancer la Planification'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal de détails du rendez-vous */}
            {isApptModalOpen && selectedAppointmentDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-md w-full">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                Détails du rendez-vous
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Unité</span>
                                    <span className="text-sm font-extrabold text-white">
                                        Unit {selectedAppointmentDetails.unit?.door?.door_number || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Participation</span>
                                    <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 mt-0.5 ${getStatusBadge(selectedAppointmentDetails.unit?.participation)}`}>
                                        {getStatusLabel(selectedAppointmentDetails.unit?.participation)}
                                    </Badge>
                                </div>
                            </div>

                            <div className="border-t border-zinc-900 pt-3 space-y-2">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Résident / Contact sur place</span>
                                    <span className="text-xs font-semibold text-zinc-200 block">
                                        {selectedAppointmentDetails.unit?.contact_name || selectedAppointmentDetails.unit?.resident?.full_name || 'Non défini'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xxs font-mono text-zinc-400">
                                    <div>
                                        <span className="text-[9px] text-zinc-550 uppercase font-bold block">Email</span>
                                        <span className="truncate block">
                                            {selectedAppointmentDetails.unit?.contact_email || selectedAppointmentDetails.unit?.resident?.email || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-zinc-550 uppercase font-bold block">Téléphone</span>
                                        <span>
                                            {selectedAppointmentDetails.unit?.contact_phone || selectedAppointmentDetails.unit?.resident?.phone || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-zinc-900 pt-3">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Date & Plage horaire</span>
                                <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-205 text-zinc-200 mt-1">
                                    <Calendar className="h-4 w-4 text-purple-400" />
                                    <span>
                                        {new Date(selectedAppointmentDetails.appointment?.appointment_date).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <span className="text-xxs text-zinc-400 font-mono block mt-1">
                                    Heure : {selectedAppointmentDetails.appointment?.start_time?.substring(0, 5)} à {selectedAppointmentDetails.appointment?.end_time?.substring(0, 5)}
                                </span>
                            </div>

                            {selectedAppointmentDetails.appointment?.notes && (
                                <div className="border-t border-zinc-900 pt-3">
                                    <span className="text-[10px] text-zinc-505 text-zinc-500 uppercase font-bold block">Notes du résident</span>
                                    <p className="text-xs text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 mt-1 leading-relaxed">
                                        {selectedAppointmentDetails.appointment?.notes}
                                    </p>
                                </div>
                            )}

                            <div className="border-t border-zinc-900 pt-3 space-y-2">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Renvoyer des notifications</span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        disabled={sendingEmails[selectedAppointmentDetails.unit?.id] || (!selectedAppointmentDetails.unit?.contact_email && !selectedAppointmentDetails.unit?.resident?.email)}
                                        onClick={() => handleSendIndividualEmail(selectedAppointmentDetails.unit?.id, 'booking_confirmation')}
                                        className="flex-1 bg-purple-900/40 hover:bg-purple-800/40 text-purple-405 text-purple-400 border border-purple-800/40 text-[10px] font-bold h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                        {sendingEmails[selectedAppointmentDetails.unit?.id] ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Mail className="h-3.5 w-3.5" />
                                        )}
                                        Confirmation
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={sendingEmails[selectedAppointmentDetails.unit?.id] || (!selectedAppointmentDetails.unit?.contact_email && !selectedAppointmentDetails.unit?.resident?.email)}
                                        onClick={() => handleSendIndividualEmail(selectedAppointmentDetails.unit?.id, 'service_incoming')}
                                        className="flex-1 bg-amber-950/20 hover:bg-amber-900/20 text-amber-500 border border-amber-800/40 text-[10px] font-bold h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                        {sendingEmails[selectedAppointmentDetails.unit?.id] ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Mail className="h-3.5 w-3.5" />
                                        )}
                                        Rappel Intervention
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-zinc-900 pt-3">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setIsApptModalOpen(false)
                                        setSelectedAppointmentDetails(null)
                                    }}
                                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-800 cursor-pointer"
                                >
                                    Fermer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
