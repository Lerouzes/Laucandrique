import { getManagerStats } from '@/actions/team-management'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { ManagerProfileView } from '@/components/features/team-management/ManagerProfileView'
import { getActiveTeamContext } from '@/utils/team-context'

export default async function ManagerProfilePage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const context = await getActiveTeamContext()

    // 1. Fetch manager details
    const { data: manager } = await supabase
        .from('managers')
        .select('*, manager_teams(*)')
        .eq('id', id)
        .single()

    if (!manager) {
        notFound()
    }

    // 2. Fetch stats
    const stats = await getManagerStats(id)
    if (!stats) {
        notFound()
    }

    // 3. Fetch syndicates (clients)
    const { data: syndicates } = await supabase
        .from('clients')
        .select('*, contracts(*)')
        .eq('manager_id', id)
        .eq('status', 'active')

    // 4. Fetch assembly evaluations
    const { data: assemblies } = await supabase
        .from('assembly_evaluations')
        .select('*, clients(company_name, full_name)')
        .eq('manager_id', id)
        .order('assembly_date', { ascending: false })

    // 5. Fetch complaints
    const { data: complaints } = await supabase
        .from('complaints')
        .select('*, clients(company_name, full_name)')
        .eq('manager_id', id)
        .order('received_date', { ascending: false })

    // 6. Fetch one-on-ones
    const { data: oneOnOnes } = await supabase
        .from('one_on_ones')
        .select('*')
        .eq('manager_id', id)
        .order('meeting_date', { ascending: false })

    // 7. Fetch monthly workload
    const { data: monthlyWorkload } = await supabase
        .from('manager_monthly_workload')
        .select('*')
        .eq('manager_id', id)
        .order('year_month', { ascending: false })

    // 8. Fetch monthly calls
    const { data: monthlyCalls } = await supabase
        .from('manager_monthly_calls')
        .select('*')
        .eq('manager_id', id)
        .order('year_month', { ascending: false })

    // 9. Fetch audits for this manager's active clients
    const clientIds = (syndicates || []).map(s => s.id)
    let audits: any[] = []
    if (clientIds.length > 0) {
        const { data: auditData } = await supabase
            .from('syndicate_audits')
            .select('*, clients(company_name, full_name)')
            .in('client_id', clientIds)
            .order('audit_date', { ascending: false })
        if (auditData) {
            audits = auditData
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Dossier du Gestionnaire</h1>
                <p className="text-xs text-zinc-400">
                    Consultez l'historique complet, les audits et la performance de {manager.first_name} {manager.last_name}.
                </p>
            </div>

            <ManagerProfileView
                manager={manager}
                stats={stats}
                syndicates={syndicates || []}
                assemblies={assemblies || []}
                complaints={complaints || []}
                oneOnOnes={oneOnOnes || []}
                monthlyWorkload={monthlyWorkload || []}
                monthlyCalls={monthlyCalls || []}
                audits={audits}
                userRole={context.role}
            />
        </div>
    )
}
