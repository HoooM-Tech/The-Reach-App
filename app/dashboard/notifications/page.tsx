'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { notificationsApi, ApiError } from '@/lib/api/client';
import { AuthGuard } from '@/components/auth/RoleGuard';
import { groupNotificationsByDate, sortDateGroups } from '@/lib/utils/date-grouping';
import { resolveNotificationRoute, getNotificationActionLabel } from '@/lib/utils/notification-routing';
import { 
  Bell, 
  Users,
  Building2,
  ArrowDownSquare,
  Menu,
  X,
  Filter,
  Check,
} from 'lucide-react';

// ===========================================
// Types
// ===========================================

interface Notification {
  id: string;
  title: string;
  message: string;
  body?: string;
  type: string;
  is_read: boolean;
  read?: boolean;
  created_at: string;
  data?: {
    property_id?: string;
    property_title?: string;
    lead_id?: string;
    inspection_id?: string;
    contract_id?: string;
    transaction_id?: string;
    amount?: number;
    [key: string]: any;
  };
}

// ===========================================
// Notification Icon Component - Exact Colors
// ===========================================

interface NotificationIconProps {
  type: string;
}

function NotificationIcon({ type }: NotificationIconProps) {
  const getIconConfig = () => {
    // Orange icons: new_lead, inspection_booked, contract_executed, new_bid
    if (type === 'new_lead' || type === 'inspection_booked' || type === 'contract_executed' || type === 'new_bid') {
      return {
        icon: <Users size={20} className="text-white" />,
        bgColor: 'bg-orange-400', // Light orange matching design
      };
    }
    
    // Green icons: property_verified, property_bought, deposit_cash, payout_processed
    if (type === 'property_verified' || type === 'property_bought' || 
        type === 'deposit_cash' || type === 'payout_processed' || type === 'payment_confirmed') {
      return {
        icon: type === 'deposit_cash' || type === 'payout_processed' || type === 'payment_confirmed' 
          ? <ArrowDownSquare size={20} className="text-white" />
          : <Building2 size={20} className="text-white" />,
        bgColor: 'bg-green-400', // Light green matching design
      };
    }
    
    // Default fallback
    return {
      icon: <Users size={20} className="text-white" />,
      bgColor: 'bg-orange-400',
    };
  };

  const config = getIconConfig();

  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
      {config.icon}
    </div>
  );
}

// ===========================================
// Notification Item Component - Exact Layout
// ===========================================

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  userRole?: string;
}

