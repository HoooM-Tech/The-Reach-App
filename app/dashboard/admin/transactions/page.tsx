'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Search, Filter, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  reference: string;
  type: string;
  category: string;
  amount: number;
  fee: number;
  total_amount: number;
  status: string;
  title: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export default function AdminTransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalVolume: 0,
    pending: 0,
    failed: 0,
  });
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'all',
    status: searchParams.get('status') || 'all',
    userType: searchParams.get('userType') || 'all',
  });

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') params.append(key, value);
      });

      const response = await fetch(`/api/admin/transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/transactions/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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
      case 'successful':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Successful</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transaction Management</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Total Transactions</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Total Volume</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalVolume)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm text-gray-600 mb-1">Failed</h3>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              title="Type select"
              aria-label="Type select"
              value={filters.type}
              onChange={(e) => {
                setFilters({ ...filters, type: e.target.value });
                router.push(`/dashboard/admin/transactions?type=${e.target.value}`);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <select
              title="Status select"
              aria-label="Status select"
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                router.push(`/dashboard/admin/transactions?status=${e.target.value}`);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
            </select>
            <select
              title="User type select"
              aria-label="User type select"
              value={filters.userType}
              onChange={(e) => {
                setFilters({ ...filters, userType: e.target.value });
                router.push(`/dashboard/admin/transactions?userType=${e.target.value}`);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="developer">Developer</option>
              <option value="creator">Creator</option>
              <option value="buyer">Buyer</option>
            </select>
            <button
              title="Clear filters button"
              aria-label="Clear filters button"
              onClick={() => {
                setFilters({ type: 'all', status: 'all', userType: 'all' });
                router.push('/dashboard/admin/transactions');
              }}
              className="w-full md:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628] mx-auto"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No transactions found</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-3">
                {transactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    className="w-full text-left bg-gray-50 rounded-xl p-4 border border-gray-100"
                    onClick={() => router.push(`/dashboard/admin/transactions/${transaction.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Transaction</p>
                        <p className="text-sm font-mono text-gray-900 break-words">{transaction.reference}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getTypeIcon(transaction.type)}
                          <span className="text-sm text-gray-900 capitalize">{transaction.type}</span>
                          <span className="text-xs text-gray-500">({transaction.category})</span>
                        </div>
                        <div className="mt-2 text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </div>
                        {transaction.fee > 0 && (
                          <div className="text-xs text-gray-500">Fee: {formatCurrency(transaction.fee)}</div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getStatusBadge(transaction.status)}
                          <span className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {transaction.user && (
                          <div className="mt-2 text-xs text-gray-500 break-words">
                            {transaction.user.full_name || transaction.user.email} • {transaction.user.role}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/admin/transactions/${transaction.id}`}
                        className="text-[#0A1628] text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono text-gray-900 break-words">{transaction.reference}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="text-sm text-gray-900 capitalize">{transaction.type}</span>
                          <span className="text-xs text-gray-500">({transaction.category})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {transaction.user ? (
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 break-words">{transaction.user.full_name || transaction.user.email}</div>
                            <div className="text-xs text-gray-500 break-words">{transaction.user.role}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</div>
                        {transaction.fee > 0 && (
                          <div className="text-xs text-gray-500">Fee: {formatCurrency(transaction.fee)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transaction.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/admin/transactions/${transaction.id}`}
                          className="text-[#0A1628] hover:text-[#0A1628]/80"
                        >
                          View
                        </Link>
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
