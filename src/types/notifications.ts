export interface NotificationRecord {
    id: string
    title: string
    body: string
    imageUrl?: string | null
    topic: string
    sentBy: string
    sentAt: { seconds: number; nanoseconds: number }
    messageId?: string
    sentCount?: number
    totalRegistered?: number
    receiptIds?: string[]
}
