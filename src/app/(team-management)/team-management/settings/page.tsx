// @ts-nocheck
import { createClient } from '@/utils/supabase/server'
import { SettingsClientPage } from '@/components/features/team-management/SettingsClientPage'

export default async function SettingsPage() {
    const supabase = await createClient()

    // Fetch data concurrently
    const [categoriesRes, auditConfigsRes, assemblyConfigsRes] = await Promise.all([
        supabase
            .from('complaint_categories')
            .select('*')
            .order('name'),
        supabase
            .from('audit_question_configs')
            .select('*'),
        supabase
            .from('assembly_question_configs')
            .select('*')
    ])

    const categories = categoriesRes.data
    const auditConfigs = auditConfigsRes.data
    const assemblyConfigs = assemblyConfigsRes.data

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
        ? await supabase
            .from('profiles')
            .select('role, id')
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
                    Gérez les catégories de plaintes et personnalisez les infobulles d'audits et d'assemblées.
                </p>
            </div>

            <SettingsClientPage 
                initialCategories={categories || []} 
                initialAuditConfigs={auditConfigs || []} 
                initialAssemblyConfigs={assemblyConfigs || []}
                userRole={userRole}
            />
        </div>
    )
}

