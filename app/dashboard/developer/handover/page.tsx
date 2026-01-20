'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Cloud, FileText, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function StartHandoverPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    // Role check is handled by layout/middleware
  }, [user, userLoading, router]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload jpeg, png, or svg files only.');
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      alert('File size exceeds 2MB limit. Please upload a smaller file.');
      return;
    }

    setUploadedFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    if (!uploadedFile) {
      alert('Please upload an ownership document to continue.');
      return;
    }
    // Navigate to next step (will be added when user uploads next screen)
    router.push('/dashboard/developer/handover/step-2');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Mobile Status Bar Simulation */}
      <div className="bg-transparent h-0">
        {/* Time and status icons would be here in real mobile app */}
      </div>

      {/* Header */}
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Start handover</h1>
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Progress Indicator */}
      <div className="px-6 pt-2 pb-4">
        <div className="flex gap-1.5">
          <div className="h-1.5 flex-1 bg-[#FF6B35] rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pt-4 pb-32">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Ownership Document</h2>
          <p className="text-sm text-gray-600 mb-6">
            This is to prove that the developer has the legal right to transfer possession.
          </p>

          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
              ${dragActive 
                ? 'border-[#FF6B35] bg-[#FF6B35]/5' 
                : uploadedFile 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml"
              onChange={handleFileInput}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="text-green-600" size={32} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <X size={16} />
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Cloud className="text-gray-400" size={48} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Upload property document</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <span>2MB Max</span>
                    <span>•</span>
                    <span>jpeg, png, svg</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (Role Switcher) */}
      <div className="fixed bottom-20 right-6 z-50">
        <button className="w-12 h-12 rounded-full bg-gray-800 border-2 border-green-500 flex items-center justify-center text-white font-bold shadow-lg hover:scale-105 transition-transform">
          R
        </button>
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-8">
        <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-4 rounded-full"></div>
        <button
          onClick={handleContinue}
          disabled={!uploadedFile}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

