import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { NewAuditForm } from '@/components/features/team-management/NewAuditForm'

export default async function EditAuditPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch current user context
    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    // 2. Fetch logged-in user profile
    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUser } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single()

    // Enforce Master check at page level
    if (currentUser?.role !== 'Master') {
        return (
            <div className="p-6 bg-[#16171e] border border-zinc-800 rounded-xl max-w-lg mx-auto mt-12 text-center text-rose-400">
                <h2 className="text-sm font-bold uppercase mb-2">Accès Refusé</h2>
                <p className="text-xxs text-zinc-400">Seuls les utilisateurs dotés du rôle Master peuvent modifier les audits de syndicats.</p>
            </div>
        )
    }

    // 3. Fetch audit details
    const { data: audit } = await supabase
        .from('syndicate_audits')
        .select('*')
        .eq('id', id)
        .single()

    if (!audit) {
        notFound()
    }

    // 4. Fetch answers
    const { data: answers } = await supabase
        .from('syndicate_audit_answers')
        .select('*')
        .eq('audit_id', id)

    // 5. Fetch active syndicates (clients)
    let clientsQuery = supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')

    if (context.teamId) {
        clientsQuery = clientsQuery.in('manager_id', managerIds)
    }

    const [clientsRes, configsRes] = await Promise.all([
        clientsQuery.order('company_name'),
        supabase.from('audit_question_configs').select('*')
    ])

    const clients = clientsRes.data
    const configs = configsRes.data

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Modifier l'Audit</h1>
                <p className="text-xs text-zinc-400">
                    Modifiez la fiche d'évaluation de conformité de cette copropriété.
                </p>
            </div>

            <NewAuditForm 
                clients={clients || []} 
                questionConfigs={configs || []} 
                initialAudit={audit}
                initialAnswers={answers || []}
                currentUser={currentUser || { full_name: 'Auditeur' }}
            />
        </div>
    )
}
