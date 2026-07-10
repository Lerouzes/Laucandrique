'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Search,
    LandPlot,
    DollarSign,
    ShieldAlert,
    Building2,
    ArrowRight
} from 'lucide-react'

type GlobalRealEstateStatsProps = {
    data: any[]
}

export function GlobalRealEstateStats({ data }: GlobalRealEstateStatsProps) {
    const [searchVal, setSearchVal] = useState('')

    // Filter data based on search input
    const filtered = useMemo(() => {
        return data.filter(item => {
            const name = (item.company_name || item.full_name || '').toLowerCase()
            return name.includes(searchVal.toLowerCase())
        })
    }, [data, searchVal])

    // Compute portfolio aggregates
    const aggregates = useMemo(() => {
        let totalSqFt = 0
        let totalValuation = 0
        let totalRegularFees = 0
        let totalSpecialAssess = 0

        for (const item of filtered) {
            totalSqFt += Number(item.total_square_feet || 0)
            
            const latest = item.latestYearly
            if (latest) {
                totalValuation += Number(latest.building_valuation || 0)
                totalRegularFees += Number(latest.regular_condo_fees || 0) + Number(latest.prevention_fund_fees || 0) + Number(latest.insurance_fund_fees || 0)
            }
            
            totalSpecialAssess += Number(item.totalAssessments || 0)
        }

        return {
            totalSqFt,
            totalValuation,
            totalRegularFees,
            totalSpecialAssess
        }
    }, [filtered])

    const formatCurrency = (v: number) => {
        return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v)
    }

    const formatNumber = (v: number) => {
        return new Intl.NumberFormat('fr-CA').format(v)
    }

    return (
        <div className="space-y-6">
            {/* Aggregate Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <CardHeader className="pb-2">
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <LandPlot className="h-3.5 w-3.5 text-cyan-400" />
                            Superficie Totale Portefeuille
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-white">{formatNumber(aggregates.totalSqFt)} pi²</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Somme des superficies déclarées</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <CardHeader className="pb-2">
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                            Valeur Reconstruite Globale
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-white">{formatCurrency(aggregates.totalValuation)}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Dernière évaluation de chaque SDC</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <CardHeader className="pb-2">
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                            Volume Budgétaire Annuel
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-white">{formatCurrency(aggregates.totalRegularFees)}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Total des frais réguliers cumulés</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <CardHeader className="pb-2">
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                            Cotisations Spéciales Totales
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-white">{formatCurrency(aggregates.totalSpecialAssess)}</div>
                        <p className="text-[10px] text-zinc-500 mt-1">Appels de fonds exceptionnels</p>
                    </CardContent>
                </Card>
            </div>

            {/* List and search */}
            <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <CardHeader className="pb-3 border-b border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-bold text-white">Répertoire des Données Immobilières</CardTitle>
                        <CardDescription className="text-xs text-zinc-400">
                            Synthèse comparative des caractéristiques et des budgets réguliers et spéciaux des syndicats.
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:max-w-xs shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            type="search"
                            placeholder="Filtrer par syndicat..."
                            value={searchVal}
                            onChange={e => setSearchVal(e.target.value)}
                            className="bg-zinc-950 border-zinc-850 h-9 pl-9 text-xs text-white placeholder:text-zinc-550 focus-visible:ring-zinc-700 focus-visible:border-transparent w-full"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 italic">
                            Aucun syndicat trouvé.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-850 bg-zinc-950/20 text-zinc-400 uppercase text-[9px] font-bold tracking-wider">
                                        <th className="p-3">Syndicat</th>
                                        <th className="p-3 text-center">Superficie (pi²)</th>
                                        <th className="p-3 text-center">Évaluation Actuelle</th>
                                        <th className="p-3 text-center">Frais Réguliers</th>
                                        <th className="p-3 text-center">Fonds Prévoyance</th>
                                        <th className="p-3 text-center">Assurance</th>
                                        <th className="p-3 text-center text-amber-400">Cot. Spéciales</th>
                                        <th className="p-3 text-center">Total Budgets/An</th>
                                        <th className="p-3 text-right">Profil</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {filtered.map((item) => {
                                        const latest = item.latestYearly
                                        const totalYearlyFees = latest
                                            ? Number(latest.regular_condo_fees || 0) + Number(latest.prevention_fund_fees || 0) + Number(latest.insurance_fund_fees || 0)
                                            : 0

                                        return (
                                            <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                                                <td className="p-3 font-semibold text-zinc-200">
                                                    {item.company_name || item.full_name}
                                                </td>
                                                <td className="p-3 text-center font-mono text-zinc-300">
                                                    {item.total_square_feet ? formatNumber(item.total_square_feet) : '—'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {latest?.building_valuation ? (
                                                        <div>
                                                            <div className="font-semibold text-zinc-350">{formatCurrency(latest.building_valuation)}</div>
                                                            <div className="text-[9px] text-zinc-500">Année {latest.year}</div>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-zinc-300">
                                                    {latest ? formatCurrency(latest.regular_condo_fees) : '—'}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-zinc-300">
                                                    {latest ? formatCurrency(latest.prevention_fund_fees) : '—'}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-zinc-300">
                                                    {latest ? formatCurrency(latest.insurance_fund_fees) : '—'}
                                                </td>
                                                <td className="p-3 text-center font-bold text-amber-400">
                                                    {item.totalAssessments > 0 ? formatCurrency(item.totalAssessments) : '—'}
                                                </td>
                                                <td className="p-3 text-center font-black text-cyan-400">
                                                    {totalYearlyFees > 0 ? formatCurrency(totalYearlyFees) : '—'}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Link
                                                        href={`/global-settings/clients/${item.id}?tab=stats`}
                                                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                                                    >
                                                        Fiche <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
