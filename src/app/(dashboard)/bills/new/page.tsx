import { redirect } from 'next/navigation'
import { getQuote } from '@/actions/quotes'
import { getContractors } from '@/actions/contractors'
import { getSettings } from '@/actions/settings'
import { BillForm } from '@/components/features/bills/BillForm'

interface PageProps {
    searchParams: Promise<{ quoteId?: string }>
}

export default async function NewBillPage({ searchParams }: PageProps) {
    const { quoteId } = await searchParams

    if (!quoteId) {
        redirect('/quotes')
    }

    const quote = await getQuote(quoteId)
    if (!quote) {
        redirect('/quotes')
    }

    const contractors = await getContractors()
    const settings = await getSettings()

    return (
        <div className="space-y-6">
            <BillForm 
                quote={quote} 
                contractors={contractors} 
                settings={settings} 
            />
        </div>
    )
}
