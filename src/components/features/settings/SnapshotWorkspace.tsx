// @ts-nocheck
'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { 
    Upload, 
    Download, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Clock, 
    FileSpreadsheet, 
    Check, 
    X,
    ChevronRight,
    Users,
    Layers,
    Calendar,
    ChevronDown,
    Building2,
    Lock
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    uploadSnapshotAction, 
    applySnapshotAction, 
    rejectSnapshotAction, 
    replaceSnapshotAction 
} from '@/actions/snapshots'
import { addManagerFromImportAction } from '@/actions/managers'

interface Snapshot {
    id: string
    name: string
    uploaded_at: string
    uploaded_by: string
    detected_count: number
    new_count: number
    modified_count: number
    inactive_count: number
    status: 'Draft' | 'Pending Review' | 'Applied' | 'Replaced' | 'Rejected'
    file_url: string
    file_name: string
    change_summary: any
    field_mappings: any
    processed_rows: any[]
    uploaded_by_profile?: { first_name: string, last_name: string }
    applied_by_profile?: { first_name: string, last_name: string }
}

interface Manager {
    id: string
    first_name: string
    last_name: string
    email: string | null
}

interface ExistingClient {
    id: string
    full_name: string
    company_name: string | null
    syndicate_code: string | null
    manager_id: string | null
}

