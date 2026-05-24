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

    // 4. Fetch the previous completed meeting for comparison
    const { data: lastMeetingList } = await supabase
        .from('one_on_ones')
        .select(`
            id,
            meeting_date,
            status,
            current_issues,
            main_objectives,
            recent_wins,
            difficult_situations,
            priority_1,
            priority_2,
            priority_3,
            training_requested,
            escalation_needed,
            operational_blockers,
            conflict_resolution
        `)
        .eq('manager_id', oneOnOne.manager_id)
        .eq('status', 'completed')
        .lt('meeting_date', oneOnOne.meeting_date)
        .order('meeting_date', { ascending: false })
        .limit(1)

    const lastMeeting = lastMeetingList?.[0] || null
    let lastMeetingWithComms: any = null
    if (lastMeeting) {
        const { data: lastCommitments } = await supabase
            .from('one_on_one_commitments')
            .select('*')
            .eq('one_on_one_id', lastMeeting.id)
        lastMeetingWithComms = {
            ...lastMeeting,
            commitments: lastCommitments || []
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Alignement Individuel</h1>
                <p className="text-xs text-zinc-400">
                    Consultez ou modifiez les détails de cette rencontre de suivi.
                </p>
            </div>

            <OneOnOneDetailView 
                oneOnOne={oneOnOne} 
                commitments={commitments || []} 
                manager={manager} 
                lastMeeting={lastMeetingWithComms}
            />
        </div>
    )
}
