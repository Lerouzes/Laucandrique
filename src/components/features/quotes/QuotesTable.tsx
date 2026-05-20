'use client'

import { useState, useTransition } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'
import { CalendarDays, CheckCircle, Pencil, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { updateQuoteStatus } from '@/actions/quotes'
import { scheduleProjectStartByQuote } from '@/actions/projects'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

const statusMap: Record<string, { label: string, styles: string }> = {
    draft: { label: 'Brouillon', styles: 'bg-zinc-800 text-zinc-200 border-zinc-700' },
    sent: { label: 'Envoyée', styles: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    approved: { label: 'Approuvée', styles: 'bg-green-900/50 text-green-300 border-green-800' },
    completed: { label: 'Complétée', styles: 'bg-blue-900/50 text-blue-300 border-blue-800' },
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

function QuoteRow({ quote }: { quote: any }) {
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

    const canChangeStatus = quote.status !== 'approved' && quote.status !== 'denied' && quote.status !== 'completed'
    const canEditQuote = quote.status !== 'completed'
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
            className="border-b border-zinc-800 hover:bg-zinc-800/50"
        >
            <TableCell className="text-zinc-300 font-mono">#{quote.quote_number}</TableCell>
            <TableCell className="font-medium text-zinc-100">{quote.title}</TableCell>
            <TableCell className="text-zinc-300">
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
                            <PopoverTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/50"
                                    title={scheduledDate ? 'Voir / modifier la date' : 'Planifier ce projet'}
                                >
                                    <CalendarDays className="h-4 w-4" />
                                    <span className="ml-1 hidden md:inline">
                                        {scheduledDate ? formatSafeDateTime(scheduledDate) : 'Planifier'}
                                    </span>
                                </Button>
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
                                    initialFocus
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
    return (
        <div className="rounded-md border border-zinc-800 bg-transparent overflow-hidden">
            <Table>
                <TableHeader className="bg-transparent border-b border-zinc-800">
                    <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-300 font-medium">#</TableHead>
                        <TableHead className="text-zinc-300 font-medium">Titre</TableHead>
                        <TableHead className="text-zinc-300 font-medium">Client</TableHead>
                        <TableHead className="text-zinc-300 font-medium">Statut</TableHead>
                        <TableHead className="text-zinc-300 font-medium">Montant Total</TableHead>
                        <TableHead className="text-zinc-300 font-medium">Créée le</TableHead>
                        <TableHead className="text-zinc-300 font-medium text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-zinc-300">
                                Aucune soumission trouvée.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((quote) => <QuoteRow key={quote.id} quote={quote} />)
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
