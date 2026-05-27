'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SearchableClientSelect } from './SearchableClientSelect'
import { 
    AlertTriangle, 
    ShieldCheck, 
    Check, 
    PlusCircle, 
    Calendar, 
    User, 
    Search, 
    Filter, 
    X,
    TrendingUp,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import { createComplaintAction, resolveComplaintAction, deleteComplaintAction } from '@/actions/team-management'

interface Complaint {
    id: string
    client_id: string
    manager_id: string | null
    title: string
    description: string
    severity: string
    status: string
    received_date: string
    resolved_date: string | null
    category_id: string | null
    clients: {
        company_name: string | null
        full_name: string
    } | null
    managers: {
        first_name: string
        last_name: string
    } | null
    complaint_categories: {
        name: string
    } | null
}

interface Client {
    id: string
    company_name: string | null
    full_name: string
}

interface Manager {
    id: string
    first_name: string
    last_name: string
}

interface Category {
    id: string
    name: string
}

interface ComplaintsClientPageProps {
    initialComplaints: Complaint[]
    clients: Client[]
    managers: Manager[]
    categories: Category[]
}

export function ComplaintsClientPage({
    initialComplaints,
    clients,
    managers,
    categories
}: ComplaintsClientPageProps) {
    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [severityFilter, setSeverityFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [managerFilter, setManagerFilter] = useState('all')

    // Prepare client options for dropdown
    const clientOptions = clients.map(c => ({
        id: c.id,
        name: c.company_name || c.full_name,
        sdc: c.full_name
    }))

    // Filter complaints dynamically
    const filteredComplaints = initialComplaints.filter(c => {
        const clientName = c.clients ? (c.clients.company_name || c.clients.full_name).toLowerCase() : ''
        const sdcNumber = c.clients ? c.clients.full_name.toLowerCase() : ''
        const title = c.title.toLowerCase()
        const description = c.description ? c.description.toLowerCase() : ''
        const cleanSearch = searchTerm.toLowerCase()

        const matchesSearch = clientName.includes(cleanSearch) || 
                              sdcNumber.includes(cleanSearch) || 
                              title.includes(cleanSearch) || 
                              description.includes(cleanSearch)

        const matchesStatus = statusFilter === 'all' || c.status === statusFilter
        const matchesSeverity = severityFilter === 'all' || c.severity === severityFilter
        const matchesCategory = categoryFilter === 'all' || c.category_id === categoryFilter
        const matchesManager = managerFilter === 'all' || c.manager_id === managerFilter

        return matchesSearch && matchesStatus && matchesSeverity && matchesCategory && matchesManager
    })

    // Compute Analytics
    const totalCount = initialComplaints.length
    const openCount = initialComplaints.filter(c => c.status === 'open').length
    const resolvedCount = initialComplaints.filter(c => c.status === 'resolved').length
    const criticalCount = initialComplaints.filter(c => c.status === 'open' && (c.severity === 'critical' || c.severity === 'high')).length
    const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

    // Category distribution counts for active complaints
    const categoryCounts: Record<string, number> = {}
    initialComplaints.forEach(c => {
        if (c.status === 'open' && c.complaint_categories) {
            const name = c.complaint_categories.name
            categoryCounts[name] = (categoryCounts[name] || 0) + 1
        }
    })

    const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

    const resetFilters = () => {
        setSearchTerm('')
        setStatusFilter('all')
        setSeverityFilter('all')
        setCategoryFilter('all')
        setManagerFilter('all')
    }

    return (
        <div className="space-y-6">
            {/* Analytics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3.5 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Plaintes</span>
                        <AlertTriangle className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent className="pb-3.5">
                        <div className="text-2xl font-bold text-white">{totalCount}</div>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Historique complet</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3.5 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">En cours de résolution</span>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="pb-3.5">
                        <div className="text-2xl font-bold text-white">{openCount}</div>
                        <p className="text-[9px] text-zinc-500 mt-0.5">
                            {criticalCount} plaintes à sévérité élevée
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3.5 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Taux de Résolution</span>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent className="pb-3.5">
                        <div className="text-2xl font-bold text-white">{resolutionRate}%</div>
                        <p className="text-[9px] text-zinc-500 mt-0.5">{resolvedCount} résolues au total</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                    <CardHeader className="py-3.5 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Catégories Actives</span>
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent className="pb-3.5">
                        <div className="text-sm text-zinc-300 font-semibold truncate leading-tight">
                            {topCategories.length > 0 ? (
                                topCategories.map(([name, count]) => `${name} (${count})`).join(', ')
                            ) : (
                                "Aucune plainte active"
                            )}
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Top 3 catégories</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Rechercher syndicat, titre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#121318] border-zinc-800 pl-8 h-8 text-[16px] md:text-xs text-white"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-[#121318] border border-zinc-800 rounded-lg p-2 text-zinc-300 outline-none focus:border-purple-600 h-8 text-[16px] md:text-xs"
                    >
                        <option value="all">Tous les Statuts</option>
                        <option value="open">En cours</option>
                        <option value="resolved">Résolue</option>
                    </select>

                    {/* Severity Filter */}
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="bg-[#121318] border border-zinc-800 rounded-lg p-2 text-zinc-300 outline-none focus:border-purple-600 h-8 text-[16px] md:text-xs"
                    >
                        <option value="all">Toutes les Sévérités</option>
                        <option value="low">Sévérité : Faible</option>
                        <option value="medium">Sévérité : Moyenne</option>
                        <option value="high">Sévérité : Élevée</option>
                        <option value="critical">Sévérité : Critique</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-[#121318] border border-zinc-800 rounded-lg p-2 text-zinc-300 outline-none focus:border-purple-600 h-8 text-[16px] md:text-xs"
                    >
                        <option value="all">Toutes les Catégories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    {/* Manager Filter */}
                    <div className="flex gap-2">
                        <select
                            value={managerFilter}
                            onChange={(e) => setManagerFilter(e.target.value)}
                            className="bg-[#121318] border border-zinc-800 rounded-lg p-2 text-zinc-300 outline-none focus:border-purple-600 h-8 flex-1 text-[16px] md:text-xs"
                        >
                            <option value="all">Tous les Gestionnaires</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>

                        {(searchTerm || statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all' || managerFilter !== 'all') && (
                            <Button 
                                variant="outline" 
                                onClick={resetFilters}
                                className="border-zinc-800 text-zinc-400 hover:text-white px-2.5 h-8 w-8 rounded-lg shrink-0"
                                title="Réinitialiser"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Complaints Log List */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
                                <span>Registre des Plaintes ({filteredComplaints.length})</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-400">
                                Liste filtrée des réclamations clients formulées.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            {filteredComplaints.length === 0 ? (
                                <p className="text-xs text-zinc-500 italic py-8 text-center">Aucune plainte ne correspond aux filtres.</p>
                            ) : (
                                filteredComplaints.map((c) => {
                                    const clientName = c.clients ? (c.clients.company_name || c.clients.full_name) : 'Copropriété inconnue'
                                    const sdcNum = c.clients?.full_name || 'Numéro inconnu'
                                    const managerName = c.managers ? `${c.managers.first_name} ${c.managers.last_name}` : 'Non assigné'
                                    const categoryName = c.complaint_categories?.name || 'Non spécifié'
                                    
                                    const sevStyle = 
                                        c.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-800/40' :
                                        c.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-850/40' :
                                        c.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-800/40' :
                                        'bg-zinc-900 text-zinc-400 border-zinc-850'

                                    const statusStyle = 
                                        c.status === 'open' 
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-800/40' 
                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-850/40'

                                    return (
                                        <div key={c.id} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3 text-xs relative">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-zinc-200">{c.title}</p>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-500">
                                                        <span>Syndicat: <strong className="text-zinc-300">{clientName} [{sdcNum}]</strong></span>
                                                        <span>·</span>
                                                        <span>Gestionnaire: <strong className="text-zinc-300">{managerName}</strong></span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 shrink-0">
                                                    {c.category_id && (
                                                        <Badge variant="outline" className="text-[8px] font-bold bg-purple-950/20 text-purple-400 border-purple-800/30">
                                                            {categoryName}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className={`text-[8px] font-bold ${sevStyle}`}>{c.severity}</Badge>
                                                    <Badge variant="outline" className={`text-[8px] font-bold ${statusStyle}`}>
                                                        {c.status === 'open' ? 'En cours' : 'Résolue'}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {c.description && (
                                                <p className="text-[10px] text-zinc-400 leading-relaxed bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/80">
                                                    {c.description}
                                                </p>
                                            )}

                                            <div className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-850 flex justify-between items-center">
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Signalée le : {new Date(c.received_date).toLocaleDateString('fr-CA')}</span>
                                                {c.resolved_date && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Résolue le : {new Date(c.resolved_date).toLocaleDateString('fr-CA')}</span>}
                                                
                                                {c.status === 'open' && (
                                                    <div className="flex gap-2">
                                                        <form action={async () => {
                                                            await resolveComplaintAction(c.id)
                                                        }}>
                                                            <Button 
                                                                type="submit" 
                                                                size="sm" 
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2.5 h-6 rounded flex items-center gap-0.5 shadow-md"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                                Résoudre
                                                            </Button>
                                                        </form>
                                                        
                                                        <form action={async () => {
                                                            if (confirm("Voulez-vous vraiment supprimer cette plainte ? Elle sera définitivement effacée.")) {
                                                                await deleteComplaintAction(c.id)
                                                            }
                                                        }}>
                                                            <Button 
                                                                type="submit" 
                                                                size="sm" 
                                                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] px-2.5 h-6 rounded flex items-center gap-0.5 shadow-md animate-fade-in"
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Log New Complaint Form */}
                <div>
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader className="pb-3 bg-zinc-950/20">
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <PlusCircle className="h-4 w-4 text-purple-400" />
                                Enregistrer une Plainte
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-400">
                                Déclarer une insatisfaction ou réclamation client.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form action={createComplaintAction} className="space-y-4 text-xs">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Syndicat de Copropriété</Label>
                                    <SearchableClientSelect 
                                        clients={clientOptions} 
                                        name="client_id" 
                                        required 
                                        placeholder="Sélectionner ou chercher..." 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Gestionnaire Assigné</Label>
                                    <select name="manager_id" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-[16px] md:text-xs" required>
                                        <option value="">Sélectionner un gestionnaire...</option>
                                        {managers?.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Catégorie de la Plainte</Label>
                                    <select name="category_id" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-[16px] md:text-xs" required>
                                        <option value="">Sélectionner une catégorie...</option>
                                        {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Sujet de la Plainte</Label>
                                    <Input type="text" name="title" required placeholder="ex: Retards de PV..." className="bg-[#121318] border-zinc-800 h-8 text-white text-[16px] md:text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Description détaillée</Label>
                                    <Textarea name="description" required placeholder="Expliquer le litige..." rows={3} className="bg-[#121318] border-zinc-800 text-white text-[16px] md:text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Niveau de Sévérité</Label>
                                    <select name="severity" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8 text-[16px] md:text-xs" required>
                                        <option value="low">Faible</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Élevée</option>
                                        <option value="critical">Critique / Menace de départ</option>
                                    </select>
                                </div>

                                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-8 rounded-lg mt-2 flex items-center justify-center gap-1 shadow-lg">
                                    <PlusCircle className="h-4 w-4" />
                                    Enregistrer la Plainte
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
