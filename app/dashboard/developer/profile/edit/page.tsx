'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { profileApi, uploadApi, ApiError } from '@/lib/api/client';
import { ArrowLeft, Bell, Upload, AlertCircle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProfileFormData {
  cacNumber: string;
  businessAddress: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    cacNumber: '',
    businessAddress: '',
    email: '',
    phone: '',
    avatarUrl: null,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
        setFormData({
          cacNumber: response.profile.cac_number || '',
          businessAddress: response.profile.business_address || '',
          email: response.profile.email,
          phone: response.profile.phone || '',
          avatarUrl: response.profile.avatar_url || null,
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

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureChange = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      // Upload image to Supabase Storage
      // Using 'property-media' bucket (which should already exist)
      // To use a dedicated 'avatars' or 'profile-pictures' bucket, create it in Supabase Storage first
      const uploadResponse = await uploadApi.uploadFile(file, 'image', 'property-media');
      
      // Update form data with new image URL
      setFormData(prev => ({ ...prev, avatarUrl: uploadResponse.file_url }));
      
      // Optionally update profile immediately
      await profileApi.updateProfile({ avatar_url: uploadResponse.file_url });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to upload image';
      setError(message);
      console.error('Image upload error:', err);
      alert(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    setError(null);

    try {
      // Update profile via API
      await profileApi.updateProfile({
        full_name: user.full_name, // Keep existing name if not editable
        phone: formData.phone || undefined,
        company_name: (user as any).company_name, // Keep existing if not in form
        cac_number: formData.cacNumber || undefined,
        business_address: formData.businessAddress || undefined,
        avatar_url: formData.avatarUrl || undefined,
      });
      
      // Navigate back to profile page
      router.push('/dashboard/developer/profile');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save profile';
      setError(message);
      console.error('Save profile error:', err);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-reach-bg flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-primary border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-reach-bg">
      {/* Header - Desktop only (mobile header handled by DashboardShell) */}
      <header className="hidden lg:flex bg-transparent px-6 py-4 items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Edit profile</h1>
        <button
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 pb-32 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4 relative overflow-hidden">
            {uploadingImage ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
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
          <button
            onClick={handleProfilePictureChange}
            disabled={uploadingImage}
            className="text-[#FF6B35] font-semibold text-sm hover:text-[#D37D3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingImage ? 'Uploading...' : 'Change profile picture'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload profile picture"
            title="Upload profile picture"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          {/* CAC Number */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label htmlFor="cacNumber" className="block text-xs text-gray-500 mb-2">CAC Number</label>
            <input
              id="cacNumber"
              type="text"
              value={formData.cacNumber}
              onChange={(e) => handleInputChange('cacNumber', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter CAC Number"
              aria-label="CAC Number"
            />
          </div>

          {/* Business Address */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label htmlFor="businessAddress" className="block text-xs text-gray-500 mb-2">Business Address</label>
            <input
              id="businessAddress"
              type="text"
              value={formData.businessAddress}
              onChange={(e) => handleInputChange('businessAddress', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter Business Address"
              aria-label="Business Address"
            />
          </div>

          {/* Email Address - Read only */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label htmlFor="email" className="block text-xs text-gray-500 mb-2">Email Address</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              readOnly
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none p-0 opacity-60"
              aria-label="Email Address (read-only)"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone Number */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label htmlFor="phone" className="block text-xs text-gray-500 mb-2">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter Phone Number"
              aria-label="Phone Number"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-8">
        <button
          onClick={handleSave}
          disabled={saving || uploadingImage}
          className="w-full bg-reach-primary text-white font-semibold py-4 rounded-2xl hover:bg-reach-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
