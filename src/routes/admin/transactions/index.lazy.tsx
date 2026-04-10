import { createLazyFileRoute, Link, useSearch, useNavigate } from '@tanstack/react-router'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Search, Upload, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTransactions, type Transaction, type TransactionSearch } from './index'
import { Badge } from '@/components/ui/badge'
import { db } from '@/firebase/config'
import { deleteDoc, doc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useState } from 'react'
import { STALE_TIME } from '@/lib/constants'

export const Route = createLazyFileRoute('/admin/transactions/')({
    component: RouteComponent,
})

type SortOption = 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc' | 'vendor_asc' | 'vendor_desc'

function SortIcon({ field }: { field: 'date' | 'amount' | 'vendor' }) {
    const { sort } = useSearch({ from: '/admin/transactions/' })

    if (!sort || !sort.startsWith(field)) {
        return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
    }
    if (sort.endsWith('asc')) {
        return <ArrowUp className="h-3.5 w-3.5 ml-1 text-blue-500" />
    }
    return <ArrowDown className="h-3.5 w-3.5 ml-1 text-blue-500" />
}

function RouteComponent() {
    const { page, pageSize, vendorName, sort } = useSearch({ from: '/admin/transactions/' })
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)

    const { data, isLoading: isQueryLoading } = useQuery({
        queryKey: ['transactions-list', page, pageSize, vendorName, sort],
        queryFn: () => fetchTransactions(page, pageSize, vendorName, sort),
        staleTime: STALE_TIME.MEDIUM,
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, 'transactions', id))
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions-list'] })
            toast.success('Transaction deleted')
            setDeleteConfirmOpen(false)
            setTxToDelete(null)
        },
        onError: () => {
            toast.error('Failed to delete transaction')
        },
    })

    const transactionList = data?.transactions || []
    const totalTransactions = data?.totalCount || 0
    const loading = isQueryLoading

    const hasNextPage = page * pageSize < totalTransactions
    const hasPrevPage = page > 1

    const updateSearch = (updates: Partial<TransactionSearch>) => {
        navigate({
            to: '/admin/transactions',
            search: { page: 1, pageSize, vendorName, sort, ...updates },
        })
    }

    const toggleSort = (field: 'date' | 'amount' | 'vendor') => {
        const currentSort = sort as SortOption | undefined
        let newSort: SortOption
        if (!currentSort || !currentSort.startsWith(field)) {
            newSort = `${field}_desc` as SortOption
        } else if (currentSort.endsWith('desc')) {
            newSort = `${field}_asc` as SortOption
        } else {
            newSort = `${field}_desc` as SortOption
        }
        updateSearch({ sort: newSort })
    }

    return (
        <div className="p-8 space-y-6 w-full max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center p-1 rounded bg-blue-50">
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-blue-500"
                    >
                        <path
                            d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                            fill="currentColor"
                            fillOpacity={0.1}
                        />
                        <path
                            d="M7 12H17M17 12L13 8M17 12L13 16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" fill="#EF4444" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by vendor name..."
                        className="pl-9 bg-muted/50 border-none h-10"
                        value={vendorName || ''}
                        onChange={(e) => updateSearch({ vendorName: e.target.value || undefined })}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 h-10">
                        Export <Upload className="h-4 w-4" />
                    </Button>
                    <Select
                        value={sort || 'date_desc'}
                        onValueChange={(val) => updateSearch({ sort: val as SortOption })}
                    >
                        <SelectTrigger className="w-[200px] h-10 bg-muted/50 border-none">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date_desc">Date: Newest First</SelectItem>
                            <SelectItem value="date_asc">Date: Oldest First</SelectItem>
                            <SelectItem value="amount_desc">Amount: High to Low</SelectItem>
                            <SelectItem value="amount_asc">Amount: Low to High</SelectItem>
                            <SelectItem value="vendor_asc">Vendor: A-Z</SelectItem>
                            <SelectItem value="vendor_desc">Vendor: Z-A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-12">
                                <Checkbox />
                            </TableHead>
                            <TableHead
                                className="text-black font-bold text-base cursor-pointer select-none"
                                onClick={() => toggleSort('date')}
                            >
                                <span className="inline-flex items-center">
                                    Date <SortIcon field="date" />
                                </span>
                            </TableHead>
                            <TableHead className="text-black font-bold text-base">Type/Offer</TableHead>
                            <TableHead className="text-black font-bold text-base">User</TableHead>
                            <TableHead
                                className="text-black font-bold text-base cursor-pointer select-none"
                                onClick={() => toggleSort('vendor')}
                            >
                                <span className="inline-flex items-center">
                                    Vendor <SortIcon field="vendor" />
                                </span>
                            </TableHead>
                            <TableHead
                                className="text-black font-bold text-base text-right cursor-pointer select-none"
                                onClick={() => toggleSort('amount')}
                            >
                                <span className="inline-flex items-center justify-end">
                                    Amount <SortIcon field="amount" />
                                </span>
                            </TableHead>
                            <TableHead className="text-black font-bold text-base text-right">Rewards/Benefits</TableHead>
                            <TableHead className="text-black font-bold text-base text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading transactions...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : transactionList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactionList.map((tx: Transaction) => (
                                <TableRow
                                    key={tx.id}
                                    className="h-20 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                                    onClick={() => navigate({ to: '/admin/transactions/$id', params: { id: tx.id } })}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            <span className="whitespace-nowrap">{tx.date}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">
                                                ID: {tx.transactionId || tx.id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge
                                                variant={(tx.type === 'offer_redemption' || tx.type === 'offer') ? 'default' : 'secondary'}
                                                className={(tx.type === 'offer_redemption' || tx.type === 'offer') ? 'bg-brand-green hover:bg-brand-green/90 w-fit' : 'bg-blue-500 hover:bg-blue-500/90 w-fit'}
                                            >
                                                {tx.type.replace(/_/g, ' ')}
                                            </Badge>
                                            {tx.offerId && (
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    ID: {tx.offerId.slice(0, 8)}...
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {tx.userId ? (
                                                <Link
                                                    to="/admin/students/$studentId/settings"
                                                    params={{ studentId: tx.userId }}
                                                    search={{ page: 1, pageSize: 10 }}
                                                    className="text-sm font-bold text-blue-600 hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {tx.userId.slice(0, 8)}...
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-medium text-gray-500">N/A</span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter mt-0.5">User ID</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            {tx.vendorId ? (
                                                <Link
                                                    to="/admin/vendors/$vendorId/settings"
                                                    params={{ vendorId: tx.vendorId }}
                                                    search={{ page: 1, pageSize: 10 }}
                                                    className="text-blue-600 font-bold hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {tx.vendorName}
                                                </Link>
                                            ) : (
                                                <span>{tx.vendorName}</span>
                                            )}
                                            {tx.vendorId && (
                                                <span className="text-[10px] text-muted-foreground font-mono tracking-tighter">
                                                    ID: {tx.vendorId.slice(0, 8)}...
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-gray-900">
                                                {tx.finalAmount !== undefined ? `QAR ${tx.finalAmount}` : tx.totalAmount}
                                            </span>
                                            {tx.finalAmount !== undefined && tx.totalAmount && parseInt(tx.totalAmount.replace(/[^\d.]/g, '')) !== tx.finalAmount && (
                                                <span className="text-[10px] text-muted-foreground line-through">
                                                    {tx.totalAmount}
                                                </span>
                                            )}
                                            {tx.discountAmount !== undefined && tx.discountAmount > 0 && (
                                                <span className="text-[10px] text-red-500 font-medium">
                                                    -QAR {tx.discountAmount} {tx.discountType === 'percentage' ? `(${tx.discountValue}%)` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {tx.cashbackAmount !== undefined && tx.cashbackAmount > 0 && (
                                                <span className="font-bold text-green-600 text-sm">
                                                    +QAR {tx.cashbackAmount}
                                                </span>
                                            )}
                                            {tx.redemptionCardAmount !== undefined && tx.redemptionCardAmount > 0 && (
                                                <>
                                                    <span className="font-bold text-blue-600">
                                                        -QAR {tx.redemptionCardAmount}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Rem: QAR {tx.remainingAmount}
                                                    </span>
                                                </>
                                            )}
                                            {tx.creatorCashbackAmount !== undefined && tx.creatorCashbackAmount > 0 && (
                                                <span className="text-[10px] text-amber-600 font-medium font-mono">
                                                    Creator: +{tx.creatorCashbackAmount}
                                                </span>
                                            )}
                                            {tx.creatorCode && (
                                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
                                                    {tx.creatorCode}
                                                </span>
                                            )}
                                            {!tx.cashbackAmount && !tx.redemptionCardAmount && !tx.creatorCode && (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate({ to: '/admin/transactions/$id', params: { id: tx.id } })}
                                                className="hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Details
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setTxToDelete(tx)
                                                    setDeleteConfirmOpen(true)
                                                }}
                                                className="hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Transaction</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete transaction <strong>{txToDelete?.transactionId || txToDelete?.id?.slice(0, 8)}</strong> from <strong>{txToDelete?.vendorName}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => txToDelete && deleteMutation.mutate(txToDelete.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : 'Delete Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        from="/admin/transactions/"
                        search={(prev: TransactionSearch) => ({
                            ...prev,
                            page: Math.max(1, page - 1),
                        })}
                        disabled={!hasPrevPage}
                        className={!hasPrevPage ? 'pointer-events-none opacity-50' : ''}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-auto px-4 gap-2 text-sm font-medium"
                            disabled={!hasPrevPage}
                        >
                            ‹ Previous
                        </Button>
                    </Link>

                    <div className="text-sm font-medium text-muted-foreground">
                        Page {page}
                    </div>

                    <Link
                        from="/admin/transactions/"
                        search={(prev: TransactionSearch) => ({
                            ...prev,
                            page: page + 1,
                        })}
                        disabled={!hasNextPage}
                        className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-auto px-4 gap-2 text-sm font-medium"
                            disabled={!hasNextPage}
                        >
                            Next ›
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
