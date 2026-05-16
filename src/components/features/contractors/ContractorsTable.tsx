import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function ContractorsTable({ data }: { data: any[] }) {
  return <div className='rounded-md border overflow-hidden'>
    <Table>
      <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Contact</TableHead><TableHead>Couleur</TableHead><TableHead>Compétences</TableHead></TableRow></TableHeader>
      <TableBody>
        {data.map(c => <TableRow key={c.id}>
          <TableCell className='font-medium'><Link href={`/contractors/${c.id}`} className='hover:underline'>{c.full_name}</Link></TableCell>
          <TableCell>{c.email || '-'}<div>{c.phone || ''}</div></TableCell>
          <TableCell><span className='inline-block h-4 w-4 rounded-full border mr-2' style={{ backgroundColor: c.color }} />{c.color}</TableCell>
          <TableCell className='space-x-1'>{(c.skills || []).map((s: string) => <Badge key={s} variant='secondary'>{s}</Badge>)}</TableCell>
        </TableRow>)}
      </TableBody>
    </Table>
  </div>
}
