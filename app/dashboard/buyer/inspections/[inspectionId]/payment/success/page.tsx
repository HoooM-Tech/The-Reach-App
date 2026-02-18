'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Building2, User, ArrowRight } from 'lucide-react'
import { transactionsApi, ApiError } from '@/lib/api/client'

export const dynamic = 'force-dynamic'

export default function BuyerInspectionPaymentSuccessPage() {
  const router = useRouter()
  const params = useParams<{ inspectionId: string }>()
  const searchParams = useSearchParams()
  const inspectionId = (params?.inspectionId as string) || ''
  const transactionId = searchParams.get('transactionId') || searchParams.get('transaction_id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    transaction: any
    propertyTitle?: string
    developerName?: string
  } | null>(null)

  useEffect(() => {
    if (!transactionId) {
      setLoading(false)
      setError(null)
      setData(null)
      return
    }
    let cancelled = false

    const run = async () => {
      try {
        // Verify payment with Paystack when returning from redirect (backup if webhook didn't fire)
        await transactionsApi.verifyTransaction(transactionId)
      } catch (_) {
        // Ignore: transaction may already be successful or not a Paystack payment
      }
      if (cancelled) return
      const res = await transactionsApi.getTransaction(transactionId) as { transaction: any; propertyTitle?: string; developerName?: string }
      if (cancelled) return
      setData({
        transaction: res.transaction,
        propertyTitle: res.propertyTitle,
        developerName: res.developerName,
      })
      setError(null)
    }

    run()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load transaction')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [transactionId])

  const amount = data?.transaction?.amount ?? data?.transaction?.total_amount
  const isPropertyPurchase =
    data?.transaction?.category === 'property_purchase' ||
    (data?.transaction?.metadata as any)?.payment_type === 'property_purchase'

  if (!transactionId) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] px-4 py-10">
        <div className="max-w-lg mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <p className="text-gray-600 text-center mb-6">
            No transaction reference. If you just completed a payment, use the link from your redirect or go to your transactions.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard/buyer/transactions')}
              className="w-full px-6 py-3 rounded-2xl bg-[#1A3B5D] text-white text-sm font-semibold"
            >
              View transactions
            </button>
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="w-full px-6 py-2 text-sm font-semibold text-gray-500"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] px-4 py-10 flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100" />
            <p className="text-gray-500">Finalizing your payment...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data?.transaction) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] px-4 py-10">
        <div className="max-w-lg mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <p className="text-red-600 mb-6">{error || 'Transaction not found or you do not have access to it.'}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard/buyer/transactions')}
              className="w-full px-6 py-3 rounded-2xl bg-[#1A3B5D] text-white text-sm font-semibold"
            >
              View transactions
            </button>
            <button
              onClick={() => router.push(`/dashboard/buyer/inspections/${inspectionId}`)}
              className="w-full px-6 py-2 text-sm font-semibold text-gray-500"
            >
              Back to inspection
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] px-4 py-10">
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={32} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          Payment successful
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          {isPropertyPurchase
            ? 'Your property purchase was completed successfully.'
            : 'Your payment was completed successfully.'}
        </p>

        <div className="space-y-3 mb-6 text-left">
          {data.propertyTitle && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Building2 className="text-gray-400" size={18} />
              <span><strong>Property:</strong> {data.propertyTitle}</span>
            </div>
          )}
          {amount != null && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span><strong>Amount paid:</strong> ₦{Number(amount).toLocaleString()}</span>
            </div>
          )}
          {data.developerName && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="text-gray-400" size={18} />
              <span><strong>Developer:</strong> {data.developerName}</span>
            </div>
          )}
          {data.transaction.id && (
            <p className="text-xs text-gray-400 pt-2">
              Transaction ID: {data.transaction.id}
            </p>
          )}
        </div>

        {isPropertyPurchase && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">Next steps</p>
            <p>Handover is in progress. You will be notified when documents are ready for review and signature.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push(`/dashboard/buyer/transactions/${data.transaction.id}`)}
            className="w-full px-6 py-3 rounded-2xl bg-[#1A3B5D] text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            View transaction <ArrowRight size={16} />
          </button>
          <button
            onClick={() => router.push('/dashboard/buyer')}
            className="w-full px-6 py-2 text-sm font-semibold text-gray-500"
          >
            Back to dashboard
          </button>
          {inspectionId && (
            <button
              onClick={() => router.push(`/dashboard/buyer/inspections/${inspectionId}`)}
              className="w-full px-6 py-2 text-sm font-semibold text-gray-500"
            >
              Back to inspection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
