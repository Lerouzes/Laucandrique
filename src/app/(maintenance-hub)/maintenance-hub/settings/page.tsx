// @ts-nocheck
// src/app/(maintenance-hub)/maintenance-hub/settings/page.tsx
import { getEmailSettingsAction, getEmailTemplatesAction } from '@/actions/maintenance'
import { MaintenanceEmailSettings } from '@/components/features/maintenance/MaintenanceEmailSettings'
import { Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MaintenanceEmailSettingsPage() {
    const [settings, templates] = await Promise.all([
        getEmailSettingsAction().catch((err) => {
            console.error("Error fetching email settings:", err)
            return null
        }),
        getEmailTemplatesAction().catch((err) => {
            console.error("Error fetching email templates:", err)
            return []
        })
    ])

    return (
        <div className="space-y-6 animate-fade-in text-zinc-350">
            {/* Header section */}
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <Mail className="h-5 w-5 text-amber-500" />
                    Paramètres e-mails
                </h1>
                <p className="text-xs text-zinc-400">
                    Configurer la clé API Resend, personnaliser les modèles d'e-mails HTML et définir les correspondances pour les notifications automatisées.
                </p>
            </div>

            <MaintenanceEmailSettings 
                initialSettings={settings} 
                initialTemplates={templates} 
            />
        </div>
    )
}
