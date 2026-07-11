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
    LandPlot,
    AlertCircle
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

    // Form inputs maps for special assessments per year card
    const [newYearInput, setNewYearInput] = useState('')
    const [newAssTitleMap, setNewAssTitleMap] = useState<Record<number, string>>({})
    const [newAssAmountMap, setNewAssAmountMap] = useState<Record<number, string>>({})
    const [newAssFundMap, setNewAssFundMap] = useState<Record<number, 'regular' | 'prevention' | 'insurance'>>({})

    // Add Year handler
    const handleAddNewYear = () => {
        const yr = parseInt(newYearInput, 10)
        if (isNaN(yr) || yr < 1900 || yr > 2100) {
            toast.error("Veuillez entrer une année valide (ex: 2026).")
            return
        }
        if (yearlyStats.some(y => y.year === yr)) {
            toast.error("Cette année existe déjà.")
            return
        }

        const newEntry: YearlyStatInput = {
            year: yr,
            building_valuation: 0,
            regular_condo_fees: 0,
            prevention_fund_fees: 0,
            insurance_fund_fees: 0
        }

        setYearlyStats(prev => [...prev, newEntry].sort((a, b) => b.year - a.year))
        setNewYearInput('')
        toast.success(`Année ${yr} initialisée. Saisissez ses détails ci-dessous.`)
    }

    // Add Special Assessment handler for a specific year
    const handleAddAssessmentForYear = (year: number) => {
        const title = newAssTitleMap[year] || ''
        const amountStr = newAssAmountMap[year] || ''
        const fund = newAssFundMap[year] || 'prevention'
        const amt = Number(amountStr)

        if (!title.trim()) {
            toast.error("Veuillez entrer un titre descriptif.")
            return
        }
        if (isNaN(amt) || amt <= 0) {
            toast.error("Veuillez entrer un montant valide supérieur à 0.")
            return
        }

        const newEntry: SpecialAssessmentInput = {
            year,
            amount: amt,
            fund_type: fund,
            title: title.trim()
        }

        setSpecialAssessments(prev => [newEntry, ...prev])

        // Reset inputs for this year
        setNewAssTitleMap(prev => ({ ...prev, [year]: '' }))
        setNewAssAmountMap(prev => ({ ...prev, [year]: '' }))
        setNewAssFundMap(prev => ({ ...prev, [year]: 'prevention' }))
        toast.success(`Cotisation spéciale "${newEntry.title}" ajoutée pour l'année ${year}.`)
    }

    // Remove handlers
    const handleRemoveYear = (year: number) => {
        setYearlyStats(prev => prev.filter(y => y.year !== year))
        setSpecialAssessments(prev => prev.filter(s => s.year !== year))
        toast.success(`Données de l'année ${year} retirées.`)
    }

    const handleRemoveAssessment = (indexToRemove: number) => {
        setSpecialAssessments(prev => prev.filter((_, idx) => idx !== indexToRemove))
        toast.success("Cotisation spéciale retirée.")
    }

    // Update yearly inputs directly
    const handleUpdateYearlyField = (year: number, field: keyof YearlyStatInput, value: number) => {
        setYearlyStats(prev => prev.map(y => {
            if (y.year === year) {
                return { ...y, [field]: value }
            }
            return y
        }))
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
                                Saisissez la superficie totale et les budgets de la copropriété.
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

            {/* Quick Add Year */}
            <div className="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                    <Label className="text-xs font-bold text-zinc-300">Initialiser une Année :</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        placeholder="Ex: 2026"
                        value={newYearInput}
                        onChange={e => setNewYearInput(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white w-28"
                    />
                    <Button
                        onClick={handleAddNewYear}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold h-8 px-3 rounded-lg text-xs"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Créer
                    </Button>
                </div>
            </div>

            {/* List of Years as Cards */}
            {yearlyStats.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 italic border border-zinc-800 rounded-xl bg-zinc-950/20">
                    Aucune donnée annuelle saisie. Utilisez le module d'initialisation ci-dessus.
                </div>
            ) : (
                <div className="space-y-6">
                    {yearlyStats.map((y) => {
                        const valYoY = getYoYComparison(y.year, 'building_valuation')
                        const regYoY = getYoYComparison(y.year, 'regular_condo_fees')
                        const prevYoY = getYoYComparison(y.year, 'prevention_fund_fees')
                        const insYoY = getYoYComparison(y.year, 'insurance_fund_fees')

                        // Find matching assessments for this year
                        const yearAssessments = specialAssessments.filter(s => s.year === y.year)

                        return (
                            <Card key={y.year} className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl overflow-hidden">
                                {/* Card Header */}
                                <CardHeader className="bg-zinc-950/40 p-4 border-b border-zinc-850 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4.5 w-4.5 text-cyan-400" />
                                        <span className="font-extrabold text-white text-sm">Année {y.year}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveYear(y.year)}
                                        className="text-rose-450 hover:text-rose-400 hover:bg-rose-950/20 h-8 px-2 rounded-lg text-xxs font-extrabold gap-1"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Supprimer l'Année
                                    </Button>
                                </CardHeader>

                                {/* Card Content */}
                                <CardContent className="p-5 space-y-5">
                                    {/* Regular Budgets Fields Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-zinc-400 font-bold uppercase">Évaluation Bâtiment ($)</Label>
                                            <Input
                                                type="number"
                                                value={y.building_valuation || ''}
                                                onChange={e => handleUpdateYearlyField(y.year, 'building_valuation', Number(e.target.value))}
                                                className="bg-zinc-950 border-zinc-850 h-9 text-xs text-white"
                                            />
                                            <div className="h-4">{formatYoY(valYoY)}</div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-zinc-400 font-bold uppercase">Frais Réguliers ($)</Label>
                                            <Input
                                                type="number"
                                                value={y.regular_condo_fees || ''}
                                                onChange={e => handleUpdateYearlyField(y.year, 'regular_condo_fees', Number(e.target.value))}
                                                className="bg-zinc-950 border-zinc-850 h-9 text-xs text-white"
                                            />
                                            <div className="h-4">{formatYoY(regYoY)}</div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-zinc-400 font-bold uppercase">Fonds Prévoyance ($)</Label>
                                            <Input
                                                type="number"
                                                value={y.prevention_fund_fees || ''}
                                                onChange={e => handleUpdateYearlyField(y.year, 'prevention_fund_fees', Number(e.target.value))}
                                                className="bg-zinc-950 border-zinc-850 h-9 text-xs text-white"
                                            />
                                            <div className="h-4">{formatYoY(prevYoY)}</div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-zinc-400 font-bold uppercase">Fonds Assurance ($)</Label>
                                            <Input
                                                type="number"
                                                value={y.insurance_fund_fees || ''}
                                                onChange={e => handleUpdateYearlyField(y.year, 'insurance_fund_fees', Number(e.target.value))}
                                                className="bg-zinc-950 border-zinc-850 h-9 text-xs text-white"
                                            />
                                            <div className="h-4">{formatYoY(insYoY)}</div>
                                        </div>
                                    </div>

                                    {/* Nested Special Assessments Manager */}
                                    <div className="pt-4 border-t border-zinc-850 space-y-3">
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cotisations Spéciales ({y.year})</h4>
                                        </div>

                                        {/* List of Assessments */}
                                        {yearAssessments.length > 0 && (
                                            <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-zinc-950/20">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-zinc-850 text-zinc-500 uppercase text-[9px] font-bold tracking-wider">
                                                            <th className="p-2.5">Projet / Titre</th>
                                                            <th className="p-2.5">Fonds Ciblé</th>
                                                            <th className="p-2.5 text-center">Montant Exceptionnel</th>
                                                            <th className="p-2.5 text-right pr-4">Retirer</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-900">
                                                        {specialAssessments.map((s, idx) => {
                                                            if (s.year !== y.year) return null
                                                            return (
                                                                <tr key={idx} className="hover:bg-zinc-900/20 transition-colors">
                                                                    <td className="p-2.5 font-semibold text-zinc-200">{s.title}</td>
                                                                    <td className="p-2.5">
                                                                        <span className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getFundBadgeStyle(s.fund_type)}`}>
                                                                            {getFundName(s.fund_type)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-2.5 text-center font-extrabold text-cyan-400">{formatCurrency(s.amount)}</td>
                                                                    <td className="p-2.5 text-right pr-4">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveAssessment(idx)}
                                                                            className="text-rose-450 hover:text-rose-400 hover:bg-rose-950/25 h-7 w-7 p-0 rounded-lg"
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

                                        {/* Inline Add Assessment Row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl items-end">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Projet</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="Ex: Remplacement Toiture"
                                                    value={newAssTitleMap[y.year] || ''}
                                                    onChange={e => setNewAssTitleMap(prev => ({ ...prev, [y.year]: e.target.value }))}
                                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Montant ($)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="10000"
                                                    value={newAssAmountMap[y.year] || ''}
                                                    onChange={e => setNewAssAmountMap(prev => ({ ...prev, [y.year]: e.target.value }))}
                                                    className="bg-zinc-950 border-zinc-800 h-8 text-xs text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-zinc-400 font-bold uppercase">Fonds Ciblé</Label>
                                                <select
                                                    value={newAssFundMap[y.year] || 'prevention'}
                                                    onChange={e => setNewAssFundMap(prev => ({ ...prev, [y.year]: e.target.value as any }))}
                                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-350 outline-none focus:border-cyan-650 h-8 cursor-pointer w-full"
                                                >
                                                    <option value="regular">Frais réguliers (Administration)</option>
                                                    <option value="prevention">Fonds de prévoyance</option>
                                                    <option value="insurance">Fonds d'assurance</option>
                                                </select>
                                            </div>
                                            <Button
                                                onClick={() => handleAddAssessmentForYear(y.year)}
                                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold h-8 px-4 rounded-lg text-xs w-full self-end"
                                            >
                                                Ajouter Cotisation
                                            </Button>
                                        </div>
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
