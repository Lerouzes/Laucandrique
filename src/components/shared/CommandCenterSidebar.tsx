'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    Layers, 
    ChevronDown,
    RefreshCw,
    Wrench,
    Settings,
    ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export function CommandCenterSidebar({ profile }: { profile: Profile | null }) {
    const pathname = usePathname()
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    
    const role = (profile?.role || 'Operations').toLowerCase()
    const isMasterOrDirection = role === 'master' || role === 'direction'
    const isManager = role === 'managers'
    const hasSwitcher = isMasterOrDirection || isManager

    const navItems = [
        { name: 'Centre de Commande', href: '/manager/command-center', icon: Layers }
    ]

    if (isMasterOrDirection) {
        navItems.push({ name: 'Configuration IA', href: '/manager/ai-settings', icon: Settings })
    }

    return (
        <div className="flex h-full w-64 flex-col border-r border-white/10 bg-[#070e1e] text-zinc-300">
            {/* Logo area */}
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-cyan-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-cyan-900/50">
                        C
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">Gustav</span>
                    <span className="text-[9px] bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded-full font-bold font-mono">
                        CC
                    </span>
                </div>
            </div>

            {/* Platform Switcher */}
            {hasSwitcher && (
                <div className="px-4 py-3 border-b border-white/5 relative">
                    <button 
                        onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-100 transition-all hover:bg-white/10 cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-cyan-400" />
                            Centre de Commande
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", isSwitcherOpen && "rotate-180")} />
                    </button>
                    
                    {isSwitcherOpen && (
                        <div className="absolute top-14 left-4 right-4 bg-zinc-950 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/10 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                            {isMasterOrDirection && (
                                <Link 
                                    href="/dashboard"
                                    onClick={() => setIsSwitcherOpen(false)}
                                    className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                                    Plateforme Opérations
                                </Link>
                            )}
                            <Link 
                                href="/team-management/dashboard"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Layers className="h-3.5 w-3.5 text-purple-400" />
                                Gestion d'Équipe
                            </Link>
                            <Link 
                                href="/maintenance-hub"
                                onClick={() => setIsSwitcherOpen(false)}
                                className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Wrench className="h-3.5 w-3.5 text-amber-500" />
                                Hub de Maintenance
                            </Link>
                            {isMasterOrDirection && (
                                <Link 
                                    href="/global-settings"
                                    onClick={() => setIsSwitcherOpen(false)}
                                    className="flex items-center gap-2 p-3 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <Settings className="h-3.5 w-3.5 text-indigo-400" />
                                    Configuration Globale
                                </Link>
                            )}
                            <div className="flex items-center gap-2 p-3 text-xs text-cyan-400 font-bold bg-cyan-950/15">
                                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                                Centre de Commande (Actif)
                            </div>
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
                                    ? 'bg-cyan-950/30 border-l-2 border-cyan-500 text-white font-semibold'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
                                'group flex items-center rounded-r-lg px-3 py-2 text-xs font-medium transition-all'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300',
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
            <div className="p-4 border-t border-white/5 bg-black/10 text-xxs text-zinc-500 text-center">
                Gustav Command Center
            </div>
        </div>
    )
}
