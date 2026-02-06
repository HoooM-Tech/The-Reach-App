'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, CheckCircle, Clock } from 'lucide-react';

interface Payout {
  id: string;
  user_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  due_date: string;
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    processed: 0,
    total: 0,
  });

  useEffect(() => {
    fetchPayouts();
    fetchStats();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payouts');
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts || []);
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Stats would come from API
    setStats({
      pending: payouts.filter(p => p.status === 'pending').length,
      processed: payouts.filter(p => p.status === 'completed').length,
      total: payouts.length,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-reach-light p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
          <button className="px-4 py-2 bg-[#0A1628] text-white rounded-lg font-medium hover:bg-[#0A1628]/90 transition-colors">
            Process Bulk Payout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Pending Payouts</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Processed This Month</h3>
            <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Total Payouts</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        {/* Payouts List */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Payouts</h2>
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628] mx-auto"></div>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No payouts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.slice(0, 10).map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {payout.user?.full_name || payout.user?.email || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500">{payout.user?.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(payout.net_amount)}</p>
                    <p className="text-xs text-gray-500">Due: {new Date(payout.due_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
