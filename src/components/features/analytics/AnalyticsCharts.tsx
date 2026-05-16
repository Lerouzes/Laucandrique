'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AnalyticsCharts({ monthlyRevenue }: { monthlyRevenue: any[] }) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-zinc-100">Revenus Mensuels (Basés sur l'approbation)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    {monthlyRevenue.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                            Aucune donnée de revenu disponible.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                                <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#d4d4d8' }} />
                                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#d4d4d8' }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    cursor={{ fill: '#27272a' }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }} itemStyle={{ color: '#f4f4f5' }}
                                    formatter={(value: number) => [`$${value.toLocaleString('fr-CA')}`, 'Revenus']}
                                    labelStyle={{ color: '#a1a1aa' }}
                                />
                                <Bar dataKey="total" fill="#e4e4e7" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
