import { getProjects } from '@/actions/projects'
import { PlanningCalendar } from '@/components/features/planification/PlanningCalendar'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export default async function PlanificationPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const resolvedSearchParams = await searchParams
    const query = resolvedSearchParams.query || ''
    const projects = await getProjects(query)

    return (
        <div className="space-y-6 h-full flex flex-col pb-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Planification</h2>
                <p className="text-sm text-zinc-400">
                    Glissez-déposez les projets approuvés dans le calendrier.
                </p>
            </div>

            <div className="max-w-lg relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <form>
                    <Input
                        name="query"
                        defaultValue={query}
                        placeholder="Rechercher par adresse, client, # soumission..."
                        className="pl-9"
                    />
                </form>
            </div>

            <div className="flex-1 min-h-[600px] h-[calc(100vh-180px)]">
                <PlanningCalendar initialProjects={projects} query={query} />
            </div>
        </div>
    )
}
