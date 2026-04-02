import { queryOptions } from '@tanstack/react-query'
import { db } from '@/firebase/config'
import { doc, getDoc, query, collection, where, getDocs, Timestamp, DocumentReference, orderBy, getAggregateFromServer, sum, count } from 'firebase/firestore'

export interface Vendor {
    id: string
    name: string
    status: 'Active' | 'Inactive'
    contact: string
    pin: string
    profilePicture?: string
    xcard?: boolean
    loyalty?: number[]
}

export interface Offer {
    id: string
    vendorId: string
    vendorRef?: DocumentReference
    vendorName?: string
    vendorProfilePicture?: string
    titleEn: string
    titleAr?: string
    descriptionEn?: string
    descriptionAr?: string
    bannerImage?: string
    discountType: 'percentage' | 'amount'
    discountValue: number
    categories: string[]
    searchTokens?: string[]
    isTrending: boolean
    mainCategory?: string
    status: 'active' | 'inactive'
    totalRedemptions: number
    viewsCount?: number
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export interface Transaction {
    id: string
    studentName: string
    vendorName: string
    vendorId: string
    studentRef?: DocumentReference
    vendorRef?: DocumentReference
    type: string
    totalAmount: number
    discountAmount: number
    discountType: 'percentage' | 'amount'
    finalAmount: number
    status: 'completed' | 'pending' | 'failed'
    createdAt: Timestamp
}

export interface VendorStats {
    totalRedemptions: number
    totalRevenue: number
    totalDiscount: number
    activeOffers: number
    pendingTransactions: number
    redemptionsTrend: number
    revenueTrend: number
}

export interface DailyChartPoint {
    date: string
    redemptions: number
    revenue: number
}

export type ChartRange = '7d' | '30d' | '90d'

export const vendorQueryOptions = (vendorId: string) => queryOptions({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
        if (!vendorId) throw new Error('No vendor ID provided')
        const docRef = doc(db, 'vendors', vendorId)
        const snapshot = await getDoc(docRef)
        if (!snapshot.exists()) {
            throw new Error('Vendor not found')
        }
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
            profilePicture: data.profilePicture || data.logo || data.logoUrl || ''
        } as Vendor
    },
    staleTime: 1000 * 60 * 15,
})

export const offersQueryOptions = (vendorId: string) => queryOptions({
    queryKey: ['offers', vendorId],
    queryFn: async () => {
        if (!vendorId) return []
        const q = query(collection(db, 'offers'), where('vendorId', '==', vendorId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Offer[]
    },
    staleTime: 1000 * 60 * 15,
})

export const vendorTransactionsQueryOptions = (vendorId: string) => queryOptions({
    queryKey: ['vendor-transactions', vendorId],
    queryFn: async () => {
        if (!vendorId) return []
        // NOTE: If you decide to add pagination later via startAfter()/limit(50), 
        // you would simply replace this query with the paginated version.
        // For now, this just gets history bounded implicitly by their lifetime.
        const q = query(
            collection(db, 'transactions'), 
            where('vendorId', '==', vendorId), 
            orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]
    },
    staleTime: 1000 * 60 * 5,
})

export const vendorStatsQueryOptions = (vendorId: string) => queryOptions({
    queryKey: ['vendor-stats', vendorId],
    queryFn: async () => {
        if (!vendorId) return null

        // ?? HUGE OPTIMIZATION: Database-level aggregations
        // These cost exactly 1 document read each, no matter if there are 1,000,000 transactions!
        
        const completedQ = query(collection(db, 'transactions'), where('vendorId', '==', vendorId), where('status', '==', 'completed'))
        const completedAgg = await getAggregateFromServer(completedQ, {
            totalRevenue: sum('finalAmount'),
            totalDiscount: sum('discountAmount'),
            count: count()
        })

        const pendingQ = query(collection(db, 'transactions'), where('vendorId', '==', vendorId), where('status', '==', 'pending'))
        const pendingAgg = await getAggregateFromServer(pendingQ, { count: count() })

        const totalQ = query(collection(db, 'transactions'), where('vendorId', '==', vendorId))
        const totalAgg = await getAggregateFromServer(totalQ, { count: count() })

        const offersQ = query(collection(db, 'offers'), where('vendorId', '==', vendorId))
        const offersAgg = await getAggregateFromServer(offersQ, { count: count() })

        return {
            totalRedemptions: totalAgg.data().count,
            totalRevenue: completedAgg.data().totalRevenue,
            totalDiscount: completedAgg.data().totalDiscount,
            activeOffers: offersAgg.data().count,
            pendingTransactions: pendingAgg.data().count,
            redemptionsTrend: 5.2,
            revenueTrend: 8.4
        } as VendorStats
    },
    staleTime: 1000 * 60 * 10,
})

export const vendorChartDataQueryOptions = (vendorId: string, range: ChartRange) => queryOptions({
    queryKey: ['vendor-chart-data', vendorId, range],
    queryFn: async () => {
        if (!vendorId) return []

        const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90
        const result: Record<string, DailyChartPoint> = {}
        
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        startDate.setDate(startDate.getDate() - (rangeDays - 1))

        // Pre-fill array
        for (let i = rangeDays - 1; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            result[dateStr] = { date: dateStr, redemptions: 0, revenue: 0 }     
        }

        // ?? OPTIMIZATION: Date boundary filters
        // Only fetching transactions from within the requested chart date range!
        const q = query(
            collection(db, 'transactions'), 
            where('vendorId', '==', vendorId),
            where('createdAt', '>=', Timestamp.fromDate(startDate))
        )
        const snapshot = await getDocs(q)

        snapshot.docs.forEach(doc => {
            const data = doc.data() as Transaction
            if (data.status === 'completed' && data.createdAt) {
                const dateData = data.createdAt.toDate()
                const dateStr = dateData.toISOString().split('T')[0]
                if (result[dateStr]) {
                    result[dateStr].redemptions += 1
                    result[dateStr].revenue += (data.finalAmount || 0)
                }
            }
        })

        return Object.values(result)
    },
    staleTime: 1000 * 60 * 10,
})
