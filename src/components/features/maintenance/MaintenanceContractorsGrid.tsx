// @ts-nocheck
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Phone, Mail, Building2, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { deleteContractorAction } from '@/actions/contractors'
import { toast } from 'sonner'

export function MaintenanceContractorsGrid({ data }: { data: any[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteContractorAction(id)
        toast.success('Entrepreneur supprimé')
      } catch (e: any) {
        toast.error('Erreur', { description: e.message })
      } finally {
        setDeletingId(null)
      }
    })
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-amber-950/40 border border-amber-900/50 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-amber-700" />
        </div>
        <p className="text-zinc-400 text-sm font-medium">Aucun entrepreneur enregistré</p>
        <p className="text-zinc-600 text-xs mt-1">Ajoutez des entrepreneurs spécialisés pour vos campagnes de maintenance.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((c) => (
          <div
            key={c.id}
            className="relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition-colors group"
          >
            {/* Color stripe */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
              style={{ backgroundColor: c.color || '#92400e' }}
            />

            <div className="flex items-start justify-between mt-1">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/maintenance-hub/contractors/${c.id}`}
                  className="font-semibold text-zinc-100 hover:text-amber-400 transition-colors block truncate"
                >
                  {c.full_name}
                </Link>
                {c.company_name && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {c.company_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/maintenance-hub/contractors/${c.id}`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-100">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-red-400"
                  onClick={() => setDeletingId(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  {c.phone}
                </a>
              )}
            </div>

            {c.skills && c.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {c.skills.map((s: string) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-amber-900/60 text-amber-400 bg-amber-950/20"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {c.notes && (
              <p className="mt-3 text-xs text-zinc-600 line-clamp-2 border-t border-zinc-800/60 pt-2">
                {c.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'entrepreneur ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L'entrepreneur sera définitivement retiré du registre du Hub de Maintenance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              {isPending ? 'Suppression...' : 'Oui, supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
