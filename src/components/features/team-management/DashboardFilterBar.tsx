'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Filter, Loader2 } from 'lucide-react'

export function DashboardFilterBar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const currentRange = searchParams.get('range') || 'current-year'
    const currentFrom = searchParams.get('from') || ''
    const currentTo = searchParams.get('to') || ''

    const [range, setRange] = useState(currentRange)
    const [fromMonth, setFromMonth] = useState(currentFrom)
    const [toMonth, setToMonth] = useState(currentTo)

    const handleApply = () => {
        const params = new URLSearchParams()
        params.set('range', range)
        if (range === 'custom') {
            if (fromMonth) params.set('from', fromMonth)
            if (toMonth) params.set('to', toMonth)
        }

        startTransition(() => {
            router.push(`/team-management/dashboard?${params.toString()}`)
        })
    }

    return (
        <div className="bg-[#16171e]/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-end justify-between gap-4 shadow-md text-xs">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                {/* Quick Date Range Select */}
                <div className="space-y-1.5 flex-1 max-w-[240px]">
                    <Label className="text-zinc-400 font-semibold flex items-center gap-1.5 text-xxs uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5 text-purple-400" />
                        Période d'Analyse
                    </Label>
                    <select
                        value={range}
                        onChange={(e) => {
                            setRange(e.target.value)
                            if (e.target.value !== 'custom') {
                                // Apply immediately if not custom
                                const params = new URLSearchParams()
                                params.set('range', e.target.value)
                                startTransition(() => {
                                    router.push(`/team-management/dashboard?${params.toString()}`)
                                })
                            }
                        }}
                        disabled={isPending}
                        className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 font-semibold outline-none focus:border-purple-650 focus:ring-1 focus:ring-purple-600/30 h-9 cursor-pointer"
                    >
                        <option value="this-month">Ce mois</option>
                        <option value="last-month">Mois dernier</option>
                        <option value="current-quarter">Trimestre en cours</option>
                        <option value="current-year">Année en cours</option>
                        <option value="custom">Période personnalisée</option>
                    </select>
                </div>

                {/* Custom Month Inputs */}
                {range === 'custom' && (
                    <div className="flex items-center gap-2 flex-1 md:flex-initial">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 text-[10px]">Du</Label>
                            <Input
                                type="month"
                                value={fromMonth}
                                onChange={(e) => setFromMonth(e.target.value)}
                                disabled={isPending}
                                className="bg-[#121318] border-zinc-800 text-white h-9 rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-500 text-[10px]">Au</Label>
                            <Input
                                type="month"
                                value={toMonth}
                                onChange={(e) => setToMonth(e.target.value)}
                                disabled={isPending}
                                className="bg-[#121318] border-zinc-800 text-white h-9 rounded-lg text-xs"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {range === 'custom' && (
                    <Button
                        onClick={handleApply}
                        disabled={isPending || !fromMonth || !toMonth}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 h-9 rounded-lg flex items-center gap-1.5 shadow-md"
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Filter className="h-3.5 w-3.5" />
                        )}
                        Appliquer
                    </Button>
                )}
            </div>
        </div>
    )
}
