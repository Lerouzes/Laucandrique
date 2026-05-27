'use client'

import { User } from '@supabase/supabase-js'
import { LogOut, Menu } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { TeamManagementSidebar } from '@/components/shared/TeamManagementSidebar'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import { setSelectedTeamCookieAction } from '@/actions/team-management'

type Profile = Database['public']['Tables']['profiles']['Row']
type Team = { id: string; name: string }
type TeamContext = { role: string; teamId: string | null; isRestricted: boolean; managedTeamId: string | null }

export function TeamManagementHeader({ 
    user, 
    profile,
    teams = [],
    activeContext
}: { 
    user: User
    profile: Profile | null
    teams?: Team[]
    activeContext: TeamContext
}) {
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.refresh()
    }

    const initials = profile?.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase() || 'U'

    const getFrenchRoleLabel = (role: string) => {
        if (role === 'Master') return 'Direction Générale'
        if (role === 'Direction') return 'Direction'
        if (role === 'Managers') return 'Gestionnaire d’Équipe'
        return 'Opérations'
    }

    return (
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#0e0f14]/80 backdrop-blur-md px-6 z-40">
            {/* Mobile Sheet Trigger */}
            <div className="flex items-center gap-4 md:hidden">
                <Sheet>
                    <SheetTrigger render={<Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-900" />}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Ouvrir le menu</span>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0 bg-[#0e0f14] border-r border-zinc-800 text-zinc-300">
                        <div className="h-full flex flex-col">
                            <TeamManagementSidebar profile={profile} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Team Selection Dropdown / Read-only Team Badge */}
            <div className="flex items-center gap-2">
                {!activeContext.isRestricted ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline-block">Équipe :</span>
                        <select
                            value={activeContext.teamId || 'all'}
                            onChange={async (e) => {
                                const val = e.target.value === 'all' ? null : e.target.value
                                await setSelectedTeamCookieAction(val)
                                router.refresh()
                            }}
                            className="bg-[#121318] border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 font-semibold outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 cursor-pointer"
                        >
                            <option value="all">Toutes les équipes</option>
                            {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    activeContext.teamId && (
                        <div className="flex items-center gap-1.5 bg-blue-950/20 border border-blue-900/40 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            Équipe : {teams.find(t => t.id === activeContext.teamId)?.name || 'Assignée'}
                        </div>
                    )
                )}
            </div>

            {/* Profile Info & Actions on the Right */}
            <div className="flex items-center gap-4 ml-auto">
                <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-zinc-100">{profile?.full_name || user.email}</span>
                    <span className="text-[10px] text-purple-400 font-bold bg-purple-950/40 border border-purple-900/40 px-1.5 py-0.2 mt-0.5 rounded">
                        {getFrenchRoleLabel(profile?.role || 'Operations')}
                    </span>
                </div>
                
                <Avatar className="h-8 w-8 border border-zinc-800 bg-zinc-900">
                    <AvatarFallback className="bg-zinc-850 text-purple-400 font-bold text-xs">{initials}</AvatarFallback>
                </Avatar>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut} 
                    className="text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60 rounded-xl"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Se déconnecter</span>
                </Button>
            </div>
        </header>
    )
}
