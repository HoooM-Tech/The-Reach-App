'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { getAccessToken } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell,
  Calendar,
  Clock,
  User,
  Mail,
  Phone
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function RescheduleInspectionPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const propertyId = (params?.id as string) || '';
  
  const [scheduleType, setScheduleType] = useState<'video' | 'in-person'>('video');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspection, setInspection] = useState<any>(null);

  // Fetch existing inspection data
  useEffect(() => {
    if (!propertyId || !user?.id) return;

    const fetchInspection = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(`/api/properties/${propertyId}/details`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.inspection) {
            setInspection(data.inspection);
            setScheduleType(data.inspection.type === 'video_chat' || data.inspection.type === 'video' ? 'video' : 'in-person');
            
            // Pre-fill date and time
            if (data.inspection.slot_time) {
              const inspectionDate = new Date(data.inspection.slot_time);
              setDate(inspectionDate.toISOString().split('T')[0]);
              setTime(inspectionDate.toTimeString().slice(0, 5));
            }
            
            // Pre-fill contact info
            setName(data.inspection.buyer_name || '');
            setEmail(data.inspection.buyer_email || '');
            setPhone(data.inspection.buyer_phone || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch inspection:', err);
      }
    };

    fetchInspection();
  }, [propertyId, user?.id]);

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Format time for display
  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes}${ampm}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspection) return;

    setIsSubmitting(true);

    try {
      const token = getAccessToken();
      
      // Combine date and time
      const [year, month, day] = date.split('-');
      const [hours, minutes] = time.split(':');
      const slotTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`).toISOString();

      const response = await fetch(`/api/inspections/${inspection.id}/reschedule`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          slot_time: slotTime,
          type: scheduleType === 'video' ? 'video_chat' : 'in_person',
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
        }),
      });

      if (response.ok) {
        router.push(`/dashboard/developer/properties/${propertyId}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to reschedule inspection');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="min-h-screen bg-reach-bg">
      {/* Header */}
      <header className="sticky top-0 bg-reach-bg z-40 py-4 px-4 sm:px-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Re-schedule a meeting</h1>
        <button
          onClick={() => router.push('/notifications')}
          className="p-2 rounded-full bg-white hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Form */}
      <div className="px-4 sm:px-6 pb-6">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-6"
        >
          {/* Schedule Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Schedule Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('video')}
                className={`flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-colors ${
                  scheduleType === 'video'
                    ? 'bg-reach-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Video chat
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('in-person')}
                className={`flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-colors ${
                  scheduleType === 'in-person'
                    ? 'bg-reach-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In-person
              </button>
            </div>
          </div>

          {/* Schedule Date and Time */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Schedule a date you're available
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label htmlFor="inspection-date" className="sr-only">Select date</label>
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="inspection-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-reach-primary/20"
                  required
                  aria-label="Select date"
                />
              </div>
              <div className="relative">
                <label htmlFor="inspection-time" className="sr-only">Select time</label>
                <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="inspection-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-reach-primary/20"
                  required
                  aria-label="Select time"
                  title="Select time"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Enter first & last name here"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reach-primary/20"
                required
              />
            </div>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Enter email here"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reach-primary/20"
                required
              />
            </div>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reach-primary/20"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !date || !time || !name || !email || !phone}
            className="w-full py-3 bg-reach-primary text-white rounded-2xl font-semibold hover:bg-reach-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Re-Scheduling...' : 'Re-Schedule'}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
