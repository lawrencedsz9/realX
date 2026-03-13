import { queryOptions } from '@tanstack/react-query'
import { db } from '@/firebase/config'
import { doc, getDoc, query, collection, where, getDocs, Timestamp, DocumentReference } from 'firebase/firestore'

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
    isTrending: boolean
    isTopRated: boolean
    mainCategory?: string
    status: 'active' | 'inactive'
    startAt?: Timestamp
    endAt?: Timestamp
    totalRedemptions: number
    viewsCount?: number
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export const vendorQueryOptions = (vendorId: string) => queryOptions({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
        const docRef = doc(db, 'vendors', vendorId)
        const snapshot = await getDoc(docRef)
        if (!snapshot.exists()) {
            throw new Error('Vendor not found')
        }
        return { id: snapshot.id, ...snapshot.data() } as Vendor
    },
})

export const offersQueryOptions = (vendorId: string) => queryOptions({
    queryKey: ['offers', vendorId],
    queryFn: async () => {
        if (!vendorId) return []
        const q = query(
            collection(db, 'offers'),
            where('vendorId', '==', vendorId)
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Offer[]
    },
})
