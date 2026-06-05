// @ts-nocheck
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
    Send
} from 'lucide-react'
import { toast } from 'sonner'

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
    const { unit, resident, appointment: initialAppointment, client, services } = details
    const campaign = unit.campaign

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

    // Option lists
    const dates = Object.keys(availableSlots).sort()

    const handleSaveParticipation = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!contactName.trim()) {
            toast.error("Veuillez renseigner le nom de la personne contact.")
            return
        }

        setSaving(true)
        try {
            await submitParticipationAction(token, participation as any, {
                contact_name: contactName.trim(),
                contact_email: contactEmail.trim(),
                contact_phone: contactPhone.trim(),
                resident_notes: residentNotes.trim()
            })

            toast.success("Votre choix de participation a été enregistré.")
            
            if (participation === 'not_interested' || participation === 'completed_elsewhere') {
                setAppointment(null)
            }
        } catch (err) {
            toast.error("Erreur lors de la mise à jour: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const handleBookAppointment = async () => {
        if (!selectedDate || !selectedSlot) {
            toast.error("Veuillez sélectionner une date et une plage horaire.")
            return
        }

        setBooking(true)
        try {
            const appt = await scheduleAppointmentAction(
                token, 
                selectedDate, 
                selectedSlot, 
                totalDuration
            )
            setAppointment(appt)
            setParticipation('interested')
            
            // Reload available slots
            const freshSlots = await getAvailableTimeSlotsAction(campaign.id, totalDuration)
            setAvailableSlots(freshSlots)
            
            toast.success("Votre rendez-vous a été planifié avec succès!")
            setSelectedDate('')
            setSelectedSlot('')
        } catch (err) {
            toast.error("Erreur lors de la réservation: " + (err as Error).message)
        } finally {
            setBooking(false)
        }
    }

    const handleCancelAppointment = async () => {
        if (!confirm("Voulez-vous vraiment annuler votre rendez-vous ?")) return
        setBooking(true)
        try {
            await cancelAppointmentAction(token)
            setAppointment(null)
            
            // Reload slots
            const freshSlots = await getAvailableTimeSlotsAction(campaign.id, totalDuration)
            setAvailableSlots(freshSlots)
            
            toast.success("Votre rendez-vous a été annulé.")
        } catch (err) {
            toast.error("Erreur lors de l'annulation: " + (err as Error).message)
        } finally {
            setBooking(false)
        }
    }

    const isParticipating = participation === 'interested' || participation === 'pending' || participation === 'more_info'

    return (
        <div className="max-w-2xl w-full space-y-6 text-xxs">
            
            {/* Branding Header */}
            <div className="text-center space-y-1">
                <div className="inline-flex h-9 w-9 rounded-xl bg-purple-900/30 border border-purple-800/40 items-center justify-center">
                    <Wrench className="h-5 w-5 text-purple-400" />
                </div>
                <h1 className="text-base font-extrabold text-white uppercase tracking-wider mt-2">Gustav Portal Résident</h1>
                <p className="text-[10px] text-zinc-400">
                    Espace sécurisé de planification et d'intervention pour les copropriétaires.
                </p>
            </div>

            {/* Campaign Summary Card */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-purple-400" />
                        {client?.company_name || client?.full_name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                    <div className="space-y-1">
                        <span className="font-extrabold text-zinc-200 block text-xxs uppercase">{campaign.name}</span>
                        {campaign.description && (
                            <p className="text-zinc-400 leading-relaxed text-[10px]">{campaign.description}</p>
                        )}
                    </div>
                    
                    <div className="border-t border-zinc-900 pt-3">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                            Prestations prévues dans votre unité ({unit.door?.door_number})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {services.map(s => (
                                <div key={s.id} className="p-2 bg-zinc-950/40 border border-zinc-850 rounded-xl flex justify-between items-center text-zinc-300">
                                    <span className="font-semibold">{s.name}</span>
                                    <span className="font-mono text-zinc-500 text-[8px] flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {s.duration} min</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Participation Form */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-450 text-purple-400">
                        <User className="h-4 w-4" />
                        1. Participation & Contact
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleSaveParticipation} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Votre statut de participation</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setParticipation('interested')}
                                    className={`py-2 px-3 rounded-xl border font-bold text-xxs transition-all cursor-pointer ${
                                        participation === 'interested' 
                                            ? 'bg-purple-950/30 border-purple-500 text-white' 
                                            : 'bg-zinc-900/35 border-zinc-855 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    Je souhaite participer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setParticipation('not_interested')}
                                    className={`py-2 px-3 rounded-xl border font-bold text-xxs transition-all cursor-pointer ${
                                        participation === 'not_interested' 
                                            ? 'bg-rose-950/30 border-rose-500 text-white' 
                                            : 'bg-zinc-900/35 border-zinc-855 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    Je refuse / Pas intéressé
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setParticipation('completed_elsewhere')}
                                    className={`py-2 px-3 rounded-xl border font-bold text-xxs transition-all cursor-pointer ${
                                        participation === 'completed_elsewhere' 
                                            ? 'bg-blue-950/30 border-blue-500 text-white' 
                                            : 'bg-zinc-900/35 border-zinc-855 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    Déjà effectué moi-même
                                </button>
                            </div>
                        </div>

                        {/* Contact details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-900 pt-3">
                            <div className="space-y-1.5">
                                <Label className="text-zinc-500 uppercase font-bold text-[8px]">Personne contact sur place *</Label>
                                <Input
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    className="bg-[#121318] border-zinc-850 h-8 text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-zinc-500 uppercase font-bold text-[8px]">Courriel de contact</Label>
                                <Input
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className="bg-[#121318] border-zinc-850 h-8 text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-zinc-500 uppercase font-bold text-[8px]">Téléphone de contact</Label>
                                <Input
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className="bg-[#121318] border-zinc-850 h-8 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Note ou consigne pour le technicien</Label>
                            <Textarea
                                value={residentNotes}
                                onChange={(e) => setResidentNotes(e.target.value)}
                                placeholder="Code d'accès, présence d'un animal domestique, contrainte particulière..."
                                rows={2}
                                className="bg-[#121318] border-zinc-850 text-white py-1.5"
                            />
                        </div>

                        <div className="flex justify-end pt-1">
                            <Button
                                type="submit"
                                disabled={saving}
                                className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-5 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                                {saving ? 'Enregistrement...' : <><Send className="h-3.5 w-3.5" /> Enregistrer mes préférences</>}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Appointment Booking Panel */}
            {isParticipating && (
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                        <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                            <Calendar className="h-4 w-4" />
                            2. Planification du rendez-vous
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        
                        {/* Currently scheduled appointment details */}
                        {appointment ? (
                            <div className="p-4 bg-emerald-950/10 border border-emerald-900/40 rounded-xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-emerald-450 text-emerald-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <span className="font-extrabold text-zinc-100 text-xxs block">Rendez-vous planifié !</span>
                                        <p className="text-[10px] text-zinc-400">
                                            Votre passage est planifié pour le <strong className="text-zinc-200">{new Date(appointment.appointment_date).toLocaleDateString('fr-CA')}</strong> de <strong className="text-zinc-200">{appointment.start_time.substring(0, 5)}</strong> à <strong className="text-zinc-200">{appointment.end_time.substring(0, 5)}</strong>.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end border-t border-zinc-900/60 pt-3">
                                    <Button
                                        onClick={handleCancelAppointment}
                                        disabled={booking}
                                        className="bg-transparent border border-zinc-800 text-rose-400 text-[9px] font-bold h-7 px-3 rounded-lg hover:bg-rose-950/10 cursor-pointer"
                                    >
                                        Annuler le rendez-vous
                                    </Button>
                                    <Button
                                        onClick={() => setAppointment(null)} // resets view to scheduler mode
                                        disabled={booking}
                                        className="bg-purple-900/40 hover:bg-purple-800/40 text-purple-400 text-[9px] font-bold h-7 px-3.5 rounded-lg border border-purple-800/45 cursor-pointer"
                                    >
                                        Reprogrammer / Modifier
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                
                                {/* Date Selector */}
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-500 uppercase font-bold text-[8px]">Choisissez une date de passage</Label>
                                    {dates.length === 0 ? (
                                        <p className="text-xxs italic text-zinc-500 py-2">
                                            Aucune date de passage n'est disponible. Veuillez contacter l'administrateur.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {dates.map(date => {
                                                const dateObj = new Date(date + 'T00:00:00')
                                                const formattedDate = dateObj.toLocaleDateString('fr-CA', { weekday: 'short', month: 'short', day: 'numeric' })
                                                const isSelected = selectedDate === date
                                                return (
                                                    <button
                                                        key={date}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDate(date)
                                                            setSelectedSlot('')
                                                        }}
                                                        className={`py-1.5 px-3 rounded-xl border text-xxs font-bold transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-purple-950/30 border-purple-500 text-white' 
                                                                : 'bg-[#121318]/50 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                                                        }`}
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
                                    <div className="space-y-1.5 border-t border-zinc-900 pt-3 animate-fade-in">
                                        <Label className="text-zinc-500 uppercase font-bold text-[8px]">Sélectionnez une plage horaire ({totalDuration} min requis)</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            {(availableSlots[selectedDate] || []).map(slot => {
                                                const isSelected = selectedSlot === slot
                                                return (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={`py-1.5 rounded-lg border text-xxs font-mono font-bold transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-purple-600 border-purple-500 text-white shadow' 
                                                                : 'bg-[#121318] border-zinc-850 hover:border-zinc-800 text-zinc-300'
                                                        }`}
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
                                            disabled={booking}
                                            className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold h-8 px-6 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                                        >
                                            {booking ? 'Réservation...' : <><Check className="h-4 w-4" /> Confirmer mon rendez-vous</>}
                                        </Button>
                                    </div>
                                )}

                            </div>
                        )}
                        
                    </CardContent>
                </Card>
            )}

        </div>
    )
}
