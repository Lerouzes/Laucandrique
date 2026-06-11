'use client'

import { useTransition, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { 
    Save, 
    Users, 
    Layers, 
    UserCheck, 
    Wrench, 
    Trash2, 
    Search, 
    Sliders, 
    FileSpreadsheet, 
    RefreshCw, 
    List,
    Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getSettings, updateSettingsAction } from '@/actions/settings'
import Link from 'next/link'
import { getManagers, createManagerAction, getManagerTeams, createManagerTeamAction } from '@/actions/managers'
import { fixExistingImportedQuotesAction } from '@/actions/quotes'
import { createClient } from '@/utils/supabase/client'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

// Clients & Snapshots Imports
import { getClients } from '@/actions/clients'
import { ClientsTable } from '@/components/features/clients/ClientsTable'
import { ClientFormDialog } from '@/components/features/clients/ClientFormDialog'
import { getSnapshotsAction } from '@/actions/snapshots'
import { SnapshotWorkspace } from '@/components/features/settings/SnapshotWorkspace'

// Tabs component
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

async function loadTemplateAsBlobUrl(url: string): Promise<string> {
    if (!url) return ''
    try {
        if (url.startsWith('data:')) {
            const parts = url.split(',')
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf'
            const base64Data = parts[1]
            const binaryString = atob(base64Data)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: mime })
            return URL.createObjectURL(blob)
        } else {
            const response = await fetch(url)
            const blob = await response.blob()
            return URL.createObjectURL(blob)
        }
    } catch (e) {
        console.error('Error converting url to blobUrl:', e)
        return url
    }
}

