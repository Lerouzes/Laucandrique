import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContractorById, updateContractorAction } from '@/actions/contractors'
import { getQuotes } from '@/actions/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const SKILLS = ['Peinture', 'Menuiserie', 'Plomberie', 'Électricité', 'Plancher', 'Finition']

export default async function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [contractor, quotes] = await Promise.all([getContractorById(id), getQuotes()])
  if (!contractor) notFound()
  const related = quotes.filter((q: any) => q.contractor_id === id)

  return <div className='space-y-6 max-w-3xl'>
    <div>
      <Link href='/contractors' className='text-sm text-zinc-400 hover:text-zinc-100'>← Retour aux contracteurs</Link>
      <h2 className='text-2xl font-bold text-zinc-100 mt-2'>{contractor.full_name}</h2>
    </div>
    <form action={async (fd) => { 'use server'; await updateContractorAction(id, fd) }} className='grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-transparent p-4 text-zinc-100'>
      <Input name='full_name' defaultValue={contractor.full_name || ''} required />
      <Input name='color' type='color' defaultValue={contractor.color || '#185FAD'} className='h-10 p-1' />
      <Input name='email' defaultValue={contractor.email || ''} />
      <Input name='phone' defaultValue={contractor.phone || ''} />
      <div className='col-span-2 grid grid-cols-2 gap-2'>
        {SKILLS.map((s) => <label key={s} className='text-sm flex items-center gap-2 text-zinc-300'><input type='checkbox' name='skills' value={s} defaultChecked={(contractor.skills || []).includes(s)} />{s}</label>)}
      </div>
      <Textarea name='notes' defaultValue={contractor.notes || ''} className='col-span-2' />
      <div className='col-span-2'><Button type='submit'>Enregistrer</Button></div>
    </form>
    <div className='rounded-lg border border-zinc-800 bg-transparent p-4'>
      <h3 className='font-semibold mb-3 text-zinc-100'>Historique des soumissions</h3>
      <div className='space-y-2 text-sm text-zinc-300'>{related.length === 0 ? 'Aucune soumission.' : related.map((q: any) => <Link key={q.id} href={`/quotes/${q.id}`} className='block hover:underline hover:text-zinc-100'>#{q.quote_number} — {q.title} ({q.status})</Link>)}</div>
    </div>
  </div>
}
