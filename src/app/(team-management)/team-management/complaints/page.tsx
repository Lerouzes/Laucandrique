import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createComplaintAction, resolveComplaintAction } from '@/actions/team-management'
import { AlertTriangle, ShieldCheck, Check, PlusCircle, Calendar, User } from 'lucide-react'

export default async function ComplaintsListPage() {
    const supabase = await createClient()

    // 1. Fetch complaints
    const { data: complaints } = await supabase
        .from('complaints')
        .select('*, clients(company_name, full_name), managers(first_name, last_name)')
        .order('received_date', { ascending: false })

    // 2. Fetch active clients for new complaint creation
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company_name')

    // 3. Fetch managers
    const { data: managers } = await supabase
        .from('managers')
        .select('*')
        .order('first_name')

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Plaintes Clients & Gestion des Conflits
                </h2>
                <p className="text-xs text-zinc-400">
                    Registre des plaintes et réclamations clients. Suivez et résolvez les litiges de copropriété.
                </p>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Complaints Log List */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#16171e]/70 border-zinc-800/80 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-white">Registre des Plaintes</CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Suivi en temps réel des réclamations formulées par les CA des copropriétés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            {(!complaints || complaints.length === 0) ? (
                                <p className="text-xxs text-zinc-500 italic py-6 text-center">Aucune plainte recensée.</p>
                            ) : (
                                complaints.map((c) => {
                                    const clientName = c.clients ? (c.clients.company_name || c.clients.full_name) : 'Copropriété inconnue'
                                    const managerName = c.managers ? `${c.managers.first_name} ${c.managers.last_name}` : 'Non assigné'
                                    
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
                                        <div key={c.id} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3 text-xxs relative">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-zinc-200">{c.title}</p>
                                                    <p className="text-zinc-500 flex items-center gap-1.5">
                                                        <span>Syndicat: <strong>{clientName}</strong></span>
                                                        <span>·</span>
                                                        <span>Gestionnaire: <strong>{managerName}</strong></span>
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
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
                                                    <form action={async () => {
                                                        'use server'
                                                        await resolveComplaintAction(c.id)
                                                    }}>
                                                        <Button 
                                                            type="submit" 
                                                            size="sm" 
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2.5 h-6 rounded flex items-center gap-0.5"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                            Résoudre
                                                        </Button>
                                                    </form>
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
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <PlusCircle className="h-4 w-4 text-purple-400" />
                                Enregistrer une Plainte
                            </CardTitle>
                            <CardDescription className="text-xxs text-zinc-400">
                                Déclarer une insatisfaction ou réclamation client.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form action={createComplaintAction} className="space-y-4 text-xxs">
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Syndicat de Copropriété</Label>
                                    <select name="client_id" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8" required>
                                        {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name || c.full_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Gestionnaire Assigné</Label>
                                    <select name="manager_id" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8" required>
                                        {managers?.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Sujet de la Plainte</Label>
                                    <Input type="text" name="title" required placeholder="ex: Retards de PV..." className="bg-[#121318] border-zinc-800 h-8 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Description détaillée</Label>
                                    <Textarea name="description" required placeholder="Expliquer le litige..." rows={3} className="bg-[#121318] border-zinc-800 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-zinc-500">Niveau de Sévérité</Label>
                                    <select name="severity" className="w-full bg-[#121318] border border-zinc-800 rounded-lg p-2 text-white outline-none focus:border-purple-600 h-8" required>
                                        <option value="low">Faible</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Élevée</option>
                                        <option value="critical">Critique / Menace de départ</option>
                                    </select>
                                </div>

                                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-8 rounded-lg mt-2 flex items-center justify-center gap-1">
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
