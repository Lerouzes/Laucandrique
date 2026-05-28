'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProjectDates, updateProjectStatus, getProjectDetails } from '@/actions/projects'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    CalendarX, 
    ExternalLink, 
    CalendarClock, 
    CheckCircle2, 
    Clock, 
    Ban, 
    RefreshCw, 
    Calendar as CalendarIcon, 
    TrendingUp,
    Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

type StatusFilter = 'unscheduled' | 'scheduled' | 'completed' | 'cancelled' | 'all'

const STATUS_COLORS: Record<string, string> = {
    unscheduled: 'bg-zinc-700 text-zinc-200',
    planned: 'bg-yellow-700 text-yellow-100',
    in_progress: 'bg-blue-800 text-blue-100',
    completed: 'bg-emerald-800 text-emerald-100',
    deferred: 'bg-rose-950/60 border-rose-800 text-rose-200',
    cancelled: 'bg-zinc-900 border-zinc-800 text-zinc-400 opacity-60',
}

const TYPE_DOT: Record<string, string> = { interior: '#60a5fa', exterior: '#f59e0b' }

const STATUS_LABELS: Record<string, string> = {
    unplanned: 'Non planifié',
    planned: 'Planifié',
    in_progress: 'En cours',
    completed: 'Complété',
    deferred: 'Reporté',
    cancelled: 'Annulé',
}