export function SnapshotWorkspace({
    snapshots: initialSnapshots = [],
    managers = [],
    existingClients = [],
    currentUserRole = 'Agent'
}: {
    snapshots: Snapshot[]
    managers: Manager[]
    existingClients: ExistingClient[]
    currentUserRole: string
}) {
    const isAuthorized = currentUserRole === 'Master' || currentUserRole === 'Direction'

    const [snapshots, setSnapshots] = useState<Snapshot[]>(initialSnapshots)
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null)
    const [isPending, startTransition] = useTransition()
    
    // File upload states
    const [uploadStep, setUploadStep] = useState<'idle' | 'mapping'>('idle')
    const [uploadedFile, setUploadedFile] = useState<{ name: string, data: any[] } | null>(null)
    const [excelHeaders, setExcelHeaders] = useState<string[]>([])
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
    const [snapshotName, setSnapshotName] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Workspace states
    const [activeTab, setActiveTab] = useState<'New' | 'Modified' | 'Unchanged' | 'Missing' | 'Manual'>('Modified')
    const [searchQuery, setSearchQuery] = useState('')
    const [approvedRows, setApprovedRows] = useState<Record<string, boolean>>({})
    const [ignoredRows, setIgnoredRows] = useState<Record<string, boolean>>({})
    const [manualMatches, setManualMatches] = useState<Record<string, string>>({}) // tempId -> client ID

    const handleCreateManagerFromImport = async (name: string, active: boolean, tempId: string) => {
        try {
            const res = await addManagerFromImportAction(name, active)
            if (res.success) {
                toast.success(`Gestionnaire "${name}" créé avec succès!`)
                if (selectedSnapshot) {
                    const updatedRows = selectedSnapshot.processed_rows.map((r: any) => {
                        if (r.tempId === tempId) {
                            return {
                                ...r,
                                manager_id: res.managerId,
                                needsManualReview: false
                            }
                        }
                        return r
                    })
                    setSelectedSnapshot({
                        ...selectedSnapshot,
                        processed_rows: updatedRows
                    })
                }
            } else {
                toast.error("Erreur", { description: res.error })
            }
        } catch (err: any) {
            toast.error("Erreur", { description: err.message })
        }
    }

    // Target fields we map in Gustav SDC Snapshots
    const gustavFields = [
        { key: 'syndicate_code', label: "Code de Syndicat", required: true },
        { key: 'full_name', label: "Nom Complet", required: true },
        { key: 'email', label: "Alias (Email du syndicat)", required: false },
        { key: 'doors_count', label: "Nombre d'unités", required: false },
        { key: 'financial_year', label: "Année financière (YYYY-MM-DD)", required: false },
        { key: 'manager', label: "Gestionnaire (Name)", required: false },
        { key: 'operations_lead', label: "Chargé d'opération", required: false },
        { key: 'package_name', label: "Type de forfait", required: false },
        { key: 'address', label: "Adresse", required: false },
        { key: 'city', label: "Ville", required: false },
        { key: 'postal_code', label: "Code postal", required: false },
        { key: 'renewal_date', label: "Renewal date of the contract (Date de renouvellement)", required: false },
        { key: 'amount_of_meetings', label: "Amount of meetings", required: false },
        { key: 'package_pricing', label: "Package Pricing", required: false },
        { key: 'team', label: "Team (Code d'équipe)", required: false },
        { key: 'project_status', label: "Statut du projet (Projet actif/Projet quitté)", required: false },
        { key: 'departure_date', label: "Date de départ / Résiliation (Date of leaving)", required: false },
        // Fallbacks
        { key: 'id', label: "ID Client Gustav (Optionnel)", required: false },
        { key: 'ms_list_item_id', label: "ID d'élément MS List (Optionnel)", required: false },
    ]

    // 1. Excel Template Download
    const handleDownloadTemplate = () => {
        try {
            const wb = XLSX.utils.book_new()
            
            const wsData = [
                [
                    "Code de Syndicat", 
                    "Nom Complet", 
                    "Alias", 
                    "Nombre d'unités", 
                    "Année financière (YYYY-MM-DD)", 
                    "Gestionnaire (Name)", 
                    "Chargé d’opération",
                    "Type de forfait", 
                    "Adresse", 
                    "Ville", 
                    "Code postal", 
                    "Renewal date of the contract (Date de renouvellement)",
                    "Amount of meetings", 
                    "Package Pricing",
                    "Team",
                    "Statut de projet (Projet actif/Projet quitté)",
                    "Date de départ / Résiliation (Date of leaving)"
                ],
                [
                    "SDC-001", 
                    "Laucandrique Brossard", 
                    "brossard@laucandrique.com", 
                    "24", 
                    "2026-01-01", 
                    managers[0] ? `${managers[0].first_name} ${managers[0].last_name}` : "Jean Valjean", 
                    "Pierre Durand",
                    "Or", 
                    "123 rue des Fleurs", 
                    "Brossard", 
                    "J4Z 2B9", 
                    "2027-01-01",
                    "4", 
                    "350.00",
                    "G001",
                    "Projet actif",
                    ""
                ],
                [
                    "SDC-002", 
                    "Laucandrique Longueuil", 
                    "longueuil@laucandrique.com", 
                    "12", 
                    "2025-10-15", 
                    "", 
                    "",
                    "Argent", 
                    "456 boul. Taschereau", 
                    "Longueuil", 
                    "J4K 1A2", 
                    "2026-10-15",
                    "2", 
                    "220.00",
                    "G002",
                    "Projet quitté",
                    "2026-05-30"
                ]
            ]
            const ws = XLSX.utils.aoa_to_sheet(wsData)
            ws['!cols'] = wsData[0].map(h => ({ wch: h.length + 5 }))
            XLSX.utils.book_append_sheet(wb, ws, "Modèle d'Import SDC")
            
            // Add managers sheet as helper
            const wsMgrsData = [
                ["Nom Complet du Gestionnaire", "Courriel"],
                ...managers.map(m => [`${m.first_name} ${m.last_name}`, m.email || ''])
            ]
            const wsMgrs = XLSX.utils.aoa_to_sheet(wsMgrsData)
            wsMgrs['!cols'] = [{ wch: 30 }, { wch: 30 }]
            XLSX.utils.book_append_sheet(wb, wsMgrs, "Gestionnaires Actifs")

            XLSX.writeFile(wb, "GUSTAV_Import_SDC_Template.xlsx")
            toast.success("Modèle Excel généré et téléchargé.")
        } catch (err: any) {
            toast.error("Erreur lors de la génération du modèle.", { description: err.message })
        }
    }

    // 2. Local Excel Parsing & Auto Mapping
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const rawData = XLSX.utils.sheet_to_json(ws)

                if (rawData.length === 0) {
                    toast.error("Le fichier Excel ne contient aucune ligne de données.")
                    return
                }

                // Get headers
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
                const headers: string[] = []
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })]
                    if (cell && cell.v) headers.push(String(cell.v).trim())
                }

                setUploadedFile({ name: file.name, data: rawData })
                setExcelHeaders(headers)
                setSnapshotName(`Snapshot - ${file.name.replace(/\.[^/.]+$/, "")} - ${new Date().toLocaleDateString('fr-CA')}`)

                // Auto map headers
                const initialMap: Record<string, string> = {}
                gustavFields.forEach(f => {
                    const match = headers.find(h => {
                        const hLower = h.toLowerCase()
                        const fLower = f.label.toLowerCase()
                        const kLower = f.key.toLowerCase()
                        return hLower === fLower || hLower === kLower || hLower.includes(kLower) || fLower.includes(hLower)
                    })
                    if (match) initialMap[f.key] = match
                })
                setFieldMappings(initialMap)
                setUploadStep('mapping')
            } catch (err: any) {
                toast.error("Erreur de lecture du fichier Excel.", { description: err.message })
            }
        }
        reader.readAsBinaryString(file)
    }

    // 3. Submit Mapping & Process Draft
    const handleCreateSnapshotDraft = () => {
        if (!snapshotName.trim()) {
            toast.error("Veuillez saisir un nom pour ce snapshot.")
            return
        }

        // Validate required fields
        const missingRequired = gustavFields
            .filter(f => f.required && !fieldMappings[f.key])
            .map(f => f.label)
        
        if (missingRequired.length > 0) {
            toast.error(`Champs requis non mappés : ${missingRequired.join(', ')}`)
            return
        }

        startTransition(async () => {
            try {
                // To keep it simple, we upload snapshot with a local dummy URL 
                // since we parse rawData directly. In a production scenario, we could upload 
                // the file to storage first.
                const fakeFileUrl = `https://supabase.co/storage/snapshots/${Date.now()}_${uploadedFile!.name}`
                
                const res = await uploadSnapshotAction(
                    snapshotName,
                    uploadedFile!.name,
                    fakeFileUrl,
                    uploadedFile!.data,
                    fieldMappings
                )

                if (res.success) {
                    toast.success("Snapshot importé avec succès sous forme de brouillon.")
                    // Fetch fresh snapshots list
                    const { getSnapshotsAction } = await import('@/actions/snapshots')
                    const updated = await getSnapshotsAction()
                    setSnapshots(updated)
                    
                    // Select new snapshot
                    const newSnap = updated.find((s: any) => s.id === res.snapshotId)
                    if (newSnap) {
                        setSelectedSnapshot(newSnap)
                        resetWorkspaceStates(newSnap)
                    }

                    // Reset upload states
                    setUploadStep('idle')
                    setUploadedFile(null)
                } else {
                    toast.error("Erreur lors de la création du snapshot", { description: res.error })
                }
            } catch (e: any) {
                toast.error("Exception", { description: e.message })
            }
        })
    }

    // Reset workspace selection
    const resetWorkspaceStates = (snap: Snapshot) => {
        const approved: Record<string, boolean> = {}
        const ignored: Record<string, boolean> = {}
        const matches: Record<string, string> = {}

        snap.processed_rows?.forEach(r => {
            approved[r.tempId] = !r.needsManualReview
            ignored[r.tempId] = false
            if (r.matchedClientId) {
                matches[r.tempId] = r.matchedClientId
            }
        })

        setApprovedRows(approved)
        setIgnoredRows(ignored)
        setManualMatches(matches)
    }

    const handleSelectSnapshot = (snap: Snapshot) => {
        setSelectedSnapshot(snap)
        resetWorkspaceStates(snap)
    }

    // 4. Apply Snapshot Changes
    const handleApplySnapshot = () => {
        if (!selectedSnapshot) return

        const approvedIds = Object.keys(approvedRows).filter(id => approvedRows[id])
        const ignoredIds = Object.keys(ignoredRows).filter(id => ignoredRows[id])

        // Verify manual reviews
        const needsReviewPending = selectedSnapshot.processed_rows?.filter(r => 
            r.needsManualReview && !approvedRows[r.tempId] && !ignoredRows[r.tempId]
        ) || []

        if (needsReviewPending.length > 0) {
            toast.warning(`Il reste ${needsReviewPending.length} ligne(s) nécessitant une validation manuelle. Veuillez les accepter ou les ignorer.`)
            return
        }

        startTransition(async () => {
            try {
                const res = await applySnapshotAction(
                    selectedSnapshot.id,
                    approvedIds,
                    ignoredIds,
                    manualMatches
                )

                if (res.success) {
                    toast.success("Snapshot appliqué avec succès !", {
                        description: `Créés : ${res.summary.appliedNewCount} | Modifiés : ${res.summary.appliedModCount} | Inactifs/Départs : ${res.summary.appliedInactiveCount}`
                    })
                    
                    // Reload snapshots list
                    const { getSnapshotsAction } = await import('@/actions/snapshots')
                    const updated = await getSnapshotsAction()
                    setSnapshots(updated)
                    setSelectedSnapshot(updated.find((s: any) => s.id === selectedSnapshot.id) || null)
                } else {
                    toast.error("Erreur lors de l'application", { description: res.error })
                }
            } catch (e: any) {
                toast.error("Exception", { description: e.message })
            }
        })
    }

    // 5. Reject Snapshot
    const handleRejectSnapshot = () => {
        if (!selectedSnapshot) return

        startTransition(async () => {
            try {
                const res = await rejectSnapshotAction(selectedSnapshot.id)
                if (res.success) {
                    toast.success("Snapshot rejeté.")
                    const { getSnapshotsAction } = await import('@/actions/snapshots')
                    const updated = await getSnapshotsAction()
                    setSnapshots(updated)
                    setSelectedSnapshot(updated.find((s: any) => s.id === selectedSnapshot.id) || null)
                } else {
                    toast.error("Erreur lors du rejet", { description: res.error })
                }
            } catch (e: any) {
                toast.error("Exception", { description: e.message })
            }
        })
    }

    // 6. Replace Snapshot
    const handleReplaceSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedSnapshot) return
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const rawData = XLSX.utils.sheet_to_json(ws)

                if (rawData.length === 0) {
                    toast.error("Fichier vide.")
                    return
                }

                startTransition(async () => {
                    const repName = `Remplacement de (${selectedSnapshot.name}) - ${new Date().toLocaleDateString('fr-CA')}`
                    const fakeUrl = `https://supabase.co/storage/snapshots/${Date.now()}_${file.name}`
                    
                    const res = await replaceSnapshotAction(
                        selectedSnapshot.id,
                        repName,
                        file.name,
                        fakeUrl,
                        rawData,
                        selectedSnapshot.field_mappings
                    )

                    if (res.success) {
                        toast.success("Ancien snapshot marqué 'Remplacé' et nouveau snapshot créé en brouillon.")
                        const { getSnapshotsAction } = await import('@/actions/snapshots')
                        const updated = await getSnapshotsAction()
                        setSnapshots(updated)
                        setSelectedSnapshot(updated.find((s: any) => s.id === res.newSnapshotId) || null)
                    } else {
                        toast.error("Erreur lors du remplacement", { description: res.error })
                    }
                })
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        }
        reader.readAsBinaryString(file)
    }

    // Categorized Rows inside Selected Snapshot
    const categorizedRows = useMemo(() => {
        if (!selectedSnapshot) return { New: [], Modified: [], Unchanged: [], Missing: [], Manual: [] }
        
        const rows = selectedSnapshot.processed_rows || []
        const missing = selectedSnapshot.change_summary?.missing_clients || []

        const New = rows.filter(r => r.statusCategory === 'New' && !r.needsManualReview)
        const Modified = rows.filter(r => r.statusCategory === 'Modified' && !r.needsManualReview)
        const Unchanged = rows.filter(r => r.statusCategory === 'Unchanged' && !r.needsManualReview)
        const Manual = rows.filter(r => r.needsManualReview)

        // Filter by search query
        const filterFn = (r: any) => {
            if (!searchQuery) return true
            const q = searchQuery.toLowerCase()
            return (
                r.full_name?.toLowerCase().includes(q) ||
                r.legal_name?.toLowerCase().includes(q) ||
                r.syndicate_code?.toLowerCase().includes(q) ||
                r.manager_name?.toLowerCase().includes(q)
            )
        }

        return {
            New: New.filter(filterFn),
            Modified: Modified.filter(filterFn),
            Unchanged: Unchanged.filter(filterFn),
            Missing: missing.filter(m => {
                if (!searchQuery) return true
                const q = searchQuery.toLowerCase()
                return m.full_name?.toLowerCase().includes(q) || m.legal_name?.toLowerCase().includes(q)
            }),
            Manual: Manual.filter(filterFn)
        }
    }, [selectedSnapshot, searchQuery])

    return (
        <div className="space-y-6">
            {/* Visual Header / Access Warning */}
            {!isAuthorized && (
                <div className="p-3 bg-amber-950/20 border border-amber-905 border-amber-800 text-amber-300 rounded-lg flex items-center gap-2 text-xs">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span>Mode Lecture Seule : Seuls les rôles <strong>Master</strong> et <strong>Direction</strong> peuvent importer, valider ou remplacer les snapshots.</span>
                </div>
            )}

            {/* Timeline Visual & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Timeline / Status Summary */}
                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-400" />
                            Fil d'Ariane des Snapshots
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Suivi chronologique des versions et synchronisations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative pl-6 border-l-2 border-zinc-800 space-y-6">
                            {snapshots.slice(0, 3).map((snap, idx) => (
                                <div key={snap.id} className="relative">
                                    {/* Timeline dot */}
                                    <div className={cn(
                                        "absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-zinc-900",
                                        snap.status === 'Applied' && "bg-emerald-500",
                                        snap.status === 'Draft' && "bg-purple-500",
                                        snap.status === 'Rejected' && "bg-rose-500",
                                        snap.status === 'Replaced' && "bg-zinc-650 bg-zinc-500"
                                    )} />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-zinc-300 hover:text-purple-400 cursor-pointer" onClick={() => handleSelectSnapshot(snap)}>
                                                {snap.name}
                                            </span>
                                            <Badge className={cn(
                                                "text-[9px] py-0 px-1.5",
                                                snap.status === 'Applied' && "bg-emerald-950/40 text-emerald-400 border border-emerald-800",
                                                snap.status === 'Draft' && "bg-purple-950/40 text-purple-400 border border-purple-800",
                                                snap.status === 'Rejected' && "bg-rose-950/40 text-rose-400 border border-rose-800",
                                                snap.status === 'Replaced' && "bg-zinc-950 text-zinc-400 border border-zinc-850"
                                            )}>
                                                {snap.status}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-zinc-500">
                                            Importé le {new Date(snap.uploaded_at).toLocaleString('fr-CA')} par {snap.uploaded_by_profile ? `${snap.uploaded_by_profile.first_name} ${snap.uploaded_by_profile.last_name}` : 'Système'}
                                        </p>
                                        <div className="flex gap-4 text-[10px] text-zinc-400 pt-1">
                                            <span>Nouveaux: {snap.new_count}</span>
                                            <span>Modifiés: {snap.modified_count}</span>
                                            <span>Inactifs: {snap.inactive_count}</span>
                                            <span>Ignorés/Total: {snap.detected_count}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {snapshots.length === 0 && (
                                <p className="text-xs text-zinc-500 italic">Aucun snapshot dans l'historique.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Upload & Setup Cockpit */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <Upload className="h-5 w-5 text-purple-400" />
                            Cockpit de Synchronisation
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Chargez un fichier Excel d'exportation pour aligner le CRM.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {uploadStep === 'idle' ? (
                            <div className="space-y-3">
                                <div 
                                    className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center cursor-pointer bg-zinc-950/20 hover:bg-zinc-950/40 transition-all"
                                    onClick={() => isAuthorized && fileInputRef.current?.click()}
                                >
                                    <FileSpreadsheet className="h-10 w-10 text-zinc-500 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-zinc-300">
                                        {isAuthorized ? "Cliquez pour charger l'export Excel" : "Autorisation requise pour charger"}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 mt-1">Format supporté : .xlsx, .xls</p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        accept=".xlsx,.xls" 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                        disabled={!isAuthorized}
                                    />
                                </div>
                                <Button 
                                    onClick={handleDownloadTemplate} 
                                    variant="outline" 
                                    className="w-full text-xs border-zinc-800 text-zinc-300 bg-zinc-950/20 hover:bg-zinc-950/50 hover:text-white"
                                >
                                    <Download className="h-3.5 w-3.5 mr-2" />
                                    Télécharger le modèle vierge
                                </Button>
                            </div>
                        ) : (
                            // STEP MAPPING
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300 text-xs font-semibold">Nom de ce snapshot</Label>
                                    <Input 
                                        value={snapshotName} 
                                        onChange={e => setSnapshotName(e.target.value)} 
                                        className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
                                    />
                                </div>

                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    <Label className="text-zinc-300 text-xs font-semibold">Association des colonnes</Label>
                                    {gustavFields.map(f => (
                                        <div key={f.key} className="flex flex-col gap-1 p-2 bg-zinc-950 rounded-lg border border-zinc-850">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-medium text-zinc-300">
                                                    {f.label} {f.required && <span className="text-purple-400">*</span>}
                                                </span>
                                            </div>
                                            <select 
                                                value={fieldMappings[f.key] || ''} 
                                                onChange={e => setFieldMappings(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                className="w-full h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-650"
                                            >
                                                <option value="" className="text-zinc-500">Non associé</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => setUploadStep('idle')} 
                                        variant="outline" 
                                        className="flex-1 text-xs border-zinc-800 text-zinc-300"
                                    >
                                        Annuler
                                    </Button>
                                    <Button 
                                        onClick={handleCreateSnapshotDraft} 
                                        disabled={isPending}
                                        className="flex-1 text-xs bg-purple-600 text-white hover:bg-purple-700 font-semibold"
                                    >
                                        {isPending ? 'Analyse...' : 'Lancer l\'analyse'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* List & Selected Workspace Detail Screen */}
            {selectedSnapshot ? (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-850">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-zinc-100">{selectedSnapshot.name}</h3>
                                    <Badge className={cn(
                                        "text-xs px-2 py-0.5",
                                        selectedSnapshot.status === 'Applied' && "bg-emerald-950/40 text-emerald-400 border border-emerald-800",
                                        selectedSnapshot.status === 'Draft' && "bg-purple-950/40 text-purple-400 border border-purple-800",
                                        selectedSnapshot.status === 'Rejected' && "bg-rose-950/40 text-rose-400 border border-rose-800",
                                        selectedSnapshot.status === 'Replaced' && "bg-zinc-950 text-zinc-400 border border-zinc-850"
                                    )}>
                                        {selectedSnapshot.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Fichier : {selectedSnapshot.file_name} | Importé par : {selectedSnapshot.uploaded_by_profile ? `${selectedSnapshot.uploaded_by_profile.first_name} ${selectedSnapshot.uploaded_by_profile.last_name}` : 'N/A'}
                                </p>
                            </div>

                            {/* Control Bar */}
                            {isAuthorized && (selectedSnapshot.status === 'Draft' || selectedSnapshot.status === 'Pending Review') && (
                                <div className="flex items-center gap-2">
                                    <Button 
                                        onClick={handleRejectSnapshot} 
                                        disabled={isPending}
                                        variant="outline" 
                                        className="text-xs text-rose-450 hover:bg-rose-950/20 text-rose-400 border-zinc-800"
                                    >
                                        <X className="h-4 w-4 mr-1.5" />
                                        Rejeter
                                    </Button>
                                    <Button 
                                        onClick={handleApplySnapshot} 
                                        disabled={isPending}
                                        className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                                    >
                                        <Check className="h-4 w-4 mr-1.5" />
                                        Appliquer les changements
                                    </Button>
                                </div>
                            )}

                            {/* Applied Replaced Cockpit */}
                            {isAuthorized && selectedSnapshot.status === 'Applied' && (
                                <div className="flex items-center gap-2 bg-zinc-950/40 p-2 rounded-lg border border-zinc-850">
                                    <span className="text-[10px] text-zinc-500 font-medium">Applied. Charger remplacement :</span>
                                    <Button 
                                        variant="outline" 
                                        className="text-xs h-7 border-zinc-800 text-zinc-300"
                                        onClick={() => document.getElementById('replace-file-picker')?.click()}
                                    >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Remplacer snapshot
                                    </Button>
                                    <input 
                                        type="file" 
                                        id="replace-file-picker" 
                                        accept=".xlsx,.xls" 
                                        onChange={handleReplaceSnapshot} 
                                        className="hidden" 
                                    />
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    
                    {/* Category tabs */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b border-zinc-850 gap-4 bg-zinc-950/10">
                        <div className="flex flex-wrap gap-1">
                            {[
                                { key: 'Modified', label: 'Modifiés', count: categorizedRows.Modified.length, color: 'text-amber-400 bg-amber-950/30' },
                                { key: 'New', label: 'Nouveaux', count: categorizedRows.New.length, color: 'text-emerald-400 bg-emerald-950/30' },
                                { key: 'Manual', label: 'À Valider (Review)', count: categorizedRows.Manual.length, color: 'text-purple-400 bg-purple-950/30' },
                                { key: 'Missing', label: 'Absents (CRM)', count: categorizedRows.Missing.length, color: 'text-rose-450 text-rose-400 bg-rose-950/30' },
                                { key: 'Unchanged', label: 'Inchangés', count: categorizedRows.Unchanged.length, color: 'text-zinc-400 bg-zinc-950' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border border-transparent",
                                        activeTab === tab.key 
                                            ? "bg-zinc-800 text-zinc-150 border-zinc-700 shadow-sm" 
                                            : "text-zinc-400 hover:text-zinc-200"
                                    )}
                                >
                                    {tab.label}
                                    <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full font-bold", tab.color)}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <Input 
                            placeholder="Rechercher un syndicat..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-xs w-full sm:w-60 h-8 text-zinc-100"
                        />
                    </div>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-zinc-950/30 border-b border-zinc-850 text-zinc-400 font-semibold">
                                        {(selectedSnapshot.status === 'Draft' || selectedSnapshot.status === 'Pending Review') && activeTab !== 'Missing' && (
                                            <th className="p-3 w-16 text-center">Choix</th>
                                        )}
                                        <th className="p-3">Code / SDC</th>
                                        <th className="p-3">Nom complet & Légal</th>
                                        <th className="p-3">Différences / Détails</th>
                                        {activeTab === 'Manual' && <th className="p-3">Résolution manuelle</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-850">
                                    
                                    {/* Categorized listing */}
                                    {activeTab === 'Missing' ? (
                                        categorizedRows.Missing.map((client: any) => (
                                            <tr key={client.id} className="hover:bg-zinc-950/20 text-zinc-300">
                                                <td className="p-3 font-mono font-semibold text-rose-400">{client.syndicate_code || 'N/A'}</td>
                                                <td className="p-3">
                                                    <p className="font-semibold text-zinc-200">{client.full_name}</p>
                                                    <p className="text-[10px] text-zinc-500">{client.legal_name || 'N/A'}</p>
                                                </td>
                                                <td className="p-3 text-zinc-400">
                                                    <span className="inline-flex items-center gap-1.5 text-rose-400 text-[10px] bg-rose-950/15 border border-rose-900/40 px-2 py-0.5 rounded">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Absent du dernier snapshot (Existe toujours en base de données)
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        categorizedRows[activeTab].map((row: any) => {
                                            const isRowApproved = approvedRows[row.tempId] || false
                                            const isRowIgnored = ignoredRows[row.tempId] || false

                                            return (
                                                <tr key={row.tempId} className={cn(
                                                    "hover:bg-zinc-950/20",
                                                    isRowIgnored && "opacity-40",
                                                    isRowApproved && "bg-emerald-950/5 hover:bg-emerald-950/10"
                                                )}>
                                                    
                                                    {/* Row checkboxes */}
                                                    {(selectedSnapshot.status === 'Draft' || selectedSnapshot.status === 'Pending Review') && (
                                                        <td className="p-3 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setApprovedRows(prev => ({ ...prev, [row.tempId]: !prev[row.tempId] }))
                                                                        setIgnoredRows(prev => ({ ...prev, [row.tempId]: false }))
                                                                    }}
                                                                    className={cn(
                                                                        "h-6 w-6 rounded border flex items-center justify-center transition-all",
                                                                        isRowApproved 
                                                                            ? "bg-emerald-600 border-emerald-500 text-white" 
                                                                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                                                    )}
                                                                    title="Accepter ce changement"
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setIgnoredRows(prev => ({ ...prev, [row.tempId]: !prev[row.tempId] }))
                                                                        setApprovedRows(prev => ({ ...prev, [row.tempId]: false }))
                                                                    }}
                                                                    className={cn(
                                                                        "h-6 w-6 rounded border flex items-center justify-center transition-all",
                                                                        isRowIgnored 
                                                                            ? "bg-rose-900 border-rose-800 text-white" 
                                                                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                                                    )}
                                                                    title="Ignorer cette ligne"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}

                                                    {/* Code / SDC */}
                                                    <td className="p-3 font-mono font-semibold text-zinc-300">
                                                        {row.syndicate_code || 'N/A'}
                                                    </td>

                                                    {/* Name & Legal */}
                                                    <td className="p-3">
                                                        <p className="font-semibold text-zinc-200">{row.full_name}</p>
                                                        <p className="text-[10px] text-zinc-500">{row.legal_name || 'N/A'}</p>
                                                    </td>

                                                    {/* Diffs view */}
                                                    <td className="p-3 space-y-1 max-w-[400px]">
                                                        {Object.keys(row.diffs || {}).length > 0 ? (
                                                            Object.entries(row.diffs).map(([field, diff]: any) => (
                                                                <div key={field} className="p-1 bg-zinc-950 rounded border border-zinc-850 flex flex-col sm:flex-row sm:items-center gap-1.5 text-[10px]">
                                                                    <span className="font-semibold text-zinc-400 capitalize w-24 shrink-0">
                                                                        {field === 'package_name' ? 'Forfait' : field === 'monthly_fee' ? 'Marge' : field === 'doors_count' ? 'Portes' : field === 'manager_id' ? 'Gestionnaire' : field} :
                                                                    </span>
                                                                    <span className="text-rose-400 line-through truncate max-w-[120px]">{diff.db}</span>
                                                                    <ChevronRight className="h-3 w-3 text-zinc-600 hidden sm:inline" />
                                                                    <span className="text-emerald-400 font-medium truncate max-w-[120px]">{diff.excel}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-zinc-500 italic text-[10px]">Aucune divergence de champ détectée.</span>
                                                        )}

                                                        {row.status === 'inactive' && (
                                                            <div className="mt-1">
                                                                <Badge className="text-[9px] bg-rose-950/20 text-rose-400 border border-rose-900/40">
                                                                    Lost Syndicate (Fermera le contrat)
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Manual Match Resolve */}
                                                    {activeTab === 'Manual' && (
                                                        <td className="p-3">
                                                            <div className="space-y-1.5">
                                                                <p className="text-[10px] text-zinc-400 italic">
                                                                    {row.matchReason || 'Non identifié.'}
                                                                </p>
                                                                {(selectedSnapshot.status === 'Draft' || selectedSnapshot.status === 'Pending Review') && (
                                                                    <>
                                                                        <select
                                                                            value={manualMatches[row.tempId] || ''}
                                                                            onChange={e => setManualMatches(prev => ({ ...prev, [row.tempId]: e.target.value }))}
                                                                            className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-[10px] text-zinc-200"
                                                                        >
                                                                            <option value="">-- Créer un nouveau Client --</option>
                                                                            {existingClients.map(c => (
                                                                                <option key={c.id} value={c.id}>
                                                                                    [{c.syndicate_code || 'N/A'}] {c.company_name || c.full_name}
                                                                                </option>
                                                                            ))}
                                                                        </select>

                                                                        {row.manager_name && !row.manager_id && (
                                                                            <div className="mt-2 p-2 rounded-lg border border-purple-900/60 bg-purple-950/20 space-y-1.5">
                                                                                <p className="text-[10px] text-purple-300 font-medium">
                                                                                    Gestionnaire non trouvé : <span className="font-bold">"{row.manager_name}"</span>
                                                                                </p>
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                                                                        <input 
                                                                                            type="checkbox" 
                                                                                            id={`mgr-active-${row.tempId}`} 
                                                                                            defaultChecked 
                                                                                            className="rounded border-zinc-800 bg-zinc-950 text-purple-600 h-3 w-3" 
                                                                                        />
                                                                                        <span className="text-[9px] text-zinc-400">Toujours actif ?</span>
                                                                                    </label>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const checkbox = document.getElementById(`mgr-active-${row.tempId}`) as HTMLInputElement;
                                                                                            const isActive = checkbox ? checkbox.checked : true;
                                                                                            handleCreateManagerFromImport(row.manager_name, isActive, row.tempId);
                                                                                        }}
                                                                                        className="text-[9px] px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
                                                                                    >
                                                                                        Ajouter
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })
                                    )}

                                    {/* Empty state */}
                                    {categorizedRows[activeTab].length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-zinc-500 italic">
                                                Aucune ligne trouvée dans cette catégorie.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-10 border border-zinc-800 bg-zinc-950/10 rounded-xl text-center text-zinc-400">
                    <FileSpreadsheet className="h-12 w-12 text-zinc-700 mx-auto mb-2" />
                    <h4 className="text-zinc-200 font-semibold">Aucun Snapshot Sélectionné</h4>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                        Sélectionnez un snapshot dans le fil d'Ariane pour examiner les détails ou effectuez un nouvel import Excel ci-dessus.
                    </p>
                </div>
            )}
        </div>
    )
}
