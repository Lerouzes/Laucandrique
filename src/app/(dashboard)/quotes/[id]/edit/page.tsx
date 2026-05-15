import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getQuote } from '@/actions/quotes'
import { getClients } from '@/actions/clients'
import { getSettings } from '@/actions/settings'
import { QuoteBuilder } from '@/components/features/quotes/QuoteBuilder'

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const [quote, clients, settings] = await Promise.all([
        getQuote(resolvedParams.id),
        getClients(),
        getSettings(),
    ])

    if (!quote) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href={`/quotes/${quote.id}`} className="inline-flex items-center text-zinc-400 hover:text-zinc-100 text-sm transition-colors mb-3">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Retour à la soumission
                </Link>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Modifier la soumission #{quote.quote_number}</h2>
                <p className="text-sm text-zinc-400">
                    Mettez à jour les informations, lignes et montants de cette soumission.
                </p>
            </div>

            <QuoteBuilder clients={clients} settings={settings} initialQuote={quote} />
        </div>
    )
}
