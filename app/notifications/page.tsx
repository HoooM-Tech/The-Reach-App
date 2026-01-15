'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { notificationsApi, ApiError } from '@/lib/api/client';
import { AuthGuard } from '@/components/auth/RoleGuard';
import { 
  Bell, 
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';

// ===========================================
// Notification Item Component
// ===========================================

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  };
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const getTypeIcon = (type: string) => {
    const icons: Record<string, { icon: React.ReactNode; color: string }> = {
      success: { icon: <CheckCircle size={20} />, color: 'text-emerald-500 bg-emerald-100' },
      info: { icon: <Info size={20} />, color: 'text-blue-500 bg-blue-100' },
      warning: { icon: <AlertTriangle size={20} />, color: 'text-orange-500 bg-orange-100' },
      error: { icon: <XCircle size={20} />, color: 'text-red-500 bg-red-100' },
    };
    return icons[type] || icons.info;
  };

  const typeStyle = getTypeIcon(notification.type);

  return (
    <div
      className={`p-4 border-b border-gray-100 last:border-0 transition-colors ${
        notification.is_read ? 'bg-white' : 'bg-blue-50/50'
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeStyle.color}`}>
          {typeStyle.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
              {notification.title}
            </h3>
            {!notification.is_read && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="text-xs text-blue-600 hover:underline flex-shrink-0"
              >
                Mark read
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
            <Clock size={12} />
            {new Date(notification.created_at).toLocaleDateString()} at{' '}
            {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Page Content
// ===========================================

function NotificationsPageContent() {
  const router = useRouter();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get back path based on role
  const getBackPath = () => {
    switch (user?.role) {
      case 'developer':
        return '/dashboard/developer';
      case 'creator':
        return '/dashboard/creator';
      case 'buyer':
        return '/dashboard/buyer';
      default:
        return '/dashboard';
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await notificationsApi.getNotifications(user.id);
      setNotifications(response.notifications || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load notifications';
      setError(message);
      console.error('Notifications fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Mark notification as read
  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(getBackPath())}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500">{unreadCount} unread</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Loading */}
        {isLoading && (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load notifications</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="p-4">
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && !error && notifications.length > 0 && (
          <div className="bg-white border-t border-gray-100">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ===========================================
// Exported Page with Auth Guard
// ===========================================

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsPageContent />
    </AuthGuard>
  );
}
