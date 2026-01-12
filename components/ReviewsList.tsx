/**
 * ReviewsList Component
 * Displays reviews with sorting, pagination, and rating distribution
 */

import React from 'react';
import StarRating, { RatingDistribution } from './StarRating';
import { Review, RatingDistribution as RatingDistributionType } from '../types';
import { SortOption } from '../hooks/useReviews';

interface ReviewsListProps {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onLoadMore: () => void;
  averageRating?: number;
  distribution?: RatingDistributionType;
}

export default function ReviewsList({
  reviews,
  loading,
  error,
  totalCount,
  hasMore,
  sortBy,
  onSortChange,
  onLoadMore,
  averageRating,
  distribution,
}: ReviewsListProps) {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'highest', label: 'Highest Rated' },
    { value: 'lowest', label: 'Lowest Rated' },
  ];

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {totalCount > 0 && (
        <div className="bg-[#151921] rounded-2xl p-6 border border-white/5">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-4xl font-bold text-white mb-1">
                {averageRating?.toFixed(1) || '0.0'}
              </span>
              <StarRating rating={averageRating || 0} size="sm" />
              <span className="text-xs text-slate-500 mt-2">
                {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Rating Distribution */}
            {distribution && (
              <div className="flex-1">
                <RatingDistribution
                  distribution={distribution}
                  totalReviews={totalCount}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sort Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            All Reviews ({totalCount})
          </h3>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-[#151921] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State (initial) */}
      {loading && reviews.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">
            progress_activity
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && reviews.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-slate-500 text-[32px]">
              rate_review
            </span>
          </div>
          <p className="text-slate-500 text-sm">No reviews yet</p>
          <p className="text-slate-600 text-xs mt-1">Be the first to review this event</p>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && reviews.length > 0 && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
              Loading...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
              Load More Reviews
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ==================== Review Card Component ====================

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="bg-[#151921] rounded-xl p-4 border border-white/5">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {review.userPhoto && !review.isAnonymous ? (
            <img
              src={review.userPhoto}
              alt={review.userName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                {review.isAnonymous ? 'person_off' : 'person'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-white text-sm truncate">
              {review.isAnonymous ? 'Anonymous' : review.userName || 'User'}
            </span>
            <span className="text-[10px] text-slate-500 shrink-0">
              {formatDate(review.createdAt)}
            </span>
          </div>

          {/* Rating */}
          <StarRating rating={review.rating} size="sm" className="mb-2" />

          {/* Comment */}
          {review.comment && (
            <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
}
