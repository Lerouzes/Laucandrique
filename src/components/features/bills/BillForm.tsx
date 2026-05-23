'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, Calendar, User, Save, ArrowLeft, AlertCircle, FileText, MapPin, Mail, Phone, Image as ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createBillAction, updateBillAction } from '@/actions/bills'
import { createClient } from '@/utils/supabase/client'

interface BillFormProps {
    quote: any
    contractors: any[]
    settings: any
    initialBill?: any
    initialBillItems?: any[]
    initialBillImages?: any[]
}

interface BillItemState {
    id: string
    title: string
    description: string
    quantity: number
    unit: string
    unit_cost: number
    total: number
    notes: string
}

export function BillForm({ 
    quote, 
    contractors, 
    settings,
    initialBill,
    initialBillItems,
    initialBillImages
}: BillFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [saveAsDraft, setSaveAsDraft] = useState(initialBill ? initialBill.status === 'draft' : false)
    const submitBtnRef = useRef<HTMLButtonElement>(null)

    // Form fields
    const [title, setTitle] = useState(initialBill ? initialBill.title : (quote.title || `Facture pour ${quote.clients?.full_name || 'Projet'}`))
    const [description, setDescription] = useState(initialBill ? (initialBill.description || '') : (quote.description || ''))
    const [billDate, setBillDate] = useState(() => {
        if (initialBill) {
            return initialBill.bill_date
        }
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    })
    const [contractorId, setContractorId] = useState<string>(initialBill ? (initialBill.contractor_id || '') : (quote.contractor_id || ''))
    const [notes, setNotes] = useState(initialBill ? (initialBill.notes || '') : '')

    const adminPercentage = initialBill ? initialBill.admin_percentage : (quote.admin_percentage ?? settings.default_admin_percentage ?? 10)
    const profitPercentage = initialBill ? initialBill.profit_percentage : (quote.profit_percentage ?? settings.default_profit_percentage ?? 15)
    const gstRate = settings.gst_rate ?? 0.05
    const qstRate = settings.qst_rate ?? 0.09975

    // Initialize items from quote items or initial bill items
    const [items, setItems] = useState<BillItemState[]>(() => {
        if (initialBillItems && initialBillItems.length > 0) {
            return initialBillItems.map(item => ({
                id: item.id || Math.random().toString(),
                title: item.title || '',
                description: item.description || '',
                quantity: Number(item.quantity || 1),
                unit: item.unit || '',
                unit_cost: Number(item.unit_cost || 0),
                total: Number(item.total || 0),
                notes: item.notes || ''
            }))
        }

        if (!quote.quote_items || quote.quote_items.length === 0) {
            if (quote.subtotal && Number(quote.subtotal) > 0) {
                return [{
                    id: Math.random().toString(),
                    title: quote.title || 'Montant global de la soumission',
                    description: quote.description || '',
                    quantity: 1,
                    unit: 'global',
                    unit_cost: Number(quote.subtotal),
                    total: Number(quote.subtotal),
                    notes: ''
                }]
            }
            return [{
                id: Math.random().toString(),
                title: '',
                description: '',
                quantity: 1,
                unit: '',
                unit_cost: 0,
                total: 0,
                notes: ''
            }]
        }
        return quote.quote_items.map((item: any) => ({
            id: item.id || Math.random().toString(),
            title: item.title || '',
            description: item.description || '',
            quantity: Number(item.quantity || 1),
            unit: item.unit || '',
            unit_cost: Number(item.unit_cost || 0),
            total: Number(item.total || 0),
            notes: item.notes || ''
        }))
    })

    // Initialize images
    const [images, setImages] = useState<{ id?: string, file?: File, image_url?: string, caption: string, previewUrl?: string }[]>(() => {
        if (initialBillImages && initialBillImages.length > 0) {
            return initialBillImages.map(img => ({
                id: img.id,
                image_url: img.image_url,
                caption: img.caption || '',
                previewUrl: img.image_url
            }))
        }
        return []
    })

    // Dynamic Calculations
    const { subtotal, adminAmount, profitAmount, gstAmount, qstAmount, total } = useMemo(() => {
        const sub = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
        const admin = sub * (adminPercentage / 100)
        const profit = sub * (profitPercentage / 100)
        const withoutTaxes = sub + admin + profit
        const gst = withoutTaxes * gstRate
        const qst = withoutTaxes * qstRate
        const grandTotal = withoutTaxes + gst + qst

        return {
            subtotal: sub,
            adminAmount: admin,
            profitAmount: profit,
            gstAmount: gst,
            qstAmount: qst,
            total: grandTotal
        }
    }, [items, adminPercentage, profitPercentage, gstRate, qstRate])

    // Handlers
    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: Math.random().toString(),
                title: '',
                description: '',
                quantity: 1,
                unit: '',
                unit_cost: 0,
                total: 0,
                notes: ''
            }
        ])
    }

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id))
    }

    const handleItemChange = (id: string, field: keyof BillItemState, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item
            const updated = { ...item, [field]: value }
            if (field === 'quantity' || field === 'unit_cost') {
                const qty = field === 'quantity' ? Number(value) : item.quantity
                const cost = field === 'unit_cost' ? Number(value) : item.unit_cost
                updated.total = qty * cost
            }
            return updated
        }))
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)
            setImages(prev => [...prev, { file, caption: '', previewUrl }])
        }
        e.target.value = ''
    }

    const removeImage = (index: number) => {
        setImages(prev => {
            const updated = [...prev]
            if (updated[index].previewUrl && !updated[index].image_url) {
                URL.revokeObjectURL(updated[index].previewUrl!)
            }
            updated.splice(index, 1)
            return updated
        })
    }

    const updateImageCaption = (index: number, caption: string) => {
        setImages(prev => prev.map((img, i) => i === index ? { ...img, caption } : img))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        if (!title.trim()) {
            setSubmitError("Le titre de la facture est requis.")
            toast.error("Formulaire incomplet", { description: "Le titre est requis." })
            return
        }

        if (!contractorId) {
            setSubmitError("Vous devez absolument sélectionner un contracteur pour cette facture.")
            toast.error("Sélection requise", { description: "Le contracteur est obligatoire." })
            return
        }

        if (items.length === 0) {
            setSubmitError("La facture doit contenir au moins une ligne d'article.")
            toast.error("Formulaire incomplet", { description: "Veuillez ajouter un article." })
            return
        }

        const emptyItems = items.filter(item => !item.title.trim())
        if (emptyItems.length > 0) {
            setSubmitError("Tous les articles de la facture doivent avoir un titre.")
            toast.error("Titre d'article manquant", { description: "Veuillez spécifier le titre pour tous les articles." })
            return
        }

        startTransition(async () => {
            try {
                const supabase = createClient()
                
                // Upload new images to Supabase storage
                const uploadedImagesData = []
                for (const img of images) {
                    if (img.file) {
                        const fileExt = img.file.name.split('.').pop()
                        const fileName = `${Math.random()}.${fileExt}`
                        const { error: uploadError } = await supabase.storage.from('quote-images').upload(fileName, img.file)

                        if (uploadError) {
                            console.error("Storage upload error:", uploadError)
                            throw uploadError
                        }

                        const { data: publicUrlData } = supabase.storage.from('quote-images').getPublicUrl(fileName)
                        uploadedImagesData.push({
                            image_url: publicUrlData.publicUrl,
                            caption: img.caption,
                        })
                    } else if (img.image_url) {
                        uploadedImagesData.push({
                            image_url: img.image_url,
                            caption: img.caption
                        })
                    }
                }

                const billPayload = {
                    quote_id: quote.id,
                    client_id: quote.client_id,
                    contractor_id: contractorId,
                    bill_date: billDate,
                    title: title.trim(),
                    description: description.trim() || null,
                    notes: notes.trim() || null,
                    subtotal: Number(subtotal.toFixed(2)),
                    admin_percentage: Number(adminPercentage),
                    admin_amount: Number(adminAmount.toFixed(2)),
                    profit_percentage: Number(profitPercentage),
                    profit_amount: Number(profitAmount.toFixed(2)),
                    gst_amount: Number(gstAmount.toFixed(2)),
                    qst_amount: Number(qstAmount.toFixed(2)),
                    total: Number(total.toFixed(2)),
                    status: saveAsDraft ? 'draft' : 'sent'
                }

                let result;
                if (initialBill) {
                    result = await updateBillAction(initialBill.id, billPayload, items, uploadedImagesData)
                } else {
                    result = await createBillAction(billPayload, items, uploadedImagesData)
                }

                if (result.success) {
                    toast.success(initialBill ? "Facture mise à jour avec succès." : "Facture créée avec succès et soumission mise à jour.")
                    router.push(`/bills/${initialBill ? initialBill.id : (result as any).billId}`)
                }
            } catch (err: any) {
                console.error(err)
                setSubmitError(err.message || "Une erreur est survenue lors de l'enregistrement de la facture.")
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16">
            <div className="flex items-center justify-between">
                <Link href={initialBill ? `/bills/${initialBill.id}` : `/quotes/${quote.id}`} className="inline-flex items-center text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {initialBill ? "Retour aux détails" : "Retour à la soumission"}
                </Link>
                <Badge className="bg-purple-900/60 text-purple-300 border border-purple-800">
                    Soumission #{quote.quote_number}
                </Badge>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                        {initialBill ? "Modifier la Facture" : "Facturation du Projet"}
                    </h2>
                    <p className="text-sm text-zinc-400">
                        {initialBill ? "Ajustez les détails, articles ou images de cette facture." : "Confirmez, modifiez ou ajoutez des éléments pour finaliser la facture."}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            setSaveAsDraft(true)
                            setTimeout(() => {
                                submitBtnRef.current?.click()
                            }, 50)
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4 text-purple-400" />
                        Sauvegarder en brouillon
                    </Button>
                    <Button 
                        type="button" 
                        disabled={isPending} 
                        onClick={() => {
                            setSaveAsDraft(false)
                            setTimeout(() => {
                                submitBtnRef.current?.click()
                            }, 50)
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {initialBill ? 'Mettre à jour & Finaliser' : 'Confirmer et Facturer'}
                    </Button>
                    <button type="submit" ref={submitBtnRef} className="hidden" />
                </div>
            </div>

            {submitError && (
                <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Erreur de validation</p>
                        <p>{submitError}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* General Information */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base">Informations de Facturation</CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Informations de base pour cette facture.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-zinc-300">Titre de la Facture</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Facture finale - Peinture salon"
                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-zinc-300">Description / Détails</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Notes de description générale..."
                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-purple-600 focus:ring-purple-600 min-h-[80px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="billDate" className="text-zinc-300 flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4 text-purple-400" />
                                        Date de Facturation
                                    </Label>
                                    <Input
                                        id="billDate"
                                        type="date"
                                        value={billDate}
                                        onChange={(e) => setBillDate(e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contractor" className="text-zinc-300 flex items-center gap-1.5">
                                        <User className="h-4 w-4 text-purple-400" />
                                        Contracteur Référent <span className="text-rose-500">*</span>
                                    </Label>
                                    <Select 
                                        value={contractorId} 
                                        onValueChange={(val) => setContractorId(val || '')}
                                    >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-purple-600">
                                            <SelectValue placeholder="Sélectionner un contracteur...">
                                                {contractors.find(c => c.id === contractorId)?.full_name || ''}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                            {contractors.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="hover:bg-zinc-800 focus:bg-zinc-800">
                                                    {c.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items Confirmation */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle className="text-zinc-100 text-base">Éléments de la Facture</CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    Validez ou ajustez les coûts et quantités.
                                </CardDescription>
                            </div>
                            <Button 
                                type="button" 
                                onClick={handleAddItem}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-8 flex items-center gap-1"
                            >
                                <Plus className="h-3.5 w-3.5 text-purple-400" />
                                Ajouter un article
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 text-xxs font-bold uppercase tracking-wider">
                                            <th className="pb-3 pr-2 w-[35%]">Description / Article</th>
                                            <th className="pb-3 px-2 w-[15%]">Quantité</th>
                                            <th className="pb-3 px-2 w-[12%]">Unité</th>
                                            <th className="pb-3 px-2 w-[18%]">Coût Unitaire</th>
                                            <th className="pb-3 px-2 text-right w-[15%]">Total</th>
                                            <th className="pb-3 pl-2 w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {items.map((item) => (
                                            <tr key={item.id} className="group/row">
                                                <td className="py-3 pr-2 space-y-1">
                                                    <Input
                                                        value={item.title}
                                                        onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                                                        placeholder="Titre de l'élément"
                                                        className="bg-zinc-950 border-zinc-850 text-xs text-zinc-100 h-8"
                                                    />
                                                    <Input
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                        placeholder="Notes additionnelles ou description"
                                                        className="bg-zinc-950/50 border-zinc-900 text-xxs text-zinc-400 h-7"
                                                    />
                                                </td>
                                                <td className="py-3 px-2">
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="bg-zinc-950 border-zinc-850 text-xs text-zinc-100 h-8"
                                                    />
                                                </td>
                                                <td className="py-3 px-2">
                                                    <Input
                                                        value={item.unit}
                                                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                                        placeholder="m², hrs"
                                                        className="bg-zinc-950 border-zinc-850 text-xs text-zinc-100 h-8 text-center"
                                                    />
                                                </td>
                                                <td className="py-3 px-2">
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">$</span>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            value={item.unit_cost === 0 ? '' : item.unit_cost}
                                                            onChange={(e) => handleItemChange(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                            className="bg-zinc-950 border-zinc-850 text-xs text-zinc-100 h-8 pl-6"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-right text-xs font-bold text-zinc-200">
                                                    ${(item.quantity * item.unit_cost).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 pl-2 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg opacity-0 group-hover/row:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Photos Upload Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-purple-400" />
                                Photos de la Facture / Projet
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Ajoutez des images de référence ou des justificatifs de travaux pour cette facture.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Grid of uploaded images */}
                            {images.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 relative group">
                                            <div className="h-40 w-full relative">
                                                <img 
                                                    src={img.previewUrl || img.image_url} 
                                                    alt="Aperçu" 
                                                    className="w-full h-full object-cover" 
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="p-2 bg-zinc-900 border-t border-zinc-800">
                                                <Input
                                                    placeholder="Légende de la photo..."
                                                    value={img.caption}
                                                    onChange={(e) => updateImageCaption(index, e.target.value)}
                                                    className="bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-200"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Drop area / click to upload */}
                            <div className="flex items-center justify-center w-full">
                                <label 
                                    htmlFor="bill-image-upload" 
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-lg cursor-pointer bg-zinc-950 hover:bg-zinc-900/50 hover:border-purple-800/80 transition-colors"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ImageIcon className="w-8 h-8 mb-2 text-zinc-500" />
                                        <p className="mb-1 text-xs text-zinc-400 font-semibold">Cliquez pour ajouter une photo</p>
                                        <p className="text-xxs text-zinc-500">PNG, JPG ou WEBP</p>
                                    </div>
                                    <input 
                                        id="bill-image-upload" 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleImageChange} 
                                    />
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Totals Summary */}
                <div className="space-y-6">
                    {/* Client Details Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-zinc-100 text-sm font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 text-purple-400" />
                                Informations Client
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-3 text-zinc-300">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-zinc-100 text-sm">{quote.clients?.full_name || 'N/A'}</span>
                                {quote.clients?.company_name && (
                                    <span className="text-purple-400 font-medium">{quote.clients.company_name}</span>
                                )}
                            </div>
                            <div className="border-t border-zinc-800/80 my-2 pt-2.5 space-y-2 text-zinc-400">
                                {quote.clients?.address && (
                                    <p className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                        <span>{quote.clients.address} {quote.clients.city || ''}</span>
                                    </p>
                                )}
                                {quote.clients?.email && (
                                    <p className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                        <span className="truncate">{quote.clients.email}</span>
                                    </p>
                                )}
                                {quote.clients?.phone && (
                                    <p className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                        <span>{quote.clients.phone}</span>
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base">Récapitulatif Financier</CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Calcul des montants avec taxes et frais.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Chantier (Travail)</span>
                                    <span>${subtotal.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Marge Administration ({adminPercentage}%)</span>
                                    <span>${adminAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Marge Profit ({profitPercentage}%)</span>
                                    <span>${profitAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                
                                <div className="border-t border-zinc-800 my-2 pt-2 flex justify-between font-semibold text-zinc-200">
                                    <span>Sous-total</span>
                                    <span>${(subtotal + adminAmount + profitAmount).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                
                                <div className="flex justify-between text-zinc-400 text-xs">
                                    <span>TPS ({(gstRate * 100).toFixed(1)}%)</span>
                                    <span>${gstAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400 text-xs">
                                    <span>TVQ ({(qstRate * 100).toFixed(3)}%)</span>
                                    <span>${qstAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 pt-4">
                                <div className="bg-purple-950/20 border border-purple-900/40 p-4 rounded-xl flex flex-col gap-1">
                                    <span className="text-xxs font-bold text-purple-400 uppercase tracking-wider">Total Facturé</span>
                                    <span className="text-2xl font-extrabold text-zinc-100">
                                        ${total.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Place for notes */}
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="notes" className="text-zinc-300 flex items-center gap-1.5 text-xs font-semibold">
                                    <FileText className="h-4 w-4 text-purple-400" />
                                    Notes Internes / Facturation
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ajouter des notes internes sur la facture (ex: modalités de paiement, ajustements)..."
                                    className="bg-zinc-950 border-zinc-800 text-xs text-zinc-200 focus:border-purple-600 focus:ring-purple-600 min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </form>
    )
}
