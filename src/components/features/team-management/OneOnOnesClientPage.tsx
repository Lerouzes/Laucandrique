'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    User, 
    Calendar, 
    ArrowRight, 
    BarChart3, 
    List, 
    LayoutGrid, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    Handshake
} from 'lucide-react'

interface Manager {
    id: string
    first_name: string
    last_name: string
}

interface OneOnOne {
    id: string
    manager_id: string
    meeting_date: string
    status: 'draft' | 'completed'
    meeting_score: number | null
    late_tasks: number
    emails_over_48h: number
    calls_total: number
    calls_answered: number
    managers: Manager | null
}

interface OneOnOnesClientPageProps {
    oneOnOnes: OneOnOne[]
    managers: Manager[]
}

export function OneOnOnesClientPage({ oneOnOnes = [], managers = [] }: OneOnOnesClientPageProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'overview'>('list')

    // Group and find last meeting per manager
    const managersSummary = managers.map(m => {
        const managerMeetings = oneOnOnes.filter(o => o.manager_id === m.id)
        const completedMeetings = managerMeetings.filter(o => o.status === 'completed')
        const lastMeeting = managerMeetings[0] // most recent meeting (completed or draft)
        const lastCompletedMeeting = completedMeetings[0] // most recent completed meeting for score

        return {
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            total_meetings: managerMeetings.length,
            completed_meetings: completedMeetings.length,
            last_meeting_date: lastMeeting ? lastMeeting.meeting_date : null,
            last_meeting_id: lastMeeting ? lastMeeting.id : null,
            last_meeting_score: lastCompletedMeeting ? lastCompletedMeeting.meeting_score : null
        }
    })

    const getGradeInfo = (score: number | null | undefined) => {
        if (score === null || score === undefined) {
            return { letter: '-', color: 'text-zinc-500 bg-zinc-950/40 border-zinc-800' }
        }
        if (score >= 90) return { letter: 'A+', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40' }
        if (score >= 80) return { letter: 'A', color: 'text-emerald-300 bg-emerald-950/20 border-emerald-900/40' }
        if (score >= 70) return { letter: 'B', color: 'text-purple-400 bg-purple-950/20 border-purple-800/40' }
        if (score >= 60) return { letter: 'C', color: 'text-amber-400 bg-amber-950/20 border-amber-900/40' }
        if (score >= 50) return { letter: 'D', color: 'text-orange-400 bg-orange-950/20 border-orange-900/40' }
        return { letter: 'E', color: 'text-rose-400 bg-rose-950/20 border-rose-900/40' }
    }

    // Helper to get French month and year, e.g. "Juin 2026"
    const getMonthYearLabel = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00') // avoid timezone shifts
        const formatted = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    // Group one-on-ones by month (YYYY-MM)
    const groupedMeetings: Record<string, OneOnOne[]> = {}
    oneOnOnes.forEach(o => {
        const monthKey = o.meeting_date.substring(0, 7) // "YYYY-MM"
        if (!groupedMeetings[monthKey]) {
            groupedMeetings[monthKey] = []
        }
        groupedMeetings[monthKey].push(o)
    })

    // Sort month keys in descending order
    const sortedMonthKeys = Object.keys(groupedMeetings).sort((a, b) => b.localeCompare(a))

    return (
        <div className="space-y-6">
            {/* Toggle tabs bar */}
            <div className="flex border-b border-zinc-850 gap-6">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-1.5 ${
                        activeTab === 'list' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <List className="h-3.5 w-3.5" />
                    Liste des Séances
                    {activeTab === 'list' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-1.5 ${
                        activeTab === 'overview' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Vue d'ensemble par gestionnaire
                    {activeTab === 'overview' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
            </div>

            {/* TAB: LIST */}
            {activeTab === 'list' && (
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
                                    sortedMonthKeys.map((monthKey) => {
                                        const monthMeetings = groupedMeetings[monthKey]
                                        const monthLabel = getMonthYearLabel(monthMeetings[0].meeting_date)
                                        return (
                                            <>
                                                <tr key={monthKey} className="bg-zinc-950/40 border-y border-zinc-800">
                                                    <td colSpan={7} className="p-2.5 font-bold text-purple-400 text-xxs uppercase tracking-wider">
                                                        {monthLabel} ({monthMeetings.length} séance{monthMeetings.length > 1 ? 's' : ''})
                                                    </td>
                                                </tr>
                                                {monthMeetings.map((o) => {
                                                    const managerName = o.managers ? `${o.managers.first_name} ${o.managers.last_name}` : 'Inconnu'
                                                    const callsTotal = o.calls_total || 0
                                                    const callsAnswered = o.calls_answered || 0
                                                    const callsPct = callsTotal > 0 ? Math.round((callsAnswered / callsTotal) * 100) : 0
                                                    
                                                    const statusBadge = 
                                                        o.status === 'completed' 
                                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40' 
                                                            : 'bg-amber-500/20 text-amber-400 border-amber-800/40'

                                                    return (
                                                        <tr key={o.id} className="hover:bg-zinc-900/30 transition-colors cursor-pointer text-xxs border-b border-zinc-850/50">
                                                            <td className="p-0 font-semibold text-zinc-200">
                                                                <Link href={`/team-management/one-on-ones/${o.id}`} className="p-3 flex items-center gap-2 hover:text-purple-400 transition-colors w-full h-full">
                                                                    <User className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                                                    {managerName}
                                                                </Link>
                                                            </td>
                                                            <td className="p-0 text-zinc-300 font-mono">
                                                                <Link href={`/team-management/one-on-ones/${o.id}`} className="p-3 hover:text-purple-400 transition-colors block w-full h-full">
                                                                    {new Date(o.meeting_date).toLocaleDateString('fr-CA')}
                                                                </Link>
                                                            </td>
                                                            <td className="p-0 text-center font-semibold text-zinc-300">
                                                                <Link href={`/team-management/one-on-ones/${o.id}`} className="p-3 hover:text-purple-400 transition-colors block w-full h-full">
                                                                    {o.late_tasks}
                                                                </Link>
                                                            </td>
                                                            <td className="p-0 text-center">
                                                                <Link href={`/team-management/one-on-ones/${o.id}`} className="p-3 hover:text-purple-400 transition-colors block w-full h-full">
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
                                                                </Link>
                                                            </td>
                                                            <td className="p-0 text-center text-zinc-300">
                                                                <Link href={`/team-management/one-on-ones/${o.id}`} className="p-3 hover:text-purple-400 transition-colors block w-full h-full">
                                                                    {o.emails_over_48h}
                                                                </Link>
                                                            </td>
                                                            <td className="p-0 text-center">
                                                                <Link href={`/team-management/one-on-ones/${o.id}`} className="p-3 hover:text-purple-400 transition-colors block w-full h-full">
                                                                    <Badge variant="outline" className={`text-[8px] font-bold px-2 py-0.5 ${statusBadge}`}>
                                                                        {o.status === 'completed' ? 'Complétée' : 'Brouillon'}
                                                                    </Badge>
                                                                </Link>
                                                            </td>
                                                            <td className="p-0 text-right">
                                                                <Link
                                                                    href={`/team-management/one-on-ones/${o.id}`}
                                                                    className="p-3 text-purple-400 hover:text-purple-300 font-bold hover:underline flex justify-end items-center gap-1 w-full h-full"
                                                                >
                                                                    Ouvrir
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {managersSummary.map(m => {
                        const hasScore = m.last_meeting_score !== null
                        const grade = getGradeInfo(m.last_meeting_score)
                        
                        return (
                            <Card key={m.id} className="bg-[#16171e]/70 border-zinc-800 shadow-md flex flex-col justify-between hover:border-purple-900/35 transition-all">
                                <CardHeader className="pb-3 bg-zinc-950/20">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-sm font-bold text-white uppercase flex items-center gap-1.5">
                                                <User className="h-4 w-4 text-purple-400" />
                                                {m.first_name} {m.last_name}
                                            </CardTitle>
                                            <CardDescription className="text-[10px] text-zinc-500 font-medium">
                                                {m.total_meetings} alignement{m.total_meetings > 1 ? 's' : ''} au total
                                            </CardDescription>
                                        </div>

                                        {/* Grade badge */}
                                        <Badge variant="outline" className={`text-xs font-black px-2 py-0.5 font-mono ${grade.color}`}>
                                            Note: {grade.letter}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4 text-xs text-zinc-300">
                                    <div className="grid grid-cols-2 gap-3 text-xxs">
                                        <div className="p-2 bg-zinc-950/45 border border-zinc-850 rounded-xl space-y-0.5">
                                            <span className="text-zinc-500 text-[8px] uppercase font-bold block">Score 1v1</span>
                                            <strong className="text-white text-xs font-mono">{hasScore ? `${m.last_meeting_score}%` : 'N/A'}</strong>
                                        </div>
                                        <div className="p-2 bg-zinc-950/45 border border-zinc-850 rounded-xl space-y-0.5">
                                            <span className="text-zinc-500 text-[8px] uppercase font-bold block">Complétées</span>
                                            <strong className="text-white text-xs font-mono">{m.completed_meetings} / {m.total_meetings}</strong>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xxs text-zinc-400">
                                        <Calendar className="h-3.5 w-3.5 text-purple-450 shrink-0" />
                                        <span>Dernière rencontre :</span>
                                        <span className="font-mono text-white font-bold">
                                            {m.last_meeting_date 
                                                ? new Date(m.last_meeting_date).toLocaleDateString('fr-CA') 
                                                : 'Aucune'
                                            }
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t border-zinc-850 flex gap-2">
                                        {m.last_meeting_id ? (
                                            <Link href={`/team-management/one-on-ones/${m.last_meeting_id}`} className="flex-1">
                                                <Button variant="outline" className="w-full text-[10px] font-bold h-8 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-purple-400 hover:text-purple-300">
                                                    Dernière séance
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Button disabled variant="outline" className="flex-1 text-[10px] font-bold h-8 border-zinc-800 bg-zinc-950/40 text-zinc-600 cursor-not-allowed">
                                                Aucune séance
                                            </Button>
                                        )}
                                        <Link href={`/team-management/one-on-ones/new?managerId=${m.id}`} className="flex-1">
                                            <Button className="w-full text-[10px] font-bold h-8 bg-purple-650 hover:bg-purple-750 text-white">
                                                Nouvelle séance
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
