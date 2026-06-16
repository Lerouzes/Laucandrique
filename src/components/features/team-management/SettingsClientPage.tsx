'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
    AlertTriangle, 
    ClipboardCheck, 
    PlusCircle, 
    Trash2, 
    Edit3, 
    Check, 
    X, 
    Save, 
    Loader2,
    Info,
    BarChart3
} from 'lucide-react'
import { 
    createComplaintCategoryAction, 
    updateComplaintCategoryAction, 
    deleteComplaintCategoryAction, 
    updateAuditQuestionConfigAction,
    updateAssemblyQuestionConfigAction
} from '@/actions/team-management'

interface ComplaintCategory {
    id: string
    name: string
    created_at?: string | null
}

interface AuditConfig {
    key: string
    description: string
}

interface AssemblyConfig {
    key: string
    description: string
}

interface SettingsClientPageProps {
    initialCategories: ComplaintCategory[]
    initialAuditConfigs: AuditConfig[]
    initialAssemblyConfigs: AssemblyConfig[]
    userRole: string
}

const AUDIT_QUESTIONS = [
    { key: 'registre_coproprietaires', category: 'Gouvernance', label: 'Registre des documents complets' },
    { key: 'convocations_assemblee', category: 'Gouvernance', label: "Convocations d'assemblées conformes" },
    { key: 'proces_verbaux', category: 'Gouvernance', label: 'Procès-verbaux rédigés et archivés' },
    { key: 'contrats_fournisseurs', category: 'Gouvernance', label: 'Contrats de fournisseurs signés et classés' },
    { key: 'budget_annuel', category: 'Financier', label: 'Budget annuel voté et respecté' },
    { key: 'fonds_prevoyance', category: 'Financier', label: 'Fonds de prévoyance (étude + cotisations) conforme' }
]

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
    registre_coproprietaires: 'Vérifier que les documents juridiques, registres de copropriété, procès-verbaux et règlements sont complets.',
    convocations_assemblee: 'Vérifier que les avis de convocation et procès-verbaux d\'assemblées sont conformes aux délais légaux.',
    proces_verbaux: 'S\'assurer que les procès-verbaux des assemblées et réunions de CA sont signés, archivés et à jour.',
    contrats_fournisseurs: 'Contrôler la signature, l\'archivage et le classement de tous les contrats de fournisseurs.',
    budget_annuel: 'Valider que le budget de fonctionnement annuel est voté en assemblée générale et respecté.',
    fonds_prevoyance: 'S\'assurer de la conformité de l\'étude du fonds de prévoyance et du versement régulier des cotisations.'
}

const ASSEMBLY_QUESTIONS = [
    { key: 'agenda_sent_on_time', category: 'Préparation', label: 'Ordre du jour envoyé à temps' },
    { key: 'quorum_respected', category: 'Préparation', label: 'Quorum respecté' },
    { key: 'voting_controlled', category: 'Déroulement', label: 'Contrôle des votes / procurations' },
    { key: 'duration_reasonable', category: 'Déroulement', label: 'Durée raisonnable' },
    { key: 'manager_controlled_room', category: 'Déroulement', label: 'Contrôle de la salle par le gestionnaire' },
    { key: 'discussions_on_track', category: 'Déroulement', label: 'Discussions sur la bonne voie' },
    { key: 'conflict_handled_professionally', category: 'Déroulement', label: 'Conflits gérés professionnellement' },
    { key: 'answers_clear_confident', category: 'Déroulement', label: 'Réponses claires et confiantes' },
    { key: 'board_confidence_level', category: 'CA / Relations', label: 'Niveau de confiance du conseil' },
    { key: 'financial_statement_quality', category: 'Déroulement', label: 'Qualité de la présentation des états financiers' },
    { key: 'pv_drafted_quickly', category: 'Documentation & Suivis', label: 'PV rédigé rapidement' },
    { key: 'templates_respected', category: 'Documentation & Suivis', label: 'Modèles respectés' },
    { key: 'resolutions_clear', category: 'Documentation & Suivis', label: 'Résolutions claires' },
    { key: 'followup_tasks_created', category: 'Documentation & Suivis', label: 'Tâches de suivi créées' }
]

