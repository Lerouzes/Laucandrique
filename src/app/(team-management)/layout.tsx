import { TeamManagementSidebar } from '@/components/shared/TeamManagementSidebar'
import { TeamManagementHeader } from '@/components/shared/TeamManagementHeader'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function TeamManagementLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Enforce role security: Operations role is blocked from Team Management
    const userRole = profile?.role || 'Operations'
    if (userRole === 'Operations') {
        redirect('/dashboard')
    }

    return (
        <div className="flex h-screen bg-[#0d0e12] text-zinc-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <TeamManagementSidebar profile={profile} />
            
            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#111218]">
                {/* Header */}
                <TeamManagementHeader user={user} profile={profile} />
                
                {/* Scrollable Content Container */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
