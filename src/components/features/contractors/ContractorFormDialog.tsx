'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createContractorAction } from '@/actions/contractors'
import { toast } from 'sonner'

const SKILLS = ['Peinture', 'Menuiserie', 'Plomberie', 'Électricité', 'Plancher', 'Finition']

export function ContractorFormDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [skills, setSkills] = useState<string[]>([])

  const toggleSkill = (skill: string, checked: boolean) => {
    setSkills(prev => checked ? [...prev, skill] : prev.filter(s => s !== skill))
  }

  const onSubmit = (formData: FormData) => {
    skills.forEach(skill => formData.append('skills', skill))
    startTransition(async () => {
      try {
        await createContractorAction(formData)
        toast.success('Contracteur créé')
        setOpen(false)
      } catch (e: any) {
        toast.error('Erreur', { description: e.message })
      }
    })
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button><Plus className='mr-2 h-4 w-4' />Nouveau contracteur</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Ajouter un contracteur</DialogTitle></DialogHeader>
      <form action={onSubmit} className='space-y-4'>
        <div><Label>Nom *</Label><Input name='full_name' required /></div>
        <div className='grid grid-cols-2 gap-3'>
          <div><Label>Courriel</Label><Input name='email' /></div>
          <div><Label>Téléphone</Label><Input name='phone' /></div>
        </div>
        <div><Label>Couleur calendrier</Label><Input type='color' name='color' defaultValue='#185FAD' className='h-10 p-1' /></div>
        <div className='space-y-2'>
          <Label>Compétences</Label>
          <div className='grid grid-cols-2 gap-2'>
            {SKILLS.map(s => <label key={s} className='flex items-center gap-2 text-sm'><Checkbox onCheckedChange={(v) => toggleSkill(s, !!v)} />{s}</label>)}
          </div>
        </div>
        <div><Label>Notes</Label><Textarea name='notes' /></div>
        <Button type='submit' disabled={isPending}>{isPending ? 'Création...' : 'Créer'}</Button>
      </form>
    </DialogContent>
  </Dialog>
}
