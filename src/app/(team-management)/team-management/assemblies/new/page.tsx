import { createClient } from '@/utils/supabase/server'
import { NewAssemblyEvaluationForm } from '@/components/features/team-management/NewAssemblyEvaluationForm'

export default async function NewAssemblyPage() {
    const supabase = await createClient()

    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    // Fetch active clients (syndicates)
    let clientsQuery = supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')

    if (context.teamId) {
        clientsQuery = clientsQuery.in('manager_id', managerIds)
    }

    const { data: clients } = await clientsQuery.order('company_name')

    // Fetch assembly question tooltips config
    const { data: questionConfigs } = await supabase
        .from('assembly_question_configs')
        .select('*')

    // Fetch managers
    const managers = teamManagers

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Créer une Évaluation</h1>
                <p className="text-xs text-zinc-400">
                    Démarrez un rapport d'évaluation pour une assemblée générale de copropriétaires.
                </p>
            </div>

            <NewAssemblyEvaluationForm 
                clients={clients || []} 
                managers={managers || []} 
                questionConfigs={questionConfigs || []}
            />
        </div>
    )
}
