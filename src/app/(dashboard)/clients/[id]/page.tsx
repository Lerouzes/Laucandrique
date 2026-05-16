import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClientById, updateClientAction } from '@/actions/clients'
import { getManagers } from '@/actions/managers'
import { getQuotes } from '@/actions/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [client, managers, quotes] = await Promise.all([getClientById(id), getManagers(), getQuotes()])
  if (!client) notFound()

  const clientQuotes = quotes.filter((q: any) => q.client_id === id)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/clients" className="text-sm text-zinc-600 hover:text-zinc-900">← Retour aux clients</Link>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2">{client.full_name}</h2>
      </div>

      <form action={async (fd) => { 'use server'; await updateClientAction(id, fd) }} className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <Input name="full_name" defaultValue={client.full_name || ''} placeholder="Nom complet" required />
        <Input name="company_name" defaultValue={client.company_name || ''} placeholder="Compagnie" />
        <Input name="email" defaultValue={client.email || ''} placeholder="Courriel" />
        <Input name="phone" defaultValue={client.phone || ''} placeholder="Téléphone" />
        <Input name="address" defaultValue={client.address || ''} placeholder="Adresse" className="col-span-2" />
        <Input name="city" defaultValue={client.city || ''} placeholder="Ville" />
        <Input name="province" defaultValue={client.province || ''} placeholder="Province" />
        <Input name="postal_code" defaultValue={client.postal_code || ''} placeholder="Code postal" />
        <select name="manager_id" defaultValue={client.manager_id || ''} className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-zinc-900">
          <option value="">Aucun gestionnaire</option>
          {managers.map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
        </select>
        <div className="col-span-2"><Button type="submit">Enregistrer</Button></div>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900 mb-3">Historique des soumissions</h3>
        <div className="space-y-2 text-sm">
          {clientQuotes.length === 0 ? <p className="text-zinc-600">Aucune soumission.</p> : clientQuotes.map((q: any) => (
            <Link key={q.id} href={`/quotes/${q.id}`} className="block text-zinc-700 hover:text-zinc-900">#{q.quote_number} — {q.title} ({q.status})</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
