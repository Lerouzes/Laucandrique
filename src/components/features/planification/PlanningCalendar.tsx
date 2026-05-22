'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProjectDates, updateProjectStatus } from '@/actions/projects'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarX, ExternalLink, CalendarClock, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

type StatusFilter = 'unscheduled' | 'scheduled' | 'completed' | 'all'

const STATUS_COLORS: Record<string, string> = {
    unscheduled: 'bg-zinc-700 text-zinc-200',
    planned: 'bg-yellow-700 text-yellow-100',
    in_progress: 'bg-blue-800 text-blue-100',
    completed: 'bg-emerald-800 text-emerald-100',
}

const TYPE_DOT: Record<string, string> = { interior: '#60a5fa', exterior: '#f59e0b' }

const STATUS_LABELS: Record<string, string> = {
    unplanned: 'Non planifié',
    planned: 'Planifié',
    in_progress: 'En cours',
    completed: 'Complété',
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
    const normalizedQuery = query.trim().toLowerCase()
    const getDurationDays = (project: any) => Number(project?.estimated_duration_days || 1)
    const getDurationMinutes = (project: any) => Math.max(15, Math.round(getDurationDays(project) * 24 * 60))

    // Initialize draggable only ONCE on mount for supreme DOM delegation performance
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
    }, [])

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
            if (filter === 'unscheduled') return p.status === 'unplanned'
            if (filter === 'scheduled') return p.status !== 'unplanned' && p.status !== 'completed'
            if (filter === 'completed') return p.status === 'completed'
            return true // 'all'
        })
    }, [filteredProjects, filter])

    // Memoize calendar events to ensure FullCalendar receives direct reference updates
    const events = useMemo(() => {
        return filteredProjects.filter(p => p.status !== 'unplanned').map(p => {
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
            // For all-day events, the end date should be inclusive in the database.
            // Subtract 1 day from FullCalendar's exclusive end date.
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

    // FIX: call info.event.remove() to prevent duplication — FullCalendar adds the event
    // automatically on drop; since we control the `events` array, remove the duplicated internal copy.
    const handleEventReceive = (info: any) => {
        const projectId = info.event.id
        const { startDate, endDate } = buildRangeFromEvent(info.event)

        // Remove the auto-added duplicate event from FullCalendar's internal state
        info.event.remove()

        // Update local state — this drives the controlled `events` array
        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, status: 'planned', start_date: startDate, end_date: endDate
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

        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, start_date: startDate, end_date: endDate
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

    const handleUnschedule = (projectId: string) => {
        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, status: 'unplanned', start_date: null, end_date: null
        } : p))

        startTransition(async () => {
            try {
                await updateProjectStatus(projectId, 'unplanned')
                toast.success("Projet retiré du calendrier.")
            } catch (e: any) {
                toast.error("Erreur", { description: e.message })
            }
        })
    }


    const handleMarkCompleted = (projectId: string) => {
        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p, status: 'completed', completed_at: new Date().toISOString()
        } : p))

        startTransition(async () => {
            try {
                await updateProjectStatus(projectId, 'completed')
                toast.success("Projet marqué comme complété.")
            } catch (e: any) {
                toast.error("Erreur", { description: e.message })
            }
        })
    }

    const handleEventClick = (info: any) => {
        const quoteId = info.event.extendedProps.quoteId
        if (quoteId) {
            router.push(`/quotes/${quoteId}`)
        }
    }

    const handleProjectClick = (quoteId: string) => {
        if (quoteId) {
            router.push(`/quotes/${quoteId}`)
        }
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
        <div className="flex gap-6 h-full">
            {/* Sidebar */}
            <Card className="w-80 h-full border-zinc-800 bg-transparent flex flex-col shrink-0">
                <CardHeader className="border-b border-zinc-800 py-3 px-4">
                    <CardTitle className="text-zinc-100 text-base font-semibold mb-2">Projets</CardTitle>
                    {/* Filter tabs */}
                    <div className="flex gap-1 bg-zinc-900/40 rounded-md p-1 border border-zinc-800">
                        {(['unscheduled', 'scheduled', 'completed', 'all'] as StatusFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 text-xs py-1 rounded transition-colors ${filter === f
                                    ? 'bg-zinc-700 text-zinc-100 font-medium'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                {f === 'unscheduled' ? 'Non planifiés' : f === 'scheduled' ? 'Planifiés' : f === 'completed' ? 'Complétés' : 'Tous'}
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
                                const isUnplanned = project.status === 'unplanned'
                                const statusColor = isUnplanned
                                    ? 'border-zinc-700 hover:border-zinc-500'
                                    : 'border-yellow-800/60 hover:border-yellow-600'

                                return (
                                    <div
                                        key={project.id}
                                        data-id={project.id}
                                        data-title={project.title}
                                        data-duration-days={project.estimated_duration_days}
                                        className={`fc-event-external p-3 bg-transparent border rounded-md transition-colors shadow-sm ${statusColor} ${isUnplanned ? 'fc-event-external-draggable cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="font-medium text-zinc-100 text-sm leading-tight flex items-center gap-2"><span className='inline-block h-2 w-2 rounded-full' style={{ backgroundColor: TYPE_DOT[project.project_type || 'interior'] }} />{project.title}</div>
                                            {project.quotes?.quote_number && <div className='text-[11px] text-zinc-400'>Soumission #{project.quotes.quote_number}</div>}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleProjectClick(project.quote_id) }}
                                                className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 mt-0.5"
                                                title="Voir la soumission"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-xs text-zinc-400 mb-2 truncate">{project.clients?.full_name}</div>
                                        {project.contractors?.full_name && <div className='text-xs mb-2' style={{ color: project.contractors.color }}>👷 {project.contractors.full_name}</div>}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-100 pointer-events-none text-xs">
                                                    {project.estimated_duration_days} j
                                                </Badge>
                                                <Badge
                                                    variant="secondary"
                                                    className={`pointer-events-none text-xs ${project.status === 'completed' ? 'bg-emerald-900/60 text-emerald-300' : isUnplanned ? 'bg-zinc-800 text-zinc-300' : project.status === 'in_progress' ? 'bg-blue-900/60 text-blue-300' : 'bg-yellow-900/60 text-yellow-300'}`}
                                                >
                                                    {project.status === 'completed' ? 'Complété' : isUnplanned ? 'Non planifié' : project.status === 'in_progress' ? 'En cours' : 'Planifié'}
                                                </Badge>
                                            </div>
                                            {!isUnplanned && (
                                                <div className="flex items-center gap-2">
                                                    {project.status !== 'completed' && (
                                                        <button
                                                            onClick={() => handleMarkCompleted(project.id)}
                                                            className="text-zinc-500 hover:text-emerald-400 transition-colors"
                                                            title="Marquer comme complété"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleUnschedule(project.id)}
                                                        className="text-zinc-500 hover:text-red-400 transition-colors"
                                                        title="Retirer du calendrier"
                                                    >
                                                        <CalendarX className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {project.start_date && (
                                            <div className="mt-1.5 text-xs text-yellow-600 flex items-center gap-1">
                                                <CalendarClock className="h-3 w-3" />
                                                {formatProjectDate(project.start_date, Number(project.estimated_duration_days) < 1)}
                                                {project.end_date && ` → ${formatProjectDate(project.end_date, Number(project.estimated_duration_days) < 1)}`}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="flex-1 h-full border-zinc-800 bg-transparent p-4 relative overflow-hidden">
                <div className="fc-dark-theme-wrapper h-full">
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
                                    <div className="font-semibold text-white truncate flex items-center gap-1.5"><span className='inline-block h-2 w-2 rounded-full' style={{ backgroundColor: TYPE_DOT[arg.event.extendedProps.projectType || 'interior'] }} />{arg.event.title}{arg.event.extendedProps.quoteNumber ? ` · #${arg.event.extendedProps.quoteNumber}` : ''}</div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUnschedule(String(arg.event.extendedProps.projectId || arg.event.id)) }}
                                        className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-red-300 transition-opacity"
                                        title="Retirer du calendrier"
                                    >
                                        <CalendarX className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="opacity-70 mt-0.5 truncate">{arg.event.extendedProps.client}</div>
                                <div className="opacity-0 group-hover:opacity-100 text-yellow-300 transition-opacity text-[10px] mt-0.5">Cliquer pour voir ↗</div>
                            </div>
                        )}
                    />
                </div>
            </Card>

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
