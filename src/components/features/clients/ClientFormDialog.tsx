// @ts-nocheck
'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createClientAction } from '@/actions/clients'

const clientSchema = z.object({
    full_name: z.string().min(2, 'Le SDC # est requis'),
    company_name: z.string().optional(),
    email: z.string().email('Courriel invalide').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postal_code: z.string().optional(),
    manager_id: z.string().optional(),
    operations_lead: z.string().optional(),
    doors_count: z.string().optional().or(z.literal('')),
})

export function ClientFormDialog({ managers = [] }: { managers?: any[] }) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const form = useForm<z.infer<typeof clientSchema>>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            full_name: '',
            company_name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            province: '',
            postal_code: '',
            manager_id: '',
            operations_lead: '',
            doors_count: '',
        },
    })

    function onSubmit(values: z.infer<typeof clientSchema>) {
        startTransition(async () => {
            try {
                const formData = new FormData()
                Object.entries(values).forEach(([key, value]) => {
                    if (value) formData.append(key, value as string)
                })
                if (values.manager_id) formData.append('manager_id', values.manager_id)

                const res = await createClientAction(formData)

                if (res && res.success === false) {
                    toast.error("Erreur serveur", { description: res.error })
                    return
                }

                toast.success("Client créé avec succès")
                setOpen(false)
                form.reset()
            } catch (error: any) {
                toast.error("Erreur inattendue", { description: error.message })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Ajouter un client</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Créez un nouveau profil client.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">SDC # *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="S007" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="company_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Nom complet</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Syndicat des copropriétaires Tonnacourt I" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="manager_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Gestionnaire</FormLabel>
                                        <FormControl>
                                            <select {...field} className="h-10 w-full rounded-md border bg-zinc-900 border-zinc-800 px-3 text-zinc-100">
                                                <option value="">Aucun</option>
                                                {managers.map((m: any) => (
                                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                                ))}
                                            </select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="operations_lead"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Chargé d'opération</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nom du chargé d'opération (Optionnel)" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="doors_count"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Nombre de portes</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="ex: 20" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Courriel</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="jean@example.com" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Téléphone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="514-555-0199" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="text-zinc-300">Adresse</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123 rue Principale" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Ville</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Montréal" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="province"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-300">Province</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Québec" {...field} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                                {isPending ? 'Création...' : 'Créer le client'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
