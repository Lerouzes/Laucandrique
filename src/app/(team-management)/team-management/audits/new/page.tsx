import { createClient } from '@/utils/supabase/server'
import { NewAuditForm } from '@/components/features/team-management/NewAuditForm'

export default async function NewAuditPage() {
    const supabase = await createClient()

    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    // Fetch active syndicates (clients)
    let clientsQuery = supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')

    if (context.teamId) {
        clientsQuery = clientsQuery.in('manager_id', managerIds)
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()

    const [clientsRes, configsRes] = await Promise.all([
        clientsQuery.order('company_name'),
        supabase.from('audit_question_configs').select('*')
    ])

    const clients = clientsRes.data
    const configs = configsRes.data

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Créer un Audit</h1>
                <p className="text-xs text-zinc-400">
                    Démarrez un audit de conformité pour un syndicat de copropriété actif.
                </p>
            </div>

            <NewAuditForm 
                clients={clients || []} 
                questionConfigs={configs || []} 
                currentUser={profile || { full_name: 'Auditeur' }}
            />
        </div>
    )
}
