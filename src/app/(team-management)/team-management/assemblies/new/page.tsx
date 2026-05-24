import { createClient } from '@/utils/supabase/server'
import { NewAssemblyEvaluationForm } from '@/components/features/team-management/NewAssemblyEvaluationForm'

export default async function NewAssemblyPage() {
    const supabase = await createClient()

    // Fetch active clients (syndicates)
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company_name')

    // Fetch managers
    const { data: managers } = await supabase
        .from('managers')
        .select('*')
        .order('first_name')

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Créer une Évaluation</h1>
                <p className="text-xs text-zinc-400">
                    Démarrez un rapport d'évaluation pour une assemblée générale de copropriétaires.
                </p>
            </div>

            <NewAssemblyEvaluationForm clients={clients || []} managers={managers || []} />
        </div>
    )
}
