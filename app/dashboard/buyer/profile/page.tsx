'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bell, Menu, Share2, BarChart2, Settings, Star } from 'lucide-react';
import { buyerApi } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M+`;
  }
  return amount.toLocaleString();
}

export default function BuyerProfilePage() {
  const router = useRouter();
  const [buyer, setBuyer] = useState<{
    fullName: string;
    email: string;
    phoneNumber: string;
    profilePicture?: string;
  } | null>(null);
  const [stats, setStats] = useState<{
    totalSpent: number;
    propertiesPurchased: number;
    rating: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profileRes, statsRes] = await Promise.all([
          buyerApi.getProfile(),
          buyerApi.getStats(),
        ]);
        if (!cancelled) {
          setBuyer(profileRes.buyer);
          setStats(statsRes.stats);
        }
      } catch (e) {
        if (!cancelled) {
          setBuyer(null);
          setStats(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p className="text-[16px] text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  const displayName = buyer?.fullName || buyer?.email || 'User';
  const displayStats = stats || { totalSpent: 0, propertiesPurchased: 0, rating: 5 };

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-6 flex items-center justify-between">
        <h1 className="text-[44px] font-bold text-[#000000]">Profile</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/notifications')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-[#000000]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6 text-[#000000]" />
          </button>
        </div>
      </header>

      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-4 mb-6">
            {buyer?.profilePicture ? (
              <Image
                src={buyer.profilePicture}
                alt={displayName}
                width={80}
                height={80}
                className="rounded-full object-cover w-20 h-20"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-[#6B7280]">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h2 className="text-[28px] font-bold text-[#000000]">{displayName}</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              className="w-12 h-12 border border-[#E5E7EB] rounded-full flex items-center justify-center"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5 text-[#6B7280]" />
            </button>
            <button
              type="button"
              className="w-12 h-12 border border-[#E5E7EB] rounded-full flex items-center justify-center"
              aria-label="Analytics"
            >
              <BarChart2 className="w-5 h-5 text-[#6B7280]" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/buyer/settings')}
              className="w-12 h-12 border border-[#E5E7EB] rounded-full flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-[#6B7280]" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/buyer/settings/edit-profile')}
              className="ml-auto px-6 py-2 border border-[#E5E7EB] rounded-lg text-base font-semibold text-[#000000] hover:bg-gray-50"
            >
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-3 gap-0 p-4 border border-[#E5E7EB] rounded-xl">
            <div className="text-center">
              <p className="text-[20px] font-bold text-[#000000]">₦{formatCurrency(displayStats.totalSpent)}</p>
              <p className="text-sm text-[#6B7280]">Earned</p>
            </div>
            <div className="text-center border-x border-[#E5E7EB]">
              <p className="text-[20px] font-bold text-[#000000]">{displayStats.propertiesPurchased}+</p>
              <p className="text-sm text-[#6B7280]">Sold</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-[#000000] flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-[#F97316] text-[#F97316]" />
                {displayStats.rating.toFixed(2)}
              </p>
              <p className="text-sm text-[#6B7280]">Rating</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280] mb-2">Full Name</p>
            <p className="text-base font-medium text-[#000000]">{buyer?.fullName || '—'}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280] mb-2">Email Address</p>
            <p className="text-base font-medium text-[#000000]">{buyer?.email || '—'}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280] mb-2">Phone Number</p>
            <p className="text-base font-medium text-[#000000]">{buyer?.phoneNumber || '—'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-center py-3 text-[#EF4444] font-semibold text-base"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
