'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Trash2, Check, Move, Plus, Ruler, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Point {
    x: number
    y: number
    disconnect?: boolean
    features?: any[]
    isClosed?: boolean
}

interface PlanningCanvasProps {
    points: Point[]
    onChange: (points: Point[]) => void
    roomName: string
    scale?: number // pixels per foot (default 20)
}

// Helper to group flat points array into sub-paths
function getPaths(pts: Point[]): Point[][] {
    const paths: Point[][] = []
    let currentPath: Point[] = []
    pts.forEach((p) => {
        if (p.disconnect && currentPath.length > 0) {
            paths.push(currentPath)
            currentPath = []
        }
        currentPath.push(p)
    })
    if (currentPath.length > 0) {
        paths.push(currentPath)
    }
    return paths
}

// Helper to get segments mapping to global point indices
function getSegments(pts: Point[], isClosed: boolean, scale: number = 20) {
    const segments: { p1: Point; p2: Point; p1Index: number; p2Index: number; feetLen: number }[] = []
    const paths = getPaths(pts)
    let globalIndexOffset = 0
    paths.forEach(path => {
        for (let i = 0; i < path.length; i++) {
            const isLast = i === path.length - 1
            if (isLast) {
                if (isClosed && path.length >= 3) {
                    const p1 = path[i]
                    const p2 = path[0]
                    const p1Index = globalIndexOffset + i
                    const p2Index = globalIndexOffset
                    const dx = p2.x - p1.x
                    const dy = p2.y - p1.y
                    const feetLen = Math.sqrt(dx * dx + dy * dy) / scale
                    segments.push({ p1, p2, p1Index, p2Index, feetLen })
                }
            } else {
                const p1 = path[i]
                const p2 = path[i + 1]
                const p1Index = globalIndexOffset + i
                const p2Index = globalIndexOffset + i + 1
                const dx = p2.x - p1.x
                const dy = p2.y - p1.y
                const feetLen = Math.sqrt(dx * dx + dy * dy) / scale
                segments.push({ p1, p2, p1Index, p2Index, feetLen })
            }
        }
        globalIndexOffset += path.length
    })
    return segments
}

