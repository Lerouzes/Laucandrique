// @ts-nocheck
'use client'

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Mail, Phone, Calendar, TrendingUp, TrendingDown, ArrowRight, Trash2, Network, Users, ShieldAlert, Search, Download, Loader2, Upload, X, CheckCircle2, Save, Eye } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { deleteCommunicationStatsAction, saveCommunicationStatsAction } from '@/actions/communication-stats'
import { toggleDoorBoardMemberAction } from '@/actions/clients'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    Cell,
    ReferenceLine,
    ComposedChart,
    Line
} from 'recharts'

interface CommStatRecord {
    id: string
    client_id: string
    analysis_date: string
    period_start: string | null
    period_end: string | null
    total_emails: number
    total_phone_calls: number
    total_communications: number
    analysis_summary: any
    created_at: string
}

interface ClientCommunicationTrendsProps {
    stats: CommStatRecord[]
    clientId: string
    teamComparison?: any[]
    targetIndex?: number
    initialDoors?: any[]
    clientName?: string
    managers?: any[]
}

const DEPT_LIST = ["Gestion", "Gestionnaire", "Administration", "Comptabilité", "Travaux Majeurs", "Sinistres", "Assurance", "Direction", "Chargé d’opération", "Conseil d'Administration", "Marketing"]

const DEPT_COLORS: Record<string, string> = {
    "Gestion": "#3b82f6", // Blue
    "Gestionnaire": "#4f46e5", // Indigo
    "Administration": "#0d9488", // Teal
    "Comptabilité": "#8b5cf6", // Purple
    "Travaux Majeurs": "#f97316", // Orange
    "Sinistres": "#ef4444", // Red
    "Assurance": "#ec4899", // Pink
    "Direction": "#64748b", // Slate
    "Chargé d’opération": "#6366f1", // Indigo
    "Chargé d'opération": "#6366f1",
    "Conseil d'Administration": "#f59e0b", // Amber
    "Marketing": "#d946ef" // Fuchsia
}

// Initial Employee Department Map matching the HTML tool precisely
const INITIAL_DEPT_MAP: Record<string, string> = {
    // Accounting / Comptabilité
    "Paul Gauthier": "Comptabilité",
    "Violeta Bente": "Comptabilité",
    "Compte Payable Laucandrique": "Comptabilité",
    "Comptabilité": "Comptabilité",
    "Comptabilite": "Comptabilité",
    "Madeleine Cormier": "Comptabilité",
    "Benoit Morin": "Comptabilité",
    "Marie-Pierre Martel": "Comptabilité",
    "Helene Satou Ndour": "Comptabilité",
    "Nouredine Achouri": "Comptabilité",
    "Line Garand": "Comptabilité",
    "Danielle Guidi": "Comptabilité",
    "Ian Coulombe": "Comptabilité",
    "Marie-Perle Arseneault": "Comptabilité",
    "Marc-Evens Elyse": "Comptabilité",
    "Wilfried Hessede": "Comptabilité",
    "Alessandra Monique Tavares": "Comptabilité",

    // Administration
    "Reception Laucandrique": "Administration",
    "Réception Laucandrique": "Administration",
    "Tania Senécal": "Administration",
    "Tania Senecal": "Administration",
    "Réception - Suzanne Sylvestre": "Administration",
    "Reception - Suzanne Sylvestre": "Administration",
    "Hélène Pucacco": "Administration",
    "Helene Pucacco": "Administration",
    "Carine Leroux": "Administration",
    "L'équipe Laucandrique Tremblant": "Administration",
    "L'equipe Laucandrique Tremblant": "Administration",
    "Mylene Choiniere": "Administration",
    "Mylène Choinière": "Administration",
    "Linda Bouchard": "Administration",
    "Administration Laucandrique": "Administration",
    "Maggy Carocha": "Administration",
    "Suzie Dextraze": "Administration",
    "Catherine Ducharme": "Administration",
    "Anne-Marie Sauvageau": "Administration",
    "Jillian Wise": "Administration",
    "Janie Beauchemin": "Administration",

    // Sinistres
    "Département Sinistres": "Sinistres",
    "Departement Sinistres": "Sinistres",
    "Sinistre Laucandrique": "Sinistres",
    "Victoria Ponomarenko": "Sinistres",
    "Alaa-Eddine Lemrabete": "Sinistres",
    "Ekampreet Sudhar Singh": "Sinistres",
    "Halle T. Bellange": "Sinistres",
    "Nour Hejazin": "Sinistres",
    "Patrice Anfosso": "Sinistres",
    "Jean-Philippe Lemieux": "Sinistres",
    "Caroline Lamothe": "Sinistres",
    "Francisco Leonardo Contreras Ordenes": "Sinistres",

    // Chargé d’opération
    "Stéphane Genest": "Chargé d’opération",
    "Stephane Genest": "Chargé d’opération",
    "Carlos Villegas": "Chargé d’opération",
    "Kelly Frost": "Chargé d’opération",
    "operations": "Chargé d’opération",
    "operations12": "Chargé d’opération",
    "opérations": "Chargé d’opération",
    "Genest Stéphane": "Chargé d’opération",
    "Genest Stephane": "Chargé d’opération",
    "Gabriel Gauvin": "Chargé d’opération",
    "Patrice Marcil": "Chargé d’opération",
    "Sylvain Chichillanne": "Chargé d’opération",
    "Djellany Mohamed Cherif": "Chargé d’opération",
    "Sacha Mihajlovic": "Chargé d’opération",

    // Travaux Majeurs
    "Angelique Hesbois": "Travaux Majeurs",
    "Angélique Hesbois": "Travaux Majeurs",
    "Victor Dubremetz": "Travaux Majeurs",
    "Patrice Asselin": "Travaux Majeurs",

    // Assurance
    "Marie-Camille Benhamou": "Assurance",

    // Marketing
    "Nada Talbi": "Marketing",

    // Direction
    "Nicole Rousseau": "Direction",
    "Marc Boyer": "Direction",
    "Hélène Vallerand": "Direction",
    "Jean-Philippe Morin": "Direction",
    "Francesca Chabot": "Direction",

    // Gestion
    "Édouard Le Rouzes": "Gestion"
}

const classifyCommType = (typeStr: string): 'outboundEmail' | 'inboundEmail' | 'chat' | 'phoneCall' | 'other' => {
    let t = (typeStr || "").toLowerCase().trim()
    
    // Handle potential mojibake/UTF-8 double encoding issues
    t = t.replace(/expã©diã©/g, "expedie")
         .replace(/reã§u/g, "recu")
         .replace(/expã©/g, "expe")
         .replace(/reã§/g, "rec")
         .replace(/expÃ©diÃ©/g, "expedie")
         .replace(/reÃ§u/g, "recu")
         .replace(/expÃ©/g, "expe")
         .replace(/reÃ§/g, "rec")
         
    // Normalize accents
    t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    
    if (t.includes("expedi") || t.includes("sent") || t.includes("envoi")) return 'outboundEmail'
    if (t.includes("recu") || t.includes("received")) return 'inboundEmail'
    if (t.includes("clavardage") || t.includes("chat")) return 'chat'
    if (t.includes("telephone") || t.includes("phone") || t.includes("appel") || t.includes("call")) return 'phoneCall'
    return 'other'
}

const normalizeEmployeeName = (name: string): string => {
    if (!name) return ""
    const clean = name.trim()
    const lower = clean.toLowerCase()
    if (lower === "jillian wise" || lower === "wise jillian" || lower === "wise.jillian") return "Jillian Wise"
    if (lower === "edouard le rouzes" || lower === "édouard le rouzes") return "Édouard Le Rouzes"
    if (lower === "maggy") return "Maggy Carocha"
    return clean
}

