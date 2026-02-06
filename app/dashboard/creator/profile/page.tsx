'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { getAccessToken } from '@/lib/api/client';
import { Upload, BarChart3, Settings, Star, LogOut, Bell, Menu, CheckCircle2, Instagram, Facebook, Link as LinkIcon, Loader2, Twitter } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface ProfileData {
  email: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  tier: number;
}

interface Stats {
  earned: number;
  sold: number;
  rating: number;
}

interface SocialAccount {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'twitter';
  connected: boolean;
  handle: string | null;
  followers?: number;
  engagementRate?: number;
}

interface SocialVerificationState {
  [key: string]: {
    url: string;
    verifying: boolean;
    error: string | null;
  };
}

export default function CreatorProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading, logout } = useUser();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ earned: 0, sold: 0, rating: 5.0 });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [verificationState, setVerificationState] = useState<SocialVerificationState>({
    instagram: { url: '', verifying: false, error: null },
    facebook: { url: '', verifying: false, error: null },
    tiktok: { url: '', verifying: false, error: null },
    twitter: { url: '', verifying: false, error: null },
  });

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
      const token = getAccessToken();
      const response = await fetch('/api/creator/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();

      if (!abortController.signal.aborted) {
        setProfileData(data.profile);
        setStats(data.stats || { earned: 0, sold: 0, rating: 5.0 });
        setSocialAccounts(data.socialAccounts || []);
      }
    } catch (err) {
      if (abortController.signal.aborted) return;

      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      console.error('Profile fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id, userLoading]);

  useEffect(() => {
    // Middleware handles authentication - no need to redirect here
    if (!userLoading && user) {
      fetchProfile();
    }

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
    if (amount >= 10000000) {
      return `₦${(amount / 1000000).toFixed(0)}M+`;
    } else if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M+`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K+`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  const getTierDisplay = (tier: number) => {
    return `Tier${tier}`;
  };

  const handleSocialUrlChange = (platform: string, url: string) => {
    setVerificationState((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        url,
        error: null,
      },
    }));
  };

  const handleVerifySocial = async (platform: string) => {
    const state = verificationState[platform];
    if (!state.url.trim()) {
      setVerificationState((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          error: 'Please enter a valid URL',
        },
      }));
      return;
    }

    setVerificationState((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        verifying: true,
        error: null,
      },
    }));

    try {
      const token = getAccessToken();
      const response = await fetch('/api/creator/social-accounts/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          platform,
          url: state.url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Refresh profile data to get updated tier and social accounts
      await fetchProfile();

      // Show success message
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} verified successfully!${data.tier > 0 ? ` Tier updated to ${data.tier}.` : ''}`);

      // Clear the URL input
      setVerificationState((prev) => ({
        ...prev,
        [platform]: {
          url: '',
          verifying: false,
          error: null,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setVerificationState((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          verifying: false,
          error: message,
        },
      }));
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram size={20} className="text-pink-600" />;
      case 'facebook':
        return <Facebook size={20} className="text-blue-600" />;
      case 'tiktok':
        return <LinkIcon size={20} className="text-black" />;
      case 'twitter':
        return <Twitter size={20} className="text-blue-400" />;
      default:
        return null;
    }
  };

  const handleDisconnectSocial = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}? This may affect your tier.`)) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(`/api/creator/social-accounts/disconnect?platform=${platform}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      // Refresh profile data to get updated tier
      await fetchProfile();

      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected${data.tier !== undefined ? `. Tier updated to ${data.tier}.` : '.'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      toast.error(message);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#1E3A5F]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      {/* <Header /> 
      <div className="bg-[#FFF5F5] px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-bold text-gray-900">Profile</h1>
          <div className="flex items-center gap-3">
            <button
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-700" />
            </button>
            <button
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              aria-label="Menu"
            >
              <Menu size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>
      */}

      {/* Main Content */}
      <div className="px-4 pb-8 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {/* Profile Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Profile Picture */}
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profileData?.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt={profileData.full_name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : profileData?.full_name ? (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-white font-bold text-2xl">
                  {profileData.full_name[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-gray-300"></div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">
                  {profileData?.full_name || user?.full_name || 'Creator'}
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-base text-gray-600">
                    {getTierDisplay(profileData?.tier ?? 0)}
                  </span>
                  <CheckCircle2 size={16} className="text-red-500" />
                </div>
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
                  onClick={() => router.push('/dashboard/creator/analytics')}
                  className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Analytics"
                  title="Analytics"
                >
                  <BarChart3 size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/creator/settings')}
                  className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/creator/profile/edit')}
                  className="px-5 py-2 bg-white border border-[#1E3A5F] text-[#1E3A5F] rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm ml-auto"
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
                {formatEarned(stats.earned)}
              </p>
              <p className="text-sm text-gray-500">Earned</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stats.sold}{stats.sold > 0 ? '+' : ''}
              </p>
              <p className="text-sm text-gray-500">Sold</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.rating.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-gray-500">Rating</p>
            </div>
          </div>
        </div>

        {/* Information Fields */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Full Name</p>
            <p className="text-base font-semibold text-gray-900">
              {profileData?.full_name || 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Email Address</p>
            <p className="text-base font-semibold text-gray-900">
              {profileData?.email || 'N/A'}
            </p>
          </div>

          {profileData?.phone && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Phone Number</p>
              <p className="text-base font-semibold text-gray-900">
                {profileData.phone}
              </p>
            </div>
          )}
        </div>

        {/* Social Accounts Section */}
        <div className="mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Social Accounts</h3>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            {['instagram', 'tiktok', 'twitter'].map((platform) => {
              const account = socialAccounts.find((a) => a.platform === platform);
              const isConnected = account?.connected || false;
              const state = verificationState[platform];

              return (
                <div key={platform} className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getPlatformIcon(platform)}
                      <span className="text-base font-medium text-gray-900 capitalize break-words">
                        {platform === 'twitter' ? 'Twitter (X)' : platform}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      {isConnected && account?.handle && (
                        <div className="text-left sm:text-right min-w-0">
                          <span className="text-sm text-gray-500 block break-words">{account.handle}</span>
                          {account.followers && (
                            <span className="text-xs text-gray-400">
                              {account.followers.toLocaleString()} followers
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                      {isConnected && (
                        <button
                          onClick={() => handleDisconnectSocial(platform)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors self-start sm:self-auto"
                          title="Disconnect"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>

                  {!isConnected && (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          value={state.url}
                          onChange={(e) => handleSocialUrlChange(platform, e.target.value)}
                          placeholder={`Enter ${platform === 'twitter' ? 'Twitter/X' : platform} profile URL`}
                          className="w-full sm:flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none"
                          disabled={state.verifying}
                        />
                        <button
                          onClick={() => handleVerifySocial(platform)}
                          disabled={state.verifying || !state.url.trim()}
                          className="w-full sm:w-auto px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {state.verifying ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify & Connect'
                          )}
                        </button>
                      </div>
                      {state.error && (
                        <p className="text-sm text-red-600">{state.error}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Log Out Button */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleLogout}
            className="w-full text-center text-[#DC2626] font-semibold py-3 hover:text-red-700 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
