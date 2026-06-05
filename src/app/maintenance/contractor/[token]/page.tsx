// @ts-nocheck
// src/app/maintenance/contractor/[token]/page.tsx
import { getContractorDashboardAction } from '@/actions/maintenance'
import { ContractorDashboard } from '@/components/features/maintenance/ContractorDashboard'

export const dynamic = 'force-dynamic'

export default async function ContractorDashboardPage({
    params
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params

    try {
        const details = await getContractorDashboardAction(token)

        return (
            <div className="min-h-screen bg-[#0d0e12] text-zinc-150 py-12 px-4 flex justify-center font-sans">
                <ContractorDashboard 
                    token={token} 
                    details={details} 
                />
            </div>
        )
    } catch (err) {
        return (
            <div className="min-h-screen bg-[#0d0e12] text-zinc-100 py-12 px-4 flex items-center justify-center font-sans">
                <div className="max-w-md w-full p-6 bg-[#16171e] border border-zinc-800 rounded-2xl text-center space-y-4 shadow-xl">
                    <h2 className="text-sm font-extrabold uppercase text-rose-400">Jeton d'accès invalide</h2>
                    <p className="text-xxs text-zinc-400">
                        Votre lien d'accès contracteur est invalide ou a expiré. Veuillez contacter la direction de Gustav.
                    </p>
                </div>
            </div>
        )
    }
}
