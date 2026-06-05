// @ts-nocheck
// src/app/(team-management)/team-management/maintenance/campaigns/[id]/page.tsx
import { getCampaignDetailsAction } from '@/actions/maintenance'
import { CampaignDetailTracker } from '@/components/features/maintenance/CampaignDetailTracker'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CampaignDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const details = await getCampaignDetailsAction(id)

    return (
        <div className="space-y-6">
            {/* Top Navigation */}
            <div>
                <Link
                    href="/maintenance-hub"
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1.5 transition-colors w-fit"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour au Tableau de bord
                </Link>
            </div>

            {/* Tracker */}
            <CampaignDetailTracker 
                campaign={details.campaign}
                services={details.services}
                units={details.units}
            />
        </div>
    )
}
