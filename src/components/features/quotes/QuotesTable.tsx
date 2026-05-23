'use client'

import { useState, useTransition, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'
import { CalendarDays, CheckCircle, Pencil, XCircle, Trash2, ShieldAlert, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { updateQuoteStatus, deleteQuoteAction, deleteQuotesAction, updateQuotesStatusAction } from '@/actions/quotes'
import { scheduleProjectStartByQuote } from '@/actions/projects'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const statusMap: Record<string, { label: string, styles: string }> = {
    draft: { label: 'Brouillon', styles: 'bg-zinc-800 text-zinc-200 border-zinc-700' },
    sent: { label: 'Envoyée', styles: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    approved: { label: 'Approuvée', styles: 'bg-green-900/50 text-green-300 border-green-800' },
    completed: { label: 'Complétée', styles: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    billed: { label: 'Facturée', styles: 'bg-purple-900/50 text-purple-300 border-purple-800' },
    denied: { label: 'Refusée', styles: 'bg-red-900/50 text-red-300 border-red-800' },
}

function formatSafeDate(value: string | null | undefined) {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    const localDate = new Date(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate()
    )
    return format(localDate, 'dd MMM yyyy', { locale: frCA })
}

function formatSafeDateTime(value: string | null | undefined) {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return format(parsed, "dd MMM yyyy 'à' HH:mm", { locale: frCA })
}

function parseCoercedLocalDate(value: string | null | undefined) {
    if (!value) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return undefined
    return new Date(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate()
    )
}

function QuoteRow({ 
    quote, 
    isSelected, 
    onToggleSelect, 
    onDeleteInitiated 
}: { 
    quote: any
    isSelected: boolean
    onToggleSelect: (id: string) => void
    onDeleteInitiated: (id: string, quoteNumber: number) => void
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isScheduleOpen, setIsScheduleOpen] = useState(false)
    const [tempDate, setTempDate] = useState<Date | undefined>(undefined)
    const [tempTime, setTempTime] = useState<string>("08:00")

    const handleStatusChange = (e: React.MouseEvent, status: 'approved' | 'denied') => {
        e.stopPropagation()
        startTransition(async () => {
            try {
                await updateQuoteStatus(quote.id, status, quote.client_id, quote.title, quote.estimated_duration_days)
                toast.success(`Soumission ${status === 'approved' ? 'approuvée' : 'refusée'}.`)
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const canChangeStatus = quote.status !== 'approved' && quote.status !== 'denied' && quote.status !== 'completed' && quote.status !== 'billed'
    const canEditQuote = true
    const isSchedulable = quote.status === 'approved'
    const scheduledDate = quote.projects?.[0]?.start_date

    const handleOpenChange = (open: boolean) => {
        setIsScheduleOpen(open)
        if (open) {
            if (scheduledDate) {
                const dateObj = new Date(scheduledDate)
                setTempDate(dateObj)
                const hrs = String(dateObj.getHours()).padStart(2, '0')
                const mins = String(dateObj.getMinutes()).padStart(2, '0')
                setTempTime(`${hrs}:${mins}`)
            } else {
                setTempDate(undefined)
                setTempTime("08:00")
            }
        }
    }

    const handleScheduleDate = (date: Date | undefined, timeStr: string) => {
        if (!date) return
        startTransition(async () => {
            try {
                const [hours, minutes] = timeStr.split(':').map(Number)
                const localDateWithTime = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    hours || 0,
                    minutes || 0,
                    0
                )
                await scheduleProjectStartByQuote(quote.id, localDateWithTime.toISOString())
                toast.success('Date et heure de début enregistrées.')
                setIsScheduleOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    return (
        <TableRow
            key={quote.id}
            className={`border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer ${isSelected ? 'bg-zinc-800/20' : ''}`}
            onClick={() => router.push(`/quotes/${quote.id}/edit`)}
        >
            <TableCell className="w-12" onClick={e => e.stopPropagation()}>
                <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(quote.id)}
                />
            </TableCell>
            <TableCell className="text-cyan-400 font-mono font-medium hover:text-cyan-300 hover:underline transition-colors">#{quote.quote_number}</TableCell>
            <TableCell className="font-medium text-zinc-100 whitespace-normal break-words max-w-[250px]">{quote.title}</TableCell>
            <TableCell className="text-zinc-300 whitespace-normal break-words max-w-[200px]">
                {quote.clients?.full_name}
                {quote.clients?.company_name && <span className="text-zinc-300 text-xs block">{quote.clients.company_name}</span>}
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={`border ${statusMap[quote.status]?.styles}`}>
                    {statusMap[quote.status]?.label || quote.status}
                </Badge>
            </TableCell>
            <TableCell className="text-zinc-100">${quote.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</TableCell>
            <TableCell className="text-zinc-300">
                {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: frCA })}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    {isSchedulable ? (
                        <Popover open={isScheduleOpen} onOpenChange={handleOpenChange}>
                            <PopoverTrigger
                                render={
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/50"
                                        title={scheduledDate ? 'Voir / modifier la date' : 'Planifier ce projet'}
                                    />
                                }
                            >
                                <CalendarDays className="h-4 w-4" />
                                <span className="ml-1 hidden md:inline">
                                    {scheduledDate ? formatSafeDateTime(scheduledDate) : 'Planifier'}
                                </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 bg-zinc-950 border-zinc-800 space-y-4" align="end">
                                <div className="space-y-1">
                                    <h4 className="font-medium text-sm text-zinc-100">Planifier le projet</h4>
                                    <p className="text-xs text-zinc-400">Sélectionnez la date et l'heure de début.</p>
                                </div>
                                <Calendar
                                    mode="single"
                                    selected={tempDate}
                                    onSelect={setTempDate}
                                    disabled={quote.status === 'completed' || isPending}
                                    className="rounded-md border border-zinc-800 bg-zinc-950 p-1 mx-auto"
                                />
                                <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-900">
                                    <span className="text-xs font-medium text-zinc-300">Heure de début</span>
                                    <input
                                        type="time"
                                        value={tempTime}
                                        onChange={(e) => setTempTime(e.target.value)}
                                        disabled={quote.status === 'completed' || isPending}
                                        className="h-8 px-2 rounded border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 w-28"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    disabled={!tempDate || isPending}
                                    onClick={() => handleScheduleDate(tempDate, tempTime)}
                                    className="w-full h-8 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                                >
                                    {isPending ? 'Enregistrement...' : 'Enregistrer la planification'}
                                </Button>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <span className="text-zinc-500">—</span>
                    )}

                    {canChangeStatus && (
                        <>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPending}
                                onClick={e => handleStatusChange(e, 'approved')}
                                className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-950/50"
                                title="Approuver"
                            >
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPending}
                                onClick={e => handleStatusChange(e, 'denied')}
                                className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                                title="Refuser"
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={!canEditQuote}
                        onClick={() => router.push(`/quotes/${quote.id}/edit`)}
                        className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/50 disabled:text-zinc-600 disabled:hover:bg-transparent"
                        title={canEditQuote ? 'Modifier' : 'Modification désactivée (complétée)'}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteInitiated(quote.id, quote.quote_number)}
                        className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        title="Supprimer"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/quotes/${quote.id}`)}
                        className="h-7 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                        title="Voir la soumission"
                    >
                        Voir →
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}

export function QuotesTable({ data }: { data: any[] }) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isPending, startTransition] = useTransition()

    const [sortField, setSortField] = useState<string | null>('created_at')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    useEffect(() => {
        const savedField = localStorage.getItem('quotes_sort_field')
        const savedDirection = localStorage.getItem('quotes_sort_direction')
        if (savedField !== null) {
            setSortField(savedField === 'null' ? null : savedField)
        }
        if (savedDirection === 'asc' || savedDirection === 'desc') {
            setSortDirection(savedDirection)
        }
    }, [])

    const handleSort = (field: string) => {
        let nextField = sortField
        let nextDirection = sortDirection
        if (sortField === field) {
            nextDirection = sortDirection === 'asc' ? 'desc' : 'asc'
            setSortDirection(nextDirection)
        } else {
            nextField = field
            nextDirection = 'asc'
            setSortField(field)
            setSortDirection(nextDirection)
        }
        localStorage.setItem('quotes_sort_field', String(nextField))
        localStorage.setItem('quotes_sort_direction', nextDirection)
    }

    const sortedData = [...data].sort((a, b) => {
        if (!sortField) return 0
        
        let aVal: any = a[sortField]
        let bVal: any = b[sortField]
        
        if (sortField === 'client') {
            aVal = a.clients?.full_name || ''
            bVal = b.clients?.full_name || ''
        }
        
        if (aVal === undefined || aVal === null) aVal = ''
        if (bVal === undefined || bVal === null) bVal = ''
        
        if (typeof aVal === 'string') {
            return sortDirection === 'asc'
                ? aVal.localeCompare(bVal, 'fr-CA', { numeric: true, sensitivity: 'base' })
                : bVal.localeCompare(aVal, 'fr-CA', { numeric: true, sensitivity: 'base' })
        } else {
            return sortDirection === 'asc'
                ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
                : (bVal > aVal ? 1 : bVal < aVal ? -1 : 0)
        }
    })

    const renderHeader = (label: string, field: string, className?: string) => {
        const isSorted = sortField === field
        return (
            <TableHead 
                className={`text-zinc-300 font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors ${className || ''}`}
                onClick={() => handleSort(field)}
            >
                <div className="flex items-center gap-1">
                    {label}
                    {isSorted ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-cyan-400" /> : <ArrowDown className="h-3 w-3 text-cyan-400" />
                    ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                    )}
                </div>
            </TableHead>
        )
    }

    // Confirmation dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [quoteToDelete, setQuoteToDelete] = useState<{ id: string, quoteNumber: number } | null>(null)

    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
    const [bulkStatusChangeOpen, setBulkStatusChangeOpen] = useState(false)
    const [statusToApply, setStatusToApply] = useState<'draft' | 'sent' | 'approved' | 'denied' | 'completed' | 'billed' | null>(null)

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedIds(new Set(data.map(q => q.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleToggleSelect = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedIds(next)
    }

    const handleDeleteSingle = (id: string, quoteNumber: number) => {
        setQuoteToDelete({ id, quoteNumber })
        setDeleteDialogOpen(true)
    }

    const confirmDeleteSingle = () => {
        if (!quoteToDelete) return
        startTransition(async () => {
            try {
                await deleteQuoteAction(quoteToDelete.id)
                toast.success(`Soumission #${quoteToDelete.quoteNumber} supprimée avec succès.`)
                // Remove from selection if it was selected
                const next = new Set(selectedIds)
                next.delete(quoteToDelete.id)
                setSelectedIds(next)
                setDeleteDialogOpen(false)
                setQuoteToDelete(null)
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const confirmBulkDelete = () => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return
        startTransition(async () => {
            try {
                await deleteQuotesAction(ids)
                toast.success(`${ids.length} soumissions supprimées avec succès.`)
                setSelectedIds(new Set())
                setBulkDeleteDialogOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const confirmBulkStatusChange = (status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed' | 'billed') => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return
        startTransition(async () => {
            try {
                await updateQuotesStatusAction(ids, status)
                toast.success(`Statut de ${ids.length} soumissions mis à jour.`)
                setSelectedIds(new Set())
                setBulkStatusChangeOpen(false)
                setStatusToApply(null)
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    const allSelected = data.length > 0 && selectedIds.size === data.length
    const someSelected = selectedIds.size > 0 && selectedIds.size < data.length

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                        </Badge>
                        <span className="text-xs text-zinc-400">Actions groupées sur les éléments sélectionnés</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={isPending}
                                        className="h-8 border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                    />
                                }
                            >
                                Changer le statut
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-950 border border-zinc-800 text-zinc-200" align="end">
                                <DropdownMenuItem onClick={() => { setStatusToApply('draft'); setBulkStatusChangeOpen(true) }}>
                                    Brouillon
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setStatusToApply('sent'); setBulkStatusChangeOpen(true) }}>
                                    Envoyée
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setStatusToApply('approved'); setBulkStatusChangeOpen(true) }}>
                                    Approuvée
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setStatusToApply('completed'); setBulkStatusChangeOpen(true) }}>
                                    Complétée
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setStatusToApply('billed'); setBulkStatusChangeOpen(true) }}>
                                    Facturée
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setStatusToApply('denied'); setBulkStatusChangeOpen(true) }}>
                                    Refusée
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={isPending}
                            onClick={() => setBulkDeleteDialogOpen(true)}
                            className="h-8 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-md border border-zinc-800 bg-transparent overflow-x-auto">
                <Table>
                    <TableHeader className="bg-transparent border-b border-zinc-800">
                        <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                            <TableHead className="w-12 text-zinc-300 font-medium">
                                <Checkbox 
                                    checked={(allSelected ? true : someSelected ? 'mixed' : false) as any}
                                    onCheckedChange={(checked) => handleSelectAll(checked)}
                                    aria-label="Sélectionner tout"
                                />
                            </TableHead>
                            {renderHeader('#', 'quote_number')}
                            {renderHeader('Titre', 'title', 'whitespace-normal min-w-[150px] max-w-[250px]')}
                            {renderHeader('Client', 'client', 'whitespace-normal min-w-[150px] max-w-[200px]')}
                            {renderHeader('Statut', 'status')}
                            {renderHeader('Montant Total', 'total')}
                            {renderHeader('Créée le', 'created_at')}
                            <TableHead className="text-zinc-300 font-medium text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-zinc-300">
                                    Aucune soumission trouvée.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedData.map((quote) => (
                                <QuoteRow 
                                    key={quote.id} 
                                    quote={quote} 
                                    isSelected={selectedIds.has(quote.id)}
                                    onToggleSelect={handleToggleSelect}
                                    onDeleteInitiated={handleDeleteSingle}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog Confirmation Supprimer Unique */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400">
                            <ShieldAlert className="h-5 w-5 animate-pulse" />
                            Supprimer la soumission
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Êtes-vous sûr de vouloir supprimer la soumission <strong>#{quoteToDelete?.quoteNumber}</strong> ?
                            <br />
                            <span className="text-red-400/80 font-medium text-xs mt-1 block">
                                Cette action est irréversible et supprimera également tous les éléments, images et projets associés.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="bg-zinc-950 border-t border-zinc-900 mt-2">
                        <DialogClose
                            render={
                                <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900" />
                            }
                        >
                            Annuler
                        </DialogClose>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isPending}
                            onClick={confirmDeleteSingle}
                            className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                        >
                            {isPending ? 'Suppression...' : 'Confirmer la suppression'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Confirmation Supprimer Bulk */}
            <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400">
                            <ShieldAlert className="h-5 w-5 animate-pulse" />
                            Supprimer la sélection ({selectedIds.size})
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Êtes-vous sûr de vouloir supprimer les <strong>{selectedIds.size}</strong> soumissions sélectionnées ?
                            <br />
                            <span className="text-red-400/80 font-medium text-xs mt-1 block">
                                Cette action est irréversible et supprimera également tous les éléments, images et projets associés à ces soumissions.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="bg-zinc-950 border-t border-zinc-900 mt-2">
                        <DialogClose
                            render={
                                <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900" />
                            }
                        >
                            Annuler
                        </DialogClose>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isPending}
                            onClick={confirmBulkDelete}
                            className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                        >
                            {isPending ? 'Suppression...' : 'Confirmer la suppression'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Confirmation Statut Bulk */}
            <Dialog open={bulkStatusChangeOpen} onOpenChange={setBulkStatusChangeOpen}>
                <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-cyan-400">
                            <ShieldAlert className="h-5 w-5 text-cyan-400" />
                            Modifier le statut ({selectedIds.size})
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Voulez-vous changer le statut des <strong>{selectedIds.size}</strong> soumissions sélectionnées pour : <strong>{statusToApply ? (statusMap[statusToApply]?.label || statusToApply) : ''}</strong> ?
                            {statusToApply === 'approved' && (
                                <span className="text-cyan-400/80 font-medium text-xs mt-1 block">
                                    Les soumissions n'ayant pas de projet lié créeront automatiquement un nouveau projet non planifié.
                                </span>
                            )}
                            {statusToApply === 'completed' && (
                                <span className="text-cyan-400/80 font-medium text-xs mt-1 block">
                                    Les soumissions n'ayant pas de projet lié créeront automatiquement un nouveau projet complété.
                                </span>
                            )}
                            {statusToApply === 'billed' && (
                                <span className="text-purple-400/80 font-medium text-xs mt-1 block">
                                    Attention : Facturer des soumissions en lot n'est pas recommandé si les articles doivent être validés individuellement.
                                </span>
                            )}
                            {(statusToApply === 'draft' || statusToApply === 'sent' || statusToApply === 'denied') && (
                                <span className="text-amber-400/80 font-medium text-xs mt-1 block">
                                    Attention : les projets déjà associés à ces soumissions seront définitivement supprimés.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="bg-zinc-950 border-t border-zinc-900 mt-2">
                        <DialogClose
                            render={
                                <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900" />
                            }
                        >
                            Annuler
                        </DialogClose>
                        <Button 
                            size="sm"
                            disabled={isPending || !statusToApply}
                            onClick={() => statusToApply && confirmBulkStatusChange(statusToApply)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                        >
                            {isPending ? 'Mise à jour...' : 'Confirmer le changement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

