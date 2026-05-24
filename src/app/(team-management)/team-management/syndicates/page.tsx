import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, PlusCircle, ArrowRight, ShieldAlert, CheckCircle, HelpCircle, Activity } from 'lucide-react'

export default async function SyndicatesBoardPage() {
    const supabase = await createClient()

    // 1. Fetch active syndicates
    const { data: clients } = await supabase
        .from('clients')
        .select('*, managers(first_name, last_name), contracts(*)')
        .eq('status', 'active')
        .order('company_name')

    // 2. Fetch audits
    const { data: audits } = await supabase
        .from('syndicate_audits')
        .select('*')
        .order('audit_date', { ascending: false })

    // Find latest audit for each syndicate
    const latestAuditMap: Record<string, any> = {}
    audits?.forEach(audit => {
        if (!latestAuditMap[audit.client_id]) {
            latestAuditMap[audit.client_id] = audit
        }
    })

    // Classify syndicates
    const excellent: any[] = []
    const stable: any[] = []
    const atRisk: any[] = []
    const critical: any[] = []
    const unaudited: any[] = []

    (clients || []).forEach(c => {
        const audit = latestAuditMap[c.id]
        if (!audit) {
            unaudited.push({ client: c, audit: null })
        } else {
            const score = Number(audit.health_score)
            const payload = { client: c, audit }
            if (score >= 90) excellent.push(payload)
            else if (score >= 75) stable.push(payload)
            else if (score >= 60) atRisk.push(payload)
            else critical.push(payload)
        }
    })

    const boardSections = [
        { 
            title: 'Critique (< 60%)', 
            list: critical, 
            badge: 'bg-rose-500/20 text-rose-400 border-rose-800/40', 
            icon: ShieldAlert,
            iconColor: 'text-rose-400' 
        },
        { 
            title: 'À Risque (60 - 74%)', 
            list: atRisk, 
            badge: 'bg-amber-500/20 text-amber-400 border-amber-800/40', 
            icon: ShieldAlert,
            iconColor: 'text-amber-400' 
        },
        { 
            title: 'Stable (75 - 89%)', 
            list: stable, 
            badge: 'bg-blue-500/20 text-blue-400 border-blue-800/40', 
            icon: CheckCircle,
            iconColor: 'text-blue-400' 
        },
        { 
            title: 'Excellent (90 - 100%)', 
            list: excellent, 
            badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40', 
            icon: CheckCircle,
            iconColor: 'text-emerald-400' 
        },
        { 
            title: 'Non audité', 
            list: unaudited, 
            badge: 'bg-zinc-900 text-zinc-500 border-zinc-800', 
            icon: HelpCircle,
            iconColor: 'text-zinc-500' 
        }
    ]

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-400" />
                        Tableau de Santé des Syndicats
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Visualisation globale de l'état sanitaire du portefeuille immobilier par niveau de risque.
                    </p>
                </div>
                <Link
                    href="/team-management/audits/new"
                    className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 px-4 shadow-lg transition-all"
                >
                    <PlusCircle className="h-4 w-4" />
                    Nouvel Audit
                </Link>
            </div>

            {/* Kanban-like health board */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto items-start min-h-[500px]">
                {boardSections.map((sect, idx) => {
                    const Icon = sect.icon
                    return (
                        <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col gap-3 min-w-[200px]">
                            {/* Section Header */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider">{sect.title}</span>
                                <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0.5 ${sect.badge}`}>
                                    {sect.list.length}
                                </Badge>
                            </div>

                            {/* Section list */}
                            <div className="space-y-2.5">
                                {sect.list.length === 0 ? (
                                    <div className="p-4 border border-dashed border-zinc-900 rounded-xl text-center">
                                        <span className="text-[9px] text-zinc-600 italic">Vide</span>
                                    </div>
                                ) : (
                                    sect.list.map(({ client, audit }) => {
                                        const managerName = client.managers ? `${client.managers.first_name[0]}.${client.managers.last_name}` : 'N/A'
                                        const contract = client.contracts?.[0]
                                        return (
                                            <div 
                                                key={client.id}
                                                className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl hover:border-purple-800/40 transition-all text-xxs space-y-2 relative group"
                                            >
                                                <div className="flex justify-between items-start gap-1">
                                                    <span className="font-bold text-zinc-200 truncate pr-4 block">{client.company_name || client.full_name}</span>
                                                    <Icon className={`h-3.5 w-3.5 ${sect.iconColor} shrink-0`} />
                                                </div>

                                                <div className="flex justify-between text-[9px] text-zinc-400">
                                                    <span>Gest. : {managerName}</span>
                                                    {contract?.package_name && (
                                                        <span className="text-purple-400 font-semibold">{contract.package_name}</span>
                                                    )}
                                                </div>

                                                {audit && (
                                                    <div className="flex justify-between items-center text-[9px] pt-1.5 border-t border-zinc-850">
                                                        <span className="text-zinc-500 font-mono">{new Date(audit.audit_date).toLocaleDateString('fr-CA')}</span>
                                                        <Link 
                                                            href={`/team-management/audits/${audit.id}`}
                                                            className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5 hover:underline"
                                                        >
                                                            Audit <ArrowRight className="h-2 w-2" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
