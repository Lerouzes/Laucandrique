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
        .select('*, profiles:conducted_by(full_name)')
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
            conflict_resolution,
            calls_total,
            calls_answered,
            emails_over_48h,
            late_tasks,
            bills_no_notes_over_7d
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

    // 5. Fetch discussed complaints in this 1v1
    const { data: discussedComplaints } = await supabase
        .from('one_on_one_complaints')
        .select(`
            *,
            complaints(
                id,
                title,
                description,
                severity,
                clients(company_name, full_name),
                complaint_categories(name)
            )
        `)
        .eq('one_on_one_id', id)

    // 6. Fetch reviewed syndicate audits
    const { data: reviewedAudits } = await supabase
        .from('one_on_one_syndicate_audits')
        .select(`
            *,
            syndicate_audits(
                id,
                audit_date,
                health_score,
                client_id,
                clients(company_name, full_name)
            )
        `)
        .eq('one_on_one_id', id)

    // 7. Fetch reviewed assembly evaluations
    const { data: reviewedAssemblies } = await supabase
        .from('one_on_one_assemblies')
        .select(`
            *,
            assembly_evaluations(
                id,
                assembly_date,
                notes,
                client_id,
                clients(company_name, full_name)
            )
        `)
        .eq('one_on_one_id', id)

    // 8. Fetch task & email audits
    const { data: taskEmailAudits } = await supabase
        .from('one_on_one_task_email_audits')
        .select(`
            *,
            clients(company_name, full_name)
        `)
        .eq('one_on_one_id', id)

    // 9. Fetch operational risks created in this meeting or active for the manager
    const { data: operationalRisks } = await supabase
        .from('manager_operational_risks')
        .select('*')
        .eq('manager_id', oneOnOne.manager_id)

    // 10. Fetch manager's active clients and their latest communication stats
    const { data: managerClients } = await supabase
        .from('clients')
        .select(`
            id,
            company_name,
            full_name,
            doors(id)
        `)
        .eq('manager_id', oneOnOne.manager_id)
        .eq('status', 'active')

    const clientIds = (managerClients || []).map(c => c.id)

    let communicationStats: any[] = []
    if (clientIds.length > 0) {
        const { data: statsData } = await (supabase
            .from('client_communication_stats' as any)
            .select('*')
            .in('client_id', clientIds)
            .order('analysis_date', { ascending: false }) as any)

        const statsList = (statsData || []) as any[]

        // Deduplicate: only keep the latest analysis per client
        const latestStatsMap = new Map()
        for (const stat of statsList) {
            if (!latestStatsMap.has(stat.client_id)) {
                latestStatsMap.set(stat.client_id, stat)
            }
        }
        communicationStats = Array.from(latestStatsMap.values()).map(stat => {
            const client = managerClients?.find(c => c.id === stat.client_id)
            return {
                ...stat,
                client_company_name: client?.company_name || client?.full_name || 'Syndicat sans nom',
                client_full_name: client?.full_name || '',
                doors_count: client?.doors?.length || stat.analysis_summary?.total_units || 90
            }
        })
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
                discussedComplaints={(discussedComplaints || []) as any}
                reviewedAudits={reviewedAudits || []}
                reviewedAssemblies={reviewedAssemblies || []}
                taskEmailAudits={taskEmailAudits || []}
                operationalRisks={operationalRisks || []}
                communicationStats={communicationStats}
            />
        </div>
    )
}
