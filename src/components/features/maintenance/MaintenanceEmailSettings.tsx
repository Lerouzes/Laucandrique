// @ts-nocheck
// src/components/features/maintenance/MaintenanceEmailSettings.tsx
'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
    Mail, 
    Settings, 
    Check, 
    AlertCircle, 
    Save, 
    Info, 
    Eye, 
    EyeOff, 
    ArrowRight, 
    Code, 
    FileText, 
    Workflow,
    Lock,
    ToggleLeft,
    ToggleRight,
    Loader2
} from 'lucide-react'
import { 
    updateEmailSettingsAction, 
    updateEmailTemplateAction, 
    updateEmailMappingAction 
} from '@/actions/maintenance'
import { cn } from '@/lib/utils'

interface Template {
    id: string
    name: string
    subject: string
    html_content: string
    created_at?: string
    updated_at?: string
}

interface Settings {
    id: string
    resend_api_key: string | null
    sender_email: string | null
    is_enabled: boolean
    mapping: Record<string, string> | null
    created_at?: string
    updated_at?: string
}

interface MaintenanceEmailSettingsProps {
    initialSettings: Settings | null
    initialTemplates: Template[]
}

const VARIABLES_LIST = [
    { name: '{{resident_name}}', desc: 'Nom complet du résident ou contact principal.' },
    { name: '{{unit_number}}', desc: 'Numéro de la porte / appartement.' },
    { name: '{{campaign_name}}', desc: 'Nom officiel de la campagne de maintenance.' },
    { name: '{{invite_link}}', desc: 'Lien unique d\'accès sécurisé au portail résident.' },
    { name: '{{deadline}}', desc: 'Date limite configurée pour la phase courante.' },
    { name: '{{appointment_date}}', desc: 'Date prévue de l\'intervention (format AAAA-MM-JJ).' },
    { name: '{{start_time}}', desc: 'Heure de début du rendez-vous (ex: 08:30).' },
    { name: '{{end_time}}', desc: 'Heure de fin estimée du rendez-vous (ex: 09:30).' },
    { name: '{{contractor_name}}', desc: 'Nom de l\'entrepreneur assigné aux travaux.' },
    { name: '{{contractor_company_name}}', desc: 'Nom de l\'entreprise de l\'entrepreneur en charge.' },
    { name: '{{contractor_phone}}', desc: 'Téléphone de l\'entrepreneur.' },
    { name: '{{contractor_email}}', desc: 'Courriel de l\'entrepreneur.' },
    { name: '{{syndicate_name}}', desc: 'Nom du syndicat de copropriété.' },
    { name: '{{client_address}}', desc: 'Adresse du syndicat de copropriété.' },
    { name: '{{services_list}}', desc: 'Liste des services requis séparés par des virgules.' },
    { name: '{{pricing}}', desc: 'Texte descriptif de la tarification applicable.' },
    { name: '{{notes}}', desc: 'Consignes de rendez-vous ou notes de contact.' },
]

