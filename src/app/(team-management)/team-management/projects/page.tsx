import { getProjects } from '@/actions/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Calendar, CheckCircle2, Hammer, Landmark } from 'lucide-react'

export default async function OperationsProjectsPage() {
    const projects = await getProjects()

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40'
            case 'in_progress':
                return 'bg-blue-500/20 text-blue-400 border-blue-800/40 animate-pulse'
            case 'planned':
                return 'bg-purple-500/20 text-purple-400 border-purple-800/40'
            default:
                return 'bg-zinc-900 text-zinc-500 border-zinc-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Complété'
            case 'in_progress': return 'En Cours'
            case 'planned': return 'Planifié'
            default: return 'Non Planifié'
        }
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-400" />
                    Projets Opérationnels Actifs
                </h2>
                <p className="text-xs text-zinc-400">
                    Suivi de haut niveau des travaux et chantiers en cours sur l'ensemble du parc immobilier.
                </p>
            </div>

            {/* Main view */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white">Registre des Projets</CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Liste consolidée des travaux d'entretien majeurs et améliorations d'actifs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-xxs text-zinc-300">
                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                                <th className="p-3">Titre du Projet / Travaux</th>
                                <th className="p-3">Copropriété (Client)</th>
                                <th className="p-3">Entrepreneur Assigné</th>
                                <th className="p-3 text-center">Début Estimé</th>
                                <th className="p-3 text-center">Fin Estimée</th>
                                <th className="p-3 text-right">Frais / Budget Soumission</th>
                                <th className="p-3 text-center">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                            {(!projects || projects.length === 0) ? (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center italic text-zinc-500">
                                        Aucun projet opérationnel en cours.
                                    </td>
                                </tr>
                            ) : (
                                projects.map((p: any) => {
                                    const clientName = p.clients ? p.clients.full_name : 'Inconnu'
                                    const address = p.clients?.address || ''
                                    const contractorName = p.contractors ? p.contractors.full_name : (p.quotes?.contractors?.full_name || 'Non désigné')
                                    const budget = Number(p.quotes?.total || 0)

                                    return (
                                        <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-zinc-200">
                                                <div>{p.title || 'Travaux de Maintenance'}</div>
                                                {p.quotes?.quote_number && (
                                                    <span className="text-[9px] text-zinc-500">Devis #{p.quotes.quote_number}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-zinc-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Landmark className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                    <div>
                                                        <div>{clientName}</div>
                                                        {address && <div className="text-[9px] text-zinc-500">{address}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-zinc-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Hammer className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                    <span>{contractorName}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center text-zinc-400 font-mono">
                                                {p.start_date ? new Date(p.start_date).toLocaleDateString('fr-CA') : '-'}
                                            </td>
                                            <td className="p-3 text-center text-zinc-400 font-mono">
                                                {p.end_date ? new Date(p.end_date).toLocaleDateString('fr-CA') : '-'}
                                            </td>
                                            <td className="p-3 text-right font-semibold text-emerald-400">
                                                {budget > 0 ? `$${budget.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}` : '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={`text-[8px] font-bold px-2 py-0.5 ${getStatusBadge(p.status)}`}>
                                                    {getStatusLabel(p.status)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
