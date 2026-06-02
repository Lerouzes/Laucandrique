'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, CheckCircle2, AlertCircle, Edit2, Check, X, Loader2 } from 'lucide-react'
import { updateClientAgaAction } from '@/actions/clients'

interface Client {
    id: string
    company_name: string | null
    full_name: string
    contracts?: { start_date: string | null } | { start_date: string | null }[] | null
    aga_planned_date: string | null
    aga_completed_date: string | null
    aga_status: string | null
    manager_id: string | null
    managers: {
        first_name: string
        last_name: string
    } | null
}

interface AgaTrackingSectionProps {
    clients: Client[]
}

export function AgaTrackingSection({ clients = [] }: AgaTrackingSectionProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const getClientFiscalYearEnd = (c: Client) => {
        if (c.contracts) {
            if (Array.isArray(c.contracts)) {
                return c.contracts[0]?.start_date || null
            }
            return c.contracts.start_date || null
        }
        return null
    }
    const [editingClientId, setEditingClientId] = useState<string | null>(null)

    // Editing states for the selected row
    const [editFiscalYearEnd, setEditFiscalYearEnd] = useState('')
    const [editPlannedDate, setEditPlannedDate] = useState('')
    const [editCompletedDate, setEditCompletedDate] = useState('')
    const [editStatus, setEditStatus] = useState('pending')

    const getDueDate = (fyEndStr: string | null) => {
        if (!fyEndStr) return null
        const fyEnd = new Date(fyEndStr)
        const dueDate = new Date(fyEnd)
        dueDate.setDate(dueDate.getDate() + 90)
        return dueDate
    }

    const checkIsLate = (client: Client) => {
        if (client.aga_completed_date || client.aga_status === 'completed') return false
        const dueDate = getDueDate(getClientFiscalYearEnd(client))
        if (!dueDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        dueDate.setHours(0, 0, 0, 0)
        return today > dueDate
    }

    const handleStartEdit = (client: Client) => {
        setEditingClientId(client.id)
        setEditFiscalYearEnd(getClientFiscalYearEnd(client) || '')
        setEditPlannedDate(client.aga_planned_date || '')
        setEditCompletedDate(client.aga_completed_date || '')
        setEditStatus(client.aga_status || 'pending')
    }

    const handleCancelEdit = () => {
        setEditingClientId(null)
    }

    const handleSave = async (clientId: string) => {
        startTransition(async () => {
            try {
                // Determine automatic status changes if they make sense
                let finalStatus = editStatus
                if (editCompletedDate) {
                    finalStatus = 'completed'
                } else if (editPlannedDate) {
                    finalStatus = 'scheduled'
                } else {
                    finalStatus = 'pending'
                }

                await updateClientAgaAction(clientId, {
                    financial_year: editFiscalYearEnd || null,
                    aga_planned_date: editPlannedDate || null,
                    aga_completed_date: editCompletedDate || null,
                    aga_status: finalStatus
                })

                toast.success("Dates d'AGA mises à jour avec succès.")
                setEditingClientId(null)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    return (
        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
            <CardHeader className="border-b border-zinc-900/60 pb-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-purple-400" />
                    Suivi de l'obligation légale des AGA
                </CardTitle>
                <CardDescription className="text-xxs text-zinc-400">
                    Les assemblées générales annuelles (AGA) doivent obligatoirement se tenir dans un délai maximal de <strong>90 jours</strong> suivant la fin de l'exercice financier du syndicat.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-4">
                <table className="w-full text-left text-xxs text-zinc-300">
                    <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                        <tr>
                            <th className="p-3">Copropriété</th>
                            <th className="p-3">Gestionnaire</th>
                            <th className="p-3">Fin Exercice</th>
                            <th className="p-3">Date Limite (90j max)</th>
                            <th className="p-3">Planifiée</th>
                            <th className="p-3">Complétée</th>
                            <th className="p-3">Statut</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                        {clients.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-4 text-center italic text-zinc-550">
                                    Aucune copropriété active configurée.
                                </td>
                            </tr>
                        ) : (
                            clients.map((c) => {
                                const clientName = c.company_name || c.full_name
                                const managerName = c.managers ? `${c.managers.first_name} ${c.managers.last_name}` : 'Non assigné'
                                const isEditing = editingClientId === c.id
                                const fyEnd = getClientFiscalYearEnd(c)
                                const dueDate = getDueDate(fyEnd)
                                const isLate = checkIsLate(c)

                                return (
                                    <tr key={c.id} className="hover:bg-zinc-900/10 transition-colors">
                                        <td className="p-3 font-semibold text-zinc-200">{clientName}</td>
                                        <td className="p-3 text-zinc-400">{managerName}</td>
                                        
                                        {/* Fiscal Year End */}
                                        <td className="p-3 text-zinc-300 font-mono">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editFiscalYearEnd}
                                                    onChange={(e) => setEditFiscalYearEnd(e.target.value)}
                                                    className="bg-zinc-950 border-zinc-850 h-7 text-[10px] w-28 text-white px-2 rounded"
                                                />
                                            ) : fyEnd ? (
                                                new Date(fyEnd).toLocaleDateString('fr-CA')
                                            ) : (
                                                <span className="text-zinc-650 italic">Non définie</span>
                                            )}
                                        </td>

                                        {/* Calculated Due Date (+90 days) */}
                                        <td className="p-3 font-mono">
                                            {dueDate ? (
                                                <span className={isLate ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                                                    {dueDate.toLocaleDateString('fr-CA')}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-650 italic">Calcul impossible</span>
                                            )}
                                        </td>

                                        {/* Planned Date */}
                                        <td className="p-3 text-zinc-300 font-mono">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editPlannedDate}
                                                    onChange={(e) => setEditPlannedDate(e.target.value)}
                                                    className="bg-zinc-950 border-zinc-850 h-7 text-[10px] w-28 text-white px-2 rounded"
                                                />
                                            ) : c.aga_planned_date ? (
                                                new Date(c.aga_planned_date).toLocaleDateString('fr-CA')
                                            ) : (
                                                <span className="text-zinc-650 italic">Non planifiée</span>
                                            )}
                                        </td>

                                        {/* Completed Date */}
                                        <td className="p-3 text-zinc-300 font-mono">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={editCompletedDate}
                                                    onChange={(e) => setEditCompletedDate(e.target.value)}
                                                    className="bg-zinc-950 border-zinc-850 h-7 text-[10px] w-28 text-white px-2 rounded"
                                                />
                                            ) : c.aga_completed_date ? (
                                                new Date(c.aga_completed_date).toLocaleDateString('fr-CA')
                                            ) : (
                                                <span className="text-zinc-650 italic">Non complétée</span>
                                            )}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="p-3">
                                            {isEditing ? (
                                                <select
                                                    value={editStatus}
                                                    onChange={(e) => setEditStatus(e.target.value)}
                                                    className="bg-zinc-950 border border-zinc-850 h-7 text-[10px] text-white rounded px-2 outline-none"
                                                >
                                                    <option value="pending">En attente</option>
                                                    <option value="scheduled">Planifiée</option>
                                                    <option value="completed">Complétée</option>
                                                </select>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {c.aga_status === 'completed' || c.aga_completed_date ? (
                                                        <Badge className="bg-emerald-500/25 text-emerald-400 border border-emerald-800/40 text-[8px] font-bold py-0.5 px-2 rounded-full w-fit">
                                                            Complétée
                                                        </Badge>
                                                    ) : c.aga_status === 'scheduled' || c.aga_planned_date ? (
                                                        <Badge className="bg-purple-650/25 text-purple-400 border border-purple-800/40 text-[8px] font-bold py-0.5 px-2 rounded-full w-fit">
                                                            Planifiée
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-zinc-950 text-zinc-450 border border-zinc-800 text-[8px] font-bold py-0.5 px-2 rounded-full w-fit">
                                                            En attente
                                                        </Badge>
                                                    )}
                                                    {isLate && (
                                                        <Badge className="bg-rose-500/25 text-rose-400 border border-rose-800/40 text-[8px] font-black py-0.5 px-2 rounded-full w-fit flex items-center gap-0.5">
                                                            <AlertCircle className="h-2 w-2" /> En Retard
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-3 text-right">
                                            {isEditing ? (
                                                <div className="flex justify-end gap-1.5">
                                                    <Button
                                                        onClick={() => handleSave(c.id)}
                                                        disabled={isPending}
                                                        size="sm"
                                                        className="h-6 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center gap-0.5 font-bold"
                                                    >
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                                        Sauver
                                                    </Button>
                                                    <Button
                                                        onClick={handleCancelEdit}
                                                        disabled={isPending}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-zinc-400 hover:text-zinc-200 rounded"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => handleStartEdit(c)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-purple-400 hover:text-purple-300 hover:bg-zinc-900/40 rounded flex items-center justify-center gap-1 font-bold"
                                                >
                                                    <Edit2 className="h-2.5 w-2.5" />
                                                    Modifier
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