const DEFAULT_ASSEMBLY_DESCRIPTIONS: Record<string, string> = {
    agenda_sent_on_time: "Vérifier que les convocations et l'ordre du jour ont été transmis aux copropriétaires dans les délais légaux (ex. 10 à 15 jours avant la séance).",
    quorum_respected: "Vérifier que les feuilles de présence sont complétées et que les conditions de quorum sont formellement validées avant d'ouvrir la séance.",
    voting_controlled: "Contrôler la validité des procurations et s'assurer que la saisie et le calcul des voix (tantièmes) sont gérés avec rigueur durant les votes.",
    duration_reasonable: "S'assurer que le déroulement de l'assemblée respecte le temps imparti et évite les débats improductifs.",
    manager_controlled_room: "Évaluer l'autorité naturelle de l'animateur, sa capacité à maintenir le calme et à distribuer équitablement la parole.",
    discussions_on_track: "S'assurer que les interventions restent concentrées sur les points de l'ordre du jour sans s'égarer dans des cas particuliers.",
    conflict_handled_professionally: "Observer la diplomatie et le professionnalisme de l'animateur face aux tensions, critiques ou comportements agressifs.",
    answers_clear_confident: "S'assurer que les réponses fournies par le gestionnaire sont claires, appuyées sur les faits et juridiquement ou techniquement justes.",
    board_confidence_level: "Mesurer la relation de confiance et le soutien manifesté par les membres du CA envers le travail du gestionnaire.",
    financial_statement_quality: "Évaluer la clarté des explications du budget et des états financiers présentés aux copropriétaires.",
    pv_drafted_quickly: "Rédiger et valider le projet de procès-verbal de l'assemblée dans un délai optimal (ex. 5 à 10 jours après la séance).",
    templates_respected: "S'assurer de l'utilisation rigoureuse des modèles officiels et de la charte graphique de Laucandrique.",
    resolutions_clear: "Valider que la formulation et le libellé des résolutions votées sont précis, sans ambiguïté juridique.",
    followup_tasks_created: "Vérifier que toutes les décisions nécessitant des actions (travaux, courriers, etc.) ont fait l'objet de tâches de suivi créées dans le système."
}

