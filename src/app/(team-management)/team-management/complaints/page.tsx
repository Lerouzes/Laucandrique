import { createClient } from '@/utils/supabase/server'
import { ComplaintsClientPage } from '@/components/features/team-management/ComplaintsClientPage'
import { AlertTriangle } from 'lucide-react'

export default async function ComplaintsListPage() {
    const supabase = await createClient()

    // 1. Fetch complaints including client, manager, and category
    const { data: complaints } = await supabase
        .from('complaints')
        .select(`
            *,
            clients(company_name, full_name),
            managers(first_name, last_name),
            complaint_categories(name)
        `)
        .order('received_date', { ascending: false })

    // 2. Fetch active clients for new complaint creation dropdown
    const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name, full_name')
        .eq('status', 'active')
        .order('company_name')

    // 3. Fetch managers
    const { data: managers } = await supabase
        .from('managers')
        .select('id, first_name, last_name')
        .order('first_name')

    // 4. Fetch complaint categories
    const { data: categories } = await supabase
        .from('complaint_categories')
        .select('id, name')
        .order('name')

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Plaintes Clients & Gestion des Conflits
                </h2>
                <p className="text-xs text-zinc-400">
                    Registre des plaintes et réclamations clients. Suivez et résolvez les litiges de copropriété.
                </p>
            </div>

            <ComplaintsClientPage
                initialComplaints={(complaints || []) as any}
                clients={clients || []}
                managers={managers || []}
                categories={categories || []}
            />
        </div>
    )
}
