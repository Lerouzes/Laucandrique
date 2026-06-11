// @ts-nocheck
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign, Plus, Trash2, Check, X, ChevronDown, ChevronUp,
  Clock, Tag, CheckSquare, Square, Loader2, ExternalLink, Copy,
  Wrench, ListChecks, Building, CalendarRange, Library, PlusCircle,
  Camera, FileText, Search, CornerDownLeft, Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  upsertContractorServicePricingAction,
  unlinkContractorServiceAction,
  createAndLinkServiceAction,
  linkExistingServicesAction,
  addContractorChecklistItemAction,
  toggleContractorChecklistItemAction,
  deleteContractorChecklistItemAction,
  getContractorMembersAction,
  saveContractorMemberAction,
  deleteContractorMemberAction,
} from '@/actions/maintenance'
import { toast } from 'sonner'

const CATEGORIES = ['Plomberie','Fenêtres','Portes-patio','Moustiquaires','Ventilation','Électricité','Sécurité','Bâtiment','Administratif','Toiture','Chauffage / CVC','Menuiserie','Maçonnerie','Serrurerie','Nettoyage']

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Brouillon', color: 'bg-zinc-800 text-zinc-400' },
  active:    { label: 'Active',    color: 'bg-green-950/60 text-green-400' },
  completed: { label: 'Terminée', color: 'bg-blue-950/60 text-blue-400' },
  cancelled: { label: 'Annulée',  color: 'bg-red-950/60 text-red-400' },
}

