import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/firebase/config'
import {
    collection, getDocs, query, limit, orderBy, where,
    getCountFromServer, startAfter,
    type QueryConstraint,
} from 'firebase/firestore'
import { formatTimestamp } from '@/lib/format-timestamp'

const transactionsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
    vendorName: z.string().optional().catch(undefined),
    sort: z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc', 'vendor_asc', 'vendor_desc']).optional().catch(undefined),
})

export type TransactionSearch = z.infer<typeof transactionsSearchSchema>

export const Route = createFileRoute('/admin/transactions/')({
    validateSearch: (search) => transactionsSearchSchema.parse(search),
    loaderDeps: ({ search: { page, pageSize, vendorName, sort } }) => ({ page, pageSize, vendorName, sort }),
    loader: async ({ context: { queryClient }, deps: { page, pageSize, vendorName, sort } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['transactions-list', page, pageSize, vendorName, sort],
            queryFn: () => fetchTransactions(page, pageSize, vendorName, sort),
        })
    },
})

export interface Transaction {
    id: string
    date: string
    rawDate?: string | null
    transactionId: string
    vendorName: string
    totalAmountNum?: number
    totalAmount: string
    type: string
    cashbackAmount?: number
    creatorCashbackAmount?: number
    creatorCode?: string | null
    creatorCodeOwnerId?: string | null
    creatorUid?: string | null
    discountAmount?: number
    discountType?: string
    discountValue?: number
    finalAmount?: number
    offerId?: string
    pin?: string
    userId?: string
    vendorId?: string
    redemptionCardAmount?: number
    remainingAmount?: number
}

type SortOption = 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc' | 'vendor_asc' | 'vendor_desc'

function getOrderBy(sort?: SortOption): { field: string; dir: 'asc' | 'desc' } {
    switch (sort) {
        case 'date_asc': return { field: 'createdAt', dir: 'asc' }
        case 'amount_asc': return { field: 'totalAmount', dir: 'asc' }
        case 'amount_desc': return { field: 'totalAmount', dir: 'desc' }
        case 'vendor_asc': return { field: 'vendorName', dir: 'asc' }
        case 'vendor_desc': return { field: 'vendorName', dir: 'desc' }
        default: return { field: 'createdAt', dir: 'desc' }
    }
}

export async function fetchTransactions(page: number, pageSize: number, vendorName?: string, sort?: SortOption) {
    const collRef = collection(db, 'transactions')
    const { field, dir } = getOrderBy(sort)

    // Build base constraints
    const baseConstraints: QueryConstraint[] = [orderBy(field, dir)]
    if (vendorName) {
        baseConstraints.push(where('vendorName', '==', vendorName))
    }

    // Get total count (1 read via aggregation)
    const countConstraints: QueryConstraint[] = []
    if (vendorName) countConstraints.push(where('vendorName', '==', vendorName))
    const countSnap = await getCountFromServer(query(collRef, ...countConstraints))
    const totalCount = countSnap.data().count

    // Cursor-based pagination
    if (page > 1) {
        // Fetch docs up to the end of previous page to get the cursor
        const cursorConstraints = [...baseConstraints, limit((page - 1) * pageSize)]
        const cursorSnap = await getDocs(query(collRef, ...cursorConstraints))
        if (cursorSnap.docs.length > 0) {
            const lastDoc = cursorSnap.docs[cursorSnap.docs.length - 1]
            baseConstraints.push(startAfter(lastDoc))
        }
    }

    baseConstraints.push(limit(pageSize))
    const snapshot = await getDocs(query(collRef, ...baseConstraints))

    const transactions = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        const dateValue = formatTimestamp(data.createdAt)

        return {
            id: docSnap.id,
            ...data,
            date: dateValue.toLocaleString() || 'Unknown Date',
            rawDate: dateValue.toISOString(),
            transactionId: data.pin || docSnap.id,
            vendorName: data.vendorName || 'Unknown Vendor',
            totalAmount: data.totalAmount ? `QAR ${data.totalAmount}` : 'QAR 0',
            totalAmountNum: data.totalAmount || 0,
            type: data.type || 'N/A',
        } as Transaction
    })

    return { transactions, totalCount }
}
