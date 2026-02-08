import { Suspense } from 'react'
import BuyerInspectionDetailsClient from './pageClient'

export const dynamic = 'force-dynamic'

export default function BuyerInspectionDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-reach-light" />}>
      <BuyerInspectionDetailsClient />
    </Suspense>
  )
}
