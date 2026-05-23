import { redirect, notFound } from 'next/navigation'
import { getBillWithItems } from '@/actions/bills'
import { getQuote } from '@/actions/quotes'
import { getContractors } from '@/actions/contractors'
import { getSettings } from '@/actions/settings'
import { BillForm } from '@/components/features/bills/BillForm'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditBillPage({ params }: PageProps) {
    const resolvedParams = await params
    
    const bill = await getBillWithItems(resolvedParams.id)
    if (!bill) {
        notFound()
    }

    if (!bill.quote_id) {
        redirect('/bills')
    }

    const quote = await getQuote(bill.quote_id)
    if (!quote) {
        redirect('/bills')
    }

    const contractors = await getContractors()
    const settings = await getSettings()

    return (
        <div className="space-y-6">
            <BillForm 
                quote={quote} 
                contractors={contractors} 
                settings={settings}
                initialBill={bill}
                initialBillItems={bill.bill_items}
                initialBillImages={bill.bill_images}
            />
        </div>
    )
}
