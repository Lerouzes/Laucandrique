// @ts-nocheck
// src/app/(team-management)/team-management/maintenance/services/page.tsx
import { getServicesAction } from '@/actions/maintenance'
import { createClient } from '@/utils/supabase/server'
import { ServicesLibrary } from '@/components/features/maintenance/ServicesLibrary'
import Link from 'next/link'
import { ArrowLeft, Hammer } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ServicesLibraryPage() {
    const supabase = await createClient()
    
    // Fetch services from library
    const services = await getServicesAction()

    // Fetch all contractors for default contractor selection
    const { data: contractors } = await supabase
        .from('contractors')
        .select('id, full_name')
        .order('full_name')

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

            {/* Header */}
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <Hammer className="h-5 w-5 text-amber-500" />
                    Bibliothèque de Services
                </h1>
                <p className="text-xs text-zinc-400">
                    Définir et gérer le catalogue centralisé d'interventions et de contrôles techniques pour les unités.
                </p>
            </div>

            {/* Interactive Library Manager */}
            <ServicesLibrary 
                initialServices={services} 
                contractors={contractors || []} 
            />
        </div>
    )
}
