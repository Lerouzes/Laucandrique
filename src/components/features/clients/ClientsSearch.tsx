'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'

export function ClientsSearch({ initialQuery }: { initialQuery: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [val, setVal] = useState(initialQuery)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const delay = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (val) {
                params.set('query', val)
            } else {
                params.delete('query')
            }
            startTransition(() => {
                router.push(`/clients?${params.toString()}`)
            })
        }, 300)
        return () => clearTimeout(delay)
    }, [val, router, searchParams])

    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
                type="search"
                placeholder="Rechercher un client..."
                className="w-full bg-white border-zinc-200 pl-9 text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-zinc-600 focus-visible:border-transparent"
                value={val}
                onChange={(e) => setVal(e.target.value)}
            />
        </div>
    )
}
