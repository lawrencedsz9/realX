import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Send, Loader2, Bell, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import iconUrl from '@/assets/icon.png'
import { functions, db } from '@/firebase/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import type { NotificationRecord } from '@/types/notifications'

export const Route = createFileRoute('/admin/notifications/')({
    component: NotificationsPage,
})

function NotificationsPage() {
    const queryClient = useQueryClient()
    const [form, setForm] = useState({ title: '', body: '', imageUrl: iconUrl as string })

    // Fetch notification history
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const q = query(collection(db, 'notifications'), orderBy('sentAt', 'desc'))
            const snapshot = await getDocs(q)
            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as NotificationRecord[]
        },
        staleTime: 1000 * 60 * 2,
    })

    // Send notification mutation
    const sendMutation = useMutation({
        mutationFn: async (data: { title: string; body: string; imageUrl?: string }) => {
            const sendNotification = httpsCallable(functions, 'sendNotification')
            const result = await sendNotification(data)
            return result.data as {
                success: boolean
                successCount: number
                failureCount: number
                totalRecipients: number
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            toast.success(`Notification sent to ${data.successCount} devices`)
            setForm({ title: '', body: '', imageUrl: iconUrl as string })
        },
        onError: (error) => {
            toast.error('Failed to send notification: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
    })

    const handleSend = () => {
        if (!form.title.trim() || !form.body.trim()) {
            toast.error('Title and body are required')
            return
        }
        const payload: { title: string; body: string; imageUrl?: string } = {
            title: form.title.trim(),
            body: form.body.trim(),
        }
        if (form.imageUrl.trim()) {
            payload.imageUrl = form.imageUrl.trim()
        }
        sendMutation.mutate(payload)
    }

    return (
        <div className="p-8 space-y-8 w-full max-w-[1600px] mx-auto">
            <div className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Form */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Compose Notification</CardTitle>
                        <CardDescription>
                            Send a push notification to all student app users
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Notification title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                disabled={sendMutation.isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="body">Body</Label>
                            <Textarea
                                id="body"
                                placeholder="Notification message"
                                value={form.body}
                                onChange={(e) => setForm({ ...form, body: e.target.value })}
                                rows={4}
                                disabled={sendMutation.isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">Image URL (optional)</Label>
                            <Input
                                id="imageUrl"
                                placeholder="https://example.com/image.png"
                                value={form.imageUrl}
                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                disabled={sendMutation.isPending}
                            />
                        </div>

                        <Button
                            className="bg-primary hover:bg-primary/90 text-white gap-2"
                            onClick={handleSend}
                            disabled={sendMutation.isPending}
                        >
                            {sendMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Send Notification
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>How the notification will appear</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                {form.imageUrl ? (
                                    <img
                                        src={form.imageUrl}
                                        alt="Preview"
                                        className="h-12 w-12 rounded-lg object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                ) : (
                                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">
                                        {form.title || 'Notification Title'}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-3">
                                        {form.body || 'Notification body text will appear here'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notification History */}
            <Card>
                <CardHeader>
                    <CardTitle>Notification History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold">Title</TableHead>
                                    <TableHead className="font-bold">Body</TableHead>
                                    <TableHead className="font-bold">Sent At</TableHead>
                                    <TableHead className="font-bold text-right">Recipients</TableHead>
                                    <TableHead className="font-bold text-right">Success Rate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                                <p className="text-muted-foreground">Loading notifications...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : !notifications || notifications.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            No notifications sent yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    notifications.map((notification) => (
                                        <TableRow key={notification.id}>
                                            <TableCell className="font-medium">{notification.title}</TableCell>
                                            <TableCell className="max-w-xs truncate text-muted-foreground">
                                                {notification.body}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {notification.sentAt?.seconds
                                                    ? format(new Date(notification.sentAt.seconds * 1000), 'MMM d, yyyy h:mm a')
                                                    : '—'
                                                }
                                            </TableCell>
                                            <TableCell className="text-right">{notification.totalRecipients}</TableCell>
                                            <TableCell className="text-right">
                                                {notification.totalRecipients > 0
                                                    ? `${Math.round((notification.successCount / notification.totalRecipients) * 100)}%`
                                                    : '—'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
