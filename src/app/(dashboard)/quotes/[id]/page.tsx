import { notFound } from 'next/navigation'
import { getQuote } from '@/actions/quotes'
import { getSettings } from '@/actions/settings'
import { QuoteDetailView } from '@/components/features/quotes/QuoteDetailView'

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const quote = await getQuote(resolvedParams.id)

    if (!quote) {
        notFound()
    }

    const settings = await getSettings()

    return <QuoteDetailView quote={quote} settings={settings} />
}
