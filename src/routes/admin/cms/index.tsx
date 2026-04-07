import { createFileRoute, Link } from '@tanstack/react-router'
import {
    ChevronRight,
    Image,
    FolderOpen,
    Tag,
    Flame,
    GraduationCap
} from 'lucide-react'

export const Route = createFileRoute('/admin/cms/')({
    component: CMSIndex,
})

const CMS_ITEMS = [
    {
        title: 'Banner Management',
        description: 'Manage promotional banners across the app',
        icon: Image,
        color: 'bg-violet-100 text-violet-600',
        hoverBorder: 'hover:border-violet-200',
        href: '/admin/cms/banners' as const,
    },
    {
        title: 'Categories & Sorting',
        description: 'Organize categories and their subcategories',
        icon: FolderOpen,
        color: 'bg-blue-100 text-blue-600',
        hoverBorder: 'hover:border-blue-200',
        href: '/admin/cms/categories' as const,
    },
    {
        title: 'Top Brands',
        description: 'Curate featured brand logos and ordering',
        icon: Tag,
        color: 'bg-emerald-100 text-emerald-600',
        hoverBorder: 'hover:border-emerald-200',
        href: '/admin/cms/brands' as const,
    },
    {
        title: 'Trending Offers',
        description: 'Arrange trending vendor display order',
        icon: Flame,
        color: 'bg-orange-100 text-orange-600',
        hoverBorder: 'hover:border-orange-200',
        href: '/admin/cms/trending-offers' as const,
    },
    {
        title: 'Universities',
        description: 'Manage university logos, banners and links',
        icon: GraduationCap,
        color: 'bg-amber-100 text-amber-600',
        hoverBorder: 'hover:border-amber-200',
        href: '/admin/cms/universities' as const,
    }
]

function CMSIndex() {
    return (
        <div className="p-8 space-y-8 w-full max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">App CMS</h1>
                <p className="text-sm text-gray-500 mt-1 font-medium">Manage content displayed across the customer application</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CMS_ITEMS.map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md ${item.hoverBorder} transition-all duration-200 group`}
                        >
                            <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${item.color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 leading-tight">{item.title}</h3>
                                <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">{item.description}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
