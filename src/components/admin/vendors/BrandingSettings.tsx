import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"
import { Upload, Phone, Loader2, CreditCard } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useRef } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/firebase/config"

interface BrandingSettingsProps {
    formData: any
    setFormData: (val: any) => void
    vendorId: string
}

export function BrandingSettings({ formData, setFormData, vendorId }: BrandingSettingsProps) {
    const [uploadingProfile, setUploadingProfile] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const profileInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

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

                {/* Short Description */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Short Description (English)</Label>
                    <Textarea
                        placeholder="Tim Hortons"
                        value={formData.shortDescriptionEn || ""}
                        onChange={(e) => setFormData({ ...formData, shortDescriptionEn: e.target.value })}
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 min-h-[160px] rounded-2xl p-5 text-sm"
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Short Description (Arabic)</Label>
                    <Textarea
                        placeholder="Tim Hortons"
                        value={formData.shortDescriptionAr || ""}
                        onChange={(e) => setFormData({ ...formData, shortDescriptionAr: e.target.value })}
                        dir="rtl"
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 min-h-[160px] rounded-2xl p-5 text-sm"
                    />
                </div>


            </div >

            {/* XCard & Loyalty */}
            <div className="space-y-6 pt-8 border-t border-slate-100">
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
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="space-y-3">
                                <Label className="text-sm font-medium text-slate-600 ml-1">
                                    Loyalty Tier {i + 1} Amount
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder={`Tier ${i + 1} Amount`}
                                        value={formData.loyalty?.[i] ?? ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const newLoyalty = [...(formData.loyalty || [])];
                                            // Fill with zeros if array is too small
                                            while (newLoyalty.length < 3) newLoyalty.push(0);
                                            newLoyalty[i] = isNaN(val) ? 0 : val;
                                            setFormData({ ...formData, loyalty: newLoyalty });
                                        }}
                                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        QAR
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    )
}
