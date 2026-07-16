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
import { importCoOwnersAction } from '@/actions/maintenance'
import { Input } from '@/components/ui/input'

interface ExistingCoOwner {
    id: string
    door_number: string
    resident?: {
        full_name: string | null
        email: string | null
        phone: string | null
    } | null
}

interface ImportRow {
    temp_id: string
    door_number: string
    first_name: string
    last_name: string
    email: string
    phone: string
}

interface CoOwnersExcelImportProps {
    clientId: string
    existingCoOwners: ExistingCoOwner[]
    onSuccess?: () => void
}

export function CoOwnersExcelImport({ 
    clientId, 
    existingCoOwners = [],
    onSuccess
}: CoOwnersExcelImportProps) {
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
    
    // Import Rows & Result States
    const [rows, setRows] = useState<ImportRow[]>([])
    const [importResult, setImportResult] = useState<{
        success: boolean
        importedCount: number
        conflicts: string[]
    } | null>(null)

    // 1. GENERATE & DOWNLOAD CLEAN EXCEL TEMPLATE
    const handleDownloadTemplate = () => {
        try {
            const wb = XLSX.utils.book_new()
            
            // Sheet 1: Main template data
            const wsData = [
                ["Unité", "Prénom", "Nom", "Courriel", "Téléphone"],
                ["101", "Jean", "Dupont", "jean.dupont@email.com", "514-555-0101"],
                ["102", "Marie", "Tremblay", "marie.tremblay@email.com", "514-555-0102"],
                ["201", "Pierre", "Gagnon", "", "450-555-0201"]
            ]
            
            const ws = XLSX.utils.aoa_to_sheet(wsData)
            
            // Freeze top row for modern view
            ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
            
            // Set beautiful columns width
            const maxLen = wsData[0].map((_, colIdx) => Math.max(...wsData.map(row => String(row[colIdx] || '').length)))
            ws['!cols'] = maxLen.map(w => ({ wch: w + 5 }))
            
            XLSX.utils.book_append_sheet(wb, ws, "Copropriétaires à Importer")
            
            XLSX.writeFile(wb, "GUSTAV_Template_Coproprietaires.xlsx")
            toast.success("Modèle Excel téléchargé avec succès.")
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
                const parsed: ImportRow[] = rawData.map((row: any, index) => {
                    // Try to resolve columns in French or English
                    const doorNumber = String(row['Unité'] || row['Unite'] || row['Unit'] || row['door_number'] || row['unit'] || '').trim()
                    const firstName = String(row['Prénom'] || row['Prenom'] || row['First Name'] || row['first_name'] || '').trim()
                    const lastName = String(row['Nom'] || row['Last Name'] || row['last_name'] || '').trim()
                    const email = String(row['Courriel'] || row['Email'] || row['email'] || '').trim()
                    const phone = String(row['Téléphone'] || row['Telephone'] || row['Phone'] || row['phone'] || '').trim()

                    return {
                        temp_id: `row-${index}-${Date.now()}`,
                        door_number: doorNumber,
                        first_name: firstName,
                        last_name: lastName,
                        email: email,
                        phone: phone
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
            
            // Required: Unit
            if (!row.door_number) {
                errors.push("Le numéro d'unité est obligatoire.")
            }

            // Required: First Name
            if (!row.first_name) {
                errors.push("Le prénom est obligatoire.")
            }

            // Optional: Email check format
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push("Le format du courriel est invalide.")
            }

            // Warning: Door number exists
            const doorExists = row.door_number 
                ? existingCoOwners.some(ec => String(ec.door_number).trim().toLowerCase() === row.door_number.trim().toLowerCase())
                : false

            return {
                ...row,
                errors,
                is_duplicate: doorExists
            }
        })
    }, [rows, existingCoOwners])

    const totalErrorsCount = useMemo(() => {
        return validatedRows.reduce((acc, row) => acc + row.errors.length, 0)
    }, [validatedRows])

    // 4. INLINE EDIT HANDLERS
    const handleUpdateRowField = (tempId: string, field: keyof ImportRow, value: string) => {
        setRows(prev => prev.map(r => {
            if (r.temp_id !== tempId) return r
            return { ...r, [field]: value }
        }))
    }

    const handleRemoveRow = (tempId: string) => {
        setRows(prev => prev.filter(r => r.temp_id !== tempId))
        toast.info("Ligne supprimée de la liste d'importation.")
    }

    const handleClearInvalid = () => {
        const validRows = validatedRows.filter(r => r.errors.length === 0)
        const removedCount = rows.length - validRows.length
        setRows(validRows)
        toast.success(`${removedCount} ligne(s) non valide(s) supprimée(s).`)
    }

    // 5. CONFIRM SAVE TO CRM
    const handleConfirmImport = async () => {
        if (totalErrorsCount > 0) {
            toast.error("Veuillez corriger toutes les erreurs avant de confirmer l'importation.")
            return
        }

        startTransition(async () => {
            try {
                // Map import rows to DB payload: { door_number, full_name, email, phone }
                const mappedRows = rows.map(r => ({
                    door_number: r.door_number.trim(),
                    full_name: `${r.first_name.trim()} ${r.last_name.trim()}`.trim(),
                    email: r.email.trim() || undefined,
                    phone: r.phone.trim() || undefined
                }))

                const response = await importCoOwnersAction(clientId, mappedRows)
                
                if (response.success) {
                    setImportResult(response)
                    setStep('result')
                    toast.success("Importation terminée avec succès!")
                    if (onSuccess) onSuccess()
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
            
            {/* Trigger Buttons */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    type="button"
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 flex items-center gap-1.5 h-10 font-semibold rounded-xl text-xs"
                >
                    <Download className="h-4 w-4 text-purple-400" />
                    Télécharger Modèle
                </Button>
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className="bg-purple-650 hover:bg-purple-750 text-white flex items-center gap-1.5 h-10 font-semibold rounded-xl text-xs"
                >
                    <Upload className="h-4 w-4" />
                    Importer Excel
                </Button>
            </div>

            {/* HIGH-FIDELITY IMPORT WORKSPACE DIALOG */}
            <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
                <DialogContent className="max-w-[95vw] lg:max-w-5xl bg-zinc-900 border-zinc-800 p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-950/40 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-800/30">
                                <FileSpreadsheet className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    Importation de Copropriétaires
                                    <Badge variant="secondary" className="bg-zinc-850 text-zinc-300 text-[10px] font-normal border border-zinc-800">
                                        Étape {step === 'preview' ? '2 sur 3 : Révision' : '3 sur 3 : Terminé'}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-zinc-405 text-zinc-400 text-xs mt-0.5">
                                    {step === 'preview' 
                                        ? "Révisez, éditez et corrigez les données des co-propriétaires ci-dessous. Les doublons d'unités existantes seront mis à jour."
                                        : "Résumé des opérations appliquées à votre base de co-propriétaires."
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
                                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                            {totalErrorsCount > 0 ? (
                                                <>
                                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                    <span className="text-rose-400 font-semibold">{totalErrorsCount} erreur(s) de validation détectée(s)</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                                    <span className="text-purple-400 font-semibold">Toutes les données sont prêtes et valides !</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {totalErrorsCount > 0 && (
                                            <Button 
                                                variant="destructive" 
                                                onClick={handleClearInvalid} 
                                                className="text-[10px] h-8 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-800"
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
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                                                    <th className="p-3 w-[120px]">Unité *</th>
                                                    <th className="p-3 w-[180px]">Prénom *</th>
                                                    <th className="p-3 w-[180px]">Nom</th>
                                                    <th className="p-3 w-[220px]">Courriel</th>
                                                    <th className="p-3 w-[160px]">Téléphone</th>
                                                    <th className="p-3 w-[60px] text-center">Suppr.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-855 divide-zinc-850 text-xs text-zinc-300">
                                                {validatedRows.map((row) => {
                                                    const hasError = row.errors.length > 0
                                                    
                                                    return (
                                                        <tr 
                                                            key={row.temp_id} 
                                                            className={cn(
                                                                "transition-colors hover:bg-zinc-900/40",
                                                                hasError 
                                                                    ? 'bg-rose-950/10 hover:bg-rose-950/20' 
                                                                    : row.is_duplicate 
                                                                        ? 'bg-purple-950/5 hover:bg-purple-950/10' 
                                                                        : ''
                                                            )}
                                                        >
                                                            {/* Unit */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.door_number} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'door_number', e.target.value)}
                                                                    className={cn(
                                                                        "bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800",
                                                                        !row.door_number ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    )}
                                                                />
                                                                {!row.door_number && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Requis</span>
                                                                )}
                                                                {row.is_duplicate && (
                                                                    <p className="text-[10px] text-purple-400 font-semibold mt-1">
                                                                        Unité existante (MàJ)
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* First Name */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.first_name} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'first_name', e.target.value)}
                                                                    className={cn(
                                                                        "bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800",
                                                                        !row.first_name ? 'border-rose-700 focus-visible:ring-rose-800' : 'border-zinc-850'
                                                                    )}
                                                                />
                                                                {!row.first_name && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Requis</span>
                                                                )}
                                                            </td>

                                                            {/* Last Name */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.last_name} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'last_name', e.target.value)}
                                                                    className="bg-zinc-950/60 border-zinc-850 h-8 text-xs focus-visible:ring-zinc-800"
                                                                />
                                                            </td>

                                                            {/* Email */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.email} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'email', e.target.value)}
                                                                    className={cn(
                                                                        "bg-zinc-950/60 h-8 text-xs focus-visible:ring-zinc-800",
                                                                        row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) 
                                                                            ? 'border-rose-700 focus-visible:ring-rose-800' 
                                                                            : 'border-zinc-850'
                                                                    )}
                                                                />
                                                                {row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) && (
                                                                    <span className="text-[10px] text-rose-500 mt-1 block">Format courriel invalide.</span>
                                                                )}
                                                            </td>

                                                            {/* Phone */}
                                                            <td className="p-2">
                                                                <Input 
                                                                    value={row.phone} 
                                                                    onChange={(e) => handleUpdateRowField(row.temp_id, 'phone', e.target.value)}
                                                                    className="bg-zinc-950/60 border-zinc-850 h-8 text-xs focus-visible:ring-zinc-800"
                                                                />
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
                                
                                <div className="mx-auto w-16 h-16 rounded-full bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
                                    <FileCheck className="h-8 w-8" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wider">Importation Terminée !</h3>
                                    <p className="text-xs text-zinc-400">Les copropriétaires ont été synchronisés avec la base de données.</p>
                                </div>

                                {/* Results counters card */}
                                <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl border border-zinc-850 bg-zinc-950/40 max-w-sm mx-auto">
                                    <div className="p-2 border-r border-zinc-850">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Importés</p>
                                        <p className="text-xl font-extrabold text-zinc-200 mt-1">{importResult.importedCount}</p>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase font-semibold">Conflits / Erreurs</p>
                                        <p className={cn("text-xl font-extrabold mt-1", importResult.conflicts.length > 0 ? "text-rose-450 text-rose-450" : "text-zinc-500")}>
                                            {importResult.conflicts.length}
                                        </p>
                                    </div>
                                </div>

                                {importResult.conflicts.length > 0 && (
                                    <div className="max-w-md mx-auto p-4 bg-rose-950/10 border border-rose-900/30 rounded-xl text-left space-y-2 max-h-[150px] overflow-y-auto">
                                        <span className="font-bold text-rose-400 text-xs uppercase block">Conflits d'importation :</span>
                                        <ul className="list-disc list-inside font-mono text-[10px] text-zinc-450 text-zinc-400 space-y-1">
                                            {importResult.conflicts.map((c, idx) => (
                                                <li key={idx}>{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <Button onClick={handleClose} className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl font-semibold text-xs h-10 px-6">
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
                                    className="border-zinc-850 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 rounded-xl font-semibold text-xs h-10 px-4"
                                    type="button"
                                >
                                    Annuler
                                </Button>
                                
                                <Button
                                    onClick={handleConfirmImport}
                                    disabled={isPending || totalErrorsCount > 0}
                                    className="bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center gap-1.5 text-xs h-10 px-5"
                                    type="button"
                                >
                                    {isPending ? (
                                        "Importation en cours..."
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 text-purple-200" />
                                            Confirmer l'importation ({rows.length} lignes)
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <div className="w-full flex justify-end">
                                <Button onClick={handleClose} className="bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-semibold text-xs h-10 px-5" type="button">
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
