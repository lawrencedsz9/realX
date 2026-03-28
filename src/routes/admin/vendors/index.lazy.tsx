import { createLazyFileRoute, Link, useSearch } from '@tanstack/react-router'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, Upload, Plus, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { db, functions } from '@/firebase/config'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { doc, setDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore'
import { Switch } from '@/components/ui/switch'
import { fetchVendors, type Vendor } from './index'

export const Route = createLazyFileRoute('/admin/vendors/')({
    component: RouteComponent,
})

function RouteComponent() {
    const queryClient = useQueryClient()
    const { page, pageSize } = useSearch({ from: '/admin/vendors/' })
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)

    const { data, isLoading: isQueryLoading } = useQuery({
        queryKey: ['vendors-list', page, pageSize],
        queryFn: () => fetchVendors(page, pageSize),
        staleTime: 1000 * 60 * 5,
    })

    const vendorList = data?.vendors || []
    const totalVendors = data?.totalCount || 0


    const addVendorMutation = useMutation({
        mutationFn: async (formData: typeof form) => {
            const createVendorUser = httpsCallable(functions, 'createVendorUser')
            const result = await createVendorUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
            })
            const dataResult = result.data as { uid: string }
            if (dataResult?.uid) {
                await setDoc(doc(db, 'vendors', dataResult.uid), { xcard: false }, { merge: true })
            }
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors-list'] })
            setForm({ name: '', email: '', password: '' })
            setOpen(false)
        },
        onError: (error) => {
            console.error('Error adding vendor: ', error)
            alert('Failed to add vendor: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    })

    const toggleXCardMutation = useMutation({
        mutationFn: async ({ vendorId, xcard }: { vendorId: string, xcard: boolean }) => {
            const batch = writeBatch(db)
            
            // 1. Update the vendor document
            const vendorRef = doc(db, 'vendors', vendorId)
            batch.update(vendorRef, { xcard })
            
            // 2. Update all associated offers
            const offersQuery = query(
                collection(db, 'offers'),
                where('vendorId', '==', vendorId)
            )
            const offersSnapshot = await getDocs(offersQuery)
            
            offersSnapshot.forEach((offerDoc) => {
                batch.update(offerDoc.ref, { xcard })
            })
            
            // 3. Commit the batch
            await batch.commit()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors-list'] })
            queryClient.invalidateQueries({ queryKey: ['offers'] }) // Invalidate overall offers cache
        }
    })

    const deleteVendorMutation = useMutation({
        mutationFn: async (vendorId: string) => {
            const deleteVendorUser = httpsCallable(functions, 'deleteVendorUser')
            await deleteVendorUser({ uid: vendorId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors-list'] })
            setDeleteConfirmOpen(false)
            setVendorToDelete(null)
        },
        onError: (error) => {
            console.error('Error deleting vendor: ', error)
            alert('Failed to delete vendor: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    })

    const loading = isQueryLoading

    const handleAddVendor = async () => {
        if (!form.name || !form.email || !form.password) return
        addVendorMutation.mutate(form)
    }

    const handleDeleteVendor = (vendor: Vendor) => {
        setVendorToDelete(vendor)
        setDeleteConfirmOpen(true)
    }

    const confirmDelete = () => {
        if (vendorToDelete) {
            deleteVendorMutation.mutate(vendorToDelete.id)
        }
    }

    // Simplified Pagination logic
    const hasNextPage = page * pageSize < totalVendors
    const hasPrevPage = page > 1

    return (
        <div className="p-8 space-y-6 w-full max-w-[1600px] mx-auto">
            <h1 className="text-3xl font-bold tracking-tight">Vendor Overview</h1>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Vendor</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{vendorToDelete?.name}</strong>? This action will remove the user's access and delete their data. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteVendorMutation.isPending}
                        >
                            {deleteVendorMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Vendor'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for vendors"
                        className="pl-9 bg-muted/50 border-none h-10"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 h-10">
                        Export <Upload className="h-4 w-4" />
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#18B852] hover:bg-[#18B852] text-white gap-2 h-10">
                                <Plus className="h-4 w-4" /> Add New Vendor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Vendor</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Vendor Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Enter vendor name"
                                        disabled={addVendorMutation.isPending}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="Enter email address"
                                        disabled={addVendorMutation.isPending}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="Enter password"
                                        disabled={addVendorMutation.isPending}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-[#18B852] hover:bg-[#18B852] text-white"
                                    onClick={handleAddVendor}
                                    disabled={addVendorMutation.isPending}
                                >
                                    {addVendorMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding Vendor...
                                        </>
                                    ) : (
                                        'Add Vendor'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Select defaultValue="alphabetical">
                        <SelectTrigger className="w-[180px] h-10 bg-muted/50 border-none">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="alphabetical">Sort by: Alphabetical</SelectItem>
                            <SelectItem value="newest">Sort by: Newest</SelectItem>
                            <SelectItem value="oldest">Sort by: Oldest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-12">
                                <Checkbox />
                            </TableHead>
                            <TableHead className="text-black font-bold text-base">Brand Name</TableHead>
                            <TableHead className="text-black font-bold text-base">Contact Info</TableHead>
                            <TableHead className="text-black font-bold text-base">Vendor Pin</TableHead>
                            <TableHead className="text-black font-bold text-base">XCard</TableHead>
                            <TableHead className="text-black font-bold text-base text-right pr-8">Actions:</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#18B852] border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading vendors...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : vendorList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No vendors found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            vendorList.map((vendor: Vendor) => (
                                <TableRow key={vendor.id} className="h-16 border-b border-gray-100 hover:bg-gray-50/50">
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {vendor.profilePicture ? (
                                                <img src={vendor.profilePicture} alt={vendor.name} className="h-10 w-10 rounded-lg object-cover shrink-0" loading="lazy" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                    <span className="text-gray-400 text-xs font-bold">{vendor.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <span className="font-medium text-base">{vendor.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">{vendor.contact}</TableCell>
                                    <TableCell className="font-mono font-medium text-gray-900 tracking-widest">{vendor.pin}</TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        <Switch
                                            checked={vendor.xcard}
                                            onCheckedChange={(checked) => toggleXCardMutation.mutate({ vendorId: vendor.id, xcard: checked })}
                                            disabled={toggleXCardMutation.isPending}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to="/admin/vendors/$vendorId/settings" params={{ vendorId: vendor.id }}>
                                                <Button variant="outline" size="sm" className="rounded-full h-8 px-4 gap-1 text-xs font-semibold">
                                                    Manage <ChevronRight className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() => handleDeleteVendor(vendor)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Simple Pagination */}
            {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        from="/admin/vendors/"
                        search={(prev) => ({
                            ...prev,
                            page: Math.max(1, (prev.page ?? 1) - 1),
                        })}
                        disabled={!hasPrevPage}
                        className={!hasPrevPage ? 'pointer-events-none opacity-50' : ''}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-auto px-4 gap-2 text-sm font-medium"
                            disabled={!hasPrevPage}
                        >
                            ‹ Previous
                        </Button>
                    </Link>

                    <div className="text-sm font-medium text-muted-foreground">
                        Page {page}
                    </div>

                    <Link
                        from="/admin/vendors/"
                        search={(prev) => ({
                            ...prev,
                            page: (prev.page ?? 1) + 1,
                        })}
                        disabled={!hasNextPage}
                        className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-auto px-4 gap-2 text-sm font-medium"
                            disabled={!hasNextPage}
                        >
                            Next ›
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
