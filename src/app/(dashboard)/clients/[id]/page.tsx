import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { getClientById, updateClientAction, getContractForClient } from '@/actions/clients'
import { getManagers } from '@/actions/managers'
import { getQuotes } from '@/actions/quotes'
import { getSyndicateWorkloadAction } from '@/actions/team-management'
import { Badge } from '@/components/ui/badge'
import { ClientDetailForm } from '@/components/features/clients/ClientDetailForm'
import { ArrowLeft } from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch client + contract separately (direct query avoids join caching issues)
  const [client, managers, quotes, contractDirect, workload] = await Promise.all([
    getClientById(id),
    getManagers(),
    getQuotes(),
    getContractForClient(id),
    getSyndicateWorkloadAction(id)
  ])

  if (!client) notFound()

  const clientQuotes = quotes.filter((q: any) => q.client_id === id)
  // Prefer the direct contract fetch over the join result (with robust support for array and object shapes)
  const contractJoined = Array.isArray(client.contracts) ? client.contracts[0] : client.contracts
  const contract = contractDirect || contractJoined || null
  const doorsCount = (client.doors as any[])?.length || 0
  const isStatusActive = client.status !== 'inactive'

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-4">
        <div>
          <Link href="/clients" className="text-xs text-zinc-400 hover:text-zinc-100 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux clients
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
              {client.company_name || 'Syndicat sans nom'}
            </h2>
            <Badge className={isStatusActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}>
              {isStatusActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">SDC #: <span className="font-semibold text-zinc-300">{client.full_name || 'N/A'}</span></p>
        </div>
      </div>

      <ClientDetailForm
        key={`${contract?.package_name ?? ''}-${contract?.monthly_fee ?? ''}-${contract?.start_date ?? ''}-${doorsCount}`}
        clientId={id}
        client={client}
        managers={managers}
        clientQuotes={clientQuotes}
        contract={contract}
        doorsCount={doorsCount}
        workload={workload || []}
        saveAction={updateClientAction}
      />
    </div>
  )
}
