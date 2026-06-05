// src/components/features/clients/CoOwnersManager.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
    Users, 
    PlusCircle, 
    Edit, 
    Trash2, 
    FileSpreadsheet, 
    Search,
    UserCheck,
    AlertCircle,
    Check,
    X,
    Phone,
    Mail,
    DoorOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { saveCoOwnerAction, deleteCoOwnerAction, importCoOwnersAction } from '@/actions/maintenance'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface CoOwnersManagerProps {
    clientId: string
    initialCoOwners: any[]
}

export function CoOwnersManager({ clientId, initialCoOwners }: CoOwnersManagerProps) {
    const router = useRouter()
    const [coOwners, setCoOwners] = useState<any[]>(initialCoOwners)
    const [searchTerm, setSearchTerm] = useState('')

    // Form/Modal states
    const [showForm, setShowForm] = useState(false)
    const [editingDoorId, setEditingDoorId] = useState<string | null>(null)
    const [unitNumber, setUnitNumber] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)

    // Deletion states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [doorToDelete, setDoorToDelete] = useState<{ id: string; doorNumber: string } | null>(null)

    // Excel import modal state
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState('')
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<{
        success: boolean
        importedCount: number
        conflicts: string[]
    } | null>(null)

    const splitName = (fullName: string) => {
        const parts = (fullName || '').trim().split(' ')
        if (parts.length <= 1) return { firstName: fullName, lastName: '' }
        const firstName = parts[0]
        const lastName = parts.slice(1).join(' ')
        return { firstName, lastName }
    }

    const handleEdit = (co: any) => {
        setEditingDoorId(co.id)
        setUnitNumber(co.door_number || '')
        
        const { firstName, lastName } = splitName(co.resident?.full_name || '')
        setFirstName(firstName)
        setLastName(lastName)
        setEmail(co.resident?.email || '')
        setPhone(co.resident?.phone || '')
        setShowForm(true)
    }

    const resetForm = () => {
        setEditingDoorId(null)
        setUnitNumber('')
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhone('')
        setShowForm(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!unitNumber.trim()) {
            toast.error("Veuillez saisir le numéro d'unité.")
            return
        }
        if (!firstName.trim()) {
            toast.error("Veuillez saisir le prénom.")
            return
        }

        setSaving(true)
        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
            await saveCoOwnerAction({
                id: editingDoorId || undefined,
                clientId,
                door_number: unitNumber.trim(),
                full_name: fullName,
                email: email.trim() || null,
                phone: phone.trim() || null
            })

            toast.success(editingDoorId ? "Co-propriétaire mis à jour." : "Unité et co-propriétaire créés.")
            
            // Hard reload to get fresh data from server component
            resetForm()
            router.refresh()
            window.location.reload()
        } catch (err) {
            toast.error("Erreur d'enregistrement : " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const triggerDeleteConfirm = (doorId: string, unitNum: string) => {
        setDoorToDelete({ id: doorId, doorNumber: unitNum })
        setDeleteConfirmOpen(true)
    }

    const handleDelete = async () => {
        if (!doorToDelete) return
        setDeleteConfirmOpen(false)
        setSaving(true)
        try {
            await deleteCoOwnerAction(doorToDelete.id, clientId)
            toast.success("Unité supprimée avec succès.")
            router.refresh()
            window.location.reload()
        } catch (err) {
            toast.error("Erreur de suppression : " + (err as Error).message)
        } finally {
            setSaving(false)
            setDoorToDelete(null)
        }
    }

    const handleImportCoOwners = async () => {
        if (!importData.trim()) {
            toast.error("Veuillez coller ou saisir les données des co-propriétaires.")
            return
        }

        setImporting(true)
        setImportResult(null)

        try {
            const lines = importData.split('\n')
            const parsedRows: any[] = []

            lines.forEach((line) => {
                if (!line.trim()) return
                const columns = line.split(/\t|,/)
                
                const door_number = columns[0]?.trim()
                const fName = columns[1]?.trim() || ''
                const lName = columns[2]?.trim() || ''
                const fullName = `${fName} ${lName}`.trim()
                
                if (door_number && fullName) {
                    parsedRows.push({
                        door_number,
                        full_name: fullName,
                        email: columns[3]?.trim() || '',
                        phone: columns[4]?.trim() || ''
                    })
                }
            })

            if (parsedRows.length === 0) {
                toast.error("Aucune ligne valide détectée. Format requis : Unité, Prénom, Nom, Courriel, Téléphone")
                setImporting(false)
                return
            }

            const res = await importCoOwnersAction(clientId, parsedRows)
            setImportResult(res)
            toast.success(`${res.importedCount} co-propriétaires importés !`)
            
            // Reload page
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de l'import : " + (err as Error).message)
        } finally {
            setImporting(false)
        }
    }

    const filteredCoOwners = coOwners.filter(co => {
        const matchesSearch = String(co.door_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (co.resident?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (co.resident?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    })

    return (
        <div className="space-y-6 text-xs text-zinc-300">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Rechercher une unité ou un co-propriétaire..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-zinc-950 border-zinc-850 h-10 text-xs pl-9 text-white focus-visible:ring-zinc-800"
                    />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="bg-purple-900/40 hover:bg-purple-800/40 text-purple-400 border border-purple-800/40 text-xs font-bold h-10 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Importer (Excel)
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Ajouter une unité
                    </Button>
                </div>
            </div>

            {/* Individual Form Card */}
            {showForm && (
                <Card className="bg-zinc-900/60 border border-zinc-800 shadow-lg animate-fade-in">
                    <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">
                            {editingDoorId ? "Modifier l'unité & résident" : "Ajouter une unité & résident"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold">Numéro d'unité *</Label>
                                    <Input
                                        value={unitNumber}
                                        onChange={(e) => setUnitNumber(e.target.value)}
                                        placeholder="Ex: 304"
                                        className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold">Prénom *</Label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Ex: Alice"
                                        className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold">Nom de famille</Label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Ex: Roy"
                                        className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold">Courriel</Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Ex: alice.roy@email.com"
                                        className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400 font-semibold">Numéro de téléphone</Label>
                                    <Input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Ex: 514-123-4567"
                                        className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/60">
                                <Button
                                    type="button"
                                    onClick={resetForm}
                                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xs font-bold h-10 px-4 rounded-xl hover:bg-zinc-950 cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-cyan-600 hover:bg-cyan-505 hover:bg-cyan-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                                >
                                    {saving ? 'Enregistrement...' : <><Check className="h-4 w-4" /> Enregistrer</>}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* List Table Card */}
            <Card className="bg-zinc-900/60 border border-zinc-800 shadow-md">
                <CardContent className="p-0">
                    {filteredCoOwners.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-500 italic">
                            Aucun co-propriétaire enregistré pour ce syndicat.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-zinc-300">
                                <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">Unité</th>
                                        <th className="p-3">Nom complet</th>
                                        <th className="p-3">Courriel</th>
                                        <th className="p-3">Téléphone</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900/60">
                                    {filteredCoOwners.map(co => (
                                        <tr key={co.id} className="hover:bg-zinc-950/20">
                                            <td className="p-3 font-extrabold text-cyan-400 flex items-center gap-1">
                                                <DoorOpen className="h-3.5 w-3.5 text-zinc-600" />
                                                {co.door_number}
                                            </td>
                                            <td className="p-3 font-semibold text-zinc-200">
                                                {co.resident?.full_name || '-'}
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                {co.resident?.email ? (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3.5 w-3.5 text-zinc-600" />
                                                        {co.resident.email}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                {co.resident?.phone ? (
                                                    <span className="flex items-center gap-1 font-mono">
                                                        <Phone className="h-3.5 w-3.5 text-zinc-600" />
                                                        {co.resident.phone}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(co)}
                                                        className="h-8 w-8 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg cursor-pointer"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => triggerDeleteConfirm(co.id, co.door_number)}
                                                        className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Excel Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900">
                            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <FileSpreadsheet className="h-4 w-4" />
                                Importation Excel / CSV des co-propriétaires
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Collez des lignes copiées directement depuis Excel ou un fichier CSV. 
                                Format attendu (séparation par tabulation ou virgule) :<br />
                                <strong className="text-zinc-300 font-mono text-xs">Unité (ex: 304) | Prénom (ex: Alice) | Nom (ex: Roy) | Email (optionnel) | Téléphone (optionnel)</strong>
                            </p>

                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Données à importer</Label>
                                <Textarea
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    placeholder="304&#9;Alice&#9;Roy&#9;alice@email.com&#9;514-123-4567&#10;305&#9;Marc&#9;Tremblay&#9;marc@email.com"
                                    rows={8}
                                    className="bg-zinc-950 border-zinc-850 text-xs text-white py-2 font-mono"
                                />
                            </div>

                            {/* Result log */}
                            {importResult && (
                                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 max-h-[150px] overflow-y-auto text-xs">
                                    <p className="font-bold text-emerald-400">
                                        Import réussi : {importResult.importedCount} co-propriétaires importés.
                                    </p>
                                    {importResult.conflicts.length > 0 && (
                                        <div className="text-amber-400">
                                            <span className="font-bold">Conflits rencontrés :</span>
                                            <ul className="list-disc list-inside font-mono text-xs mt-0.5 space-y-0.5">
                                                {importResult.conflicts.map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowImportModal(false)
                                        setImportData('')
                                        setImportResult(null)
                                        resetForm()
                                        router.refresh()
                                        window.location.reload()
                                    }}
                                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xs font-bold h-10 px-4 rounded-xl hover:bg-zinc-950 cursor-pointer"
                                >
                                    Fermer
                                </Button>
                                <Button
                                    onClick={handleImportCoOwners}
                                    disabled={importing}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                                >
                                    {importing ? 'Importation...' : 'Lancer l\'import'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {doorToDelete && (
                <ConfirmationDialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                    title="Supprimer le co-propriétaire ?"
                    description={`Voulez-vous vraiment supprimer l'unité ${doorToDelete.doorNumber} et son résident ? Cette action supprimera également tous les rendez-vous associés dans les campagnes.`}
                    confirmText="Supprimer"
                    cancelText="Annuler"
                    onConfirm={handleDelete}
                    loading={saving}
                    variant="danger"
                />
            )}
        </div>
    )
}
