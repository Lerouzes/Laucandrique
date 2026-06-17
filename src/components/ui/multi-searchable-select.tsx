// src/components/ui/multi-searchable-select.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Option {
  value: string
  label: string
}

interface MultiSearchableSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSearchableSelect({
  value = [],
  onChange,
  options,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  className,
  disabled = false
}: MultiSearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  const handleToggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((val) => val !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  const handleSelectAll = () => {
    // Select all options that match the current search filter
    const visibleValues = filteredOptions.map(o => o.value)
    const newSelection = Array.from(new Set([...value, ...visibleValues]))
    onChange(newSelection)
  }

  const handleDeselectAll = () => {
    if (search === "") {
      onChange([])
    } else {
      const visibleValues = filteredOptions.map(o => o.value)
      onChange(value.filter(v => !visibleValues.includes(v)))
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  // Generate trigger text summary
  const triggerText = React.useMemo(() => {
    if (value.length === 0) return placeholder
    if (value.length <= 2) {
      return options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label.split(" - ")[0]) // prioritize code prefix if present
        .join(", ")
    }
    return `${value.length} sélectionnés`
  }, [value, options, placeholder])

  // Reset search input when popover is closed
  React.useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 outline-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all hover:border-zinc-750 focus:border-indigo-650/80 focus:ring-1 focus:ring-indigo-650/50",
              className
            )}
          />
        }
      >
        <span className="truncate pr-1">
          {triggerText}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-zinc-500">
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-zinc-300 hover:bg-zinc-850 rounded-sm cursor-pointer transition-colors"
              title="Réinitialiser"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronsUpDown className="h-3 w-3 opacity-60" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-0 bg-[#16171e] border border-zinc-800 shadow-2xl rounded-xl isolate z-50 overflow-hidden flex flex-col"
        align="start"
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-zinc-900 px-3 py-2 bg-zinc-950/20">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-6 w-full rounded-md bg-transparent text-xs text-white outline-hidden placeholder:text-zinc-500 font-medium"
            autoFocus
          />
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-1.5 bg-zinc-950/40 text-[10px] font-bold text-zinc-400">
          <button
            type="button"
            onClick={handleSelectAll}
            className="hover:text-white cursor-pointer transition-colors"
          >
            {search ? "Tout cocher filtré" : "Tout cocher"}
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="hover:text-white cursor-pointer transition-colors"
          >
            {search ? "Décocher filtré" : "Tout décocher"}
          </button>
        </div>

        {/* Scrollable list */}
        <ScrollArea className="h-56 overflow-y-auto">
          <div className="p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 italic">
                Aucun résultat trouvé
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggle(opt.value)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-3 pr-8 text-xs text-zinc-400 outline-hidden hover:bg-indigo-650 hover:text-white font-medium text-left transition-all",
                      isSelected && "bg-indigo-950/60 text-indigo-300 hover:bg-indigo-650 hover:text-white"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-400">
                        <Check className="h-3.5 w-3.5 text-current" />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
