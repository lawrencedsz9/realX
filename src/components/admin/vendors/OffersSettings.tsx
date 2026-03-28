import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SquarePen, Plus, Loader2, ArrowLeft, Check, Trash2, Upload, X } from 'lucide-react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { db, storage } from '@/firebase/config'
import { collection, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { offersQueryOptions, type Offer } from '@/queries'

export function generateSearchTokens({
    titleEn,
    titleAr,
    vendorName,
    mainCategory,
    categories,
}: {
    titleEn?: string;
    titleAr?: string;
    vendorName?: string;
    mainCategory?: string;
    categories?: string[];
}): string[] {
    const tokens = new Set<string>();

    const tokenize = (text?: string) => {
        if (!text) return;
        const words = text.toLowerCase().split(/[\s\-_,.]+/);

        words.forEach(word => {
            if (!word) return;
            tokens.add(word);

            if (word.includes("'")) {
                tokens.add(word.replace(/'/g, ""));
                tokens.add(word.split("'")[0]);
            }
        });
    };

    tokenize(titleEn);
    tokenize(titleAr);
    tokenize(vendorName);
    tokenize(mainCategory);
    if (categories) {
        categories.forEach(tokenize);
    }

    return Array.from(tokens);
}

interface OffersSettingsProps {
    vendorId: string | undefined
    vendorName?: string
    vendorProfilePicture?: string
    vendorXCard?: boolean
}

export function OffersSettings({ vendorId, vendorName, vendorProfilePicture, vendorXCard }: OffersSettingsProps) {
    const queryClient = useQueryClient()
    const [isCreating, setIsCreating] = useState(false)
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<Offer>>({
        categories: [],
        discountType: 'percentage',
        discountValue: 0,
        isTrending: false,
        mainCategory: '',
        status: 'active',
        totalRedemptions: 0
    })
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [categoryInput, setCategoryInput] = useState("")
    const bannerInputRef = useRef<HTMLInputElement>(null)

    // Reset form when entering Create mode
    useEffect(() => {
        if (isCreating) {
            setFormData({
                vendorId: vendorId,
                categories: [],
                discountType: 'percentage',
                discountValue: 0,
                isTrending: false,
                mainCategory: '',
                status: 'active',
                totalRedemptions: 0
            })
            setCategoryInput("")
        }
    }, [isCreating, vendorId])

    // Populate form when entering Edit mode
    useEffect(() => {
        if (editingOffer) {
            setFormData({ ...editingOffer })
            setCategoryInput("")
        }
    }, [editingOffer])

    const { data: offers } = useSuspenseQuery(offersQueryOptions(vendorId!))

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !vendorId) return

        setUploadingBanner(true)
        try {
            const extension = file.name.split('.').pop()
            const fileName = `offer_${Date.now()}`
            const storagePath = `vendors/${vendorId}/offers/${fileName}.${extension}`
            const storageRef = ref(storage, storagePath)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)

            setFormData(prev => ({ ...prev, bannerImage: downloadURL }))
            toast.success("Banner uploaded successfully")
        } catch (error) {
            console.error("Upload failed:", error)
            toast.error("Failed to upload banner")
        } finally {
            setUploadingBanner(false)
        }
    }

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<Offer>) => {
            const searchTokens = generateSearchTokens({
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                vendorName: vendorName || '',
                mainCategory: data.mainCategory,
                categories: data.categories
            });

            if (editingOffer) {
                // Update
                const docRef = doc(db, 'offers', editingOffer.id)
                await updateDoc(docRef, {
                    ...data,
                    searchTokens,
                    vendorRef: doc(db, 'vendors', vendorId || editingOffer.vendorId),
                    vendorName: vendorName || '',
                    vendorProfilePicture: vendorProfilePicture || '',
                    updatedAt: serverTimestamp()
                })
            } else {
                // Create
                if (!vendorId) throw new Error("Vendor ID is missing")
                await addDoc(collection(db, 'offers'), {
                    ...data,
                    searchTokens,
                    vendorId,
                    vendorRef: doc(db, 'vendors', vendorId),
                    vendorName: vendorName || '',
                    vendorProfilePicture: vendorProfilePicture || '',
                    xcard: vendorXCard || false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                })
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers', vendorId] })
            toast.success(editingOffer ? 'Offer updated' : 'Offer created')
            setIsCreating(false)
            setEditingOffer(null)
        },
        onError: () => {
            toast.error('Failed to save offer')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (offerId: string) => {
            await deleteDoc(doc(db, 'offers', offerId))
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers', vendorId] })
            toast.success('Offer deleted')
            setEditingOffer(null)
        },
        onError: () => {
            toast.error('Failed to delete offer')
        }
    })

    const addCategory = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && categoryInput.trim()) {
            e.preventDefault()
            const currentCats = formData.categories || []
            if (!currentCats.includes(categoryInput.trim())) {
                setFormData(prev => ({ ...prev, categories: [...currentCats, categoryInput.trim()] }))
            }
            setCategoryInput("")
        }
    }

    const removeCategory = (cat: string) => {
        setFormData(prev => ({
            ...prev,
            categories: (prev.categories || []).filter(c => c !== cat)
        }))
    }

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ offerId, status }: { offerId: string; status: 'active' | 'inactive' }) => {
            const docRef = doc(db, 'offers', offerId)
            await updateDoc(docRef, { status, updatedAt: serverTimestamp() })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers', vendorId] })
            toast.success('Offer status updated')
        },
        onError: () => {
            toast.error('Failed to update status')
        }
    })


    if (isCreating || editingOffer) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 border hover:bg-slate-100"
                            onClick={() => {
                                setIsCreating(false)
                                setEditingOffer(null)
                            }}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="text-slate-400 font-medium">{vendorName || 'Vendor'} / </span>
                            {isCreating ? 'Create new Offer' : 'Manage Offer'}
                        </h1>
                    </div>
                    {editingOffer && (
                        <Button
                            variant="destructive"
                            className="rounded-full px-6 h-10 bg-[#EF4444] hover:bg-[#DC2626] font-medium text-white flex items-center gap-2"
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this offer?')) {
                                    deleteMutation.mutate(editingOffer.id)
                                }
                            }}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Offer
                        </Button>
                    )}
                </div>

                {/* Form Fields - 2 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Banner & Basic Info */}
                    <div className="space-y-6">
                        {/* Banner Image */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold text-slate-700">Banner Image</Label>
                            <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 group hover:border-[#18B852]/50 transition-all">
                                {uploadingBanner ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                        <Loader2 className="w-8 h-8 text-[#18B852] animate-spin" />
                                    </div>
                                ) : formData.bannerImage ? (
                                    <>
                                        <img
                                            src={formData.bannerImage}
                                            alt="Banner"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute bottom-4 right-4 shadow-lg"
                                            onClick={() => bannerInputRef.current?.click()}
                                        >
                                            Change Image
                                        </Button>
                                    </>
                                ) : (
                                    <div
                                        className="h-full w-full flex flex-col items-center justify-center cursor-pointer"
                                        onClick={() => bannerInputRef.current?.click()}
                                    >
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-500 font-medium">Click to upload banner</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={bannerInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        {/* Titles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="titleEn">Title (English)</Label>
                                <Input
                                    id="titleEn"
                                    value={formData.titleEn || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                                    placeholder="Ex: Summer Sale"
                                    className="bg-slate-50 h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="titleAr">Title (Arabic)</Label>
                                <Input
                                    id="titleAr"
                                    value={formData.titleAr || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                                    placeholder="Ex: خصومات الصيف"
                                    dir="rtl"
                                    className="bg-slate-50 h-12 text-right"
                                />
                            </div>
                        </div>

                        {/* Descriptions */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="descEn">Description (English)</Label>
                                <Textarea
                                    id="descEn"
                                    value={formData.descriptionEn || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                                    placeholder="Brief description of the offer..."
                                    className="bg-slate-50 min-h-[100px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="descAr">Description (Arabic)</Label>
                                <Textarea
                                    id="descAr"
                                    value={formData.descriptionAr || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
                                    placeholder="وصف مختصر للعرض..."
                                    dir="rtl"
                                    className="bg-slate-50 min-h-[100px] text-right"
                                />
                            </div>
                        </div>

                        {/* Main Category */}
                        <div className="space-y-2">
                            <Label htmlFor="mainCategory">Main Category</Label>
                            <Input
                                id="mainCategory"
                                value={formData.mainCategory || ''}
                                onChange={e => setFormData(prev => ({ ...prev, mainCategory: e.target.value }))}
                                placeholder="Ex: Electronics"
                                className="bg-slate-50 h-12"
                            />
                        </div>
                    </div>

                    {/* Right Column: Settings & Details */}
                    <div className="space-y-6">
                        {/* Discount Settings */}
                        <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="space-y-2">
                                <Label>Discount Type</Label>
                                <Select
                                    value={formData.discountType}
                                    onValueChange={(val: any) => setFormData(prev => ({ ...prev, discountType: val }))}
                                >
                                    <SelectTrigger className="bg-white h-11">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="amount">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Value</Label>
                                <Input
                                    type="number"
                                    value={formData.discountValue}
                                    onChange={e => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) }))}
                                    className="bg-white h-11"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Status & Flags */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                                >
                                    <SelectTrigger className="bg-slate-50 h-11">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-3 justify-center pt-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="trending"
                                        checked={formData.isTrending}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isTrending: checked as boolean }))}
                                    />
                                    <Label htmlFor="trending" className="cursor-pointer">Trending</Label>
                                </div>
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-2">
                            <Label>Categories</Label>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl min-h-[50px] border border-slate-200">
                                {(formData.categories || []).map(cat => (
                                    <Badge key={cat} variant="secondary" className="gap-1 pl-2 pr-1 py-1 bg-white border border-slate-200">
                                        {cat}
                                        <span
                                            className="ml-1 cursor-pointer hover:text-red-500 transition-colors pointer-events-auto"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeCategory(cat);
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </span>
                                    </Badge>
                                ))}
                                <input
                                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[100px] px-2"
                                    placeholder="Add category + Enter"
                                    value={categoryInput}
                                    onChange={e => setCategoryInput(e.target.value)}
                                    onKeyDown={addCategory}
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsCreating(false)
                            setEditingOffer(null)
                        }}
                        className="rounded-full px-6 h-12 text-base font-bold bg-slate-100 hover:bg-slate-200 text-black flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-slate-400" />
                        Cancel
                    </Button>
                    <Button
                        onClick={() => saveMutation.mutate(formData)}
                        disabled={saveMutation.isPending || uploadingBanner}
                        className={`rounded-full px-8 h-12 text-base font-bold text-white shadow-lg flex items-center gap-2 ${editingOffer
                            ? 'bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 shadow-purple-200'
                            : 'bg-[#18B852] hover:bg-[#18B852]/90 shadow-green-200'
                            }`}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <div className="bg-white/20 rounded-[4px] p-0.5">
                                    <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                </div>
                                {editingOffer ? 'Save Changes' : 'Create Offer'}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-wrap gap-8 items-start py-4 overflow-x-auto pb-8">
            {offers?.map((offer) => (
                <div key={offer.id} className="flex items-center gap-6">
                    <Card className="flex flex-col w-[340px] h-[360px] rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white p-0 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(24,184,82,0.1)] relative">
                        {/* Banner Image Area */}
                        <div className="h-[160px] w-full bg-slate-100 relative">
                            {offer.bannerImage ? (
                                <img src={offer.bannerImage} alt={offer.titleEn} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                                    <Upload className="w-10 h-10 opacity-20" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold shadow-sm">
                                {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `$${offer.discountValue} OFF`}
                            </div>
                            <div className="absolute top-4 left-4">
                                <Switch
                                    checked={offer.status === 'active'}
                                    onChange={(checked) => toggleStatusMutation.mutate({ offerId: offer.id, status: checked ? 'active' : 'inactive' })}
                                    disabled={toggleStatusMutation.isPending}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col p-6 flex-grow">
                            <h3 className="text-xl font-bold text-[#1a1a1a] leading-tight mb-2 line-clamp-1">
                                {offer.titleEn}
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4">
                                {offer.descriptionEn || 'No description provided.'}
                            </p>

                            <div className="mt-auto pt-2 flex justify-between items-center">
                                <div className="flex gap-2">
                                    {offer.isTrending && <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none">Trending</Badge>}
                                </div>
                            </div>

                            <Button
                                className="mt-4 w-full bg-[#18B852] hover:bg-[#18B852]/90 text-white rounded-xl py-5 text-[15px] font-bold gap-2 shadow-[0_4px_15px_rgba(24,184,82,0.3)] transition-all active:scale-[0.98]"
                                onClick={() => setEditingOffer(offer)}
                            >
                                <SquarePen className="h-4 w-4" />
                                Manage Offer
                            </Button>
                        </div>
                    </Card>

                    {/* Visual Separator Handles */}
                    <div className="flex gap-[4px] h-full items-center">
                        <div className="w-[3px] h-10 bg-slate-200 rounded-full" />
                        <div className="w-[3px] h-10 bg-slate-200 rounded-full" />
                    </div>
                </div>
            ))}

            <Card className="flex flex-col items-center justify-between w-[340px] h-[360px] rounded-[32px] border-2 border-[#3b82f6] border-solid bg-white p-8 text-center transition-all shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <div className="flex-grow flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="relative h-24 w-24 flex items-center justify-center">
                            {/* Custom Wavy Badge Icon */}
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <path
                                    d="M50 5 L58 12 Q65 18 73 18 L82 18 Q90 18 90 27 L90 36 Q90 43 96 50 L96 50 Q90 57 90 64 L90 73 Q90 82 82 82 L73 82 Q65 82 58 88 L50 95 L42 88 Q35 82 27 82 L18 82 Q10 82 10 73 L10 64 Q10 57 4 50 L4 50 Q10 43 10 36 L10 27 Q10 18 18 18 L27 18 Q35 18 42 12 Z"
                                    fill="none"
                                    stroke="#18B852"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                />
                                <path d="M40 60 L60 40 M42 42 A3 3 0 1 1 42 41.9 M58 58 A3 3 0 1 1 58 57.9" stroke="#18B852" strokeWidth="6" strokeLinecap="round" />
                            </svg>
                            <Plus className="absolute top-0 right-0 h-8 w-8 text-[#18B852] stroke-[3]" />
                            <Plus className="absolute bottom-1 left-2 h-6 w-6 text-[#18B852] stroke-[3]" />
                        </div>
                    </div>

                    <p className="text-slate-500 font-bold text-[15px] max-w-[200px] leading-relaxed italic">
                        Get more discounts for students Yallah Admin! 🚀🔥
                    </p>
                </div>

                <Button
                    onClick={() => setIsCreating(true)}
                    className="w-full bg-[#18B852] hover:bg-[#18B852] text-white rounded-[20px] py-7 text-[16px] font-bold shadow-[0_4px_15px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98]"
                >
                    Create New Offer
                </Button>
            </Card>
        </div>
    )
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
    return (
        <div
            className={`w-[52px] h-[28px] rounded-full transition-all duration-300 cursor-pointer relative ${checked ? 'bg-[#18B852]' : 'bg-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => {
                e.preventDefault()
                if (!disabled) onChange(!checked)
            }}
        >
            <div
                className={`absolute top-1 left-1 w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 shadow-sm ${checked ? 'translate-x-[24px]' : 'translate-x-0'
                    }`}
            />
        </div>
    )
}
