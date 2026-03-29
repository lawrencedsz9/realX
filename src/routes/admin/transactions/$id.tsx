import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import type { Transaction } from './index'

export const Route = createFileRoute('/admin/transactions/$id')({
    loader: async ({ params: { id } }) => {
        const docRef = doc(db, 'transactions', id)
        const docSnap = await getDoc(docRef)
        
        if (!docSnap.exists()) {
            throw new Error('Transaction not found')
        }

        const data = docSnap.data()
        
        let formattedDate = ''
        if (data.createdAt) {
            if (typeof data.createdAt === 'string') {
                formattedDate = new Date(data.createdAt).toLocaleString()
            } else if (data.createdAt?.toDate) {
                formattedDate = data.createdAt.toDate().toLocaleString()
            }
        }

        return {
            id,
            ...data,
            date: formattedDate || 'Unknown Date',
            transactionId: data.pin || id,
            vendorName: data.vendorName || 'Unknown Vendor',
            totalAmount: data.totalAmount ? `QAR ${data.totalAmount}` : 'QAR 0',
            type: data.type || 'N/A',
        } as Transaction
    },
})
