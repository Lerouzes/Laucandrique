'use client'

import { useState, useRef, useTransition, useMemo } from 'react'
import { 
    Upload, 
    Download, 
    Trash2, 
    AlertCircle, 
    CheckCircle2, 
    FileSpreadsheet,
    Check,
    X,
    FileCheck,
    Users,
    Trash,
    Sparkles
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog'
import { confirmBulkImportAction } from '@/actions/clients'
import { Input } from '@/components/ui/input'

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
    manager: string | null // SDC #
}

interface ImportRow {
    temp_id: string
    id?: string // Match existing client id if update
    manager: string // SDC # (legacy column)
    full_name: string // SDC # (database full_name column)
    company_name: string // SDC Name / Nom complet (database company_name column)
    address: string
    email: string
    phone: string
    city: string
    province: string
    postal_code: string
    manager_name_ref: string // Typed manager name
    manager_id: string | null // Resolved manager UUID
    import_action: 'create' | 'update' | 'skip'
    
    // New fields
    doors_count: number | null
    package_name: string | null
    monthly_fee: number | null
    financial_year: string | null
    status: 'active' | 'inactive'
    operations_lead: string | null
}

export function ClientExcelImport({ 
    managers = [], 
    existingClients = [] 
}: { 
    managers: Manager[]
    existingClients: ExistingClient[]
}) {
    const safeManagers = managers || []
    const safeExistingClients = existingClients || []

    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
    
    // Import Rows & Result States
    const [rows, setRows] = useState<ImportRow[]>([])
    const [importResult, setImportResult] = useState<{
        total: number
        imported: number
        updated: number
        skipped: number
        failed: number
    } | null>(null)

    // 1. GENERATE & DOWNLOAD CLEAN EXCEL TEMPLATE
    const handleDownloadTemplate = () => {
        try {
            const wb = XLSX.utils.book_new()
            
            // Sheet 1: Main template data
            const wsData = [
                ["SDC #", "Nom complet", "Address", "Email", "Phone", "City", "Province", "Postal Code", "Manager", "Nombre de portes", "Forfait", "Frais mensuels", "Exercice financier", "Statut"],
                ["SDC-001", "Laucandrique Brossard", "123 Boulevard Taschereau", "brossard@laucandrique.com", "450-123-4567", "Brossard", "QC", "J4Z 2G8", safeManagers[0] ? `${safeManagers[0].first_name} ${safeManagers[0].last_name}` : "", 24, "Or", "350.00", "2026-01-01", "Actif"],
                ["SDC-002", "Laucandrique Longueuil", "456 Chemin de Chambly", "longueuil@laucandrique.com", "450-987-6543", "Longueuil", "QC", "J4H 3M4", "", "", "Argent", "250.00", "", "Inactif"]
            ]
            
            const ws = XLSX.utils.aoa_to_sheet(wsData)
            
            // Freeze top row for modern view
            ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
            
            // Set beautiful columns width
            const maxLen = wsData[0].map((_, colIdx) => Math.max(...wsData.map(row => String(row[colIdx] || '').length)))
            ws['!cols'] = maxLen.map(w => ({ wch: w + 5 }))
            
            // Sheet 2: Manager list reference
            const managersSheetData = [
                ["Nom du Gestionnaire (à copier/coller)", "Courriel"],
                ...safeManagers.map(m => [`${m.first_name} ${m.last_name}`, m.email || ''])
            ]
            const wsManagers = XLSX.utils.aoa_to_sheet(managersSheetData)
            wsManagers['!cols'] = [{ wch: 45 }, { wch: 30 }]
            
            XLSX.utils.book_append_sheet(wb, ws, "Clients à Importer")
            XLSX.utils.book_append_sheet(wb, wsManagers, "Gestionnaires Actifs")
            
            XLSX.writeFile(wb, "GUSTAV_Template_Clients.xlsx")
            toast.success("Modèle Excel téléchargé avec succès.")
        } catch (err: any) {
            toast.error("Erreur lors de la génération du modèle", { description: err.message })
        }
    }

    // Parse Excel Serial Date/Strings safely
    const parseExcelDate = (value: any): string => {
        if (!value) return ''
        if (typeof value === 'number') {
            // Excel serial date to JS Date
            const date = new Date(Math.round((value - 25569) * 86400 * 1000))
            if (isNaN(date.getTime())) return ''
            const y = date.getUTCFullYear()
            const m = String(date.getUTCMonth() + 1).padStart(2, '0')
            const d = String(date.getUTCDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        }
        const str = String(value).trim()
        // Match YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
        const yyyymmdd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
        if (yyyymmdd) {
            return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`
        }
        const ddmmyyyy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
        if (ddmmyyyy) {
            return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`
        }
        
        // Try parsing with new Date() as a fallback
        const parsedDate = new Date(str)
        if (!isNaN(parsedDate.getTime())) {
            const y = parsedDate.getFullYear()
            const m = String(parsedDate.getMonth() + 1).padStart(2, '0')
            const d = String(parsedDate.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        }
        
        return ''
    }

    // Parse currency values safely
    const parseAmount = (val: any): number => {
        if (val === undefined || val === null) return 0
        const clean = String(val)
            .replace('$', '')
            .replace(/\s/g, '') // remove spaces
            .replace(/,/g, '.') // replace comma with dot
        const num = parseFloat(clean)
        return isNaN(num) ? 0 : num
    }

    // 2. PARSE EXCEL FILE
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
                    toast.error("Fichier vide ou format incorrect.")
                    return
                }

                // Format & Map data to rows
                const parsed: ImportRow[] = rawData.map((row: any, index) => {
                    const getFuzzyVal = (keywords: string[], fallback = '') => {
                        const matchedKey = Object.keys(row).find(k => {
                            const kl = k.toLowerCase().trim()
                            return keywords.some(kw => kl.includes(kw.toLowerCase()))
                        })
                        return matchedKey ? String(row[matchedKey] || '').trim() : fallback
                    }

                    const sdcNum = getFuzzyVal(['sdc #', 'sdc_#', 'sdc', 'reference', 'référence', 'code'], '').trim()
                    const sdcName = getFuzzyVal(['sdc name', 'sdc_name', 'nom complet', 'full_name', 'company_name', 'nom complet du syndicat', 'nom_complet', 'nom'], '').trim()
                    
                    // Match Manager fuzzy/exact by name
                    const managerNameRef = getFuzzyVal(['manager', 'gestionnaire', 'manager_name'], '').trim()
                    let matchedManagerId: string | null = null
                    if (managerNameRef) {
                        const match = safeManagers.find(
                            m => `${m.first_name} ${m.last_name}`.toLowerCase() === managerNameRef.toLowerCase()
                        )
                        if (match) matchedManagerId = match.id
                    }

                    // Check for existing duplicate in client table matching SDC # (column `full_name` or `manager`)
                    const duplicateMatch = sdcNum 
                        ? safeExistingClients.find(ec => 
                            ec.full_name?.toLowerCase() === sdcNum.toLowerCase() || 
                            ec.manager?.toLowerCase() === sdcNum.toLowerCase()
                          )
                        : null

                    const rawDoors = getFuzzyVal(['porte', 'portes', 'doors', 'unités', 'unites', 'doors_count'])
                    let doorsCount: number | null = null
                    if (rawDoors) {
                        const parsedDoors = parseInt(rawDoors.replace(/\D/g, ''), 10)
                        doorsCount = isNaN(parsedDoors) ? null : parsedDoors
                    }

                    let rawPackage = getFuzzyVal(['forfait', 'package', 'type de forfait']).trim()
                    if (rawPackage.toLowerCase().includes('platine')) {
                        rawPackage = 'Platinum'
                    } else if (rawPackage.toLowerCase() === 'argent +' || rawPackage.toLowerCase() === 'argent+') {
                        rawPackage = 'Argent+'
                    }
                    const validPackages = ['Bronze', 'Argent', 'Argent+', 'Or', 'Platinum']
                    const packageName = validPackages.find(p => p.toLowerCase() === rawPackage.toLowerCase()) || null

                    const rawFee = getFuzzyVal(['frais mensuels', 'monthly_fee', 'pricing', 'monthly pricing', 'package pricing', 'package_pricing', 'honoraires'])
                    const monthlyFee = rawFee ? parseAmount(rawFee) : null

                    const rawYear = getFuzzyVal(['exercice', 'financial_year', 'financial year', 'année financière', 'annee financiere'])
                    const financialYear = rawYear ? parseExcelDate(rawYear) : null

                    const rawStatusStr = getFuzzyVal(['statut', 'status', 'status_contract', 'statut de projet', 'statut de contrat']).trim().toLowerCase()
                    let status: 'active' | 'inactive' = 'active'
                    if (rawStatusStr.includes('inactiv') || rawStatusStr === 'inactive' || rawStatusStr === 'inactif' || rawStatusStr.includes('quitt')) {
                        status = 'inactive'
                    } else if (rawStatusStr.includes('activ') || rawStatusStr === 'active' || rawStatusStr === 'actif') {
                        status = 'active'
                    }

                    const operationsLeadRaw = getFuzzyVal([
                        'chargé d’opération', 'chargé d\'opération', 'charge d\'operation',
                        'chargé d’opérations', 'chargé d\'opérations', 'charge d\'operations', 
                        'charge d’operation', 'operations_lead', 'operations lead', 'chargé d’op', 'chargé d\'op'
                    ]).trim()

                    return {
                        temp_id: `row-${index}-${Date.now()}`,
                        id: duplicateMatch?.id,
                        manager: sdcNum,
                        full_name: sdcNum,
                        company_name: sdcName,
                        address: getFuzzyVal(['adresse', 'address']),
                        email: getFuzzyVal(['email', 'courriel', 'alias']),
                        phone: getFuzzyVal(['phone', 'téléphone', 'telephone']),
                        city: getFuzzyVal(['city', 'ville']),
                        province: getFuzzyVal(['province']),
                        postal_code: getFuzzyVal(['postal code', 'code postal', 'postal_code', 'zip']),
                        manager_name_ref: managerNameRef,
                        manager_id: matchedManagerId,
                        import_action: duplicateMatch ? 'update' : 'create',
                        
                        doors_count: doorsCount,
                        package_name: packageName,
                        monthly_fee: monthlyFee,
                        financial_year: financialYear,
                        status: status,
                        operations_lead: operationsLeadRaw || null
                    }
                })

                setRows(parsed)
                setStep('preview')
                setIsOpen(true)
            } catch (err: any) {
                toast.error("Erreur lors de la lecture du fichier", { description: err.message })
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
        reader.readAsBinaryString(file)
    }

    // 3. ROW VALIDATIONS (Computed dynamically)
    const validatedRows = useMemo(() => {
        return rows.map(row => {
            const errors: string[] = []
            
            // Required: SDC # (full_name)
            if (!row.full_name) {
                errors.push("Le SDC # est obligatoire.")
            }

            // Required: Nom complet (company_name)
            if (!row.company_name) {
                errors.push("Le nom complet est obligatoire.")
            }

            // Optional: Email check format
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push("Le format du courriel est invalide.")
            }

            // Warning: SDC # duplicated
            const isDuplicate = row.full_name 
                ? safeExistingClients.some(ec => (ec.full_name?.toLowerCase() === row.full_name.toLowerCase() || ec.manager?.toLowerCase() === row.full_name.toLowerCase()) && ec.id !== row.id)
                : false
            
            const matchedClient = row.full_name
                ? safeExistingClients.find(ec => ec.full_name?.toLowerCase() === row.full_name.toLowerCase() || ec.manager?.toLowerCase() === row.full_name.toLowerCase())
                : null

            return {
                ...row,
                errors,
                is_duplicate: !!matchedClient,
                duplicate_matched_name: matchedClient?.company_name || matchedClient?.full_name || ''
            }
        })
    }, [rows, safeExistingClients])

    const totalErrorsCount = useMemo(() => {
        return validatedRows.reduce((acc, row) => acc + row.errors.length, 0)
    }, [validatedRows])

    // 4. INLINE EDIT HANDLERS
    const handleUpdateRowField = (tempId: string, field: keyof ImportRow, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.temp_id !== tempId) return r
            
            const updated = { ...r, [field]: value }
            
            // If manager_id changes, reset name ref
            if (field === 'manager_id') {
                const match = safeManagers.find(m => m.id === value)
                updated.manager_name_ref = match ? `${match.first_name} ${match.last_name}` : ''
            }

            // Recalculate duplicate on SDC # update
            if (field === 'full_name') {
                const sdcValue = String(value).trim()
                updated.manager = sdcValue
                const dup = safeExistingClients.find(ec => 
                    ec.full_name?.toLowerCase() === sdcValue.toLowerCase() ||
                    ec.manager?.toLowerCase() === sdcValue.toLowerCase()
                )
                updated.id = dup?.id
                updated.import_action = dup ? 'update' : 'create'
            }

            return updated
        }))
    }

    const handleRemoveRow = (tempId: string) => {
        setRows(prev => prev.filter(r => r.temp_id !== tempId))
        toast.info("Ligne supprimée de la liste d'importation.")
    }

    // 5. BULK ACTIONS
    const handleBulkAction = (action: 'create' | 'update' | 'skip') => {
        setRows(prev => prev.map(r => {
            // Only update duplicates if trying to set 'update'
            if (action === 'update') {
                const isDup = r.full_name && safeExistingClients.some(ec => 
                    ec.full_name?.toLowerCase() === r.full_name.toLowerCase() ||
                    ec.manager?.toLowerCase() === r.full_name.toLowerCase()
                )
                return { ...r, import_action: isDup ? 'update' : r.import_action }
            }
            return { ...r, import_action: action }
        }))
        toast.success("Action groupée appliquée à toutes les lignes.")
    }

    const handleClearInvalid = () => {
        const validRows = validatedRows.filter(r => r.errors.length === 0)
        const removedCount = rows.length - validRows.length
        setRows(validRows)
        toast.success(`${removedCount} ligne(s) non valide(s) supprimée(s).`)
    }

    // 6. CONFIRM SAVE TO CRM
    const handleConfirmImport = async () => {
        if (totalErrorsCount > 0) {
            toast.error("Veuillez corriger toutes les erreurs avant de confirmer l'importation.")
            return
        }

        startTransition(async () => {
            try {
                // Send mapped data to server action
                const response = await confirmBulkImportAction(rows)
                if (response.success && response.summary) {
                    setImportResult(response.summary)
                    setStep('result')
                    toast.success("Importation terminée avec succès!")
                } else {
                    toast.error("Échec de l'importation en base de données.", { description: response.error })
                }
            } catch (err: any) {
                toast.error("Erreur lors de l'importation", { description: err.message })
            }
        })
    }

    const handleClose = () => {
        setIsOpen(false)
        setRows([])
        setImportResult(null)
        setStep('upload')
    }

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />
            
            {/* Quick Trigger Buttons */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    type="button"
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 flex items-center gap-1.5 h-10 font-semibold rounded-xl"
                >
                    <Download className="h-4 w-4 text-cyan-400" />
                    Télécharger Modèle
                </Button>
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1.5 h-10 font-semibold rounded-xl"
                >
                    <Upload className="h-4 w-4" />
                    Importer Excel
                </Button>
            </div>

            {/* HIGH-FIDELITY IMPORT WORKSPACE DIALOG */}
            <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
                <DialogContent className="max-w-[95vw] lg:max-w-6xl bg-zinc-900 border-zinc-800 p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/40 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/30">
                                <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-zinc-100 text-lg flex items-center gap-2">
                                    Importation de Clients Professionnels
                                    <Badge variant="secondary" className="bg-zinc-850 text-zinc-300 text-xxs font-normal border border-zinc-800">
                                        Étape {step === 'preview' ? '2 sur 3 : Révision' : '3 sur 3 : Terminé'}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400 text-xs mt-0.5">
                                    {step === 'preview' 
                                        ? "Révisez, éditez et corrigez les données ci-dessous. Les doublons et les gestionnaires sont validés automatiquement."
                                        : "Résumé des opérations appliquées à votre base de clients."
                                    }
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto min-h-[250px] p-6 w-full min-w-0">
                        {step === 'preview' && (
                            <div className="space-y-6 w-full min-w-0">
                                
                                {/* Info / Bulk actions row */}
                                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-zinc-200">Lignes chargées : {rows.length}</p>
                                        <p className="text-xxs text-zinc-400 flex items-center gap-1.5">
                                            {totalErrorsCount > 0 ? (
                                                <>
                                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                    <span className="text-rose-400 font-semibold">{totalErrorsCount} erreur(s) de validation détectée(s)</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                                                    <span className="text-cyan-400 font-semibold">Toutes les données sont prêtes et valides !</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    
                                    {/* Bulk Actions buttons */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleBulkAction('create')} 
                                            className="text-xxs h-8 bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
                                            type="button"
                                        >
                                            Marquer Tout à Créer
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleBulkAction('update')} 
                                            className="text-xxs h-8 bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
                                            type="button"
                                        >
                                            Marquer Doublons à Mettre à Jour
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleBulkAction('skip')} 
                                            className="text-xxs h-8 bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
                                            type="button"
                                        >
                                            Tout Ignorer
                                        </Button>
                                        {totalErrorsCount > 0 && (
                                            <Button 
                                                variant="destructive" 
                                                onClick={handleClearInvalid} 
                                                className="text-xxs h-8 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-800"
                                                type="button"
                                            >
                                                Supprimer Lignes Invalides
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Preview Grid Table */}
                                <div className="rounded-xl border border-zinc-850 overflow-hidden bg-zinc-950/20 w-full min-w-0">
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-left border-collapse min-w-[1450px]">
                                            <thead>
                                                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xxs font-bold uppercase tracking-wider">
                                                    <th className="p-3 w-[110px]">SDC #</th>
                                                    <th className="p-3 w-[150px]">Nom SDC *</th>
                                                    <th className="p-3 w-[180px]">Adresse</th>
                                                    <th className="p-3 w-[140px]">Courriel</th>
                                                    <th className="p-3 w-[140px]">Gestionnaire</th>
                                                    <th className="p-3 w-[80px]">Portes</th>
                                                    <th className="p-3 w-[110px]">Forfait</th>
                                                    <th className="p-3 w-[90px]">Frais ($)</th>
                                                    <th className="p-3 w-[110px]">Ex. Financier</th>
                                                    <th className="p-3 w-[90px]">Statut</th>
                                                    <th className="p-3 w-[120px]">Action d'Import</th>
                                                    <th className="p-3 w-[50px] text-center">Suppr.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-850 text-xs text-zinc-300">
                                                {validatedRows.map((row) => {
                                                    const hasError = row.errors.length > 0
                                                    
                                                    return (
                                                        <tr 
                                                            key={row.temp_id} 
                                                            className={`transition-colors hover:bg-zinc-900/40 ${
                                                                hasError 
                                                                    ? 'bg-rose-950/10 hover:bg-rose-950/20' 
                                                                    : row.is_duplicate 
                                                                        ? 'bg-amber-950/5 hover:bg-amber-950/10' 
                                                                        : ''
                                                            }`}
                                                        >
                                                            {/* SDC # */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.full_name} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'full_name', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        !row.full_name ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                                {!row.full_name && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Le SDC # est requis.</span>
                                                                )}
                                                                {row.is_duplicate && (
                                                                    <p className="text-xxs text-amber-500 font-medium mt-1">
                                                                        Double: '{row.duplicate_matched_name}'
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* SDC Name (Required) */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.company_name} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'company_name', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        !row.company_name ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                                {!row.company_name && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Le nom complet est requis.</span>
                                                                )}
                                                            </td>

                                                            {/* Address */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.address} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'address', e.target.value)}
                                                                    className="bg-zinc-950/60 border-zinc-850 h-8 text-xs focus-visible:ring-zinc-800"
                                                                />
                                                            </td>

                                                            {/* Email */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.email} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'email', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) 
                                                                            ? 'border-rose-700 focus-visible:ring-rose-800' 
                                                                            : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                                {row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Format courriel invalide.</span>
                                                                )}
                                                            </td>

                                                            {/* Manager Dropdown */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.manager_id || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'manager_id', e.target.value || null)}
                                                                    className="w-full h-8 rounded-lg border border-zinc-850 bg-zinc-950 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-850"
                                                                >
                                                                    <option value="" className="text-zinc-550 bg-zinc-900">Non assigné</option>
                                                                    {safeManagers.map((m) => (
                                                                        <option key={m.id} value={m.id} className="text-zinc-100 bg-zinc-900">
                                                                            {m.first_name} {m.last_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {row.manager_name_ref && !row.manager_id && (
                                                                    <p className="text-[10px] text-amber-500 mt-0.5">
                                                                        Ref: "{row.manager_name_ref}"
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* Doors Count */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    type="number"
                                                                    value={row.doors_count === null ? '' : row.doors_count}
                                                                    placeholder="N/A"
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'doors_count', e.target.value === '' ? null : Number(e.target.value))}
                                                                    className={cn("bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800", row.doors_count === null && "border-amber-700/50 placeholder:text-amber-500/50")}
                                                                />
                                                            </td>

                                                            {/* Package / Forfait Dropdown */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.package_name || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'package_name', e.target.value || null)}
                                                                    className={cn("w-full h-8 rounded-lg border bg-zinc-950 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-850", row.package_name === null ? "border-amber-700/50" : "border-zinc-850")}
                                                                >
                                                                    <option value="" className="text-zinc-550 bg-zinc-900">Non spécifié</option>
                                                                    <option value="Bronze" className="bg-zinc-900">Bronze</option>
                                                                    <option value="Argent" className="bg-zinc-900">Argent</option>
                                                                    <option value="Argent+" className="bg-zinc-900">Argent+</option>
                                                                    <option value="Or" className="bg-zinc-900">Or</option>
                                                                    <option value="Platinum" className="bg-zinc-900">Platinum</option>
                                                                </select>
                                                            </td>

                                                            {/* Monthly Fee */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={row.monthly_fee === null ? '' : row.monthly_fee}
                                                                    placeholder="N/A"
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'monthly_fee', e.target.value === '' ? null : parseAmount(e.target.value))}
                                                                    className={cn("bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800", row.monthly_fee === null && "border-amber-700/50")}
                                                                />
                                                            </td>

                                                            {/* Financial Year Date */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    type="date"
                                                                    value={row.financial_year || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'financial_year', e.target.value || null)}
                                                                    className={cn("bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800", !row.financial_year && "border-amber-700/50")}
                                                                />
                                                            </td>

                                                            {/* Status Dropdown */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.status} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'status', e.target.value)}
                                                                    className="w-full h-8 rounded-lg border border-zinc-850 bg-zinc-950 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-850"
                                                                >
                                                                    <option value="active" className="bg-zinc-900">Actif</option>
                                                                    <option value="inactive" className="bg-zinc-900">Inactif</option>
                                                                </select>
                                                            </td>

                                                            {/* Action Selector */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.import_action} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'import_action', e.target.value)}
                                                                    className={`w-full h-8 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-800 ${
                                                                        row.import_action === 'update' 
                                                                            ? 'bg-amber-950/20 border-amber-800 text-amber-300' 
                                                                            : row.import_action === 'skip'
                                                                                ? 'bg-zinc-850 border-zinc-700 text-zinc-400' 
                                                                                : 'bg-cyan-950/20 border-cyan-800 text-cyan-300'
                                                                    }`}
                                                                >
                                                                    <option value="create" className="text-cyan-300 bg-zinc-900 font-semibold">Créer Nouveau</option>
                                                                    <option value="update" className="text-amber-300 bg-zinc-900 font-semibold">Mettre à Jour</option>
                                                                    <option value="skip" className="text-zinc-400 bg-zinc-900 font-semibold">Ignorer (Passer)</option>
                                                                </select>
                                                            </td>

                                                            {/* Remove Row */}
                                                            <td className="p-2 text-center">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    onClick={() => handleRemoveRow(row.temp_id)}
                                                                    className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400"
                                                                    type="button"
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'result' && importResult && (
                            <div className="max-w-xl mx-auto py-8 text-center space-y-6">
                                
                                <div className="mx-auto w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                                    <FileCheck className="h-8 w-8" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-bold text-zinc-100">Importation Terminée !</h3>
                                    <p className="text-xs text-zinc-400">Vos clients ont été synchronisés avec la base de données.</p>
                                </div>

                                {/* Results counters card */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 rounded-2xl border border-zinc-800 bg-zinc-950/40">
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase">Total</p>
                                        <p className="text-lg font-extrabold text-zinc-200 mt-1">{importResult.total}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-cyan-500 uppercase">Créés</p>
                                        <p className="text-lg font-extrabold text-cyan-400 mt-1">+{importResult.imported}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-amber-500 uppercase">Mis à Jour</p>
                                        <p className="text-lg font-extrabold text-amber-400 mt-1">{importResult.updated}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase">Ignorés</p>
                                        <p className="text-lg font-extrabold text-zinc-400 mt-1">{importResult.skipped}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-rose-500 uppercase">Échecs</p>
                                        <p className="text-lg font-extrabold text-rose-400 mt-1">{importResult.failed}</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button onClick={handleClose} className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl font-semibold">
                                        Fermer le workspace
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-950/40 shrink-0 flex flex-row items-center justify-between sm:justify-between gap-4">
                        {step === 'preview' ? (
                            <>
                                <Button 
                                    variant="outline" 
                                    onClick={handleClose} 
                                    disabled={isPending}
                                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 rounded-xl font-semibold"
                                    type="button"
                                >
                                    Annuler
                                </Button>
                                
                                <Button
                                    onClick={handleConfirmImport}
                                    disabled={isPending || totalErrorsCount > 0}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold flex items-center gap-1.5"
                                    type="button"
                                >
                                    {isPending ? (
                                        "Importation en cours..."
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 text-cyan-200" />
                                            Confirmer l'importation ({rows.length} lignes)
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <div className="w-full flex justify-end">
                                <Button onClick={handleClose} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold" type="button">
                                    Terminer
                                </Button>
                            </div>
                        )}
                    </DialogFooter>

                </DialogContent>
            </Dialog>
        </>
    )
}
