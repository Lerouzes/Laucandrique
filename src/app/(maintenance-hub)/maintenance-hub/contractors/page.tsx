import { getMaintenanceContractors } from '@/actions/contractors'
import { MaintenanceContractorFormDialog } from '@/components/features/maintenance/MaintenanceContractorFormDialog'
import { MaintenanceContractorsGrid } from '@/components/features/maintenance/MaintenanceContractorsGrid'
import { Building2 } from 'lucide-react'

export default async function MaintenanceContractorsPage() {
  const contractors = await getMaintenanceContractors()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Entrepreneurs</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Registre des entrepreneurs du Hub de Maintenance — distinct des contracteurs Opérations.
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {contractors.length} entrepreneur{contractors.length !== 1 ? 's' : ''} enregistré{contractors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <MaintenanceContractorFormDialog />
      </div>

      <MaintenanceContractorsGrid data={contractors} />
    </div>
  )
}
