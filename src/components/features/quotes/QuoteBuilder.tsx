'use client'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { useState, useEffect, useRef, useTransition } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2, Image as ImageIcon, ChevronsUpDown, ChevronDown, Download, CheckCircle, XCircle, Send, CalendarCheck2, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createQuoteAction, updateQuoteAction, updateQuoteStatus, revertQuoteToPending, markQuoteAsSent } from '@/actions/quotes'
import { createClient } from '@/utils/supabase/client'
import { getClients } from '@/actions/clients'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { markProjectCompletedByQuote } from '@/actions/projects'
import { downloadQuotePDF } from '@/utils/pdf'

const quoteItemSchema = z.object({
    title: z.string().min(1, 'Titre requis'),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01),
    unit: z.string().optional(),
    unit_cost: z.coerce.number().min(0),
    image_urls: z.array(z.string()).default([]),
})

const quoteSchema = z.object({
    client_id: z.string().min(1, 'Client requis'),
    project_type: z.enum(['interior','exterior']).default('interior'),
    contractor_id: z.string().optional(),
    title: z.string().min(1, 'Titre requis'),
    description: z.string().optional(),
    internal_notes: z.string().optional(),
    estimated_duration_days: z.coerce.number().positive(),
    duration_unit: z.enum(['days', 'hours']).default('days'),
    duration_value: z.coerce.number().positive(),
    admin_percentage: z.coerce.number().min(0).max(100),
    profit_percentage: z.coerce.number().min(0).max(100),
    work_types: z.array(z.string()).default([]),
    hide_duration: z.boolean().default(false),
    items: z.array(quoteItemSchema).min(1, 'Au moins un item est requis'),
})

type QuoteFormValues = z.infer<typeof quoteSchema>

