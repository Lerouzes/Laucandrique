import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
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

    // Redirect Managers to Team Management
    if (profile?.role === 'Managers') {
        redirect('/team-management/dashboard')
    }

    return (
        <div className="flex h-screen brand-surface text-white">
            <Sidebar profile={profile} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header user={user} profile={profile} />
                <main className="flex-1 overflow-y-auto bg-[#1a4a82] p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
