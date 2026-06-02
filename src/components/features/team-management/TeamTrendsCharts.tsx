'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { Loader2, TrendingUp, Activity, BarChart3 } from 'lucide-react'

interface TrendItem {
    month: string
    totalCalls: number
    answeredCalls: number
    callRate: number
    communications: number
    openTasks: number
    closedTasks: number
    taskRate: number
}

interface TeamTrendsChartsProps {
    trends: TrendItem[]
}

export function TeamTrendsCharts({ trends = [] }: TeamTrendsChartsProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const formatMonthLabel = (ym: any) => {
        if (!ym || typeof ym !== 'string') return ''
        const [y, m] = ym.split('-').map(Number)
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
        return `${months[m - 1]} ${y}`
    }

    if (trends.length === 0) {
        return (
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardContent className="h-44 flex flex-col items-center justify-center text-zinc-550 text-xs italic">
                    Aucune donnée historique disponible pour tracer les graphiques d'évolution.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Rates Line Chart */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-400" />
                        Taux de Réussite de l'Équipe
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Évolution du taux de réponse téléphonique et du taux de complétion des tâches.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="h-[260px] w-full">
                        {!isMounted ? (
                            <div className="h-full w-full flex items-center justify-center text-zinc-550 text-xs gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                                Chargement du graphique...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#71717a"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={formatMonthLabel}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                            borderColor: '#27272a',
                                            borderRadius: '12px',
                                            fontSize: 10,
                                            color: '#fff'
                                        }}
                                        formatter={(v: any, name: any) => [
                                            `${v}%`,
                                            name === 'callRate' ? 'Taux de réponse' : 'Complétion tâches'
                                        ]}
                                        labelFormatter={formatMonthLabel}
                                    />
                                    <Legend 
                                        iconType="circle" 
                                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                        formatter={(value) => value === 'callRate' ? 'Taux de réponse' : 'Taux de complétion tâches'}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="callRate"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#10b981' }}
                                        activeDot={{ r: 5 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="taskRate"
                                        stroke="#a855f7"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#a855f7' }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Volumes Bar Chart */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                        Volumes Globaux d'Activité
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Comparaison mensuelle des volumes d'appels reçus, courriels traités et tâches fermées.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="h-[260px] w-full">
                        {!isMounted ? (
                            <div className="h-full w-full flex items-center justify-center text-zinc-550 text-xs gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                                Chargement du graphique...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trends} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#71717a"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={formatMonthLabel}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => String(v)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                            borderColor: '#27272a',
                                            borderRadius: '12px',
                                            fontSize: 10,
                                            color: '#fff'
                                        }}
                                        formatter={(v: any, name: any) => [
                                            v,
                                            name === 'totalCalls' ? 'Appels reçus' : name === 'communications' ? 'Courriels' : 'Tâches complétées'
                                        ]}
                                        labelFormatter={formatMonthLabel}
                                    />
                                    <Legend 
                                        iconType="circle" 
                                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                        formatter={(value) => value === 'totalCalls' ? 'Appels' : value === 'communications' ? 'Courriels' : 'Tâches complétées'}
                                    />
                                    <Bar dataKey="totalCalls" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={25} name="totalCalls" />
                                    <Bar dataKey="communications" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={25} name="communications" />
                                    <Bar dataKey="closedTasks" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={25} name="closedTasks" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
