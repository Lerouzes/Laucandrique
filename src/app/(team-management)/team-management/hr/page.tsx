import { getDepartments, getEmployees } from '@/actions/hr'
import { getManagers } from '@/actions/managers'
import { HRManagement } from '@/components/features/team-management/HRManagement'

export const dynamic = 'force-dynamic'

export default async function HRPage() {
    // Fetch departments, employees, and managers concurrently
    const [departments, employees, managers] = await Promise.all([
        getDepartments(),
        getEmployees(),
        getManagers(true)
    ])

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    Gestion des Ressources Humaines
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                    Gérez la structure hiérarchique, configurez les départements et modifiez les fiches des employés de Gustav.
                </p>
            </div>

            <HRManagement 
                initialDepartments={departments}
                initialEmployees={employees}
                managers={managers}
            />
        </div>
    )
}
