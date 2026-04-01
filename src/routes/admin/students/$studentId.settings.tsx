import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { db } from '@/firebase/config'
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, XCircle, Tag, Wallet, History, AlertCircle, ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Student {
    id: string
    firstName?: string
    lastName?: string
    name?: string
    email?: string
    phoneNumber?: string
    isVerified?: boolean
    creatorCode?: string
    profilePicture?: string
    amountSaved?: number
    cashback?: number
    savings?: number
    dob?: string
    gender?: string
    role?: string
    uid?: string
    createdAt?: any
    updatedAt?: any
}

export interface Redemption {
    id: string
    offerId: string
    offerTitle: string
    vendorId: string
    vendorName: string
    studentId: string
    discountAmount: number
    discountType: string
    originalPrice?: number
    createdAt: any
}

const studentSettingsSearchSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
})

export const Route = createFileRoute('/admin/students/$studentId/settings')({
    validateSearch: (search) => studentSettingsSearchSchema.parse(search),
    loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
    component: StudentSettings,
    loader: async ({ context: { queryClient }, params: { studentId } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['student', studentId],
            queryFn: async () => {
                const docRef = doc(db, 'students', studentId)
                const snapshot = await getDoc(docRef)
                if (!snapshot.exists()) {
                    throw new Error('Student not found')
                }
                const data = snapshot.data()
                return {
                    id: snapshot.id,
                    ...data,
                    name: (data.firstName || data.lastName) ? `${data.firstName || ''} ${data.lastName || ''}`.trim() : (data.name || 'Unnamed Student'),
                    amountSaved: data.amountSaved || 0,
                } as Student
            },
        })
    },
})

