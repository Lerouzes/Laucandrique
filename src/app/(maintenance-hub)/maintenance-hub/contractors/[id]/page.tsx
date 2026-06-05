// @ts-nocheck
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContractorById, updateMaintenanceContractorAction } from '@/actions/contractors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2 } from 'lucide-react'

const SPECIALTIES = [
  'Plomberie',
  'Électricité',
  'Toiture',
  'Revêtement extérieur',
  'Chauffage / CVC',
  'Menuiserie',
  'Maçonnerie',
  'Peinture',
  'Serrurerie',
  'Nettoyage',
]

export default async function MaintenanceContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contractor = await getContractorById(id)
  if (!contractor) notFound()

  const update = async (fd: FormData) => {
    'use server'
    await updateMaintenanceContractorAction(id, fd)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/maintenance-hub/contractors"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entrepreneurs
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <div
            className="h-10 w-10 rounded-full border-2 flex items-center justify-center"
            style={{ backgroundColor: contractor.color || '#92400e', borderColor: contractor.color || '#92400e' }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{contractor.full_name}</h2>
            {contractor.company_name && (
              <p className="text-sm text-zinc-500">{contractor.company_name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h3 className="font-semibold text-zinc-100 text-sm uppercase tracking-wider text-amber-500">
          Informations de l'entrepreneur
        </h3>
        <form action={update} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-zinc-400 text-xs mb-1 block">Nom complet *</Label>
              <Input name="full_name" defaultValue={contractor.full_name || ''} required />
            </div>
            <div className="col-span-2">
              <Label className="text-zinc-400 text-xs mb-1 block">Entreprise</Label>
              <Input name="company_name" defaultValue={contractor.company_name || ''} placeholder="Raison sociale" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Courriel</Label>
              <Input name="email" type="email" defaultValue={contractor.email || ''} />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Téléphone</Label>
              <Input name="phone" type="tel" defaultValue={contractor.phone || ''} />
            </div>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Couleur d'identification</Label>
            <Input type="color" name="color" defaultValue={contractor.color || '#92400e'} className="h-10 p-1 w-16" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-2 block">Spécialités</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTIES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="specialties"
                    value={s}
                    defaultChecked={(contractor.skills || []).includes(s)}
                    className="accent-amber-600"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Notes</Label>
            <Textarea name="notes" defaultValue={contractor.notes || ''} className="min-h-[80px]" />
          </div>
          <Button type="submit" className="bg-amber-700 hover:bg-amber-600 text-white">
            Enregistrer les modifications
          </Button>
        </form>
      </div>

      {contractor.skills && contractor.skills.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-semibold text-zinc-400 text-xs uppercase tracking-wider mb-3">Spécialités actuelles</h3>
          <div className="flex flex-wrap gap-2">
            {contractor.skills.map((s: string) => (
              <Badge key={s} className="bg-amber-950/40 text-amber-400 border-amber-900/50">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
