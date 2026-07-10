'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
    AlertCircle, 
    FileSpreadsheet, 
    Loader2, 
    Save, 
    Upload, 
    CheckCircle2, 
    TrendingUp, 
    TrendingDown,
    Info, 
    Search,
    ChevronDown,
    User,
    Shield,
    Users,
    Calendar,
    ListFilter,
    FolderSync,
    X,
    Eye,
    RefreshCw,
    Download
} from 'lucide-react'
import { saveCommunicationStatsAction } from '@/actions/communication-stats'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'

interface Client {
    id: string
    company_name: string | null
    full_name: string
    doors?: { id: string }[]
    managers?: {
        first_name: string
        last_name: string
        email?: string | null
        manager_teams?: {
            id: string
            name: string
        } | null
    } | null
}

interface CommunicationAnalyzerProps {
    clients: Client[]
    stats?: any[]
    externalQueue?: File[]
    setExternalQueue?: React.Dispatch<React.SetStateAction<File[]>>
    managers?: any[]
}

interface ParsedRow {
    lot: string
    type: string
    date: string
    unite: string
    destinataire: string
    objet: string
    user: string
    year?: string
    month?: string
}

// 7 Departments + Council (as in the HTML code)
const DEPT_LIST = ["Gestion", "Gestionnaire", "Administration", "Comptabilité", "Travaux Majeurs", "Sinistres", "Assurance", "Direction", "Chargé d’opération", "Conseil d'Administration", "Marketing"]

const DEPT_COLORS: Record<string, string> = {
    "Gestion": "border-l-sky-500 bg-sky-950/10",
    "Gestionnaire": "border-l-indigo-650 bg-indigo-950/10",
    "Administration": "border-l-teal-500 bg-teal-950/10",
    "Comptabilité": "border-l-purple-500 bg-purple-950/10",
    "Travaux Majeurs": "border-l-orange-500 bg-orange-950/10",
    "Sinistres": "border-l-rose-500 bg-rose-950/10",
    "Assurance": "border-l-pink-500 bg-pink-950/10",
    "Direction": "border-l-zinc-500 bg-zinc-900/40",
    "Chargé d’opération": "border-l-indigo-500 bg-indigo-950/10",
    "Chargé d'opération": "border-l-indigo-500 bg-indigo-950/10",
    "Conseil d'Administration": "border-l-amber-500 bg-amber-950/10",
    "Marketing": "border-l-pink-600 bg-pink-950/10"
}

