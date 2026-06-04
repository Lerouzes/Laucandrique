'use client'

import { useState, useEffect } from 'react'
import { 
    getSyndicateTasksAction, 
    saveSyndicateTaskAction, 
    deleteSyndicateTaskAction,
    getManagerTaskCountsAction
} from '@/actions/team-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
    ClipboardCheck, 
    Plus, 
    Trash2, 
    CheckCircle, 
    Clock, 
    AlertCircle,
    Calendar,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'

export function AuditTasksSection({ 
    clientId, 
    managerId 
}: { 
    clientId: string
    managerId?: string | null
}) {
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [addingTask, setAddingTask] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskCategory, setNewTaskCategory] = useState('Opérations')
    const [newTaskCreatedDate, setNewTaskCreatedDate] = useState(new Date().toISOString().substring(0, 10))
    const [managerCounts, setManagerCounts] = useState<{ total_tasks: number, late_tasks: number }>({
        total_tasks: 0,
        late_tasks: 0
    })

    const loadData = async () => {
        setLoading(true)
        try {
            const [fetchedTasks, fetchedCounts] = await Promise.all([
                getSyndicateTasksAction(clientId),
                managerId ? getManagerTaskCountsAction(managerId) : Promise.resolve({ total_tasks: 0, late_tasks: 0 })
            ])
            setTasks(fetchedTasks || [])
            setManagerCounts(fetchedCounts || { total_tasks: 0, late_tasks: 0 })
        } catch (err) {
            console.error("Error loading tasks section data:", err)
            toast.error("Erreur lors de la récupération des tâches.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [clientId, managerId])

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTaskTitle.trim()) {
            toast.error("Veuillez saisir un intitulé pour la tâche.")
            return
        }
        try {
            await saveSyndicateTaskAction({
                client_id: clientId,
                manager_id: managerId || null,
                title: newTaskTitle.trim(),
                category: newTaskCategory,
                created_date: newTaskCreatedDate,
                status: 'late' // default to late as per migration defaults
            })
            toast.success("Tâche ajoutée avec succès.")
            setNewTaskTitle('')
            setAddingTask(false)
            await loadData()
        } catch (err) {
            toast.error("Erreur lors de l'ajout de la tâche: " + (err as Error).message)
        }
    }

    const handleToggleTaskStatus = async (task: any) => {
        const nextStatus = task.status === 'completed' ? 'late' : 'completed'
        try {
            await saveSyndicateTaskAction({
                ...task,
                status: nextStatus
            })
            toast.success(`Tâche marquée comme ${nextStatus === 'completed' ? 'complétée' : 'en retard'}.`)
            await loadData()
        } catch (err) {
            toast.error("Erreur lors de la modification du statut: " + (err as Error).message)
        }
    }

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette tâche ?")) return
        try {
            await deleteSyndicateTaskAction(id)
            toast.success("Tâche supprimée.")
            await loadData()
        } catch (err) {
            toast.error("Erreur lors de la suppression de la tâche: " + (err as Error).message)
        }
    }

    return (
        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
            <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-purple-400" />
                    Suivi des Tâches Opérationnelles
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {/* Manager general stats */}
                <div className="grid grid-cols-2 gap-4 bg-[#121318] p-3 rounded-xl border border-zinc-900 text-xxs">
                    <div className="flex flex-col">
                        <span className="text-zinc-500 uppercase font-bold text-[8px]">Tâches du gestionnaire</span>
                        <strong className="text-base font-extrabold text-zinc-100 mt-0.5">{managerCounts.total_tasks}</strong>
                    </div>
                    <div className="flex flex-col border-l border-zinc-850 pl-4">
                        <span className="text-zinc-500 uppercase font-bold text-[8px]">Tâches en retard</span>
                        <strong className="text-base font-extrabold text-rose-400 mt-0.5">{managerCounts.late_tasks}</strong>
                    </div>
                </div>

                {/* Header & Add Button */}
                <div className="flex justify-between items-center pt-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Tâches du syndicat ({tasks.length})
                    </span>
                    <Button
                        type="button"
                        onClick={() => setAddingTask(!addingTask)}
                        className="bg-purple-900/40 hover:bg-purple-800/40 text-purple-450 text-purple-400 text-[9px] font-bold h-6 px-2.5 rounded border border-purple-800/40 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        {addingTask ? 'Annuler' : 'Ajouter'}
                    </Button>
                </div>

                {/* Form to add a task */}
                {addingTask && (
                    <form onSubmit={handleAddTask} className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3 animate-fade-in">
                        <div className="space-y-1">
                            <Label className="text-zinc-500 text-[8px] uppercase font-bold">Intitulé de la tâche</Label>
                            <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Saisir la tâche..."
                                className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100 focus-visible:ring-purple-650"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-zinc-500 text-[8px] uppercase font-bold">Catégorie</Label>
                                <select 
                                    value={newTaskCategory}
                                    onChange={(e) => setNewTaskCategory(e.target.value)}
                                    className="w-full bg-[#121318] border border-zinc-850 rounded p-1.5 text-white outline-none h-8 text-xxs font-semibold cursor-pointer"
                                >
                                    <option value="Gouvernance">Gouvernance</option>
                                    <option value="Financier">Financier</option>
                                    <option value="Opérations">Opérations</option>
                                    <option value="Entretien">Entretien</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-zinc-500 text-[8px] uppercase font-bold">Date de création</Label>
                                <Input 
                                    type="date"
                                    value={newTaskCreatedDate}
                                    onChange={(e) => setNewTaskCreatedDate(e.target.value)}
                                    className="bg-[#121318] border-zinc-850 h-8 text-xxs text-zinc-100 focus-visible:ring-purple-650"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-1.5">
                            <Button 
                                type="button" 
                                onClick={() => setAddingTask(false)}
                                className="bg-transparent border border-zinc-800 text-zinc-400 text-[9px] font-bold h-7 px-3 rounded-lg hover:bg-zinc-900 cursor-pointer"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-purple-600 text-white text-[9px] font-bold h-7 px-3 rounded-lg hover:bg-purple-700 cursor-pointer"
                            >
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                )}

                {/* Tasks List */}
                {loading ? (
                    <div className="flex items-center justify-center py-6 text-xxs text-zinc-500">
                        Chargement des tâches...
                    </div>
                ) : tasks.length === 0 ? (
                    <p className="text-xxs italic text-zinc-500 text-center py-4 bg-zinc-950/20 border border-zinc-900 rounded-lg">
                        Aucune tâche enregistrée pour ce syndicat.
                    </p>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {tasks.map(t => {
                            const isCompleted = t.status === 'completed'
                            return (
                                <div 
                                    key={t.id} 
                                    className={`flex items-start justify-between p-2.5 rounded-xl border transition-all text-xxs ${
                                        isCompleted 
                                            ? 'bg-zinc-950/10 border-zinc-900 text-zinc-400' 
                                            : 'bg-zinc-900/20 border-zinc-850 hover:border-zinc-800'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <button
                                            onClick={() => handleToggleTaskStatus(t)}
                                            className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                                isCompleted 
                                                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-450 text-emerald-450' 
                                                    : 'border-zinc-700 hover:border-purple-500'
                                            }`}
                                        >
                                            {isCompleted && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-950/50" />}
                                        </button>
                                        <div className="space-y-1">
                                            <span className={`font-semibold text-zinc-200 block ${isCompleted ? 'line-through text-zinc-500 font-normal' : ''}`}>
                                                {t.title}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[8px] text-zinc-500">
                                                <Badge variant="outline" className={`text-[7px] px-1 py-0 font-bold border-zinc-800/60 ${
                                                    isCompleted ? 'bg-zinc-950/20 text-zinc-500' : 'bg-purple-950/20 text-purple-300 border-purple-800/40'
                                                }`}>
                                                    {t.category || 'Opérations'}
                                                </Badge>
                                                <span>·</span>
                                                <span className="font-mono">
                                                    {t.created_date ? new Date(t.created_date).toLocaleDateString('fr-CA') : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteTask(t.id)}
                                            className="h-6 w-6 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer rounded-lg"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
