'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Building2, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  FileText,
  Wallet,
  Settings,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  users: {
    total: number;
    developers: number;
    creators: number;
    buyers: number;
    growth: number;
  };
  properties: {
    total: number;
    verified: number;
    pending_verification: number;
    rejected: number;
    sold: number;
    growth: number;
  };
  financial: {
    total_revenue: number;
    escrow_held: number;
    pending_payouts: number;
    completed_payouts: number;
    growth: number;
  };
  activity: {
    leads_today: number;
    inspections_today: number;
    sales_this_month: number;
  };
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status?: string;
  user?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/admin/dashboard/stats'),
        fetch('/api/admin/dashboard/activity?limit=10')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'property_submitted':
      case 'property_verified':
        return <Building2 className="w-5 h-5" />;
      case 'user_registered':
        return <Users className="w-5 h-5" />;
      case 'withdrawal_processed':
        return <Wallet className="w-5 h-5" />;
      case 'dispute_resolved':
        return <CheckCircle2 className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-reach-light p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Platform Administrator</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-green-600">
                +{stats?.users.growth || 0}% from last month
              </span>
            </div>
            <h3 className="text-sm text-gray-600 mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">{stats?.users.total.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.users.developers || 0} Developers • {stats?.users.creators || 0} Creators • {stats?.users.buyers || 0} Buyers
            </p>
          </div>

          {/* Total Properties */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-green-600">
                +{stats?.properties.growth || 0}% from last month
              </span>
            </div>
            <h3 className="text-sm text-gray-600 mb-1">Total Properties</h3>
            <p className="text-3xl font-bold text-gray-900">{stats?.properties.total.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.properties.verified || 0} Active • {stats?.properties.pending_verification || 0} Pending • {stats?.properties.sold || 0} Sold
            </p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600">
                +{stats?.financial.growth || 0}% from last month
              </span>
            </div>
            <h3 className="text-sm text-gray-600 mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.financial.total_revenue ? formatCurrency(stats.financial.total_revenue) : '₦0'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.financial.completed_payouts ? formatCurrency(stats.financial.completed_payouts) : '₦0'} This Month
            </p>
          </div>

          {/* Pending Actions */}
          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/properties?status=pending')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-sm text-gray-600 mb-1">Pending Actions</h3>
            <p className="text-3xl font-bold text-gray-900">
              {(stats?.properties.pending_verification || 0) + (stats?.financial.pending_payouts ? 1 : 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.properties.pending_verification || 0} Properties • {stats?.financial.pending_payouts ? 1 : 0} Withdrawals
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/properties?status=pending')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Verify Properties</h3>
                <p className="text-sm text-gray-600">
                  {stats?.properties.pending_verification || 0} properties awaiting verification
                </p>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Review Now
            </button>
          </div>

          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/withdrawals?status=pending')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Process Withdrawals</h3>
                <p className="text-sm text-gray-600">
                  {stats?.financial.pending_payouts ? 'Withdrawal requests pending' : 'No pending withdrawals'}
                </p>
              </div>
            </div>
            <button className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
              Process
            </button>
          </div>

          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/disputes?status=open')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Resolve Disputes</h3>
                <p className="text-sm text-gray-600">
                  Active disputes need attention
                </p>
              </div>
            </div>
            <button className="w-full mt-4 bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors">
              View Disputes
            </button>
          </div>

          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/users?status=pending')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">User Verifications</h3>
                <p className="text-sm text-gray-600">
                  Users pending verification
                </p>
              </div>
            </div>
            <button className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              Review
            </button>
          </div>

          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/settings')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Platform Settings</h3>
                <p className="text-sm text-gray-600">
                  Configure platform settings
                </p>
              </div>
            </div>
            <button className="w-full mt-4 bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors">
              Settings
            </button>
          </div>

          <div 
            className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/admin/analytics')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Generate Reports</h3>
                <p className="text-sm text-gray-600">
                  Export analytics and reports
                </p>
              </div>
            </div>
            <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Reports
            </button>
          </div>
        </div>

        {/* Recent Activity & Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <button 
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => router.push('/dashboard/admin/activity')}
              >
                View All
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                        {activity.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                            activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Revenue Overview</h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart will be implemented with Recharts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
