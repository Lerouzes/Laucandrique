import { createClient } from '@/utils/supabase/server'
import { SettingsClientPage } from '@/components/features/team-management/SettingsClientPage'

export default async function SettingsPage() {
    const supabase = await createClient()

    // Fetch complaint categories
    const { data: categories } = await supabase
        .from('complaint_categories')
        .select('*')
        .order('name')

    // Fetch audit configurations
    const { data: auditConfigs } = await supabase
        .from('audit_question_configs')
        .select('*')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
        ? await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        : { data: null }

    const userRole = profile?.role || 'Operations'

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    Configuration Globale
                </h2>
                <p className="text-xs text-zinc-400">
                    Gérez les catégories de plaintes et personnalisez les infobulles d'audits de santé des syndicats.
                </p>
            </div>

            <SettingsClientPage 
                initialCategories={categories || []} 
                initialAuditConfigs={auditConfigs || []} 
                userRole={userRole}
            />
        </div>
    )
}

