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
    ShieldAlert, 
    ArrowLeft, 
    Mic, 
    ChevronRight, 
    Calendar,
    User,
    Paperclip,
    Shield,
    Plus,
    X,
    CheckSquare,
    Square,
    Sparkles,
    RefreshCw,
    Building2,
    CheckCircle2,
    HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// Types for Command Center items
type ItemType = 'task' | 'email' | 'alert'

interface TaskTodo {
    id: string
    text: string
    completed: boolean
}

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
    category?: string
    status?: string
    tags?: string[]
    todos?: TaskTodo[]
    contractors?: string
    followUpDate?: string

    // Alert-specific fields
    alertSource?: string
    severity?: string
    triggeredAt?: string
}

// Chat Direct Message Types
interface GeneratedEmail {
    subject: string
    to: string
    body: string
    unit?: string
    status?: 'draft' | 'approved' | 'queued'
}

interface GeneratedTask {
    title: string
    category: string
    assignee: string
    contractor?: string
    priority: string
    dueDate: string
    followUpDate?: string
    status?: 'draft' | 'created' | 'queued'
    todos: TaskTodo[]
}

interface SuggestedFollowUp {
    text: string
    dueDateText: string
    created?: boolean
}

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    text: string
    timestamp: string
    syndicateId?: string
    syndicateName?: string
    generatedEmail?: GeneratedEmail
    generatedTask?: GeneratedTask
    suggestedFollowUp?: SuggestedFollowUp
}

// List of available Syndicates
const SYNDICATES_LIST = [
    { id: 'GENERAL', name: 'Information Générale (Aucun syndicat spécifique)' },
    { id: 'R106', name: 'Les Condos de la Colline (R106)' },
    { id: 'S205', name: 'Les Condos du Parc (S205)' },
    { id: 'B302', name: 'Résidences du Vieux-Port (B302)' },
    { id: 'T104', name: 'Terrasses du Centre-Ville (T104)' },
    { id: 'R408', name: 'Terrasses de la Rivière (R408)' },
    { id: 'A502', name: 'Château Saint-Laurent (A502)' }
]

// Hardcoded Mock Data (Phases 1 & 2 Refinements)
const INITIAL_MOCK_ITEMS: CommandCenterItem[] = [
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
        files: ['rapport_toiture_2025.pdf', 'photo_infiltration_402.jpg'],
        category: 'Toiture & Enveloppe',
        status: 'En cours',
        tags: ['Infiltration', 'Garantie', 'Structure'],
        todos: [
            { id: 't1-1', text: 'Vérification visuelle par le concierge', completed: true },
            { id: 't1-2', text: 'Appel d\'urgence Couvreurs Express', completed: true },
            { id: 't1-3', text: 'Inspection et réparation temporaire de l\'entretoit', completed: false },
            { id: 't1-4', text: 'Soumettre soumission définitive au CA pour approbation', completed: false }
        ],
        contractors: 'Couvreurs Express Inc.',
        followUpDate: '17 Juillet 2026'
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
        files: ['devis_pompe_plomberie.pdf'],
        category: 'Plomberie & Équipements',
        status: 'Planifié',
        tags: ['Garage', 'Sécurité', 'Maintenance'],
        todos: [
            { id: 't4-1', text: 'Obtention soumission Plomberie Pro', completed: true },
            { id: 't4-2', text: 'Vérification de la limite budgétaire Art. 14.2', completed: true },
            { id: 't4-3', text: 'Confirmation du rendez-vous d\'installation', completed: false }
        ],
        contractors: 'Plomberie Pro Inc.',
        followUpDate: '19 Juillet 2026'
    }
]

// Initial Welcome Message in Gustav Chat
const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
    {
        id: 'msg-1',
        role: 'assistant',
        text: "Bonjour Stéphane ! Je suis Gustav, votre copilote IA d'administration. Vous pouvez me poser n'importe quelle question ou me donner des ordres directs (ex: rédiger un courriel à une unité, planifier une réparation avec un entrepreneur, ou vérifier une clause de règlement).\n\nSélectionnez une copropriété ci-dessus si votre demande concerne un syndicat particulier !",
        timestamp: 'À l\'instant',
        syndicateId: 'GENERAL',
        syndicateName: 'Information Générale'
    }
]

