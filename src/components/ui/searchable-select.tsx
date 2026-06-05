// src/components/ui/searchable-select.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  className,
  disabled = false
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

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
              "flex h-10 w-full items-center justify-between rounded-xl border border-zinc-850 bg-[#121318] px-3.5 py-2.5 text-xs text-white outline-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all hover:border-zinc-800 focus:border-purple-650/80 focus:ring-1 focus:ring-purple-650/50",
              className
            )}
          />
        }
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-500 opacity-60" />
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] sm:w-[320px] p-0 bg-[#16171e] border border-zinc-800 shadow-2xl rounded-xl isolate z-50 overflow-hidden flex flex-col"
        align="start"
      >
        <div className="flex items-center border-b border-zinc-900 px-3 py-2.5 bg-zinc-950/20">
          <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
          <input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-7 w-full rounded-md bg-transparent text-xs text-white outline-hidden placeholder:text-zinc-500 font-medium"
            autoFocus
          />
        </div>
        <ScrollArea className="h-60 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 italic">
                Aucun résultat trouvé
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-xs text-zinc-300 outline-hidden hover:bg-purple-650 hover:text-white font-medium text-left transition-all",
                      isSelected && "bg-purple-650/20 text-purple-300"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-purple-400">
                        <Check className="h-3.5 w-3.5" />
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
