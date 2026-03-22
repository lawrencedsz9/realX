import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/firebase/config'
import { collection, getDocs, query, limit, orderBy, getCountFromServer } from 'firebase/firestore'

const vendorsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
})

export const Route = createFileRoute('/admin/vendors/')({
    validateSearch: (search) => vendorsSearchSchema.parse(search),
    loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
    loader: async ({ context: { queryClient }, deps: { page, pageSize } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['vendors-list', page, pageSize],
            queryFn: () => fetchVendors(page, pageSize),
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
}

export async function fetchVendors(page: number, pageSize: number) {
    console.log(`Loading page ${page}...`)
    const collRef = collection(db, 'vendors')

    const countSnapshot = await getCountFromServer(collRef)
    const totalCount = countSnapshot.data().count

    const q = query(
        collRef,
        orderBy('name'),
        limit(page * pageSize)
    )

    const snapshot = await getDocs(q)
    const pageDocs = snapshot.docs.slice((page - 1) * pageSize, page * pageSize);

    const vendors = await Promise.all(pageDocs.map(async (docSnap) => {
        const data = docSnap.data()
        const vendorId = docSnap.id

        if (typeof data.xcard === 'undefined') {
            const { updateDoc } = await import('firebase/firestore')
            await updateDoc(docSnap.ref, { xcard: false })
            data.xcard = false
        }

        return {
            id: vendorId,
            name: data.name || 'Unnamed Vendor',
            contact: data.phoneNumber?.toString() || data.contact || '',
            pin: data.pin || '----',
            profilePicture: data.profilePicture || '',
            xcard: !!data.xcard,
        } as Vendor
    }))

    return { vendors, totalCount }
}
