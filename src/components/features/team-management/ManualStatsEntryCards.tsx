'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { 
    saveMonthlyCallsAction, 
    saveMonthlyCommunicationsAction, 
    saveMonthlyTasksAction, 
    checkExistingStatsAction,
    deleteMonthlyStatsAction
} from '@/actions/team-management'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
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

    const [activeTab, setActiveTab] = useState<'calls' | 'comms' | 'tasks'>('calls')

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

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteType, setDeleteType] = useState<'calls' | 'comms' | 'tasks' | 'all'>('calls')
    const [deleting, setDeleting] = useState(false)

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

    const handleDeleteStats = async () => {
        setDeleting(true)
        try {
            let mId = ''
            let mMonth = ''
            if (activeTab === 'calls') {
                mId = callManagerId
                mMonth = callMonth
            } else if (activeTab === 'comms') {
                mId = commManagerId
                mMonth = commMonth
            } else {
                mId = taskManagerId
                mMonth = taskMonth
            }

            await deleteMonthlyStatsAction(mId, mMonth, deleteType)
            toast.success("Données supprimées avec succès.")
            
            if (deleteType === 'all') {
                setHasCalls(false)
                setHasComms(false)
                setHasTasks(false)
            } else if (deleteType === 'calls') {
                setHasCalls(false)
            } else if (deleteType === 'comms') {
                setHasComms(false)
            } else {
                setHasTasks(false)
            }

            router.refresh()
        } catch (err: any) {
            toast.error("Erreur lors de la suppression", { description: err.message })
        } finally {
            setDeleting(false)
            setDeleteDialogOpen(false)
        }
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/20 p-4 rounded-xl border border-zinc-850/80">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-200">Saisie Manuelle des Statistiques</h3>
                    <p className="text-xxs text-zinc-400">Enregistrez les KPI mensuels de performance des gestionnaires.</p>
                </div>
                <div className="flex items-center gap-3">
                    <BatchCallStatsModal managers={managers} teams={teams} />
                </div>
            </div>

            <Card className="bg-zinc-900/30 border border-zinc-850 rounded-2xl shadow-xl overflow-hidden">
                {/* Tabs Bar */}
                <div className="border-b border-zinc-850 p-4 bg-zinc-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex p-1 bg-zinc-950 border border-zinc-850 rounded-xl w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('calls')}
                            className={`flex-1 sm:flex-none text-xxs font-extrabold px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'calls'
                                    ? 'bg-zinc-800 text-purple-400 border border-purple-900/35 shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            📞 Appels Téléphoniques
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('comms')}
                            className={`flex-1 sm:flex-none text-xxs font-extrabold px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'comms'
                                    ? 'bg-zinc-800 text-purple-400 border border-purple-900/35 shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            💬 Communications Reçues
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('tasks')}
                            className={`flex-1 sm:flex-none text-xxs font-extrabold px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'tasks'
                                    ? 'bg-zinc-800 text-purple-400 border border-purple-900/35 shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            ✅ Tâches & Suivi
                        </button>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 flex items-center">
                        {activeTab === 'calls' && (
                            loadingCallsCheck ? <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" /> :
                            hasCalls ? (
                                <Badge className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Appels Saisis
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-950 border border-zinc-800 text-zinc-500 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Appels à Saisir
                                </Badge>
                            )
                        )}
                        {activeTab === 'comms' && (
                            loadingCommsCheck ? <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" /> :
                            hasComms ? (
                                <Badge className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Communications Saisies
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-950 border border-zinc-800 text-zinc-500 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Comm. à Saisir
                                </Badge>
                            )
                        )}
                        {activeTab === 'tasks' && (
                            loadingTasksCheck ? <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" /> :
                            hasTasks ? (
                                <Badge className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Tâches Saisies
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-950 border border-zinc-800 text-zinc-500 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Tâches à Saisir
                                </Badge>
                            )
                        )}
                    </div>
                </div>

                <CardContent className="p-6 bg-zinc-900/10">
                    {/* Active Form */}
                    {activeTab === 'calls' && (
                        <form onSubmit={handleCallsSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Gestionnaire</Label>
                                        <select 
                                            name="manager_id" 
                                            value={callManagerId}
                                            onChange={(e) => setCallManagerId(e.target.value)}
                                            className="w-full h-10 bg-zinc-950 border border-zinc-850 rounded-xl px-3 text-white outline-none focus:ring-1 focus:ring-purple-500 text-xs cursor-pointer" 
                                            required
                                        >
                                            {managers.map(m => (
                                                <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">
                                                    {m.first_name} {m.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Mois de la statistique</Label>
                                        <Input 
                                            type="month" 
                                            name="year_month" 
                                            value={callMonth} 
                                            onChange={(e) => setCallMonth(e.target.value)}
                                            required 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Nombre total d'appels reçus</Label>
                                        <Input 
                                            type="number" 
                                            name="total_calls" 
                                            placeholder="Ex: 150" 
                                            required 
                                            min="0" 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Nombre d'appels répondus</Label>
                                        <Input 
                                            type="number" 
                                            name="answered_calls" 
                                            placeholder="Ex: 132" 
                                            required 
                                            min="0" 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-zinc-850/50">
                                {hasCalls ? (
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setDeleteType('calls')
                                                setDeleteDialogOpen(true)
                                            }}
                                            variant="outline"
                                            className="border-rose-900/50 hover:border-rose-800 text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 text-xs h-10 px-4 rounded-xl font-bold transition-all"
                                        >
                                            Supprimer Appels
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setDeleteType('all')
                                                setDeleteDialogOpen(true)
                                            }}
                                            variant="outline"
                                            className="border-rose-900/80 hover:border-rose-700 text-rose-300 hover:text-rose-200 bg-rose-900/30 hover:bg-rose-900/50 text-xs h-10 px-4 rounded-xl font-bold transition-all"
                                        >
                                            Supprimer Tout le Mois
                                        </Button>
                                    </div>
                                ) : <div />}
                                <Button 
                                    type="submit" 
                                    disabled={isPendingCalls}
                                    className="bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs h-10 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-md w-full sm:w-auto font-bold"
                                >
                                    {isPendingCalls && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {hasCalls ? "Mettre à jour les Appels" : "Enregistrer les Appels"}
                                </Button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'comms' && (
                        <form onSubmit={handleCommsSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Gestionnaire</Label>
                                        <select 
                                            name="manager_id" 
                                            value={commManagerId}
                                            onChange={(e) => setCommManagerId(e.target.value)}
                                            className="w-full h-10 bg-zinc-950 border border-zinc-850 rounded-xl px-3 text-white outline-none focus:ring-1 focus:ring-purple-500 text-xs cursor-pointer" 
                                            required
                                        >
                                            {managers.map(m => (
                                                <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">
                                                    {m.first_name} {m.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Mois de la statistique</Label>
                                        <Input 
                                            type="month" 
                                            name="year_month" 
                                            value={commMonth} 
                                            onChange={(e) => setCommMonth(e.target.value)}
                                            required 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Volume de communications reçues</Label>
                                        <Input 
                                            type="number" 
                                            name="communications_received" 
                                            placeholder="Ex: 420" 
                                            required 
                                            min="0" 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-zinc-850/50">
                                {hasComms ? (
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setDeleteType('comms')
                                                setDeleteDialogOpen(true)
                                            }}
                                            variant="outline"
                                            className="border-rose-900/50 hover:border-rose-800 text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 text-xs h-10 px-4 rounded-xl font-bold transition-all"
                                        >
                                            Supprimer Comm.
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setDeleteType('all')
                                                setDeleteDialogOpen(true)
                                            }}
                                            variant="outline"
                                            className="border-rose-900/80 hover:border-rose-700 text-rose-300 hover:text-rose-250 bg-rose-900/30 hover:bg-rose-900/50 text-xs h-10 px-4 rounded-xl font-bold transition-all"
                                        >
                                            Supprimer Tout le Mois
                                        </Button>
                                    </div>
                                ) : <div />}
                                <Button 
                                    type="submit" 
                                    disabled={isPendingComms}
                                    className="bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs h-10 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-md w-full sm:w-auto font-bold"
                                >
                                    {isPendingComms && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {hasComms ? "Mettre à jour Communications" : "Enregistrer la Charge"}
                                </Button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'tasks' && (
                        <form onSubmit={handleTasksSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Gestionnaire</Label>
                                        <select 
                                            name="manager_id" 
                                            value={taskManagerId}
                                            onChange={(e) => setTaskManagerId(e.target.value)}
                                            className="w-full h-10 bg-zinc-950 border border-zinc-850 rounded-xl px-3 text-white outline-none focus:ring-1 focus:ring-purple-500 text-xs cursor-pointer" 
                                            required
                                        >
                                            {managers.map(m => (
                                                <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">
                                                    {m.first_name} {m.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Mois de la statistique</Label>
                                        <Input 
                                            type="month" 
                                            name="year_month" 
                                            value={taskMonth} 
                                            onChange={(e) => setTaskMonth(e.target.value)}
                                            required 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Nombre de tâches ouvertes</Label>
                                        <Input 
                                            type="number" 
                                            name="open_tasks" 
                                            placeholder="Ex: 45" 
                                            required 
                                            min="0" 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs mb-1.5 block">Nombre de tâches fermées (complétées)</Label>
                                        <Input 
                                            type="number" 
                                            name="closed_tasks" 
                                            placeholder="Ex: 38" 
                                            required 
                                            min="0" 
                                            className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white rounded-xl focus-visible:ring-purple-500" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-zinc-850/50">
                                {hasTasks ? (
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setDeleteType('tasks')
                                                setDeleteDialogOpen(true)
                                            }}
                                            variant="outline"
                                            className="border-rose-900/50 hover:border-rose-800 text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 text-xs h-10 px-4 rounded-xl font-bold transition-all"
                                        >
                                            Supprimer Tâches
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setDeleteType('all')
                                                setDeleteDialogOpen(true)
                                            }}
                                            variant="outline"
                                            className="border-rose-900/80 hover:border-rose-700 text-rose-300 hover:text-rose-250 bg-rose-900/30 hover:bg-rose-900/50 text-xs h-10 px-4 rounded-xl font-bold transition-all"
                                        >
                                            Supprimer Tout le Mois
                                        </Button>
                                    </div>
                                ) : <div />}
                                <Button 
                                    type="submit" 
                                    disabled={isPendingTasks}
                                    className="bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs h-10 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-md w-full sm:w-auto font-bold"
                                >
                                    {isPendingTasks && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {hasTasks ? "Mettre à jour les Tâches" : "Enregistrer les Tâches"}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            <ConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Supprimer les statistiques"
                description={`Êtes-vous sûr de vouloir supprimer définitivement les données de ${
                    deleteType === 'calls' ? 'téléphonie' : deleteType === 'comms' ? 'communications' : deleteType === 'tasks' ? 'tâches' : 'toutes les catégories'
                } pour ce mois ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                onConfirm={handleDeleteStats}
                loading={deleting}
                variant="danger"
            />
        </div>
    )
}
