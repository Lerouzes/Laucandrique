'use client'

import { useTransition, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { updateManagerAction } from '@/actions/managers'
import {
    User,
    Mail,
    Phone,
    Layers,
    DollarSign,
    Target,
    Briefcase,
    TrendingUp,
    ChevronLeft,
    Save,
    Award,
    CheckCircle2
} from 'lucide-react'

export function ManagerDashboard({
    manager,
    quotes,
    managers,
    managerTeams
}: {
    manager: any
    quotes: any[]
    managers: any[]
    managerTeams: any[]
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // 1. Current Manager Quotes & Stats
    const managerQuotes = useMemo(() => {
        return quotes.filter((q: any) => q.manager_id === manager.id)
    }, [quotes, manager.id])

    const approvedQuotes = useMemo(() => managerQuotes.filter((q: any) => q.status === 'approved' || q.status === 'completed'), [managerQuotes])
    const deniedQuotes = useMemo(() => managerQuotes.filter((q: any) => q.status === 'denied'), [managerQuotes])
    const sentQuotes = useMemo(() => managerQuotes.filter((q: any) => q.status === 'sent'), [managerQuotes])

    const totalRevenue = useMemo(() => {
        return approvedQuotes.reduce((acc, q) => acc + (q.total || 0), 0)
    }, [approvedQuotes])

    const winRate = useMemo(() => {
        const totalPresented = approvedQuotes.length + deniedQuotes.length + sentQuotes.length
        return totalPresented > 0 ? (approvedQuotes.length / totalPresented) * 100 : 0
    }, [approvedQuotes, deniedQuotes, sentQuotes])

    const avgQuoteValue = useMemo(() => {
        return approvedQuotes.length > 0 ? totalRevenue / approvedQuotes.length : 0
    }, [approvedQuotes, totalRevenue])

    // 2. Global Company / Other Managers Comparison Stats
    const allManagersStats = useMemo(() => {
        const statsMap: Record<string, { id: string, name: string, revenue: number, approvedCount: number, deniedCount: number, sentCount: number, totalCount: number, winRate: number }> = {}

        // Prepopulate all active managers
        managers.forEach(m => {
            statsMap[m.id] = {
                id: m.id,
                name: `${m.first_name} ${m.last_name}`,
                revenue: 0,
                approvedCount: 0,
                deniedCount: 0,
                sentCount: 0,
                totalCount: 0,
                winRate: 0
            }
        })

        // Accumulate statistics
        quotes.forEach(q => {
            const mId = q.manager_id
            if (!mId || !statsMap[mId]) return

            statsMap[mId].totalCount += 1
            if (q.status === 'approved' || q.status === 'completed') {
                statsMap[mId].approvedCount += 1
                statsMap[mId].revenue += (q.total || 0)
            } else if (q.status === 'denied') {
                statsMap[mId].deniedCount += 1
            } else if (q.status === 'sent') {
                statsMap[mId].sentCount += 1
            }
        })

        // Calculate winRate for each manager
        Object.values(statsMap).forEach(m => {
            const presented = m.approvedCount + m.deniedCount + m.sentCount
            m.winRate = presented > 0 ? (m.approvedCount / presented) * 100 : 0
        })

        // Sort by revenue
        return Object.values(statsMap).sort((a, b) => b.revenue - a.revenue)
    }, [quotes, managers])

    // Ranking and comparison metrics
    const rank = useMemo(() => {
        const index = allManagersStats.findIndex(m => m.id === manager.id)
        return index !== -1 ? index + 1 : allManagersStats.length
    }, [allManagersStats, manager.id])

    const averageManagerRevenue = useMemo(() => {
        if (allManagersStats.length === 0) return 0
        const total = allManagersStats.reduce((acc, m) => acc + m.revenue, 0)
        return total / allManagersStats.length
    }, [allManagersStats])

    const averageManagerWinRate = useMemo(() => {
        const managersWithPresentedQuotes = allManagersStats.filter(m => {
            const approved = quotes.filter(q => q.manager_id === m.id && (q.status === 'approved' || q.status === 'completed')).length
            const denied = quotes.filter(q => q.manager_id === m.id && q.status === 'denied').length
            const sent = quotes.filter(q => q.manager_id === m.id && q.status === 'sent').length
            return (approved + denied + sent) > 0
        })
        if (managersWithPresentedQuotes.length === 0) return 0
        const total = managersWithPresentedQuotes.reduce((acc, m) => {
            const approved = quotes.filter(q => q.manager_id === m.id && (q.status === 'approved' || q.status === 'completed')).length
            const denied = quotes.filter(q => q.manager_id === m.id && q.status === 'denied').length
            const sent = quotes.filter(q => q.manager_id === m.id && q.status === 'sent').length
            const presented = approved + denied + sent
            return acc + (presented > 0 ? (approved / presented) * 100 : 0)
        }, 0)
        return total / managersWithPresentedQuotes.length
    }, [allManagersStats, quotes])

    const revenueDifferencePercentage = useMemo(() => {
        if (averageManagerRevenue === 0) return 0
        return ((totalRevenue - averageManagerRevenue) / averageManagerRevenue) * 100
    }, [totalRevenue, averageManagerRevenue])

    // 3. Form submission
    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
            try {
                await updateManagerAction(manager.id, fd)
                toast.success('Gestionnaire mis à jour avec succès.')
                router.refresh()
            } catch (err: any) {
                toast.error('Erreur', { description: err.message || 'Impossible de sauvegarder.' })
            }
        })
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Link
                        href="/settings"
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                    >
                        <ChevronLeft className="h-3 w-3" />
                        Retour aux paramètres
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100 mt-2 flex items-center gap-2">
                        {manager.first_name} {manager.last_name}
                        {manager.manager_teams?.name && (
                            <Badge variant="outline" className="bg-cyan-950/40 text-cyan-300 border-cyan-800 text-xxs font-normal">
                                {manager.manager_teams.name}
                            </Badge>
                        )}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-zinc-950 border border-zinc-800 text-zinc-300 py-1.5 px-3 rounded-lg flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        Rang: #{rank} sur {allManagersStats.length}
                    </Badge>
                </div>
            </div>

            {/* Core Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-cyan-950/50 p-2 border border-cyan-800/30">
                        <DollarSign className="h-4 w-4 text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Revenu Signé</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(totalRevenue).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                        {approvedQuotes.length} soumissions signées
                    </p>
                </div>

                {/* Win Rate */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-indigo-950/50 p-2 border border-indigo-800/30">
                        <Target className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Taux d'Approbation</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        {Math.round(winRate)}%
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        {approvedQuotes.length} acceptées · {deniedQuotes.length} refusées · {sentQuotes.length} en attente
                    </p>
                </div>

                {/* Total Quotes */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-amber-950/50 p-2 border border-amber-800/30">
                        <Briefcase className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Soumissions</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        {managerQuotes.length}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        Toutes soumissions confondues
                    </p>
                </div>

                {/* Avg Ticket */}
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-emerald-950/50 p-2 border border-emerald-800/30">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Panier Moyen</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(avgQuoteValue).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        Moyenne par projet signé
                    </p>
                </div>
            </div>

            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN: CONTACT DETAILS & HISTORY */}
                <div className="space-y-6">
                    {/* Contact Details Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <User className="h-4 w-4 text-cyan-500" />
                                Informations de Contact
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Modifiez les détails et l'équipe assignée de ce gestionnaire.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-zinc-300 text-xs font-semibold">Prénom *</Label>
                                        <Input name="first_name" defaultValue={manager.first_name || ''} required className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-zinc-300 text-xs font-semibold">Nom *</Label>
                                        <Input name="last_name" defaultValue={manager.last_name || ''} required className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-zinc-300 text-xs font-semibold flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-cyan-500" /> Courriel
                                    </Label>
                                    <Input name="email" type="email" defaultValue={manager.email || ''} placeholder="adresse@email.com" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-zinc-300 text-xs font-semibold flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-cyan-500" /> Téléphone
                                    </Label>
                                    <Input name="phone" type="tel" defaultValue={manager.phone || ''} placeholder="(514) 123-4567" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-zinc-300 text-xs font-semibold flex items-center gap-1">
                                        <Layers className="h-3 w-3 text-cyan-500" /> Équipe de gestionnaires
                                    </Label>
                                    <select name="team_id" defaultValue={manager.team_id || ''} className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-700">
                                        <option value="" className="bg-zinc-900 text-zinc-400">Sans équipe (Individuel)</option>
                                        {managerTeams.map((team: any) => (
                                            <option key={team.id} value={team.id} className="bg-zinc-900 text-zinc-100">
                                                Équipe: {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Button type="submit" disabled={isPending} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-1.5">
                                    <Save className="h-4 w-4" />
                                    {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Historic of Quotes Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-cyan-500" />
                                Historique des Soumissions
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Liste chronologique des soumissions sous la responsabilité de ce gestionnaire.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                {managerQuotes.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-4 text-center">Aucune soumission associée.</p>
                                ) : (
                                    managerQuotes.map((q: any) => {
                                        const badgeStyle = 
                                            q.status === 'approved' ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800' :
                                            q.status === 'denied' ? 'bg-rose-950/40 text-rose-300 border-rose-800' :
                                            q.status === 'sent' ? 'bg-amber-950/40 text-amber-300 border-amber-800' :
                                            'bg-zinc-950 text-zinc-400 border-zinc-800'
                                        
                                        const statusLabel = 
                                            q.status === 'approved' ? 'Signé' :
                                            q.status === 'denied' ? 'Refusé' :
                                            q.status === 'sent' ? 'Envoyé' : 'Brouillon'

                                        return (
                                            <Link
                                                key={q.id}
                                                href={`/quotes/${q.id}`}
                                                className="flex justify-between items-center p-3 rounded-xl border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all gap-3"
                                            >
                                                <div className="space-y-0.5 truncate">
                                                    <p className="text-xs font-semibold text-zinc-400">#{q.quote_number || 'N/A'}</p>
                                                    <p className="text-sm font-bold text-zinc-200 truncate">{q.title || 'Sans titre'}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-sm font-semibold text-zinc-200">
                                                        ${Math.round(q.total || 0).toLocaleString('fr-CA')}
                                                    </span>
                                                    <Badge variant="outline" className={`text-xxs px-2 py-0.5 shrink-0 ${badgeStyle}`}>
                                                        {statusLabel}
                                                    </Badge>
                                                </div>
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: STATISTICS & COMPARATIVE VIEW */}
                <div className="space-y-6">
                    {/* Performance Comparison Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-cyan-500" />
                                Comparatif de Performance
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Comparez le volume d'affaires signé de ce gestionnaire avec le reste de l'équipe.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Bar Chart comparing revenue */}
                            <div className="h-[240px] w-full mt-2">
                                {allManagersStats.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                                        Aucune donnée comparative.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={allManagersStats} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                            <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000)}k`} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(39, 39, 42, 0.2)' }}
                                                contentStyle={{
                                                    backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                                    borderColor: '#27272a',
                                                    borderRadius: '12px',
                                                }}
                                                formatter={(v: any) => [`$${Number(v || 0).toLocaleString('fr-CA')}`, 'Revenu Signé']}
                                            />
                                            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={35}>
                                                {allManagersStats.map((entry, index) => {
                                                    const isCurrent = entry.id === manager.id
                                                    return (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={isCurrent ? '#6366f1' : '#27272a'}
                                                            stroke={isCurrent ? '#06b6d4' : undefined}
                                                            strokeWidth={isCurrent ? 1.5 : undefined}
                                                        />
                                                    )
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Detailed metrics comparison grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                                
                                {/* Revenue vs Average */}
                                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/30">
                                    <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Volume vs Moyenne</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-lg font-bold text-zinc-100">
                                            {revenueDifferencePercentage >= 0 ? '+' : ''}
                                            {Math.round(revenueDifferencePercentage)}%
                                        </span>
                                        <span className="text-xxs text-zinc-500">de la moyenne</span>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${revenueDifferencePercentage >= 0 ? 'bg-cyan-500' : 'bg-rose-500'}`} 
                                            style={{ width: `${Math.min(Math.max(50 + (revenueDifferencePercentage / 2), 10), 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xxs text-zinc-500 mt-2">
                                        Moyenne de l'équipe: ${Math.round(averageManagerRevenue).toLocaleString('fr-CA')}
                                    </p>
                                </div>

                                {/* Win Rate vs Average */}
                                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/30">
                                    <p className="text-xxs font-bold text-zinc-500 uppercase tracking-wider">Taux d'Approbation vs Moyenne</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-lg font-bold text-zinc-100">
                                            {Math.round(winRate)}%
                                        </span>
                                        <span className="text-xxs text-zinc-500">
                                            (vs {Math.round(averageManagerWinRate)}% moyenne)
                                        </span>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 rounded-full" 
                                            style={{ width: `${winRate}%` }}
                                        />
                                    </div>
                                    <p className="text-xxs text-zinc-500 mt-2">
                                        Sur un total de {approvedQuotes.length + deniedQuotes.length + sentQuotes.length} soumissions présentées.
                                    </p>
                                </div>
                            </div>

                            {/* Ranking Card Info */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-cyan-950/10 flex items-start gap-3">
                                <Award className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <h5 className="text-xs font-bold text-zinc-200">Analyse de positionnement</h5>
                                    <p className="text-xxs text-zinc-400 leading-normal">
                                        {rank === 1 ? (
                                            `Félicitations! ${manager.first_name} est actuellement le gestionnaire ayant généré le plus de chiffre d'affaires signé de l'entreprise.`
                                        ) : (
                                            `${manager.first_name} occupe le rang #${rank} sur ${allManagersStats.length} gestionnaires. Il est à $${Math.round(Math.max(0, (allManagersStats[0]?.revenue || 0) - totalRevenue)).toLocaleString('fr-CA')} de rattraper le leader de l'entreprise.`
                                        )}
                                    </p>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