const DEPT_BADGE_CSS: Record<string, string> = {
    "Gestion": "bg-sky-500/10 text-sky-400 border border-sky-550/20",
    "Gestionnaire": "bg-indigo-600/10 text-indigo-400 border border-indigo-550/20",
    "Administration": "bg-teal-500/10 text-teal-400 border border-teal-550/20",
    "Comptabilité": "bg-purple-500/10 text-purple-400 border border-purple-550/20",
    "Travaux Majeurs": "bg-orange-500/10 text-orange-400 border border-orange-550/20",
    "Sinistres": "bg-rose-500/10 text-rose-455 text-rose-400 border border-rose-550/20",
    "Assurance": "bg-pink-500/10 text-pink-400 border border-pink-550/20",
    "Direction": "bg-zinc-800 text-zinc-400 border border-zinc-700/60",
    "Chargé d’opération": "bg-indigo-500/10 text-indigo-400 border border-indigo-550/20",
    "Chargé d'opération": "bg-indigo-500/10 text-indigo-400 border border-indigo-550/20",
    "Conseil d'Administration": "bg-amber-500/10 text-amber-400 border border-amber-550/20",
    "Marketing": "bg-pink-500/10 text-pink-400 border border-pink-550/20"
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

const classifyCommType = (typeStr: string): 'outboundEmail' | 'inboundEmail' | 'chat' | 'phoneCall' | 'letterSent' | 'other' => {
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
    
    if (t.includes("lettre")) return 'letterSent'
    if (t.includes("expedi") || t.includes("sent") || t.includes("envoi")) return 'outboundEmail'
    if (t.includes("recu") || t.includes("received")) return 'inboundEmail'
    if (t.includes("clavardage") || t.includes("chat")) return 'chat'
    if (t.includes("telephone") || t.includes("phone") || t.includes("appel") || t.includes("call")) return 'phoneCall'
    return 'other'
}

export function CommunicationAnalyzer({ 
    clients, 
    stats,
    externalQueue,
    setExternalQueue,
    managers = []
}: CommunicationAnalyzerProps) {
    const [selectedClientId, setSelectedClientId] = useState<string>('')
    const [sdcSearch, setSdcSearch] = useState('')
    const [isSdcDropdownOpen, setIsSdcDropdownOpen] = useState(false)

    const clientStats = useMemo(() => {
        if (!stats || !selectedClientId) return []
        return stats.filter((s: any) => s.client_id === selectedClientId)
    }, [stats, selectedClientId])

    const existingRanges = useMemo(() => {
        return clientStats
            .filter((s: any) => s.period_start && s.period_end)
            .map((s: any) => ({
                startStr: s.period_start,
                endStr: s.period_end
            }))
    }, [clientStats])

    const selectedClient = useMemo(() => {
        return clients.find(c => c.id === selectedClientId) || null
    }, [clients, selectedClientId])

    useEffect(() => {
        if (selectedClient) {
            setSdcSearch(selectedClient.company_name || selectedClient.full_name)
            if (selectedClient.doors && selectedClient.doors.length > 0) {
                setUnitCount(selectedClient.doors.length)
            }
        } else {
            setSdcSearch('')
        }
    }, [selectedClient])

    const filteredSdcClients = useMemo(() => {
        if (!sdcSearch || (selectedClient && sdcSearch === (selectedClient.company_name || selectedClient.full_name))) {
            return clients
        }
        const query = sdcSearch.toLowerCase()
        return clients.filter(c => 
            (c.company_name || '').toLowerCase().includes(query) ||
            (c.full_name || '').toLowerCase().includes(query)
        )
    }, [clients, sdcSearch, selectedClient])

    const [unitCount, setUnitCount] = useState<number>(90)
    const [overwriteOverlap, setOverwriteOverlap] = useState<boolean>(true)
    
    // CSV uploader states
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [localFileQueue, setLocalFileQueue] = useState<File[]>([])
    const fileQueue = externalQueue !== undefined ? externalQueue : localFileQueue
    const setFileQueue = setExternalQueue !== undefined ? setExternalQueue : setLocalFileQueue
    const [isParsing, setIsParsing] = useState(false)
    const [rawRows, setRawRows] = useState<ParsedRow[]>([])
    const [excludedOtonom, setExcludedOtonom] = useState<ParsedRow[]>([])
    const [excludedAssign, setExcludedAssign] = useState<ParsedRow[]>([])
    const [discoveredUsers, setDiscoveredUsers] = useState<string[]>([])
    
    // active tab
    const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'employees' | 'config'>('dashboard')
    const [orgMode, setOrgMode] = useState<'departments' | 'employees'>('departments')
    
    // dynamic dept mapping config
    const [deptMap, setDeptMap] = useState<Record<string, string>>(INITIAL_DEPT_MAP)

    // filter states
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null)
    const [employeeDeptFilter, setEmployeeDeptFilter] = useState<string>('all')
    
    // search states
    const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('')
    const [searchConfigQuery, setSearchConfigQuery] = useState('')
    const [searchTab2EmployeeQuery, setSearchTab2EmployeeQuery] = useState('')
    const [drilldownTab2User, setDrilldownTab2User] = useState<string | null>(null)

    // system inspection mode (Otonom / Assign)
    const [systemInspectionMode, setSystemInspectionMode] = useState<'otonom' | 'assign' | null>(null)
    
    // active monthly drawer
    const [activeMonthlyDrawerDept, setActiveMonthlyDrawerDept] = useState<string | null>(null)

    // save action states
    const [isSaving, setIsSaving] = useState(false)
    const [hasSaved, setHasSaved] = useState(false)

    // registry list pagination
    const [mainVisibleCount, setMainVisibleCount] = useState(50)
    const [empVisibleCount, setEmpVisibleCount] = useState(50)

    const handleResetAll = () => {
        setSelectedClientId('')
        setSdcSearch('')
        setCsvFile(null)
        setIsParsing(false)
        setRawRows([])
        setExcludedOtonom([])
        setExcludedAssign([])
        setDiscoveredUsers([])
        setHasSaved(false)
        setIsSaving(false)
        setDrilldownTab2User(null)
        setSystemInspectionMode(null)
        setSelectedYear('all')
        setSelectedMonth('all')
        setSelectedUserFilter(null)
        setActiveTab('dashboard')
        // Preserving custom employee-to-department mappings across resets so users don't lose their session setup.
    }

    const processNextFile = (queueToUse?: File[]) => {
        const activeQueue = queueToUse || fileQueue
        if (activeQueue.length === 0) return
        
        const nextFile = activeQueue[0]
        
        setSelectedClientId('')
        setSdcSearch('')
        setIsParsing(false)
        setRawRows([])
        setExcludedOtonom([])
        setExcludedAssign([])
        setDiscoveredUsers([])
        setHasSaved(false)
        setIsSaving(false)
        setDrilldownTab2User(null)
        setSystemInspectionMode(null)
        setSelectedYear('all')
        setSelectedMonth('all')
        setSelectedUserFilter(null)
        setActiveTab('dashboard')
        
        parseFile(nextFile)
    }

    // Auto-process first file in queue if active file is null and queue has items
    useEffect(() => {
        if (!csvFile && fileQueue.length > 0 && !isParsing && !hasSaved && !isSaving) {
            processNextFile(fileQueue)
        }
    }, [fileQueue, csvFile, isParsing, hasSaved, isSaving])

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
        
        // Try direct Date parsing first
        let d = new Date(cleanStr)
        if (!isNaN(d.getTime())) return d
        
        // Handle formats like DD/MM/YYYY HH:MM:SS or DD/MM/YYYY
        if (cleanStr.includes('/')) {
            const parts = cleanStr.split(' ')
            const dateParts = parts[0].split('/')
            if (dateParts.length === 3) {
                let day = 1, month = 0, year = 2000
                if (dateParts[0].length === 4) {
                    // YYYY/MM/DD
                    year = parseInt(dateParts[0], 10)
                    month = parseInt(dateParts[1], 10) - 1
                    day = parseInt(dateParts[2], 10)
                } else {
                    // DD/MM/YYYY
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
        
        // Handle formats like DD-MM-YYYY HH:MM:SS or DD-MM-YYYY
        if (cleanStr.includes('-')) {
            const parts = cleanStr.split(' ')
            const dateParts = parts[0].split('-')
            if (dateParts.length === 3) {
                let day = 1, month = 0, year = 2000
                if (dateParts[0].length === 4) {
                    // YYYY-MM-DD
                    year = parseInt(dateParts[0], 10)
                    month = parseInt(dateParts[1], 10) - 1
                    day = parseInt(dateParts[2], 10)
                } else {
                    // DD-MM-YYYY
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

                const rows: ParsedRow[] = []
                const otonoms: ParsedRow[] = []
                const assigns: ParsedRow[] = []
                const localDiscoveredUsers = new Set<string>()
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
                        if (!overwriteOverlap) {
                            const isOverlap = existingRanges.some(r => rowDateStr >= r.startStr && rowDateStr <= r.endStr)
                            if (isOverlap) {
                                skippedOverlapCount++
                                continue
                            }
                        }
                    }

                    const model: ParsedRow = { lot: lotId, type: type, date: dateStr, unite: unitNum, destinataire: dest, objet: objet, user: userRaw }

                    if(userRaw === "Otonomsolution") { 
                        otonoms.push(model)
                        continue 
                    }
                    if(objet.toLowerCase().includes("you have been assigned") || objet.toLowerCase().includes("vous avez été assigné")) {
                        assigns.push(model)
                        continue
                    }

                    const userNormalized = normalizeEmployeeName(userRaw) || "Système Auto"
                    localDiscoveredUsers.add(userNormalized)

                    const dateMeta = extractDateMeta(dateStr)
                    model.year = dateMeta.year
                    model.month = dateMeta.month
                    model.user = userNormalized
                    
                    rows.push(model)
                }

                // Add newly discovered users to map as "Gestion" if not present
                const updatedDeptMap = { ...deptMap }
                localDiscoveredUsers.forEach(u => {
                    if (!updatedDeptMap[u]) {
                        updatedDeptMap[u] = "Gestion"
                    }
                })
                
                setDeptMap(updatedDeptMap)
                setRawRows(rows)
                setExcludedOtonom(otonoms)
                setExcludedAssign(assigns)
                setDiscoveredUsers(Array.from(localDiscoveredUsers).sort())
                
                // Auto-select client by file name prefix (e.g. "R106")
                const prefixMatch = file.name.match(/^([A-Z]\d+)/i)
                if (prefixMatch) {
                    const code = prefixMatch[1].toUpperCase()
                    const matchedClient = clients.find(c => {
                        const compName = (c.company_name || "").toUpperCase()
                        const fullName = (c.full_name || "").toUpperCase()
                        return compName.startsWith(code) || fullName.startsWith(code) || compName.includes(code) || fullName.includes(code)
                    })
                    if (matchedClient) {
                        setSelectedClientId(matchedClient.id)
                        setSdcSearch(matchedClient.company_name || matchedClient.full_name)
                        if (matchedClient.doors && matchedClient.doors.length > 0) {
                            setUnitCount(matchedClient.doors.length)
                        }
                    }
                }
                
                if (skippedOverlapCount > 0) {
                    toast.info(`${skippedOverlapCount} lignes ignorées car elles chevauchent des dates déjà importées pour ce syndicat.`)
                }
                toast.success(`${rows.length} communications valides importées (${otonoms.length} lignes Otonom et ${assigns.length} assignations exclues).`)
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
            const files = Array.from(e.target.files)
            if (csvFile) {
                // If a file is already loaded, append new files to the queue
                setFileQueue(prev => [...prev, ...files])
                toast.success(`${files.length} fichier(s) ajouté(s) à la file d'attente.`)
            } else {
                // Otherwise, load the first file and queue the rest
                const first = files[0]
                const rest = files.slice(1)
                if (rest.length > 0) {
                    setFileQueue(prev => [...prev, ...rest])
                }
                setSelectedClientId('')
                setSdcSearch('')
                parseFile(first)
            }
        }
        e.target.value = ''
    }

    // Dynamic lists of unique years and months detected in CSV
    const detectedYears = useMemo(() => {
        const years = new Set<string>()
        rawRows.forEach(r => {
            if (r.year && r.year !== 'Unknown' && !isNaN(Number(r.year))) {
                years.add(r.year)
            }
        })
        return Array.from(years).sort()
    }, [rawRows])

    // Compute primary analytical results based on filters, mappings, and units
    const pipelineData = useMemo(() => {
        if (rawRows.length === 0) return null

        let cleanVolume = 0
        let inbound = 0
        let contractInclusionsVolume = 0

        let outboundEmailsCount = 0
        let inboundEmailsCount = 0
        let chatsCount = 0
        let phoneCallsCount = 0
        let lettersSentCount = 0
        let othersCount = 0
        
        const deptCounts: Record<string, number> = {}
        DEPT_LIST.forEach(d => { deptCounts[d] = 0; })
        deptCounts["Chargé d'opération"] = 0
        
        const timelineChronologyMap: Record<string, { 
            contractVolume: number; 
            outOfContractVolume: number;
            outboundEmails: number;
            inboundEmails: number;
            chats: number;
            phoneCalls: number;
            lettersSent: number;
            others: number;
        }> = {}
        const employeeCounts: Record<string, number> = {}
        const unitCounts: Record<string, number> = {}
        const monthlyDeptHistory: Record<string, Record<string, number>> = {}
        const monthlyUnitHistory: Record<string, Record<string, number>> = {}
        const localYearlyAgg: Record<string, Record<string, number>> = {}
        
        DEPT_LIST.forEach(d => { monthlyDeptHistory[d] = {}; })
        monthlyDeptHistory["Chargé d'opération"] = {}

        const filteredList: ParsedRow[] = []

        // Resolve manager info
        const managerName = selectedClient?.managers
            ? `${selectedClient.managers.first_name} ${selectedClient.managers.last_name}`.trim()
            : null

        let managerCommsCount = 0
        let managerOutboundEmails = 0
        let managerInboundEmails = 0
        let managerChats = 0
        let managerPhoneCalls = 0
        let managerLettersSent = 0
        let managerOthers = 0

        const cleanStringForMatch = (str: string) => {
            return str
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
        }

        const cleanManagerName = managerName ? cleanStringForMatch(managerName) : null
        
        const isUserMatchingManager = (userStr: string) => {
            if (!userStr || !cleanManagerName) return false
            const cleanUser = cleanStringForMatch(userStr)
            if (cleanUser === cleanManagerName) return true
            if (cleanUser.includes(cleanManagerName) || cleanManagerName.includes(cleanUser)) return true
            
            // Check first and last name separately
            const firstPart = cleanStringForMatch(selectedClient?.managers?.first_name || '')
            const lastPart = cleanStringForMatch(selectedClient?.managers?.last_name || '')
            if (firstPart && lastPart) {
                if (cleanUser === `${firstPart} ${lastPart}`) return true
                if (cleanUser === `${lastPart} ${firstPart}`) return true
                if (cleanUser === firstPart || cleanUser === lastPart) return true
            }
            return false
        }

        const isUserAManager = (userStr: string) => {
            const cleanUser = cleanStringForMatch(userStr)
            if (cleanUser === "marie-camille benhamou" || cleanUser === "marie camille benhamou") return false
            const configuredDept = deptMap[userStr]
            if (configuredDept === "Gestionnaire") return true

            if (isUserMatchingManager(userStr)) return true

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

            if (timelineKey !== "Unknown") {
                // Monthly history for cards expanded drawer
                if (monthlyDeptHistory[resolvedDept]) {
                    monthlyDeptHistory[resolvedDept][timelineKey] = (monthlyDeptHistory[resolvedDept][timelineKey] || 0) + 1
                }
                if (isMgr && monthlyDeptHistory["Gestionnaire"]) {
                    monthlyDeptHistory["Gestionnaire"][timelineKey] = (monthlyDeptHistory["Gestionnaire"][timelineKey] || 0) + 1
                }

                // Chronology timeline map
                if (!timelineChronologyMap[timelineKey]) {
                    timelineChronologyMap[timelineKey] = { 
                        contractVolume: 0, 
                        outOfContractVolume: 0,
                        outboundEmails: 0,
                        inboundEmails: 0,
                        chats: 0,
                        phoneCalls: 0,
                        lettersSent: 0,
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
                else if (cls === 'letterSent') timelineChronologyMap[timelineKey].lettersSent++
                else timelineChronologyMap[timelineKey].others++
            }

            if (row.year && row.year !== "Unknown") {
                const yearVal = row.year;
                if (!localYearlyAgg[yearVal]) {
                    localYearlyAgg[yearVal] = {}
                    DEPT_LIST.forEach(d => { localYearlyAgg[yearVal][d] = 0; })
                    localYearlyAgg[yearVal]["Chargé d'opération"] = 0
                }
                if (localYearlyAgg[yearVal][resolvedDept] !== undefined) {
                    localYearlyAgg[yearVal][resolvedDept]++
                }
                if (isMgr && localYearlyAgg[yearVal]["Gestionnaire"] !== undefined) {
                    localYearlyAgg[yearVal]["Gestionnaire"]++
                }
            }

            if (row.unite && row.unite !== "" && row.unite !== "-") {
                if (timelineKey !== "Unknown") {
                    if (!monthlyUnitHistory[row.unite]) {
                        monthlyUnitHistory[row.unite] = {}
                    }
                    monthlyUnitHistory[row.unite][timelineKey] = (monthlyUnitHistory[row.unite][timelineKey] || 0) + 1
                }
            }

            // Check if this row matches the manager
            if (isMgr) {
                managerCommsCount++
                const cls = classifyCommType(row.type)
                if (cls === 'outboundEmail') managerOutboundEmails++
                else if (cls === 'inboundEmail') managerInboundEmails++
                else if (cls === 'chat') managerChats++
                else if (cls === 'phoneCall') managerPhoneCalls++
                else if (cls === 'letterSent') managerLettersSent++
                else managerOthers++
            }

            // Apply filters
            if (selectedYear !== "all" && row.year !== selectedYear) return
            if (selectedMonth !== "all" && row.month !== selectedMonth) return
            
            // Raw employee count before user filter
            employeeCounts[row.user] = (employeeCounts[row.user] || 0) + 1

            if (selectedUserFilter !== null && row.user !== selectedUserFilter) return

            cleanVolume++
            filteredList.push(row)

            const cls = classifyCommType(row.type)
            if (cls === 'outboundEmail') outboundEmailsCount++
            else if (cls === 'inboundEmail') inboundEmailsCount++
            else if (cls === 'chat') chatsCount++
            else if (cls === 'phoneCall') phoneCallsCount++
            else if (cls === 'letterSent') lettersSentCount++
            else othersCount++

            if (cls === 'inboundEmail' || cls === 'chat') {
                inbound++
            }
            
            if (deptCounts[resolvedDept] !== undefined) {
                deptCounts[resolvedDept]++
            }
            if (isMgr && deptCounts["Gestionnaire"] !== undefined) {
                deptCounts["Gestionnaire"]++
            }

            if (resolvedDept !== "Sinistres" && resolvedDept !== "Travaux Majeurs") {
                contractInclusionsVolume++
            }

            if (row.unite && row.unite !== "" && row.unite !== "-") {
                unitCounts[row.unite] = (unitCounts[row.unite] || 0) + 1
            }
        })

        // Format chronological timeline grid for Tab 2
        const timelineList = Object.entries(timelineChronologyMap)
            .map(([period, data]) => {
                const ratio = (data.contractVolume / Math.max(1, unitCount)).toFixed(2)
                return {
                    period,
                    contractVolume: data.contractVolume,
                    outOfContractVolume: data.outOfContractVolume,
                    ratio: Number(ratio),
                    outboundEmails: data.outboundEmails,
                    inboundEmails: data.inboundEmails,
                    chats: data.chats,
                    phoneCalls: data.phoneCalls,
                    lettersSent: data.lettersSent,
                    others: data.others
                }
            })
            .sort((a, b) => a.period.localeCompare(b.period))

        // Get sorted top units list
        const sortedUnits = Object.entries(unitCounts)
            .map(([unit, count]) => ({ unit, count }))
            .sort((a, b) => b.count - a.count)

        // Get sorted employee list
        const sortedEmployees = Object.entries(employeeCounts)
            .map(([name, count]) => {
                let dept = deptMap[name] || "Gestion"
                if (isUserAManager(name)) {
                    dept = "Gestionnaire"
                }
                return { name, count, dept }
            })
            .sort((a, b) => b.count - a.count)

        return {
            cleanVolume,
            inbound,
            contractInclusionsVolume,
            deptCounts,
            timelineList,
            sortedUnits,
            sortedEmployees,
            filteredList,
            monthlyDeptHistory,
            monthlyUnitHistory,
            yearlyHistoricAggregates: localYearlyAgg,
            outboundEmails: outboundEmailsCount,
            inboundEmails: inboundEmailsCount,
            chats: chatsCount,
            phoneCalls: phoneCallsCount,
            lettersSent: lettersSentCount,
            others: othersCount,
            // Manager metrics
            managerName,
            managerCommsCount,
            managerOutboundEmails,
            managerInboundEmails,
            managerChats,
            managerPhoneCalls,
            managerLettersSent,
            managerOthers,
            isUserAManager
        }
    }, [rawRows, deptMap, selectedYear, selectedMonth, selectedUserFilter, unitCount, selectedClient])

    // Save Analysis to Database
    const handleSaveAnalysis = async () => {
        if (!selectedClientId || !pipelineData) {
            toast.error("Veuillez sélectionner un syndicat (SDC) et charger des données à sauvegarder.")
            return
        }

        setIsSaving(true)
        try {
            // Find start and end period from raw rows
            const activePeriodDates = rawRows
                .map(r => parseDateString(r.date))
                .filter((d): d is Date => d !== null)
                .sort((a, b) => a.getTime() - b.getTime())
            
            const period_start = activePeriodDates.length > 0 ? activePeriodDates[0].toISOString().substring(0, 10) : null
            const period_end = activePeriodDates.length > 0 ? activePeriodDates[activePeriodDates.length - 1].toISOString().substring(0, 10) : null

            // Determine total emails vs total calls and granular type recaps
            let total_emails = 0
            let total_phone_calls = 0

            let outboundEmailsCount = 0
            let inboundEmailsCount = 0
            let chatsCount = 0
            let phoneCallsCount = 0
            let lettersSentCount = 0
            let othersCount = 0

            rawRows.forEach(r => {
                const cls = classifyCommType(r.type)
                if (cls === 'outboundEmail') {
                    outboundEmailsCount++
                    total_emails++
                } else if (cls === 'inboundEmail') {
                    inboundEmailsCount++
                    total_emails++
                } else if (cls === 'chat') {
                    chatsCount++
                } else if (cls === 'phoneCall') {
                    phoneCallsCount++
                    total_phone_calls++
                } else if (cls === 'letterSent') {
                    lettersSentCount++
                } else {
                    othersCount++
                }
            })

            const summaryPayload = {
                period_start,
                period_end,
                total_emails,
                total_phone_calls,
                total_communications: rawRows.length,
                analysis_date: period_end,
                analysis_summary: {
                    total_units: unitCount,
                    deptCounts: pipelineData.deptCounts,
                    yearlyHistoricAggregates: pipelineData.yearlyHistoricAggregates,
                    timelineList: pipelineData.timelineList,
                    monthlyDeptHistory: pipelineData.monthlyDeptHistory,
                    monthlyUnitHistory: pipelineData.monthlyUnitHistory,
                    sortedUnits: pipelineData.sortedUnits,
                    dynamicDeptMap: deptMap,
                    discoveredUsers,
                    analysis_date: period_end || new Date().toISOString(),
                    typeRecap: {
                        outboundEmails: outboundEmailsCount,
                        inboundEmails: inboundEmailsCount,
                        chats: chatsCount,
                        phoneCalls: phoneCallsCount,
                        lettersSent: lettersSentCount,
                        others: othersCount
                    }
                }
            }

            const res = await saveCommunicationStatsAction(selectedClientId, summaryPayload, overwriteOverlap)
            if (res.success) {
                toast.success("Statistiques de l'audit de communication enregistrées dans le profil du syndicat !")
                if (fileQueue.length > 1) {
                    const remaining = fileQueue.slice(1)
                    setFileQueue(remaining)
                    setCsvFile(null)
                    setRawRows([])
                    setHasSaved(false)
                    setIsSaving(false)
                } else if (fileQueue.length === 1) {
                    setFileQueue([])
                    handleResetAll()
                    toast.success("Tous les fichiers de la file d'attente ont été analysés et enregistrés !")
                } else {
                    setHasSaved(true)
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la sauvegarde.")
        } finally {
            setIsSaving(false)
        }
    }

    // Inspect Otonom / Assignation system rows
    const inspectionRows = useMemo(() => {
        if (systemInspectionMode === 'otonom') return excludedOtonom
        if (systemInspectionMode === 'assign') return excludedAssign
        return null
    }, [systemInspectionMode, excludedOtonom, excludedAssign])

    // Load more entries handler
    const loadMoreMainData = () => {
        setMainVisibleCount(prev => prev + 50)
    }

    const loadMoreEmpData = () => {
        setEmpVisibleCount(prev => prev + 50)
    }

    // Employee specific tab drilldown
    const tab2EmployeesList = useMemo(() => {
        if (rawRows.length === 0) return []
        const counts: Record<string, number> = {}
        rawRows.forEach(r => {
            counts[r.user] = (counts[r.user] || 0) + 1
        })
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count, dept: deptMap[name] || "Gestion" }))
            .sort((a, b) => b.count - a.count)
    }, [rawRows, deptMap])

    const tab2DrilldownData = useMemo(() => {
        if (!drilldownTab2User || rawRows.length === 0) return null
        
        const userComms = rawRows.filter(r => r.user === drilldownTab2User)
        const units = new Set<string>()
        userComms.forEach(c => {
            if (c.unite && c.unite !== "" && c.unite !== "-") {
                units.add(c.unite)
            }
        })

        return {
            total: userComms.length,
            unitCoverageCount: units.size,
            list: userComms
        }
    }, [drilldownTab2User, rawRows])

    // Effect to auto-select the first user in employee search list when drilldown isn't set
    useEffect(() => {
        if (tab2EmployeesList.length > 0 && !drilldownTab2User) {
            setDrilldownTab2User(tab2EmployeesList[0].name)
        }
    }, [tab2EmployeesList, drilldownTab2User])

    const isUserAssociatedManager = (userName: string) => {
        if (!userName || !pipelineData?.managerName) return false
        const cleanUser = userName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
        const cleanManager = pipelineData.managerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
        return cleanUser === cleanManager || cleanUser.includes(cleanManager) || cleanManager.includes(cleanUser)
    }

    return (
        <div className="space-y-6">
            {/* File Queue Banner */}
            {fileQueue.length > 0 && (
                <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-300 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-400 shrink-0" />
                        <div>
                            <span className="font-bold text-zinc-100">File d'attente active : </span>
                            <span className="font-semibold">
                                {csvFile 
                                    ? `Fichier en cours : ${csvFile.name} (${fileQueue.length - 1} restants)` 
                                    : `${fileQueue.length} fichier(s) en attente`
                                }
                            </span>
                            {csvFile && fileQueue.length > 1 && (
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                    Suivant : <span className="font-semibold text-indigo-200">{fileQueue[1].name}</span>
                                </span>
                            )}
                            {!csvFile && (
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                    Prochain fichier : <span className="font-semibold text-indigo-200">{fileQueue[0].name}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setFileQueue([])
                                toast.info("File d'attente vidée.")
                            }}
                            className="border-indigo-850/60 text-indigo-400 hover:bg-indigo-950/80 hover:text-indigo-200 text-[10px] h-8 w-full sm:w-auto"
                        >
                            Vider la file
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => processNextFile()}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-[10px] h-8 w-full sm:w-auto"
                        >
                            Ignorer et charger le suivant
                        </Button>
                    </div>
                </div>
            )}

            {/* SDC selection banner & Config controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                <div className="space-y-1 md:col-span-2 relative">
                    <Label className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Syndicat (SDC) Cible</Label>
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Rechercher et choisir un syndicat..."
                            value={sdcSearch}
                            onChange={(e) => {
                                setSdcSearch(e.target.value)
                                setIsSdcDropdownOpen(true)
                                if (!e.target.value) {
                                    setSelectedClientId('')
                                }
                            }}
                            onFocus={() => setIsSdcDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsSdcDropdownOpen(false), 200)}
                            className="w-full bg-[#121318] border-zinc-800 h-9 pr-8 text-zinc-150 text-xs placeholder:text-zinc-500"
                        />
                        {selectedClientId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedClientId('')
                                    setSdcSearch('')
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {isSdcDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[#16171e] border border-zinc-800 rounded-lg shadow-xl scrollbar-thin">
                            {filteredSdcClients.length > 0 ? (
                                filteredSdcClients.map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedClientId(c.id)
                                            setSdcSearch(c.company_name || c.full_name)
                                            setIsSdcDropdownOpen(false)
                                        }}
                                        className={`px-3 py-2 text-xs cursor-pointer hover:bg-indigo-650 hover:text-white transition-colors ${
                                            selectedClientId === c.id ? 'bg-indigo-950/60 text-indigo-300 font-bold' : 'text-zinc-300'
                                        }`}
                                    >
                                        <span className="font-semibold">{c.company_name || 'Syndicat sans nom'}</span>{' '}
                                        <span className="text-[10px] opacity-75 font-mono">({c.full_name})</span>
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-xs text-zinc-550 italic">Aucun résultat trouvé</div>
                            )}
                        </div>
                    )}
                    {selectedClientId && selectedClient && (
                        <div className="mt-1.5 flex items-center gap-2">
                            <Badge variant="outline" className="bg-indigo-950/40 text-indigo-400 border-indigo-900/50 text-[9px] font-mono font-bold uppercase py-0.5 px-2">
                                Code : {selectedClient.full_name}
                            </Badge>
                        </div>
                    )}
                    {selectedClientId && (
                        <div className="mt-2 text-[10px] space-y-1">
                            {clientStats.length > 0 ? (
                                <div className="bg-amber-955 bg-amber-600/10 border border-amber-500/20 rounded-lg p-2 text-amber-300 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="font-bold block text-[10px]">⚠️ Données déjà importées pour ce syndicat :</span>
                                    <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto scrollbar-thin">
                                        {clientStats.map((s: any, idx: number) => (
                                            <div key={s.id || idx} className="flex justify-between font-mono text-[9px] opacity-90">
                                                <span>Du {s.period_start} au {s.period_end}</span>
                                                <span>({s.total_communications} comms)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-955 bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-2 text-emerald-400 font-medium text-[9px] flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    ✓ Prêt pour un nouvel import (aucune donnée existante).
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="space-y-1">
                    <Label htmlFor="unit-count-input" className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Nombre d'unités (Portes)</Label>
                    <Input
                        type="number"
                        id="unit-count-input"
                        value={unitCount}
                        onChange={(e) => setUnitCount(Math.max(1, parseInt(e.target.value) || 0))}
                        min="1"
                        className="bg-[#121318] border-zinc-800 h-9 text-zinc-150 text-xs"
                    />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                        id="overwrite-overlap-checkbox"
                        checked={overwriteOverlap}
                        onCheckedChange={(checked) => {
                            const val = !!checked
                            setOverwriteOverlap(val)
                            if (csvFile) {
                                parseFile(csvFile)
                            }
                        }}
                    />
                    <label 
                        htmlFor="overwrite-overlap-checkbox" 
                        className="text-[10px] font-medium text-zinc-350 cursor-pointer select-none"
                    >
                        Remplacer l'analyse existante en cas de chevauchement
                    </label>
                </div>

                <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Enregistrement</Label>
                    <div className="flex flex-col gap-2">
                        <Button
                            type="button"
                            disabled={!selectedClientId || rawRows.length === 0 || isSaving || hasSaved}
                            onClick={handleSaveAnalysis}
                            className={`w-full font-bold h-9 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
                                hasSaved 
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-900/40' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                            }`}
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasSaved ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    Enregistré avec succès !
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Enregistrer l'analyse
                                </>
                            )}
                        </Button>
                        {hasSaved && (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (fileQueue.length > 1) {
                                        const remaining = fileQueue.slice(1)
                                        setFileQueue(remaining)
                                        setCsvFile(null)
                                        setRawRows([])
                                        setHasSaved(false)
                                        setIsSaving(false)
                                    } else {
                                        setFileQueue([])
                                        handleResetAll()
                                    }
                                }}
                                className="w-full font-bold h-9 rounded-lg flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
                            >
                                <RefreshCw className="h-4 w-4" />
                                {fileQueue.length > 1 
                                    ? `Traiter le fichier suivant (${fileQueue.length - 1} en attente)` 
                                    : "Faire un autre syndicat"
                                }
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* CSV Dropzone */}
            <div className="relative">
                <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileChange}
                    id="dropzone-file-input"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center bg-[#16171e]/70 hover:bg-[#16171e] transition-all relative">
                    {isParsing ? (
                        <>
                            <Loader2 className="h-8 w-8 text-indigo-500 mb-2 animate-spin" />
                            <span className="text-zinc-300 font-medium text-xs">Calcul en cours...</span>
                            <span className="text-[9px] text-zinc-550 mt-1">Lecture et indexation des communications...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                            <span className="text-zinc-300 font-medium text-xs font-semibold">
                                {csvFile ? `${csvFile.name} (Prêt)` : "Glissez-déposez le fichier d'historique CSV ici ou cliquez pour le parcourir."}
                            </span>
                            <span className="text-[9px] text-zinc-550 mt-1">Colonnes de base requises: Lot, Type, Date, Unité, Destinataire, Objet, Agent (Ajouté par).</span>
                        </>
                    )}
                </div>
            </div>

            {csvFile && rawRows.length > 0 && pipelineData && (
                <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Fichier chargé : <strong className="text-zinc-200 font-mono">{csvFile.name}</strong></span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const link = document.createElement("a")
                                    link.href = URL.createObjectURL(csvFile)
                                    link.download = csvFile.name
                                    link.click()
                                }}
                                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[10px] h-6 px-2 rounded-md"
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Télécharger CSV
                            </Button>
                            <Badge variant="outline" className="bg-indigo-950/30 text-indigo-400 border-indigo-900/50">
                                {rawRows.length} lignes valides
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-zinc-900/40">
                        <div className="bg-[#121318] p-2 rounded-lg border border-zinc-800/40 text-center">
                            <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Courriels Envoyés</span>
                            <span className="text-base font-bold font-mono text-emerald-450 text-emerald-400 mt-0.5 block">
                                {pipelineData.outboundEmails}
                            </span>
                        </div>
                        <div className="bg-[#121318] p-2 rounded-lg border border-zinc-800/40 text-center">
                            <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Courriels Reçus</span>
                            <span className="text-base font-bold font-mono text-sky-400 mt-0.5 block">
                                {pipelineData.inboundEmails}
                            </span>
                        </div>
                        <div className="bg-[#121318] p-2 rounded-lg border border-zinc-800/40 text-center">
                            <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Lettres Expédiées</span>
                            <span className="text-base font-bold font-mono text-amber-500 mt-0.5 block">
                                {pipelineData.lettersSent}
                            </span>
                        </div>
                        <div className="bg-[#121318] p-2 rounded-lg border border-zinc-800/40 text-center">
                            <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Clavardages</span>
                            <span className="text-base font-bold font-mono text-indigo-400 mt-0.5 block">
                                {pipelineData.chats}
                            </span>
                        </div>
                        <div className="bg-[#121318] p-2 rounded-lg border border-zinc-800/40 text-center">
                            <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Appels</span>
                            <span className="text-base font-bold font-mono text-rose-400 mt-0.5 block">
                                {pipelineData.phoneCalls}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            {rawRows.length > 0 && (
                <div className="space-y-6">
                    <div className="flex border-b border-zinc-800 gap-4 flex-wrap">
                        {[
                            { id: 'dashboard', label: 'Tableau de Bord Global' },
                            { id: 'timeline', label: 'Évolution Chronologique' },
                            { id: 'employees', label: 'Analyse par Employé' },
                            { id: 'config', label: 'Configuration des Équipes' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-2.5 text-xs font-bold transition-all relative ${
                                    activeTab === tab.id 
                                        ? 'text-indigo-400 font-extrabold' 
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Filter controls row */}
                    {activeTab !== 'config' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-950/40 p-3 border border-zinc-850 rounded-xl">
                            <div className="flex items-center gap-2 text-xs">
                                <Label className="text-zinc-500 shrink-0 font-bold uppercase tracking-wider text-[9px]">Année :</Label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="bg-[#121318] border border-zinc-800 rounded px-2 h-7 text-zinc-300 text-[10px] w-full"
                                >
                                    <option value="all">Toutes les années</option>
                                    {detectedYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <Label className="text-zinc-500 shrink-0 font-bold uppercase tracking-wider text-[9px]">Mois :</Label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-[#121318] border border-zinc-800 rounded px-2 h-7 text-zinc-300 text-[10px] w-full"
                                >
                                    <option value="all">Tous les mois</option>
                                    <option value="01">Janvier</option><option value="02">Février</option>
                                    <option value="03">Mars</option><option value="04">Avril</option>
                                    <option value="05">Mai</option><option value="06">Juin</option>
                                    <option value="07">Juillet</option><option value="08">Août</option>
                                    <option value="09">Septembre</option><option value="10">Octobre</option>
                                    <option value="11">Novembre</option><option value="12">Décembre</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <Label className="text-zinc-500 shrink-0 font-bold uppercase tracking-wider text-[9px]">Filtre Intervenant :</Label>
                                {selectedUserFilter ? (
                                    <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-850 px-2 py-0.5 rounded text-[10px] text-indigo-300 w-full h-7">
                                        <span className="truncate max-w-[150px] font-semibold">{selectedUserFilter}</span>
                                        <button onClick={() => setSelectedUserFilter(null)} className="text-indigo-400 hover:text-indigo-200">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-zinc-500 italic py-1">Sélectionnez dans la liste de gauche</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB PANEL: DASHBOARD */}
                    {activeTab === 'dashboard' && pipelineData && (
                        <div className="space-y-6">
                            {/* Executive summary cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="bg-gradient-to-tr from-[#16171e] to-indigo-950/20 border-zinc-800/80 shadow-md">
                                    <CardContent className="p-6">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-black block">Volume de Gestion Forfaitaire Inclus</span>
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
                                            {(pipelineData.contractInclusionsVolume / (Math.max(1, unitCount) * (pipelineData.timelineList.length || 1))).toFixed(2)}
                                        </div>
                                        <span className="text-[10px] text-zinc-450 mt-1.5 block">Moyenne d'interactions incluses par porte / mois</span>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-tr from-[#16171e] to-indigo-950/20 border-zinc-800/80 shadow-md">
                                    <CardContent className="p-6 flex flex-col justify-between h-full">
                                        <div>
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-black block">Gestionnaire Associé</span>
                                            {pipelineData.managerName ? (
                                                <>
                                                    <div className="text-sm font-black text-white mt-1.5 truncate" title={pipelineData.managerName}>
                                                        {pipelineData.managerName}
                                                    </div>
                                                    <div className="text-3xl font-black text-indigo-400 mt-1 block font-mono">
                                                        {pipelineData.managerCommsCount} <span className="text-xxs text-zinc-450 font-normal uppercase">comms</span>
                                                    </div>
                                                    <span className="text-[9px] text-zinc-450 mt-1 block">
                                                        Responsable de <strong className="text-zinc-200">{Math.round((pipelineData.managerCommsCount / Math.max(1, rawRows.length)) * 100)}%</strong> du volume global ({rawRows.length} comms au total).
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-[11px] font-semibold text-zinc-500 italic mt-2">
                                                        Aucun gestionnaire assigné
                                                    </div>
                                                    <span className="text-[9px] text-zinc-550 mt-2 block leading-relaxed">
                                                        Associez un gestionnaire à ce syndicat pour suivre sa charge automatiquement.
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {pipelineData.managerName && pipelineData.managerCommsCount > 0 && (
                                            <div className="mt-3 pt-2.5 border-t border-zinc-900/50 space-y-1 text-[9px]">
                                                <div className="flex justify-between items-center text-zinc-450">
                                                    <span>Courriels (In/Out) :</span>
                                                    <span className="font-bold text-zinc-200 font-mono">
                                                        {pipelineData.managerInboundEmails + pipelineData.managerOutboundEmails} ({pipelineData.managerInboundEmails} In / {pipelineData.managerOutboundEmails} Out)
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-zinc-450">
                                                    <span>Appels téléphoniques :</span>
                                                    <span className="font-bold text-zinc-200 font-mono">{pipelineData.managerPhoneCalls}</span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-tr from-[#16171e] to-zinc-950/40 border-zinc-800/80 shadow-md">
                                    <CardContent className="p-6">
                                        <span className="text-[10px] text-zinc-555 uppercase tracking-wider font-black block">Répartition par Canal</span>
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

                            {/* System Exclusions/Inspections Alert */}
                            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-zinc-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                                    Exclusions Système Actives : {excludedOtonom.length} Otonoms, {excludedAssign.length} assignations supprimées pour fiabiliser l'audit.
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSystemInspectionMode(systemInspectionMode === 'otonom' ? null : 'otonom')}
                                        className={`border-zinc-800 text-[10px] h-7 ${systemInspectionMode === 'otonom' ? 'bg-indigo-650 border-indigo-600 text-white font-bold' : ''}`}
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Lignes Otonom
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSystemInspectionMode(systemInspectionMode === 'assign' ? null : 'assign')}
                                        className={`border-zinc-800 text-[10px] h-7 ${systemInspectionMode === 'assign' ? 'bg-indigo-650 border-indigo-600 text-white font-bold' : ''}`}
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Assignations
                                    </Button>
                                </div>
                            </div>

                            {/* Departments grid load rates */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Répartition des charges opérationnelles moyennes par porte / mois :</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {DEPT_LIST.map(d => {
                                        const count = pipelineData.deptCounts[d] || 0
                                        const monthsCount = pipelineData.timelineList.length || 1
                                        const loadRate = (count / (Math.max(1, unitCount) * monthsCount)).toFixed(2)
                                        
                                        let borderCss = DEPT_COLORS[d] || "border-l-zinc-700 bg-zinc-900/10"
                                        if (d === "Gestion") {
                                            const pmLoadScore = count / (Math.max(1, unitCount) * monthsCount)
                                            if (pmLoadScore > 4.5) {
                                                borderCss = "border-l-rose-500 bg-sky-950/10"
                                            } else if (pmLoadScore > 2.5) {
                                                borderCss = "border-l-amber-500 bg-sky-950/10"
                                            } else {
                                                borderCss = "border-l-sky-500 bg-sky-950/10"
                                            }
                                        }

                                        const badgeCss = DEPT_BADGE_CSS[d] || "bg-zinc-800 text-zinc-400"
                                        const isDrawerOpen = activeMonthlyDrawerDept === d

                                        // Trend calculation matching the HTML tool's logic
                                        let trendNoticeClass = "bg-zinc-800 text-zinc-450 border-zinc-750"
                                        let trendNoticeText = "Volume cumulé"

                                        if (selectedYear !== "all" && pipelineData.monthlyDeptHistory) {
                                            // Get the calendar months present in the selected year
                                            const monthsInSelectedYear = pipelineData.timelineList
                                                .map((t: any) => t.period)
                                                .filter((p: string) => p.startsWith(selectedYear))
                                                .map((p: string) => p.split('-')[1]) // e.g. "01", "02", ...

                                            let totalOtherYearsVolume = 0
                                            let otherYearsCount = 0

                                            // Find other years detected in the data
                                            const otherYears = detectedYears.filter(y => y !== selectedYear)

                                            otherYears.forEach(y => {
                                                let otherYearEquivalentVolume = 0
                                                monthsInSelectedYear.forEach((m: string) => {
                                                    const periodKey = `${y}-${m}`
                                                    otherYearEquivalentVolume += (pipelineData.monthlyDeptHistory[d]?.[periodKey] || 0)
                                                })
                                                totalOtherYearsVolume += otherYearEquivalentVolume
                                                otherYearsCount++
                                            })

                                            const baselineAverage = otherYearsCount > 0 ? (totalOtherYearsVolume / otherYearsCount) : 0
                                            
                                            if (baselineAverage === 0) {
                                                trendNoticeClass = "bg-zinc-800 text-zinc-450 border-zinc-750"
                                                trendNoticeText = "Nouveau segment"
                                            } else {
                                                const pctDelta = (((count - baselineAverage) / baselineAverage) * 100).toFixed(1)
                                                if (count >= baselineAverage) {
                                                    trendNoticeClass = "bg-rose-500/15 text-rose-450 border border-rose-950/40"
                                                    trendNoticeText = `+${pctDelta}% vs historique`
                                                } else {
                                                    trendNoticeClass = "bg-emerald-500/15 text-emerald-450 border border-emerald-950/40"
                                                    trendNoticeText = `${pctDelta}% vs historique`
                                                }
                                            }
                                        } else if (selectedYear === "all") {
                                            trendNoticeText = "Volume total"
                                        }

                                        return (
                                            <Card key={d} className={`border border-zinc-850 border-l-4 rounded-xl flex flex-col justify-between p-3.5 shadow-sm transition-all ${borderCss}`}>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{d}</span>
                                                    <div className="text-xl font-extrabold text-white mt-1 block">{loadRate}</div>
                                                    <span className="text-[9px] text-zinc-550 block">{count.toLocaleString()} comms</span>
                                                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1.5 border ${trendNoticeClass}`}>
                                                        {trendNoticeText}
                                                    </span>
                                                </div>
                                                
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setActiveMonthlyDrawerDept(isDrawerOpen ? null : d)}
                                                    className="w-full text-[9px] font-bold text-zinc-450 hover:bg-zinc-900 h-6 p-0 mt-3 rounded-md flex items-center justify-center border border-zinc-800/60"
                                                >
                                                    {isDrawerOpen ? 'Fermer l\'historique' : 'Historique mensuel'}
                                                    <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isDrawerOpen ? 'rotate-180' : ''}`} />
                                                </Button>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Department Monthly History Drawer */}
                            {activeMonthlyDrawerDept && pipelineData.monthlyDeptHistory[activeMonthlyDrawerDept] && (
                                <Card className="bg-[#121318]/50 border border-zinc-850 p-4 rounded-xl animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-zinc-350 uppercase tracking-wider">
                                            Historique mensuel : <span className="text-indigo-400 font-extrabold">{activeMonthlyDrawerDept}</span>
                                        </h4>
                                        <button onClick={() => setActiveMonthlyDrawerDept(null)} className="text-zinc-500 hover:text-zinc-300">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xxs">
                                        {Object.entries(pipelineData.monthlyDeptHistory[activeMonthlyDrawerDept])
                                            .sort((a, b) => a[0].localeCompare(b[0]))
                                            .map(([period, val]) => (
                                                <div key={period} className="p-2 bg-zinc-950/40 border border-zinc-850 rounded-lg text-center">
                                                    <span className="font-bold text-zinc-450 block">{period}</span>
                                                    <span className="text-sm font-black text-white mt-1 block">{val}</span>
                                                    <span className="text-[9px] text-zinc-650 block mt-0.5">{(val / Math.max(1, unitCount)).toFixed(2)} / porte</span>
                                                </div>
                                            ))
                                        }
                                        {Object.keys(pipelineData.monthlyDeptHistory[activeMonthlyDrawerDept]).length === 0 && (
                                            <div className="col-span-full py-4 text-center text-zinc-550 italic">Aucune donnée historique trouvée pour cette période.</div>
                                        )}
                                    </div>
                                </Card>
                            )}

                            {/* Registry, Employees & Units split layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                                {/* Left column: Employee volume list */}
                                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-3 flex flex-col h-[580px]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Volume par Intervenant</CardTitle>
                                        <div className="flex flex-col gap-2 mt-2">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-550 text-zinc-500" />
                                                <Input
                                                    type="search"
                                                    placeholder="Chercher un nom..."
                                                    value={searchEmployeeQuery}
                                                    onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                                                    className="w-full bg-[#121318] border-zinc-800 pl-8 h-8 text-xs placeholder:text-zinc-500"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Label className="text-zinc-550 shrink-0 font-bold uppercase tracking-wider text-[8px] select-none">Service :</Label>
                                                <select
                                                    value={employeeDeptFilter}
                                                    onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                                                    className="w-full bg-[#121318] border border-zinc-800 rounded px-2 h-8 text-zinc-300 text-xxs focus:outline-none"
                                                >
                                                    <option value="all">Tous les services</option>
                                                    {DEPT_LIST.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto pr-1 text-xxs space-y-1 scrollbar-thin">
                                        {pipelineData.sortedEmployees
                                            .filter(emp => emp.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()))
                                            .filter(emp => employeeDeptFilter === 'all' || emp.dept === employeeDeptFilter)
                                            .map(emp => {
                                                const isActiveFilter = selectedUserFilter === emp.name
                                                const isAssocManager = pipelineData.isUserAManager(emp.name)
                                                return (
                                                    <div 
                                                        key={emp.name} 
                                                        onClick={() => setSelectedUserFilter(isActiveFilter ? null : emp.name)}
                                                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                                            isActiveFilter 
                                                                ? 'bg-indigo-950/40 border-indigo-650 text-indigo-300 font-extrabold shadow' 
                                                                : 'bg-zinc-950/20 border-zinc-900/60 hover:bg-zinc-900/40 text-zinc-300'
                                                        }`}
                                                    >
                                                        <span className="truncate max-w-[120px] flex items-center gap-1.5">
                                                            {emp.name}
                                                            {isAssocManager && (
                                                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-550/20 text-[7px] px-1 py-0 rounded font-bold uppercase select-none shrink-0">
                                                                    Gestionnaire
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${DEPT_BADGE_CSS[emp.dept] || 'bg-zinc-800'}`}>
                                                                {emp.dept}
                                                            </span>
                                                            <span className="font-mono font-bold text-white bg-zinc-950 px-1.5 py-0.5 rounded">{emp.count}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        }
                                    </CardContent>
                                </Card>

                                {/* Middle column: Top units list */}
                                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-3 flex flex-col h-[580px]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Top Unités Sollicitées</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto pr-1 text-xxs space-y-1.5 scrollbar-thin">
                                        {pipelineData.sortedUnits.slice(0, 100).map((u, index) => (
                                            <div key={u.unit} className="p-2 bg-zinc-950/20 border border-zinc-900/60 rounded-lg flex items-center justify-between text-zinc-300">
                                                <span className="font-semibold text-zinc-400"># {index + 1} &middot; Unité <strong className="text-zinc-200">{u.unit}</strong></span>
                                                <span className="font-mono font-bold text-indigo-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">{u.count} comms</span>
                                            </div>
                                        ))}
                                        {pipelineData.sortedUnits.length === 0 && (
                                            <p className="text-zinc-550 italic text-center py-12">Aucune unité détectée.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Right column: Communications Registry Table */}
                                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-4 flex flex-col h-[580px]">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                            {systemInspectionMode ? 'Inspection des Logs Système' : 'Registre des Communications'}
                                        </CardTitle>
                                        <Badge className="bg-zinc-950 text-zinc-400 border border-zinc-800 font-mono text-[9px]">
                                            {systemInspectionMode ? inspectionRows?.length : pipelineData.filteredList.length} logs
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-hidden flex flex-col">
                                        <div className="flex-1 overflow-y-auto border border-zinc-900 rounded-lg text-xxs scrollbar-thin">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-zinc-950 text-zinc-450 uppercase font-black tracking-wider text-[8px] sticky top-0 z-20">
                                                    <tr>
                                                        <th className="p-2 border-b border-zinc-900">Lot</th>
                                                        <th className="p-2 border-b border-zinc-900">Type</th>
                                                        <th className="p-2 border-b border-zinc-900">Date</th>
                                                        <th className="p-2 border-b border-zinc-900">Unité</th>
                                                        <th className="p-2 border-b border-zinc-900">Objet</th>
                                                        <th className="p-2 border-b border-zinc-900">Intervenant</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                                                    {(systemInspectionMode ? (inspectionRows || []) : pipelineData.filteredList)
                                                        .slice(0, systemInspectionMode ? inspectionRows?.length : mainVisibleCount)
                                                        .map((row, idx) => (
                                                            <tr key={idx} className="hover:bg-zinc-900/30">
                                                                <td className="p-2 truncate max-w-[60px] font-mono text-[9px] text-zinc-450">{row.lot || '-'}</td>
                                                                <td className="p-2 truncate max-w-[80px]">{row.type || '-'}</td>
                                                                <td className="p-2 truncate max-w-[80px] font-mono text-[9px] text-zinc-450">
                                                                    {row.date.substring(0, 10)}
                                                                </td>
                                                                <td className="p-2 font-bold text-zinc-350">{row.unite || '-'}</td>
                                                                <td className="p-2 truncate max-w-[120px] font-medium" title={row.objet}>
                                                                    {row.objet}
                                                                </td>
                                                                <td className="p-2 truncate max-w-[95px] text-zinc-400">{row.user}</td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {!systemInspectionMode && pipelineData.filteredList.length > mainVisibleCount && (
                                            <Button
                                                onClick={loadMoreMainData}
                                                className="w-full mt-3 h-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-semibold border border-zinc-800"
                                            >
                                                Afficher les 50 suivants
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* TAB PANEL: TIMELINE CHRONOLOGY */}
                    {activeTab === 'timeline' && pipelineData && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historique Global du Syndicat (Mois par Mois)</CardTitle>
                                <CardDescription className="text-xxs text-zinc-500">
                                    Dégage l'évolution de la charge forfaitaire par rapport aux communications exclues du forfait (Travaux Majeurs & Sinistres).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={pipelineData.timelineList}>
                                            <defs>
                                                <linearGradient id="colorContract" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                            <XAxis dataKey="period" stroke="#4b5563" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '10px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                                            <Area type="monotone" dataKey="contractVolume" name="Volume Forfaitaire Net" stroke="#6366f1" fillOpacity={1} fill="url(#colorContract)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="outOfContractVolume" name="Hors-Forfait (Tech+Sinistre)" stroke="#f43f5e" fillOpacity={0} strokeWidth={1.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="border border-zinc-900 rounded-xl overflow-hidden text-xxs">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-950 text-zinc-450 uppercase font-black tracking-wider text-[8px]">
                                            <tr>
                                                <th className="p-3 border-b border-zinc-900">Période Chronologique</th>
                                                <th className="p-3 border-b border-zinc-900 text-sky-400">Volume Forfaitaire Net</th>
                                                <th className="p-3 border-b border-zinc-900 text-emerald-450">Charge Forfaitaire / Porte / Mois</th>
                                                <th className="p-3 border-b border-zinc-900 text-rose-450">Volume Hors-Forfait (Tech+Sinistre)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900 text-zinc-300">
                                            {pipelineData.timelineList.map((row) => (
                                                <tr key={row.period} className="hover:bg-zinc-900/30">
                                                    <td className="p-3 font-bold">{row.period}</td>
                                                    <td className="p-3 font-semibold text-sky-400 font-mono">{row.contractVolume}</td>
                                                    <td className="p-3 font-bold text-emerald-400 font-mono">{row.ratio.toFixed(2)}</td>
                                                    <td className="p-3 font-semibold text-rose-400 font-mono">{row.outOfContractVolume}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* TAB PANEL: EMPLOYEES ANALYTICS */}
                    {activeTab === 'employees' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Left panel selector */}
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md lg:col-span-1 h-[550px] flex flex-col">
                                <CardHeader className="pb-2">
                                    <Label className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Intervenant à Auditer</Label>
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-550 text-zinc-500" />
                                            <Input
                                                type="search"
                                                placeholder="Filtrer la liste..."
                                                value={searchTab2EmployeeQuery}
                                                onChange={(e) => setSearchTab2EmployeeQuery(e.target.value)}
                                                className="w-full bg-[#121318] border-zinc-800 pl-8 h-8 text-xs placeholder:text-zinc-500"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Label className="text-zinc-550 shrink-0 font-bold uppercase tracking-wider text-[8px] select-none">Service :</Label>
                                            <select
                                                value={employeeDeptFilter}
                                                onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                                                className="w-full bg-[#121318] border border-zinc-800 rounded px-2 h-8 text-zinc-300 text-xxs focus:outline-none"
                                            >
                                                <option value="all">Tous les services</option>
                                                {DEPT_LIST.map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto pr-1 text-xxs space-y-1 scrollbar-thin">
                                    {tab2EmployeesList
                                        .filter(e => e.name.toLowerCase().includes(searchTab2EmployeeQuery.toLowerCase()))
                                        .filter(e => employeeDeptFilter === 'all' || e.dept === employeeDeptFilter)
                                        .map(emp => {
                                            const isActive = drilldownTab2User === emp.name
                                            return (
                                                <div
                                                    key={emp.name}
                                                    onClick={() => setDrilldownTab2User(emp.name)}
                                                    className={`p-2 border rounded-lg flex justify-between items-center cursor-pointer transition-all ${
                                                        isActive 
                                                            ? 'bg-indigo-950/40 border-indigo-650 text-indigo-300 font-bold' 
                                                            : 'bg-zinc-950/20 border-zinc-900/60 hover:bg-zinc-900/40 text-zinc-300'
                                                    }`}
                                                >
                                                    <div className="flex flex-col min-w-0 pr-1">
                                                        <span className="truncate font-semibold">{emp.name}</span>
                                                        <span className="text-[8px] text-zinc-500 font-medium truncate">{emp.dept}</span>
                                                    </div>
                                                    <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-white font-bold shrink-0">{emp.count}</span>
                                                </div>
                                            )
                                        })
                                    }
                                </CardContent>
                            </Card>

                            {/* Right panel stats details */}
                            <div className="lg:col-span-3 space-y-6">
                                {drilldownTab2User && tab2DrilldownData ? (
                                    <div className="space-y-6">
                                        {/* Stats cards row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Volume Total Déployé</span>
                                                    <span className="text-2xl font-black text-white mt-1 block">{tab2DrilldownData.total} comms</span>
                                                </div>
                                                <Badge className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${DEPT_BADGE_CSS[deptMap[drilldownTab2User] || 'Gestion'] || 'bg-zinc-800'}`}>
                                                    {deptMap[drilldownTab2User] || 'Gestion'}
                                                </Badge>
                                            </Card>
                                            <Card className="bg-[#16171e]/70 border-zinc-800/80 p-4 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Portée de Couverture</span>
                                                    <span className="text-2xl font-black text-indigo-400 mt-1 block">{tab2DrilldownData.unitCoverageCount} portes</span>
                                                    <span className="text-[9px] text-zinc-500">Nombre d'unités distinctes sollicitées</span>
                                                </div>
                                            </Card>
                                        </div>

                                        {/* Logs table */}
                                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historique d'Interventions</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto text-xxs">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-zinc-950 text-zinc-450 uppercase font-black tracking-wider text-[8px]">
                                                            <tr>
                                                                <th className="p-3 border-b border-zinc-900">Lot</th>
                                                                <th className="p-3 border-b border-zinc-900">Type</th>
                                                                <th className="p-3 border-b border-zinc-900">Date</th>
                                                                <th className="p-3 border-b border-zinc-900">Unité</th>
                                                                <th className="p-3 border-b border-zinc-900">Destinataire</th>
                                                                <th className="p-3 border-b border-zinc-900">Objet</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-900 text-zinc-300">
                                                            {tab2DrilldownData.list.slice(0, empVisibleCount).map((row, idx) => (
                                                                <tr key={idx} className="hover:bg-zinc-900/30">
                                                                    <td className="p-3 font-semibold text-zinc-450 font-mono">{row.lot}</td>
                                                                    <td className="p-3">{row.type}</td>
                                                                    <td className="p-3 font-mono">{row.date.substring(0, 10)}</td>
                                                                    <td className="p-3 font-bold">{row.unite || '-'}</td>
                                                                    <td className="p-3 truncate max-w-[120px]">{row.destinataire || '-'}</td>
                                                                    <td className="p-3 max-w-sm truncate" title={row.objet}>{row.objet}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {tab2DrilldownData.list.length > empVisibleCount && (
                                                    <Button
                                                        onClick={loadMoreEmpData}
                                                        className="w-full mt-3 h-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-semibold border border-zinc-800"
                                                    >
                                                        Afficher la suite
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 italic text-zinc-500 text-xs">Sélectionnez un intervenant pour auditer ses logs.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB PANEL: TEAM CONFIGURATION */}
                    {activeTab === 'config' && (
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Gestion de l'Affectation des Équipes (7 Départements + Conseil)</CardTitle>
                                    <CardDescription className="text-xxs text-zinc-550 mt-1">
                                        Modifiez le département d'un employé. Gustav recalculera toutes les statistiques et les indices de charge par porte en temps réel.
                                    </CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                                    <Input
                                        type="search"
                                        placeholder="Chercher un intervenant..."
                                        value={searchConfigQuery}
                                        onChange={(e) => setSearchConfigQuery(e.target.value)}
                                        className="w-full bg-[#121318] border-zinc-800 pl-8 h-8 text-xs"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto text-xxs">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-950 text-zinc-450 uppercase font-black tracking-wider text-[8px]">
                                            <tr>
                                                <th className="p-3 border-b border-zinc-900">Nom de l'intervenant détecté</th>
                                                <th className="p-3 border-b border-zinc-900">Département Assigné</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900 text-zinc-300">
                                            {discoveredUsers
                                                .filter(u => u.toLowerCase().includes(searchConfigQuery.toLowerCase()))
                                                .map(name => {
                                                    const currentDept = deptMap[name] || "Gestion"
                                                    return (
                                                        <tr key={name} className="hover:bg-zinc-900/30">
                                                            <td className="p-3 font-semibold text-zinc-200">{name}</td>
                                                            <td className="p-3">
                                                                <select
                                                                    value={currentDept}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        setDeptMap(prev => ({
                                                                            ...prev,
                                                                            [name]: val
                                                                        }))
                                                                        setHasSaved(false)
                                                                        toast.info(`Affectation de ${name} changée vers ${val}.`)
                                                                    }}
                                                                    className="bg-[#121318] border border-zinc-800 rounded px-2 h-7 text-zinc-300 text-xxs outline-none focus:ring-1 focus:ring-indigo-500"
                                                                >
                                                                    {DEPT_LIST.map(d => (
                                                                        <option key={d} value={d}>{d}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
