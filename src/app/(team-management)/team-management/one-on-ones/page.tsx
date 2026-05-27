import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Handshake, PlusCircle, ArrowRight, Calendar, User } from 'lucide-react'

export default async function OneOnOnesListPage() {
    const supabase = await createClient()

    // Fetch all one-on-ones with manager details
    const { data: oneOnOnes } = await supabase
        .from('one_on_ones')
        .select('*, managers(first_name, last_name)')
        .order('meeting_date', { ascending: false })

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <Handshake className="h-5 w-5 text-purple-400" />
                        Rencontres Individuelles 1-à-1
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Alignements stratégiques, suivi de la charge de travail et évaluation des blocages opérationnels.
                    </p>
                </div>
                <Link
                    href="/team-management/one-on-ones/new"
                    className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 px-4 shadow-lg transition-all"
                >
                    <PlusCircle className="h-4 w-4" />
                    Créer Rencontre
                </Link>
            </div>

            {/* List */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white">Historique des Alignements</CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Liste de toutes les séances d'alignement avec les gestionnaires immobiliers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-xxs text-zinc-300">
                        <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                                <th className="p-3">Gestionnaire</th>
                                <th className="p-3">Date de Rencontre</th>
                                <th className="p-3 text-center">Tâches en retard</th>
                                <th className="p-3 text-center">Appels (Taux)</th>
                                <th className="p-3 text-center">Courriels +48h</th>
                                <th className="p-3 text-center">Statut</th>
                                <th className="p-3 text-right">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                            {(!oneOnOnes || oneOnOnes.length === 0) ? (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center italic text-zinc-500">
                                        Aucune rencontre d'alignement enregistrée.
                                    </td>
                                </tr>
                            ) : (
                                oneOnOnes.map((o) => {
                                    const managerName = o.managers ? `${o.managers.first_name} ${o.managers.last_name}` : 'Inconnu'
                                    const callsTotal = o.calls_total || 0
                                    const callsAnswered = o.calls_answered || 0
                                    const callsPct = callsTotal > 0 ? Math.round((callsAnswered / callsTotal) * 100) : 0
                                    
                                    const statusBadge = 
                                        o.status === 'completed' 
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40' 
                                            : 'bg-amber-500/20 text-amber-400 border-amber-800/40'

                                    return (
                                        <tr key={o.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-zinc-200 flex items-center gap-2">
                                                <User className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                                {managerName}
                                            </td>
                                            <td className="p-3 text-zinc-300 font-mono">
                                                {new Date(o.meeting_date).toLocaleDateString('fr-CA')}
                                            </td>
                                            <td className="p-3 text-center font-semibold text-zinc-300">{o.late_tasks}</td>
                                            <td className="p-3 text-center">
                                                {callsTotal > 0 ? (
                                                    <span className={`font-bold text-xs ${
                                                        callsPct >= 80 ? 'text-emerald-400' :
                                                        callsPct > 55 ? 'text-amber-400' :
                                                        'text-rose-500'
                                                    }`}>
                                                        {callsPct}%
                                                        <span className="text-zinc-500 font-normal ml-1 text-[10px]">({callsAnswered}/{callsTotal})</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-500 italic text-[10px]">N/A</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-zinc-300">{o.emails_over_48h}</td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={`text-[8px] font-bold px-2 py-0.5 ${statusBadge}`}>
                                                    {o.status === 'completed' ? 'Complétée' : 'Brouillon'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Link
                                                    href={`/team-management/one-on-ones/${o.id}`}
                                                    className="text-purple-400 hover:text-purple-300 font-bold hover:underline inline-flex items-center gap-1"
                                                >
                                                    Ouvrir
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
