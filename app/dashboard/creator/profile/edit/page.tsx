'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { getAccessToken } from '@/lib/api/client';
import { ArrowLeft, Bell, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
}

export default function CreatorEditProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
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
        setFormData({
          full_name: data.profile.full_name || '',
          email: data.profile.email || '',
          phone: data.profile.phone || '',
          avatarUrl: data.profile.avatar_url || null,
        });
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
    if (!userLoading && !user) {
      router.push('/auth/login');
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureChange = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      // Create FormData for upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'image');
      uploadFormData.append('bucket', 'property-media');

      // Upload image
      const token = getAccessToken();
      const uploadResponse = await fetch('/api/upload/file', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadResponse.json();

      // Update form data with new image URL
      setFormData((prev) => ({ ...prev, avatarUrl: uploadData.file_url }));

      toast.success('Profile picture updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
      console.error('Image upload error:', err);
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validation
    if (!formData.full_name || formData.full_name.length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Normalize phone number if provided
    let normalizedPhone = formData.phone;
    if (formData.phone) {
      try {
        const { normalizeNigerianPhone } = await import('@/lib/utils/phone');
        normalizedPhone = normalizeNigerianPhone(formData.phone);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Invalid phone number format');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      // Update profile via API
      const token = getAccessToken();
      const response = await fetch('/api/creator/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: normalizedPhone,
          avatar_url: formData.avatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      toast.success('Profile updated successfully');
      // Navigate back to profile page
      router.push('/dashboard/creator/profile');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
      console.error('Save profile error:', err);
      toast.error(message);
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-transparent px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Edit profile</h1>
        <button
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 pb-32 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center py-6">
          <div className="w-[120px] h-[120px] rounded-full bg-gray-200 flex items-center justify-center mb-4 relative overflow-hidden">
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
              <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-white font-bold text-3xl">
                {user.full_name[0].toUpperCase()}
              </div>
            ) : (
              <div className="w-full h-full rounded-full bg-gray-300"></div>
            )}
          </div>
          <button
            onClick={handleProfilePictureChange}
            disabled={uploadingImage}
            className="text-[#F97316] font-semibold text-sm hover:text-[#D37D3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed underline"
          >
            {uploadingImage ? 'Uploading...' : 'Change profile picture'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm text-gray-500 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full text-base font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter your full name"
            />
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm text-gray-500 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full text-base font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter your email"
            />
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm text-gray-500 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full text-base font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="08100000000"
            />
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 p-6 pb-8 z-30">
          <button
            onClick={handleSave}
            disabled={saving || uploadingImage}
            className="w-full bg-[#1E3A5F] text-white font-semibold py-4 rounded-full hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
