'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientOption {
    id: string
    name: string
    sdc?: string
}

interface SearchableClientSelectProps {
    clients: ClientOption[]
    name: string
    placeholder?: string
    required?: boolean
    defaultValue?: string
    onChange?: (value: string) => void
}

export function SearchableClientSelect({
    clients,
    name,
    placeholder = "Rechercher un syndicat...",
    required = false,
    defaultValue,
    onChange
}: SearchableClientSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState(defaultValue || '')
    const [selectedName, setSelectedName] = useState(() => {
        if (defaultValue) {
            const found = clients.find(c => c.id === defaultValue)
            if (found) return found.sdc ? `${found.name} (${found.sdc})` : found.name
        }
        return ''
    })

    useEffect(() => {
        if (defaultValue) {
            setSelectedId(defaultValue)
            const found = clients.find(c => c.id === defaultValue)
            if (found) {
                setSelectedName(found.sdc ? `${found.name} (${found.sdc})` : found.name)
            } else {
                setSelectedName('')
            }
        } else {
            setSelectedId('')
            setSelectedName('')
        }
    }, [defaultValue, clients])
    
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [])

    const cleanStr = (str: string) => {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "")
    }

    const cleanSearch = cleanStr(search)

    const filteredClients = clients.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(search.toLowerCase()) || cleanStr(c.name).includes(cleanSearch)
        const sdcMatch = c.sdc ? (c.sdc.toLowerCase().includes(search.toLowerCase()) || cleanStr(c.sdc).includes(cleanSearch)) : false
        return nameMatch || sdcMatch
    })

    const handleSelect = (id: string, name: string) => {
        setSelectedId(id)
        setSelectedName(name)
        setSearch('')
        setIsOpen(false)
        if (onChange) onChange(id)
    }

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Hidden Input for Form Submission */}
            <input type="hidden" name={name} value={selectedId} required={required} />
            
            {/* Main Selection Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-2.5 flex items-center justify-between text-white outline-none focus:border-purple-600 h-8 text-xs text-left"
            >
                <span className={cn(selectedName ? "text-white" : "text-zinc-550 truncate pr-2")}>
                    {selectedName || placeholder}
                </span>
                <ChevronsUpDown className="h-3 w-3 text-zinc-500 shrink-0" />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-800 bg-[#121318] shadow-2xl p-1.5 space-y-1.5 animate-in fade-in duration-100">
                    <div className="flex items-center gap-1.5 px-2 bg-zinc-950/40 border border-zinc-850 rounded-md h-7">
                        <Search className="h-3 w-3 text-zinc-500 shrink-0" />
                        <input
                            type="text"
                            placeholder="Taper pour filtrer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-[16px] md:text-xxs text-white w-full placeholder:text-zinc-600 h-full focus:ring-0 focus:outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900/50 pr-0.5">
                        {filteredClients.length === 0 ? (
                            <div className="text-zinc-650 text-center py-3 text-xxs italic">
                                Aucun syndicat trouvé
                            </div>
                        ) : (
                            filteredClients.map((client) => {
                                const isSelected = selectedId === client.id
                                const displayName = client.sdc ? `${client.name} (${client.sdc})` : client.name
                                return (
                                    <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => handleSelect(client.id, displayName)}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 rounded-md hover:bg-purple-950/20 hover:text-purple-400 text-xxs flex items-center justify-between text-zinc-300 transition-colors",
                                            isSelected && "bg-purple-950/30 text-purple-400 font-bold"
                                        )}
                                    >
                                        <span className="truncate pr-1">
                                            {client.name}
                                            {client.sdc && <span className="text-zinc-500 font-mono text-[9px] ml-1.5">[{client.sdc}]</span>}
                                        </span>
                                        {isSelected && <Check className="h-3 w-3 text-purple-400 shrink-0" />}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
