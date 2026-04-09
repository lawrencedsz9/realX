import { createLazyFileRoute, Link, useSearch, useNavigate } from '@tanstack/react-router'
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
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Eye, Loader2, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { db, functions, storage } from '@/firebase/config'
import { collection, getDocs, query, limit, orderBy, getCountFromServer, where } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'

export const Route = createLazyFileRoute('/admin/verification-requests/')({
    component: RouteComponent,
})

interface VerificationRequest {
    id: string
    authUid: string | null
    email: string
    idFrontPath: string
    idBackPath: string
    rejectionReason: string | null
    reviewedAt: any
    reviewedBy: string | null
    status: "pending" | "approved" | "rejected"
    submittedAt: any
}

function RouteComponent() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { page, pageSize, status: statusFilter } = useSearch({ from: '/admin/verification-requests/' })

    const [detailOpen, setDetailOpen] = useState(false)
    const [approveOpen, setApproveOpen] = useState(false)
    const [rejectOpen, setRejectOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null)
    const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null)
    const [backImageUrl, setBackImageUrl] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [approveForm, setApproveForm] = useState({
        firstName: '',
        lastName: '',
        gender: 'Unspecified',
        dob: '',
        role: 'student',
    })
    const [creatorCodeResult, setCreatorCodeResult] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ['verification-requests', page, pageSize, statusFilter],
        queryFn: async () => {
            const collRef = collection(db, 'verification_requests')
            const countSnapshot = await getCountFromServer(collRef)
            const totalCount = countSnapshot.data().count

            let q
            if (statusFilter && statusFilter !== 'all') {
                q = query(
                    collRef,
                    where('status', '==', statusFilter),
                    orderBy('submittedAt', 'desc'),
                    limit(page * pageSize)
                )
            } else {
                q = query(
                    collRef,
                    orderBy('submittedAt', 'desc'),
                    limit(page * pageSize)
                )
            }

            const snapshot = await getDocs(q)
            const pageDocs = snapshot.docs.slice((page - 1) * pageSize)

            const requests = pageDocs.map(docSnap => {
                const d = docSnap.data()
                return {
                    id: docSnap.id,
                    authUid: d.authUid || null,
                    email: d.email || '',
                    idFrontPath: d.idFrontPath || '',
                    idBackPath: d.idBackPath || '',
                    rejectionReason: d.rejectionReason || null,
                    reviewedAt: d.reviewedAt || null,
                    reviewedBy: d.reviewedBy || null,
                    status: d.status || 'pending',
                    submittedAt: d.submittedAt || null,
                } as VerificationRequest
            })

            return { requests, totalCount }
        },
        staleTime: 1000 * 60 * 5,
    })

    // Fetch ID images when detail dialog opens
    useEffect(() => {
        if (detailOpen && selectedRequest) {
            setFrontImageUrl(null)
            setBackImageUrl(null)
            if (selectedRequest.idFrontPath) {
                getDownloadURL(ref(storage, selectedRequest.idFrontPath))
                    .then(setFrontImageUrl)
                    .catch(() => setFrontImageUrl(null))
            }
            if (selectedRequest.idBackPath) {
                getDownloadURL(ref(storage, selectedRequest.idBackPath))
                    .then(setBackImageUrl)
                    .catch(() => setBackImageUrl(null))
            }
        }
    }, [detailOpen, selectedRequest])

    const approveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedRequest) return
            const approve = httpsCallable(functions, 'approveVerificationRequest')
            const result = await approve({
                verificationRequestId: selectedRequest.id,
                firstName: approveForm.firstName,
                lastName: approveForm.lastName,
                gender: approveForm.gender,
                dob: approveForm.dob,
                role: approveForm.role,
            })
            return result.data as any
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['verification-requests'] })
            if (data?.creatorCode) {
                setCreatorCodeResult(data.creatorCode)
            } else {
                setApproveOpen(false)
                setDetailOpen(false)
            }
            setApproveForm({ firstName: '', lastName: '', gender: 'Unspecified', dob: '', role: 'student' })
        },
        onError: (error) => {
            alert('Failed to approve request: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
    })

    const rejectMutation = useMutation({
        mutationFn: async () => {
            if (!selectedRequest) return
            const reject = httpsCallable(functions, 'rejectVerificationRequest')
            const result = await reject({
                verificationRequestId: selectedRequest.id,
                rejectionReason,
            })
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['verification-requests'] })
            setRejectOpen(false)
            setDetailOpen(false)
            setRejectionReason('')
        },
        onError: (error) => {
            alert('Failed to reject request: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
    })

    const handleView = (request: VerificationRequest) => {
        setSelectedRequest(request)
        setDetailOpen(true)
    }

    const handleApproveClick = () => {
        setDetailOpen(false)
        setApproveOpen(true)
    }

    const handleRejectClick = () => {
        setDetailOpen(false)
        setRejectOpen(true)
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '—'
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const statusBadge = (status: string) => {
        const variants: Record<string, string> = {
            pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
            approved: 'bg-green-100 text-green-800 hover:bg-green-100',
            rejected: 'bg-red-100 text-red-800 hover:bg-red-100',
        }
        return (
            <Badge className={`${variants[status] || ''} capitalize`}>
                {status}
            </Badge>
        )
    }

    const requestList = data?.requests || []
    const totalCount = data?.totalCount || 0
    const hasNextPage = page * pageSize < totalCount
    const hasPrevPage = page > 1

    return (
        <div className="p-8 space-y-6 w-full max-w-[1600px] mx-auto">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Verification Requests</h1>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                    {totalCount} total request{totalCount !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            navigate({
                                to: '/admin/verification-requests' as any,
                                search: (prev: any) => ({ ...prev, page: 1, status: value }),
                            } as any)
                        }}
                    >
                        <SelectTrigger className="w-[180px] h-10 bg-muted/50 border-none">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md bg-card border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="w-12">
                                <Checkbox />
                            </TableHead>
                            <TableHead className="text-foreground font-bold text-base">Email</TableHead>
                            <TableHead className="text-foreground font-bold text-base">Status</TableHead>
                            <TableHead className="text-foreground font-bold text-base">Submitted At</TableHead>
                            <TableHead className="text-foreground font-bold text-base text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading requests...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : requestList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No verification requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requestList.map((request) => (
                                <TableRow key={request.id} className="h-16 border-b border-border hover:bg-muted/50">
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">{request.email}</TableCell>
                                    <TableCell>{statusBadge(request.status)}</TableCell>
                                    <TableCell className="text-muted-foreground">{formatDate(request.submittedAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full h-8 px-4 gap-1 text-xs font-semibold"
                                            onClick={() => handleView(request)}
                                        >
                                            <Eye className="h-3 w-3" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        from="/admin/verification-requests/"
                        search={(prev: any) => ({
                            ...prev,
                            page: Math.max(1, page - 1),
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
                            Previous
                        </Button>
                    </Link>

                    <div className="text-sm font-medium text-muted-foreground">
                        Page {page}
                    </div>

                    <Link
                        from="/admin/verification-requests/"
                        search={(prev: any) => ({
                            ...prev,
                            page: page + 1,
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
                            Next
                        </Button>
                    </Link>
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Verification Request Details</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{selectedRequest.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    {statusBadge(selectedRequest.status)}
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Submitted At</p>
                                    <p className="font-medium">{formatDate(selectedRequest.submittedAt)}</p>
                                </div>
                                {selectedRequest.reviewedAt && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Reviewed At</p>
                                        <p className="font-medium">{formatDate(selectedRequest.reviewedAt)}</p>
                                    </div>
                                )}
                                {selectedRequest.rejectionReason && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground">Rejection Reason</p>
                                        <p className="font-medium text-red-600">{selectedRequest.rejectionReason}</p>
                                    </div>
                                )}
                            </div>

                            {/* ID Images */}
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">ID Documents</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-muted/30 overflow-hidden">
                                        <p className="text-xs text-muted-foreground p-2 border-b">Front</p>
                                        {frontImageUrl ? (
                                            <img src={frontImageUrl} alt="ID Front" className="w-full h-48 object-cover" />
                                        ) : (
                                            <div className="w-full h-48 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 overflow-hidden">
                                        <p className="text-xs text-muted-foreground p-2 border-b">Back</p>
                                        {backImageUrl ? (
                                            <img src={backImageUrl} alt="ID Back" className="w-full h-48 object-cover" />
                                        ) : (
                                            <div className="w-full h-48 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons for pending requests */}
                            {selectedRequest.status === 'pending' && (
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        className="flex-1 bg-brand-green hover:bg-brand-green/90 text-white"
                                        onClick={handleApproveClick}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Approve & Create Account
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={handleRejectClick}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Approve & Create Student Account</DialogTitle>
                    </DialogHeader>
                    {creatorCodeResult ? (
                        <div className="py-4 space-y-4">
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Creator account created successfully!</span>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                                <p className="text-sm text-muted-foreground">Generated Creator Code:</p>
                                <div className="flex items-center gap-3">
                                    <code className="text-2xl font-mono font-bold tracking-widest">{creatorCodeResult}</code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(creatorCodeResult)
                                            setCopied(true)
                                            setTimeout(() => setCopied(false), 2000)
                                        }}
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <Button
                                className="w-full bg-brand-green hover:bg-brand-green/90 text-white"
                                onClick={() => {
                                    setCreatorCodeResult(null)
                                    setCopied(false)
                                    setApproveOpen(false)
                                }}
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 py-4 px-1 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="approve-firstName">First Name</Label>
                                        <Input
                                            id="approve-firstName"
                                            value={approveForm.firstName}
                                            onChange={(e) => setApproveForm({ ...approveForm, firstName: e.target.value })}
                                            placeholder="Student"
                                            disabled={approveMutation.isPending}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="approve-lastName">Last Name</Label>
                                        <Input
                                            id="approve-lastName"
                                            value={approveForm.lastName}
                                            onChange={(e) => setApproveForm({ ...approveForm, lastName: e.target.value })}
                                            placeholder="Doe"
                                            disabled={approveMutation.isPending}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Email Address</Label>
                                    <Input
                                        value={selectedRequest?.email || ''}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="approve-gender">Gender</Label>
                                        <Select value={approveForm.gender} onValueChange={(value) => setApproveForm({ ...approveForm, gender: value })}>
                                            <SelectTrigger id="approve-gender" disabled={approveMutation.isPending}>
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Unspecified">Unspecified</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="approve-dob">Date of Birth</Label>
                                        <Input
                                            id="approve-dob"
                                            type="date"
                                            value={approveForm.dob}
                                            onChange={(e) => setApproveForm({ ...approveForm, dob: e.target.value })}
                                            disabled={approveMutation.isPending}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="approve-role">Role</Label>
                                    <Select value={approveForm.role} onValueChange={(value) => setApproveForm({ ...approveForm, role: value })}>
                                        <SelectTrigger id="approve-role" disabled={approveMutation.isPending}>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="student">Student</SelectItem>
                                            <SelectItem value="creator">Creator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {approveForm.role === 'creator' && (
                                    <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-3">
                                        <p className="text-sm text-muted-foreground">
                                            A unique 6-character creator code will be automatically generated for this account upon creation.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setApproveOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-brand-green hover:bg-brand-green/90 text-white"
                                    onClick={() => approveMutation.mutate()}
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        'Approve & Create Account'
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Reject Verification Request</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Rejecting request from <strong>{selectedRequest?.email}</strong>
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                            <Textarea
                                id="rejection-reason"
                                placeholder="Please provide a reason for rejecting this request..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                disabled={rejectMutation.isPending}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => rejectMutation.mutate()}
                            disabled={rejectMutation.isPending || !rejectionReason.trim()}
                        >
                            {rejectMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                'Reject Request'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
