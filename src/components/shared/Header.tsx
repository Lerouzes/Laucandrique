'use client'

import { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export function Header({ user, profile }: { user: User, profile: Profile | null }) {
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.refresh()
    }

    const initials = profile?.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase() || 'U'

    return (
        <header className="flex h-16 items-center justify-end border-b border-zinc-800 bg-zinc-900 px-6">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-zinc-100">{profile?.full_name || user.email}</span>
                    <span className="text-xs text-zinc-400">{profile?.role === 'admin' ? 'Administrateur' : 'Employé'}</span>
                </div>
                <Avatar className="h-9 w-9 border border-zinc-700">
                    <AvatarFallback className="bg-zinc-800 text-zinc-100 font-medium">{initials}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Se déconnecter</span>
                </Button>
            </div>
        </header>
    )
}
