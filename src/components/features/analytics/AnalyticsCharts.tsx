'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AnalyticsCharts({ monthlyRevenue }: { monthlyRevenue: any[] }) {
    return (
        <Card className="bg-zinc-950/40 border-zinc-850 p-6 rounded-2xl shadow-xl">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-zinc-100 text-base font-semibold">Répartition Mensuelle du Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                <div className="h-[300px] w-full mt-4">
                    {monthlyRevenue.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                            Aucune donnée de revenu disponible sur cette période.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                                <XAxis 
                                    dataKey="month" 
                                    stroke="#71717a" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <YAxis 
                                    stroke="#71717a" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(value) => `$${value.toLocaleString('fr-CA')}`} 
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(39, 39, 42, 0.3)' }}
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(9, 9, 11, 0.95)', 
                                        borderColor: '#27272a', 
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                    }} 
                                    itemStyle={{ color: '#f4f4f5' }}
                                    formatter={(value: number, name: string) => [
                                        `$${value.toLocaleString('fr-CA')}`, 
                                        name === 'approved' ? 'Signé (Approuvé)' : 'En attente (Envoyé)'
                                    ]}
                                    labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                                <Bar dataKey="approved" stackId="a" fill="#06b6d4" name="Signé (Approuvé)" />
                                <Bar dataKey="sent" stackId="a" fill="#f59e0b" name="En attente (Envoyé)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
