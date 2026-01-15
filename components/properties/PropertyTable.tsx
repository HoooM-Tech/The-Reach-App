'use client';

import { Property } from '../../types/property';
import { StatusBadge } from '../ui/StatusBadge';
import { Eye, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '../../lib/formatters';

interface PropertyTableProps {
  properties: Property[];
}

export function PropertyTable({ properties }: PropertyTableProps) {
  const router = useRouter();

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center">
        <p className="text-gray-400">No properties found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Property
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {properties.map((property) => {
              const primaryImage = property.media.find(m => m.type === 'IMAGE') || property.media[0];
              
              return (
                <tr
                  key={property.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/developer/properties/${property.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {primaryImage ? (
                        <img
                          src={primaryImage.url}
                          alt={property.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{property.title}</p>
                        <p className="text-sm text-gray-500">{property.locationText || 'No location'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={property.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {formatPrice(property.askingPrice, property.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Eye size={16} />
                      <span className="text-sm">156</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/developer/properties/${property.id}`);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={18} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

