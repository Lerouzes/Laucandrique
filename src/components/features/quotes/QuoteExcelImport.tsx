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
    Sparkles,
    AlertTriangle
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
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
import { confirmBulkQuoteImportAction } from '@/actions/quotes'
import { Input } from '@/components/ui/input'

interface Manager {
    id: string
    first_name: string
    last_name: string
    email: string | null
}

interface Contractor {
    id: string
    full_name: string
    color: string
}

interface ExistingQuote {
    id: string
    quote_number: number
    title: string
    clients?: {
        id: string
        full_name: string
        company_name: string | null
    } | null
}

interface ImportQuoteRow {
    temp_id: string
    id?: string // Match existing quote id if update
    quote_number: number // No soumission
    quote_number_raw: string // raw string representation for edits
    sdc_num: string // SDC #
    client_name?: string | null // Client Name / Nom complet
    manager_name_ref: string // Typed manager name
    manager_id: string | null // Resolved manager UUID
    title: string // Description / Titre
    start_date_str: string // Échéancier souhaité (desired start date YYYY-MM-DD)
    contractor_name_ref: string // Typed contractor name
    contractor_id: string | null // Resolved contractor UUID
    amount: number // Montant ($)
    amount_raw: string // raw string representation for edits
    status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed' // Statut
    import_action: 'create' | 'update' | 'skip'
}

