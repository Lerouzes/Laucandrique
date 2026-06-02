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
    UserPlus,
    Shield,
    Users,
    RefreshCw,
    Key
} from 'lucide-react'
import { 
    createComplaintCategoryAction, 
    updateComplaintCategoryAction, 
    deleteComplaintCategoryAction, 
    updateAuditQuestionConfigAction,
    updateAssemblyQuestionConfigAction,
    createGustavAccountAction,
    getGustavUsersAction,
    updateUserRoleAction,
    resetUserPasswordAction,
    deleteUserAction
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
    currentUserId: string
    initialUsers: any[]
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
    userRole,
    currentUserId,
    initialUsers
}: SettingsClientPageProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'audits' | 'accounts' | 'assemblies'>('categories')
    
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

    // Account creation states
    const [newAccountName, setNewAccountName] = useState('')
    const [newAccountEmail, setNewAccountEmail] = useState('')
    const [newAccountPassword, setNewAccountPassword] = useState('')
    const [newAccountRole, setNewAccountRole] = useState('Operations')
    const [isCreatingAccount, setIsCreatingAccount] = useState(false)

    // Platform users list states
    const [users, setUsers] = useState<any[]>(initialUsers)
    const [isRefreshingUsers, setIsRefreshingUsers] = useState(false)
    const [savingRoleId, setSavingRoleId] = useState<string | null>(null)
    const [roleChanges, setRoleChanges] = useState<Record<string, string>>({})

    // Reset password states
    const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null)
    const [newPasswordVal, setNewPasswordVal] = useState('')
    const [isResettingPassword, setIsResettingPassword] = useState(false)

    // Delete user states
    const [userToDelete, setUserToDelete] = useState<any | null>(null)
    const [isDeletingUser, setIsDeletingUser] = useState(false)

    const handleResetPassword = async () => {
        if (!resetPasswordUser || newPasswordVal.length < 6) return
        setIsResettingPassword(true)
        try {
            await resetUserPasswordAction(resetPasswordUser.id, newPasswordVal)
            triggerAlert(`Le mot de passe de ${resetPasswordUser.full_name} a été réinitialisé !`, 'success')
            setResetPasswordUser(null)
            setNewPasswordVal('')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de la réinitialisation du mot de passe.', 'error')
        } finally {
            setIsResettingPassword(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return
        setIsDeletingUser(true)
        try {
            await deleteUserAction(userToDelete.id)
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id))
            triggerAlert(`Le compte de ${userToDelete.full_name} a été supprimé.`, 'success')
            setUserToDelete(null)
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de la suppression du compte.', 'error')
        } finally {
            setIsDeletingUser(false)
        }
    }

    const refreshUsers = async () => {
        setIsRefreshingUsers(true)
        try {
            const data = await getGustavUsersAction()
            setUsers(data)
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors du chargement des utilisateurs.', 'error')
        } finally {
            setIsRefreshingUsers(false)
        }
    }

    const handleUpdateRole = async (userId: string) => {
        const newRole = roleChanges[userId]
        if (!newRole) return

        setSavingRoleId(userId)
        try {
            await updateUserRoleAction(userId, newRole)
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
            setRoleChanges(prev => {
                const copy = { ...prev }
                delete copy[userId]
                return copy
            })
            triggerAlert('Rôle mis à jour avec succès !', 'success')
        } catch (err: any) {
            triggerAlert(err.message || 'Erreur lors de la modification du rôle.', 'error')
        } finally {
            setSavingRoleId(null)
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'Operations':
                return <Badge className="bg-zinc-800 hover:bg-zinc-800 text-zinc-300 border-zinc-700">Operations</Badge>
            case 'Managers':
                return <Badge className="bg-blue-950/40 hover:bg-blue-950/40 text-blue-400 border border-blue-800/40">Managers</Badge>
            case 'Direction':
                return <Badge className="bg-purple-950/40 hover:bg-purple-950/40 text-purple-400 border border-purple-800/40">Direction</Badge>
            case 'Master':
                return <Badge className="bg-amber-950/40 hover:bg-amber-950/40 text-amber-400 border border-amber-800/40">Master</Badge>
            default:
                return <Badge className="bg-zinc-800 hover:bg-zinc-800 text-zinc-300 border-zinc-700">{role}</Badge>
        }
    }

    const getInitials = (name: string) => {
        if (!name) return '??'
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    const getAvatarGradient = (role: string) => {
        switch (role) {
            case 'Master':
                return 'from-amber-600 to-yellow-500'
            case 'Direction':
                return 'from-purple-600 to-pink-500'
            case 'Managers':
                return 'from-blue-600 to-cyan-500'
            case 'Operations':
            default:
                return 'from-zinc-600 to-slate-500'
        }
    }

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-'
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('fr-CA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        } catch {
            return '-'
        }
    }

    // Create account handler
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newAccountName.trim() || !newAccountEmail.trim() || !newAccountPassword.trim()) {
            triggerAlert('Veuillez remplir tous les champs.', 'error')
            return
        }

        setIsCreatingAccount(true)
        try {
            const formData = new FormData()
            formData.append('full_name', newAccountName.trim())
            formData.append('email', newAccountEmail.trim())
            formData.append('password', newAccountPassword.trim())
            formData.append('role', newAccountRole)

            const result = await createGustavAccountAction(formData)
            if (result?.success) {
                triggerAlert(`Le compte pour ${result.email} a été créé avec succès !`, 'success')
                setNewAccountName('')
                setNewAccountEmail('')
                setNewAccountPassword('')
                setNewAccountRole('Operations')
                await refreshUsers()
            }
        } catch (err: any) {
            triggerAlert(err.message || 'Une erreur est survenue lors de la création du compte.', 'error')
        } finally {
            setIsCreatingAccount(false)
        }
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
                {userRole === 'Master' && (
                    <>
                        <button
                            onClick={() => setActiveTab('assemblies')}
                            className={`pb-2.5 text-sm font-bold transition-all relative ${
                                activeTab === 'assemblies' 
                                    ? 'text-purple-400 font-extrabold' 
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Descriptions d'Assemblées
                            {activeTab === 'assemblies' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={`pb-2.5 text-sm font-bold transition-all relative ${
                                activeTab === 'accounts' 
                                    ? 'text-purple-400 font-extrabold' 
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Gestion des Comptes
                            {activeTab === 'accounts' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                            )}
                        </button>
                    </>
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

            {/* Tab: Accounts (Master Only) */}
            {userRole === 'Master' && activeTab === 'accounts' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    {/* Left Column: Create Form + Info */}
                    <div className="space-y-6">
                        {/* Create Account Form */}
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader className="pb-3 bg-zinc-950/20">
                                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-purple-400" />
                                    Créer un Compte Gustav
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Enregistrez un nouvel utilisateur pour accéder à la plateforme.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
                                    <div className="space-y-1">
                                        <Label className="text-zinc-400 font-medium">Nom Complet</Label>
                                        <Input 
                                            type="text" 
                                            value={newAccountName}
                                            onChange={(e) => setNewAccountName(e.target.value)}
                                            required 
                                            placeholder="ex: Jean Tremblay" 
                                            className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-400 font-medium">Adresse Courriel</Label>
                                        <Input 
                                            type="email" 
                                            value={newAccountEmail}
                                            onChange={(e) => setNewAccountEmail(e.target.value)}
                                            required 
                                            placeholder="ex: jean.tremblay@example.com" 
                                            className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-400 font-medium">Mot de Passe</Label>
                                        <Input 
                                            type="password" 
                                            value={newAccountPassword}
                                            onChange={(e) => setNewAccountPassword(e.target.value)}
                                            required 
                                            placeholder="••••••••" 
                                            className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-zinc-400 font-medium">Rôle</Label>
                                        <select 
                                            value={newAccountRole}
                                            onChange={(e) => setNewAccountRole(e.target.value)}
                                            className="w-full rounded-md bg-[#121318] border border-zinc-800 h-9 text-white px-3 text-[16px] md:text-xs focus:ring-1 focus:ring-purple-500"
                                        >
                                            <option value="Operations">Operations (Accès standard, lecture seule direction)</option>
                                            <option value="Managers">Managers (Gestionnaire d’Équipe)</option>
                                            <option value="Direction">Direction (Accès direction complet)</option>
                                            <option value="Master">Master (Direction Générale + Admin)</option>
                                        </select>
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={isCreatingAccount}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-9 rounded-lg flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        {isCreatingAccount ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <UserPlus className="h-4 w-4" />
                                        )}
                                        Créer le compte
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Security and Info Section */}
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-purple-400" />
                                    Sécurité et Niveaux d'Accès
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-400">
                                    Informations de sécurité pour la création de comptes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                                <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3">
                                    <h4 className="font-bold text-zinc-100 flex items-center gap-1.5">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Remarque importante sur la sécurité
                                    </h4>
                                    <p>
                                        La création de compte utilise l'authentification sécurisée Supabase.
                                        Le nouveau compte pourra se connecter immédiatement en utilisant l'adresse courriel et le mot de passe saisis.
                                    </p>
                                    <p className="text-zinc-400">
                                        Veuillez vous assurer que le mot de passe est suffisamment complexe (minimum 6 caractères) et transmettez les identifiants de manière sécurisée au nouvel utilisateur.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3.5 bg-zinc-900/20 border border-zinc-850 rounded-xl space-y-1">
                                        <span className="font-bold text-white">Operations</span>
                                        <p className="text-zinc-400 text-[11px]">Rôle de base pour le personnel d'opérations. Ne peut pas accéder à la section Gestion d'Équipe.</p>
                                    </div>
                                    <div className="p-3.5 bg-zinc-900/20 border border-zinc-850 rounded-xl space-y-1">
                                        <span className="font-bold text-purple-300">Managers</span>
                                        <p className="text-zinc-400 text-[11px]">Pour les gestionnaires d'équipe. Accès aux tableaux de bord de gestion d'équipe.</p>
                                    </div>
                                    <div className="p-3.5 bg-zinc-900/20 border border-zinc-850 rounded-xl space-y-1">
                                        <span className="font-bold text-purple-400">Direction</span>
                                        <p className="text-zinc-400 text-[11px]">Accès étendu aux rapports, KPIs et décisions opérationnelles de l'entreprise.</p>
                                    </div>
                                    <div className="p-3.5 bg-zinc-900/20 border border-zinc-850 rounded-xl space-y-1">
                                        <span className="font-bold text-purple-500">Master</span>
                                        <p className="text-zinc-400 text-[11px]">Direction générale complète. Accès exclusif à la configuration des comptes et à l'administration globale.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Users List Card */}
                    <div className="lg:col-span-2">
                        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md h-full flex flex-col">
                            <CardHeader className="pb-3 bg-zinc-950/20 flex flex-row items-center justify-between space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                        <Users className="h-4 w-4 text-purple-400" />
                                        Comptes Utilisateurs
                                    </CardTitle>
                                    <CardDescription className="text-xs text-zinc-400">
                                        Liste des comptes existants et gestion des rôles de la plateforme.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshUsers}
                                    disabled={isRefreshingUsers}
                                    className="border-zinc-850 hover:bg-zinc-900 text-zinc-400 h-8 w-8 p-0 rounded-md"
                                    title="Rafraîchir la liste"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-4 flex-1">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-800 text-zinc-450 pb-2">
                                                <th className="py-2 font-bold uppercase tracking-wider">Utilisateur</th>
                                                <th className="py-2 font-bold uppercase tracking-wider hidden sm:table-cell">Rôle actuel</th>
                                                <th className="py-2 font-bold uppercase tracking-wider hidden md:table-cell">Créé le</th>
                                                <th className="py-2 font-bold uppercase tracking-wider text-right">Rôle & Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-zinc-500 font-medium">
                                                        Aucun utilisateur trouvé.
                                                    </td>
                                                </tr>
                                            ) : (
                                                users.map((user) => {
                                                    const isCurrentUser = user.id === currentUserId
                                                    const hasChange = roleChanges[user.id] !== undefined && roleChanges[user.id] !== user.role
                                                    const isSaving = savingRoleId === user.id
                                                    const selectedRole = roleChanges[user.id] !== undefined ? roleChanges[user.id] : user.role

                                                    return (
                                                        <tr 
                                                            key={user.id} 
                                                            className={`border-b border-zinc-900/60 hover:bg-zinc-900/20 transition-colors ${
                                                                isCurrentUser ? 'bg-purple-950/10' : ''
                                                            }`}
                                                        >
                                                            <td className="py-3 pr-2">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getAvatarGradient(user.role)} flex items-center justify-center text-[10px] font-bold text-white shadow-inner shrink-0`}>
                                                                        {getInitials(user.full_name)}
                                                                    </div>
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <span className="font-bold text-zinc-200 flex items-center gap-1.5 truncate">
                                                                            {user.full_name}
                                                                            {isCurrentUser && (
                                                                                <Badge className="bg-purple-950/50 text-purple-300 text-[9px] h-4 px-1.5 hover:bg-purple-950/50 border border-purple-800/40">
                                                                                    Vous
                                                                                </Badge>
                                                                            )}
                                                                        </span>
                                                                        <span className="text-[10px] text-zinc-550 block truncate max-w-[150px] sm:max-w-xs">{user.email}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 pr-2 hidden sm:table-cell">
                                                                {getRoleBadge(user.role)}
                                                            </td>
                                                            <td className="py-3 pr-2 hidden md:table-cell text-zinc-450">
                                                                {formatDate(user.created_at)}
                                                            </td>
                                                            <td className="py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <select
                                                                        value={selectedRole}
                                                                        disabled={isCurrentUser || isSaving}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value
                                                                            setRoleChanges(prev => ({ ...prev, [user.id]: val }))
                                                                        }}
                                                                        className="rounded-md bg-[#121318] border border-zinc-800 text-zinc-200 text-xs px-2 py-1 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 h-7"
                                                                    >
                                                                        <option value="Operations">Operations</option>
                                                                        <option value="Managers">Managers</option>
                                                                        <option value="Direction">Direction</option>
                                                                        <option value="Master">Master</option>
                                                                    </select>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={!hasChange || isSaving || isCurrentUser}
                                                                        onClick={() => handleUpdateRole(user.id)}
                                                                        className="h-7 w-7 p-0 border-zinc-800 hover:bg-purple-650 hover:text-white"
                                                                        title="Sauvegarder le rôle"
                                                                    >
                                                                        {isSaving ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                                                                        ) : (
                                                                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                                        )}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={isCurrentUser}
                                                                        onClick={() => setResetPasswordUser(user)}
                                                                        className="h-7 w-7 p-0 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400"
                                                                        title="Modifier le mot de passe"
                                                                    >
                                                                        <Key className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={isCurrentUser}
                                                                        onClick={() => setUserToDelete(user)}
                                                                        className="h-7 w-7 p-0 border-zinc-800 hover:bg-rose-950/30 hover:border-rose-900 text-zinc-400 hover:text-rose-400"
                                                                        title="Supprimer le compte"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {resetPasswordUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#16171e]/90 border border-zinc-800/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-white overflow-hidden backdrop-blur-md">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                <Key className="h-4 w-4 text-amber-400" />
                                Réinitialiser le mot de passe
                            </h3>
                            <button 
                                onClick={() => { setResetPasswordUser(null); setNewPasswordVal(''); }}
                                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-3 text-xs">
                            <p className="text-zinc-400">
                                Saisissez le nouveau mot de passe pour l&apos;utilisateur <strong className="text-zinc-200">{resetPasswordUser.full_name}</strong> ({resetPasswordUser.email}).
                            </p>
                            
                            <div className="space-y-1">
                                <Label className="text-zinc-400 font-medium">Nouveau mot de passe</Label>
                                <Input 
                                    type="password" 
                                    value={newPasswordVal}
                                    onChange={(e) => setNewPasswordVal(e.target.value)}
                                    required 
                                    placeholder="••••••••" 
                                    className="bg-[#121318] border-zinc-800 h-9 text-white text-[16px] md:text-xs" 
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => { setResetPasswordUser(null); setNewPasswordVal(''); }}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xs h-9 px-4 font-bold rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="button" 
                                onClick={handleResetPassword}
                                disabled={isResettingPassword || newPasswordVal.length < 6}
                                className="bg-amber-650 hover:bg-amber-700 text-white text-xs h-9 px-4 font-bold rounded-lg shadow-lg flex items-center gap-1.5"
                            >
                                {isResettingPassword ? (
                                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                ) : (
                                    <Key className="h-4 w-4" />
                                )}
                                Réinitialiser
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#16171e]/95 border border-rose-900/60 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-white overflow-hidden backdrop-blur-md">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                            <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Supprimer le compte
                            </h3>
                            <button 
                                onClick={() => setUserToDelete(null)}
                                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                disabled={isDeletingUser}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1">
                                <p className="text-zinc-300">
                                    Vous êtes sur le point de supprimer définitivement le compte de
                                </p>
                                <p className="font-bold text-white text-sm">{userToDelete.full_name}</p>
                                <p className="text-zinc-400">{userToDelete.email}</p>
                            </div>
                            <p className="text-rose-400 font-semibold">
                                ⚠️ Cette action est irréversible. Le compte sera supprimé de la plateforme.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeletingUser}
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xs h-9 px-4 font-bold rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="button" 
                                onClick={handleDeleteUser}
                                disabled={isDeletingUser}
                                className="bg-rose-700 hover:bg-rose-800 text-white text-xs h-9 px-4 font-bold rounded-lg shadow-lg flex items-center gap-1.5"
                            >
                                {isDeletingUser ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Supprimer définitivement
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
