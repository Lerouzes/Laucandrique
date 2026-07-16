'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, Save, Bot, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { getAISettings, updateAISettingsAction } from '@/actions/ai-settings'

const AI_ENGINES = [
    {
        id: 'Google Gemini 1.5 Pro',
        name: 'Google Gemini 1.5 Pro',
        provider: 'Google AI',
        desc: 'Modèle multimodal optimisé pour des raisonnements complexes et de longs contextes.',
        color: 'from-blue-600 to-cyan-500',
        badgeColor: 'bg-cyan-950/60 text-cyan-400 border-cyan-900',
        glowColor: 'shadow-cyan-500/10 border-cyan-500/40'
    },
    {
        id: 'OpenAI GPT-4o',
        name: 'OpenAI GPT-4o',
        provider: 'OpenAI',
        desc: 'Modèle hautement performant idéal pour les tâches de raisonnement logique rapide.',
        color: 'from-emerald-600 to-teal-500',
        badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-900',
        glowColor: 'shadow-emerald-500/10 border-emerald-500/40'
    },
    {
        id: 'Anthropic Claude 3.5 Sonnet',
        name: 'Anthropic Claude 3.5 Sonnet',
        provider: 'Anthropic',
        desc: 'Modèle excellent en rédaction de courriels et en nuances de ton professionnel.',
        color: 'from-orange-600 to-amber-500',
        badgeColor: 'bg-orange-950/60 text-orange-400 border-orange-900',
        glowColor: 'shadow-orange-500/10 border-orange-500/40'
    }
]

export default function AISettingsPage() {
    const supabase = createClient()
    const router = useRouter()
    const [settingsId, setSettingsId] = useState<string | null>(null)
    const [selectedEngine, setSelectedEngine] = useState<string>('Google Gemini 1.5 Pro')
    const [systemPrompt, setSystemPrompt] = useState<string>('')
    const [rolePrompt, setRolePrompt] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSaving, startSavingTransition] = useTransition()

    // Fetch user and profile role, redirect if unauthorized
    useEffect(() => {
        let isMounted = true
        
        async function verifyAccessAndLoad() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                const role = (profile?.role || '').toLowerCase()
                if (role !== 'master' && role !== 'direction') {
                    router.push('/manager/command-center')
                    toast.error("Accès non autorisé aux paramètres de calibrage IA.")
                    return
                }

                const aiData = await getAISettings()
                if (!isMounted) return
                setSettingsId(aiData.id)
                setSelectedEngine(aiData.ai_engine)
                setSystemPrompt(aiData.global_system_prompt)
                setRolePrompt(aiData.role_behavior_prompt)
                setIsLoading(false)
            } catch (err) {
                console.error('Failed to verify role or load settings:', err)
                if (isMounted) {
                    toast.error('Erreur lors du chargement des paramètres.')
                    setIsLoading(false)
                }
            }
        }

        verifyAccessAndLoad()

        return () => {
            isMounted = false
        }
    }, [router, supabase])

    const handleSave = () => {
        startSavingTransition(async () => {
            try {
                const res = await updateAISettingsAction(settingsId, {
                    ai_engine: selectedEngine,
                    global_system_prompt: systemPrompt,
                    role_behavior_prompt: rolePrompt
                })
                if (res.success) {
                    toast.success('Paramètres IA enregistrés avec succès !')
                } else {
                    toast.error("Une erreur s'est produite lors de l'enregistrement.")
                }
            } catch (err: any) {
                console.error(err)
                toast.error(err.message || "Erreur de connexion au serveur.")
            }
        })
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-zinc-405 text-zinc-400">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Validation des autorisations et chargement des données...</p>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in-50 duration-300 overflow-y-auto h-full max-h-screen">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/60 pb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Cpu className="h-6 w-6 text-indigo-400" />
                        Calibrage du Copilote IA
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Ajustez le moteur d'intelligence artificielle et configurez les instructions de base sans déploiement de code.
                    </p>
                </div>
                <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="relative shrink-0 font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 border-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-10 px-6 cursor-pointer"
                >
                    {isSaving ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Enregistrer
                        </>
                    )}
                </Button>
            </div>

            {/* Model Selector Card Grid */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Moteur de Raisonnement Actif
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {AI_ENGINES.map((engine) => {
                        const isSelected = selectedEngine === engine.id
                        return (
                            <button
                                key={engine.id}
                                onClick={() => setSelectedEngine(engine.id)}
                                className={`text-left rounded-2xl border bg-zinc-950/40 backdrop-blur-md p-5 transition-all duration-300 hover:bg-zinc-900/30 flex flex-col justify-between group outline-none ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                                    isSelected 
                                        ? `border-indigo-500/50 shadow-2xl ${engine.glowColor}`
                                        : 'border-zinc-850 hover:border-zinc-700'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[10px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-full ${engine.badgeColor}`}>
                                            {engine.provider}
                                        </span>
                                        <div className={`h-2.5 w-2.5 rounded-full border border-black/40 ${
                                            isSelected ? 'bg-indigo-500 ring-4 ring-indigo-500/20' : 'bg-zinc-800'
                                        }`} />
                                    </div>
                                    <h4 className="text-sm font-bold text-zinc-150 group-hover:text-white transition-colors">
                                        {engine.name}
                                    </h4>
                                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                                        {engine.desc}
                                    </p>
                                </div>
                                <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${engine.color} mt-6 transition-all duration-300 ${
                                    isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-40 group-hover:scale-95'
                                }`} />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Prompt Editors */}
            <div className="grid grid-cols-1 gap-6">
                {/* Global System Prompt */}
                <Card className="bg-zinc-950/40 border-zinc-850 backdrop-blur-md shadow-2xl">
                    <CardHeader className="border-b border-zinc-900 pb-4">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-indigo-400" />
                            <div>
                                <CardTitle className="text-sm font-bold text-zinc-200">
                                    Directives Générales du Système
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500 mt-0.5">
                                    Définit l'identité, le ton et les règles de base du comportement du copilote Gustav.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="You are Gustav, an elite property co-pilot for Gestion Laucandrique. Maintain an impeccably courteous, clear French-Canadian business tone."
                            className="w-full min-h-[140px] bg-zinc-950 border border-zinc-850 focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 rounded-xl p-4 text-xs font-mono text-zinc-300 placeholder:text-zinc-650 outline-none leading-relaxed resize-y transition-colors"
                        />
                    </CardContent>
                </Card>

                {/* Role Behavior Prompt */}
                <Card className="bg-zinc-950/40 border-zinc-850 backdrop-blur-md shadow-2xl">
                    <CardHeader className="border-b border-zinc-900 pb-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-indigo-400" />
                            <div>
                                <CardTitle className="text-sm font-bold text-zinc-200">
                                    Directives de Comportement par Rôle (Spécifiques)
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500 mt-0.5">
                                    Instructions conditionnelles liées aux suivis des travaux, aux seuils de dépenses, et aux routages départementaux.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <textarea
                            value={rolePrompt}
                            onChange={(e) => setRolePrompt(e.target.value)}
                            placeholder="Focus explicitly on contractor follow-ups. If an item exceeds $1500, flag it for the Operations department."
                            className="w-full min-h-[140px] bg-zinc-950 border border-zinc-850 focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 rounded-xl p-4 text-xs font-mono text-zinc-300 placeholder:text-zinc-650 outline-none leading-relaxed resize-y transition-colors"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
