import { getProjects } from '@/actions/projects'
import { PlanningCalendar } from '@/components/features/planification/PlanningCalendar'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

function calculateMonthlyRevenue(projects: any[], monthKey: string): number {
    return projects.reduce((sum, p) => {
        if (p.status === 'unplanned' || p.status === 'deferred' || p.status === 'cancelled') return sum
        
        let isMatch = false
        if (p.status === 'completed') {
            const cMonths = p.completed_months || []
            isMatch = cMonths.length > 0 ? cMonths.includes(monthKey) : (p.completed_at && p.completed_at.slice(0, 7) === monthKey)
        } else {
            const pMonths = p.planned_months || []
            isMatch = pMonths.length > 0 ? pMonths.includes(monthKey) : (p.start_date && p.start_date.slice(0, 7) === monthKey)
        }
        
        if (!isMatch) return sum

        const total = Number(p.quotes?.total || 0)
        if (total <= 0) return sum
        const pMonths = p.planned_months || []
        const cMonths = p.completed_months || []
        const allMonths = Array.from(new Set([...pMonths, ...cMonths]))
        if (allMonths.length > 0) {
            if (allMonths.includes(monthKey)) {
                return sum + (total / allMonths.length)
            }
            return sum
        }
        if (p.start_date && p.start_date.slice(0, 7) === monthKey) {
            return sum + total
        }
        return sum
    }, 0)
}

export default async function PlanificationPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const resolvedSearchParams = await searchParams
    const query = resolvedSearchParams.query || ''
    
    const allProjects = await getProjects()
    
    const normalized = query.trim().toLowerCase()
    const filteredProjects = normalized 
        ? allProjects.filter((p: any) => {
            const clientName = String(p.clients?.full_name || '').toLowerCase()
            const address = String(p.clients?.address || '').toLowerCase()
            const quoteNumber = String(p.quotes?.quote_number || '')
            const title = String(p.title || '').toLowerCase()
            return clientName.includes(normalized) || address.includes(normalized) || quoteNumber.includes(normalized) || title.includes(normalized)
          })
        : allProjects

    const now = new Date()
    const previousMonths = []
    for (let i = 3; i >= 1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = d.getFullYear()
        const month = d.getMonth()
        const key = `${year}-${String(month + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('fr-CA', { month: 'short' })
        const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1)
        previousMonths.push({ key, label: capitalizedLabel })
    }

    return (
        <div className="space-y-6 h-full flex flex-col pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-4 flex-1">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Planification</h2>
                        <p className="text-sm text-zinc-400">
                            Glissez-déposez les projets approuvés dans le calendrier.
                        </p>
                    </div>

                    <div className="max-w-lg relative w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <form>
                            <Input
                                name="query"
                                defaultValue={query}
                                placeholder="Rechercher par adresse, client, # soumission..."
                                className="pl-9 bg-zinc-900/50 border-zinc-800 focus-visible:ring-cyan-500"
                            />
                        </form>
                    </div>
                </div>

                {/* Recap of monthly revenues of previous months */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 shrink-0 md:self-stretch justify-center backdrop-blur-md">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Revenus des mois précédents</span>
                    <div className="flex gap-6 divide-x divide-zinc-800">
                        {previousMonths.map(m => {
                            const rev = calculateMonthlyRevenue(allProjects, m.key)
                            return (
                                <div key={m.key} className="flex flex-col pl-4 first:pl-0 font-sans">
                                    <span className="text-[10px] text-zinc-550 text-zinc-500 capitalize leading-none">{m.label}</span>
                                    <span className="text-sm font-bold text-zinc-150 font-mono mt-1">{Math.round(rev).toLocaleString('fr-CA')} $</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[750px] h-[calc(100vh-150px)]">
                <PlanningCalendar initialProjects={filteredProjects} query={query} />
            </div>
        </div>
    )
}
