import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { AnalyticsCharts } from '@/components/features/analytics/AnalyticsCharts'
import { FinancialForecast } from '@/components/features/analytics/FinancialForecast'
import { getSettings } from '@/actions/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, TrendingUp, Briefcase } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { frCA } from 'date-fns/locale'

export default async function AnalyticsPage() {
    const quotes = await getQuotes()
    const projects = await getProjects()
    const settings = await getSettings()

    const approvedQuotes = quotes.filter((q: any) => q.status === 'approved')
    const deniedQuotes = quotes.filter((q: any) => q.status === 'denied')

    const totalApprovedValue = approvedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)
    const totalDeniedValue = deniedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)

    const avgQuoteValue = quotes.length > 0 ? quotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0) / quotes.length : 0

    const winRate = quotes.length > 0 ? (approvedQuotes.length / quotes.length) * 100 : 0

    const monthlyDataMap: Record<string, number> = {}
    approvedQuotes.forEach((q: any) => {
        if (q.approved_at) {
            const monthYear = format(parseISO(q.approved_at), 'MMM yy', { locale: frCA })
            monthlyDataMap[monthYear] = (monthlyDataMap[monthYear] || 0) + (q.total || 0)
        }
    })

    const monthlyRevenue = Object.entries(monthlyDataMap).map(([month, total]) => ({ month, total }))

    const contractorStats: Record<string, { count: number, total: number }> = {}
    quotes.forEach((q: any) => {
        const name = q.contractors?.full_name || 'Sans contracteur'
        contractorStats[name] = contractorStats[name] || { count: 0, total: 0 }
        contractorStats[name].count += 1
        contractorStats[name].total += q.total || 0
    })
    const topContractors = Object.entries(contractorStats).sort((a,b)=> b[1].total - a[1].total).slice(0,5)


    const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() + i)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        const label = d.toLocaleDateString('fr-CA', { month: 'short', year: 'numeric' })
        return { key, label, planned: 0, realized: 0 }
    })
    const monthMap: Record<string, any> = Object.fromEntries(months.map(m => [m.key, m]))

    projects.forEach((p: any) => {
        const amount = Number(p.quotes?.total || 0)
        if (p.start_date) {
            const d = new Date(p.start_date)
            const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            if (monthMap[k]) monthMap[k].planned += amount
        }
        if (p.completed_at) {
            const d = new Date(p.completed_at)
            const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            if (monthMap[k]) monthMap[k].realized += amount
        }
    })
    const financialRows = months.map(m => monthMap[m.key])

    const managerStats: Record<string, { total: number, approved: number }> = {}
    quotes.forEach((q: any) => {
        const name = q.managers ? `${q.managers.first_name} ${q.managers.last_name}` : 'Sans gestionnaire'
        managerStats[name] = managerStats[name] || { total: 0, approved: 0 }
        managerStats[name].total += 1
        if (q.status === 'approved') managerStats[name].approved += 1
    })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Analytiques</h2>
                <p className="text-sm text-zinc-400">
                    Analyse approfondie de la performance de l'entreprise.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Taux d'approbation</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{Math.round(winRate)}%</div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Moyenne / Soumission</CardTitle>
                        <CheckCircle className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${Math.round(avgQuoteValue).toLocaleString('fr-CA')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Valeur Approuvée</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${Math.round(totalApprovedValue).toLocaleString('fr-CA')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Valeur Refusée</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">${Math.round(totalDeniedValue).toLocaleString('fr-CA')}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <AnalyticsCharts monthlyRevenue={monthlyRevenue} />

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-100">Statistiques Contracteurs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 mt-4">
                            {topContractors.map(([name, stat]) => (
                                <div key={name} className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                    <span className="text-sm text-zinc-400">{name}</span>
                                    <span className="font-bold text-zinc-100">{stat.count} soum. · ${Math.round(stat.total).toLocaleString('fr-CA')}</span>
                                </div>
                            ))}
                            {Object.entries(managerStats).map(([name, stat]) => (
                                <div key={name} className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                    <span className="text-sm text-zinc-400">{name} (approbation)</span>
                                    <span className="font-bold text-zinc-100">{stat.total ? Math.round((stat.approved/stat.total)*100) : 0}%</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm text-zinc-400">Projets assignés</span>
                                <span className="font-bold text-zinc-100">{projects.filter((p: any) => !!p.contractor_id).length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FinancialForecast rows={financialRows} goalEnabled={!!settings.monthly_goal_enabled} goalAmount={Number(settings.monthly_goal_amount || 0)} />
        </div>
    )
}
