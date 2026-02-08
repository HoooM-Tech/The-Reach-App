'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  AlertCircle,
  Bath,
  Bed,
  Bell,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Home,
  Loader2,
  MapPin,
  MoreVertical,
  Shield,
  Square,
  Star,
  Wifi,
  X,
  Waves,
  Car,
} from 'lucide-react';
import { buyerApi } from '@/lib/api/client';
import { useUser } from '@/contexts/UserContext';
import { formatInspectionTimeOnly } from '@/lib/utils/time';

interface PropertyDocument {
  id: string;
  name?: string;
  url?: string;
  type?: string;
}

interface Review {
  id: string;
  userName?: string;
  userAvatar?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
}

const amenityIcons: Record<string, React.ReactNode> = {
  workspace: <Star className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  wifi: <Wifi className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  pool: <Waves className="w-5 h-5" />,
  gym: <Dumbbell className="w-5 h-5" />,
  default: <Home className="w-5 h-5" />,
};

export default function BuyerPropertyDetailsPage() {
  const router = useRouter();
  const params = useParams<{ propertyId: string }>();
  const { user } = useUser();
  const propertyId = params?.propertyId;

  const [property, setProperty] = useState<any>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [hasScheduledInspection, setHasScheduledInspection] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [isBidSubmitting, setIsBidSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);

  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [availableDates, setAvailableDates] = useState<Record<string, boolean>>({});
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [inspectionError, setInspectionError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [inspectionSuccess, setInspectionSuccess] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const priceLabel = useMemo(() => {
    if (!property?.asking_price) return '';
    const base = formatPrice(property.asking_price);
    return property.asking_price >= 1000000 ? `${base}M` : base;
  }, [property?.asking_price]);

  const ratingValue = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  const primaryImage = useMemo(() => {
    const media = property?.media || [];
    const firstImage = media.find((m: any) => m.type === 'IMAGE' || m.type === 'image');
    return firstImage?.url || media[0]?.url || '';
  }, [property?.media]);

  const locationText = useMemo(() => {
    if (property?.location) {
      const address = property.location.address ? `${property.location.address}, ` : '';
      return `${address}${property.location.city || ''}${property.location.state ? `, ${property.location.state}` : ''}`.trim();
    }
    if (property?.location_text) return property.location_text;
    return 'Location not available';
  }, [property?.location, property?.location_text]);

  const amenities: Array<{ id: string; name: string; type?: string }> = property?.amenities || [];

  useEffect(() => {
    if (!propertyId) return;
    const fetchProperty = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/properties/${propertyId}`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to fetch property');
        }
        const data = await response.json();
        setProperty(data.property);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await buyerApi.getUnreadStatus();
        setHasUnread(response.hasUnread);
      } catch {
        setHasUnread(false);
      }
    };
    fetchUnread();
  }, []);

  useEffect(() => {
    if (!user?.id || !propertyId) return;
    const fetchBuyerInspections = async () => {
      try {
        const response = await fetch(`/api/dashboard/buyer/${user.id}`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        const upcoming = data.inspections?.upcoming || [];
        const match = upcoming.some((i: any) => i.property_id === propertyId);
        setHasScheduledInspection(match);
      } catch {
        setHasScheduledInspection(false);
      }
    };
    fetchBuyerInspections();
  }, [user?.id, propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/properties/${propertyId}/documents`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch {
        setDocuments([]);
      }
    };

    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/properties/${propertyId}/reviews?page=1&limit=10`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        setReviews(data.reviews || []);
      } catch {
        setReviews([]);
      }
    };

    fetchDocuments();
    fetchReviews();
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    const fetchNote = async () => {
      try {
        const response = await fetch(`/api/properties/${propertyId}/notes`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.note?.note_text) {
          setNote(data.note.note_text);
        }
      } catch {
        // Ignore note fetch errors for now
      }
    };
    fetchNote();
  }, [propertyId]);

  useEffect(() => {
    if (!user?.full_name) return;
    const parts = user.full_name.split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
  }, [user?.full_name]);

  useEffect(() => {
    if (!user?.phone) return;
    setPhoneNumber(user.phone);
  }, [user?.phone]);

  const handleBidSubmit = async () => {
    setBidError('');
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) {
      setBidError('Please enter a valid amount');
      return;
    }
    const minimum = property?.minimum_price || property?.asking_price || 0;
    if (minimum && amount < minimum) {
      setBidError("Bid does not match developers' proposal");
      return;
    }
    setIsBidSubmitting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/bids`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, bid_amount: amount }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit bid');
      }
      setBidAmount('');
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Failed to submit bid');
    } finally {
      setIsBidSubmitting(false);
    }
  };

  const handleNoteSubmit = async () => {
    setNoteError('');
    if (!note.trim()) {
      setNoteError('Please enter a note before submitting.');
      return;
    }
    setIsNoteSubmitting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: note }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit note');
      }
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Failed to submit note');
    } finally {
      setIsNoteSubmitting(false);
    }
  };

  const loadMonthAvailability = useCallback(async (month: Date) => {
    if (!propertyId) return;
    setIsLoadingDates(true);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return new Date(year, monthIndex, day).toISOString().split('T')[0];
    });

    try {
      const results = await Promise.all(
        dates.map(async (dateStr) => {
          try {
            const res = await buyerApi.getInspectionSlots(propertyId, dateStr);
            const hasAvailable = (res.slots || []).some((slot: any) => slot.available);
            return [dateStr, hasAvailable] as const;
          } catch {
            return [dateStr, false] as const;
          }
        })
      );

      const nextMap: Record<string, boolean> = {};
      results.forEach(([dateStr, available]) => {
        nextMap[dateStr] = available;
      });
      setAvailableDates(nextMap);
    } finally {
      setIsLoadingDates(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (showDatePicker) {
      loadMonthAvailability(currentMonth);
    }
  }, [showDatePicker, currentMonth, loadMonthAvailability]);

  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTime('');
    setShowDatePicker(false);
    setShowTimePicker(true);
    try {
      const res = await buyerApi.getInspectionSlots(propertyId, dateStr);
      setAvailableSlots(res.slots || []);
    } catch {
      setAvailableSlots([]);
    }
  };

  const handleBookInspection = async () => {
    setInspectionError('');
    if (!selectedDate || !selectedTime || !firstName || !lastName || !phoneNumber) {
      setInspectionError('Please complete all fields.');
      return;
    }

    setIsBooking(true);
    try {
      let currentLeadId = leadId;
      if (!currentLeadId) {
        const leadResponse = await buyerApi.submitLead({
          property_id: propertyId,
          buyer_name: `${firstName} ${lastName}`.trim(),
          buyer_phone: phoneNumber,
          buyer_email: user?.email || undefined,
        });
        currentLeadId = leadResponse?.lead?.id || null;
        if (currentLeadId) {
          setLeadId(currentLeadId);
        }
      }
      if (!currentLeadId) {
        setInspectionError('Unable to create a lead for this inspection.');
        setIsBooking(false);
        return;
      }

      await buyerApi.bookInspection({
        property_id: propertyId,
        lead_id: currentLeadId,
        slot_time: selectedTime,
      });
      setInspectionSuccess(true);
      setShowInspectionModal(false);
    } catch (err) {
      setInspectionError(err instanceof Error ? err.message : 'Failed to book inspection');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-12 bg-white/80 rounded-xl animate-pulse" />
          <div className="h-64 bg-white/80 rounded-2xl animate-pulse" />
          <div className="h-40 bg-white/80 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] p-6">
        <div className="max-w-3xl mx-auto text-center py-16">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Property not found</h2>
          <p className="text-gray-600 mb-6">{error || 'This property may have been removed.'}</p>
          <button
            onClick={() => router.push('/dashboard/buyer')}
            className="px-6 py-3 bg-[#1A3B5D] text-white rounded-xl font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] pb-28 pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 lg:left-64 z-40 bg-[#F5F0EB] px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-base sm:text-lg font-semibold">Property Details</h1>

        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 flex items-center justify-center relative"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </header>

      {/* Hero Image */}
      <div className="px-4 pt-4">
        <div className="relative w-full rounded-2xl overflow-hidden bg-white">
          <div className="relative w-full pt-[66.67%]">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={property.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 768px, 1200px"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-200" />
            )}
          </div>

          {hasScheduledInspection && (
            <div className="absolute top-3 left-3 bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Scheduled
            </div>
          )}

          <button
            className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
            aria-label="More options"
            title="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl sm:text-2xl font-bold">{priceLabel}</h2>
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">{ratingValue}</span>
            <span className="text-gray-500">({reviews.length})</span>
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-semibold mb-2">{property.title}</h3>

        <div className="flex items-center gap-2 mb-4 text-gray-600">
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm truncate">{locationText}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-700 flex-wrap">
          {property.bedrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{property.bedrooms} Beds</span>
            </div>
          )}
          {property.bathrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{property.bathrooms} Bathroom</span>
            </div>
          )}
          {property.sqft !== undefined && (
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4" />
              <span>{Number(property.sqft).toLocaleString()} sqft</span>
            </div>
          )}
        </div>

        {property.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {showFullDescription ? property.description : `${property.description.slice(0, 160)}${property.description.length > 160 ? '...' : ''}`}
            </p>
            {property.description.length > 160 && (
              <button
                onClick={() => setShowFullDescription((prev) => !prev)}
                className="text-sm text-gray-500 underline mt-1"
              >
                {showFullDescription ? 'Less' : 'More'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold">Property Document</h4>
          <button
            onClick={() => {
              if (documents.length > 0 && documents[0].url) {
                window.open(documents[0].url, '_blank');
              }
            }}
            className="text-sm font-medium text-orange-600 disabled:text-gray-400"
            disabled={documents.length === 0}
          >
            View Documents
          </button>
        </div>
      </div>

      {/* Amenities */}
      <div className="px-4 py-6 border-t border-gray-200">
        <h4 className="text-base font-semibold mb-1">Amenities</h4>
        <p className="text-sm text-gray-500 mb-4">What this place offers</p>

        {amenities.length === 0 ? (
          <p className="text-sm text-gray-500">No amenities listed yet.</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {amenities.slice(0, 4).map((amenity: any) => (
                <div key={amenity.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {amenityIcons[amenity.type] || amenityIcons.default}
                  </div>
                  <span className="text-sm text-gray-700">{amenity.name}</span>
                </div>
              ))}
            </div>

            {amenities.length > 4 && (
              <button
                className="w-full py-3 px-4 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                See all amenities
              </button>
            )}
          </>
        )}
      </div>

      {/* Reviews */}
      <div className="px-4 py-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold">Reviews</h4>
          {reviews.length > 3 && (
            <button className="text-sm text-orange-600 font-medium">See all</button>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div
                key={review.id}
                className="flex-shrink-0 w-[280px] sm:w-[320px] p-4 bg-white rounded-xl border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  {review.userAvatar ? (
                    <Image
                      src={review.userAvatar}
                      alt={review.userName || 'Reviewer'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{review.userName || 'Anonymous'}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < (review.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">{review.comment || ''}</p>
                {review.createdAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="w-full text-center py-8 text-gray-500">No reviews yet</div>
          )}
        </div>
      </div>

      {/* Submit Bid */}
      <div className="px-4 py-6 border-t border-gray-200">
        <h4 className="text-base font-semibold mb-4">Submit Bid</h4>

        <div className="mb-4">
          <input
            type="number"
            placeholder="Enter last amount you can offer"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 ${
              bidError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {bidError && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {bidError}
            </p>
          )}
        </div>

        <button
          onClick={handleBidSubmit}
          disabled={isBidSubmitting}
          className="w-full py-3 bg-[#1A3B5D] text-white rounded-full text-base font-semibold hover:bg-[#152e47] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBidSubmitting ? 'Submitting...' : 'Submit Bid'}
        </button>
      </div>

      {/* Note */}
      <div className="px-4 py-4">
        <h4 className="text-base font-semibold mb-3">Note</h4>
        <textarea
          placeholder="Add any additional notes or questions..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {noteError && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {noteError}
          </p>
        )}
        <button
          onClick={handleNoteSubmit}
          disabled={isNoteSubmitting}
          className="mt-3 w-full py-3 bg-[#1A3B5D] text-white rounded-full text-sm font-semibold hover:bg-[#152e47] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNoteSubmitting ? 'Submitting...' : 'Submit Note'}
        </button>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 px-4 py-4 bg-white border-t border-gray-200 z-30">
        <button
          onClick={() => {
            setShowInspectionModal(true);
            setInspectionSuccess(false);
          }}
          className="w-full py-4 px-6 bg-[#1A3B5D] text-white rounded-full text-base font-semibold hover:bg-[#152e47] transition flex items-center justify-center gap-2"
        >
          Request Inspection
        </button>
      </div>

      {/* Request Inspection Modal */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end lg:items-center justify-center">
          <div className="bg-[#F5F0EB] w-full lg:max-w-lg rounded-t-3xl lg:rounded-2xl">
            <header className="px-4 py-3 flex items-center justify-between bg-[#F5F0EB]">
              <button
                onClick={() => setShowInspectionModal(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-base sm:text-lg font-semibold">Request Inspection</h1>
              {/*
              <button
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm relative"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {hasUnread && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              */}
            </header>

            <div className="px-4 pb-6">
              <div className="bg-white rounded-2xl p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-6">Check for developers&apos; available date</h2>

                <button
                  onClick={() => setShowDatePicker(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-left mb-4"
                >
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm sm:text-base">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Select date'}
                  </span>
                </button>

                <button
                  onClick={() => selectedDate && setShowTimePicker(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-left mb-4"
                >
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-sm sm:text-base">
                    {selectedTime ? formatInspectionTimeOnly(selectedTime) : 'Select time'}
                  </span>
                </button>

                <input
                  type="text"
                  placeholder="Enter first name here"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm sm:text-base mb-4"
                />
                <input
                  type="text"
                  placeholder="Enter last name here"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm sm:text-base mb-6"
                />

                <input
                  type="tel"
                  placeholder="Enter phone number here"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm sm:text-base mb-6"
                />

                {inspectionError && (
                  <p className="text-xs text-red-500 mb-4 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {inspectionError}
                  </p>
                )}

                <button
                  onClick={handleBookInspection}
                  disabled={isBooking}
                  className="w-full py-4 px-6 bg-[#1A3B5D] text-white rounded-full text-base font-semibold hover:bg-[#152e47] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBooking ? 'Booking...' : 'Book Inspection'}
                </button>

                {inspectionSuccess && (
                  <div className="mt-4 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Inspection booked successfully.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end lg:items-center justify-center">
          <div className="bg-white w-full lg:max-w-lg rounded-t-3xl lg:rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Select a date</h3>
              <button onClick={() => setShowDatePicker(false)} aria-label="Close" title="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                aria-label="Previous month"
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                aria-label="Next month"
                title="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {isLoadingDates ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 mb-6">
                {(() => {
                  const year = currentMonth.getFullYear();
                  const monthIndex = currentMonth.getMonth();
                  const firstDay = new Date(year, monthIndex, 1).getDay();
                  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                  const cells = Array.from({ length: firstDay + daysInMonth }, (_, idx) => {
                    if (idx < firstDay) return null;
                    const dayNumber = idx - firstDay + 1;
                    const dateStr = new Date(year, monthIndex, dayNumber).toISOString().split('T')[0];
                    const isAvailable = availableDates[dateStr];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => isAvailable && handleSelectDate(dateStr)}
                        disabled={!isAvailable}
                        className={`aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isToday ? 'bg-gray-800 text-white' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
                          isAvailable && !isToday ? 'bg-green-500 text-white hover:bg-green-600' : ''
                        } ${!isAvailable && !isToday ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
                      >
                        {dayNumber}
                      </button>
                    );
                  });
                  return cells;
                })()}
              </div>
            )}

            <div className="flex items-center justify-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-300" />
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-800" />
                <span>Current date</span>
              </div>
            </div>

            <button
              onClick={() => setShowDatePicker(false)}
              className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end lg:items-center justify-center">
          <div className="bg-white w-full lg:max-w-lg rounded-t-3xl lg:rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Select Time</h3>
              <button onClick={() => setShowTimePicker(false)} aria-label="Close" title="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-6 max-h-60 overflow-y-auto scrollbar-hide">
              {availableSlots.filter((s) => s.available).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No time slots available.</p>
              )}
              {availableSlots.filter((s) => s.available).map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`w-full py-3 rounded-xl text-center border ${
                    selectedTime === slot.time ? 'bg-[#1A3B5D] text-white border-[#1A3B5D]' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {formatInspectionTimeOnly(slot.time)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTimePicker(false)}
              className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
