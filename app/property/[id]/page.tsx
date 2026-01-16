'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { buyerApi, ApiError } from '@/lib/api/client';
import { 
  MapPin, 
  Bed, 
  Bath, 
  ArrowLeft, 
  Calendar, 
  Phone,
  Mail,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Image Gallery Component
// ===========================================

function PropertyGallery({ media }: { media: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!media || media.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-100 rounded-2xl flex items-center justify-center">
        <Building2 className="w-20 h-20 text-gray-300" />
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="relative aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden group">
        <img
          src={media[currentIndex]?.url}
          alt={`Property image ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        />
        
        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(i => (i - 1 + media.length) % media.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentIndex(i => (i + 1) % media.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
          {currentIndex + 1} / {media.length}
        </div>
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {media.map((item, idx) => (
            <button
              key={item.id || idx}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === currentIndex ? 'border-[#E54D4D]' : 'border-transparent'
              }`}
            >
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => setCurrentIndex(i => (i - 1 + media.length) % media.length)}
            className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={32} />
          </button>
          <img
            src={media[currentIndex]?.url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setCurrentIndex(i => (i + 1) % media.length)}
            className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </>
  );
}

// ===========================================
// Lead Form Modal
// ===========================================

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  sourceCode?: string;
}

function LeadFormModal({ isOpen, onClose, propertyId, propertyTitle, sourceCode }: LeadFormModalProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    buyer_name: user?.full_name || '',
    buyer_phone: user?.phone || '',
    buyer_email: user?.email || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await buyerApi.submitLead({
        property_id: propertyId,
        buyer_name: formData.buyer_name,
        buyer_phone: formData.buyer_phone,
        buyer_email: formData.buyer_email,
        source_code: sourceCode,
      });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Express Interest</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Interest Submitted!</h3>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in &quot;{propertyTitle}&quot;. The property developer will contact you soon.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#0A1628] text-white rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Fill in your details to express interest in &quot;{propertyTitle}&quot;
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={formData.buyer_name}
                  onChange={e => setFormData({ ...formData, buyer_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  required
                  value={formData.buyer_phone}
                  onChange={e => setFormData({ ...formData, buyer_phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={formData.buyer_email}
                  onChange={e => setFormData({ ...formData, buyer_email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#E54D4D] text-white rounded-xl font-medium hover:bg-[#E54D4D]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Submitting...
                </>
              ) : (
                'Submit Interest'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Inspection Booking Modal
// ===========================================

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
}

function InspectionModal({ isOpen, onClose, propertyId, propertyTitle }: InspectionModalProps) {
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSlots();
    }
  }, [isOpen, propertyId]);

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const response = await buyerApi.getInspectionSlots(propertyId);
      setSlots(response.slots || []);
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      await buyerApi.bookInspection({
        property_id: propertyId,
        slot_time: selectedSlot,
      });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to book inspection';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Group slots by date
  const slotsByDate = slots.reduce((acc: Record<string, any[]>, slot) => {
    const date = new Date(slot.time).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Book Inspection</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Inspection Booked!</h3>
            <p className="text-gray-600 mb-6">
              Your inspection for &quot;{propertyTitle}&quot; has been scheduled. You&apos;ll receive a confirmation shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#0A1628] text-white rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Select a time slot for your property inspection
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No available slots at the moment</p>
                <p className="text-sm">Please check back later</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                  <div key={date}>
                    <p className="text-sm font-medium text-gray-700 mb-2">{date}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {dateSlots.map((slot: any) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedSlot === slot.time
                              ? 'bg-[#0A1628] text-white'
                              : slot.available
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={!selectedSlot || isSubmitting}
              className="w-full mt-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium hover:bg-[#E54D4D]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Booking...
                </>
              ) : (
                <>
                  <Calendar size={18} />
                  Book Inspection
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Main Property Detail Page
// ===========================================

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = (params?.id as string) || '';
  const sourceCode = searchParams.get('ref') || undefined;
  
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);

  // Fetch property from real API
  useEffect(() => {
    if (!propertyId) {
      router.push('/properties');
      return;
    }

    const fetchProperty = async () => {
      setIsLoading(true);
      try {
        const response = await buyerApi.getProperty(propertyId);
        setProperty(response.property);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Property not found';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId, router]);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] p-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="aspect-[16/9] bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Property not found</h2>
          <p className="text-gray-600 mb-6">{error || 'This property may have been removed or is no longer available.'}</p>
          <button
            onClick={() => router.push('/properties')}
            className="px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium"
          >
            Browse Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-gray-900 truncate">{property.title}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Gallery */}
        <PropertyGallery media={property.media || []} />

        {/* Property Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
          {/* Title and Location */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h2>
            {property.location && (
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin size={18} />
                <span>
                  {property.location.address && `${property.location.address}, `}
                  {property.location.city}, {property.location.state}
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-3xl font-bold text-[#E54D4D]">
              {formatPrice(property.asking_price || 0)}
            </p>
            {property.minimum_price && property.minimum_price !== property.asking_price && (
              <p className="text-sm text-gray-500 mt-1">
                Minimum offer: {formatPrice(property.minimum_price)}
              </p>
            )}
          </div>

          {/* Features */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
            {property.bedrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bed size={20} className="text-gray-400" />
                <span className="font-medium text-gray-700">{property.bedrooms} Bedrooms</span>
              </div>
            )}
            {property.bathrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bath size={20} className="text-gray-400" />
                <span className="font-medium text-gray-700">{property.bathrooms} Bathrooms</span>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">About this property</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button
            onClick={() => setIsLeadModalOpen(true)}
            className="flex-1 py-3 bg-[#0A1628] text-white rounded-xl font-medium hover:bg-[#0A1628]/90 transition-colors"
          >
            I&apos;m Interested
          </button>
          <button
            onClick={() => setIsInspectionModalOpen(true)}
            className="flex-1 py-3 bg-[#E54D4D] text-white rounded-xl font-medium hover:bg-[#E54D4D]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            Book Inspection
          </button>
        </div>
      </div>

      {/* Modals */}
      <LeadFormModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        propertyId={propertyId}
        propertyTitle={property.title}
        sourceCode={sourceCode}
      />
      <InspectionModal
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        propertyId={propertyId}
        propertyTitle={property.title}
      />
    </div>
  );
}
