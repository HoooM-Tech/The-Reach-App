'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
}

export default function BuyerAddFundsBankTransferPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  useEffect(() => {
    const fetchVirtualAccount = async () => {
      try {
        const res = await fetch('/api/buyer/wallet/virtual-account', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.account) {
          setVirtualAccount(data.account);
        }
      } catch (error) {
        console.error('Failed to fetch virtual account:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchVirtualAccount();
  }, [user]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-3 flex items-center justify-between bg-white">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Bank Transfer</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 pt-6 pb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Transfer to this account</h3>

          {virtualAccount ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bank Name</p>
                <p className="font-semibold text-lg text-gray-900">{virtualAccount.bankName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Number</p>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <p className="font-bold text-xl text-gray-900">{virtualAccount.accountNumber}</p>
                  <button
                    onClick={() => handleCopy(virtualAccount.accountNumber)}
                    className="w-10 h-10 flex items-center justify-center"
                    aria-label="Copy account number"
                    title="Copy"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-600" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Name</p>
                <p className="font-semibold text-gray-900">{virtualAccount.accountName}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-4">Virtual account not yet assigned.</p>
              <p className="text-gray-500 text-sm">Use Card Payment to add funds for now.</p>
            </div>
          )}
        </div>

        {virtualAccount && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Transfer any amount to the account above</li>
              <li>• Your wallet will be credited automatically</li>
              <li>• Funds reflect within 5-10 minutes</li>
              <li>• This account is unique to you only</li>
            </ul>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200">
        <button
          onClick={() => router.push('/dashboard/buyer/wallet')}
          className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg hover:bg-[#1A3B5D]/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
