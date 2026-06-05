// @ts-nocheck
// src/app/maintenance/invite/[token]/page.tsx
import { getResidentInviteAction, getAvailableTimeSlotsAction } from '@/actions/maintenance'
import { ResidentInvitePortal } from '@/components/features/maintenance/ResidentInvitePortal'

export const dynamic = 'force-dynamic'

export default async function ResidentInvitePage({
    params
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params

    try {
        const details = await getResidentInviteAction(token)
        
        // Calculate total duration for scheduling
        const totalDuration = details.services.reduce((acc, s) => acc + s.duration, 0)
        
        // Fetch available slots
        const availableSlots = await getAvailableTimeSlotsAction(details.unit.campaign_id, totalDuration)

        return (
            <div className="min-h-screen bg-[#0d0e12] text-zinc-150 py-12 px-4 flex items-center justify-center font-sans">
                <ResidentInvitePortal 
                    token={token} 
                    details={details} 
                    initialSlots={availableSlots}
                    totalDuration={totalDuration}
                />
            </div>
        )
    } catch (err) {
        return (
            <div className="min-h-screen bg-[#0d0e12] text-zinc-100 py-12 px-4 flex items-center justify-center font-sans">
                <div className="max-w-md w-full p-6 bg-[#16171e] border border-zinc-800 rounded-2xl text-center space-y-4 shadow-xl">
                    <h2 className="text-sm font-extrabold uppercase text-rose-400">Lien d'invitation invalide</h2>
                    <p className="text-xxs text-zinc-400">
                        Ce jeton d'invitation n'existe pas ou la campagne de maintenance est terminée. 
                        Veuillez contacter la direction de votre syndicat de copropriété.
                    </p>
                </div>
            </div>
        )
    }
}
