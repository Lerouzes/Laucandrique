// src/components/features/maintenance/ResidentInvitePortal.tsx
'use client'

import { useState } from 'react'
import { 
    submitParticipationAction, 
    scheduleAppointmentAction, 
    cancelAppointmentAction,
    getAvailableTimeSlotsAction
} from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
    Calendar, 
    Clock, 
    User, 
    Check, 
    CheckCircle, 
    XCircle, 
    AlertTriangle,
    Sliders,
    Building2,
    Wrench,
    Send,
    Globe,
    Phone,
    Mail,
    Activity,
    MapPin
} from 'lucide-react'
import { toast } from 'sonner'

const translations = {
    fr: {
        portalTitle: "Gustav Portal Résident",
        portalSubtitle: "Espace sécurisé de planification et d'intervention pour les copropriétaires.",
        campaignSwitcher: "Vos campagnes de maintenance",
        switchCampaignBtn: "Accéder",
        currentCampaignBadge: "Actuelle",
        syndicateInfo: "Informations du Syndicat",
        campaignName: "Campagne de Maintenance",
        unitNum: "Unité",
        servicesTitle: "Prestations prévues dans votre unité",
        contractorTitle: "Entrepreneur assigné",
        websiteLink: "Visiter le site web",
        cancelledTitle: "Campagne annulée",
        cancelledDesc: "Cette campagne de maintenance a été annulée par la direction. Aucune autre action n'est requise de votre part.",
        participationTitle: "1. Participation & Contact",
        confirmedBadge: "Confirmé",
        saveSuccess: "Vos préférences de participation ont été enregistrées avec succès !",
        statusLabel: "Votre statut de participation",
        statusInterested: "Je souhaite participer",
        statusRefuse: "Je refuse / Pas intéressé",
        statusDoneSelf: "Déjà effectué moi-même",
        contactPerson: "Contact sur place *",
        contactEmail: "Courriel de contact",
        contactPhone: "Téléphone de contact",
        residentNotesLabel: "Note ou consigne pour le technicien",
        residentNotesPlaceholder: "Code d'accès, présence d'un animal domestique, contrainte particulière...",
        lockedAptMsg: "Informations verrouillées car votre rendez-vous est planifié.",
        editInfoBtn: "Modifier mes informations",
        savePrefBtn: "Enregistrer mes préférences",
        savingBtn: "Enregistrement...",
        bookingTitle: "2. Planification du rendez-vous",
        phaseSurveyTitle: "Phase de sondage en cours",
        phaseSurveyDesc: "Cette campagne est actuellement en phase de sondage de participation. Dès que l'administrateur aura validé la participation et ouvert la phase de planification, vous pourrez choisir votre date et votre plage horaire de rendez-vous sur cette page.",
        apptPlanned: "Rendez-vous planifié !",
        apptOn: "Votre passage est planifié pour le",
        apptFrom: "de",
        apptTo: "à",
        cancelApptBtn: "Annuler le rendez-vous",
        rescheduleBtn: "Reprogrammer / Modifier",
        chooseDateLabel: "Choisissez une date de passage",
        noDateAvail: "Aucune date de passage n'est disponible. Veuillez contacter l'administrateur.",
        chooseSlotLabel: "Sélectionnez une plage horaire ({duration} min requis)",
        confirmApptBtn: "Confirmer mon rendez-vous",
        bookingProgress: "Réservation...",
        confirmPrefTitle: "Enregistrer vos préférences ?",
        confirmPrefDesc: "Voulez-vous vraiment enregistrer vos informations de contact et votre choix de participation ?",
        confirmBtn: "Enregistrer",
        cancelBtn: "Annuler",
        cancelConfirmPrompt: "Voulez-vous vraiment annuler votre rendez-vous ?",
        selectParticipationErr: "Veuillez sélectionner votre choix de participation (Participer, Refuser, ou Déjà effectué).",
        contactNameErr: "Veuillez renseigner le nom de la personne contact.",
        dateSlotErr: "Veuillez sélectionner une date et une plage horaire.",
        optOutMsg: "Vous avez choisi de ne pas participer. Aucun rendez-vous n'est requis.",
        optOutCompletedElsewhereMsg: "Prestation effectuée par vous-même. Aucun rendez-vous n'est requis.",
        deadlinePassed: "Date limite de réponse dépassée",
        deadlinePassedDesc: "La date limite de réponse ({date}) pour cette campagne est dépassée. Vous ne pouvez plus modifier vos informations ou planifier de rendez-vous. Veuillez contacter l'administration pour toute question.",
        reschedulingDisabled: "Reprogrammation désactivée",
        reschedulingDisabledDesc: "La reprogrammation et l'annulation de rendez-vous sont désactivées pour cette campagne par la direction.",
        cutoffPassed: "Délai de modification dépassé",
        cutoffPassedDesc: "Vous ne pouvez plus reprogrammer ou annuler votre rendez-vous car le délai minimum de préavis ({hours}h) a expiré.",
        queuePositionMsg: "Votre unité est en position {position} dans la file d'attente pour le passage d'aujourd'hui.",
        contractorProgressTitle: "Progression de l'entrepreneur",
        contractorActiveMsg: "L'entrepreneur a débuté ses visites aujourd'hui ! Votre unité est en position {position} dans la file d'attente.",
        contractorNotStartedMsg: "L'entrepreneur n'a pas encore débuté sa journée de visites aujourd'hui.",
        contractorFinishedMsg: "L'entrepreneur a terminé ses visites pour aujourd'hui."
    },
    en: {
        portalTitle: "Resident Portal",
        portalSubtitle: "Secure scheduling and intervention space for co-owners.",
        campaignSwitcher: "Your Maintenance Campaigns",
        switchCampaignBtn: "Access",
        currentCampaignBadge: "Current",
        syndicateInfo: "Syndicate Information",
        campaignName: "Maintenance Campaign",
        unitNum: "Unit",
        servicesTitle: "Services scheduled for your unit",
        contractorTitle: "Assigned Contractor",
        websiteLink: "Visit website",
        cancelledTitle: "Campaign Cancelled",
        cancelledDesc: "This maintenance campaign has been cancelled by management. No further action is required on your part.",
        participationTitle: "1. Participation & Contact",
        confirmedBadge: "Confirmed",
        saveSuccess: "Your participation preferences have been successfully saved!",
        statusLabel: "Your Participation Status",
        statusInterested: "I wish to participate",
        statusRefuse: "I refuse / Not interested",
        statusDoneSelf: "Already done myself",
        contactPerson: "On-site contact *",
        contactEmail: "Contact Email",
        contactPhone: "Contact Phone",
        residentNotesLabel: "Note or instructions for the technician",
        residentNotesPlaceholder: "Access code, presence of a pet, special request...",
        lockedAptMsg: "Information locked because your appointment is scheduled.",
        editInfoBtn: "Edit my info",
        savePrefBtn: "Save my preferences",
        savingBtn: "Saving...",
        bookingTitle: "2. Appointment Scheduling",
        phaseSurveyTitle: "Survey phase in progress",
        phaseSurveyDesc: "This campaign is currently in the participation survey phase. As soon as the administrator has validated participation and opened the scheduling phase, you can choose your appointment date and time slot on this page.",
        apptPlanned: "Appointment Scheduled!",
        apptOn: "Your visit is scheduled for",
        apptFrom: "from",
        apptTo: "to",
        cancelApptBtn: "Cancel appointment",
        rescheduleBtn: "Reschedule / Modify",
        chooseDateLabel: "Choose a visit date",
        noDateAvail: "No visit dates available. Please contact the administrator.",
        chooseSlotLabel: "Select a time slot ({duration} min required)",
        confirmApptBtn: "Confirm my appointment",
        bookingProgress: "Booking...",
        confirmPrefTitle: "Save your preferences?",
        confirmPrefDesc: "Do you really want to save your contact information and participation choice?",
        confirmBtn: "Save",
        cancelBtn: "Cancel",
        cancelConfirmPrompt: "Are you sure you want to cancel your appointment?",
        selectParticipationErr: "Please select your participation choice (Participate, Refuse, or Already done).",
        contactNameErr: "Please enter the name of the contact person.",
        dateSlotErr: "Please select a date and time slot.",
        optOutMsg: "You have chosen not to participate. No appointment is required.",
        optOutCompletedElsewhereMsg: "Service completed by yourself. No appointment is required.",
        deadlinePassed: "Response deadline passed",
        deadlinePassedDesc: "The response deadline ({date}) for this campaign has passed. You can no longer edit your info or schedule an appointment. Please contact management for questions.",
        reschedulingDisabled: "Rescheduling disabled",
        reschedulingDisabledDesc: "Rescheduling and cancellation of appointments are disabled for this campaign by management.",
        cutoffPassed: "Modification deadline passed",
        cutoffPassedDesc: "You can no longer reschedule or cancel your appointment because the minimum notice period ({hours}h) has expired.",
        queuePositionMsg: "Your unit is in position {position} in the queue for today's visits.",
        contractorProgressTitle: "Contractor Progress",
        contractorActiveMsg: "The contractor has started visits today! Your unit is in position {position} in the queue.",
        contractorNotStartedMsg: "The contractor has not started visits yet today.",
        contractorFinishedMsg: "The contractor has finished visits for today."
    }
}