export function MaintenanceEmailSettings({
    initialSettings,
    initialTemplates
}: MaintenanceEmailSettingsProps) {
    const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'mappings'>('config')

    // Refs for variable insertion
    const subjectRef = useRef<HTMLInputElement>(null)
    const htmlRef = useRef<HTMLTextAreaElement>(null)

    // Editor & Insertion tracking
    const [focusedInput, setFocusedInput] = useState<'subject' | 'html' | null>(null)
    const [selectionStart, setSelectionStart] = useState<number>(0)
    const [selectionEnd, setSelectionEnd] = useState<number>(0)
    const [editorMode, setEditorMode] = useState<'code' | 'preview'>('code')

    // API settings states
    const [apiKey, setApiKey] = useState(initialSettings?.resend_api_key || '')
    const [senderEmail, setSenderEmail] = useState(initialSettings?.sender_email || '')
    const [isEnabled, setIsEnabled] = useState(initialSettings?.is_enabled ?? true)
    const [showApiKey, setShowApiKey] = useState(false)
    const [isSavingSettings, setIsSavingSettings] = useState(false)

    // Template states
    const [templates, setTemplates] = useState<Template[]>(initialTemplates)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
        initialTemplates[0]?.id || ''
    )
    const activeTemplate = templates.find(t => t.id === selectedTemplateId)
    const [templateSubject, setTemplateSubject] = useState(activeTemplate?.subject || '')
    const [templateHtml, setTemplateHtml] = useState(activeTemplate?.html_content || '')
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)

    // Helper to insert variables at cursor position
    const insertVariable = (variableName: string) => {
        if (focusedInput === 'subject' && subjectRef.current) {
            const input = subjectRef.current
            const start = input.selectionStart ?? selectionStart
            const end = input.selectionEnd ?? selectionEnd
            const newValue = templateSubject.substring(0, start) + variableName + templateSubject.substring(end)
            setTemplateSubject(newValue)
            setTimeout(() => {
                input.focus()
                input.setSelectionRange(start + variableName.length, start + variableName.length)
            }, 50)
        } else if (focusedInput === 'html' && htmlRef.current) {
            const textarea = htmlRef.current
            const start = textarea.selectionStart ?? selectionStart
            const end = textarea.selectionEnd ?? selectionEnd
            const newValue = templateHtml.substring(0, start) + variableName + templateHtml.substring(end)
            setTemplateHtml(newValue)
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(start + variableName.length, start + variableName.length)
            }, 50)
        } else {
            setTemplateHtml(prev => prev + variableName)
        }
    }

    // Drag-and-drop drop handler
    const handleDrop = (e: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>, inputType: 'subject' | 'html') => {
        e.preventDefault()
        const variable = e.dataTransfer.getData('text/plain')
        if (!variable) return

        const target = e.currentTarget
        let dropIndex = target.value.length
        if (typeof target.selectionStart === 'number') {
            dropIndex = target.selectionStart
        }

        if (inputType === 'subject') {
            const newValue = templateSubject.substring(0, dropIndex) + variable + templateSubject.substring(dropIndex)
            setTemplateSubject(newValue)
        } else {
            const newValue = templateHtml.substring(0, dropIndex) + variable + templateHtml.substring(dropIndex)
            setTemplateHtml(newValue)
        }
    }

    // Visual preview variable compilation helper
    const getPreviewHtml = (html: string) => {
        let preview = html
        const samples: Record<string, string> = {
            resident_name: 'Jean Tremblay',
            unit_number: 'Apt 402',
            campaign_name: 'Inspection annuelle des gicleurs',
            invite_link: 'https://laucandrique.com/maintenance/invite/sample-token',
            deadline: '2026-06-30',
            appointment_date: '2026-06-25',
            start_time: '09:00',
            end_time: '10:00',
            contractor_name: 'Plomberie Pro Inc.',
            contractor_company_name: 'Plomberie Pro Inc.',
            contractor_phone: '514-555-0199',
            contractor_email: 'service@plomberiepro.com',
            syndicate_name: 'Syndicat Condos Laucandrique',
            client_address: '1234 Rue des Copropriétaires, Montréal, QC',
            services_list: 'Inspection des gicleurs, Remplacement de têtes',
            pricing: 'Gratuit (Pris en charge par le syndicat)',
            notes: 'Veuillez dégager l\'accès aux gicleurs dans les placards.',
        }
        Object.entries(samples).forEach(([key, val]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
            preview = preview.replace(regex, val)
        })
        preview = preview.replace(/{{#notes}}([\s\S]*?){{\/notes}}/g, '$1')
        return preview
    }

    // Mapping states
    const [mapping, setMapping] = useState<Record<string, string>>(
        (initialSettings?.mapping as Record<string, string>) || {
            new_campaign: '',
            participation_reminder: '',
            scheduling_invite: '',
            scheduling_reminder: '',
            service_incoming: '',
            booking_confirmation: ''
        }
    )
    const [isSavingMapping, setIsSavingMapping] = useState(false)

    // Handle active template selection change
    const handleSelectTemplate = (id: string) => {
        setSelectedTemplateId(id)
        const found = templates.find(t => t.id === id)
        if (found) {
            setTemplateSubject(found.subject)
            setTemplateHtml(found.html_content)
        }
    }

    // Save API Settings
    const handleSaveSettings = async () => {
        setIsSavingSettings(true)
        try {
            await updateEmailSettingsAction({
                resend_api_key: apiKey,
                sender_email: senderEmail,
                is_enabled: isEnabled
            })
            toast.success('Configuration API enregistrée avec succès.')
        } catch (error: any) {
            toast.error(`Erreur d'enregistrement : ${error.message}`)
        } finally {
            setIsSavingSettings(false)
        }
    }

    // Save Email Template
    const handleSaveTemplate = async () => {
        if (!selectedTemplateId) return
        setIsSavingTemplate(true)
        try {
            const updated = await updateEmailTemplateAction(selectedTemplateId, {
                subject: templateSubject,
                html_content: templateHtml
            })
            setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? updated : t))
            toast.success('Modèle d\'e-mail enregistré avec succès.')
        } catch (error: any) {
            toast.error(`Erreur d'enregistrement : ${error.message}`)
        } finally {
            setIsSavingTemplate(false)
        }
    }

    // Save Mappings
    const handleSaveMapping = async () => {
        setIsSavingMapping(true)
        try {
            await updateEmailMappingAction(mapping)
            toast.success('Correspondances des modèles mises à jour.')
        } catch (error: any) {
            toast.error(`Erreur d'enregistrement : ${error.message}`)
        } finally {
            setIsSavingMapping(false)
        }
    }

    const mappingKeys = [
        { key: 'new_campaign', label: 'Lancement de campagne', desc: 'Inviter les résidents à soumettre le sondage initial' },
        { key: 'participation_reminder', label: 'Rappel participation requis', desc: 'Rappeler aux résidents de répondre (Phase 1)' },
        { key: 'scheduling_invite', label: 'Invitation planification', desc: 'Notifier les résidents intéressés de choisir un rendez-vous (Phase 2)' },
        { key: 'scheduling_reminder', label: 'Rappel rendez-vous requis', desc: 'Rappeler de choisir un rendez-vous (Phase 2)' },
        { key: 'service_incoming', label: 'Notification d\'intervention à venir', desc: 'Détails du rendez-vous, entrepreneur, consigne' },
        { key: 'booking_confirmation', label: 'Confirmation de rendez-vous', desc: 'Confirmer la réservation du créneau ou sa modification' },
    ]

    return (
        <div className="grid grid-cols-1 gap-6">
            {/* Tabs Selector */}
            <div className="flex border-b border-zinc-800 gap-6">
                <button 
                    onClick={() => setActiveTab('config')}
                    className={cn(
                        "pb-3 text-sm font-semibold transition-all relative flex items-center gap-2",
                        activeTab === 'config' ? "text-amber-500 border-b-2 border-amber-500" : "text-zinc-400 hover:text-white"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    Configuration API
                </button>
                <button 
                    onClick={() => setActiveTab('templates')}
                    className={cn(
                        "pb-3 text-sm font-semibold transition-all relative flex items-center gap-2",
                        activeTab === 'templates' ? "text-amber-500 border-b-2 border-amber-500" : "text-zinc-400 hover:text-white"
                    )}
                >
                    <FileText className="h-4 w-4" />
                    Modèles d'e-mails
                </button>
                <button 
                    onClick={() => setActiveTab('mappings')}
                    className={cn(
                        "pb-3 text-sm font-semibold transition-all relative flex items-center gap-2",
                        activeTab === 'mappings' ? "text-amber-500 border-b-2 border-amber-500" : "text-zinc-400 hover:text-white"
                    )}
                >
                    <Workflow className="h-4 w-4" />
                    Correspondance
                </button>
            </div>

            {/* TAB CONTENT: API CONFIGURATION */}
            {activeTab === 'config' && (
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="border-b border-zinc-900 bg-zinc-950/10">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Lock className="h-4 w-4 text-purple-400" />
                            Réglages Resend & Activation
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Configurez la connexion et l'activation globale pour le service d'e-mails de Gustav.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Global activation state */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                            <div>
                                <h4 className="text-xs font-bold text-zinc-100">Activer l'envoi de courriels</h4>
                                <p className="text-xxs text-zinc-400 max-w-md">
                                    Si désactivé, aucun courriel ne sera transmis via l'API Resend, même en cas de déclenchement automatique ou manuel.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEnabled(!isEnabled)}
                                className="focus:outline-none transition-opacity hover:opacity-90"
                            >
                                {isEnabled ? (
                                    <ToggleRight className="h-10 w-10 text-amber-500" />
                                ) : (
                                    <ToggleLeft className="h-10 w-10 text-zinc-650" />
                                )}
                            </button>
                        </div>

                        {/* API Key */}
                        <div className="space-y-2">
                            <Label htmlFor="resend_api_key" className="text-xs font-bold text-zinc-300">
                                Clé API Resend
                            </Label>
                            <div className="relative">
                                <Input
                                    id="resend_api_key"
                                    type={showApiKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="re_123456789..."
                                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 pr-10 focus:border-zinc-700 focus:ring-zinc-700 text-xs font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200"
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <span className="text-[10px] text-zinc-500 block">
                                La clé d'autorisation obtenue sur la plateforme Resend (ex: re_Xxxx).
                            </span>
                        </div>

                        {/* Sender address */}
                        <div className="space-y-2">
                            <Label htmlFor="sender_email" className="text-xs font-bold text-zinc-300">
                                Adresse de l'expéditeur (From)
                            </Label>
                            <Input
                                id="sender_email"
                                type="email"
                                value={senderEmail}
                                onChange={(e) => setSenderEmail(e.target.value)}
                                placeholder="notifications@votredomaine.com"
                                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:border-zinc-700 focus:ring-zinc-700 text-xs"
                            />
                            <span className="text-[10px] text-zinc-500 block">
                                Assurez-vous que le domaine est validé et autorisé sur votre tableau de bord Resend.
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-zinc-900 bg-zinc-950/10 flex justify-end">
                        <Button
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl"
                        >
                            {isSavingSettings ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5 mr-2" />
                                    Enregistrer la configuration
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* TAB CONTENT: EMAIL TEMPLATE EDITOR */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left templates list pane (4 columns) */}
                    <div className="lg:col-span-3 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Sélectionner un modèle</span>
                        <div className="space-y-2">
                            {templates.map(t => {
                                const isSelected = t.id === selectedTemplateId
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSelectTemplate(t.id)}
                                        className={cn(
                                            "w-full text-left p-3.5 rounded-xl border transition-all text-xs",
                                            isSelected 
                                                ? "bg-purple-950/15 border-purple-500/60 text-white" 
                                                : "bg-[#16171e]/70 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                                        )}
                                    >
                                        <div className="font-extrabold block text-zinc-150 mb-1">{t.name}</div>
                                        <div className="text-[10px] text-zinc-500 line-clamp-1">{t.subject}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Middle template edit pane (6 columns) */}
                    <div className="lg:col-span-6 space-y-4">
                        {activeTemplate ? (
                            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                                <CardHeader className="border-b border-zinc-900 bg-zinc-950/10">
                                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                                        <span>Modifier : {activeTemplate.name}</span>
                                        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-850 gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditorMode('code')}
                                                className={cn(
                                                    "px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-1 cursor-pointer",
                                                    editorMode === 'code' ? "bg-purple-950/40 border border-purple-800/40 text-purple-300 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                                )}
                                            >
                                                <Code className="h-3 w-3" />
                                                Code HTML
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditorMode('preview')}
                                                className={cn(
                                                    "px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-1 cursor-pointer",
                                                    editorMode === 'preview' ? "bg-purple-950/40 border border-purple-800/40 text-purple-300 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                                )}
                                            >
                                                <Eye className="h-3 w-3" />
                                                Visuel
                                            </button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {/* Subject */}
                                    <div className="space-y-2">
                                        <Label htmlFor="tpl_subject" className="text-xs font-bold text-zinc-300">
                                            Objet du courriel
                                        </Label>
                                        <Input
                                            id="tpl_subject"
                                            ref={subjectRef}
                                            value={templateSubject}
                                            onChange={(e) => setTemplateSubject(e.target.value)}
                                            onFocus={() => setFocusedInput('subject')}
                                            onSelect={(e) => {
                                                setSelectionStart(e.currentTarget.selectionStart ?? 0)
                                                setSelectionEnd(e.currentTarget.selectionEnd ?? 0)
                                            }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, 'subject')}
                                            className="bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:border-zinc-700 text-xs font-semibold"
                                        />
                                    </div>

                                    {/* HTML Body */}
                                    <div className="space-y-2">
                                        <Label htmlFor="tpl_html" className="text-xs font-bold text-zinc-300">
                                            Corps HTML
                                        </Label>
                                        {editorMode === 'code' ? (
                                            <Textarea
                                                id="tpl_html"
                                                ref={htmlRef}
                                                value={templateHtml}
                                                onChange={(e) => setTemplateHtml(e.target.value)}
                                                onFocus={() => setFocusedInput('html')}
                                                onSelect={(e) => {
                                                    setSelectionStart(e.currentTarget.selectionStart ?? 0)
                                                    setSelectionEnd(e.currentTarget.selectionEnd ?? 0)
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDrop(e, 'html')}
                                                rows={20}
                                                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:border-zinc-700 text-xxs font-mono leading-relaxed animate-in fade-in duration-200"
                                            />
                                        ) : (
                                            <div className="w-full bg-white rounded-xl border border-zinc-800 overflow-hidden shadow-inner animate-in fade-in duration-200">
                                                <iframe
                                                    title="Aperçu du courriel"
                                                    srcDoc={getPreviewHtml(templateHtml)}
                                                    className="w-full h-[500px] bg-white border-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t border-zinc-900 bg-zinc-950/10 flex justify-end">
                                    <Button
                                        onClick={handleSaveTemplate}
                                        disabled={isSavingTemplate}
                                        className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl"
                                    >
                                        {isSavingTemplate ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                                Enregistrement...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-3.5 w-3.5 mr-2" />
                                                Enregistrer ce modèle
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/10 text-zinc-500">
                                Sélectionnez un modèle d'e-mail dans la colonne de gauche pour commencer à l'éditer.
                            </div>
                        )}
                    </div>

                    {/* Right variables explanation sidebar (3 columns) */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/10">
                                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Code className="h-4 w-4 text-amber-500" />
                                    Variables de fusion
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 max-h-[500px] overflow-y-auto space-y-3.5 scrollbar-thin">
                                <p className="text-[10px] text-zinc-400">
                                    Insérez ces balises dynamiques dans l'objet ou le corps HTML. Gustav les interpolera avec les données de la base avant l'envoi.
                                </p>
                                <div className="space-y-3 divide-y divide-zinc-850/50">
                                    {VARIABLES_LIST.map(v => (
                                        <div
                                            key={v.name}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', v.name)
                                            }}
                                            onClick={() => insertVariable(v.name)}
                                            className="pt-2 text-xxs first:pt-0 cursor-grab active:cursor-grabbing hover:bg-zinc-900 p-1.5 rounded-lg transition-colors group flex flex-col"
                                        >
                                            <div className="flex items-center justify-between">
                                                <code className="text-amber-400 font-bold block mb-0.5 group-hover:text-amber-300">{v.name}</code>
                                                <span className="text-[9px] text-zinc-550 opacity-0 group-hover:opacity-100 transition-opacity">Glisser / Cliquer</span>
                                            </div>
                                            <span className="text-zinc-450 block leading-normal">{v.desc}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-3 bg-amber-950/10 border border-amber-900/35 rounded-xl mt-4 text-[10px] space-y-1">
                                    <span className="font-extrabold text-amber-400 block flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Bloc Conditionnel (notes)
                                    </span>
                                    <p className="text-zinc-400 leading-normal text-xxs">
                                        Vous pouvez masquer une section si les notes sont vides :
                                    </p>
                                    <code className="text-zinc-300 font-mono text-[9px] block bg-zinc-900 p-1 rounded mt-1 border border-zinc-800/80 whitespace-pre">
                                        {`{{#notes}}
Note : {{notes}}
{{/notes}}`}
                                    </code>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: MAPPING DEFINITIONS */}
            {activeTab === 'mappings' && (
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="border-b border-zinc-900 bg-zinc-950/10">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Workflow className="h-4 w-4 text-purple-400" />
                            Association des déclencheurs
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Configurez quel modèle de courriel est envoyé pour chacune des fonctions d'automations de Gustav.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {mappingKeys.map(item => (
                                <div key={item.key} className="p-4 bg-zinc-900/35 border border-zinc-850 rounded-xl space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-200 block mb-0.5">
                                            {item.label}
                                        </label>
                                        <span className="text-[10px] text-zinc-450 block leading-tight">
                                            {item.desc}
                                        </span>
                                    </div>
                                    <select
                                        value={mapping[item.key] || ''}
                                        onChange={(e) => setMapping(prev => ({ ...prev, [item.key]: e.target.value }))}
                                        className="w-full h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 outline-none focus:border-zinc-700 transition-colors"
                                    >
                                        <option value="">-- Aucun courriel (Désactivé) --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-zinc-900 bg-zinc-950/10 flex justify-end">
                        <Button
                            onClick={handleSaveMapping}
                            disabled={isSavingMapping}
                            className="bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl"
                        >
                            {isSavingMapping ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5 mr-2" />
                                    Enregistrer les correspondances
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}
