'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function QuotesSearch({ initialQuery, initialStatus }: { initialQuery: string, initialStatus: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [val, setVal] = useState(initialQuery)
    const [status, setStatus] = useState(initialStatus || 'all')
    const [isPending, startTransition] = useTransition()

    const applySearch = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (val) params.set('query', val)
        else params.delete('query')

        if (status && status !== 'all') params.set('status', status)
        else params.delete('status')

        startTransition(() => {
            router.push(`/quotes?${params.toString()}`)
        })
    }

    return (
        <form
            className="flex gap-4 w-full max-w-3xl"
            onSubmit={(e) => {
                e.preventDefault()
                applySearch()
            }}
        >
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                    type="search"
                    placeholder="Rechercher par numéro ou titre..."
                    className="w-full bg-white border-zinc-200 pl-9 text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-zinc-600 focus-visible:border-transparent"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                />
            </div>
            <Select value={status} onValueChange={(next) => { setStatus(next); }}>
                <SelectTrigger className="w-[180px] bg-white border-zinc-200 text-zinc-900">
                    <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                    <SelectItem value="all" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-900">Tous les statuts</SelectItem>
                    <SelectItem value="draft" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-900">Brouillon</SelectItem>
                    <SelectItem value="sent" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-900">Envoyée</SelectItem>
                    <SelectItem value="approved" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-900">Approuvée</SelectItem>
                    <SelectItem value="completed" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-900">Complétée</SelectItem>
                    <SelectItem value="denied" className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-zinc-900">Refusée</SelectItem>
                </SelectContent>
            </Select>
            <Button type="submit" disabled={isPending} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                Rechercher
            </Button>
        </form>
    )
}
