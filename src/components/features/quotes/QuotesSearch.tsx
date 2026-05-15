'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function QuotesSearch({ initialQuery, initialStatus }: { initialQuery: string, initialStatus: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [val, setVal] = useState(initialQuery)
    const [status, setStatus] = useState(initialStatus || 'all')
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const delay = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (val) params.set('query', val)
            else params.delete('query')

            if (status && status !== 'all') params.set('status', status)
            else params.delete('status')

            startTransition(() => {
                router.push(`/quotes?${params.toString()}`)
            })
        }, 300)
        return () => clearTimeout(delay)
    }, [val, status, router, searchParams])

    return (
        <div className="flex gap-4 w-full max-w-2xl">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                    type="search"
                    placeholder="Rechercher par numéro ou titre..."
                    className="w-full bg-zinc-900 border-zinc-800 pl-9 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600 focus-visible:border-transparent"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                />
            </div>
            <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                    <SelectItem value="all" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-100">Tous les statuts</SelectItem>
                    <SelectItem value="draft" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-100">Brouillon</SelectItem>
                    <SelectItem value="sent" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-100">Envoyée</SelectItem>
                    <SelectItem value="approved" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-100">Approuvée</SelectItem>
                    <SelectItem value="denied" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-100">Refusée</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
