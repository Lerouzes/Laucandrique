'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DeleteClientButton } from '@/components/features/clients/DeleteClientButton'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface ClientDetailFormProps {
  clientId: string
  client: any
  managers: any[]
  clientQuotes: any[]
  contract: any
  doorsCount: number
  saveAction: (prevState: any, formData: FormData) => Promise<any>
}

export function ClientDetailForm({
  clientId,
  client,
  managers,
  clientQuotes,
  contract,
  doorsCount,
  saveAction,
}: ClientDetailFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(saveAction, null)

  useEffect(() => {
    if (state?.success) {
      // Short delay so user sees success banner, then hard reload for fresh data
      const t = setTimeout(() => window.location.reload(), 1200)
      return () => clearTimeout(t)
    }
  }, [state?.success])

  return (
    <form action={formAction} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hidden client ID so the server action knows which client to update */}
      <input type="hidden" name="client_id" value={clientId} />
      {/* Status banner */}
      {state?.error && (
        <div className="lg:col-span-3 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-rose-300">Erreur lors de la sauvegarde</p>
            <p className="text-xs text-rose-400 mt-0.5 font-mono">{state.error}</p>
          </div>
        </div>
      )}
      {state?.success && (
        <div className="lg:col-span-3 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold text-emerald-300">Modifications enregistrées avec succès!</p>
        </div>
      )}

      {/* Left 2 Columns */}
      <div className="lg:col-span-2 space-y-6">

        {/* Main Info Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            Informations du Syndicat
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs text-zinc-400 font-semibold">SDC # (Code de référence)</Label>
              <Input id="full_name" name="full_name" defaultValue={client.full_name || ''} placeholder="ex: SDC-001" required className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_name" className="text-xs text-zinc-400 font-semibold">Nom complet du Syndicat</Label>
              <Input id="company_name" name="company_name" defaultValue={client.company_name || ''} placeholder="ex: Laucandrique Brossard" className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs text-zinc-400 font-semibold">Statut</Label>
              <select id="status" name="status" defaultValue={client.status || 'active'} className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-800">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doors_count" className="text-xs text-zinc-400 font-semibold">Nombre de portes</Label>
              <Input id="doors_count" type="number" name="doors_count" defaultValue={doorsCount || ''} placeholder="ex: 24" className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
          </div>
        </div>

        {/* Contact Details Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <Phone className="h-4 w-4 text-cyan-400" />
            Coordonnées & Gestionnaire
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-zinc-400 font-semibold">Courriel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input id="email" type="email" name="email" defaultValue={client.email || ''} placeholder="brossard@laucandrique.com" className="pl-9 bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs text-zinc-400 font-semibold">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input id="phone" name="phone" defaultValue={client.phone || ''} placeholder="450-123-4567" className="pl-9 bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manager_id" className="text-xs text-zinc-400 font-semibold">Gestionnaire assigné</Label>
            <select id="manager_id" name="manager_id" defaultValue={client.manager_id || ''} className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-800">
              <option value="">Aucun gestionnaire</option>
              {managers.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} ({m.email || 'Pas de courriel'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            Adresse Postale
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs text-zinc-400 font-semibold">Adresse</Label>
            <Input id="address" name="address" defaultValue={client.address || ''} placeholder="123 Boulevard Taschereau" className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs text-zinc-400 font-semibold">Ville</Label>
              <Input id="city" name="city" defaultValue={client.city || ''} placeholder="Brossard" className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="province" className="text-xs text-zinc-400 font-semibold">Province</Label>
              <Input id="province" name="province" defaultValue={client.province || ''} placeholder="QC" className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal_code" className="text-xs text-zinc-400 font-semibold">Code postal</Label>
              <Input id="postal_code" name="postal_code" defaultValue={client.postal_code || ''} placeholder="J4Z 2G8" className="bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">

        {/* Contract Details Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <CreditCard className="h-4 w-4 text-cyan-400" />
            Détails du Contrat
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="package_name" className="text-xs text-zinc-400 font-semibold">Forfait / Package</Label>
            <select
              id="package_name"
              name="package_name"
              defaultValue={contract?.package_name || ''}
              className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-800"
            >
              <option value="">Non spécifié</option>
              <option value="Bronze">Bronze</option>
              <option value="Argent">Argent</option>
              <option value="Argent+">Argent+</option>
              <option value="Or">Or</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthly_fee" className="text-xs text-zinc-400 font-semibold">Frais Mensuels ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input id="monthly_fee" type="number" step="0.01" name="monthly_fee" defaultValue={contract?.monthly_fee ?? ''} placeholder="0.00" className="pl-9 bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="financial_year" className="text-xs text-zinc-400 font-semibold">Exercice financier (Date de début)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input id="financial_year" type="date" name="financial_year" defaultValue={contract?.start_date || ''} className="pl-9 bg-zinc-950 border-zinc-850 h-9 text-xs focus-visible:ring-zinc-800" />
            </div>
          </div>
        </div>

        {/* Quote history card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            Historique des Soumissions ({clientQuotes.length})
          </h3>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {clientQuotes.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">Aucune soumission associée.</p>
            ) : (
              clientQuotes.map((q: any) => (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="block p-2.5 rounded-lg border border-zinc-850/60 bg-zinc-950/40 hover:bg-zinc-950 hover:border-zinc-800 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      #{q.quote_number}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      {q.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                    {q.title || 'Sans titre'}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Form Actions Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-955 p-4 space-y-3">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-semibold text-xs h-9 rounded-lg shadow-lg shadow-cyan-950/20 transition-all"
          >
            {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
          <DeleteClientButton clientId={clientId} clientName={client.company_name || client.full_name} />
        </div>
      </div>
    </form>
  )
}
