'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProjectDates, updateProjectStatus } from '@/actions/projects'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarX, ExternalLink, CalendarClock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type StatusFilter = 'unscheduled' | 'scheduled' | 'all'

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

export function PlanningCalendar({ initialProjects, query = "" }: { initialProjects: any[], query?: string }) {
    const router = useRouter()
    const [projects, setProjects] = useState(initialProjects)
    const externalEventsRef = useRef<HTMLDivElement>(null)
    const [isPending, startTransition] = useTransition()
    const [filter, setFilter] = useState<StatusFilter>('unscheduled')
    const normalizedQuery = query.trim().toLowerCase()

    // Reinitialize draggable whenever the project list changes (filter or data)
    useEffect(() => {
        let draggableInstance: Draggable | null = null
        if (externalEventsRef.current) {
            draggableInstance = new Draggable(externalEventsRef.current, {
                itemSelector: '.fc-event-external',
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
    }, [filter, projects])

    const filteredProjects = projects.filter(p => {
        if (!normalizedQuery) return true
        const clientName = String(p.clients?.full_name || '').toLowerCase()
        const address = String(p.clients?.address || '').toLowerCase()
        const quoteNumber = String(p.quotes?.quote_number || '')
        const title = String(p.title || '').toLowerCase()
        return clientName.includes(normalizedQuery) || address.includes(normalizedQuery) || quoteNumber.includes(normalizedQuery) || title.includes(normalizedQuery)
    })

    // Sidebar project list based on filter
    const sidebarProjects = filteredProjects.filter(p => {
        if (filter === 'unscheduled') return p.status === 'unplanned'
        if (filter === 'scheduled') return p.status !== 'unplanned'
        return true // 'all'
    })

    // Calendar events: all non-unplanned projects
    const events = filteredProjects.filter(p => p.status !== 'unplanned').map(p => {
        const durationDays = Number(p.estimated_duration_days || 1)
        const durationMinutes = Math.max(15, Math.round(durationDays * 24 * 60))
        const isHourly = durationDays < 1
        const startObj = p.start_date ? new Date(p.start_date) : null
        const endObj = p.end_date ? new Date(p.end_date) : (startObj ? new Date(startObj) : null)

        if (startObj && endObj) {
            if (isHourly) {
                endObj.setTime(startObj.getTime() + durationMinutes * 60 * 1000)
            } else {
                endObj.setDate(endObj.getDate() + 1)
            }
        }

        return {
            id: p.id,
            title: p.title,
            start: startObj ? startObj.toISOString() : undefined,
            end: endObj ? endObj.toISOString() : undefined,
            allDay: !isHourly,
            backgroundColor: p.contractors?.color || (p.status === 'completed' ? '#065f46' : p.status === 'in_progress' ? '#1e3a8a' : '#78350f'),
            borderColor: 'transparent',
            extendedProps: {
                client: p.clients?.full_name,
                status: p.status,
                quoteId: p.quote_id,
                projectType: p.project_type,
                isHourly,
            }
        }
    })

    // FIX: call info.event.remove() to prevent duplication — FullCalendar adds the event
    // automatically on drop; since we control the `events` array, remove the duplicated internal copy.
    const handleEventReceive = (info: any) => {
        const projectId = info.event.id
        const startDate = info.event.start ? info.event.start.toISOString() : null
        const endDate = info.event.end ? info.event.end.toISOString() : startDate

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
        const startDate = info.event.start ? info.event.start.toISOString() : null
        const endDate = info.event.end ? info.event.end.toISOString() : startDate

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
        const startDate = info.event.start ? info.event.start.toISOString() : null
        const endDate = info.event.end ? info.event.end.toISOString() : startDate

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

    return (
        <div className="flex gap-6 h-full">
            {/* Sidebar */}
            <Card className="w-80 h-full border-zinc-800 bg-transparent flex flex-col shrink-0">
                <CardHeader className="border-b border-zinc-800 py-3 px-4">
                    <CardTitle className="text-zinc-100 text-base font-semibold mb-2">Projets</CardTitle>
                    {/* Filter tabs */}
                    <div className="flex gap-1 bg-zinc-900/40 rounded-md p-1 border border-zinc-800">
                        {(['unscheduled', 'scheduled', 'all'] as StatusFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 text-xs py-1 rounded transition-colors ${filter === f
                                    ? 'bg-zinc-700 text-zinc-100 font-medium'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                {f === 'unscheduled' ? 'Non planifiés' : f === 'scheduled' ? 'Planifiés' : 'Tous'}
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
                                        data-duration={project.estimated_duration_days}
                                        className={`fc-event-external p-3 bg-transparent border rounded-md transition-colors shadow-sm ${statusColor} ${isUnplanned ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="font-medium text-zinc-100 text-sm leading-tight flex items-center gap-2"><span className='inline-block h-2 w-2 rounded-full' style={{ backgroundColor: TYPE_DOT[project.project_type || 'interior'] }} />{project.title}</div>
                                            {project.quotes?.quote_number && <div className='text-[11px] text-zinc-400'>Soumission #{project.quotes.quote_number}</div>}
                                            <button
                                                onClick={() => handleProjectClick(project.quote_id)}
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
                                                    className={`pointer-events-none text-xs ${isUnplanned ? 'bg-zinc-800 text-zinc-300' : 'bg-yellow-900/60 text-yellow-300'}`}
                                                >
                                                    {isUnplanned ? 'Non planifié' : 'Planifié'}
                                                </Badge>
                                            </div>
                                            {!isUnplanned && (
                                                <button
                                                    onClick={() => handleUnschedule(project.id)}
                                                    className="text-zinc-500 hover:text-red-400 transition-colors"
                                                    title="Retirer du calendrier"
                                                >
                                                    <CalendarX className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {project.start_date && (
                                            <div className="mt-1.5 text-xs text-yellow-600 flex items-center gap-1">
                                                <CalendarClock className="h-3 w-3" />
                                                {new Date(project.start_date).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: Number(project.estimated_duration_days) < 1 ? 'short' : undefined })}
                                                {project.end_date && ` → ${new Date(project.end_date).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: Number(project.estimated_duration_days) < 1 ? 'short' : undefined })}`}
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
                                <div className="font-semibold text-white truncate flex items-center gap-1.5"><span className='inline-block h-2 w-2 rounded-full' style={{ backgroundColor: TYPE_DOT[arg.event.extendedProps.projectType || 'interior'] }} />{arg.event.title}</div>
                                <div className="opacity-70 mt-0.5 truncate">{arg.event.extendedProps.client}</div>
                                <div className="opacity-0 group-hover:opacity-100 text-yellow-300 transition-opacity text-[10px] mt-0.5">Cliquer pour voir ↗</div>
                            </div>
                        )}
                    />
                </div>
            </Card>

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
      `}} />
        </div>
    )
}
