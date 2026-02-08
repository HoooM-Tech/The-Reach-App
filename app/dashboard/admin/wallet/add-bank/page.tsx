'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { NIGERIAN_BANKS } from '@/lib/utils/nigerian-banks';

export const dynamic = 'force-dynamic';

export default function AdminAddBankPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBankDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredBanks = NIGERIAN_BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleSelectBankName = (bank: { name: string; code: string }) => {
    setSelectedBank(bank);
    setBankSearch(bank.name);
    setShowBankDropdown(false);
    setIsVerified(false);
    setAccountName('');
  };

  const handleVerify = useCallback(async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit account number');
      return;
    }
    try {
      setIsVerifying(true);
      const res = await fetch('/api/wallet/bank-accounts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bankCode: selectedBank.code, accountNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      const name = data.data?.account_name || data.account_name || data.accountName || '';
      if (name) {
        setAccountName(name);
        setIsVerified(true);
        toast.success('Account verified!');
      } else {
        throw new Error('Could not verify account name');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [selectedBank, accountNumber]);

  const handleProceed = useCallback(async () => {
    if (!selectedBank || !accountName || !accountNumber) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/wallet/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bankName: selectedBank.name,
          bankCode: selectedBank.code,
          accountNumber,
          accountName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add bank account');
      toast.success('Bank account added successfully!');
      router.push('/dashboard/admin/wallet/select-bank');
    } catch (err) {
      console.error('Add bank error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add bank account');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBank, accountName, accountNumber, router]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA] flex flex-col">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-white shadow-sm">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add bank account</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <main className="flex-1 px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Verified Account Display */}
          {isVerified && accountName && (
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{accountName.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{accountName}</p>
                <p className="text-sm text-gray-500">{selectedBank?.name}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} className="text-green-600" />
              </div>
            </div>
          )}

          {/* Bank Name */}
          <div className="mb-4 relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => {
                  setBankSearch(e.target.value);
                  setShowBankDropdown(true);
                  setSelectedBank(null);
                  setIsVerified(false);
                  setAccountName('');
                }}
                onFocus={() => setShowBankDropdown(true)}
                placeholder="Search for your bank..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none transition-colors"
              />
            </div>
            {showBankDropdown && filteredBanks.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    onClick={() => handleSelectBankName(bank)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm flex items-center justify-between"
                  >
                    <span className="text-gray-900">{bank.name}</span>
                    {selectedBank?.code === bank.code && <Check size={16} className="text-green-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account Number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAccountNumber(val);
                if (val.length !== 10) {
                  setIsVerified(false);
                  setAccountName('');
                }
              }}
              placeholder="10-digit account number"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-300 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <button
            onClick={isVerified ? handleProceed : handleVerify}
            disabled={!selectedBank || accountNumber.length !== 10 || isVerifying || isSubmitting}
            className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1E3A5F]/90 transition-colors"
          >
            {isVerifying ? 'Verifying...' : isSubmitting ? 'Adding...' : isVerified ? 'Proceed' : 'Verify account'}
          </button>
        </div>
      </div>
    </div>
  );
}
