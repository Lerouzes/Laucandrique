import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { AnalyticsCharts } from '@/components/features/analytics/AnalyticsCharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, TrendingUp, Briefcase } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { frCA } from 'date-fns/locale'

export default async function AnalyticsPage() {
    const quotes = await getQuotes()
    const projects = await getProjects()

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
                        <CardTitle className="text-zinc-100">Charge de travail (Projets)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 mt-4">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                <span className="text-sm text-zinc-400">Non planifiés</span>
                                <span className="font-bold text-zinc-100">{projects.filter(p => p.status === 'unplanned').length}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                <span className="text-sm text-zinc-400">Planifiés</span>
                                <span className="font-bold text-zinc-100">{projects.filter(p => p.status === 'planned').length}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                <span className="text-sm text-zinc-400">En cours</span>
                                <span className="font-bold text-blue-400">{projects.filter(p => p.status === 'in_progress').length}</span>
                            </div>
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-sm text-zinc-400">Complétés</span>
                                <span className="font-bold text-green-500">{projects.filter(p => p.status === 'completed').length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
