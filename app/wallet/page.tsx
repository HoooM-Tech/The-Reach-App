'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { walletApi, WalletData, ApiError } from '@/lib/api/client';
import { AuthGuard } from '@/components/auth/RoleGuard';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

// ===========================================
// Transaction Item Component
// ===========================================

interface TransactionItemProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    description: string;
    status?: string;
    created_at: string;
  };
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isCredit = transaction.type === 'credit' || transaction.type === 'deposit' || transaction.amount > 0;
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      completed: { color: 'text-green-600', icon: <CheckCircle size={12} /> },
      pending: { color: 'text-orange-600', icon: <Clock size={12} /> },
      failed: { color: 'text-red-600', icon: <XCircle size={12} /> },
    };
    return statusConfig[status.toLowerCase()] || null;
  };

  const statusInfo = getStatusBadge(transaction.status);

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isCredit ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {isCredit ? (
            <ArrowDownLeft className="text-green-600" size={18} />
          ) : (
            <ArrowUpRight className="text-red-600" size={18} />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{transaction.description}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {new Date(transaction.created_at).toLocaleDateString()} at{' '}
              {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {statusInfo && (
              <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                {statusInfo.icon}
                {transaction.status}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
        {isCredit ? '+' : '-'}{formatAmount(transaction.amount)}
      </p>
    </div>
  );
}

// ===========================================
// Withdrawal Modal Component
// ===========================================

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: number;
  onWithdraw: (amount: number, bankDetails: any) => Promise<void>;
}

function WithdrawalModal({ isOpen, onClose, maxAmount, onWithdraw }: WithdrawalModalProps) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bank_code: '',
    account_number: '',
    account_name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (amountNum > maxAmount) {
      setError('Amount exceeds available balance');
      return;
    }
    if (!bankDetails.bank_code || !bankDetails.account_number || !bankDetails.account_name) {
      setError('Please fill in all bank details');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onWithdraw(amountNum, bankDetails);
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Withdrawal failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold">Withdraw Funds</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Available: {formatAmount(maxAmount)}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1000, 5000, 10000, maxAmount].map((val, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAmount(String(Math.min(val, maxAmount)))}
                    className="py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    {idx === 3 ? 'Max' : formatAmount(val).replace('₦', '₦')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-3 bg-[#0A1628] text-white rounded-xl font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <select
                  value={bankDetails.bank_code}
                  onChange={e => setBankDetails({ ...bankDetails, bank_code: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                >
                  <option value="">Select Bank</option>
                  <option value="044">Access Bank</option>
                  <option value="058">GTBank</option>
                  <option value="011">First Bank</option>
                  <option value="057">Zenith Bank</option>
                  <option value="033">UBA</option>
                  <option value="035">Wema Bank</option>
                  <option value="232">Sterling Bank</option>
                  <option value="070">Fidelity Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={bankDetails.account_number}
                  onChange={e => setBankDetails({ ...bankDetails, account_number: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                  placeholder="0123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  value={bankDetails.account_name}
                  onChange={e => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
                  placeholder="John Doe"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">{formatAmount(parseFloat(amount) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee</span>
                  <span className="font-semibold">₦50</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Total</span>
                  <span className="font-bold text-[#E54D4D]">
                    {formatAmount((parseFloat(amount) || 0) + 50)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-[#E54D4D] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Wallet Page Content
// ===========================================

function WalletPageContent() {
  const router = useRouter();
  const { user } = useUser();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Fetch wallet data from real API
  const fetchWalletData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await walletApi.getWallet(user.id);
      setWalletData(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load wallet';
      setError(message);
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user?.id]);

  // Handle withdrawal
  const handleWithdraw = async (amount: number, bankDetails: any) => {
    await walletApi.withdraw({
      amount,
      ...bankDetails,
    });
    // Refresh wallet data
    await fetchWalletData();
  };

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get back navigation based on role
  const getBackPath = () => {
    switch (user?.role) {
      case 'developer':
        return '/dashboard/developer';
      case 'creator':
        return '/dashboard/creator';
      case 'buyer':
        return '/dashboard/buyer';
      default:
        return '/dashboard';
    }
  };

  // Get role-specific styling
  const getRoleColor = () => {
    switch (user?.role) {
      case 'developer':
        return 'from-[#0A1628] to-[#1a2d4a]';
      case 'creator':
        return 'from-purple-600 to-pink-600';
      case 'buyer':
        return 'from-[#E54D4D] to-[#ff6b6b]';
      default:
        return 'from-[#0A1628] to-[#1a2d4a]';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load wallet</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchWalletData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const balance = walletData?.wallet?.balance || 0;
  const lockedBalance = walletData?.wallet?.locked_balance || 0;
  const availableBalance = balance - lockedBalance;
  const transactions = walletData?.transactions || [];

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(getBackPath())}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-semibold text-gray-900">Wallet</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className={`bg-gradient-to-br ${getRoleColor()} rounded-2xl p-6 text-white`}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={20} />
            <span className="text-white/80">Available Balance</span>
          </div>
          <p className="text-4xl font-bold mb-4">{formatAmount(availableBalance)}</p>
          
          {lockedBalance > 0 && (
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Building size={14} />
              <span>{formatAmount(lockedBalance)} locked in escrow</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              disabled={availableBalance <= 0}
              className="flex-1 py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ArrowUpRight size={18} />
              Withdraw
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Transaction History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="px-4">
              {transactions.map((transaction: any) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        maxAmount={availableBalance}
        onWithdraw={handleWithdraw}
      />
    </div>
  );
}

// ===========================================
// Exported Page with Auth Guard
// ===========================================

export default function WalletPage() {
  return (
    <AuthGuard>
      <WalletPageContent />
    </AuthGuard>
  );
}
