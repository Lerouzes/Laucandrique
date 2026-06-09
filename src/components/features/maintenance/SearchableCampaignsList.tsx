'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calendar, ChevronRight, Search } from 'lucide-react'

interface Campaign {
    id: string
    name: string
    status: string
    start_date: string
    end_date: string
    clients?: {
        company_name: string | null
        full_name: string
    } | null
    contractors?: {
        full_name: string
    } | null
}

export function SearchableCampaignsList({ campaigns }: { campaigns: Campaign[] }) {
    const [searchTerm, setSearchTerm] = useState('')

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-800/40'
            case 'completed':
                return 'bg-blue-500/20 text-blue-400 border-blue-800/40'
            case 'cancelled':
                return 'bg-rose-500/20 text-rose-400 border-rose-800/40'
            default:
                return 'bg-zinc-800/50 text-zinc-400 border-zinc-700/60'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Actif'
            case 'completed': return 'Complété'
            case 'cancelled': return 'Annulé'
            default: return 'Brouillon'
        }
    }

    const filteredCampaigns = campaigns.filter(c => {
        const query = searchTerm.toLowerCase().trim()
        if (!query) return true

        const campaignNameMatches = c.name.toLowerCase().includes(query)
        const clientCompanyNameMatches = c.clients?.company_name?.toLowerCase().includes(query) || false
        const clientFullNameMatches = c.clients?.full_name?.toLowerCase().includes(query) || false

        return campaignNameMatches || clientCompanyNameMatches || clientFullNameMatches
    })

    return (
        <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-900 bg-zinc-950/10 px-6 py-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    Campagnes actives & récentes
                </h3>
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <Input
                        placeholder="Rechercher par nom ou syndicat..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#121318] border-zinc-850 h-8 text-xs pl-8 text-white focus-visible:ring-purple-650"
                    />
                </div>
            </div>
            <CardContent className="p-0">
                {filteredCampaigns.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                        {campaigns.length === 0 ? "Aucune campagne créée pour le moment." : "Aucune campagne ne correspond à votre recherche."}
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-900">
                        {filteredCampaigns.map(c => (
                            <Link 
                                key={c.id} 
                                href={`/maintenance-hub/campaigns/${c.id}`}
                                className="flex items-center justify-between p-4 hover:bg-zinc-900/20 transition-all group"
                            >
                                <div className="space-y-1 pr-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-xs text-zinc-100 group-hover:text-purple-400 transition-colors">
                                            {c.name}
                                        </span>
                                        <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 ${getStatusBadge(c.status)}`}>
                                            {getStatusLabel(c.status)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-400 line-clamp-1">
                                        {c.clients?.company_name || c.clients?.full_name} · du {new Date(c.start_date).toLocaleDateString('fr-CA')} au {new Date(c.end_date).toLocaleDateString('fr-CA')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                    <div className="text-xs hidden sm:block">
                                        <span className="text-zinc-550 uppercase block font-bold text-[9px] tracking-wider">Contracteur</span>
                                        <span className="text-zinc-300 font-semibold">{c.contractors?.full_name || 'Non assigné'}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