const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null
    const cleanStr = dateStr.trim().replace(/^"|"$/g, '')
    
    let d = new Date(cleanStr)
    if (!isNaN(d.getTime())) return d
    
    if (cleanStr.includes('/')) {
        const parts = cleanStr.split(' ')
        const dateParts = parts[0].split('/')
        if (dateParts.length === 3) {
            let day = 1, month = 0, year = 2000
            if (dateParts[0].length === 4) {
                year = parseInt(dateParts[0], 10)
                month = parseInt(dateParts[1], 10) - 1
                day = parseInt(dateParts[2], 10)
            } else {
                day = parseInt(dateParts[0], 10)
                month = parseInt(dateParts[1], 10) - 1
                year = parseInt(dateParts[2], 10)
                if (year < 100) year += 2000
            }
            
            let hour = 0, min = 0, sec = 0
            if (parts[1]) {
                const timeParts = parts[1].split(':')
                hour = parseInt(timeParts[0], 10) || 0
                min = parseInt(timeParts[1], 10) || 0
                sec = parseInt(timeParts[2], 10) || 0
            }
            d = new Date(year, month, day, hour, min, sec)
            if (!isNaN(d.getTime())) return d
        }
    }
    
    if (cleanStr.includes('-')) {
        const parts = cleanStr.split(' ')
        const dateParts = parts[0].split('-')
        if (dateParts.length === 3) {
            let day = 1, month = 0, year = 2000
            if (dateParts[0].length === 4) {
                year = parseInt(dateParts[0], 10)
                month = parseInt(dateParts[1], 10) - 1
                day = parseInt(dateParts[2], 10)
            } else {
                day = parseInt(dateParts[0], 10)
                month = parseInt(dateParts[1], 10) - 1
                year = parseInt(dateParts[2], 10)
                if (year < 100) year += 2000
            }
            
            let hour = 0, min = 0, sec = 0
            if (parts[1]) {
                const timeParts = parts[1].split(':')
                hour = parseInt(timeParts[0], 10) || 0
                min = parseInt(timeParts[1], 10) || 0
                sec = parseInt(timeParts[2], 10) || 0
            }
            d = new Date(year, month, day, hour, min, sec)
            if (!isNaN(d.getTime())) return d
        }
    }
    
    return null
}

const extractDateMeta = (dateString: string) => {
    let year = "Unknown"
    let month = "Unknown"
    if(!dateString) return { year, month }
    
    const parsed = parseDateString(dateString)
    if (parsed) {
        year = parsed.getFullYear().toString()
        const m = parsed.getMonth() + 1 // 1-indexed
        month = m < 10 ? "0" + m : m.toString()
    }
    return { year, month }
}

const parseCSVLine = (text: string, delimiter: string): string[] => {
    let p = '', c = '', r: string[] = []
    let q = false
    for (let i = 0; i < text.length; i++) {
        c = text.charAt(i)
        if (c === '"') {
            if (q && text.charAt(i+1) === '"') { 
                if (r.length > 0) r[r.length-1] += '"'; else p += '"';
                i++; 
            } else { q = !q; }
        } else if (c === delimiter && !q) { r.push(p); p = ''; } else { p += c; }
    }
    r.push(p)
    return r
}

