import { getContractors } from '@/actions/contractors'
import { ContractorFormDialog } from '@/components/features/contractors/ContractorFormDialog'
import { ContractorsTable } from '@/components/features/contractors/ContractorsTable'

export default async function ContractorsPage() {
  const contractors = await getContractors()
  return <div className='space-y-6'>
    <div className='flex items-center justify-between'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>Contracteurs</h2>
        <p className='text-sm opacity-80'>Registre des contracteurs et compétences.</p>
      </div>
      <ContractorFormDialog />
    </div>
    <ContractorsTable data={contractors} />
  </div>
}
