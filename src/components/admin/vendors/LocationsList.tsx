import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import type { VendorLocation } from '@/queries'

interface LocationsListProps {
  locations: VendorLocation[]
  onChange: (locations: VendorLocation[]) => void
}

export function LocationsList({ locations, onChange }: LocationsListProps) {
  const addLocation = () => {
    onChange([
      ...locations,
      {
        latitude: 0,
        longitude: 0,
        label: `Branch ${locations.length + 1}`,
        isDefault: locations.length === 0,
      },
    ])
  }

  const removeLocation = (index: number) => {
    const updated = locations.filter((_, i) => i !== index)
    // Ensure at least one default if locations remain
    if (updated.length > 0) {
      const hasDefault = updated.some(l => l.isDefault)
      if (!hasDefault) {
        updated[0].isDefault = true
      }
    }
    onChange(updated)
  }

  const updateLocation = (index: number, field: keyof VendorLocation, value: any) => {
    const updated = [...locations]
    updated[index] = { ...updated[index], [field]: value }
    
    // If setting this location as default, unset others
    if (field === 'isDefault' && value) {
      updated.forEach((loc, i) => {
        if (i !== index) {
          loc.isDefault = false
        }
      })
    }
    
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      {locations.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-slate-500 mb-4">No locations added yet</p>
          <Button onClick={addLocation} className="bg-brand-green hover:bg-brand-green/90">
            <Plus className="w-4 h-4 mr-2" /> Add First Location
          </Button>
        </div>
      ) : (
        locations.map((loc, idx) => (
          <div key={idx} className="p-6 border border-slate-200 rounded-lg space-y-4 bg-slate-50">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Location {idx + 1}</h3>
                {loc.isDefault && <span className="text-xs bg-brand-green text-white px-2 py-1 rounded">Default</span>}
              </div>
              {locations.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocation(idx)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Label */}
              <div>
                <Label className="text-sm font-medium">Branch Label</Label>
                <Input
                  value={loc.label || ''}
                  onChange={(e) => updateLocation(idx, 'label', e.target.value)}
                  placeholder="e.g., Main Branch, Mall Location"
                  className="mt-1"
                />
              </div>

              {/* Default Checkbox */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loc.isDefault ?? false}
                    onChange={(e) => updateLocation(idx, 'isDefault', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium">Set as default location</span>
                </label>
              </div>

              {/* Latitude */}
              <div>
                <Label className="text-sm font-medium">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={loc.latitude || ''}
                  onChange={(e) => updateLocation(idx, 'latitude', parseFloat(e.target.value) || 0)}
                  placeholder="25.2854"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Range: -90 to 90</p>
              </div>

              {/* Longitude */}
              <div>
                <Label className="text-sm font-medium">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={loc.longitude || ''}
                  onChange={(e) => updateLocation(idx, 'longitude', parseFloat(e.target.value) || 0)}
                  placeholder="51.5310"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Range: -180 to 180</p>
              </div>

              {/* Address English */}
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Address (English)</Label>
                <Input
                  value={loc.address || ''}
                  onChange={(e) => updateLocation(idx, 'address', e.target.value)}
                  placeholder="e.g., Villaggio Mall, Level 2"
                  className="mt-1"
                />
              </div>

              {/* Address Arabic */}
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Address (Arabic)</Label>
                <Input
                  value={loc.addressAr || ''}
                  onChange={(e) => updateLocation(idx, 'addressAr', e.target.value)}
                  placeholder="مثال: فيلاجيو مول، الطابق الثاني"
                  dir="rtl"
                  className="mt-1"
                />
              </div>
            </div>

            {/* OpenStreetMap preview */}
            {typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && loc.latitude !== 0 && loc.longitude !== 0 && (
              <div className="rounded-lg overflow-hidden border border-slate-200 mt-4">
                <iframe
                  title={`Location ${idx + 1} Preview`}
                  width="100%"
                  height="250"
                  frameBorder="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude - 0.01},${loc.latitude - 0.01},${loc.longitude + 0.01},${loc.latitude + 0.01}&layer=mapnik&marker=${loc.latitude},${loc.longitude}`}
                  style={{ borderRadius: '0.5rem' }}
                />
              </div>
            )}
          </div>
        ))
      )}

      <Button 
        onClick={addLocation} 
        className="w-full bg-brand-green hover:bg-brand-green/90"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Another Location
      </Button>
    </div>
  )
}
