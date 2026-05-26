'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Layers, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlanningCanvas } from './PlanningCanvas'

export interface Point {
    x: number
    y: number
    disconnect?: boolean
    features?: any[]
    isClosed?: boolean
}

export interface Room {
    id: string
    name: string
    description?: string | null
    height: number | null
    points: Point[]
}

export interface Section {
    id: string
    name: string
    description?: string | null
    rooms: Room[]
}

interface PlanningPanelProps {
    sections: Section[]
    onChange: (sections: Section[]) => void
}

// Math Utility Functions
export function getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function calculatePerimeter(points: Point[], scale: number = 20): number {
    if (!points || points.length < 2) return 0
    const isClosed = points[0]?.isClosed !== false

    const paths: Point[][] = []
    let currentPath: Point[] = []
    points.forEach((p) => {
        if (p.disconnect && currentPath.length > 0) {
            paths.push(currentPath)
            currentPath = []
        }
        currentPath.push(p)
    })
    if (currentPath.length > 0) {
        paths.push(currentPath)
    }

    let totalDist = 0
    paths.forEach(path => {
        for (let i = 0; i < path.length; i++) {
            const isLast = i === path.length - 1
            if (isLast) {
                if (isClosed && path.length >= 3) {
                    totalDist += getDistance(path[i], path[0])
                }
            } else {
                totalDist += getDistance(path[i], path[i + 1])
            }
        }
    })
    return totalDist / scale
}

export function calculateFloorArea(points: Point[], scale: number = 20): number {
    if (!points || points.length < 3) return 0
    const isClosed = points[0]?.isClosed !== false
    if (!isClosed) return 0

    const paths: Point[][] = []
    let currentPath: Point[] = []
    points.forEach((p) => {
        if (p.disconnect && currentPath.length > 0) {
            paths.push(currentPath)
            currentPath = []
        }
        currentPath.push(p)
    })
    if (currentPath.length > 0) {
        paths.push(currentPath)
    }

    let totalArea = 0
    paths.forEach(path => {
        if (path.length < 3) return
        let area = 0
        const n = path.length
        for (let i = 0; i < n; i++) {
            const p1 = path[i]
            const p2 = path[(i + 1) % n]
            area += (p1.x * p2.y) - (p2.x * p1.y)
        }
        totalArea += Math.abs(area) / 2
    })
    return totalArea / (scale * scale)
}

export function calculateWallSurface(points: Point[], height: number | null, scale: number = 20): number {
    const h = height || 8.0 // default ceiling height in feet
    const perimeter = calculatePerimeter(points, scale)
    let grossSurface = perimeter * h

    // Subtract opening areas (doors and windows)
    // Features are stored on the start point (p1) of each segment
    points.forEach(p => {
        if (!p.features || p.features.length === 0) return
        p.features.forEach((feat: any) => {
            const featWidth: number = feat.width || 0
            const featHeight: number = feat.height || (feat.type === 'door' ? 7.0 : 4.0)
            // For doors: remove from floor up to door height (strip above door remains wall if door is shorter than ceiling)
            // For windows: remove the window rectangle (strips above & below remain wall)
            const openingArea = featWidth * Math.min(featHeight, h)
            grossSurface -= openingArea
        })
    })

    return Math.max(0, grossSurface)
}