export default function SettingsPage() {
    const supabase = createClient()
    const [isPending, startTransition] = useTransition()
    const [settingsId, setSettingsId] = useState<string | null>(null)
    const [managers, setManagers] = useState<any[]>([])
    const [managerTeams, setManagerTeams] = useState<any[]>([])
    const [templatePreview, setTemplatePreview] = useState<string>('')
    const [templateBlobUrl, setTemplateBlobUrl] = useState<string>('')
    const [isCreatingManager, setIsCreatingManager] = useState(false)
    const [isDeletingManagerId, setIsDeletingManagerId] = useState<string | null>(null)
    const [managerToDelete, setManagerToDelete] = useState<{ id: string, name: string } | null>(null)

    // Clients, Snapshots, Search, User state
    const [clients, setClients] = useState<any[]>([])
    const [snapshots, setSnapshots] = useState<any[]>([])
    const [searchVal, setSearchVal] = useState('')
    const [activeTab, setActiveTab] = useState('clients')
    const [userRole, setUserRole] = useState<string>('Agent')

    const form = useForm({
        defaultValues: {
            company_name: '',
            default_admin_percentage: 10,
            default_profit_percentage: 15,
            gst_rate: 0.05,
            qst_rate: 0.09975,
            monthly_goal_enabled: false,
            monthly_goal_amount: 0,
            work_types_options: '',
            pdf_template_url: '',
        }
    })

    // Fetch user role
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
                    if (data?.role) setUserRole(data.role)
                })
            }
        })
    }, [])

    // Fetch config on mount
    useEffect(() => {
        getSettings().then(data => {
            if (data.id) setSettingsId(data.id)
            
            const localTemplate = typeof window !== 'undefined' ? localStorage.getItem('pdf_template_url') || '' : ''
            const dbTemplateUrl = data.pdf_template_url || ''
            const activeTemplate = dbTemplateUrl || localTemplate

            form.reset({
                company_name: data.company_name || 'Gustav Inc.',
                default_admin_percentage: data.default_admin_percentage || 10,
                default_profit_percentage: data.default_profit_percentage || 15,
                gst_rate: data.gst_rate || 0.05,
                qst_rate: data.qst_rate || 0.09975,
                monthly_goal_enabled: data.monthly_goal_enabled || false,
                monthly_goal_amount: data.monthly_goal_amount || 0,
                work_types_options: Array.isArray(data.work_types_options) ? data.work_types_options.join(', ') : '',
                pdf_template_url: activeTemplate,
            })

            if (activeTemplate) {
                setTemplatePreview(activeTemplate)
                const isPdf = activeTemplate.startsWith('data:application/pdf') || 
                              activeTemplate.startsWith('data:application/octet-stream') ||
                              activeTemplate.toLowerCase().includes('.pdf') ||
                              activeTemplate.split(',')[1]?.startsWith('JVBERi')
                if (isPdf) {
                    loadTemplateAsBlobUrl(activeTemplate).then(setTemplateBlobUrl)
                }
            }
        })
    }, [form])

    // Load managers and teams
    useEffect(() => {
        getManagers(true).then(setManagers)
        getManagerTeams().then(setManagerTeams)
    }, [])

    // Refresh clients / snapshots on activeTab or searchVal updates
    useEffect(() => {
        if (activeTab === 'clients') {
            getClients(searchVal).then(setClients)
        } else if (activeTab === 'snapshots') {
            getSnapshotsAction().then(setSnapshots)
        }
    }, [activeTab, searchVal])

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
        const isImg = file.type.startsWith('image/')
        
        if (!isPdf && !isImg) {
            toast.error("Format non supporté", {
                description: "Veuillez sélectionner un fichier PDF ou une image (PNG/JPEG)."
            })
            return
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `template-${Date.now()}.${fileExt}`

        toast.promise(
            (async () => {
                const { error: uploadError } = await supabase.storage.from('quote-images').upload(fileName, file)
                if (uploadError) throw uploadError
                
                const { data: publicUrlData } = supabase.storage.from('quote-images').getPublicUrl(fileName)
                const publicUrl = publicUrlData.publicUrl
                
                form.setValue('pdf_template_url', publicUrl, { shouldDirty: true })
                setTemplatePreview(publicUrl)
                
                if (isPdf) {
                    const blobUrl = await loadTemplateAsBlobUrl(publicUrl)
                    setTemplateBlobUrl(blobUrl)
                } else {
                    setTemplateBlobUrl('')
                }
            })(),
            {
                loading: 'Téléchargement du gabarit...',
                success: 'Gabarit de template téléchargé avec succès!',
                error: 'Erreur lors du téléchargement'
            }
        )
    }

    const onSubmit = (values: any) => {
        startTransition(async () => {
            try {
                const formData = new FormData()
                Object.entries(values).forEach(([key, value]) => formData.append(key, String(value)))
                await updateSettingsAction(formData, settingsId)
                
                const freshSettings = await getSettings()
                if (freshSettings.id) setSettingsId(freshSettings.id)
                
                toast.success("Paramètres mis à jour.")
            } catch (e: any) {
                toast.error("Erreur", { description: e.message })
            }
        })
    }

    const handleCreateManager = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (isCreatingManager) return
        setIsCreatingManager(true)
        const formEl = e.currentTarget
        const fd = new FormData(formEl)
        try {
            const result = await createManagerAction(fd)
            const createdManager = result?.manager
            if (createdManager) {
                const selectedTeamId = String(fd.get('team_id') || '')
                const selectedTeam = selectedTeamId ? managerTeams.find((t: any) => String(t.id) === selectedTeamId) : null
                setManagers(prev => [{ ...createdManager, manager_teams: selectedTeam || null }, ...prev])
            } else {
                setManagers(await getManagers(true))
            }
            toast.success('Gestionnaire ajouté avec succès!')
            formEl.reset()
        } catch (err: any) {
            toast.error('Erreur', { description: err.message || "Impossible d'ajouter le gestionnaire." })
        } finally {
            setIsCreatingManager(false)
        }
    }

    const handleDeleteManager = async (id: string, name: string) => {
        setIsDeletingManagerId(id)
        try {
            const { deleteManagerAction } = await import('@/actions/managers')
            const res = await deleteManagerAction(id)
            if (res && res.success) {
                setManagers(prev => prev.filter(m => m.id !== id))
                toast.success(`Le gestionnaire "${name}" a été supprimé avec succès.`)
            }
        } catch (err: any) {
            toast.error('Erreur', { description: err.message || "Impossible de supprimer le gestionnaire." })
        } finally {
            setIsDeletingManagerId(null)
            setManagerToDelete(null)
        }
    }

    const handleCreateManagerTeam = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        try {
            const result = await createManagerTeamAction(fd)
            const createdTeam = result?.team
            if (createdTeam) {
                setManagerTeams(prev => {
                    const next = [...prev, createdTeam]
                    return next.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'fr-CA'))
                })
            } else {
                setManagerTeams(await getManagerTeams())
            }
            toast.success('Équipe ajoutée.')
            e.currentTarget.reset()
        } catch (e: any) {
            toast.error('Erreur', { description: e.message || "Impossible d'ajouter l'équipe." })
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Paramètres & Snapshot</h2>
                <p className="text-sm text-zinc-400">
                    Gérez la liste maîtresse des clients, synchronisez par snapshots Excel, ou configurez les paramètres globaux.
                </p>
            </div>

            <Tabs defaultValue="clients" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="bg-zinc-950 border border-zinc-850 p-1 flex justify-start gap-1 w-fit rounded-xl">
                    <TabsTrigger value="clients" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                        <List className="h-4 w-4" />
                        Client Master List
                    </TabsTrigger>
                    <TabsTrigger value="snapshots" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                        <FileSpreadsheet className="h-4 w-4" />
                        Snapshots Excel & Sync
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                        <Sliders className="h-4 w-4" />
                        Paramètres Généraux
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: CLIENT MASTER LIST */}
                <TabsContent value="clients" className="space-y-4 outline-none">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input
                                type="search"
                                placeholder="Rechercher un client..."
                                className="w-full bg-zinc-950 border-zinc-800 text-zinc-100 pl-9 placeholder:text-zinc-500 focus-visible:ring-zinc-700 focus-visible:border-transparent text-xs"
                                value={searchVal}
                                onChange={(e) => setSearchVal(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => getClients(searchVal).then(setClients)}
                                className="border-zinc-850 text-zinc-300 bg-zinc-950/20 hover:bg-zinc-950/60"
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                Actualiser
                            </Button>
                            <ClientFormDialog managers={managers} />
                        </div>
                    </div>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-0">
                            <ClientsTable data={clients} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: SNAPSHOTS */}
                <TabsContent value="snapshots" className="outline-none">
                    <SnapshotWorkspace 
                        snapshots={snapshots} 
                        managers={managers} 
                        existingClients={clients}
                        currentUserRole={userRole}
                    />
                </TabsContent>

                {/* TAB 3: CONFIGURATION */}
                <TabsContent value="config" className="space-y-6 outline-none max-w-3xl">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <input type="hidden" {...form.register('pdf_template_url')} />
                        
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-100">Entreprise</CardTitle>
                                <CardDescription className="text-zinc-400">Informations générales affichées sur les PDF.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Nom de l'entreprise *</Label>
                                    <Input {...form.register('company_name')} required className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-100">Types de travaux</CardTitle>
                                <CardDescription className="text-zinc-400">Configurez les types de travaux sélectionnables dans les soumissions.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Types de travaux (séparés par des virgules)</Label>
                                    <Input {...form.register('work_types_options')} placeholder="Peinture, Plâtre, Maçonnerie..." className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                    <p className="text-xs text-zinc-500">Ex: Peinture, Plâtre, Maçonnerie, Menuiserie</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-100">Gabarit de template PDF / Image</CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Ajoutez un gabarit (format PDF, PNG ou JPEG) pour personnaliser le look de vos PDF.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input type="file" accept="image/*,application/pdf" onChange={handleTemplateUpload} className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs" />
                                {templatePreview && (
                                    (templatePreview.startsWith('data:application/pdf') || 
                                     templatePreview.startsWith('data:application/octet-stream') ||
                                     templatePreview.toLowerCase().includes('.pdf') ||
                                     templatePreview.split(',')[1]?.startsWith('JVBERi')) ? (
                                        <div className="w-full h-96 rounded border border-zinc-800 overflow-hidden bg-zinc-950">
                                            {templateBlobUrl && <iframe src={`${templateBlobUrl}#toolbar=0`} className="w-full h-full border-0" />}
                                        </div>
                                    ) : (
                                        <img src={templatePreview} alt="Template preview" className="max-h-40 rounded border border-zinc-800" />
                                    )
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-100">Soumissions: Valeurs par défaut</CardTitle>
                                <CardDescription className="text-zinc-400">Marges et taux appliqués par défaut aux nouvelles soumissions.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 grid grid-cols-2 gap-4">
                                <div className="space-y-2 mt-4">
                                    <Label className="text-zinc-300">Administration (%)</Label>
                                    <Input type="number" step="0.1" {...form.register('default_admin_percentage')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Profit (%)</Label>
                                    <Input type="number" step="0.1" {...form.register('default_profit_percentage')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Taux TPS (décimal)</Label>
                                    <Input type="number" step="0.001" {...form.register('gst_rate')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Taux TVQ (décimal)</Label>
                                    <Input type="number" step="0.0001" {...form.register('qst_rate')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-100">Objectif mensuel</CardTitle>
                                <CardDescription className="text-zinc-400">Configurez la cible de revenus mensuels.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <label className="flex items-center gap-2 text-zinc-300 text-xs">
                                    <input type="checkbox" {...form.register('monthly_goal_enabled')} className="rounded border-zinc-800 text-purple-600 focus:ring-purple-650" />
                                    Activer les objectifs mensuels
                                </label>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Montant cible mensuel ($)</Label>
                                    <Input type="number" step="1" {...form.register('monthly_goal_amount')} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                                <Save className="w-4 h-4 mr-2" />
                                {isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                        </div>
                    </form>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-purple-400" />
                                Maintenance & Actions
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                Actions de groupe pour nettoyer ou recalculer les soumissions importées.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col space-y-2">
                                <p className="text-xs text-zinc-400">
                                    Calcule et applique automatiquement les taxes (TPS/TVQ) et les marges d'administration/profit sur toutes les soumissions importées non allouées.
                                </p>
                                <div className="flex justify-start">
                                    <Button 
                                        type="button" 
                                        variant="secondary"
                                        disabled={isPending}
                                        onClick={() => {
                                            startTransition(async () => {
                                                try {
                                                    const res = await fixExistingImportedQuotesAction()
                                                    if (res.success) {
                                                        toast.success(`${res.count} soumission(s) mise(s) à jour avec succès!`)
                                                    } else {
                                                        toast.error('Erreur lors de la mise à jour', { description: res.error })
                                                    }
                                                } catch (err: any) {
                                                    toast.error('Erreur', { description: err.message })
                                                }
                                            })
                                        }}
                                        className="bg-zinc-850 text-zinc-100 hover:bg-zinc-800 text-xs font-semibold"
                                    >
                                        <Wrench className="w-4 h-4 mr-2" />
                                        Calculer taxes & marges des soumissions importées
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ÉQUIPES & GESTIONNAIRES */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-400" />
                                Équipes & Gestionnaires
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                Gérez vos équipes et vos gestionnaires de projets.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* ÉQUIPES */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider block border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
                                    <Layers className="h-4 w-4 text-purple-400" />
                                    1. Équipes
                                </h4>
                                
                                <form onSubmit={handleCreateManagerTeam} className="flex gap-2 max-w-md">
                                    <Input name="team_name" placeholder="Nom de la nouvelle équipe" required className="bg-zinc-950 border-zinc-850 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                    <Button type="submit" variant="secondary" className="shrink-0 bg-zinc-850 text-zinc-100 hover:bg-zinc-800 text-xs">
                                        Ajouter l'équipe
                                    </Button>
                                </form>

                                <div className="flex flex-wrap gap-2 text-xs">
                                    {managerTeams.length === 0 ? (
                                        <span className="text-xs text-zinc-500 italic">Aucune équipe configurée.</span>
                                    ) : (
                                        managerTeams.map((t: any) => (
                                            <Badge key={t.id} variant="secondary" className="bg-zinc-950 border border-zinc-850 text-zinc-350 px-2.5 py-1 flex items-center gap-1.5">
                                                <Layers className="h-3 w-3 text-purple-400" />
                                                {t.name}
                                            </Badge>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* GESTIONNAIRES */}
                            <div className="space-y-4 pt-4 border-t border-zinc-850">
                                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider block border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
                                    <UserCheck className="h-4 w-4 text-purple-400" />
                                    2. Gestionnaires de Projet
                                </h4>

                                <form onSubmit={handleCreateManager} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    <Input name="first_name" placeholder="Prénom *" required className="bg-zinc-950 border-zinc-850 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                    <Input name="last_name" placeholder="Nom *" required className="bg-zinc-950 border-zinc-850 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                    <Input name="email" type="email" placeholder="Courriel (Optionnel)" className="bg-zinc-950 border-zinc-850 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                    <Input name="phone" placeholder="Téléphone (Optionnel)" className="bg-zinc-950 border-zinc-850 text-zinc-100 focus-visible:ring-zinc-700 text-xs" />
                                    <select name="team_id" className="h-10 rounded-lg border border-zinc-850 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-700">
                                        <option value="" className="bg-zinc-900 text-zinc-400">Sans équipe (Individuel)</option>
                                        {managerTeams.map((t: any) => (
                                            <option key={t.id} value={t.id} className="bg-zinc-900 text-zinc-100">
                                                Équipe: {t.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button type="submit" disabled={isCreatingManager} className="bg-purple-600 text-white hover:bg-purple-700 text-xs">
                                        {isCreatingManager ? 'Ajout...' : 'Ajouter le gestionnaire'}
                                    </Button>
                                </form>

                                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
                                    {managers.length === 0 ? (
                                        <p className="text-xs text-zinc-500 italic">Aucun gestionnaire configuré.</p>
                                    ) : (
                                        managers.map((m: any) => (
                                            <div
                                                key={m.id}
                                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border border-zinc-850 bg-zinc-950/40 hover:border-zinc-750 transition-all gap-2"
                                            >
                                                <Link
                                                    href={`/managers/${m.id}`}
                                                    className="flex-1 space-y-0.5"
                                                >
                                                    <p className="text-xs font-semibold text-zinc-250 hover:text-purple-400 transition-colors">{m.first_name} {m.last_name}</p>
                                                    <p className="text-[10px] text-zinc-500">
                                                        {m.email && <span className="mr-3">{m.email}</span>}
                                                        {m.phone && <span>{m.phone}</span>}
                                                    </p>
                                                </Link>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant="outline" className={`text-[9px] px-2 py-0.5 ${m.manager_teams?.name ? 'bg-purple-950/20 text-purple-300 border-purple-800' : 'bg-zinc-950 text-zinc-400 border-zinc-850'}`}>
                                                        {m.manager_teams?.name || 'Individuel'}
                                                    </Badge>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        disabled={isDeletingManagerId === m.id || !!managerToDelete}
                                                        onClick={() => setManagerToDelete({ id: m.id, name: `${m.first_name} ${m.last_name}` })}
                                                        className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmationDialog
                open={!!managerToDelete}
                onOpenChange={(open) => !open && setManagerToDelete(null)}
                title="Supprimer le gestionnaire"
                description={managerToDelete ? `Êtes-vous sûr de vouloir supprimer le gestionnaire "${managerToDelete.name}" ? Cette action est irréversible et retirera son assignation des syndicats et soumissions.` : ''}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                loading={isDeletingManagerId !== null}
                onConfirm={() => {
                    if (managerToDelete) {
                        handleDeleteManager(managerToDelete.id, managerToDelete.name)
                    }
                }}
            />
        </div>
    )
}
