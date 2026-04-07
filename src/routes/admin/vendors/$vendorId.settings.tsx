import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

export interface Vendor {
    id: string
    name?: string
    nameAr?: string
    email?: string
    phoneNumber?: string
    website?: string
    isFeatured?: boolean
    tagsEn?: string[]
    tagsAr?: string[]
    profilePicture?: string
    coverImage?: string
    pin?: string
    xcard?: boolean
    loyalty?: number[]
}

export const Route = createFileRoute('/admin/vendors/$vendorId/settings')({
    component: VendorSettingsLayout,
    loader: async ({ context: { queryClient }, params: { vendorId } }) => {
        await queryClient.ensureQueryData({
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
    },
})

function VendorSettingsLayout() {
    const { vendorId } = Route.useParams()
    const location = useLocation()

    const { data: vendor } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: async () => {
            const docRef = doc(db, 'vendors', vendorId)
            const snapshot = await getDoc(docRef)
            if (!snapshot.exists()) {
                throw new Error('Vendor not found')
            }
            return { id: snapshot.id, ...snapshot.data() } as Vendor
        }
    })

    return (
        <div className="p-8 space-y-6 w-full max-w-[1200px] mx-auto">
            <div className="flex items-center gap-4">
                <Link
                    to="/admin/vendors"
                    search={{ page: 1, pageSize: 10 }}
                    className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <span className="text-slate-400 font-medium">{vendor?.name || 'Vendor'}</span>
                    </h1>
                </div>
            </div>

            <div className="w-full border-b">
                <div className="flex w-full max-w-md bg-muted/50 p-1 rounded-lg gap-1">
                    <Link
                        to="/admin/vendors/$vendorId/settings/branding"
                        params={{ vendorId }}
                        className={`flex-1 flex items-center justify-center h-10 rounded-md text-sm font-medium transition-all ${location.pathname.endsWith('branding')
                            ? 'bg-white text-black shadow-sm'
                            : 'text-muted-foreground hover:text-black hover:bg-white/50'
                            }`}
                    >
                        Branding
                    </Link>
                    <Link
                        to="/admin/vendors/$vendorId/settings/offers"
                        params={{ vendorId }}
                        className={`flex-1 flex items-center justify-center h-10 rounded-md text-sm font-medium transition-all ${location.pathname.endsWith('offers')
                            ? 'bg-white text-black shadow-sm'
                            : 'text-muted-foreground hover:text-black hover:bg-white/50'
                            }`}
                    >
                        Offers
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    )
}
