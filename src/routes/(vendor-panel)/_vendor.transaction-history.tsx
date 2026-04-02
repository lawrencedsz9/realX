import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { vendorTransactionsQueryOptions } from '@/queries'
import { useAuth } from '@/auth'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/(vendor-panel)/_vendor/transaction-history')({
  component: VendorTransactionHistory,
})

function VendorTransactionHistory() {
  const { user } = useAuth()
  const vendorId = user?.uid || ''

  const { data: transactions, isLoading } = useQuery(vendorTransactionsQueryOptions(vendorId))

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-900">ID</th>
                <th className="px-6 py-4 font-medium text-gray-900">Student</th>
                <th className="px-6 py-4 font-medium text-gray-900">Date</th>
                <th className="px-6 py-4 font-medium text-gray-900">Amount</th>
                <th className="px-6 py-4 font-medium text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions?.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{tx.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 font-medium">{tx.studentName || 'Unknown User'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {tx.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4">${tx.finalAmount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
