/**
 * StarRating Component
 * Reusable star rating for display and input
 */

import React from 'react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-[16px]',
  md: 'text-[24px]',
  lg: 'text-[32px]',
};

export default function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number>(0);

  const handleClick = (star: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(star);
    }
  };

  const handleMouseEnter = (star: number) => {
    if (interactive) {
      setHoverRating(star);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: maxStars }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= displayRating;
          const isHalf = !isFilled && starValue - 0.5 <= displayRating;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              disabled={!interactive}
              className={`
                ${sizeClasses[size]}
                transition-all duration-150
                ${interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}
                ${isFilled || isHalf ? 'text-amber-400' : 'text-slate-600'}
              `}
              style={{ 
                fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0",
                WebkitTextStroke: isFilled ? 'none' : '0.5px currentColor'
              }}
              aria-label={interactive ? `Rate ${starValue} stars` : `${starValue} stars`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>
                {isHalf ? 'star_half' : 'star'}
              </span>
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="ml-2 text-sm font-medium text-slate-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Compact rating badge for event cards
interface RatingBadgeProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function RatingBadge({ 
  rating, 
  reviewCount, 
  size = 'sm',
  className = '' 
}: RatingBadgeProps) {
  if (reviewCount === 0) return null;

  return (
    <div className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-lg
      bg-amber-500/10 border border-amber-500/20
      ${className}
    `}>
      <span 
        className={`material-symbols-outlined text-amber-400 ${size === 'sm' ? 'text-[14px]' : 'text-[18px]'}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        star
      </span>
      <span className={`font-semibold text-amber-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {rating.toFixed(1)}
      </span>
      <span className={`text-slate-500 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
        ({reviewCount})
      </span>
    </div>
  );
}

// Rating distribution bar for reviews section
interface RatingDistributionProps {
  distribution: { [key: number]: number };
  totalReviews: number;
  className?: string;
}

export function RatingDistribution({ 
  distribution, 
  totalReviews,
  className = '' 
}: RatingDistributionProps) {
  const stars = [5, 4, 3, 2, 1];

  return (
    <div className={`space-y-2 ${className}`}>
      {stars.map((star) => {
        const count = distribution[star] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

        return (
          <div key={star} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-12">
              <span className="text-sm text-slate-400">{star}</span>
              <span 
                className="material-symbols-outlined text-amber-400 text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            </div>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
