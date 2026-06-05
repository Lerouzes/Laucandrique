// @ts-nocheck
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getContractorById, updateMaintenanceContractorAction } from '@/actions/contractors'
import {
  getContractorServicesAction,
  getCampaignsByContractorAction,
  getContractorChecklistAction,
  getOrCreateContractorTokenAction,
} from '@/actions/maintenance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import { ContractorHubPanel } from '@/components/features/maintenance/ContractorHubPanel'

const SPECIALTIES = [
  'Plomberie', 'Électricité', 'Toiture', 'Revêtement extérieur',
  'Chauffage / CVC', 'Menuiserie', 'Maçonnerie', 'Peinture', 'Serrurerie', 'Nettoyage',
]

export default async function MaintenanceContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [contractor, services, campaigns, checklist, token] = await Promise.all([
    getContractorById(id),
    getContractorServicesAction(id),
    getCampaignsByContractorAction(id),
    getContractorChecklistAction(id),
    getOrCreateContractorTokenAction(id).catch(() => null),
  ])

  if (!contractor) notFound()

  // Determine base URL for portal link
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  const update = async (fd: FormData) => {
    'use server'
    await updateMaintenanceContractorAction(id, fd)
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/maintenance-hub/contractors"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux entrepreneurs
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl border-2 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: contractor.color || '#92400e', borderColor: contractor.color || '#92400e' }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-100 leading-tight">{contractor.full_name}</h2>
              {contractor.company_name && (
                <p className="text-sm text-zinc-500">{contractor.company_name}</p>
              )}
              {contractor.skills?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {contractor.skills.map((s: string) => (
                    <Badge key={s} className="text-[9px] px-1.5 py-0 bg-amber-950/40 text-amber-400 border-amber-900/50">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 min-h-0">

        {/* LEFT: Info & Edit Form */}
        <div className="space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-4">
              Informations
            </h3>
            <form action={update} className="space-y-3">
              <div>
                <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Nom complet *</Label>
                <Input name="full_name" defaultValue={contractor.full_name || ''} required className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Entreprise</Label>
                <Input name="company_name" defaultValue={contractor.company_name || ''} placeholder="Raison sociale" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Courriel</Label>
                  <Input name="email" type="email" defaultValue={contractor.email || ''} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Téléphone</Label>
                  <Input name="phone" type="tel" defaultValue={contractor.phone || ''} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Couleur</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" name="color" defaultValue={contractor.color || '#92400e'} className="h-9 p-1 w-14" />
                  <span className="text-xs text-zinc-500">Couleur d'identification dans la plateforme</span>
                </div>
              </div>
              <div>
                <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 block">Spécialités</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SPECIALTIES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        name="specialties"
                        value={s}
                        defaultChecked={(contractor.skills || []).includes(s)}
                        className="accent-amber-600 h-3.5 w-3.5"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Notes internes</Label>
                <Textarea name="notes" defaultValue={contractor.notes || ''} className="min-h-[70px] text-sm" placeholder="Informations, disponibilités, tarifs généraux..." />
              </div>
              <Button type="submit" className="w-full bg-amber-700 hover:bg-amber-600 text-white h-9">
                <Save className="h-3.5 w-3.5 mr-2" />
                Enregistrer
              </Button>
            </form>
          </div>
        </div>

        {/* RIGHT: Hub Panel */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 overflow-y-auto">
          <ContractorHubPanel
            contractorId={id}
            services={services}
            campaigns={campaigns}
            checklist={checklist}
            portalToken={token}
            baseUrl={baseUrl}
          />
        </div>

      </div>
    </div>
  )
}
