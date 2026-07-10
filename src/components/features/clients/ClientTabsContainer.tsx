// src/components/features/clients/ClientTabsContainer.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface ClientTabsContainerProps {
    infoForm: React.ReactNode
    coOwnersManager: React.ReactNode
    communicationsTab?: React.ReactNode
    statsTab?: React.ReactNode
}

export function ClientTabsContainer({ infoForm, coOwnersManager, communicationsTab, statsTab }: ClientTabsContainerProps) {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')

    const getInitialTab = () => {
        if (tabParam === 'communications') return 'communications'
        if (tabParam === 'coowners') return 'coowners'
        if (tabParam === 'stats') return 'stats'
        return 'infos'
    }

    const [activeTab, setActiveTab] = useState<'infos' | 'coowners' | 'communications' | 'stats'>(getInitialTab)

    useEffect(() => {
        if (tabParam === 'communications') {
            setActiveTab('communications')
        } else if (tabParam === 'coowners') {
            setActiveTab('coowners')
        } else if (tabParam === 'stats') {
            setActiveTab('stats')
        } else if (tabParam === 'infos') {
            setActiveTab('infos')
        }
    }, [tabParam])

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Tabs Navigation */}
            <div className="flex border-b border-zinc-850 gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('infos')}
                    className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'infos'
                            ? 'border-cyan-500 text-cyan-400'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    Détails & Contrat
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('coowners')}
                    className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'coowners'
                            ? 'border-cyan-500 text-cyan-400'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    Copropriétaires & Unités
                </button>
                {communicationsTab && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('communications')}
                        className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                            activeTab === 'communications'
                                    ? 'border-cyan-500 text-cyan-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        Communications & Suivi
                    </button>
                )}
                {statsTab && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                            activeTab === 'stats'
                                    ? 'border-cyan-500 text-cyan-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        Statistiques & Fiche
                    </button>
                )}
            </div>

            {/* Tab Panels */}
            <div className="pt-2">
                {activeTab === 'infos' ? infoForm : activeTab === 'coowners' ? coOwnersManager : activeTab === 'communications' ? communicationsTab : statsTab}
            </div>
        </div>
    )
}

