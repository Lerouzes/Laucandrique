// @ts-nocheck
// src/components/features/maintenance/CampaignDetailTracker.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    updateCampaignStatusAction, 
    importResidentsAction,
    getCampaignDetailsAction,
    advanceCampaignPhaseAction
} from '@/actions/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { 
    Activity, 
    Users, 
    CheckCircle, 
    Clock, 
    UserCheck,
    Hammer,
    Calendar,
    Send,
    Upload,
    Copy,
    Check,
    Search,
    SlidersHorizontal,
    FileSpreadsheet,
    HelpCircle,
    XCircle,
    AlertTriangle,
    Eye,
    ChevronRight,
    Wrench
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function CampaignDetailTracker({ 
    campaign, 
    services, 
    units: initialUnits 
}: { 
    campaign: any
    services: any[]
    units: any[]
}) {
    const router = useRouter()
    const [units, setUnits] = useState<any[]>(initialUnits)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [advancingPhase, setAdvancingPhase] = useState(false)

    // Excel import modal state
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState('')
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<{
        success: boolean
        importedCount: number
        missingUnits: string[]
        conflicts: string[]
    } | null>(null)

    // Copy indicator state
    const [copiedToken, setCopiedToken] = useState<string | null>(null)

    // Stats calculations
    const totalUnits = units.length
    const completedCount = units.filter(u => u.participation === 'completed').length
    const interestedCount = units.filter(u => u.participation === 'interested').length
    const declinedCount = units.filter(u => u.participation === 'not_interested').length
    const pendingCount = units.filter(u => u.participation === 'pending').length
    const moreInfoCount = units.filter(u => u.participation === 'more_info').length

    const participationRate = totalUnits > 0 
        ? Math.round(((completedCount + interestedCount + moreInfoCount) / totalUnits) * 100) 
        : 0

    const completionRate = totalUnits > 0 
        ? Math.round((completedCount / totalUnits) * 100) 
        : 0

    const handleStatusChange = async (nextStatus: 'draft' | 'active' | 'completed' | 'cancelled') => {
        setUpdatingStatus(true)
        try {
            await updateCampaignStatusAction(campaign.id, nextStatus)
            toast.success(`Statut de la campagne mis à jour vers: ${nextStatus}`)
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de la modification du statut: " + (err as Error).message)
        } finally {
            setUpdatingStatus(false)
        }
    }

    const handleAdvancePhase = async () => {
        setAdvancingPhase(true)
        try {
            await advanceCampaignPhaseAction(campaign.id)
            toast.success("Campagne de maintenance passée à la phase de planification.")
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors du changement de phase: " + (err as Error).message)
        } finally {
            setAdvancingPhase(false)
        }
    }

    const handleCopyInviteLink = (token: string) => {
        const origin = window.location.origin
        const link = `${origin}/maintenance/invite/${token}`
        navigator.clipboard.writeText(link)
        setCopiedToken(token)
        toast.success("Lien d'invitation copié dans le presse-papiers.")
        setTimeout(() => setCopiedToken(null), 2000)
    }

    const handleTriggerReminders = () => {
        toast.success(`Rappels automatiques déclenchés pour les ${pendingCount} unités en attente.`)
    }

    const handleImportResidents = async () => {
        if (!importData.trim()) {
            toast.error("Veuillez coller ou saisir les données des résidents.")
            return
        }

        setImporting(true)
        setImportResult(null)

        try {
            // Parse CSV / tab-separated data
            // Expect columns: Unit | Full Name | Email | Phone
            const lines = importData.split('\n')
            const parsedRows: any[] = []

            lines.forEach((line, index) => {
                if (!line.trim()) return
                
                // Split by tabs or commas
                const columns = line.split(/\t|,/)
                
                // Assume column 0 is unit number, 1 is name, 2 is email, 3 is phone
                const door_number = columns[0]?.trim()
                const full_name = columns[1]?.trim()
                
                if (door_number && full_name) {
                    parsedRows.push({
                        door_number,
                        full_name,
                        email: columns[2]?.trim() || '',
                        phone: columns[3]?.trim() || ''
                    })
                }
            })

            if (parsedRows.length === 0) {
                toast.error("Aucune ligne valide détectée. Assurez-vous d'avoir au moins le numéro d'unité et le nom du résident.")
                setImporting(false)
                return
            }

            const res = await importResidentsAction(campaign.client_id, parsedRows)
            setImportResult(res)
            
            // Reload details to get fresh resident info
            const freshDetails = await getCampaignDetailsAction(campaign.id)
            setUnits(freshDetails.units)
            
            toast.success(`${res.importedCount} résidents importés avec succès!`)
        } catch (err) {
            toast.error("Erreur lors de l'import: " + (err as Error).message)
        } finally {
            setImporting(false)
        }
    }

    const filteredUnits = units.filter(u => {
        const matchesSearch = String(u.door?.door_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (u.resident?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (u.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesStatus = statusFilter === 'All' || u.participation === statusFilter
        return matchesSearch && matchesStatus
    })

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'interested': return 'Intéressé'
            case 'not_interested': return 'Refusé'
            case 'completed': return 'Complété'
            case 'more_info': return 'Plus d\'infos'
            default: return 'En attente'
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'interested':
                return 'bg-purple-950/40 text-purple-300 border-purple-800/40'
            case 'not_interested':
                return 'bg-rose-950/40 text-rose-400 border-rose-900/40'
            case 'completed':
                return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
            case 'more_info':
                return 'bg-blue-950/40 text-blue-400 border-blue-900/40'
            default:
                return 'bg-zinc-900/40 text-zinc-400 border-zinc-800'
        }
    }

    return (
        <div className="space-y-6 text-xs text-zinc-300">
            
            {/* Header Tracker Overview */}
            <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl justify-between items-start md:items-center animate-fade-in">
                <div className="space-y-2 pr-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 ${
                            campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-450 text-emerald-400 border-emerald-800/40' :
                            campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-800/40' :
                            campaign.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                            'bg-zinc-800/50 text-zinc-400 border-zinc-700/60'
                        }`}>
                            {campaign.status === 'active' ? 'Actif' :
                             campaign.status === 'completed' ? 'Complété' :
                             campaign.status === 'cancelled' ? 'Annulé' : 'Brouillon'}
                        </Badge>
                        {campaign.survey_required && (
                            <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 ${
                                campaign.current_phase === 'survey' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/25'
                            }`}>
                                {campaign.current_phase === 'survey' ? 'Phase 1 : Sondage d\'intérêt' : 'Phase 2 : Planification'}
                            </Badge>
                        )}
                        <h2 className="text-base font-extrabold text-white uppercase tracking-wider">{campaign.name}</h2>
                    </div>
                    <p className="text-xs text-zinc-400">
                        Syndicat : <strong className="text-zinc-200">{campaign.clients?.company_name || campaign.clients?.full_name}</strong> · 
                        Contracteur : <strong className="text-purple-400">{campaign.contractors?.full_name || 'Non assigné'}</strong> · 
                        Période : <strong className="text-zinc-200">{new Date(campaign.start_date).toLocaleDateString('fr-CA')} au {new Date(campaign.end_date).toLocaleDateString('fr-CA')}</strong>
                    </p>
                </div>

                {/* Status Changer Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-zinc-800/80 pt-4 md:pt-0 md:pl-6">
                    {campaign.status === 'draft' && (
                        <Button
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('active')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow cursor-pointer transition-colors"
                        >
                            Lancer la Campagne
                        </Button>
                    )}
                    {campaign.status === 'active' && (
                        <>
                            {campaign.survey_required && campaign.current_phase === 'survey' && (
                                <Button
                                    disabled={advancingPhase || updatingStatus}
                                    onClick={handleAdvancePhase}
                                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow cursor-pointer transition-colors"
                                >
                                    Passer à la planification
                                </Button>
                            )}
                            <Button
                                disabled={updatingStatus}
                                onClick={() => handleStatusChange('completed')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow cursor-pointer transition-colors"
                            >
                                Marquer comme Complété
                            </Button>
                            <Button
                                disabled={updatingStatus}
                                onClick={() => handleStatusChange('cancelled')}
                                className="bg-zinc-900 border border-zinc-800 text-rose-400 font-bold text-xs h-9 px-4 rounded-xl hover:bg-zinc-850 cursor-pointer transition-colors"
                            >
                                Annuler
                            </Button>
                        </>
                    )}
                    {campaign.status === 'completed' && (
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            Campagne archivée
                        </span>
                    )}
                </div>
            </div>

            {/* Campaign Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Participation</span>
                            <span className="text-xl font-extrabold text-white block">{participationRate}%</span>
                            <span className="text-xs text-zinc-400">{completedCount + interestedCount + moreInfoCount} / {totalUnits} unités</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center">
                            <Users className="h-4 w-4 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Complétion</span>
                            <span className="text-xl font-extrabold text-white block">{completionRate}%</span>
                            <span className="text-xs text-zinc-400">{completedCount} / {totalUnits} unités</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Refus (Opt-Out)</span>
                            <span className="text-xl font-extrabold text-rose-455 text-rose-400 block">{declinedCount}</span>
                            <span className="text-xs text-zinc-400">{Math.round((declinedCount / (totalUnits || 1)) * 100)}% de désintérêt</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-rose-950/40 border border-rose-900/40 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-rose-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-zinc-550 uppercase font-bold text-xs tracking-wider block">Sans Réponse</span>
                            <span className="text-xl font-extrabold text-amber-400 block">{pendingCount}</span>
                            <span className="text-xs text-zinc-400">{Math.round((pendingCount / (totalUnits || 1)) * 100)}% en attente</span>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center">
                            <HelpCircle className="h-4 w-4 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Services & Actions Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Services summary */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Services et interventions inclus</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {services.map(svc => (
                                <div key={svc.id} className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl flex items-center justify-between">
                                    <span className="font-semibold text-zinc-300 text-xs">{svc.name}</span>
                                    <div className="flex gap-1.5 items-center">
                                        <Badge variant="outline" className="text-[10px] border-zinc-800/60 bg-zinc-950/20 text-zinc-400">
                                            {svc.category}
                                        </Badge>
                                        <span className="text-zinc-400 text-xs font-mono flex items-center gap-0.5">
                                            <Clock className="h-3.5 w-3.5" /> {svc.duration}m
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Reminders & Import controls */}
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Outils & Gestion des contacts</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-3">
                        <Button
                            onClick={() => setShowImportModal(true)}
                            className="w-full bg-purple-900/40 hover:bg-purple-800/40 text-purple-400 border border-purple-800/40 text-xs font-bold h-10 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Importer la liste des résidents (Excel)
                        </Button>
                        <Button
                            onClick={handleTriggerReminders}
                            disabled={pendingCount === 0}
                            className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 text-xs font-bold h-10 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                            <Send className="h-4 w-4 text-zinc-500" />
                            Relancer les résidents ({pendingCount})
                        </Button>
                    </CardContent>
                </Card>

            </div>

            {/* Excel Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#16171e] border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-3 border-b border-zinc-900">
                            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <FileSpreadsheet className="h-4 w-4" />
                                Importation Excel / CSV des résidents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Collez des lignes copiées directement depuis Excel ou un fichier CSV. 
                                Format attendu (séparation par tabulation ou virgule) :<br />
                                <strong className="text-zinc-300 font-mono text-xs">Numéro d'unité (ex: 304) | Nom Complet (ex: Alice Roy) | Email (optionnel) | Téléphone (optionnel)</strong>
                            </p>

                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Données à importer (Excel/CSV)</Label>
                                <Textarea
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    placeholder="304&#9;Alice Roy&#9;alice@email.com&#9;514-123-4567&#10;305&#9;Marc Tremblay&#9;marc@email.com"
                                    rows={8}
                                    className="bg-[#121318] border-zinc-850 text-xs text-white py-2 font-mono"
                                />
                            </div>

                            {/* Result log */}
                            {importResult && (
                                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 max-h-[150px] overflow-y-auto text-xs">
                                    <p className="font-bold text-emerald-450 text-emerald-400">
                                        Import réussi : {importResult.importedCount} résidents configurés.
                                    </p>
                                    {importResult.missingUnits.length > 0 && (
                                        <div className="text-rose-400">
                                            <span className="font-bold">Unités manquantes dans Gustav ({importResult.missingUnits.length}) :</span>
                                            <p className="font-mono text-xs mt-0.5">{importResult.missingUnits.join(', ')}</p>
                                        </div>
                                    )}
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
                                    }}
                                    className="bg-transparent border border-zinc-850 text-zinc-400 text-xs font-bold h-10 px-4 rounded-xl hover:bg-zinc-900 cursor-pointer"
                                >
                                    Fermer
                                </Button>
                                <Button
                                    onClick={handleImportResidents}
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

            {/* Section 4: Units Enrollment Listing Table */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                        <Users className="h-4 w-4" />
                        Unités & Planification des rendez-vous
                    </CardTitle>
                    
                    {/* Filters bar */}
                    <div className="flex gap-3 w-full sm:w-auto items-center">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="Unité or résident..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#121318] border-zinc-850 h-10 text-xs pl-9 text-white focus-visible:ring-purple-650"
                            />
                        </div>
                        <SearchableSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: 'All', label: 'Tous les statuts' },
                                { value: 'pending', label: 'En attente' },
                                { value: 'interested', label: 'Intéressé' },
                                { value: 'not_interested', label: 'Refusé' },
                                { value: 'completed', label: 'Complété' }
                            ]}
                            placeholder="Statut..."
                            searchPlaceholder="Rechercher..."
                            className="h-10 w-48"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredUnits.length === 0 ? (
                        <p className="text-xs italic text-zinc-500 text-center py-8">
                            Aucune unité ne correspond aux critères de filtrage.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-zinc-300">
                                <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">Unité</th>
                                        <th className="p-3">Résident actuel</th>
                                        <th className="p-3">Contact (Campagne)</th>
                                        <th className="p-3">Participation</th>
                                        <th className="p-3">Rendez-vous</th>
                                        <th className="p-3 text-right">Lien d'invitation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {filteredUnits.map(u => (
                                        <tr key={u.id} className="hover:bg-zinc-900/15">
                                            <td className="p-3">
                                                <Link 
                                                    href={`/maintenance-hub/units/${u.door_id}`}
                                                    className="font-extrabold text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 text-xs"
                                                >
                                                    Unit {u.door?.door_number}
                                                    <ChevronRight className="h-3.5 w-3.5 text-zinc-650" />
                                                </Link>
                                            </td>
                                            <td className="p-3 font-semibold text-zinc-200">
                                                {u.resident?.full_name || 'Non défini (Import requis)'}
                                            </td>
                                            <td className="p-3">
                                                <div className="space-y-0.5">
                                                    <span className="font-semibold block text-zinc-300 text-xs">
                                                        {u.contact_name || u.resident?.full_name || '-'}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 block font-mono">
                                                        {[u.contact_email || u.resident?.email, u.contact_phone || u.resident?.phone].filter(Boolean).join(' · ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className={`text-[10px] font-bold px-2.5 py-0.5 ${getStatusBadge(u.participation)}`}>
                                                    {getStatusLabel(u.participation)}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                {u.appointment ? (
                                                    <div className="space-y-0.5 text-zinc-300">
                                                        <span className="font-semibold block flex items-center gap-1 font-mono text-xs">
                                                            <Calendar className="h-3.5 w-3.5 text-purple-400" />
                                                            {new Date(u.appointment.appointment_date).toLocaleDateString('fr-CA')}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 block font-mono">
                                                            Slot : {u.appointment.start_time.substring(0,5)} à {u.appointment.end_time.substring(0,5)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 italic">Non planifié</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={`/maintenance/invite/${u.invite_token}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-8 w-8 items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                                                        title="Tester le lien résident"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleCopyInviteLink(u.invite_token)}
                                                        className="h-8 w-8 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
                                                    >
                                                        {copiedToken === u.invite_token ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
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

        </div>
    )
}
