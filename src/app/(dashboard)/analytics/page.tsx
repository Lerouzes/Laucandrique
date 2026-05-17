import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { AnalyticsCharts } from '@/components/features/analytics/AnalyticsCharts'
import { FinancialForecast } from '@/components/features/analytics/FinancialForecast'
import { getSettings } from '@/actions/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, TrendingUp, CalendarCheck2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { frCA } from 'date-fns/locale'

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ managers?: string, revenue?: 'approved' | 'actual' }> }) {
    const resolvedSearchParams = await searchParams
    const selectedManagers = (resolvedSearchParams.managers || '').split(',').filter(Boolean)
    const revenueMode: 'approved' | 'actual' = resolvedSearchParams.revenue === 'actual' ? 'actual' : 'approved'
    const now = new Date()
    const rangeStart = new Date(now)
    rangeStart.setFullYear(now.getFullYear() - 1)
    const rangeEnd = now
    const quotes = await getQuotes()
    const projects = await getProjects()
    const settings = await getSettings()

    const filteredQuotes = quotes.filter((q: any) => {
        const dateRef = q.approved_at || q.created_at
        const d = new Date(dateRef)
        return d >= rangeStart && d <= rangeEnd
    })
    const approvedQuotes = filteredQuotes.filter((q: any) => q.status === 'approved')
    const deniedQuotes = filteredQuotes.filter((q: any) => q.status === 'denied')

    const totalApprovedValue = approvedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)
    const totalDeniedValue = deniedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)

    const avgQuoteValue = filteredQuotes.length > 0 ? filteredQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0) / filteredQuotes.length : 0

    const winRate = filteredQuotes.length > 0 ? (approvedQuotes.length / filteredQuotes.length) * 100 : 0

    const completedProjects = projects.filter((p: any) => p.status === 'completed')
    const completedProjectsCount = completedProjects.length
    const completedProjectsValue = completedProjects.reduce((acc: number, p: any) => acc + Number(p.quotes?.total || 0), 0)
    const totalRevenueValue = revenueMode === 'actual' ? completedProjectsValue : totalApprovedValue

    const monthlyDataMap: Record<string, number> = {}
    if (revenueMode === 'actual') {
        completedProjects.forEach((p: any) => {
            if (p.completed_at) {
                const monthYear = format(new Date(p.completed_at), 'MMM yy', { locale: frCA })
                monthlyDataMap[monthYear] = (monthlyDataMap[monthYear] || 0) + Number(p.quotes?.total || 0)
            }
        })
    } else {
        approvedQuotes.forEach((q: any) => {
            if (q.approved_at) {
                const monthYear = format(parseISO(q.approved_at), 'MMM yy', { locale: frCA })
                monthlyDataMap[monthYear] = (monthlyDataMap[monthYear] || 0) + (q.total || 0)
            }
        })
    }

    const monthlyRevenue = Object.entries(monthlyDataMap).map(([month, total]) => ({ month, total }))

    const contractorStats: Record<string, { count: number, total: number }> = {}
    if (revenueMode === 'actual') {
        completedProjects.forEach((p: any) => {
            const name = p.contractors?.full_name || p.quotes?.contractors?.full_name || 'Sans contracteur'
            contractorStats[name] = contractorStats[name] || { count: 0, total: 0 }
            contractorStats[name].count += 1
            contractorStats[name].total += Number(p.quotes?.total || 0)
        })
    } else {
        filteredQuotes.forEach((q: any) => {
            const name = q.contractors?.full_name || 'Sans contracteur'
            contractorStats[name] = contractorStats[name] || { count: 0, total: 0 }
            contractorStats[name].count += 1
            contractorStats[name].total += q.total || 0
        })
    }
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

    const managerStats: Record<string, { total: number, approved: number, amount: number, denied: number, sent: number }> = {}
    const quoteById: Record<string, any> = Object.fromEntries(quotes.map((q: any) => [q.id, q]))
    quotes.forEach((q: any) => {
        const name = q.managers ? `${q.managers.first_name} ${q.managers.last_name}` : 'Sans gestionnaire'
        const id = q.manager_id || 'none'
        managerStats[name] = managerStats[name] || { total: 0, approved: 0, amount: 0, denied: 0, sent: 0 }
        if (selectedManagers.length && !selectedManagers.includes(id)) return
        managerStats[name].total += 1
        if (revenueMode === 'approved') {
            managerStats[name].amount += q.total || 0
        }
        if (q.status === 'approved') managerStats[name].approved += 1
        if (q.status === 'denied') managerStats[name].denied += 1
        if (q.status === 'sent') managerStats[name].sent += 1
    })
    if (revenueMode === 'actual') {
        completedProjects.forEach((p: any) => {
            const quote = quoteById[p.quote_id]
            const managerId = quote?.manager_id || 'none'
            if (selectedManagers.length && !selectedManagers.includes(managerId)) return
            const managerName = quote?.managers ? `${quote.managers.first_name} ${quote.managers.last_name}` : 'Sans gestionnaire'
            managerStats[managerName] = managerStats[managerName] || { total: 0, approved: 0, amount: 0, denied: 0, sent: 0 }
            managerStats[managerName].amount += Number(p.quotes?.total || 0)
        })
    }
    const availableManagers = Array.from(new Set(quotes.map((q: any) => q.manager_id).filter(Boolean)))

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Analytiques</h2>
                <p className="text-sm text-zinc-400">
                    Analyse approfondie de la performance de l'entreprise.
                </p>
                <form className="mt-3">
                    <label className="text-sm text-zinc-300 mr-2">Revenus:</label>
                    <select name="revenue" defaultValue={revenueMode} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100">
                        <option value="approved">Approuvés</option>
                        <option value="actual">Réels (projets complétés)</option>
                    </select>
                    {selectedManagers.map((id) => <input key={id} type="hidden" name="managers" value={id} />)}
                    <button className="ml-2 px-3 py-1 rounded border border-zinc-800 text-zinc-200 hover:bg-zinc-800/40" type="submit">Appliquer</button>
                </form>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-200">Taux d'approbation</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{Math.round(winRate)}%</div>
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-200">Moyenne / Soumission</CardTitle>
                        <CheckCircle className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${Math.round(avgQuoteValue).toLocaleString('fr-CA')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-200">{revenueMode === 'actual' ? 'Revenus Réels' : 'Valeur Approuvée'}</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${Math.round(totalRevenueValue).toLocaleString('fr-CA')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Projets complétés</CardTitle>
                        <CalendarCheck2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{completedProjectsCount}</div>
                        <p className="text-xs text-zinc-500 mt-1">${Math.round(completedProjectsValue).toLocaleString('fr-CA')}</p>
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-zinc-800">
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

                <Card className="bg-transparent border-zinc-800">
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


            <Card className="bg-transparent border-zinc-800">
                <CardHeader><CardTitle className="text-zinc-100">Analytiques par gestionnaire</CardTitle></CardHeader>
                <CardContent>
                    <form className="space-y-3">
                        <p className="text-sm text-zinc-400">Filtrer un ou plusieurs gestionnaires</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {availableManagers.map((id: any) => {
                                const q = quotes.find((x: any) => x.manager_id === id)
                                const label = q?.managers ? `${q.managers.first_name} ${q.managers.last_name}` : id
                                const checked = selectedManagers.includes(id)
                                return <label key={id} className="flex items-center gap-2 text-zinc-300"><input type="checkbox" name="managers" value={id} defaultChecked={checked} />{label}</label>
                            })}
                        </div>
                        <button className="px-3 py-1 rounded border border-zinc-800 text-zinc-200 hover:bg-zinc-800/40" type="submit">Appliquer</button>
                    </form>
                    <div className="mt-4 space-y-2">
                        {Object.entries(managerStats).map(([name, stat]) => (
                            <div key={name} className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm">
                                <span className="text-zinc-300">{name}</span>
                                <span className="font-semibold text-zinc-100">{stat.total} soum. · {stat.total ? Math.round((stat.approved/stat.total)*100) : 0}% appr. · ${Math.round(stat.amount).toLocaleString('fr-CA')}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <FinancialForecast rows={financialRows} goalEnabled={!!settings.monthly_goal_enabled} goalAmount={Number(settings.monthly_goal_amount || 0)} />
        </div>
    )
}
