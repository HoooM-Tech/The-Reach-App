'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { profileApi, ApiError } from '@/lib/api/client';
import { Upload, BarChart3, Settings, Star, AlertCircle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProfileData {
  cacNumber: string | null;
  businessAddress: string | null;
  email: string;
  phone: string | null;
  earned: number;
  sold: number;
  rating: number;
  verificationStatus: 'Pending' | 'Verified';
  avatarUrl?: string | null;
  companyName?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch profile data from API
  const fetchProfile = useCallback(async () => {
    if (!user?.id || userLoading) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await profileApi.getProfile();

      if (!abortController.signal.aborted) {
        setProfileData({
          cacNumber: response.profile.cac_number || null,
          businessAddress: response.profile.business_address || null,
          email: response.profile.email,
          phone: response.profile.phone || null,
          earned: response.stats?.earned || 0,
          sold: response.stats?.sold || 0,
          rating: response.stats?.rating || 0,
          verificationStatus: response.profile.kyc_status === 'verified' ? 'Verified' : 'Pending',
          avatarUrl: response.profile.avatar_url || null,
          companyName: response.profile.company_name || null,
        });
      }
    } catch (err) {
      if (abortController.signal.aborted) return;

      const message = err instanceof ApiError ? err.message : 'Failed to load profile';
      setError(message);
      console.error('Profile fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id, userLoading]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    fetchProfile();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, userLoading, router, fetchProfile]);

  if (userLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-reach-bg">
      {/* Header is handled by DashboardShell */}
      
      {/* Main Content */}
      <div className="px-6 pb-8 space-y-6">
          {/* Profile Summary Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            {/* Profile Picture */}
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profileData?.avatarUrl ? (
                <img
                  src={profileData.avatarUrl}
                  alt={user?.full_name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : user?.full_name ? (
                <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg">
                  {user.full_name[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-gray-300"></div>
              )}
            </div>

            {/* Name and Actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{user?.full_name || profileData?.companyName || 'Developer'}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  profileData?.verificationStatus === 'Verified' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {profileData?.verificationStatus}
                </span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label="Upload"
                  title="Upload"
                >
                  <Upload size={18} className="text-gray-600" />
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label="Metrics"
                  title="Metrics"
                >
                  <BarChart3 size={18} className="text-gray-600" />
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings size={18} className="text-gray-600" />
                </button>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => router.push('/dashboard/developer/profile/edit')}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">Earned</p>
              <p className="text-lg font-bold text-gray-900">₦{((profileData?.earned || 0) / 1000000).toFixed(0)}M+</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sold</p>
              <p className="text-lg font-bold text-gray-900">{profileData?.sold || 0}{profileData?.sold && profileData.sold > 0 ? '+' : ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Rating</p>
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <p className="text-lg font-bold text-gray-900">{(profileData?.rating || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="space-y-3">
          {profileData?.cacNumber && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">CAC Number</p>
              <p className="text-sm font-semibold text-gray-900">{profileData?.cacNumber}</p>
            </div>
          )}

          {profileData?.businessAddress && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Business Address</p>
              <p className="text-sm font-semibold text-gray-900">{profileData.businessAddress}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Email Address</p>
            <p className="text-sm font-semibold text-gray-900">{profileData?.email || ''}</p>
          </div>

          {profileData?.phone && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Phone Number</p>
              <p className="text-sm font-semibold text-gray-900">{profileData?.phone}</p>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}

