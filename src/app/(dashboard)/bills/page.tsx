import { getBills } from '@/actions/bills'
import { BillsTable } from '@/components/features/bills/BillsTable'

export default async function BillsPage() {
    const bills = await getBills()

    return (
        <div className="space-y-6 h-full flex flex-col pb-6 text-white">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Factures & Règlements</h2>
                <p className="text-sm text-zinc-400">
                    Registre complet de toutes les factures émises, détails des marges et répartition des gains.
                </p>
            </div>

            <BillsTable initialBills={bills} />
        </div>
    )
}
