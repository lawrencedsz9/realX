import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { offersQueryOptions } from '@/queries'
import { useAuth } from '@/auth'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/(vendor-panel)/_vendor/campaign')({
  component: VendorCampaign,
})

function VendorCampaign() {
  const { user } = useAuth()
  const vendorId = user?.uid || ''

  const { data: offers, isLoading } = useQuery(offersQueryOptions(vendorId))

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Offers</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Create Offer
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers?.map((offer) => (
          <div key={offer.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {offer.bannerImage ? (
              <img src={offer.bannerImage} alt={offer.titleEn} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg">{offer.titleEn}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  offer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {offer.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{offer.descriptionEn}</p>
              <div className="pt-4 flex justify-between items-center text-sm">
                <span className="font-medium text-blue-600">
                  {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `$${offer.discountValue} OFF`}
                </span>
                <span className="text-gray-500">{offer.totalRedemptions || 0} redemptions</span>
              </div>
            </div>
          </div>
        ))}
        {(!offers || offers.length === 0) && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No campaigns found. Create your first offer to get started.
          </div>
        )}
      </div>
    </div>
  )
}
