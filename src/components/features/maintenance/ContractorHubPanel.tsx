// @ts-nocheck
'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  DollarSign, Plus, Trash2, Check, X, ChevronDown, ChevronUp,
  Clock, Tag, CheckSquare, Square, Loader2, ExternalLink, Copy,
  Pencil, Info, Wrench, ListChecks, Building, CalendarRange
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  upsertContractorServicePricingAction,
  removeContractorServicePricingAction,
  addContractorChecklistItemAction,
  toggleContractorChecklistItemAction,
  deleteContractorChecklistItemAction,
} from '@/actions/maintenance'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-zinc-800 text-zinc-400' },
  active: { label: 'Active', color: 'bg-green-950/60 text-green-400' },
  completed: { label: 'Terminée', color: 'bg-blue-950/60 text-blue-400' },
  cancelled: { label: 'Annulée', color: 'bg-red-950/60 text-red-400' },
}

// ─── SERVICE ROW ─────────────────────────────────────────────────────────────
function ServiceRow({ svc, contractorId }: { svc: any; contractorId: string }) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(svc.custom_price !== null ? String(svc.custom_price) : '')
  const [note, setNote] = useState(svc.pricing_note || '')
  const [active, setActive] = useState(svc.has_custom)
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await upsertContractorServicePricingAction(contractorId, svc.id, price !== '' ? Number(price) : null, note)
        setActive(true)
        setOpen(false)
        toast.success(`Tarif enregistré pour "${svc.name}"`)
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const remove = () => {
    startTransition(async () => {
      try {
        await removeContractorServicePricingAction(contractorId, svc.id)
        setActive(false)
        setPrice('')
        setNote('')
        toast.success('Tarif personnalisé retiré')
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  return (
    <div className={`rounded-lg border transition-colors ${active ? 'border-amber-900/50 bg-amber-950/10' : 'border-zinc-800/60 bg-zinc-900/20'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${active ? 'bg-amber-500' : 'bg-zinc-700'}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{svc.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-700 text-zinc-500">
                {svc.category}
              </Badge>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />{svc.duration} min
              </span>
              {active && (
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {price !== '' ? `${Number(price).toFixed(2)}$` : 'Prix perso'}
                </span>
              )}
              {!active && svc.price > 0 && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Tag className="h-3 w-3" />Base: {svc.price}$
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {active && (
            <button
              onClick={e => { e.stopPropagation(); remove() }}
              disabled={isPending}
              className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded"
              title="Retirer le tarif personnalisé"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/50 pt-3">
          <p className="text-xs text-zinc-500 italic">{svc.description || 'Aucune description.'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">
                Tarif entrepreneur ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={`Base: ${svc.price || 0}$`}
                className="h-8 text-xs bg-zinc-950/50 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">
                Note de tarification
              </label>
              <Input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex: inclus matériaux..."
                className="h-8 text-xs bg-zinc-950/50 border-zinc-700"
              />
            </div>
          </div>
          <Button
            onClick={save}
            disabled={isPending}
            size="sm"
            className="bg-amber-700 hover:bg-amber-600 text-white text-xs h-7 px-3"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Enregistrer le tarif
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── CHECKLIST PANEL ─────────────────────────────────────────────────────────
function ChecklistPanel({ contractorId, initial }: { contractorId: string; initial: any[] }) {
  const [items, setItems] = useState<any[]>(initial)
  const [newLabel, setNewLabel] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const addItem = () => {
    if (!newLabel.trim()) return
    startTransition(async () => {
      try {
        const item = await addContractorChecklistItemAction(contractorId, newLabel.trim())
        setItems(prev => [...prev, item])
        setNewLabel('')
        inputRef.current?.focus()
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const toggle = (id: string, done: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done } : i))
    startTransition(async () => {
      try {
        await toggleContractorChecklistItemAction(id, done)
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    startTransition(async () => {
      try {
        await deleteContractorChecklistItemAction(id)
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const done = items.filter(i => i.done).length

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>{done}/{items.length} complété{done !== 1 ? 's' : ''}</span>
          <div className="h-1.5 flex-1 mx-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 rounded-full transition-all"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 group py-1">
            <button
              onClick={() => toggle(item.id, !item.done)}
              className="flex-shrink-0 text-zinc-500 hover:text-amber-400 transition-colors"
            >
              {item.done
                ? <CheckSquare className="h-4 w-4 text-amber-500" />
                : <Square className="h-4 w-4" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
              {item.label}
            </span>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Input
          ref={inputRef}
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Nouvelle tâche... (Entrée pour ajouter)"
          className="h-8 text-xs bg-zinc-950/50 border-zinc-700"
        />
        <Button
          onClick={addItem}
          disabled={isPending || !newLabel.trim()}
          size="sm"
          className="bg-amber-700 hover:bg-amber-600 text-white h-8 px-3"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

// ─── PORTAL LINK ─────────────────────────────────────────────────────────────
function PortalLinkPanel({ token, baseUrl }: { token: string | null; baseUrl: string }) {
  const url = token ? `${baseUrl}/maintenance/contractor/${token}` : null
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Lien copié dans le presse-papier')
  }

  if (!url) {
    return (
      <div className="text-xs text-zinc-500 italic">
        Aucun jeton d'accès — le portail n'est pas encore configuré pour cet entrepreneur.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Partagez ce lien directement avec l'entrepreneur. Il lui donnera accès à son portail de travail personnalisé.
      </p>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2">
          <ExternalLink className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-400 truncate font-mono">{url}</span>
        </div>
        <Button onClick={copy} size="sm" variant="outline" className="border-zinc-700 h-9 px-3">
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-600 text-white h-9 px-3">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function ContractorHubPanel({
  contractorId,
  services,
  campaigns,
  checklist,
  portalToken,
  baseUrl,
}: {
  contractorId: string
  services: any[]
  campaigns: any[]
  checklist: any[]
  portalToken: string | null
  baseUrl: string
}) {
  const [activeTab, setActiveTab] = useState<'services' | 'campaigns' | 'checklist'>('services')
  const [serviceSearch, setServiceSearch] = useState('')

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const tabs = [
    { key: 'services', label: 'Services & Tarifs', icon: Wrench, count: services.filter(s => s.has_custom).length },
    { key: 'campaigns', label: 'Campagnes', icon: CalendarRange, count: campaigns.length },
    { key: 'checklist', label: 'Liste de tâches', icon: ListChecks, count: checklist.filter(i => !i.done).length },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Portal link always at top */}
      <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Portail Entrepreneur</h3>
        </div>
        <PortalLinkPanel token={portalToken} baseUrl={baseUrl} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-900/50 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-amber-700 text-white shadow'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-amber-800/60 text-amber-200' : 'bg-zinc-700 text-zinc-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Services & Pricing */}
      {activeTab === 'services' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Input
              value={serviceSearch}
              onChange={e => setServiceSearch(e.target.value)}
              placeholder="Filtrer les services..."
              className="h-8 text-xs bg-zinc-950/50 border-zinc-700"
            />
            <div className="text-xs text-zinc-600 whitespace-nowrap">
              {services.filter(s => s.has_custom).length} tarifs configurés
            </div>
          </div>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-xs">Aucun service trouvé.</div>
          ) : (
            filteredServices.map(svc => (
              <ServiceRow key={svc.id} svc={svc} contractorId={contractorId} />
            ))
          )}
        </div>
      )}

      {/* Tab: Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarRange className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-xs text-zinc-500">Aucune campagne assignée à cet entrepreneur.</p>
            </div>
          ) : (
            campaigns.map((c: any) => {
              const status = STATUS_LABELS[c.status] || STATUS_LABELS.draft
              const client = c.clients?.company_name || c.clients?.full_name || '—'
              return (
                <Link
                  key={c.id}
                  href={`/maintenance-hub/campaigns/${c.id}`}
                  className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
                      {c.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      <Building className="h-3 w-3" />{client}
                    </p>
                    {c.start_date && (
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {new Date(c.start_date).toLocaleDateString('fr-CA')}
                        {c.end_date && ` → ${new Date(c.end_date).toLocaleDateString('fr-CA')}`}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </Link>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Checklist */}
      {activeTab === 'checklist' && (
        <div className="flex-1">
          <ChecklistPanel contractorId={contractorId} initial={checklist} />
        </div>
      )}
    </div>
  )
}
