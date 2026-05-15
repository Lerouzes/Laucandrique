import { getProjects } from '@/actions/projects'
import { PlanningCalendar } from '@/components/features/planification/PlanningCalendar'

export default async function PlanificationPage() {
    const projects = await getProjects()

    return (
        <div className="space-y-6 h-full flex flex-col pb-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Planification</h2>
                <p className="text-sm text-zinc-400">
                    Glissez-déposez les projets approuvés dans le calendrier.
                </p>
            </div>

            <div className="flex-1 min-h-[600px] h-[calc(100vh-180px)]">
                <PlanningCalendar initialProjects={projects} />
            </div>
        </div>
    )
}
