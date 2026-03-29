import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/firebase/config'
import { collection, getDocs, query, limit, orderBy, getCountFromServer } from 'firebase/firestore'

const transactionsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
})

export const Route = createFileRoute('/admin/transactions/')({
    validateSearch: (search) => transactionsSearchSchema.parse(search),
    loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
    loader: async ({ context: { queryClient }, deps: { page, pageSize } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['transactions-list', page, pageSize],
            queryFn: () => fetchTransactions(page, pageSize),
        })
    },
})

export interface Transaction {
    id: string
    date: string
    transactionId: string
    vendorName: string
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

export async function fetchTransactions(page: number, pageSize: number) {
    console.log(`Loading page ${page}...`)
    const collRef = collection(db, 'transactions')

    const countSnapshot = await getCountFromServer(collRef)
    const totalCount = countSnapshot.data().count

    const q = query(
        collRef,
        orderBy('createdAt', 'desc'),
        limit(page * pageSize)
    )

    const snapshot = await getDocs(q)
    const pageDocs = snapshot.docs.slice((page - 1) * pageSize, page * pageSize);

    const transactions = await Promise.all(pageDocs.map(async (docSnap) => {
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
            transactionId: data.pin || id,
            vendorName: data.vendorName || 'Unknown Vendor',
            totalAmount: data.totalAmount ? `QAR ${data.totalAmount}` : 'QAR 0',
            type: data.type || 'N/A',
        } as Transaction
    }))

    return { transactions, totalCount }
}
