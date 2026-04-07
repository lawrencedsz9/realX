export interface NotificationRecord {
    id: string
    title: string
    body: string
    imageUrl?: string | null
    sentBy: string
    sentAt: { seconds: number; nanoseconds: number }
    successCount: number
    failureCount: number
    totalRecipients: number
}
