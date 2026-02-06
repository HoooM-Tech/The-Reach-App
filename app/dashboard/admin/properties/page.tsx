'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  title: string;
  asking_price: number;
  verification_status: string;
  status: string;
  created_at: string;
  developer?: {
    full_name: string;
    email: string;
  };
}

export default function AdminPropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('status') || 'all');

  useEffect(() => {
    fetchProperties();
  }, [selectedTab]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTab !== 'all') {
        params.append('status', selectedTab);
      }

      const response = await fetch(`/api/admin/properties?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Verified</span>;
      case 'pending_verification':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-reach-light p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-1">
          <div className="flex space-x-1">
            {['all', 'pending_verification', 'verified', 'rejected', 'sold'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                  router.push(`/dashboard/admin/properties?status=${tab}`);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTab === tab
                    ? 'bg-[#0A1628] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'pending_verification' ? 'Pending' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628] mx-auto"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No properties found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/properties/${property.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {property.title}
                    </h3>
                    {getStatusBadge(property.verification_status)}
                  </div>
                  <p className="text-2xl font-bold text-[#0A1628] mb-2">
                    ₦{Number(property.asking_price || 0).toLocaleString()}
                  </p>
                  {property.developer && (
                    <p className="text-sm text-gray-500 mb-4">
                      by {property.developer.full_name || property.developer.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Submitted {new Date(property.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href={`/dashboard/admin/properties/${property.id}`}
                      className="text-[#0A1628] hover:text-[#0A1628]/80 font-medium text-sm flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
