// @ts-nocheck
'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createMaintenanceContractorAction } from '@/actions/contractors'
import { toast } from 'sonner'

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

export function MaintenanceContractorFormDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [specialties, setSpecialties] = useState<string[]>([])

  const toggleSpecialty = (spec: string, checked: boolean) => {
    setSpecialties(prev => checked ? [...prev, spec] : prev.filter(s => s !== spec))
  }

  const onSubmit = (formData: FormData) => {
    specialties.forEach(s => formData.append('specialties', s))
    startTransition(async () => {
      try {
        await createMaintenanceContractorAction(formData)
        toast.success('Entrepreneur ajouté au Hub de Maintenance')
        setOpen(false)
        setSpecialties([])
      } catch (e: any) {
        toast.error('Erreur lors de la création', { description: e.message })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-700 hover:bg-amber-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel entrepreneur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un entrepreneur — Hub de Maintenance</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nom complet *</Label>
              <Input name="full_name" required placeholder="Jean-Pierre Tremblay" />
            </div>
            <div className="col-span-2">
              <Label>Entreprise</Label>
              <Input name="company_name" placeholder="Tremblay & Fils Inc." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Courriel</Label>
              <Input name="email" type="email" placeholder="contact@exemple.com" />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input name="phone" type="tel" placeholder="514-555-1234" />
            </div>
          </div>
          <div>
            <Label>Couleur d'identification</Label>
            <Input type="color" name="color" defaultValue="#92400e" className="h-10 p-1 w-16" />
          </div>
          <div className="space-y-2">
            <Label>Spécialités</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTIES.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <Checkbox onCheckedChange={v => toggleSpecialty(s, !!v)} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea name="notes" placeholder="Informations supplémentaires, disponibilités, tarifs..." />
          </div>
          <Button type="submit" disabled={isPending} className="w-full bg-amber-700 hover:bg-amber-600 text-white">
            {isPending ? 'Création en cours...' : 'Créer l\'entrepreneur'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
