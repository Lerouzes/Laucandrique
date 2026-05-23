import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContractorById, updateContractorAction } from '@/actions/contractors'
import { getQuotes } from '@/actions/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const SKILLS = ['Peinture', 'Menuiserie', 'Plomberie', 'Électricité', 'Plancher', 'Finition']

export default async function ContractorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: 'scheduled' | 'realized', start?: string, end?: string }>
}) {
  const { id } = await params
  const filters = await searchParams
  const mode = filters.mode === 'realized' ? 'realized' : 'scheduled'
  const startDate = filters.start || ''
  const endDate = filters.end || ''
  const [contractor, quotes] = await Promise.all([getContractorById(id), getQuotes()])
  if (!contractor) notFound()
  const related = quotes.filter((q: any) => q.contractor_id === id)

  const totalAssignedQuotes = quotes.filter((q: any) => q.contractor_id).length
  const contractorProjectShare = totalAssignedQuotes > 0 ? (related.length / totalAssignedQuotes) * 100 : 0
  const scheduledQuotes = related.filter((q: any) => q.status === 'approved' || q.status === 'sent' || q.status === 'draft')
  const realizedQuotes = related.filter((q: any) => q.status === 'completed')

  const withDateFilters = (items: any[], modeType: 'scheduled' | 'realized') => items.filter((q: any) => {
    const sourceDate = modeType === 'realized'
      ? q.projects?.[0]?.completed_at || q.updated_at || q.created_at
      : q.projects?.[0]?.start_date || q.created_at

    if (!sourceDate) return false

    const d = new Date(sourceDate)
    if (Number.isNaN(d.getTime())) return false

    if (startDate) {
      const s = new Date(`${startDate}T00:00:00`)
      if (d < s) return false
    }

    if (endDate) {
      const e = new Date(`${endDate}T23:59:59`)
      if (d > e) return false
    }

    return true
  })

  const filteredScheduled = withDateFilters(scheduledQuotes, 'scheduled')
  const filteredRealized = withDateFilters(realizedQuotes, 'realized')

  const scheduledValue = filteredScheduled
    .reduce((acc: number, q: any) => acc + Number(q.total || 0), 0)
  const realizedValue = filteredRealized
    .reduce((acc: number, q: any) => acc + Number(q.total || 0), 0)
  const selectedValue = mode === 'realized' ? realizedValue : scheduledValue

  return <div className='space-y-6 max-w-3xl'>
    <div>
      <Link href='/contractors' className='text-sm text-zinc-400 hover:text-zinc-100'>← Retour aux contracteurs</Link>
      <h2 className='text-2xl font-bold text-zinc-100 mt-2'>{contractor.full_name}</h2>
    </div>
    <div className='grid gap-4 lg:grid-cols-2'>
      <form action={async (fd) => { 'use server'; await updateContractorAction(id, fd) }} className='grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-transparent p-4 text-zinc-100'>
      <Input name='full_name' defaultValue={contractor.full_name || ''} required placeholder='Nom complet de l’entrepreneur' aria-label='Nom complet de l’entrepreneur' />
      <Input name='color' type='color' defaultValue={contractor.color || '#185FAD'} className='h-10 p-1' aria-label='Couleur d’affichage' />
      <Input name='email' type='email' defaultValue={contractor.email || ''} placeholder='Adresse courriel (ex: nom@entreprise.com)' aria-label='Adresse courriel' />
      <Input name='phone' type='tel' defaultValue={contractor.phone || ''} placeholder='Numéro de téléphone (ex: 514-555-1234)' aria-label='Numéro de téléphone' />
      <div className='col-span-2 grid grid-cols-2 gap-2'>
        {SKILLS.map((s) => <label key={s} className='text-sm flex items-center gap-2 text-zinc-300'><input type='checkbox' name='skills' value={s} defaultChecked={(contractor.skills || []).includes(s)} />{s}</label>)}
      </div>
      <Textarea name='notes' defaultValue={contractor.notes || ''} className='col-span-2' />
      <div className='col-span-2'><Button type='submit'>Enregistrer</Button></div>
      </form>

      <div className='rounded-lg border border-zinc-800 bg-transparent p-4 text-zinc-100'>
        <h3 className='font-semibold mb-3'>Statistiques de l’entrepreneur</h3>
        <div className='space-y-2 text-sm text-zinc-300'>
          <p>Projets attribués: <span className='text-zinc-100 font-medium'>{related.length}</span></p>
          <p>Part des projets: <span className='text-zinc-100 font-medium'>{contractorProjectShare.toFixed(1)}%</span></p>
          <form className='space-y-2'>
            <div className='grid grid-cols-2 gap-2'>
              <Button type='submit' name='mode' value='scheduled' variant={mode === 'scheduled' ? 'default' : 'outline'}>Planifié</Button>
              <Button type='submit' name='mode' value='realized' variant={mode === 'realized' ? 'default' : 'outline'}>Réalisé</Button>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <Input type='date' name='start' defaultValue={startDate} />
              <Input type='date' name='end' defaultValue={endDate} />
            </div>
            <div className='flex gap-2'>
              <Button type='submit' variant='outline'>Appliquer</Button>
              <Link href={`/contractors/${id}?mode=${mode}`} className='inline-flex h-8 items-center rounded-lg border border-zinc-700 px-3 text-xs hover:bg-zinc-800'>Réinitialiser</Link>
            </div>
          </form>
          <p>Valeur ({mode === 'realized' ? 'réalisée' : 'planifiée'}): <span className='text-zinc-100 font-medium'>${selectedValue.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          <p className='text-xs text-zinc-400'>Soumissions dans la période: {mode === 'realized' ? filteredRealized.length : filteredScheduled.length}</p>
        </div>
      </div>
    </div>
    <div className='rounded-lg border border-zinc-800 bg-transparent p-4'>
      <h3 className='font-semibold mb-3 text-zinc-100'>Historique des soumissions</h3>
      <div className='space-y-2 text-sm text-zinc-300'>{related.length === 0 ? 'Aucune soumission.' : related.map((q: any) => <Link key={q.id} href={`/quotes/${q.id}`} className='block hover:underline hover:text-zinc-100'>#{q.quote_number} — {q.title} ({q.status})</Link>)}</div>
    </div>
  </div>
}
