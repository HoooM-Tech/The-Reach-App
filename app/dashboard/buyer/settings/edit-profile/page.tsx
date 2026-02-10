'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell } from 'lucide-react';
import { buyerApi } from '@/lib/api/client';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function EditProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    buyerApi.getProfile().then((res) => {
      if (!cancelled) {
        setFormData({
          fullName: res.buyer.fullName,
          email: res.buyer.email,
          phoneNumber: res.buyer.phoneNumber,
        });
        if (res.buyer.profilePicture) setPreviewUrl(res.buyer.profilePicture);
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setProfilePicture(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (profilePicture) {
        const fd = new FormData();
        fd.append('fullName', formData.fullName);
        fd.append('email', formData.email);
        fd.append('phoneNumber', formData.phoneNumber);
        fd.append('profilePicture', profilePicture);
        await buyerApi.updateProfile(fd);
      } else {
        await buyerApi.updateProfile({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
        });
      }
      toast.success('Profile updated successfully');
      router.push('/dashboard/buyer/profile');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p className="text-base text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 text-[#000000]" />
        </button>
        <h1 className="text-lg font-semibold text-[#000000]">Edit profile</h1>
        <button
          type="button"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-[#000000]" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-8 pb-32">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F97316] to-[#EC4899] flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {formData.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <input
                type="file"
                id="profile-picture"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <label
              htmlFor="profile-picture"
              className="text-[#F97316] text-base font-medium underline cursor-pointer"
            >
              Change profile picture
            </label>
          </div>

          <div className="mb-5">
            <label className="block text-sm text-[#6B7280] mb-2">Full Name</label>
            <input
              title="Full Name input"
              aria-label="Full Name input"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg text-base text-[#000000] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1A3B5D] focus:border-transparent"
              required
            />
          </div>
          <div className="mb-5">
            <label className="block text-sm text-[#6B7280] mb-2">Email Address</label>
            <input
              title="Email Address input"
              aria-label="Email Address input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg text-base text-[#000000] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1A3B5D] focus:border-transparent"
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm text-[#6B7280] mb-2">Phone Number</label>
            <input
              title="Phone Number input"
              aria-label="Phone Number input"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg text-base text-[#000000] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1A3B5D] focus:border-transparent"
              required
            />
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-6 bg-[#F5F0EB]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-base disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
