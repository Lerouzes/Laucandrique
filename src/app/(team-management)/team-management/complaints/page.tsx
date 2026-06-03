import { createClient } from '@/utils/supabase/server'
import { ComplaintsClientPage } from '@/components/features/team-management/ComplaintsClientPage'
import { AlertTriangle } from 'lucide-react'

export default async function ComplaintsListPage() {
    const supabase = await createClient()

    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    // 1. Fetch complaints including client, manager, and category
    let complaintsQuery = supabase
        .from('complaints')
        .select(`
            *,
            clients(company_name, full_name),
            managers(first_name, last_name),
            complaint_categories(name)
        `)

    if (context.teamId) {
        complaintsQuery = complaintsQuery.in('manager_id', managerIds)
    }

    const { data: complaints } = await complaintsQuery
        .order('received_date', { ascending: false })

    // 2. Fetch active clients for new complaint creation dropdown
    let clientsQuery = supabase
        .from('clients')
        .select('id, company_name, full_name')
        .eq('status', 'active')

    if (context.teamId) {
        clientsQuery = clientsQuery.in('manager_id', managerIds)
    }

    const { data: clients } = await clientsQuery
        .order('company_name')

    // 3. Fetch managers
    const managers = teamManagers.map(m => ({ id: m.id, first_name: m.first_name, last_name: m.last_name }))

    // 4. Fetch complaint categories
    const { data: categories } = await supabase
        .from('complaint_categories')
        .select('id, name')
        .order('name')

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Plaintes Clients & Gestion des Conflits
                </h2>
                <p className="text-xs text-zinc-400">
                    Registre des plaintes et réclamations clients. Suivez et résolvez les litiges de copropriété.
                </p>
            </div>

            <ComplaintsClientPage
                initialComplaints={(complaints || []) as any}
                clients={clients || []}
                managers={managers || []}
                categories={categories || []}
                userRole={context.role}
            />
        </div>
    )
}
