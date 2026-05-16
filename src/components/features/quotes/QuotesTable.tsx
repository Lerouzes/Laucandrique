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

const statusMap: Record<string, { label: string, styles: string }> = {
    draft: { label: 'Brouillon', styles: 'bg-zinc-800 text-zinc-200 border-zinc-700' },
    sent: { label: 'Envoyée', styles: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    approved: { label: 'Approuvée', styles: 'bg-green-900/50 text-green-300 border-green-800' },
    denied: { label: 'Refusée', styles: 'bg-red-900/50 text-red-300 border-red-800' },
}

function QuoteRow({ quote }: { quote: any }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

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

    const canChangeStatus = quote.status !== 'approved' && quote.status !== 'denied'

    return (
        <TableRow
            key={quote.id}
            className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
            onClick={() => router.push(`/quotes/${quote.id}`)}
        >
            <TableCell className="text-zinc-100 font-mono">#{quote.quote_number}</TableCell>
            <TableCell className="font-medium text-white">{quote.title}</TableCell>
            <TableCell className="text-zinc-100">
                {quote.clients?.full_name}
                {quote.clients?.company_name && <span className="text-zinc-300 text-xs block">{quote.clients.company_name}</span>}
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={`border ${statusMap[quote.status]?.styles}`}>
                    {statusMap[quote.status]?.label || quote.status}
                </Badge>
            </TableCell>
            <TableCell className="text-white">${quote.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</TableCell>
            <TableCell className="text-zinc-100">
                {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: frCA })}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
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
                        onClick={() => router.push(`/quotes/${quote.id}/edit`)}
                        className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/50"
                        title="Modifier"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    {quote.status === 'approved' && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/planification?query=${encodeURIComponent(String(quote.quote_number || ''))}`)}
                            className="h-7 px-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/50"
                            title="Planifier ce projet"
                        >
                            <CalendarDays className="h-4 w-4" />
                        </Button>
                    )}
                    <span className="text-sm text-zinc-200 ml-1">Voir →</span>
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
                        <TableHead className="text-zinc-100 font-medium">#</TableHead>
                        <TableHead className="text-zinc-100 font-medium">Titre</TableHead>
                        <TableHead className="text-zinc-100 font-medium">Client</TableHead>
                        <TableHead className="text-zinc-100 font-medium">Statut</TableHead>
                        <TableHead className="text-zinc-100 font-medium">Montant Total</TableHead>
                        <TableHead className="text-zinc-100 font-medium">Créée le</TableHead>
                        <TableHead className="text-zinc-100 font-medium text-right">Actions</TableHead>
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
