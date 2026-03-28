import { createFileRoute } from '@tanstack/react-router'
import { OffersSettings } from '@/components/admin/vendors/OffersSettings'
import { useSuspenseQuery } from '@tanstack/react-query'
import { offersQueryOptions, vendorQueryOptions } from '@/queries'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings/offers')({
    component: OffersSettingsComponent,
    loader: async ({ context: { queryClient }, params: { vendorId } }) => {
        await Promise.all([
            queryClient.ensureQueryData(vendorQueryOptions(vendorId)),
            queryClient.ensureQueryData(offersQueryOptions(vendorId))
        ])
    },
})

function OffersSettingsComponent() {
    const { vendorId } = Route.useParams()

    // We can use useSuspenseQuery since we ensured data in loader
    const { data: vendor } = useSuspenseQuery(vendorQueryOptions(vendorId))

    return (
        <div className="pt-6">
            <OffersSettings
                vendorId={vendorId}
                vendorName={vendor?.name || ''}
                vendorProfilePicture={vendor?.profilePicture || ''}
                vendorXCard={vendor?.xcard || false}
            />
        </div>
    )
}