export function PlanningCanvas({ points, onChange, roomName, scale = 20 }: PlanningCanvasProps) {
    const [mode, setMode] = useState<'draw' | 'edit'>('edit')
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })
    const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null)
    const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
    const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null)
    const [manualLengthValue, setManualLengthValue] = useState<string>('')
    
    // Snapping and features states
    const [orthoActive, setOrthoActive] = useState(false)
    const [startNewPathNextClick, setStartNewPathNextClick] = useState(false)
    const [segmentInputValues, setSegmentInputValues] = useState<Record<number, string>>({})
    
    const svgRef = useRef<SVGSVGElement>(null)

    // Reset editing segment and local inputs when points change
    useEffect(() => {
        setEditingSegmentIndex(null)
        setSegmentInputValues({})
    }, [points])

    const isClosed = points.length === 0 || points[0]?.isClosed !== false

    const toggleClosed = () => {
        if (points.length === 0) return
        const newPoints = [...points]
        const currentClosed = newPoints[0].isClosed !== false
        newPoints[0] = { ...newPoints[0], isClosed: !currentClosed }
        onChange(newPoints)
    }

    // Get mouse coordinates relative to SVG
    const getCoordinates = (e: React.MouseEvent<SVGSVGElement>): Point => {
        if (!svgRef.current) return { x: 0, y: 0 }
        const rect = svgRef.current.getBoundingClientRect()
        // Round to nearest 5 pixels for subtle visual snapping
        const rawX = e.clientX - rect.left
        const rawY = e.clientY - rect.top
        const snap = 5
        let coords = {
            x: Math.round(rawX / snap) * snap,
            y: Math.round(rawY / snap) * snap
        }

        // Apply Ortho Snapping if orthoActive OR Shift key is pressed
        const isOrtho = orthoActive || e.shiftKey
        if (isOrtho && points.length > 0) {
            // Find the last point in the current active segment
            const lastPoint = points[points.length - 1]
            const dx = coords.x - lastPoint.x
            const dy = coords.y - lastPoint.y
            if (Math.abs(dx) > Math.abs(dy)) {
                coords.y = lastPoint.y
            } else {
                coords.x = lastPoint.x
            }
        }
        return coords
    }

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const coords = getCoordinates(e)
        setMousePos(coords)

        if (mode === 'edit' && draggedPointIndex !== null) {
            const newPoints = [...points]
            let pointCoords = coords

            // Snapping dragged point orthogonally relative to neighbors when Shift is held
            if (e.shiftKey) {
                if (draggedPointIndex > 0) {
                    const prevPoint = points[draggedPointIndex - 1]
                    if (!points[draggedPointIndex].disconnect) {
                        const dx = coords.x - prevPoint.x
                        const dy = coords.y - prevPoint.y
                        if (Math.abs(dx) > Math.abs(dy)) {
                            pointCoords.y = prevPoint.y
                        } else {
                            pointCoords.x = prevPoint.x
                        }
                    }
                }
            }

            newPoints[draggedPointIndex] = {
                ...newPoints[draggedPointIndex],
                ...pointCoords
            }
            onChange(newPoints)
        }
    }

    const handleMouseDown = (e: React.MouseEvent<Element>, index: number) => {
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

        if (startNewPathNextClick) {
            // Start a new disconnected path segment
            onChange([...points, { ...coords, disconnect: true }])
            setStartNewPathNextClick(false)
            return
        }

        // Check if clicking near the first point of the current path to close it
        if (points.length >= 3) {
            let currentPathStartIndex = 0
            for (let i = points.length - 1; i >= 0; i--) {
                if (points[i].disconnect) {
                    currentPathStartIndex = i
                    break
                }
            }
            const firstPoint = points[currentPathStartIndex]
            const dist = Math.sqrt(Math.pow(coords.x - firstPoint.x, 2) + Math.pow(coords.y - firstPoint.y, 2))
            if (dist < 15) {
                // Close loop
                if (isClosed) {
                    setMode('edit')
                    return
                }
            }
        }

        onChange([...points, coords])
    }

    const deletePoint = (index: number) => {
        const newPoints = points.filter((_, idx) => idx !== index)
        if (points[index]?.disconnect && newPoints[index]) {
            newPoints[index] = { ...newPoints[index], disconnect: true }
        }
        onChange(newPoints)
        setEditingSegmentIndex(null)
    }

    const clearCanvas = () => {
        if (confirm("Voulez-vous vraiment effacer tous les points de cette pièce ?")) {
            onChange([])
            setEditingSegmentIndex(null)
        }
    }

    const updateSegmentLengthDirectly = (p1Idx: number, valFtStr: string) => {
        const newLenFt = parseFloat(valFtStr)
        if (isNaN(newLenFt) || newLenFt <= 0) return

        const segs = getSegments(points, isClosed, scale)
        const activeSeg = segs.find(s => s.p1Index === p1Idx)
        if (!activeSeg) return

        const p2Idx = activeSeg.p2Index
        const p1 = points[p1Idx]
        const p2 = points[p2Idx]

        // Vector direction
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const pixelLen = Math.sqrt(dx * dx + dy * dy)
        if (pixelLen === 0) return

        const ux = dx / pixelLen
        const uy = dy / pixelLen

        // Target length in pixels
        const targetPixelLen = newLenFt * scale

        // New coordinate for point p2
        const newP2X = p1.x + ux * targetPixelLen
        const newP2Y = p1.y + uy * targetPixelLen

        // Offset difference
        const offsetX = newP2X - p2.x
        const offsetY = newP2Y - p2.y

        // Shift subsequent points of this path
        const newPoints = points.map((p, idx) => {
            if (idx <= p1Idx) return p
            return {
                ...p,
                x: Math.round(p.x + offsetX),
                y: Math.round(p.y + offsetY)
            }
        })

        onChange(newPoints)
    }

    const handleUpdateSegmentLength = () => {
        if (editingSegmentIndex === null || !manualLengthValue) return
        updateSegmentLengthDirectly(editingSegmentIndex, manualLengthValue)
        setEditingSegmentIndex(null)
        setManualLengthValue('')
    }

    // Features operations (Doors & Windows)
    const addFeature = (p1Index: number, type: 'door' | 'window') => {
        const newPoints = [...points]
        const p1 = newPoints[p1Index]
        const features = p1.features ? [...p1.features] : []

        const segs = getSegments(points, isClosed, scale)
        const activeSeg = segs.find(s => s.p1Index === p1Index)
        if (!activeSeg) return

        const width = type === 'door' ? 3.0 : 4.0
        const offset = Math.max(0, (activeSeg.feetLen - width) / 2)

        const newFeature = {
            id: `feat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            width,
            offset
        }

        newPoints[p1Index] = {
            ...p1,
            features: [...features, newFeature]
        }
        onChange(newPoints)
    }

    const updateFeature = (p1Index: number, featureId: string, field: string, value: number) => {
        const newPoints = [...points]
        const p1 = newPoints[p1Index]
        const features = p1.features ? p1.features.map((f: any) => {
            if (f.id === featureId) {
                return { ...f, [field]: value }
            }
            return f
        }) : []

        newPoints[p1Index] = {
            ...p1,
            features
        }
        onChange(newPoints)
    }

    const deleteFeature = (p1Index: number, featureId: string) => {
        const newPoints = [...points]
        const p1 = newPoints[p1Index]
        const features = p1.features ? p1.features.filter((f: any) => f.id !== featureId) : []

        newPoints[p1Index] = {
            ...p1,
            features
        }
        onChange(newPoints)
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
                <div className="flex flex-wrap items-center gap-2">
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

                    {mode === 'draw' && points.length > 0 && (
                        <Button
                            type="button"
                            variant={startNewPathNextClick ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStartNewPathNextClick(!startNewPathNextClick)}
                            className={startNewPathNextClick ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'}
                            title="Commencer une nouvelle ligne sans connecter au point précédent (pour faire des corridors ou cloisons)"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nouvelle Ligne (Corridor)
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant={orthoActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOrthoActive(!orthoActive)}
                        className={orthoActive ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'}
                        title="Forcer les tracés horizontaux et verticaux (maintenir Shift fonctionne aussi)"
                    >
                        <Ruler className="h-4 w-4 mr-2" />
                        Ortho 90°
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleClosed}
                        className="border-zinc-800 text-zinc-400 hover:text-zinc-100"
                        disabled={points.length < 3}
                        title={isClosed ? "Passer en tracé ouvert (lignes indépendantes)" : "Passer en tracé fermé (fermer le polygone)"}
                    >
                        {isClosed ? "Type: Fermé (Polygone)" : "Type: Ouvert (Lignes)"}
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
                        Longueur du mur {getSegments(points, isClosed, scale).findIndex(s => s.p1Index === editingSegmentIndex) + 1} :
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
                    {mode === 'draw' ? 'Mode Dessin : Cliquez pour ajouter des points. Maintenez SHIFT pour des lignes droites.' : 'Mode Édition : Déplacez les points. Cliquez sur les cotes ou utilisez le tableau ci-dessous.'}
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

                    {/* Polygon Room Fills / Polylines */}
                    {getPaths(points).map((path, pIdx) => {
                        if (path.length === 0) return null
                        const pathPointsStr = path.map(p => `${p.x},${p.y}`).join(' ')
                        if (isClosed && path.length >= 3) {
                            return (
                                <polygon
                                    key={`path-fill-${pIdx}`}
                                    points={pathPointsStr}
                                    fill="rgba(6, 182, 212, 0.04)"
                                    stroke="rgba(6, 182, 212, 0.2)"
                                    strokeWidth="1.5"
                                    className="transition-colors duration-200"
                                />
                            )
                        } else {
                            return (
                                <polyline
                                    key={`path-stroke-${pIdx}`}
                                    points={pathPointsStr}
                                    fill="none"
                                    stroke="rgba(6, 182, 212, 0.2)"
                                    strokeWidth="1.5"
                                    className="transition-colors duration-200"
                                />
                            )
                        }
                    })}

                    {/* Line segments between points */}
                    {getSegments(points, isClosed, scale).map((seg, idx) => {
                        const p1 = seg.p1
                        const p2 = seg.p2
                        const p1Index = seg.p1Index
                        const p2Index = seg.p2Index
                        const feetLen = seg.feetLen
                        const features = p1.features || []

                        // If in draw mode, don't show the closing segment of the drawing path
                        const isClosingSegment = p2Index <= p1Index
                        if (mode === 'draw' && isClosingSegment) return null

                        // Calculate wall details
                        const dx = p2.x - p1.x
                        const dy = p2.y - p1.y
                        const pixelLen = Math.sqrt(dx * dx + dy * dy)

                        // Midpoint for dimension label
                        const midX = (p1.x + p2.x) / 2
                        const midY = (p1.y + p2.y) / 2

                        // Perpendicular offset for text to not collide with lines
                        const angle = Math.atan2(dy, dx)
                        const offset = 14
                        const textX = midX + Math.sin(angle) * offset
                        const textY = midY - Math.cos(angle) * offset

                        const nx = -Math.sin(angle)
                        const ny = Math.cos(angle)

                        return (
                            <g key={`seg-${p1Index}`}>
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
                                            setEditingSegmentIndex(p1Index)
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
                                    stroke={editingSegmentIndex === p1Index ? '#06b6d4' : '#52525b'}
                                    strokeWidth="2.5"
                                    pointerEvents="none"
                                />

                                {/* Render openings (Doors and Windows) */}
                                {pixelLen > 0 && features.map((feat: any) => {
                                    const offsetPx = feat.offset * scale
                                    const widthPx = feat.width * scale
                                    const cappedOffsetPx = Math.max(0, Math.min(offsetPx, pixelLen - widthPx))

                                    const fx1 = p1.x + (dx / pixelLen) * cappedOffsetPx
                                    const fy1 = p1.y + (dy / pixelLen) * cappedOffsetPx
                                    const fx2 = p1.x + (dx / pixelLen) * (cappedOffsetPx + widthPx)
                                    const fy2 = p1.y + (dy / pixelLen) * (cappedOffsetPx + widthPx)

                                    if (feat.type === 'window') {
                                        const thickness = 2.5
                                        const wPoints = [
                                            `${fx1 + nx * thickness},${fy1 + ny * thickness}`,
                                            `${fx2 + nx * thickness},${fy2 + ny * thickness}`,
                                            `${fx2 - nx * thickness},${fy2 - ny * thickness}`,
                                            `${fx1 - nx * thickness},${fy1 - ny * thickness}`
                                        ].join(' ')

                                        return (
                                            <g key={feat.id} className="select-none pointer-events-none">
                                                <polygon
                                                    points={wPoints}
                                                    fill="#e0f2fe"
                                                    stroke="#0284c7"
                                                    strokeWidth="1.5"
                                                />
                                                <line
                                                    x1={fx1}
                                                    y1={fy1}
                                                    x2={fx2}
                                                    y2={fy2}
                                                    stroke="#38bdf8"
                                                    strokeWidth="1"
                                                />
                                            </g>
                                        )
                                    } else {
                                        const doorEndX = fx1 + nx * widthPx
                                        const doorEndY = fy1 + ny * widthPx

                                        return (
                                            <g key={feat.id} className="select-none pointer-events-none">
                                                {/* Break the wall line */}
                                                <line
                                                    x1={fx1}
                                                    y1={fy1}
                                                    x2={fx2}
                                                    y2={fy2}
                                                    stroke="#09090b"
                                                    strokeWidth="4"
                                                />
                                                {/* Door leaf */}
                                                <line
                                                    x1={fx1}
                                                    y1={fy1}
                                                    x2={doorEndX}
                                                    y2={doorEndY}
                                                    stroke="#f59e0b"
                                                    strokeWidth="2"
                                                />
                                                {/* Swing arc */}
                                                <path
                                                    d={`M ${doorEndX} ${doorEndY} A ${widthPx} ${widthPx} 0 0,0 ${fx2} ${fy2}`}
                                                    fill="none"
                                                    stroke="#d97706"
                                                    strokeWidth="1"
                                                    strokeDasharray="2 2"
                                                />
                                            </g>
                                        )
                                    }
                                })}

                                {/* Wall dimension label */}
                                {pixelLen > 10 && (
                                    <g
                                        className="cursor-pointer select-none"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (mode === 'edit') {
                                                setEditingSegmentIndex(p1Index)
                                                setManualLengthValue(feetLen.toFixed(1))
                                            }
                                        }}
                                    >
                                        <rect
                                            x={textX - 28}
                                            y={textY - 8}
                                            width="56"
                                            height="16"
                                            rx="3"
                                            fill="#18181b"
                                            stroke={editingSegmentIndex === p1Index ? '#06b6d4' : '#27272a'}
                                            strokeWidth="1"
                                        />
                                        <text
                                            x={textX}
                                            y={textY + 1}
                                            fill={editingSegmentIndex === p1Index ? '#22d3ee' : '#a1a1aa'}
                                            fontSize="9"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                        >
                                            M{idx + 1}: {feetLen.toFixed(1)}'
                                        </text>
                                    </g>
                                )}
                            </g>
                        )
                    })}

                    {/* Dashed dynamic line in drawing mode */}
                    {mode === 'draw' && points.length > 0 && !startNewPathNextClick && (() => {
                        const lastPt = points[points.length - 1]
                        const dx = mousePos.x - lastPt.x
                        const dy = mousePos.y - lastPt.y
                        const pixelLen = Math.sqrt(dx * dx + dy * dy)
                        const feetLen = pixelLen / scale

                        // Midpoint for dimension label
                        const midX = (lastPt.x + mousePos.x) / 2
                        const midY = (lastPt.y + mousePos.y) / 2

                        // Perpendicular offset for text to not collide with lines
                        const angle = Math.atan2(dy, dx)
                        const offset = 14
                        const textX = midX + Math.sin(angle) * offset
                        const textY = midY - Math.cos(angle) * offset

                        return (
                            <g pointerEvents="none">
                                <line
                                    x1={lastPt.x}
                                    y1={lastPt.y}
                                    x2={mousePos.x}
                                    y2={mousePos.y}
                                    stroke="#06b6d4"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 4"
                                />
                                {pixelLen > 10 && (
                                    <g>
                                        <rect
                                            x={textX - 28}
                                            y={textY - 8}
                                            width="56"
                                            height="16"
                                            rx="3"
                                            fill="#18181b"
                                            stroke="#06b6d4"
                                            strokeWidth="1"
                                            opacity="0.85"
                                        />
                                        <text
                                            x={textX}
                                            y={textY + 1}
                                            fill="#22d3ee"
                                            fontSize="9"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                        >
                                            M{getSegments(points, isClosed, scale).length + 1}: {feetLen.toFixed(1)}'
                                        </text>
                                    </g>
                                )}
                            </g>
                        )
                    })()}

                    {/* Interactive drag points */}
                    {points.map((p, idx) => {
                        const isFirst = idx === 0
                        const isCloseTarget = mode === 'draw' && points.length >= 3 && isFirst
                        const isHovered = hoveredPointIndex === idx

                        return (
                            <g key={`pt-${idx}`}>
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? (isCloseTarget ? 10 : 8) : (isCloseTarget ? 8 : 6)}
                                    fill={isCloseTarget ? '#22c55e' : (draggedPointIndex === idx || isHovered) ? '#06b6d4' : '#1e1b4b'}
                                    stroke={isCloseTarget ? '#4ade80' : '#0891b2'}
                                    strokeWidth={isHovered ? "2.5" : "1.5"}
                                    className={`cursor-move transition-all duration-150 ${isCloseTarget ? 'animate-pulse' : ''}`}
                                    onMouseEnter={() => setHoveredPointIndex(idx)}
                                    onMouseLeave={() => setHoveredPointIndex(null)}
                                    onMouseDown={(e) => handleMouseDown(e, idx)}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (isCloseTarget) {
                                            setMode('edit')
                                        }
                                    }}
                                />
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

            {/* List of Walls and Features for Precision Edits */}
            {points.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Ruler className="h-4 w-4 text-cyan-400" />
                            Dimensions des Murs et Ouvertures
                        </h4>
                        <span className="text-[10px] text-zinc-400 hidden sm:inline">
                            Modifiez les longueurs pour ajuster le tracé avec précision
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                        {getSegments(points, isClosed, scale).map((seg, idx) => {
                            const p1 = seg.p1
                            const p1Index = seg.p1Index
                            const p2Index = seg.p2Index
                            const feetLen = seg.feetLen
                            const features = p1.features || []

                            return (
                                <div 
                                    key={`list-seg-${p1Index}`} 
                                    className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-2 hover:border-zinc-800 transition-colors"
                                >
                                    {/* Wall Header */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-300">
                                            Mur {idx + 1} <span className="text-zinc-500 font-normal">(P{p1Index+1} ➔ P{p2Index+1})</span>
                                        </span>
                                        <div className="flex gap-1.5">
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={() => addFeature(p1Index, 'door')}
                                                className="h-6 text-[10px] border-zinc-800 text-zinc-400 hover:text-zinc-100 px-2 flex items-center gap-1"
                                            >
                                                <span>🚪 + Porte</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={() => addFeature(p1Index, 'window')}
                                                className="h-6 text-[10px] border-zinc-800 text-zinc-400 hover:text-zinc-100 px-2 flex items-center gap-1"
                                            >
                                                <span>🖼️ + Fenêtre</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Length Input */}
                                    <div className="flex items-center justify-between bg-zinc-900/40 p-2 rounded border border-zinc-900">
                                        <span className="text-xs text-zinc-400">Longueur :</span>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={segmentInputValues[p1Index] ?? feetLen.toFixed(1)}
                                                onChange={(e) => setSegmentInputValues({
                                                    ...segmentInputValues,
                                                    [p1Index]: e.target.value
                                                })}
                                                onBlur={() => {
                                                    const val = segmentInputValues[p1Index]
                                                    if (val) {
                                                        updateSegmentLengthDirectly(p1Index, val)
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = segmentInputValues[p1Index]
                                                        if (val) {
                                                            updateSegmentLengthDirectly(p1Index, val)
                                                        }
                                                        (e.target as HTMLInputElement).blur()
                                                    }
                                                }}
                                                className="h-7 w-20 bg-zinc-950 border-zinc-850 text-zinc-200 text-xs text-center focus-visible:ring-zinc-700"
                                            />
                                            <span className="text-xs text-zinc-400">pi</span>
                                        </div>
                                    </div>

                                    {/* Features (Doors & Windows) List */}
                                    {features.length > 0 && (
                                        <div className="space-y-2 pt-1.5 border-t border-zinc-900">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Ouvertures :</span>
                                            {features.map((feat: any) => (
                                                <div 
                                                    key={feat.id} 
                                                    className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/20 p-2 rounded border border-zinc-900 text-xs text-zinc-300"
                                                >
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <span>{feat.type === 'door' ? '🚪 Porte' : '🖼️ Fenêtre'}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        {/* Width Input */}
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-zinc-500">Larg:</span>
                                                            <Input
                                                                type="number"
                                                                step="0.1"
                                                                value={feat.width}
                                                                onChange={(e) => updateFeature(p1Index, feat.id, 'width', parseFloat(e.target.value) || 0)}
                                                                className="h-6 w-12 bg-zinc-950 border-zinc-850 text-zinc-200 text-xxs text-center p-0"
                                                            />
                                                        </div>

                                                        {/* Offset Input */}
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-zinc-500">Pos:</span>
                                                            <Input
                                                                type="number"
                                                                step="0.1"
                                                                value={feat.offset}
                                                                onChange={(e) => updateFeature(p1Index, feat.id, 'offset', parseFloat(e.target.value) || 0)}
                                                                className="h-6 w-12 bg-zinc-950 border-zinc-850 text-zinc-200 text-xxs text-center p-0"
                                                            />
                                                        </div>

                                                        {/* Delete button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteFeature(p1Index, feat.id)}
                                                            className="text-zinc-500 hover:text-red-400 transition-colors focus:outline-none ml-1"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

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
