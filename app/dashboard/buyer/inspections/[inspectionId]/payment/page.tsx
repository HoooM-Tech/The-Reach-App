'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { buyerApi, transactionsApi, walletApi, ApiError } from '@/lib/api/client'
import { ArrowLeft, CreditCard, ShieldCheck, Wallet } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function BuyerInspectionPaymentPage() {
  const router = useRouter()
  const params = useParams<{ inspectionId: string }>()
  const inspectionId = params?.inspectionId
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inspection, setInspection] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('wallet')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [billing, setBilling] = useState({
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
  })

  const fetchData = async () => {
    if (!inspectionId) return
    setIsLoading(true)
    setError(null)
    try {
      const [inspectionResponse, balanceResponse] = await Promise.all([
        buyerApi.getInspectionDetails(inspectionId),
        walletApi.getBalance(),
      ])
      setInspection(inspectionResponse.inspection)
      setWalletBalance(balanceResponse.availableBalance || 0)
      // Redirect if property already paid - no need to pay again
      if (inspectionResponse.propertyPaid) {
        router.replace(`/dashboard/buyer/inspections/${inspectionId}`)
        return
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load payment'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [inspectionId])

  const property = inspection?.properties || {}
  const price = Number(property?.asking_price || 0)
  const vat = Math.round(price * 0.075 * 100) / 100
  const total = price + vat

  const canPayWithWallet = walletBalance >= total

  const handlePayment = async () => {
    if (!inspectionId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const paymentResponse = await buyerApi.createPropertyPayment(inspectionId, {
        payment_method: paymentMethod,
        billing_address: billing,
      })

      if (paymentMethod === 'wallet') {
        const processed = await transactionsApi.processWalletPayment(paymentResponse.transaction.id)
        router.push(
          `/dashboard/buyer/inspections/${inspectionId}/payment/success?transactionId=${processed.transaction.id}`
        )
        return
      }

      if (paymentResponse.authorization_url) {
        window.location.href = paymentResponse.authorization_url
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Payment failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const summary = useMemo(
    () => ({
      price,
      vat,
      total,
    }),
    [price, vat, total]
  )

  if (isLoading) {
    return <div className="min-h-screen bg-reach-light" />
  }

  return (
    <div className="min-h-screen bg-reach-light pb-24">
      <div className="sticky top-0 z-20 bg-reach-light border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">Property Purchase</h1>
          <div className="w-10 h-10" />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Payment Method</h2>
            <button
              onClick={() => setPaymentMethod('wallet')}
              className={`w-full flex items-center justify-between border rounded-2xl px-4 py-4 ${
                paymentMethod === 'wallet' ? 'border-[#E54D4D] bg-[#F6E8E3]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet size={20} className="text-gray-700" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">Reach Balance</p>
                  <p className="text-xs text-gray-500">Available ₦{walletBalance.toLocaleString()}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#E54D4D] bg-white/80 px-3 py-1 rounded-full">
                Wallet
              </span>
            </button>

            <button
              onClick={() => setPaymentMethod('paystack')}
              className={`w-full flex items-center justify-between border rounded-2xl px-4 py-4 ${
                paymentMethod === 'paystack' ? 'border-[#E54D4D] bg-[#F6E8E3]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-gray-700" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">Paystack</p>
                  <p className="text-xs text-gray-500">Use card or bank transfer</p>
                </div>
              </div>
              <ShieldCheck size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Billing Address</h2>
            <div className="grid gap-3">
              <input
                value={billing.address}
                onChange={(e) => setBilling((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={billing.city}
                  onChange={(e) => setBilling((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={billing.state}
                  onChange={(e) => setBilling((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <input
                value={billing.country}
                onChange={(e) => setBilling((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Country"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Property purchase summary</h2>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{property?.title || 'Property'}</span>
              <span className="text-gray-900 font-semibold">₦{summary.price.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>VAT (7.5%)</span>
              <span className="text-gray-900 font-semibold">₦{summary.vat.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>₦{summary.total.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={isSubmitting || (paymentMethod === 'wallet' && !canPayWithWallet)}
            className="w-full px-6 py-3 rounded-2xl bg-[#E54D4D] text-white text-sm font-semibold disabled:opacity-60"
          >
            {paymentMethod === 'wallet' && !canPayWithWallet
              ? 'Insufficient balance'
              : isSubmitting
              ? 'Processing...'
              : 'Pay'}
          </button>
        </div>
      </div>
    </div>
  )
}
