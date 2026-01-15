'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Menu, Upload, BarChart3, Settings, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProfileData {
  cacNumber: string;
  businessAddress: string;
  email: string;
  phone: string;
  earned: number;
  sold: number;
  rating: number;
  verificationStatus: 'Pending' | 'Verified';
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [profileData, setProfileData] = useState<ProfileData>({
    cacNumber: '1234567890',
    businessAddress: 'Lekki phase 1',
    email: user?.email || 'llcconstruction@gmail.com',
    phone: user?.phone || '08100000005',
    earned: 10000000,
    sold: 20,
    rating: 5.00,
    verificationStatus: 'Pending'
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Role check is handled by layout/middleware
    // Load profile data from localStorage or API
    const savedProfile = localStorage.getItem('developer-profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfileData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }
  }, [user, userLoading, router]);

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
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/notifications')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
          <button
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Menu size={20} className="text-gray-700" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 pb-8 space-y-6">
          {/* Profile Summary Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            {/* Profile Picture */}
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.full_name ? (
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
                <h2 className="text-xl font-bold text-gray-900">{user?.full_name || 'Developer'}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  profileData.verificationStatus === 'Verified' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {profileData.verificationStatus}
                </span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-3 mb-4">
                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Upload size={18} className="text-gray-600" />
                </button>
                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <BarChart3 size={18} className="text-gray-600" />
                </button>
                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
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
              <p className="text-lg font-bold text-gray-900">₦{(profileData.earned / 1000000).toFixed(0)}M+</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sold</p>
              <p className="text-lg font-bold text-gray-900">{profileData.sold}+</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Rating</p>
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <p className="text-lg font-bold text-gray-900">{profileData.rating.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">CAC Number</p>
            <p className="text-sm font-semibold text-gray-900">{profileData.cacNumber}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Business Address</p>
            <p className="text-sm font-semibold text-gray-900">{profileData.businessAddress}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Email Address</p>
            <p className="text-sm font-semibold text-gray-900">{profileData.email}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Phone Number</p>
            <p className="text-sm font-semibold text-gray-900">{profileData.phone}</p>
          </div>
        </div>
      </div>

      {/* Home Indicator */}
      <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-2 rounded-full"></div>
    </div>
  );
}

