'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { 
    savePerformanceLogAction, 
    getLatestTeamPerformanceLogsAction,
    deletePerformanceLogAction 
} from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { 
    Loader2, 
    Check, 
    Trash2, 
    Calendar, 
    Clock,
    Mail, 
    CheckSquare, 
    FileText,
    ChevronDown,
    ChevronUp
} from 'lucide-react'

interface Manager {
    id: string
    first_name: string
    last_name: string
    team_id: string | null
    manager_teams: { id: string; name: string } | null
}

interface WeeklyAssessmentGridProps {
    managers: Manager[]
}

export function WeeklyAssessmentGrid({ managers = [] }: WeeklyAssessmentGridProps) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10))
    const [isOpen, setIsOpen] = useState(false)
    const [latestLogs, setLatestLogs] = useState<Record<string, { value: number; logged_at: string; id: string }>>({})
    const [inputValues, setInputValues] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)

    const loadLogs = async () => {
        setLoading(true)
        try {
            const logs = await getLatestTeamPerformanceLogsAction()
            const map: Record<string, { value: number; logged_at: string; id: string }> = {}
            
            // Group by manager_id and metric_type, keeping the first (latest) one due to server order
            logs.forEach(log => {
                const key = `${log.manager_id}_${log.metric_type}`
                if (!map[key]) {
                    map[key] = {
                        value: log.value,
                        logged_at: log.logged_at,
                        id: log.id
                    }
                }
            });
            setLatestLogs(map)
        } catch (err: any) {
            console.error(err)
            toast.error("Erreur lors du chargement des statistiques")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLogs()
    }, [])

    const handleSaveMetric = async (managerId: string, metricType: 'emails_over_48h' | 'late_tasks' | 'bills_no_notes_over_7d', managerName: string) => {
        const inputKey = `${managerId}_${metricType}`
        const rawValue = inputValues[inputKey]
        
        if (rawValue === undefined || rawValue === '') {
            toast.error("Veuillez saisir une valeur avant d'enregistrer.")
            return
        }

        const value = Number(rawValue)
        if (isNaN(value) || value < 0) {
            toast.error("Veuillez saisir une valeur numérique positive.")
            return
        }

        const saveKey = `${managerId}_${metricType}`
        setSaving(prev => ({ ...prev, [saveKey]: true }))

        try {
            await savePerformanceLogAction({
                manager_id: managerId,
                metric_type: metricType,
                value,
                logged_at: selectedDate
            })

            toast.success(`Statistique enregistrée pour ${managerName}`)
            
            // Clear input
            setInputValues(prev => ({ ...prev, [inputKey]: '' }))
            
            // Reload logs
            await loadLogs()
        } catch (err: any) {
            toast.error("Erreur d'enregistrement", { description: err.message })
        } finally {
            setSaving(prev => ({ ...prev, [saveKey]: false }))
        }
    }

    const handleDeleteLog = async (logId: string, managerName: string) => {
        if (!confirm("Voulez-vous supprimer cette mesure ?")) return

        try {
            await deletePerformanceLogAction(logId)
            toast.success("Mesure supprimée avec succès")
            await loadLogs()
        } catch (err: any) {
            toast.error("Erreur de suppression", { description: err.message })
        }
    }

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString)
        return date.toLocaleString('fr-CA', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const renderCell = (
        manager: Manager, 
        metricType: 'emails_over_48h' | 'late_tasks' | 'bills_no_notes_over_7d', 
        metricIcon: React.ReactNode
    ) => {
        const key = `${manager.id}_${metricType}`
        const latest = latestLogs[key]
        const isSaving = saving[key]
        const currentInput = inputValues[key] ?? ''

        return (
            <div className="space-y-2 p-2 bg-zinc-950/20 border border-zinc-850/50 rounded-xl flex flex-col justify-between h-full">
                {/* Latest value tracker */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1">
                        {metricIcon}
                        <span className="font-medium">Dernier relevé :</span>
                    </div>
                    {latest && (
                        <button 
                            onClick={() => handleDeleteLog(latest.id, `${manager.first_name} ${manager.last_name}`)}
                            className="text-zinc-555 text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-all"
                            title="Supprimer la mesure"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    )}
                </div>

                <div className="flex items-baseline gap-2">
                    {latest ? (
                        <>
                            <span className="text-sm font-extrabold text-white">{latest.value}</span>
                            <span className="text-[8px] text-zinc-500 font-mono flex items-center gap-0.5 shrink-0">
                                <Clock className="h-2 w-2" /> {formatTimestamp(latest.logged_at)}
                            </span>
                        </>
                    ) : (
                        <span className="text-[10px] text-zinc-650 italic">Aucune saisie</span>
                    )}
                </div>

                {/* Saisie inline */}
                <div className="flex items-center gap-1.5 mt-1 border-t border-zinc-850/30 pt-1.5">
                    <Input 
                        type="number" 
                        placeholder="Ex: 5" 
                        min="0"
                        value={currentInput}
                        onChange={(e) => setInputValues(prev => ({ ...prev, [key]: e.target.value }))}
                        className="h-7 text-xs bg-zinc-950 border-zinc-850 text-white rounded-lg px-2 shrink-1 w-full"
                    />
                    <Button
                        size="icon"
                        disabled={isSaving}
                        onClick={() => handleSaveMetric(manager.id, metricType, `${manager.first_name} ${manager.last_name}`)}
                        className="h-7 w-7 bg-purple-650 hover:bg-purple-750 text-white rounded-lg shrink-0"
                    >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        )
    }

    if (managers.length === 0) return null

    return (
        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
            <CardHeader 
                className="pb-3 bg-zinc-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex-1">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        📋 Grille d'Évaluation Rapide de l'Équipe
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-400">
                        Évaluez et loggez en temps réel les indicateurs d'hygiène et de performance de votre équipe à n'importe quel moment de la semaine.
                    </CardDescription>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isOpen && (
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-xl">
                            <Calendar className="h-3.5 w-3.5 text-purple-400" />
                            <Label className="text-[10px] text-zinc-400 font-bold uppercase shrink-0">Date de saisie :</Label>
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-xxs font-mono text-white cursor-pointer"
                            />
                        </div>
                    )}
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-zinc-450 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/50"
                    >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>
            {isOpen && (
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-400 text-xs">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                            Chargement des indicateurs...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xxs text-zinc-300">
                                <thead className="bg-zinc-950/40 text-zinc-400 font-bold uppercase border-b border-zinc-850">
                                    <tr>
                                        <th className="p-3 w-[150px]">Gestionnaire</th>
                                        <th className="p-3">Courriels &gt; 48 heures</th>
                                        <th className="p-3">Tâches en Retard</th>
                                        <th className="p-3">Factures sans notes &gt; 7 jours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-850/60 bg-zinc-900/10">
                                    {managers.map(manager => {
                                        const teamName = manager.manager_teams?.name || 'Classique'
                                        return (
                                            <tr key={manager.id} className="hover:bg-zinc-850/10 transition-colors">
                                                <td className="p-3 font-semibold text-zinc-150 align-top">
                                                    <div className="text-xs font-bold text-white">{manager.first_name} {manager.last_name}</div>
                                                    <div className="text-[8px] text-zinc-550 text-zinc-500 font-mono mt-0.5">Forfait : {teamName}</div>
                                                </td>
                                                <td className="p-2">
                                                    {renderCell(manager, 'emails_over_48h', <Mail className="h-3 w-3 text-blue-400" />)}
                                                </td>
                                                <td className="p-2">
                                                    {renderCell(manager, 'late_tasks', <CheckSquare className="h-3 w-3 text-purple-400" />)}
                                                </td>
                                                <td className="p-2">
                                                    {renderCell(manager, 'bills_no_notes_over_7d', <FileText className="h-3 w-3 text-amber-400" />)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
