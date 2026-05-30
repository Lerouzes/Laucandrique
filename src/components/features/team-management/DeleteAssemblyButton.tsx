'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAssemblyEvaluationAction } from '@/actions/team-management'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { toast } from 'sonner'

export function DeleteAssemblyButton({ assemblyId }: { assemblyId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const handleDelete = async () => {
        setConfirmOpen(false)
        setLoading(true)
        try {
            await deleteAssemblyEvaluationAction(assemblyId)
            toast.success("Évaluation supprimée avec succès.")
            router.push('/team-management/assemblies')
            router.refresh()
        } catch (err) {
            toast.error("Erreur lors de la suppression", { description: (err as Error).message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button 
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xxs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5 shadow-md transition-all border border-rose-800/40"
            >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer l'Évaluation
            </Button>

            <ConfirmationDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Supprimer l'évaluation ?"
                description="Êtes-vous sûr de vouloir supprimer cette évaluation d'assemblée ? Cette action est irréversible."
                confirmText="Supprimer"
                cancelText="Annuler"
                onConfirm={handleDelete}
                loading={loading}
                variant="danger"
            />
        </>
    )
}
