import React from 'react';

interface PriceDisplayProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  currency?: string;
}

const sizeClasses = {
  sm: 'text-base font-semibold',
  md: 'text-lg font-semibold',
  lg: 'text-2xl font-bold',
};

export function PriceDisplay({
  amount,
  className = '',
  size = 'md',
  currency = '₹',
}: PriceDisplayProps) {
  return (
    <span className={`${sizeClasses[size]} text-foreground ${className}`}>
      {currency}{amount.toLocaleString('en-IN')}
    </span>
  );
}
