import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getQuotes } from '@/actions/quotes'
import { QuotesTable } from '@/components/features/quotes/QuotesTable'
import { QuotesSearch } from '@/components/features/quotes/QuotesSearch'

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string, status?: string }>
}) {
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams.query || ''
    const status = resolvedSearchParams.status || ''

    const quotes = await getQuotes(query, status)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Soumissions</h2>
                    <p className="text-sm text-zinc-400">
                        Créez et gérez les soumissions pour vos clients.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/quotes/new" className="group/button inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle soumission
                        </Link>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <QuotesSearch initialQuery={query} initialStatus={status} />
            </div>

            <Suspense fallback={<div className="h-[400px] animate-pulse bg-zinc-900 rounded-lg border border-zinc-800" />}>
                <QuotesTable data={quotes} />
            </Suspense>
        </div>
    )
}
