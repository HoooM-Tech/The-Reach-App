'use client';

import { PropertyStatus } from '../../types/property';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: PropertyStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.DRAFT:
        return {
          label: 'Draft',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          dotColor: 'bg-gray-500'
        };
      case PropertyStatus.SUBMITTED:
        return {
          label: 'Submitted',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600',
          dotColor: 'bg-blue-500'
        };
      case PropertyStatus.PENDING_VERIFICATION:
        return {
          label: 'Pending',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-600',
          dotColor: 'bg-orange-500'
        };
      case PropertyStatus.VERIFIED:
        return {
          label: 'Verified',
          bgColor: 'bg-green-100',
          textColor: 'text-green-600',
          dotColor: 'bg-green-500'
        };
      case PropertyStatus.REJECTED:
        return {
          label: 'Rejected',
          bgColor: 'bg-red-100',
          textColor: 'text-red-600',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          label: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <div className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
}

