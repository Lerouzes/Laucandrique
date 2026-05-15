'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, CalendarDays, BarChart, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Soumissions', href: '/quotes', icon: FileText },
    { name: 'Planification', href: '/planification', icon: CalendarDays },
    { name: 'Analytiques', href: '/analytics', icon: BarChart },
    { name: 'Paramètres', href: '/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900">
            <div className="flex h-16 items-center border-b border-zinc-800 px-6">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">Gustav</h1>
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
                                    ? 'bg-zinc-800 text-zinc-100'
                                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100',
                                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    isActive ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-300',
                                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
