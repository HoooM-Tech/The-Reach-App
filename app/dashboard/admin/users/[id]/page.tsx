'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Building2, Wallet, CheckCircle, XCircle, UserX, Mail, Phone, Calendar } from 'lucide-react';

interface UserDetail {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  kyc_status: string;
  tier: number | null;
  created_at: string;
  properties?: any[];
  wallet?: any;
  transactions?: any[];
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PATCH',
      });
      if (response.ok) {
        fetchUserDetail();
      }
    } catch (error) {
      console.error('Failed to verify user:', error);
    }
  };

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    // TODO: Implement suspend
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-500">User not found</p>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.full_name || user.email}
            </h1>
            <p className="text-gray-600">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {user.kyc_status !== 'verified' && (
              <button
                title="Verify account button"
                aria-label="Verify account button"
                onClick={handleVerify}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Verify Account
              </button>
            )}
            <button
              title="Suspend button"
              aria-label="Suspend button"
              onClick={handleSuspend}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <UserX className="w-4 h-4" />
              Suspend
            </button>
          </div>
        </div>

        {/* User Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="text-gray-900">{user.full_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role-specific information */}
            {user.role === 'developer' && user.properties && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Properties</h2>
                <p className="text-gray-600">Total: {user.properties.length}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Account Status</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Verification</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                    user.kyc_status === 'verified' ? 'bg-green-100 text-green-700' :
                    user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {user.kyc_status}
                  </span>
                </div>
                {user.role === 'creator' && user.tier && (
                  <div>
                    <p className="text-sm text-gray-500">Tier</p>
                    <p className="text-gray-900 font-medium">Tier {user.tier}</p>
                  </div>
                )}
              </div>
            </div>

            {user.wallet && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Wallet</h3>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{Number(user.wallet.available_balance || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">Available Balance</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
