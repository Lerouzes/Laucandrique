'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, User, Compass, Layers, RefreshCw, CheckSquare, Square, Locate } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { triggerMissingGeocodingAction } from '@/actions/clients'
import { toast } from 'sonner'

// Dynamically import MapComponent to prevent SSR window issues
const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false })

interface Client {
    id: string
    company_name: string | null
    full_name: string
    address: string | null
    city: string | null
    postal_code: string | null
    latitude: number | null
    longitude: number | null
    manager_id: string | null
    managers?: {
        first_name: string
        last_name: string
        email: string
    } | null
}

interface MapPageViewProps {
    initialClients: Client[]
    managers: any[]
}

// Haversine distance helper
function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371 // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

export function MapPageView({ initialClients, managers }: MapPageViewProps) {
    const [clients, setClients] = useState<Client[]>(initialClients)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedManagerId, setSelectedManagerId] = useState('all')
    const [selectedCity, setSelectedCity] = useState('all')
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
    const [focusClientId, setFocusClientId] = useState<string | null>(null)
    const [proximityCenterId, setProximityCenterId] = useState<string | null>(null)
    const [proximityRadiusKm, setProximityRadiusKm] = useState<number>(2.0)
    const [onlyShowSelected, setOnlyShowSelected] = useState(false)
    const [geocodingLoading, setGeocodingLoading] = useState(false)

    // Compute cities list for dropdown
    const citiesList = useMemo(() => {
        const cities = new Set<string>()
        clients.forEach(c => {
            if (c.city) cities.add(c.city.trim())
        })
        return Array.from(cities).sort()
    }, [clients])

    // Get statistics on geocoding
    const stats = useMemo(() => {
        const total = clients.length
        const geocoded = clients.filter(c => c.latitude !== null && c.longitude !== null).length
        return { total, geocoded, missing: total - geocoded }
    }, [clients])

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        let list = clients.map(c => {
            // Calculate distance if proximity center is active
            let distance: number | null = null
            let isWithinRadius = false
            
            if (proximityCenterId && c.latitude !== null && c.longitude !== null) {
                const center = clients.find(cc => cc.id === proximityCenterId)
                if (center && center.latitude !== null && center.longitude !== null) {
                    distance = getHaversineDistanceKm(center.latitude, center.longitude, c.latitude, c.longitude)
                    isWithinRadius = distance <= proximityRadiusKm
                }
            }
            
            return {
                ...c,
                distance,
                isWithinRadius
            }
        })

        // Apply filters
        list = list.filter(c => {
            // Search text
            const textMatch = 
                c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))

            // Manager filter
            const managerMatch = selectedManagerId === 'all' || c.manager_id === selectedManagerId

            // City filter
            const cityMatch = selectedCity === 'all' || (c.city && c.city.trim() === selectedCity)

            // Selection toggle filter
            const selectionMatch = !onlyShowSelected || selectedClientIds.includes(c.id)

            // If a proximity center is active, we also filter list items to match selection logic, but center is always visible
            const proximityCenterMatch = c.id === proximityCenterId || !proximityCenterId || c.isWithinRadius

            return textMatch && managerMatch && cityMatch && selectionMatch && proximityCenterMatch
        })

        // Sort: if proximity center is active, sort by distance, otherwise by name
        if (proximityCenterId) {
            list.sort((a, b) => {
                if (a.id === proximityCenterId) return -1
                if (b.id === proximityCenterId) return 1
                if (a.distance === null) return 1
                if (b.distance === null) return -1
                return a.distance - b.distance
            })
        } else {
            list.sort((a, b) => a.full_name.localeCompare(b.full_name))
        }

        return list
    }, [clients, searchQuery, selectedManagerId, selectedCity, selectedClientIds, onlyShowSelected, proximityCenterId, proximityRadiusKm])

    const handleSelectClient = (id: string, selected: boolean) => {
        setSelectedClientIds(prev => 
            selected ? [...prev, id] : prev.filter(cid => cid !== id)
        )
    }

    const handleSelectAllVisible = () => {
        const visibleIds = filteredClients.filter(c => c.latitude !== null).map(c => c.id)
        setSelectedClientIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }

    const handleDeselectAllVisible = () => {
        const visibleIds = filteredClients.map(c => c.id)
        setSelectedClientIds(prev => prev.filter(id => !visibleIds.includes(id)))
    }

    const handleTriggerGeocoding = async () => {
        setGeocodingLoading(true)
        toast.info("Recherche et mise à jour des adresses en cours (OSM Nominatim)...")
        try {
            const res = await triggerMissingGeocodingAction()
            if (res.success) {
                toast.success(`Mise à jour terminée. ${res.count} adresses géolocalisées.`);
                // Reload clients list from DB
                window.location.reload()
            } else {
                toast.error("Erreur de géolocalisation: " + res.error)
            }
        } catch (err: any) {
            toast.error("Exception: " + err.message)
        } finally {
            setGeocodingLoading(false)
        }
    }

    const proximityCenterClient = useMemo(() => {
        return clients.find(c => c.id === proximityCenterId)
    }, [clients, proximityCenterId])

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] w-full text-zinc-100 font-sans gap-4">
            
            {/* Header controls panel */}
            <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col gap-3 shadow-xl backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-950/20 border border-purple-800/60 flex items-center justify-center">
                            <Compass className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white uppercase tracking-tight">
                                Cartographie des Syndicats
                            </h2>
                            <p className="text-[11px] text-zinc-400">
                                {stats.geocoded} / {stats.total} syndicats géolocalisés sur la carte ({stats.missing} manquants)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {stats.missing > 0 && (
                            <Button 
                                size="sm"
                                disabled={geocodingLoading}
                                onClick={handleTriggerGeocoding}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg px-3.5 h-8.5 flex items-center gap-1.5"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${geocodingLoading ? 'animate-spin' : ''}`} />
                                Mettre à jour les adresses
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter Controls Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
                        <Input
                            type="text"
                            placeholder="Rechercher par code ou nom..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 pl-9 text-xs text-white rounded-xl h-9 w-full"
                        />
                    </div>

                    <div>
                        <select
                            value={selectedManagerId}
                            onChange={(e) => setSelectedManagerId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 h-9 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="all">Tous les gestionnaires</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 h-9 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="all">Toutes les municipalités</option>
                            {citiesList.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Proximity Analysis controls inline if center active */}
                    {proximityCenterClient ? (
                        <div className="p-2 bg-pink-955 bg-pink-600/10 border border-pink-900/40 rounded-xl flex items-center justify-between gap-3 text-xxs text-pink-400 px-3.5">
                            <div className="flex-1 space-y-0.5 min-w-0">
                                <span className="font-bold truncate block">Rayon: {proximityRadiusKm} km</span>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="15"
                                    step="0.5"
                                    value={proximityRadiusKm}
                                    onChange={(e) => setProximityRadiusKm(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-800 accent-pink-500 rounded-lg cursor-pointer"
                                />
                            </div>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 text-pink-400 hover:text-white hover:bg-pink-950 rounded-md shrink-0 ml-1.5"
                                onClick={() => setProximityCenterId(null)}
                            >
                                Fermer
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center text-xs text-zinc-500 justify-center italic bg-zinc-950/20 border border-dashed border-zinc-800 rounded-xl h-9 px-3">
                            Sélectionnez un syndicat pour la recherche de proximité
                        </div>
                    )}
                </div>
            </div>

            {/* Main view container */}
            <div className="flex flex-1 gap-4 h-full min-h-0">
                
                {/* Map area */}
                <div className="flex-1 h-full min-h-0 bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <MapComponent
                        clients={clients}
                        selectedClientIds={selectedClientIds}
                        focusClientId={focusClientId}
                        proximityCenterId={proximityCenterId}
                        proximityRadiusKm={proximityRadiusKm}
                        onSelectClient={handleSelectClient}
                        onSetProximityCenter={setProximityCenterId}
                    />
                </div>

                {/* Sidebar list panel */}
                <div className="w-80 h-full bg-zinc-900/50 border border-white/10 rounded-2xl flex flex-col shadow-xl backdrop-blur-sm shrink-0">
                    <div className="p-4 border-b border-white/10 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                            <span>Liste ({filteredClients.length})</span>
                            <span className="text-[10px] text-zinc-550 normal-case font-medium">{selectedClientIds.length} sélectionné(s)</span>
                        </div>

                        {/* Quick select buttons */}
                        <div className="flex gap-2">
                            <Button 
                                size="xs" 
                                variant="outline" 
                                onClick={handleSelectAllVisible}
                                className="flex-1 bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-xxs text-zinc-400"
                            >
                                Sélectionner tout
                            </Button>
                            <Button 
                                size="xs" 
                                variant="outline" 
                                onClick={handleDeselectAllVisible}
                                className="flex-1 bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-xxs text-zinc-400"
                            >
                                Tout retirer
                            </Button>
                        </div>

                        {/* Show only selected filter */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                            <label className="text-xxs text-zinc-400 cursor-pointer flex items-center gap-1.5">
                                <input
                                    type="checkbox"
                                    checked={onlyShowSelected}
                                    onChange={(e) => setOnlyShowSelected(e.target.checked)}
                                    className="h-3.5 w-3.5 accent-purple-600 rounded bg-zinc-950 border-zinc-800"
                                />
                                Voir uniquement la sélection
                            </label>
                        </div>
                    </div>

                    {/* Scrollable list items */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {filteredClients.length === 0 ? (
                            <div className="text-center py-10 text-xs text-zinc-500 italic">
                                Aucun syndicat ne correspond.
                            </div>
                        ) : (
                            filteredClients.map(c => {
                                const isSelected = selectedClientIds.includes(c.id)
                                const isCenter = proximityCenterId === c.id
                                const hasCoords = c.latitude !== null && c.longitude !== null

                                return (
                                    <div 
                                        key={c.id} 
                                        onClick={() => {
                                            if (hasCoords) setFocusClientId(c.id)
                                        }}
                                        className={`p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/40 transition-all cursor-pointer space-y-1.5 relative ${
                                            isCenter ? 'border-pink-600 bg-pink-955 bg-pink-600/5' : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-0.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold text-xs text-white block truncate">
                                                        [{c.full_name}] {c.company_name || 'Syndicat'}
                                                    </span>
                                                    {!hasCoords && (
                                                        <span className="text-[8px] bg-amber-955 bg-amber-600/10 text-amber-500 px-1 border border-amber-900/40 rounded">
                                                            Pas de coords
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-zinc-500 truncate leading-snug">
                                                    {c.address || ''}, {c.city || ''}
                                                </p>
                                            </div>

                                            {/* Checkbox selector */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSelectClient(c.id, !isSelected)
                                                }}
                                                className="text-zinc-550 hover:text-white shrink-0 pt-0.5"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="h-4.5 w-4.5 text-purple-400" />
                                                ) : (
                                                    <Square className="h-4.5 w-4.5 text-zinc-700" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Distance highlight for proximity mode */}
                                        {proximityCenterId && c.distance !== null && (
                                            <div className="flex justify-between items-center text-[9px] pt-1.5 border-t border-zinc-900/60">
                                                <span className="text-zinc-550 font-bold uppercase tracking-wider">Distance:</span>
                                                <span className={`font-mono font-bold ${c.isWithinRadius ? 'text-pink-400' : 'text-zinc-500'}`}>
                                                    {c.distance >= 1 
                                                        ? `${c.distance.toFixed(2)} km` 
                                                        : `${(c.distance * 1000).toFixed(0)} m`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

            </div>

        </div>
    )
}
