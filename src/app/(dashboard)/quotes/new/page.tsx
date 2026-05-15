import { getClients } from '@/actions/clients'
import { getSettings } from '@/actions/settings'
import { QuoteBuilder } from '@/components/features/quotes/QuoteBuilder'

export default async function NewQuotePage() {
    const clients = await getClients()
    const settings = await getSettings()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Nouvelle Soumission</h2>
                <p className="text-sm text-zinc-400">
                    Créer une nouvelle soumission avec calculs automatiques.
                </p>
            </div>

            <QuoteBuilder clients={clients} settings={settings} />
        </div>
    )
}
