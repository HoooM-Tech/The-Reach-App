'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function AddFundsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading, isAuthenticated } = useUser();
  
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(0);
  const minDeposit = 1000;
  
  // Debug: Log auth state
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Add Funds Page] Auth state:', {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
      });
    }
  }, [isAuthenticated, user]);

  // Middleware handles authentication - no need to redirect here

  // Fetch current balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        // API route reads from cookies - no Authorization header needed
        const response = await fetch('/api/wallet/balance', {
          credentials: 'include', // CRITICAL: Include cookies for authentication
        });

        if (response.ok) {
          const data = await response.json();
          const walletData = data.data || data;
          setBalance(walletData.available_balance || walletData.availableBalance || 0);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    if (user?.id) {
      fetchBalance();
    }
  }, [user, userLoading, router]);

  const handleAmountChange = (value: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    // Only allow one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  const handlePresetAmount = (preset: number) => {
    setAmount(preset.toString());
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleAddFunds = async () => {
    const numericAmount = parseFloat(amount);
    
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (numericAmount < minDeposit) {
      toast.error(`Minimum deposit is ${formatAmount(minDeposit)}`);
      return;
    }

    setIsProcessing(true);

    try {
      // API route reads from cookies via getAuthenticatedUser()
      // No need to send Authorization header - cookies are included automatically
      const response = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Include cookies for authentication
        body: JSON.stringify({
          amount: numericAmount,
          callback_url: `${window.location.origin}/dashboard/developer/wallet/add-funds/success`,
        }),
      });

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[Add Funds] Failed to parse response:', parseError);
        const text = await response.text();
        console.error('[Add Funds] Response text:', text);
        throw new Error('Invalid response format from server');
      }

      // Log response for debugging
      console.log('[Add Funds] API Response:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        hasPayment: !!data.data?.payment,
        hasAuthUrl: !!data.data?.payment?.authorization_url,
        responseKeys: Object.keys(data),
      });

      if (!response.ok) {
        // Handle error responses
        const errorMessage = data.error?.message || data.error || data.message || `Failed to initialize payment (${response.status})`;
        console.error('[Add Funds] API Error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      // API returns: { success: true, data: { payment: { authorization_url: "..." } } }
      // Check for success response with authorization URL
      if (data.success && data.data?.payment?.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.data.payment.authorization_url;
      } else {
        // Log the actual response for debugging
        console.error('[Add Funds] Invalid response structure:', {
          success: data.success,
          hasData: !!data.data,
          hasPayment: !!data.data?.payment,
          hasAuthUrl: !!data.data?.payment?.authorization_url,
          fullResponse: data,
        });
        const errorMessage = data.error?.message || data.message || 'Invalid response from server. Please try again.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize payment');
      setIsProcessing(false);
    }
  };

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }
  
  // If not authenticated, middleware will handle redirect
  // Just show loading state while redirect happens
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const presetAmounts = [5000, 10000, 25000, 50000, 100000];

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {/*
          <button
            onClick={() => router.push('/dashboard/developer/wallet')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm border border-gray-100"
            aria-label="Back"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          */}
          <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <label className="block text-base text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent bg-white"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Minimum deposit: <span className="font-semibold text-gray-900">{formatAmount(minDeposit)}</span>
            </p>
          </div>

          {/* Preset Amounts */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Quick amounts</p>
            <div className="grid grid-cols-5 gap-2">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetAmount(preset)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    amount === preset.toString()
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}k` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Current Balance */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Current Balance</p>
            <p className="text-xl font-bold text-gray-900">{formatAmount(balance)}</p>
          </div>

          {/* Add Funds Button */}
          <button
            onClick={handleAddFunds}
            disabled={!amount || parseFloat(amount) < minDeposit || isProcessing}
            className={`w-full py-4 rounded-full font-medium transition-colors ${
              amount && parseFloat(amount) >= minDeposit && !isProcessing
                ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>
      </main>
    </div>
  );
}

