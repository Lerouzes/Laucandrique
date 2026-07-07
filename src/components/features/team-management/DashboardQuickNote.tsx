'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createManagerNoteAction } from '@/actions/team-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Calendar, User, FileText, FolderOpen } from 'lucide-react'
import { SearchableManagerSelect } from './SearchableManagerSelect'
import { SearchableClientSelect } from './SearchableClientSelect'

interface Manager {
    id: string
    first_name: string
    last_name: string
}

interface Category {
    id: string
    name: string
}

interface Client {
    id: string
    company_name: string | null
    full_name: string | null
    manager_id: string | null
}

interface DashboardQuickNoteProps {
    managers: Manager[]
    categories: Category[]
    clients: Client[]
}

export function DashboardQuickNote({ managers = [], categories = [], clients = [] }: DashboardQuickNoteProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [managerId, setManagerId] = useState('')
    const [clientId, setClientId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [dateOccurred, setDateOccurred] = useState(new Date().toISOString().substring(0, 10))
    const [description, setDescription] = useState('')

    // Filter clients based on selected manager
    const filteredClients = managerId 
        ? clients.filter(c => c.manager_id === managerId)
        : clients

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!managerId) {
            toast.error("Veuillez sélectionner un gestionnaire.")
            return
        }
        if (!categoryId) {
            toast.error("Veuillez sélectionner une catégorie.")
            return
        }
        if (!description.trim()) {
            toast.error("Veuillez saisir une description.")
            return
        }

        startTransition(async () => {
            try {
                await createManagerNoteAction({
                    manager_id: managerId,
                    client_id: clientId || null,
                    category_id: categoryId,
                    date_occurred: dateOccurred,
                    description: description.trim()
                })

                toast.success("Note de suivi enregistrée avec succès !")
                // Reset description and client
                setDescription('')
                setClientId('')
                router.refresh()
            } catch (err: any) {
                toast.error("Erreur lors de l'enregistrement de la note", { description: err.message })
            }
        })
    }

    return (
        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md h-full flex flex-col justify-between">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="h-4 w-4 text-purple-400" />
                    Ajouter une Note de Suivi (1v1)
                </CardTitle>
                <CardDescription className="text-xxs text-zinc-400">
                    Saisissez une note ou un point de suivi pour un gestionnaire. Il sera automatiquement présenté lors de son prochain alignement 1v1.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Manager Select */}
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                            <User className="h-3 w-3 text-purple-400" />
                            Gestionnaire <span className="text-rose-500">*</span>
                        </Label>
                        <SearchableManagerSelect
                            managers={managers}
                            name="manager_id"
                            placeholder="Choisir un gestionnaire..."
                            required
                            defaultValue={managerId}
                            onChange={(val) => {
                                setManagerId(val)
                                setClientId('') // Clear selected client since manager changed
                            }}
                        />
                    </div>

                    {/* Syndicate (Client) Select (Optional) */}
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                            <FolderOpen className="h-3 w-3 text-purple-400" />
                            Syndicat / Client (Optionnel)
                        </Label>
                        <SearchableClientSelect
                            clients={filteredClients.map(c => ({
                                id: c.id,
                                name: c.company_name || c.full_name || 'Syndicat sans nom',
                                sdc: c.full_name || undefined
                            }))}
                            name="client_id"
                            placeholder="Aucun syndicat (Note globale)"
                            required={false}
                            defaultValue={clientId}
                            onChange={(val) => setClientId(val)}
                        />
                    </div>

                    {/* Category & Date in grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Category */}
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-purple-400" />
                                Catégorie <span className="text-rose-500">*</span>
                            </Label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                required
                                className="h-9 text-xs bg-zinc-950 border border-zinc-850 text-white rounded-lg px-2 w-full focus:outline-none focus:border-purple-500"
                            >
                                <option value="" disabled className="bg-zinc-950">Choisir...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-zinc-950">
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-purple-400" />
                                Date <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                value={dateOccurred}
                                onChange={(e) => setDateOccurred(e.target.value)}
                                required
                                className="h-9 text-xs bg-zinc-950 border-zinc-850 text-white rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Description Textarea */}
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-zinc-400">
                            Description de la note <span className="text-rose-500">*</span>
                        </Label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Entrez les détails ou consignes de suivi..."
                            required
                            rows={3}
                            className="w-full text-xs bg-zinc-950 border border-zinc-850 text-white rounded-lg p-2 focus:outline-none focus:border-purple-500 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs h-9 flex items-center justify-center gap-2 rounded-xl mt-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Plus className="h-3.5 w-3.5" />
                                Enregistrer la Note
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
