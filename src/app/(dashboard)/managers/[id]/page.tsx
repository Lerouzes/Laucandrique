import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getManagerById, updateManagerAction } from '@/actions/managers'
import { getQuotes } from '@/actions/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function ManagerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [manager, quotes] = await Promise.all([getManagerById(id), getQuotes()])
  if (!manager) notFound()

  const managerQuotes = quotes.filter((q: any) => q.manager_id === id)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/settings" className="text-sm text-zinc-600 hover:text-zinc-900">← Retour aux paramètres</Link>
        <h2 className="text-2xl font-bold text-zinc-900 mt-2">{manager.first_name} {manager.last_name}</h2>
      </div>
      <form action={async (fd) => { 'use server'; await updateManagerAction(id, fd) }} className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <Input name="first_name" defaultValue={manager.first_name || ''} required />
        <Input name="last_name" defaultValue={manager.last_name || ''} required />
        <Input name="email" defaultValue={manager.email || ''} className="col-span-2" />
        <div className="col-span-2"><Button type="submit">Enregistrer</Button></div>
      </form>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900 mb-3">Historique des soumissions</h3>
        <div className="space-y-2 text-sm">
          {managerQuotes.length === 0 ? <p className="text-zinc-600">Aucune soumission.</p> : managerQuotes.map((q: any) => (
            <Link key={q.id} href={`/quotes/${q.id}`} className="block text-zinc-700 hover:text-zinc-900">#{q.quote_number} — {q.title} ({q.status})</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
