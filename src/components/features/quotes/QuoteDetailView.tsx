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

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = (e) => reject(e)
        img.src = url
    })
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
        try {
            setIsGenerating(true)

            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
            })

            const pageHeight = doc.internal.pageSize.getHeight() // 297
            const pageWidth = doc.internal.pageSize.getWidth() // 210
            const margin = 15
            const contentWidth = pageWidth - 2 * margin // 180
            let y = 20

            // Helper to add a new page and reset cursor
            const checkNewPage = (heightNeeded: number) => {
                if (y + heightNeeded > pageHeight - 20) {
                    doc.addPage()
                    y = 20
                    return true
                }
                return false
            }

            // --- 1. HEADER ---
            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(22)
            doc.setTextColor(15, 23, 42) // slate-900
            doc.text(settings.company_name || 'Gustav Inc.', margin, y)

            doc.setFontSize(10)
            doc.setFont('Helvetica', 'normal')
            doc.setTextColor(71, 85, 105) // slate-600
            
            let companyInfo = []
            if (settings.company_email) companyInfo.push(settings.company_email)
            if (settings.company_phone) companyInfo.push(settings.company_phone)
            if (settings.company_address) companyInfo.push(settings.company_address)
            
            doc.text(companyInfo.join('  |  '), margin, y + 6)

            // Right side quote info
            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(16)
            doc.setTextColor(15, 23, 42)
            doc.text('SOUMISSION', pageWidth - margin, y, { align: 'right' })

            doc.setFontSize(12)
            doc.setTextColor(14, 116, 144) // cyan-700
            doc.text(`#${quote.quote_number}`, pageWidth - margin, y + 6, { align: 'right' })

            doc.setFont('Helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(71, 85, 105)
            doc.text(
                `Date: ${format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: frCA })}`,
                pageWidth - margin,
                y + 11,
                { align: 'right' }
            )
            if (durationLabel && !quote.hide_duration) {
                doc.text(`Durée estimée: ${durationLabel}`, pageWidth - margin, y + 15, { align: 'right' })
            }

            y += 24

            // Draw a subtle horizontal line
            doc.setDrawColor(226, 232, 240) // slate-200
            doc.setLineWidth(0.5)
            doc.line(margin, y, pageWidth - margin, y)

            y += 8

            // --- 2. CLIENT INFO ---
            checkNewPage(40)
            
            // Draw client card background
            doc.setFillColor(248, 250, 252) // slate-50
            doc.setDrawColor(241, 245, 249) // slate-100
            doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD')

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139) // slate-500
            doc.text('CLIENT / DESTINATAIRE', margin + 5, y + 6)

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(11)
            doc.setTextColor(15, 23, 42)
            doc.text(quote.clients?.full_name || '', margin + 5, y + 12)

            doc.setFont('Helvetica', 'normal')
            doc.setFontSize(9.5)
            doc.setTextColor(51, 65, 85) // slate-700
            
            let clientDetails = []
            if (quote.clients?.company_name) clientDetails.push(quote.clients.company_name)
            if (quote.clients?.address) {
                const addressStr = `${quote.clients.address}${quote.clients.city ? ', ' + quote.clients.city : ''}`
                clientDetails.push(addressStr)
            }
            let contactDetails = []
            if (quote.clients?.email) contactDetails.push(quote.clients.email)
            if (quote.clients?.phone) contactDetails.push(quote.clients.phone)
            if (contactDetails.length > 0) clientDetails.push(contactDetails.join('  |  '))

            clientDetails.forEach((line, index) => {
                doc.text(line, margin + 5, y + 18 + index * 5)
            })

            y += 42

            // --- 3. QUOTE TITLE AND DESCRIPTION ---
            const descText = quote.description || ''
            const descLines = doc.splitTextToSize(descText, contentWidth)
            const descHeight = descLines.length * 5
            checkNewPage(18 + descHeight)

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(12)
            doc.setTextColor(15, 23, 42)
            doc.text(quote.title || '', margin, y)

            y += 5

            if (quote.work_types && quote.work_types.length > 0) {
                doc.setFont('Helvetica', 'italic')
                doc.setFontSize(9)
                doc.setTextColor(71, 85, 105)
                doc.text(`Type(s) de travaux: ${quote.work_types.join(', ')}`, margin, y)
                y += 5
            }

            if (descText) {
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(9.5)
                doc.setTextColor(71, 85, 105)
                doc.text(descLines, margin, y)
                y += descHeight
            }

            y += 8

            // --- 4. ITEMS TABLE ---
            // Table Header
            checkNewPage(15)
            doc.setFillColor(15, 23, 42) // dark background
            doc.rect(margin, y, contentWidth, 8, 'F')

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(255, 255, 255)
            doc.text('Description', margin + 3, y + 5.5)
            doc.text('Qté', margin + 95, y + 5.5, { align: 'center' })
            doc.text('Unité', margin + 112, y + 5.5, { align: 'center' })
            doc.text('Prix Unit.', margin + 145, y + 5.5, { align: 'right' })
            doc.text('Total', margin + 177, y + 5.5, { align: 'right' })

            y += 8

            // Table Rows
            const items = quote.quote_items || []
            doc.setFont('Helvetica', 'normal')
            doc.setFontSize(9)

            for (const item of items) {
                doc.setFont('Helvetica', 'bold')
                const titleLines = doc.splitTextToSize(item.title || 'Sans titre', 88)
                
                doc.setFont('Helvetica', 'normal')
                const descLines = item.description ? doc.splitTextToSize(item.description, 88) : []
                
                const rowHeight = Math.max(8, titleLines.length * 4 + (descLines.length > 0 ? descLines.length * 4 + 2 : 0) + 4)
                
                checkNewPage(rowHeight)

                // Alternating light row backgrounds
                doc.setFillColor(255, 255, 255)
                doc.rect(margin, y, contentWidth, rowHeight, 'F')
                doc.setDrawColor(241, 245, 249)
                doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight)

                // Draw wrapped title
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(15, 23, 42) // slate-900
                let textY = y + 5
                titleLines.forEach((line: string) => {
                    doc.text(line, margin + 3, textY)
                    textY += 4
                })

                // Draw wrapped description
                if (descLines.length > 0) {
                    textY += 1
                    doc.setFont('Helvetica', 'normal')
                    doc.setTextColor(71, 85, 105) // slate-600
                    descLines.forEach((line: string) => {
                        doc.text(line, margin + 3, textY)
                        textY += 4
                    })
                }

                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(51, 65, 85)
                doc.text(String(item.quantity || 0), margin + 95, y + 5, { align: 'center' })
                doc.text(item.unit || '-', margin + 112, y + 5, { align: 'center' })
                doc.text(`$${Number(item.unit_cost || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, margin + 145, y + 5, { align: 'right' })
                doc.text(`$${Number(item.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, margin + 177, y + 5, { align: 'right' })

                y += rowHeight
            }

            y += 8

            // --- 5. SUMMARY CARD ---
            const summaryHeight = 40 + (quote.admin_amount > 0 ? 5 : 0) + (quote.profit_amount > 0 ? 5 : 0)
            checkNewPage(summaryHeight)

            const summaryX = margin + 105
            const summaryWidth = 75

            doc.setFont('Helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(71, 85, 105)

            let curY = y
            
            // Subtotal
            doc.text('Sous-total:', summaryX, curY)
            doc.text(`$${Number(quote.subtotal || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, curY, { align: 'right' })
            curY += 5

            // Admin
            if (quote.admin_amount > 0) {
                doc.text(`Administration (${quote.admin_percentage}%):`, summaryX, curY)
                doc.text(`$${Number(quote.admin_amount || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, curY, { align: 'right' })
                curY += 5
            }

            // Profit
            if (quote.profit_amount > 0) {
                doc.text(`Profit (${quote.profit_percentage}%):`, summaryX, curY)
                doc.text(`$${Number(quote.profit_amount || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, curY, { align: 'right' })
                curY += 5
            }

            // TPS
            doc.text('TPS (5%):', summaryX, curY)
            doc.text(`$${Number(quote.gst_amount || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, curY, { align: 'right' })
            curY += 5

            // TVQ
            doc.text('TVQ (9.975%):', summaryX, curY)
            doc.text(`$${Number(quote.qst_amount || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, curY, { align: 'right' })
            curY += 6

            // Grand Total
            doc.setFillColor(248, 250, 252)
            doc.setDrawColor(226, 232, 240)
            doc.roundedRect(summaryX - 2, curY - 4.5, summaryWidth + 2, 8.5, 1.5, 1.5, 'FD')

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(11)
            doc.setTextColor(15, 23, 42)
            doc.text('Total:', summaryX, curY + 1)
            doc.text(`$${Number(quote.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, curY + 1, { align: 'right' })

            y = curY + 12

            // --- 5.5 ANNEXE PHOTOS ---
            const allAnnexPhotos: { url: string, caption: string }[] = []
            if (quote.quote_images && quote.quote_images.length > 0) {
                quote.quote_images.forEach((img: any) => {
                    allAnnexPhotos.push({
                        url: img.image_url,
                        caption: img.caption || 'Photo du projet'
                    })
                })
            }
            if (itemPhotos.length > 0) {
                itemPhotos.forEach((photo) => {
                    allAnnexPhotos.push({
                        url: photo.url,
                        caption: photo.itemTitle
                    })
                })
            }

            if (allAnnexPhotos.length > 0) {
                // Load all images first
                const loadedImages = await Promise.all(
                    allAnnexPhotos.map(async (photo) => {
                        try {
                            const imgEl = await loadImage(photo.url)
                            return { imgEl, caption: photo.caption }
                        } catch (err) {
                            console.error(`Failed to load image ${photo.url}:`, err)
                            return { imgEl: null, caption: photo.caption }
                        }
                    })
                )

                doc.addPage()
                y = 20

                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(14)
                doc.setTextColor(15, 23, 42)
                doc.text('ANNEXE : PHOTOS', margin, y)
                y += 8

                const colWidth = 85
                const imageHeight = 55
                const captionHeight = 10
                const blockHeight = imageHeight + captionHeight + 5 // 70mm total per row block
                let rowStartY = y

                for (let idx = 0; idx < loadedImages.length; idx++) {
                    const item = loadedImages[idx]

                    // If we are at the start of a new row (col == 0) and it's not the very start
                    if (idx > 0 && idx % 2 === 0) {
                        y += blockHeight
                        rowStartY = y
                    }

                    // Check if we need a new page for the current row
                    if (idx % 2 === 0) {
                        if (y + blockHeight > pageHeight - 15) {
                            doc.addPage()
                            y = 20
                            rowStartY = y
                        }
                    }

                    const col = idx % 2
                    const x = margin + col * (colWidth + 10) // 10mm gap

                    if (item.imgEl) {
                        try {
                            doc.setDrawColor(226, 232, 240) // slate-200
                            doc.setLineWidth(0.3)
                            doc.rect(x, rowStartY, colWidth, imageHeight)
                            doc.addImage(item.imgEl, 'JPEG', x, rowStartY, colWidth, imageHeight)
                        } catch (err) {
                            console.error('Error adding image to PDF:', err)
                            doc.setFillColor(241, 245, 249)
                            doc.rect(x, rowStartY, colWidth, imageHeight, 'F')
                            doc.setFont('Helvetica', 'normal')
                            doc.setFontSize(8)
                            doc.setTextColor(148, 163, 184)
                            doc.text('Image non disponible', x + colWidth/2, rowStartY + imageHeight/2, { align: 'center' })
                        }
                    } else {
                        doc.setFillColor(241, 245, 249)
                        doc.rect(x, rowStartY, colWidth, imageHeight, 'F')
                        doc.setDrawColor(226, 232, 240)
                        doc.setLineWidth(0.3)
                        doc.rect(x, rowStartY, colWidth, imageHeight)

                        doc.setFont('Helvetica', 'normal')
                        doc.setFontSize(8)
                        doc.setTextColor(148, 163, 184)
                        doc.text('Image non disponible', x + colWidth/2, rowStartY + imageHeight/2, { align: 'center' })
                    }

                    // Print caption
                    doc.setFont('Helvetica', 'bold')
                    doc.setFontSize(9)
                    doc.setTextColor(51, 65, 85)

                    const captionLines = doc.splitTextToSize(item.caption, colWidth - 4)
                    let capY = rowStartY + imageHeight + 4
                    captionLines.slice(0, 2).forEach((line: string) => {
                        doc.text(line, x + 2, capY)
                        capY += 4
                    })
                }
                
                y = rowStartY + blockHeight
            }

            // --- 6. FOOTER note ---
            checkNewPage(15)
            doc.setFont('Helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184) // slate-400
            doc.text(
                `Ce document est généré par ${settings.company_name || 'Gustav'}. Merci de votre confiance.`,
                pageWidth / 2,
                y,
                { align: 'center' }
            )

            // Save PDF
            const safeFileName = sanitizePdfFileName(quote.title)
            doc.save(`Soumission-${safeFileName}.pdf`)
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

    const itemPhotos: { itemTitle: string, url: string }[] = []
    for (const item of quote.quote_items || []) {
        if (item.image_urls && item.image_urls.length > 0) {
            for (const url of item.image_urls) {
                itemPhotos.push({
                    itemTitle: item.title || 'Sans titre',
                    url: url
                })
            }
        }
    }
    const linkedProject = Array.isArray(quote.projects) ? quote.projects[0] : null
    const isProjectCompleted = linkedProject?.status === 'completed'
    const displayStatus = isProjectCompleted && quote.status === 'approved' ? 'completed' : quote.status

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
                    {displayStatus === 'denied' && <Badge className="bg-red-900/50 text-red-300 border-red-800 border">Refusée</Badge>}
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

                {(quote.status === 'approved' || quote.status === 'sent' || quote.status === 'denied' || quote.status === 'completed') && (
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
                            {quote.quote_items?.map((item: any) => (
                                <tr key={item.id} className="border-b border-zinc-200">
                                    <td className="py-3 pr-4">
                                        <div className="font-bold text-zinc-900 text-sm">{item.title || 'Sans titre'}</div>
                                        {item.description && (
                                            <div className="text-zinc-500 text-xs mt-1 whitespace-pre-wrap">{item.description}</div>
                                        )}
                                    </td>
                                    <td className="py-3 text-center">{item.quantity}</td>
                                    <td className="py-3 text-center">{item.unit || '-'}</td>
                                    <td className="py-3 text-right">${item.unit_cost?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 text-right font-medium text-zinc-900">${item.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</td>
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

                {itemPhotos.length > 0 && (
                    <div className="mt-12 pt-8 border-t-2 border-zinc-200">
                        <h3 className="font-semibold text-zinc-900 mb-4">Annexe : Photos de référence</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {itemPhotos.map((photo: any, index: number) => (
                                <div key={index} className="border border-zinc-200 rounded-md overflow-hidden bg-zinc-50">
                                    <img src={photo.url} alt={photo.itemTitle} className="w-full h-48 object-cover object-center" crossOrigin="anonymous" />
                                    <div className="p-3 text-sm text-zinc-700 font-medium bg-white">{photo.itemTitle}</div>
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
