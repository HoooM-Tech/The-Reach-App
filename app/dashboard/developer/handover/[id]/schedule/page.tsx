'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerHandoverApi, ApiError } from '@/lib/api/client';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  X,
  Loader2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ScheduleHandoverPage() {
  const router = useRouter();
  const params = useParams();
  const handoverId = params.id as string;
  const { user, isLoading: userLoading } = useUser();

  const [handover, setHandover] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Schedule form state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [attendeeName, setAttendeeName] = useState('');
  const [location, setLocation] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Time picker state
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('AM');

  const fetchHandover = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await developerHandoverApi.getHandover(handoverId);
      setHandover(data);

      // If already scheduled, show the scheduled info
      if (data.physicalHandoverDate || data.status === 'scheduled') {
        setIsScheduled(true);
        setScheduleData({
          date: data.physicalHandoverDate,
          time: data.physicalHandoverTime,
          location: data.physicalHandoverLocation,
          attendeeName: data.physicalHandoverAttendeeName,
        });
      }
    } catch (err) {
      console.error('Failed to fetch handover:', err);
    } finally {
      setIsLoading(false);
    }
  }, [handoverId]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    if (handoverId) fetchHandover();
  }, [user, userLoading, router, handoverId, fetchHandover]);

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatTimeDisplay = (): string => {
    if (!selectedTime) return '';
    return selectedTime;
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateSelect = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return; // Don't allow past dates
    setSelectedDate(date);
  };

  const handleTimePickerDone = () => {
    const hourDisplay = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
    const minuteStr = selectedMinute.toString().padStart(2, '0');
    setSelectedTime(`${hourDisplay}:${minuteStr}${selectedAmPm}`);
    setShowTimePicker(false);
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !attendeeName || !location) {
      alert('Please fill in all fields');
      return;
    }

    setIsScheduling(true);
    try {
      const result = await developerHandoverApi.scheduleHandover(handoverId, {
        date: formatDateDisplay(selectedDate),
        time: selectedTime,
        attendeeName,
        location,
      });

      setIsScheduled(true);
      setScheduleData({
        date: formatDateDisplay(selectedDate),
        time: selectedTime,
        location,
        attendeeName,
      });
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Schedule failed:', err);
      alert(err instanceof ApiError ? err.message : 'Failed to schedule handover');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleContinue = () => {
    router.push(`/dashboard/developer/handover/${handoverId}/confirm`);
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Progress Indicator */}
      <div className="px-4 py-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Step 2</p>
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 bg-orange-500 rounded-full" />
          <div className="flex-1 h-1.5 bg-orange-500 rounded-full" />
          <div className="flex-1 h-1.5 bg-gray-300 rounded-full" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-2 pb-32">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Provide Physical Keys / Access
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            This is to give the buyer physical access to the property.
          </p>

          {/* Key Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center">
              <Image
                src="/game-icons_house-keys.png"
                alt="Property Keys"
                width={192}
                height={192}
                className="object-contain w-full h-full"
                priority
              />
            </div>
          </div>

          {!isScheduled ? (
            // Show schedule button
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-full py-4 border-2 border-orange-500 text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition"
            >
              Hand keys to buyer / Reach admin
            </button>
          ) : (
            // Show scheduled details
            <>
              <div className="mt-2">
                <h4 className="font-semibold text-gray-900 mb-3">Scheduled key exchange</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-gray-600">
                    {scheduleData?.date ? getDayName(new Date(scheduleData.date)) : 'Monday'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{scheduleData?.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>1</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{scheduleData?.time}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                    <span>{scheduleData?.location}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Reminder</p>
                    <p className="text-sm font-medium text-gray-700">
                      Notify 1 day before due date
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="w-full mt-6 py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom Action (when not scheduled) */}
      {!isScheduled && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200 z-10">
          <button
            disabled
            className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg opacity-50 cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowScheduleModal(false);
          }}
        >
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-slideUp">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4" />

            <div className="px-6 pb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Schedule a date you&apos;re available
              </h3>

              <div className="space-y-4 mb-6">
                {/* Date & Time Row */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className={selectedDate ? 'text-gray-700' : 'text-gray-400'}>
                      {selectedDate ? formatDateDisplay(selectedDate) : 'Select date'}
                    </span>
                  </button>
                  <button
                    onClick={() => setShowTimePicker(true)}
                    className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className={selectedTime ? 'text-gray-700' : 'text-gray-400'}>
                      {selectedTime || 'Select time'}
                    </span>
                  </button>
                </div>

                {/* Name Input */}
                <input
                  type="text"
                  placeholder="Enter first & last name here"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />

                {/* Location Input */}
                <input
                  type="text"
                  placeholder="Enter location here"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />
              </div>

              <button
                onClick={handleSchedule}
                disabled={!selectedDate || !selectedTime || !attendeeName || !location || isScheduling}
                className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg disabled:opacity-50"
              >
                {isScheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDatePicker(false);
          }}
        >
          <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Select a date</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                title="Close date picker"
                aria-label="Close date picker"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="text-center py-3">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    const m = new Date(currentMonth);
                    m.setMonth(m.getMonth() - 1);
                    setCurrentMonth(m);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &lt;
                </button>
                <h4 className="text-base font-semibold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={() => {
                    const m = new Date(currentMonth);
                    m.setMonth(m.getMonth() + 1);
                    setCurrentMonth(m);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((date, index) => {
                  if (!date) return <div key={`e-${index}`} className="aspect-square" />;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = date < today;
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const isToday = date.toDateString() === today.toDateString();

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => !isPast && handleDateSelect(date)}
                      disabled={isPast}
                      className={`aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : isToday
                          ? 'bg-gray-100 text-gray-900 font-bold'
                          : isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowDatePicker(false)}
                className="w-full mt-6 py-4 bg-[#1A3B5D] text-white rounded-full font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTimePicker(false);
          }}
        >
          <div className="bg-white rounded-t-3xl w-full">
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Select Time</h3>
              <button
                onClick={() => setShowTimePicker(false)}
                className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                title="Close time picker"
                aria-label="Close time picker"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="px-6 py-8">
              <div className="flex items-center justify-center gap-4">
                {/* Hour */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedHour((h) => (h >= 12 ? 1 : h + 1))}
                    className="text-gray-400 py-2"
                  >
                    {selectedHour >= 12 ? 1 : selectedHour + 1 > 12 ? selectedHour + 1 - 12 : selectedHour + 1}
                  </button>
                  <div className="bg-gray-100 rounded-lg px-6 py-3">
                    <span className="text-xl font-semibold">
                      {selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedHour((h) => (h <= 1 ? 12 : h - 1))}
                    className="text-gray-400 py-2"
                  >
                    {selectedHour <= 1 ? 12 : selectedHour - 1 > 12 ? selectedHour - 1 - 12 : selectedHour - 1}
                  </button>
                </div>

                {/* Minute */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedMinute((m) => (m >= 59 ? 0 : m + 1))}
                    className="text-gray-400 py-2"
                  >
                    {String((selectedMinute + 1) % 60).padStart(2, '0')}
                  </button>
                  <div className="bg-gray-100 rounded-lg px-6 py-3">
                    <span className="text-xl font-semibold">
                      {String(selectedMinute).padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedMinute((m) => (m <= 0 ? 59 : m - 1))}
                    className="text-gray-400 py-2"
                  >
                    {String((selectedMinute - 1 + 60) % 60).padStart(2, '0')}
                  </button>
                </div>

                {/* AM/PM */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedAmPm(selectedAmPm === 'AM' ? 'PM' : 'AM')}
                    className="text-gray-400 py-2"
                  >
                    {selectedAmPm === 'AM' ? 'PM' : 'AM'}
                  </button>
                  <div className="bg-gray-100 rounded-lg px-6 py-3">
                    <span className="text-xl font-semibold">{selectedAmPm}</span>
                  </div>
                  <button
                    onClick={() => setSelectedAmPm(selectedAmPm === 'AM' ? 'PM' : 'AM')}
                    className="text-gray-400 py-2"
                  >
                    {selectedAmPm === 'AM' ? 'PM' : 'AM'}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 pb-8">
              <button
                onClick={handleTimePickerDone}
                className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
