'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManagerOption {
    id: string
    first_name: string
    last_name: string
    team_name?: string
}

interface SearchableManagerSelectProps {
    managers: ManagerOption[]
    name: string
    placeholder?: string
    required?: boolean
    defaultValue?: string
    onChange?: (value: string) => void
    className?: string
}

export function SearchableManagerSelect({
    managers,
    name,
    placeholder = "Rechercher un gestionnaire...",
    required = false,
    defaultValue = '',
    onChange,
    className
}: SearchableManagerSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedId, setSelectedId] = useState(defaultValue || '')
    const [inputValue, setInputValue] = useState(() => {
        if (defaultValue) {
            const found = managers.find(m => m.id === defaultValue)
            if (found) return `${found.first_name} ${found.last_name}`
        }
        return ''
    })

    const [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue)
    if (defaultValue !== prevDefaultValue) {
        setPrevDefaultValue(defaultValue)
        setSelectedId(defaultValue || '')
        const found = managers.find(m => m.id === defaultValue)
        setInputValue(found ? `${found.first_name} ${found.last_name}` : '')
    }

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                // Reset input value to the selected manager name if it was cleared/changed without selecting
                const found = managers.find(m => m.id === selectedId)
                setInputValue(found ? `${found.first_name} ${found.last_name}` : '')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [selectedId, managers])

    const cleanStr = (str: string) => {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "")
    }

    const filteredManagers = managers.filter(m => {
        const query = inputValue
        if (!query) return true // Show all if input is empty
        const fullName = `${m.first_name} ${m.last_name}`
        const cleanQuery = cleanStr(query)
        return fullName.toLowerCase().includes(query.toLowerCase()) || cleanStr(fullName).includes(cleanQuery)
    })

    const handleSelect = (id: string, name: string) => {
        setSelectedId(id)
        setInputValue(name)
        setIsOpen(false)
        if (onChange) onChange(id)
    }

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {/* Hidden Input for Form Submission */}
            <input type="hidden" name={name} value={selectedId} required={required} />
            
            {/* Single-line Input field */}
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => {
                        setIsOpen(true)
                        inputRef.current?.select()
                    }}
                    className="w-full bg-[#121318] border border-zinc-800 rounded-lg pl-3 pr-8 flex items-center justify-between text-white outline-none focus:border-purple-600 h-9 text-xs"
                />
                <ChevronsUpDown className="absolute right-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-[100] mt-1 w-full rounded-lg border border-zinc-800 bg-[#121318] shadow-2xl p-1 animate-in fade-in duration-100 max-h-56 overflow-y-auto divide-y divide-zinc-900/50">
                    {filteredManagers.length === 0 ? (
                        <div className="text-zinc-650 text-center py-3 text-xxs italic">
                            Aucun gestionnaire trouvé
                        </div>
                    ) : (
                        filteredManagers.map((m) => {
                            const isSelected = selectedId === m.id
                            const displayName = `${m.first_name} ${m.last_name}`
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelect(m.id, displayName)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-md hover:bg-purple-950/20 hover:text-purple-400 text-xxs flex items-center justify-between text-zinc-300 transition-colors",
                                        isSelected && "bg-purple-950/30 text-purple-400 font-bold"
                                    )}
                                >
                                    <span className="truncate pr-1">
                                        {displayName}
                                        {m.team_name && (
                                            <span className="text-zinc-500 font-mono text-[9px] ml-1.5">[{m.team_name}]</span>
                                        )}
                                    </span>
                                    {isSelected && <Check className="h-3 w-3 text-purple-400 shrink-0" />}
                                </button>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