export function QuoteBuilder({ clients, contractors, settings, initialQuote }: { clients: any[], contractors: any[], settings: any, initialQuote?: any }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const supabase = createClient()
    const isEditing = !!initialQuote

    // Custom states for images (skip react-hook-form generic file handling for simplicity)
    const [images, setImages] = useState<{ file: File, caption: string, previewUrl: string }[]>([])
    const [clientSearch, setClientSearch] = useState('')
    const [clientsList, setClientsList] = useState(clients)
    const [isSearchingClients, setIsSearchingClients] = useState(false)
    const [clientPopoverOpen, setClientPopoverOpen] = useState(false)
    const [showAdditionalInfo, setShowAdditionalInfo] = useState(initialQuote?.work_types && initialQuote.work_types.length > 0)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleStatusChange = (status: 'approved' | 'denied') => {
        if (!initialQuote) return
        startTransition(async () => {
            try {
                await updateQuoteStatus(initialQuote.id, status, initialQuote.client_id, initialQuote.title, initialQuote.estimated_duration_days)
                toast.success(`Soumission ${status === 'approved' ? 'approuvée' : 'refusée'}.`)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur de mise à jour", { description: err.message })
            }
        })
    }

    const handleMarkAsSent = () => {
        if (!initialQuote) return
        startTransition(async () => {
            try {
                await markQuoteAsSent(initialQuote.id)
                toast.success('Soumission marquée comme envoyée.')
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const handleMarkProjectCompleted = () => {
        if (!initialQuote) return
        startTransition(async () => {
            try {
                await markProjectCompletedByQuote(initialQuote.id)
                toast.success('Projet marqué comme complété.')
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const handleRevertToDraft = () => {
        if (!initialQuote) return
        startTransition(async () => {
            try {
                await revertQuoteToPending(initialQuote.id)
                toast.success("Soumission repassée en brouillon. Le projet associé a été supprimé.")
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    const generatePDF = async () => {
        if (!initialQuote) return
        try {
            setIsGenerating(true)
            await downloadQuotePDF(initialQuote, settings)
        } finally {
            setIsGenerating(false)
        }
    }

    const linkedProject = initialQuote?.projects && Array.isArray(initialQuote.projects) ? initialQuote.projects[0] : null
    const isProjectCompleted = linkedProject?.status === 'completed'
    const displayStatus = isProjectCompleted && initialQuote?.status === 'approved' ? 'completed' : initialQuote?.status

    const initialDurationDays = Number(initialQuote?.estimated_duration_days || 1)
    const initialDurationUnit: 'days' | 'hours' = initialDurationDays > 0 && initialDurationDays < 1 ? 'hours' : 'days'
    const initialDurationValue = initialDurationUnit === 'hours' ? Math.round(initialDurationDays * 24 * 100) / 100 : initialDurationDays

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteSchema),
        mode: 'onChange',
        defaultValues: {
            client_id: initialQuote?.client_id || '',
            contractor_id: initialQuote?.contractor_id || 'none',
            project_type: initialQuote?.project_type || 'interior',
            title: initialQuote?.title || '',
            description: initialQuote?.description || '',
            internal_notes: initialQuote?.internal_notes || '',
            estimated_duration_days: initialDurationDays,
            duration_unit: initialDurationUnit,
            duration_value: initialDurationValue,
            admin_percentage: initialQuote?.admin_percentage ?? (settings?.default_admin_percentage || 10),
            profit_percentage: initialQuote?.profit_percentage ?? (settings?.default_profit_percentage || 15),
            work_types: initialQuote?.work_types || [],
            hide_duration: initialQuote?.hide_duration || false,
            items: initialQuote?.quote_items?.length
                ? initialQuote.quote_items.map((i: any) => ({
                    title: i.title || i.description || '',
                    description: i.title ? i.description || '' : '',
                    quantity: i.quantity,
                    unit: i.unit || '',
                    unit_cost: i.unit_cost,
                    image_urls: i.image_urls || [],
                }))
                : (initialQuote?.subtotal && initialQuote.subtotal > 0)
                    ? [{ title: 'Montant forfaitaire importé', description: '', quantity: 1, unit: 'u', unit_cost: initialQuote.subtotal, image_urls: [] }]
                    : (initialQuote?.total && initialQuote.total > 0)
                        ? [{ title: 'Montant forfaitaire importé', description: '', quantity: 1, unit: 'u', unit_cost: initialQuote.total, image_urls: [] }]
                        : [{ title: '', description: '', quantity: 1, unit: 'h', unit_cost: 0, image_urls: [] }],
        },
    })

    // Destructure for dynamic calculations
    const { fields: items, append, remove } = useFieldArray({
        name: 'items',
        control: form.control,
    })

    // useWatch gives per-field subscriptions that reliably trigger re-renders
    const watchItems = useWatch({ control: form.control, name: 'items' }) || []
    const adminPerc = useWatch({ control: form.control, name: 'admin_percentage' }) || 0
    const profitPerc = useWatch({ control: form.control, name: 'profit_percentage' }) || 0


    useEffect(() => {
        if (!clientSearch.trim()) {
            setClientsList(clients)
            return
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearchingClients(true)
            try {
                const res = await getClients(clientSearch)
                setClientsList(res)
            } catch (err) {
                console.error("Error searching clients:", err)
            } finally {
                setIsSearchingClients(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounce)
    }, [clientSearch, clients])

    const selectedClientId = form.watch('client_id')
    const selectedClient = clientsList.find((c: any) => String(c.id) === String(selectedClientId)) || clients.find((c: any) => String(c.id) === String(selectedClientId))
    
    const selectedContractorName = form.watch('contractor_id') && form.watch('contractor_id') !== 'none'
        ? contractors.find((c: any) => String(c.id) === String(form.watch('contractor_id')))?.full_name
        : ''

    const handleItemImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `item-${Math.random()}.${fileExt}`
            
            toast.promise(
                (async () => {
                    const { error: uploadError } = await supabase.storage.from('quote-images').upload(fileName, file)
                    if (uploadError) throw uploadError
                    
                    const { data: publicUrlData } = supabase.storage.from('quote-images').getPublicUrl(fileName)
                    const currentUrls = form.getValues(`items.${index}.image_urls`) || []
                    form.setValue(`items.${index}.image_urls`, [...currentUrls, publicUrlData.publicUrl], { shouldDirty: true })
                })(),
                {
                    loading: 'Téléchargement de l\'image...',
                    success: 'Image ajoutée avec succès!',
                    error: 'Erreur lors du téléchargement'
                }
            )
        }
        e.target.value = ''
    }

    // Compute totals inline (no memo) — always fresh on every render
    const subtotal = watchItems.reduce((acc: number, item: any) => {
        const q = typeof item?.quantity === 'number' ? item.quantity : parseFloat(item?.quantity) || 0
        const c = typeof item?.unit_cost === 'number' ? item.unit_cost : parseFloat(item?.unit_cost) || 0
        return acc + q * c
    }, 0)
    const admin_amount = subtotal * ((+adminPerc) / 100)
    const subtotalWithAdmin = subtotal + admin_amount
    const profit_amount = subtotalWithAdmin * ((+profitPerc) / 100)
    const totalWithoutTaxes = subtotal + admin_amount + profit_amount
    const gst_amount = totalWithoutTaxes * (settings?.gst_rate || 0.05)
    const qst_amount = totalWithoutTaxes * (settings?.qst_rate || 0.09975)
    const total = totalWithoutTaxes + gst_amount + qst_amount
    const calculatedTotals = { subtotal, admin_amount, profit_amount, gst_amount, qst_amount, total }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)
            setImages([...images, { file, caption: '', previewUrl }])
        }
        e.target.value = ''
    }

    const removeImage = (index: number) => {
        const newImages = [...images]
        URL.revokeObjectURL(newImages[index].previewUrl)
        newImages.splice(index, 1)
        setImages(newImages)
    }

    const updateImageCaption = (index: number, caption: string) => {
        const newImages = [...images]
        newImages[index].caption = caption
        setImages(newImages)
    }

    async function onSubmit(data: QuoteFormValues) {
        startTransition(async () => {
            try {
                // Upload new images
                const uploadedImagesData = []
                for (const img of images) {
                    const fileExt = img.file.name.split('.').pop()
                    const fileName = `${Math.random()}.${fileExt}`
                    const { error: uploadError } = await supabase.storage.from('quote-images').upload(fileName, img.file)

                    if (!uploadError) {
                        const { data: publicUrlData } = supabase.storage.from('quote-images').getPublicUrl(fileName)
                        uploadedImagesData.push({
                            image_url: publicUrlData.publicUrl,
                            caption: img.caption,
                        })
                    }
                }

                const itemsWithTotals = data.items.map(item => ({
                    ...item,
                    total: item.quantity * item.unit_cost
                }))

                const finalQuoteData = {
                    client_id: data.client_id,
                    contractor_id: data.contractor_id && data.contractor_id !== 'none' ? data.contractor_id : null,
                    title: data.title,
                    description: data.description,
                    internal_notes: data.internal_notes,
                    estimated_duration_days: data.duration_unit === 'hours'
                        ? Number(data.duration_value) / 24
                        : Number(data.duration_value),
                    project_type: data.project_type,
                    admin_percentage: data.admin_percentage,
                    profit_percentage: data.profit_percentage,
                    work_types: data.work_types,
                    hide_duration: data.hide_duration,
                    ...calculatedTotals
                }

                if (isEditing) {
                    // In edit mode: keep existing images, add new uploads on top
                    await updateQuoteAction(initialQuote.id, finalQuoteData, itemsWithTotals, uploadedImagesData, true)
                    toast.success("Soumission mise à jour avec succès")
                    router.refresh()
                } else {
                    const result = await createQuoteAction(finalQuoteData, itemsWithTotals, uploadedImagesData)
                    toast.success("Soumission créée avec succès")
                    router.push(`/quotes/${result.id}/edit`)
                    router.refresh()
                }
            } catch (error: any) {
                toast.error(isEditing ? "Erreur lors de la mise à jour" : "Erreur lors de la création", { description: error.message })
            }
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-12">
                {initialQuote && (
                    <div className="flex flex-col gap-4 border border-zinc-800 bg-zinc-900/50 p-4 rounded-xl mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-zinc-400">Statut actuel :</span>
                                <div className="flex gap-2 text-sm text-zinc-400">
                                    {displayStatus === 'draft' && <Badge className="bg-zinc-850 text-zinc-300 border border-zinc-700">Brouillon</Badge>}
                                    {displayStatus === 'sent' && <Badge className="bg-blue-900/40 text-blue-300 border-blue-800 border">Envoyée</Badge>}
                                    {displayStatus === 'approved' && <Badge className="bg-green-900/40 text-green-300 border-green-800 border">Approuvée</Badge>}
                                    {displayStatus === 'completed' && <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-800 border">Complétée</Badge>}
                                    {displayStatus === 'denied' && <Badge className="bg-red-900/40 text-red-300 border-red-800 border">Refusée</Badge>}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button 
                                type="button"
                                onClick={generatePDF} 
                                disabled={isGenerating} 
                                className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 h-9"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Génération...' : 'Télécharger PDF'}
                            </Button>

                            <Link href={`/quotes/${initialQuote.id}`} className="group/button inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100">
                                <Eye className="mr-2 h-4 w-4" />
                                Voir la soumission
                            </Link>

                            {initialQuote.status === 'draft' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleMarkAsSent}
                                    disabled={isPending}
                                    className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 h-9"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    Marquer envoyée
                                </Button>
                            )}

                            {(initialQuote.status === 'sent' || initialQuote.status === 'denied') && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleStatusChange('approved')}
                                        disabled={isPending}
                                        className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100 h-9"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approuver le projet
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleStatusChange('denied')}
                                        disabled={isPending}
                                        className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 h-9"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Refuser
                                    </Button>
                                </>
                            )}

                            {(initialQuote.status === 'approved' || initialQuote.status === 'sent' || initialQuote.status === 'denied' || initialQuote.status === 'completed') && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRevertToDraft}
                                    disabled={isPending}
                                    className="border-yellow-800 bg-yellow-950/20 text-yellow-400 hover:bg-yellow-900/50 hover:text-yellow-300 h-9"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Repasser en brouillon
                                </Button>
                            )}

                            {initialQuote.status === 'approved' && !isProjectCompleted && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push(`/planification?query=${encodeURIComponent(String(initialQuote.quote_number || ''))}`)}
                                        className="border-cyan-800 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/50 hover:text-cyan-200 h-9"
                                    >
                                        Planifier la date
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleMarkProjectCompleted}
                                        disabled={isPending}
                                        className="border-emerald-800 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200 h-9"
                                    >
                                        <CalendarCheck2 className="mr-2 h-4 w-4" />
                                        Marquer job complété
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-zinc-800 bg-zinc-900">
                            <CardHeader>
                                <CardTitle className="text-lg text-zinc-100">Informations Générales</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Titre du projet</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Rénovation cuisine" {...field} className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 text-zinc-100" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="client_id"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-zinc-300">Client</FormLabel>
                                            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={clientPopoverOpen}
                                                            className="w-full justify-between bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 font-normal h-10"
                                                        >
                                                            <span className="truncate">
                                                                {selectedClient
                                                                    ? `${selectedClient.full_name}${selectedClient.company_name ? ` - ${selectedClient.company_name}` : ''}`
                                                                    : 'Sélectionner un client'}
                                                            </span>
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-zinc-800 bg-zinc-900" align="start">
                                                    <div className="p-2 border-b border-zinc-800">
                                                        <Input
                                                            placeholder="Rechercher un client (SDC #, nom, compagnie)..."
                                                            value={clientSearch}
                                                            onChange={(e) => setClientSearch(e.target.value)}
                                                            className="h-9 bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700 text-sm text-zinc-100"
                                                        />
                                                    </div>
                                                    <ScrollArea className="h-60">
                                                        <div className="p-1 space-y-1">
                                                            {isSearchingClients ? (
                                                                <div className="px-2 py-4 text-sm text-zinc-500 text-center">Recherche...</div>
                                                            ) : clientsList.length === 0 ? (
                                                                <div className="px-2 py-4 text-sm text-zinc-500 text-center">Aucun client trouvé.</div>
                                                            ) : (
                                                                clientsList.map((c) => (
                                                                    <button
                                                                        key={c.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            field.onChange(String(c.id))
                                                                            setClientPopoverOpen(false)
                                                                        }}
                                                                        className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors hover:bg-zinc-800 hover:text-zinc-100 flex flex-col ${
                                                                            String(field.value) === String(c.id) ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300'
                                                                        }`}
                                                                    >
                                                                        <span className="font-medium">{c.full_name}</span>
                                                                        {(c.company_name || c.email) && (
                                                                            <span className="text-xs text-zinc-500 truncate">
                                                                                {c.company_name || ''}{c.company_name && c.email ? ' | ' : ''}{c.email || ''}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contractor_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-300">Contracteur (optionnel)</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 text-zinc-100">
                                                            <SelectValue placeholder="Aucun contracteur">{selectedContractorName || 'Aucun contracteur'}</SelectValue>
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                                        <SelectItem value="none">Aucun</SelectItem>
                                                        {contractors.map(c => (
                                                            <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-2">
                                        <FormLabel className="text-zinc-300">Durée estimée</FormLabel>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                step="0.25"
                                                min="0.25"
                                                value={form.watch('duration_value') ?? 1}
                                                onChange={(e) => form.setValue('duration_value', Number(e.target.value || 0), { shouldValidate: true })}
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 text-zinc-100"
                                            />
                                            <Select value={form.watch('duration_unit') || 'days'} onValueChange={(v) => form.setValue('duration_unit', v as any, { shouldValidate: true })}>
                                                <SelectTrigger className="w-32 bg-zinc-950 border-zinc-800 text-zinc-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    <SelectItem value="days">Jours</SelectItem>
                                                    <SelectItem value="hours">Heures</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="hide_duration"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-zinc-800 p-4 bg-zinc-950/40">
                                            <FormControl>
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-zinc-600 focus:ring-zinc-600 focus:ring-offset-zinc-900 cursor-pointer"
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-zinc-300 font-normal cursor-pointer">
                                                    Masquer la durée estimée sur le PDF final
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="project_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Type de projet</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'interior'}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 text-zinc-100">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    <SelectItem value="interior">Intérieur</SelectItem>
                                                    <SelectItem value="exterior">Extérieur</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Description pour le client</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Détails du projet affichés sur le PDF..." {...field} className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 min-h-[100px] text-zinc-100" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Collapsible Additional Info / Work Types section */}
                        <Card className="border-zinc-800 bg-zinc-900">
                            <CardHeader 
                                className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none" 
                                onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
                            >
                                <div className="space-y-0.5">
                                    <CardTitle className="text-lg text-zinc-100">Informations Additionnelles</CardTitle>
                                    <p className="text-xs text-zinc-400">Spécifier le type de travaux (optionnel)</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100">
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdditionalInfo ? 'rotate-180' : ''}`} />
                                </Button>
                            </CardHeader>
                            {showAdditionalInfo && (
                                <CardContent className="space-y-4 pt-2 border-t border-zinc-800/50">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-300">Type de travaux</label>
                                        <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                            {settings?.work_types_options?.map((option: string) => {
                                                const currentWorkTypes = form.watch('work_types') || []
                                                const isChecked = currentWorkTypes.includes(option)
                                                return (
                                                    <label key={option} className="flex items-center space-x-3 text-sm text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    form.setValue('work_types', [...currentWorkTypes, option], { shouldDirty: true })
                                                                } else {
                                                                    form.setValue('work_types', currentWorkTypes.filter((x: string) => x !== option), { shouldDirty: true })
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-zinc-600 focus:ring-zinc-600 focus:ring-offset-zinc-900 cursor-pointer"
                                                        />
                                                        <span>{option}</span>
                                                    </label>
                                                )
                                            })}
                                            {(!settings?.work_types_options || settings.work_types_options.length === 0) && (
                                                <div className="col-span-2 text-xs text-zinc-500 italic">
                                                    Aucun type de travaux configuré dans les <Link href="/settings" className="text-zinc-400 underline hover:text-zinc-200">paramètres</Link>.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg text-zinc-100">Items de la soumission</CardTitle>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', description: '', quantity: 1, unit: '', unit_cost: 0, image_urls: [] })} className="h-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter Ligne
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item, index) => {
                                    const qty = typeof watchItems[index]?.quantity === 'number' ? watchItems[index].quantity : parseFloat(watchItems[index]?.quantity) || 0
                                    const cost = typeof watchItems[index]?.unit_cost === 'number' ? watchItems[index].unit_cost : parseFloat(watchItems[index]?.unit_cost) || 0
                                    const image_urls = form.watch(`items.${index}.image_urls`) || []
                                    
                                    return (
                                        <Card key={item.id} className="bg-zinc-950 border-zinc-800 shadow-sm relative group overflow-hidden">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => remove(index)} 
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/50 h-8 w-8"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            
                                            <CardContent className="p-4 space-y-4">
                                                {/* ROW 1: Title, Qty, Unit, Unit Cost, Total */}
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                                    <div className="md:col-span-5">
                                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Titre de l'item *</Label>
                                                        <Input 
                                                            placeholder="Ex: Peinture des murs et plafonds" 
                                                            {...form.register(`items.${index}.title` as const)} 
                                                            className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 h-9 text-zinc-100" 
                                                        />
                                                    </div>
                                                    
                                                    <div className="md:col-span-2">
                                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Quantité</Label>
                                                        <Controller
                                                            control={form.control}
                                                            name={`items.${index}.quantity` as const}
                                                            render={({ field }) => (
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Qté"
                                                                    value={field.value ?? ''}
                                                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 h-9 text-zinc-100"
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                    
                                                    <div className="md:col-span-2">
                                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Unité</Label>
                                                        <Input 
                                                            placeholder="Ex: h, u, m2" 
                                                            {...form.register(`items.${index}.unit` as const)} 
                                                            className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 h-9 text-zinc-100" 
                                                        />
                                                    </div>
                                                    
                                                    <div className="md:col-span-2">
                                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Prix Unit. ($)</Label>
                                                        <Controller
                                                            control={form.control}
                                                            name={`items.${index}.unit_cost` as const}
                                                            render={({ field }) => (
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Coût"
                                                                    value={field.value ?? ''}
                                                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 h-9 text-zinc-100"
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                    
                                                    <div className="md:col-span-1 text-right pb-2 font-semibold text-zinc-200 text-sm">
                                                        ${(qty * cost).toFixed(2)}
                                                    </div>
                                                </div>

                                                {/* ROW 2: Description Textarea */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-zinc-400 text-xs">Description (optionnelle)</Label>
                                                    <Textarea 
                                                        placeholder="Détails additionnels de l'item..." 
                                                        {...form.register(`items.${index}.description` as const)} 
                                                        className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 min-h-[60px] text-sm py-2 resize-none text-zinc-100" 
                                                    />
                                                </div>

                                                {/* ROW 3: Image grid & upload slot */}
                                                <div className="space-y-2">
                                                    <Label className="text-zinc-400 text-xs block">Photos de l'item</Label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {image_urls.map((url: string, imgIdx: number) => (
                                                            <div key={imgIdx} className="relative group/img w-20 h-20 rounded-md border border-zinc-800 overflow-hidden bg-zinc-900 aspect-square">
                                                                <img src={url} alt={`Item image ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        const nextUrls = image_urls.filter((_: any, i: number) => i !== imgIdx)
                                                                        form.setValue(`items.${index}.image_urls`, nextUrls, { shouldDirty: true })
                                                                    }}
                                                                    className="absolute top-1 right-1 h-5 w-5 rounded opacity-0 group-hover/img:opacity-100 transition-opacity p-0"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        
                                                        <label className="relative w-20 h-20 flex flex-col items-center justify-center border border-dashed border-zinc-700 hover:border-zinc-500 rounded-md cursor-pointer bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                                            <input 
                                                                type="file" 
                                                                accept="image/*" 
                                                                className="hidden" 
                                                                onChange={(e) => handleItemImageUpload(index, e)} 
                                                            />
                                                            <ImageIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-400" />
                                                            <span className="text-[10px] text-zinc-500 mt-1">Ajouter</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                                {form.formState.errors.items?.root && (
                                    <p className="text-sm font-medium text-red-500">{form.formState.errors.items.root.message}</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg text-zinc-100">Photos</CardTitle>
                                <div>
                                    <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    <Button type="button" variant="outline" size="sm" asChild className="h-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 cursor-pointer">
                                        <label htmlFor="image-upload">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Ajouter Image
                                        </label>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {images.length === 0 ? (
                                    <div className="text-center py-6 text-zinc-500 text-sm">
                                        Aucune photo générale ajoutée.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative group border border-zinc-800 rounded-md overflow-hidden bg-zinc-950">
                                                <img src={img.previewUrl} alt="Preview" className="w-full h-32 object-cover" />
                                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(idx)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                                <div className="p-2">
                                                    <Input
                                                        placeholder="Légende de la photo..."
                                                        value={img.caption}
                                                        onChange={(e) => updateImageCaption(idx, e.target.value)}
                                                        className="bg-zinc-900 border-zinc-800 h-8 text-xs focus-visible:ring-zinc-600 text-zinc-100"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="border-zinc-800 bg-zinc-900 sticky top-6">
                            <CardHeader>
                                <CardTitle className="text-lg text-zinc-100">Calculs & Totaux</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Sous-total</span>
                                    <span className="font-medium text-zinc-100">${calculatedTotals.subtotal.toFixed(2)}</span>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <FormField
                                        control={form.control}
                                        name="admin_percentage"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between space-y-0">
                                                <FormLabel className="text-zinc-400 text-sm font-normal">Administration (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.1" {...field} className="w-20 h-8 text-right bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 text-zinc-100" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex justify-end text-xs text-zinc-500">
                                        + ${calculatedTotals.admin_amount.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 pb-4 border-b border-zinc-800">
                                    <FormField
                                        control={form.control}
                                        name="profit_percentage"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between space-y-0">
                                                <FormLabel className="text-zinc-400 text-sm font-normal">Profit (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.1" {...field} className="w-20 h-8 text-right bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 text-zinc-100" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex justify-end text-xs text-zinc-500">
                                        + ${calculatedTotals.profit_amount.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-400">TPS ({(settings?.gst_rate * 100).toFixed(1)}%)</span>
                                        <span className="text-zinc-300 font-medium">${calculatedTotals.gst_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-400">TVQ ({(settings?.qst_rate * 100).toFixed(3)}%)</span>
                                        <span className="text-zinc-300 font-medium">${calculatedTotals.qst_amount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Separator className="bg-zinc-800 my-4" />

                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span className="text-zinc-100">Total Final</span>
                                    <span className="text-zinc-100">${calculatedTotals.total.toFixed(2)}</span>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="internal_notes"
                                    render={({ field }) => (
                                        <FormItem className="pt-4">
                                            <FormLabel className="text-zinc-400">Notes internes (Cachées)</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Notes privées..." {...field} className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 resize-none h-20 text-zinc-100" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" disabled={isPending} className="w-full mt-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                                    {isPending ? 'Enregistrement...' : (isEditing ? 'Mettre à jour la soumission' : 'Enregistrer la soumission')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    )
}
