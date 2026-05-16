import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Banknote, CheckCircle, Clock, Send } from 'lucide-react'
import { AnalyticsCharts } from '@/components/features/analytics/AnalyticsCharts'

function getRange(period: string, start?: string, end?: string) {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), 0, 1)
    const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    if (period === 'last_30_days') return { start: new Date(now.getTime() - 29 * 86400000), end: now }
    if (period === 'next_30_days') return { start: now, end: new Date(now.getTime() + 30 * 86400000) }
    if (period === 'custom' && start && end) return { start: new Date(start), end: new Date(`${end}T23:59:59.999`) }
    return { start: firstDay, end: lastDay }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string, start?: string, end?: string }> }) {
    const params = await searchParams
    const period = params.period || 'current_year'
    const range = getRange(period, params.start, params.end)
    const quotes = await getQuotes()
    const projects = await getProjects()

    const totalQuotesCount = quotes.length
    const approvedQuotes = quotes.filter((q: any) => q.status === 'approved')
    const sentQuotes = quotes.filter((q: any) => q.status === 'sent')
    const totalApprovedValue = approvedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)

    const activeProjects = projects.filter((p: any) => p.status === 'in_progress' || p.status === 'planned')

    const monthlyMap: Record<string, number> = {}
    quotes
        .filter((q: any) => q.status === 'approved' && q.approved_at)
        .filter((q: any) => {
            const d = new Date(q.approved_at)
            return d >= range.start && d <= range.end
        })
        .forEach((q: any) => {
            const d = new Date(q.approved_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthlyMap[key] = (monthlyMap[key] || 0) + (q.total || 0)
        })
    const monthlyRevenue = Object.entries(monthlyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, total]) => ({ month, total }))

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Tableau de bord</h2>
                <p className="text-sm text-zinc-400">
                    Aperçu de vos activités récentes et métriques clés.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Revenus Projetés</CardTitle>
                        <Banknote className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${totalApprovedValue.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-zinc-500 mt-1">Basé sur les soumissions approuvées</p>
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Taux d'approbation</CardTitle>
                        <CheckCircle className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">
                            {totalQuotesCount > 0 ? Math.round((approvedQuotes.length / totalQuotesCount) * 100) : 0}%
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{approvedQuotes.length} approuvées sur {totalQuotesCount}</p>
                    </CardContent>
                </Card>


                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Soumissions envoyées</CardTitle>
                        <Send className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{sentQuotes.length}</div>
                        <p className="text-xs text-zinc-500 mt-1">Prêtes pour décision (approuvée/refusée)</p>
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Projets Actifs</CardTitle>
                        <Clock className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{activeProjects.length}</div>
                        <p className="text-xs text-zinc-500 mt-1">En cours ou planifiés</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-transparent border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100">Revenus mensuels (période)</CardTitle>
                    <form className="mt-2 grid md:grid-cols-4 gap-2">
                        <select name="period" defaultValue={period} className="h-9 rounded border border-zinc-800 bg-transparent px-2 text-sm text-zinc-200">
                            <option value="current_year">Année en cours</option>
                            <option value="last_30_days">30 derniers jours</option>
                            <option value="next_30_days">30 prochains jours</option>
                            <option value="custom">Personnalisé</option>
                        </select>
                        <input type="date" name="start" defaultValue={params.start || ''} className="h-9 rounded border border-zinc-800 bg-transparent px-2 text-sm text-zinc-200" />
                        <input type="date" name="end" defaultValue={params.end || ''} className="h-9 rounded border border-zinc-800 bg-transparent px-2 text-sm text-zinc-200" />
                        <button type="submit" className="h-9 rounded border border-zinc-800 px-3 text-sm text-zinc-200 hover:bg-zinc-800/40">Appliquer</button>
                    </form>
                </CardHeader>
                <CardContent>
                    <AnalyticsCharts monthlyRevenue={monthlyRevenue} />
                </CardContent>
            </Card>
        </div>
    )
}