export function ResidentInvitePortal({ 
    token, 
    details, 
    initialSlots,
    totalDuration
}: { 
    token: string
    details: any
    initialSlots: Record<string, string[]>
    totalDuration: number
}) {
    const { 
        unit, 
        resident, 
        appointment: initialAppointment, 
        client, 
        services, 
        contractor,
        progress = [],
        dailyAppointments = [],
        siblingCampaigns = []
    } = details
    const campaign = unit.campaign

    // Bilingual State
    const [lang, setLang] = useState<'fr' | 'en'>('fr')
    const t = translations[lang]

    // Form and appointment states
    const [participation, setParticipation] = useState<string>(unit.participation)
    const [contactName, setContactName] = useState(unit.contact_name || resident?.full_name || '')
    const [contactEmail, setContactEmail] = useState(unit.contact_email || resident?.email || '')
    const [contactPhone, setContactPhone] = useState(unit.contact_phone || resident?.phone || '')
    const [residentNotes, setResidentNotes] = useState(unit.resident_notes || '')
    const [appointment, setAppointment] = useState<any>(initialAppointment)
    const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>(initialSlots)

    // Booking state
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedSlot, setSelectedSlot] = useState<string>('')
    const [saving, setSaving] = useState(false)
    const [booking, setBooking] = useState(false)
    const [showSuccessBanner, setShowSuccessBanner] = useState(false)

    // Deadline check
    const isDeadlinePassed = campaign.response_deadline_date
        ? new Date().getTime() > new Date(campaign.response_deadline_date).getTime()
        : false

    const [isEditing, setIsEditing] = useState(unit.participation === 'pending' && !isDeadlinePassed)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    // Option lists
    const dates = Object.keys(availableSlots).sort()

    const handleSaveParticipationAttempt = (e: React.FormEvent) => {
        e.preventDefault()
        if (participation === 'pending') {
            toast.error(t.selectParticipationErr)
            return
        }
        if (!contactName.trim()) {
            toast.error(t.contactNameErr)
            return
        }
        setShowConfirmDialog(true)
    }

    const handleConfirmSaveParticipation = async () => {
        setShowConfirmDialog(false)
        setSaving(true)
        setShowSuccessBanner(false)
        try {
            await submitParticipationAction(token, participation as any, {
                contact_name: contactName.trim(),
                contact_email: contactEmail.trim(),
                contact_phone: contactPhone.trim(),
                resident_notes: residentNotes.trim()
            })

            setShowSuccessBanner(true)
            setIsEditing(false)
            toast.success(t.saveSuccess)
            
            if (participation === 'not_interested' || participation === 'completed_elsewhere') {
                setAppointment(null)
            }
        } catch (err) {
            toast.error("Erreur: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const handleBookAppointment = async () => {
        if (isDeadlinePassed) {
            toast.error(t.deadlinePassed)
            return
        }
        if (!contactName.trim()) {
            toast.error(t.contactNameErr)
            return
        }
        if (!selectedDate || !selectedSlot) {
            toast.error(t.dateSlotErr)
            return
        }

        setBooking(true)
        try {
            // Auto-save participation & contact details before scheduling appointment
            await submitParticipationAction(token, 'interested', {
                contact_name: contactName.trim(),
                contact_email: contactEmail.trim(),
                contact_phone: contactPhone.trim(),
                resident_notes: residentNotes.trim()
            })

            const appt = await scheduleAppointmentAction(
                token, 
                selectedDate, 
                selectedSlot, 
                totalDuration
            )
            setAppointment(appt)
            setParticipation('interested')
            setIsEditing(false)
            
            // Reload available slots
            const freshSlots = await getAvailableTimeSlotsAction(campaign.id, totalDuration)
            setAvailableSlots(freshSlots)
            
            toast.success(lang === 'fr' ? "Rendez-vous planifié avec succès!" : "Appointment scheduled successfully!")
            setSelectedDate('')
            setSelectedSlot('')
        } catch (err) {
            toast.error("Erreur: " + (err as Error).message)
        } finally {
            setBooking(false)
        }
    }

    const handleCancelAppointment = async () => {
        if (!confirm(t.cancelConfirmPrompt)) return
        setBooking(true)
        try {
            await cancelAppointmentAction(token)
            setAppointment(null)
            
            // Reload slots
            const freshSlots = await getAvailableTimeSlotsAction(campaign.id, totalDuration)
            setAvailableSlots(freshSlots)
            
            toast.success(lang === 'fr' ? "Rendez-vous annulé." : "Appointment cancelled.")
        } catch (err) {
            toast.error("Erreur: " + (err as Error).message)
        } finally {
            setBooking(false)
        }
    }

    // Cutoff calculation
    const isCutoffPassed = () => {
        if (!appointment) return false
        const apptDateStr = `${appointment.appointment_date}T${appointment.start_time}`
        const apptTime = new Date(apptDateStr).getTime()
        const now = new Date().getTime()
        const diffHours = (apptTime - now) / (1000 * 60 * 60)
        return diffHours < (campaign.reschedule_cutoff_hours ?? 24)
    }

    // Queue calculation
    const getQueuePosition = () => {
        if (!appointment || !dailyAppointments || dailyAppointments.length === 0) return 1
        const sortedAppts = [...dailyAppointments].sort((a, b) => a.start_time.localeCompare(b.start_time))
        const ourIndex = sortedAppts.findIndex(a => a.id === appointment.id)
        if (ourIndex === -1) return 1
        const precedingScheduled = sortedAppts
            .slice(0, ourIndex)
            .filter(a => a.status === 'scheduled')
            .length
        return precedingScheduled + 1
    }

    const apptDate = appointment?.appointment_date
    const dayProgress = progress?.find((p: any) => p.date === apptDate)
    const isDayStarted = dayProgress?.status === 'started'
    const isDayFinished = dayProgress?.status === 'finished'

    const hasAppointment = !!appointment
    const isFieldsLocked = !isEditing || hasAppointment || isDeadlinePassed
    const isParticipating = participation === 'interested' || participation === 'pending' || participation === 'more_info'
    const isCutoffActive = isCutoffPassed()
    const rescheduleAllowed = campaign.allow_reschedule !== false && !isDeadlinePassed && !isCutoffActive

    if (campaign.status === 'cancelled') {
        return (
            <div className="max-w-2xl w-full mx-auto space-y-6 text-xs text-zinc-300">
                {/* Branding Header & Language Selector */}
                <div className="flex justify-between items-center bg-[#16171e]/70 border border-zinc-800/80 p-4 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center shrink-0">
                            <Wrench className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">{t.portalTitle}</h1>
                            <p className="text-[10px] text-zinc-400 mt-0.5">{t.portalSubtitle}</p>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-zinc-800 bg-[#121318] hover:bg-zinc-900 text-xxs font-bold text-zinc-300 transition-all cursor-pointer shadow-sm shrink-0"
                    >
                        <Globe className="h-3.5 w-3.5 text-purple-400" />
                        <span>{lang === 'fr' ? 'EN' : 'FR'}</span>
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center p-8 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl text-center space-y-4 shadow-xl">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-rose-950/30 border border-rose-800/50">
                        <XCircle className="h-6 w-6 text-rose-450" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.cancelledTitle}</h2>
                        <p className="text-zinc-400 text-xxs leading-relaxed font-normal max-w-sm">
                            {t.cancelledDesc}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl w-full space-y-6 text-xs text-zinc-300">
            
            {/* Branding Header & Language Selector */}
            <div className="flex justify-between items-center bg-[#16171e]/70 border border-zinc-800/80 p-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center shrink-0">
                        <Wrench className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">{t.portalTitle}</h1>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{t.portalSubtitle}</p>
                    </div>
                </div>
                
                <button
                    type="button"
                    onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-zinc-800 bg-[#121318] hover:bg-zinc-900 text-xxs font-bold text-zinc-300 transition-all cursor-pointer shadow-sm shrink-0"
                >
                    <Globe className="h-3.5 w-3.5 text-purple-400" />
                    <span>{lang === 'fr' ? 'EN' : 'FR'}</span>
                </button>
            </div>

            {/* Warning Banner: Deadline Passed */}
            {isDeadlinePassed && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 shadow-md">
                    <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                    <div>
                        <span className="font-bold text-xs">{t.deadlinePassed}</span>
                        <p className="text-xxs text-zinc-400 mt-0.5">
                            {t.deadlinePassedDesc.replace('{date}', new Date(campaign.response_deadline_date).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US'))}
                        </p>
                    </div>
                </div>
            )}

            {/* Two-Column Responsive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Sibling Switcher, Client Card, Contractor Card, Services */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Sibling Campaigns Switcher */}
            {siblingCampaigns.length > 1 && (
                <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                    <CardHeader className="pb-2.5 border-b border-zinc-900 bg-zinc-950/15">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                            <Activity className="h-4 w-4" />
                            {t.campaignSwitcher}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-2 text-xxs">
                        <div className="flex flex-col gap-2">
                            {siblingCampaigns.map((sib: any) => {
                                const isCurrent = sib.invite_token === token
                                return (
                                    <div 
                                        key={sib.campaign_id} 
                                        className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-2 transition-all ${
                                            isCurrent 
                                                ? 'bg-purple-950/20 border-purple-800/60 text-white' 
                                                : 'bg-zinc-950/40 border-zinc-850 text-zinc-350 hover:bg-zinc-900/40'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-extrabold text-xs">{sib.campaign_name}</span>
                                                {isCurrent && (
                                                    <Badge className="bg-purple-900/50 border border-purple-700 text-purple-200 text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0">
                                                        {t.currentCampaignBadge}
                                                    </Badge>
                                                )}
                                                <Badge className={`${
                                                    sib.campaign_status === 'active' 
                                                        ? 'bg-emerald-950/30 border border-emerald-800 text-emerald-300' 
                                                        : sib.campaign_status === 'completed'
                                                        ? 'bg-blue-950/30 border border-blue-800 text-blue-300'
                                                        : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                                                } text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0`}>
                                                    {sib.campaign_status === 'active' ? (lang === 'fr' ? 'Active' : 'Active') : 
                                                     sib.campaign_status === 'completed' ? (lang === 'fr' ? 'Complétée' : 'Completed') : 
                                                     (lang === 'fr' ? 'Annulée' : 'Cancelled')}
                                                </Badge>
                                            </div>
                                            <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
                                                {sib.start_date && (
                                                    <span>
                                                        {lang === 'fr' ? 'Période: ' : 'Period: '}
                                                        {new Date(sib.start_date).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US')} 
                                                        {sib.end_date && ` - ${new Date(sib.end_date).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US')}`}
                                                    </span>
                                                )}
                                                {sib.appointment && (
                                                    <span className="text-emerald-455 font-semibold">
                                                        {lang === 'fr' ? 'Rendez-vous: ' : 'Appointment: '}
                                                        {new Date(sib.appointment.appointment_date).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US')} ({sib.appointment.start_time.substring(0, 5)})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {!isCurrent && (
                                            <Button
                                                size="sm"
                                                onClick={() => window.location.href = `/maintenance/invite/${sib.invite_token}`}
                                                className="bg-purple-900/60 hover:bg-purple-800 border border-purple-700 text-white font-bold text-xxs h-7 rounded-lg px-3 shrink-0 self-end sm:self-center cursor-pointer transition-all"
                                            >
                                                {t.switchCampaignBtn}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Syndicate & Contractor Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                {/* Syndicate & Campaign Details */}
                <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                    <CardHeader className="pb-2.5 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-purple-400" />
                            {t.syndicateInfo}
                        </CardTitle>
                        <Badge className="bg-purple-950/30 border border-purple-800 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0">
                            {t.unitNum} {unit.door?.door_number}
                        </Badge>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-2.5 text-xxs">
                        <div>
                            <span className="font-extrabold text-zinc-200 text-xs block uppercase">{client?.company_name || client?.full_name}</span>
                            <span className="text-[10px] text-purple-400/80 font-bold block mt-0.5">{campaign.name}</span>
                        </div>
                        {campaign.description && (
                            <p className="text-zinc-400 leading-relaxed text-[11px] border-l-2 border-purple-900/60 pl-2 py-0.5">
                                {campaign.description}
                            </p>
                        )}
                        <div className="space-y-1 text-zinc-450 border-t border-zinc-900 pt-2 text-[10px]">
                            {(client?.address || client?.city) && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-zinc-550 shrink-0" />
                                    <span>{[client.address, client.city].filter(Boolean).join(', ')}</span>
                                </div>
                            )}
                            {client?.email && (
                                <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-zinc-550 shrink-0" />
                                    <span>{client.email}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Contractor Card */}
                <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                    <CardHeader className="pb-2.5 border-b border-zinc-900 bg-zinc-950/10">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench className="h-4 w-4 text-purple-400" />
                            {t.contractorTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-2.5 text-xxs">
                        {contractor ? (
                            <>
                                <div>
                                    <span className="font-extrabold text-zinc-200 text-xs block uppercase">{contractor.company_name || contractor.full_name}</span>
                                </div>
                                <div className="space-y-1 text-zinc-450 text-[10px]">
                                    {contractor.phone && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-zinc-550 shrink-0" />
                                            <span>{contractor.phone}</span>
                                        </div>
                                    )}
                                    {contractor.email && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5 text-zinc-550 shrink-0" />
                                            <span>{contractor.email}</span>
                                        </div>
                                    )}
                                </div>
                                {contractor.website && (
                                    <div className="border-t border-zinc-900 pt-2 mt-1">
                                        <a 
                                            href={contractor.website.startsWith('http') ? contractor.website : `https://${contractor.website}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xxs text-purple-400 hover:text-purple-300 font-bold underline inline-flex items-center gap-1.5"
                                        >
                                            <Globe className="h-3.5 w-3.5 shrink-0" />
                                            {t.websiteLink}
                                        </a>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-zinc-500 italic py-2">
                                Aucun entrepreneur assigné.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Services Summary */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardContent className="p-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                        {t.servicesTitle}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {services.map((s: any) => (
                            <div key={s.id} className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl flex justify-between items-center text-zinc-350">
                                <span className="font-semibold text-xxs">{s.name}</span>
                                <span className="font-mono text-zinc-500 text-xxs flex items-center gap-1 shrink-0">
                                    <Clock className="h-3 w-3" /> {s.duration} min
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

                </div>

                {/* Right Column: Participation & Booking Forms */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Participation Form */}
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                                <User className="h-4 w-4" />
                                {t.participationTitle}
                            </CardTitle>
                            {!isEditing && participation !== 'pending' && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                    <Check className="h-3 w-3" />
                                    {t.confirmedBadge}
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form onSubmit={handleSaveParticipationAttempt} className="space-y-4">
                                {showSuccessBanner && (
                                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 transition-all duration-300">
                                        <CheckCircle className="h-4.5 w-4.5 text-emerald-450 shrink-0" />
                                        <span className="font-semibold text-xs">{t.saveSuccess}</span>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t.statusLabel}</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            disabled={isFieldsLocked}
                                            onClick={() => setParticipation('interested')}
                                            className={`py-2.5 px-3.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                                participation === 'interested' 
                                                    ? 'bg-purple-950/30 border-purple-500 text-white shadow-md' 
                                                    : 'bg-zinc-900/35 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            } ${isFieldsLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            {t.statusInterested}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isFieldsLocked}
                                            onClick={() => setParticipation('not_interested')}
                                            className={`py-2.5 px-3.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                                participation === 'not_interested' 
                                                    ? 'bg-rose-950/30 border-rose-500 text-white shadow-md' 
                                                    : 'bg-zinc-900/35 border-zinc-855 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            } ${isFieldsLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            {t.statusRefuse}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isFieldsLocked}
                                            onClick={() => setParticipation('completed_elsewhere')}
                                            className={`py-2.5 px-3.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                                participation === 'completed_elsewhere' 
                                                    ? 'bg-blue-950/30 border-blue-500 text-white shadow-md' 
                                                    : 'bg-zinc-900/35 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                            } ${isFieldsLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            {t.statusDoneSelf}
                                        </button>
                                    </div>
                                </div>

                                {/* Contact details - Responsive Grid to prevent awkward label wrapping */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-900 pt-3">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t.contactPerson}</Label>
                                        <Input
                                            disabled={isFieldsLocked}
                                            value={contactName}
                                            onChange={(e) => setContactName(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-10 text-xs text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t.contactEmail}</Label>
                                        <Input
                                            type="email"
                                            disabled={isFieldsLocked}
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-10 text-xs text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t.contactPhone}</Label>
                                        <Input
                                            disabled={isFieldsLocked}
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            className="bg-[#121318] border-zinc-850 h-10 text-xs text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t.residentNotesLabel}</Label>
                                    <Textarea
                                        disabled={isFieldsLocked}
                                        value={residentNotes}
                                        onChange={(e) => setResidentNotes(e.target.value)}
                                        placeholder={t.residentNotesPlaceholder}
                                        rows={2}
                                        className="bg-[#121318] border-zinc-850 text-xs text-white py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="flex justify-end pt-1">
                                    {isFieldsLocked ? (
                                        isDeadlinePassed ? (
                                            <span className="text-xxs text-zinc-500 italic">
                                                {t.deadlinePassed}
                                            </span>
                                        ) : hasAppointment ? (
                                            <span className="text-xxs text-zinc-400 italic">
                                                {t.lockedAptMsg}
                                            </span>
                                        ) : (
                                            <Button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold h-10 px-5 rounded-xl cursor-pointer text-xs"
                                            >
                                                {t.editInfoBtn}
                                            </Button>
                                        )
                                    ) : (
                                        <Button
                                            type="submit"
                                            disabled={saving}
                                            className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-10 px-5 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all text-xs"
                                        >
                                            {saving ? t.savingBtn : <><Send className="h-4 w-4" /> {t.savePrefBtn}</>}
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Appointment Booking Panel */}
                    {isParticipating ? (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                                    <Calendar className="h-4 w-4" />
                                    {t.bookingTitle}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {campaign.current_phase === 'survey' ? (
                                    <div className="p-4 bg-purple-950/10 border border-purple-900/30 rounded-xl space-y-2 text-xs">
                                        <div className="flex items-start gap-3">
                                            <Clock className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <span className="font-extrabold text-purple-300 text-xs block">{t.phaseSurveyTitle}</span>
                                                <p className="text-xs text-zinc-400 leading-relaxed">
                                                    {t.phaseSurveyDesc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : appointment ? (
                                    <div className="p-4 bg-emerald-950/10 border border-emerald-900/40 rounded-xl space-y-3 text-xs">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-emerald-450 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <span className="font-extrabold text-zinc-150 text-xs block">{t.apptPlanned}</span>
                                                <p className="text-xs text-zinc-400">
                                                    {t.apptOn} <strong className="text-zinc-200">{new Date(appointment.appointment_date).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US')}</strong> {t.apptFrom} <strong className="text-zinc-200">{appointment.start_time.substring(0, 5)}</strong> {t.apptTo} <strong className="text-zinc-200">{appointment.end_time.substring(0, 5)}</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Contractor Daily Progress Tracker */}
                                        <div className="mt-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Activity className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                                                    {t.contractorProgressTitle}
                                                </span>
                                                {isDayStarted && (
                                                    <span className="flex h-2 w-2 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xxs text-zinc-400 leading-relaxed font-medium">
                                                {isDayStarted && t.contractorActiveMsg.replace('{position}', String(getQueuePosition()))}
                                                {!isDayStarted && !isDayFinished && t.contractorNotStartedMsg}
                                                {isDayFinished && t.contractorFinishedMsg}
                                            </p>
                                        </div>

                                        <div className="flex gap-2 justify-end border-t border-zinc-900/60 pt-3">
                                            {rescheduleAllowed ? (
                                                <>
                                                    <Button
                                                        onClick={handleCancelAppointment}
                                                        disabled={booking}
                                                        className="bg-transparent border border-zinc-800 hover:border-zinc-700 text-rose-400 hover:text-rose-300 text-xs font-bold h-8 px-3 rounded-lg cursor-pointer"
                                                    >
                                                        {t.cancelApptBtn}
                                                    </Button>
                                                    <Button
                                                        onClick={() => setAppointment(null)} // resets view to scheduler mode
                                                        disabled={booking}
                                                        className="bg-purple-900/40 hover:bg-purple-800/40 text-purple-450 hover:text-purple-300 text-xs font-bold h-8 px-3.5 rounded-lg border border-purple-800/45 cursor-pointer"
                                                    >
                                                        {t.rescheduleBtn}
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="w-full text-left text-xxs text-zinc-500 italic mt-1 space-y-1">
                                                    {campaign.allow_reschedule === false && (
                                                        <div className="flex items-center gap-1 text-amber-500/70 font-semibold">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            <span>{t.reschedulingDisabledDesc}</span>
                                                        </div>
                                                    )}
                                                    {isCutoffActive && (
                                                        <div className="flex items-center gap-1 text-amber-550 text-amber-500/70 font-semibold">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{t.cutoffPassedDesc.replace('{hours}', String(campaign.reschedule_cutoff_hours))}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-xs">
                                        
                                        {/* Date Selector */}
                                        <div className="space-y-2">
                                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t.chooseDateLabel}</Label>
                                            {dates.length === 0 ? (
                                                <p className="text-xs italic text-zinc-500 py-2">
                                                    {t.noDateAvail}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {dates.map(date => {
                                                        const dateObj = new Date(date + 'T00:00:00')
                                                        const formattedDate = dateObj.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                                        const isSelected = selectedDate === date
                                                        return (
                                                            <button
                                                                key={date}
                                                                type="button"
                                                                disabled={isDeadlinePassed}
                                                                onClick={() => {
                                                                    setSelectedDate(date)
                                                                    setSelectedSlot('')
                                                                }}
                                                                className={`py-2 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                                    isSelected 
                                                                        ? 'bg-purple-950/30 border-purple-500 text-white' 
                                                                        : 'bg-[#121318]/50 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                                                                } ${isDeadlinePassed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                {formattedDate}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Slot Selector */}
                                        {selectedDate && (
                                            <div className="space-y-2 border-t border-zinc-900 pt-3 animate-fade-in">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                                                    {t.chooseSlotLabel.replace('{duration}', String(totalDuration))}
                                                </Label>
                                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                    {(availableSlots[selectedDate] || []).map(slot => {
                                                        const isSelected = selectedSlot === slot
                                                        return (
                                                            <button
                                                                key={slot}
                                                                type="button"
                                                                disabled={isDeadlinePassed}
                                                                onClick={() => setSelectedSlot(slot)}
                                                                className={`py-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                                                                    isSelected 
                                                                        ? 'bg-purple-600 border-purple-500 text-white shadow' 
                                                                        : 'bg-[#121318] border-zinc-850 hover:border-zinc-800 text-zinc-350'
                                                                } ${isDeadlinePassed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                {slot}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reserve Action Button */}
                                        {selectedDate && selectedSlot && (
                                            <div className="flex justify-end border-t border-zinc-900 pt-3">
                                                <Button
                                                    onClick={handleBookAppointment}
                                                    disabled={booking || isDeadlinePassed}
                                                    className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02] text-xs"
                                                >
                                                    {booking ? t.bookingProgress : <><Check className="h-4 w-4" /> {t.confirmApptBtn}</>}
                                                </Button>
                                            </div>
                                        )}

                                    </div>
                                )}
                                
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                            <CardContent className="p-6 text-center text-zinc-500 text-xs">
                                <XCircle className="h-5 w-5 text-zinc-605 mx-auto mb-2" />
                                {participation === 'not_interested' ? t.optOutMsg : t.optOutCompletedElsewhereMsg}
                            </CardContent>
                        </Card>
                    )}
                    </div>
                </div>

            <ConfirmationDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                title={t.confirmPrefTitle}
                description={t.confirmPrefDesc}
                confirmText={t.confirmBtn}
                cancelText={t.cancelBtn}
                onConfirm={handleConfirmSaveParticipation}
                loading={saving}
                variant="info"
            />
        </div>
    )
}
