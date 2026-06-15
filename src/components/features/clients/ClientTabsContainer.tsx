// src/components/features/clients/ClientTabsContainer.tsx
'use client'

import { useState } from 'react'

interface ClientTabsContainerProps {
    infoForm: React.ReactNode
    coOwnersManager: React.ReactNode
    communicationsTab?: React.ReactNode
}

export function ClientTabsContainer({ infoForm, coOwnersManager, communicationsTab }: ClientTabsContainerProps) {
    const [activeTab, setActiveTab] = useState<'infos' | 'coowners' | 'communications'>('infos')

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
            </div>

            {/* Tab Panels */}
            <div className="pt-2">
                {activeTab === 'infos' ? infoForm : activeTab === 'coowners' ? coOwnersManager : communicationsTab}
            </div>
        </div>
    )
}
