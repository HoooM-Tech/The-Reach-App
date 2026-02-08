'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Search, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { NIGERIAN_BANKS, type NigerianBank } from '@/lib/utils/nigerian-banks';

export const dynamic = 'force-dynamic';

export default function AddBankPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankObj, setSelectedBankObj] = useState<NigerianBank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return NIGERIAN_BANKS;
    const query = bankSearch.toLowerCase().trim();
    return NIGERIAN_BANKS.filter(b =>
      b.name.toLowerCase().includes(query) || b.code.includes(query)
    );
  }, [bankSearch]);

  const handleSelectBank = useCallback((bank: NigerianBank) => {
    setSelectedBankObj(bank);
    setBankSearch(bank.name);
    setShowBankDropdown(false);
    // Reset verification when bank changes
    setIsVerified(false);
    setAccountName('');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!selectedBankObj || accountNumber.length !== 10) {
      toast.error('Please select a bank and enter a 10-digit account number');
      return;
    }

    try {
      setIsVerifying(true);
      const response = await fetch('/api/wallet/bank-accounts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountNumber,
          bankCode: selectedBankObj.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.success && data.data?.accountName) {
        setAccountName(data.data.accountName);
        setIsVerified(true);
        toast.success('Account verified successfully');
      } else {
        throw new Error('Could not verify account');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify account');
    } finally {
      setIsVerifying(false);
    }
  }, [selectedBankObj, accountNumber]);

  const handleProceed = useCallback(async () => {
    if (!isVerified || !selectedBankObj || !accountName) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/wallet/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bankName: selectedBankObj.name,
          accountNumber,
          bankCode: selectedBankObj.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add bank account');
      }

      if (data.success) {
        toast.success('Bank account added successfully');
        router.push('/dashboard/developer/wallet/select-bank');
      } else {
        throw new Error(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Add bank error:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [isVerified, selectedBankObj, accountNumber, accountName, router]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="bg-transparent px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add bank account</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Verified Account Name Display */}
          {isVerified && accountName && (
            <div className="bg-gray-50 rounded-full px-4 py-3 flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {accountName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{accountName}</p>
            </div>
          )}

          {/* Bank Name Input with Search Dropdown */}
          <div className="mb-6 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
            <div className="relative">
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => {
                  setBankSearch(e.target.value);
                  setShowBankDropdown(true);
                  if (selectedBankObj && e.target.value !== selectedBankObj.name) {
                    setSelectedBankObj(null);
                    setIsVerified(false);
                    setAccountName('');
                  }
                }}
                onFocus={() => setShowBankDropdown(true)}
                className="w-full px-4 py-3 pr-10 border-2 border-[#FF6B35] rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                placeholder="Search for your bank..."
              />
              {bankSearch ? (
                <button
                  onClick={() => {
                    setBankSearch('');
                    setSelectedBankObj(null);
                    setIsVerified(false);
                    setAccountName('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label="Clear bank selection"
                  title="Clear bank selection"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              ) : (
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              )}
            </div>

            {/* Bank Dropdown */}
            {showBankDropdown && !selectedBankObj && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
                {filteredBanks.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No banks found</div>
                ) : (
                  filteredBanks.map((bank) => (
                    <button
                      key={`${bank.code}-${bank.name}`}
                      onClick={() => handleSelectBank(bank)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-b-0"
                    >
                      <span className="text-gray-900">{bank.name}</span>
                      {bank.popular && (
                        <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">Popular</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Account Number Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setAccountNumber(value);
                if (isVerified) {
                  setIsVerified(false);
                  setAccountName('');
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
              placeholder="Enter 10-digit account number"
              maxLength={10}
            />
            {accountNumber.length > 0 && accountNumber.length < 10 && (
              <p className="text-xs text-gray-400 mt-1">{10 - accountNumber.length} digits remaining</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 pb-6 sm:pb-8">
        <div className="max-w-lg mx-auto">
          <button
            onClick={isVerified ? handleProceed : handleVerify}
            disabled={
              isVerifying ||
              isSubmitting ||
              !selectedBankObj ||
              accountNumber.length !== 10
            }
            className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
              selectedBankObj && accountNumber.length === 10 && !isVerifying && !isSubmitting
                ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isVerifying
              ? 'Verifying...'
              : isSubmitting
                ? 'Adding...'
                : isVerified
                  ? 'Proceed'
                  : 'Verify account'}
          </button>
        </div>
      </div>

      {/* Click-away overlay for dropdown */}
      {showBankDropdown && !selectedBankObj && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowBankDropdown(false)}
        />
      )}
    </div>
  );
}
