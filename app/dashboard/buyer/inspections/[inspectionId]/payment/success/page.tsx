'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { transactionsApi, ApiError } from '@/lib/api/client'

export const dynamic = 'force-dynamic'

export default function BuyerInspectionPaymentSuccessPage() {
  const router = useRouter()
  const params = useParams<{ inspectionId: string }>()
  const searchParams = useSearchParams()
  const inspectionId = params?.inspectionId
  const transactionId = searchParams.get('transactionId')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<any>(null)

  useEffect(() => {
    const verify = async () => {
      if (!transactionId) {
        setIsLoading(false)
        return
      }
      try {
        const response = await transactionsApi.verifyTransaction(transactionId)
        setTransaction(response.transaction)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Unable to verify transaction'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    verify()
  }, [transactionId])

  return (
    <div className="min-h-screen bg-reach-light px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-8 text-center border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={28} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Completed</h1>
        <p className="text-sm text-gray-500 mb-6">
          {isLoading
            ? 'Finalizing your payment...'
            : error
            ? error
            : 'Your inspection payment was successful.'}
        </p>
        {transaction && (
          <div className="text-sm text-gray-600 mb-6">
            Transaction ID: <span className="font-semibold">{transaction.id}</span>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (transaction?.id) {
                router.push(`/dashboard/buyer/transactions/${transaction.id}`)
              } else {
                router.push('/dashboard/buyer/wallet')
              }
            }}
            className="w-full px-6 py-3 rounded-2xl bg-[#E54D4D] text-white text-sm font-semibold"
          >
            View Transaction
          </button>
          <button
            onClick={() => router.push(`/dashboard/buyer/inspections/${inspectionId}`)}
            className="w-full px-6 py-2 text-sm font-semibold text-gray-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
