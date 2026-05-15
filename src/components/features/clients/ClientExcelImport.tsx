'use client'

import { useRef, useTransition } from 'react'
import { Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { importClients } from '@/actions/clients'

export function ClientExcelImport() {
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws)

                // Basic mapping
                const formattedData = data.map((row: any) => ({
                    full_name: row['Nom Complet'] || row['Nom'] || row['full_name'] || 'Inconnu',
                    company_name: row['Compagnie'] || row['entreprise'] || null,
                    email: row['Courriel'] || row['Email'] || null,
                    phone: row['Téléphone'] || row['Telephone'] || null,
                    address: row['Adresse'] || null,
                    city: row['Ville'] || null,
                    province: row['Province'] || null,
                }))

                startTransition(async () => {
                    try {
                        await importClients(formattedData)
                        toast.success(`${formattedData.length} clients importés avec succès.`)
                    } catch (error: any) {
                        toast.error("Erreur lors de l'importation", { description: error.message })
                    }
                })
            } catch (err: any) {
                toast.error('Erreur de lecture du fichier', { description: err.message })
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
        reader.readAsBinaryString(file)
    }

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />
            <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
                <Upload className="mr-2 h-4 w-4" />
                {isPending ? 'Importation...' : 'Importer Excel'}
            </Button>
        </>
    )
}
