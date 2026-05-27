'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { 
    saveMonthlyCallsAction, 
    saveMonthlyCommunicationsAction, 
    saveMonthlyTasksAction, 
    checkExistingStatsAction 
} from '@/actions/team-management'
import { BatchCallStatsModal } from './BatchCallStatsModal'

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

interface ManualStatsEntryCardsProps {
    managers: Manager[]
    teams?: Team[]
}

export function ManualStatsEntryCards({ managers = [], teams = [] }: ManualStatsEntryCardsProps) {
    const router = useRouter()
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // State for Call form
    const [callManagerId, setCallManagerId] = useState(managers[0]?.id || '')
    const [callMonth, setCallMonth] = useState(currentMonth)
    const [hasCalls, setHasCalls] = useState(false)
    const [loadingCallsCheck, setLoadingCallsCheck] = useState(false)
    const [isPendingCalls, startTransitionCalls] = useTransition()

    // State for Comm form
    const [commManagerId, setCommManagerId] = useState(managers[0]?.id || '')
    const [commMonth, setCommMonth] = useState(currentMonth)
    const [hasComms, setHasComms] = useState(false)
    const [loadingCommsCheck, setLoadingCommsCheck] = useState(false)
    const [isPendingComms, startTransitionComms] = useTransition()

    // State for Task form
    const [taskManagerId, setTaskManagerId] = useState(managers[0]?.id || '')
    const [taskMonth, setTaskMonth] = useState(currentMonth)
    const [hasTasks, setHasTasks] = useState(false)
    const [loadingTasksCheck, setLoadingTasksCheck] = useState(false)
    const [isPendingTasks, startTransitionTasks] = useTransition()

    // Effect for Calls check
    useEffect(() => {
        if (!callManagerId || !callMonth) return
        let active = true
        async function runCheck() {
            setLoadingCallsCheck(true)
            try {
                const res = await checkExistingStatsAction(callManagerId, callMonth)
                if (active) setHasCalls(res.hasCalls)
            } catch (e) {
                console.error(e)
            } finally {
                if (active) setLoadingCallsCheck(false)
            }
        }
        runCheck()
        return () => { active = false }
    }, [callManagerId, callMonth])

    // Effect for Comms check
    useEffect(() => {
        if (!commManagerId || !commMonth) return
        let active = true
        async function runCheck() {
            setLoadingCommsCheck(true)
            try {
                const res = await checkExistingStatsAction(commManagerId, commMonth)
                if (active) setHasComms(res.hasCommunications)
            } catch (e) {
                console.error(e)
            } finally {
                if (active) setLoadingCommsCheck(false)
            }
        }
        runCheck()
        return () => { active = false }
    }, [commManagerId, commMonth])

    // Effect for Tasks check
    useEffect(() => {
        if (!taskManagerId || !taskMonth) return
        let active = true
        async function runCheck() {
            setLoadingTasksCheck(true)
            try {
                const res = await checkExistingStatsAction(taskManagerId, taskMonth)
                if (active) setHasTasks(res.hasTasks)
            } catch (e) {
                console.error(e)
            } finally {
                if (active) setLoadingTasksCheck(false)
            }
        }
        runCheck()
        return () => { active = false }
    }, [taskManagerId, taskMonth])

    // Handle Calls Submit
    const handleCallsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        startTransitionCalls(async () => {
            try {
                await saveMonthlyCallsAction(formData)
                toast.success("Statistiques d'appels enregistrées.")
                setHasCalls(true)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    // Handle Comms Submit
    const handleCommsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        startTransitionComms(async () => {
            try {
                await saveMonthlyCommunicationsAction(formData)
                toast.success("Statistiques de communications enregistrées.")
                setHasComms(true)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    // Handle Tasks Submit
    const handleTasksSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        startTransitionTasks(async () => {
            try {
                await saveMonthlyTasksAction(formData)
                toast.success("Statistiques de tâches enregistrées.")
                setHasTasks(true)
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    if (managers.length === 0) {
        return (
            <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500 italic">
                Aucun gestionnaire disponible pour la saisie manuelle.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header / Group Stats modal trigger */}
            <div className="flex justify-between items-center bg-zinc-950/20 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Actions globales de saisie</span>
                <BatchCallStatsModal managers={managers} teams={teams} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Appels Form */}
                <form onSubmit={handleCallsSubmit} className="space-y-3.5 p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                            <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">1. Appels Téléphoniques</h4>
                            
                            {loadingCallsCheck ? (
                                <Loader2 className="h-3.5 w-3.5 text-zinc-600 animate-spin" />
                            ) : hasCalls ? (
                                <Badge className="bg-emerald-950/40 border-emerald-900/40 text-emerald-400 font-extrabold text-[9px] flex items-center gap-0.5 px-1.5 py-0.2 rounded">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Saisi
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-900 border-zinc-800 text-zinc-500 font-bold text-[9px] flex items-center gap-0.5 px-1.5 py-0.2 rounded">
                                    <AlertCircle className="h-2.5 w-2.5" /> À saisir
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Gestionnaire</Label>
                                <select 
                                    name="manager_id" 
                                    value={callManagerId}
                                    onChange={(e) => setCallManagerId(e.target.value)}
                                    className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none focus:border-purple-650 text-xs cursor-pointer" 
                                    required
                                >
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Mois</Label>
                                <Input 
                                    type="month" 
                                    name="year_month" 
                                    value={callMonth} 
                                    onChange={(e) => setCallMonth(e.target.value)}
                                    required 
                                    className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-zinc-500 text-[10px] mb-0.5 block">Appels Totaux</Label>
                                    <Input 
                                        type="number" 
                                        name="total_calls" 
                                        placeholder="Ex: 150" 
                                        required 
                                        min="0" 
                                        className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 text-[10px] mb-0.5 block">Répondus</Label>
                                    <Input 
                                        type="number" 
                                        name="answered_calls" 
                                        placeholder="Ex: 132" 
                                        required 
                                        min="0" 
                                        className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isPendingCalls}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 rounded-lg mt-4 flex items-center justify-center gap-1 shadow-md"
                    >
                        {isPendingCalls && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {hasCalls ? "Mettre à jour les Appels" : "Enregistrer les Appels"}
                    </Button>
                </form>

                {/* 2. Communications Form */}
                <form onSubmit={handleCommsSubmit} className="space-y-3.5 p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                            <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">2. Communications Reçues</h4>
                            
                            {loadingCommsCheck ? (
                                <Loader2 className="h-3.5 w-3.5 text-zinc-600 animate-spin" />
                            ) : hasComms ? (
                                <Badge className="bg-emerald-950/40 border-emerald-900/40 text-emerald-400 font-extrabold text-[9px] flex items-center gap-0.5 px-1.5 py-0.2 rounded">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Saisi
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-900 border-zinc-800 text-zinc-500 font-bold text-[9px] flex items-center gap-0.5 px-1.5 py-0.2 rounded">
                                    <AlertCircle className="h-2.5 w-2.5" /> À saisir
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Gestionnaire</Label>
                                <select 
                                    name="manager_id" 
                                    value={commManagerId}
                                    onChange={(e) => setCommManagerId(e.target.value)}
                                    className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none focus:border-purple-600 text-xs cursor-pointer" 
                                    required
                                >
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Mois</Label>
                                <Input 
                                    type="month" 
                                    name="year_month" 
                                    value={commMonth} 
                                    onChange={(e) => setCommMonth(e.target.value)}
                                    required 
                                    className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Communications Reçues</Label>
                                <Input 
                                    type="number" 
                                    name="communications_received" 
                                    placeholder="Ex: 420" 
                                    required 
                                    min="0" 
                                    className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                />
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isPendingComms}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 rounded-lg mt-4 flex items-center justify-center gap-1 shadow-md"
                    >
                        {isPendingComms && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {hasComms ? "Mettre à jour Comm." : "Enregistrer la Charge"}
                    </Button>
                </form>

                {/* 3. Tâches Form */}
                <form onSubmit={handleTasksSubmit} className="space-y-3.5 p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                            <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">3. Tâches & Suivi</h4>
                            
                            {loadingTasksCheck ? (
                                <Loader2 className="h-3.5 w-3.5 text-zinc-600 animate-spin" />
                            ) : hasTasks ? (
                                <Badge className="bg-emerald-950/40 border-emerald-900/40 text-emerald-400 font-extrabold text-[9px] flex items-center gap-0.5 px-1.5 py-0.2 rounded">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Saisi
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-900 border-zinc-800 text-zinc-500 font-bold text-[9px] flex items-center gap-0.5 px-1.5 py-0.2 rounded">
                                    <AlertCircle className="h-2.5 w-2.5" /> À saisir
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Gestionnaire</Label>
                                <select 
                                    name="manager_id" 
                                    value={taskManagerId}
                                    onChange={(e) => setTaskManagerId(e.target.value)}
                                    className="w-full bg-[#121318] border border-zinc-850 rounded-lg p-2 text-white outline-none focus:border-purple-650 text-xs cursor-pointer" 
                                    required
                                >
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-zinc-500 text-[10px] mb-0.5 block">Mois</Label>
                                <Input 
                                    type="month" 
                                    name="year_month" 
                                    value={taskMonth} 
                                    onChange={(e) => setTaskMonth(e.target.value)}
                                    required 
                                    className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-zinc-500 text-[10px] mb-0.5 block">Tâches Ouvertes</Label>
                                    <Input 
                                        type="number" 
                                        name="open_tasks" 
                                        placeholder="Ex: 45" 
                                        required 
                                        min="0" 
                                        className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 text-[10px] mb-0.5 block">Tâches Fermées</Label>
                                    <Input 
                                        type="number" 
                                        name="closed_tasks" 
                                        placeholder="Ex: 38" 
                                        required 
                                        min="0" 
                                        className="bg-[#121318] border-zinc-850 h-8 text-xs text-white" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isPendingTasks}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 rounded-lg mt-4 flex items-center justify-center gap-1 shadow-md"
                    >
                        {isPendingTasks && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {hasTasks ? "Mettre à jour Tâches" : "Enregistrer les Tâches"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
