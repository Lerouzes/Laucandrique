import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getManagerById, getManagerTeams, updateManagerAction } from '@/actions/managers'
import { getQuotes } from '@/actions/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function ManagerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [manager, quotes, managerTeams] = await Promise.all([getManagerById(id), getQuotes(), getManagerTeams()])
  if (!manager) notFound()

  const managerQuotes = quotes.filter((q: any) => q.manager_id === id)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/settings" className="text-sm text-zinc-400 hover:text-zinc-100">← Retour aux paramètres</Link>
        <h2 className="text-2xl font-bold text-zinc-100 mt-2">{manager.first_name} {manager.last_name}</h2>
      </div>
      <form action={async (fd) => { 'use server'; await updateManagerAction(id, fd) }} className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <Input name="first_name" defaultValue={manager.first_name || ''} required />
        <Input name="last_name" defaultValue={manager.last_name || ''} required />
        <Input name="email" type="email" defaultValue={manager.email || ''} placeholder="Adresse courriel" className="col-span-2" />
        <Input name="phone" type="tel" defaultValue={manager.phone || ''} placeholder="Numéro de téléphone" className="col-span-2" />
        <select name="team_id" defaultValue={manager.team_id || ''} className="col-span-2 h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-zinc-100">
          <option value="">Sans équipe</option>
          {managerTeams.map((team: any) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <div className="col-span-2"><Button type="submit">Enregistrer</Button></div>
      </form>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="font-semibold text-zinc-100 mb-3">Historique des soumissions</h3>
        <div className="space-y-2 text-sm">
          {managerQuotes.length === 0 ? <p className="text-zinc-400">Aucune soumission.</p> : managerQuotes.map((q: any) => (
            <Link key={q.id} href={`/quotes/${q.id}`} className="block text-zinc-300 hover:text-zinc-100">#{q.quote_number} — {q.title} ({q.status})</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
