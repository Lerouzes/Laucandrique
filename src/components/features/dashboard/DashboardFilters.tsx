'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

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

    return (
        <Card className="bg-zinc-950/70 border-zinc-800 backdrop-blur-md p-5 rounded-2xl animate-in fade-in duration-200">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Managers Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                            Filtrer par gestionnaire
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {availableManagers.map((m) => {
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
                            })}
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
