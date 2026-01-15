'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Calendar, Clock, X, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HandoverStep2Page() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    // Role check is handled by layout/middleware
  }, [user, userLoading, router]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime || !name || !location) {
      alert('Please fill in all fields');
      return;
    }
    // Here you would save the schedule
    setShowScheduleModal(false);
    // Continue to next step or show success
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDatePickerDone = () => {
    setShowDatePicker(false);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
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
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Progress Indicator */}
      <div className="px-6 pt-2 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500">Step 2</span>
        </div>
        <div className="flex gap-1.5">
          <div className="h-1.5 flex-1 bg-[#FF6B35] rounded-full"></div>
          <div className="h-1.5 flex-1 bg-[#FF6B35] rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pt-4 pb-32">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Provide Physical Keys / Access</h2>
          <p className="text-sm text-gray-600 mb-8">
            This is to give the buyer physical access to the property.
          </p>

          {/* Keys Illustration */}
          <div className="flex items-center justify-center mb-8 py-8">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <defs>
                  <linearGradient id="keyGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#D37D3E" />
                  </linearGradient>
                  <linearGradient id="keyGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D37D3E" />
                    <stop offset="100%" stopColor="#CC3333" />
                  </linearGradient>
                </defs>
                
                {/* Key Ring Circle */}
                <circle cx="60" cy="25" r="10" fill="none" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round"/>
                
                {/* First Key (Left/Orange) */}
                <path d="M 50 25 L 50 75 Q 50 80 45 80 L 35 80 Q 30 80 30 75 L 30 60 Q 30 55 35 55 L 40 55 Q 45 55 45 50 L 45 35 Q 45 30 50 30 Z" fill="url(#keyGradient1)" stroke="#FF6B35" strokeWidth="1"/>
                <circle cx="37.5" cy="57.5" r="3" fill="#FF6B35"/>
                
                {/* Second Key (Right/Reddish) */}
                <path d="M 70 30 L 70 80 Q 70 85 65 85 L 55 85 Q 50 85 50 80 L 50 65 Q 50 60 55 60 L 60 60 Q 65 60 65 55 L 65 40 Q 65 35 70 35 Z" fill="url(#keyGradient2)" stroke="#D37D3E" strokeWidth="1"/>
                <circle cx="57.5" cy="62.5" r="2.5" fill="#D37D3E"/>
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button className="w-full px-6 py-4 border-2 border-[#FF6B35] rounded-2xl bg-white text-gray-900 font-semibold hover:bg-orange-50 transition-colors">
              Hand keys to buyer / Reach admin
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-full flex items-center justify-center gap-2 text-[#FF6B35] font-semibold hover:text-[#D37D3E] transition-colors"
            >
              <span>Schedule key exchange</span>
              <ChevronRight size={20} />
            </button>
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
          onClick={() => {
            // For now, just go back or show a message
            // Will navigate to step-3 when that screen is added
            alert('Step 3 will be added next!');
          }}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
        >
          Continue
        </button>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowScheduleModal(false);
            }
          }}
        >
          <div className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto">
            {/* Drag Handle */}
            <div className="h-1 bg-gray-900 w-32 mx-auto mt-3 mb-4 rounded-full"></div>
            
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Schedule a date you're available</h3>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>
              
              {/* Date and Time Inputs */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Calendar size={20} className="text-gray-400" />
                    <span className={`flex-1 text-left ${selectedDate ? 'text-gray-700' : 'text-gray-400'}`}>
                      {selectedDate ? formatDate(selectedDate) : 'Select date'}
                    </span>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg pl-12 focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                    />
                    <Clock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter first & last name here"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                />
              </div>

              {/* Location Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location here"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                />
              </div>

              {/* Schedule Button */}
              <button
                onClick={handleSchedule}
                className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
              >
                Schedule
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
            if (e.target === e.currentTarget) {
              setShowDatePicker(false);
            }
          }}
        >
          <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Select a date</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Month/Year Display */}
            <div className="text-center py-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h4>
            </div>

            {/* Calendar */}
            <div className="px-6 pb-6">
              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth(currentMonth).map((date, index) => {
                  if (date === null) {
                    return <div key={`empty-${index}`} className="aspect-square"></div>;
                  }
                  const isSelectedDate = isSelected(date);
                  const isTodayDate = isToday(date);
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateSelect(date)}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors
                        ${isSelectedDate 
                          ? 'bg-gray-900 text-white' 
                          : isTodayDate
                            ? 'bg-gray-100 text-gray-900 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    const newMonth = new Date();
                    setCurrentMonth(newMonth);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>

              {/* Done Button */}
              <button
                onClick={handleDatePickerDone}
                className="w-full mt-6 bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
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
