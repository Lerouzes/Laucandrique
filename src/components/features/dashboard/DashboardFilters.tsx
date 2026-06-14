'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ManagerItem {
    id: string
    name: string
}

interface DashboardFiltersProps {
    availableManagers: ManagerItem[]
    availableTeams: string[]
    selectedManagers: string[]
    selectedTeams: string[]
    period: string
}

export function DashboardFilters({
    availableManagers,
    availableTeams,
    selectedManagers,
    selectedTeams,
    period
}: DashboardFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    
    const [managerSearch, setManagerSearch] = useState('')

    const handleCheckboxChange = (type: 'managers' | 'teams', value: string, checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString())
        
        let currentList = type === 'managers' ? [...selectedManagers] : [...selectedTeams]
        
        if (checked) {
            if (!currentList.includes(value)) {
                currentList.push(value)
            }
        } else {
            currentList = currentList.filter(item => item !== value)
        }

        if (currentList.length > 0) {
            params.set(type, currentList.join(','))
        } else {
            params.delete(type)
        }

        // Keep showFilters active
        params.set('showFilters', 'true')
        
        // Push the new query string
        router.push(`${pathname}?${params.toString()}`)
    }

    const cleanStr = (str: string) => {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "")
    }

    const filteredManagers = availableManagers.filter(m => {
        if (!managerSearch) return true
        const cleanSearch = cleanStr(managerSearch)
        return m.name.toLowerCase().includes(managerSearch.toLowerCase()) || cleanStr(m.name).includes(cleanSearch)
    })

    return (
        <Card className="bg-zinc-950/70 border-zinc-800 backdrop-blur-md p-5 rounded-2xl animate-in fade-in duration-200">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Managers Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                            Filtrer par gestionnaire
                        </Label>
                        {availableManagers.length > 5 && (
                            <Input
                                type="text"
                                placeholder="Rechercher un gestionnaire..."
                                value={managerSearch}
                                onChange={(e) => setManagerSearch(e.target.value)}
                                className="bg-[#121318] border-zinc-800 text-white text-xs h-8 placeholder:text-zinc-600 mb-2 rounded-lg"
                            />
                        )}
                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {filteredManagers.length === 0 ? (
                                <span className="text-[10px] text-zinc-500 italic">Aucun gestionnaire trouvé</span>
                            ) : (
                                filteredManagers.map((m) => {
                                    const checked = selectedManagers.includes(m.id)
                                    return (
                                        <label 
                                            key={m.id} 
                                            className={`cursor-pointer transition-all text-xxs px-2.5 py-1 rounded-full border flex items-center gap-1.5 select-none ${
                                                checked
                                                    ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800'
                                                    : 'bg-transparent text-zinc-400 border-zinc-850 hover:border-zinc-700'
                                            }`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                value={m.id} 
                                                checked={checked}
                                                className="sr-only" 
                                                onChange={(e) => handleCheckboxChange('managers', m.id, e.target.checked)}
                                            />
                                            {m.name}
                                        </label>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Teams Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                            Filtrer par équipe
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {availableTeams.map((team) => {
                                const checked = selectedTeams.includes(team)
                                return (
                                    <label 
                                        key={team} 
                                        className={`cursor-pointer transition-all text-xxs px-2.5 py-1 rounded-full border flex items-center gap-1.5 select-none ${
                                            checked
                                                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800'
                                                : 'bg-transparent text-zinc-400 border-zinc-850 hover:border-zinc-700'
                                        }`}
                                    >
                                        <input 
                                            type="checkbox" 
                                            value={team} 
                                            checked={checked}
                                            className="sr-only"
                                            onChange={(e) => handleCheckboxChange('teams', team, e.target.checked)}
                                        />
                                        {team}
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                    <Link href={`/dashboard?showFilters=true&period=${period}`} className="h-8 rounded-lg bg-transparent px-3 text-xs text-zinc-400 flex items-center hover:text-zinc-200">
                        Réinitialiser les filtres
                    </Link>
                </div>
            </div>
        </Card>
    )
}
