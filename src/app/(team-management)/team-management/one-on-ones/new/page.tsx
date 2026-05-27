import { createClient } from '@/utils/supabase/server'
import { NewOneOnOneForm } from '@/components/features/team-management/NewOneOnOneForm'

export default async function NewOneOnOnePage() {
    const supabase = await createClient()

    const { getFilteredManagers } = await import('@/utils/team-context')
    const managers = await getFilteredManagers()

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Créer un Alignement</h1>
                <p className="text-xs text-zinc-400">
                    Démarrez une nouvelle rencontre individuelle 1v1 avec un gestionnaire immobilier.
                </p>
            </div>

            <NewOneOnOneForm managers={managers || []} />
        </div>
    )
}
