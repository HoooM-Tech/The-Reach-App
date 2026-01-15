'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@/contexts/UserContext';
import { developerApi } from '@/lib/api/client';
import { propertyFormSchema, PropertyFormData } from '@/lib/validations/propertySchema';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { DocumentUploader } from '@/components/forms/DocumentUploader';
import { VisibilitySelector } from '@/components/forms/VisibilitySelector';
import { PropertyMedia, PropertyDocument, ListingType, PropertyStatus } from '@/types/property';
import { ArrowLeft, Bell, ChevronDown, Upload, X, CheckCircle, Cloud, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

const TOTAL_STEPS = 5;

export default function NewPropertyPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [media, setMedia] = useState<PropertyMedia[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema) as any,
    defaultValues: {
      listingType: ListingType.SALE,
      visibility: 'ALL_CREATORS' as any,
      currency: 'NGN',
      country: 'Nigeria',
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const listingType = watch('listingType');
  const visibility = watch('visibility');
  const askingPrice = watch('askingPrice');
  const minAcceptablePrice = watch('minAcceptablePrice');
  const propertyTitle = watch('title');
  const propertyLocation = watch('locationText');
  const bedrooms = watch('bedrooms');
  const bathrooms = watch('bathrooms');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Role check is handled by layout/middleware
    if (user && user.role !== 'developer') {
      router.push('/dashboard');
      return;
    }
  }, [user, userLoading, router]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/dashboard/developer/properties');
    }
  };

  const handleQuickPrice = (price: number, type: 'max' | 'min') => {
    if (type === 'max') {
      setValue('askingPrice', price);
    } else {
      setValue('minAcceptablePrice', price);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocument(file);
    }
  };

  const removeDocument = () => {
    setUploadedDocument(null);
  };

  const onSubmit = async (data: PropertyFormData, action: 'draft' | 'verify') => {
    try {
      setIsSubmitting(true);

      if (action === 'verify') {
        // Validate required media
        const images = media.filter(m => m.type === 'IMAGE');
        if (images.length === 0) {
          alert('At least one image is required before submitting for verification');
          setIsSubmitting(false);
          return;
        }

        // Validate required documents
        const requiredDocs = getRequiredDocuments(listingType);
        const hasRequiredDocs = requiredDocs.every(docType =>
          documents.some(doc => doc.docType === docType)
        );

        if (!hasRequiredDocs) {
          alert(`Missing required documents for ${listingType} listing`);
          setIsSubmitting(false);
          return;
        }
      }

      // TODO: Implement real API call for property creation
      // For now, show success message
      if (action === 'verify') {
        // await developerApi.submitForVerification(property.id);
        setShowSuccess(true);
      } else {
        // router.push(`/dashboard/developer/properties/${property.id}`);
        alert('Property creation API not yet implemented. This will save as draft.');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save property');
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = handleSubmit(async (data: PropertyFormData) => {
    await onSubmit(data, 'draft');
  });

  const handlePayForVerification = handleSubmit(async (data: PropertyFormData) => {
    await onSubmit(data, 'verify');
  });

  const getRequiredDocuments = (type: ListingType): string[] => {
    switch (type) {
      case ListingType.SALE:
        return ['TITLE_DOC', 'SURVEY_PLAN', 'BUILDING_APPROVAL'];
      case ListingType.RENT:
        return ['PROOF_OF_OWNERSHIP'];
      case ListingType.LEAD_GEN:
        return [];
      default:
        return [];
    }
  };

  if (userLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Transaction completed</h1>
          <p className="text-gray-600 mb-8">
            Your listing has been submitted and is awaiting review.
          </p>
          <button
            onClick={() => router.push('/dashboard/developer/properties')}
            className="w-full py-3 bg-[#0A1628] text-white rounded-2xl font-semibold hover:bg-[#0A1628]/90 transition-colors"
          >
            Back to properties
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#FDFBFA]">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 bg-[#FDFBFA] px-6 py-4 flex items-center justify-between z-50 border-b border-gray-100">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Add Property</h1>
          <button
            onClick={() => router.push('/notifications')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
        </header>

        {/* Progress Indicator */}
        <div className="pt-24 px-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-gray-900">Step {currentStep}</span>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full ${
                    index + 1 <= currentStep
                      ? 'bg-[#FF6B35]'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 pb-8">
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Property information</h2>
              <p className="text-sm text-gray-500 mb-6">
                Add properties and request verification with a listing fee.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Enter name of property here</label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none"
                    placeholder="4 Bedroom duplex Apartment"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Enter property Location here</label>
                  <input
                    {...register('locationText')}
                    type="text"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none"
                    placeholder="222A Freedom way, Lekki Phase 1.."
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Select category type here</label>
                  <div className="relative">
                    <select
                      {...register('listingType')}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-10 appearance-none focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none bg-white"
                    >
                      <option value={ListingType.SALE}>Residential</option>
                      <option value={ListingType.RENT}>Commercial</option>
                      <option value={ListingType.LEAD_GEN}>Land</option>
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Select property type here</label>
                  <div className="relative">
                    <select
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-10 appearance-none focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none bg-white"
                    >
                      <option>Duplex</option>
                      <option>Apartment</option>
                      <option>Bungalow</option>
                      <option>Penthouse</option>
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Description</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none resize-none"
                    placeholder="Enter text here"
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-8 py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors"
              >
                Upload Media
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Upload Media */}
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Upload property media</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Add pictures or videos of the building, to give buyers an overview of the property.
                </p>
                <MediaUploader
                  media={media}
                  onChange={setMedia}
                  maxImages={10}
                  allowVideo={true}
                />
              </div>

              {/* Visibility */}
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Visibility</h2>
                <div className="relative mb-3">
                  <select
                    value={visibility}
                    onChange={(e) => setValue('visibility', e.target.value as any)}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-10 appearance-none focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none bg-white"
                  >
                    <option value="ALL_CREATORS">Public</option>
                    <option value="EXCLUSIVE_CREATORS">Exclusive</option>
                  </select>
                  <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500">
                  This property will only be visible to the option you just selected.
                </p>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors"
              >
                Set pricing
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Pricing information</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter or select maximum and minimum price for your property.
              </p>

              <div className="space-y-6">
                {/* Max Price */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Enter Max price here</label>
                  <input
                    {...register('askingPrice', { valueAsNumber: true })}
                    type="number"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none"
                    placeholder="₦500M"
                    value={askingPrice || ''}
                  />
                  <div className="flex gap-2 mt-3">
                    {[10000000, 50000000, 100000000, 500000000].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => handleQuickPrice(price, 'max')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                          askingPrice === price
                            ? 'bg-reach-navy text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ₦{price >= 1000000 ? `${price / 1000000}M` : `${price / 1000}K`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Price */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Enter Min price here</label>
                  <input
                    {...register('minAcceptablePrice', { valueAsNumber: true })}
                    type="number"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-1 focus:ring-reach-navy focus:border-reach-navy outline-none"
                    placeholder="₦450M"
                    value={minAcceptablePrice || ''}
                  />
                  <div className="flex gap-2 mt-3">
                    {[8000000, 45000000, 90000000, 450000000].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => handleQuickPrice(price, 'min')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                          minAcceptablePrice === price
                            ? 'bg-reach-navy text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ₦{price >= 1000000 ? `${price / 1000000}M` : `${price / 1000}K`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-8 py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors"
              >
                Upload Document
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Contract of Sale</h2>
              
              <div className="space-y-6">
                {/* Section 1: Purpose */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    1. Purpose of this contract:
                  </p>
                  <p className="text-sm text-gray-700">
                    This contract authorizes Reach to market and sell the Developer's verified property under agreed commercial terms.
                  </p>
                </div>

                {/* Section 2: Property Details */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    2. Property Details:
                  </p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>{propertyTitle || '4 Bedroom duplex Apartment'}</p>
                    <p>{propertyLocation || '222A Freedom way, Lekki Phase 1. Lagos State.'}</p>
                    <p>
                      {bedrooms || 4} Beds, {bathrooms || 3} Bathroom, 1,400 sqft
                    </p>
                  </div>
                </div>

                {/* Section 3: Pricing Terms */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    3. Pricing Terms:
                  </p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      Asking Price: ₦{askingPrice ? `${(askingPrice / 1000000).toFixed(0)}M` : '500M'}
                    </p>
                    <p>
                      Minimum Acceptable Price: ₦{minAcceptablePrice ? `${(minAcceptablePrice / 1000000).toFixed(0)}M` : '480M'}
                    </p>
                  </div>
                </div>

                {/* Section 4: Authorization */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    4. Authorization to Sell:
                  </p>
                  <p className="text-sm text-gray-700">
                    The Developer authorizes Reach to market and sell the property at the asking price or any price above the minimum acceptable price.
                  </p>
                </div>

                {/* Section 5: Commission */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    5. Commission:
                  </p>
                  <p className="text-sm text-gray-700">
                    Reach earns a 15% commission, deducted from the final sale price before payout to the Developer.
                  </p>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-8 py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors"
              >
                Upload Document
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Upload Document */}
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Upload Document</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Add pictures or videos of the building, to give buyers an overview of the property.
                </p>
                <div
                  onClick={() => !uploadedDocument && document.getElementById('document-upload')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    uploadedDocument 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {uploadedDocument ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <FileText className="text-green-600" size={32} />
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Your certificate has been successfully uploaded</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {uploadedDocument.name} • {(uploadedDocument.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDocument();
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
                      <input
                        type="file"
                        id="document-upload"
                        onChange={handleDocumentUpload}
                        accept="image/jpeg,image/png,image/svg+xml"
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Reach balance</span>
                  <span className="px-4 py-1 bg-[#FF6B35] text-white rounded-full text-sm font-semibold">
                    ₦20,056,770.00
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  The sum of ₦15,056 will be deducted from your Reach wallet for listing and verifying each property.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePayForVerification}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors disabled:opacity-50"
                >
                  Pay ₦15,056 for verification
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Save as draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
