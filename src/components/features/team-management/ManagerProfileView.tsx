'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    User, 
    TrendingUp, 
    Building2, 
    UsersRound, 
    AlertTriangle, 
    Handshake, 
    BarChart3, 
    Calendar,
    FileText,
    Activity,
    Phone,
    Mail,
    PlusCircle,
    DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CallsStatsPanel } from './CallsStatsPanel'
import { toast } from 'sonner'

export function ManagerProfileView({
    manager,
    stats,
    syndicates = [],
    assemblies = [],
    complaints = [],
    oneOnOnes = [],
    monthlyWorkload = [],
    monthlyCalls = [],
    audits = [],
    userRole = 'Operations'
}: {
    manager: any
    stats: any
    syndicates: any[]
    assemblies: any[]
    complaints: any[]
    oneOnOnes: any[]
    monthlyWorkload: any[]
    monthlyCalls: any[]
    audits: any[]
    userRole?: string
}) {
    const [activeTab, setActiveTab] = useState('overview')
    const [salaryVal, setSalaryVal] = useState(manager.salary?.toString() || '0')
    const [directionNotesVal, setDirectionNotesVal] = useState(manager.direction_notes || '')
    const [isSaving, setIsSaving] = useState(false)

    const tabs = [
        { id: 'overview', name: 'Aperçu', icon: User },
        { id: 'performance', name: 'Performance', icon: BarChart3 },
        { id: 'syndicates', name: 'Syndicats', icon: Building2 },
        { id: 'assemblies', name: 'Assemblées', icon: UsersRound },
        { id: 'complaints', name: 'Plaintes', icon: AlertTriangle },
        { id: 'one-on-ones', name: 'Rencontres 1v1', icon: Handshake },
        { id: 'workload', name: 'Charge de travail', icon: Activity },
    ]

    if (userRole === 'Master' || userRole === 'Direction') {
        tabs.push({ id: 'sensitive', name: 'Informations Sensibles', icon: DollarSign })
    }

    const handleSaveSensitiveInfo = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const formData = new FormData()
            formData.set('salary', salaryVal)
            formData.set('direction_notes', directionNotesVal)

            const { updateManagerSensitiveInfoAction } = await import('@/actions/team-management')
            const res = await updateManagerSensitiveInfoAction(manager.id, formData)
            if (res && res.success) {
                toast.success('Informations sensibles mises à jour avec succès')
            } else {
                toast.error('Erreur lors de la mise à jour')
            }
        } catch (err: any) {
            console.error('Error saving sensitive info:', err)
            toast.error(err.message || 'Erreur inattendue')
        } finally {
            setIsSaving(false)
        }
    }


    return (
        <div className="space-y-6">
            {/* Manager profile card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-purple-900/40 border border-purple-800/40 flex items-center justify-center font-bold text-purple-400 text-xl">
                        {((manager.first_name?.[0] || '') + (manager.last_name?.[0] || '')).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{manager.first_name} {manager.last_name}</h2>
                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                            <span className="bg-purple-950/40 border border-purple-850 px-2 py-0.5 rounded text-purple-400 font-bold uppercase text-[9px]">
                                {manager.manager_teams?.name || 'Aucune équipe'}
                            </span>
                            {manager.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {manager.phone}</span>}
                            {manager.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {manager.email}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={cn(
                        "h-7 text-xs font-bold px-3 py-0.5 border",
                        stats.riskLevel === 'Faible' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-800/30' :
                        stats.riskLevel === 'Modéré' ? 'bg-blue-500/10 text-blue-400 border-blue-800/30' :
                        stats.riskLevel === 'Élevé' ? 'bg-amber-500/10 text-amber-400 border-amber-800/30' :
                        'bg-rose-500/10 text-rose-400 border-rose-800/30'
                    )}>
                        Risque: {stats.riskLevel}
                    </Badge>

                    <Badge variant="outline" className="h-7 text-xs font-bold px-3 py-0.5 border border-purple-800 bg-purple-950/20 text-purple-300">
                        Score: {stats.performanceScore}%
                    </Badge>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-zinc-800 overflow-x-auto gap-2">
                {tabs.map((t) => {
                    const Icon = t.icon
                    const isActive = activeTab === t.id
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 pb-3",
                                isActive 
                                    ? "border-purple-500 text-purple-400"
                                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {t.name}
                        </button>
                    )
                })}
            </div>

            {/* Tab contents */}
            <div className="space-y-6">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main statistics cards */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Syndicats Gérés</span>
                                    <span className="text-lg font-bold text-zinc-100 mt-1 block">{stats.syndicatesCount}</span>
                                </div>
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Portes Totales</span>
                                    <span className="text-lg font-bold text-zinc-100 mt-1 block">{stats.doorsCount}</span>
                                </div>
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Revenu Portefeuille</span>
                                    <span className="text-lg font-bold text-emerald-400 mt-1 block">${stats.mrr.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Index Charge</span>
                                    <span className="text-lg font-bold text-zinc-100 mt-1 block">{stats.workloadIndex || 0}</span>
                                </div>
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Changements Forfaits YTD</span>
                                    <span className="text-lg font-bold text-zinc-100 mt-1 block">{stats.packageChangesCount || 0}</span>
                                </div>
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Dernier 1-à-1</span>
                                    <span className="text-sm font-bold text-zinc-200 mt-1.5 block font-mono">
                                        {stats.lastOneOnOneDate ? (() => {
                                            const d = new Date(stats.lastOneOnOneDate)
                                            return isNaN(d.getTime()) ? 'Aucun' : d.toLocaleDateString('fr-CA')
                                        })() : 'Aucun'}
                                    </span>
                                </div>
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl border-purple-900/30">
                                    <span className="text-purple-400 block uppercase font-bold text-[9px] tracking-wider">Projets Approuvés</span>
                                    <span className="text-lg font-bold text-zinc-100 mt-1 block">
                                        {stats.quoteApprovalRate ?? 0}%
                                        <span className="text-xxs font-normal text-zinc-500 ml-1.5">
                                            ({stats.approvedQuotesCount ?? 0}/{(stats.approvedQuotesCount ?? 0) + (stats.deniedQuotesCount ?? 0) + (stats.sentQuotesCount ?? 0)})
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Active managers alarms card */}
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        Alertes et Risques Actifs
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(!stats.alerts || stats.alerts.length === 0) ? (
                                        <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-900/30 text-center">
                                            <p className="text-xxs font-bold text-emerald-400">Aucun risque identifié</p>
                                            <p className="text-xxs text-zinc-500 mt-1">Le dossier de ce gestionnaire est conforme à tous les indicateurs.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {stats.alerts.map((a: string, idx: number) => (
                                                <div key={idx} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center gap-2.5 text-xxs text-zinc-300">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <span>{a}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Quick overview side info */}
                        <div className="space-y-6">
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold text-white">Objectifs & Mission</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xxs text-zinc-400 space-y-3 leading-relaxed">
                                    <p>
                                        L'objectif de Gustav est de standardiser la qualité, détecter les dérives de dossiers et structurer les rencontres d'alignement pour augmenter la capacité de traitement du portefeuille en toute sécurité.
                                    </p>
                                    <div className="border-t border-zinc-800 pt-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0"></div>
                                            <span>S'assurer du respect des budgets des syndicats.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0"></div>
                                            <span>Clôturer les rapports d'inspection de maintenance.</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* 2. PERFORMANCE TAB */}
                {activeTab === 'performance' && (
                    <div className="space-y-6">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-purple-400" />
                                    Statistiques de Performance Mensuelle
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Call response stats card */}
                                    <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-4">
                                        <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Taux de réponse téléphonique (Dernier mois)</h4>
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-2xl font-extrabold text-white">{stats.callsAnsweredPct || 0}%</span>
                                            <span className="text-xxs text-zinc-500">{stats.answeredCalls || 0} répondus / {stats.totalCalls || 0} reçus</span>
                                        </div>
                                        <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${stats.callsAnsweredPct || 0}%` }} />
                                        </div>
                                    </div>

                                    {/* Task completion rate card */}
                                    <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-4">
                                        <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Taux de fermeture des tâches</h4>
                                        {(stats.openTasks + stats.closedTasks === 0) ? (
                                            <p className="text-xs text-zinc-500 italic">Aucune donnée disponible</p>
                                        ) : (
                                            <>
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-2xl font-extrabold text-white">
                                                        {Math.round((stats.closedTasks / (stats.openTasks + stats.closedTasks)) * 100)}%
                                                    </span>
                                                    <span className="text-xxs text-zinc-500">{stats.closedTasks} fermées / {stats.openTasks + stats.closedTasks} totales</span>
                                                </div>
                                                <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-purple-600 rounded-full" 
                                                        style={{ width: `${(stats.closedTasks / (stats.openTasks + stats.closedTasks)) * 100}%` }} 
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Interactive call history panel */}
                                <div className="mt-8">
                                    <CallsStatsPanel
                                        managerId={manager.id}
                                        title="Historique des Appels"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 3. SYNDICATES TAB */}
                {activeTab === 'syndicates' && (
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-purple-400" />
                                Portefeuille Syndicats / Copropriétés
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Liste des mandats de copropriété actifs sous la responsabilité de ce gestionnaire.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xxs text-zinc-300">
                                    <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800 uppercase">
                                        <tr>
                                            <th className="p-3">Nom de la Copropriété</th>
                                            <th className="p-3">Frais de Gestion (MRR)</th>
                                            <th className="p-3">Forfait Contrat</th>
                                            <th className="p-3">Santé Audit</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {syndicates.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center italic text-zinc-500">Aucun syndicat actif assigné.</td>
                                            </tr>
                                        ) : (
                                            syndicates.map((s) => {
                                                const contract = Array.isArray(s.contracts) ? s.contracts[0] : s.contracts
                                                const audit = audits.find(a => a.client_id === s.id)
                                                
                                                let auditScore = 'N/A'
                                                let auditClass = 'text-zinc-500'
                                                
                                                if (audit) {
                                                    const score = Number(audit.health_score)
                                                    auditScore = `${Math.round(score)}%`
                                                    auditClass = 
                                                        score >= 90 ? 'text-emerald-400 font-bold' :
                                                        score >= 75 ? 'text-blue-400' :
                                                        score >= 60 ? 'text-amber-400' : 'text-rose-500 font-bold'
                                                }

                                                return (
                                                    <tr key={s.id} className="hover:bg-zinc-900/20">
                                                        <td className="p-3 font-bold text-zinc-200">
                                                            {s.company_name || s.full_name}
                                                        </td>
                                                        <td className="p-3 text-emerald-400 font-semibold">
                                                            ${Number(contract?.monthly_fee || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-3">
                                                            <Badge variant="outline" className="text-[8px] bg-purple-950/20 text-purple-300 border-purple-800/40">
                                                                {contract?.package_name || 'Aucun'}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={auditClass}>{auditScore}</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Link 
                                                                href={`/team-management/syndicates`}
                                                                className="text-purple-400 hover:text-purple-300 font-bold hover:underline"
                                                            >
                                                                Audit
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 4. ASSEMBLIES TAB */}
                {activeTab === 'assemblies' && (
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <UsersRound className="h-4 w-4 text-purple-400" />
                                Évaluations des Assemblées Générales
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Rapports d'évaluation de la tenue et de la direction des assemblées de copropriétaires.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {assemblies.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucune évaluation d'assemblée disponible.</p>
                                ) : (
                                    assemblies.map((a) => {
                                        // Calculate total score
                                        const opsSum = (a.agenda_sent_on_time || 0) + (a.quorum_respected || 0) + (a.voting_controlled || 0) + (a.duration_reasonable || 0) + (a.technical_prep_complete || 0)
                                        const ldrSum = (a.manager_controlled_room || 0) + (a.discussions_on_track || 0) + (a.conflict_handled_professionally || 0) + (a.answers_clear_confident || 0) + (a.board_confidence_level || 0) + (a.financial_statement_quality || 0)
                                        const docSum = (a.pv_drafted_quickly || 0) + (a.templates_respected || 0) + (a.resolutions_clear || 0) + (a.followup_tasks_created || 0)
                                        
                                        const maxPoints = 15 * 5 // 15 questions * 5 points = 75
                                        const scorePct = Math.round(((opsSum + ldrSum + docSum) / maxPoints) * 100)

                                        return (
                                            <div key={a.id} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3">
                                                <div className="flex justify-between items-center text-xxs">
                                                    <span className="font-bold text-zinc-200">#{a.clients?.company_name || 'Syndicat'}</span>
                                                    <span className="text-zinc-500 font-mono">
                                                        {a.assembly_date ? (() => {
                                                            const d = new Date(a.assembly_date)
                                                            return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('fr-CA')
                                                        })() : 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xxs pt-1">
                                                    <div>
                                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Score Global</span>
                                                        <span className="text-xs font-extrabold text-purple-400 mt-0.5 block">{scorePct}%</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Opérationnel</span>
                                                        <span className="text-xs font-semibold text-zinc-300 mt-0.5 block">{opsSum}/25</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-500 block uppercase font-bold text-[8px]">Leadership</span>
                                                        <span className="text-xs font-semibold text-zinc-300 mt-0.5 block">{ldrSum}/30</span>
                                                    </div>
                                                </div>
                                                {a.notes && (
                                                    <p className="text-[10px] text-zinc-400 leading-relaxed bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/80">
                                                        <strong>Commentaires :</strong> {a.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 5. COMPLAINTS TAB */}
                {activeTab === 'complaints' && (
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Suivi des Plaintes Clients
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Gestion des plaintes ouvertes et résolues concernant le portefeuille.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3.5">
                                {complaints.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucune plainte enregistrée.</p>
                                ) : (
                                    complaints.map((c) => {
                                        const sevStyle = 
                                            c.severity === 'critical' ? 'bg-rose-950/40 text-rose-400 border-rose-800' :
                                            c.severity === 'high' ? 'bg-orange-950/40 text-orange-400 border-orange-850' :
                                            'bg-zinc-950 text-zinc-400 border-zinc-850'

                                        const statusStyle = 
                                            c.status === 'open' ? 'bg-amber-950/40 text-amber-300 border-amber-800' : 'bg-emerald-950/40 text-emerald-300 border-emerald-850'

                                        return (
                                            <div key={c.id} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3 text-xxs">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-zinc-200">{c.title}</p>
                                                        <p className="text-zinc-500">Syndicat: {c.clients?.company_name}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className={`text-[8px] font-bold ${sevStyle}`}>{c.severity}</Badge>
                                                        <Badge variant="outline" className={`text-[8px] font-bold ${statusStyle}`}>{c.status}</Badge>
                                                    </div>
                                                </div>
                                                {c.description && <p className="text-[10px] text-zinc-400 mt-1">{c.description}</p>}
                                                <div className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-850 flex justify-between">
                                                    <span>Signalée le : {c.received_date ? (() => {
                                                        const d = new Date(c.received_date)
                                                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('fr-CA')
                                                    })() : 'N/A'}</span>
                                                    {c.resolved_date && <span>Résolue le : {(() => {
                                                        const d = new Date(c.resolved_date)
                                                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('fr-CA')
                                                    })()}</span>}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 6. ONE-ON-ONES TAB */}
                {activeTab === 'one-on-ones' && (
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-zinc-950/20">
                            <div className="space-y-1">
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    <Handshake className="h-4 w-4 text-purple-400" />
                                    Réunions d'Alignement 1-à-1
                                </CardTitle>
                                <CardDescription className="text-xxs text-zinc-400">
                                    Historique des rencontres de suivi opérationnel individuelles.
                                </CardDescription>
                            </div>
                            <Link 
                                href="/team-management/one-on-ones/new" 
                                className="h-8 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xxs flex items-center gap-1.5 px-3"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Créer Rencontre
                            </Link>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-4">
                                {oneOnOnes.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucune rencontre enregistrée.</p>
                                ) : (
                                    oneOnOnes.map((o) => (
                                        <Link 
                                            key={o.id}
                                            href={`/team-management/one-on-ones/${o.id}`}
                                            className="block p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl hover:border-purple-800/40 hover:bg-zinc-950/30 transition-all text-xxs space-y-2.5"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-zinc-200">
                                                    Rencontre du {o.meeting_date ? (() => {
                                                        const d = new Date(o.meeting_date)
                                                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('fr-CA')
                                                    })() : 'N/A'}
                                                </span>
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] font-bold px-2 py-0.5",
                                                    o.status === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                                                )}>
                                                    {o.status === 'completed' ? 'Complétée' : 'Brouillon'}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div className="text-zinc-500">Tâches en retard : <strong className="text-zinc-300">{o.late_tasks}</strong></div>
                                                <div className="text-zinc-500">Taux de réponse : <strong className="text-zinc-300">{o.calls_total > 0 ? Math.round((o.calls_answered / o.calls_total) * 100) : 0}%</strong></div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 7. WORKLOAD TAB */}
                {activeTab === 'workload' && (
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <Activity className="h-4 w-4 text-purple-400" />
                                Charge de Travail Mensuelle
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Historique des volumes de tâches, communications et index de charge calculés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xxs text-zinc-300">
                                    <thead className="bg-zinc-950/40 text-zinc-400 font-bold border-b border-zinc-800 uppercase">
                                        <tr>
                                            <th className="p-2.5">Mois</th>
                                            <th className="p-2.5 text-center">Communications</th>
                                            <th className="p-2.5 text-center">Tâches ouvertes</th>
                                            <th className="p-2.5 text-center">Tâches résolues</th>
                                            <th className="p-2.5 text-right">Index de Charge</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {monthlyWorkload.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center italic text-zinc-500">Aucun historique de charge de travail enregistré.</td>
                                            </tr>
                                        ) : (
                                            monthlyWorkload.map((w) => {
                                                // Calculate custom workload index for this row
                                                const idx = Math.round(
                                                    (stats.syndicatesCount * 6) +
                                                    (stats.doorsCount * 0.15) +
                                                    (w.communications_received * 0.2) +
                                                    (w.open_tasks * 0.8) +
                                                    (stats.totalCalls * 0.1)
                                                )
                                                return (
                                                    <tr key={w.id}>
                                                        <td className="p-2.5 font-mono">{w.year_month}</td>
                                                        <td className="p-2.5 text-center">{w.communications_received}</td>
                                                        <td className="p-2.5 text-center">{w.open_tasks}</td>
                                                        <td className="p-2.5 text-center">{w.closed_tasks}</td>
                                                        <td className="p-2.5 text-right font-bold text-purple-400">{idx}</td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 8. SENSITIVE INFO TAB */}
                {activeTab === 'sensitive' && (userRole === 'Master' || userRole === 'Direction') && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Financial calculations and profit margin */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-emerald-450 text-emerald-400" />
                                        Rentabilité & Calcul de Marge
                                    </CardTitle>
                                    <CardDescription className="text-xxs text-zinc-400">
                                        Analyse de la marge bénéficiaire générée par ce gestionnaire sur la base de ses contrats sous gestion et de son salaire.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Calculations metrics grid */}
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                                        <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                            <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Revenu Annuel Sous Gestion</span>
                                            <span className="text-lg font-bold text-zinc-100 mt-1 block">
                                                ${(stats.mrr * 12).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 mt-1 block">MRR: ${stats.mrr.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} / mois</span>
                                        </div>

                                        <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                            <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Salaire Annuel</span>
                                            <span className="text-lg font-bold text-zinc-100 mt-1 block">
                                                ${parseFloat(salaryVal).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 mt-1 block">Coût direct du gestionnaire</span>
                                        </div>

                                        {(() => {
                                            const annualValue = stats.mrr * 12
                                            const salary = parseFloat(salaryVal) || 0
                                            const profit = annualValue - salary
                                            const marginPct = annualValue > 0 ? (profit / annualValue) * 100 : 0
                                            const marginColor = marginPct >= 50 ? 'text-emerald-400' : marginPct >= 30 ? 'text-purple-400' : marginPct >= 10 ? 'text-amber-400' : 'text-rose-500'

                                            return (
                                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                                                    <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Marge Bénéficiaire</span>
                                                    <span className={`text-lg font-bold ${marginColor} mt-1 block`}>
                                                        {marginPct.toFixed(1)}%
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 mt-1 block">Profit net: ${profit.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {/* Visual representation of margin */}
                                    {(() => {
                                        const annualValue = stats.mrr * 12
                                        const salary = parseFloat(salaryVal) || 0
                                        const profit = annualValue - salary
                                        const marginPct = annualValue > 0 ? (profit / annualValue) * 100 : 0
                                        const costPct = annualValue > 0 ? (salary / annualValue) * 100 : 0

                                        return annualValue > 0 ? (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xxs font-medium">
                                                    <span className="text-zinc-400">Répartition Revenus vs Salaire</span>
                                                    <span className="text-zinc-400">Coût: {costPct.toFixed(0)}% | Marge: {marginPct.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 flex">
                                                    <div 
                                                        className="h-full bg-rose-600 rounded-l-full" 
                                                        style={{ width: `${Math.min(100, Math.max(0, costPct))}%` }}
                                                        title={`Salaire: ${costPct.toFixed(1)}%`}
                                                    />
                                                    <div 
                                                        className="h-full bg-emerald-500 rounded-r-full" 
                                                        style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
                                                        title={`Marge: ${marginPct.toFixed(1)}%`}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[9px] text-zinc-500">
                                                    <span className="flex items-center gap-1"><span className="h-2 w-2 bg-rose-600 rounded-full inline-block"></span> Salaire du Gestionnaire</span>
                                                    <span className="flex items-center gap-1"><span className="h-2 w-2 bg-emerald-500 rounded-full inline-block"></span> Marge Bénéficiaire</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xxs text-zinc-500 italic">
                                                Aucun contrat actif sous gestion. Impossible de calculer la marge bénéficiaire.
                                            </p>
                                        )
                                    })()}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Settings / Edit form on the right */}
                        <div className="space-y-6">
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold text-white">Éditer les Informations Sensibles</CardTitle>
                                    <CardDescription className="text-xxs text-zinc-400">
                                        Mettre à jour le salaire du gestionnaire et les notes de direction.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSaveSensitiveInfo} className="space-y-4 text-xxs">
                                        <div className="space-y-1.5">
                                            <label className="text-zinc-400 font-bold block">Salaire Annuel ($ CAD)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={salaryVal}
                                                onChange={(e) => setSalaryVal(e.target.value)}
                                                disabled={isSaving}
                                                className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 outline-none focus:border-purple-600 h-9"
                                                placeholder="Ex: 65000"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-zinc-400 font-bold block">Notes de la Direction</label>
                                            <textarea
                                                value={directionNotesVal}
                                                onChange={(e) => setDirectionNotesVal(e.target.value)}
                                                disabled={isSaving}
                                                rows={5}
                                                className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 outline-none focus:border-purple-650 resize-none leading-relaxed"
                                                placeholder="Saisissez vos commentaires ou notes confidentielles ici..."
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isSaving}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            {isSaving ? "Enregistrement..." : "Enregistrer"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
