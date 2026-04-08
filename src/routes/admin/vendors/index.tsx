import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/firebase/config'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

export const vendorsSearchSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    sort: z.enum(['name-asc', 'name-desc']).catch('name-asc'),
    xcard: z.enum(['all', 'enabled', 'disabled']).catch('all'),
})

export const Route = createFileRoute('/admin/vendors/')({
    validateSearch: (search) => vendorsSearchSchema.parse(search),
    loader: async ({ context: { queryClient } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['vendors-all'],
            queryFn: fetchAllVendors,
        })
    },
})

export interface Vendor {
    id: string
    name: string
    contact: string
    pin: string
    profilePicture?: string
    xcard: boolean
    mainCategory?: string
    subcategory?: string[]
    isTrending?: boolean
    offers?: any[]
}

export async function fetchAllVendors(): Promise<Vendor[]> {
    const collRef = collection(db, 'vendors')
    const q = query(collRef, orderBy('name'))
    const snapshot = await getDocs(q)

    const vendors = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()

        if (typeof data.xcard === 'undefined') {
            const { updateDoc } = await import('firebase/firestore')
            await updateDoc(docSnap.ref, { xcard: false })
            data.xcard = false
        }

        return {
            id: docSnap.id,
            name: data.name || 'Unnamed Vendor',
            contact: data.phoneNumber?.toString() || data.contact || '',
            pin: data.pin || '----',
            profilePicture: data.profilePicture || '',
            xcard: !!data.xcard,
            mainCategory: data.mainCategory,
            subcategory: data.subcategory,
            isTrending: data.isTrending,
            offers: data.offers || [],
        } as Vendor
    }))

    return vendors
}
