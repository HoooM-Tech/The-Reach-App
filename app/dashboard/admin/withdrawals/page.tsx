'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpCircle, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface Withdrawal {
  id: string;
  user_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  due_date: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
  bank_account?: {
    bank_name: string;
    account_number: string;
    account_name: string;
  };
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('status') || 'pending');

  useEffect(() => {
    fetchWithdrawals();
  }, [selectedTab]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTab !== 'all') {
        params.append('status', selectedTab);
      }

      const response = await fetch(`/api/admin/withdrawals?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this withdrawal?')) return;
    
    try {
      const response = await fetch(`/api/admin/withdrawals/${id}/approve`, {
        method: 'PATCH',
      });
      if (response.ok) {
        fetchWithdrawals();
      }
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;
    
    try {
      const response = await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        fetchWithdrawals();
      }
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Completed</span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Processing</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Withdrawal Management</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['pending', 'processing', 'completed', 'failed', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                  router.push(`/dashboard/admin/withdrawals?status=${tab}`);
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  selectedTab === tab
                    ? 'bg-[#0A1628] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628] mx-auto"></div>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <ArrowUpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No withdrawals found</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {withdrawal.user?.full_name || withdrawal.user?.email || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 break-words">
                          {withdrawal.user?.role || 'Unknown role'}
                        </p>
                        <div className="mt-2 text-sm text-gray-900">
                          Gross: <span className="font-semibold">{formatCurrency(withdrawal.gross_amount)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Fee: {formatCurrency(withdrawal.platform_fee)} • Net: {formatCurrency(withdrawal.net_amount)}
                        </div>
                        {withdrawal.bank_account ? (
                          <div className="mt-2 text-xs text-gray-500 break-words">
                            {withdrawal.bank_account.bank_name} • ****{withdrawal.bank_account.account_number.slice(-4)}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-gray-500">No bank details</div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {getStatusBadge(withdrawal.status)}
                          <span className="text-xs text-gray-500">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(withdrawal.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(withdrawal.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <Link
                          href={`/dashboard/admin/withdrawals/${withdrawal.id}`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {withdrawal.user ? (
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 break-words">{withdrawal.user.full_name || withdrawal.user.email}</div>
                            <div className="text-xs text-gray-500 break-words">{withdrawal.user.role}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(withdrawal.gross_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatCurrency(withdrawal.platform_fee)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(withdrawal.net_amount)}</div>
                      </td>
                      <td className="px-6 py-4">
                        {withdrawal.bank_account ? (
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 break-words">{withdrawal.bank_account.bank_name}</div>
                            <div className="text-xs text-gray-500 break-words">****{withdrawal.bank_account.account_number.slice(-4)}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(withdrawal.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(withdrawal.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(withdrawal.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/dashboard/admin/withdrawals/${withdrawal.id}`}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