export function PlanningPanel({ sections, onChange }: PlanningPanelProps) {
    const [unit, setUnit] = useState<'ft' | 'm'>('ft')
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
        sections.length > 0 ? sections[0].id : null
    )
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
        sections.length > 0 && sections[0].rooms.length > 0 ? sections[0].rooms[0].id : null
    )

    const toDisplayVal = (feetVal: number | null) => {
        if (feetVal === null) return 0
        return unit === 'm' ? feetVal * 0.3048 : feetVal
    }
    const fromDisplayVal = (displayVal: number) => {
        return unit === 'm' ? displayVal / 0.3048 : displayVal
    }
    const unitLabel = unit === 'm' ? 'm' : 'pi'
    const areaLabel = unit === 'm' ? 'm²' : 'pi²'

    const [newSectionName, setNewSectionName] = useState('')
    const [newRoomName, setNewRoomName] = useState('')

    // Find currently active section and room
    const activeSection = sections.find(s => s.id === selectedSectionId) || null
    const activeRoom = activeSection?.rooms.find(r => r.id === selectedRoomId) || null

    const handleAddSection = () => {
        if (!newSectionName.trim()) return
        const newSec: Section = {
            id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: newSectionName.trim(),
            description: '',
            rooms: []
        }
        const updated = [...sections, newSec]
        onChange(updated)
        setSelectedSectionId(newSec.id)
        setSelectedRoomId(null)
        setNewSectionName('')
    }

    const handleDeleteSection = (secId: string) => {
        if (confirm("Voulez-vous vraiment supprimer cette section et toutes ses pièces ?")) {
            const updated = sections.filter(s => s.id !== secId)
            onChange(updated)
            if (selectedSectionId === secId) {
                const nextSec = updated[0] || null
                setSelectedSectionId(nextSec ? nextSec.id : null)
                setSelectedRoomId(nextSec && nextSec.rooms.length > 0 ? nextSec.rooms[0].id : null)
            }
        }
    }

    const handleAddRoom = () => {
        if (!selectedSectionId || !newRoomName.trim()) return
        const newRm: Room = {
            id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: newRoomName.trim(),
            description: '',
            height: 8.0, // default 8 ft
            points: []
        }
        const updated = sections.map(sec => {
            if (sec.id === selectedSectionId) {
                return {
                    ...sec,
                    rooms: [...sec.rooms, newRm]
                }
            }
            return sec
        })
        onChange(updated)
        setSelectedRoomId(newRm.id)
        setNewRoomName('')
    }

    const handleDeleteRoom = (secId: string, rmId: string) => {
        if (confirm("Voulez-vous vraiment supprimer cette pièce ?")) {
            const updated = sections.map(sec => {
                if (sec.id === secId) {
                    return {
                        ...sec,
                        rooms: sec.rooms.filter(r => r.id !== rmId)
                    }
                }
                return sec
            })
            onChange(updated)
            if (selectedRoomId === rmId) {
                const currentSec = updated.find(s => s.id === secId)
                const nextRm = currentSec?.rooms[0] || null
                setSelectedRoomId(nextRm ? nextRm.id : null)
            }
        }
    }

    const handleUpdateRoomMeta = (field: keyof Omit<Room, 'id' | 'points'>, value: any) => {
        if (!selectedSectionId || !selectedRoomId) return
        const updated = sections.map(sec => {
            if (sec.id === selectedSectionId) {
                return {
                    ...sec,
                    rooms: sec.rooms.map(rm => {
                        if (rm.id === selectedRoomId) {
                            return {
                                ...rm,
                                [field]: value
                            }
                        }
                        return rm
                    })
                }
            }
            return sec
        })
        onChange(updated)
    }

    const handleUpdateRoomPoints = (newPoints: Point[]) => {
        if (!selectedSectionId || !selectedRoomId) return
        const updated = sections.map(sec => {
            if (sec.id === selectedSectionId) {
                return {
                    ...sec,
                    rooms: sec.rooms.map(rm => {
                        if (rm.id === selectedRoomId) {
                            return {
                                ...rm,
                                points: newPoints
                            }
                        }
                        return rm
                    })
                }
            }
            return sec
        })
        onChange(updated)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar List (Sections and Rooms) */}
            <div className="lg:col-span-4 space-y-6">
                {/* Sections Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-cyan-400" />
                            <h3 className="font-bold text-zinc-100 text-sm">Sections du projet</h3>
                        </div>
                    </div>

                    {/* Add Section Input */}
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Nouvelle section (ex: RDC)"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSection()
                            }}
                            className="h-9 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700 text-xs"
                        />
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddSection}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 h-9"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Sections and Rooms Navigation List */}
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {sections.length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-4">Aucune section. Ajoutez-en une pour commencer.</p>
                        ) : (
                            sections.map(sec => {
                                const isSecSelected = sec.id === selectedSectionId
                                return (
                                    <div key={sec.id} className={`rounded-lg p-2 border ${isSecSelected ? 'bg-zinc-900/50 border-cyan-800/40' : 'border-zinc-850 bg-zinc-950/20'}`}>
                                        <div className="flex items-center justify-between group">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSectionId(sec.id)
                                                    setSelectedRoomId(sec.rooms[0]?.id || null)
                                                }}
                                                className={`text-xs font-bold text-left flex-1 py-1 transition-colors ${isSecSelected ? 'text-cyan-400' : 'text-zinc-300 hover:text-zinc-100'}`}
                                            >
                                                {sec.name} ({sec.rooms.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSection(sec.id)}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1 transition-all"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Rooms in Section */}
                                        {isSecSelected && (
                                            <div className="mt-2 pl-3 border-l-2 border-zinc-800 space-y-1.5 animate-in slide-in-from-left-1 duration-150">
                                                {sec.rooms.map(rm => {
                                                    const isRmSelected = rm.id === selectedRoomId
                                                    return (
                                                        <div key={rm.id} className="flex items-center justify-between group/rm">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedRoomId(rm.id)}
                                                                className={`text-[11px] text-left flex-1 py-0.5 transition-colors ${isRmSelected ? 'text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
                                                            >
                                                                <Home className="h-3 w-3 inline mr-1.5 opacity-60" />
                                                                {rm.name}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRoom(sec.id, rm.id)}
                                                                className="opacity-0 group-hover/rm:opacity-100 text-zinc-600 hover:text-red-400 p-0.5 transition-all"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )
                                                })}

                                                {/* Add Room in Active Section */}
                                                <div className="flex items-center gap-1.5 pt-1.5">
                                                    <Input
                                                        placeholder="Ajouter une pièce..."
                                                        value={newRoomName}
                                                        onChange={(e) => setNewRoomName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddRoom()
                                                        }}
                                                        className="h-7 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700 text-[10px] py-1"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleAddRoom}
                                                        className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 px-2"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Main Area: selected room drawing and settings */}
            <div className="lg:col-span-8">
                {activeRoom ? (
                    <div className="space-y-6">
                        {/* Room Configuration & Measurements Card */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-4">
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                        <Home className="h-5 w-5 text-cyan-400" />
                                        Configuration de : {activeRoom.name}
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Dessinez le tracé dans le canevas et configurez la hauteur des murs.
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0 select-none">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={unit === 'ft' ? 'default' : 'ghost'}
                                        onClick={() => setUnit('ft')}
                                        className={`h-7 px-2.5 text-[10px] font-bold ${unit === 'ft' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        Pieds (pi)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={unit === 'm' ? 'default' : 'ghost'}
                                        onClick={() => setUnit('m')}
                                        className={`h-7 px-2.5 text-[10px] font-bold ${unit === 'm' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        Mètres (m)
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Name Input */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nom de la pièce</label>
                                    <Input
                                        value={activeRoom.name}
                                        onChange={(e) => handleUpdateRoomMeta('name', e.target.value)}
                                        className="h-9 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700 text-xs"
                                    />
                                </div>

                                {/* Height Input */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Hauteur sous plafond</label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={activeRoom.height === null ? '' : toDisplayVal(activeRoom.height).toFixed(1)}
                                            onChange={(e) => handleUpdateRoomMeta('height', e.target.value ? fromDisplayVal(parseFloat(e.target.value)) : null)}
                                            placeholder={unit === 'm' ? "2.4" : "8.0"}
                                            className="h-9 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700 text-xs"
                                        />
                                        <span className="text-xs text-zinc-400">{unitLabel}</span>
                                    </div>
                                </div>

                                {/* Description Input */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Description (optionnelle)</label>
                                    <Input
                                        value={activeRoom.description || ''}
                                        onChange={(e) => handleUpdateRoomMeta('description', e.target.value)}
                                        placeholder="Ex: Rez-de-chaussée"
                                        className="h-9 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Real-time Calculations Box */}
                            <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg grid grid-cols-3 gap-4 text-center">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Périmètre</span>
                                    <p className="text-base font-bold text-cyan-400">
                                        {(calculatePerimeter(activeRoom.points) * (unit === 'm' ? 0.3048 : 1)).toFixed(1)} <span className="text-xs font-normal text-zinc-400">{unitLabel}</span>
                                    </p>
                                </div>
                                <div className="space-y-1 border-x border-zinc-800">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Aire au sol</span>
                                    <p className="text-base font-bold text-cyan-400">
                                        {(calculateFloorArea(activeRoom.points) * (unit === 'm' ? 0.092903 : 1)).toFixed(1)} <span className="text-xs font-normal text-zinc-400">{areaLabel}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Surface murs</span>
                                    <p className="text-base font-bold text-cyan-400">
                                        {(calculateWallSurface(activeRoom.points, activeRoom.height) * (unit === 'm' ? 0.092903 : 1)).toFixed(1)} <span className="text-xs font-normal text-zinc-400">{areaLabel}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Canvas */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <PlanningCanvas
                                points={activeRoom.points}
                                onChange={handleUpdateRoomPoints}
                                roomName={activeRoom.name}
                                scale={20}
                                unit={unit}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center h-[500px]">
                        <Home className="h-12 w-12 text-zinc-650 mb-3" />
                        <h3 className="text-zinc-300 font-bold mb-1">Sélectionnez ou créez une pièce</h3>
                        <p className="text-xs text-zinc-500 max-w-[320px]">
                            Pour commencer à mapper votre espace, sélectionnez une pièce dans la barre latérale ou créez-en une nouvelle sous l'une des sections.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
