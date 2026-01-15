
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../contexts/UserContext';

const slides = [
  {
    title: "Sell properties. Zero Headache.",
    img: "https://picsum.photos/400/500?random=1",
    subtitle: "List properties and reach millions of potential buyers effortlessly."
  },
  {
    title: "Turn Influence into Income.",
    img: "https://picsum.photos/400/500?random=2",
    subtitle: "Promote top-tier properties and earn commissions on every lead."
  },
  {
    title: "Find Your Home Without Fear.",
    img: "https://picsum.photos/400/500?random=3",
    subtitle: "Verified listings, secure escrow, and transparent communication."
  }
];

const Landing: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const { user, logout } = useUser();

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-reach-light overflow-hidden">
      {user && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Logout & Start Fresh
          </button>
        </div>
      )}
      <div className="flex-1 relative flex items-center justify-center p-6 mt-12">
         <div className="w-full h-full max-h-[450px] relative">
            {/* Visual representation of image blobs from design */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-[40px] rotate-12 bg-orange-200 overflow-hidden border-4 border-white shadow-lg">
                <img src="https://picsum.photos/200/200?random=11" alt="promo" className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-1/3 right-4 w-40 h-40 rounded-[40px] -rotate-6 bg-blue-200 overflow-hidden border-4 border-white shadow-lg z-10">
                <img src="https://picsum.photos/200/200?random=12" alt="promo" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-4 left-4 w-44 h-44 rounded-[40px] rotate-6 bg-red-200 overflow-hidden border-4 border-white shadow-lg z-20">
                <img src="https://picsum.photos/200/200?random=13" alt="promo" className="w-full h-full object-cover" />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-t-[40px] p-8 pb-12 flex flex-col items-center shadow-2xl">
        <div className="flex gap-2 mb-6">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-8 bg-reach-red' : 'w-2 bg-gray-300'}`} />
          ))}
        </div>

        <h1 className="text-3xl font-bold text-center text-reach-navy mb-4 leading-tight">
          {slides[currentSlide].title}
        </h1>
        
        <p className="text-gray-500 text-center mb-10 px-4">
          {slides[currentSlide].subtitle}
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={() => {
              if (user) {
                // If logged in, go to dashboard based on role
                const destination = user.role === 'developer' ? '/dashboard/developer' : '/dashboard';
                router.push(destination);
              } else {
                // If not logged in, go to role selection for onboarding
                router.push('/role-selection');
              }
            }}
            className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-opacity-90 transition-all active:scale-95 shadow-lg"
          >
            {user ? 'Go to Dashboard' : 'Create an Account'}
          </button>
          <button 
            onClick={() => {
              if (user) {
                // If logged in, go to dashboard based on role
                const destination = user.role === 'developer' ? '/dashboard/developer' : '/dashboard';
                router.push(destination);
              } else {
                // If not logged in, go to login page
                router.push('/login');
              }
            }}
            className="w-full bg-white text-reach-navy border-2 border-reach-navy font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
          >
            {user ? 'Continue to Dashboard' : 'Log In'}
          </button>
        </div>
        
        <p className="mt-6 text-sm text-gray-400">
          Already have an account? <span className="text-reach-navy font-bold cursor-pointer" onClick={() => router.push('/login')}>Sign in</span>
        </p>
      </div>
    </div>
  );
};

export default Landing;
