'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Download, CheckCircle, XCircle, ChevronLeft, Pencil, Send, CalendarCheck2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateQuoteStatus, revertQuoteToPending, markQuoteAsSent } from '@/actions/quotes'
import { markProjectCompletedByQuote } from '@/actions/projects'


const sanitizePdfFileName = (value: string) => {
    const normalized = (value || 'soumission').trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')
    return normalized || 'soumission'
}

export function QuoteDetailView({ quote, settings }: { quote: any, settings: any }) {
    const router = useRouter()
    const pdfRef = useRef<HTMLDivElement>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [templateUrl, setTemplateUrl] = useState<string>('')

    useEffect(() => {
        const localTemplate = typeof window !== 'undefined' ? localStorage.getItem('pdf_template_url') || '' : ''
        setTemplateUrl(settings?.pdf_template_url || localTemplate)
    }, [settings?.pdf_template_url])

    const generatePDF = async () => {
        if (!pdfRef.current) return
        try {
            setIsGenerating(true)
            let canvas: HTMLCanvasElement
            try {
                canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff' })
            } catch {
                const clone = pdfRef.current.cloneNode(true) as HTMLDivElement
                clone.querySelectorAll('img').forEach((img) => img.remove())
                clone.style.position = 'fixed'
                clone.style.left = '-10000px'
                clone.style.top = '0'
                clone.style.width = '800px'
                clone.style.background = '#fff'
                document.body.appendChild(clone)
                canvas = await html2canvas(clone, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff' })
                clone.remove()
            }
            const imgData = canvas.toDataURL('image/png')

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
            })

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            let heightLeft = pdfHeight
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
            heightLeft -= pdf.internal.pageSize.getHeight()

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
                heightLeft -= pdf.internal.pageSize.getHeight()
            }

            const safeFileName = sanitizePdfFileName(quote.title)
            pdf.save(`Soumission-${safeFileName}.pdf`)
            toast.success('PDF généré avec succès')
        } catch (error) {
            toast.error('Erreur lors de la génération du PDF')
            console.error(error)
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

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12 w-full overflow-x-auto">
            <div className="flex items-center justify-between min-w-[700px]">
                <Link href="/quotes" className="inline-flex items-center text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Retour aux soumissions
                </Link>
                <div className="flex gap-2 text-sm text-zinc-400">
                    {quote.status === 'draft' && <Badge className="bg-zinc-800 text-zinc-300">Brouillon</Badge>}
                    {quote.status === 'sent' && <Badge className="bg-blue-900/50 text-blue-300 border-blue-800 border">Envoyée</Badge>}
                    {quote.status === 'approved' && <Badge className="bg-green-900/50 text-green-300 border-green-800 border">Approuvée</Badge>}
                    {quote.status === 'denied' && <Badge className="bg-red-900/50 text-red-300 border-red-800 border">Refusée</Badge>}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 min-w-[700px]">
                <Button onClick={generatePDF} disabled={isGenerating} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Génération...' : 'Télécharger PDF'}
                </Button>

                <Link href={`/quotes/${quote.id}/edit`} className="group/button inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100">
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier la soumission
                </Link>

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

                {(quote.status === 'approved' || quote.status === 'sent' || quote.status === 'denied') && (
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
                {quote.status === 'approved' && (
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
            </div>

            <div className="bg-white text-black p-10 rounded-lg shadow-sm w-[800px] shrink-0 relative overflow-hidden" ref={pdfRef}>
                {templateUrl && <img src={templateUrl} alt="Template" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" crossOrigin="anonymous" />}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{settings.company_name || 'Gustav Inc.'}</h1>
                        <p className="text-zinc-500 mt-1">Soumission Officielle</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold mb-2">SOUMISSION #{quote.quote_number}</h2>
                        <div className="text-sm text-zinc-600">
                            <p>Date: {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: frCA })}</p>
                            <p>Durée estimée: {durationLabel}</p>
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
                            {quote.quote_items?.map((item: any) => (
                                <tr key={item.id} className="border-b border-zinc-200">
                                    <td className="py-2 pr-4">{item.description}</td>
                                    <td className="py-2 text-center">{item.quantity}</td>
                                    <td className="py-2 text-center">{item.unit || '-'}</td>
                                    <td className="py-2 text-right">${item.unit_cost?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-2 text-right font-medium text-zinc-900">${item.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
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

                <div className="mt-12 text-center text-xs text-zinc-400">
                    Ce document est généré par {settings.company_name || 'Gustav'}. Merci de votre confiance.
                </div>
            </div>
        </div>
    )
}
