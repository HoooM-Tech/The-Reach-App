'use client';

import { Property } from '../../types/property';
import { Eye, Users, Star, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '../ui/StatusBadge';

interface PropertyCardProps {
  property: Property;
  showStatus?: boolean;
}

export function PropertyCard({ property, showStatus = false }: PropertyCardProps) {
  const router = useRouter();
  const primaryImage = property.media.find(m => m.type === 'IMAGE') || property.media[0];

  const formatPrice = (price?: number, currency: string = 'NGN') => {
    if (!price) return 'Price on request';
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : 'C$';
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <div
      onClick={() => router.push(`/properties/${property.id}`)}
      className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
    >
      <div className="relative h-56">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        {showStatus && (
          <div className="absolute top-4 left-4">
            <StatusBadge status={property.status} />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-reach-navy leading-tight flex-1">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 text-reach-orange ml-2">
            <Star size={14} fill="currentColor" />
            <span className="text-xs font-bold">4.8(20)</span>
          </div>
        </div>

        {property.locationText && (
          <div className="flex items-center gap-1.5 text-reach-red mb-3">
            <MapPin size={14} />
            <p className="text-xs font-medium truncate">{property.locationText}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <p className="font-bold text-lg text-reach-navy">
            {formatPrice(property.askingPrice, property.currency)}
          </p>
          <div className="flex gap-4 text-gray-400">
            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span className="text-xs font-semibold">156</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span className="text-xs font-semibold">10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

