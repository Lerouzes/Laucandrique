'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, RefreshCw, List, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'

// Clients & Snapshots Imports
import { getClients } from '@/actions/clients'
import { ClientsTable } from '@/components/features/clients/ClientsTable'
import { ClientFormDialog } from '@/components/features/clients/ClientFormDialog'
import { getSnapshotsAction } from '@/actions/snapshots'
import { SnapshotWorkspace } from '@/components/features/settings/SnapshotWorkspace'
import { getManagers } from '@/actions/managers'

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
    const [searchVal, setSearchVal] = useState('')
    const [userRole, setUserRole] = useState<string>('Agent')

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

    // Load managers on mount
    useEffect(() => {
        getManagers(true).then(setManagers)
    }, [])

    // Fetch clients / snapshots on activeTab or searchVal updates
    useEffect(() => {
        if (activeTab === 'clients') {
            getClients(searchVal).then(setClients)
        } else if (activeTab === 'snapshots') {
            getSnapshotsAction().then(setSnapshots)
        }
    }, [activeTab, searchVal])

    const handleTabChange = (tab: string) => {
        router.push(`/global-settings?tab=${tab}`, { scroll: false })
    }

    const refreshData = () => {
        if (activeTab === 'clients') {
            getClients(searchVal).then(setClients)
        } else if (activeTab === 'snapshots') {
            getSnapshotsAction().then(setSnapshots)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Configuration Globale & Snapshots</h2>
                <p className="text-sm text-zinc-400">
                    Source de vérité Gustav pour la liste maîtresse des syndicats (SDC) et les imports Microsoft List.
                </p>
            </div>

            <Tabs defaultValue="clients" value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
                <TabsList className="bg-zinc-950 border border-zinc-850 p-1 flex justify-start gap-1 w-fit rounded-xl">
                    <TabsTrigger value="clients" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                        <List className="h-4 w-4" />
                        Liste Maîtresse SDC
                    </TabsTrigger>
                    <TabsTrigger value="snapshots" className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                        <FileSpreadsheet className="h-4 w-4" />
                        Snapshots & Synchro
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: CLIENT MASTER LIST */}
                <TabsContent value="clients" className="space-y-4 outline-none">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-550 text-zinc-500" />
                            <Input
                                type="search"
                                placeholder="Rechercher un client..."
                                className="w-full bg-zinc-950 border-zinc-850 text-zinc-150 pl-9 placeholder:text-zinc-500 focus-visible:ring-zinc-700 focus-visible:border-transparent text-xs"
                                value={searchVal}
                                onChange={(e) => setSearchVal(e.target.value)}
                            />
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
            </Tabs>
        </div>
    )
}
