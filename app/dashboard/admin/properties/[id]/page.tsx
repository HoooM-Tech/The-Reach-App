'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Building2, MapPin, DollarSign } from 'lucide-react';

interface PropertyDetail {
  id: string;
  title: string;
  description: string;
  asking_price: number;
  verification_status: string;
  developer: {
    full_name: string;
    email: string;
  };
  documents?: any[];
  media?: any[];
}

export default function AdminPropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetail();
    }
  }, [propertyId]);

  const fetchPropertyDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/properties/${propertyId}`);
      if (response.ok) {
        const data = await response.json();
        setProperty(data.property);
      }
    } catch (error) {
      console.error('Failed to fetch property detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!confirm('Are you sure you want to verify this property?')) return;
    
    try {
      setVerifying(true);
      const response = await fetch(`/api/admin/properties/${propertyId}/verify`, {
        method: 'PATCH',
      });
      if (response.ok) {
        router.push('/dashboard/admin/properties');
      }
    } catch (error) {
      console.error('Failed to verify property:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    if (!confirm('Are you sure you want to reject this property?')) return;

    try {
      setRejecting(true);
      const response = await fetch(`/api/admin/properties/${propertyId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (response.ok) {
        router.push('/dashboard/admin/properties');
      }
    } catch (error) {
      console.error('Failed to reject property:', error);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628]"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-500">Property not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            title="Back button"
            aria-label="Back button"
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
            <p className="text-gray-600">by {property.developer.full_name || property.developer.email}</p>
          </div>
          <div className="flex gap-2">
            {property.verification_status === 'pending_verification' && (
              <>
                <button
                  title="Verify property button"
                  aria-label="Verify property button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {verifying ? 'Verifying...' : 'Verify Property'}
                </button>
                <button
                  title="Reject property button"
                  aria-label="Reject property button"
                  onClick={() => {
                    const reason = prompt('Please provide a rejection reason:');
                    if (reason) {
                      setRejectionReason(reason);
                      handleReject();
                    }
                  }}
                  disabled={rejecting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {rejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Image */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-400" />
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Property Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                  <p className="text-gray-900">{property.description || 'No description provided'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Asking Price</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₦{Number(property.asking_price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            {property.documents && property.documents.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Documents</h2>
                <div className="space-y-2">
                  {property.documents.map((doc: any) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {doc.document_type}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Verification Status */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Verification Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {property.verification_status === 'verified' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : property.verification_status === 'rejected' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {property.verification_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Developer Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Developer</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-900">{property.developer.full_name || 'No name'}</p>
                <p className="text-sm text-gray-500">{property.developer.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
