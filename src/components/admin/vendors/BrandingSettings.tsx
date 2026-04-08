import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Phone, Loader2, CreditCard, X, Tag, Plus, TrendingUp } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useRef, useEffect } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage, db } from "@/firebase/config"
import { collection, getDocs } from "firebase/firestore"
import type { Category } from "@/types/categories"

interface BrandingSettingsProps {
    formData: any
    setFormData: (val: any) => void
    vendorId: string
}

export function BrandingSettings({ formData, setFormData, vendorId }: BrandingSettingsProps) {
    const [uploadingProfile, setUploadingProfile] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const profileInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)
    const [tokenInput, setTokenInput] = useState("")

    const selectedCategory = categories.find(c => c.nameEnglish === formData.mainCategory)
    const availableSubcategories = selectedCategory?.subcategories || []

    useEffect(() => {
        const fetchCategories = async () => {
            const snapshot = await getDocs(collection(db, 'categories'))
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))
            cats.sort((a, b) => a.order - b.order)
            setCategories(cats)
        }
        fetchCategories()
    }, [])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profilePicture' | 'coverImage') => {
        const file = e.target.files?.[0]
        if (!file) return

        const isProfile = type === 'profilePicture'
        if (isProfile) setUploadingProfile(true)
        else setUploadingCover(true)

        try {
            const extension = file.name.split('.').pop()
            const fileName = type === 'profilePicture' ? 'logo' : 'banner'
            const storagePath = `vendors/${vendorId}/branding/${fileName}.${extension}`
            const storageRef = ref(storage, storagePath)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)

            setFormData({ ...formData, [type]: downloadURL })
        } catch (error) {
            console.error("Upload failed:", error)
        } finally {
            if (isProfile) setUploadingProfile(false)
            else setUploadingCover(false)
        }
    }




    return (
        <div className="space-y-8">
            <div className="flex gap-8">
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Profile Picture</Label>
                    <div className="relative w-36 h-36">
                        <input
                            type="file"
                            ref={profileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'profilePicture')}
                        />
                        <div className={`w-full h-full rounded-[2.5rem] flex items-center justify-center overflow-hidden transition-all ${formData.profilePicture ? 'bg-transparent' : 'bg-slate-50 border border-slate-100 shadow-sm'}`}>
                            {uploadingProfile ? (
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            ) : formData.profilePicture ? (
                                <img
                                    key={formData.profilePicture}
                                    src={formData.profilePicture}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Upload className="w-8 h-8 text-slate-300" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => profileInputRef.current?.click()}
                            disabled={uploadingProfile}
                            className="absolute -top-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <Label className="text-base font-semibold text-slate-700">Cover Image</Label>
                    <div className="relative h-36 w-full max-w-2xl group">
                        <input
                            type="file"
                            ref={coverInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'coverImage')}
                        />
                        <div className={`w-full h-full rounded-[2.5rem] flex items-center justify-center overflow-hidden transition-all group-hover:border-slate-200 ${formData.coverImage ? 'bg-transparent' : 'bg-slate-50 border border-slate-100 shadow-sm'}`}>
                            {uploadingCover ? (
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            ) : formData.coverImage ? (
                                <img
                                    key={formData.coverImage}
                                    src={formData.coverImage}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-slate-300" />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                            className="absolute -top-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-slate-500" />
                        </button>
                        <Button
                            variant="secondary"
                            type="button"
                            className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-xs h-8 rounded-full shadow-sm"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                        >
                            {uploadingCover ? 'Uploading...' : 'Change Cover'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Brand Name English */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Brand Name (English)</Label>
                    <Input
                        placeholder="Tim Hortons"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                    />
                </div>

                {/* Brand Name Arabic */}
                <div className="space-y-4 text-right">
                    <Label className="text-base font-semibold text-slate-700">Brand Name (Arabic)</Label>
                    <Input
                        placeholder="تيم هورتنز"
                        value={formData.nameAr || ""}
                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                        dir="rtl"
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                    />
                </div>

                {/* Phone Number */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Phone Number</Label>
                    <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="+974 4432 9958"
                            value={formData.phoneNumber || ""}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 pl-12 h-14 rounded-2xl text-sm"
                        />
                    </div>
                </div>

                {/* Vendor PIN */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Vendor Security PIN (4 Digits)</Label>
                    <div className="relative">
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="1234"
                            maxLength={4}
                            value={formData.pin || ""}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setFormData({ ...formData, pin: val });
                            }}
                            className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm font-mono tracking-[0.5em]"
                        />
                    </div>
                </div>

                {/* Short Description English */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Short Description (English)</Label>
                    <Input
                        placeholder="Best coffee in town"
                        value={formData.shortDescription || ""}
                        onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                    />
                </div>

                {/* Short Description Arabic */}
                <div className="space-y-4 text-right">
                    <Label className="text-base font-semibold text-slate-700">Short Description (Arabic)</Label>
                    <Input
                        placeholder="أفضل قهوة في المدينة"
                        value={formData.shortDescriptionAr || ""}
                        onChange={(e) => setFormData({ ...formData, shortDescriptionAr: e.target.value })}
                        dir="rtl"
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                    />
                </div>

                {/* Main Category */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Main Category</Label>
                    <Select
                        value={formData.mainCategory || ""}
                        onValueChange={(value) => setFormData({ ...formData, mainCategory: value, subcategory: [] })}
                    >
                        <SelectTrigger className="w-full bg-slate-50 border-none h-14 rounded-2xl px-5 text-sm">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.nameEnglish}>
                                    {cat.nameEnglish} — {cat.nameArabic}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Subcategories */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Subcategories</Label>
                    <Select
                        value=""
                        onValueChange={(value) => {
                            const current = formData.subcategory || []
                            if (!current.includes(value)) {
                                setFormData({ ...formData, subcategory: [...current, value] })
                            }
                        }}
                        disabled={!formData.mainCategory}
                    >
                        <SelectTrigger className="w-full bg-slate-50 border-none h-14 rounded-2xl px-5 text-sm">
                            <SelectValue placeholder={formData.mainCategory ? "Add a subcategory" : "Select a main category first"} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSubcategories
                                .filter(sub => !(formData.subcategory || []).includes(sub.nameEnglish))
                                .map((sub) => (
                                    <SelectItem key={sub.nameEnglish} value={sub.nameEnglish}>
                                        {sub.nameEnglish} — {sub.nameArabic}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    {(formData.subcategory || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {(formData.subcategory || []).map((sub: string) => {
                                const subData = availableSubcategories.find(s => s.nameEnglish === sub)
                                return (
                                    <Badge key={sub} variant="secondary" className="px-3 py-1.5 text-sm gap-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">
                                        <Tag className="w-3 h-3" />
                                        {subData ? `${subData.nameEnglish} — ${subData.nameArabic}` : sub}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    subcategory: (formData.subcategory || []).filter((s: string) => s !== sub)
                                                })
                                            }}
                                            className="ml-1 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Search Tokens */}
                <div className="space-y-4 md:col-span-2">
                    <Label className="text-base font-semibold text-slate-700">Search Tokens</Label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Type a keyword and press Enter"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const token = tokenInput.trim().toLowerCase()
                                    const current = formData.searchTokens || []
                                    if (token && !current.includes(token)) {
                                        setFormData({ ...formData, searchTokens: [...current, token] })
                                    }
                                    setTokenInput("")
                                }
                            }}
                            className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm flex-1"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            className="h-14 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                            onClick={() => {
                                const token = tokenInput.trim().toLowerCase()
                                const current = formData.searchTokens || []
                                if (token && !current.includes(token)) {
                                    setFormData({ ...formData, searchTokens: [...current, token] })
                                }
                                setTokenInput("")
                            }}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    {(formData.searchTokens || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {(formData.searchTokens || []).map((token: string) => (
                                <Badge key={token} variant="secondary" className="px-3 py-1.5 text-sm gap-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">
                                    <Tag className="w-3 h-3" />
                                    {token}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                searchTokens: (formData.searchTokens || []).filter((t: string) => t !== token)
                                            })
                                        }}
                                        className="ml-1 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

            </div >

            {/* XCard & Loyalty */}
            <div className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex items-center space-x-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <Checkbox
                        id="isTrending"
                        checked={formData.isTrending || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, isTrending: !!checked })}
                        className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-400" />
                        <Label htmlFor="isTrending" className="text-base font-semibold text-slate-700 cursor-pointer">
                            Trending Vendor
                        </Label>
                    </div>
                </div>

                <div className="flex items-center space-x-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <Checkbox
                        id="xcard"
                        checked={formData.xcard || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, xcard: !!checked })}
                        className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                        <Label htmlFor="xcard" className="text-base font-semibold text-slate-700 cursor-pointer">
                            Enable XCard Loyalty Program
                        </Label>
                    </div>
                </div>

                {formData.xcard && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        {["Bronze", "Silver", "Gold"].map((tier, i) => (
                            <div key={tier} className="space-y-3">
                                <Label className="text-sm font-medium text-slate-600 ml-1">
                                    {tier} Tier
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.loyalty?.[i] ?? ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0
                                            const loyalty = [formData.loyalty?.[0] ?? 0, formData.loyalty?.[1] ?? 0, formData.loyalty?.[2] ?? 0]
                                            loyalty[i] = val
                                            setFormData({ ...formData, loyalty })
                                        }}
                                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 pr-14 text-sm"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">QAR</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    )
}
