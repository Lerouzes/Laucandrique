import { getQuotes } from '@/actions/quotes'
import { getProjects } from '@/actions/projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Banknote, CheckCircle, Clock } from 'lucide-react'

export default async function DashboardPage() {
    const quotes = await getQuotes()
    const projects = await getProjects()

    const totalQuotesCount = quotes.length
    const approvedQuotes = quotes.filter((q: any) => q.status === 'approved')
    const totalApprovedValue = approvedQuotes.reduce((acc: number, q: any) => acc + (q.total || 0), 0)

    const activeProjects = projects.filter((p: any) => p.status === 'in_progress' || p.status === 'planned')

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Tableau de bord</h2>
                <p className="text-sm text-zinc-400">
                    Aperçu de vos activités récentes et métriques clés.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Revenus Projetés</CardTitle>
                        <Banknote className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${totalApprovedValue.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-zinc-500 mt-1">Basé sur les soumissions approuvées</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
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

                <Card className="bg-zinc-900 border-zinc-800">
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
        </div>
    )
}
