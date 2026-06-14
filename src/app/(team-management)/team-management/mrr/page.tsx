import { getMrrSyndicates } from '@/actions/team-management'
import { MrrSyndicatesClient } from '@/components/features/team-management/MrrSyndicatesClient'
import { getActiveTeamContext } from '@/utils/team-context'

export default async function MrrPage(props: {
    searchParams: Promise<{ teamId?: string; managerId?: string }>
}) {
    const searchParams = await props.searchParams
    const teamId = searchParams.teamId || undefined
    const managerId = searchParams.managerId || undefined

    const data = await getMrrSyndicates({ teamId, managerId })

    return (
        <MrrSyndicatesClient
            syndicates={data.syndicates}
            stats={data.stats}
            managers={data.managers}
            teams={data.teams}
            isRestricted={data.isRestricted}
            currentTeamId={teamId}
            currentManagerId={managerId}
        />
    )
}
