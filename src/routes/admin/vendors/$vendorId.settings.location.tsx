import { createFileRoute } from '@tanstack/react-router'
import { LocationsList } from '@/components/admin/vendors/LocationsList'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/firebase/config'
import { doc, updateDoc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { refreshVendorList } from '@/lib/vendorList'
import { vendorQueryOptions, type Vendor, type VendorLocation } from '@/queries'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings/location')({
    component: LocationSettingsComponent,
    loader: async ({ context: { queryClient }, params: { vendorId } }) => {
        await queryClient.ensureQueryData(vendorQueryOptions(vendorId))
    },
})

function LocationSettingsComponent() {
    const { vendorId } = Route.useParams()
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<Vendor | null>(null)

    const { data: vendor, isLoading } = useQuery(vendorQueryOptions(vendorId))

    useEffect(() => {
        if (vendor) {
            // Migrate legacy flat fields into locations array on load
           
            if (
                (!vendor.locations || vendor.locations.length === 0) &&
                typeof vendor.latitude === 'number' &&
                typeof vendor.longitude === 'number'
            ) {
                setFormData({
                    ...vendor,
                    locations: [
                        {
                            latitude: vendor.latitude,
                            longitude: vendor.longitude,
                            geohash: vendor.geohash,
                            address: vendor.address,
                            addressAr: vendor.addressAr,
                            label: 'Main Branch',
                            isDefault: true,
                        },
                    ],
                })
            } else {
                setFormData(vendor)
            }
        }
    }, [vendor])

    const updateMutation = useMutation({
        mutationFn: async (locations: VendorLocation[]) => {
            const vendorRef = doc(db, 'vendors', vendorId)
            // Only write the locations array — never overwrite unrelated vendor fields
            await updateDoc(vendorRef, { locations })
        },
        onMutate: async (locations) => {
            await queryClient.cancelQueries({ queryKey: ['vendor', vendorId] })
            const previousVendor = queryClient.getQueryData(['vendor', vendorId])
            queryClient.setQueryData(['vendor', vendorId], (old: Vendor | undefined) => {
                if (!old) return old
                return { ...old, locations }
            })
            return { previousVendor }
        },
        onSuccess: async () => {
            await refreshVendorList()
            await queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
            toast.success('Locations updated successfully!', {
                description: `Vendor locations have been saved and the map cache has been updated.`,
                duration: 3000,
            })
        },
        onError: (error, _variables, context) => {
            if (context?.previousVendor) {
                queryClient.setQueryData(['vendor', vendorId], context.previousVendor)
            }
            toast.error('Failed to update locations', {
                description: error instanceof Error ? error.message : 'An unknown error occurred',
            })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
        },
    })

    const handleSave = () => {
        if (!formData) return

        const locations = formData.locations ?? []

        // Validate: every location must have valid coordinates
        const invalid = locations.some(
            (loc) =>
                typeof loc.latitude !== 'number' ||
                isNaN(loc.latitude) ||
                loc.latitude === 0 ||
                typeof loc.longitude !== 'number' ||
                isNaN(loc.longitude) ||
                loc.longitude === 0
        )

        if (invalid) {
            toast.error('Invalid coordinates', {
                description: 'All locations must have valid latitude and longitude values.',
            })
            return
        }

        // Ensure exactly one default location is set
        const hasDefault = locations.some((loc) => loc.isDefault)
        if (locations.length > 0 && !hasDefault) {
            // Auto-assign first location as default
            const fixed = locations.map((loc, i) => ({ ...loc, isDefault: i === 0 }))
            setFormData({ ...formData, locations: fixed })
            updateMutation.mutate(fixed)
            return
        }

        updateMutation.mutate(locations)
    }

    const handleReset = () => {
        if (!vendor) return
        // Reset respects the same migration logic as the initial load
        if (
            (!vendor.locations || vendor.locations.length === 0) &&
            typeof vendor.latitude === 'number' &&
            typeof vendor.longitude === 'number'
        ) {
            setFormData({
                ...vendor,
                locations: [
                    {
                        latitude: vendor.latitude,
                        longitude: vendor.longitude,
                        geohash: vendor.geohash,
                        address: vendor.address,
                        addressAr: vendor.addressAr,
                        label: 'Main Branch',
                        isDefault: true,
                    },
                ],
            })
        } else {
            setFormData(vendor)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
            </div>
        )
    }

    if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found</div>

    return (
        <div className="space-y-6 pt-6">
            {formData?.locations && (
                <LocationsList
                    locations={formData.locations}
                    onChange={(locations) => setFormData({ ...formData, locations })}
                />
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={handleReset}>
                    Reset Changes
                </Button>
                <Button
                    className="bg-brand-green hover:bg-brand-green/90 text-white gap-2"
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
                            Save Locations
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}