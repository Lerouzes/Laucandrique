// @ts-nocheck
// src/components/features/maintenance/ContractorDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { 
    saveMaintenanceReportAction, 
    getContractorDashboardAction, 
    setContractorDayStatusAction,
    verifyContractorPasswordAction,
    updateAppointmentTeamAction
} from '@/actions/maintenance'
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
    HardHat,
    Loader2,
    LogOut,
    Users
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
    
    // Login and session states
    const [loggedInMember, setLoggedInMember] = useState<any | null>(null)
    const [loginMemberId, setLoginMemberId] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [loggingIn, setLoggingIn] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    // Owner specific tab state: 'appointments' or 'campaigns'
    const [activeOwnerTab, setActiveOwnerTab] = useState<'appointments' | 'campaigns'>('appointments')

    // Selected date state for Owner (employee / team leader are locked to today)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const appts = initialDetails.appointments || []
        if (appts.length > 0) return appts[0].appointment_date
        return new Date().toLocaleDateString('en-CA')
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

    // Check session on mount
    useEffect(() => {
        const stored = sessionStorage.getItem(`contractor_member_${token}`)
        if (stored) {
            try {
                setLoggedInMember(JSON.parse(stored))
            } catch (e) {
                console.error("Failed to parse stored member session", e)
            }
        }
        setCheckingSession(false)
    }, [token])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!loginMemberId || !loginPassword.trim()) return

        setLoggingIn(true)
        try {
            const member = await verifyContractorPasswordAction(token, loginMemberId, loginPassword)
            sessionStorage.setItem(`contractor_member_${token}`, JSON.stringify(member))
            setLoggedInMember(member)
            toast.success(`Bienvenue ${member.name}!`)
        } catch (err: any) {
            toast.error(err.message || "Mot de passe incorrect ou erreur d'authentification.")
        } finally {
            setLoggingIn(false)
        }
    }

    const handleLogout = () => {
        sessionStorage.removeItem(`contractor_member_${token}`)
        setLoggedInMember(null)
        setLoginMemberId('')
        setLoginPassword('')
        toast.success("Déconnexion réussie.")
    }

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

    // Determine the actual selected date based on user role (Locked to today for employees and team leaders)
    const todayStr = new Date().toLocaleDateString('en-CA')
    const actualSelectedDate = loggedInMember?.role === 'owner' ? selectedDate : todayStr

    // Filter appointments for the selected date and role constraints
    const dailyAppointments = appointments.filter((a: any) => {
        if (a.appointment_date !== actualSelectedDate) return false
        if (loggedInMember?.role === 'employee') {
            return a.team === loggedInMember.team
        }
        return true
    })

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
            await setContractorDayStatusAction(token, campaignId, actualSelectedDate, newStatus)
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
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40'
            case 'absent':
                return 'bg-amber-500/20 text-amber-400 border-amber-800/40'
            case 'refused_access':
                return 'bg-rose-500/20 text-rose-400 border-rose-905/40'
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

    if (checkingSession) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0e12]">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        )
    }

    // Login Wall
    if (!loggedInMember) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0e12] px-4 py-12">
                <div className="max-w-md w-full space-y-6 bg-[#16171e]/80 border border-zinc-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="h-12 w-12 rounded-2xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center">
                            <HardHat className="h-6 w-6 text-purple-400" />
                        </div>
                        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Portail Entrepreneur</h2>
                        <p className="text-xxs text-zinc-400 mt-1">
                            Sélectionnez votre profil et entrez votre mot de passe pour accéder au tableau de bord.
                        </p>
                    </div>

                    {details.members?.length === 0 ? (
                        <div className="text-center py-5 text-xxs text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-xl font-medium space-y-2">
                            <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
                            <p>Aucun membre n'est configuré pour cet entrepreneur.</p>
                            <p className="text-[10px] text-zinc-500">Veuillez demander à un administrateur Gustav de créer un membre.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-4 text-xxs">
                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 uppercase font-bold text-[8px] tracking-wider">Profil Membre</Label>
                                <select
                                    value={loginMemberId}
                                    onChange={e => setLoginMemberId(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-zinc-850 bg-zinc-950 px-3 text-zinc-200 focus:outline-none focus:border-purple-500 text-xxs cursor-pointer"
                                    required
                                >
                                    <option value="">Sélectionnez votre profil...</option>
                                    {details.members?.map((m: any) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.role === 'owner' ? 'Propriétaire' : m.role === 'team_leader' ? 'Chef d\'équipe' : 'Employé'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 uppercase font-bold text-[8px] tracking-wider">Mot de passe</Label>
                                <Input
                                    type="password"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    placeholder="Entrez votre mot de passe"
                                    className="h-10 rounded-xl border-zinc-850 bg-zinc-950 text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500 text-xxs"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loggingIn}
                                className="w-full bg-purple-650 hover:bg-purple-750 text-white font-bold h-10 rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2"
                            >
                                {loggingIn ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Se connecter
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl w-full space-y-6 text-xxs px-2">
            
            {/* Branding Header */}
            <div className="flex justify-between items-center bg-[#16171e]/70 border border-zinc-800/80 p-5 rounded-2xl shadow-xl flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center">
                        <HardHat className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Gustav Contractor Portal</h1>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Entreprise: <strong className="text-zinc-200">{contractorName}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-850 px-3 py-1.5 rounded-xl text-xxs">
                    <div className="text-right">
                        <span className="font-extrabold text-zinc-200 block">{loggedInMember.name}</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">
                            {loggedInMember.role === 'owner' ? 'Propriétaire' : loggedInMember.role === 'team_leader' ? 'Chef d\'équipe' : 'Employé'}
                            {loggedInMember.team && ` (${loggedInMember.team === 'team_1' ? 'Équipe 1' : 'Équipe 2'})`}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Se déconnecter"
                        className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-rose-455 transition-colors cursor-pointer"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Owner Tab Switcher */}
            {loggedInMember.role === 'owner' && (
                <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-850">
                    <button
                        type="button"
                        onClick={() => setActiveOwnerTab('appointments')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xxs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            activeOwnerTab === 'appointments'
                                ? 'bg-purple-650 text-white shadow'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        Interventions
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveOwnerTab('campaigns')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xxs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            activeOwnerTab === 'campaigns'
                                ? 'bg-purple-650 text-white shadow'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Campagnes & Historique
                    </button>
                </div>
            )}

            {/* Render Campaigns Tab for Owner */}
            {loggedInMember.role === 'owner' && activeOwnerTab === 'campaigns' ? (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                        Campagnes assignées ({details.campaigns?.length || 0})
                    </h3>
                    {(!details.campaigns || details.campaigns.length === 0) ? (
                        <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                            <CardContent className="p-8 text-center text-xxs text-zinc-500">
                                Aucune campagne assignée.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {details.campaigns.map((c: any) => {
                                const cAppts = appointments.filter((a: any) => a.campaign_id === c.id)
                                const totalAppts = cAppts.length
                                const completedAppts = cAppts.filter((a: any) => a.status === 'completed').length
                                const absentAppts = cAppts.filter((a: any) => a.status === 'absent').length
                                const refusedAppts = cAppts.filter((a: any) => a.status === 'refused_access').length
                                const pct = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0

                                return (
                                    <Card key={c.id} className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                                        <CardContent className="p-4 space-y-3 text-xxs">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-extrabold text-white text-xs">{c.name}</h4>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                                        Client: <strong>{c.clients?.company_name || c.clients?.full_name || '—'}</strong>
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={`text-[7px] font-extrabold uppercase px-1.5 py-0 ${
                                                    c.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-800/40' : 'bg-emerald-500/20 text-emerald-450 border-emerald-800/40'
                                                }`}>
                                                    {c.status === 'completed' ? 'Terminée' : 'Active'}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 border-t border-zinc-900 pt-2.5">
                                                <div>
                                                    <span className="text-zinc-500 uppercase font-bold text-[8px] block">Période</span>
                                                    <span>
                                                        {c.start_date ? new Date(c.start_date).toLocaleDateString('fr-CA') : '—'}
                                                        {c.end_date ? ` au ${new Date(c.end_date).toLocaleDateString('fr-CA')}` : ''}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 uppercase font-bold text-[8px] block">Progression</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="font-bold text-white shrink-0">{pct}% ({completedAppts}/{totalAppts})</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-zinc-950/30 p-2 rounded-xl">
                                                <div>
                                                    <span className="text-zinc-500 text-[8px] uppercase block font-bold">Effectués</span>
                                                    <span className="font-bold text-emerald-400">{completedAppts}</span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 text-[8px] uppercase block font-bold">Absents</span>
                                                    <span className="font-bold text-amber-400">{absentAppts}</span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 text-[8px] uppercase block font-bold">Refusés</span>
                                                    <span className="font-bold text-rose-455">{refusedAppts}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Regular Appointments View Mode */
                <>
                    {/* View Mode Switcher (only for Owner) */}
                    {loggedInMember.role === 'owner' && (
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
                    )}

                    {viewMode === 'list' ? (
                        <>
                            {/* Date Selection Bar (only for Owner) */}
                            {loggedInMember.role === 'owner' && (
                                <div className="space-y-1.5 pl-1">
                                    <Label className="text-zinc-500 uppercase font-bold text-[8px] tracking-wider block">Calendrier d'intervention</Label>
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
                            )}

                            {/* Daily Progress Action Bar */}
                            {dailyAppointments.length > 0 && campaignsOnSelectedDate.map(camp => {
                                const progressRecord = (details.progress || []).find(
                                    (p: any) => p.campaign_id === camp.id && p.date === actualSelectedDate
                                )
                                const status = progressRecord?.status || 'not_started'

                                return (
                                    <Card key={camp.id} className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                                    status === 'started' 
                                                        ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' 
                                                        : status === 'finished' 
                                                        ? 'bg-zinc-850/50 text-zinc-500 border border-zinc-800' 
                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-800/30'
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
                                                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 mr-2 flex items-center gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                            En cours
                                                        </span>
                                                        <Button
                                                            onClick={() => handleUpdateDayStatus(camp.id, 'finished')}
                                                            className="bg-red-650 hover:bg-red-755 text-white font-bold h-8 px-4 rounded-xl cursor-pointer text-xxs flex items-center gap-1.5 border border-red-500/30"
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
                                <div className="flex items-center justify-between pl-1 flex-wrap gap-2">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        {loggedInMember.role === 'owner' ? `Interventions du ${new Date(actualSelectedDate + 'T00:00:00').toLocaleDateString('fr-CA', { month: 'long', day: 'numeric' })} (${dailyAppointments.length})` : `Vos interventions aujourd'hui (${dailyAppointments.length})`}
                                    </h3>
                                    {loggedInMember.role !== 'owner' && (
                                        <span className="text-[9px] text-zinc-500 font-bold font-mono uppercase bg-zinc-950/30 px-2.5 py-1 rounded-lg border border-zinc-850">
                                            {new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>

                                {dailyAppointments.length === 0 ? (
                                    <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                                        <CardContent className="p-8 text-center text-xxs text-zinc-500">
                                            Aucun passage prévu pour aujourd'hui.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {dailyAppointments.map(appt => (
                                            <Card key={appt.id} className="bg-[#16171e]/70 border-zinc-850 shadow-md hover:border-zinc-800 transition-all text-xxs">
                                                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-extrabold text-white text-xs block">Unit {appt.door?.door_number || appt.door_number}</span>
                                                            <Badge variant="outline" className={`text-[7px] font-extrabold uppercase px-1.5 py-0 ${getStatusBadge(appt.status)}`}>
                                                                {getStatusLabel(appt.status)}
                                                            </Badge>
                                                            {appt.team && (
                                                                <Badge variant="outline" className="text-[7px] font-extrabold uppercase px-1.5 py-0 bg-blue-950/30 text-blue-400 border-blue-900/50">
                                                                    {appt.team === 'team_1' ? 'Équipe 1' : 'Équipe 2'}
                                                                </Badge>
                                                            )}
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
                                                            <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2">
                                                                <User className="h-3.5 w-3.5 text-zinc-500" />
                                                                <span>Contact: <strong>{appt.contact_name} ({appt.contact_phone})</strong></span>
                                                            </div>
                                                        </div>

                                                        {appt.resident_notes && (
                                                            <p className="text-[10px] italic text-amber-400 bg-amber-950/10 border border-amber-900/30 p-2 rounded-lg mt-1 font-medium max-w-xl">
                                                                * Consigne résident : {appt.resident_notes}
                                                            </p>
                                                        )}

                                                        {/* Team Assignment Dropdown for Owner or Team Leader */}
                                                        {(loggedInMember.role === 'owner' || loggedInMember.role === 'team_leader') && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Assigner l'équipe :</span>
                                                                <select
                                                                    value={appt.team || ''}
                                                                    onChange={async (e) => {
                                                                        const newTeam = e.target.value || null
                                                                        try {
                                                                            await updateAppointmentTeamAction(appt.id, newTeam)
                                                                            toast.success("Équipe mise à jour.")
                                                                            // Update state locally
                                                                            setDetails((prev: any) => ({
                                                                                ...prev,
                                                                                appointments: prev.appointments.map((a: any) =>
                                                                                    a.id === appt.id ? { ...a, team: newTeam } : a
                                                                                )
                                                                            }))
                                                                        } catch (err: any) {
                                                                            toast.error(err.message)
                                                                        }
                                                                    }}
                                                                    className="text-[9px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200 focus:border-purple-500 focus:outline-none cursor-pointer"
                                                                >
                                                                    <option value="">Non assignée</option>
                                                                    <option value="team_1">Équipe 1</option>
                                                                    <option value="team_2">Équipe 2</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="self-center sm:self-auto flex items-center shrink-0">
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
                        /* Calendar View Mode (Only Owner reaches here) */
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
                </>
            )}

            {/* Report Form Modal */}
            {activeAppt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                            <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                Fiche d'intervention - Unité {activeAppt.door?.door_number || activeAppt.door_number}
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
                                                    ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400' 
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
                                                    ? 'bg-amber-950/30 border-amber-500 text-amber-400' 
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
                                                    ? 'bg-rose-950/30 border-rose-500 text-rose-400' 
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
                                                    ? 'bg-blue-950/30 border-blue-500 text-blue-400' 
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
