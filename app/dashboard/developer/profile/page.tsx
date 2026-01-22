'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { profileApi, ApiError } from '@/lib/api/client';
import { Upload, BarChart3, Settings, Star, LogOut } from 'lucide-react';

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
  const { user, isLoading: userLoading, logout } = useUser();
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

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        await logout();
        router.push('/auth/login');
      } catch (error) {
        console.error('Logout error:', error);
        router.push('/auth/login');
      }
    }
  };

  const formatEarned = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(0)}M+`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K+`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-primary border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header is handled by DashboardShell */}
      
      {/* Main Content */}
      <div className="px-4 pb-8 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {/* Profile Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Profile Picture */}
            <div className="w-[120px] h-[120px] rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profileData?.avatarUrl ? (
                <img
                  src={profileData.avatarUrl}
                  alt={user?.full_name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : user?.full_name ? (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-white font-bold text-3xl">
                  {user.full_name[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-gray-300"></div>
              )}
            </div>

            {/* Company Info */}
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">
                  {profileData?.companyName || user?.full_name || 'Developer'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  profileData?.verificationStatus === 'Verified' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {profileData?.verificationStatus}
                </span>
              </div>

              {/* Action Icons Row */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Upload"
                  title="Upload"
                >
                  <Upload size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/developer/analytics')}
                  className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Analytics"
                  title="Analytics"
                >
                  <BarChart3 size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/developer/settings')}
                  className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/developer/profile/edit')}
                  className="px-4 py-2 bg-white border border-[#1E3A5F] text-[#1E3A5F] rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm ml-auto"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {formatEarned(profileData?.earned || 0)}
              </p>
              <p className="text-xs text-gray-500">Earned</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {profileData?.sold || 0}{profileData?.sold && profileData.sold > 0 ? '+' : ''}
              </p>
              <p className="text-xs text-gray-500">Sold</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <p className="text-2xl font-bold text-gray-900">
                  {(profileData?.rating || 0).toFixed(2)}
                </p>
              </div>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>
        </div>

        {/* Information Fields */}
        <div className="space-y-3">
          {profileData?.cacNumber && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">CAC Number</p>
              <p className="text-sm font-semibold text-gray-900">{profileData.cacNumber}</p>
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
              <p className="text-sm font-semibold text-gray-900">{profileData.phone}</p>
            </div>
          )}
        </div>

        {/* Log Out Button */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleLogout}
            className="w-full text-center text-red-600 font-semibold py-3 hover:text-red-700 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
