import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { OneOnOneDetailView } from '@/components/features/team-management/OneOnOneDetailView'

export default async function OneOnOneDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch meeting
    const { data: oneOnOne } = await supabase
        .from('one_on_ones')
        .select('*')
        .eq('id', id)
        .single()

    if (!oneOnOne) {
        notFound()
    }

    // 2. Fetch manager details
    const { data: manager } = await supabase
        .from('managers')
        .select('*')
        .eq('id', oneOnOne.manager_id)
        .single()

    if (!manager) {
        notFound()
    }

    // 3. Fetch commitments
    const { data: commitments } = await supabase
        .from('one_on_one_commitments')
        .select('*')
        .eq('one_on_one_id', id)

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Alignement Individuel</h1>
                <p className="text-xs text-zinc-400">
                    Consultez ou modifiez les détails de cette rencontre de responsabilisation.
                </p>
            </div>

            <OneOnOneDetailView 
                oneOnOne={oneOnOne} 
                commitments={commitments || []} 
                manager={manager} 
            />
        </div>
    )
}
