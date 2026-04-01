import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/cms/')({
    component: CMSIndex,
})

const CMS_ITEMS = [
    {
        title: 'Banner Management',
        icon: '🖼️',
        href: '/admin/cms/banners' as const,
    },
    {
        title: 'Categories & Sorting',
        icon: '📁',
        href: '/admin/cms/categories' as const,
    },
    {
        title: 'Top Brands',
        icon: '🏷️',
        href: '/admin/cms/brands' as const,
    },
    {
        title: 'Trending Offers',
        icon: '🔥',
        href: '/admin/cms/trending-offers' as const,
    },
    {
        title: 'Universities Management',
        icon: '🎓',
        href: '/admin/cms/universities' as const,
    }
]

function CMSIndex() {
    return (
        <div className="p-8 space-y-12 w-full max-w-4xl">
            <div className="flex items-center gap-3">
                <span className="text-3xl">🗳️</span>
                <h1 className="text-3xl font-bold tracking-tight">App CMS</h1>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Navigation Menu / Tabs:</h2>

                <div className="space-y-3">
                    {CMS_ITEMS.map((item) => (
                        <div
                            key={item.href}
                            className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-xl">{item.icon}</span>
                                <span className="text-lg font-bold text-gray-900">{item.title}</span>
                            </div>

                            <Link to={item.href}>
                                <Button
                                    className="bg-[#7F7F7F] hover:bg-[#6F6F6F] text-white rounded-full px-6 h-10 gap-1 font-bold text-sm"
                                >
                                    Manage <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
