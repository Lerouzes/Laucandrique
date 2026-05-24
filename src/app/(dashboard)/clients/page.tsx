import { Suspense } from 'react'
import { getClients } from '@/actions/clients'
import { ClientsTable } from '@/components/features/clients/ClientsTable'
import { ClientFormDialog } from '@/components/features/clients/ClientFormDialog'
import { ClientExcelImport } from '@/components/features/clients/ClientExcelImport'
import { ClientsSearch } from '@/components/features/clients/ClientsSearch'
import { getManagers } from '@/actions/managers'

export default async function ClientsPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams.query || ''

    let clients: any[] = []
    let managers: any[] = []
    try {
        ;[clients, managers] = await Promise.all([getClients(query), getManagers()])
    } catch (err) {
        console.error('ClientsPage data fetch error:', err)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Clients</h2>
                    <p className="text-sm text-zinc-400">
                        Gérez vos clients professionnels et particuliers.
                    </p>
                </div>
                <div className="flex gap-2">
                    <ClientExcelImport managers={managers} existingClients={clients} />
                    <ClientFormDialog managers={managers} />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <ClientsSearch initialQuery={query} />
            </div>

            <Suspense fallback={<div className="h-[400px] animate-pulse bg-zinc-900 rounded-lg border border-zinc-800" />}>
                <ClientsTable data={clients} />
            </Suspense>
        </div>
    )
}