// ─── SERVICE ROW (linked service with pricing) ────────────────────────────────
function ServiceRow({ svc, contractorId, onUnlink }: { svc: any; contractorId: string; onUnlink: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(svc.custom_price !== null ? String(svc.custom_price) : '')
  const [note, setNote] = useState(svc.pricing_note || '')
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  const save = () => {
    startTransition(async () => {
      try {
        await upsertContractorServicePricingAction(contractorId, svc.id, price !== '' ? Number(price) : null, note)
        setOpen(false)
        toast.success(`Tarif mis à jour pour "${svc.name}"`)
      } catch (e: any) { toast.error(e.message) }
    })
  }

  const unlink = () => {
    startTransition(async () => {
      try {
        await unlinkContractorServiceAction(contractorId, svc.id)
        onUnlink(svc.id)
        toast.success(`"${svc.name}" retiré de la liste de cet entrepreneur`)
      } catch (e: any) { toast.error(e.message) }
    })
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors group">
        {/* Clickable expand area */}
        <div
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={() => setOpen(v => !v)}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{svc.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-500">
                {svc.category}
              </Badge>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />{svc.duration} min
              </span>
              {price !== '' ? (
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />{Number(price).toFixed(2)}$
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                  <Tag className="h-3 w-3" />Tarif non défini
                </span>
              )}
              {note && <span className="text-[10px] text-zinc-600 italic truncate max-w-[120px]">{note}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons — separate from expand area */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {confirming ? (
            <span className="flex items-center gap-1">
              <button onClick={unlink} disabled={isPending}
                className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded bg-red-950/30">
                Retirer
              </button>
              <button onClick={() => setConfirming(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1">
                Annuler
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirming(true)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 p-1.5 rounded transition-all"
              title="Retirer ce service">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="cursor-pointer p-1" onClick={() => setOpen(v => !v)}>
            {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
          </div>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/50 pt-3 bg-zinc-900/20">
          {svc.description && <p className="text-xs text-zinc-500 italic">{svc.description}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Tarif ($)</label>
              <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="Non défini" className="h-8 text-xs bg-zinc-950/50 border-zinc-700" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Note</label>
              <Input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ex: inclus matériaux..." className="h-8 text-xs bg-zinc-950/50 border-zinc-700" />
            </div>
          </div>
          <Button onClick={save} disabled={isPending} size="sm"
            className="bg-amber-700 hover:bg-amber-600 text-white text-xs h-7 px-3">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── CREATE SERVICE FORM ──────────────────────────────────────────────────────
function CreateServiceForm({ contractorId, onCreated }: { contractorId: string; onCreated: (svc: any) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Plomberie')
  const [photosRequired, setPhotosRequired] = useState(false)
  const [reportRequired, setReportRequired] = useState(false)
  const [isPending, startTransition] = useTransition()

  const reset = () => {
    setName(''); setDescription(''); setDuration('30'); setPrice('')
    setCategory('Plomberie'); setPhotosRequired(false); setReportRequired(false)
    setOpen(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Le nom du service est requis.')
    const dur = Number(duration)
    if (isNaN(dur) || dur <= 0) return toast.error('Durée invalide.')
    startTransition(async () => {
      try {
        const svc = await createAndLinkServiceAction(contractorId, {
          name: name.trim(), description: description || null, duration: dur,
          price: price ? Number(price) : null, category,
          photos_required: photosRequired, report_required: reportRequired,
        })
        onCreated({ ...svc, custom_price: price ? Number(price) : null, pricing_note: null, has_custom: false })
        toast.success(`Service "${svc.name}" créé et ajouté`)
        reset()
      } catch (e: any) { toast.error(e.message) }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-amber-700 hover:text-amber-400 text-xs font-semibold transition-all">
        <PlusCircle className="h-4 w-4" /> Créer un nouveau service
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Nouveau service</h4>
        <button onClick={reset} className="text-zinc-500 hover:text-zinc-200 p-1"><X className="h-4 w-4" /></button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Nom *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Inspection chauffe-eau" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Catégorie</Label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-8 text-xs rounded-md border border-zinc-700 bg-zinc-900 px-2 text-zinc-200">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Durée (min) *</Label>
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Tarif ($)</Label>
            <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Optionnel" className="h-8 text-xs" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="text-xs" placeholder="Détails de l'intervention..." />
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={photosRequired} onChange={e => setPhotosRequired(e.target.checked)} className="accent-amber-600" />
            <Camera className="h-3 w-3" /> Photos requises
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={reportRequired} onChange={e => setReportRequired(e.target.checked)} className="accent-amber-600" />
            <FileText className="h-3 w-3" /> Rapport requis
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} size="sm" className="bg-amber-700 hover:bg-amber-600 text-white h-8 text-xs">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
            Créer et ajouter
          </Button>
          <Button type="button" onClick={reset} variant="ghost" size="sm" className="h-8 text-xs text-zinc-500">Annuler</Button>
        </div>
      </form>
    </div>
  )
}

// ─── IMPORT FROM LIBRARY DIALOG ───────────────────────────────────────────────
function ImportServicesDialog({ contractorId, library, onImported }: { contractorId: string; library: any[]; onImported: (svcs: any[]) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const filtered = library.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const importSelected = () => {
    if (!selected.length) return
    startTransition(async () => {
      try {
        await linkExistingServicesAction(contractorId, selected)
        const imported = library.filter(s => selected.includes(s.id)).map(s => ({
          ...s, custom_price: null, pricing_note: null, has_custom: false
        }))
        onImported(imported)
        toast.success(`${selected.length} service${selected.length > 1 ? 's' : ''} importé${selected.length > 1 ? 's' : ''}`)
        setSelected([])
        setOpen(false)
      } catch (e: any) { toast.error(e.message) }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-all">
        <Library className="h-4 w-4" />
        Importer depuis la bibliothèque {library.length > 0 && `(${library.length} disponibles)`}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importer des services</DialogTitle>
            <DialogDescription>
              Sélectionnez les services à ajouter à cet entrepreneur. Vous pourrez personnaliser le tarif après.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer..." className="pl-9 h-9 text-sm" />
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-8 text-zinc-500 text-sm">Aucun service disponible à importer.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filtered.map(s => (
                <button key={s.id} onClick={() => toggle(s.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left border transition-colors ${
                    selected.includes(s.id)
                      ? 'border-amber-700 bg-amber-950/20'
                      : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-700 text-zinc-500">{s.category}</Badge>
                      <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration} min</span>
                      {s.price > 0 && <span className="text-[10px] text-zinc-500">{s.price}$</span>}
                    </div>
                  </div>
                  {selected.includes(s.id) && <Check className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-500">{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">Annuler</Button>
              <Button onClick={importSelected} disabled={!selected.length || isPending} size="sm"
                className="bg-amber-700 hover:bg-amber-600 text-white h-8 text-xs">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CornerDownLeft className="h-3 w-3 mr-1" />}
                Importer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
      } catch (e: any) { toast.error(e.message) }
    })
  }

  const toggle = (id: string, done: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done } : i))
    startTransition(async () => {
      try { await toggleContractorChecklistItemAction(id, done) } catch (e: any) { toast.error(e.message) }
    })
  }

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    startTransition(async () => {
      try { await deleteContractorChecklistItemAction(id) } catch (e: any) { toast.error(e.message) }
    })
  }

  const done = items.filter(i => i.done).length

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="whitespace-nowrap">{done}/{items.length} complété{done !== 1 ? 's' : ''}</span>
          <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-600 rounded-full transition-all"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 group py-1">
            <button onClick={() => toggle(item.id, !item.done)} className="flex-shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
              {item.done ? <CheckSquare className="h-4 w-4 text-amber-500" /> : <Square className="h-4 w-4" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{item.label}</span>
            <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Input ref={inputRef} value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Nouvelle tâche... (Entrée pour ajouter)"
          className="h-8 text-xs bg-zinc-950/50 border-zinc-700" />
        <Button onClick={addItem} disabled={isPending || !newLabel.trim()} size="sm"
          className="bg-amber-700 hover:bg-amber-600 text-white h-8 px-3">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

// ─── MEMBERS PANEL ───────────────────────────────────────────────────────────
function MembersPanel({
  contractorId,
  members,
  onUpdate
}: {
  contractorId: string
  members: any[]
  onUpdate: () => void
}) {
  const [editingMember, setEditingMember] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<'owner' | 'team_leader' | 'employee'>('employee')
  const [password, setPassword] = useState('')
  const [team, setTeam] = useState<'team_1' | 'team_2' | ''>('')
  const [isPending, startTransition] = useTransition()
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setRole('employee')
    setPassword('')
    setTeam('')
    setEditingMember(null)
    setShowForm(false)
  }

  const handleEdit = (m: any) => {
    setEditingMember(m)
    setName(m.name)
    setRole(m.role)
    setPassword('') // empty password field means "keep unchanged"
    setTeam(m.team || '')
    setShowForm(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Le nom est requis.")
    if (!editingMember && !password.trim()) return toast.error("Le mot de passe est requis pour un nouveau membre.")

    startTransition(async () => {
      try {
        await saveContractorMemberAction({
          id: editingMember?.id,
          contractor_id: contractorId,
          name: name.trim(),
          role,
          password: password ? password : undefined,
          team: team ? (team as 'team_1' | 'team_2') : null
        })
        toast.success(editingMember ? "Membre mis à jour avec succès." : "Membre créé avec succès.")
        resetForm()
        onUpdate()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteContractorMemberAction(id)
        toast.success("Membre supprimé.")
        setConfirmingDeleteId(null)
        onUpdate()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Add member button or form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-amber-700 hover:text-amber-400 text-xs font-semibold transition-all"
        >
          <PlusCircle className="h-4 w-4" /> Ajouter un membre
        </button>
      ) : (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {editingMember ? "Modifier le membre" : "Nouveau membre"}
            </h4>
            <button type="button" onClick={resetForm} className="text-zinc-500 hover:text-zinc-200 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Nom complet *</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: John Doe"
                  className="h-8 text-xs bg-zinc-950 border-zinc-700"
                  required
                />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Rôle *</Label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full h-8 text-xs rounded-md border border-zinc-700 bg-zinc-950 px-2 text-zinc-200"
                >
                  <option value="owner">Propriétaire (Owner)</option>
                  <option value="team_leader">Chef d'équipe (Team Leader)</option>
                  <option value="employee">Employé (Employee)</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Équipe</Label>
                <select
                  value={team}
                  onChange={e => setTeam(e.target.value as any)}
                  className="w-full h-8 text-xs rounded-md border border-zinc-700 bg-zinc-950 px-2 text-zinc-200"
                >
                  <option value="">Aucune</option>
                  <option value="team_1">Équipe 1</option>
                  <option value="team_2">Équipe 2</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
                  Mot de passe {editingMember && "(laisser vide pour inchangé)"} *
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editingMember ? "••••••••" : "Mot de passe d'accès"}
                  className="h-8 text-xs bg-zinc-950 border-zinc-700"
                  required={!editingMember}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} size="sm" className="bg-amber-700 hover:bg-amber-600 text-white h-8 text-xs">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                {editingMember ? "Mettre à jour" : "Créer le membre"}
              </Button>
              <Button type="button" onClick={resetForm} variant="ghost" size="sm" className="h-8 text-xs text-zinc-500">
                Annuler
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 font-medium">Aucun membre configuré pour cet entrepreneur.</p>
            <p className="text-[10px] text-zinc-600 mt-1">Les membres utiliseront ces profils pour se connecter au portail.</p>
          </div>
        ) : (
          members.map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/30 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{m.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-zinc-700 ${
                    m.role === 'owner' ? 'bg-purple-950/40 text-purple-400 border-purple-900/50' :
                    m.role === 'team_leader' ? 'bg-amber-950/40 text-amber-400 border-amber-900/50' :
                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {m.role === 'owner' ? 'Propriétaire' : m.role === 'team_leader' ? "Chef d'équipe" : 'Employé'}
                  </Badge>
                  {m.team && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-950/40 text-blue-400 border-blue-900/50">
                      {m.team === 'team_1' ? 'Équipe 1' : 'Équipe 2'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {confirmingDeleteId === m.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded bg-red-950/30"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(m)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-amber-400 p-1.5 rounded transition-all"
                      title="Modifier"
                    >
                      <Plus className="h-3.5 w-3.5 rotate-45" />
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1.5 rounded transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
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
  if (!url) return <div className="text-xs text-zinc-500 italic">Portail non configuré.</div>
  return (
    <div className="flex gap-2">
      <div className="flex-1 flex items-center gap-2 bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2 min-w-0">
        <ExternalLink className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
        <span className="text-xs text-zinc-400 truncate font-mono">{url}</span>
      </div>
      <Button onClick={copy} size="sm" variant="outline" className="border-zinc-700 h-9 px-3 flex-shrink-0">
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
        <Button size="sm" className="bg-amber-700 hover:bg-amber-600 text-white h-9 px-3">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </a>
    </div>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function ContractorHubPanel({
  contractorId, services: initialServices, campaigns, checklist, portalToken, baseUrl, library,
}: {
  contractorId: string
  services: any[]
  campaigns: any[]
  checklist: any[]
  portalToken: string | null
  baseUrl: string
  library: any[]   // global services not yet linked
}) {
  const [activeTab, setActiveTab] = useState<'services' | 'campaigns' | 'checklist' | 'members'>('services')
  const [services, setServices] = useState<any[]>(initialServices)
  const [unlinkedLibrary, setUnlinkedLibrary] = useState<any[]>(library)
  const [serviceSearch, setServiceSearch] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const fetchMembers = () => {
    getContractorMembersAction(contractorId)
      .then(data => {
        setMembers(data)
        setLoadingMembers(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingMembers(false)
      })
  }

  useEffect(() => {
    fetchMembers()
  }, [contractorId])

  const onServiceCreated = (svc: any) => {
    setServices(prev => [...prev, svc])
    // Remove from unlinked library if it was there
    setUnlinkedLibrary(prev => prev.filter(s => s.id !== svc.id))
  }

  const onServicesImported = (svcs: any[]) => {
    setServices(prev => [...prev, ...svcs])
    const importedIds = svcs.map(s => s.id)
    setUnlinkedLibrary(prev => prev.filter(s => !importedIds.includes(s.id)))
  }

  const onServiceUnlinked = (serviceId: string) => {
    const removed = services.find(s => s.id === serviceId)
    setServices(prev => prev.filter(s => s.id !== serviceId))
    if (removed) setUnlinkedLibrary(prev => [...prev, removed])
  }

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const tabs = [
    { key: 'services', label: 'Services & Tarifs', icon: Wrench, count: services.length },
    { key: 'campaigns', label: 'Campagnes', icon: CalendarRange, count: campaigns.length },
    { key: 'checklist', label: 'Tâches', icon: ListChecks, count: checklist.filter(i => !i.done).length },
    { key: 'members', label: 'Membres & Équipes', icon: Users, count: members.length },
  ]

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Portal link */}
      <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Portail Entrepreneur</h3>
        </div>
        <PortalLinkPanel token={portalToken} baseUrl={baseUrl} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key ? 'bg-amber-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}>
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-amber-800/60 text-amber-200' : 'bg-zinc-700 text-zinc-300'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Services */}
      {activeTab === 'services' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {services.length > 0 && (
            <Input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)}
              placeholder="Filtrer les services..." className="h-8 text-xs bg-zinc-950/50 border-zinc-700" />
          )}

          {filteredServices.length === 0 && services.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Aucun service encore configuré pour cet entrepreneur.</p>
              <p className="text-[10px] text-zinc-600 mt-1">Créez un nouveau service ou importez depuis la bibliothèque.</p>
            </div>
          ) : (
            filteredServices.map(svc => (
              <ServiceRow key={svc.id} svc={svc} contractorId={contractorId} onUnlink={onServiceUnlinked} />
            ))
          )}

          <div className="pt-2 space-y-2 border-t border-zinc-800/50">
            <CreateServiceForm contractorId={contractorId} onCreated={onServiceCreated} />
            {unlinkedLibrary.length > 0 && (
              <ImportServicesDialog contractorId={contractorId} library={unlinkedLibrary} onImported={onServicesImported} />
            )}
          </div>
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
          ) : campaigns.map((c: any) => {
            const status = STATUS_LABELS[c.status] || STATUS_LABELS.draft
            const client = c.clients?.company_name || c.clients?.full_name || '—'
            return (
              <Link key={c.id} href={`/maintenance-hub/campaigns/${c.id}`}
                className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors group">
                <div>
                  <p className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">{c.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1"><Building className="h-3 w-3" />{client}</p>
                  {c.start_date && (
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {new Date(c.start_date).toLocaleDateString('fr-CA')}
                      {c.end_date && ` → ${new Date(c.end_date).toLocaleDateString('fr-CA')}`}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>{status.label}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Tab: Checklist */}
      {activeTab === 'checklist' && (
        <div className="flex-1">
          <ChecklistPanel contractorId={contractorId} initial={checklist} />
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="flex-1 overflow-y-auto">
          {loadingMembers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : (
            <MembersPanel contractorId={contractorId} members={members} onUpdate={fetchMembers} />
          )}
        </div>
      )}
    </div>
  )
}
