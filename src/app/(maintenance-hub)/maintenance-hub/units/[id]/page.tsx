// @ts-nocheck
// src/app/(team-management)/team-management/maintenance/units/[id]/page.tsx
import { getUnitMaintenanceHistoryAction } from '@/actions/maintenance'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
    ArrowLeft, 
    Building2, 
    Calendar, 
    User, 
    Camera, 
    FileText, 
    Sliders,
    MessageSquare,
    AlertCircle
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function UnitHistoryPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const details = await getUnitMaintenanceHistoryAction(id)

    const client = details.door.client
    const clientName = client ? (client.company_name || client.full_name) : 'Copropriété inconnue'

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-emerald-500/20 text-emerald-450 text-emerald-400 border-emerald-800/40'
            case 'absent':
                return 'bg-amber-500/20 text-amber-400 border-amber-800/40'
            case 'refused_access':
                return 'bg-rose-500/20 text-rose-400 border-rose-850/40'
            default:
                return 'bg-blue-500/20 text-blue-400 border-blue-800/40'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Complété'
            case 'absent': return 'Absent lors du passage'
            case 'refused_access': return 'Accès refusé'
            default: return 'Planifié'
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation */}
            <div>
                <Link
                    href="/maintenance-hub"
                    className="text-xxs text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1.5 transition-colors w-fit"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour au Tableau de bord
                </Link>
            </div>

            {/* Unit Info Header Card */}
            <div className="p-6 bg-[#16171e]/70 border border-zinc-800/80 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Unité {details.door.door_number}</h2>
                        <p className="text-[10px] text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>Syndicat : <strong className="text-zinc-200">{clientName}</strong></span>
                            {details.door.notes && (
                                <>
                                    <span className="text-zinc-650">•</span>
                                    <span>Notes : <strong className="text-zinc-300">{details.door.notes}</strong></span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Permanent Interventions History */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
                    Historique permanent des interventions
                </h3>

                {details.history.length === 0 ? (
                    <Card className="bg-[#16171e]/70 border-zinc-850 shadow-md">
                        <CardContent className="p-8 text-center text-xxs text-zinc-500">
                            Aucune intervention enregistrée pour cette unité.
                        </CardContent>
                    </Card>
                ) : (
                    details.history.map(record => (
                        <Card key={record.id} className="bg-[#16171e]/70 border-zinc-850 shadow-md overflow-hidden text-xxs">
                            
                            {/* Card Header details */}
                            <CardHeader className="pb-3 border-b border-zinc-900 bg-zinc-950/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="space-y-1 pr-4">
                                    <h4 className="text-xxs font-extrabold text-white uppercase tracking-wider text-purple-400">
                                        {record.campaign_name}
                                    </h4>
                                    <div className="text-[9px] text-zinc-400 font-medium">
                                        Passage du : <strong className="text-zinc-300">{new Date(record.date).toLocaleDateString('fr-CA')}</strong> · 
                                        Technicien : <strong className="text-zinc-300">{record.contractor_name}</strong>
                                    </div>
                                </div>
                                <Badge variant="outline" className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 ${getStatusBadge(record.status)}`}>
                                    {getStatusLabel(record.status)}
                                </Badge>
                            </CardHeader>

                            {/* Inspection Report Content */}
                            <CardContent className="pt-4 space-y-4">
                                {record.report ? (
                                    <div className="space-y-3">
                                        
                                        {/* Notes, observations and recommendations */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {record.report.notes && (
                                                <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                                    <span className="text-zinc-500 uppercase font-bold text-[7.5px] block tracking-wider flex items-center gap-1">
                                                        <MessageSquare className="h-3 w-3 text-purple-450" />
                                                        Notes de visite
                                                    </span>
                                                    <p className="text-zinc-300 text-[10px] leading-relaxed font-medium">{record.report.notes}</p>
                                                </div>
                                            )}
                                            {record.report.observations && (
                                                <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                                    <span className="text-zinc-500 uppercase font-bold text-[7.5px] block tracking-wider flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 text-amber-500" />
                                                        Observations
                                                    </span>
                                                    <p className="text-zinc-300 text-[10px] leading-relaxed font-medium">{record.report.observations}</p>
                                                </div>
                                            )}
                                            {record.report.recommendations && (
                                                <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                                                    <span className="text-zinc-500 uppercase font-bold text-[7.5px] block tracking-wider flex items-center gap-1">
                                                        <FileText className="h-3 w-3 text-cyan-400" />
                                                        Recommandations
                                                    </span>
                                                    <p className="text-zinc-300 text-[10px] leading-relaxed font-medium">{record.report.recommendations}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Attached photos grid */}
                                        {record.photos && record.photos.length > 0 && (
                                            <div className="space-y-1.5 border-t border-zinc-900 pt-3 mt-3">
                                                <span className="text-zinc-500 uppercase font-bold text-[7.5px] block tracking-wider flex items-center gap-1">
                                                    <Camera className="h-3.5 w-3.5 text-zinc-400" />
                                                    Photos jointes ({record.photos.length})
                                                </span>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {record.photos.map((ph: any) => (
                                                        <div key={ph.id} className="relative group rounded-xl overflow-hidden border border-zinc-850 bg-zinc-950 aspect-video">
                                                            <img 
                                                                src={ph.photo_url} 
                                                                alt={ph.caption || 'Inspection'} 
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                            {ph.caption && (
                                                                <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1 text-[8px] text-zinc-300 truncate">
                                                                    {ph.caption}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                    </div>
                                ) : (
                                    <p className="text-xxs italic text-zinc-500">
                                        Aucun rapport écrit ni photo soumis pour cette intervention.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

        </div>
    )
}
