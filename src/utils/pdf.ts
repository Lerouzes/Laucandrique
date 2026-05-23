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

export function parsePoints(points: any): { x: number; y: number }[] {
    if (!points) return []
    if (Array.isArray(points)) {
        return points.map((p: any) => {
            if (typeof p === 'string') {
                try {
                    const parsed = JSON.parse(p)
                    return { x: Number(parsed.x || 0), y: Number(parsed.y || 0) }
                } catch {
                    return { x: 0, y: 0 }
                }
            }
            return { x: Number(p.x || 0), y: Number(p.y || 0) }
        })
    }
    if (typeof points === 'string') {
        try {
            const parsed = JSON.parse(points)
            return parsePoints(parsed)
        } catch {
            return []
        }
    }
    return []
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const x1 = Number(p1.x)
    const y1 = Number(p1.y)
    const x2 = Number(p2.x)
    const y2 = Number(p2.y)
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

export function calculatePerimeter(points: any, scale: number = 20): number {
    const parsedPoints = parsePoints(points)
    if (!parsedPoints || parsedPoints.length < 2) return 0
    let totalDist = 0
    const n = parsedPoints.length
    for (let i = 0; i < n; i++) {
        totalDist += getDistance(parsedPoints[i], parsedPoints[(i + 1) % n])
    }
    return totalDist / scale
}

export function calculateFloorArea(points: any, scale: number = 20): number {
    const parsedPoints = parsePoints(points)
    if (!parsedPoints || parsedPoints.length < 3) return 0
    let area = 0
    const n = parsedPoints.length
    for (let i = 0; i < n; i++) {
        const p1 = parsedPoints[i]
        const p2 = parsedPoints[(i + 1) % n]
        area += (Number(p1.x) * Number(p2.y)) - (Number(p2.x) * Number(p1.y))
    }
    return Math.abs(area) / 2 / (scale * scale)
}

export function calculateWallSurface(points: any, height: number | null, scale: number = 20): number {
    const h = height || 8.0
    const perimeter = calculatePerimeter(points, scale)
    return perimeter * h
}

function formatFeetInches(feetDecimal: number): string {
    const totalInches = Math.round(feetDecimal * 12)
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    if (inches === 0) {
        return `${feet}'`
    }
    return `${feet}' ${inches}"`
}

function isClockwise(points: { x: number; y: number }[]): boolean {
    let sum = 0
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i]
        const p2 = points[(i + 1) % points.length]
        sum += (p2.x - p1.x) * (p2.y + p1.y)
    }
    return sum < 0
}

