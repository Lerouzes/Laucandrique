'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

import { Database } from '@/types/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DeleteClientButton } from './DeleteClientButton'

type Client = Database['public']['Tables']['clients']['Row']

export function ClientsTable({ data }: { data: Client[] }) {
    const router = useRouter()
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    useEffect(() => {
        const savedField = localStorage.getItem('clients_sort_field')
        const savedDirection = localStorage.getItem('clients_sort_direction')
        if (savedField !== null) {
            setSortField(savedField === 'null' ? null : savedField)
        }
        if (savedDirection === 'asc' || savedDirection === 'desc') {
            setSortDirection(savedDirection)
        }
    }, [])

    const handleSort = (field: string) => {
        let nextField = sortField
        let nextDirection = sortDirection
        if (sortField === field) {
            nextDirection = sortDirection === 'asc' ? 'desc' : 'asc'
            setSortDirection(nextDirection)
        } else {
            nextField = field
            nextDirection = 'asc'
            setSortField(field)
            setSortDirection(nextDirection)
        }
        localStorage.setItem('clients_sort_field', String(nextField))
        localStorage.setItem('clients_sort_direction', nextDirection)
    }

    const sortedData = [...data].sort((a, b) => {
        if (!sortField) return 0

        let aVal: any = ''
        let bVal: any = ''

        if (sortField === 'manager') {
            const aMgr = (a as any).managers
            const bMgr = (b as any).managers
            aVal = aMgr ? `${aMgr.first_name || ''} ${aMgr.last_name || ''}`.trim() : ''
            bVal = bMgr ? `${bMgr.first_name || ''} ${bMgr.last_name || ''}`.trim() : ''
        } else {
            aVal = (a as any)[sortField] || ''
            bVal = (b as any)[sortField] || ''
        }

        if (typeof aVal === 'string') {
            return sortDirection === 'asc'
                ? aVal.localeCompare(bVal, 'fr-CA', { numeric: true, sensitivity: 'base' })
                : bVal.localeCompare(aVal, 'fr-CA', { numeric: true, sensitivity: 'base' })
        } else {
            return sortDirection === 'asc'
                ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
                : (bVal > aVal ? 1 : bVal < aVal ? -1 : 0)
        }
    })

    const renderHeader = (label: string, field: string) => {
        const isSorted = sortField === field
        return (
            <TableHead 
                className="text-zinc-300 font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                onClick={() => handleSort(field)}
            >
                <div className="flex items-center gap-1">
                    {label}
                    {isSorted ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-cyan-400" /> : <ArrowDown className="h-3 w-3 text-cyan-400" />
                    ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                    )}
                </div>
            </TableHead>
        )
    }

    return (
        <div className="rounded-md border border-zinc-800 bg-transparent overflow-x-auto">
            <Table>
                <TableHeader className="bg-zinc-900 border-b border-zinc-800">
                    <TableRow className="border-b border-zinc-800 hover:bg-zinc-900">
                        {renderHeader('SDC #', 'full_name')}
                        {renderHeader('Nom complet', 'company_name')}
                        {renderHeader('Courriel', 'email')}
                        {renderHeader('Téléphone', 'phone')}
                        {renderHeader('Ville', 'city')}
                        {renderHeader('Gestionnaire', 'manager')}
                        <TableHead className="text-zinc-300 font-medium text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                                Aucun client trouvé.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedData.map((client) => (
                            <TableRow 
                                key={client.id} 
                                className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                                onClick={() => router.push(`/clients/${client.id}`)}
                            >
                                <TableCell className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">{client.full_name}</TableCell>
                                <TableCell className="text-zinc-300">
                                    {client.company_name || <span className="text-zinc-600">-</span>}
                                </TableCell>
                                <TableCell className="text-zinc-400">{client.email || '-'}</TableCell>
                                <TableCell className="text-zinc-400">{client.phone || '-'}</TableCell>
                                <TableCell className="text-zinc-400">{client.city || '-'}</TableCell>
                                <TableCell className="text-zinc-400">{(client as any).managers ? `${(client as any).managers.first_name} ${(client as any).managers.last_name}` : '-'}</TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <DeleteClientButton clientId={client.id} clientName={client.full_name} compact />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
