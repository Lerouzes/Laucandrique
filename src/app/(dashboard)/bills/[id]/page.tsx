import { notFound } from 'next/navigation'
import { getBillWithItems } from '@/actions/bills'
import { getSettings } from '@/actions/settings'
import { BillDetailView } from '@/components/features/bills/BillDetailView'

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const bill = await getBillWithItems(resolvedParams.id)

    if (!bill) {
        notFound()
    }

    const settings = await getSettings()

    return <BillDetailView bill={bill} settings={settings} />
}
