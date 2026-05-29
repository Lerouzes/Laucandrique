import { getPendingQueueAction } from '@/actions/sync'
import { ChangeApprovalsClient } from '@/components/features/team-management/ChangeApprovalsClient'

export default async function ChangeApprovalsPage() {
    const queue = await getPendingQueueAction()

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                    Approbation des Changements M365
                </h2>
                <p className="text-xs text-zinc-400">
                    Gérez la synchronisation et la validation des modifications apportées via Microsoft List ou vos flux Power Automate.
                </p>
            </div>

            <ChangeApprovalsClient initialQueue={queue} />
        </div>
    )
}
