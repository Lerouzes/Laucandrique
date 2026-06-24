import { getClients } from '@/actions/clients'
import { getManagers } from '@/actions/managers'
import { MapPageView } from '@/components/features/map/MapPageView'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
    const clients = await getClients()
    const managers = await getManagers(true)

    // Only pass active clients to the map
    const activeClients = (clients || []).filter((c: any) => c.status === 'active')

    return (
        <MapPageView 
            initialClients={activeClients} 
            managers={managers || []} 
        />
    )
}
