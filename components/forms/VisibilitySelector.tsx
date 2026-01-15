'use client';

import { Visibility } from '../../types/property';

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
}

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Visibility</label>
      <div className="space-y-2">
        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="visibility"
            value={Visibility.ALL_CREATORS}
            checked={value === Visibility.ALL_CREATORS}
            onChange={(e) => onChange(e.target.value as Visibility)}
            className="w-4 h-4 text-reach-red focus:ring-reach-red"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">All Creators</p>
            <p className="text-xs text-gray-500">Visible to all creators on the platform</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="visibility"
            value={Visibility.EXCLUSIVE_CREATORS}
            checked={value === Visibility.EXCLUSIVE_CREATORS}
            onChange={(e) => onChange(e.target.value as Visibility)}
            className="w-4 h-4 text-reach-red focus:ring-reach-red"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Exclusive Creators</p>
            <p className="text-xs text-gray-500">Visible only to selected creators (coming soon)</p>
          </div>
        </label>
      </div>
    </div>
  );
}

