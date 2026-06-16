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
    Eye
} from 'lucide-react'
import { saveCommunicationStatsAction } from '@/actions/communication-stats'
import { toast } from 'sonner'
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
}

interface CommunicationAnalyzerProps {
    clients: Client[]
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
const DEPT_LIST = ["Gestion", "Administration", "Comptabilité", "Technique", "Sinistres", "Assurance", "Direction", "Chargé d’opération", "Conseil d'Administration", "Marketing"]

const DEPT_COLORS: Record<string, string> = {
    "Gestion": "border-l-sky-500 bg-sky-950/10",
    "Administration": "border-l-teal-500 bg-teal-950/10",
    "Comptabilité": "border-l-purple-500 bg-purple-950/10",
    "Technique": "border-l-orange-500 bg-orange-950/10",
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
    "Administration": "bg-teal-500/10 text-teal-400 border border-teal-550/20",
    "Comptabilité": "bg-purple-500/10 text-purple-400 border border-purple-550/20",
    "Technique": "bg-orange-500/10 text-orange-400 border border-orange-550/20",
    "Sinistres": "bg-rose-500/10 text-rose-450 text-rose-400 border border-rose-550/20",
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

    // Technique
    "Angelique Hesbois": "Technique",
    "Angélique Hesbois": "Technique",
    "Victor Dubremetz": "Technique",

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
    const t = (typeStr || "").toLowerCase()
    if (t.includes("expédié") || t.includes("expedie") || t.includes("sent")) return 'outboundEmail'
    if (t.includes("reçu") || t.includes("recu") || t.includes("received")) return 'inboundEmail'
    if (t.includes("clavardage") || t.includes("chat")) return 'chat'
    if (t.includes("téléphone") || t.includes("phone") || t.includes("appel") || t.includes("call")) return 'phoneCall'
    return 'other'
}

export function CommunicationAnalyzer({ clients }: CommunicationAnalyzerProps) {
    const [selectedClientId, setSelectedClientId] = useState<string>('')
    const [sdcSearch, setSdcSearch] = useState('')
    const [isSdcDropdownOpen, setIsSdcDropdownOpen] = useState(false)

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
    
    // CSV uploader states
    const [csvFile, setCsvFile] = useState<File | null>(null)
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
            parseFile(e.target.files[0])
        }
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

        rawRows.forEach(row => {
            const resolvedDept = deptMap[row.user] || "Gestion"
            const timelineKey = (row.year !== "Unknown" && row.month !== "Unknown") ? `${row.year}-${row.month}` : "Unknown"

            if (timelineKey !== "Unknown") {
                // Monthly history for cards expanded drawer
                if (monthlyDeptHistory[resolvedDept]) {
                    monthlyDeptHistory[resolvedDept][timelineKey] = (monthlyDeptHistory[resolvedDept][timelineKey] || 0) + 1
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
                        others: 0
                    }
                }
                if (resolvedDept !== "Sinistres" && resolvedDept !== "Technique") {
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
            }

            if (row.unite && row.unite !== "" && row.unite !== "-") {
                if (timelineKey !== "Unknown") {
                    if (!monthlyUnitHistory[row.unite]) {
                        monthlyUnitHistory[row.unite] = {}
                    }
                    monthlyUnitHistory[row.unite][timelineKey] = (monthlyUnitHistory[row.unite][timelineKey] || 0) + 1
                }
            }

            // Apply filters
            if (selectedYear !== "all" && row.year !== selectedYear) return
            if (selectedMonth !== "all" && row.month !== selectedMonth) return
            
            // Raw employee count before user filter
            employeeCounts[row.user] = (employeeCounts[row.user] || 0) + 1

            if (selectedUserFilter !== null && row.user !== selectedUserFilter) return

            cleanVolume++
            filteredList.push(row)

            const typeLower = (row.type || "").toLowerCase()
            if (typeLower.includes("courriel reçu") || typeLower.includes("clavardage") || typeLower.includes("email received") || typeLower.includes("inbound")) {
                inbound++
            }
            
            if (deptCounts[resolvedDept] !== undefined) {
                deptCounts[resolvedDept]++
            }

            if (resolvedDept !== "Sinistres" && resolvedDept !== "Technique") {
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
            .map(([name, count]) => ({ name, count, dept: deptMap[name] || "Gestion" }))
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
            yearlyHistoricAggregates: localYearlyAgg
        }
    }, [rawRows, deptMap, selectedYear, selectedMonth, selectedUserFilter, unitCount])

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
                        others: othersCount
                    }
                }
            }

            const res = await saveCommunicationStatsAction(selectedClientId, summaryPayload)
            if (res.success) {
                toast.success("Statistiques de l'audit de communication enregistrées dans le profil du syndicat !")
                setHasSaved(true)
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

    return (
        <div className="space-y-6">
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

                <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Enregistrement</Label>
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
                </div>
            </div>

            {/* CSV Dropzone */}
            <div className="relative">
                <input
                    type="file"
                    accept=".csv"
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="bg-gradient-to-tr from-[#16171e] to-indigo-950/20 border-zinc-800/80 shadow-md">
                                    <CardContent className="p-6">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-black block">Volume de Gestion Forfaitaire Inclus</span>
                                        <div className="text-3xl font-black text-white mt-1 block">
                                            {pipelineData.contractInclusionsVolume}
                                        </div>
                                        <span className="text-[10px] text-zinc-450 mt-1.5 block">Communications totales nettes (Exclut les Sinistres et le Technique)</span>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-tr from-[#16171e] to-emerald-950/20 border-zinc-800/80 shadow-md">
                                    <CardContent className="p-6">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-black block">Indice de Charge Réel du Forfait (PM Inclusions Load)</span>
                                        <div className="text-3xl font-black text-emerald-400 mt-1 block">
                                            {(pipelineData.contractInclusionsVolume / Math.max(1, unitCount)).toFixed(2)}
                                        </div>
                                        <span className="text-[10px] text-zinc-450 mt-1.5 block">Moyenne d'interactions incluses par porte / année cible</span>
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
                                <h4 className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Répartition des charges opérationnelles annuelles par porte :</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {DEPT_LIST.map(d => {
                                        const count = pipelineData.deptCounts[d] || 0
                                        const loadRate = (count / Math.max(1, unitCount)).toFixed(2)
                                        
                                        let borderCss = DEPT_COLORS[d] || "border-l-zinc-700 bg-zinc-900/10"
                                        if (d === "Gestion") {
                                            const pmLoadScore = count / Math.max(1, unitCount)
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
                                                        <span className="truncate max-w-[150px]">{emp.name}</span>
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
                                    Dégage l'évolution de la charge forfaitaire par rapport aux communications exclues du forfait (Technique & Sinistres).
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
