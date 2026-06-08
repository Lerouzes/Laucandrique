// @ts-nocheck
// src/components/features/maintenance/ContractorDashboard.tsx
'use client'

import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { saveMaintenanceReportAction, getContractorDashboardAction, setContractorDayStatusAction } from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
    Calendar, 
    Clock, 
    User, 
    Check, 
    CheckCircle, 
    Camera, 
    FileText, 
    Activity,
    Search,
    ChevronRight,
    MapPin,
    AlertTriangle,
    XCircle,
    Plus,
    Trash2,
    HardHat
} from 'lucide-react'
import { toast } from 'sonner'

export function ContractorDashboard({ 
    token, 
    details: initialDetails 
}: { 
    token: string
    details: any
}) {
    const [details, setDetails] = useState<any>(initialDetails)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        // Default to first available appointment date or today's date
        const appts = initialDetails.appointments || []
        if (appts.length > 0) return appts[0].appointment_date
        return new Date().toISOString().substring(0, 10)
    })

    // Active appointment for report writing modal
    const [activeAppt, setActiveAppt] = useState<any | null>(null)
    const [reportStatus, setReportStatus] = useState<'completed' | 'absent' | 'refused_access' | 'follow_up'>('completed')
    const [reportNotes, setReportNotes] = useState('')
    const [reportObservations, setReportObservations] = useState('')
    const [reportRecommendations, setReportRecommendations] = useState('')
    const [photoUrls, setPhotoUrls] = useState<string[]>([])
    const [newPhotoUrl, setNewPhotoUrl] = useState('')
    const [saving, setSaving] = useState(false)

    // View mode and appointment details modal states
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
    const [selectedApptDetail, setSelectedApptDetail] = useState<any | null>(null)
    const [isApptModalOpen, setIsApptModalOpen] = useState(false)

    const contractorName = details.contractor?.full_name || 'Contracteur'
    const appointments = details.appointments || []

    const events = appointments.map((appt: any) => {
        const dateStr = appt.appointment_date
        const startStr = `${dateStr}T${appt.start_time}`
        const endStr = `${dateStr}T${appt.end_time}`
        return {
            id: appt.id,
            title: `Unit ${appt.door?.door_number || appt.door_number || ''} - ${appt.client_name || ''}`,
            start: startStr,
            end: endStr,
            extendedProps: appt,
            backgroundColor: appt.status === 'completed' ? '#065f46' : '#6b21a8',
            borderColor: appt.status === 'completed' ? '#047857' : '#7e22ce'
        }
    })

    // Extract unique dates that have appointments
    const appointmentDates = Array.from(new Set(appointments.map((a: any) => a.appointment_date))).sort()

    // Filter appointments for the selected date
    const dailyAppointments = appointments.filter((a: any) => a.appointment_date === selectedDate)

    // Extract unique campaigns for the selected date
    const campaignsOnSelectedDate = Array.from(
        new Set(dailyAppointments.map((a: any) => a.campaign_id))
    ).map(cid => {
        const campaign = details.campaigns?.find((c: any) => c.id === cid)
        return {
            id: cid as string,
            name: (campaign?.name || 'Campagne') as string
        }
    })

    const handleOpenReportModal = (appt: any) => {
        setActiveAppt(appt)
        setReportStatus(appt.status === 'scheduled' ? 'completed' : appt.status)
        setReportNotes(appt.report?.notes || '')
        setReportObservations(appt.report?.observations || '')
        setReportRecommendations(appt.report?.recommendations || '')
        setPhotoUrls(appt.report?.photos?.map((p: any) => p.photo_url) || [])
        setNewPhotoUrl('')
    }

    const handleAddPhoto = () => {
        if (!newPhotoUrl.trim()) return
        if (!newPhotoUrl.startsWith('http://') && !newPhotoUrl.startsWith('https://')) {
            toast.error("Veuillez saisir une URL de photo valide (commençant par http/https).")
            return
        }
        setPhotoUrls(prev => [...prev, newPhotoUrl.trim()])
        setNewPhotoUrl('')
        toast.success("Photo ajoutée au rapport.")
    }

    const handleRemovePhoto = (index: number) => {
        setPhotoUrls(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpdateDayStatus = async (campaignId: string, newStatus: 'started' | 'finished') => {
        try {
            await setContractorDayStatusAction(token, campaignId, selectedDate, newStatus)
            toast.success(
                newStatus === 'started'
                    ? "Journée d'intervention démarrée."
                    : "Journée d'intervention terminée."
            )
            // Reload dashboard details
            const fresh = await getContractorDashboardAction(token)
            setDetails(fresh)
        } catch (err) {
            toast.error("Erreur lors de la mise à jour du statut : " + (err as Error).message)
        }
    }

    const handleSaveReport = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeAppt) return

        setSaving(true)
        try {
            await saveMaintenanceReportAction(token, activeAppt.id, reportStatus, {
                notes: reportNotes.trim(),
                observations: reportObservations.trim(),
                recommendations: reportRecommendations.trim(),
                photoUrls
            })

            toast.success("Fiche d'intervention enregistrée avec succès.")
            
            // Reload dashboard details
            const fresh = await getContractorDashboardAction(token)
            setDetails(fresh)
            
            setActiveAppt(null)
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-emerald-500/20 text-emerald-450 text-emerald-400 border-emerald-800/40'
            case 'absent':
                return 'bg-amber-500/20 text-amber-400 border-amber-800/40'
            case 'refused_access':
                return 'bg-rose-500/20 text-rose-455 text-rose-405 border-rose-900/40'
            case 'follow_up':
                return 'bg-blue-500/20 text-blue-400 border-blue-800/40'
            default:
                return 'bg-zinc-800/50 text-zinc-400 border-zinc-700/60'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Visite effectuée'
            case 'absent': return 'Résident Absent'
            case 'refused_access': return 'Accès refusé'
            case 'follow_up': return 'À suivre'
            default: return 'Planifié'
        }
    }

    return (
        <div className="max-w-4xl w-full space-y-6 text-xxs px-2">
            
            {/* Branding Header */}
            <div className="flex justify-between items-center bg-[#16171e]/70 border border-zinc-800/80 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center">
                        <HardHat className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Gustav Contractor Portal</h1>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Bienvenue, <strong className="text-zinc-200">{contractorName}</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex justify-between items-center bg-[#16171e]/70 border border-zinc-800/80 p-4 rounded-2xl shadow-md">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {viewMode === 'list' ? "Affichage : Liste des interventions" : "Affichage : Calendrier des interventions"}
                </span>
                <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
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

            {viewMode === 'list' ? (
                <>
                    {/* Date Selection Bar */}
                    <div className="space-y-1.5 pl-1">
                        <Label className="text-zinc-550 uppercase font-bold text-[8px] tracking-wider block">Calendrier d'intervention</Label>
                        {appointmentDates.length === 0 ? (
                            <p className="text-xxs italic text-zinc-500 py-2">
                                Aucun rendez-vous assigné pour le moment.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {appointmentDates.map(date => {
                                    const dateObj = new Date(date + 'T00:00:00')
                                    const formattedDate = dateObj.toLocaleDateString('fr-CA', { weekday: 'short', month: 'short', day: 'numeric' })
                                    const isSelected = selectedDate === date
                                    return (
                                        <button
                                            key={date}
                                            type="button"
                                            onClick={() => setSelectedDate(date)}
                                            className={`py-1.5 px-3 rounded-xl border text-xxs font-bold transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-purple-950/30 border-purple-500 text-white' 
                                                    : 'bg-[#16171e]/70 border-zinc-850 hover:border-zinc-750 text-zinc-400'
                                            }`}
                                        >
                                            {formattedDate}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Daily Progress Action Bar */}
                    {dailyAppointments.length > 0 && campaignsOnSelectedDate.map(camp => {
                        const progressRecord = (details.progress || []).find(
                            (p: any) => p.campaign_id === camp.id && p.date === selectedDate
                        )
                        const status = progressRecord?.status || 'not_started'

                        return (
                            <Card key={camp.id} className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                            status === 'started' 
                                                ? 'bg-emerald-500/20 text-emerald-450 animate-pulse' 
                                                : status === 'finished' 
                                                ? 'bg-zinc-850/50 text-zinc-500 border border-zinc-800' 
                                                : 'bg-amber-500/20 text-amber-450 border border-amber-800/30'
                                        }`}>
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">{camp.name}</h4>
                                            <p className="text-[10px] text-zinc-400 mt-0.5">
                                                {status === 'not_started' && "La journée d'intervention n'est pas encore débutée."}
                                                {status === 'started' && "La journée d'intervention est en cours. Les résidents peuvent suivre votre progression."}
                                                {status === 'finished' && "La journée d'intervention est terminée."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {status === 'not_started' && (
                                            <Button
                                                onClick={() => handleUpdateDayStatus(camp.id, 'started')}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-4 rounded-xl cursor-pointer text-xxs flex items-center gap-1.5"
                                            >
                                                <Check className="h-3.5 w-3.5" /> Débuter la journée
                                            </Button>
                                        )}
                                        {status === 'started' && (
                                            <>
                                                <span className="text-[9px] font-bold text-emerald-450 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 mr-2 flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                    En cours
                                                </span>
                                                <Button
                                                    onClick={() => handleUpdateDayStatus(camp.id, 'finished')}
                                                    className="bg-red-650 hover:bg-red-750 text-white font-bold h-8 px-4 rounded-xl cursor-pointer text-xxs flex items-center gap-1.5 border border-red-500/30"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" /> Terminer la journée
                                                </Button>
                                            </>
                                        )}
                                        {status === 'finished' && (
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-700/40 flex items-center gap-1">
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                                Journée d'intervention terminée
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}

                    {/* Appointments List for the selected Date */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                            Interventions du jour ({dailyAppointments.length})
                        </h3>

                        {dailyAppointments.length === 0 ? (
                            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                                <CardContent className="p-8 text-center text-xxs text-zinc-500">
                                    Aucun passage prévu pour cette date.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {dailyAppointments.map(appt => (
                                    <Card key={appt.id} className="bg-[#16171e]/70 border-zinc-850 shadow-md hover:border-zinc-800 transition-all text-xxs">
                                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-white text-xs block">Unit {appt.door?.door_number}</span>
                                                    <Badge variant="outline" className={`text-[7px] font-extrabold uppercase px-1.5 py-0 ${getStatusBadge(appt.status)}`}>
                                                        {getStatusLabel(appt.status)}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-zinc-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                                                        <span>Immeuble: <strong>{appt.client_name}</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                                                        <span className="font-mono">Heure : <strong>{appt.start_time.substring(0, 5)} - {appt.end_time.substring(0, 5)}</strong> ({appt.duration}m)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5 text-zinc-500" />
                                                        <span>Contact: <strong>{appt.contact_name} ({appt.contact_phone})</strong></span>
                                                    </div>
                                                </div>

                                                {appt.resident_notes && (
                                                    <p className="text-[10px] italic text-amber-400 bg-amber-950/10 border border-amber-900/30 p-2 rounded-lg mt-1 font-medium max-w-xl">
                                                        * Consigne résident : {appt.resident_notes}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <Button
                                                    onClick={() => handleOpenReportModal(appt)}
                                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-4 rounded-xl shadow cursor-pointer flex items-center gap-1 transition-all"
                                                >
                                                    Rédiger le rapport
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Calendar View Mode */
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md p-4">
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
                                setSelectedApptDetail(info.event.extendedProps)
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
                                const color = info.event.backgroundColor
                                if (color) {
                                    info.el.style.backgroundColor = color
                                    info.el.style.borderColor = color
                                }
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
                </Card>
            )}

            {/* Report Form Modal */}
            {activeAppt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                Fiche d'intervention - Unité {activeAppt.door?.door_number}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form onSubmit={handleSaveReport} className="space-y-4">
                                
                                {/* Status choices */}
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-500 uppercase font-bold text-[8px]">Statut du passage</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setReportStatus('completed')}
                                            className={`py-1.5 px-3 rounded-lg border font-bold text-xxs transition-all cursor-pointer ${
                                                reportStatus === 'completed' 
                                                    ? 'bg-emerald-950/30 border-emerald-500 text-emerald-450 text-emerald-400' 
                                                    : 'bg-[#121318] border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            Visite effectuée
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReportStatus('absent')}
                                            className={`py-1.5 px-3 rounded-lg border font-bold text-xxs transition-all cursor-pointer ${
                                                reportStatus === 'absent' 
                                                    ? 'bg-amber-950/30 border-amber-500 text-amber-450 text-amber-400' 
                                                    : 'bg-[#121318] border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            Résident absent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReportStatus('refused_access')}
                                            className={`py-1.5 px-3 rounded-lg border font-bold text-xxs transition-all cursor-pointer ${
                                                reportStatus === 'refused_access' 
                                                    ? 'bg-rose-950/30 border-rose-500 text-rose-455 text-rose-400' 
                                                    : 'bg-[#121318] border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            Accès refusé
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReportStatus('follow_up')}
                                            className={`py-1.5 px-3 rounded-lg border font-bold text-xxs transition-all cursor-pointer ${
                                                reportStatus === 'follow_up' 
                                                    ? 'bg-blue-950/30 border-blue-500 text-blue-450 text-blue-400' 
                                                    : 'bg-[#121318] border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            À suivre
                                        </button>
                                    </div>
                                </div>

                                {/* Report details inputs */}
                                <div className="space-y-1.5 border-t border-zinc-900 pt-3">
                                    <Label className="text-zinc-500 uppercase font-bold text-[8px]">Notes et déroulement de l'intervention</Label>
                                    <Textarea
                                        value={reportNotes}
                                        onChange={(e) => setReportNotes(e.target.value)}
                                        placeholder="Ex: Remplacement du joint effectué comme prévu. Pas de fuite détectée."
                                        rows={2}
                                        className="bg-[#121318] border-zinc-850 text-white py-1.5"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-zinc-500 uppercase font-bold text-[8px]">Observations / Problèmes constatés</Label>
                                        <Textarea
                                            value={reportObservations}
                                            onChange={(e) => setReportObservations(e.target.value)}
                                            placeholder="Ex: Légère corrosion sur le tuyau de raccordement du chauffe-eau."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-white py-1.5"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-zinc-500 uppercase font-bold text-[8px]">Recommandations à la direction</Label>
                                        <Textarea
                                            value={reportRecommendations}
                                            onChange={(e) => setReportRecommendations(e.target.value)}
                                            placeholder="Ex: Prévoir le remplacement du chauffe-eau d'ici 12 mois."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-850 text-white py-1.5"
                                        />
                                    </div>
                                </div>

                                {/* Attached photos */}
                                <div className="space-y-2 border-t border-zinc-900 pt-3">
                                    <Label className="text-zinc-500 uppercase font-bold text-[8px] block">Photos de validation</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newPhotoUrl}
                                            onChange={(e) => setNewPhotoUrl(e.target.value)}
                                            placeholder="Coller l'URL d'une photo (commençant par http/https)..."
                                            className="bg-[#121318] border-zinc-850 h-8 text-white flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAddPhoto}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 px-4 rounded-xl cursor-pointer"
                                        >
                                            Ajouter
                                        </Button>
                                    </div>

                                    {/* Uploaded photos previews */}
                                    {photoUrls.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                            {photoUrls.map((url, index) => (
                                                <div key={index} className="relative group rounded-xl overflow-hidden border border-zinc-850 bg-zinc-950 aspect-video">
                                                    <img src={url} alt="Visite" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePhoto(index)}
                                                        className="absolute top-1 right-1 bg-red-650/80 hover:bg-red-700 text-white p-1 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                    <Button
                                        type="button"
                                        onClick={() => setActiveAppt(null)}
                                        className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                    >
                                        Fermer
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-5 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all"
                                    >
                                        {saving ? 'Enregistrement...' : <><Check className="h-3.5 w-3.5" /> Enregistrer le rapport</>}
                                    </Button>
                                </div>

                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal de détails du rendez-vous (vue Calendrier) */}
            {isApptModalOpen && selectedApptDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-md w-full">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                Détails de l'intervention
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xxs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Unité</span>
                                    <span className="text-sm font-extrabold text-white">
                                        Unit {selectedApptDetail.door?.door_number || selectedApptDetail.door_number || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Statut</span>
                                    <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 mt-0.5 ${getStatusBadge(selectedApptDetail.status)}`}>
                                        {getStatusLabel(selectedApptDetail.status)}
                                    </Badge>
                                </div>
                            </div>

                            <div className="border-t border-zinc-900 pt-3 space-y-2">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Immeuble / Syndicat</span>
                                    <span className="text-xs font-semibold text-zinc-200 block">
                                        {selectedApptDetail.client_name || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Contact sur place</span>
                                    <span className="text-xs font-semibold text-zinc-200 block">
                                        {selectedApptDetail.contact_name || 'Non défini'}
                                    </span>
                                    {selectedApptDetail.contact_phone && (
                                        <span className="text-xxs text-zinc-400 font-mono block mt-0.5">
                                            Tél : {selectedApptDetail.contact_phone}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-zinc-900 pt-3">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Date & Plage horaire</span>
                                <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-200 mt-1">
                                    <Calendar className="h-4 w-4 text-purple-400" />
                                    <span>
                                        {new Date(selectedApptDetail.appointment_date).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <span className="text-xxs text-zinc-400 font-mono block mt-1">
                                    Heure : {selectedApptDetail.start_time?.substring(0, 5)} à {selectedApptDetail.end_time?.substring(0, 5)} ({selectedApptDetail.duration} min)
                                </span>
                            </div>

                            {selectedApptDetail.resident_notes && (
                                <div className="border-t border-zinc-900 pt-3">
                                    <span className="text-[10px] text-zinc-550 uppercase font-bold block">Consigne résident</span>
                                    <p className="text-xs text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 mt-1 leading-relaxed">
                                        {selectedApptDetail.resident_notes}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setIsApptModalOpen(false)
                                        setSelectedApptDetail(null)
                                    }}
                                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                >
                                    Fermer
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const appt = selectedApptDetail
                                        setIsApptModalOpen(false)
                                        setSelectedApptDetail(null)
                                        handleOpenReportModal(appt)
                                    }}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-4 rounded-xl shadow cursor-pointer flex items-center gap-1"
                                >
                                    Rédiger le rapport
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>
    )
}
