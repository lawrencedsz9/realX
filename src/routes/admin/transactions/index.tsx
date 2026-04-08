import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/firebase/config'
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore'

const transactionsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
    vendorName: z.string().optional().catch(undefined),
    sort: z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc', 'vendor_asc', 'vendor_desc']).optional().catch(undefined),
})

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

export async function fetchTransactions(page: number, pageSize: number, vendorName?: string, sort?: SortOption) {
    console.log(`Loading page ${page}...`)
    const collRef = collection(db, 'transactions')

    // Always fetch more than needed to allow client-side filtering
    const fetchLimit = vendorName ? Math.min(pageSize * 10, 500) : page * pageSize
    const q = query(
        collRef,
        orderBy('createdAt', 'desc'),
        limit(fetchLimit)
    )

    const snapshot = await getDocs(q)

    let allDocs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        const id = docSnap.id

        let formattedDate = ''
        if (data.createdAt) {
            if (typeof data.createdAt === 'string') {
                formattedDate = new Date(data.createdAt).toLocaleString()
            } else if (data.createdAt.toDate) {
                formattedDate = data.createdAt.toDate().toLocaleString()
            }
        }

        return {
            id,
            ...data,
            date: formattedDate || 'Unknown Date',
            rawDate: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
            transactionId: data.pin || id,
            vendorName: data.vendorName || 'Unknown Vendor',
            totalAmount: data.totalAmount ? `QAR ${data.totalAmount}` : 'QAR 0',
            totalAmountNum: data.totalAmount || 0,
            type: data.type || 'N/A',
        } as Transaction
    })

    // Filter by vendor name
    if (vendorName) {
        const lowerFilter = vendorName.toLowerCase()
        allDocs = allDocs.filter(tx => tx.vendorName.toLowerCase().includes(lowerFilter))
    }

    // Sort
    if (sort) {
        const sorted = [...allDocs]
        switch (sort) {
            case 'date_asc':
                sorted.sort((a, b) => (a.rawDate || '').localeCompare(b.rawDate || ''))
                break
            case 'date_desc':
                sorted.sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''))
                break
            case 'amount_asc':
                sorted.sort((a, b) => (a.totalAmountNum || 0) - (b.totalAmountNum || 0))
                break
            case 'amount_desc':
                sorted.sort((a, b) => (b.totalAmountNum || 0) - (a.totalAmountNum || 0))
                break
            case 'vendor_asc':
                sorted.sort((a, b) => a.vendorName.localeCompare(b.vendorName))
                break
            case 'vendor_desc':
                sorted.sort((a, b) => b.vendorName.localeCompare(a.vendorName))
                break
        }
        allDocs = sorted
    }

    const filteredCount = allDocs.length
    const pageDocs = allDocs.slice((page - 1) * pageSize, page * pageSize)

    return { transactions: pageDocs, totalCount: filteredCount }
}
