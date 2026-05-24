import { createClient } from '@/utils/supabase/server'
import { NewAuditForm } from '@/components/features/team-management/NewAuditForm'

export default async function NewAuditPage() {
    const supabase = await createClient()

    // Fetch active syndicates (clients)
    const [clientsRes, configsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'active').order('company_name'),
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

            <NewAuditForm clients={clients || []} questionConfigs={configs || []} />
        </div>
    )
}
