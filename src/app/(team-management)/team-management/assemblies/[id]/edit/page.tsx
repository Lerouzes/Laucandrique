import { createClient } from '@/utils/supabase/server'
import { NewAssemblyEvaluationForm } from '@/components/features/team-management/NewAssemblyEvaluationForm'
import { notFound } from 'next/navigation'

export default async function EditAssemblyPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
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

    const [clientsRes, configsRes, evalRes] = await Promise.all([
        clientsQuery.order('company_name'),
        supabase
            .from('assembly_question_configs')
            .select('*'),
        supabase
            .from('assembly_evaluations')
            .select('*')
            .eq('id', id)
            .single()
    ])

    if (evalRes.error || !evalRes.data) {
        return notFound()
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Modifier l'Évaluation</h1>
                <p className="text-xs text-zinc-400">
                    Modifiez les détails de l'évaluation ou complétez la partie documentation de l'assemblée.
                </p>
            </div>

            <NewAssemblyEvaluationForm 
                clients={clientsRes.data || []} 
                managers={teamManagers} 
                questionConfigs={configsRes.data || []}
                initialEvaluation={evalRes.data}
            />
        </div>
    )
}