function NotificationItem({ notification, onMarkRead, userRole }: NotificationItemProps) {
  const router = useRouter();
  const message = notification.message || notification.body || 'You just got a new Lead';
  const isUnread = !notification.is_read && !notification.read;

  // Get action URL using type-safe routing resolver
  const actionUrl = resolveNotificationRoute(notification, userRole);
  
  // Get action label using type-safe resolver
  const actionLabel = getNotificationActionLabel(notification, userRole);

  // Format timestamp exactly as shown in screenshot: "Yesterday, 1:05 PM"
  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (notificationDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    
    // For older dates, show full date: "October 25, 2025"
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const handleClick = () => {
    // Mark as read if unread
    if (isUnread) {
      onMarkRead(notification.id);
    }
    
    // Only navigate if there's a valid action URL
    // For creators, this ensures we never navigate to public property pages
    if (actionUrl) {
      router.push(actionUrl);
    }
    // If no action URL (e.g., system notifications), just mark as read
    // No navigation occurs - this is the correct behavior for read-only notifications
  };

  // For transactions with amounts, show date and amount on same line
  const hasAmount = notification.data?.amount !== undefined && notification.data?.amount !== null;

  return (
    <div
      className={`px-4 py-4 border-b border-gray-200 cursor-pointer ${hasAmount ? '' : 'bg-transparent'}`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <NotificationIcon type={notification.type} />
        <div className="flex-1 min-w-0">
          {/* Title - Bold, black */}
          <h3 className="font-bold text-gray-900 mb-1 text-base leading-tight">
            {notification.title}
          </h3>
          
          {/* Message - Light gray, multi-line */}
          {message && !hasAmount && (
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              {message}
            </p>
          )}
          
          {/* For transactions: Date on left, Amount on right */}
          {hasAmount && notification.data ? (
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500">
                {formatTimestamp(notification.created_at)}
              </p>
              <span className="text-base font-semibold text-gray-900">
                ₦{notification.data.amount?.toLocaleString() || '0'}
              </span>
            </div>
          ) : (
            <>
              {/* Timestamp and Action Link on same line */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {formatTimestamp(notification.created_at)}
                </p>
                
                {/* Action Link - Orange text, underlined, right-aligned */}
                {actionLabel && actionUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(actionUrl);
                    }}
                    className="text-sm text-orange-500 hover:text-orange-600 underline font-medium"
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Empty State Component - Exact Match
// ===========================================

function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center">
        <p className="text-gray-600 text-base font-medium">
          Notifications will appear here....
        </p>
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await notificationsApi.getNotifications(user.id);
      
      // Handle both direct array and wrapped response
      const notificationsArray = Array.isArray(response) 
        ? response 
        : response?.notifications || [];
      
      // Sort by newest first
      const sorted = notificationsArray.sort((a: Notification, b: Notification) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setNotifications(sorted);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load notifications';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Mark notification as read
  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true, read: true } : n))
      );
    } catch (err) {
      // Silently fail - notification will remain unread
    }
  };

  // Filter notifications
  const filteredNotifications = React.useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') {
      return notifications.filter(n => !n.is_read && !n.read);
    }
    if (filter === 'read') {
      return notifications.filter(n => n.is_read || n.read);
    }
    return notifications;
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    if (filteredNotifications.length === 0) return [];
    const groups = groupNotificationsByDate(filteredNotifications);
    return sortDateGroups(groups);
  }, [filteredNotifications]);

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header - Exact match to screenshot */}
      <header className="sticky top-0 z-40 bg-[#FFF5F5] border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Title - Left side, bold, large */}
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            
            {/* Action buttons - Right side, white circles */}
            <div className="flex items-center gap-2 relative">
              <button
                aria-label="Notifications"
                className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Bell size={18} className="text-gray-900" />
              </button>
              <button
                aria-label="Filter Menu"
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                {isFilterMenuOpen ? (
                  <X size={18} className="text-gray-900" />
                ) : (
                  <Menu size={18} className="text-gray-900" />
                )}
              </button>

              {/* Filter Menu Dropdown */}
              {isFilterMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsFilterMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 top-12 z-40 bg-white rounded-lg shadow-lg border border-gray-200 min-w-max max-w-screen-sm py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">Filter</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFilter('all');
                        setIsFilterMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">All Notifications</span>
                      {filter === 'all' && <Check size={16} className="text-orange-500" />}
                    </button>
                    <button
                      onClick={() => {
                        setFilter('unread');
                        setIsFilterMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">Unread</span>
                      {filter === 'unread' && <Check size={16} className="text-orange-500" />}
                    </button>
                    <button
                      onClick={() => {
                        setFilter('read');
                        setIsFilterMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">Read</span>
                      {filter === 'read' && <Check size={16} className="text-orange-500" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="bg-[#FFF5F5]">
        {/* Loading State */}
        {isLoading && (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-200">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load notifications</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State - Only when zero notifications */}
        {!isLoading && !error && filteredNotifications.length === 0 && notifications.length === 0 && <EmptyState />}
        
        {/* Show message when filter results in no notifications */}
        {!isLoading && !error && filteredNotifications.length === 0 && notifications.length > 0 && (
          <div className="p-4">
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
              <p className="text-gray-600">
                No {filter === 'unread' ? 'unread' : filter === 'read' ? 'read' : ''} notifications found.
              </p>
              <button
                onClick={() => setFilter('all')}
                className="mt-4 text-sm text-orange-500 hover:text-orange-600 underline"
              >
                Show all notifications
              </button>
            </div>
          </div>
        )}

        {/* Notifications List - Grouped by Date */}
        {!isLoading && !error && groupedNotifications.length > 0 && (
          <div className="bg-white">
            {groupedNotifications.map((group, groupIndex) => (
              <div key={group.key}>
                {/* Date Header - Bold, black text */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                  <h2 className="text-sm font-bold text-gray-900">{group.label}</h2>
                </div>
                
                {/* Notifications in this group */}
                {group.notifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    userRole={user?.role}
                  />
                ))}
              </div>
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
