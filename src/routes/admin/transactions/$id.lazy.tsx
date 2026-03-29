import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Tag, Receipt, CreditCard, Building2, Ticket } from 'lucide-react'

export const Route = createLazyFileRoute('/admin/transactions/$id')({
    component: TransactionDetailsRoute,
})

function TransactionDetailsRoute() {
    const transaction = Route.useLoaderData()

    return (
        <div className="p-8 space-y-6 w-full max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link to="/admin/transactions" search={{ page: 1, pageSize: 10 }}>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                        <Receipt className="w-6 h-6 text-blue-600"/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transaction Details</h1>
                        <p className="text-sm text-muted-foreground mt-1">Review full transaction information and redemption stats</p>
                    </div>
                </div>
            </div>

            <Card className="max-w-4xl border-none shadow-sm shadow-blue-100/50 bg-white">
                <CardHeader className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 pb-6 rounded-t-xl">
                    <div className="space-y-1.5">
                        <CardDescription className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">Transaction ID</CardDescription>
                        <CardTitle className="text-xl md:text-2xl font-bold font-mono tracking-tight text-gray-900">{transaction.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                    <Badge 
                        variant="default"
                        className={`text-sm px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider ${
                            transaction.type?.includes('offer')
                                ? 'bg-[#18B852] hover:bg-[#18B852]/90 text-white' 
                                : 'bg-blue-600 hover:bg-blue-600/90 text-white'
                        }`}
                    >
                        {(transaction.type || 'N/A').replace(/_/g, ' ')}
                    </Badge>
                </CardHeader>
                
                <CardContent className="p-6 md:p-8 space-y-8">
                    {/* Core Information Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Transaction Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                <CreditCard className="h-5 w-5 text-indigo-500" />
                                Payment Summary
                            </h3>
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl space-y-4 border border-gray-100">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <span className="text-muted-foreground text-sm font-medium">Vendor</span>
                                    <span className="font-semibold text-gray-900 text-sm">{transaction.vendorName}</span>
                                </div>
                                <Separator className="bg-gray-200" />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground text-sm font-medium">Original Total</span>
                                    <span className="font-medium text-gray-700">{transaction.totalAmount}</span>
                                </div>
                                
                                {transaction.discountAmount !== undefined && transaction.discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-red-500 font-medium">
                                        <span className="text-sm">Discount {transaction.discountType ? `(${transaction.discountType})` : ''}</span>
                                        <span>-QAR {transaction.discountAmount}</span>
                                    </div>
                                )}

                                {transaction.redemptionCardAmount !== undefined && transaction.redemptionCardAmount > 0 && (
                                    <div className="flex justify-between items-center text-blue-600 font-medium">
                                        <span className="text-sm">Gift Card Used</span>
                                        <span>-QAR {transaction.redemptionCardAmount}</span>
                                    </div>
                                )}

                                {transaction.remainingAmount !== undefined && (
                                    <div className="flex justify-between items-center text-gray-700 font-medium">
                                        <span className="text-sm">Remaining Balance</span>
                                        <span>QAR {transaction.remainingAmount}</span>
                                    </div>
                                )}

                                {(transaction.finalAmount !== undefined || transaction.type?.includes('offer') || transaction.type?.includes('giftcard')) && (
                                    <>
                                        <Separator className="my-2 bg-gray-200" />
                                        <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                                            <span>Final Amount Paid</span>
                                            <span>QAR {transaction.finalAmount ?? transaction.totalAmount?.toString().replace(/[^\d.]/g, '')}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Reference Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                <User className="h-5 w-5 text-indigo-500" />
                                Reference Information
                            </h3>
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl space-y-4 border border-gray-100">
                                <div className="space-y-1.5 flex flex-col">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> User ID</span>
                                    <span className="font-mono text-xs md:text-sm text-gray-800 break-all bg-white p-2 rounded-lg border border-gray-100">{transaction.userId || 'N/A'}</span>
                                </div>
                                <Separator className="bg-gray-200" />
                                <div className="space-y-1.5 flex flex-col">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Vendor ID</span>
                                    <span className="font-mono text-xs md:text-sm text-gray-800 break-all bg-white p-2 rounded-lg border border-gray-100">{transaction.vendorId || 'N/A'}</span>
                                </div>
                                <Separator className="bg-gray-200" />
                                {transaction.offerId && (
                                    <>
                                        <div className="space-y-1.5 flex flex-col">
                                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Offer ID</span>
                                            <span className="font-mono text-xs md:text-sm text-gray-800 break-all bg-white p-2 rounded-lg border border-gray-100">{transaction.offerId}</span>
                                        </div>
                                        <Separator className="bg-gray-200" />
                                    </>
                                )}
                                <div className="space-y-1.5 flex flex-col">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Transaction PIN</span>
                                    <span className="font-mono text-base font-semibold text-gray-800 tracking-wider bg-white p-2 rounded-lg border border-gray-100">{transaction.pin || transaction.transactionId || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rewards Section */}
                    {(transaction.cashbackAmount !== undefined || transaction.creatorCashbackAmount !== undefined || transaction.creatorCode) && (
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                <Tag className="h-5 w-5 text-green-600" />
                                Rewards & Referrals
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-5 rounded-2xl border border-green-200/50 flex flex-col justify-center space-y-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <p className="text-xs text-green-700 font-bold uppercase tracking-wider">User Cashback</p>
                                    </div>
                                    <p className="font-bold text-3xl text-green-700">QAR {transaction.cashbackAmount || 0}</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-5 rounded-2xl border border-orange-200/50 flex flex-col justify-center space-y-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        <p className="text-xs text-orange-700 font-bold uppercase tracking-wider">Creator Earned</p>
                                    </div>
                                    <p className="font-bold text-3xl text-orange-700">QAR {transaction.creatorCashbackAmount || 0}</p>
                                </div>

                                {(transaction.creatorCode || transaction.creatorUid) && (
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 rounded-2xl border border-purple-200/50 flex flex-col justify-center space-y-2 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Creator Info</p>
                                        </div>
                                        <p className="font-bold text-2xl text-purple-700">{transaction.creatorCode || 'No Code'}</p>
                                        {(transaction.creatorUid || transaction.creatorCodeOwnerId) && (
                                            <p className="text-[10px] text-purple-500 font-mono mt-1 opacity-80 break-all">{transaction.creatorUid || transaction.creatorCodeOwnerId}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
