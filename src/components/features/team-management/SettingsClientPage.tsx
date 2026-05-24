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
    Info
} from 'lucide-react'
import { 
    createComplaintCategoryAction, 
    updateComplaintCategoryAction, 
    deleteComplaintCategoryAction, 
    updateAuditQuestionConfigAction 
} from '@/actions/team-management'

interface Category {
    id: string
    name: string
    created_at?: string
}

interface AuditConfig {
    key: string
    description: string
}

interface SettingsClientPageProps {
    initialCategories: Category[]
    initialAuditConfigs: AuditConfig[]
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

export function SettingsClientPage({
    initialCategories,
    initialAuditConfigs
}: SettingsClientPageProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'audits'>('categories')
    
    // Categories states
    const [categories, setCategories] = useState<Category[]>(initialCategories)
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
            const added = await createComplaintCategoryAction(newCategoryName.trim())
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
            const updated = await updateComplaintCategoryAction(id, editingName.trim())
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
            <div className="flex border-b border-zinc-800 gap-4">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`pb-2.5 text-sm font-bold transition-all relative ${
                        activeTab === 'categories' 
                            ? 'text-purple-400 font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Catégories de Plaintes
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
                    Descriptions d'Audits
                    {activeTab === 'audits' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                </button>
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
                                    Ajouter un nouveau type pour classifier les plaintes et réclamations.
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
                                            className="bg-[#121318] border-zinc-800 h-8 text-white text-xs" 
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
                                    Liste des catégories disponibles pour les plaintes et rapports.
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
                                                            className="bg-[#121318] border-zinc-700 h-7 text-xs text-white max-w-sm"
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
                                            className="bg-[#121318] border-zinc-800 text-zinc-300 text-xs leading-relaxed"
                                        />
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
