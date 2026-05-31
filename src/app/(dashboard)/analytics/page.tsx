import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { getSettings } from '@/actions/settings'
import { getManagers, getManagerTeams } from '@/actions/managers'
import { getBills } from '@/actions/bills'
import { AnalyticsDashboard } from '@/components/features/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
    const quotes = await getQuotes()
    const projects = await getProjects()
    const settings = await getSettings()
    const managers = await getManagers(true)
    const teams = await getManagerTeams()
    const bills = await getBills()

    return (
        <div className="space-y-6 h-full flex flex-col pb-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Analytiques de Performance</h2>
                <p className="text-sm text-zinc-400">
                    Aperçu interactif et segmenté en temps réel de votre chiffre d'affaires, taux d'approbation, équipes, gestionnaires et contracteurs.
                </p>
            </div>

            <AnalyticsDashboard 
                initialQuotes={quotes} 
                initialProjects={projects} 
                settings={settings} 
                allManagers={managers}
                allTeams={teams}
                initialBills={bills}
            />
        </div>
    )
}
