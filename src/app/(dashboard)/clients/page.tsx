import { redirect } from 'next/navigation'

export default function ClientsPage() {
    redirect('/global-settings?tab=clients')
}

