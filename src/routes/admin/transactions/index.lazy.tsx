import { createLazyFileRoute, Link, useSearch } from '@tanstack/react-router'
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
import { Search, Upload } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, type Transaction } from './index'

export const Route = createLazyFileRoute('/admin/transactions/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { page, pageSize } = useSearch({ from: '/admin/transactions/' })

    const { data, isLoading: isQueryLoading } = useQuery({
        queryKey: ['transactions-list', page, pageSize],
        queryFn: () => fetchTransactions(page, pageSize),
        staleTime: 1000 * 60 * 5,
    })

    const transactionList = data?.transactions || []
    const totalTransactions = data?.totalCount || 0
    const loading = isQueryLoading

    // Simplified Pagination logic
    const hasNextPage = page * pageSize < totalTransactions
    const hasPrevPage = page > 1

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
                            fillOpacity="0.1"
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
                        placeholder="Search for transactions"
                        className="pl-9 bg-muted/50 border-none h-10"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 h-10">
                        Export <Upload className="h-4 w-4" />
                    </Button>
                    <Select defaultValue="all-time">
                        <SelectTrigger className="w-[200px] h-10 bg-muted/50 border-none">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-time">Date Range: All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
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
                            <TableHead className="text-black font-bold text-base">Date</TableHead>
                            <TableHead className="text-black font-bold text-base">Transaction ID</TableHead>
                            <TableHead className="text-black font-bold text-base">Vendor Name</TableHead>
                            <TableHead className="text-black font-bold text-base text-right pr-8">Total Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#18B852] border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading transactions...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : transactionList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactionList.map((tx: Transaction) => (
                                <TableRow key={tx.id} className="h-16 border-b border-gray-100 hover:bg-gray-50/50">
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">{tx.date}</TableCell>
                                    <TableCell className="font-medium text-gray-900">{tx.transactionId}</TableCell>
                                    <TableCell className="font-medium text-gray-900">{tx.vendorName}</TableCell>
                                    <TableCell className="text-right font-bold text-gray-900 pr-8">{tx.totalAmount}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Simple Pagination */}
            {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        from="/admin/transactions"
                        search={(prev) => ({
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
                        from="/admin/transactions"
                        search={(prev) => ({
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
