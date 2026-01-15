'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProfileFormData {
  cacNumber: string;
  businessAddress: string;
  email: string;
  phone: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    cacNumber: '1234567890',
    businessAddress: 'Lekki phase 1',
    email: user?.email || 'llcconstruction@gmail.com',
    phone: user?.phone || '08100000005'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    // Role check is handled by layout/middleware

    // Load existing profile data
    const savedProfile = localStorage.getItem('developer-profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }
  }, [user, userLoading, router]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureChange = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle profile picture upload
      const reader = new FileReader();
      reader.onloadend = () => {
        // In a real app, you would upload this to a server
        console.log('Profile picture selected:', file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem('developer-profile', JSON.stringify(formData));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate back to profile page
      router.push('/dashboard/developer/profile');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Edit profile</h1>
        <button
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pb-32 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4 relative">
            {user?.full_name ? (
              <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg">
                {user.full_name[0].toUpperCase()}
              </div>
            ) : (
              <div className="w-full h-full rounded-full bg-gray-300"></div>
            )}
          </div>
          <button
            onClick={handleProfilePictureChange}
            className="text-[#FF6B35] font-semibold text-sm hover:text-[#D37D3E] transition-colors"
          >
            Change profile picture
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          {/* CAC Number */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-xs text-gray-500 mb-2">CAC Number</label>
            <input
              type="text"
              value={formData.cacNumber}
              onChange={(e) => handleInputChange('cacNumber', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter CAC Number"
            />
          </div>

          {/* Business Address */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-xs text-gray-500 mb-2">Business Address</label>
            <input
              type="text"
              value={formData.businessAddress}
              onChange={(e) => handleInputChange('businessAddress', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter Business Address"
            />
          </div>

          {/* Email Address */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-xs text-gray-500 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter Email Address"
            />
          </div>

          {/* Phone Number */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-xs text-gray-500 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter Phone Number"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-8">
        <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-4 rounded-full"></div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

