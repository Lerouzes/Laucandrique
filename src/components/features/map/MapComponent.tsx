'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'

interface Client {
    id: string
    company_name: string | null
    full_name: string
    address: string | null
    city: string | null
    postal_code: string | null
    latitude: number | null
    longitude: number | null
    manager?: {
        first_name: string
        last_name: string
        email: string
    } | null
}

interface MapComponentProps {
    clients: Client[]
    selectedClientIds: string[]
    focusClientId: string | null
    proximityCenterId: string | null
    proximityRadiusKm: number
    onSelectClient: (id: string, selected: boolean) => void
    onSetProximityCenter: (id: string | null) => void
}

// Custom icon creator using SVG
const createCustomIcon = (isSelected: boolean, isFocused: boolean, isCenter: boolean) => {
    const color = isCenter
        ? '#ec4899' // pink-500 for proximity center
        : isFocused 
            ? '#a855f7' // purple-500 for focused
            : isSelected 
                ? '#22c55e' // green-500 for selected
                : '#3b82f6' // blue-500 for others
            
    const border = isFocused || isCenter ? '#ffffff' : '#ffffff80'
    const scale = isFocused || isCenter ? 1.3 : isSelected ? 1.15 : 1.0

    const svgHtml = `
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: scale(${scale}); filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.45));">
            <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.625C11.8934 20.625 9.375 18.1066 9.375 15C9.375 11.8934 11.8934 9.375 15 9.375C18.1066 9.375 20.625 11.8934 20.625 15C20.625 18.1066 18.1066 20.625 15 20.625Z" fill="${color}" stroke="${border}" stroke-width="1.5"/>
        </svg>
    `
    return L.divIcon({
        html: svgHtml,
        className: 'custom-leaflet-marker',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    })
}

export default function MapComponent({
    clients,
    selectedClientIds,
    focusClientId,
    proximityCenterId,
    proximityRadiusKm,
    onSelectClient,
    onSetProximityCenter
}: MapComponentProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<L.Map | null>(null)
    const markersRef = useRef<Record<string, L.Marker>>({})
    const circleRef = useRef<L.Circle | null>(null)

    // Load leaflet css on mount
    useEffect(() => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link)
            }
        }
    }, [])

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstance.current) return

        // Default coordinates centered around Montreal
        const defaultLat = 45.5017
        const defaultLng = -73.5673
        
        const map = L.map(mapContainerRef.current, {
            zoomControl: false // Position zoom control to bottom right
        }).setView([defaultLat, defaultLng], 10)
        
        mapInstance.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map)

        L.control.zoom({
            position: 'bottomright'
        }).addTo(map)

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [])

    // Update markers and circle when clients or selection states change
    useEffect(() => {
        const map = mapInstance.current
        if (!map) return

        // Clear existing markers
        Object.values(markersRef.current).forEach(marker => marker.remove())
        markersRef.current = {}

        // Clear existing circle
        if (circleRef.current) {
            circleRef.current.remove()
            circleRef.current = null
        }

        const validClients = clients.filter(c => c.latitude !== null && c.longitude !== null)

        // Fit bounds to show all markers initially if no center is active
        if (validClients.length > 0 && !proximityCenterId && !focusClientId) {
            const bounds = L.latLngBounds(validClients.map(c => [c.latitude!, c.longitude!]))
            map.fitBounds(bounds, { padding: [40, 40] })
        }

        // Draw proximity circle if active
        let centerClient: Client | undefined
        if (proximityCenterId) {
            centerClient = validClients.find(c => c.id === proximityCenterId)
            if (centerClient && centerClient.latitude !== null && centerClient.longitude !== null) {
                const circle = L.circle([centerClient.latitude, centerClient.longitude], {
                    radius: proximityRadiusKm * 1000, // in meters
                    color: '#ec4899', // pink-500
                    fillColor: '#ec4899',
                    fillOpacity: 0.1,
                    weight: 1.5,
                    dashArray: '4, 4'
                }).addTo(map)
                circleRef.current = circle
                
                // Pan map to fit the circle bounds
                map.fitBounds(circle.getBounds(), { padding: [20, 20] })
            }
        }

        // Add new markers
        validClients.forEach(c => {
            const isSelected = selectedClientIds.includes(c.id)
            const isFocused = focusClientId === c.id
            const isCenter = proximityCenterId === c.id

            const icon = createCustomIcon(isSelected, isFocused, isCenter)
            const marker = L.marker([c.latitude!, c.longitude!], { icon }).addTo(map)

            markersRef.current[c.id] = marker

            // Popup HTML
            const managerName = c.manager 
                ? `${c.manager.first_name} ${c.manager.last_name}` 
                : 'Non assigné'

            const popupContent = document.createElement('div')
            popupContent.className = 'p-2 text-zinc-800 text-xs font-sans min-w-[200px]'
            popupContent.innerHTML = `
                <div class="font-extrabold text-sm text-zinc-900 border-b border-zinc-200 pb-1 mb-1">
                    [${c.full_name}] ${c.company_name || 'Syndicat'}
                </div>
                <div class="mb-1 text-zinc-600">
                    <strong>Adresse:</strong> ${c.address || ''}, ${c.city || ''}
                </div>
                <div class="mb-2 text-zinc-600">
                    <strong>Gestionnaire:</strong> ${managerName}
                </div>
                <div class="flex gap-1.5 mt-2.5">
                    <button id="btn-select-${c.id}" class="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold hover:bg-purple-700 cursor-pointer flex-1">
                        ${isSelected ? 'Désélectionner' : 'Sélectionner'}
                    </button>
                    <button id="btn-prox-${c.id}" class="px-2 py-1 bg-pink-600 text-white rounded text-[10px] font-bold hover:bg-pink-700 cursor-pointer flex-1">
                        ${isCenter ? 'Fermer rayon' : 'Centrer Rayon'}
                    </button>
                </div>
            `

            marker.bindPopup(popupContent)

            // Setup button clicks when popup opens
            marker.on('popupopen', () => {
                const selectBtn = document.getElementById(`btn-select-${c.id}`)
                const proxBtn = document.getElementById(`btn-prox-${c.id}`)

                if (selectBtn) {
                    selectBtn.onclick = (e) => {
                        e.stopPropagation()
                        onSelectClient(c.id, !isSelected)
                        marker.closePopup()
                    }
                }

                if (proxBtn) {
                    proxBtn.onclick = (e) => {
                        e.stopPropagation()
                        onSetProximityCenter(isCenter ? null : c.id)
                        marker.closePopup()
                    }
                }
            })
        })

    }, [clients, selectedClientIds, proximityCenterId, proximityRadiusKm, focusClientId])

    // Handle focus client panning
    useEffect(() => {
        const map = mapInstance.current
        if (!map || !focusClientId) return

        const focusedMarker = markersRef.current[focusClientId]
        const client = clients.find(c => c.id === focusClientId)

        if (focusedMarker && client && client.latitude !== null && client.longitude !== null) {
            map.setView([client.latitude, client.longitude], 14, { animate: true })
            focusedMarker.openPopup()
        }
    }, [focusClientId, clients])

    return (
        <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-zinc-950">
            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 10 }} />
            
            {/* Custom styles for Leaflet popups */}
            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    background-color: #ffffff !important;
                    border-radius: 12px !important;
                    border: 1px solid rgba(0,0,0,0.1) !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                }
                .leaflet-popup-tip {
                    background-color: #ffffff !important;
                }
                .leaflet-container {
                    background: #111827 !important;
                }
            `}</style>
        </div>
    )
}
