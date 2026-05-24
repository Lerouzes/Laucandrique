import { createClient } from '@/utils/supabase/server'
import { getManagerStats } from '@/actions/team-management'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, User, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default async function GlobalAlertsPage() {
    const supabase = await createClient()

    // 1. Fetch managers
    const { data: managers } = await supabase
        .from('managers')
        .select('*, manager_teams(name)')
        .order('first_name')

    // 2. Fetch stats and gather active alerts
    const allAlerts = []
    let totalRiskPoints = 0

    for (const m of managers || []) {
        const stats = await getManagerStats(m.id)
        if (stats && stats.alerts && stats.alerts.length > 0) {
            stats.alerts.forEach((alertText: string) => {
                let severity: 'high' | 'critical' | 'medium' = 'medium'
                if (alertText.includes('critique') || alertText.includes('sévère') || stats.riskLevel === 'Critique') {
                    severity = 'critical'
                } else if (stats.riskLevel === 'Élevé') {
                    severity = 'high'
                }

                allAlerts.push({
                    manager: m,
                    text: alertText,
                    severity,
                    managerRisk: stats.riskLevel
                })
            })
        }
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    Flux d'Alertes et Dérives Actives
                </h2>
                <p className="text-xs text-zinc-400">
                    Flux unifié des écarts de conformité, des plaintes en souffrance et des anomalies de dossiers.
                </p>
            </div>

            {/* Main alerts card list */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                        Incidents et Dérives en Attente ({allAlerts.length})
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Liste consolidée des dossiers nécessitant une attention managériale ou d'alignement.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {allAlerts.length === 0 ? (
                        <div className="p-8 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-2xl">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs font-bold text-zinc-200">Aucun signalement actif</p>
                            <p className="text-xxs text-zinc-500 mt-1">Tous les indicateurs des portefeuilles et rencontres sont au vert.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {allAlerts.map((a, idx) => {
                                const badgeStyle = 
                                    a.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                                    a.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-800/40' :
                                    'bg-blue-500/20 text-blue-400 border-blue-800/40'

                                return (
                                    <div key={idx} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xxs">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className={`text-[8px] font-bold uppercase ${badgeStyle}`}>
                                                    {a.severity === 'critical' ? 'Critique' : a.severity === 'high' ? 'Alerte Élevée' : 'Signalement'}
                                                </Badge>
                                                <span className="text-zinc-500">Gestionnaire : <strong>{a.manager.first_name} {a.manager.last_name}</strong></span>
                                                <span className="text-zinc-600">·</span>
                                                <span className="text-zinc-500">Équipe : <strong>{a.manager.manager_teams?.name || 'Aucune'}</strong></span>
                                            </div>
                                            <p className="text-[10px] text-zinc-200 font-semibold">{a.text}</p>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                            <Link 
                                                href={`/team-management/managers/${a.manager.id}`}
                                                className="text-purple-400 hover:text-purple-300 font-bold hover:underline flex items-center gap-1 h-8 rounded-lg bg-zinc-950/40 border border-zinc-850 px-3"
                                            >
                                                Accéder au dossier
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
