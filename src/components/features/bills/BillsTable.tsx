'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { 
    Receipt, 
    Search, 
    Eye, 
    DollarSign, 
    Calendar, 
    User, 
    TrendingUp, 
    ArrowUpDown, 
    FileText, 
    Percent, 
    HardHat,
    X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog'
import { getBillWithItems } from '@/actions/bills'
import { format } from 'date-fns'
import { frCA } from 'date-fns/locale'

interface BillsTableProps {
    initialBills: any[]
}

export function BillsTable({ initialBills }: BillsTableProps) {
    const [bills, setBills] = useState<any[]>(initialBills)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
    const [billDetails, setBillDetails] = useState<any | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [sortBy, setSortBy] = useState<'date' | 'total'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const savedSortBy = localStorage.getItem('bills_sort_by')
        const savedSortOrder = localStorage.getItem('bills_sort_order')
        if (savedSortBy === 'date' || savedSortBy === 'total') {
            setSortBy(savedSortBy)
        }
        if (savedSortOrder === 'asc' || savedSortOrder === 'desc') {
            setSortOrder(savedSortOrder)
        }
    }, [])

    // 1. Metric Calculations
    const metrics = useMemo(() => {
        const totalBilled = bills.reduce((sum, b) => sum + Number(b.total || 0), 0)
        const totalWork = bills.reduce((sum, b) => sum + Number(b.subtotal || 0), 0)
        const totalAdmin = bills.reduce((sum, b) => sum + Number(b.admin_amount || 0), 0)
        const totalProfit = bills.reduce((sum, b) => sum + Number(b.profit_amount || 0), 0)
        const totalMargins = totalAdmin + totalProfit
        const totalTaxes = bills.reduce((sum, b) => sum + Number(b.gst_amount || 0) + Number(b.qst_amount || 0), 0)

        return {
            totalBilled,
            totalWork,
            totalMargins,
            totalTaxes,
            count: bills.length
        }
    }, [bills])

    // 2. Search & Sort Filtering
    const filteredBills = useMemo(() => {
        let result = [...bills]

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            result = result.filter(b => {
                const billNum = (b.bill_number || '').toLowerCase()
                const title = (b.title || '').toLowerCase()
                const clientName = (b.clients?.full_name || '').toLowerCase()
                const clientCompany = (b.clients?.company_name || '').toLowerCase()
                const quoteNum = (b.quotes?.quote_number || '').toLowerCase()
                const quoteTitle = (b.quotes?.title || '').toLowerCase()
                const contractor = (b.contractors?.full_name || '').toLowerCase()

                return billNum.includes(query) || 
                       title.includes(query) || 
                       clientName.includes(query) || 
                       clientCompany.includes(query) || 
                       quoteNum.includes(query) || 
                       quoteTitle.includes(query) || 
                       contractor.includes(query)
            })
        }

        result.sort((a, b) => {
            let valA = sortBy === 'date' ? new Date(a.bill_date).getTime() : Number(a.total || 0)
            let valB = sortBy === 'date' ? new Date(b.bill_date).getTime() : Number(b.total || 0)

            if (sortOrder === 'asc') {
                return valA > valB ? 1 : -1
            } else {
                return valA < valB ? 1 : -1
            }
        })

        return result
    }, [bills, searchQuery, sortBy, sortOrder])

    // 3. Handlers
    const handleViewDetails = (billId: string) => {
        setSelectedBillId(billId)
        setIsLoadingDetails(true)
        setIsDetailsOpen(true)
        setBillDetails(null)

        startTransition(async () => {
            try {
                const details = await getBillWithItems(billId)
                setBillDetails(details)
            } catch (err) {
                console.error("Failed to fetch bill details", err)
            } finally {
                setIsLoadingDetails(false)
            }
        })
    }

    const toggleSort = (type: 'date' | 'total') => {
        let nextSortBy = sortBy
        let nextSortOrder = sortOrder
        if (sortBy === type) {
            nextSortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
            setSortOrder(nextSortOrder)
        } else {
            nextSortBy = type
            nextSortOrder = 'desc'
            setSortBy(type)
            setSortOrder(nextSortOrder)
        }
        localStorage.setItem('bills_sort_by', nextSortBy)
        localStorage.setItem('bills_sort_order', nextSortOrder)
    }

    return (
        <div className="space-y-6 w-full">
            {/* Premium Stats Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-purple-950/50 p-2 border border-purple-800/30">
                        <Receipt className="h-5 w-5 text-purple-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Volume Total Facturé</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(metrics.totalBilled).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        Montant brut incluant taxes et marges
                    </p>
                </div>

                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-emerald-950/50 p-2 border border-emerald-800/30">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valeur des Chantiers</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(metrics.totalWork).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        Coût pur des travaux (hors taxes et marges)
                    </p>
                </div>

                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-cyan-950/50 p-2 border border-cyan-800/30">
                        <Percent className="h-5 w-5 text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Marge Gustav Accumulée</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(metrics.totalMargins).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        Marges Administration + Profit
                    </p>
                </div>

                <div className="group relative rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/50">
                    <div className="absolute top-4 right-4 rounded-xl bg-amber-950/50 p-2 border border-amber-800/30">
                        <DollarSign className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Taxes Collectées</p>
                    <h3 className="mt-3 text-2xl font-extrabold text-zinc-100 tracking-tight">
                        ${Math.round(metrics.totalTaxes).toLocaleString('fr-CA')}
                    </h3>
                    <p className="mt-2 text-xxs text-zinc-500">
                        TPS et TVQ prêtes à déclarer
                    </p>
                </div>
            </div>

            {/* Filter and Table Panel */}
            <Card className="bg-zinc-950/70 border-zinc-800 backdrop-blur-md shadow-2xl p-6 rounded-2xl">
                <div className="space-y-4">
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="Rechercher par numéro, titre, client, soumission ou contracteur..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/50 border-zinc-800 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-purple-600 focus-visible:border-transparent h-9 text-sm rounded-lg"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleSort('date')}
                                className={`text-xs h-9 border-zinc-800 flex items-center gap-1.5 ${
                                    sortBy === 'date' ? 'bg-purple-950/30 text-purple-300 border-purple-900/50' : 'bg-zinc-900 text-zinc-300'
                                }`}
                            >
                                Trier par Date
                                <ArrowUpDown className="h-3 w-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleSort('total')}
                                className={`text-xs h-9 border-zinc-800 flex items-center gap-1.5 ${
                                    sortBy === 'total' ? 'bg-purple-950/30 text-purple-300 border-purple-900/50' : 'bg-zinc-900 text-zinc-300'
                                }`}
                            >
                                Trier par Total
                                <ArrowUpDown className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="rounded-xl border border-zinc-800 bg-transparent overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-900/20 border-b border-zinc-800">
                                <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3">Facture #</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3">Date</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3">Soumission / Projet</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3">Client</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3">Contracteur</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3 text-right">Marge Gustav</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3 text-right">Total Facturé</TableHead>
                                    <TableHead className="text-zinc-300 font-bold text-xs py-3 text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBills.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-sm text-zinc-500 italic">
                                            Aucune facture trouvée correspondant aux critères de recherche.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBills.map((b) => {
                                        const marginVal = Number(b.admin_amount || 0) + Number(b.profit_amount || 0)
                                        return (
                                            <TableRow 
                                                key={b.id} 
                                                className="border-b border-zinc-900/80 hover:bg-zinc-900/30 transition-colors duration-150 text-xs"
                                            >
                                                <TableCell className="font-bold text-purple-400 py-3">
                                                    #{b.bill_number || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-zinc-300">
                                                    {format(new Date(b.bill_date), 'dd MMM yyyy', { locale: frCA })}
                                                </TableCell>
                                                <TableCell className="text-zinc-200">
                                                    <div className="font-medium max-w-[200px] truncate">{b.title}</div>
                                                    <div className="text-xxs text-zinc-500">Soumission #{b.quotes?.quote_number || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell className="text-zinc-300">
                                                    <div>{b.clients?.full_name || 'N/A'}</div>
                                                    {b.clients?.company_name && (
                                                        <div className="text-xxs text-zinc-500 truncate max-w-[120px]">{b.clients.company_name}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-zinc-300">
                                                    <span className="flex items-center gap-1">
                                                        <HardHat className="h-3 w-3 text-emerald-400 shrink-0" />
                                                        {b.contractors?.full_name || 'Sans contracteur'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-cyan-400 font-semibold">
                                                    ${marginVal.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right font-extrabold text-zinc-100">
                                                    ${Number(b.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        onClick={() => handleViewDetails(b.id)}
                                                        className="h-7 w-7 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 rounded-lg"
                                                        title="Voir le détail de la facture"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>

            {/* Bill Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200 sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="border-b border-zinc-900 pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-zinc-100 flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-purple-400" />
                                    Détail de la Facture #{billDetails?.bill_number || '...'}
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400 text-xs mt-1">
                                    Aperçu complet des montants, articles et marges pour cette facture.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            <span className="text-xs text-zinc-400">Chargement des données...</span>
                        </div>
                    ) : billDetails ? (
                        <div className="space-y-6 pt-2">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl">
                                <div>
                                    <span className="text-zinc-500 block uppercase font-bold tracking-wider text-xxs">Titre de Facture</span>
                                    <span className="text-zinc-200 font-semibold">{billDetails.title}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block uppercase font-bold tracking-wider text-xxs">Date d'Émission</span>
                                    <span className="text-zinc-200 font-semibold">
                                        {format(new Date(billDetails.bill_date), 'dd MMMM yyyy', { locale: frCA })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block uppercase font-bold tracking-wider text-xxs">Lien Soumission</span>
                                    <span className="text-purple-400 font-semibold">
                                        Soumission #{billDetails.quotes?.quote_number || 'N/A'} - {billDetails.quotes?.title}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block uppercase font-bold tracking-wider text-xxs">Client</span>
                                    <span className="text-zinc-200 font-semibold">
                                        {billDetails.clients?.full_name} 
                                        {billDetails.clients?.company_name && ` (${billDetails.clients.company_name})`}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block uppercase font-bold tracking-wider text-xxs">Contracteur Référent</span>
                                    <span className="text-zinc-200 font-semibold flex items-center gap-1 mt-0.5">
                                        <HardHat className="h-3.5 w-3.5 text-emerald-400" />
                                        {billDetails.contractors?.full_name || 'Sans contracteur'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block uppercase font-bold tracking-wider text-xxs">Gestionnaire</span>
                                    <span className="text-zinc-200 font-semibold">
                                        {billDetails.quotes?.managers ? `${billDetails.quotes.managers.first_name} ${billDetails.quotes.managers.last_name}` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Description if present */}
                            {billDetails.description && (
                                <div className="space-y-1.5">
                                    <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Description de la Facture</h4>
                                    <p className="text-xs text-zinc-300 bg-zinc-900/20 border border-zinc-800/80 p-3 rounded-lg italic">
                                        {billDetails.description}
                                    </p>
                                </div>
                            )}

                            {/* Itemized Table */}
                            <div className="space-y-2">
                                <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Lignes d'Articles Facturés</h4>
                                <div className="rounded-lg border border-zinc-800 bg-transparent overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-zinc-900/30">
                                            <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                                                <TableHead className="text-zinc-400 font-bold text-xxs py-2">Article / Description</TableHead>
                                                <TableHead className="text-zinc-400 font-bold text-xxs py-2 text-right">Qté</TableHead>
                                                <TableHead className="text-zinc-400 font-bold text-xxs py-2 text-center">Unité</TableHead>
                                                <TableHead className="text-zinc-400 font-bold text-xxs py-2 text-right">Coût Unitaire</TableHead>
                                                <TableHead className="text-zinc-400 font-bold text-xxs py-2 text-right">Total HT</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="text-xs">
                                            {!billDetails.bill_items || billDetails.bill_items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-4 text-zinc-500 italic">
                                                        Aucun article de facture.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                billDetails.bill_items.map((item: any) => (
                                                    <TableRow key={item.id} className="border-b border-zinc-900 hover:bg-transparent">
                                                        <TableCell className="py-2.5">
                                                            <div className="font-medium text-zinc-200">{item.title}</div>
                                                            {item.description && (
                                                                <div className="text-xxs text-zinc-500 max-w-[250px] truncate">{item.description}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-zinc-300 py-2.5">{item.quantity}</TableCell>
                                                        <TableCell className="text-center text-zinc-400 py-2.5">{item.unit || '-'}</TableCell>
                                                        <TableCell className="text-right text-zinc-300 py-2.5">
                                                            ${Number(item.unit_cost || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right text-zinc-100 font-semibold py-2.5">
                                                            ${Number(item.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Financial Summary Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <h4 className="text-xxs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5 text-purple-400" />
                                        Notes Internes de Facture
                                    </h4>
                                    <div className="text-xs text-zinc-300 bg-zinc-900/30 border border-zinc-800 p-3.5 rounded-xl min-h-[110px]">
                                        {billDetails.notes ? (
                                            <p className="whitespace-pre-line">{billDetails.notes}</p>
                                        ) : (
                                            <span className="text-zinc-500 italic">Aucune note de facturation interne enregistrée.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Financial Calculations */}
                                <div className="space-y-3 bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl text-xs">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Total Travail Chantier</span>
                                        <span className="font-semibold text-zinc-200">
                                            ${Number(billDetails.subtotal || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Marge Admin. ({billDetails.admin_percentage ?? 10}%)</span>
                                        <span className="font-semibold text-zinc-200">
                                            ${Number(billDetails.admin_amount || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Marge Profit ({billDetails.profit_percentage ?? 15}%)</span>
                                        <span className="font-semibold text-zinc-200">
                                            ${Number(billDetails.profit_amount || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="border-t border-zinc-800 pt-2 flex justify-between font-semibold text-zinc-200 text-sm">
                                        <span>Sous-total (Hors Taxes)</span>
                                        <span>
                                            ${(Number(billDetails.subtotal || 0) + Number(billDetails.admin_amount || 0) + Number(billDetails.profit_amount || 0)).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-zinc-500 text-xxs pt-1">
                                        <span>Taxes (TPS {Number(billDetails.gst_amount || 0) > 0 ? '5%' : '0%'} + TVQ {Number(billDetails.qst_amount || 0) > 0 ? '9.975%' : '0%'})</span>
                                        <span>
                                            ${(Number(billDetails.gst_amount || 0) + Number(billDetails.qst_amount || 0)).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="border-t border-zinc-800 pt-3">
                                        <div className="bg-purple-950/20 border border-purple-900/40 p-3.5 rounded-xl flex justify-between items-center">
                                            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Total Facturé</span>
                                            <span className="text-xl font-extrabold text-zinc-100">
                                                ${Number(billDetails.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-rose-400 text-sm">
                            Erreur lors du chargement des détails de la facture.
                        </div>
                    )}

                    <DialogFooter className="bg-zinc-950 border-t border-zinc-900 pt-3 mt-4">
                        <DialogClose
                            render={
                                <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs" />
                            }
                        >
                            Fermer
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
