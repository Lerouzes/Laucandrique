'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
    RefreshCw, 
    Check, 
    X, 
    Building2, 
    Loader2, 
    Inbox,
    ShieldCheck,
    Clock,
    UserCheck,
    ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { triggerInitialM365Sync, approveQueueChangeAction, rejectQueueChangeAction } from '@/actions/sync'

// Labels translation map
const FIELD_LABELS: Record<string, string> = {
    'all_fields': 'Import Global (Fiche client complète)',
    'monthly_fee': 'Honoraires MRR (Mensuel)',
    'package_name': 'Forfait / Niveau de contrat',
    'end_date': 'Date de résiliation',
    'departure_date': 'Date de résiliation',
    'manager_id': 'Gestionnaire assigné'
}

export function ChangeApprovalsClient({ initialQueue }: { initialQueue: any[] }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isSyncing, setIsSyncing] = useState(false)

    // Handle initial bulk sync manually triggered
    const handleRunSync = async () => {
        setIsSyncing(true)
        try {
            const res = await triggerInitialM365Sync()
            if (res.success) {
                toast.success('Synchronisation terminée', {
                    description: `${res.queuedCount} modifications en attente d'approbation ajoutées à la file.`
                })
                router.refresh()
            }
        } catch (err: any) {
            toast.error('Erreur de synchronisation', {
                description: err.message || 'Impossible de se connecter à Microsoft List.'
            })
        } finally {
            setIsSyncing(false)
        }
    }

    // Process approval
    const handleApprove = (id: string, clientName: string) => {
        startTransition(async () => {
            try {
                const res = await approveQueueChangeAction(id)
                if (res.success) {
                    toast.success('Modification approuvée', {
                        description: `La modification pour ${clientName} a été enregistrée avec succès.`
                    })
                    router.refresh()
                }
            } catch (err: any) {
                toast.error("Erreur d'approbation", {
                    description: err.message || "Une erreur s'est produite lors de l'enregistrement de l'approbation."
                })
            }
        })
    }

    // Process rejection
    const handleReject = (id: string, clientName: string) => {
        startTransition(async () => {
            try {
                const res = await rejectQueueChangeAction(id)
                if (res.success) {
                    toast.success('Modification rejetée', {
                        description: `La demande de modification pour ${clientName} a été rejetée et retirée de la file.`
                    })
                    router.refresh()
                }
            } catch (err: any) {
                toast.error('Erreur lors du rejet', {
                    description: err.message || "Une erreur s'est produite lors de l'enregistrement du rejet."
                })
            }
        })
    }

    // Helper functions to format values
    const formatFieldName = (name: string) => {
        return FIELD_LABELS[name] || name
    }

    const renderOldValue = (fieldName: string, value: string | null) => {
        if (!value) return <span className="text-zinc-650 text-zinc-500 italic">Vide</span>

        if (fieldName === 'all_fields') {
            try {
                const payload = JSON.parse(value)
                return (
                    <div className="text-[10px] space-y-1 bg-zinc-950/20 p-2 rounded-lg border border-zinc-900 text-zinc-400">
                        {payload.package_name && <div><span className="text-zinc-500">Forfait:</span> {payload.package_name}</div>}
                        {payload.monthly_fee != null && <div><span className="text-zinc-500">MRR:</span> ${payload.monthly_fee}</div>}
                        {payload.manager_email && <div><span className="text-zinc-500">Resp:</span> {payload.manager_email}</div>}
                        {payload.end_date && <div><span className="text-rose-500/80">Fin: {payload.end_date}</span></div>}
                    </div>
                )
            } catch (_) {
                return <span className="font-mono text-zinc-500">{value}</span>
            }
        }

        if (fieldName === 'monthly_fee') {
            return <span className="text-zinc-400">${Number(value).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
        }
        if (fieldName === 'package_name') {
            return <Badge variant="outline" className="bg-zinc-950 text-zinc-500 border-zinc-800 text-[10px]">{value}</Badge>
        }
        return <span className="text-zinc-400 font-mono">{value}</span>
    }

    const renderNewValue = (fieldName: string, value: string) => {
        if (fieldName === 'all_fields') {
            try {
                const payload = JSON.parse(value)
                return (
                    <div className="text-[10px] space-y-1 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850 max-w-sm">
                        {payload.full_name && <div><span className="text-zinc-500">Nom:</span> <span className="text-zinc-200 font-bold">{payload.full_name}</span></div>}
                        {payload.package_name && <div><span className="text-zinc-500">Forfait:</span> <span className="text-purple-400 font-bold">{payload.package_name}</span></div>}
                        {payload.monthly_fee != null && <div><span className="text-zinc-500">MRR:</span> <span className="text-emerald-400 font-bold">${Number(payload.monthly_fee).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span></div>}
                        {payload.manager_email && <div><span className="text-zinc-500">Resp:</span> <span className="text-zinc-300 font-mono">{payload.manager_email}</span></div>}
                        {payload.end_date && <div><span className="text-rose-400 font-semibold">Date fin: {payload.end_date}</span></div>}
                    </div>
                )
            } catch (_) {
                return <span className="font-mono text-zinc-400">{value}</span>
            }
        }

        if (fieldName === 'monthly_fee') {
            return <span className="text-emerald-400 font-extrabold">${Number(value).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
        }
        if (fieldName === 'package_name') {
            return <Badge variant="outline" className="bg-purple-950/20 text-purple-300 border-purple-800 text-[10px]">{value}</Badge>
        }
        if (fieldName === 'end_date' || fieldName === 'departure_date') {
            return <span className="text-rose-400 font-bold">{value}</span>
        }
        return <span className="font-semibold text-zinc-200">{value}</span>
    }

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-zinc-900/40 p-4 border border-zinc-800 rounded-2xl shadow-md backdrop-blur-sm">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-purple-400" />
                        File d'Approbation et de Validation des Données
                    </h3>
                    <p className="text-xxs text-zinc-400">
                        Passez en revue les modifications synchronisées avec Microsoft List avant de les appliquer à la base de données Gustav.
                    </p>
                </div>
                <Button 
                    onClick={handleRunSync} 
                    disabled={isSyncing || isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 h-10 rounded-xl shadow-lg shadow-purple-950/20 transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Synchronisation en cours...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4 animate-spin-hover" />
                            Exécuter la synchro Microsoft List
                        </>
                    )}
                </Button>
            </div>

            {/* Approvals Table */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-zinc-150 text-zinc-200">
                        Modifications en attente ({initialQueue.length})
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Les changements de forfaits, de MRR, de résiliation ou d'assignation de gestionnaires requièrent l'approbation d'un administrateur.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {initialQueue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-zinc-900/60 border border-zinc-850 flex items-center justify-center text-zinc-500">
                                <Inbox className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-300">File d'approbation vide</p>
                                <p className="text-[10px] text-zinc-500 max-w-sm">
                                    Aucune modification n'est actuellement en attente d'approbation. Lancez une synchronisation manuelle ou attendez un webhook automatique.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs w-full text-left">
                                <TableHeader>
                                    <TableRow className="border-b border-zinc-800/80 hover:bg-transparent bg-zinc-900/30">
                                        <TableHead className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-zinc-400">Client / Copropriété</TableHead>
                                        <TableHead className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-zinc-400">Changer de</TableHead>
                                        <TableHead className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-zinc-400">Ancienne Valeur</TableHead>
                                        <TableHead className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-zinc-400">Nouvelle Valeur</TableHead>
                                        <TableHead className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-zinc-400">Demandé le</TableHead>
                                        <TableHead className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-zinc-400 text-right pr-6">Décision</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-zinc-900/60">
                                    {initialQueue.map((item) => {
                                        const clientName = item.clients
                                            ? (item.clients.company_name || item.clients.full_name)
                                            : "Nouveau Client (Import)"

                                        return (
                                            <TableRow key={item.id} className="hover:bg-zinc-900/10 border-b border-zinc-900/60 transition-colors">
                                                {/* Client Name */}
                                                <TableCell className="p-4 font-semibold text-zinc-200">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                        <div className="truncate max-w-[180px]">
                                                            {clientName}
                                                            {item.field_name === 'all_fields' && !item.target_client_id && (
                                                                <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 ml-2 font-mono text-[9px] font-normal px-1.5 py-0">
                                                                    Nouveau
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Field Changed */}
                                                <TableCell className="p-4">
                                                    <Badge variant="outline" className="border-zinc-800 bg-zinc-900/30 text-zinc-400 font-bold px-2 py-0.5 text-[10px]">
                                                        {formatFieldName(item.field_name)}
                                                    </Badge>
                                                </TableCell>

                                                {/* Old Value */}
                                                <TableCell className="p-4">
                                                    {renderOldValue(item.field_name, item.old_value)}
                                                </TableCell>

                                                {/* New Value */}
                                                <TableCell className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        {item.old_value && <ArrowRight className="h-3 w-3 text-zinc-650 text-zinc-555 text-zinc-500 shrink-0" />}
                                                        {renderNewValue(item.field_name, item.new_value)}
                                                    </div>
                                                </TableCell>

                                                {/* Date & Requestor */}
                                                <TableCell className="p-4 text-zinc-400 text-[10px]">
                                                    <div className="flex items-center gap-1 font-mono text-zinc-550">
                                                        <Clock className="h-3 w-3 text-zinc-500 shrink-0" />
                                                        {new Date(item.created_at).toLocaleDateString('fr-CA', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                    <div className="text-[9px] text-zinc-500 font-mono mt-0.5 max-w-[120px] truncate">
                                                        Par: {item.requested_by}
                                                    </div>
                                                </TableCell>

                                                {/* Decision Buttons */}
                                                <TableCell className="p-4 text-right pr-6 shrink-0">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            onClick={() => handleReject(item.id, clientName)}
                                                            disabled={isPending}
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-900 hover:bg-rose-950/20 hover:border-rose-900/50 text-zinc-400 hover:text-rose-400 transition-all p-0 flex items-center justify-center"
                                                            title="Rejeter la modification"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleApprove(item.id, clientName)}
                                                            disabled={isPending}
                                                            size="sm"
                                                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                            Approuver
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
