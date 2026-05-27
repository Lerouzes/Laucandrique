import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck, PlusCircle, ArrowRight, Activity, Calendar } from 'lucide-react'

export default async function AuditsListPage() {
    const supabase = await createClient()
    const { getActiveTeamContext, getFilteredManagers } = await import('@/utils/team-context')
    const context = await getActiveTeamContext()
    const teamManagers = await getFilteredManagers()
    const managerIds = teamManagers.map(m => m.id)

    // Fetch audits including client details
    let query = supabase
        .from('syndicate_audits')
        .select('*, clients(company_name, full_name, managers(first_name, last_name))')

    if (context.teamId) {
        const { data: teamClients } = await supabase
            .from('clients')
            .select('id')
            .in('manager_id', managerIds)
        const clientIds = (teamClients || []).map(c => c.id)
        query = query.in('client_id', clientIds)
    }

    const { data: audits } = await query.order('audit_date', { ascending: false })

    const getHealthBadge = (score: number) => {
        if (score >= 90) return 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40'
        if (score >= 75) return 'bg-blue-500/20 text-blue-400 border-blue-800/40'
        if (score >= 60) return 'bg-amber-500/20 text-amber-400 border-amber-800/40'
        return 'bg-rose-500/20 text-rose-400 border-rose-800/40'
    }

    const getHealthLabel = (score: number) => {
        if (score >= 90) return 'Excellent'
        if (score >= 75) return 'Stable'
        if (score >= 60) return 'À Risque'
        return 'Critique'
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-purple-400" />
                        Audits des Syndicats (Santé Dossiers)
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Évaluation de la conformité légale, administrative et financière des mandats de copropriété.
                    </p>
                </div>
                <Link
                    href="/team-management/audits/new"
                    className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 px-4 shadow-lg transition-all"
                >
                    <PlusCircle className="h-4 w-4" />
                    Créer un Audit
                </Link>
            </div>

            {/* List */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white">Historique des Audits</CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Liste de toutes les vérifications de dossiers menées.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-xxs text-zinc-300">
                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                                <th className="p-3">Copropriété</th>
                                <th className="p-3">Gestionnaire</th>
                                <th className="p-3">Date de l'Audit</th>
                                <th className="p-3 text-center">Score de Santé</th>
                                <th className="p-3 text-center">Classement</th>
                                <th className="p-3 text-right">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                            {(!audits || audits.length === 0) ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center italic text-zinc-500">
                                        Aucun audit enregistré dans le système.
                                    </td>
                                </tr>
                            ) : (
                                audits.map((a) => {
                                    const clientName = a.clients ? (a.clients.company_name || a.clients.full_name) : 'Copropriété inconnue'
                                    const managerName = a.clients?.managers ? `${a.clients.managers.first_name} ${a.clients.managers.last_name}` : 'Non assigné'
                                    const score = Number(a.health_score || 0)

                                    return (
                                        <tr key={a.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-zinc-200">
                                                {clientName}
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                {managerName}
                                            </td>
                                            <td className="p-3 text-zinc-300 font-mono">
                                                {a.audit_date ? new Date(a.audit_date).toLocaleDateString('fr-CA') : 'Inconnue'}
                                            </td>
                                            <td className="p-3 text-center font-extrabold text-white">
                                                {Math.round(score)}%
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={`text-[8px] font-bold px-2 py-0.5 ${getHealthBadge(score)}`}>
                                                    {getHealthLabel(score)}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Link
                                                    href={`/team-management/audits/${a.id}`}
                                                    className="text-purple-400 hover:text-purple-300 font-bold hover:underline inline-flex items-center gap-1"
                                                >
                                                    Fiche
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
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
