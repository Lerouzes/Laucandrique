// @ts-nocheck
// src/components/features/maintenance/NewCampaignForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaignAction, getContractorServicesAction, createAndLinkServiceAction, saveServiceAction, upsertContractorServicePricingAction } from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { 
    Calendar, 
    Save, 
    Check, 
    Clock, 
    Settings, 
    Activity, 
    Hammer, 
    Building2,
    Users,
    Search,
    Plus,
    XCircle,
    Edit
} from 'lucide-react'
import { toast } from 'sonner'

export function NewCampaignForm({ 
    clients, 
    contractors, 
    services: initialServices 
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
    const [surveyRequired, setSurveyRequired] = useState(false)

    // Services loading & filtering states
    const [filteredContractorServices, setFilteredContractorServices] = useState<any[]>([])
    const [serviceSearch, setServiceSearch] = useState('')

    // Inline service creation states
    const [showCreateService, setShowCreateService] = useState(false)
    const [newSvcName, setNewSvcName] = useState('')
    const [newSvcCategory, setNewSvcCategory] = useState('Plomberie')
    const [newSvcDuration, setNewSvcDuration] = useState('30')
    const [newSvcPrice, setNewSvcPrice] = useState('')
    const [newSvcDescription, setNewSvcDescription] = useState('')
    const [newSvcPhotosReq, setNewSvcPhotosReq] = useState(false)
    const [newSvcReportReq, setNewSvcReportReq] = useState(false)
    const [creatingService, setCreatingService] = useState(false)

    // Inline service editing states
    const [showEditService, setShowEditService] = useState(false)
    const [editingService, setEditingService] = useState<any>(null)
    const [editSvcName, setEditSvcName] = useState('')
    const [editSvcCategory, setEditSvcCategory] = useState('Plomberie')
    const [editSvcDuration, setEditSvcDuration] = useState('30')
    const [editSvcPrice, setEditSvcPrice] = useState('')
    const [editSvcDescription, setEditSvcDescription] = useState('')
    const [editSvcPhotosReq, setEditSvcPhotosReq] = useState(false)
    const [editSvcReportReq, setEditSvcReportReq] = useState(false)
    const [savingService, setSavingService] = useState(false)

    const handleEditService = (svc: any) => {
        setEditingService(svc)
        setEditSvcName(svc.name)
        setEditSvcCategory(svc.category || 'Plomberie')
        setEditSvcDuration(String(svc.duration))
        setEditSvcPrice(svc.custom_price !== null ? String(svc.custom_price) : String(svc.price || 0))
        setEditSvcDescription(svc.description || '')
        setEditSvcPhotosReq(!!svc.photos_required)
        setEditSvcReportReq(!!svc.report_required)
        setShowEditService(true)
    }

    const handleSaveEditedService = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingService) return

        if (!editSvcName.trim()) {
            toast.error("Veuillez saisir le nom du service.")
            return
        }
        if (!editSvcDuration.trim() || Number(editSvcDuration) <= 0) {
            toast.error("Veuillez saisir une durée valide en minutes.")
            return
        }

        setSavingService(true)
        try {
            // 1. Update global service details
            const updatedSvc = await saveServiceAction({
                id: editingService.id,
                name: editSvcName.trim(),
                description: editSvcDescription.trim() || null,
                duration: Number(editSvcDuration),
                category: editSvcCategory,
                photos_required: editSvcPhotosReq,
                report_required: editSvcReportReq,
                price: editingService.has_custom ? editingService.price : (editSvcPrice ? Number(editSvcPrice) : null)
            })

            // 2. Update contractor custom price override
            let finalCustomPrice = editingService.custom_price
            if (contractorId) {
                const newPriceVal = editSvcPrice ? Number(editSvcPrice) : null
                await upsertContractorServicePricingAction(contractorId, editingService.id, newPriceVal, editingService.pricing_note || '')
                finalCustomPrice = newPriceVal
            }

            toast.success("Service mis à jour avec succès.")

            // Map updated service to match contractor service object structure
            const mappedUpdatedSvc = {
                ...updatedSvc,
                custom_price: finalCustomPrice,
                pricing_note: editingService.pricing_note,
                has_custom: finalCustomPrice !== null,
                pricing_id: editingService.pricing_id
            }

            // Update state
            setFilteredContractorServices(prev => 
                prev.map(s => s.id === editingService.id ? mappedUpdatedSvc : s)
            )

            setShowEditService(false)
            setEditingService(null)
        } catch (err) {
            toast.error("Erreur lors de la modification : " + (err as Error).message)
        } finally {
            setSavingService(false)
        }
    }

    // Availability settings state
    const [workStart, setWorkStart] = useState('08:00')
    const [workEnd, setWorkEnd] = useState('17:00')
    const [techsCount, setTechsCount] = useState('1')
    const [buffer, setBuffer] = useState('10')
    const [breakPeriods, setBreakPeriods] = useState<Array<{ start: string; end: string }>>([
        { start: '12:00', end: '13:00' } // default lunch break
    ])
    const [newBreakStart, setNewBreakStart] = useState('')
    const [newBreakEnd, setNewBreakEnd] = useState('')

    // Fetch contractor services dynamically
    useEffect(() => {
        const fetchServices = async () => {
            if (!contractorId) {
                setFilteredContractorServices([])
                return
            }
            try {
                const res = await getContractorServicesAction(contractorId)
                setFilteredContractorServices(res || [])
            } catch (err) {
                console.error("Error fetching contractor services:", err)
                toast.error("Erreur lors de la récupération des services du contracteur.")
            }
        }
        fetchServices()
    }, [contractorId])

    const handleServiceToggle = (sid: string) => {
        setSelectedServices(prev => 
            prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
        )
    }

    // Filter services based on search
    const displayedServices = filteredContractorServices.filter(svc => 
        svc.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (svc.category && svc.category.toLowerCase().includes(serviceSearch.toLowerCase()))
    )

    // Calculated total duration for information purposes
    const totalDuration = selectedServices.reduce((acc, sid) => {
        const svc = filteredContractorServices.find(s => s.id === sid)
        return acc + (svc ? svc.duration : 0)
    }, 0)

    const handleAddBreak = () => {
        if (!newBreakStart || !newBreakEnd) {
            toast.error("Veuillez saisir une heure de début et de fin.")
            return
        }
        if (newBreakStart >= newBreakEnd) {
            toast.error("L'heure de début doit être antérieure à l'heure de fin.")
            return
        }
        const exists = breakPeriods.some(b => b.start === newBreakStart && b.end === newBreakEnd)
        if (exists) {
            toast.error("Cette plage horaire existe déjà.")
            return
        }
        setBreakPeriods(prev => [...prev, { start: newBreakStart, end: newBreakEnd }].sort((a, b) => a.start.localeCompare(b.start)))
        setNewBreakStart('')
        setNewBreakEnd('')
        toast.success("Plage réservée ajoutée.")
    }

    const handleRemoveBreak = (idx: number) => {
        setBreakPeriods(prev => prev.filter((_, i) => i !== idx))
        toast.success("Plage réservée retirée.")
    }

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!contractorId) {
            toast.error("Veuillez sélectionner un entrepreneur d'abord.")
            return
        }
        if (!newSvcName.trim()) {
            toast.error("Veuillez saisir le nom du service.")
            return
        }
        if (!newSvcDuration.trim() || Number(newSvcDuration) <= 0) {
            toast.error("Veuillez saisir une durée valide en minutes.")
            return
        }

        setCreatingService(true)
        try {
            const newSvc = await createAndLinkServiceAction(contractorId, {
                name: newSvcName.trim(),
                description: newSvcDescription.trim() || null,
                duration: Number(newSvcDuration),
                price: newSvcPrice ? Number(newSvcPrice) : null,
                category: newSvcCategory,
                photos_required: newSvcPhotosReq,
                report_required: newSvcReportReq
            })

            toast.success("Nouveau service créé et associé à l'entrepreneur.")
            
            // Add to list and select it
            setFilteredContractorServices(prev => [...prev, newSvc])
            setSelectedServices(prev => [...prev, newSvc.id])
            
            // Reset fields
            setNewSvcName('')
            setNewSvcPrice('')
            setNewSvcDescription('')
            setNewSvcDuration('30')
            setNewSvcPhotosReq(false)
            setNewSvcReportReq(false)
            setShowCreateService(false)
        } catch (err) {
            toast.error("Erreur lors de la création : " + (err as Error).message)
        } finally {
            setCreatingService(false)
        }
    }

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

        if (!surveyRequired) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            if (start > end) {
                toast.error("La date de début ne peut pas être postérieure à la date de fin.")
                return
            }
        }

        setLoading(true)
        try {
            const campaign = await createCampaignAction({
                client_id: clientId,
                name: name.trim(),
                description: description.trim() || null,
                start_date: surveyRequired ? null : startDate,
                end_date: surveyRequired ? null : endDate,
                contractor_id: contractorId || null,
                min_participation: Number(minParticipation),
                is_mandatory: isMandatory,
                pricing_type: pricingType,
                services: selectedServices,
                survey_required: surveyRequired,
                availability_settings: {
                    workingHours: { start: workStart, end: workEnd },
                    techniciansCount: Number(techsCount),
                    bufferMinutes: Number(buffer),
                    breakPeriods: breakPeriods
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
        <form onSubmit={handleSubmit} className="space-y-6 text-xs text-zinc-300">
            {/* Section 1: Campaign Configuration */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Building2 className="h-4 w-4" />
                        Configuration générale
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Copropriété / Syndicat *</Label>
                            <SearchableSelect
                                value={clientId}
                                onChange={setClientId}
                                options={clients.map(c => ({ value: c.id, label: c.company_name || c.full_name }))}
                                placeholder="Sélectionner un syndicat..."
                                searchPlaceholder="Rechercher un syndicat..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Intitulé de la campagne *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Inspection plomberie annuelle 2026"
                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Description de la campagne</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Informations transmises aux résidents concernant les interventions..."
                            rows={3}
                            className="bg-[#121318] border-zinc-850 text-xs text-white py-2"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {!surveyRequired ? (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date de début *</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date de fin *</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                            </>
                        ) : null}
                        <div className={`space-y-2 ${surveyRequired ? 'sm:col-span-3' : ''}`}>
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Contracteur assigné</Label>
                            <SearchableSelect
                                value={contractorId}
                                onChange={setContractorId}
                                options={[
                                    { value: '', label: 'Aucun (Sélectionner un contracteur...)' },
                                    ...contractors.map(c => ({ value: c.id, label: c.full_name }))
                                ]}
                                placeholder="Sélectionner un contracteur..."
                                searchPlaceholder="Rechercher un contracteur..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-900 pt-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Participation</Label>
                            <SearchableSelect
                                value={isMandatory ? 'mandatory' : 'optional'}
                                onChange={(val) => setIsMandatory(val === 'mandatory')}
                                options={[
                                    { value: 'mandatory', label: 'Obligatoire (Mandatory)' },
                                    { value: 'optional', label: 'Optionnelle (Optional)' }
                                ]}
                                placeholder="Choisir la participation..."
                                searchPlaceholder="Rechercher..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Affichage des prix aux résidents</Label>
                            <SearchableSelect
                                value={pricingType}
                                onChange={(val) => setPricingType(val as any)}
                                options={[
                                    { value: 'free', label: 'Gratuit / Inclus' },
                                    { value: 'visible', label: 'Visible' },
                                    { value: 'hidden', label: 'Masqué' }
                                ]}
                                placeholder="Choisir l'affichage..."
                                searchPlaceholder="Rechercher..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Participation minimale requise (Unités)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={minParticipation}
                                onChange={(e) => setMinParticipation(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-3 border-t border-zinc-900 pt-4">
                        <input
                            type="checkbox"
                            id="surveyRequired"
                            checked={surveyRequired}
                            onChange={(e) => setSurveyRequired(e.target.checked)}
                            className="h-4 w-4 mt-0.5 rounded border-zinc-850 bg-[#121318] text-purple-650 focus:ring-purple-650 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                            <Label htmlFor="surveyRequired" className="text-xs text-zinc-300 font-semibold cursor-pointer flex items-center gap-1.5">
                                Sondage de participation requis (Phase 1)
                            </Label>
                            <p className="text-[10px] text-zinc-500 font-medium">
                                Si coché, les copropriétaires devront d'abord indiquer s'ils sont intéressés avant que la phase de planification (choix des dates et plages horaires) ne soit débloquée.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Services Selection (Contractor Filtered + Search + Create) */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-row justify-between items-center">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Hammer className="h-4 w-4" />
                        Services à inclure
                    </CardTitle>
                    {totalDuration > 0 && (
                        <Badge variant="outline" className="text-xs font-extrabold uppercase bg-purple-950/20 text-purple-300 border-purple-800/40 py-1 px-2.5">
                            Durée totale estimée : {totalDuration} min
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Controls Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                            <Input
                                placeholder="Rechercher un service..."
                                value={serviceSearch}
                                onChange={(e) => setServiceSearch(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xs pl-8 text-white focus-visible:ring-purple-650"
                            />
                        </div>
                        
                        <Button
                            type="button"
                            disabled={!contractorId}
                            onClick={() => setShowCreateService(true)}
                            className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-4 rounded-xl text-xxs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nouveau Service
                        </Button>
                    </div>

                    {/* Inline Create Service Modal */}
                    {showCreateService && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-md w-full">
                                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                        Nouveau service entrepreneur
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <form onSubmit={handleCreateService} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Nom du service *</Label>
                                            <Input
                                                value={newSvcName}
                                                onChange={(e) => setNewSvcName(e.target.value)}
                                                placeholder="Ex: Remplacement chauffe-eau"
                                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Catégorie</Label>
                                                <SearchableSelect
                                                    value={newSvcCategory}
                                                    onChange={setNewSvcCategory}
                                                    options={[
                                                        { value: 'Plomberie', label: 'Plomberie' },
                                                        { value: 'Fenêtres', label: 'Fenêtres' },
                                                        { value: 'Portes patio', label: 'Portes patio' },
                                                        { value: 'Moustiquaires', label: 'Moustiquaires' },
                                                        { value: 'Ventilation', label: 'Ventilation' },
                                                        { value: 'Électricité', label: 'Électricité' },
                                                        { value: 'Sécurité', label: 'Sécurité' },
                                                        { value: 'Balcon', label: 'Bâtiment' },
                                                        { value: 'Administratif', label: 'Administratif' }
                                                    ]}
                                                    placeholder="Sélectionner..."
                                                    searchPlaceholder="Rechercher..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Durée (minutes) *</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={newSvcDuration}
                                                    onChange={(e) => setNewSvcDuration(e.target.value)}
                                                    className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Prix (Optionnel)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={newSvcPrice}
                                                    onChange={(e) => setNewSvcPrice(e.target.value)}
                                                    placeholder="0.00"
                                                    className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 justify-center pt-5">
                                                <label className="flex items-center gap-2 text-xxs font-bold text-zinc-400 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={newSvcPhotosReq}
                                                        onChange={(e) => setNewSvcPhotosReq(e.target.checked)}
                                                        className="h-3.5 w-3.5 accent-purple-650 rounded bg-[#121318] border-zinc-855"
                                                    />
                                                    Photos requises
                                                </label>
                                                <label className="flex items-center gap-2 text-xxs font-bold text-zinc-400 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={newSvcReportReq}
                                                        onChange={(e) => setNewSvcReportReq(e.target.checked)}
                                                        className="h-3.5 w-3.5 accent-purple-650 rounded bg-[#121318] border-zinc-855"
                                                    />
                                                    Rapport requis
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Description</Label>
                                            <Textarea
                                                value={newSvcDescription}
                                                onChange={(e) => setNewSvcDescription(e.target.value)}
                                                placeholder="Description détaillée du service..."
                                                rows={2}
                                                className="bg-[#121318] border-zinc-850 text-xs text-white py-1.5"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                            <Button
                                                type="button"
                                                onClick={() => setShowCreateService(false)}
                                                className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                            >
                                                Fermer
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={creatingService}
                                                className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-5 rounded-xl shadow cursor-pointer text-xxs transition-all"
                                            >
                                                {creatingService ? 'Création...' : 'Créer le service'}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Inline Edit Service Modal */}
                    {showEditService && editingService && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-md w-full animate-fade-in">
                                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">
                                        Modifier le service entrepreneur
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <form onSubmit={handleSaveEditedService} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Nom du service *</Label>
                                            <Input
                                                value={editSvcName}
                                                onChange={(e) => setEditSvcName(e.target.value)}
                                                placeholder="Ex: Remplacement chauffe-eau"
                                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Catégorie</Label>
                                                <SearchableSelect
                                                    value={editSvcCategory}
                                                    onChange={setEditSvcCategory}
                                                    options={[
                                                        { value: 'Plomberie', label: 'Plomberie' },
                                                        { value: 'Fenêtres', label: 'Fenêtres' },
                                                        { value: 'Portes patio', label: 'Portes patio' },
                                                        { value: 'Moustiquaires', label: 'Moustiquaires' },
                                                        { value: 'Ventilation', label: 'Ventilation' },
                                                        { value: 'Électricité', label: 'Électricité' },
                                                        { value: 'Sécurité', label: 'Sécurité' },
                                                        { value: 'Balcon', label: 'Bâtiment' },
                                                        { value: 'Administratif', label: 'Administratif' }
                                                    ]}
                                                    placeholder="Sélectionner..."
                                                    searchPlaceholder="Rechercher..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Durée (minutes) *</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={editSvcDuration}
                                                    onChange={(e) => setEditSvcDuration(e.target.value)}
                                                    className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Prix (Optionnel)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={editSvcPrice}
                                                    onChange={(e) => setEditSvcPrice(e.target.value)}
                                                    placeholder="0.00"
                                                    className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 justify-center pt-5">
                                                <label className="flex items-center gap-2 text-xxs font-bold text-zinc-400 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editSvcPhotosReq}
                                                        onChange={(e) => setEditSvcPhotosReq(e.target.checked)}
                                                        className="h-3.5 w-3.5 accent-purple-650 rounded bg-[#121318] border-zinc-855"
                                                    />
                                                    Photos requises
                                                </label>
                                                <label className="flex items-center gap-2 text-xxs font-bold text-zinc-400 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editSvcReportReq}
                                                        onChange={(e) => setEditSvcReportReq(e.target.checked)}
                                                        className="h-3.5 w-3.5 accent-purple-650 rounded bg-[#121318] border-zinc-855"
                                                    />
                                                    Rapport requis
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Description</Label>
                                            <Textarea
                                                value={editSvcDescription}
                                                onChange={(e) => setEditSvcDescription(e.target.value)}
                                                placeholder="Description détaillée du service..."
                                                rows={2}
                                                className="bg-[#121318] border-zinc-850 text-xs text-white py-1.5"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setShowEditService(false)
                                                    setEditingService(null)
                                                }}
                                                className="bg-transparent border border-zinc-850 text-zinc-400 text-xxs font-bold h-8 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                            >
                                                Annuler
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={savingService}
                                                className="bg-purple-650 hover:bg-purple-700 text-white font-bold h-8 px-5 rounded-xl shadow cursor-pointer text-xxs transition-all"
                                            >
                                                {savingService ? 'Modification...' : 'Modifier le service'}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Services Selection List */}
                    {!contractorId ? (
                        <p className="text-xs italic text-zinc-550 py-4 text-center">
                            Veuillez sélectionner un entrepreneur pour voir ses services.
                        </p>
                    ) : displayedServices.length === 0 ? (
                        <p className="text-xs italic text-zinc-550 py-4 text-center">
                            Aucun service trouvé pour cet entrepreneur.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                            {displayedServices.map(svc => {
                                const isChecked = selectedServices.includes(svc.id)
                                return (
                                    <div 
                                        key={svc.id} 
                                        onClick={() => handleServiceToggle(svc.id)}
                                        className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                            isChecked 
                                                ? 'bg-purple-950/10 border-purple-900/40 text-white' 
                                                : 'bg-[#121318]/50 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                                isChecked 
                                                    ? 'bg-purple-600 border-purple-500 text-white' 
                                                    : 'border-zinc-700'
                                            }`}>
                                                {isChecked && <Check className="h-3 w-3" />}
                                            </div>
                                            <div className="space-y-1 text-left">
                                                <span className={`font-semibold block text-xs ${isChecked ? 'text-zinc-200' : 'text-zinc-400'}`}>
                                                    {svc.name}
                                                </span>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] border-zinc-800/50">
                                                        {svc.category}
                                                    </Badge>
                                                    <span className="flex items-center gap-0.5">
                                                        <Clock className="h-3.5 w-3.5" /> {svc.duration} min
                                                    </span>
                                                    {svc.custom_price !== null && (
                                                        <Badge variant="outline" className="text-[10px] border-purple-800/50 text-purple-400 bg-purple-950/10">
                                                            {svc.custom_price > 0 ? `$${svc.custom_price}` : 'Gratuit'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEditService(svc)
                                            }}
                                            className="h-7 w-7 text-zinc-550 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Section 3: Scheduling Settings (Always available for configuration) */}
            <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Settings className="h-4 w-4" />
                        Planification & Capacité {surveyRequired && "(Phase 2)"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Début de journée</Label>
                            <Input
                                type="time"
                                value={workStart}
                                onChange={(e) => setWorkStart(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Fin de journée</Label>
                            <Input
                                type="time"
                                value={workEnd}
                                onChange={(e) => setWorkEnd(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Techniciens (Capacité simultanée)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={techsCount}
                                onChange={(e) => setTechsCount(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Zone tampon (min)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={buffer}
                                onChange={(e) => setBuffer(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                            />
                        </div>
                    </div>
                    
                    {/* Blocked Hours / Breaks Section */}
                    <div className="border-t border-zinc-900 pt-4 space-y-3">
                        <div className="space-y-0.5">
                            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                                Plages horaires bloquées / réservées (ex: dîner, pauses)
                            </Label>
                            <p className="text-[10px] text-zinc-500 font-medium">
                                Bloquez des plages horaires pour empêcher les résidents de réserver pendant ces périodes.
                            </p>
                        </div>
                        
                        {/* Current list of breaks */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {breakPeriods.length === 0 ? (
                                <p className="text-xxs text-zinc-550 italic">Aucune plage bloquée configurée.</p>
                            ) : (
                                breakPeriods.map((bp, idx) => (
                                    <Badge key={idx} variant="outline" className="flex items-center gap-1.5 bg-zinc-950 text-zinc-300 border-zinc-850 py-1 px-2.5 rounded-lg">
                                        <Clock className="h-3 w-3 text-purple-400" />
                                        <span>{bp.start} - {bp.end}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveBreak(idx)}
                                            className="text-zinc-500 hover:text-red-400 transition-colors focus:outline-none font-bold text-xs"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>

                        {/* Block new break form */}
                        <div className="flex items-center gap-2 max-w-sm pt-1">
                            <Input
                                type="time"
                                value={newBreakStart}
                                onChange={(e) => setNewBreakStart(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                            />
                            <span className="text-zinc-500 text-xxs font-bold">à</span>
                            <Input
                                type="time"
                                value={newBreakEnd}
                                onChange={(e) => setNewBreakEnd(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-8 text-xs text-white"
                            />
                            <Button
                                type="button"
                                onClick={handleAddBreak}
                                className="bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 border border-purple-800/40 h-8 px-3 rounded-lg text-xxs"
                            >
                                Bloquer
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 pt-2">
                <Button
                    type="button"
                    onClick={() => router.push('/maintenance-hub')}
                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xs font-bold h-10 px-6 rounded-xl hover:bg-zinc-900 cursor-pointer"
                >
                    Annuler
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                    {loading ? 'Enregistrement...' : <><Save className="h-4 w-4" /> Créer la Campagne</>}
                </Button>
            </div>
        </form>
    )
}
