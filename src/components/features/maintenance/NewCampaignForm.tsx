// @ts-nocheck
// src/components/features/maintenance/NewCampaignForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaignAction } from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
    Calendar, 
    Save, 
    Check, 
    Clock, 
    Settings, 
    Activity, 
    Hammer, 
    Building2,
    Users
} from 'lucide-react'
import { toast } from 'sonner'

export function NewCampaignForm({ 
    clients, 
    contractors, 
    services 
}: { 
    clients: Array<{ id: string; company_name: string | null; full_name: string }>
    contractors: Array<{ id: string; full_name: string }>
    services: any[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Main campaign state
    const [clientId, setClientId] = useState(clients[0]?.id || '')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10))
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10))
    const [contractorId, setContractorId] = useState(contractors[0]?.id || '')
    const [minParticipation, setMinParticipation] = useState('0')
    const [isMandatory, setIsMandatory] = useState(true)
    const [pricingType, setPricingType] = useState<'hidden' | 'visible' | 'free'>('free')
    const [selectedServices, setSelectedServices] = useState<string[]>([])

    // Availability settings state
    const [workStart, setWorkStart] = useState('08:00')
    const [workEnd, setWorkEnd] = useState('17:00')
    const [techsCount, setTechsCount] = useState('1')
    const [buffer, setBuffer] = useState('10')

    const handleServiceToggle = (sid: string) => {
        setSelectedServices(prev => 
            prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
        )
    }

    // Calculated total duration for information purposes
    const totalDuration = selectedServices.reduce((acc, sid) => {
        const svc = services.find(s => s.id === sid)
        return acc + (svc ? svc.duration : 0)
    }, 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!clientId) {
            toast.error("Veuillez sélectionner un syndicat.")
            return
        }
        if (!name.trim()) {
            toast.error("Veuillez saisir le nom de la campagne.")
            return
        }
        if (selectedServices.length === 0) {
            toast.error("Veuillez sélectionner au moins un service pour la campagne.")
            return
        }

        const start = new Date(startDate)
        const end = new Date(endDate)
        if (start > end) {
            toast.error("La date de début ne peut pas être postérieure à la date de fin.")
            return
        }

        setLoading(true)
        try {
            const campaign = await createCampaignAction({
                client_id: clientId,
                name: name.trim(),
                description: description.trim() || null,
                start_date: startDate,
                end_date: endDate,
                contractor_id: contractorId || null,
                min_participation: Number(minParticipation),
                is_mandatory: isMandatory,
                pricing_type: pricingType,
                services: selectedServices,
                availability_settings: {
                    workingHours: { start: workStart, end: workEnd },
                    techniciansCount: Number(techsCount),
                    bufferMinutes: Number(buffer),
                    breakPeriods: [{ start: '12:00', end: '13:00' }] // default lunch break
                }
            })

            toast.success("Campagne de maintenance créée avec succès.")
            router.push(`/maintenance-hub/campaigns/${campaign.id}`)
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de la création : " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 text-xxs">
            {/* Section 1: Campaign Configuration */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Building2 className="h-4 w-4" />
                        Configuration générale
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Copropriété / Syndicat *</Label>
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none h-8 text-xxs font-semibold cursor-pointer"
                            >
                                <option value="">Sélectionner un syndicat...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.company_name || c.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Intitulé de la campagne *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Inspection plomberie annuelle 2026"
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-zinc-500 uppercase font-bold text-[8px]">Description de la campagne</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Informations transmises aux résidents concernant les interventions..."
                            rows={3}
                            className="bg-[#121318] border-zinc-850 text-xxs text-white py-1.5"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Date de début *</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Date de fin *</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Contracteur assigné</Label>
                            <select
                                value={contractorId}
                                onChange={(e) => setContractorId(e.target.value)}
                                className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none h-8 text-xxs font-semibold cursor-pointer"
                            >
                                <option value="">Sélectionner un contracteur...</option>
                                {contractors.map(c => (
                                    <option key={c.id} value={c.id}>{c.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-900 pt-3">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Participation</Label>
                            <select
                                value={isMandatory ? 'mandatory' : 'optional'}
                                onChange={(e) => setIsMandatory(e.target.value === 'mandatory')}
                                className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none h-8 text-xxs font-semibold cursor-pointer"
                            >
                                <option value="mandatory">Obligatoire (Mandatory)</option>
                                <option value="optional">Optionnelle (Optional)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Affichage des prix aux résidents</Label>
                            <select
                                value={pricingType}
                                onChange={(e) => setPricingType(e.target.value as any)}
                                className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none h-8 text-xxs font-semibold cursor-pointer"
                            >
                                <option value="free">Gratuit / Inclus</option>
                                <option value="visible">Visible</option>
                                <option value="hidden">Masqué</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Participation minimale requise (Unités)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={minParticipation}
                                onChange={(e) => setMinParticipation(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Services Library Selection */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Hammer className="h-4 w-4" />
                        Services à inclure
                    </CardTitle>
                    {totalDuration > 0 && (
                        <Badge variant="outline" className="text-[7.5px] font-extrabold uppercase bg-purple-950/20 text-purple-300 border-purple-800/40 py-0.5 px-2">
                            Durée totale estimée : {totalDuration} min
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="pt-4">
                    {services.length === 0 ? (
                        <p className="text-xxs italic text-zinc-500 py-4 text-center">
                            Aucun service configuré dans la bibliothèque. Créez-en d'abord.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                            {services.map(svc => {
                                const isChecked = selectedServices.includes(svc.id)
                                return (
                                    <div 
                                        key={svc.id} 
                                        onClick={() => handleServiceToggle(svc.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                            isChecked 
                                                ? 'bg-purple-950/10 border-purple-900/40 text-white' 
                                                : 'bg-[#121318]/50 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                                        }`}
                                    >
                                        <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                            isChecked 
                                                ? 'bg-purple-600 border-purple-500 text-white' 
                                                : 'border-zinc-700'
                                        }`}>
                                            {isChecked && <Check className="h-3 w-3" />}
                                        </div>
                                        <div className="space-y-1">
                                            <span className={`font-semibold block ${isChecked ? 'text-zinc-200' : 'text-zinc-400'}`}>
                                                {svc.name}
                                            </span>
                                            <div className="flex items-center gap-2 text-[8px] text-zinc-500 font-medium">
                                                <Badge variant="outline" className="text-[7px] border-zinc-800/50">
                                                    {svc.category}
                                                </Badge>
                                                <span className="flex items-center gap-0.5">
                                                    <Clock className="h-2.5 w-2.5" /> {svc.duration} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Section 3: Scheduling Settings */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Settings className="h-4 w-4" />
                        Planification & Capacité
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Début de journée</Label>
                            <Input
                                type="time"
                                value={workStart}
                                onChange={(e) => setWorkStart(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Fin de journée</Label>
                            <Input
                                type="time"
                                value={workEnd}
                                onChange={(e) => setWorkEnd(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Techniciens (Équipes)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={techsCount}
                                onChange={(e) => setTechsCount(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 uppercase font-bold text-[8px]">Marge de sécurité (min)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={buffer}
                                onChange={(e) => setBuffer(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-white"
                            />
                        </div>
                    </div>
                    
                    <p className="text-[9px] text-zinc-500 italic mt-2 font-medium">
                        * Note : Une pause déjeuner est automatiquement configurée par défaut de 12:00 à 13:00 pour toutes les équipes.
                    </p>
                </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 pt-2">
                <Button
                    type="button"
                    onClick={() => router.push('/maintenance-hub')}
                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-9 px-6 rounded-xl hover:bg-zinc-900 cursor-pointer"
                >
                    Annuler
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xxs h-9 px-6 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                    {loading ? 'Enregistrement...' : <><Save className="h-4 w-4" /> Créer la Campagne</>}
                </Button>
            </div>
        </form>
    )
}
