'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, Loader2, Search } from 'lucide-react';
import { walletApi, getAccessToken } from '@/lib/api/client';
import { NIGERIAN_BANKS, getBanksByCategory, searchBanks, type NigerianBank } from '@/lib/utils/nigerian-banks';
import toast from 'react-hot-toast';

export default function AddBankAccountPage() {
  const router = useRouter();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter banks based on search query
  const filteredBanks = useMemo(() => {
    if (!searchQuery.trim()) {
      const grouped = getBanksByCategory();
      return {
        popular: grouped.popular,
        traditional: grouped.traditional,
        digital: grouped.digital,
        fintech: grouped.fintech,
        microfinance: grouped.microfinance,
      };
    }
    const results = searchBanks(searchQuery);
    return {
      popular: [],
      traditional: results.filter(b => b.category === 'traditional'),
      digital: results.filter(b => b.category === 'digital'),
      fintech: results.filter(b => b.category === 'fintech'),
      microfinance: results.filter(b => b.category === 'microfinance'),
    };
  }, [searchQuery]);

  const allFilteredBanks = useMemo(() => {
    return [
      ...filteredBanks.popular,
      ...filteredBanks.traditional,
      ...filteredBanks.digital,
      ...filteredBanks.fintech,
      ...filteredBanks.microfinance,
    ];
  }, [filteredBanks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBankDropdown(false);
      }
    };

    if (showBankDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBankDropdown]);

  const handleBankSelect = (bank: NigerianBank) => {
    setBankName(bank.name);
    setBankCode(bank.code);
    setShowBankDropdown(false);
    setSearchQuery('');
    // Don't reset verification state if only bank is changed
    // Only reset if account number changes
  };

  const handleVerify = async () => {
    if (!accountNumber || accountNumber.length !== 10 || !bankCode) {
      toast.error('Please enter a valid 10-digit account number and select a bank');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify account via API
      const token = getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Call Paystack verification via our API
      const response = await fetch('/api/wallet/bank-accounts/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber,
          bankCode,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify account');
      }

      const responseData = await response.json();
      // Handle both response formats: { success: true, data: {...} } or direct data
      const accountData = responseData.data || responseData;
      const verifiedAccountName = accountData.accountName || accountData.account_name;
      
      if (!verifiedAccountName) {
        throw new Error('Account name not found in response');
      }
      
      setAccountName(verifiedAccountName);
      setIsVerified(true);
      console.log('[Bank Account] Verification successful:', {
        accountName: verifiedAccountName,
        accountNumber,
        bankCode,
        isVerified: true,
      });
      toast.success('Account verified successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify account. Please check the details.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    console.log('[Bank Account] Submit attempt:', {
      isVerified,
      accountName,
      accountNumber,
      bankCode,
      bankName,
    });
    
    if (!isVerified || !accountName) {
      console.error('[Bank Account] Submit failed - verification check:', {
        isVerified,
        accountName,
      });
      toast.error('Please verify the account first');
      return;
    }

    setIsSubmitting(true);
    try {
      await walletApi.addBankAccount({
        bankName,
        accountNumber,
        bankCode,
      });
      toast.success('Bank account added successfully');
      router.push('/dashboard/creator/wallet/bank-accounts');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add bank account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
            aria-label="Go back"
            title="Go back"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Add bank account</h1>
          <button
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6">
          {isVerified && accountName && (
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <span className="text-white text-xl font-bold">
                  {accountName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <p className="text-white font-semibold">{accountName}</p>
            </div>
          )}

          {/* Bank Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">Bank Name</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowBankDropdown(!showBankDropdown)}
                className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none text-left flex items-center justify-between ${
                  bankCode ? 'border-orange-500' : 'border-gray-300'
                }`}
              >
                <span className={bankCode ? 'text-gray-900' : 'text-gray-500'}>
                  {bankName || 'Select Bank'}
                </span>
                <ChevronLeft
                  size={20}
                  className={`text-gray-400 transition-transform ${showBankDropdown ? 'rotate-90' : '-rotate-90'}`}
                />
              </button>

              {showBankDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-96 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search banks..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Bank List */}
                  <div className="overflow-y-auto max-h-80">
                    {filteredBanks.popular.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Popular</p>
                        {filteredBanks.popular.map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => handleBankSelect(bank)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <p className="font-medium text-gray-900">{bank.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {filteredBanks.traditional.length > 0 && (
                      <div className="p-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Traditional Banks</p>
                        {filteredBanks.traditional.map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => handleBankSelect(bank)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <p className="font-medium text-gray-900">{bank.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {filteredBanks.digital.length > 0 && (
                      <div className="p-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Digital Banks</p>
                        {filteredBanks.digital.map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => handleBankSelect(bank)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <p className="font-medium text-gray-900">{bank.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {filteredBanks.fintech.length > 0 && (
                      <div className="p-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Fintech</p>
                        {filteredBanks.fintech.map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => handleBankSelect(bank)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <p className="font-medium text-gray-900">{bank.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {filteredBanks.microfinance.length > 0 && (
                      <div className="p-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Microfinance</p>
                        {filteredBanks.microfinance.map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => handleBankSelect(bank)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <p className="font-medium text-gray-900">{bank.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {allFilteredBanks.length === 0 && (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">No banks found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Number */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => {
                const newValue = e.target.value.replace(/\D/g, '');
                setAccountNumber(newValue);
                // Reset verification state if account number changes
                if (newValue !== accountNumber && isVerified) {
                  setIsVerified(false);
                  setAccountName('');
                }
              }}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
              placeholder="1234567890"
            />
          </div>

          {!isVerified ? (
            <button
              onClick={handleVerify}
              disabled={isVerifying || !accountNumber || accountNumber.length !== 10 || !bankCode}
              className={`w-full py-4 rounded-full font-medium ${
                accountNumber.length === 10 && bankCode && !isVerifying
                  ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              } transition-colors flex items-center justify-center gap-2`}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify account'
              )}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Proceed'
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