export default function CommandCenterPage() {
    const [mockItems, setMockItems] = useState<CommandCenterItem[]>(INITIAL_MOCK_ITEMS)
    const [selectedItemId, setSelectedItemId] = useState<string>(INITIAL_MOCK_ITEMS[0].id)
    const [filterType, setFilterType] = useState<string>('all')
    const [isMobileWorkspaceOpen, setIsMobileWorkspaceOpen] = useState<boolean>(false)
    const [chatInput, setChatInput] = useState<string>('')

    // Active View Mode: 'queue' (Flux d'attention) or 'direct_chat' (Chat Direct avec Gustav)
    const [viewMode, setViewMode] = useState<'queue' | 'direct_chat'>('queue')

    // Direct Chat States
    const [selectedChatSyndicate, setSelectedChatSyndicate] = useState<string>('R106')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES)
    const [directChatInput, setDirectChatInput] = useState<string>('')
    const [isProcessingChat, setIsProcessingChat] = useState<boolean>(false)

    // New Request Form states
    const [isCreatingNewRequest, setIsCreatingNewRequest] = useState<boolean>(false)
    const [newRequestSyndicate, setNewRequestSyndicate] = useState<string>('GENERAL')
    const [newRequestInstruction, setNewRequestInstruction] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState<boolean>(false)

    // Retrieve active selected item
    const selectedItem = mockItems.find(item => item.id === selectedItemId) || mockItems[0]

    // Track active item text draft locally so it remains editable
    const [draftText, setDraftText] = useState<string>(selectedItem ? selectedItem.draftResponse : '')

    // Reset editable text state when item changes
    const selectItemAndResetDraft = (itemId: string) => {
        setIsCreatingNewRequest(false)
        setSelectedItemId(itemId)
        const newItem = mockItems.find(item => item.id === itemId)
        if (newItem) {
            setDraftText(newItem.draftResponse)
        }
        setIsMobileWorkspaceOpen(true)
    }

    // Toggle todo items locally
    const handleToggleTodo = (itemId: string, todoId: string) => {
        setMockItems(prev => prev.map(item => {
            if (item.id !== itemId) return item
            return {
                ...item,
                todos: item.todos?.map(todo => {
                    if (todo.id !== todoId) return todo
                    return { ...todo, completed: !todo.completed }
                })
            }
        }))
    }

    // Filter elements
    const filteredItems = mockItems.filter(item => {
        if (filterType === 'all') return true
        return item.type === filterType
    })

    const handleApprove = () => {
        toast.success(`Succès : Courriel approuvé et envoyé pour le syndicat ${selectedItem.syndicateId} !`)
        setIsMobileWorkspaceOpen(false)
    }

    const handleSnooze = () => {
        toast.info(`Tâche reportée de 24h pour le syndicat ${selectedItem.syndicateId}.`)
        setIsMobileWorkspaceOpen(false)
    }

    // Reformulation prompt inside specific item workspace
    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatInput.trim()) return

        toast.loading("Gustav analyse et reformule le brouillon...", {
            id: 'ai-reformulation',
            duration: 1500
        })

        setTimeout(() => {
            setDraftText(prev => `${prev}\n\n[Mise à jour Gustav suite à votre demande : "${chatInput}"]\nNotre équipe reste disponible pour coordonner le tout.`)
            setChatInput('')
            toast.success("Brouillon mis à jour par le copilote IA !", { id: 'ai-reformulation' })
        }, 1500)
    }

    // Helper: calculate date string 5 business days in future
    const getFiveBusinessDaysDate = () => {
        const d = new Date()
        let addedDays = 0
        while (addedDays < 5) {
            d.setDate(d.getDate() + 1)
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                addedDays++
            }
        }
        return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    // DIRECT CHAT: Process orders & queries
    const handleDirectChatSubmit = (e: React.FormEvent, customPrompt?: string) => {
        if (e) e.preventDefault()
        const textToProcess = customPrompt || directChatInput
        if (!textToProcess.trim() || isProcessingChat) return

        const activeSyndicateObj = SYNDICATES_LIST.find(s => s.id === selectedChatSyndicate) || SYNDICATES_LIST[1]
        const syndicateId = activeSyndicateObj.id
        const syndicateName = activeSyndicateObj.name

        // 1. Add User Message
        const userMsg: ChatMessage = {
            id: `msg-user-${Date.now()}`,
            role: 'user',
            text: textToProcess.trim(),
            timestamp: new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }),
            syndicateId,
            syndicateName
        }

        setChatMessages(prev => [...prev, userMsg])
        if (!customPrompt) setDirectChatInput('')
        setIsProcessingChat(true)

        // 2. Process Intent & Generate Response
        setTimeout(() => {
            const lower = textToProcess.toLowerCase()
            const timeStr = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
            const followUpDateStr = getFiveBusinessDaysDate()

            let assistantMsg: ChatMessage

            // INTENT A: EMAIL ORDER (ex: unit 501, email, write, inform)
            if (lower.includes('courriel') || lower.includes('email') || lower.includes('écris') || lower.includes('ecris') || lower.includes('unité') || lower.includes('501') || lower.includes('visite')) {
                const targetUnit = lower.includes('501') ? 'Unité 501' : (lower.match(/unité\s*\d+/i)?.[0] || 'Résidents')
                
                assistantMsg = {
                    id: `msg-ai-${Date.now()}`,
                    role: 'assistant',
                    text: `J'ai rédigé le brouillon de courriel pour **${targetUnit}** du syndicat **${syndicateName}**. Vous pouvez réviser la proposition ci-dessous et l'approuver ou l'ajouter à votre flux d'attention.`,
                    timestamp: timeStr,
                    syndicateId,
                    syndicateName,
                    generatedEmail: {
                        subject: `Avis de passage - Visite d'un entrepreneur pour l'${targetUnit}`,
                        to: `coproprietaire.${targetUnit.toLowerCase().replace(/\s+/g, '')}@laucandrique.com`,
                        unit: targetUnit,
                        body: `Bonjour,\n\nNous vous informons qu'une visite d'inspection et d'intervention d'un entrepreneur spécialisé est planifiée pour votre ${targetUnit} (${syndicateName}) demain à 09h00.\n\nMerci d'assurer l'accès à l'unité ou de laisser les clés au concierge de l'immeuble.\n\nSincères salutations,\nL'équipe de gestion Gustav - Laucandrique`,
                        status: 'draft'
                    }
                }
            }
            // INTENT B: TASK / REPAIR / CONTRACTOR ORDER (ex: réparation, fuite, pompe, tâche, plomberie, entrepreneur, devis)
            else if (lower.includes('tâche') || lower.includes('tache') || lower.includes('réparation') || lower.includes('reparation') || lower.includes('plomberie') || lower.includes('entrepreneur') || lower.includes('devis') || lower.includes('soumission') || lower.includes('crée') || lower.includes('creer')) {
                const contractorName = lower.includes('plomberie') ? 'Plomberie Pro Inc.' : 'Couvreurs Express Inc.'
                
                assistantMsg = {
                    id: `msg-ai-${Date.now()}`,
                    role: 'assistant',
                    text: `Parfait ! J'ai structuré la nouvelle tâche de réparation pour le syndicat **${syndicateName}** avec demande d'intervention auprès de **${contractorName}**.\n\n📌 **Suivi automatique recommandé** : Aucune tâche de suivi n'était associée à cette demande d'obtention de devis. Souhaitez-vous que je crée également un rappel automatique planifié dans 5 jours ouvrables (le **${followUpDateStr}**) ?`,
                    timestamp: timeStr,
                    syndicateId,
                    syndicateName,
                    generatedTask: {
                        title: `Réparation urgente & Demande de devis (${contractorName})`,
                        category: 'Plomberie & Équipements',
                        assignee: 'Stéphane Genest (Gestionnaire)',
                        contractor: contractorName,
                        priority: 'Élevée',
                        dueDate: followUpDateStr,
                        followUpDate: followUpDateStr,
                        status: 'draft',
                        todos: [
                            { id: `t-gen-1`, text: `Transmettre la demande d'intervention à ${contractorName}`, completed: true },
                            { id: `t-gen-2`, text: `Accusé de réception et confirmation de la date par l'entrepreneur`, completed: false },
                            { id: `t-gen-3`, text: `Vérification du devis selon les plafonds de gestion`, completed: false }
                        ]
                    },
                    suggestedFollowUp: {
                        text: `Tâche de relance automatique de devis (${contractorName}) - 5 jours ouvrables`,
                        dueDateText: followUpDateStr,
                        created: false
                    }
                }
            }
            // INTENT C: GENERAL QUESTION / BYLAW QUERY
            else {
                assistantMsg = {
                    id: `msg-ai-${Date.now()}`,
                    role: 'assistant',
                    text: `Voici les éléments d'information enregistrés dans la base de connaissances de **${syndicateName}** concernant votre demande :\n\n• **Règlement de l'immeuble** : Les travaux bruyants sont autorisés du lundi au vendredi de 8h00 à 17h00. Les réparations urgentes d'infrastructures communes sont prises en charge directement par la gestion.\n• **Pouvoir du Gestionnaire** : Dépenses autorisées jusqu'à 1 500 $ sans approbation formelle du CA.\n\nSouhaitez-vous que je génère une communication aux copropriétaires ou que je consigne une note d'action ?`,
                    timestamp: timeStr,
                    syndicateId,
                    syndicateName
                }
            }

            setChatMessages(prev => [...prev, assistantMsg])
            setIsProcessingChat(false)
        }, 1200)
    }

    // Handler: Approve & send generated email from chat
    const handleApproveGeneratedEmail = (msgId: string) => {
        setChatMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.generatedEmail) return m
            return {
                ...m,
                generatedEmail: { ...m.generatedEmail, status: 'approved' }
            }
        }))
        toast.success("Succès : Le courriel a été approuvé et transmis immédiatement par Gustav !")
    }

    // Handler: Add generated email from chat to main Attention Queue
    const handleAddGeneratedEmailToQueue = (msgId: string) => {
        const targetMsg = chatMessages.find(m => m.id === msgId)
        if (!targetMsg || !targetMsg.generatedEmail) return

        const email = targetMsg.generatedEmail
        const syndicateId = targetMsg.syndicateId || 'GEN'
        const syndicateName = targetMsg.syndicateName || 'Copropriété Gustav'

        const newItem: CommandCenterItem = {
            id: `item-chat-${Date.now()}`,
            syndicateId,
            syndicateName,
            title: email.subject,
            latencyText: 'Créé depuis le Chat Direct',
            type: 'email',
            originalSubject: email.subject,
            originalContent: email.body,
            extractedRuleTitle: 'Règlement & Instructions Directes Gestionnaire',
            extractedRuleText: 'Communication directe initiée via le Chat Copilote Gustav.',
            draftResponse: email.body,
            fromName: 'Stéphane Genest (Command Direct Chat)',
            fromEmail: 'copilote@laucandrique.com',
            toEmail: email.to,
            receivedAt: 'À l\'instant'
        }

        setMockItems(prev => [newItem, ...prev])
        setSelectedItemId(newItem.id)
        setDraftText(newItem.draftResponse)

        setChatMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.generatedEmail) return m
            return {
                ...m,
                generatedEmail: { ...m.generatedEmail, status: 'queued' }
            }
        }))

        toast.success("Courriel ajouté au flux d'attention !")
    }

    // Handler: Confirm task creation from chat
    const handleConfirmGeneratedTask = (msgId: string) => {
        const targetMsg = chatMessages.find(m => m.id === msgId)
        if (!targetMsg || !targetMsg.generatedTask) return

        const task = targetMsg.generatedTask
        const syndicateId = targetMsg.syndicateId || 'GEN'
        const syndicateName = targetMsg.syndicateName || 'Copropriété Gustav'

        const newItem: CommandCenterItem = {
            id: `item-task-chat-${Date.now()}`,
            syndicateId,
            syndicateName,
            title: task.title,
            latencyText: 'Tâche créée depuis Chat Direct',
            type: 'task',
            originalSubject: task.title,
            originalContent: `Demande de réparation transmise à ${task.contractor || 'Fournisseur'}.`,
            extractedRuleTitle: 'Règlement SDC - Maintien des d\'Actifs',
            extractedRuleText: 'Ordre de service officiel créé par le gestionnaire.',
            draftResponse: `Bonjour,\n\nUne fiche de réparation a été ouverte pour le syndicat ${syndicateName}. L'entrepreneur ${task.contractor} interviendra d'ici le ${task.dueDate}.\n\nCordialement,\nGustav`,
            dueDate: task.dueDate,
            assignee: task.assignee,
            priority: task.priority,
            category: task.category,
            status: 'En cours',
            contractors: task.contractor || 'Plomberie Pro Inc.',
            followUpDate: task.followUpDate,
            todos: task.todos
        }

        setMockItems(prev => [newItem, ...prev])
        setSelectedItemId(newItem.id)

        setChatMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.generatedTask) return m
            return {
                ...m,
                generatedTask: { ...m.generatedTask, status: 'created' }
            }
        }))

        toast.success("Tâche de réparation créée et ajoutée aux opérations !")
    }

    // Handler: Proactive 5-day follow-up task creation
    const handleCreateFollowUpTask = (msgId: string) => {
        const targetMsg = chatMessages.find(m => m.id === msgId)
        if (!targetMsg || !targetMsg.suggestedFollowUp) return

        const followUp = targetMsg.suggestedFollowUp
        const syndicateId = targetMsg.syndicateId || 'GEN'
        const syndicateName = targetMsg.syndicateName || 'Copropriété Gustav'

        const followUpItem: CommandCenterItem = {
            id: `item-followup-${Date.now()}`,
            syndicateId,
            syndicateName,
            title: followUp.text,
            latencyText: 'Rappel automatique planifié (5j)',
            type: 'task',
            originalSubject: followUp.text,
            originalContent: `Relance automatique auprès de l'entrepreneur pour valider la réception de la soumission de devis.`,
            extractedRuleTitle: 'Système Proactif Gustav - Suivi 5 Jours',
            extractedRuleText: 'Les demandes de devis d\'entrepreneurs sans réponse après 5 jours ouvrables génèrent un rappel d\'imputabilité.',
            draftResponse: `Bonjour,\n\nCeci est le rappel de suivi automatique à 5 jours pour s'assurer que le devis du fournisseur pour le syndicat ${syndicateName} a bien été reçu.\n\nMerci,\nGustav`,
            dueDate: followUp.dueDateText,
            assignee: 'Stéphane Genest (Gestionnaire)',
            priority: 'Moyenne',
            category: 'Suivi de Devis',
            status: 'Planifié',
            followUpDate: followUp.dueDateText,
            todos: [
                { id: `tf-1`, text: 'Vérifier la réception du devis dans la boîte courriel', completed: false },
                { id: `tf-2`, text: 'Relancer l\'entrepreneur si aucune réponse', completed: false }
            ]
        }

        setMockItems(prev => [followUpItem, ...prev])

        setChatMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.suggestedFollowUp) return m
            return {
                ...m,
                suggestedFollowUp: { ...m.suggestedFollowUp, created: true }
            }
        }))

        toast.success(`Tâche de suivi automatique créée pour le ${followUp.dueDateText} !`)
    }

    // Create New Request Flow (Simulated AI generation)
    const handleCreateNewRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newRequestInstruction.trim()) {
            toast.error("Veuillez entrer une instruction.")
            return
        }

        setIsGenerating(true)
        toast.loading("Gustav interroge le RAG et rédige la réponse...", { id: 'generating-new' })

        setTimeout(() => {
            const isGeneral = newRequestSyndicate === 'GENERAL'
            const matchingSyndicate = INITIAL_MOCK_ITEMS.find(i => i.syndicateId === newRequestSyndicate)
            const syndicateId = isGeneral ? 'GEN' : newRequestSyndicate
            const syndicateName = isGeneral ? 'Information Générale' : (matchingSyndicate ? matchingSyndicate.syndicateName : 'Copropriété Gustav')

            const truncatedTitle = newRequestInstruction.length > 50 
                ? newRequestInstruction.substring(0, 50).trim() + '...' 
                : newRequestInstruction.trim()

            const generatedEmail = isGeneral
                ? `Bonjour,\n\nVous trouverez ci-dessous les informations demandées :\n\n[Détails de l'analyse Gustav suite à votre requête générale : "${newRequestInstruction}"]\n\nN'hésitez pas si vous avez d'autres questions.\n\nCordialement,\nVotre copilote Gustav`
                : `Bonjour aux copropriétaires du syndicat ${syndicateId} (${syndicateName}),\n\nNous faisons suite à votre demande.\n\nNotre équipe a analysé les instructions réglementaires applicables. Nous vous confirmons que nous prenons en charge cette demande.\n\n[Détails de l'action copilote : ${newRequestInstruction}]\n\nN'hésitez pas à nous faire part de vos commentaires.\n\nCordialement,\nVotre gestionnaire Gustav`
            
            const newRequestItem: CommandCenterItem = {
                id: `item-${Date.now()}`,
                syndicateId: syndicateId,
                syndicateName: syndicateName,
                title: truncatedTitle,
                latencyText: 'Alerte générée à l\'instant',
                type: 'email',
                originalSubject: isGeneral ? 'Requête Copilote Générale' : `Requête IA : ${syndicateName}`,
                originalContent: newRequestInstruction,
                extractedRuleTitle: isGeneral ? 'Base de Connaissances Générale' : 'Règlement SDC standard & Règles Générales',
                extractedRuleText: isGeneral ? 'Informations générales sur la gestion immobilière et les meilleures pratiques administratives.' : 'Selon le règlement cadre du syndicat, toute demande de communication générale aux copropriétaires doit être validée par le gestionnaire ou un administrateur désigné.',
                draftResponse: generatedEmail,
                fromName: 'Requête Manuelle Gestionnaire',
                fromEmail: 'copilote@laucandrique.com',
                toEmail: 'conseil@laucandrique.com',
                receivedAt: 'À l\'instant'
            }

            setMockItems(prev => [newRequestItem, ...prev])
            setSelectedItemId(newRequestItem.id)
            setDraftText(newRequestItem.draftResponse)

            setNewRequestInstruction('')
            setIsCreatingNewRequest(false)
            setIsGenerating(false)
            setIsMobileWorkspaceOpen(true)

            toast.success("Nouveau brouillon rédigé par Gustav !", { id: 'generating-new' })
        }, 2000)
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
        <div className="flex h-full w-full overflow-hidden text-zinc-200 font-sans bg-[#050b18]">
            
            {/* Left Pane: Navigation & Attention Stream or Mode Selector */}
            <div className={`w-full md:w-[38%] xl:w-[32%] min-w-[340px] max-w-[460px] border-r border-white/10 bg-[#0c1c38]/70 backdrop-blur-md flex flex-col h-full shrink-0 transition-transform duration-300 md:translate-x-0 ${
                isMobileWorkspaceOpen ? 'hidden md:flex' : 'flex'
            }`}>
                
                {/* Flow Header with Mode Switcher */}
                <div className="px-5 py-4 border-b border-white/10 space-y-3 shrink-0 bg-[#08152e]/80">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Layers className="h-5 w-5 text-cyan-400" />
                                Centre de Commande
                            </h2>
                            <p className="text-[10px] text-white/50 mt-0.5">
                                Copilote de Gestion Gustav & Opérations
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    toast.success("Données synchronisées.")
                                }}
                                className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer h-7 w-7"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            
                            <Button
                                onClick={() => {
                                    setViewMode('queue')
                                    setIsCreatingNewRequest(true)
                                }}
                                className="flex items-center justify-center h-7 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] gap-1 shadow-md cursor-pointer"
                            >
                                <Plus className="h-3 w-3" />
                                Requête
                            </Button>
                        </div>
                    </div>

                    {/* Mode Segment Switcher: Flux d'attention vs Chat Direct Gustav */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/30 rounded-xl border border-white/10 text-xs">
                        <button
                            onClick={() => {
                                setViewMode('queue')
                                setIsCreatingNewRequest(false)
                            }}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                viewMode === 'queue'
                                    ? 'bg-cyan-600 text-white shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Flux ({mockItems.length})
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('direct_chat')
                                setIsCreatingNewRequest(false)
                                setIsMobileWorkspaceOpen(true)
                            }}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                viewMode === 'direct_chat'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <MessageSquare className="h-3.5 w-3.5 text-purple-300 animate-pulse" />
                            Chat Gustav
                        </button>
                    </div>
                </div>

                {/* Left Pane Content - Queue Stream Filters & List */}
                {viewMode === 'queue' ? (
                    <>
                        {/* Filter pills */}
                        <div className="px-4 py-2.5 border-b border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-[#08152e]/30">
                            {[
                                { id: 'all', label: 'Tous' },
                                { id: 'task', label: '🔴 Tâches' },
                                { id: 'email', label: '✉️ Courriels' },
                                { id: 'alert', label: '📊 Alertes' }
                            ].map(pill => (
                                <button
                                    key={pill.id}
                                    onClick={() => setFilterType(pill.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold select-none transition-all border cursor-pointer shrink-0 ${
                                        filterType === pill.id 
                                            ? 'bg-cyan-550 border-cyan-500 text-white shadow-md' 
                                            : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/70'
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            ))}
                        </div>

                        {/* Queue list scroll container */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin select-none bg-black/10">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-12 text-white/30 text-xs flex flex-col items-center justify-center gap-2">
                                    <Check className="h-8 w-8 text-emerald-500/55" />
                                    Aucun élément en attente.
                                </div>
                            ) : (
                                filteredItems.map(item => {
                                    const isSelected = item.id === selectedItemId && !isCreatingNewRequest && viewMode === 'queue'
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => selectItemAndResetDraft(item.id)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all group flex gap-2.5 cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-white/12 border-cyan-500 shadow-lg' 
                                                    : 'bg-white/5 hover:bg-white/8 border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {getIcon(item.type, "h-4 w-4")}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-1.5">
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#10305a] border border-cyan-800 text-cyan-300 font-mono">
                                                        {item.syndicateId}
                                                    </span>
                                                    <span className="text-[9px] text-white/40 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {item.latencyText.replace('En attente depuis ', '')}
                                                    </span>
                                                </div>
                                                <h3 className="text-xs font-bold text-zinc-150 group-hover:text-white mt-1.5 truncate">
                                                    {item.title}
                                                </h3>
                                                <p className="text-[10px] text-white/50 truncate mt-0.5">
                                                    {item.originalContent}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </>
                ) : (
                    /* DIRECT CHAT SIDE PANEL PREVIEW */
                    <div className="flex-1 p-4 flex flex-col justify-between space-y-4 overflow-y-auto bg-gradient-to-b from-purple-950/10 to-transparent">
                        <div className="space-y-3">
                            <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-2">
                                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block flex items-center gap-1">
                                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                                    Mode Chat Direct Actif
                                </span>
                                <p className="text-xs text-white/70 leading-relaxed">
                                    Vous êtes en communication directe avec l'IA Gustav. Posez-lui une question ou donnez des ordres d'envoi de courriels et de création de tâches.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-wider">
                                    Copropriété Ciblée :
                                </label>
                                <select
                                    value={selectedChatSyndicate}
                                    onChange={(e) => setSelectedChatSyndicate(e.target.value)}
                                    className="w-full bg-[#0c1326] border border-purple-500/30 rounded-xl p-2.5 text-xs text-purple-200 outline-none focus:border-purple-500 font-semibold cursor-pointer"
                                >
                                    {SYNDICATES_LIST.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 space-y-2">
                                <span className="text-[10px] font-bold uppercase text-white/40 tracking-wider block">
                                    Exemples de commandes :
                                </span>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => handleDirectChatSubmit(null as any, "Écris un courriel à l'unité 501 pour informer que la visite de l'entrepreneur est planifiée demain à 9h.")}
                                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                                    >
                                        ✉️ Informer l'unité 501 de la visite demain 9h
                                    </button>
                                    <button
                                        onClick={() => handleDirectChatSubmit(null as any, "Crée une nouvelle tâche pour une fuite de tuyau au garage et demande un devis à Plomberie Pro.")}
                                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                                    >
                                        🔧 Créer tâche de fuite + devis Plomberie Pro
                                    </button>
                                    <button
                                        onClick={() => handleDirectChatSubmit(null as any, "Quelle est la règle concernant la présence de chiens de grande taille dans la copropriété ?")}
                                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                                    >
                                        📜 Consulter le règlement sur les animaux
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => setViewMode('queue')}
                            variant="outline"
                            className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs font-semibold h-9"
                        >
                            &larr; Revenir au Flux d'attention
                        </Button>
                    </div>
                )}
            </div>

            {/* Right Pane: Workspace view (Queue Item Details OR Direct Chat Workspace) */}
            <div className={`flex-1 flex flex-col h-full bg-[#071025]/85 backdrop-blur-lg transition-all duration-300 ${
                isMobileWorkspaceOpen ? 'flex' : 'hidden md:flex'
            }`}>
                
                {/* DIRECT CHAT WORKSPACE MODE */}
                {viewMode === 'direct_chat' ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Chat Header */}
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0a152d]/90">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMobileWorkspaceOpen(false)}
                                    className="md:hidden text-white/70 hover:text-white"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                                        <Bot className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h1 className="text-sm font-black text-white flex items-center gap-2">
                                            Chat Direct Gustav
                                            <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-700/60 px-1.5 py-0.5 rounded-full font-mono">
                                                En Direct
                                            </span>
                                        </h1>
                                        <p className="text-[10px] text-white/50">
                                            Contexte sélectionné : <span className="text-purple-300 font-bold">{SYNDICATES_LIST.find(s => s.id === selectedChatSyndicate)?.name}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Syndicate Switcher Header */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedChatSyndicate}
                                    onChange={(e) => setSelectedChatSyndicate(e.target.value)}
                                    className="bg-[#0c1326] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-purple-500 font-semibold cursor-pointer"
                                >
                                    {SYNDICATES_LIST.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Chat Messages Conversation Thread */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-[#050b1b]/50">
                            {chatMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col space-y-2 ${
                                        msg.role === 'user' ? 'items-end' : 'items-start'
                                    }`}
                                >
                                    {/* Message Bubble */}
                                    <div
                                        className={`max-w-[85%] rounded-2xl p-4 space-y-3 shadow-xl ${
                                            msg.role === 'user'
                                                ? 'bg-cyan-600 text-white rounded-br-none'
                                                : 'bg-[#091227]/95 border border-white/10 text-zinc-200 rounded-bl-none'
                                        }`}
                                    >
                                        {/* Header info */}
                                        <div className="flex items-center justify-between text-[10px] opacity-75 border-b border-white/10 pb-1.5 gap-4">
                                            <span className="font-bold flex items-center gap-1">
                                                {msg.role === 'user' ? (
                                                    <>Stéphane Genest</>
                                                ) : (
                                                    <><Bot className="h-3 w-3 text-purple-400" /> Gustav Copilote IA</>
                                                )}
                                            </span>
                                            <span>{msg.timestamp}</span>
                                        </div>

                                        {/* Text content */}
                                        <p className="text-xs leading-relaxed whitespace-pre-line select-text">
                                            {msg.text}
                                        </p>

                                        {/* GENERATED EMAIL ACTION CARD */}
                                        {msg.generatedEmail && (
                                            <div className="mt-3 p-4 rounded-xl bg-zinc-950/80 border border-sky-500/30 space-y-3">
                                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        Brouillon de Courriel Généré
                                                    </span>
                                                    {msg.generatedEmail.status === 'approved' && (
                                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Envoyé
                                                        </span>
                                                    )}
                                                    {msg.generatedEmail.status === 'queued' && (
                                                        <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Layers className="h-3 w-3" /> Dans le flux
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-1 text-xs">
                                                    <div className="text-[11px] font-bold text-white">
                                                        Sujet : <span className="text-zinc-200">{msg.generatedEmail.subject}</span>
                                                    </div>
                                                    <div className="text-[10px] text-white/50">
                                                        Destinataire : <span className="font-mono text-zinc-300">{msg.generatedEmail.to}</span>
                                                    </div>
                                                    <div className="p-3 bg-zinc-900/60 rounded-lg border border-white/5 text-xxs font-mono text-zinc-300 whitespace-pre-line">
                                                        {msg.generatedEmail.body}
                                                    </div>
                                                </div>

                                                {/* Action Buttons for Email */}
                                                {msg.generatedEmail.status === 'draft' && (
                                                    <div className="flex gap-2 pt-1">
                                                        <Button
                                                            onClick={() => handleApproveGeneratedEmail(msg.id)}
                                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 rounded-lg"
                                                        >
                                                            <Check className="mr-1 h-3.5 w-3.5" />
                                                            Approuver & Envoyer
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAddGeneratedEmailToQueue(msg.id)}
                                                            variant="outline"
                                                            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-cyan-300 font-bold text-xs h-8 rounded-lg"
                                                        >
                                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                                            Ajouter au flux
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* GENERATED TASK ACTION CARD */}
                                        {msg.generatedTask && (
                                            <div className="mt-3 p-4 rounded-xl bg-zinc-950/80 border border-rose-500/30 space-y-3">
                                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                                    <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        Nouvelle Tâche de Réparation
                                                    </span>
                                                    {msg.generatedTask.status === 'created' && (
                                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Tâche Créée
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5 text-xs">
                                                    <h4 className="font-bold text-white">{msg.generatedTask.title}</h4>
                                                    <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 bg-zinc-900/50 p-2 rounded-lg">
                                                        <div>Entrepreneur: <strong className="text-zinc-200">{msg.generatedTask.contractor}</strong></div>
                                                        <div>Échéance: <strong className="text-amber-400">{msg.generatedTask.dueDate}</strong></div>
                                                    </div>
                                                </div>

                                                {msg.generatedTask.status === 'draft' && (
                                                    <Button
                                                        onClick={() => handleConfirmGeneratedTask(msg.id)}
                                                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-8 rounded-lg"
                                                    >
                                                        <Check className="mr-1 h-3.5 w-3.5" />
                                                        Confirmer la création de tâche
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {/* PROACTIVE FOLLOW-UP SUGGESTION CARD */}
                                        {msg.suggestedFollowUp && (
                                            <div className="mt-3 p-3.5 rounded-xl bg-purple-950/40 border border-purple-600/40 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
                                                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                                        Suggestion Proactive Copilote (Suivi 5j)
                                                    </span>
                                                    {msg.suggestedFollowUp.created && (
                                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded-full">
                                                            Planifié pour le {msg.suggestedFollowUp.dueDateText}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-purple-200 font-medium">
                                                    {msg.suggestedFollowUp.text}
                                                </p>

                                                {!msg.suggestedFollowUp.created && (
                                                    <Button
                                                        onClick={() => handleCreateFollowUpTask(msg.id)}
                                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8 rounded-lg shadow-md"
                                                    >
                                                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                                        Créer la tâche de suivi (5 jours - {msg.suggestedFollowUp.dueDateText})
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isProcessingChat && (
                                <div className="flex items-center gap-2 text-xs text-purple-400 font-semibold bg-purple-950/20 p-3 rounded-xl border border-purple-900/30 animate-pulse w-fit">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Gustav rédigera et analyse votre ordre...
                                </div>
                            )}
                        </div>

                        {/* Bottom Direct Chat Input */}
                        <div className="px-6 py-4 border-t border-white/10 shrink-0 bg-[#0a152d] flex items-center justify-between">
                            <form onSubmit={(e) => handleDirectChatSubmit(e)} className="w-full flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={directChatInput}
                                        onChange={(e) => setDirectChatInput(e.target.value)}
                                        placeholder="Poser une question ou donner un ordre direct à Gustav (ex: 'Écris un courriel à l'unité 501...')"
                                        className="w-full bg-[#050b18] border border-purple-500/30 rounded-xl py-3 pl-4 pr-10 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/25 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toast.info("Dictée vocale activée (simulation)")}
                                        className="absolute right-3.5 top-3.5 text-white/40 hover:text-white/80 cursor-pointer"
                                    >
                                        <Mic className="h-4 w-4" />
                                    </button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={!directChatInput.trim() || isProcessingChat}
                                    className="bg-purple-600 hover:bg-purple-500 border border-purple-500/25 text-white h-10 px-4 rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* ATTENTION QUEUE ITEM WORKSPACE (EXISTING QUEUE ITEM WORKSPACE) */
                    isCreatingNewRequest ? (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Form Header */}
                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0a152d]">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setIsCreatingNewRequest(false)
                                            setIsMobileWorkspaceOpen(false)
                                        }}
                                        className="text-white/70 hover:text-white hover:bg-white/10"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                    <div>
                                        <h1 className="text-sm font-black text-white flex items-center gap-2">
                                            <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                                            Nouvelle Requête Copilote Gustav
                                        </h1>
                                        <p className="text-[10px] text-white/40 mt-0.5">
                                            Rédigez une consigne de courriel ou un avis pour une copropriété spécifique.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Form Body Scroll area */}
                            <form onSubmit={handleCreateNewRequestSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-[#050b1b]/50">
                                
                                {/* Syndicate Selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                                        Sélectionner la Copropriété (Syndicat)
                                    </label>
                                    <select
                                        value={newRequestSyndicate}
                                        onChange={(e) => setNewRequestSyndicate(e.target.value)}
                                        className="w-full bg-[#0c1326] border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 cursor-pointer"
                                    >
                                        {SYNDICATES_LIST.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Instruction prompt */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                                        Instructions pour l'IA (Description du courriel à rédiger)
                                    </label>
                                    <textarea
                                        value={newRequestInstruction}
                                        onChange={(e) => setNewRequestInstruction(e.target.value)}
                                        placeholder="Décrivez précisément ce que vous souhaitez rédiger (Ex: 'Écris un courriel courtois mais ferme pour rappeler à l'unité 302 que son chèque mensuel a été rejeté le 1er juillet. Demande de régulariser par virement Interac sous 48h.')"
                                        className="w-full min-h-[160px] bg-[#0c1326] border border-white/10 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 rounded-xl p-4 text-xs font-sans text-zinc-200 placeholder:text-white/20 outline-none leading-relaxed resize-y"
                                    />
                                </div>

                                {/* Action Button */}
                                <Button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 border border-cyan-500/25 text-white h-11 rounded-xl text-xs font-black shadow-lg cursor-pointer"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Génération de la réponse...
                                        </>
                                    ) : (
                                        <>
                                            <Bot className="mr-2 h-4.5 w-4.5" />
                                            Rédiger avec le Copilote Gustav
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    ) : (
                        /* CONTEXT VIEW & DRAFT EDITOR STATE */
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Workspace Header */}
                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0a152d]/90">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsMobileWorkspaceOpen(false)}
                                        className="md:hidden text-white/70 hover:text-white"
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
                                        className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all h-9 cursor-pointer"
                                    >
                                        <Check className="mr-1.5 h-4 w-4" />
                                        Approuver & Envoyer
                                    </Button>
                                </div>
                            </div>

                            {/* Workspace scroll content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-[#050b1b]/50">
                                
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
                                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-rose-500" />
                                                <div>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Fiche Opérationnelle</h4>
                                                    <span className="text-[10px] text-rose-400 font-bold bg-rose-950/20 border border-rose-900/40 px-2 py-0.5 rounded">
                                                        {selectedItem.category}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-cyan-950/50 text-cyan-300 border border-cyan-800/80">
                                                {selectedItem.status}
                                            </span>
                                        </div>

                                        {selectedItem.tags && selectedItem.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pb-1">
                                                {selectedItem.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                            <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                                <Calendar className="h-4 w-4 text-rose-400 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] text-white/40 block">Échéance de la tâche</span>
                                                    <span className="font-bold text-zinc-200">{selectedItem.dueDate}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                                <User className="h-4 w-4 text-cyan-400 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] text-white/40 block">Responsable assigné</span>
                                                    <span className="font-bold text-zinc-200">{selectedItem.assignee}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                                <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] text-white/40 block">Prochain Suivi</span>
                                                    <span className="font-bold text-amber-400">{selectedItem.followUpDate}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#040917]/30 p-3 rounded-xl border border-white/5">
                                                <User className="h-4 w-4 text-purple-400 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] text-white/40 block">Implication</span>
                                                    <span className="font-bold text-zinc-200 truncate block max-w-[200px]" title={selectedItem.peopleImplicated}>
                                                        {selectedItem.peopleImplicated}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1 bg-cyan-950/15 border border-cyan-900/30 p-3 rounded-xl">
                                            <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">Entrepreneur / Fournisseur</span>
                                            <p className="text-xs font-bold text-zinc-150 flex items-center gap-1.5">
                                                <Bot className="h-3.5 w-3.5 text-cyan-400" />
                                                {selectedItem.contractors}
                                            </p>
                                        </div>

                                        {selectedItem.todos && selectedItem.todos.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-white/5">
                                                <h5 className="text-[10px] font-black uppercase text-white/45 tracking-wide">
                                                    Plan d'action & Liste des tâches à faire
                                                </h5>
                                                <div className="space-y-2 bg-[#040917]/40 p-3 rounded-xl border border-white/5">
                                                    {selectedItem.todos.map(todo => (
                                                        <button
                                                            key={todo.id}
                                                            onClick={() => handleToggleTodo(selectedItem.id, todo.id)}
                                                            className="w-full flex items-start gap-2.5 text-left text-xs hover:text-white text-zinc-300 py-1.5 cursor-pointer"
                                                        >
                                                            {todo.completed ? (
                                                                <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                                                            ) : (
                                                                <Square className="h-4 w-4 text-white/30 shrink-0" />
                                                            )}
                                                            <span className={todo.completed ? 'line-through text-white/40' : ''}>
                                                                {todo.text}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5 pt-2">
                                            <h5 className="text-[10px] font-black uppercase text-white/45 tracking-wide">Actions entreprises</h5>
                                            <p className="text-xs text-white/80 leading-relaxed bg-[#040917]/40 p-3.5 rounded-xl border border-white/5">
                                                {selectedItem.actionsTaken}
                                            </p>
                                        </div>
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
                                                <ShieldAlert className="h-4 w-4 text-rose-500" />
                                                <div>
                                                    <span className="text-[10px] text-white/40 block">Gravité</span>
                                                    <span className="font-bold text-rose-500">{selectedItem.severity}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-white/80 leading-relaxed font-sans italic bg-[#040917]/40 p-4 rounded-xl border border-white/5 select-text">
                                            "{selectedItem.originalContent}"
                                        </p>
                                    </div>
                                )}

                                {/* Copilot Reference Rule */}
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

                                {/* Copilot Draft Editor */}
                                <div className="flex flex-col rounded-2xl bg-zinc-950/40 border border-white/10 p-4 space-y-3 shadow-2xl">
                                    <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                                        <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                                            <Bot className="h-4 w-4 text-cyan-400" />
                                            <span>Proposition de réponse copilote Gustav</span>
                                        </div>
                                    </div>

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
                                            className="absolute right-3.5 top-3.5 text-white/40 hover:text-white/80 cursor-pointer"
                                        >
                                            <Mic className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={!chatInput.trim()}
                                        className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/25 text-white h-10 px-4 rounded-xl flex items-center justify-center shadow-lg cursor-pointer"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )
                )}
            </div>

        </div>
    )
}
