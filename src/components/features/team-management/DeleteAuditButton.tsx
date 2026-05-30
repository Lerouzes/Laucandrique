'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSyndicateAuditAction } from '@/actions/team-management'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteAuditButton({ auditId }: { auditId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet audit ? Cette action est irréversible.")) {
            return
        }
        setLoading(true)
        try {
            await deleteSyndicateAuditAction(auditId)
            alert("Audit supprimé avec succès.")
            router.push('/team-management/audits')
            router.refresh()
        } catch (err) {
            alert("Erreur lors de la suppression : " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button 
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-750 text-white text-xxs h-8 px-4 rounded-lg font-bold flex items-center gap-1.5 shadow-md transition-all"
        >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer l'Audit
        </Button>
    )
}
