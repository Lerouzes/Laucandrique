// @ts-nocheck
// src/components/features/maintenance/ServicesLibrary.tsx
'use client'

import { useState } from 'react'
import { saveServiceAction, deleteServiceAction } from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { 
    Search, 
    Plus, 
    Edit, 
    Trash2, 
    Clock, 
    DollarSign, 
    Check, 
    Camera, 
    FileText,
    Activity,
    SlidersHorizontal,
    PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = [
    'Plumbing',
    'Windows',
    'Patio Doors',
    'Screens',
    'Ventilation',
    'Electrical',
    'Safety',
    'Building',
    'Administrative'
]

export function ServicesLibrary({ 
    initialServices, 
    contractors 
}: { 
    initialServices: any[]
    contractors: Array<{ id: string; full_name: string }>
}) {
    const [services, setServices] = useState<any[]>(initialServices)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    
    // Form/Modal states
    const [showForm, setShowForm] = useState(false)
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [duration, setDuration] = useState('20')
    const [price, setPrice] = useState('0')
    const [category, setCategory] = useState('Plumbing')
    const [photosRequired, setPhotosRequired] = useState(false)
    const [reportRequired, setReportRequired] = useState(false)
    const [defaultContractorId, setDefaultContractorId] = useState('')
    const [saving, setSaving] = useState(false)

    const handleEdit = (svc: any) => {
        setEditingServiceId(svc.id)
        setName(svc.name)
        setDescription(svc.description || '')
        setDuration(String(svc.duration))
        setPrice(String(svc.price || 0))
        setCategory(svc.category)
        setPhotosRequired(!!svc.photos_required)
        setReportRequired(!!svc.report_required)
        setDefaultContractorId(svc.default_contractor_id || '')
        setShowForm(true)
    }

    const resetForm = () => {
        setEditingServiceId(null)
        setName('')
        setDescription('')
        setDuration('20')
        setPrice('0')
        setCategory('Plumbing')
        setPhotosRequired(false)
        setReportRequired(false)
        setDefaultContractorId('')
        setShowForm(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error("Veuillez saisir le nom du service.")
            return
        }

        const durNum = Number(duration)
        if (isNaN(durNum) || durNum <= 0) {
            toast.error("Veuillez saisir une durée valide en minutes.")
            return
        }

        setSaving(true)
        try {
            const res = await saveServiceAction({
                id: editingServiceId || undefined,
                name: name.trim(),
                description: description.trim() || null,
                duration: durNum,
                price: price ? Number(price) : null,
                category,
                photos_required: photosRequired,
                report_required: reportRequired,
                default_contractor_id: defaultContractorId || null
            })

            toast.success(editingServiceId ? "Service mis à jour avec succès." : "Service créé avec succès.")
            
            // Refresh state
            if (editingServiceId) {
                setServices(prev => prev.map(s => s.id === editingServiceId ? { ...res, contractors: contractors.find(c => c.id === defaultContractorId) } : s))
            } else {
                setServices(prev => [...prev, { ...res, contractors: contractors.find(c => c.id === defaultContractorId) }])
            }
            resetForm()
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce service ? Cette action est irréversible.")) return
        try {
            await deleteServiceAction(id)
            toast.success("Service supprimé avec succès.")
            setServices(prev => prev.filter(s => s.id !== id))
        } catch (err) {
            toast.error("Erreur lors de la suppression: " + (err as Error).message)
        }
    }

    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="space-y-6 text-xs text-zinc-300">
            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full md:w-auto items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Rechercher un service..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#16171e]/70 border-zinc-850 h-10 text-xs pl-9 text-white focus-visible:ring-purple-650 focus-visible:border-purple-650"
                        />
                    </div>
                    <SearchableSelect
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={[
                            { value: 'All', label: 'Toutes les catégories' },
                            ...CATEGORIES.map(cat => ({ value: cat, label: cat }))
                        ]}
                        placeholder="Catégorie..."
                        searchPlaceholder="Rechercher..."
                        className="h-10 w-52"
                    />
                </div>
                {!showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow cursor-pointer w-full md:w-auto flex items-center gap-1.5"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Ajouter un Service
                    </Button>
                )}
            </div>

            {/* Service Edit / Creation Form Card */}
            {showForm && (
                <Card className="bg-[#16171e]/80 border-purple-900/30 shadow-lg animate-fade-in">
                    <CardHeader className="pb-3 border-b border-zinc-900">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-wider text-purple-400">
                            {editingServiceId ? 'Modifier le Service' : 'Ajouter un Nouveau Service'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit} className="space-y-4 text-xs text-zinc-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Nom du service *</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: Inspection du chauffe-eau"
                                        className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Catégorie</Label>
                                    <SearchableSelect
                                        value={category}
                                        onChange={setCategory}
                                        options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                                        placeholder="Sélectionner une catégorie..."
                                        searchPlaceholder="Rechercher..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Détails de l'intervention, consignes pour le technicien..."
                                    rows={3}
                                    className="bg-[#121318] border-zinc-850 text-xs text-white py-2"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Durée moyenne (minutes) *</Label>
                                    <Input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Tarif estimé ($)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="bg-[#121318] border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Contracteur par défaut</Label>
                                    <SearchableSelect
                                        value={defaultContractorId}
                                        onChange={setDefaultContractorId}
                                        options={[
                                            { value: '', label: 'Aucun (Sélectionner...)' },
                                            ...contractors.map(c => ({ value: c.id, label: c.full_name }))
                                        ]}
                                        placeholder="Aucun"
                                        searchPlaceholder="Rechercher..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-6 items-center p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="photosRequired"
                                        checked={photosRequired}
                                        onChange={(e) => setPhotosRequired(e.target.checked)}
                                        className="h-4 w-4 rounded border-zinc-850 bg-[#121318] text-purple-650 focus:ring-purple-650 cursor-pointer"
                                    />
                                    <Label htmlFor="photosRequired" className="text-xs text-zinc-300 font-semibold cursor-pointer flex items-center gap-1.5">
                                        <Camera className="h-4 w-4 text-zinc-400" />
                                        Photos requises pour la validation
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="reportRequired"
                                        checked={reportRequired}
                                        onChange={(e) => setReportRequired(e.target.checked)}
                                        className="h-4 w-4 rounded border-zinc-850 bg-[#121318] text-purple-650 focus:ring-purple-650 cursor-pointer"
                                    />
                                    <Label htmlFor="reportRequired" className="text-xs text-zinc-300 font-semibold cursor-pointer flex items-center gap-1.5">
                                        <FileText className="h-4 w-4 text-zinc-400" />
                                        Rapport écrit requis
                                    </Label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    onClick={resetForm}
                                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xs font-bold h-10 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                                >
                                    {saving ? 'Enregistrement...' : <><Check className="h-4 w-4" /> Enregistrer</>}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-xs text-zinc-500 bg-zinc-950/20 border border-zinc-900 rounded-xl">
                        Aucun service ne correspond aux critères de recherche.
                    </div>
                ) : (
                    filteredServices.map(svc => (
                        <Card key={svc.id} className="bg-[#16171e]/70 border-zinc-850 hover:border-zinc-800 transition-all text-xs">
                            <CardHeader className="pb-2 flex flex-row justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <Badge variant="outline" className="text-[10px] font-extrabold uppercase px-1.5 py-0 bg-purple-950/20 text-purple-300 border-purple-800/40">
                                        {svc.category}
                                    </Badge>
                                    <CardTitle className="text-sm font-extrabold text-zinc-100 mt-1 block">
                                        {svc.name}
                                    </CardTitle>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(svc)}
                                        className="h-8 w-8 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg cursor-pointer"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(svc.id)}
                                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-2">
                                {svc.description && (
                                    <p className="text-zinc-400 font-medium leading-relaxed italic text-xs">
                                        {svc.description}
                                    </p>
                                )}
                                
                                <div className="grid grid-cols-2 gap-2 text-xs font-medium border-t border-zinc-900 pt-2.5">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Clock className="h-4 w-4 text-zinc-500" />
                                        <span>Durée: <strong>{svc.duration} min</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <DollarSign className="h-4 w-4 text-zinc-500" />
                                        <span>Tarif: <strong>{svc.price > 0 ? `$${svc.price}` : 'Gratuit'}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                                        <Activity className="h-4 w-4 text-zinc-500" />
                                        <span>Défaut: <strong>{svc.contractors?.full_name || 'Non assigné'}</strong></span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    {svc.photos_required && (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-zinc-950/40 text-cyan-400 border-cyan-950/40 flex items-center gap-1">
                                            <Camera className="h-3 w-3" /> Photos
                                        </Badge>
                                    )}
                                    {svc.report_required && (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-zinc-950/40 text-amber-400 border-amber-950/40 flex items-center gap-1">
                                            <FileText className="h-3 w-3" /> Rapport
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
