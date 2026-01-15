'use client';

/**
 * RoleSwitcher - Development tool for testing different user roles
 * 
 * NOTE: This component is for development/testing only.
 * In production, users should only access their assigned role.
 * 
 * This component is disabled by default. To enable it:
 * 1. Set NODE_ENV=development
 * 2. Add ?dev=true to the URL
 * 
 * WARNING: This bypasses real authentication and should never be used in production.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Settings } from 'lucide-react';

type UserRole = 'developer' | 'creator' | 'buyer' | 'admin';

export function RoleSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development mode and when ?dev=true is in URL
  const isDevMode = process.env.NODE_ENV === 'development' && searchParams.get('dev') === 'true';
  
  if (!isDevMode) {
    return null;
  }

  const currentRole = (user?.role || 'developer') as UserRole;
  const roles: UserRole[] = ['developer', 'creator', 'buyer', 'admin'];

  const handleRoleChange = (role: UserRole) => {
    setIsOpen(false);
    
    // Show warning that this is a dev tool
    alert('Role switching is a development tool. In production, users can only access their assigned role.');
    
    // Redirect based on role
    if (role === 'admin') {
      router.push('/admin/properties');
    } else if (role === 'developer') {
      router.push('/dashboard/developer');
    } else if (role === 'creator') {
      router.push('/dashboard/creator');
    } else {
      router.push('/dashboard/buyer');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
          title="Dev Tool: Switch Role (Development Only)"
        >
          <Settings size={20} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[200px]">
            <div className="p-2 bg-red-50 border-b border-red-200">
              <p className="text-xs font-semibold text-red-600">DEV TOOL</p>
              <p className="text-xs text-gray-600">Current: {currentRole}</p>
            </div>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  currentRole === role ? 'bg-red-50 font-semibold' : ''
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