function StudentSettings() {
    const { studentId } = Route.useParams()
    const navigate = useNavigate()

    const { data: student, isLoading: isStudentLoading, isError: isStudentError } = useQuery({
        queryKey: ['student', studentId],
        queryFn: async () => {
            const docRef = doc(db, 'students', studentId)
            const snapshot = await getDoc(docRef)
            if (!snapshot.exists()) {
                throw new Error('Student not found')
            }
            const data = snapshot.data()
            return {
                id: snapshot.id,
                ...data,
                name: (data.firstName || data.lastName) ? `${data.firstName || ''} ${data.lastName || ''}`.trim() : (data.name || 'Unnamed Student'),
                amountSaved: data.amountSaved || 0,
            } as Student
        }
    })

    const { page, pageSize } = Route.useSearch()

    const { data: { transactions: redemptions = [], totalCount = 0 } = {}, isLoading: isRedemptionsLoading } = useQuery({
        queryKey: ['student-redemptions', studentId, page, pageSize],
        queryFn: async () => {
            const collRef = collection(db, 'transactions')
            const qCount = query(
                collRef,
                where('userId', '==', studentId)
            )
            const countSnapshot = await getCountFromServer(qCount)
            const totalCount = countSnapshot.data().count

            const q = query(
                collRef,
                where('userId', '==', studentId),
                orderBy('createdAt', 'desc'),
                limit(page * pageSize)
            )
            const snapshot = await getDocs(q)
            const startIdx = (page - 1) * pageSize
            const endIdx = page * pageSize
            const transactions = snapshot.docs.slice(startIdx, endIdx).map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Redemption[]

            return { transactions, totalCount }
        }
    })

    if (isStudentLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
                    <p className="text-muted-foreground font-medium">Loading student data...</p>
                </div>
            </div>
        )
    }

    if (isStudentError || !student) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-bold">Student Not Found</h2>
                <p className="text-muted-foreground">The student you are looking for does not exist or has been deleted.</p>
                <button
                    onClick={() => navigate({ to: '/admin/students', search: { page: 1, pageSize: 10 } })}
                    className="mt-4 px-4 py-2 bg-brand-green text-white rounded-md font-medium"
                >
                    Back to Students
                </button>
            </div>
        )
    }

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'N/A'
        if (timestamp.toDate) return format(timestamp.toDate(), 'MMMM d, yyyy h:mm:ss a')
        return format(new Date(timestamp), 'MMMM d, yyyy h:mm:ss a')
    }

    return (
        <div className="p-8 space-y-8 w-full max-w-[1200px] mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    to="/admin/students"
                    search={{ page: 1, pageSize: 10 }}
                    className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors group"
                >
                    <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        {student.profilePicture ? (
                            <img src={student.profilePicture} alt={student.name} className="h-10 w-10 rounded-full object-cover shrink-0 border border-border" />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 border border-brand-green/20">
                                <span className="font-bold text-lg">{student.name?.charAt(0) || '?'}</span>
                            </div>
                        )}
                        <span>{student.name}</span>
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <Card className="md:col-span-1 shadow-sm border-border/50">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Tag className="h-5 w-5 text-muted-foreground" />
                            Student Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">First Name</p>
                                <p className="font-medium text-foreground">{student.firstName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Last Name</p>
                                <p className="font-medium text-foreground">{student.lastName || 'N/A'}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                            <p className="font-medium text-foreground">{student.email || 'N/A'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Gender</p>
                                <p className="font-medium text-foreground">{student.gender || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Date of Birth</p>
                                <p className="font-medium text-foreground">{student.dob || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
                                <p className="font-medium text-foreground capitalize">{student.role || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Creator Code</p>
                                <div className="font-mono font-medium text-foreground tracking-widest bg-muted/50 px-2 py-0.5 rounded text-sm inline-block">
                                    {student.creatorCode || '----'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                {student.isVerified ? (
                                    <div className="flex items-center gap-1.5 text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full text-sm">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Verified</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-red-500 font-medium bg-red-50 px-2.5 py-1 rounded-full text-sm">
                                        <XCircle className="h-4 w-4" />
                                        <span>Unverified</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Savings</p>
                                <div className="flex items-center gap-2 text-lg font-bold text-brand-green">
                                    <Wallet className="h-4 w-4" />
                                    ${(student.savings ?? student.amountSaved ?? 0).toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Cashback</p>
                                <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
                                    <ShoppingBag className="h-4 w-4" />
                                    ${(student.cashback || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t space-y-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-0.5">UID</p>
                                <p className="text-xs font-mono text-muted-foreground break-all bg-muted/30 p-2 rounded">
                                    {student.uid || student.id}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-0.5">Created At</p>
                                <p className="text-xs text-foreground font-medium">
                                    {formatTimestamp(student.createdAt)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-0.5">Updated At</p>
                                <p className="text-xs text-foreground font-medium">
                                    {formatTimestamp(student.updatedAt)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Redemptions List */}
                <Card className="md:col-span-2 shadow-sm border-border/50 flex flex-col h-full min-h-[400px]">
                    <CardHeader className="pb-4 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                Redemption History
                            </CardTitle>
                            <div className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                {totalCount} total
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0">
                                <TableRow>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Offer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Saved</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isRedemptionsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
                                                <p className="text-muted-foreground font-medium text-sm">Loading history...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : redemptions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                                <ShoppingBag className="h-8 w-8 opacity-20" />
                                                <p>No redemptions found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    redemptions.map((redemption) => (
                                        <TableRow key={redemption.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium text-foreground">
                                                {redemption.vendorName || 'Unknown Vendor'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {redemption.offerTitle || 'Unknown Offer'}
                                                {redemption.discountType === 'percentage'
                                                    ? ` (${redemption.discountAmount}%)`
                                                    : ` ($${redemption.discountAmount})`
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {redemption.createdAt?.toDate
                                                    ? format(redemption.createdAt.toDate(), 'MMM d, yyyy h:mm a')
                                                    : 'Unknown Date'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-brand-green">
                                                {redemption.discountType === 'percentage' && redemption.originalPrice
                                                    ? `$${((redemption.originalPrice * redemption.discountAmount) / 100).toFixed(2)}`
                                                    : redemption.discountType === 'amount'
                                                        ? `$${redemption.discountAmount?.toFixed(2)}`
                                                        : '-'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {/* Pagination Controls */}
                    <div className="p-4 border-t flex items-center justify-between">
                        <div className="text-sm text-muted-foreground font-medium">
                            Showing <span className="text-foreground">{Math.min(redemptions.length, pageSize)}</span> of <span className="text-foreground">{totalCount}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate({ to: '.', search: (prev: any) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }) })}
                                disabled={page === 1 || isRedemptionsLoading}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm font-bold bg-muted px-3 py-1 rounded-md min-w-[32px] text-center">
                                {page}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate({ to: '.', search: (prev: any) => ({ ...prev, page: (prev.page || 1) + 1 }) })}
                                disabled={page * pageSize >= totalCount || isRedemptionsLoading}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

