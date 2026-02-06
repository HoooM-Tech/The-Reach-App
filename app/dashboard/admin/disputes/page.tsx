'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Search, Eye, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Dispute {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  complainant?: {
    full_name: string;
    email: string;
  };
  respondent?: {
    full_name: string;
    email: string;
  };
}

export default function AdminDisputesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('status') || 'open');

  useEffect(() => {
    fetchDisputes();
  }, [selectedTab]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTab !== 'all') {
        params.append('status', selectedTab);
      }

      const response = await fetch(`/api/admin/disputes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">High</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Medium</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Low</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{priority}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Resolved</span>;
      case 'under_review':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Under Review</span>;
      case 'open':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Open</span>;
      case 'closed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Closed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dispute Management</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['open', 'under_review', 'resolved', 'closed', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                  router.push(`/dashboard/admin/disputes?status=${tab}`);
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  selectedTab === tab
                    ? 'bg-[#0A1628] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'under_review' ? 'Under Review' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Disputes Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628] mx-auto"></div>
            </div>
          ) : disputes.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No disputes found</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-3">
                {disputes.map((dispute) => (
                  <button
                    key={dispute.id}
                    className="w-full text-left bg-gray-50 rounded-xl p-4 border border-gray-100"
                    onClick={() => router.push(`/dashboard/admin/disputes/${dispute.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">#{dispute.id.slice(0, 8)}</p>
                        <p className="text-sm font-medium text-gray-900 break-words">{dispute.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{dispute.type}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getPriorityBadge(dispute.priority)}
                          {getStatusBadge(dispute.status)}
                          <span className="text-xs text-gray-500">
                            {new Date(dispute.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 break-words">
                          Filed by: {dispute.complainant?.full_name || dispute.complainant?.email || 'N/A'}
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/admin/disputes/${dispute.id}`}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispute ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filed Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {disputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono text-gray-900">#{dispute.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">{dispute.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 break-words">{dispute.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        {dispute.complainant ? (
                          <div className="text-sm text-gray-900 break-words">{dispute.complainant.full_name || dispute.complainant.email}</div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(dispute.priority)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(dispute.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/admin/disputes/${dispute.id}`}
                          className="text-[#0A1628] hover:text-[#0A1628]/80 font-medium text-sm flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
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
