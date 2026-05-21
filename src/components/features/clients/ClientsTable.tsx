'use client'

import Link from 'next/link'

import { Database } from '@/types/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type Client = Database['public']['Tables']['clients']['Row']

export function ClientsTable({ data }: { data: Client[] }) {
    return (
        <div className="rounded-md border border-zinc-800 bg-transparent overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-900 border-b border-zinc-800">
                    <TableRow className="border-b border-zinc-800 hover:bg-zinc-900">
                        <TableHead className="text-zinc-400 font-medium">SDC #</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Nom complet</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Courriel</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Téléphone</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Ville</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Gestionnaire</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                                Aucun client trouvé.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((client) => (
                            <TableRow key={client.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-medium text-zinc-100"><Link href={`/clients/${client.id}`} className="hover:underline">{client.full_name}</Link></TableCell>
                                <TableCell className="text-zinc-300">
                                    {client.company_name || <span className="text-zinc-600">-</span>}
                                </TableCell>
                                <TableCell className="text-zinc-400">{client.email || '-'}</TableCell>
                                <TableCell className="text-zinc-400">{client.phone || '-'}</TableCell>
                                <TableCell className="text-zinc-400">{client.city || '-'}</TableCell>
                                <TableCell className="text-zinc-400">{(client as any).managers ? `${(client as any).managers.first_name} ${(client as any).managers.last_name}` : '-'}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
