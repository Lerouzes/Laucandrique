'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, CalendarDays, BarChart, Settings, HardHat, Receipt, ChevronDown, Layers, RefreshCw, Wrench } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

const navItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Soumissions', href: '/quotes', icon: FileText },
    { name: 'Planification', href: '/planification', icon: CalendarDays },
    { name: 'Contracteurs', href: '/contractors', icon: HardHat },
    { name: 'Factures', href: '/bills', icon: Receipt },
    { name: 'Analytiques', href: '/analytics', icon: BarChart },
    { name: 'Paramètres', href: '/settings', icon: Settings },
]

export function SidebarContent({ profile }: { profile: Profile | null }) {
    const pathname = usePathname()
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    
    const role = (profile?.role || 'Operations').toLowerCase()
    const hasBothAccess = role === 'direction' || role === 'master'

    return (
        <>
            <div className="flex h-16 items-center border-b border-white/15 px-6">
                <h1 className="text-xl font-bold tracking-tight text-white">Gustav</h1>
            </div>

            {/* Platform Switcher */}
            {hasBothAccess && (
                <div className="px-4 py-3 border-b border-white/10 relative">
                    <button 
                        onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/10 border border-white/15 hover:border-white/25 text-xs font-semibold text-white transition-all hover:bg-white/15"
                    >
                        <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-cyan-300 animate-spin-slow" />
                            Plateforme Opérations
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-white/60 transition-transform", isSwitcherOpen && "rotate-180")} />
                    </button>
                    
                    {isSwitcherOpen && (
                        <div className="absolute top-14 left-4 right-4 bg-[#103f75] border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/10 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                            <div className="flex items-center gap-2 p-3 text-xs text-cyan-300 font-bold bg-white/10">
                                <RefreshCw className="h-3.5 w-3.5 text-cyan-300" />
                                Plateforme Opérations (Actif)
                            </div>
                            <Link 
                                href="/team-management/dashboard"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-white/70 hover:text-white hover:bg-white/15 transition-all"
                            >
                                <Layers className="h-3.5 w-3.5 text-purple-400" />
                                Gestion d'Équipe
                            </Link>
                            <Link 
                                href="/maintenance-hub"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-white/70 hover:text-white hover:bg-white/15 transition-all"
                            >
                                <Wrench className="h-3.5 w-3.5 text-amber-400" />
                                Hub de Maintenance
                            </Link>
                            <Link 
                                href="/global-settings"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-white/70 hover:text-white hover:bg-white/15 transition-all"
                            >
                                <Settings className="h-3.5 w-3.5 text-indigo-400" />
                                Configuration Globale
                            </Link>

                        </div>
                    )}
                </div>
            )}

            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                isActive
                                    ? 'bg-white/20 text-white shadow-sm font-semibold'
                                    : 'text-white/75 hover:bg-white/12 hover:text-white',
                                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    isActive ? 'text-white' : 'text-white/70 group-hover:text-white',
                                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
        </>
    )
}

export function Sidebar({ profile }: { profile: Profile | null }) {
    return (
        <div className="hidden md:flex h-full w-64 flex-col border-r border-white/20 bg-[#103f75]/80 backdrop-blur-md">
            <SidebarContent profile={profile} />
        </div>
    )
}
