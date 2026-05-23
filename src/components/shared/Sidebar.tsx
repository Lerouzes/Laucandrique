'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, CalendarDays, BarChart, Settings, HardHat, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Soumissions', href: '/quotes', icon: FileText },
    { name: 'Planification', href: '/planification', icon: CalendarDays },
    { name: 'Contracteurs', href: '/contractors', icon: HardHat },
    { name: 'Factures', href: '/bills', icon: Receipt },
    { name: 'Analytiques', href: '/analytics', icon: BarChart },
    { name: 'Paramètres', href: '/settings', icon: Settings },
]

export function SidebarContent() {
    const pathname = usePathname()

    return (
        <>
            <div className="flex h-16 items-center border-b border-white/15 px-6">
                <h1 className="text-xl font-bold tracking-tight text-white">Gustav</h1>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                isActive
                                    ? 'bg-white/20 text-white shadow-sm'
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

export function Sidebar() {
    return (
        <div className="hidden md:flex h-full w-64 flex-col border-r border-white/20 bg-[#103f75]/80 backdrop-blur-md">
            <SidebarContent />
        </div>
    )
}
