'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
    Search, 
    FileSpreadsheet, 
    Loader2, 
    AlertTriangle, 
    CheckCircle
} from 'lucide-react'
import { saveBatchMonthlyCallsAction, getBatchMonthlyCallsAction } from '@/actions/team-management'

interface Manager {
    id: string
    first_name: string
    last_name: string
    team_id: string | null
    manager_teams: { id: string; name: string } | null
}

interface Team {
    id: string
    name: string
}

interface BatchCallStatsModalProps {
    managers: Manager[]
    teams?: Team[]
}

export function BatchCallStatsModal({ managers = [], teams = [] }: BatchCallStatsModalProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [loadingExisting, setLoadingExisting] = useState(false)

    // Form inputs state
    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [yearMonth, setYearMonth] = useState(defaultMonth)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    
    // Map of managerId -> { total: string, answered: string }
    const [inputs, setInputs] = useState<Record<string, { total: string; answered: string }>>({})

    // Reset fields when the modal opens/closes
    useEffect(() => {
        if (!open) {
            setSearchQuery('')
            setSelectedIds(new Set())
            setInputs({})
            setYearMonth(defaultMonth)
            setSelectedTeamId('all')
        }
    }, [open, defaultMonth])

    // Fetch existing stats for the selected month
    useEffect(() => {
        if (!open) return

        let active = true
        async function fetchExistingStats() {
            setLoadingExisting(true)
            try {
                const data = await getBatchMonthlyCallsAction(yearMonth)
                if (!active) return

                const existingMap: Record<string, { total: string; answered: string }> = {}
                const existingIds = new Set<string>()

                data.forEach(entry => {
                    existingMap[entry.managerId] = {
                        total: entry.totalCalls.toString(),
                        answered: entry.answeredCalls.toString()
                    }
                    existingIds.add(entry.managerId)
                })

                // Reset inputs and selectedIds completely on month change to avoid carrying over previous month's state
                const nextInputs: Record<string, { total: string; answered: string }> = {}
                managers.forEach(m => {
                    if (existingMap[m.id]) {
                        nextInputs[m.id] = existingMap[m.id]
                    } else {
                        nextInputs[m.id] = { total: '', answered: '' }
                    }
                })
                
                setInputs(nextInputs)
                setSelectedIds(existingIds)
            } catch (err: any) {
                toast.error("Erreur lors du chargement des données existantes.")
                console.error(err)
            } finally {
                if (active) setLoadingExisting(false)
            }
        }

        fetchExistingStats()
        return () => {
            active = false
        }
    }, [yearMonth, open, managers])

    // Filtering managers based on search query and selected team
    const filteredManagers = managers.filter(m => {
        const name = `${m.first_name} ${m.last_name}`.toLowerCase()
        const teamName = m.manager_teams?.name?.toLowerCase() || ''
        const query = searchQuery.toLowerCase()
        
        const matchesQuery = name.includes(query) || teamName.includes(query)
        const matchesTeam = selectedTeamId === 'all' || m.team_id === selectedTeamId
        
        return matchesQuery && matchesTeam
    })

    const handleSelectAllFiltered = (checked: boolean | 'indeterminate') => {
        const next = new Set(selectedIds)
        if (checked === true) {
            filteredManagers.forEach(m => next.add(m.id))
        } else {
            filteredManagers.forEach(m => next.delete(m.id))
        }
        setSelectedIds(next)
    }

    const handleToggleSelect = (managerId: string) => {
        const next = new Set(selectedIds)
        if (next.has(managerId)) {
            next.delete(managerId)
        } else {
            next.add(managerId)
        }
        setSelectedIds(next)
    }

    const handleInputChange = (managerId: string, field: 'total' | 'answered', value: string) => {
        setInputs(prev => ({
            ...prev,
            [managerId]: {
                ...prev[managerId],
                [field]: value
            }
        }))
        // Automatically check the manager when user starts typing
        if (value !== '' && !selectedIds.has(managerId)) {
            setSelectedIds(prev => {
                const next = new Set(prev)
                next.add(managerId)
                return next
            })
        }
    }

    // Calculators
    const calculateRate = (totalStr: string, answeredStr: string) => {
        const total = parseInt(totalStr, 10)
        const answered = parseInt(answeredStr, 10)
        if (isNaN(total) || isNaN(answered) || total <= 0) return '-'
        const rate = Math.round((answered / total) * 100)
        return `${Math.min(100, Math.max(0, rate))}%`
    }

    // Row Validation
    const isRowInvalid = (managerId: string) => {
        if (!selectedIds.has(managerId)) return false
        const totalStr = inputs[managerId]?.total || ''
        const answeredStr = inputs[managerId]?.answered || ''
        
        if (totalStr === '' || answeredStr === '') return true
        
        const total = parseInt(totalStr, 10)
        const answered = parseInt(answeredStr, 10)
        
        if (isNaN(total) || isNaN(answered)) return true
        if (total < 0 || answered < 0) return true
        if (answered > total) return true
        
        return false
    }

    // Overall form validation
    const hasSelected = selectedIds.size > 0
    const hasInvalid = Array.from(selectedIds).some(id => isRowInvalid(id))
    const isFormInvalid = !hasSelected || hasInvalid

    const handleSave = () => {
        if (isFormInvalid) return

        startTransition(async () => {
            try {
                const entries = Array.from(selectedIds).map(id => {
                    const total = parseInt(inputs[id]?.total || '0', 10)
                    const answered = parseInt(inputs[id]?.answered || '0', 10)
                    return {
                        managerId: id,
                        totalCalls: total,
                        answeredCalls: answered
                    }
                })

                await saveBatchMonthlyCallsAction({
                    yearMonth,
                    entries
                })

                toast.success(`Statistiques d'appels enregistrées pour ${entries.length} gestionnaire(s).`)
                setOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur d'enregistrement", { description: err.message })
            }
        })
    }

    const allFilteredSelected = filteredManagers.length > 0 && filteredManagers.every(m => selectedIds.has(m.id))
    const someFilteredSelected = filteredManagers.length > 0 && filteredManagers.some(m => selectedIds.has(m.id)) && !allFilteredSelected

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xxs h-7 rounded-lg flex items-center gap-1.5"
                    />
                }
            >
                <FileSpreadsheet className="h-3.5 w-3.5 text-purple-400" />
                Saisie Groupée
            </DialogTrigger>

            <DialogContent className="sm:max-w-4xl w-full bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[95vh] flex flex-col p-6 rounded-xl shadow-2xl">
                <DialogHeader className="pb-4 border-b border-zinc-900">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                        <FileSpreadsheet className="h-5 w-5 text-purple-400" />
                        Saisie Groupée des Statistiques d'Appels
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-xs mt-1">
                        Configurez et enregistrez les statistiques d'appels pour plusieurs gestionnaires simultanément.
                    </DialogDescription>
                </DialogHeader>

                {/* Controls Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-400">Mois ciblé</Label>
                        <Input 
                            type="month" 
                            value={yearMonth} 
                            onChange={(e) => setYearMonth(e.target.value)}
                            disabled={isPending || loadingExisting}
                            className="bg-zinc-900 border-zinc-800 text-[16px] md:text-sm text-white focus:border-purple-600 focus:ring-purple-600/20 h-9 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-400">Filtrer par équipe</Label>
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            disabled={isPending || loadingExisting}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-semibold outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 h-9 cursor-pointer"
                        >
                            <option value="all">Toutes les équipes</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-400">Rechercher</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input 
                                placeholder="Nom du gestionnaire..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 pl-9 text-[16px] md:text-sm text-white focus:border-purple-600 focus:ring-purple-600/20 h-9 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 min-h-[300px] overflow-hidden flex flex-col border border-zinc-800 rounded-lg bg-zinc-950">
                    {loadingExisting ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
                            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                            <span className="text-xs">Chargement des données du mois...</span>
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[45vh] flex-1">
                            <Table>
                                <TableHeader className="bg-zinc-900/60 sticky top-0 z-10 border-b border-zinc-800">
                                    <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                                        <TableHead className="w-12 text-center">
                                            <Checkbox 
                                                checked={(allFilteredSelected ? true : someFilteredSelected ? 'mixed' : false) as any}
                                                onCheckedChange={handleSelectAllFiltered}
                                                aria-label="Sélectionner tous les gestionnaires filtrés"
                                            />
                                        </TableHead>
                                        <TableHead className="text-zinc-300 font-semibold text-xs py-3">Gestionnaire</TableHead>
                                        <TableHead className="text-zinc-300 font-semibold text-xs py-3 w-40">Appels Totaux</TableHead>
                                        <TableHead className="text-zinc-300 font-semibold text-xs py-3 w-40">Appels Répondus</TableHead>
                                        <TableHead className="text-zinc-300 font-semibold text-xs py-3 w-28 text-center">Taux</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredManagers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-zinc-500 text-xs">
                                                Aucun gestionnaire ne correspond à votre recherche.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredManagers.map((manager) => {
                                            const isSelected = selectedIds.has(manager.id)
                                            const total = inputs[manager.id]?.total ?? ''
                                            const answered = inputs[manager.id]?.answered ?? ''
                                            const rate = calculateRate(total, answered)
                                            const isInvalid = isRowInvalid(manager.id)

                                            return (
                                                <TableRow 
                                                    key={manager.id} 
                                                    className={`border-b border-zinc-900 transition-colors hover:bg-zinc-900/20 ${isSelected ? 'bg-purple-950/5' : ''}`}
                                                >
                                                    <TableCell className="text-center py-2.5">
                                                        <Checkbox 
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleSelect(manager.id)}
                                                            aria-label={`Sélectionner ${manager.first_name}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-zinc-100">
                                                                {manager.first_name} {manager.last_name}
                                                            </span>
                                                            {manager.manager_teams?.name && (
                                                                <span className="text-[10px] text-zinc-500 font-medium">
                                                                    {manager.manager_teams.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <Input 
                                                            type="number"
                                                            placeholder="0"
                                                            min="0"
                                                            value={total}
                                                            onChange={(e) => handleInputChange(manager.id, 'total', e.target.value)}
                                                            disabled={!isSelected || isPending}
                                                            className={`bg-zinc-900 h-8 text-[16px] md:text-xs text-white border-zinc-800 transition-colors focus-visible:ring-purple-600/30 ${
                                                                isInvalid ? 'border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500' : 'focus-visible:border-purple-600'
                                                            } ${!isSelected ? 'opacity-40 cursor-not-allowed bg-zinc-950' : ''}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <Input 
                                                            type="number"
                                                            placeholder="0"
                                                            min="0"
                                                            value={answered}
                                                            onChange={(e) => handleInputChange(manager.id, 'answered', e.target.value)}
                                                            disabled={!isSelected || isPending}
                                                            className={`bg-zinc-900 h-8 text-[16px] md:text-xs text-white border-zinc-800 transition-colors focus-visible:ring-purple-600/30 ${
                                                                isInvalid ? 'border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500' : 'focus-visible:border-purple-600'
                                                            } ${!isSelected ? 'opacity-40 cursor-not-allowed bg-zinc-950' : ''}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center py-2.5 font-mono text-xs font-semibold">
                                                        {isInvalid ? (
                                                            <div className="flex items-center justify-center text-red-500" title="Les appels répondus ne peuvent pas dépasser les appels totaux.">
                                                                <AlertTriangle className="h-4 w-4" />
                                                            </div>
                                                        ) : (
                                                            <span className={rate !== '-' ? 'text-purple-400' : 'text-zinc-600'}>
                                                                {rate}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Validation warnings / selected counts */}
                <div className="py-2 flex items-center justify-between text-xs min-h-[24px]">
                    <div>
                        {hasSelected && (
                            <span className="text-zinc-400 font-medium">
                                <span className="text-purple-400 font-bold">{selectedIds.size}</span> gestionnaire(s) sélectionné(s) pour sauvegarde.
                            </span>
                        )}
                    </div>
                    {hasInvalid && (
                        <div className="flex items-center gap-1.5 text-red-400 font-medium animate-pulse">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Données invalides : vérifiez que les appels répondus sont inférieurs ou égaux aux totaux.</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t border-zinc-900 mt-2 flex sm:justify-between items-center gap-4">
                    <DialogClose
                        render={
                            <Button 
                                variant="outline" 
                                disabled={isPending}
                                className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900 text-xs font-semibold px-4 h-9 rounded-lg"
                            />
                        }
                    >
                        Annuler
                    </DialogClose>
                    <Button 
                        onClick={handleSave}
                        disabled={isFormInvalid || isPending || loadingExisting}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-6 h-9 rounded-lg flex items-center gap-1.5 shadow-md disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                Enregistrer les Données
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
