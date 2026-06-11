import { GlobalSettingsSidebar } from '@/components/shared/GlobalSettingsSidebar'
import { GlobalSettingsHeader } from '@/components/shared/GlobalSettingsHeader'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function GlobalSettingsLayout({
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

    // Enforce role security: Operations is blocked from Global Settings Configuration
    const userRole = profile?.role || 'Operations'
    if (userRole.toLowerCase() === 'operations') {
        redirect('/dashboard')
    }

    return (
        <div className="flex h-screen bg-[#07080a] text-zinc-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="hidden md:flex h-full shrink-0">
                <GlobalSettingsSidebar profile={profile} />
            </div>
            
            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0d0e12]">
                {/* Header */}
                <GlobalSettingsHeader user={user} profile={profile} />
                
                {/* Content container */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
