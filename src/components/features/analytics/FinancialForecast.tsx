import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function FinancialForecast({ rows, goalEnabled, goalAmount }: { rows: any[], goalEnabled: boolean, goalAmount: number }) {
  return <Card className='bg-zinc-900 border-zinc-800'>
    <CardHeader><CardTitle className='text-zinc-100'>Prévision financière (12 mois)</CardTitle></CardHeader>
    <CardContent>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead><tr className='text-left text-zinc-400 border-b border-zinc-800'><th className='py-2'>Mois</th><th>Planifié</th><th>Réalisé</th>{goalEnabled && <th>Objectif</th>}{goalEnabled && <th>Écart</th>}</tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.key} className='border-b border-zinc-800'>
              <td className='py-2 text-zinc-200'>{r.label}</td>
              <td className='text-zinc-100'>${Math.round(r.planned).toLocaleString('fr-CA')}</td>
              <td className='text-green-400'>${Math.round(r.realized).toLocaleString('fr-CA')}</td>
              {goalEnabled && <td className='text-blue-300'>${Math.round(goalAmount).toLocaleString('fr-CA')}</td>}
              {goalEnabled && <td className={r.realized - goalAmount >= 0 ? 'text-green-400' : 'text-red-400'}>${Math.round(r.realized - goalAmount).toLocaleString('fr-CA')}</td>}
            </tr>)}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
}
