import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'
import { toast } from 'sonner'

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

export async function downloadQuotePDF(quote: any, settings: any) {
    try {
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

        const durationLabel = quote.estimated_duration_days < 1
            ? `${Math.round(quote.estimated_duration_days * 24 * 100) / 100} heures`
            : `${quote.estimated_duration_days} jours`

        // Map item photos globally
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
            const refNums = item.image_urls?.map((url: string) => itemPhotoRefMap[url]).filter(Boolean) || []
            const refText = refNums.length > 0 ? ` (Photos Réf. ${refNums.map((n: number) => `#${n}`).join(', ')})` : ''

            doc.setFont('Helvetica', 'bold')
            const titleLines = doc.splitTextToSize((item.title || 'Sans titre') + refText, 88)
            
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
                    caption: `Photo Réf. #${photo.refNum} - ${photo.itemTitle}`
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
                        doc.setFillColor(248, 250, 252) // slate-50 background inside frame
                        doc.rect(x, rowStartY, colWidth, imageHeight, 'F')
                        
                        let drawW = colWidth
                        let drawH = imageHeight
                        let xOffset = 0
                        let yOffset = 0

                        const imgRatio = item.imgEl.width / item.imgEl.height
                        const boxRatio = colWidth / imageHeight

                        if (imgRatio > boxRatio) {
                            drawH = colWidth / imgRatio
                            yOffset = (imageHeight - drawH) / 2
                        } else {
                            drawW = imageHeight * imgRatio
                            xOffset = (colWidth - drawW) / 2
                        }

                        doc.addImage(item.imgEl, 'JPEG', x + xOffset, rowStartY + yOffset, drawW, drawH)

                        doc.setDrawColor(226, 232, 240) // slate-200
                        doc.setLineWidth(0.3)
                        doc.rect(x, rowStartY, colWidth, imageHeight)
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
    }
}
