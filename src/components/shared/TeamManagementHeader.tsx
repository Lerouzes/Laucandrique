'use client'

import { User } from '@supabase/supabase-js'
import { LogOut, Menu, User2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { TeamManagementSidebar } from '@/components/shared/TeamManagementSidebar'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export function TeamManagementHeader({ user, profile }: { user: User, profile: Profile | null }) {
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
