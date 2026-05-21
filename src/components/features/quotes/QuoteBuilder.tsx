'use client'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { useState, useEffect, useRef, useTransition } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createQuoteAction, updateQuoteAction } from '@/actions/quotes'
import { createClient } from '@/utils/supabase/client'

const quoteItemSchema = z.object({
    description: z.string().min(1, 'Requis'),
    quantity: z.coerce.number().min(0.01),
    unit: z.string().optional(),
    unit_cost: z.coerce.number().min(0),
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
            items: initialQuote?.quote_items?.length
                ? initialQuote.quote_items.map((i: any) => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit: i.unit || '',
                    unit_cost: i.unit_cost,
                }))
                : [{ description: '', quantity: 1, unit: 'h', unit_cost: 0 }],
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


    const selectedClient = clients.find((c: any) => String(c.id) === String(form.watch('client_id')))
    const selectedClientLabel = selectedClient
        ? `${selectedClient.full_name}${selectedClient.company_name ? ` - ${selectedClient.company_name}` : ''}`
        : 'Sélectionner un client'
    const filteredClients = clients.filter((c: any) => {
        const q = clientSearch.trim().toLowerCase()
        if (!q) return true
        const name = String(c.full_name || '').toLowerCase()
        const company = String(c.company_name || '').toLowerCase()
        const email = String(c.email || '').toLowerCase()
        return name.includes(q) || company.includes(q) || email.includes(q)
    })
    const selectedContractorName = form.watch('contractor_id') && form.watch('contractor_id') !== 'none'
        ? contractors.find((c: any) => String(c.id) === String(form.watch('contractor_id')))?.full_name
        : ''

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
                    ...calculatedTotals
                }

                if (isEditing) {
                    // In edit mode: keep existing images, add new uploads on top
                    await updateQuoteAction(initialQuote.id, finalQuoteData, itemsWithTotals, uploadedImagesData, true)
                    toast.success("Soumission mise à jour avec succès")
                    router.push(`/quotes/${initialQuote.id}`)
                    router.refresh()
                } else {
                    await createQuoteAction(finalQuoteData, itemsWithTotals, uploadedImagesData)
                    toast.success("Soumission créée avec succès")
                    router.push('/quotes')
                }
            } catch (error: any) {
                toast.error(isEditing ? "Erreur lors de la mise à jour" : "Erreur lors de la création", { description: error.message })
            }
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-12">
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
                                                <Input placeholder="Rénovation cuisine" {...field} className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="client_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Client</FormLabel>
                                            <Input
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                                placeholder="Rechercher un client (SDC #, nom complet, courriel)"
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 mb-2"
                                            />
                                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600">
                                                        <SelectValue placeholder="Sélectionner un client">{selectedClientLabel}</SelectValue>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                                    {filteredClients.map(c => (
                                                        <SelectItem key={c.id} value={String(c.id)} className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-100">
                                                            {c.full_name}{c.company_name ? ` - ${c.company_name}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                    {filteredClients.length === 0 && (
                                                        <div className="px-2 py-2 text-xs text-zinc-400">Aucun client trouvé.</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
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
                                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600">
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
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600"
                                            />
                                            <Select value={form.watch('duration_unit') || 'days'} onValueChange={(v) => form.setValue('duration_unit', v as any, { shouldValidate: true })}>
                                                <SelectTrigger className="w-32 bg-zinc-950 border-zinc-800">
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
                                    name="project_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Type de projet</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'interior'}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600">
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
                                                <Textarea placeholder="Détails du projet affichés sur le PDF..." {...field} className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 min-h-[100px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg text-zinc-100">Items de la soumission</CardTitle>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unit: '', unit_cost: 0 })} className="h-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter Ligne
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item, index) => {
                                    const qty = typeof watchItems[index]?.quantity === 'number' ? watchItems[index].quantity : parseFloat(watchItems[index]?.quantity) || 0
                                    const cost = typeof watchItems[index]?.unit_cost === 'number' ? watchItems[index].unit_cost : parseFloat(watchItems[index]?.unit_cost) || 0
                                    return (
                                        <div key={item.id} className="flex gap-2 items-start bg-zinc-950 p-2 rounded-md border border-zinc-800">
                                            <div className="flex-1">
                                                <Input placeholder="Description" {...form.register(`items.${index}.description` as const)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none" />
                                            </div>
                                            <div className="w-24">
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
                                                            className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none"
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <Input placeholder="Unité" {...form.register(`items.${index}.unit` as const)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none" />
                                            </div>
                                            <div className="w-28">
                                                <Controller
                                                    control={form.control}
                                                    name={`items.${index}.unit_cost` as const}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Coût $"
                                                            value={field.value ?? ''}
                                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                            className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none"
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="w-28 h-10 flex items-center justify-end px-3 font-medium text-zinc-300">
                                                ${(qty * cost).toFixed(2)}
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-400 hover:text-red-300 hover:bg-red-950/50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
                                        Aucune photo ajoutée.
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
                                                        className="bg-zinc-900 border-zinc-800 h-8 text-xs focus-visible:ring-zinc-600"
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
                                                    <Input type="number" step="0.1" {...field} className="w-20 h-8 text-right bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600" />
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
                                                    <Input type="number" step="0.1" {...field} className="w-20 h-8 text-right bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600" />
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
                                                <Textarea placeholder="Notes privées..." {...field} className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-600 resize-none h-20" />
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