function formatProjectDate(dateStr: string, isHourly: boolean) {
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return dateStr

    if (isHourly) {
        return parsed.toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
    } else {
        const y = parsed.getUTCFullYear()
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0')
        const d = String(parsed.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }
}

export function PlanningCalendar({ initialProjects, query = "" }: { initialProjects: any[], query?: string }) {
    const router = useRouter()
    const [projects, setProjects] = useState(initialProjects)
    const externalEventsRef = useRef<HTMLDivElement>(null)
    const [isPending, startTransition] = useTransition()
    const [filter, setFilter] = useState<StatusFilter>('unscheduled')
    const [isMoreEventsOpen, setIsMoreEventsOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedEvents, setSelectedEvents] = useState<any[]>([])
    const [viewMode, setViewMode] = useState<'calendar' | 'board'>('board')
    const [showCompleted, setShowCompleted] = useState(false)
    const [selectedDetailProjectId, setSelectedDetailProjectId] = useState<string | null>(null)
    const [selectedProjectDetails, setSelectedProjectDetails] = useState<any | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)

    const toggleProjectSelection = (projectId: string) => {
        setSelectedProjectIds(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        )
    }

    const clearSelection = () => {
        setSelectedProjectIds([])
    }

    const openProjectDetails = async (projectId: string) => {
        setSelectedDetailProjectId(projectId)
        setIsDetailModalOpen(true)
        setLoadingDetails(true)
        try {
            const data = await getProjectDetails(projectId)
            setSelectedProjectDetails(data)
        } catch (err: any) {
            toast.error("Erreur de chargement des détails", { description: err.message })
            setIsDetailModalOpen(false)
        } finally {
            setLoadingDetails(false)
        }
    }

    const normalizedQuery = query.trim().toLowerCase()
    
    const getDurationDays = (project: any) => Number(project?.estimated_duration_days || 1)
    const getDurationMinutes = (project: any) => Math.max(15, Math.round(getDurationDays(project) * 24 * 60))

    // Initialize projects from prop
    useEffect(() => {
        setProjects(initialProjects)
    }, [initialProjects])

    // Generate list of the next 12 months starting from the current month
    const months = useMemo(() => {
        const list = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            const year = d.getFullYear()
            const month = d.getMonth()
            const key = `${year}-${String(month + 1).padStart(2, '0')}`
            const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            list.push({ key, label, year, month })
        }
        return list
    }, [])

    // Initialize draggable only ONCE on mount for FullCalendar external drag source
    useEffect(() => {
        let draggableInstance: Draggable | null = null
        if (externalEventsRef.current) {
            draggableInstance = new Draggable(externalEventsRef.current, {
                itemSelector: '.fc-event-external-draggable',
                eventData: function (eventEl) {
                    const durationDays = Number(eventEl.getAttribute('data-duration-days') || '1')
                    const durationMinutes = Math.max(15, Math.round(durationDays * 24 * 60))
                    return {
                        id: eventEl.getAttribute('data-id'),
                        title: eventEl.getAttribute('data-title'),
                        duration: { minutes: durationMinutes }
                    }
                }
            })
        }
        return () => {
            draggableInstance?.destroy()
        }
    }, [viewMode]) // Re-bind draggable if view changes layout

    // Memoize filtered projects to prevent CPU cycle wastes during render passes
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            if (!normalizedQuery) return true
            const clientName = String(p.clients?.full_name || '').toLowerCase()
            const address = String(p.clients?.address || '').toLowerCase()
            const quoteNumber = String(p.quotes?.quote_number || '')
            const title = String(p.title || '').toLowerCase()
            return clientName.includes(normalizedQuery) || address.includes(normalizedQuery) || quoteNumber.includes(normalizedQuery) || title.includes(normalizedQuery)
        })
    }, [projects, normalizedQuery])

    // Memoize sidebar project list based on filter to completely avoid recalculation lags
    const sidebarProjects = useMemo(() => {
        return filteredProjects.filter(p => {
            if (filter === 'unscheduled') return p.status === 'unplanned' || p.status === 'deferred'
            if (filter === 'scheduled') return p.status === 'planned' || p.status === 'in_progress'
            if (filter === 'completed') return p.status === 'completed'
            if (filter === 'cancelled') return p.status === 'cancelled'
            return true // 'all'
        })
    }, [filteredProjects, filter])

    // Memoize calendar events to ensure FullCalendar receives direct reference updates
    const events = useMemo(() => {
        return filteredProjects.filter(p => p.status !== 'unplanned' && p.status !== 'deferred' && p.status !== 'cancelled').map(p => {
            const durationDays = Number(p.estimated_duration_days || 1)
            const durationMinutes = Math.max(15, Math.round(durationDays * 24 * 60))
            const isHourly = durationDays < 1
            const contractorColor = String(p.contractors?.color || '').trim()
            const eventColor = contractorColor || (p.status === 'completed' ? '#065f46' : p.status === 'in_progress' ? '#1e3a8a' : '#78350f')

            let startStr: string | undefined = undefined
            let endStr: string | undefined = undefined

            if (p.start_date) {
                if (isHourly) {
                    const startObj = new Date(p.start_date)
                    startStr = startObj.toISOString()
                    
                    const endObj = p.end_date ? new Date(p.end_date) : new Date(startObj.getTime() + durationMinutes * 60 * 1000)
                    endStr = endObj.toISOString()
                } else {
                    startStr = p.start_date.slice(0, 10)
                    const endDateBase = p.end_date || p.start_date
                    const parsedEnd = new Date(endDateBase)
                    if (!Number.isNaN(parsedEnd.getTime())) {
                        const nextDay = new Date(Date.UTC(
                            parsedEnd.getUTCFullYear(),
                            parsedEnd.getUTCMonth(),
                            parsedEnd.getUTCDate() + 1,
                            0, 0, 0
                        ))
                        const y = nextDay.getUTCFullYear()
                        const m = String(nextDay.getUTCMonth() + 1).padStart(2, '0')
                        const d = String(nextDay.getUTCDate()).padStart(2, '0')
                        endStr = `${y}-${m}-${d}`
                    } else {
                        endStr = endDateBase.slice(0, 10)
                    }
                }
            }

            return {
                id: p.id,
                title: p.title,
                start: startStr,
                end: endStr,
                allDay: !isHourly,
                backgroundColor: eventColor,
                borderColor: eventColor,
                extendedProps: {
                    client: p.clients?.full_name,
                    status: p.status,
                    projectId: p.id,
                    quoteId: p.quote_id,
                    quoteNumber: p.quotes?.quote_number,
                    projectType: p.project_type,
                    isHourly,
                    eventColor,
                }
            }
        })
    }, [filteredProjects])

    // Calculates budget portion or total for a month column key (YYYY-MM)
    const getProjectMonthlyBudget = (project: any, monthKey: string) => {
        const total = Number(project.quotes?.total || 0)
        if (total <= 0) return 0
        const pMonths = project.planned_months || []
        const cMonths = project.completed_months || []
        const allMonths = Array.from(new Set([...pMonths, ...cMonths]))
        if (allMonths.length > 0) {
            if (allMonths.includes(monthKey)) {
                return total / allMonths.length
            }
            return 0
        }
        // Fallback to start date month
        if (project.start_date && project.start_date.slice(0, 7) === monthKey) {
            return total
        }
        return 0
    }

    const getMonthlySum = (monthKey: string) => {
        return projects.reduce((sum, p) => {
            if (p.status === 'unplanned' || p.status === 'deferred' || p.status === 'cancelled') return sum
            const pMonths = p.planned_months || []
            const cMonths = p.completed_months || []
            const isMatch = pMonths.includes(monthKey) || cMonths.includes(monthKey) || (p.start_date && p.start_date.slice(0, 7) === monthKey)
            if (!isMatch) return sum
            return sum + getProjectMonthlyBudget(p, monthKey)
        }, 0)
    }

    const getProjectsForMonth = (monthKey: string) => {
        return projects.filter(p => {
            if (p.status === 'unplanned' || p.status === 'deferred' || p.status === 'cancelled') return false
            if (p.status === 'completed' && !showCompleted) return false
            
            const pMonths = p.planned_months || []
            const cMonths = p.completed_months || []
            if (pMonths.length > 0 || cMonths.length > 0) {
                return pMonths.includes(monthKey) || cMonths.includes(monthKey)
            }
            return p.start_date && p.start_date.slice(0, 7) === monthKey
        })
    }

    const buildRangeFromEvent = (event: any) => {
        const start = event.start as Date | null
        let end = event.end as Date | null

        if (!start) {
            return { startDate: null, endDate: null }
        }

        if (!end) {
            end = new Date(start)
        }

        if (event.allDay) {
            const adjustedEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000)
            const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0))
            const endUTC = new Date(Date.UTC(adjustedEnd.getUTCFullYear(), adjustedEnd.getUTCMonth(), adjustedEnd.getUTCDate(), 0, 0, 0))
            return {
                startDate: startUTC.toISOString(),
                endDate: endUTC.toISOString(),
            }
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        }
    }

    const handleEventReceive = (info: any) => {
        const projectId = info.event.id
        const { startDate, endDate } = buildRangeFromEvent(info.event)
        info.event.remove()

        let plannedMonths: string[] = []
        if (startDate && endDate) {
            const startD = new Date(startDate)
            plannedMonths = [`${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`]
        }

        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, status: 'planned', start_date: startDate, end_date: endDate, planned_months: plannedMonths
        } : p))

        startTransition(async () => {
            try {
                if (startDate && endDate) await updateProjectDates(projectId, startDate, endDate)
                toast.success("Projet planifié.")
            } catch (e: any) {
                toast.error("Erreur de planification", { description: e.message })
            }
        })
    }

    const handleEventDrop = (info: any) => {
        const projectId = info.event.id
        const { startDate, endDate } = buildRangeFromEvent(info.event)

        let plannedMonths: string[] = []
        if (startDate && endDate) {
            const startD = new Date(startDate)
            plannedMonths = [`${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`]
        }

        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, start_date: startDate, end_date: endDate, planned_months: plannedMonths
        } : p))

        startTransition(async () => {
            try {
                if (startDate && endDate) await updateProjectDates(projectId, startDate, endDate)
                toast.success("Dates mises à jour.")
            } catch (e: any) {
                toast.error("Erreur", { description: e.message })
            }
        })
    }

    const handleEventResize = (info: any) => {
        const projectId = info.event.id
        const { startDate, endDate } = buildRangeFromEvent(info.event)

        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, end_date: endDate
        } : p))

        startTransition(async () => {
            try {
                if (startDate && endDate) await updateProjectDates(projectId, startDate, endDate)
                toast.success("Durée mise à jour.")
            } catch (e: any) {
                toast.error("Erreur", { description: e.message })
            }
        })
    }

    // Centralized handler for status changes (e.g. Unplan, Complete, Defer, Cancel)
    const handleStatusChange = (projectId: string, newStatus: 'unplanned' | 'planned' | 'in_progress' | 'completed' | 'deferred' | 'cancelled') => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p
            const updated = { ...p, status: newStatus }
            if (newStatus === 'unplanned' || newStatus === 'deferred') {
                updated.start_date = null
                updated.end_date = null
                updated.planned_months = []
                if (newStatus === 'deferred') {
                    updated.contractor_id = null
                }
            }
            if (newStatus === 'completed') {
                updated.completed_at = new Date().toISOString()
            }
            return updated
        }))

        startTransition(async () => {
            try {
                await updateProjectStatus(projectId, newStatus)
                toast.success(`Statut du projet mis à jour: ${STATUS_LABELS[newStatus] || newStatus}`)
            } catch (e: any) {
                toast.error("Erreur de modification du statut", { description: e.message })
            }
        })
    }

    const handleUnschedule = (projectId: string) => {
        handleStatusChange(projectId, 'unplanned')
    }

    const handleMarkCompleted = (projectId: string) => {
        handleStatusChange(projectId, 'completed')
    }

    const handleEventClick = (info: any) => {
        const projectId = info.event.extendedProps.projectId || info.event.id
        if (projectId) {
            openProjectDetails(projectId)
        }
    }

    const handleProjectClick = (projectId: string) => {
        if (projectId) {
            openProjectDetails(projectId)
        }
    }

    // HTML5 Drag and Drop Handlers for annual board
    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        e.dataTransfer.setData('text/plain', projectId)
        setDraggedProjectId(projectId)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleBulkMoveToMonth = (targetMonthKey: string, targetYear: number, targetMonthIdx: number) => {
        if (selectedProjectIds.length === 0) return

        setProjects(prev => prev.map(p => {
            if (!selectedProjectIds.includes(p.id)) return p
            const durationDays = Number(p.estimated_duration_days || 1)
            const start = new Date(Date.UTC(targetYear, targetMonthIdx, 1, 8, 0, 0))
            const end = new Date(start.getTime())
            const dur = Math.max(0.01, durationDays)
            if (dur < 1) {
                const durationMinutes = Math.max(15, Math.round(dur * 24 * 60))
                end.setTime(start.getTime() + durationMinutes * 60 * 1000)
            } else {
                end.setDate(end.getDate() + (Math.ceil(dur) - 1))
                end.setUTCHours(17, 0, 0, 0)
            }
            return {
                ...p,
                status: 'planned',
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                planned_months: [targetMonthKey]
            }
        }))

        startTransition(async () => {
            try {
                await Promise.all(selectedProjectIds.map(async (projectId) => {
                    const project = projects.find(p => p.id === projectId)
                    if (!project) return
                    const durationDays = Number(project.estimated_duration_days || 1)
                    const start = new Date(Date.UTC(targetYear, targetMonthIdx, 1, 8, 0, 0))
                    const end = new Date(start.getTime())
                    const dur = Math.max(0.01, durationDays)
                    if (dur < 1) {
                        const durationMinutes = Math.max(15, Math.round(dur * 24 * 60))
                        end.setTime(start.getTime() + durationMinutes * 60 * 1000)
                    } else {
                        end.setDate(end.getDate() + (Math.ceil(dur) - 1))
                        end.setUTCHours(17, 0, 0, 0)
                    }
                    await updateProjectDates(projectId, start.toISOString(), end.toISOString())
                }))
                toast.success(`${selectedProjectIds.length} projets planifiés pour ${targetMonthKey}`)
                setSelectedProjectIds([])
            } catch (err: any) {
                toast.error("Erreur de déplacement en lot", { description: err.message })
            }
        })
    }

    const handleBulkStatusChange = (newStatus: 'unplanned' | 'planned' | 'in_progress' | 'completed' | 'deferred' | 'cancelled') => {
        if (selectedProjectIds.length === 0) return

        setProjects(prev => prev.map(p => {
            if (!selectedProjectIds.includes(p.id)) return p
            const updated = { ...p, status: newStatus }
            if (newStatus === 'unplanned' || newStatus === 'deferred') {
                updated.start_date = null
                updated.end_date = null
                updated.planned_months = []
                if (newStatus === 'deferred') {
                    updated.contractor_id = null
                }
            }
            if (newStatus === 'completed') {
                updated.completed_at = new Date().toISOString()
            }
            return updated
        }))

        startTransition(async () => {
            try {
                await Promise.all(selectedProjectIds.map(id => updateProjectStatus(id, newStatus)))
                toast.success(`${selectedProjectIds.length} projets mis à jour: ${STATUS_LABELS[newStatus] || newStatus}`)
                setSelectedProjectIds([])
            } catch (e: any) {
                toast.error("Erreur lors de la modification en lot", { description: e.message })
            }
        })
    }

    const handleDropOnMonth = (e: React.DragEvent, targetMonthKey: string, targetYear: number, targetMonthIdx: number) => {
        e.preventDefault()
        const projectId = e.dataTransfer.getData('text/plain') || draggedProjectId
        if (!projectId) return

        if (selectedProjectIds.includes(projectId)) {
            handleBulkMoveToMonth(targetMonthKey, targetYear, targetMonthIdx)
        } else {
            const project = projects.find(p => p.id === projectId)
            if (!project) return

            const durationDays = Number(project.estimated_duration_days || 1)
            const start = new Date(Date.UTC(targetYear, targetMonthIdx, 1, 8, 0, 0))
            const end = new Date(start.getTime())
            const dur = Math.max(0.01, durationDays)
            if (dur < 1) {
                const durationMinutes = Math.max(15, Math.round(dur * 24 * 60))
                end.setTime(start.getTime() + durationMinutes * 60 * 1000)
            } else {
                end.setDate(end.getDate() + (Math.ceil(dur) - 1))
                end.setUTCHours(17, 0, 0, 0)
            }

            const startDateIso = start.toISOString()
            const endDateIso = end.toISOString()
            const updatedPlannedMonths = [targetMonthKey]

            setProjects(prev => prev.map(p => p.id === projectId ? {
                ...p,
                status: 'planned',
                start_date: startDateIso,
                end_date: endDateIso,
                planned_months: updatedPlannedMonths
            } : p))

            startTransition(async () => {
                try {
                    await updateProjectDates(projectId, startDateIso, endDateIso)
                    toast.success(`Planifié pour ${targetMonthKey}`)
                } catch (err: any) {
                    toast.error("Erreur de déplacement", { description: err.message })
                }
            })
        }
        setDraggedProjectId(null)
    }

    const formattedModalDate = selectedDate
        ? selectedDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : ''
    const capitalizedDate = formattedModalDate
        ? formattedModalDate.charAt(0).toUpperCase() + formattedModalDate.slice(1)
        : ''

    return (
        <div className="flex flex-col h-full space-y-4">
            
            {/* View Mode Switch bar */}
            <div className="flex justify-between items-center bg-zinc-950/20 p-2 border border-zinc-800 rounded-xl">
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'calendar' ? 'default' : 'outline'}
                        onClick={() => setViewMode('calendar')}
                        type="button"
                        className={`h-8 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'}`}
                    >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Calendrier Mensuel
                    </Button>
                    <Button
                        variant={viewMode === 'board' ? 'default' : 'outline'}
                        onClick={() => setViewMode('board')}
                        type="button"
                        className={`h-8 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${viewMode === 'board' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'}`}
                    >
                        <TrendingUp className="h-3.5 w-3.5 text-yellow-400" />
                        Prévisions Annuelles (12 Mois)
                    </Button>
                </div>
                
                {/* Visual Type Indicator */}
                <div className="hidden sm:flex items-center gap-4 text-xxs text-zinc-400">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_DOT.interior }} />
                        <span>Intérieur</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_DOT.exterior }} />
                        <span>Extérieur</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 h-[calc(100vh-200px)] min-h-[750px]">
                {/* Sidebar */}
                <Card className="w-80 h-full border-zinc-800 bg-transparent flex flex-col shrink-0">
                    <CardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
                        <CardTitle className="text-zinc-100 text-base font-semibold mb-2">Projets</CardTitle>
                        {/* Filter tabs */}
                        <div className="flex gap-0.5 bg-zinc-900/40 rounded-md p-0.5 border border-zinc-800 overflow-x-auto">
                            {(['unscheduled', 'scheduled', 'completed', 'cancelled', 'all'] as StatusFilter[]).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFilter(f)}
                                    className={`flex-1 text-[10px] py-1 px-1.5 rounded transition-colors whitespace-nowrap ${filter === f
                                        ? 'bg-zinc-700 text-zinc-100 font-medium'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                >
                                    {f === 'unscheduled' ? 'Non plan./Reportés' : f === 'scheduled' ? 'Planifiés' : f === 'completed' ? 'Complétés' : f === 'cancelled' ? 'Annulés' : 'Tous'}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    
                    <CardContent
                        className="flex-1 p-3 overflow-y-auto"
                        ref={externalEventsRef}
                    >
                        {sidebarProjects.length === 0 ? (
                            <div className="text-zinc-500 text-sm text-center py-6">Aucun projet ici.</div>
                        ) : (
                            <div className="space-y-2">
                                {sidebarProjects.map(project => {
                                    const isDraggable = project.status === 'unplanned' || project.status === 'deferred' || project.status === 'planned'
                                    const isSelected = selectedProjectIds.includes(project.id)
                                    
                                    return (
                                        <div
                                            key={project.id}
                                            data-id={project.id}
                                            data-title={project.title}
                                            data-duration-days={project.estimated_duration_days}
                                            draggable={isDraggable}
                                            onDragStart={(e) => handleDragStart(e, project.id)}
                                            onClick={() => openProjectDetails(project.id)}
                                            className={`fc-event-external p-3 bg-zinc-950/20 border rounded-md transition-all shadow-sm flex flex-col gap-1.5 cursor-pointer ${
                                                isSelected
                                                    ? 'border-cyan-500 ring-1 ring-cyan-500 bg-cyan-950/10'
                                                    : project.status === 'deferred'
                                                        ? 'border-rose-900/80 bg-rose-950/20 text-rose-200 hover:border-rose-700'
                                                        : project.status === 'cancelled'
                                                            ? 'border-zinc-900 bg-zinc-950/40 text-zinc-500 opacity-60'
                                                            : project.status === 'completed'
                                                                ? 'border-emerald-900/60 bg-emerald-950/10 text-emerald-200'
                                                                : project.status === 'in_progress'
                                                                    ? 'border-blue-900/60 bg-blue-950/10 text-blue-200'
                                                                    : project.status === 'planned'
                                                                        ? 'border-yellow-900/60 bg-yellow-950/10 text-yellow-200'
                                                                        : 'border-zinc-800 hover:border-zinc-700 text-zinc-100'
                                            } ${isDraggable ? 'fc-event-external-draggable cursor-grab active:cursor-grabbing hover:bg-zinc-900/30' : 'hover:bg-zinc-900/10'}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-medium text-zinc-100 text-xs leading-tight flex items-center gap-2 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            toggleProjectSelection(project.id)
                                                        }}
                                                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 shrink-0 cursor-pointer"
                                                    />
                                                    <span className='inline-block h-2 w-2 rounded-full shrink-0' style={{ backgroundColor: TYPE_DOT[project.project_type || 'interior'] }} />
                                                    <span className="truncate max-w-[120px]" title={project.title}>{project.title}</span>
                                                </div>
                                                {project.quotes?.quote_number && <div className='text-[10px] text-zinc-400 font-mono shrink-0'>#{project.quotes.quote_number}</div>}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/quotes/${project.quote_id}`) }}
                                                    className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                                                    title="Voir la soumission"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            
                                            <div className="text-[11px] text-zinc-400 truncate">{project.clients?.full_name}</div>
                                            
                                            {/* Project history planned/completed display */}
                                            {project.planned_months && project.planned_months.length > 0 && (
                                                <div className="text-[10px] text-zinc-500 font-semibold">
                                                    🗓️ Planifié : {project.planned_months.join(', ')}
                                                </div>
                                            )}
                                            {project.completed_months && project.completed_months.length > 0 && (
                                                <div className="text-[10px] text-zinc-500 font-semibold">
                                                    ✅ Complété : {project.completed_months.join(', ')}
                                                </div>
                                            )}

                                            {project.contractors?.full_name && <div className='text-[11px]' style={{ color: project.contractors.color }}>👷 {project.contractors.full_name}</div>}
                                            
                                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/40 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Badge variant="secondary" className="bg-zinc-800/50 text-zinc-100 pointer-events-none text-[10px] py-0 px-1">
                                                        {project.estimated_duration_days} j
                                                    </Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`pointer-events-none text-[10px] py-0 px-1 ${
                                                            project.status === 'completed' 
                                                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' 
                                                                : project.status === 'deferred'
                                                                    ? 'bg-rose-950 text-rose-300 border border-rose-800/40 font-semibold'
                                                                    : project.status === 'cancelled'
                                                                        ? 'bg-zinc-900 text-zinc-400 border border-zinc-800/40'
                                                                        : project.status === 'in_progress' 
                                                                            ? 'bg-blue-950 text-blue-300 border border-blue-800/40' 
                                                                            : project.status === 'planned'
                                                                                ? 'bg-yellow-950 text-yellow-300 border border-yellow-800/40'
                                                                                : 'bg-zinc-800 text-zinc-300'
                                                        }`}
                                                    >
                                                        {STATUS_LABELS[project.status || 'unplanned']}
                                                    </Badge>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex items-center gap-0.5">
                                                    {/* Complete button */}
                                                    {project.status !== 'completed' && project.status !== 'cancelled' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'completed') }}
                                                            className="text-zinc-500 hover:text-emerald-400 transition-colors p-1"
                                                            title="Marquer comme complété"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Defer button */}
                                                    {project.status !== 'deferred' && project.status !== 'completed' && project.status !== 'cancelled' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'deferred') }}
                                                            className="text-zinc-500 hover:text-rose-450 text-rose-400 transition-colors p-1"
                                                            title="Reporter (Différer)"
                                                        >
                                                            <Clock className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Cancel button */}
                                                    {project.status !== 'cancelled' && project.status !== 'completed' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'cancelled') }}
                                                            className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                                                            title="Annuler le projet"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Unschedule button */}
                                                    {project.status !== 'unplanned' && project.status !== 'deferred' && project.status !== 'cancelled' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'unplanned') }}
                                                            className="text-zinc-500 hover:text-amber-400 transition-colors p-1"
                                                            title="Retirer du calendrier"
                                                        >
                                                            <CalendarX className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Revert to unplanned button */}
                                                    {(project.status === 'cancelled' || project.status === 'completed' || project.status === 'deferred') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'unplanned') }}
                                                            className="text-zinc-500 hover:text-cyan-400 transition-colors p-1"
                                                            title="Rétablir en non planifié"
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                {viewMode === 'calendar' ? (
                    <Card className="flex-1 h-full border-zinc-800 bg-transparent p-4 relative overflow-hidden flex flex-col">
                        <div className="fc-dark-theme-wrapper flex-1 min-h-0">
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek'
                                }}
                                editable={true}
                                droppable={true}
                                events={events}
                                eventReceive={handleEventReceive}
                                eventDrop={handleEventDrop}
                                eventResize={handleEventResize}
                                eventClick={handleEventClick}
                                dayMaxEvents={true}
                                moreLinkClick={(info) => {
                                    info.jsEvent.preventDefault()
                                    setSelectedDate(info.date)
                                    const evts = info.allSegs.map((seg: any) => seg.event)
                                    setSelectedEvents(evts)
                                    setIsMoreEventsOpen(true)
                                }}
                                eventDisplay="block"
                                eventDidMount={(info) => {
                                    const color = info.event.extendedProps.eventColor
                                    if (color) {
                                        info.el.style.backgroundColor = color
                                        info.el.style.borderColor = color
                                        info.el.style.opacity = '1'
                                    }
                                }}
                                height="100%"
                                locale="fr"
                                firstDay={1}
                                buttonText={{
                                    today: "Aujourd'hui",
                                    month: 'Mois',
                                    week: 'Semaine',
                                    day: 'Jour',
                                }}
                                eventContent={(arg) => (
                                    <div className="overflow-hidden p-1 text-xs cursor-pointer group">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-semibold text-white truncate flex items-center gap-1.5"><span className='inline-block h-2 w-2 rounded-full shrink-0' style={{ backgroundColor: TYPE_DOT[arg.event.extendedProps.projectType || 'interior'] }} />{arg.event.title}{arg.event.extendedProps.quoteNumber ? ` · #${arg.event.extendedProps.quoteNumber}` : ''}</div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                {arg.event.extendedProps.status !== 'completed' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleMarkCompleted(String(arg.event.extendedProps.projectId || arg.event.id)) }}
                                                        className="text-white hover:text-emerald-400 transition-colors"
                                                        title="Marquer comme complété"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleUnschedule(String(arg.event.extendedProps.projectId || arg.event.id)) }}
                                                    className="text-white hover:text-red-300 transition-colors"
                                                    title="Retirer du calendrier"
                                                >
                                                    <CalendarX className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="opacity-70 mt-0.5 truncate">{arg.event.extendedProps.client}</div>
                                        <div className="opacity-0 group-hover:opacity-100 text-yellow-300 transition-opacity text-[10px] mt-0.5">Cliquer pour voir ↗</div>
                                    </div>
                                )}
                            />
                        </div>
                    </Card>
                ) : (
                    <Card className="flex-1 h-full border-zinc-800 bg-transparent p-4 relative overflow-hidden flex flex-col">
                        <div className="shrink-0 mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-zinc-100 text-base font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-yellow-400" />
                                    <span>Tableau de Prévisions Annuelles (12 Mois)</span>
                                </CardTitle>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Glissez-déposez les projets dans les colonnes des mois pour les planifier ou les replanifier.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-1.5 shrink-0 self-start sm:self-auto">
                                <label className="flex items-center gap-2 text-xxs font-bold text-zinc-300 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={showCompleted}
                                        onChange={(e) => setShowCompleted(e.target.checked)}
                                        className="h-3.5 w-3.5 accent-cyan-500 rounded bg-zinc-900 border-zinc-800 cursor-pointer"
                                    />
                                    Afficher les projets complétés
                                </label>
                            </div>
                        </div>
                        
                        <div className="flex-1 min-h-0 overflow-x-auto flex gap-4 pb-2 scrollbar-thin">
                            {months.map(month => {
                                const monthProjects = getProjectsForMonth(month.key)
                                const monthlySum = getMonthlySum(month.key)
                                
                                return (
                                    <div
                                        key={month.key}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropOnMonth(e, month.key, month.year, month.month)}
                                        className="w-72 h-full bg-zinc-950/40 border border-zinc-850 rounded-xl flex flex-col shrink-0 overflow-hidden"
                                    >
                                        {/* Column Header */}
                                        <div className="p-3 bg-zinc-900 border-b border-zinc-850 shrink-0 flex items-center justify-between">
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-zinc-100 text-xs truncate capitalize">
                                                    {month.label}
                                                </h4>
                                                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                                                    {monthProjects.length} projet{monthProjects.length > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <Badge className="bg-cyan-950/40 text-cyan-300 border border-cyan-800/30 text-xs font-semibold px-2 py-0.5 whitespace-nowrap">
                                                {Math.round(monthlySum).toLocaleString('fr-CA')} $
                                            </Badge>
                                        </div>
                                        
                                        {/* Column Body / Drop Zone */}
                                        <div className="flex-1 p-2 overflow-y-auto space-y-2 bg-zinc-900/10">
                                            {monthProjects.length === 0 ? (
                                                <div className="h-24 flex items-center justify-center border border-dashed border-zinc-800/60 rounded-lg text-zinc-600 text-[11px] italic">
                                                    Déposer un projet ici
                                                </div>
                                            ) : (
                                                monthProjects.map(project => {
                                                    const contractorColor = String(project.contractors?.color || '').trim()
                                                    const borderStyle = contractorColor ? { borderLeft: `3px solid ${contractorColor}` } : {}
                                                    const isCompleted = project.status === 'completed'
                                                    
                                                    const isSelected = selectedProjectIds.includes(project.id)
                                                    
                                                    return (
                                                        <div
                                                            key={project.id}
                                                            draggable={!isCompleted}
                                                            onDragStart={(e) => handleDragStart(e, project.id)}
                                                            onClick={() => openProjectDetails(project.id)}
                                                            className={`p-3 border rounded-lg transition-all shadow-sm flex flex-col gap-1.5 cursor-pointer ${
                                                                isSelected
                                                                    ? 'border-cyan-500 ring-1 ring-cyan-500 bg-cyan-950/10'
                                                                    : isCompleted
                                                                        ? 'bg-emerald-950/10 border-emerald-900/40 hover:border-emerald-800/80 text-emerald-250'
                                                                        : 'bg-zinc-900/80 border-zinc-850 hover:border-zinc-750 hover:bg-zinc-900 text-zinc-100'
                                                            }`}
                                                            style={borderStyle}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="font-semibold text-zinc-100 text-xs leading-tight flex items-center gap-2 min-w-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation()
                                                                            toggleProjectSelection(project.id)
                                                                        }}
                                                                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 shrink-0 cursor-pointer"
                                                                    />
                                                                    <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_DOT[project.project_type || 'interior'] }} />
                                                                    <span className="truncate" title={project.title}>{project.title}</span>
                                                                </div>
                                                                {project.quotes?.quote_number && (
                                                                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">#{project.quotes.quote_number}</span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="text-[10px] text-zinc-400 truncate">{project.clients?.full_name}</div>
                                                            
                                                            {project.contractors?.full_name && (
                                                                <div className="text-[10px]" style={{ color: project.contractors.color }}>
                                                                    👷 {project.contractors.full_name}
                                                                </div>
                                                            )}
                                                            
                                                            {project.planned_months && project.planned_months.length > 0 && (
                                                                <div className="text-[9px] text-zinc-500 font-semibold">
                                                                    🗓️ Planifié : {project.planned_months.join(', ')}
                                                                </div>
                                                            )}
                                                            
                                                            <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-zinc-850/60">
                                                                <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-450' : 'text-cyan-400'}`}>
                                                                    {project.quotes?.total ? Math.round(project.quotes.total).toLocaleString('fr-CA') + ' $' : '0 $'}
                                                                    {isCompleted && <span className="ml-1 text-[9px] text-emerald-500 font-semibold">(Complété)</span>}
                                                                </span>
                                                                
                                                                <div className="flex items-center gap-0.5">
                                                                    {/* Mark completed */}
                                                                    {project.status !== 'completed' && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'completed') }}
                                                                            className="text-zinc-500 hover:text-emerald-400 transition-colors p-1"
                                                                            title="Marquer complété"
                                                                        >
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {/* Defer */}
                                                                    {project.status !== 'deferred' && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'deferred') }}
                                                                            className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                                                                            title="Reporter (Différer)"
                                                                        >
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {/* Cancel */}
                                                                    {project.status !== 'cancelled' && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'cancelled') }}
                                                                            className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                                                                            title="Annuler le projet"
                                                                        >
                                                                            <Ban className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {/* Unschedule */}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'unplanned') }}
                                                                        className="text-zinc-500 hover:text-amber-400 transition-colors p-1"
                                                                        title="Mettre non planifié"
                                                                    >
                                                                        <CalendarX className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )}
            </div>

            <Dialog open={isMoreEventsOpen} onOpenChange={setIsMoreEventsOpen}>
                <DialogContent className="sm:max-w-md bg-[#103f75] border border-white/20 text-white max-h-[80vh] flex flex-col p-6 rounded-xl">
                    <DialogHeader className="pb-3 border-b border-white/10">
                        <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-yellow-300" />
                            <span>Projets du {capitalizedDate}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                        {selectedEvents.map((event) => {
                            const props = event.extendedProps || {}
                            const projectId = props.projectId
                            const quoteId = props.quoteId
                            const quoteNumber = props.quoteNumber
                            const client = props.client
                            const status = props.status
                            const projectType = props.projectType || 'interior'

                            return (
                                <div 
                                    key={event.id}
                                    className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors flex items-start justify-between gap-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span 
                                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0" 
                                                style={{ backgroundColor: TYPE_DOT[projectType] }} 
                                            />
                                            <span className="font-semibold text-white text-sm truncate">
                                                {event.title}
                                            </span>
                                            {quoteNumber && (
                                                <span className="text-xs text-white/60 font-mono">
                                                    #{quoteNumber}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-white/70 mb-2 truncate">
                                            {client}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Badge 
                                                variant="secondary" 
                                                className={`text-[10px] py-0 px-1.5 pointer-events-none ${
                                                    status === 'completed' 
                                                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800' 
                                                        : status === 'in_progress' 
                                                            ? 'bg-blue-900/60 text-blue-300 border border-blue-800' 
                                                            : 'bg-yellow-900/60 text-yellow-300 border border-yellow-800'
                                                }`}
                                            >
                                                {status === 'completed' ? 'Complété' : status === 'in_progress' ? 'En cours' : 'Planifié'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {quoteId && (
                                            <button
                                                onClick={() => {
                                                    setIsMoreEventsOpen(false)
                                                    router.push(`/quotes/${quoteId}`)
                                                }}
                                                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                title="Voir la soumission"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </button>
                                        )}
                                        {status !== 'completed' && (
                                            <button
                                                onClick={() => {
                                                    handleMarkCompleted(projectId)
                                                    setSelectedEvents(prev => prev.map(e => e.id === event.id ? {
                                                        ...e,
                                                        extendedProps: { ...e.extendedProps, status: 'completed' }
                                                    } : e))
                                                }}
                                                className="p-1.5 text-white/60 hover:text-emerald-400 hover:bg-white/10 rounded transition-colors"
                                                title="Marquer comme complété"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                handleUnschedule(projectId)
                                                setSelectedEvents(prev => prev.filter(e => e.id !== event.id))
                                            }}
                                            className="p-1.5 text-white/60 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                                            title="Retirer du calendrier"
                                        >
                                            <CalendarX className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        {selectedEvents.length === 0 && (
                            <div className="text-white/40 text-center py-6 text-sm">
                                Aucun projet planifié pour cette journée.
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex justify-end">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsMoreEventsOpen(false)}
                            className="bg-white/10 hover:bg-white/15 text-white border-white/10"
                        >
                            Fermer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-4xl bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto p-0 rounded-2xl shadow-2xl">
                    {loadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
                            <p className="text-xs text-zinc-400">Chargement des détails du projet...</p>
                        </div>
                    ) : selectedProjectDetails ? (
                        <div className="flex flex-col h-full">
                            {/* Modal Header banner */}
                            <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: TYPE_DOT[selectedProjectDetails.project_type || 'interior'] }} />
                                        <h2 className="text-lg font-bold text-zinc-100">{selectedProjectDetails.title}</h2>
                                        {selectedProjectDetails.quotes?.quote_number && (
                                            <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                                #{selectedProjectDetails.quotes.quote_number}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <span>Type: <strong className="text-zinc-200 capitalize">{selectedProjectDetails.project_type === 'interior' ? 'Intérieur' : 'Extérieur'}</strong></span>
                                        {selectedProjectDetails.start_date && (
                                            <>
                                                <span>·</span>
                                                <span>Planifié: <strong className="text-zinc-200">{new Date(selectedProjectDetails.start_date).toLocaleDateString('fr-CA')}</strong> au <strong className="text-zinc-200">{new Date(selectedProjectDetails.end_date).toLocaleDateString('fr-CA')}</strong></span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge className={`pointer-events-none text-xs px-2.5 py-0.5 border ${
                                        selectedProjectDetails.status === 'completed' 
                                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' 
                                            : selectedProjectDetails.status === 'deferred'
                                                ? 'bg-rose-950 text-rose-300 border-rose-800/40 font-semibold'
                                                : selectedProjectDetails.status === 'cancelled'
                                                    ? 'bg-zinc-900 text-zinc-450 border-zinc-800/40'
                                                    : selectedProjectDetails.status === 'in_progress' 
                                                        ? 'bg-blue-950 text-blue-300 border-blue-800/40' 
                                                        : selectedProjectDetails.status === 'planned'
                                                            ? 'bg-yellow-950 text-yellow-300 border-yellow-800/40'
                                                            : 'bg-zinc-800 text-zinc-300'
                                    }`}>
                                        {STATUS_LABELS[selectedProjectDetails.status || 'unplanned']}
                                    </Badge>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Syndicat and Contractor info */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-wider border-b border-zinc-900 pb-1 text-zinc-450">Informations Syndicat (Client)</h3>
                                        <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2.5">
                                            <div>
                                                <span className="text-xxs text-zinc-500 block">Nom complet du SDC</span>
                                                <span className="text-sm font-bold text-zinc-200">{selectedProjectDetails.clients?.company_name || 'N/A'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-xxs text-zinc-500 block">SDC #</span>
                                                    <span className="text-xs font-semibold text-zinc-350">{selectedProjectDetails.clients?.full_name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xxs text-zinc-500 block">Téléphone</span>
                                                    <span className="text-xs font-semibold text-zinc-350">{selectedProjectDetails.clients?.phone || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xxs text-zinc-500 block">Adresse complète</span>
                                                <span className="text-xs text-zinc-300">{selectedProjectDetails.clients?.address || 'N/A'}, {selectedProjectDetails.clients?.city || ''}</span>
                                            </div>
                                            <div>
                                                <span className="text-xxs text-zinc-500 block">Courriel</span>
                                                <span className="text-xs text-zinc-300">{selectedProjectDetails.clients?.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedProjectDetails.contractors && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-wider border-b border-zinc-900 pb-1 text-zinc-450">Contracteur Assigné</h3>
                                            <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-zinc-200 block">{selectedProjectDetails.contractors.full_name}</span>
                                                    {selectedProjectDetails.contractors.phone && (
                                                        <span className="text-xxs text-zinc-400">📞 {selectedProjectDetails.contractors.phone}</span>
                                                    )}
                                                </div>
                                                <span className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: selectedProjectDetails.contractors.color }} />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Quick Completion / Actions */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-wider border-b border-zinc-900 pb-1 text-zinc-450">Statut du travail</h3>
                                        <div className="flex gap-2">
                                            {selectedProjectDetails.status !== 'completed' ? (
                                                <Button
                                                    onClick={async () => {
                                                        const pid = selectedProjectDetails.id
                                                        handleStatusChange(pid, 'completed')
                                                        // update local state
                                                        setSelectedProjectDetails((prev: any) => prev ? { ...prev, status: 'completed' } : null)
                                                        toast.success("Projet complété avec succès!")
                                                    }}
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Marquer comme complété
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={async () => {
                                                        const pid = selectedProjectDetails.id
                                                        handleStatusChange(pid, 'planned')
                                                        // update local state
                                                        setSelectedProjectDetails((prev: any) => prev ? { ...prev, status: 'planned' } : null)
                                                        toast.success("Rétabli en planification.")
                                                    }}
                                                    className="flex-1 bg-zinc-805 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 border border-zinc-750"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    Rétablir en planification
                                                </Button>
                                            )}
                                            
                                            {selectedProjectDetails.quote_id && (
                                                <Button
                                                    onClick={() => {
                                                        setIsDetailModalOpen(false)
                                                        router.push(`/quotes/${selectedProjectDetails.quote_id}`)
                                                    }}
                                                    variant="outline"
                                                    className="h-10 rounded-xl text-xs font-semibold border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                                                >
                                                    Soumission <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Items & Images */}
                                <div className="space-y-6">
                                    {/* Items */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-wider border-b border-zinc-900 pb-1 text-zinc-450">Détails des travaux (Items)</h3>
                                        <div className="bg-zinc-900/30 border border-zinc-850 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                                            {selectedProjectDetails.quotes?.quote_items && selectedProjectDetails.quotes.quote_items.length > 0 ? (
                                                <div className="divide-y divide-zinc-900">
                                                    {selectedProjectDetails.quotes.quote_items.map((item: any) => (
                                                        <div key={item.id} className="p-3 text-xxs flex justify-between gap-3 items-center">
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-zinc-350 block truncate">{item.description}</span>
                                                                {item.notes && <span className="text-zinc-500 block truncate mt-0.5">{item.notes}</span>}
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <span className="text-zinc-450 block">Qté: {item.quantity}</span>
                                                                <span className="font-mono text-zinc-300 block mt-0.5">${Math.round(item.unit_price * item.quantity).toLocaleString('fr-CA')}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xxs text-zinc-500 italic p-4 text-center">Aucun détail d'item disponible.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pictures */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-wider border-b border-zinc-900 pb-1 text-zinc-450">Photos & Images</h3>
                                        <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl">
                                            {selectedProjectDetails.quotes?.quote_images && selectedProjectDetails.quotes.quote_images.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                                                    {selectedProjectDetails.quotes.quote_images.map((img: any) => (
                                                        <a 
                                                            key={img.id} 
                                                            href={img.image_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="group relative aspect-square rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950 flex items-center justify-center hover:border-zinc-700 transition-colors"
                                                        >
                                                            <img 
                                                                src={img.image_url} 
                                                                alt="Projet" 
                                                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xxs text-zinc-500 italic py-6 text-center">Aucune photo enregistrée.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center py-10 text-sm text-zinc-500">Aucune information trouvée.</p>
                    )}
                </DialogContent>
            </Dialog>

            {selectedProjectIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <span className="text-zinc-350 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-cyan-600/30 text-cyan-400 border border-cyan-800 flex items-center justify-center text-[10px] font-bold">
                            {selectedProjectIds.length}
                        </span>
                        projets sélectionnés
                    </span>
                    
                    <div className="h-4 w-px bg-zinc-800" />
                    
                    <div className="flex items-center gap-1.5">
                        <Button
                            onClick={() => handleBulkStatusChange('completed')}
                            size="sm"
                            type="button"
                            className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-450 hover:text-white border border-emerald-900/60 rounded-lg text-xxs font-bold h-8 flex items-center gap-1"
                            title="Marquer comme complétés"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Compléter
                        </Button>
                        <Button
                            onClick={() => handleBulkStatusChange('deferred')}
                            size="sm"
                            type="button"
                            className="bg-rose-600/10 hover:bg-rose-600 text-rose-450 hover:text-white border border-rose-900/60 rounded-lg text-xxs font-bold h-8 flex items-center gap-1"
                            title="Reporter les projets"
                        >
                            <Clock className="h-3.5 w-3.5" />
                            Reporter
                        </Button>
                        <Button
                            onClick={() => handleBulkStatusChange('cancelled')}
                            size="sm"
                            type="button"
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg text-xxs font-bold h-8 flex items-center gap-1"
                            title="Annuler les projets"
                        >
                            <Ban className="h-3.5 w-3.5" />
                            Annuler
                        </Button>
                        <Button
                            onClick={() => handleBulkStatusChange('unplanned')}
                            size="sm"
                            type="button"
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg text-xxs font-bold h-8 flex items-center gap-1"
                            title="Retirer la planification"
                        >
                            <CalendarX className="h-3.5 w-3.5" />
                            Déplanifier
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-zinc-800" />

                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-400 mr-1 font-medium">Placer en :</span>
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    const [yStr, mStr] = e.target.value.split('-')
                                    const year = parseInt(yStr)
                                    const monthIdx = parseInt(mStr) - 1
                                    handleBulkMoveToMonth(e.target.value, year, monthIdx)
                                    e.target.value = ''
                                }
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 px-2 py-1 focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" disabled>Choisir un mois...</option>
                            {months.map(m => (
                                <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-4 w-px bg-zinc-800" />

                    <Button
                        onClick={clearSelection}
                        variant="ghost"
                        type="button"
                        className="text-zinc-500 hover:text-zinc-200 text-xxs font-bold h-8 rounded-lg"
                    >
                        Annuler
                    </Button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .fc-dark-theme-wrapper { color: #f4f4f5; height: 100%; }
        .fc-theme-standard .fc-scrollgrid { border-color: #27272a; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: #27272a; }
        .fc-button-primary { background-color: #18181b !important; border-color: #27272a !important; color: #f4f4f5 !important; }
        .fc-button-primary:hover { background-color: #27272a !important; }
        .fc-button-active { background-color: #3f3f46 !important; }
        .fc-v-event { border: none; }
        .fc-h-event { border: none; }
        .fc-toolbar-title { font-weight: 600; text-transform: capitalize; }
        .fc .fc-daygrid-day-number { color: #a1a1aa; }
        .fc .fc-col-header-cell-cushion { color: #f4f4f5; font-weight: 500; }
        .fc .fc-day-today { background-color: #18181b !important; }
        .fc-event-main { padding: 2px; }
        .fc-event { cursor: pointer; }
        
        /* Premium custom styling for "+X more" links */
        .fc-daygrid-more-link {
            color: #f59e0b !important;
            font-size: 0.72rem !important;
            font-weight: 600 !important;
            padding: 2px 6px !important;
            background-color: #27272a !important;
            border-radius: 4px !important;
            display: inline-block !important;
            margin: 2px 0 !important;
            transition: all 0.2s ease !important;
            border: 1px solid #3f3f46 !important;
        }
        .fc-daygrid-more-link:hover {
            background-color: #3f3f46 !important;
            text-decoration: none !important;
            color: #fbbf24 !important;
            border-color: #f59e0b !important;
        }

        /* Dark Mode Popover Styling */
        .fc-popover {
            background-color: #18181b !important;
            border: 1px solid #27272a !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3) !important;
            z-index: 9999 !important;
        }
        .fc-popover-header {
            background-color: #27272a !important;
            border-bottom: 1px solid #3f3f46 !important;
            padding: 8px 12px !important;
            border-top-left-radius: 7px !important;
            border-top-right-radius: 7px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
        }
        .fc-popover-title {
            color: #f4f4f5 !important;
            font-size: 0.875rem !important;
            font-weight: 600 !important;
            text-transform: capitalize;
        }
        .fc-popover-close {
            color: #a1a1aa !important;
            opacity: 0.8 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
        }
        .fc-popover-close:hover {
            opacity: 1 !important;
            color: #ef4444 !important;
            border-color: transparent !important;
        }
        .fc-popover-body {
            background-color: #18181b !important;
            padding: 8px !important;
            max-height: 280px !important;
            overflow-y: auto !important;
        }
        .fc-popover-body .fc-daygrid-event {
            margin-bottom: 4px !important;
            border-radius: 4px !important;
        }
        `}} />
        </div>
    )
}