export function renderRoomToDataURL(
    points: any,
    roomName: string,
    scale: number = 20
): { dataUrl: string; width: number; height: number } | null {
    console.log(`renderRoomToDataURL debug: Room "${roomName}", points:`, points);
    if (typeof window === 'undefined') {
        console.log("renderRoomToDataURL debug: window is undefined (SSR)");
        return null
    }
    const parsedPoints = parsePoints(points)
    if (!parsedPoints || parsedPoints.length < 3) {
        console.log(`renderRoomToDataURL debug: parsedPoints length is ${parsedPoints ? parsedPoints.length : 'null/undefined'} (< 3)`);
        return null
    }

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    parsedPoints.forEach(p => {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
    })

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
        console.log("renderRoomToDataURL debug: dimensions are not finite");
        return null
    }

    const padding = 35
    const rawWidth = (maxX - minX) + 2 * padding
    const rawHeight = (maxY - minY) + 2 * padding

    if (rawWidth <= 0 || rawHeight <= 0 || rawWidth > 10000 || rawHeight > 10000) {
        console.log(`renderRoomToDataURL debug: invalid rawWidth (${rawWidth}) or rawHeight (${rawHeight})`);
        return null
    }

    const resolutionScale = 4
    const canvas = document.createElement('canvas')
    canvas.width = rawWidth * resolutionScale
    canvas.height = rawHeight * resolutionScale

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.scale(resolutionScale, resolutionScale)

    // Clear background to white
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rawWidth, rawHeight)

    const tx = -minX + padding
    const ty = -minY + padding

    // Draw walls: Double line CAD effect
    ctx.beginPath()
    ctx.moveTo(parsedPoints[0].x + tx, parsedPoints[0].y + ty)
    for (let i = 1; i < parsedPoints.length; i++) {
        ctx.lineTo(parsedPoints[i].x + tx, parsedPoints[i].y + ty)
    }
    ctx.closePath()

    // Outer stroke (black/slate-800, thick)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 5
    ctx.lineJoin = 'miter'
    ctx.stroke()

    // Inner stroke (white, thin)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'miter'
    ctx.stroke()

    // Draw dimension lines and ticks
    const n = parsedPoints.length
    for (let i = 0; i < n; i++) {
        const p1 = parsedPoints[i]
        const p2 = parsedPoints[(i + 1) % n]
        
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const pixelLen = Math.sqrt(dx * dx + dy * dy)
        if (pixelLen < 10) continue

        const feetLen = pixelLen / scale

        // Outward normal vector
        const cw = isClockwise(parsedPoints)
        const nx = cw ? dy / pixelLen : -dy / pixelLen
        const ny = cw ? -dx / pixelLen : dx / pixelLen

        // Dimension lines offsets
        const offset = 18
        const extGap = 2
        const extExtend = 3

        const d1x = p1.x + tx + nx * offset
        const d1y = p1.y + ty + ny * offset
        const d2x = p2.x + tx + nx * offset
        const d2y = p2.y + ty + ny * offset

        const e1ex = p1.x + tx + nx * (offset + extExtend)
        const e1ey = p1.y + ty + ny * (offset + extExtend)
        const e2ex = p2.x + tx + nx * (offset + extExtend)
        const e2ey = p2.y + ty + ny * (offset + extExtend)

        // Draw extension lines (thin gray)
        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(p1.x + tx + nx * extGap, p1.y + ty + ny * extGap)
        ctx.lineTo(e1ex, e1ey)
        ctx.moveTo(p2.x + tx + nx * extGap, p2.y + ty + ny * extGap)
        ctx.lineTo(e2ex, e2ey)
        ctx.stroke()

        // Draw the dimension line
        ctx.beginPath()
        ctx.moveTo(d1x, d1y)
        ctx.lineTo(d2x, d2y)
        ctx.stroke()

        // Draw 45-degree architectural ticks at d1 and d2
        const tickSize = 3
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1.0
        ctx.beginPath()
        ctx.moveTo(d1x - tickSize, d1y + tickSize)
        ctx.lineTo(d1x + tickSize, d1y - tickSize)
        ctx.moveTo(d2x - tickSize, d2y + tickSize)
        ctx.lineTo(d2x + tickSize, d2y - tickSize)
        ctx.stroke()

        // Draw the dimension label text
        const midX = (d1x + d2x) / 2
        const midY = (d1y + d2y) / 2
        const angle = Math.atan2(dy, dx)
        
        let textAngle = angle
        if (textAngle < -Math.PI / 2) textAngle += Math.PI
        if (textAngle > Math.PI / 2) textAngle -= Math.PI

        ctx.save()
        ctx.translate(midX, midY)
        ctx.rotate(textAngle)

        ctx.font = 'bold 7.5px Helvetica'
        const label = formatFeetInches(feetLen)
        const textWidth = ctx.measureText(label).width + 3
        const textHeight = 7

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight)

        ctx.fillStyle = '#000000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, 0, 0)

        ctx.restore()
    }

    // Centroid room name
    let sumX = 0, sumY = 0
    parsedPoints.forEach(p => {
        sumX += p.x
        sumY += p.y
    })
    const centroidX = sumX / parsedPoints.length + tx
    const centroidY = sumY / parsedPoints.length + ty

    ctx.font = 'bold 8.5px Helvetica'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // White halo outline
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.strokeText(roomName, centroidX, centroidY)

    // Black text fill
    ctx.fillStyle = '#000000'
    ctx.fillText(roomName, centroidX, centroidY)

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: rawWidth,
        height: rawHeight
    }
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

        const drawBackgroundTemplate = () => {
            const templateUrl = settings?.pdf_template_url || (typeof window !== 'undefined' ? localStorage.getItem('pdf_template_url') : null)
            if (templateUrl) {
                try {
                    let format = 'JPEG'
                    if (templateUrl.startsWith('data:image/png') || templateUrl.includes('image/png')) {
                        format = 'PNG'
                    }
                    doc.addImage(templateUrl, format, 0, 0, pageWidth, pageHeight)
                } catch (e) {
                    console.error('Error drawing PDF background template:', e)
                }
            }
        }

        // Draw template for the first page
        drawBackgroundTemplate()

        // Helper to add a new page and reset cursor
        const checkNewPage = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - 20) {
                doc.addPage()
                drawBackgroundTemplate()
                y = 20
                return true
            }
            return false
        }

        const durationLabel = quote.estimated_duration_days < 1
            ? `${Math.round(quote.estimated_duration_days * 24 * 100) / 100} heures`
            : `${quote.estimated_duration_days} jours`

        const planningSections = quote.quote_planning_sections || []

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

        const renderRoomItemsTable = (room: any, linkedItems: any[]) => {
            if (linkedItems.length === 0) return

            // Render table header
            checkNewPage(15)
            doc.setFillColor(51, 65, 85) // Slate-700
            doc.rect(margin, y, contentWidth, 7, 'F')

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(8.5)
            doc.setTextColor(255, 255, 255)
            doc.text('Description', margin + 3, y + 4.8)
            doc.text('Qté', margin + 95, y + 4.8, { align: 'center' })
            doc.text('Unité', margin + 112, y + 4.8, { align: 'center' })
            doc.text('Prix Unit.', margin + 145, y + 4.8, { align: 'right' })
            doc.text('Total', margin + 177, y + 4.8, { align: 'right' })

            y += 7

            let roomSubtotal = 0

            for (const item of linkedItems) {
                roomSubtotal += Number(item.total || 0)

                const refNums = item.image_urls?.map((url: string) => itemPhotoRefMap[url]).filter(Boolean) || []
                const refText = refNums.length > 0 ? ` (Photos Réf. ${refNums.map((n: number) => `#${n}`).join(', ')})` : ''

                const titleText = (item.title || 'Sans titre') + refText

                let sourceLabel = ''
                if (item.planning_measurement_source === 'perimeter') {
                    sourceLabel = 'Périmètre'
                } else if (item.planning_measurement_source === 'area') {
                    sourceLabel = 'Aire au sol'
                } else if (item.planning_measurement_source === 'wall_surface') {
                    sourceLabel = 'Surface murs'
                } else if (item.planning_measurement_source === 'selected_walls_linear') {
                    const segments = item.planning_selected_segments || []
                    const wallList = segments.map((idx: number) => `M${idx + 1}`).join(', ')
                    sourceLabel = `Murs spéc. (linéaire: ${wallList})`
                } else if (item.planning_measurement_source === 'selected_walls_surface') {
                    const segments = item.planning_selected_segments || []
                    const wallList = segments.map((idx: number) => `M${idx + 1}`).join(', ')
                    sourceLabel = `Murs spéc. (surface: ${wallList})`
                }

                const descText = item.description || ''
                const subDescText = sourceLabel ? `Calculé via : ${sourceLabel}` : ''

                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(8.5)
                const titleLines = doc.splitTextToSize(titleText, 88)

                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                const descLines = descText ? doc.splitTextToSize(descText, 88) : []

                doc.setFont('Helvetica', 'italic')
                doc.setFontSize(7.5)
                const sourceLines = subDescText ? doc.splitTextToSize(subDescText, 88) : []

                const rowHeight = Math.max(7,
                    titleLines.length * 3.5 +
                    (descLines.length > 0 ? descLines.length * 3.5 + 1.5 : 0) +
                    (sourceLines.length > 0 ? sourceLines.length * 3.5 + 1.5 : 0) +
                    3
                )

                checkNewPage(rowHeight)

                // White background row with slate separator
                doc.setFillColor(255, 255, 255)
                doc.rect(margin, y, contentWidth, rowHeight, 'F')
                doc.setDrawColor(241, 245, 249)
                doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight)

                // Draw wrapped title
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(8.5)
                doc.setTextColor(15, 23, 42)
                let textY = y + 3.5
                titleLines.forEach((line: string) => {
                    doc.text(line, margin + 3, textY)
                    textY += 3.5
                })

                // Draw description
                if (descLines.length > 0) {
                    textY += 0.5
                    doc.setFont('Helvetica', 'normal')
                    doc.setFontSize(8)
                    doc.setTextColor(71, 85, 105)
                    descLines.forEach((line: string) => {
                        doc.text(line, margin + 3, textY)
                        textY += 3.5
                    })
                }

                // Draw source label
                if (sourceLines.length > 0) {
                    textY += 0.5
                    doc.setFont('Helvetica', 'italic')
                    doc.setFontSize(7.5)
                    doc.setTextColor(100, 116, 139)
                    sourceLines.forEach((line: string) => {
                        doc.text(line, margin + 3, textY)
                        textY += 3.5
                    })
                }

                // Draw columns: Qty, Unit, Unit Cost, Total
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.setTextColor(51, 65, 85)
                doc.text(String(item.quantity || 0), margin + 95, y + 4, { align: 'center' })
                doc.text(item.unit || '-', margin + 112, y + 4, { align: 'center' })
                doc.text(`$${Number(item.unit_cost || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, margin + 145, y + 4, { align: 'right' })
                doc.text(`$${Number(item.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`, margin + 177, y + 4, { align: 'right' })

                y += rowHeight
            }

            // Print bold subtotal
            checkNewPage(10)
            y += 3
            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(15, 23, 42)
            const subtotalText = `Total pour ${room.name} : $${roomSubtotal.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`
            doc.text(subtotalText, margin + contentWidth, y, { align: 'right' })
            y += 6
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
        const unlinkedItems = (quote.quote_items || []).filter((item: any) => !item.planning_room_id)

        if (unlinkedItems.length > 0) {
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
            const roomMap: Record<string, { name: string; sectionName: string }> = {}
            planningSections.forEach((sec: any) => {
                const rooms = sec.quote_planning_rooms || []
                rooms.forEach((room: any) => {
                    roomMap[room.id] = {
                        name: room.name,
                        sectionName: sec.name
                    }
                })
            })

            doc.setFont('Helvetica', 'normal')
            doc.setFontSize(9)

            for (const item of unlinkedItems) {
                const refNums = item.image_urls?.map((url: string) => itemPhotoRefMap[url]).filter(Boolean) || []
                const refText = refNums.length > 0 ? ` (Photos Réf. ${refNums.map((n: number) => `#${n}`).join(', ')})` : ''

                doc.setFont('Helvetica', 'bold')
                const titleLines = doc.splitTextToSize((item.title || 'Sans titre') + refText, 88)
                
                const descText = item.description || ''
                let fullDesc = descText

                doc.setFont('Helvetica', 'normal')
                const descLines = fullDesc ? doc.splitTextToSize(fullDesc, 88) : []
                
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
        }

        // --- 5.6 PLANS & MEASUREMENTS ---
        console.log("downloadQuotePDF debug: planningSections raw:", planningSections);
        const allRooms: any[] = []
        planningSections.forEach((sec: any) => {
            const rooms = sec.quote_planning_rooms || []
            console.log(`downloadQuotePDF debug: Section "${sec.name}" has rooms:`, rooms);
            rooms.forEach((room: any) => {
                const parsedPoints = parsePoints(room.points)
                console.log(`downloadQuotePDF debug: Room "${room.name}", parsedPoints:`, parsedPoints);
                allRooms.push({
                    ...room,
                    sectionName: sec.name,
                    points: parsedPoints
                })
            })
        })
        console.log("downloadQuotePDF debug: Compiled allRooms:", allRooms);

        if (allRooms.length > 0) {
            doc.addPage()
            drawBackgroundTemplate()
            y = 20

            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(14)
            doc.setTextColor(15, 23, 42)
            doc.text('ANNEXE : PLANS & MESURES', margin, y)
            y += 10

            for (const room of allRooms) {
                const hasDrawing = room.points && room.points.length >= 3
                checkNewPage(hasDrawing ? 72 : 30)

                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(11)
                doc.setTextColor(15, 23, 42) // slate-900
                const titleStr = room.sectionName ? `${room.sectionName} - ${room.name}` : room.name
                doc.text(titleStr, margin, y)

                const heightVal = room.height || 8.0
                doc.text(`Hauteur du plafond: ${heightVal}'`, pageWidth - margin, y, { align: 'right' })

                y += 2
                doc.setDrawColor(0, 0, 0)
                doc.setLineWidth(0.5)
                doc.line(margin, y, pageWidth - margin, y)
                y += 6

                if (room.description) {
                    doc.setFont('Helvetica', 'italic')
                    doc.setFontSize(9)
                    doc.setTextColor(100, 116, 139)
                    doc.text(room.description, margin, y)
                    y += 5
                }

                if (hasDrawing) {
                    const rendered = renderRoomToDataURL(room.points, room.name)
                    if (rendered) {
                        try {
                            const { dataUrl, width, height } = rendered
                            const ratio = width / height

                            const boxW = 55
                            const boxH = 55

                            let drawW = boxW
                            let drawH = boxH
                            if (ratio > 1) {
                                drawH = boxW / ratio
                            } else {
                                drawW = boxH * ratio
                            }

                            const xOffset = (boxW - drawW) / 2
                            const yOffset = (boxH - drawH) / 2

                            doc.addImage(dataUrl, 'PNG', margin + xOffset, y + yOffset, drawW, drawH)

                            // Render metrics in two columns next to the drawing
                            const perimeter = calculatePerimeter(room.points)
                            const area = calculateFloorArea(room.points)
                            const wallSurface = calculateWallSurface(room.points, room.height)

                            const plancherVal = area
                            const plafondVal = area
                            const mursVal = wallSurface
                            const mursEtPlafondVal = wallSurface + area
                            const solVgVal = area / 9
                            const perimPlancherVal = perimeter
                            const perimPlafondVal = perimeter

                            const formatNum = (val: number) => val.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                            const metricsList = [
                                {
                                    col1Num: formatNum(mursVal),
                                    col1Label: 'pi² murs',
                                    col2Num: formatNum(plafondVal),
                                    col2Label: 'pi² plafond'
                                },
                                {
                                    col1Num: formatNum(mursEtPlafondVal),
                                    col1Label: 'pi² murs et plafond',
                                    col2Num: formatNum(plancherVal),
                                    col2Label: 'pi² plancher'
                                },
                                {
                                    col1Num: formatNum(solVgVal),
                                    col1Label: 'vg² revêtement de sol',
                                    col2Num: formatNum(perimPlancherVal),
                                    col2Label: 'pi lin. périmètre du plancher'
                                },
                                {
                                    col1Num: formatNum(perimPlafondVal),
                                    col1Label: 'pi lin. périmètre du plafond',
                                    col2Num: '',
                                    col2Label: ''
                                }
                            ]

                            doc.setFont('Helvetica', 'normal')
                            doc.setFontSize(8.5)
                            doc.setTextColor(0, 0, 0)

                            const col1NumX = 95
                            const col1LabelX = 97
                            const col2NumX = 150
                            const col2LabelX = 152

                            let metricsY = y + 8
                            metricsList.forEach(row => {
                                // Draw column 1
                                doc.text(row.col1Num, col1NumX, metricsY, { align: 'right' })
                                doc.text(row.col1Label, col1LabelX, metricsY)

                                // Draw column 2
                                if (row.col2Num) {
                                    doc.text(row.col2Num, col2NumX, metricsY, { align: 'right' })
                                    doc.text(row.col2Label, col2LabelX, metricsY)
                                }
                                metricsY += 6
                            })

                            // Move y down past the drawing/metrics block
                            y += boxH + 4

                            // List linked items below
                            const linkedItems = (quote.quote_items || []).filter((item: any) => item.planning_room_id === room.id)
                            renderRoomItemsTable(room, linkedItems)
                        } catch (err) {
                            console.error('Error drawing room in PDF:', err)
                            y += 5
                        }
                    } else {
                        y += 5
                    }
                } else {
                    // No drawing: just list metrics and linked items flatly
                    const perimeter = calculatePerimeter(room.points)
                    const area = calculateFloorArea(room.points)
                    const wallSurface = calculateWallSurface(room.points, room.height)
                    const heightVal = room.height || 8.0

                    doc.setFont('Helvetica', 'normal')
                    doc.setFontSize(9)
                    doc.setTextColor(51, 65, 85)

                    let metricsText = `Périmètre: ${perimeter.toFixed(1)} pi  |  Aire au sol: ${area.toFixed(1)} pi²  |  Hauteur: ${heightVal.toFixed(1)} pi  |  Surface des murs: ${wallSurface.toFixed(1)} pi²`
                    doc.text(metricsText, margin, y)
                    y += 6

                    const linkedItems = (quote.quote_items || []).filter((item: any) => item.planning_room_id === room.id)
                    renderRoomItemsTable(room, linkedItems)
                }
                
                y += 6
            }
        }

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
            drawBackgroundTemplate()
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
                        drawBackgroundTemplate()
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
