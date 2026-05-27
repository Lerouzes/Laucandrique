// @ts-nocheck
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { deleteClientAction } from '@/actions/clients'

export function DeleteClientButton({ 
    clientId, 
    clientName,
    compact = false
}: { 
    clientId: string
    clientName: string
    compact?: boolean
}) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleDelete = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        startTransition(async () => {
            try {
                const res = await deleteClientAction(clientId)
                if (res.success) {
                    toast.success('Client supprimé avec succès.')
                    setIsOpen(false)
                    router.push('/clients')
                    router.refresh()
                } else {
                    toast.error('Erreur', { description: res.error })
                }
            } catch (err: any) {
                toast.error('Erreur', { description: err.message })
            }
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                {compact ? (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        title="Supprimer le client"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        className="bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2 h-10 rounded-xl"
                    >
                        <Trash2 className="h-4 w-4" />
                        Supprimer le client
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-400">
                        <ShieldAlert className="h-5 w-5 animate-pulse" />
                        Supprimer le client
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Êtes-vous sûr de vouloir supprimer le client <strong>{clientName}</strong> ?
                        <br />
                        <span className="text-red-400/80 font-medium text-xs mt-1 block">
                            Cette action est irréversible. Le client ne sera pas supprimé s'il est associé à des soumissions ou projets existants.
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="bg-zinc-950 border-t border-zinc-900 mt-2 pt-4">
                    <DialogClose asChild>
                        <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900" disabled={isPending}>
                            Annuler
                        </Button>
                    </DialogClose>
                    <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={isPending}
                        onClick={(e) => handleDelete(e)}
                        className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                    >
                        {isPending ? 'Suppression...' : 'Confirmer la suppression'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
