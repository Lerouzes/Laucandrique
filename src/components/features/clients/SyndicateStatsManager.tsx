'use client'

import { useState, useTransition } from 'react'
import { saveSyndicateStatsAction, YearlyStatInput, SpecialAssessmentInput } from '@/actions/syndicate-stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Building2,
    Plus,
    Trash2,
    Loader2,
    Calendar,
    ArrowUpRight,
    LandPlot
} from 'lucide-react'

type SyndicateStatsManagerProps = {
    clientId: string
    initialStats: {
        total_square_feet: number | null
        yearlyStats: any[]
        specialAssessments: any[]
    }
}

export function SyndicateStatsManager({ clientId, initialStats }: SyndicateStatsManagerProps) {
    const [isPending, startTransition] = useTransition()

    const [totalSquareFeet, setTotalSquareFeet] = useState<string>(
        initialStats.total_square_feet !== null ? String(initialStats.total_square_feet) : ''
    )

    // Keep yearly stats in state
    const [yearlyStats, setYearlyStats] = useState<YearlyStatInput[]>(() => 
        initialStats.yearlyStats.map(y => ({
            id: y.id,
            year: y.year,
            building_valuation: Number(y.building_valuation || 0),
            regular_condo_fees: Number(y.regular_condo_fees || 0),
            prevention_fund_fees: Number(y.prevention_fund_fees || 0),
            insurance_fund_fees: Number(y.insurance_fund_fees || 0)
        }))
    )

    // Keep special assessments in state
    const [specialAssessments, setSpecialAssessments] = useState<SpecialAssessmentInput[]>(() =>
        initialStats.specialAssessments.map(s => ({
            id: s.id,
            year: s.year,
            amount: Number(s.amount || 0),
            fund_type: s.fund_type,
            title: s.title || ''
        }))
    )

    // Form states for new entry additions
    const [newYear, setNewYear] = useState<string>('')
    const [newValuation, setNewValuation] = useState<string>('')
    const [newRegularCondoFees, setNewRegularCondoFees] = useState<string>('')
    const [newPreventionFundFees, setNewPreventionFundFees] = useState<string>('')
    const [newInsuranceFundFees, setNewInsuranceFundFees] = useState<string>('')

    const [newAssTitle, setNewAssTitle] = useState<string>('')
    const [newAssYear, setNewAssYear] = useState<string>('')
    const [newAssAmount, setNewAssAmount] = useState<string>('')
    const [newAssFund, setNewAssFund] = useState<'regular' | 'prevention' | 'insurance'>('prevention')

    const [showAddYear, setShowAddYear] = useState(false)
    const [showAddAss, setShowAddAss] = useState(false)

    // Add Year handler
    const handleAddYear = () => {
        const yr = parseInt(newYear, 10)
        if (isNaN(yr) || yr < 1900 || yr > 2100) {
            toast.error("Veuillez entrer une année valide (ex: 2026).")
            return
        }
        if (yearlyStats.some(y => y.year === yr)) {
            toast.error("Des statistiques existent déjà pour cette année.")
            return
        }

        const newEntry: YearlyStatInput = {
            year: yr,
            building_valuation: Number(newValuation) || 0,
            regular_condo_fees: Number(newRegularCondoFees) || 0,
            prevention_fund_fees: Number(newPreventionFundFees) || 0,
            insurance_fund_fees: Number(newInsuranceFundFees) || 0
        }

        setYearlyStats(prev => [...prev, newEntry].sort((a, b) => b.year - a.year))
        
        // Reset inputs
        setNewYear('')
        setNewValuation('')
        setNewRegularCondoFees('')
        setNewPreventionFundFees('')
        setNewInsuranceFundFees('')
        setShowAddYear(false)
        toast.success(`Année ${yr} ajoutée à la liste locale.`)
    }

    // Add Special Assessment handler
    const handleAddAssessment = () => {
        const yr = parseInt(newAssYear, 10)
        const amt = Number(newAssAmount)
        if (!newAssTitle.trim()) {
            toast.error("Veuillez entrer un titre descriptif.")
            return
        }
        if (isNaN(yr) || yr < 1900 || yr > 2100) {
            toast.error("Veuillez entrer une année valide.")
            return
        }
        if (isNaN(amt) || amt <= 0) {
            toast.error("Veuillez entrer un montant valide supérieur à 0.")
            return
        }

        const newEntry: SpecialAssessmentInput = {
            year: yr,
            amount: amt,
            fund_type: newAssFund,
            title: newAssTitle.trim()
        }

        setSpecialAssessments(prev => [newEntry, ...prev].sort((a, b) => b.year - a.year))

        // Reset inputs
        setNewAssTitle('')
        setNewAssYear('')
        setNewAssAmount('')
        setNewAssFund('prevention')
        setShowAddAss(false)
        toast.success(`Cotisation spéciale "${newEntry.title}" ajoutée localement.`)
    }

    // Remove handlers
    const handleRemoveYear = (year: number) => {
        setYearlyStats(prev => prev.filter(y => y.year !== year))
        toast.success(`Statistiques de l'année ${year} retirées.`)
    }

    const handleRemoveAssessment = (index: number) => {
        setSpecialAssessments(prev => prev.filter((_, i) => i !== index))
        toast.success("Cotisation spéciale retirée.")
    }

    // Save handler
    const handleSaveAll = () => {
        startTransition(async () => {
            try {
                const sqFt = totalSquareFeet.trim() !== '' ? Number(totalSquareFeet) : null
                await saveSyndicateStatsAction(clientId, sqFt, yearlyStats, specialAssessments)
                toast.success("Toutes les statistiques immobilières ont été enregistrées avec succès!")
            } catch (err: any) {
                console.error(err)
                toast.error(err.message || "Une erreur est survenue lors de l'enregistrement.")
            }
        })
    }

    // YoY comparison helper
    const getYoYComparison = (currentYear: number, field: keyof Omit<YearlyStatInput, 'id' | 'year'>) => {
        const prevEntry = yearlyStats.find(y => y.year === currentYear - 1)
        const currentEntry = yearlyStats.find(y => y.year === currentYear)

        if (!prevEntry || !currentEntry) return null

        const currentVal = Number(currentEntry[field] || 0)
        const prevVal = Number(prevEntry[field] || 0)

        if (prevVal === 0) return null

        const diff = currentVal - prevVal
        const pct = Math.round((diff / prevVal) * 100)

        return { diff, pct }
    }

    const formatCurrency = (v: number) => {
        return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v)
    }

    const formatYoY = (comp: { diff: number; pct: number } | null) => {
        if (!comp) return null
        const isPositive = comp.diff > 0
        const isZero = comp.diff === 0

        if (isZero) return <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0% YoY</span>

        return (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isPositive ? 'text-emerald-450' : 'text-rose-450'}`}>
                {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isPositive ? '+' : ''}{comp.pct}% ({isPositive ? '+' : ''}{formatCurrency(comp.diff)})
            </span>
        )
    }

    const getFundName = (type: 'regular' | 'prevention' | 'insurance') => {
        if (type === 'regular') return 'Frais réguliers'
        if (type === 'prevention') return 'Fonds de prévoyance'
        return "Fonds d'assurance"
    }

    const getFundBadgeStyle = (type: 'regular' | 'prevention' | 'insurance') => {
        if (type === 'regular') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        if (type === 'prevention') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    }

    return (
        <div className="space-y-6">
            {/* Header info */}
            <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <CardHeader className="pb-3 border-b border-zinc-850">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                                <Building2 className="h-4.5 w-4.5 text-cyan-400" />
                                Fiche Technique & Paramètres Physiques
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-400">
                                Saisissez la superficie totale et les budgets annuels réguliers et exceptionnels de la copropriété.
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleSaveAll}
                            disabled={isPending}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-md transition-all gap-1.5 shrink-0"
                        >
                            {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                            Enregistrer la Fiche
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <LandPlot className="h-3.5 w-3.5 text-cyan-400" />
                                Superficie Totale (Pieds Carrés)
                            </Label>
                            <Input
                                type="number"
                                placeholder="Ex: 45000"
                                value={totalSquareFeet}
                                onChange={e => setTotalSquareFeet(e.target.value)}
                                className="bg-zinc-950 border-zinc-850 h-9 text-xs text-white"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Yearly Budgets Section */}
            <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <CardHeader className="pb-3 border-b border-zinc-850 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-white">Budgets & Évaluations Annuels</CardTitle>
                        <CardDescription className="text-xs text-zinc-400">
                            Historique des évaluations foncières et des cotisations régulières aux trois fonds.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => setShowAddYear(v => !v)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 text-zinc-300 bg-zinc-950/20 hover:bg-zinc-950/60 text-xxs font-extrabold h-8 rounded-lg"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {showAddYear ? "Annuler" : "Ajouter une année"}
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Add Year Form Panel */}
                    {showAddYear && (
                        <div className="p-4 bg-zinc-950/40 border-b border-zinc-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end animate-slide-in">
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Année</Label>
                                <Input
                                    type="number"
                                    placeholder="2026"
                                    value={newYear}
                                    onChange={e => setNewYear(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Évaluation Bâtiment ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="15000000"
                                    value={newValuation}
                                    onChange={e => setNewValuation(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Frais Réguliers ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="120000"
                                    value={newRegularCondoFees}
                                    onChange={e => setNewRegularCondoFees(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Prévoyance ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="35000"
                                    value={newPreventionFundFees}
                                    onChange={e => setNewPreventionFundFees(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1 flex items-center gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[9px] text-zinc-400 font-bold uppercase">Assurance ($)</Label>
                                    <Input
                                        type="number"
                                        placeholder="15000"
                                        value={newInsuranceFundFees}
                                        onChange={e => setNewInsuranceFundFees(e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                    />
                                </div>
                                <Button
                                    onClick={handleAddYear}
                                    className="bg-cyan-650 bg-cyan-600 hover:bg-cyan-705 hover:bg-cyan-700 text-white font-extrabold h-8 px-3 rounded-lg text-xs shrink-0 self-end"
                                >
                                    Valider
                                </Button>
                            </div>
                        </div>
                    )}

                    {yearlyStats.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 italic">
                            Aucune statistique annuelle saisie pour le moment.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-850 bg-zinc-950/20 text-zinc-400 uppercase text-[9px] font-bold tracking-wider">
                                        <th className="p-3">Année</th>
                                        <th className="p-3">Évaluation Bâtiment</th>
                                        <th className="p-3">Frais réguliers</th>
                                        <th className="p-3">Fonds prévoyance</th>
                                        <th className="p-3">Fonds assurance</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {yearlyStats.map((y) => {
                                        const valYoY = getYoYComparison(y.year, 'building_valuation')
                                        const regYoY = getYoYComparison(y.year, 'regular_condo_fees')
                                        const prevYoY = getYoYComparison(y.year, 'prevention_fund_fees')
                                        const insYoY = getYoYComparison(y.year, 'insurance_fund_fees')

                                        return (
                                            <tr key={y.year} className="hover:bg-zinc-900/20 transition-colors">
                                                <td className="p-3 font-extrabold text-zinc-100 flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                                                    {y.year}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-zinc-200">{formatCurrency(y.building_valuation)}</div>
                                                    {formatYoY(valYoY)}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-zinc-200">{formatCurrency(y.regular_condo_fees)}</div>
                                                    {formatYoY(regYoY)}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-zinc-200">{formatCurrency(y.prevention_fund_fees)}</div>
                                                    {formatYoY(prevYoY)}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-zinc-200">{formatCurrency(y.insurance_fund_fees)}</div>
                                                    {formatYoY(insYoY)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveYear(y.year)}
                                                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 h-7 w-7 p-0 rounded-lg"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
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

            {/* Special Assessments Section */}
            <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <CardHeader className="pb-3 border-b border-zinc-850 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-white">Cotisations Spéciales</CardTitle>
                        <CardDescription className="text-xs text-zinc-400">
                            Cotisations exceptionnelles votées pour couvrir des travaux ou des déficits dans l'un des fonds.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => setShowAddAss(v => !v)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 text-zinc-300 bg-zinc-950/20 hover:bg-zinc-950/60 text-xxs font-extrabold h-8 rounded-lg"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {showAddAss ? "Annuler" : "Ajouter cotisation"}
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Add Assessment Form Panel */}
                    {showAddAss && (
                        <div className="p-4 bg-zinc-950/40 border-b border-zinc-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end animate-slide-in">
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Titre / Projet</Label>
                                <Input
                                    type="text"
                                    placeholder="Ex: Remplacement toiture"
                                    value={newAssTitle}
                                    onChange={e => setNewAssTitle(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Année</Label>
                                <Input
                                    type="number"
                                    placeholder="2026"
                                    value={newAssYear}
                                    onChange={e => setNewAssYear(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Montant ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="15000"
                                    value={newAssAmount}
                                    onChange={e => setNewAssAmount(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Fonds Ciblé</Label>
                                <select
                                    value={newAssFund}
                                    onChange={e => setNewAssFund(e.target.value as any)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-350 outline-none focus:border-cyan-650 h-8 cursor-pointer w-full"
                                >
                                    <option value="regular">Frais réguliers (Administration)</option>
                                    <option value="prevention">Fonds de prévoyance</option>
                                    <option value="insurance">Fonds d'assurance</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Button
                                    onClick={handleAddAssessment}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold h-8 px-4 rounded-lg text-xs w-full"
                                >
                                    Ajouter
                                </Button>
                            </div>
                        </div>
                    )}

                    {specialAssessments.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 italic">
                            Aucune cotisation spéciale enregistrée.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-850 bg-zinc-950/20 text-zinc-400 uppercase text-[9px] font-bold tracking-wider">
                                        <th className="p-3">Titre</th>
                                        <th className="p-3">Année</th>
                                        <th className="p-3">Fonds Ciblé</th>
                                        <th className="p-3">Montant Exceptionnel</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {specialAssessments.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-900/20 transition-colors">
                                            <td className="p-3 font-semibold text-zinc-150">{s.title}</td>
                                            <td className="p-3 font-mono text-zinc-400">{s.year}</td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getFundBadgeStyle(s.fund_type)}`}>
                                                    {getFundName(s.fund_type)}
                                                </span>
                                            </td>
                                            <td className="p-3 font-extrabold text-cyan-400">{formatCurrency(s.amount)}</td>
                                            <td className="p-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveAssessment(idx)}
                                                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 h-7 w-7 p-0 rounded-lg"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
