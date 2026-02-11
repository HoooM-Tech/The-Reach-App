'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { propertyFormSchema, PropertyFormData } from '@/lib/validations/propertySchema';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { DocumentUploader } from '@/components/forms/DocumentUploader';
import { VisibilitySelector } from '@/components/forms/VisibilitySelector';
import { PropertyMedia, PropertyDocument, ListingType, Visibility } from '@/types/property';
import type { Property as ApiProperty } from '@/types';
import { ArrowLeft, Save, Send, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const propertyId = (params?.id as string) || '';
  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [media, setMedia] = useState<PropertyMedia[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitAction, setSubmitAction] = useState<'draft' | 'verify' | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    reset,
    formState: { errors },
  } = form;

  const listingType = watch('listingType');
  const visibility = watch('visibility');

  const loadProperty = useCallback(async () => {
    if (!propertyId || !user?.id) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);
      const prop = await developerApi.getProperty(propertyId);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        if (!prop) {
          setError('Property not found');
          setLoading(false);
          return;
        }

        // Allow editing for all statuses - developers should be able to update their properties
        // The API will handle business logic for what can be changed based on status
        const status = prop.verification_status || prop.status;
        
        // Log status for debugging
        console.log('Property loaded for editing:', {
          id: prop.id,
          status,
          verification_status: prop.verification_status,
        });

        setProperty(prop as ApiProperty);
        // Map API media format to form media format
        setMedia((prop.media || []).map((m: any) => ({
          id: m.id,
          url: m.url,
          type: m.type === 'image' ? 'IMAGE' : 'VIDEO',
          sortOrder: m.sort_order || 0,
        })));
        // Documents come from a separate API call or are stored differently
        setDocuments([]);

        // Reset form with property data - convert API format to form format
        const listingTypeMap: Record<string, ListingType> = {
          'sale': ListingType.SALE,
          'rent': ListingType.RENT,
          'lead_generation': ListingType.LEAD_GEN,
        };
        
        reset({
          title: prop.title,
          description: prop.description,
          listingType: listingTypeMap[prop.listing_type] || ListingType.SALE,
          visibility: prop.visibility === 'all_creators' ? Visibility.ALL_CREATORS : Visibility.EXCLUSIVE_CREATORS,
          askingPrice: prop.asking_price,
          minAcceptablePrice: prop.minimum_price,
          currency: (prop as any).currency || 'NGN',
          locationText: prop.location?.address || '',
          city: prop.location?.city || '',
          state: prop.location?.state || '',
          country: (prop.location as any)?.country || 'Nigeria',
          bedrooms: (prop as any).bedrooms,
          bathrooms: (prop as any).bathrooms,
        });
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load property';
      setError(message);
      
      // Log detailed error for debugging
      console.error('Failed to load property:', {
        propertyId,
        error: err,
        apiError: err instanceof ApiError ? {
          statusCode: err.statusCode,
          message: err.message,
          data: err.data,
        } : null,
      });
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [propertyId, user?.id, reset, router]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Role check is handled by layout/middleware
    if (propertyId) {
      loadProperty();
    }
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [propertyId, user, userLoading, loadProperty, router]);

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

      // Prepare update payload matching API schema
      const listingTypeMap: Record<ListingType, string> = {
        [ListingType.SALE]: 'sale',
        [ListingType.RENT]: 'rent',
        [ListingType.LEAD_GEN]: 'lead_generation',
      };
      
      const updatePayload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        listing_type: listingTypeMap[data.listingType],
        asking_price: data.askingPrice,
        minimum_price: data.minAcceptablePrice,
        location: {
          address: data.locationText || '',
          city: data.city || '',
          state: data.state || '',
        },
        visibility: data.visibility === 'ALL_CREATORS' ? 'all_creators' : 'exclusive_creators',
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
      };

      // Set verification status based on action
      if (action === 'draft') {
        updatePayload.verification_status = 'draft';
        updatePayload.status = 'draft';
      } else if (action === 'verify') {
        // Submit for verification
        updatePayload.verification_status = 'submitted';
        updatePayload.status = 'pending_verification';
      }

      console.log('Updating property with payload:', updatePayload);
      await developerApi.updateProperty(propertyId, updatePayload);

      // Success - navigate to property details
      router.push(`/dashboard/developer/properties/${propertyId}`);
    } catch (err: any) {
      // Error handling
      const message = err instanceof ApiError ? err.message : 'Failed to update property';
      console.error('Property update error:', {
        propertyId,
        action,
        error: err,
        apiError: err instanceof ApiError ? {
          statusCode: err.statusCode,
          message: err.message,
          data: err.data,
        } : null,
      });
      alert(message);
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = handleSubmit(
    async (data: PropertyFormData) => {
      console.log('Save Draft - Form data:', data);
      await onSubmit(data, 'draft');
    },
    (errors) => {
      // Handle form validation errors
      console.error('Save Draft - Form validation errors:', errors);
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        alert(firstError.message);
      } else {
        alert('Please fill in all required fields correctly');
      }
    }
  );

  const handleSubmitForVerification = handleSubmit(
    async (data: PropertyFormData) => {
      console.log('Submit for Verification - Form data:', data);
      await onSubmit(data, 'verify');
    },
    (errors) => {
      // Handle form validation errors
      console.error('Submit for Verification - Form validation errors:', errors);
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        alert(firstError.message);
      } else {
        alert('Please fill in all required fields correctly');
      }
    }
  );

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

  if (userLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load property</h3>
            <p className="text-gray-600 mb-4">{error || 'Property not found'}</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => router.push('/dashboard/developer/properties')}
                className="px-6 py-3 bg-[#0A1628] text-white rounded-xl font-medium"
              >
                Back to Properties
              </button>
              <button
                type="button"
                onClick={loadProperty}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/developer/properties')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to properties"
            title="Back to properties"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => e.preventDefault()}
          noValidate
        >
          {/* Basic Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Title <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Type <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('listingType')}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                >
                  <option value={ListingType.SALE}>Sale</option>
                  <option value={ListingType.RENT}>Rent</option>
                  <option value={ListingType.LEAD_GEN}>Lead Gen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  {...register('currency')}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                >
                  <option value="NGN">NGN (₦)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asking Price</label>
                <input
                  {...register('askingPrice', { valueAsNumber: true })}
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Acceptable Price</label>
                <input
                  {...register('minAcceptablePrice', { valueAsNumber: true })}
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Location</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
              <input
                {...register('locationText')}
                type="text"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  {...register('city')}
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  {...register('state')}
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  {...register('country')}
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Property Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                <input
                  {...register('bedrooms', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                <input
                  {...register('bathrooms', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-reach-red focus:border-reach-red outline-none"
                />
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <VisibilitySelector
              value={visibility}
              onChange={(value) => setValue('visibility', value)}
            />
          </div>
        </form>

        {/* Media Upload - outside form so file inputs never trigger form submit */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Media</h2>
          <MediaUploader
            propertyId={propertyId}
            media={media}
            onChange={setMedia}
            maxImages={10}
            allowVideo={true}
          />
        </div>

        {/* Documents - outside form so file inputs never trigger form submit */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
          <DocumentUploader
            propertyId={propertyId}
            documents={documents}
            onChange={setDocuments}
            listingType={listingType}
          />
        </div>

        {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              Save Draft
            </button>
            {(property.verification_status === 'draft' || property.status === 'draft') && (
              <button
                type="button"
                onClick={handleSubmitForVerification}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-reach-navy text-white rounded-lg font-semibold hover:bg-reach-navy/90 transition-colors disabled:opacity-50"
              >
                <Send size={20} />
                Submit for Verification
              </button>
            )}
            {(property.verification_status === 'rejected') && (
              <button
                type="button"
                onClick={handleSubmitForVerification}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-reach-navy text-white rounded-lg font-semibold hover:bg-reach-navy/90 transition-colors disabled:opacity-50"
              >
                <Send size={20} />
                Resubmit for Verification
              </button>
            )}
          </div>
      </div>
  );
}

