'use client'

import { User } from '@supabase/supabase-js'
import { LogOut, Menu } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarContent } from '@/components/shared/Sidebar'
import { TeamManagementSidebar } from '@/components/shared/TeamManagementSidebar'
import { MaintenanceHubSidebar } from '@/components/shared/MaintenanceHubSidebar'
import { GlobalSettingsSidebar } from '@/components/shared/GlobalSettingsSidebar'
import { CommandCenterSidebar } from '@/components/shared/CommandCenterSidebar'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export function Header({ user, profile }: { user: User, profile: Profile | null }) {
    const router = useRouter()
    const pathname = usePathname()
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
        <header className="flex h-16 items-center justify-between border-b border-white/20 bg-[#0f3f74]/70 backdrop-blur-md px-6">
            <div className="flex items-center gap-4 md:hidden">
                <Sheet>
                    <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-white/10" />}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Ouvrir le menu</span>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0 bg-[#103f75] border-r border-white/20 text-white">
                        <div className="flex h-full flex-col">
                            {pathname.startsWith('/manager') ? (
                                <CommandCenterSidebar profile={profile} />
                            ) : pathname.startsWith('/team-management') ? (
                                <TeamManagementSidebar profile={profile} />
                            ) : pathname.startsWith('/maintenance-hub') ? (
                                <MaintenanceHubSidebar profile={profile} />
                            ) : pathname.startsWith('/global-settings') ? (
                                <GlobalSettingsSidebar profile={profile} />
                            ) : (
                                <SidebarContent profile={profile} />
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex items-center gap-4 ml-auto">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-white">{profile?.full_name || user.email}</span>
                    <span className="text-xs text-white/75">{getFrenchRoleLabel(profile?.role || 'Operations')}</span>
                </div>
                <Avatar className="h-9 w-9 border border-white/25">
                    <AvatarFallback className="bg-zinc-800 text-white font-medium">{initials}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-white/75 hover:text-white hover:bg-zinc-800">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Se déconnecter</span>
                </Button>
            </div>
        </header>
    )
}
