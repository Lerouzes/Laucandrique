'use client'

import { useState } from 'react'
import { 
    Layers, 
    MessageSquare, 
    Mail, 
    AlertTriangle, 
    FileText, 
    Bot, 
    Scale, 
    Send, 
    Check, 
    Clock, 
    RefreshCw, 
    ShieldAlert, 
    ArrowLeft, 
    Mic, 
    ChevronRight, 
    Calendar,
    User,
    Paperclip,
    Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// Types for Command Center items
type ItemType = 'task' | 'email' | 'alert'

interface CommandCenterItem {
    id: string
    syndicateId: string
    syndicateName: string
    title: string
    latencyText: string
    type: ItemType
    originalSubject: string
    originalContent: string
    extractedRuleTitle: string
    extractedRuleText: string
    draftResponse: string

    // Email-specific fields
    fromName?: string
    fromEmail?: string
    toEmail?: string
    receivedAt?: string

    // Task-specific fields
    dueDate?: string
    assignee?: string
    priority?: string
    peopleImplicated?: string
    actionsTaken?: string
    files?: string[]

    // Alert-specific fields
    alertSource?: string
    severity?: string
    triggeredAt?: string
}

// Hardcoded Mock Data with rich task metadata and email headers
const MOCK_ITEMS: CommandCenterItem[] = [
    {
        id: 'item-1',
        syndicateId: 'R106',
        syndicateName: 'Les Condos de la Colline',
        title: 'Infiltration d’eau sous toit principale',
        latencyText: 'En attente depuis 3 jours',
        type: 'task',
        originalSubject: 'Urgent: Fuite de toit appt. 402',
        originalContent: "Bonjour, l'unité 402 rapporte des infiltrations d'eau importantes provenant du toit du bâtiment. C'est critique car de fortes pluies sont annoncées pour demain après-midi. Nous avons besoin d'un couvreur au plus vite.",
        extractedRuleTitle: 'Règlement SDC 8.1 - Mesures Conservatoires Urgentes',
        extractedRuleText: 'En cas d’urgence compromettant l’intégrité structurelle de l’immeuble, le gestionnaire est habilité à engager des travaux de réparation jusqu’à concurrence de 2 500 $ sans l’approbation préalable du conseil d’administration.',
        draftResponse: "Bonjour Monsieur Lapointe,\n\nNous avons bien reçu votre rapport concernant l'infiltration d'eau à l'unité 402.\n\nConformément à l'article 8.1 de votre règlement de copropriété concernant les travaux d'urgence, nous avons mandaté immédiatement l'entreprise Couvreurs Express pour effectuer une réparation temporaire et stopper la fuite. Un technicien interviendra cet après-midi à 14h.\n\nLe devis estimatif s'élève à 1 200 $, ce qui respecte la limite de nos pouvoirs administratifs d'urgence.\n\nNous vous tiendrons informé de la conclusion des travaux.\n\nCordialement,\nL'équipe Gustav",
        
        dueDate: '18 Juillet 2026',
        assignee: 'Stéphane Genest (Gestionnaire)',
        priority: 'Urgent',
        peopleImplicated: 'Julie Roy (Unité 402), Marc Boyer (CA)',
        actionsTaken: 'Bâche temporaire de protection posée ce matin par le concierge. Appel de service logé auprès de Couvreurs Express.',
        files: ['rapport_toiture_2025.pdf', 'photo_infiltration_402.jpg']
    },
    {
        id: 'item-2',
        syndicateId: 'S205',
        syndicateName: 'Les Condos du Parc',
        title: 'Contrevenance de chien de grande taille',
        latencyText: 'En attente depuis 1 jour',
        type: 'email',
        originalSubject: 'Chien non autorisé à l’unité 102',
        originalContent: "Bonjour, j'aimerais signaler que le nouveau locataire du 102 possède un grand Golden Retriever. Je croyais que les animaux de grande taille étaient interdits dans notre déclaration de copropriété. Pouvez-vous faire respecter le règlement ?",
        extractedRuleTitle: 'Règlement SDC Article 11 - Animaux de Compagnie',
        extractedRuleText: 'Les animaux domestiques pesant moins de 15 kg sont autorisés dans les parties privatives. Les chiens de garde ou de grande taille (> 20 kg) sont strictement interdits dans l’ensemble de l’immeuble.',
        draftResponse: "Bonjour Madame Tremblay,\n\nNous faisons suite à votre signalement concernant la présence d'un chien de grande taille à l'unité 102.\n\nAprès vérification de l'article 11 de la déclaration de copropriété de votre syndicat, les chiens de plus de 15 kg ne sont en effet pas permis. Un Golden Retriever dépasse largement cette limite autorisée.\n\nNous adressons aujourd'hui une notification officielle au copropriétaire de l'unité 102 afin de régulariser la situation dans les plus brefs délais.\n\nMerci de veiller à la tranquillité de notre communauté.\n\nSincères salutations,\nL'équipe Gustav",
        
        fromName: 'Julie Tremblay',
        fromEmail: 'j.tremblay@email.com',
        toEmail: 'copilote@laucandrique.com',
        receivedAt: '14 Juillet 2026, 14:32'
    },
    {
        id: 'item-3',
        syndicateId: 'B302',
        syndicateName: 'Résidences du Vieux-Port',
        title: 'Seuil de Réserve Financière Critique',
        latencyText: 'Alerte générée il y a 2 heures',
        type: 'alert',
        originalSubject: 'Alerte Système: Solde Fonds de Prévoyance',
        originalContent: "Alerte de conformité: Le fonds de prévoyance cumulé de la copropriété est descendu à 3.8% du budget de fonctionnement annuel, suite aux réparations imprévues de la pompe de surpression le mois dernier.",
        extractedRuleTitle: 'Loi 16 - Code Civil du Québec (Art. 1071)',
        extractedRuleText: 'Les syndicats de copropriété ont l’obligation de maintenir un fonds de prévoyance liquide égal à au moins 5% des charges communes annuelles de l’exercice en cours.',
        draftResponse: "Chers membres du conseil d'administration,\n\nNous attirons votre attention sur le fait que suite aux récents travaux de la pompe de surpression, le fonds de prévoyance est actuellement à 3,8% du budget annuel, sous la limite légale obligatoire de 5% prescrite par la Loi 16.\n\nAfin de restaurer la conformité légale de la copropriété, nous vous suggérons d'intégrer une cotisation spéciale transitoire de 120 $ par unité lors de la prochaine assemblée générale annuelle prévue le 15 septembre.\n\nNous restons à votre entière disposition pour planifier cette résolution.\n\nCordialement,\nVotre copilote Gustav",
        
        alertSource: 'CondoWeb Sync Ledger',
        severity: 'Critique',
        triggeredAt: '15 Juillet 2026, 17:45'
    },
    {
        id: 'item-4',
        syndicateId: 'T104',
        syndicateName: 'Terrasses du Centre-Ville',
        title: 'Demande de réparation pompe de puisard',
        latencyText: 'En attente depuis 5 jours',
        type: 'task',
        originalSubject: 'Bruit étrange pompe garage sous-sol',
        originalContent: "Bonjour, la pompe de puisard installée au sous-sol du garage fait un bruit mécanique suspect depuis quelques jours et semble s'arrêter par intermittence. C'est risqué s'il y a un orage.",
        extractedRuleTitle: 'Règlement SDC Article 14.2 - Approbations d’Entretien',
        extractedRuleText: 'Le gestionnaire immobilier peut commander directement des réparations de maintien d’actif non urgentes jusqu’à un montant maximal de 1 500 $ sans vote formel du conseil.',
        draftResponse: "Bonjour Monsieur Richard,\n\nNous avons bien reçu votre signalement concernant le comportement anormal de la pompe de puisard du garage.\n\nNous avons obtenu un devis de Plomberie Pro de 850 $ pour le remplacement complet de la pompe défectueuse. En vertu de l'article 14.2 de votre convention de gestion, nous avons validé ce devis afin de prévenir tout refoulement d'eau.\n\nLes travaux seront réalisés ce jeudi matin.\n\nBonne fin de journée,\nL'équipe de gestion",
        
        dueDate: '20 Juillet 2026',
        assignee: 'Stéphane Genest (Gestionnaire)',
        priority: 'Moyenne',
        peopleImplicated: 'Technicien Plomberie Pro, Conseil d’Administration',
        actionsTaken: 'Validation des tarifs du fournisseur. Soumission reçue à 850$.',
        files: ['devis_pompe_plomberie.pdf']
    },
    {
        id: 'item-5',
        syndicateId: 'R408',
        syndicateName: 'Terrasses de la Rivière',
        title: 'Installation Borne Recharge Électrique',
        latencyText: 'En attente depuis 2 jours',
        type: 'email',
        originalSubject: 'Demande de borne EV - Stationnement 45',
        originalContent: "Bonjour, j'aimerais obtenir l'autorisation formelle d'installer une borne de recharge de niveau 2 pour ma nouvelle voiture électrique à mon stationnement privé no 45 au garage sous-terrain.",
        extractedRuleTitle: 'Code Civil du Québec (Art. 1097) - Travaux Majeurs',
        extractedRuleText: 'Toute modification ou ajout d’équipements permanents sur les parties communes (incluant les dalles de stationnement avec droits d’usage exclusifs) doit faire l’objet d’un vote à la double majorité en assemblée générale.',
        draftResponse: "Bonjour Monsieur Gagnon,\n\nFélicitations pour l'achat de votre nouveau véhicule électrique.\n\nConcernant votre demande d'installation d'une borne au stationnement no 45, s'agissant d'un ancrage permanent sur une dalle de béton (partie commune à usage exclusif), le Code civil du Québec exige l'autorisation formelle de l'assemblée des copropriétaires à la majorité qualifiée (Art. 1097).\n\nNous allons inscrire cette résolution à l'ordre du jour de la prochaine assemblée générale du 12 août. Nous vous ferons parvenir le formulaire technique à remplir pour documenter votre projet d'ici là.\n\nSincèrement,\nGustav",
        
        fromName: 'Mathieu Gagnon',
        fromEmail: 'm.gagnon@gmail.com',
        toEmail: 'copilote@laucandrique.com',
        receivedAt: '14 Juillet 2026, 09:15'
    },
    {
        id: 'item-6',
        syndicateId: 'A502',
        syndicateName: 'Château Saint-Laurent',
        title: 'Entretien conduits de sécheuse annuel',
        latencyText: 'En attente depuis 7 jours',
        type: 'task',
        originalSubject: 'Planification nettoyage sécheuses',
        originalContent: "Bonjour, nous devons fixer la date pour la campagne annuelle de nettoyage des conduits de sécheuse de l'immeuble afin d'éviter tout risque d'incendie accumulé.",
        extractedRuleTitle: 'Plan de Maintenance Obligatoire - SDC',
        extractedRuleText: 'Le nettoyage annuel des conduits d’évacuation de sécheuse est obligatoire et pris en charge globalement par le syndicat pour la prévention active des risques d’incendie.',
        draftResponse: "Chers résidents du Château Saint-Laurent,\n\nNous vous informons que la campagne annuelle obligatoire de nettoyage des conduits de sécheuse aura lieu du 14 au 16 octobre prochain.\n\nL'entreprise mandatée est Net-Conduits. Les techniciens devront accéder brièvement à vos unités pour s'assurer du nettoyage complet. Une grille horaire par étage vous sera transmise la semaine prochaine pour organiser votre présence.\n\nNous vous remercions de votre collaboration essentielle pour la sécurité de l'immeuble.\n\nCordialement,\nGustav",
        
        dueDate: '30 Octobre 2026',
        assignee: 'Stéphane Genest (Gestionnaire)',
        priority: 'Planifiée',
        peopleImplicated: 'Tous les résidents, Net-Conduits Inc.',
        actionsTaken: 'Horaires types définis. Négociations tarifaires complétées.',
        files: ['contrat_nettoyage_secheuses_2026.pdf']
    }
]

export default function CommandCenterPage() {
    const [selectedItemId, setSelectedItemId] = useState<string>(MOCK_ITEMS[0].id)
    const [filterType, setFilterType] = useState<string>('all')
    const [isMobileWorkspaceOpen, setIsMobileWorkspaceOpen] = useState<boolean>(false)
    const [chatInput, setChatInput] = useState<string>('')

    // Retrieve active selected item
    const selectedItem = MOCK_ITEMS.find(item => item.id === selectedItemId) || MOCK_ITEMS[0]

    // Track active item text draft locally so it remains editable
    const [draftText, setDraftText] = useState<string>(selectedItem.draftResponse)

    // Reset editable text state when item changes
    const selectItemAndResetDraft = (itemId: string) => {
        setSelectedItemId(itemId)
        const newItem = MOCK_ITEMS.find(item => item.id === itemId)
        if (newItem) {
            setDraftText(newItem.draftResponse)
        }
        setIsMobileWorkspaceOpen(true) // Open workspace view on mobile
    }

    // Filter elements
    const filteredItems = MOCK_ITEMS.filter(item => {
        if (filterType === 'all') return true
        return item.type === filterType
    })

    const handleApprove = () => {
        toast.success(`Succès : Courriel approuvé et envoyé pour le syndicat ${selectedItem.syndicateId} !`)
        setIsMobileWorkspaceOpen(false) // Auto return to list on mobile
    }

    const handleSnooze = () => {
        toast.info(`Tâche reportée de 24h pour le syndicat ${selectedItem.syndicateId}.`)
        setIsMobileWorkspaceOpen(false) // Auto return to list on mobile
    }

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatInput.trim()) return

        toast.loading("Gustav analyse et reformule le brouillon...", {
            id: 'ai-reformulation',
            duration: 1500
        })

        // Simulate AI update locally after timeout
        setTimeout(() => {
            setDraftText(prev => `${prev}\n\n[Mise à jour Gustav suite à votre demande : "${chatInput}"]\nNotre équipe reste disponible pour coordonner le tout.`)
            setChatInput('')
            toast.success("Brouillon mis à jour par le copilote IA !", { id: 'ai-reformulation' })
        }, 1500)
    }

    const getIcon = (type: ItemType, className: string) => {
        switch(type) {
            case 'task':
                return <FileText className={`${className} text-rose-500`} />
            case 'email':
                return <Mail className={`${className} text-sky-400`} />
            case 'alert':
                return <AlertTriangle className={`${className} text-amber-500`} />
        }
    }

    return (
        <div className="flex h-full w-full overflow-hidden text-zinc-200 font-sans">
            
            {/* Left Pane: Stream list of tasks */}
            <div className={`w-full md:w-[38%] xl:w-[32%] min-w-[340px] max-w-[460px] border-r border-white/10 bg-[#0c1c38]/70 backdrop-blur-md flex flex-col h-full shrink-0 transition-transform duration-300 md:translate-x-0 ${
                isMobileWorkspaceOpen ? 'hidden md:flex' : 'flex'
            }`}>
                
                {/* Flow Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Layers className="h-5 w-5 text-cyan-400" />
                            Flux d'attention
                        </h2>
                        <p className="text-xs text-white/50 mt-0.5">
                            {filteredItems.length} élément{filteredItems.length !== 1 && 's'} en attente de traitement
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            toast.success("Flux d'attention synchronisé et à jour.")
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {/* Filter pills */}
                <div className="px-4 py-3 border-b border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-[#08152e]/30">
                    {[
                        { id: 'all', label: 'Tous' },
                        { id: 'task', label: '🔴 Tâches' },
                        { id: 'email', label: '✉️ Courriels' },
                        { id: 'alert', label: '📊 Alertes' }
                    ].map(pill => (
                        <button
                            key={pill.id}
                            onClick={() => setFilterType(pill.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all duration-200 border cursor-pointer shrink-0 ${
                                filterType === pill.id 
                                    ? 'bg-cyan-550 border-cyan-500 text-white shadow-md shadow-cyan-900/30' 
                                    : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-white/70'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>

                {/* Queue list scroll container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin select-none bg-black/10">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-white/30 text-sm flex flex-col items-center justify-center gap-2">
                            <Check className="h-8 w-8 text-emerald-500/55" />
                            Aucun élément en attente pour cette catégorie.
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = item.id === selectedItemId
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => selectItemAndResetDraft(item.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group flex gap-3 cursor-pointer ${
                                        isSelected 
                                            ? 'bg-white/12 border-cyan-500 shadow-lg shadow-cyan-950/20' 
                                            : 'bg-white/5 hover:bg-white/8 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {getIcon(item.type, "h-5 w-5")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#10305a] border border-cyan-800 text-cyan-300 font-mono tracking-wide">
                                                {item.syndicateId}
                                            </span>
                                            <span className="text-[10px] text-white/40 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {item.latencyText.replace('En attente depuis ', '')}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-bold text-zinc-150 group-hover:text-white mt-2 truncate">
                                            {item.title}
                                        </h3>
                                        <p className="text-[11px] text-white/50 truncate mt-1">
                                            {item.originalContent}
                                        </p>
                                    </div>
                                    <ChevronRight className={`h-4 w-4 mt-auto shrink-0 text-white/30 transition-transform ${
                                        isSelected ? 'translate-x-0.5 text-white/80' : 'group-hover:translate-x-0.5'
                                    }`} />
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Right Pane: Workspace view */}
            <div className={`flex-1 flex flex-col h-full bg-[#071025]/85 backdrop-blur-lg transition-all duration-300 ${
                isMobileWorkspaceOpen ? 'flex' : 'hidden md:flex'
            }`}>
                
                {/* Workspace Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0a152d]/90">
                    <div className="flex items-center gap-3">
                        {/* Mobile Back Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileWorkspaceOpen(false)}
                            className="md:hidden text-white/70 hover:text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/80 font-mono">
                                    {selectedItem.syndicateId}
                                </span>
                                <h1 className="text-sm font-black text-white truncate">
                                    {selectedItem.syndicateName}
                                </h1>
                            </div>
                            <p className="text-[11px] text-white/50 mt-1 truncate max-w-[280px] sm:max-w-md">
                                {selectedItem.originalSubject}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            onClick={handleSnooze}
                            className="bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl px-4 py-2 text-xs font-semibold transition-all h-9 cursor-pointer"
                        >
                            Reporter
                        </Button>
                        <Button 
                            onClick={handleApprove}
                            className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-xl px-4 py-2 text-xs font-black shadow-md shadow-emerald-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all h-9 cursor-pointer"
                        >
                            <Check className="mr-1.5 h-4 w-4" />
                            Approuver & Envoyer
                        </Button>
                    </div>
                </div>

                {/* Workspace content - Fixed layout with inner scroll sections */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-[#050b1b]/50">
                    
                    {/* Render dynamically tailored context blocks based on item types */}
                    
                    {/* EMAIL DETAILS CARD */}
                    {selectedItem.type === 'email' && (
                        <div className="rounded-2xl bg-[#091227]/90 border border-white/10 p-5 space-y-4 shadow-xl">
                            <div className="flex items-start justify-between border-b border-white/5 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-sm">
                                        {selectedItem.fromName?.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-zinc-150">{selectedItem.fromName}</h4>
                                        <p className="text-[10px] text-white/40 truncate mt-0.5">
                                            De : {selectedItem.fromEmail} &rarr; Pour : {selectedItem.toEmail}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-white/40 flex items-center gap-1 shrink-0 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                    <Clock className="h-3 w-3" />
                                    {selectedItem.receivedAt}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-[11px] font-bold text-white/40">
                                    Sujet : <span className="text-zinc-200">{selectedItem.originalSubject}</span>
                                </h5>
                                <p className="text-xs text-white/80 leading-relaxed font-sans italic bg-[#040917]/40 p-4 rounded-xl border border-white/5 whitespace-pre-line select-text">
                                    "{selectedItem.originalContent}"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TASK DETAILS CARD */}
                    {selectedItem.type === 'task' && (
                        <div className="rounded-2xl bg-[#091227]/90 border border-white/10 p-5 space-y-4 shadow-xl">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                <FileText className="h-5 w-5 text-rose-500" />
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Fiche de Tâche Opérationnelle</h4>
                            </div>
                            
                            {/* Grid Metadata */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                    <Calendar className="h-4 w-4 text-rose-400" />
                                    <div>
                                        <span className="text-[10px] text-white/40 block">Échéance</span>
                                        <span className="font-bold text-zinc-200">{selectedItem.dueDate}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                    <User className="h-4 w-4 text-cyan-400" />
                                    <div>
                                        <span className="text-[10px] text-white/40 block">Assigné à</span>
                                        <span className="font-bold text-zinc-200">{selectedItem.assignee}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                    <Shield className="h-4 w-4 text-amber-500" />
                                    <div>
                                        <span className="text-[10px] text-white/40 block">Priorité</span>
                                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                            selectedItem.priority === 'Urgent' 
                                                ? 'bg-rose-950/40 text-rose-455 text-rose-500 border border-rose-900/60'
                                                : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/60'
                                        }`}>
                                            {selectedItem.priority}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                    <Layers className="h-4 w-4 text-purple-400" />
                                    <div>
                                        <span className="text-[10px] text-white/40 block">Implication</span>
                                        <span className="font-bold text-zinc-200 truncate block max-w-[200px]" title={selectedItem.peopleImplicated}>
                                            {selectedItem.peopleImplicated}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions taken */}
                            <div className="space-y-1.5 pt-2">
                                <h5 className="text-[10px] font-black uppercase text-white/45 tracking-wide">Actions déjà entreprises</h5>
                                <p className="text-xs text-white/80 leading-relaxed bg-[#040917]/40 p-3.5 rounded-xl border border-white/5">
                                    {selectedItem.actionsTaken}
                                </p>
                            </div>

                            {/* Attached files capsules */}
                            {selectedItem.files && selectedItem.files.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h5 className="text-[10px] font-black uppercase text-white/45 tracking-wide flex items-center gap-1">
                                        <Paperclip className="h-3.5 w-3.5" />
                                        Fichiers et rapports rattachés ({selectedItem.files.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedItem.files.map(file => (
                                            <button 
                                                key={file}
                                                onClick={() => toast.info(`Téléchargement simulé de : ${file}`)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-mono text-cyan-400 transition-all cursor-pointer"
                                            >
                                                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                                {file}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ALERT DETAILS CARD */}
                    {selectedItem.type === 'alert' && (
                        <div className="rounded-2xl bg-[#091227]/90 border border-white/10 p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse shrink-0" />
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Alerte Système Automatique</h4>
                                </div>
                                <span className="text-[10px] text-white/40 flex items-center gap-1 shrink-0 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                    <Clock className="h-3 w-3" />
                                    {selectedItem.triggeredAt}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                    <Layers className="h-4 w-4 text-amber-400" />
                                    <div>
                                        <span className="text-[10px] text-white/40 block">Source</span>
                                        <span className="font-bold text-zinc-200">{selectedItem.alertSource}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                    <ShieldAlert className="h-4 w-4 text-rose-500 animate-bounce-slow" />
                                    <div>
                                        <span className="text-[10px] text-white/40 block">Gravité</span>
                                        <span className="font-bold text-rose-455 text-rose-500">{selectedItem.severity}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-white/80 leading-relaxed font-sans italic bg-[#040917]/40 p-4 rounded-xl border border-white/5 select-text">
                                "{selectedItem.originalContent}"
                            </p>
                        </div>
                    )}

                    {/* Copilot Reference Rule (Extracted Bylaw RAG) */}
                    <div className="rounded-2xl border border-indigo-900/35 bg-indigo-950/15 p-4 space-y-3 shadow-lg">
                        <div className="flex items-center gap-2 text-xs text-indigo-400 font-extrabold uppercase tracking-wide">
                            <Scale className="h-4 w-4 text-indigo-400" />
                            <span>Bylaw Copilote RAG - Extrait de Règlement</span>
                        </div>
                        <div className="text-xs leading-relaxed space-y-1">
                            <h4 className="font-bold text-zinc-200">
                                {selectedItem.extractedRuleTitle}
                            </h4>
                            <p className="text-white/70 bg-indigo-950/25 p-3 rounded-xl border border-indigo-900/30 leading-relaxed">
                                {selectedItem.extractedRuleText}
                            </p>
                        </div>
                    </div>

                    {/* Copilot Draft Editor (Only 1 output text block, no tone toggles) */}
                    <div className="flex flex-col rounded-2xl bg-zinc-950/40 border border-white/10 p-4 space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                            <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                                <Bot className="h-4 w-4 text-cyan-400" />
                                <span>Proposition de réponse copilote Gustav</span>
                            </div>
                        </div>

                        {/* Editable draft textarea */}
                        <textarea
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            className="w-full min-h-[220px] bg-zinc-950 border border-white/5 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 rounded-xl p-4 text-xs font-mono text-zinc-200 outline-none leading-relaxed resize-y transition-colors select-text"
                        />
                    </div>
                </div>

                {/* Bottom Action chat bar input */}
                <div className="px-6 py-4 border-t border-white/10 shrink-0 bg-[#0a152d] flex items-center justify-between">
                    <form onSubmit={handleChatSubmit} className="w-full flex items-center gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Demander une correction à l'IA... (ex: 'Mentionne que le technicien portera un casque')"
                                className="w-full bg-[#050b18] border border-white/10 rounded-xl py-3 pl-4 pr-10 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/25 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => toast.info("Dictée vocale (simulation)")}
                                className="absolute right-3.5 top-3.5 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                            >
                                <Mic className="h-4 w-4" />
                            </button>
                        </div>
                        <Button
                            type="submit"
                            disabled={!chatInput.trim()}
                            className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/25 text-white h-10 px-4 rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:scale-100 cursor-pointer"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

        </div>
    )
}
