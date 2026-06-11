'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    LayoutDashboard, 
    ChevronDown,
    Layers,
    RefreshCw,
    Wrench,
    Plus,
    Building2,
    Mail,
    Settings
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

const navItems = [
    { name: 'Tableau de bord', href: '/maintenance-hub', icon: LayoutDashboard },
    { name: 'Entrepreneurs', href: '/maintenance-hub/contractors', icon: Building2 },
    { name: 'Nouvelle Campagne', href: '/maintenance-hub/campaigns/new', icon: Plus },
    { name: 'Paramètres e-mails', href: '/maintenance-hub/settings', icon: Mail },
]

export function MaintenanceHubSidebar({ profile }: { profile: Profile | null }) {
    const pathname = usePathname()
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    
    const role = (profile?.role || 'Operations').toLowerCase()
    const isMasterOrDirection = role === 'master' || role === 'direction'
    const isManager = role === 'managers'
    const hasSwitcher = isMasterOrDirection || isManager

    return (
        <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-[#0c0d12] text-zinc-300">
            {/* Logo area */}
            <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-6">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-amber-600 flex items-center justify-center font-bold text-white text-xs">
                        M
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">Gustav</span>
                    <span className="text-[9px] bg-amber-950/60 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded-full font-bold font-mono">
                        MH
                    </span>
                </div>
            </div>

            {/* Platform Switcher */}
            {hasSwitcher && (
                <div className="px-4 py-3 border-b border-zinc-900 relative">
                    <button 
                        onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-900/50 border border-zinc-850 hover:border-zinc-700 text-xs font-semibold text-zinc-100 transition-all hover:bg-zinc-900"
                    >
                        <span className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-amber-500" />
                            Hub de Maintenance
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", isSwitcherOpen && "rotate-180")} />
                    </button>
                    
                    {isSwitcherOpen && (
                        <div className="absolute top-14 left-4 right-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-850 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                            {isMasterOrDirection && (
                                <Link 
                                    href="/dashboard"
                                    onClick={() => setIsSwitcherOpen(false)}
                                    className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
                                >
                                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                                    Plateforme Opérations
                                </Link>
                            )}
                            <Link 
                                href="/team-management/dashboard"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
                            >
                                <Layers className="h-3.5 w-3.5 text-purple-400" />
                                Gestion d'Équipe
                            </Link>
                            {isMasterOrDirection && (
                                <Link 
                                    href="/global-settings"
                                    onClick={() => setIsSwitcherOpen(false)}
                                    className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
                                >
                                    <Settings className="h-3.5 w-3.5 text-indigo-400" />
                                    Configuration Globale
                                </Link>
                            )}
                            <div className="flex items-center gap-2 p-3 text-xs text-amber-500 font-bold bg-amber-950/15">
                                <Wrench className="h-3.5 w-3.5 text-amber-500" />
                                Hub de Maintenance (Actif)
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Nav list */}
            <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/maintenance-hub' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                isActive
                                    ? 'bg-amber-950/20 border-l-2 border-amber-500 text-white font-semibold'
                                    : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-100',
                                'group flex items-center rounded-r-lg px-3 py-2 text-xs font-medium transition-all'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    isActive ? 'text-amber-500' : 'text-zinc-500 group-hover:text-zinc-300',
                                    'mr-3 flex-shrink-0 h-4 w-4 transition-colors'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
            
            {/* User Footnote */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950/20 text-xxs text-zinc-500 text-center">
                Gestion Laucandrique · Maintenance Center
            </div>
        </div>
    )
}