export function ClientCommunicationTrends({ 
    stats: initialStats, 
    clientId, 
    teamComparison = [], 
    targetIndex = 2.50,
    initialDoors = [],
    clientName = 'Syndicat',
    managers = []
}: ClientCommunicationTrendsProps) {
    const router = useRouter()
    const [stats, setStats] = useState<CommStatRecord[]>(initialStats)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedRunId, setSelectedRunId] = useState<string>('')
    const [doors, setDoors] = useState<any[]>(initialDoors)
    const [unitSearch, setUnitSearch] = useState('')
    const [visibleDepts, setVisibleDepts] = useState<string[]>([])

    // Direct Upload / Analyzer states
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [isParsing, setIsParsing] = useState(false)
    const [rawRows, setRawRows] = useState<any[]>([])
    const [excludedOtonom, setExcludedOtonom] = useState<any[]>([])
    const [excludedAssign, setExcludedAssign] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [hasSaved, setHasSaved] = useState(false)
    const [deptMap, setDeptMap] = useState<Record<string, string>>(INITIAL_DEPT_MAP)

    // Sync initialStats when they change (e.g. after database insert)
    useEffect(() => {
        if (initialStats) {
            setStats(initialStats)
            if (initialStats.length > 0) {
                setSelectedRunId(initialStats[initialStats.length - 1].id)
            }
        }
    }, [initialStats])

    const toggleDeptLine = (dept: string) => {
        setVisibleDepts(prev => 
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        )
    }

    const parseFile = (file: File) => {
        setIsParsing(true)
        setCsvFile(file)
        setRawRows([])
        setExcludedOtonom([])
        setExcludedAssign([])
        setHasSaved(false)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string
                const lines = text.split(/\r?\n/)
                let headerIndex = -1
                
                for(let i=0; i<lines.length; i++) {
                    const l = lines[i].toLowerCase()
                    if(l.includes('lot') && l.includes('objet') && (l.includes('ajouté par') || l.includes('ajoute par'))) { 
                        headerIndex = i
                        break 
                    }
                }

                if(headerIndex === -1) { 
                    toast.error("Format d'historique invalide : En-tête 'Lot', 'Objet' et 'Ajouté par' introuvable.")
                    setIsParsing(false)
                    return 
                }

                let delimiter = ','
                if (lines[headerIndex].includes(';')) delimiter = ';'
                else if (lines[headerIndex].includes('\t')) delimiter = '\t'

                const headers = lines[headerIndex].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
                const idxLot = headers.findIndex(h => h.toLowerCase() === 'lot')
                const idxType = headers.findIndex(h => h.toLowerCase() === 'type')
                const idxDate = headers.findIndex(h => h.toLowerCase() === 'date')
                const idxUnite = headers.findIndex(h => h.toLowerCase() === 'unité' || h.toLowerCase() === 'unite')
                const idxDest = headers.findIndex(h => h.toLowerCase() === 'destinataire')
                const idxTargetObjet = headers.findIndex(h => h.toLowerCase() === 'objet')
                const idxUser = headers.findIndex(h => h.toLowerCase().includes('ajouté par') || h.toLowerCase().includes('ajoute par'))

                const existingRanges = stats
                    .filter((s: any) => s.period_start && s.period_end)
                    .map((s: any) => ({
                        startStr: s.period_start,
                        endStr: s.period_end
                    }))

                const rows: any[] = []
                const otonoms: any[] = []
                const assigns: any[] = []
                let skippedOverlapCount = 0

                for(let i = headerIndex + 1; i < lines.length; i++) {
                    if(!lines[i].trim()) continue
                    const row = parseCSVLine(lines[i], delimiter)
                    
                    const userRaw = row[idxUser] ? row[idxUser].trim().replace(/^"|"$/g, '') : ""
                    const objet = row[idxTargetObjet] ? row[idxTargetObjet].trim().replace(/^"|"$/g, '') : ""
                    const type = row[idxType] ? row[idxType].trim().replace(/^"|"$/g, '') : ""
                    const dateStr = row[idxDate] ? row[idxDate].trim().replace(/^"|"$/g, '') : ""
                    const lotId = row[idxLot] ? row[idxLot].trim() : ""
                    const unitNum = row[idxUnite] ? row[idxUnite].trim().replace(/^"|"$/g, '').replace(/^0+/, '') : ""
                    const dest = row[idxDest] ? row[idxDest].trim().replace(/^"|"$/g, '') : ""

                    const rowDateObj = parseDateString(dateStr)
                    if (rowDateObj) {
                        const rowDateStr = rowDateObj.toISOString().substring(0, 10)
                        const isOverlap = existingRanges.some(r => rowDateStr >= r.startStr && rowDateStr <= r.endStr)
                        if (isOverlap) {
                            skippedOverlapCount++
                            continue
                        }
                    }

                    const model: any = { lot: lotId, type: type, date: dateStr, unite: unitNum, destinataire: dest, objet: objet, user: userRaw }

                    if(userRaw === "Otonomsolution") { 
                        otonoms.push(model)
                        continue 
                    }
                    if(objet.toLowerCase().includes("you have been assigned") || objet.toLowerCase().includes("vous avez été assigné")) {
                        assigns.push(model)
                        continue
                    }

                    const userNormalized = normalizeEmployeeName(userRaw) || "Système Auto"
                    const dateMeta = extractDateMeta(dateStr)
                    model.year = dateMeta.year
                    model.month = dateMeta.month
                    model.user = userNormalized
                    
                    rows.push(model)
                }

                setRawRows(rows)
                setExcludedOtonom(otonoms)
                setExcludedAssign(assigns)
                
                if (skippedOverlapCount > 0) {
                    toast.info(`${skippedOverlapCount} lignes ignorées car elles chevauchent des dates déjà importées pour ce syndicat.`)
                }
                toast.success(`${rows.length} communications valides importées.`)
            } catch (err: any) {
                console.error(err)
                toast.error("Impossible de parser le fichier CSV.")
            } finally {
                setIsParsing(false)
            }
        }
        reader.readAsText(file)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            parseFile(e.target.files[0])
        }
    }

    const pipelineData = useMemo(() => {
        if (rawRows.length === 0) return null

        const cleanStringForMatch = (str: string) => {
            return str
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
        }

        const isUserAManager = (userStr: string) => {
            const cleanUser = cleanStringForMatch(userStr)
            if (cleanUser === "marie-camille benhamou" || cleanUser === "marie camille benhamou") return false
            const configuredDept = deptMap[userStr]
            if (configuredDept === "Gestionnaire") return true

            if (!userStr || !managers || managers.length === 0) return false
            
            return managers.some(m => {
                const first = m.first_name || ""
                const last = m.last_name || ""
                const cleanFirst = cleanStringForMatch(first)
                const cleanLast = cleanStringForMatch(last)
                if (!cleanFirst && !cleanLast) return false
                
                const cleanFull = `${cleanFirst} ${cleanLast}`.trim()
                if (cleanUser === cleanFull) return true
                if (cleanUser.includes(cleanFull) || cleanFull.includes(cleanUser)) return true
                
                if (cleanFirst && cleanLast) {
                    if (cleanUser === `${cleanLast} ${cleanFirst}`) return true
                }
                return false
            })
        }

        let cleanVolume = 0
        let contractInclusionsVolume = 0
        let outboundEmailsCount = 0
        let inboundEmailsCount = 0
        let chatsCount = 0
        let phoneCallsCount = 0
        let othersCount = 0

        const deptCounts: Record<string, number> = {}
        DEPT_LIST.forEach(d => { deptCounts[d] = 0; })

        const timelineChronologyMap: Record<string, { 
            contractVolume: number; 
            outOfContractVolume: number;
            outboundEmails: number;
            inboundEmails: number;
            chats: number;
            phoneCalls: number;
            others: number;
        }> = {}

        rawRows.forEach(row => {
            const cleanUser = cleanStringForMatch(row.user)
            const isMarieCamille = (cleanUser === "marie-camille benhamou" || cleanUser === "marie camille benhamou")
            
            let resolvedDept = deptMap[row.user] || "Gestion"
            if (isMarieCamille) {
                const rowDate = parseDateString(row.date)
                const isBefore2025 = rowDate ? (rowDate.getFullYear() < 2025) : false
                if (isBefore2025) {
                    resolvedDept = "Gestion"
                } else {
                    resolvedDept = "Assurance"
                }
            }

            if (resolvedDept === "Gestionnaire") {
                resolvedDept = "Gestion"
            }

            const timelineKey = (row.year !== "Unknown" && row.month !== "Unknown") ? `${row.year}-${row.month}` : "Unknown"

            if (timelineKey !== "Unknown") {
                if (!timelineChronologyMap[timelineKey]) {
                    timelineChronologyMap[timelineKey] = { 
                        contractVolume: 0, 
                        outOfContractVolume: 0,
                        outboundEmails: 0,
                        inboundEmails: 0,
                        chats: 0,
                        phoneCalls: 0,
                        others: 0
                    }
                }
                if (resolvedDept !== "Sinistres" && resolvedDept !== "Travaux Majeurs") {
                    timelineChronologyMap[timelineKey].contractVolume++
                } else {
                    timelineChronologyMap[timelineKey].outOfContractVolume++
                }

                const cls = classifyCommType(row.type)
                if (cls === 'outboundEmail') timelineChronologyMap[timelineKey].outboundEmails++
                else if (cls === 'inboundEmail') timelineChronologyMap[timelineKey].inboundEmails++
                else if (cls === 'chat') timelineChronologyMap[timelineKey].chats++
                else if (cls === 'phoneCall') timelineChronologyMap[timelineKey].phoneCalls++
                else timelineChronologyMap[timelineKey].others++
            }

            cleanVolume++
            
            if (deptCounts[resolvedDept] !== undefined) {
                deptCounts[resolvedDept]++
            }
            
            let isMgr = isUserAManager(row.user)
            if (isMarieCamille) {
                const rowDate = parseDateString(row.date)
                const isBefore2025 = rowDate ? (rowDate.getFullYear() < 2025) : false
                if (isBefore2025) {
                    isMgr = true
                } else {
                    isMgr = false
                }
            }
            
            if (isMgr && deptCounts["Gestionnaire"] !== undefined) {
                deptCounts["Gestionnaire"]++
            }

            if (resolvedDept !== "Sinistres" && resolvedDept !== "Travaux Majeurs") {
                contractInclusionsVolume++
            }

            const cls = classifyCommType(row.type)
            if (cls === 'outboundEmail') outboundEmailsCount++
            else if (cls === 'inboundEmail') inboundEmailsCount++
            else if (cls === 'chat') chatsCount++
            else if (cls === 'phoneCall') phoneCallsCount++
            else othersCount++
        })

        const doorsCount = doors.length || 90
        const timelineList = Object.entries(timelineChronologyMap)
            .map(([period, data]) => {
                const ratio = (data.contractVolume / Math.max(1, doorsCount)).toFixed(2)
                return {
                    period,
                    contractVolume: data.contractVolume,
                    outOfContractVolume: data.outOfContractVolume,
                    ratio: Number(ratio),
                    outboundEmails: data.outboundEmails,
                    inboundEmails: data.inboundEmails,
                    chats: data.chats,
                    phoneCalls: data.phoneCalls,
                    others: data.others
                }
            })
            .sort((a, b) => a.period.localeCompare(b.period))

        const unitCounts: Record<string, number> = {}
        rawRows.forEach(row => {
            if (row.unite && row.unite !== "" && row.unite !== "-") {
                unitCounts[row.unite] = (unitCounts[row.unite] || 0) + 1
            }
        })
        const sortedUnits = Object.entries(unitCounts)
            .map(([unit, count]) => ({ unit, count }))
            .sort((a, b) => b.count - a.count)

        return {
            totalVolume: cleanVolume,
            contractInclusionsVolume,
            deptCounts,
            timelineList,
            sortedUnits,
            outboundEmails: outboundEmailsCount,
            inboundEmails: inboundEmailsCount,
            chats: chatsCount,
            phoneCalls: phoneCallsCount,
            others: othersCount
        }
    }, [rawRows, deptMap, doors])

    const handleSaveAnalysis = async () => {
        if (!clientId || rawRows.length === 0 || !pipelineData) {
            toast.error("Aucune donnée à sauvegarder.")
            return
        }

        setIsSaving(true)
        try {
            const activePeriodDates = rawRows
                .map(r => parseDateString(r.date))
                .filter((d): d is Date => d !== null)
                .sort((a, b) => a.getTime() - b.getTime())
            
            const period_start = activePeriodDates.length > 0 ? activePeriodDates[0].toISOString().substring(0, 10) : null
            const period_end = activePeriodDates.length > 0 ? activePeriodDates[activePeriodDates.length - 1].toISOString().substring(0, 10) : null

            const doorsCount = doors.length || 90
            const summaryPayload = {
                period_start,
                period_end,
                total_emails: pipelineData.outboundEmails + pipelineData.inboundEmails,
                total_phone_calls: pipelineData.phoneCalls,
                total_communications: rawRows.length,
                analysis_date: period_end,
                analysis_summary: {
                    total_units: doorsCount,
                    deptCounts: pipelineData.deptCounts,
                    timelineList: pipelineData.timelineList,
                    sortedUnits: pipelineData.sortedUnits,
                    dynamicDeptMap: deptMap,
                    analysis_date: period_end || new Date().toISOString(),
                    typeRecap: {
                        outboundEmails: pipelineData.outboundEmails,
                        inboundEmails: pipelineData.inboundEmails,
                        chats: pipelineData.chats,
                        phoneCalls: pipelineData.phoneCalls,
                        others: pipelineData.others
                    }
                }
            }

            const res = await saveCommunicationStatsAction(clientId, summaryPayload)
            if (res.success) {
                toast.success("Statistiques de l'audit de communication enregistrées !")
                setHasSaved(true)
                setRawRows([])
                setCsvFile(null)
                router.refresh()
            }
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la sauvegarde.")
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        if (initialDoors) {
            setDoors(initialDoors)
        }
    }, [initialDoors])
    
    // Date filter states
    const [filterMode, setFilterMode] = useState<'all' | 'year' | 'custom'>('all')
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [customStartMonth, setCustomStartMonth] = useState<string>('')
    const [customEndMonth, setCustomEndMonth] = useState<string>('')
    const [isExporting, setIsExporting] = useState(false)

    const handleExportPDF = async () => {
        setIsExporting(true)
        try {
            const element = document.getElementById('client-trends-content')
            if (!element) {
                alert('Contenu à exporter introuvable')
                return
            }

            const html2CanvasFn = (html2canvas as any).default || html2canvas
            const canvas = await html2CanvasFn(element, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: '#0c0d12',
                windowWidth: 1400,
                onclone: (clonedDoc) => {
                    const containers = clonedDoc.querySelectorAll('.recharts-responsive-container');
                    containers.forEach((container: any) => {
                        container.style.width = '600px';
                        container.style.height = '300px';
                        const svg = container.querySelector('svg');
                        if (svg) {
                            svg.setAttribute('width', '600');
                            svg.setAttribute('height', '300');
                            svg.style.width = '600px';
                            svg.style.height = '300px';
                        }
                    });

                    // Convert oklch/lab/oklab colors to hex/rgb for html2canvas
                    const defaultView = clonedDoc.defaultView;
                    if (defaultView) {
                        const colorCache: Record<string, string> = {};
                        const convertColorToRgb = (colorStr: string) => {
                            if (!colorStr || typeof colorStr !== 'string') return colorStr;
                            if (colorCache[colorStr]) return colorCache[colorStr];
                            
                            const hasModernColor = 
                                colorStr.includes('oklch') || 
                                colorStr.includes('oklab') || 
                                colorStr.includes('lab(') || 
                                colorStr.includes('lch(') || 
                                colorStr.includes('color(');
                            
                            if (!hasModernColor) {
                                return colorStr;
                            }
                            
                            // Use regex to find and replace all modern color function occurrences
                            const regex = /(oklch|oklab|lab|lch|color)\([^)]+\)/g;
                            const resolvedStr = colorStr.replace(regex, (match) => {
                                try {
                                    const canvas = clonedDoc.createElement('canvas');
                                    canvas.width = 1;
                                    canvas.height = 1;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                        ctx.clearRect(0, 0, 1, 1);
                                        ctx.fillStyle = match;
                                        ctx.fillRect(0, 0, 1, 1);
                                        const imgData = ctx.getImageData(0, 0, 1, 1).data;
                                        const r = imgData[0];
                                        const g = imgData[1];
                                        const b = imgData[2];
                                        const a = imgData[3] / 255;
                                        return `rgba(${r}, ${g}, ${b}, ${a})`;
                                    }
                                } catch (e) {
                                    console.error('Failed to convert matched color:', match, e);
                                }
                                if (match.includes('foreground') || match.includes('text') || match.includes('white')) {
                                    return '#ffffff';
                                }
                                return '#0c0d12';
                            });
                            
                            colorCache[colorStr] = resolvedStr;
                            return resolvedStr;
                        };

                        const originalGetComputedStyle = defaultView.getComputedStyle;
                        defaultView.getComputedStyle = function(el, pseudoElt) {
                            const style = originalGetComputedStyle.call(defaultView, el, pseudoElt);
                            return new Proxy(style, {
                                get(target, prop, receiver) {
                                    const desc = Object.getOwnPropertyDescriptor(target, prop);
                                    if (desc && !desc.writable && !desc.configurable) {
                                        return Reflect.get(target, prop, receiver);
                                    }
                                    const val = Reflect.get(target, prop, receiver);
                                    if (typeof val === 'string') {
                                        return convertColorToRgb(val);
                                    }
                                    if (typeof val === 'function') {
                                        if (prop === 'getPropertyValue') {
                                            return function(propertyName: string) {
                                                return convertColorToRgb(target.getPropertyValue(propertyName));
                                            }
                                        }
                                        return val.bind(target);
                                    }
                                    return val;
                                }
                            });
                        };
                    }
                }
            })

            const imgData = canvas.toDataURL('image/png')
            const imgWidth = 210
            const pageHeight = 297
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            const pdf = new jsPDF('p', 'mm', 'a4')
            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            const dateStr = new Date().toLocaleDateString('fr-CA')
            const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
            pdf.save(`analyse_communications_${cleanName}_${dateStr}.pdf`)
        } catch (error: any) {
            console.error('PDF export failed:', error)
            toast.error(`Erreur lors de l'export PDF: ${error.message || error}`)
        } finally {
            setIsExporting(false)
        }
    }

    const formatLocalDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return '?'
        const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]
        const parts = cleanStr.split('-')
        if (parts.length === 3) {
            return `${parts[0]}-${parts[1]}-${parts[2]}`
        }
        return dateStr
    }

    const formatMonthLabel = (p: string) => {
        try {
            const [y, m] = p.split('-')
            const date = new Date(Number(y), Number(m) - 1, 1)
            return date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })
        } catch (_) {
            return p
        }
    }

    // Initialize selected run to the latest one
    useEffect(() => {
        if (stats.length > 0 && !selectedRunId) {
            setSelectedRunId(stats[stats.length - 1].id)
        }
    }, [stats, selectedRunId])

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteCommunicationStatsAction(id, clientId)
            if (res.success) {
                toast.success("Rapport d'analyse supprimé.")
                setStats(prev => prev.filter(s => s.id !== id))
                if (selectedRunId === id) {
                    const remaining = stats.filter(s => s.id !== id)
                    setSelectedRunId(remaining[remaining.length - 1]?.id || '')
                }
            }
        } catch (err: any) {
            toast.error("Erreur lors de la suppression.")
        }
    }

    const handleToggleBoardMember = async (door: any) => {
        if (!door) return

        const newStatus = !door.is_board_member
        
        // Optimistic UI update
        setDoors(prev => prev.map(d => {
            if (d.id === door.id) {
                return { ...d, is_board_member: newStatus }
            }
            return d
        }))

        try {
            const res = await toggleDoorBoardMemberAction(door.id, newStatus, clientId)
            if (res.success) {
                toast.success(newStatus ? `Unité ${door.door_number} marquée comme membre du CA.` : `Unité ${door.door_number} retirée du CA.`)
            } else {
                // Rollback if error
                setDoors(prev => prev.map(d => {
                    if (d.id === door.id) {
                        return { ...d, is_board_member: !newStatus }
                    }
                    return d
                }))
                toast.error("Erreur lors de la mise à jour.")
            }
        } catch (err: any) {
            // Rollback if exception
            setDoors(prev => prev.map(d => {
                if (d.id === door.id) {
                    return { ...d, is_board_member: !newStatus }
                }
                return d
            }))
            toast.error("Erreur lors de la mise à jour.")
        }
    }

    const selectedRun = useMemo(() => {
        if (stats.length === 0) return null
        return stats.find(s => s.id === selectedRunId) || stats[stats.length - 1] || null
    }, [stats, selectedRunId])

    const runSummary = useMemo(() => {
        return selectedRun?.analysis_summary || {}
    }, [selectedRun])

    const totalUnits = useMemo(() => {
        return Number(runSummary.total_units || 90)
    }, [runSummary])

    const timelineList = useMemo(() => {
        return runSummary.timelineList || []
    }, [runSummary])

    const runMonths = useMemo(() => {
        return timelineList.map((t: any) => t.period).sort()
    }, [timelineList])

    const detectedYears = useMemo(() => {
        const years = new Set<string>()
        runMonths.forEach((m: string) => {
            const y = m.split('-')[0]
            if (y && y.length === 4 && !isNaN(Number(y))) {
                years.add(y)
            }
        })
        return Array.from(years).sort()
    }, [runMonths])

    // Reset date range filters when changing selected run
    useEffect(() => {
        setFilterMode('all')
        if (runMonths.length > 0) {
            setCustomStartMonth(runMonths[0])
            setCustomEndMonth(runMonths[runMonths.length - 1])
        }
        if (detectedYears.length > 0) {
            setSelectedYear(detectedYears[detectedYears.length - 1])
        }
    }, [selectedRunId, runMonths, detectedYears])

    // Filter timeline dynamically based on filters
    const filteredTimelineList = useMemo(() => {
        if (!selectedRun) return []
        
        return timelineList.filter((t: any) => {
            if (filterMode === 'all') return true
            if (filterMode === 'year') {
                return t.period.startsWith(selectedYear)
            }
            if (filterMode === 'custom') {
                return t.period >= customStartMonth && t.period <= customEndMonth
            }
            return true
        }).sort((a: any, b: any) => a.period.localeCompare(b.period))
    }, [selectedRun, timelineList, filterMode, selectedYear, customStartMonth, customEndMonth])

    // Calculate aggregated stats over filtered timeline range
    const filteredStats = useMemo(() => {
        if (!selectedRun || filteredTimelineList.length === 0) return null

        let totalComms = 0
        let inclusionsVolume = 0
        let exclusionsVolume = 0
        
        let outboundEmails = 0
        let inboundEmails = 0
        let chats = 0
        let phoneCalls = 0
        let others = 0
        let hasGranularTypes = false

        filteredTimelineList.forEach((t: any) => {
            inclusionsVolume += Number(t.contractVolume || 0)
            exclusionsVolume += Number(t.outOfContractVolume || 0)

            if (t.outboundEmails !== undefined || t.inboundEmails !== undefined || t.chats !== undefined || t.phoneCalls !== undefined) {
                outboundEmails += Number(t.outboundEmails || 0)
                inboundEmails += Number(t.inboundEmails || 0)
                chats += Number(t.chats || 0)
                phoneCalls += Number(t.phoneCalls || 0)
                others += Number(t.others || 0)
                hasGranularTypes = true
            }
        })

        // Fallback for older runs
        if (!hasGranularTypes) {
            const recap = runSummary?.typeRecap
            if (recap) {
                outboundEmails = Number(recap.outboundEmails || 0)
                inboundEmails = Number(recap.inboundEmails || 0)
                chats = Number(recap.chats || 0)
                phoneCalls = Number(recap.phoneCalls || 0)
                others = Number(recap.others || 0)
                hasGranularTypes = true
            } else {
                outboundEmails = Number(selectedRun.total_emails || 0)
                phoneCalls = Number(selectedRun.total_phone_calls || 0)
            }
        }

        totalComms = inclusionsVolume + exclusionsVolume
        const monthsCount = filteredTimelineList.length
        const ratio = Number((inclusionsVolume / (totalUnits * monthsCount)).toFixed(2))

        // Range description string
        const sortedPeriods = [...filteredTimelineList].map(t => t.period).sort()
        const startText = sortedPeriods[0]
        const endText = sortedPeriods[sortedPeriods.length - 1]

        const periodText = startText === endText 
            ? formatMonthLabel(startText)
            : `${formatMonthLabel(startText)} au ${formatMonthLabel(endText)}`

        return {
            totalComms,
            inclusionsVolume,
            exclusionsVolume,
            ratio,
            periodText,
            monthsCount,
            outboundEmails,
            inboundEmails,
            chats,
            phoneCalls,
            others,
            hasGranularTypes
        }
    }, [selectedRun, filteredTimelineList, totalUnits, runSummary])

    // Department Breakdown counts aggregated over filtered timeline
    const filteredDeptCounts = useMemo(() => {
        if (!selectedRun) return {}
        const monthlyDeptHistory = runSummary.monthlyDeptHistory || {}
        const periods = filteredTimelineList.map((t: any) => t.period)

        const counts: Record<string, number> = {}
        DEPT_LIST.forEach(dept => {
            const history = monthlyDeptHistory[dept] || {}
            let sum = 0
            periods.forEach(p => {
                sum += Number(history[p] || 0)
            })
            counts[dept] = sum
        })
        return counts
    }, [selectedRun, runSummary, filteredTimelineList])

    // Unit Breakdown counts aggregated over filtered timeline
    const filteredUnitCounts = useMemo(() => {
        if (!selectedRun) return []

        const monthlyUnitHistory = runSummary.monthlyUnitHistory
        const periods = filteredTimelineList.map((t: any) => t.period)
        const totalComms = filteredStats?.totalComms || 1

        if (monthlyUnitHistory) {
            // Compute dynamic unit counts based on active periods
            const counts: Record<string, number> = {}
            Object.entries(monthlyUnitHistory).forEach(([unit, history]: [string, any]) => {
                let sum = 0
                periods.forEach(p => {
                    sum += Number(history[p] || 0)
                })
                if (sum > 0) {
                    counts[unit] = sum
                }
            })

            return Object.entries(counts)
                .map(([unit, count]) => {
                    const percentage = totalComms > 0 ? Math.round((count / totalComms) * 100) : 0
                    const avgPerMonth = Number((count / (filteredTimelineList.length || 1)).toFixed(2))
                    return { unit, count, percentage, avgPerMonth }
                })
                .sort((a, b) => b.count - a.count)
        } else {
            // Fallback for older saved runs
            const sortedUnits = runSummary.sortedUnits || []
            const runTotal = Number(selectedRun.total_communications || 1)
            return sortedUnits.map((u: any) => {
                const percentage = runTotal > 0 ? Math.round((u.count / runTotal) * 100) : 0
                return {
                    unit: u.unit,
                    count: u.count,
                    percentage,
                    avgPerMonth: null
                }
            })
        }
    }, [selectedRun, runSummary, filteredTimelineList, filteredStats])

    const normalizeDoorNum = (numStr: string) => {
        if (!numStr) return ''
        return numStr
            .toLowerCase()
            .replace(/porte/g, '')
            .replace(/unit[eé]?/g, '')
            .replace(/#/g, '')
            .replace(/\s+/g, '')
            .replace(/^0+/, '')
            .trim()
    }

    const searchedUnitCounts = useMemo(() => {
        const mapped = filteredUnitCounts.map(u => {
            const matchedDoor = doors.find(d => normalizeDoorNum(d.door_number) === normalizeDoorNum(u.unit))
            return {
                ...u,
                door: matchedDoor || null
            }
        })

        if (!unitSearch) return mapped
        const query = unitSearch.toLowerCase().trim()
        return mapped.filter(u => 
            u.unit.toLowerCase().includes(query)
        )
    }, [filteredUnitCounts, doors, unitSearch])

    // Chronological timeline data formatted for Chart
    const runChartData = useMemo(() => {
        return filteredTimelineList.map((t: any) => {
            let label = t.period
            try {
                const [y, m] = t.period.split('-')
                const date = new Date(Number(y), Number(m) - 1, 1)
                label = date.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' })
            } catch (_) {}

            // Find matched team ratios for this period
            let sumTeamRatio = 0
            let teamCount = 0
            teamComparison.forEach((tc: any) => {
                const tcTimeline = tc.analysis_summary?.timelineList || []
                const tcMatch = tcTimeline.find((item: any) => item.period === t.period)
                if (tcMatch && typeof tcMatch.ratio === 'number') {
                    sumTeamRatio += tcMatch.ratio
                    teamCount++
                }
            })
            const teamAverage = teamCount > 0 ? Number((sumTeamRatio / teamCount).toFixed(2)) : 0

            const deptIndices: Record<string, number> = {}
            visibleDepts.forEach(dept => {
                const count = Number(runSummary.monthlyDeptHistory?.[dept]?.[t.period] || 0)
                deptIndices[dept] = Number((count / Math.max(1, totalUnits)).toFixed(2))
            })

            return {
                name: label,
                period: t.period,
                'Forfait (Inclus)': t.contractVolume,
                'Exclus (Sinistre/Tech)': t.outOfContractVolume,
                'Total': t.contractVolume + t.outOfContractVolume,
                'Indice': t.ratio,
                'Moyenne Équipe': teamAverage,
                ...deptIndices
            }
        }).sort((a: any, b: any) => a.period.localeCompare(b.period))
    }, [filteredTimelineList, teamComparison, visibleDepts, runSummary, totalUnits])

    // Normalize team comparison statistics
    const teamComparisonStats = useMemo(() => {
        if (!teamComparison || teamComparison.length === 0) return []

        return teamComparison.map((tc: any) => {
            const sum = tc.analysis_summary || {}
            const units = Number(sum.total_units || 90)
            
            let inclusions = 0
            if (sum.deptCounts) {
                Object.entries(sum.deptCounts).forEach(([dept, val]) => {
                    if (dept !== "Sinistres" && dept !== "Travaux Majeurs") {
                        inclusions += Number(val || 0)
                    }
                })
            } else {
                inclusions = tc.total_communications
            }

            // Find months count for this run to compute monthly average index
            let monthsCount = 1
            if (sum.timelineList && Array.isArray(sum.timelineList) && sum.timelineList.length > 0) {
                monthsCount = sum.timelineList.length
            } else if (tc.period_start && tc.period_end) {
                try {
                    const start = new Date(tc.period_start + 'T00:00:00')
                    const end = new Date(tc.period_end + 'T00:00:00')
                    const diffY = end.getFullYear() - start.getFullYear()
                    const diffM = end.getMonth() - start.getMonth()
                    monthsCount = Math.max(1, (diffY * 12) + diffM + 1)
                } catch (_) {}
            }

            const loadRate = Number((inclusions / (units * monthsCount)).toFixed(2))

            return {
                id: tc.client_id,
                name: tc.clients?.company_name || tc.clients?.full_name || 'Autre SDC',
                code: tc.clients?.full_name || '',
                loadRate,
                totalVolume: tc.total_communications,
                isCurrent: tc.client_id === clientId
            }
        }).sort((a: any, b: any) => b.loadRate - a.loadRate)
    }, [teamComparison, clientId])

    // Team average index
    const teamAverageLoad = useMemo(() => {
        if (teamComparisonStats.length === 0) return 0
        const sum = teamComparisonStats.reduce((acc: number, curr: any) => acc + curr.loadRate, 0)
        return Number((sum / teamComparisonStats.length).toFixed(2))
    }, [teamComparisonStats])

    // Rank of current client in team
    const clientRankInTeam = useMemo(() => {
        if (teamComparisonStats.length === 0 || !filteredStats) return null
        const idx = teamComparisonStats.findIndex((tc: any) => tc.id === clientId)
        const deviationPct = teamAverageLoad > 0 
            ? Math.round(((filteredStats.ratio - teamAverageLoad) / teamAverageLoad) * 100)
            : 0

        return {
            rank: idx + 1,
            total: teamComparisonStats.length,
            deviationPct,
            isDeviationUp: deviationPct > 0
        }
    }, [teamComparisonStats, clientId, filteredStats, teamAverageLoad])

    const getLoadStatus = (rate: number) => {
        const target = targetIndex
        const moderateLimit = target * 1.2
        const criticalLimit = target * 1.8
        
        if (rate > criticalLimit) {
            return {
                label: 'Surcharge Critique',
                css: 'bg-rose-950/40 text-rose-450 border border-rose-800/40',
                color: 'text-rose-400'
            }
        } else if (rate > moderateLimit) {
            return {
                label: 'Surcharge Modérée',
                css: 'bg-amber-950/40 text-amber-450 border border-amber-800/40',
                color: 'text-amber-400'
            }
        } else {
            return {
                label: 'Usage Stable',
                css: 'bg-emerald-950/40 text-emerald-450 border border-emerald-800/40',
                color: 'text-emerald-400'
            }
        }
    }

    const loadStatus = filteredStats ? getLoadStatus(filteredStats.ratio) : null

    return (
        <div className="space-y-8 animate-fade-in text-xs w-full max-w-full">
            {stats.length === 0 ? (
                <div className="space-y-6 animate-fade-in">
                    {/* If we haven't loaded any rawRows yet, show the dropzone */}
                    {rawRows.length === 0 ? (
                        <Card className="bg-[#0c0d12] border border-zinc-850 py-16 flex flex-col items-center justify-center text-center rounded-2xl shadow-xl">
                            <Info className="h-10 w-10 text-zinc-600 mb-3 animate-pulse" />
                            <h3 className="text-sm font-bold text-zinc-350">Aucune statistique de communication disponible</h3>
                            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                                Glissez-déposez un fichier d'historique CSV ci-dessous pour analyser ce syndicat directement.
                            </p>
                            <div className="relative w-full max-w-lg mt-6 px-4">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                />
                                <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center bg-[#16171e]/70 hover:bg-[#16171e] transition-all">
                                    {isParsing ? (
                                        <>
                                            <Loader2 className="h-8 w-8 text-indigo-500 mb-2 animate-spin" />
                                            <span className="text-zinc-300 font-medium text-xs">Calcul en cours...</span>
                                            <span className="text-[9px] text-zinc-550 mt-1">Lecture et indexation des communications...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                                            <span className="text-zinc-300 font-medium text-xs font-semibold text-center">
                                                Glissez-déposez le fichier d'historique CSV ici ou cliquez pour le parcourir.
                                            </span>
                                            <span className="text-[9px] text-zinc-550 mt-1">Colonnes requises: Lot, Type, Date, Unité, Destinataire, Objet, Agent (Ajouté par).</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ) : (
                        /* If rawRows are loaded, show the analysis preview before saving */
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d0e12]/80 p-4 border border-zinc-850 rounded-xl">
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-200">Analyse de communication en cours pour {clientName}</h3>
                                    <p className="text-xs text-zinc-500">
                                        {rawRows.length} lignes valides détectées
                                        {pipelineData && (
                                            <span className="text-zinc-400 font-normal">
                                                {" "}({pipelineData.outboundEmails} expédiés / {pipelineData.inboundEmails} reçus)
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setRawRows([])
                                            setCsvFile(null)
                                        }}
                                        className="border-zinc-800 text-xs"
                                    >
                                        Réinitialiser
                                    </Button>
                                    <Button
                                        onClick={handleSaveAnalysis}
                                        disabled={isSaving}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" />
                                        )}
                                        Enregistrer cette analyse
                                    </Button>
                                </div>
                            </div>

                            {/* Executive summary cards */}
                            {pipelineData && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card className="bg-gradient-to-tr from-[#16171e] to-indigo-950/20 border-zinc-800/80 shadow-md">
                                            <CardContent className="p-6">
                                                <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-black block">Volume de Gestion Forfaitaire Inclus</span>
                                                <div className="text-3xl font-black text-white mt-1 block">
                                                    {pipelineData.contractInclusionsVolume}
                                                </div>
                                                <span className="text-[10px] text-zinc-450 mt-1.5 block">Communications totales nettes (Exclut les Sinistres et les Travaux Majeurs)</span>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-gradient-to-tr from-[#16171e] to-emerald-950/20 border-zinc-800/80 shadow-md">
                                            <CardContent className="p-6">
                                                <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-black block">Indice de Charge Réel du Forfait (PM Inclusions Load)</span>
                                                <div className="text-3xl font-black text-emerald-400 mt-1 block">
                                                    {(pipelineData.contractInclusionsVolume / Math.max(1, totalUnits)).toFixed(2)}
                                                </div>
                                                <span className="text-[10px] text-zinc-450 mt-1.5 block">Moyenne d'interactions incluses par porte / mois</span>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-gradient-to-tr from-[#16171e] to-zinc-950/40 border-zinc-800/80 shadow-md">
                                            <CardContent className="p-6">
                                                <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-black block">Répartition par Canal</span>
                                                <div className="mt-3.5 space-y-1.5 text-[10px]">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-zinc-450 font-medium">Courriels Sortants (Out) :</span>
                                                        <span className="font-bold font-mono text-zinc-200">{pipelineData.outboundEmails}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-zinc-450 font-medium">Courriels Entrants (In) :</span>
                                                        <span className="font-bold font-mono text-zinc-200">{pipelineData.inboundEmails}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-1 border-t border-zinc-900/40">
                                                        <span className="text-zinc-450 font-medium">Clavardages :</span>
                                                        <span className="font-bold font-mono text-zinc-200">{pipelineData.chats}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-zinc-450 font-medium">Appels Téléphoniques :</span>
                                                        <span className="font-bold font-mono text-zinc-200">{pipelineData.phoneCalls}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Departments Breakdown */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Répartition des charges opérationnelles par porte :</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                            {DEPT_LIST.map(d => {
                                                const count = pipelineData.deptCounts[d] || 0
                                                const loadRate = (count / Math.max(1, totalUnits)).toFixed(2)
                                                return (
                                                    <Card key={d} className="border border-zinc-850 p-3 bg-zinc-900/10">
                                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{d}</span>
                                                        <div className="text-lg font-extrabold text-white mt-1 block">{loadRate}</div>
                                                        <span className="text-[9px] text-zinc-550 block">{count.toLocaleString()} comms</span>
                                                    </Card>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Control Row: Select Analysis Run & Date Filters */}
                    <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-[#0d0e12]/80 p-4 border border-zinc-850 rounded-xl shadow-lg backdrop-blur-md">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Rapport d'analyse :</span>
                                <select
                                    value={selectedRunId}
                                    onChange={(e) => setSelectedRunId(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                >
                                    {stats.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            Analyse du {formatLocalDate(s.analysis_date)} ({s.total_communications} comms)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {runMonths.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Filtrer par :</span>
                                        <select
                                            value={filterMode}
                                            onChange={(e) => setFilterMode(e.target.value as any)}
                                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                        >
                                            <option value="all">Toutes les dates</option>
                                            {detectedYears.length > 0 && <option value="year">Par Année</option>}
                                            <option value="custom">Période personnalisée</option>
                                        </select>
                                    </div>

                                    {filterMode === 'year' && detectedYears.length > 0 && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Année :</span>
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                            >
                                                {detectedYears.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {filterMode === 'custom' && (
                                        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">De :</span>
                                            <select
                                                value={customStartMonth}
                                                onChange={(e) => setCustomStartMonth(e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                            >
                                                {runMonths.map(m => (
                                                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                                                ))}
                                            </select>

                                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">À :</span>
                                            <select
                                                value={customEndMonth}
                                                onChange={(e) => setCustomEndMonth(e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer transition-all"
                                            >
                                                {runMonths.map(m => (
                                                    <option key={m} value={m} disabled={m < customStartMonth}>{formatMonthLabel(m)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <Button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-3 text-xs flex items-center gap-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Export...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Exporter PDF</span>
                                </>
                            )}
                        </Button>
                    </div>

                    <div id="client-trends-content" className="space-y-8 bg-[#0c0d12] p-2 rounded-xl">

                    {/* KPI Summary Row */}
                    {filteredStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Main Load Index */}
                            <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Indice de Charge Réel</span>
                                    
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black text-indigo-400 tracking-tight font-mono">
                                            {filteredStats.ratio.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-zinc-500 font-medium">interactions / porte / mois</span>
                                    </div>

                                    {loadStatus && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <Badge className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${loadStatus.css}`}>
                                                {loadStatus.label}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 font-medium font-mono">Cible: {targetIndex.toFixed(2)}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card 2: Communication Volume & Channel Split */}
                            <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                                <CardContent className="p-5 flex flex-col justify-between h-full">
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Volume de Communications</span>

                                        <div className="flex items-baseline gap-2 mt-1.5">
                                            <span className="text-4xl font-black text-zinc-150 tracking-tight font-mono">
                                                {filteredStats.totalComms}
                                            </span>
                                            <span className="text-[10px] text-zinc-550 font-semibold uppercase font-bold">comms</span>
                                        </div>

                                        <div className="mt-3 flex items-center gap-4 text-[9px] font-semibold">
                                            <span className="flex items-center gap-1 text-zinc-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                                                {filteredStats.inclusionsVolume} forfait
                                            </span>
                                            <span className="flex items-center gap-1 text-zinc-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                                                {filteredStats.exclusionsVolume} hors-forfait
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-zinc-900/60 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] text-zinc-450 font-semibold">
                                        {filteredStats.hasGranularTypes ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span>Expédiés (M) :</span>
                                                    <span className="font-mono text-zinc-300">{filteredStats.outboundEmails}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Reçus (M) :</span>
                                                    <span className="font-mono text-zinc-300">{filteredStats.inboundEmails}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Clavardage :</span>
                                                    <span className="font-mono text-zinc-300">{filteredStats.chats}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Appels :</span>
                                                    <span className="font-mono text-zinc-300">{filteredStats.phoneCalls}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between col-span-2">
                                                    <span>Courriels :</span>
                                                    <span className="font-mono text-zinc-300">{filteredStats.outboundEmails}</span>
                                                </div>
                                                <div className="flex items-center justify-between col-span-2">
                                                    <span>Appels :</span>
                                                    <span className="font-mono text-zinc-300">{filteredStats.phoneCalls}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Team Comparison */}
                            <Card className="bg-[#121318] border border-zinc-850 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-all">
                                <CardContent className="p-6">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold block">Positionnement Équipe</span>

                                    {clientRankInTeam ? (
                                        <>
                                            <div className="flex items-baseline gap-2 mt-2">
                                                <span className={`text-5xl font-black tracking-tight font-mono ${clientRankInTeam.isDeviationUp ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                    {clientRankInTeam.isDeviationUp ? '+' : ''}{clientRankInTeam.deviationPct}%
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium">vs moyenne équipe</span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2">
                                                <Badge className="bg-[#1e1a3a] text-indigo-300 border border-indigo-900/60 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                                    Rang: #{clientRankInTeam.rank} / {clientRankInTeam.total}
                                                </Badge>
                                                <span className="text-[10px] text-zinc-500 font-medium font-mono">Moyenne: {teamAverageLoad.toFixed(2)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col justify-center text-zinc-500 italic mt-6">
                                            Aucun autre client dans cette équipe pour comparer.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Timeline & Department Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 1. Month-by-month timeline chart */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Évolution de la charge par mois</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">Visualisation de la charge de travail forfaitaire (Gestion/Admin/Compta) vs exclue (Sinistres/Tech).</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2 flex flex-col space-y-4">
                                <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/40 p-2.5 border border-zinc-850 rounded-xl">
                                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider mr-1.5">Comparer par service :</span>
                                    {DEPT_LIST.map(dept => {
                                        const isActive = visibleDepts.includes(dept)
                                        const color = DEPT_COLORS[dept] || '#818cf8'
                                        return (
                                            <button
                                                key={dept}
                                                onClick={() => toggleDeptLine(dept)}
                                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                                                    isActive 
                                                        ? 'text-white border-transparent shadow-sm' 
                                                        : 'text-zinc-400 border-zinc-800 bg-zinc-900/10 hover:border-zinc-700'
                                                }`}
                                                style={isActive ? { backgroundColor: color } : {}}
                                            >
                                                <span className="h-1.5 w-1.5 rounded-full" style={isActive ? { backgroundColor: '#fff' } : { backgroundColor: color }} />
                                                {dept}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="h-72 w-full">
                                    {runChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={runChartData}>
                                                <defs>
                                                    <linearGradient id="colorForfait" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/>
                                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorExclus" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#222530" vertical={false} />
                                                <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                                                <YAxis yAxisId="left" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                                <YAxis yAxisId="right" orientation="right" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }} />
                                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                                <Area yAxisId="left" type="monotone" dataKey="Forfait (Inclus)" name="Inclus (Gestion, Admin, Compta)" stroke="#818cf8" fillOpacity={1} fill="url(#colorForfait)" strokeWidth={2} />
                                                <Area yAxisId="left" type="monotone" dataKey="Exclus (Sinistre/Tech)" name="Hors-Forfait (Sinistres, Tech)" stroke="#f97316" fillOpacity={1} fill="url(#colorExclus)" strokeWidth={1.5} />
                                                <Line yAxisId="right" type="monotone" dataKey="Indice" name="Indice (SDC)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                                                <Line yAxisId="right" type="monotone" dataKey="Moyenne Équipe" name="Indice Moyen Équipe" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={false} />
                                                {visibleDepts.map(dept => (
                                                    <Line 
                                                        key={dept}
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey={dept}
                                                        name={`Indice ${dept}`}
                                                        stroke={DEPT_COLORS[dept] || '#818cf8'}
                                                        strokeWidth={2}
                                                        dot={{ r: 1.5 }}
                                                    />
                                                ))}
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-zinc-600 italic">Aucune donnée mensuelle.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Department Breakdown Bar Chart */}
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indices de Charge par Service</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Ventilation de la charge de travail moyenne par porte par mois.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-72 pt-2">
                                {filteredTimelineList.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-zinc-600 italic text-center p-4">
                                        Sélectionnez un intervalle de dates contenant des données.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            layout="vertical"
                                            data={DEPT_LIST.map(dept => {
                                                const count = filteredDeptCounts[dept] || 0
                                                const monthsCount = filteredTimelineList.length || 1
                                                return {
                                                    name: dept,
                                                    value: Number((count / (totalUnits * monthsCount)).toFixed(2))
                                                }
                                            }).filter(d => d.value > 0)}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222530" horizontal={false} vertical={true} />
                                            <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={80} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0c0d12', borderColor: '#222530', borderRadius: '8px', fontSize: '10px' }} />
                                            <Bar dataKey="value" name="Indice / porte / mois" fill="#818cf8" radius={[0, 4, 4, 0]}>
                                                {DEPT_LIST.map(dept => (
                                                    <Cell key={dept} fill={DEPT_COLORS[dept] || '#818cf8'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Department Workload Breakdown Cards Grid */}
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Répartition de la charge par Service</h3>
                            <span className="text-[10px] text-zinc-500 font-mono">Période: {filteredStats?.periodText}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {DEPT_LIST.map(dept => {
                                const count = filteredDeptCounts[dept] || 0
                                const monthsCount = filteredTimelineList.length || 1
                                const loadRate = Number((count / (totalUnits * monthsCount)).toFixed(2))
                                const totalComms = filteredStats?.totalComms || 1
                                const percentage = Math.round((count / totalComms) * 100)
                                const color = DEPT_COLORS[dept] || '#818cf8'

                                return (
                                    <Card 
                                        key={dept} 
                                        className="bg-[#121318]/90 border border-zinc-850 hover:border-zinc-800 transition-all shadow-md relative overflow-hidden group cursor-default"
                                    >
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-350 block tracking-tight truncate max-w-[150px]" title={dept}>
                                                        {dept}
                                                    </span>
                                                    <span className="text-xxs text-zinc-500 font-medium font-mono">
                                                        {count} comms ({percentage}%)
                                                    </span>
                                                </div>
                                                <span 
                                                    className="h-2 w-2 rounded-full" 
                                                    style={{ backgroundColor: color }}
                                                />
                                            </div>

                                            <div className="flex items-baseline justify-between pt-1">
                                                <span className="text-2xl font-black text-zinc-150 font-mono tracking-tight">
                                                    {loadRate.toFixed(2)}
                                                </span>
                                                <span className="text-[9px] text-zinc-550 font-mono">
                                                    index / porte / mois
                                                </span>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="space-y-1">
                                                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-500" 
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: color 
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>

                    {/* Unit Breakdown Card */}
                    <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Volume de communication par Unité (Porte)</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Répartition du volume total de communications par unité/porte sur la période sélectionnée ({filteredStats?.periodText}).
                                </CardDescription>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher unité..."
                                        value={unitSearch}
                                        onChange={(e) => setUnitSearch(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xxs text-zinc-300 placeholder:text-zinc-550 outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 w-36"
                                    />
                                </div>
                                <Badge className="bg-[#1e1a3a] text-indigo-300 border border-indigo-900/60 px-2 py-1 rounded-full text-[9px] font-bold">
                                    {filteredUnitCounts.length} Unités actives
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {searchedUnitCounts.length === 0 ? (
                                <div className="text-center py-8 text-zinc-555 italic text-xxs">
                                    {unitSearch ? "Aucun résultat pour cette recherche." : "Aucune donnée par unité pour cette période."}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                                    {searchedUnitCounts.map((u, idx) => {
                                        const matchedDoor = u.door
                                        const isBoard = matchedDoor?.is_board_member || false
                                        return (
                                            <div 
                                                key={u.unit} 
                                                className={`p-3 border rounded-xl hover:border-zinc-850 transition-all flex flex-col justify-between space-y-2 group ${
                                                    isBoard 
                                                        ? 'bg-amber-950/15 border-amber-900/40 hover:border-amber-700/60'
                                                        : 'bg-zinc-950/45 border-zinc-850 hover:border-zinc-800'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-zinc-400">
                                                        Unité <strong className="text-zinc-200">{u.unit}</strong>
                                                    </span>
                                                    
                                                    {matchedDoor ? (
                                                        <button
                                                            onClick={() => handleToggleBoardMember(matchedDoor)}
                                                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                                                                isBoard
                                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                                                    : 'bg-zinc-900/50 text-zinc-550 border border-zinc-800 hover:text-zinc-350 hover:border-zinc-700'
                                                            }`}
                                                            title={isBoard ? "Retirer du CA" : "Marquer comme membre du CA"}
                                                        >
                                                            CA
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] text-zinc-500 font-mono font-bold">
                                                            #{idx + 1}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-base font-black text-indigo-400 font-mono">
                                                            {u.count}
                                                        </span>
                                                        <span className="text-[9px] text-zinc-555 font-mono">
                                                            comms
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[9px]">
                                                        <span className="text-zinc-500 font-mono">Part:</span>
                                                        <span className="text-zinc-350 font-bold font-mono">{u.percentage}%</span>
                                                    </div>
                                                    {u.avgPerMonth !== null && (
                                                        <div className="flex justify-between items-center text-[9px] border-t border-zinc-900/60 pt-1 mt-1">
                                                            <span className="text-zinc-500 font-mono">Moyenne:</span>
                                                            <span className="text-emerald-400 font-mono font-bold">{u.avgPerMonth}/m</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 3. Team Comparison Chart */}
                    {teamComparisonStats.length > 1 && (
                        <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Positionnement de l'usage forfaitaire au sein de l'équipe</CardTitle>
                                    <CardDescription className="text-xxs text-zinc-500">Comparaison de l'indice de charge (interactions/porte) avec les autres syndicats de la même équipe.</CardDescription>
                                </div>
                                <div className="text-right text-xxs font-bold text-zinc-500">
                                    Moyenne Équipe : <span className="text-indigo-400 font-mono">{teamAverageLoad.toFixed(2)}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="h-64 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        layout="vertical"
                                        data={teamComparisonStats}
                                        margin={{ left: 10, right: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222530" horizontal={false} vertical={true} />
                                        <XAxis type="number" stroke="#4b5563" fontSize={9} tickLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} width={120} />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-[#0c0d12] border border-zinc-800 p-2.5 rounded-lg text-xxs space-y-1 shadow-xl">
                                                            <div className="font-bold text-white">{data.name} <span className="font-mono text-zinc-400">({data.code})</span></div>
                                                            <div className="text-indigo-400 font-bold">Indice: {data.loadRate.toFixed(2)} / porte / mois</div>
                                                            <div className="text-zinc-400">Volume Total: {data.totalVolume} comms</div>
                                                            {data.isCurrent && <div className="text-amber-400 font-semibold mt-0.5">&middot; Ce syndicat</div>}
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <ReferenceLine 
                                            x={teamAverageLoad} 
                                            stroke="#6366f1" 
                                            strokeDasharray="4 4"
                                            label={{ value: `Moyenne: ${teamAverageLoad}`, fill: '#818cf8', fontSize: 8, position: 'top' }}
                                        />
                                        <Bar dataKey="loadRate" radius={[0, 4, 4, 0]}>
                                            {teamComparisonStats.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.isCurrent ? '#6366f1' : '#27272a'} 
                                                    fillOpacity={entry.isCurrent ? 1 : 0.6}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Historical Runs Table */}
                    <Card className="bg-[#121318]/90 border border-zinc-850 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historique des analyses de communications</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto text-xxs">
                                <table className="w-full">
                                    <thead className="bg-[#0c0d12] text-zinc-500 border-b border-zinc-850 text-left font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3 font-semibold text-zinc-400">Date d'Analyse</th>
                                            <th className="p-3 font-semibold text-zinc-400">Période Couverte</th>
                                            <th className="p-3 font-semibold text-zinc-400">Portes</th>
                                            <th className="p-3 font-semibold text-zinc-400">Indice Forfaitaire</th>
                                            <th className="p-3 font-semibold text-zinc-400">Emails / Appels</th>
                                            <th className="p-3 font-semibold text-zinc-400">Total Volume</th>
                                            <th className="p-3 font-semibold text-zinc-400 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {stats.map((row) => {
                                            const runUnits = Number(row.analysis_summary?.total_units || 90)
                                            let inclusionsVolume = 0
                                            if (row.analysis_summary?.deptCounts) {
                                                Object.entries(row.analysis_summary.deptCounts).forEach(([d, v]) => {
                                                    if (d !== "Sinistres" && d !== "Travaux Majeurs") inclusionsVolume += Number(v || 0)
                                                })
                                            } else {
                                                inclusionsVolume = row.total_communications
                                            }
                                            const inclusionsLoadRate = (inclusionsVolume / runUnits).toFixed(2)

                                            return (
                                                <tr key={row.id} className={`hover:bg-zinc-900/10 text-zinc-300 ${selectedRunId === row.id ? 'bg-indigo-950/5 font-semibold border-l-2 border-indigo-500' : ''}`}>
                                                    <td className="p-3 font-semibold">
                                                        <button 
                                                            onClick={() => setSelectedRunId(row.id)}
                                                            className="text-left hover:underline text-indigo-400 font-bold cursor-pointer"
                                                        >
                                                            {formatLocalDate(row.analysis_date)}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-zinc-400">
                                                        {row.period_start ? formatLocalDate(row.period_start) : '?'} au {row.period_end ? formatLocalDate(row.period_end) : '?'}
                                                    </td>
                                                    <td className="p-3 font-mono font-medium">{runUnits} SDC</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">{inclusionsLoadRate}</td>
                                                    <td className="p-3 text-zinc-400 font-mono">
                                                        {row.total_emails} M / {row.total_phone_calls} A
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-indigo-450 text-indigo-400">{row.total_communications}</td>
                                                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                        {deletingId === row.id ? (
                                                            <div className="flex justify-end gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleDelete(row.id)}
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] h-5 px-2 rounded cursor-pointer"
                                                                >
                                                                    Oui
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setDeletingId(null)}
                                                                    className="border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[9px] h-5 px-2 rounded cursor-pointer"
                                                                >
                                                                    Non
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setDeletingId(row.id)}
                                                                className="hover:bg-rose-950/20 text-zinc-500 hover:text-rose-450 h-6 w-6 p-0 rounded-md cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
            )}
        </div>
    )
}
