'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, ChevronLeft, Pencil, Trash2, CheckCircle, XCircle, User, FileText, Image as ImageIcon, MapPin, Mail, Phone } from 'lucide-react'
import { downloadBillPDF } from '@/utils/pdf'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { revertBillToDraftAction, deleteBillAction, updateBillAction } from '@/actions/bills'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface BillDetailViewProps {
    bill: any
    settings: any
}

export function BillDetailView({ bill, settings }: BillDetailViewProps) {
    const router = useRouter()
    const pdfRef = useRef<HTMLDivElement>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Calculate totals
    const subtotal = Number(bill.subtotal || 0)
    const adminAmount = Number(bill.admin_amount || 0)
    const profitAmount = Number(bill.profit_amount || 0)
    const gstAmount = Number(bill.gst_amount || 0)
    const qstAmount = Number(bill.qst_amount || 0)
    const total = Number(bill.total || 0)

    const handleRevertToDraft = () => {
        startTransition(async () => {
            try {
                const res = await revertBillToDraftAction(bill.id)
                if (res.success) {
                    toast.success("Facture ramenée en brouillon.")
                    router.refresh()
                }
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    const handleFinalizeBill = () => {
        startTransition(async () => {
            try {
                // Set status to sent
                const res = await updateBillAction(bill.id, { status: 'sent' }, bill.bill_items, bill.bill_images)
                if (res.success) {
                    toast.success("Facture finalisée et soumission marquée facturée.")
                    router.refresh()
                }
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    const handleDeleteBill = () => {
        startTransition(async () => {
            try {
                const res = await deleteBillAction(bill.id)
                if (res.success) {
                    toast.success("Facture supprimée. La soumission est repassée à l'état complété.")
                    router.push('/bills')
                }
            } catch (err: any) {
                toast.error("Erreur", { description: err.message })
            }
        })
    }

    const generatePDF = async () => {
        try {
            setIsGenerating(true)
            await downloadBillPDF(bill, settings)
        } catch (err) {
            console.error("PDF generation failed:", err)
            toast.error("Erreur lors de la génération du PDF.")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12 w-full overflow-x-auto">
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between min-w-[700px]">
                <Link href="/bills" className="inline-flex items-center text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Retour aux factures
                </Link>
                <div className="flex gap-2 text-sm">
                    {bill.status === 'draft' ? (
                        <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700">Brouillon</Badge>
                    ) : (
                        <Badge className="bg-purple-900/60 text-purple-300 border border-purple-800">Facturée</Badge>
                    )}
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 min-w-[700px]">
                <Button onClick={generatePDF} disabled={isGenerating} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Génération...' : 'Télécharger PDF'}
                </Button>

                {/* Edit option */}
                <Link href={`/bills/${bill.id}/edit`} className="group/button inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100">
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier la facture
                </Link>

                {/* Finalize draft bill */}
                {bill.status === 'draft' && (
                    <Button
                        variant="outline"
                        onClick={handleFinalizeBill}
                        disabled={isPending}
                        className="border-purple-300 bg-purple-950/20 text-purple-300 hover:bg-purple-900/50 hover:text-purple-200 font-semibold"
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Finaliser la facture
                    </Button>
                )}

                {/* Revert sent/paid bill to draft */}
                {bill.status !== 'draft' && (
                    <Button
                        variant="outline"
                        onClick={handleRevertToDraft}
                        disabled={isPending}
                        className="border-yellow-850 bg-yellow-950/20 text-yellow-400 hover:bg-yellow-900/50 hover:text-yellow-350"
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Repasser en brouillon
                    </Button>
                )}

                {/* Delete bill */}
                <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isPending}
                    className="border-rose-900/60 bg-rose-950/20 text-rose-400 hover:bg-rose-900/50 hover:text-rose-300"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer la facture
                </Button>
            </div>

            {/* Bill Invoice Document (White Sheet A4 Look) */}
            <div className="bg-white text-black p-10 rounded-lg shadow-sm w-[800px] shrink-0 relative overflow-hidden" ref={pdfRef}>
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{settings.company_name || 'Gustav Inc.'}</h1>
                        <p className="text-zinc-500 mt-1">Facture Officielle</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold mb-2">FACTURE #{bill.bill_number}</h2>
                        <div className="text-sm text-zinc-600">
                            <p>Date d'émission: {format(new Date(bill.bill_date), 'dd MMMM yyyy', { locale: frCA })}</p>
                            <p>Soumission: #{bill.quotes?.quote_number || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Information Sections */}
                <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-6">
                    {/* Client info */}
                    <div>
                        <h3 className="font-semibold text-zinc-900 mb-2 border-b pb-1">Facturé à</h3>
                        <div className="text-sm text-zinc-700 space-y-1">
                            <p className="font-bold text-black">{bill.clients?.full_name}</p>
                            {bill.clients?.company_name && <p className="text-purple-700 font-medium">{bill.clients.company_name}</p>}
                            <p>{bill.clients?.address || ''} {bill.clients?.city || ''}</p>
                            <p>{bill.clients?.email}</p>
                            <p>{bill.clients?.phone}</p>
                        </div>
                    </div>

                    {/* Contractor & Manager info */}
                    <div>
                        <h3 className="font-semibold text-zinc-900 mb-2 border-b pb-1">Détails Projet</h3>
                        <div className="text-sm text-zinc-700 space-y-1.5">
                            <div>
                                <span className="text-zinc-400 block text-xxs uppercase font-bold">Projet / Titre</span>
                                <span className="font-semibold text-zinc-900">{bill.title}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bill Items Description */}
                <div className="mb-8">
                    <h3 className="font-semibold text-zinc-800 text-sm mb-4 uppercase tracking-wider">Détails de facturation</h3>
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b-2 border-zinc-300 text-zinc-900">
                                <th className="py-2">Article / Description</th>
                                <th className="py-2 text-center">Quantité</th>
                                <th className="py-2 text-center">Unité</th>
                                <th className="py-2 text-right">Prix Unitaire</th>
                                <th className="py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-700">
                            {bill.bill_items?.map((item: any) => (
                                <tr key={item.id} className="border-b border-zinc-200">
                                    <td className="py-3 pr-4">
                                        <div className="font-bold text-zinc-900 text-sm">
                                            {item.title || 'Sans titre'}
                                        </div>
                                        {item.description && (
                                            <div className="text-zinc-500 text-xs mt-1 whitespace-pre-wrap">{item.description}</div>
                                        )}
                                    </td>
                                    <td className="py-3 text-center">{item.quantity}</td>
                                    <td className="py-3 text-center">{item.unit || '-'}</td>
                                    <td className="py-3 text-right">${item.unit_cost?.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="py-3 text-right font-medium text-zinc-900">${item.total?.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-between items-start mb-8 gap-8">
                    {/* Internal Notes Display */}
                    <div className="w-1/2">
                        {bill.notes && (
                            <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg text-xs">
                                <h4 className="font-bold text-zinc-800 mb-1.5 flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-purple-600" />
                                    Notes et Conditions de Paiement
                                </h4>
                                <p className="text-zinc-650 whitespace-pre-wrap">{bill.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Totals table */}
                    <div className="w-64 space-y-2 text-sm text-zinc-700">
                        <div className="flex justify-between">
                            <span>Sous-total Chantier:</span>
                            <span>${subtotal.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {adminAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Administration ({bill.admin_percentage}%):</span>
                                <span>${adminAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {profitAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Profit ({bill.profit_percentage}%):</span>
                                <span>${profitAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>TPS (5%):</span>
                            <span>${gstAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>TVQ (9.975%):</span>
                            <span>${qstAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t-2 border-zinc-300 font-bold text-lg text-black bg-zinc-55 px-2 rounded-sm pb-1">
                            <span>Total:</span>
                            <span>${total.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Uploaded Images Gallery section */}
                {bill.bill_images && bill.bill_images.length > 0 && (
                    <div className="mt-12 pt-8 border-t-2 border-zinc-250">
                        <h3 className="font-bold text-zinc-900 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-purple-600" />
                            Annexe : Photos et Justificatifs
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            {bill.bill_images.map((img: any) => (
                                <div key={img.id} className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 shadow-xs">
                                    <img 
                                        src={img.image_url} 
                                        alt="Projet" 
                                        className="w-full h-48 object-cover" 
                                        crossOrigin="anonymous" 
                                    />
                                    {img.caption && (
                                        <div className="p-3 text-xs text-zinc-700 font-medium bg-white border-t border-zinc-150">
                                            {img.caption}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center text-xs text-zinc-400">
                    Cette facture a été générée automatiquement par {settings.company_name || 'Gustav'}. Merci de votre confiance.
                </div>
            </div>

            {/* Confirmation Dialog for Deleting Bill */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-500">
                            Supprimer la facture
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Êtes-vous sûr de vouloir supprimer la facture <strong>#{bill.bill_number}</strong> ?
                            <br />
                            <span className="text-rose-400/80 font-medium text-xs mt-1 block">
                                Cette action est irréversible. Le statut de la soumission associée reviendra automatiquement à l'état "Complété".
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="bg-zinc-950 border-t border-zinc-900 mt-2">
                        <DialogClose
                            render={
                                <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900" />
                            }
                        >
                            Annuler
                        </DialogClose>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isPending}
                            onClick={handleDeleteBill}
                            className="bg-rose-600 hover:bg-rose-550 text-white font-semibold"
                        >
                            {isPending ? 'Suppression...' : 'Confirmer la suppression'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
