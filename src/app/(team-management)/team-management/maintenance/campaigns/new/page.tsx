// @ts-nocheck
// src/app/(team-management)/team-management/maintenance/campaigns/new/page.tsx
import { createClient } from '@/utils/supabase/server'
import { getServicesAction } from '@/actions/maintenance'
import { NewCampaignForm } from '@/components/features/maintenance/NewCampaignForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewCampaignPage() {
    const supabase = await createClient()

    // 1. Fetch active syndicates (clients)
    const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name, full_name')
        .eq('status', 'active')
        .order('company_name')

    // 2. Fetch all contractors
    const { data: contractors } = await supabase
        .from('contractors')
        .select('id, full_name')
        .order('full_name')

    // 3. Fetch services library
    const services = await getServicesAction()

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Top Navigation */}
            <div>
                <Link
                    href="/team-management/maintenance"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1.5 transition-colors w-fit"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour au Tableau de bord
                </Link>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Nouvelle Campagne de Maintenance</h1>
                <p className="text-xs text-zinc-400">
                    Lancer une nouvelle campagne d'inspections, de réparations ou de travaux collectifs dans les unités privatives.
                </p>
            </div>

            {/* Form */}
            <NewCampaignForm 
                clients={clients || []} 
                contractors={contractors || []} 
                services={services} 
            />
        </div>
    )
}
