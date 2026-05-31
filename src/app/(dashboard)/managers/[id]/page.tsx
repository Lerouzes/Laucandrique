import { notFound } from 'next/navigation'
import { getManagerById, getManagerTeams, getManagers } from '@/actions/managers'
import { getQuotes } from '@/actions/quotes'
import { ManagerDashboard } from '@/components/features/managers/ManagerDashboard'

export default async function ManagerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const [manager, quotes, managers, managerTeams] = await Promise.all([
    getManagerById(id), 
    getQuotes(), 
    getManagers(true),
    getManagerTeams()
  ])
  
  if (!manager) notFound()

  return (
    <div className="space-y-6">
      <ManagerDashboard 
        manager={manager} 
        quotes={quotes} 
        managers={managers} 
        managerTeams={managerTeams} 
      />
    </div>
  )
}
