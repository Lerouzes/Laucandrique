import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Handshake, PlusCircle } from 'lucide-react'
import { OneOnOnesClientPage } from '@/components/features/team-management/OneOnOnesClientPage'
import { getManagers } from '@/actions/managers'

export default async function OneOnOnesListPage() {
    const supabase = await createClient()
    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    let query = supabase
        .from('one_on_ones')
        .select('*, managers(first_name, last_name)')

    if (context.teamId) {
        query = query.in('manager_id', managerIds)
    }

    const { data: oneOnOnes } = await query.order('meeting_date', { ascending: false })
    const managers = await getManagers()

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <Handshake className="h-5 w-5 text-purple-400" />
                        Rencontres Individuelles 1-à-1
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Alignements stratégiques, suivi de la charge de travail et évaluation des blocages opérationnels.
                    </p>
                </div>
                <Link
                    href="/team-management/one-on-ones/new"
                    className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 px-4 shadow-lg transition-all"
                >
                    <PlusCircle className="h-4 w-4" />
                    Créer Rencontre
                </Link>
            </div>

            <OneOnOnesClientPage 
                oneOnOnes={(oneOnOnes || []) as any} 
                managers={managers} 
            />
        </div>
    )
}