export function SettingsClientPage({
    initialCategories,
    initialAuditConfigs,
    initialAssemblyConfigs,
    userRole
}: SettingsClientPageProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'audits' | 'assemblies' | 'scoring'>('categories')
    
    // Categories states
    const [categories, setCategories] = useState<ComplaintCategory[]>(initialCategories)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Audit descriptions states
    const [auditConfigs, setAuditConfigs] = useState<Record<string, string>>(() => {
        const lookup: Record<string, string> = { ...DEFAULT_DESCRIPTIONS }
        initialAuditConfigs.forEach(c => {
            lookup[c.key] = c.description
        })
        return lookup
    })

    // Assembly descriptions states
    const [assemblyConfigs, setAssemblyConfigs] = useState<Record<string, string>>(() => {
        const lookup: Record<string, string> = { ...DEFAULT_ASSEMBLY_DESCRIPTIONS }
        initialAssemblyConfigs.forEach(c => {
            lookup[c.key] = c.description
        })
        return lookup
    })
    const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({})

    // Inline Notifications
    const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
        setAlertMsg({ type, text })
        setTimeout(() => setAlertMsg(null), 4000)
    }



    // Add category handler
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return

        setIsAdding(true)
        try {
            const added = await createComplaintCategoryAction(newCategoryName.trim()) as ComplaintCategory
            setCategories(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)))
            setNewCategoryName('')
            triggerAlert('Catégorie ajoutée avec succès !')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de la création', 'error')
        } finally {
            setIsAdding(false)
        }
    }

    // Update category handler
    const handleUpdateCategory = async (id: string) => {
        if (!editingName.trim()) return

        setIsUpdating(true)
        try {
            const updated = await updateComplaintCategoryAction(id, editingName.trim()) as ComplaintCategory
            setCategories(prev => prev.map(c => c.id === id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)))
            setEditingId(null)
            setEditingName('')
            triggerAlert('Catégorie modifiée avec succès !')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de la mise à jour', 'error')
        } finally {
            setIsUpdating(false)
        }
    }

    // Delete category handler
    const handleDeleteCategory = async (id: string) => {
        try {
            await deleteComplaintCategoryAction(id)
            setCategories(prev => prev.filter(c => c.id !== id))
            setDeletingId(null)
            triggerAlert('Catégorie supprimée avec succès !')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de la suppression', 'error')
        }
    }

    // Update audit question description handler
    const handleSaveAuditDesc = async (key: string) => {
        const desc = auditConfigs[key] || ''
        setSavingKeys(prev => ({ ...prev, [key]: true }))
        try {
            await updateAuditQuestionConfigAction(key, desc)
            triggerAlert('Description de l\'audit mise à jour !')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de l\'enregistrement', 'error')
        } finally {
            setSavingKeys(prev => ({ ...prev, [key]: false }))
        }
    }

    // Update assembly question description handler
    const handleSaveAssemblyDesc = async (key: string) => {
        const desc = assemblyConfigs[key] || ''
        setSavingKeys(prev => ({ ...prev, [key]: true }))
        try {
            await updateAssemblyQuestionConfigAction(key, desc)
            triggerAlert('Description de l\'assemblée mise à jour !')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de l\'enregistrement', 'error')
        } finally {
            setSavingKeys(prev => ({ ...prev, [key]: false }))
        }
    }

    return (
        <div className="space-y-6">
            {/* Status notification banner */}
            {alertMsg && (
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                    alertMsg.type === 'success' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-800/40' 
                        : 'bg-rose-500/20 text-rose-300 border-rose-800/40'
                }`}>
                    <Info className="h-4 w-4 shrink-0" />
                    <span>{alertMsg.text}</span>
                </div>
            )}

            {/* Custom Tab Selector */}
            <div className="flex border-b border-zinc-800 gap-4 flex-wrap">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`pb-2.5 text-sm font-bold transition-all relative ${
                        activeTab === 'categories' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Catégories de Plaintes & Notes
                    {activeTab === 'categories' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('audits')}
                    className={`pb-2.5 text-sm font-bold transition-all relative ${
                        activeTab === 'audits' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Descriptions d&apos;Audits
                    {activeTab === 'audits' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('scoring')}
                    className={`pb-2.5 text-sm font-bold transition-all relative ${
                        activeTab === 'scoring' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Barème des Notes
                    {activeTab === 'scoring' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
                {userRole === 'Master' && (
                    <button
                        onClick={() => setActiveTab('assemblies')}
                        className={`pb-2.5 text-sm font-bold transition-all relative ${
                            activeTab === 'assemblies' 
                                ? 'text-purple-400 font-extrabold' 
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Descriptions d&apos;Assemblées
                        {activeTab === 'assemblies' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                        )}
                    </button>
                )}
            </div>

            {/* Tab: Categories */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Category Form */}
                    <div>
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 bg-zinc-950/20">
                                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                    <PlusCircle className="h-4 w-4 text-purple-400" />
                                    Créer une Catégorie
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Ajouter un nouveau type pour classifier les plaintes, réclamations et notes de suivi.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-500">Nom de la Catégorie</Label>
                                        <Input 
                                            type="text" 
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            required 
                                            placeholder="ex: Problèmes de plomberie..." 
                                            className="bg-[#121318] border-zinc-800 h-8 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={isAdding}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-8 rounded-lg flex items-center justify-center gap-1"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <PlusCircle className="h-3.5 w-3.5" />
                                        )}
                                        Créer
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Categories List */}
                    <div className="lg:col-span-2">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-white">Catégories existantes</CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Liste des catégories disponibles pour les plaintes, rapports et notes de suivi.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {categories.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic py-6 text-center">Aucune catégorie définie.</p>
                                ) : (
                                    categories.map((c) => {
                                        const isEditing = editingId === c.id
                                        const isConfirmingDelete = deletingId === c.id

                                        return (
                                            <div 
                                                key={c.id} 
                                                className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl flex items-center justify-between text-xs gap-4"
                                            >
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Input 
                                                            type="text" 
                                                            value={editingName} 
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            className="bg-[#121318] border-zinc-700 h-7 text-[16px] md:text-xs text-white max-w-sm"
                                                            autoFocus
                                                        />
                                                        <Button 
                                                            size="sm"
                                                            disabled={isUpdating}
                                                            onClick={() => handleUpdateCategory(c.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 w-7 p-0 rounded-md"
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <Check className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditingId(null)
                                                                setEditingName('')
                                                            }}
                                                            className="border-zinc-800 text-zinc-400 hover:text-white h-7 w-7 p-0 rounded-md"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : isConfirmingDelete ? (
                                                    <div className="flex items-center justify-between flex-1">
                                                        <span className="text-rose-400 font-semibold text-[10px]">Confirmer la suppression de "{c.name}" ?</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleDeleteCategory(c.id)}
                                                                className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] h-6 px-2.5 rounded-md"
                                                            >
                                                                Supprimer
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setDeletingId(null)}
                                                                className="border-zinc-800 text-zinc-400 hover:text-white text-[9px] h-6 px-2.5 rounded-md"
                                                            >
                                                                Annuler
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="font-semibold text-zinc-200">{c.name}</span>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setEditingId(c.id)
                                                                    setEditingName(c.name)
                                                                }}
                                                                className="border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 h-7 w-7 p-0 rounded-md"
                                                                title="Modifier"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setDeletingId(c.id)}
                                                                className="border-zinc-850 hover:bg-rose-950/20 border-rose-950/10 hover:border-rose-900 text-zinc-400 hover:text-rose-400 h-7 w-7 p-0 rounded-md"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Tab: Audits */}
            {activeTab === 'audits' && (
                <div className="space-y-4">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-purple-400" />
                                Infobulles d'Audits de Santé
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-400">
                                Personnalisez les explications qui s'affichent au survol des critères dans le formulaire d'audit.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {AUDIT_QUESTIONS.map((q) => {
                                const value = auditConfigs[q.key] || ''
                                const isSaving = savingKeys[q.key] || false

                                return (
                                    <div 
                                        key={q.key} 
                                        className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2 text-xs"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-zinc-200">{q.label}</span>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-[8px] font-bold bg-zinc-950 text-zinc-400 border-zinc-850">{q.category}</Badge>
                                                    <span className="font-mono text-[8px] text-zinc-550">Clé: {q.key}</span>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm"
                                                onClick={() => handleSaveAuditDesc(q.key)}
                                                disabled={isSaving}
                                                className="bg-purple-600 hover:bg-purple-700 text-white text-[9px] h-7 px-3 rounded flex items-center gap-1 shrink-0 font-bold"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Save className="h-3 w-3" />
                                                )}
                                                Enregistrer
                                            </Button>
                                        </div>
                                        <Textarea 
                                            value={value}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setAuditConfigs(prev => ({ ...prev, [q.key]: val }))
                                            }}
                                            placeholder="Saisir la description à afficher pour cette question..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-800 text-zinc-300 text-[16px] md:text-xs leading-relaxed"
                                        />
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab: Assemblies */}
            {activeTab === 'assemblies' && userRole === 'Master' && (
                <div className="space-y-4">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-purple-400" />
                                Infobulles d'Évaluations d'Assemblées
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-400">
                                Personnalisez les explications qui s'affichent au survol des critères dans le formulaire d'évaluation des assemblées.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ASSEMBLY_QUESTIONS.map((q) => {
                                const value = assemblyConfigs[q.key] || ''
                                const isSaving = savingKeys[q.key] || false

                                return (
                                    <div 
                                        key={q.key} 
                                        className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2 text-xs"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-zinc-200">{q.label}</span>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-[8px] font-bold bg-zinc-950 text-zinc-400 border-zinc-850">{q.category}</Badge>
                                                    <span className="font-mono text-[8px] text-zinc-550">Clé: {q.key}</span>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm"
                                                onClick={() => handleSaveAssemblyDesc(q.key)}
                                                disabled={isSaving}
                                                className="bg-purple-600 hover:bg-purple-700 text-white text-[9px] h-7 px-3 rounded flex items-center gap-1 shrink-0 font-bold"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Save className="h-3 w-3" />
                                                )}
                                                Enregistrer
                                            </Button>
                                        </div>
                                        <Textarea 
                                            value={value}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setAssemblyConfigs(prev => ({ ...prev, [q.key]: val }))
                                            }}
                                            placeholder="Saisir la description à afficher pour cette question..."
                                            rows={2}
                                            className="bg-[#121318] border-zinc-800 text-zinc-300 text-[16px] md:text-xs leading-relaxed"
                                        />
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab: Scoring Reference */}
            {activeTab === 'scoring' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-purple-400" />
                                Calcul des notes 1-à-1
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-400">
                                Référence complète sur la façon dont les scores et les notes des rencontres individuelles sont calculés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Weights table */}
                            <div>
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Pondération des indicateurs</h4>
                                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-zinc-950/60 border-b border-zinc-800">
                                                <th className="text-left px-3 py-2.5 text-zinc-400 font-semibold">Indicateur</th>
                                                <th className="text-left px-3 py-2.5 text-zinc-400 font-semibold">Formule</th>
                                                <th className="text-center px-3 py-2.5 text-zinc-400 font-semibold">Poids</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60">
                                            <tr className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">Taux d&apos;appels répondus</td>
                                                <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px]">(appels répondus ÷ total appels) × 100</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-purple-950/40 text-purple-300 border border-purple-800/50 rounded-full px-2 py-0.5 text-[10px] font-bold">25%</span></td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">Hygiène des tâches</td>
                                                <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px]">max(0, 100 − tâches en retard × 5)</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-purple-950/40 text-purple-300 border border-purple-800/50 rounded-full px-2 py-0.5 text-[10px] font-bold">25%</span></td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">Hygiène des courriels</td>
                                                <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px]">max(0, 100 − courriels &gt;48h × 10)</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-blue-950/40 text-blue-300 border border-blue-800/50 rounded-full px-2 py-0.5 text-[10px] font-bold">20%</span></td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">Taux d&apos;approbation des soumissions</td>
                                                <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px]">donnée globale (auto) — 100% si absent</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-amber-950/40 text-amber-300 border border-amber-800/50 rounded-full px-2 py-0.5 text-[10px] font-bold">10%</span></td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">Hygiène des factures</td>
                                                <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px]">max(0, 100 − factures sans notes &gt;7j × 10)</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-amber-950/40 text-amber-300 border border-amber-800/50 rounded-full px-2 py-0.5 text-[10px] font-bold">10%</span></td>
                                            </tr>
                                            <tr className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">Résolution des engagements</td>
                                                <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px]">(engagements résolus ÷ total) × 100 — 100% si aucun</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-amber-950/40 text-amber-300 border border-amber-800/50 rounded-full px-2 py-0.5 text-[10px] font-bold">10%</span></td>
                                            </tr>
                                            <tr className="bg-zinc-950/40 font-bold border-t-2 border-zinc-700">
                                                <td className="px-3 py-2.5 text-zinc-100" colSpan={2}>Total</td>
                                                <td className="px-3 py-2.5 text-center"><span className="inline-block bg-zinc-800 text-zinc-100 border border-zinc-600 rounded-full px-2 py-0.5 text-[10px] font-bold">100%</span></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Grade thresholds */}
                            <div>
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Barème des notes</h4>
                                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-zinc-950/60 border-b border-zinc-800">
                                                <th className="text-center px-3 py-2.5 text-zinc-400 font-semibold">Note</th>
                                                <th className="text-center px-3 py-2.5 text-zinc-400 font-semibold">Score</th>
                                                <th className="text-left px-3 py-2.5 text-zinc-400 font-semibold">Appréciation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60">
                                            {[
                                                { label: 'A+', score: '≥ 90', comment: 'Excellent', color: 'text-emerald-400' },
                                                { label: 'A',  score: '≥ 80', comment: 'Très Bien', color: 'text-emerald-300' },
                                                { label: 'B',  score: '≥ 70', comment: 'Bien',      color: 'text-purple-400' },
                                                { label: 'C',  score: '≥ 60', comment: 'Satisfaisant', color: 'text-amber-400' },
                                                { label: 'D',  score: '≥ 50', comment: 'À Améliorer', color: 'text-orange-400' },
                                                { label: 'E',  score: '< 50', comment: 'Insuffisant', color: 'text-rose-400' },
                                            ].map(g => (
                                                <tr key={g.label} className="hover:bg-zinc-800/20 transition-colors">
                                                    <td className={`px-3 py-2.5 text-center font-bold ${g.color}`}>{g.label}</td>
                                                    <td className="px-3 py-2.5 text-center text-zinc-300">{g.score}</td>
                                                    <td className="px-3 py-2.5 text-zinc-300">{g.comment}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

