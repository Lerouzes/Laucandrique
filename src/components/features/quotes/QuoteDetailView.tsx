'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Download, CheckCircle, XCircle, ChevronLeft, Pencil, Send, CalendarCheck2, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'

import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { updateQuoteStatus, revertQuoteToPending, markQuoteAsSent } from '@/actions/quotes'
import { markProjectCompletedByQuote } from '@/actions/projects'
import { downloadQuotePDF, calculatePerimeter, calculateFloorArea, calculateWallSurface, renderRoomToDataURL } from '@/utils/pdf'

async function loadTemplateAsBlobUrl(url: string): Promise<string> {
    if (!url) return ''
    try {
        if (url.startsWith('data:')) {
            const parts = url.split(',')
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf'
            const base64Data = parts[1]
            const binaryString = atob(base64Data)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: mime })
            return URL.createObjectURL(blob)
        } else {
            const response = await fetch(url)
            const blob = await response.blob()
            return URL.createObjectURL(blob)
        }
    } catch (e) {
        console.error('Error converting url to blobUrl:', e)
        return url
    }
}

export function QuoteDetailView({ quote, settings }: { quote: any, settings: any }) {
    const router = useRouter()
    const pdfRef = useRef<HTMLDivElement>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [templateUrl, setTemplateUrl] = useState<string>('')
    const [templateBlobUrl, setTemplateBlobUrl] = useState<string>('')

    const itemPhotos: { itemTitle: string, url: string, refNum: number }[] = []
    const itemPhotoRefMap: Record<string, number> = {}
    let photoCounter = 0
    for (const item of quote.quote_items || []) {
        if (item.image_urls && item.image_urls.length > 0) {
            for (const url of item.image_urls) {
                photoCounter++
                itemPhotoRefMap[url] = photoCounter
                itemPhotos.push({
                    itemTitle: item.title || 'Sans titre',
                    url: url,
                    refNum: photoCounter
                })
            }
        }
    }

    const roomMap: Record<string, { name: string; sectionName: string }> = {}
    const allRooms: any[] = []
    const planningSections = quote.quote_planning_sections || []
    planningSections.forEach((sec: any) => {
        const rooms = sec.quote_planning_rooms || []
        rooms.forEach((room: any) => {
            roomMap[room.id] = {
                name: room.name,
                sectionName: sec.name
            }
            allRooms.push({
                ...room,
                sectionName: sec.name
            })
        })
    })

    useEffect(() => {
        const localTemplate = typeof window !== 'undefined' ? localStorage.getItem('pdf_template_url') || '' : ''
        const tUrl = settings?.pdf_template_url || localTemplate
        setTemplateUrl(tUrl)
        
        const isPdf = tUrl && (
            tUrl.startsWith('data:application/pdf') || 
            tUrl.startsWith('data:application/octet-stream') || 
            tUrl.toLowerCase().includes('.pdf') ||
            tUrl.split(',')[1]?.startsWith('JVBERi')
        )

        let activeBlobUrl = ''
        if (isPdf) {
            loadTemplateAsBlobUrl(tUrl).then(blobUrl => {
                setTemplateBlobUrl(blobUrl)
                activeBlobUrl = blobUrl
            })
        } else {
            setTemplateBlobUrl('')
        }

        return () => {
            if (activeBlobUrl) {
                URL.revokeObjectURL(activeBlobUrl)
            }
        }
    }, [settings?.pdf_template_url])

    const generatePDF = async () => {
        try {
            setIsGenerating(true)
            await downloadQuotePDF(quote, settings)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleStatusChange = (status: 'approved' | 'denied') => {
        startTransition(async () => {
            try {
                await updateQuoteStatus(quote.id, status, quote.client_id, quote.title, quote.estimated_duration_days)
                toast.success(`Soumission ${status === 'approved' ? 'approuvée' : 'refusée'}.`)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur de mise à jour", { description: err.message })
            }
        })
    }



    const handleMarkAsSent = () => {
        startTransition(async () => {
            try {
                await markQuoteAsSent(quote.id)
                toast.success('Soumission marquée comme envoyée.')
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }


    const handleMarkProjectCompleted = () => {
        startTransition(async () => {
            try {
                await markProjectCompletedByQuote(quote.id)
                toast.success('Projet marqué comme complété.')
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const handleRevertToDraft = () => {
        startTransition(async () => {
            try {
                await revertQuoteToPending(quote.id)
                toast.success("Soumission repassée en brouillon. Le projet associé a été supprimé.")
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    const durationLabel = quote.estimated_duration_days < 1
        ? `${Math.round(quote.estimated_duration_days * 24 * 100) / 100} heures`
        : `${quote.estimated_duration_days} jours`

    // itemPhotos defined at top
    const linkedProject = Array.isArray(quote.projects) ? quote.projects[0] : null
    const isProjectCompleted = linkedProject?.status === 'completed'
    const displayStatus = quote.status === 'billed' ? 'billed' : (isProjectCompleted && quote.status === 'approved' ? 'completed' : quote.status)
    const linkedBill = Array.isArray(quote.bills) ? quote.bills[0] : (quote.bills || null)

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12 w-full overflow-x-auto">
            <div className="flex items-center justify-between min-w-[700px]">
                <Link href="/quotes" className="inline-flex items-center text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Retour aux soumissions
                </Link>
                <div className="flex gap-2 text-sm text-zinc-400">
                    {displayStatus === 'draft' && <Badge className="bg-zinc-800 text-zinc-300">Brouillon</Badge>}
                    {displayStatus === 'sent' && <Badge className="bg-blue-900/50 text-blue-300 border-blue-800 border">Envoyée</Badge>}
                    {displayStatus === 'approved' && <Badge className="bg-green-900/50 text-green-300 border-green-800 border">Approuvée</Badge>}
                    {displayStatus === 'completed' && <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-800 border">Complétée</Badge>}
                    {displayStatus === 'billed' && <Badge className="bg-purple-900/60 text-purple-300 border-purple-800 border">Facturée</Badge>}
                    {displayStatus === 'denied' && <Badge className="bg-red-900/50 text-red-300 border-red-800 border">Refusée</Badge>}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 min-w-[700px]">
                <Button onClick={generatePDF} disabled={isGenerating} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Génération...' : 'Télécharger PDF'}
                </Button>

                {quote.status !== 'billed' && quote.status !== 'completed' && displayStatus !== 'completed' && (
                    <Link href={`/quotes/${quote.id}/edit`} className="group/button inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100">
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier la soumission
                    </Link>
                )}

                {quote.status === 'draft' && (
                    <>
                        <Button
                            variant="outline"
                            onClick={handleMarkAsSent}
                            disabled={isPending}
                            className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Marquer envoyée
                        </Button>
                    </>
                )}

                {(quote.status === 'sent' || quote.status === 'denied') && (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => handleStatusChange('approved')}
                            disabled={isPending}
                            className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approuver le projet
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleStatusChange('denied')}
                            disabled={isPending}
                            className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Refuser
                        </Button>
                    </>
                )}

                {(quote.status === 'approved' || quote.status === 'sent' || quote.status === 'denied' || quote.status === 'completed') && quote.status !== 'billed' && (
                    <Button
                        variant="outline"
                        onClick={handleRevertToDraft}
                        disabled={isPending}
                        className="border-yellow-800 bg-yellow-950/20 text-yellow-400 hover:bg-yellow-900/50 hover:text-yellow-300"
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Repasser en brouillon
                    </Button>
                )}
                {quote.status === 'approved' && !isProjectCompleted && (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/planification?query=${encodeURIComponent(String(quote.quote_number || ''))}`)}
                            className="border-cyan-800 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/50 hover:text-cyan-200"
                        >
                            Planifier la date
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleMarkProjectCompleted}
                            disabled={isPending}
                            className="border-emerald-800 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200"
                        >
                            <CalendarCheck2 className="mr-2 h-4 w-4" />
                            Marquer job complété
                        </Button>
                    </>
                )}
                {linkedBill ? (
                    <Link
                        href={`/bills/${linkedBill.id}`}
                        className={cn(
                            buttonVariants({ variant: 'outline' }),
                            "border-purple-800 bg-purple-950/20 text-purple-300 hover:bg-purple-900/50 hover:text-purple-200 font-semibold inline-flex items-center"
                        )}
                    >
                        <Receipt className="mr-2 h-4 w-4" />
                        Voir la facture #{linkedBill.bill_number}
                    </Link>
                ) : (
                    (quote.status === 'completed' || displayStatus === 'completed') && (
                        <Link
                            href={`/bills/new?quoteId=${quote.id}`}
                            className={cn(
                                buttonVariants({ variant: 'outline' }),
                                "border-purple-800 bg-purple-950/20 text-purple-300 hover:bg-purple-900/50 hover:text-purple-200 font-semibold inline-flex items-center"
                            )}
                        >
                            <Receipt className="mr-2 h-4 w-4" />
                            Créer la facture
                        </Link>
                    )
                )}
            </div>

            <div className="bg-white text-black p-10 rounded-lg shadow-sm w-[800px] shrink-0 relative overflow-hidden" ref={pdfRef}>
                {templateUrl && (
                    (templateUrl.startsWith('data:application/pdf') || 
                     templateUrl.startsWith('data:application/octet-stream') || 
                     templateUrl.toLowerCase().includes('.pdf') ||
                     templateUrl.split(',')[1]?.startsWith('JVBERi')) ? (
                        templateBlobUrl && (
                            <iframe 
                                src={`${templateBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none border-0" 
                            />
                        )
                    ) : (
                        <img src={templateUrl} alt="Template" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" crossOrigin="anonymous" />
                    )
                )}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{settings.company_name || 'Gustav Inc.'}</h1>
                        <p className="text-zinc-500 mt-1">Soumission Officielle</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold mb-2">SOUMISSION #{quote.quote_number}</h2>
                        <div className="text-sm text-zinc-600">
                            <p>Date: {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: frCA })}</p>
                            {durationLabel && !quote.hide_duration && <p>Durée estimée: {durationLabel}</p>}
                            {quote.sent_at && <p>Envoyée le: {format(new Date(quote.sent_at), 'dd MMMM yyyy, HH:mm', { locale: frCA })}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between mb-8">
                    <div className="w-1/2">
                        <h3 className="font-semibold text-zinc-900 mb-2 border-b pb-1">Client</h3>
                        <div className="text-sm text-zinc-700 space-y-1">
                            <p className="font-bold text-black">{quote.clients?.full_name}</p>
                            {quote.clients?.company_name && <p>{quote.clients.company_name}</p>}
                            <p>{quote.clients?.address || ''} {quote.clients?.city || ''}</p>
                            <p>{quote.clients?.email}</p>
                            <p>{quote.clients?.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-2">{quote.title}</h3>
                    {quote.work_types && quote.work_types.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {quote.work_types.map((type: string) => (
                                <Badge key={type} variant="secondary" className="bg-zinc-100 text-zinc-800 hover:bg-zinc-100 border border-zinc-200 font-medium text-xs py-0.5 px-2">
                                    {type}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {quote.description && (
                        <p className="text-zinc-600 text-sm whitespace-pre-wrap">{quote.description}</p>
                    )}
                </div>

                <div className="mb-8">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b-2 border-zinc-300 text-zinc-900">
                                <th className="py-2">Description</th>
                                <th className="py-2 text-center">Quantité</th>
                                <th className="py-2 text-center">Unité</th>
                                <th className="py-2 text-right">Prix Unitaire</th>
                                <th className="py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-700">
                            {quote.quote_items?.map((item: any) => {
                                const refNums = item.image_urls?.map((url: string) => itemPhotoRefMap[url]).filter(Boolean) || []
                                return (
                                    <tr key={item.id} className="border-b border-zinc-200">
                                        <td className="py-3 pr-4">
                                            <div className="font-bold text-zinc-900 text-sm flex items-center gap-2 flex-wrap">
                                                <span>{item.title || 'Sans titre'}</span>
                                                {refNums.length > 0 && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                        Photos Réf. {refNums.map((n: number) => `#${n}`).join(', ')}
                                                    </span>
                                                )}
                                                {item.planning_room_id && roomMap[item.planning_room_id] && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                                                        {(() => {
                                                            const r = roomMap[item.planning_room_id]
                                                            if (item.planning_measurement_source === 'perimeter') {
                                                                return `Périmètre (${r.name})`
                                                            } else if (item.planning_measurement_source === 'area') {
                                                                return `Aire (${r.name})`
                                                            } else if (item.planning_measurement_source === 'wall_surface') {
                                                                return `Surf. Murs (${r.name})`
                                                            } else if (item.planning_measurement_source === 'selected_walls_linear') {
                                                                const segments = item.planning_selected_segments || []
                                                                const wallList = segments.map((idx: number) => `M${idx + 1}`).join(', ')
                                                                return `Murs spéc. (M${wallList} - ${r.name})`
                                                            } else if (item.planning_measurement_source === 'selected_walls_surface') {
                                                                const segments = item.planning_selected_segments || []
                                                                const wallList = segments.map((idx: number) => `M${idx + 1}`).join(', ')
                                                                return `Murs spéc. (M${wallList} - ${r.name})`
                                                            }
                                                            return r.name
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                            {item.description && (
                                                <div className="text-zinc-500 text-xs mt-1 whitespace-pre-wrap">{item.description}</div>
                                            )}
                                        </td>
                                        <td className="py-3 text-center">{item.quantity}</td>
                                        <td className="py-3 text-center">{item.unit || '-'}</td>
                                        <td className="py-3 text-right">${item.unit_cost?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 text-right font-medium text-zinc-900">${item.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mb-8">
                    <div className="w-64 space-y-2 text-sm text-zinc-700">
                        <div className="flex justify-between">
                            <span>Sous-total:</span>
                            <span>${quote.subtotal?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {quote.admin_amount > 0 && (
                            <div className="flex justify-between">
                                <span>Administration ({quote.admin_percentage}%):</span>
                                <span>${quote.admin_amount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {quote.profit_amount > 0 && (
                            <div className="flex justify-between">
                                <span>Profit ({quote.profit_percentage}%):</span>
                                <span>${quote.profit_amount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>TPS:</span>
                            <span>${quote.gst_amount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>TVQ:</span>
                            <span>${quote.qst_amount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t-2 border-zinc-300 font-bold text-lg text-black bg-zinc-50 px-2 rounded-sm pb-1">
                            <span>Total:</span>
                            <span>${quote.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Annexe : Plans & Mesures */}
                {allRooms.length > 0 && (
                    <div className="mt-12 pt-8 border-t-2 border-zinc-200">
                        <h3 className="font-semibold text-zinc-900 mb-4 uppercase tracking-wider text-sm">Annexe : Plans & Mesures</h3>
                        <div className="space-y-8">
                            {allRooms.map((room: any) => {
                                const hasDrawing = room.points && room.points.length >= 3
                                const rendered = hasDrawing ? renderRoomToDataURL(room.points, room.name) : null
                                
                                const perimeter = hasDrawing ? calculatePerimeter(room.points) : 0
                                const area = hasDrawing ? calculateFloorArea(room.points) : 0
                                const wallSurface = hasDrawing ? calculateWallSurface(room.points, room.height) : 0
                                
                                const linkedItems = (quote.quote_items || []).filter((item: any) => item.planning_room_id === room.id)
                                
                                return (
                                    <div key={room.id} className="border border-zinc-200 rounded-lg p-5 bg-white space-y-4 shadow-sm">
                                        <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                                            <h4 className="font-bold text-zinc-900 text-base">
                                                {room.sectionName ? `${room.sectionName} - ${room.name}` : room.name}
                                            </h4>
                                            <span className="text-sm text-zinc-500 font-medium">
                                                Hauteur du plafond : {room.height || 8.0}'
                                            </span>
                                        </div>
                                        
                                        {room.description && (
                                            <p className="text-sm text-zinc-500 italic whitespace-pre-wrap">{room.description}</p>
                                        )}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {hasDrawing && rendered ? (
                                                <div className="flex items-center justify-center border border-zinc-200 rounded bg-zinc-50/50 p-2 h-[220px]">
                                                    <img 
                                                        src={rendered.dataUrl} 
                                                        alt={`Plan de ${room.name}`} 
                                                        className="max-w-full max-h-full object-contain" 
                                                        crossOrigin="anonymous" 
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center border border-zinc-200 border-dashed rounded bg-zinc-50 h-[220px] text-zinc-400 text-sm">
                                                    Aucun tracé disponible
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col justify-center space-y-2 text-sm text-zinc-800 bg-zinc-50/50 p-4 rounded border border-zinc-200">
                                                <div className="grid grid-cols-2 gap-y-2">
                                                    <span className="font-semibold">{perimeter.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pi</span>
                                                    <span className="text-zinc-500">périmètre (sol / plafond)</span>
                                                    
                                                    <span className="font-semibold">{area.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pi²</span>
                                                    <span className="text-zinc-500">aire au sol (plancher / plafond)</span>
                                                    
                                                    <span className="font-semibold">{wallSurface.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pi²</span>
                                                    <span className="text-zinc-500">surface des murs</span>
                                                    
                                                    <span className="font-semibold">{(wallSurface + area).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pi²</span>
                                                    <span className="text-zinc-500">surface murs et plafond</span>
                                                    
                                                    <span className="font-semibold">{(area / 9).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vg²</span>
                                                    <span className="text-zinc-500">revêtement de sol</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Room-specific items table */}
                                        {linkedItems.length > 0 && (
                                            <div className="mt-4 border border-zinc-200 rounded overflow-hidden">
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-800">
                                                            <th className="py-2 px-3 font-semibold">Item relié</th>
                                                            <th className="py-2 px-3 text-center font-semibold">Qté</th>
                                                            <th className="py-2 px-3 text-center font-semibold">Unité</th>
                                                            <th className="py-2 px-3 text-right font-semibold">Prix Unit.</th>
                                                            <th className="py-2 px-3 text-right font-semibold">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {linkedItems.map((item: any) => (
                                                            <tr key={item.id} className="border-b border-zinc-150 last:border-0 hover:bg-zinc-50/50">
                                                                <td className="py-2 px-3 text-zinc-900 font-medium">{item.title}</td>
                                                                <td className="py-2 px-3 text-center text-zinc-700">{item.quantity}</td>
                                                                <td className="py-2 px-3 text-center text-zinc-700">{item.unit || '-'}</td>
                                                                <td className="py-2 px-3 text-right text-zinc-700">${item.unit_cost?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                                                <td className="py-2 px-3 text-right text-zinc-900 font-semibold">${item.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {quote.quote_images?.length > 0 && (
                    <div className="mt-12 pt-8 border-t-2 border-zinc-200">
                        <h3 className="font-semibold text-zinc-900 mb-4">Photos du projet</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {quote.quote_images.map((img: any) => (
                                <div key={img.id} className="border border-zinc-200 rounded-md overflow-hidden bg-zinc-50">
                                    <img src={img.image_url} alt="Photo" className="w-full h-48 object-cover object-center" crossOrigin="anonymous" />
                                    {img.caption && <div className="p-3 text-sm text-zinc-700 font-medium bg-white">{img.caption}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {itemPhotos.length > 0 && (
                    <div className="mt-12 pt-8 border-t-2 border-zinc-200">
                        <h3 className="font-semibold text-zinc-900 mb-4">Annexe : Photos de référence</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {itemPhotos.map((photo: any, index: number) => (
                                <div key={index} className="border border-zinc-200 rounded-md overflow-hidden bg-zinc-50">
                                    <img src={photo.url} alt={photo.itemTitle} className="w-full h-48 object-cover object-center" crossOrigin="anonymous" />
                                    <div className="p-3 text-sm text-zinc-700 font-medium bg-white flex items-center justify-between">
                                        <span>{photo.itemTitle}</span>
                                        <span className="text-xs font-semibold text-blue-600">Photo Réf. #{photo.refNum}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center text-xs text-zinc-400">
                    Ce document est généré par {settings.company_name || 'Gustav'}. Merci de votre confiance.
                </div>
            </div>
        </div>
    )
}
