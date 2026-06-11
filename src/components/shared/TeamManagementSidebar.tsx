'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    LayoutDashboard, 
    Network, 
    CalendarDays, 
    Building2, 
    ClipboardCheck, 
    UsersRound, 
    FolderGit, 
    AlertTriangle, 
    BarChart3, 
    BellRing,
    ChevronDown,
    RefreshCw,
    Layers,
    UserCheck,
    Settings,
    Wrench
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

const navItems = [
    { name: 'Tableau de bord', href: '/team-management/dashboard', icon: LayoutDashboard },
    { name: 'Équipes', href: '/team-management/teams', icon: Network },
    { name: 'Gestionnaires', href: '/team-management/managers', icon: UserCheck },
    { name: '1-à-1 Rencontres', href: '/team-management/one-on-ones', icon: CalendarDays },
    { name: 'Syndicats', href: '/team-management/syndicates', icon: Building2 },
    { name: 'Audits de Santé', href: '/team-management/audits', icon: ClipboardCheck },
    { name: 'Assemblées', href: '/team-management/assemblies', icon: UsersRound },
    { name: 'Projets', href: '/team-management/projects', icon: FolderGit },
    { name: 'Plaintes', href: '/team-management/complaints', icon: AlertTriangle },
    { name: 'Performance', href: '/team-management/performance-reports', icon: BarChart3 },
    { name: 'Alertes', href: '/team-management/alerts', icon: BellRing },
    { name: 'Approbations M365', href: '/team-management/change-approvals', icon: RefreshCw },
    { name: 'Configuration', href: '/team-management/settings', icon: Settings },
]

export function TeamManagementSidebar({ profile }: { profile: Profile | null }) {
    const pathname = usePathname()
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    
    const role = (profile?.role || 'Operations').toLowerCase()
    const isMasterOrDirection = role === 'master' || role === 'direction'
    const isManager = role === 'managers'
    const hasSwitcher = isMasterOrDirection || isManager

    return (
        <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-[#0e0f14] text-zinc-300">
            {/* Logo area */}
            <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-6">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
                        G
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">Gustav</span>
                    <span className="text-[9px] bg-purple-950/60 text-purple-400 border border-purple-800/60 px-1.5 py-0.5 rounded-full font-bold font-mono">
                        TM
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
                            <Layers className="h-4 w-4 text-purple-400" />
                            Gestion d'Équipe
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
                            <div className="flex items-center gap-2 p-3 text-xs text-purple-400 font-bold bg-purple-950/15">
                                <Layers className="h-3.5 w-3.5 text-purple-400" />
                                Gestion d'Équipe (Actif)
                            </div>
                            <Link 
                                href="/maintenance-hub"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
                            >
                                <Wrench className="h-3.5 w-3.5 text-amber-500" />
                                Hub de Maintenance
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

                        </div>
                    )}
                </div>
            )}

            {/* Nav list */}
            <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                isActive
                                    ? 'bg-purple-950/25 border-l-2 border-purple-500 text-white font-semibold'
                                    : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-100',
                                'group flex items-center rounded-r-lg px-3 py-2 text-xs font-medium transition-all'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-300',
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
                Gestion Laucandrique · Control Center
            </div>
        </div>
    )
}