export function QuoteExcelImport({ 
    managers = [], 
    contractors = [],
    existingQuotes = [] 
}: { 
    managers: Manager[]
    contractors: Contractor[]
    existingQuotes: ExistingQuote[]
}) {
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
    
    // Import Rows & Result States
    const [rows, setRows] = useState<ImportQuoteRow[]>([])
    const [importResult, setImportResult] = useState<{
        total: number
        imported: number
        updated: number
        clientsCreated: number
        skipped: number
        failed: number
    } | null>(null)

    // Parse Excel Serial Date/Strings safely
    const parseExcelDate = (value: any): string => {
        if (!value) return ''
        if (typeof value === 'number') {
            // Excel serial date to JS Date
            const date = new Date(Math.round((value - 25569) * 86400 * 1000))
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
        return str
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

    // Parse statuses from French to DB Enums
    const parseStatus = (val: any): 'draft' | 'sent' | 'approved' | 'denied' | 'completed' => {
        const s = String(val || '').trim().toLowerCase()
        if (s.includes('brouillon') || s === 'draft') return 'draft'
        if (s.includes('envoy') || s === 'sent') return 'sent'
        if (s.includes('approuv') || s === 'approved') return 'approved'
        if (s.includes('refus') || s === 'denied') return 'denied'
        if (s.includes('complet') || s === 'completed') return 'completed'
        return 'draft' // Default fallback
    }

    // 1. GENERATE & DOWNLOAD CLEAN EXCEL TEMPLATE
    const handleDownloadTemplate = () => {
        try {
            const wb = XLSX.utils.book_new()
            
            // Sheet 1: Main template data
            const wsData = [
                ["No soumission", "SDC #", "Gestionnaire", "Description / Titre", "Échéancier souhaité", "Contracteur", "Montant ($)", "Statut"],
                [101, "SDC-101", managers[0] ? `${managers[0].first_name} ${managers[0].last_name}` : "Jean Gérant", "Réfection de toiture principale", "2026-06-01", contractors[0] ? contractors[0].full_name : "ABC Construction", "5500.00", "Brouillon"],
                [102, "SDC-102", "", "Nettoyage des drains pluviaux", "2026-06-15", "", "1200,50", "Approuvée"]
            ]
            
            const ws = XLSX.utils.aoa_to_sheet(wsData)
            
            // Freeze top row
            ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
            
            // Auto width columns
            const maxLen = wsData[0].map((_, colIdx) => Math.max(...wsData.map(row => String(row[colIdx] || '').length)))
            ws['!cols'] = maxLen.map(w => ({ wch: w + 5 }))
            
            // Sheet 2: Active managers reference
            const managersSheetData = [
                ["Gestionnaire (à copier/coller)", "Courriel"],
                ...managers.map(m => [`${m.first_name} ${m.last_name}`, m.email || ''])
            ]
            const wsManagers = XLSX.utils.aoa_to_sheet(managersSheetData)
            wsManagers['!cols'] = [{ wch: 45 }, { wch: 30 }]

            // Sheet 3: Active contractors reference
            const contractorsSheetData = [
                ["Contracteur (à copier/coller)"],
                ...contractors.map(c => [c.full_name])
            ]
            const wsContractors = XLSX.utils.aoa_to_sheet(contractorsSheetData)
            wsContractors['!cols'] = [{ wch: 45 }]

            // Sheet 4: Valid statuses
            const statusSheetData = [
                ["Statuts acceptés"],
                ["Brouillon"],
                ["Envoyée"],
                ["Approuvée"],
                ["Refusée"],
                ["Complétée"]
            ]
            const wsStatuses = XLSX.utils.aoa_to_sheet(statusSheetData)
            wsStatuses['!cols'] = [{ wch: 25 }]
            
            XLSX.utils.book_append_sheet(wb, ws, "Soumissions à Importer")
            XLSX.utils.book_append_sheet(wb, wsManagers, "Gestionnaires Actifs")
            XLSX.utils.book_append_sheet(wb, wsContractors, "Contracteurs Actifs")
            XLSX.utils.book_append_sheet(wb, wsStatuses, "Statuts Valides")
            
            XLSX.writeFile(wb, "GUSTAV_Template_Soumissions.xlsx")
            toast.success("Modèle Excel des soumissions téléchargé.")
        } catch (err: any) {
            toast.error("Erreur lors de la génération du modèle", { description: err.message })
        }
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
                const parsed: ImportQuoteRow[] = rawData.map((row: any, index) => {
                    const rawQuoteNum = row['No soumission'] || row['no_soumission'] || row['Soumission #'] || row['Numéro']
                    const quoteNumberRaw = rawQuoteNum !== undefined && rawQuoteNum !== null ? String(rawQuoteNum).trim() : ''
                    const quoteNumber = Number(quoteNumberRaw) || 0
                    const sdcNum = String(row['SDC #'] || row['sdc_#'] || row['SDC'] || '').trim()
                    
                    // Match Manager fuzzy/exact by name
                    const managerNameRef = String(row['Gestionnaire'] || row['gestionnaire'] || row['Manager'] || '').trim()
                    let matchedManagerId: string | null = null
                    if (managerNameRef) {
                        const match = managers.find(
                            m => `${m.first_name} ${m.last_name}`.toLowerCase() === managerNameRef.toLowerCase()
                        )
                        if (match) matchedManagerId = match.id
                    }

                    // Match Contractor fuzzy/exact by name
                    const contractorNameRef = String(row['Contracteur'] || row['contracteur'] || row['Contractor'] || '').trim()
                    let matchedContractorId: string | null = null
                    if (contractorNameRef) {
                        const match = contractors.find(
                            c => c.full_name.toLowerCase() === contractorNameRef.toLowerCase()
                        )
                        if (match) matchedContractorId = match.id
                    }

                    const title = String(row['Description / Titre'] || row['description'] || row['Titre'] || row['title'] || '').trim()
                    const dateStr = parseExcelDate(row['Échéancier souhaité'] || row['echeancier'] || row['Date'] || '')
                    const amountRaw = String(row['Montant ($)'] || row['montant'] || row['Montant'] || '0')
                    const amount = parseAmount(amountRaw)
                    const statusStr = parseStatus(row['Statut'] || row['statut'] || row['Status'] || '')

                    // Check for existing duplicate in quotes table matching quote_number
                    const duplicateMatch = quoteNumber 
                        ? existingQuotes.find(eq => Number(eq.quote_number) === Number(quoteNumber))
                        : null

                    return {
                        temp_id: `quote-row-${index}-${Date.now()}`,
                        id: duplicateMatch?.id,
                        quote_number: quoteNumber,
                        quote_number_raw: quoteNumberRaw,
                        sdc_num: sdcNum,
                        client_name: duplicateMatch?.clients?.company_name || null,
                        manager_name_ref: managerNameRef,
                        manager_id: matchedManagerId,
                        title,
                        start_date_str: dateStr,
                        contractor_name_ref: contractorNameRef,
                        contractor_id: matchedContractorId,
                        amount,
                        amount_raw: amountRaw,
                        status: statusStr,
                        import_action: duplicateMatch ? 'update' : 'create' // Default update if duplicate exists
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
        return rows.map((row, idx) => {
            const errors: string[] = []
            const warnings: string[] = []
            
            // Required: No soumission
            if (!row.quote_number_raw || row.quote_number_raw.trim() === '') {
                errors.push("Le numéro de soumission est obligatoire.")
            } else {
                const parsedNum = Number(row.quote_number_raw)
                if (isNaN(parsedNum) || parsedNum <= 0) {
                    errors.push("Le numéro de soumission doit être un nombre positif.")
                }
            }

            // Required: SDC #
            if (!row.sdc_num) {
                errors.push("Le SDC # est obligatoire.")
            }

            // Required: Title
            if (!row.title) {
                errors.push("Le titre/description est obligatoire.")
            }

            // Optional/Warning: Date format check
            if (row.start_date_str) {
                const parsedDate = new Date(row.start_date_str)
                if (isNaN(parsedDate.getTime())) {
                    errors.push("La date souhaitée est invalide (format attendu AAAA-MM-JJ).")
                }
            }

            // Required: Valid Amount
            if (isNaN(row.amount) || row.amount < 0) {
                errors.push("Le montant doit être un montant numérique positif.")
            }

            // Warning: Manager ref not matched
            if (row.manager_name_ref && !row.manager_id) {
                errors.push("Gestionnaire non trouvé dans le système. Veuillez le corriger ou l'effacer.")
            }

            // Warning: Contractor ref not matched
            if (row.contractor_name_ref && !row.contractor_id) {
                errors.push("Contracteur non trouvé dans le système. Veuillez le corriger ou l'effacer.")
            }

            // Database Duplicate check
            const matchedDbQuote = row.quote_number
                ? existingQuotes.find(eq => Number(eq.quote_number) === Number(row.quote_number))
                : null
            
            const isDbDuplicate = !!matchedDbQuote
            
            // File Duplicate check (other row has same quote_number)
            const isFileDuplicate = row.quote_number
                ? rows.some((r, rIdx) => Number(r.quote_number) === Number(row.quote_number) && rIdx !== idx)
                : false

            if (isDbDuplicate) {
                warnings.push(`Doublon CRM: Existe déjà (ID #${row.quote_number} de ${matchedDbQuote.clients?.company_name || 'Client inconnu'})`)
            }
            if (isFileDuplicate) {
                warnings.push("Doublon Fichier: Ce numéro est répété dans votre modèle Excel.")
            }

            return {
                ...row,
                errors,
                warnings,
                is_db_duplicate: isDbDuplicate,
                is_file_duplicate: isFileDuplicate,
                db_duplicate_client: matchedDbQuote?.clients?.company_name || matchedDbQuote?.clients?.full_name || ''
            }
        })
    }, [rows, existingQuotes])

    const totalErrorsCount = useMemo(() => {
        return validatedRows.reduce((acc, row) => row.import_action === 'skip' ? acc : acc + row.errors.length, 0)
    }, [validatedRows])

    const totalWarningsCount = useMemo(() => {
        return validatedRows.reduce((acc, row) => row.import_action === 'skip' ? acc : acc + row.warnings.length, 0)
    }, [validatedRows])

    // 4. INLINE EDIT HANDLERS
    const handleUpdateRowField = (tempId: string, field: keyof ImportQuoteRow, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.temp_id !== tempId) return r
            
            const updated = { ...r, [field]: value }
            
            // If manager_id changes, reset name ref
            if (field === 'manager_id') {
                const match = managers.find(m => m.id === value)
                updated.manager_name_ref = match ? `${match.first_name} ${match.last_name}` : ''
            }

            // If contractor_id changes, reset name ref
            if (field === 'contractor_id') {
                const match = contractors.find(c => c.id === value)
                updated.contractor_name_ref = match ? match.full_name : ''
            }

            // Recalculate duplicate on quote_number_raw update
            if (field === 'quote_number_raw') {
                const qNum = Number(value)
                updated.quote_number = isNaN(qNum) ? 0 : qNum
                const dup = existingQuotes.find(eq => Number(eq.quote_number) === updated.quote_number)
                updated.id = dup?.id
                updated.import_action = dup ? 'update' : 'create'
            }

            // Update amount double format
            if (field === 'amount_raw') {
                updated.amount = parseAmount(value)
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
            // Only update duplicates if setting 'update'
            if (action === 'update') {
                const isDup = r.quote_number && existingQuotes.some(eq => Number(eq.quote_number) === Number(r.quote_number))
                return { ...r, import_action: isDup ? 'update' : r.import_action }
            }
            return { ...r, import_action: action }
        }))
        toast.success("Action groupée appliquée avec succès.")
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
            toast.error("Veuillez corriger toutes les erreurs de validation avant de confirmer l'importation.")
            return
        }

        startTransition(async () => {
            try {
                // Send mapped data to server action
                const response = await confirmBulkQuoteImportAction(rows)
                if (response.success && response.summary) {
                    setImportResult(response.summary)
                    setStep('result')
                    toast.success("Importation des soumissions terminée avec succès!")
                } else {
                    toast.error("Échec de l'importation en base de données.")
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
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 flex items-center gap-1.5 h-8 text-xs font-semibold rounded-lg"
                >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    Modèle Soumissions
                </Button>
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1.5 h-8 text-xs font-semibold rounded-lg"
                >
                    <Upload className="h-3.5 w-3.5" />
                    Importer Excel
                </Button>
            </div>

            {/* HIGH-FIDELITY IMPORT WORKSPACE DIALOG */}
            <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
                <DialogContent className="max-w-[95vw] lg:max-w-7xl bg-zinc-900 border-zinc-800 p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/40 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/30">
                                <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-zinc-100 text-lg flex items-center gap-2">
                                    Importation Historique de Soumissions
                                    <Badge variant="secondary" className="bg-zinc-850 text-zinc-300 text-xxs font-normal border border-zinc-800">
                                        Étape {step === 'preview' ? '2 sur 3 : Révision' : '3 sur 3 : Terminé'}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400 text-xs mt-0.5">
                                    {step === 'preview' 
                                        ? "Révisez, éditez et corrigez les colonnes ci-dessous avant d'exécuter la création finale dans le CRM."
                                        : "Résumé des opérations d'importation appliquées au CRM."
                                    }
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto min-h-[300px] p-6">
                        {step === 'preview' && (
                            <div className="space-y-6">
                                
                                {/* Info / Bulk actions row */}
                                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-zinc-200">Lignes chargées : {rows.length}</p>
                                        <div className="text-xxs flex flex-col gap-1 mt-1">
                                            {totalErrorsCount > 0 ? (
                                                <p className="text-rose-400 font-semibold flex items-center gap-1.5">
                                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                    {totalErrorsCount} erreur(s) de validation détectée(s) (bloque l'import)
                                                </p>
                                            ) : (
                                                <p className="text-cyan-400 font-semibold flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                                                    Toutes les données sont prêtes et valides !
                                                </p>
                                            )}
                                            {totalWarningsCount > 0 && (
                                                <p className="text-amber-400 font-semibold flex items-center gap-1.5">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                    {totalWarningsCount} avertissement(s) de doublon(s) à confirmer
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Bulk Actions buttons */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleBulkAction('create')} 
                                            className="text-xxs h-8 bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
                                            type="button"
                                        >
                                            Créer Tout
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleBulkAction('update')} 
                                            className="text-xxs h-8 bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
                                            type="button"
                                        >
                                            Mettre à Jour Doublons
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
                                                Supprimer Invalides
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Preview Grid Table */}
                                <div className="rounded-xl border border-zinc-850 overflow-hidden bg-zinc-950/20">
                                    <div className="overflow-x-auto max-w-full">
                                        <table className="w-full text-left border-collapse min-w-[1300px]">
                                            <thead>
                                                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xxs font-bold uppercase tracking-wider">
                                                    <th className="p-3 w-[100px]">No Soum. *</th>
                                                    <th className="p-3 w-[110px]">SDC # *</th>
                                                    <th className="p-3 w-[160px]">Gestionnaire</th>
                                                    <th className="p-3 w-[220px]">Description / Titre *</th>
                                                    <th className="p-3 w-[120px]">Échéancier Date</th>
                                                    <th className="p-3 w-[160px]">Contracteur</th>
                                                    <th className="p-3 w-[120px]">Montant ($) *</th>
                                                    <th className="p-3 w-[120px]">Statut</th>
                                                    <th className="p-3 w-[140px]">Action d'Import</th>
                                                    <th className="p-3 w-[50px] text-center">Suppr.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-850 text-xs text-zinc-300">
                                                {validatedRows.map((row) => {
                                                    const hasError = row.errors.length > 0
                                                    const hasWarning = row.warnings.length > 0
                                                    
                                                    return (
                                                        <tr 
                                                            key={row.temp_id} 
                                                            className={`transition-colors hover:bg-zinc-900/40 ${
                                                                hasError 
                                                                    ? 'bg-rose-950/10 hover:bg-rose-950/20' 
                                                                    : hasWarning 
                                                                        ? 'bg-amber-950/5 hover:bg-amber-950/10' 
                                                                        : ''
                                                            }`}
                                                        >
                                                            {/* Quote Number */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    type="text"
                                                                    value={row.quote_number_raw || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'quote_number_raw', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        !row.quote_number_raw || isNaN(Number(row.quote_number_raw)) || Number(row.quote_number_raw) <= 0 ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                                {row.is_db_duplicate && (
                                                                    <p className="text-[10px] text-amber-500 font-medium mt-1">
                                                                        CRM double: {row.db_duplicate_client || 'CRM'}
                                                                    </p>
                                                                )}
                                                                {row.is_file_duplicate && (
                                                                    <p className="text-[10px] text-yellow-500 font-medium mt-1">
                                                                        Double fichier Excel
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* SDC # */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.sdc_num} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'sdc_num', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        !row.sdc_num ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                                {!row.sdc_num && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">SDC # requis.</span>
                                                                )}
                                                            </td>

                                                            {/* Manager Dropdown */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.manager_id || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'manager_id', e.target.value || null)}
                                                                    className="w-full h-8 rounded-lg border border-zinc-850 bg-zinc-950 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-850"
                                                                >
                                                                    <option value="" className="text-zinc-500 bg-zinc-900">Non assigné</option>
                                                                    {managers.map((m) => (
                                                                        <option key={m.id} value={m.id} className="text-zinc-100 bg-zinc-900">
                                                                            {m.first_name} {m.last_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {row.manager_name_ref && !row.manager_id && (
                                                                    <p className="text-[10px] text-rose-500 mt-0.5">
                                                                        Erreur ref: "{row.manager_name_ref}"
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* Title */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.title} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'title', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        !row.title ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                            </td>

                                                            {/* Date */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    type="date"
                                                                    value={row.start_date_str || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'start_date_str', e.target.value)}
                                                                    className="bg-zinc-950/60 border-zinc-850 h-8 text-xs focus-visible:ring-zinc-800"
                                                                />
                                                            </td>

                                                            {/* Contractor Dropdown */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.contractor_id || ''} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'contractor_id', e.target.value || null)}
                                                                    className="w-full h-8 rounded-lg border border-zinc-850 bg-zinc-950 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-850"
                                                                >
                                                                    <option value="" className="text-zinc-500 bg-zinc-900">Non assigné</option>
                                                                    {contractors.map((c) => (
                                                                        <option key={c.id} value={c.id} className="text-zinc-100 bg-zinc-900">
                                                                            {c.full_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {row.contractor_name_ref && !row.contractor_id && (
                                                                    <p className="text-[10px] text-rose-500 mt-0.5">
                                                                        Erreur ref: "{row.contractor_name_ref}"
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* Amount */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.amount_raw} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'amount_raw', e.target.value)}
                                                                    className={`bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800 ${
                                                                        isNaN(row.amount) ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    }`}
                                                                />
                                                                {isNaN(row.amount) && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Invalide.</span>
                                                                )}
                                                            </td>

                                                            {/* Status Dropdown */}
                                                            <td className="p-2">
                                                                <select 
                                                                    value={row.status} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'status', e.target.value)}
                                                                    className="w-full h-8 rounded-lg border border-zinc-850 bg-zinc-950 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-850"
                                                                >
                                                                    <option value="draft" className="bg-zinc-900">Brouillon</option>
                                                                    <option value="sent" className="bg-zinc-900">Envoyée</option>
                                                                    <option value="approved" className="bg-zinc-900">Approuvée</option>
                                                                    <option value="denied" className="bg-zinc-900">Refusée</option>
                                                                    <option value="completed" className="bg-zinc-900">Complétée</option>
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
                                                                    <option value="skip" className="text-zinc-400 bg-zinc-900 font-semibold">Ignorer</option>
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
                                    <p className="text-xs text-zinc-400">Vos soumissions ont été synchronisées avec la base de données.</p>
                                </div>

                                {/* Results counters card */}
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-5 rounded-2xl border border-zinc-800 bg-zinc-950/40">
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase">Total</p>
                                        <p className="text-lg font-extrabold text-zinc-200 mt-1">{importResult.total}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-cyan-500 uppercase">Soum. Créées</p>
                                        <p className="text-lg font-extrabold text-cyan-400 mt-1">+{importResult.imported}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-amber-500 uppercase">Soum. Maj</p>
                                        <p className="text-lg font-extrabold text-amber-400 mt-1">{importResult.updated}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-violet-500 uppercase">Clients Créés</p>
                                        <p className="text-lg font-extrabold text-violet-400 mt-1">+{importResult.clientsCreated}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-zinc-500 uppercase">Ignorées</p>
                                        <p className="text-lg font-extrabold text-zinc-400 mt-1">{importResult.skipped}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xxs font-bold text-rose-500 uppercase">Échecs</p>
                                        <p className="text-lg font-extrabold text-rose-400 mt-1">{importResult.failed}</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button onClick={handleClose} className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl font-semibold">
                                        Fermer l'espace d'importation
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
