'use client'

import { useEffect, useState, useTransition, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, RefreshCw, List, FileSpreadsheet, Users, MessageSquare, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'

// Clients & Snapshots Imports
import { getClients } from '@/actions/clients'
import { ClientsTable } from '@/components/features/clients/ClientsTable'
import { ClientFormDialog } from '@/components/features/clients/ClientFormDialog'
import { getSnapshotsAction } from '@/actions/snapshots'
import { SnapshotWorkspace } from '@/components/features/settings/SnapshotWorkspace'
import { AccountsManager } from '@/components/features/settings/AccountsManager'
import { CommunicationAnalyzer } from '@/components/features/settings/CommunicationAnalyzer'
import { getManagers, getManagerTeams } from '@/actions/managers'
import { getAllCommunicationStats } from '@/actions/communication-stats'
import { getSettings } from '@/actions/settings'
import { GlobalCommunicationAnalytics } from '@/components/features/settings/GlobalCommunicationAnalytics'
import { LaucandriqueExtractor } from '@/components/features/settings/LaucandriqueExtractor'
import { getGlobalSyndicateStatsAction } from '@/actions/syndicate-stats'
import { GlobalRealEstateStats } from '@/components/features/settings/GlobalRealEstateStats'

// Tabs component
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function GlobalSettingsPage() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = searchParams.get('tab') || 'clients'

    const [clients, setClients] = useState<any[]>([])
    const [snapshots, setSnapshots] = useState<any[]>([])
    const [managers, setManagers] = useState<any[]>([])
    const [allCommsStats, setAllCommsStats] = useState<any[]>([])
    const [globalStats, setGlobalStats] = useState<any[]>([])
    const [extractorQueue, setExtractorQueue] = useState<File[]>([])
    const [targetIndex, setTargetIndex] = useState<number>(2.50)
    const [searchVal, setSearchVal] = useState('')
    const [userRole, setUserRole] = useState<string>('Agent')
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [showOnlyActive, setShowOnlyActive] = useState(true)
    const [teams, setTeams] = useState<any[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState<string>('all')

    // Fetch user role
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setCurrentUserId(user.id)
                supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
                    if (data?.role) setUserRole(data.role)
                })
            }
        })
    }, [])

    // Load managers on mount
    useEffect(() => {
        getManagers(true).then(setManagers)
        getManagerTeams().then(setTeams)
    }, [])

    // Fetch clients / snapshots on activeTab or searchVal updates
    useEffect(() => {
        if (activeTab === 'clients' || activeTab === 'communications') {
            getClients(searchVal).then(setClients)
        } else if (activeTab === 'snapshots') {
            getSnapshotsAction().then(setSnapshots)
        }
    }, [activeTab, searchVal])

    useEffect(() => {
        if (activeTab === 'comms-analytics' || activeTab === 'communications') {
            getAllCommunicationStats().then(setAllCommsStats)
            if (activeTab === 'comms-analytics') {
                getSettings().then(data => {
                    if (data?.communication_target_index) {
                        setTargetIndex(Number(data.communication_target_index))
                    }
                })
            }
        }
    }, [activeTab])

    useEffect(() => {
        if (activeTab === 'real-estate') {
            getGlobalSyndicateStatsAction().then(setGlobalStats)
        }
    }, [activeTab])

    const handleTabChange = (tab: string) => {
        router.push(`/global-settings?tab=${tab}`, { scroll: false })
    }

    const refreshData = () => {
        if (activeTab === 'clients' || activeTab === 'communications') {
            getClients(searchVal).then(setClients)
            getAllCommunicationStats().then(setAllCommsStats)
        } else if (activeTab === 'snapshots') {
            getSnapshotsAction().then(setSnapshots)
        } else if (activeTab === 'comms-analytics') {
            getAllCommunicationStats().then(setAllCommsStats)
        } else if (activeTab === 'real-estate') {
            getGlobalSyndicateStatsAction().then(setGlobalStats)
        }
    }

    const filteredClients = useMemo(() => {
        let list = clients
        if (showOnlyActive) {
            list = list.filter(c => c.status !== 'inactive')
        }
        if (selectedTeamId === 'none') {
            list = list.filter(c => !c.managers || !c.managers.manager_teams)
        } else if (selectedTeamId !== 'all') {
            list = list.filter(c => c.managers?.manager_teams?.id === selectedTeamId)
        }
        return list
    }, [clients, showOnlyActive, selectedTeamId])

    // Compute aggregates for cards on Lister Maitresse
    const stats = useMemo(() => {
        const activeClients = clients.filter(c => c.status !== 'inactive')
        const totalSyndicates = activeClients.length
        const totalDoors = activeClients.reduce((sum, c) => sum + (c.doors?.length || 0), 0)
        const totalMonthlyRevenues = activeClients.reduce((sum, c) => sum + Number(c.package_pricing || 0), 0)
        const totalSqFt = activeClients.reduce((sum, c) => sum + Number(c.total_square_feet || 0), 0)
        return {
            totalSyndicates,
            totalDoors,
            totalMonthlyRevenues,
            totalSqFt
        }
    }, [clients])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Configuration Globale & Snapshots</h2>
                <p className="text-sm text-zinc-400">
                    Source de vérité Gustav pour la liste maîtresse des syndicats (SDC) et les rapports.
                </p>
            </div>

            <Tabs defaultValue="clients" value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
                {/* Main tabs trigger list is hidden as it is handled by the sidebar menu */}

                {/* TAB 1: CLIENT MASTER LIST (Lister Maitresse) */}
                <TabsContent value="clients" className="space-y-4 outline-none">
                    {/* Main aggregate cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md hover:border-zinc-700 transition-all">
                            <CardContent className="p-4">
                                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Users className="h-4 w-4 text-cyan-400" />
                                    Syndicats Actifs
                                </span>
                                <div className="text-2xl font-black text-white">{stats.totalSyndicates}</div>
                                <p className="text-[10px] text-zinc-500 mt-1">Copropriétés actives</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md hover:border-zinc-700 transition-all">
                            <CardContent className="p-4">
                                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Home className="h-4 w-4 text-indigo-400" />
                                    Nombre de Portes
                                </span>
                                <div className="text-2xl font-black text-white">{new Intl.NumberFormat('fr-CA').format(stats.totalDoors)}</div>
                                <p className="text-[10px] text-zinc-500 mt-1">Unités sous gestion actives</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md hover:border-zinc-700 transition-all">
                            <CardContent className="p-4">
                                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                                    Revenus Mensuels
                                </span>
                                <div className="text-2xl font-black text-white">
                                    {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(stats.totalMonthlyRevenues)}
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">Volume d'honoraires actifs</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md hover:border-zinc-700 transition-all">
                            <CardContent className="p-4">
                                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <RefreshCw className="h-4 w-4 text-purple-400" />
                                    Superficie Totale
                                </span>
                                <div className="text-2xl font-black text-white">
                                    {new Intl.NumberFormat('fr-CA').format(stats.totalSqFt)} pi²
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">Somme des superficies déclarées</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    type="search"
                                    placeholder="Rechercher un client..."
                                    className="w-full bg-zinc-950 border-zinc-850 text-zinc-150 pl-9 placeholder:text-zinc-500 focus-visible:ring-zinc-700 focus-visible:border-transparent text-xs"
                                    value={searchVal}
                                    onChange={(e) => setSearchVal(e.target.value)}
                                />
                            </div>

                            {/* Team Filter Dropdown */}
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-300 font-semibold outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/30 cursor-pointer h-9 shrink-0"
                            >
                                <option value="all">Toutes les équipes</option>
                                <option value="none">Sans équipe</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2 select-none">
                                <Checkbox
                                    id="show-only-active"
                                    checked={showOnlyActive}
                                    onCheckedChange={(checked) => setShowOnlyActive(!!checked)}
                                />
                                <label
                                    htmlFor="show-only-active"
                                    className="text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer font-medium"
                                >
                                    Afficher uniquement les syndicats actifs
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={refreshData}
                                className="border-zinc-850 text-zinc-300 bg-zinc-950/20 hover:bg-zinc-950/60"
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-hover-spin" />
                                Actualiser
                            </Button>
                            <ClientFormDialog managers={managers} />
                        </div>
                    </div>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-0">
                            <ClientsTable data={filteredClients} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB real-estate: DONNÉES IMMOBILIÈRES (under Statistics) */}
                <TabsContent value="real-estate" className="outline-none space-y-6">
                    {/* Sub navigation for Statistics */}
                    <div className="border-b border-zinc-800 pb-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTabChange('real-estate')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-indigo-500 text-white"
                            >
                                Données Immobilières
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('comms-analytics')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Analytics Communications
                            </button>
                        </div>
                    </div>
                    <GlobalRealEstateStats data={globalStats} />
                </TabsContent>

                {/* TAB comms-analytics: ANALYTICS COMMUNICATIONS (under Statistics) */}
                <TabsContent value="comms-analytics" className="outline-none space-y-6">
                    {/* Sub navigation for Statistics */}
                    <div className="border-b border-zinc-800 pb-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTabChange('real-estate')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Données Immobilières
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('comms-analytics')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-indigo-500 text-white"
                            >
                                Analytics Communications
                            </button>
                        </div>
                    </div>
                    <GlobalCommunicationAnalytics 
                        stats={allCommsStats} 
                        teams={teams}
                        targetIndex={targetIndex}
                    />
                </TabsContent>

                {/* TAB extractor: EXTRACTOR LAUCANDRIQUE (under Tools) */}
                <TabsContent value="extractor" className="outline-none space-y-6">
                    {/* Sub navigation for Tools */}
                    <div className="border-b border-zinc-800 pb-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTabChange('extractor')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-indigo-500 text-white"
                            >
                                Extracteur Laucandrique
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('communications')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Analyse Communications
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('snapshots')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Snapshots & Synchro
                            </button>
                        </div>
                    </div>
                    <LaucandriqueExtractor 
                        onSendToAnalyzer={(files) => {
                            setExtractorQueue(files)
                            handleTabChange('communications')
                        }}
                    />
                </TabsContent>

                {/* TAB communications: ANALYSE COMMUNICATIONS (under Tools) */}
                <TabsContent value="communications" className="outline-none space-y-6">
                    {/* Sub navigation for Tools */}
                    <div className="border-b border-zinc-800 pb-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTabChange('extractor')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Extracteur Laucandrique
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('communications')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-indigo-500 text-white"
                            >
                                Analyse Communications
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('snapshots')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Snapshots & Synchro
                            </button>
                        </div>
                    </div>
                    <CommunicationAnalyzer 
                        clients={filteredClients} 
                        stats={allCommsStats} 
                        externalQueue={extractorQueue}
                        setExternalQueue={setExtractorQueue}
                        managers={managers}
                    />
                </TabsContent>

                {/* TAB snapshots: SNAPSHOTS & SYNCHRO (under Tools) */}
                <TabsContent value="snapshots" className="outline-none space-y-6">
                    {/* Sub navigation for Tools */}
                    <div className="border-b border-zinc-800 pb-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTabChange('extractor')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Extracteur Laucandrique
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('communications')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-zinc-500 hover:text-zinc-300"
                            >
                                Analyse Communications
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('snapshots')}
                                className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-indigo-500 text-white"
                            >
                                Snapshots & Synchro
                            </button>
                        </div>
                    </div>
                    <SnapshotWorkspace 
                        snapshots={snapshots} 
                        managers={managers} 
                        existingClients={clients}
                        currentUserRole={userRole}
                    />
                </TabsContent>

                {/* TAB: ACCOUNTS MANAGEMENT (Separate top-level link for Master role) */}
                {userRole === 'Master' && (
                    <TabsContent value="accounts" className="outline-none">
                        <AccountsManager 
                            userRole={userRole}
                            currentUserId={currentUserId}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
