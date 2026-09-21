import React from 'react';
import { formatPrice } from '../../utils/formatPrice';

interface PriceDisplayProps {
  originalPrice?: number;
  effectivePrice?: number | null;
  className?: string;
  priceClassName?: string;
  originalPriceClassName?: string;
  badgeClassName?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  originalPrice,
  effectivePrice,
  className = 'flex items-center gap-2',
  priceClassName = 'font-display-md-mobile md:font-display-md text-primary',
  originalPriceClassName = 'text-body-sm text-on-surface-variant line-through',
  badgeClassName = 'text-body-xs font-semibold px-2 py-0.5 bg-green-100 text-green-800 rounded'
}) => {
  if (originalPrice === undefined || originalPrice === null) return null;

  // If effectivePrice is not provided, or is invalid, just show the original price
  if (
    effectivePrice === undefined ||
    effectivePrice === null ||
    effectivePrice >= originalPrice ||
    originalPrice <= 0 ||
    effectivePrice < 0
  ) {
    return (
      <div className={className}>
        <span className={priceClassName}>{formatPrice(originalPrice)}</span>
      </div>
    );
  }

  // Calculate percentage off
  const percentageOff = Math.round(((originalPrice - effectivePrice) / originalPrice) * 100);

  return (
    <div className={className}>
      <span className={priceClassName}>{formatPrice(effectivePrice)}</span>
      <span className={originalPriceClassName}>{formatPrice(originalPrice)}</span>
      {percentageOff > 0 && (
        <span className={badgeClassName}>{percentageOff}% Off</span>
      )}
    </div>
  );
};
