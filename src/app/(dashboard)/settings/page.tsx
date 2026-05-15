'use client'

import { useTransition, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSettings, updateSettingsAction } from '@/actions/settings'
import { getManagers, createManagerAction } from '@/actions/managers'

export default function SettingsPage() {
    const [isPending, startTransition] = useTransition()
    const [settingsId, setSettingsId] = useState<string | null>(null)
    const [managers, setManagers] = useState<any[]>([])

    const form = useForm({
        defaultValues: {
            company_name: '',
            default_admin_percentage: 10,
            default_profit_percentage: 15,
            gst_rate: 0.05,
            qst_rate: 0.09975,
            monthly_goal_enabled: false,
            monthly_goal_amount: 0
        }
    })

    useEffect(() => {
        getSettings().then(data => {
            if (data.id) setSettingsId(data.id)
            form.reset({
                company_name: data.company_name || 'Gustav Inc.',
                default_admin_percentage: data.default_admin_percentage || 10,
                default_profit_percentage: data.default_profit_percentage || 15,
                gst_rate: data.gst_rate || 0.05,
                qst_rate: data.qst_rate || 0.09975,
                monthly_goal_enabled: data.monthly_goal_enabled || false,
                monthly_goal_amount: data.monthly_goal_amount || 0
            })
        })
    }, [form])

    useEffect(() => {
        getManagers().then(setManagers)
    }, [])

    const onSubmit = (values: any) => {
        startTransition(async () => {
            try {
                const formData = new FormData()
                Object.entries(values).forEach(([key, value]) => formData.append(key, String(value)))
                await updateSettingsAction(formData, settingsId)
                toast.success("Paramètres mis à jour.")
            } catch (e: any) {
                toast.error("Erreur", { description: e.message })
            }
        })
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Paramètres</h2>
                <p className="text-sm text-zinc-400">
                    Configuration globale de l'entreprise et des valeurs par défaut.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-100">Entreprise</CardTitle>
                        <CardDescription className="text-zinc-400">Informations générales affichées sur les PDF.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Nom de l'entreprise *</Label>
                            <Input {...form.register('company_name')} required className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-100">Soumissions: Valeurs par défaut</CardTitle>
                        <CardDescription className="text-zinc-400">Marges et frais appliqués par défaut aux nouvelles soumissions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 grid grid-cols-2 gap-4">
                        <div className="space-y-2 mt-4">
                            <Label className="text-zinc-300">Administration (%)</Label>
                            <Input type="number" step="0.1" {...form.register('default_admin_percentage')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-600" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Profit (%)</Label>
                            <Input type="number" step="0.1" {...form.register('default_profit_percentage')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-600" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Taux TPS (décimal)</Label>
                            <Input type="number" step="0.001" {...form.register('gst_rate')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-600" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Taux TVQ (décimal)</Label>
                            <Input type="number" step="0.0001" {...form.register('qst_rate')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-600" />
                        </div>
                    </CardContent>
                </Card>


                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-100">Objectif mensuel</CardTitle>
                        <CardDescription className="text-zinc-400">Activez/désactivez l'objectif de revenus mensuels.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <label className="flex items-center gap-2 text-zinc-300">
                            <input type="checkbox" {...form.register('monthly_goal_enabled')} />
                            Activer les objectifs mensuels
                        </label>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Montant cible mensuel ($)</Label>
                            <Input type="number" step="1" {...form.register('monthly_goal_amount')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-600" />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                        <Save className="w-4 h-4 mr-2" />
                        {isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </div>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader><CardTitle className="text-zinc-100">Gestionnaires</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <form action={async (fd) => { await createManagerAction(fd); setManagers(await getManagers()) }} className="grid grid-cols-4 gap-2">
                            <Input name="first_name" placeholder="Prénom" required />
                            <Input name="last_name" placeholder="Nom" required />
                            <Input name="email" placeholder="Courriel" />
                            <Button type="submit">Ajouter</Button>
                        </form>
                        <div className="space-y-1 text-sm">{managers.map((m: any) => <div key={m.id}>{m.first_name} {m.last_name} — {m.email || '-'} </div>)}</div>
                    </CardContent>
                </Card>
            </form>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-zinc-100">Gestionnaires</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <form action={async (fd) => { await createManagerAction(fd); setManagers(await getManagers()) }} className="grid grid-cols-4 gap-2">
                        <Input name="first_name" placeholder="Prénom" required />
                        <Input name="last_name" placeholder="Nom" required />
                        <Input name="email" placeholder="Courriel" />
                        <Button type="submit">Ajouter</Button>
                    </form>
                    <div className="space-y-1 text-sm">{managers.map((m: any) => <div key={m.id}>{m.first_name} {m.last_name} — {m.email || '-'} </div>)}</div>
                </CardContent>
            </Card>
        </div>
    )
}
