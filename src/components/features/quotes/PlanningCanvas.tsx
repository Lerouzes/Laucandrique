'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Trash2, Check, Move, Plus, Ruler, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Point {
    x: number
    y: number
}

interface PlanningCanvasProps {
    points: Point[]
    onChange: (points: Point[]) => void
    roomName: string
    scale?: number // pixels per foot (default 20)
}

export function PlanningCanvas({ points, onChange, roomName, scale = 20 }: PlanningCanvasProps) {
    const [mode, setMode] = useState<'draw' | 'edit'>('edit')
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })
    const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null)
    const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null)
    const [manualLengthValue, setManualLengthValue] = useState<string>('')
    
    const svgRef = useRef<SVGSVGElement>(null)

    // Reset editing segment when points change
    useEffect(() => {
        setEditingSegmentIndex(null)
    }, [points])

    // Get mouse coordinates relative to SVG
    const getCoordinates = (e: React.MouseEvent<SVGSVGElement>): Point => {
        if (!svgRef.current) return { x: 0, y: 0 }
        const rect = svgRef.current.getBoundingClientRect()
        // Round to nearest 5 pixels for subtle visual snapping
        const rawX = e.clientX - rect.left
        const rawY = e.clientY - rect.top
        const snap = 5
        return {
            x: Math.round(rawX / snap) * snap,
            y: Math.round(rawY / snap) * snap
        }
    }

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const coords = getCoordinates(e)
        setMousePos(coords)

        if (mode === 'edit' && draggedPointIndex !== null) {
            const newPoints = [...points]
            newPoints[draggedPointIndex] = coords
            onChange(newPoints)
        }
    }

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>, index: number) => {
        e.stopPropagation()
        if (mode === 'edit') {
            setDraggedPointIndex(index)
        }
    }

    const handleMouseUp = () => {
        setDraggedPointIndex(null)
    }

    const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (mode !== 'draw') return

        const coords = getCoordinates(e)

        // Check if clicking near the first point to close the shape
        if (points.length >= 3) {
            const firstPoint = points[0]
            const dist = Math.sqrt(Math.pow(coords.x - firstPoint.x, 2) + Math.pow(coords.y - firstPoint.y, 2))
            if (dist < 15) {
                // Close loop: set mode back to edit
                setMode('edit')
                return
            }
        }

        onChange([...points, coords])
    }

    const deletePoint = (index: number) => {
        const newPoints = points.filter((_, idx) => idx !== index)
        onChange(newPoints)
        setEditingSegmentIndex(null)
    }

    const clearCanvas = () => {
        if (confirm("Voulez-vous vraiment effacer tous les points de cette pièce ?")) {
            onChange([])
            setEditingSegmentIndex(null)
        }
    }

    // Helper: update a wall segment's length manually
    const handleUpdateSegmentLength = () => {
        if (editingSegmentIndex === null || !manualLengthValue) return
        const newLenFt = parseFloat(manualLengthValue)
        if (isNaN(newLenFt) || newLenFt <= 0) return

        const n = points.length
        const i = editingSegmentIndex
        const j = (i + 1) % n

        const p1 = points[i]
        const p2 = points[j]

        // Vector direction
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const pixelLen = Math.sqrt(dx * dx + dy * dy)
        if (pixelLen === 0) return

        const ux = dx / pixelLen
        const uy = dy / pixelLen

        // Target length in pixels
        const targetPixelLen = newLenFt * scale

        // New coordinate for point j
        const newP2X = p1.x + ux * targetPixelLen
        const newP2Y = p1.y + uy * targetPixelLen

        // Offset difference
        const offsetX = newP2X - p2.x
        const offsetY = newP2Y - p2.y

        // Shift subsequent points to preserve shape
        const newPoints = points.map((p, idx) => {
            if (idx <= i) return p // keep points before and including p1 unchanged
            // Shift points after p1 (starting at p2) by the offset
            return {
                x: Math.round(p.x + offsetX),
                y: Math.round(p.y + offsetY)
            }
        })

        onChange(newPoints)
        setEditingSegmentIndex(null)
        setManualLengthValue('')
    }

    // Centroid of room points for room label placement
    const getCentroid = () => {
        if (points.length === 0) return { x: 200, y: 150 }
        let sumX = 0
        let sumY = 0
        points.forEach(p => {
            sumX += p.x
            sumY += p.y
        })
        return {
            x: sumX / points.length,
            y: sumY / points.length
        }
    }

    const centroid = getCentroid()

    return (
        <div className="space-y-4">
            {/* Header controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant={mode === 'edit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setMode('edit')
                            setEditingSegmentIndex(null)
                        }}
                        className={mode === 'edit' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'}
                    >
                        <Move className="h-4 w-4 mr-2" />
                        Éditer / Déplacer
                    </Button>
                    <Button
                        type="button"
                        variant={mode === 'draw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setMode('draw')
                            setEditingSegmentIndex(null)
                        }}
                        className={mode === 'draw' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Dessiner
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {points.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearCanvas}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Effacer
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick manual dimension editor */}
            {editingSegmentIndex !== null && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <Ruler className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-zinc-300">
                        Longueur du mur {editingSegmentIndex + 1} :
                    </span>
                    <div className="flex items-center gap-2 max-w-[200px]">
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 12.5"
                            value={manualLengthValue}
                            onChange={(e) => setManualLengthValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateSegmentLength()
                            }}
                            className="h-8 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700"
                        />
                        <span className="text-sm text-zinc-400">pi</span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleUpdateSegmentLength}
                        className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                        Appliquer
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSegmentIndex(null)}
                        className="h-8 text-zinc-400 hover:text-zinc-100"
                    >
                        Annuler
                    </Button>
                </div>
            )}

            {/* SVG Interactive Canvas */}
            <div className="relative border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden shadow-inner select-none h-[400px]">
                {/* Visual Guides */}
                <div className="absolute top-3 left-3 pointer-events-none bg-zinc-900/80 border border-zinc-800 px-2 py-1 rounded text-[11px] text-zinc-400 font-mono">
                    {mode === 'draw' ? 'Mode Dessin : Cliquez pour ajouter des points. Cliquez sur le premier point pour fermer.' : 'Mode Édition : Glissez les points pour ajuster. Cliquez sur les cotes pour éditer.'}
                </div>

                <svg
                    ref={svgRef}
                    className="w-full h-full cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={handleCanvasClick}
                >
                    {/* Grid Lines */}
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#27272a" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Polygon Room Fill (if closed shape) */}
                    {points.length >= 3 && (
                        <polygon
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(6, 182, 212, 0.08)"
                            stroke="rgba(6, 182, 212, 0.4)"
                            strokeWidth="2.5"
                            className="transition-colors duration-200"
                        />
                    )}

                    {/* Line segments between points */}
                    {points.map((p1, idx) => {
                        const isLast = idx === points.length - 1
                        if (isLast && mode === 'draw') return null // don't draw last connecting segment in draw mode yet

                        const p2 = points[(idx + 1) % points.length]
                        
                        // Calculate wall length
                        const dx = p2.x - p1.x
                        const dy = p2.y - p1.y
                        const pixelLen = Math.sqrt(dx * dx + dy * dy)
                        const feetLen = pixelLen / scale

                        // Midpoint for dimension label
                        const midX = (p1.x + p2.x) / 2
                        const midY = (p1.y + p2.y) / 2

                        // Perpendicular offset for text to not collide with lines
                        const angle = Math.atan2(dy, dx)
                        const offset = 14
                        const textX = midX + Math.sin(angle) * offset
                        const textY = midY - Math.cos(angle) * offset

                        return (
                            <g key={`seg-${idx}`}>
                                {/* Clickable segment overlay for editing */}
                                <line
                                    x1={p1.x}
                                    y1={p1.y}
                                    x2={p2.x}
                                    y2={p2.y}
                                    stroke="transparent"
                                    strokeWidth="10"
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (mode === 'edit') {
                                            setEditingSegmentIndex(idx)
                                            setManualLengthValue(feetLen.toFixed(1))
                                        }
                                    }}
                                />
                                {/* Visible wall line */}
                                <line
                                    x1={p1.x}
                                    y1={p1.y}
                                    x2={p2.x}
                                    y2={p2.y}
                                    stroke={editingSegmentIndex === idx ? '#06b6d4' : '#52525b'}
                                    strokeWidth="2"
                                    pointerEvents="none"
                                />
                                {/* Wall dimension label */}
                                {pixelLen > 10 && (
                                    <g
                                        className="cursor-pointer select-none"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (mode === 'edit') {
                                                setEditingSegmentIndex(idx)
                                                setManualLengthValue(feetLen.toFixed(1))
                                            }
                                        }}
                                    >
                                        <rect
                                            x={textX - 22}
                                            y={textY - 8}
                                            width="44"
                                            height="16"
                                            rx="3"
                                            fill="#18181b"
                                            stroke={editingSegmentIndex === idx ? '#06b6d4' : '#27272a'}
                                            strokeWidth="1"
                                        />
                                        <text
                                            x={textX}
                                            y={textY + 1}
                                            fill={editingSegmentIndex === idx ? '#22d3ee' : '#a1a1aa'}
                                            fontSize="9"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                        >
                                            {feetLen.toFixed(1)}'
                                        </text>
                                    </g>
                                )}
                            </g>
                        )
                    })}

                    {/* Dashed dynamic line in drawing mode */}
                    {mode === 'draw' && points.length > 0 && (
                        <line
                            x1={points[points.length - 1].x}
                            y1={points[points.length - 1].y}
                            x2={mousePos.x}
                            y2={mousePos.y}
                            stroke="#06b6d4"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                            pointerEvents="none"
                        />
                    )}

                    {/* Interactive drag points */}
                    {points.map((p, idx) => {
                        const isFirst = idx === 0
                        const isCloseTarget = mode === 'draw' && points.length >= 3 && isFirst

                        return (
                            <g key={`pt-${idx}`}>
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isCloseTarget ? 8 : 6}
                                    fill={isCloseTarget ? '#22c55e' : draggedPointIndex === idx ? '#06b6d4' : '#1e1b4b'}
                                    stroke={isCloseTarget ? '#4ade80' : '#0891b2'}
                                    strokeWidth="1.5"
                                    className={`cursor-move transition-transform hover:scale-125 ${isCloseTarget ? 'animate-pulse' : ''}`}
                                    onMouseDown={(e) => handleMouseDown(e, idx)}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        // Delete points on click if in edit mode and click is secondary
                                    }}
                                />
                                {/* Small label or point index */}
                                <text
                                    x={p.x}
                                    y={p.y - 10}
                                    fill="#71717a"
                                    fontSize="8"
                                    textAnchor="middle"
                                    pointerEvents="none"
                                >
                                    P{idx + 1}
                                </text>
                            </g>
                        )
                    })}

                    {/* Central Room Label */}
                    {points.length >= 3 && (
                        <g pointerEvents="none">
                            <rect
                                x={centroid.x - 50}
                                y={centroid.y - 12}
                                width="100"
                                height="22"
                                rx="4"
                                fill="rgba(24, 24, 27, 0.85)"
                                stroke="rgba(63, 63, 70, 0.4)"
                                strokeWidth="1"
                            />
                            <text
                                x={centroid.x}
                                y={centroid.y + 1}
                                fill="#f4f4f5"
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                            >
                                {roomName || 'Pièce'}
                            </text>
                        </g>
                    )}
                </svg>

                {/* Empty State Instructions */}
                {points.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none bg-zinc-950/90">
                        <Ruler className="h-10 w-10 text-zinc-600 mb-3" />
                        <h4 className="text-zinc-300 font-medium mb-1">Aucun tracé pour cette pièce</h4>
                        <p className="text-xs text-zinc-500 max-w-[280px]">
                            Basculez en mode <strong className="text-cyan-400 font-semibold">Dessiner</strong> ci-dessus puis cliquez sur le canevas pour dessiner les angles du mur.
                        </p>
                    </div>
                )}
            </div>

            {/* Points List and deletion in edit mode */}
            {mode === 'edit' && points.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60">
                    <span className="text-[11px] font-medium text-zinc-400 px-2">Angles ({points.length}) :</span>
                    {points.map((p, idx) => (
                        <div key={`badge-${idx}`} className="inline-flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-800">
                            <span>P{idx+1} ({Math.round(p.x/scale)}', {Math.round(p.y/scale)}')</span>
                            <button
                                type="button"
                                onClick={() => deletePoint(idx)}
                                className="text-zinc-500 hover:text-red-400 focus:outline-none ml-1 transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
