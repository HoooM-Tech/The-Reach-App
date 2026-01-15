'use client';

import { Suspense } from 'react';
import { PropertyFilters } from './PropertyFilters';

export function PropertyFiltersWrapper() {
  return (
    <Suspense fallback={<div className="h-12 bg-gray-200 rounded-xl animate-pulse" />}>
      <PropertyFilters />
    </Suspense>
  );
}

