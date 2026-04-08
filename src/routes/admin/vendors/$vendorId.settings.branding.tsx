import { createFileRoute } from '@tanstack/react-router'
import { BrandingSettings } from '@/components/admin/vendors/BrandingSettings'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { refreshVendorList } from '@/lib/vendorList'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings/branding')({
    component: BrandingSettingsComponent,
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

interface Vendor {
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
    mainCategory?: string
    subcategory?: string[]
    isTrending?: boolean
    shortDescription?: string
    shortDescriptionAr?: string
    offers?: any[]
}

function BrandingSettingsComponent() {
    const { vendorId } = Route.useParams()
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<Vendor | null>(null)

    const { data: vendor, isLoading } = useQuery({
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

    useEffect(() => {
        if (vendor) {
            setFormData(vendor)
        }
    }, [vendor])

    const updateMutation = useMutation({
        mutationFn: async (updatedData: Partial<Vendor>) => {
            const { id, ...dataToUpdate } = updatedData
            const vendorRef = doc(db, 'vendors', vendorId)
            await updateDoc(vendorRef, dataToUpdate)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
            refreshVendorList()
            toast.success('Settings updated successfully!', {
                description: 'The vendor information has been synchronized with the database.',
                duration: 3000,
            })
        },
        onError: (error) => {
            toast.error('Failed to update settings', {
                description: error instanceof Error ? error.message : 'An unknown error occurred',
            })
        }
    })

    const handleSave = () => {
        if (formData) {
            updateMutation.mutate(formData)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#18B852] border-t-transparent" />
            </div>
        )
    }

    if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found</div>

    return (
        <div className="space-y-6 pt-6">
            {formData && (
                <BrandingSettings formData={formData} setFormData={setFormData} vendorId={vendorId} />
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setFormData(vendor)}>Reset Changes</Button>
                <Button
                    className="bg-[#18B852] hover:bg-[#18B852] text-white gap-2"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
