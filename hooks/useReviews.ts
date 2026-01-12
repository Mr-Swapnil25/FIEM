/**
 * useReviews Hook
 * Manages review operations: fetch, create, check eligibility
 */

import { useState, useEffect, useCallback } from 'react';
import { Review, Event, Booking } from '../types';
import { 
  getEventReviews, 
  createReview, 
  getUserReviewForEvent,
  deleteReview,
  flagReview,
  getAllReviews
} from '../services/backend';

export type SortOption = 'recent' | 'highest' | 'lowest';

interface UseReviewsOptions {
  eventId: string;
  pageSize?: number;
}

interface UseReviewsReturn {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and paginating reviews for an event
 */
export function useEventReviews({ eventId, pageSize = 10 }: UseReviewsOptions): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchReviews = useCallback(async (reset: boolean = false) => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentPage = reset ? 1 : page;
      const result = await getEventReviews(eventId, {
        sortBy,
        page: currentPage,
        pageSize,
      });
      
      if (reset) {
        setReviews(result.reviews);
        setPage(1);
      } else {
        setReviews(prev => [...prev, ...result.reviews]);
      }
      
      setTotalCount(result.total);
      setHasMore(result.reviews.length === pageSize);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [eventId, sortBy, page, pageSize]);

  // Initial fetch and refetch on sort change
  useEffect(() => {
    fetchReviews(true);
  }, [eventId, sortBy]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchReviews(false);
    }
  }, [loading, hasMore, fetchReviews]);

  const refresh = useCallback(async () => {
    await fetchReviews(true);
  }, [fetchReviews]);

  return {
    reviews,
    loading,
    error,
    totalCount,
    hasMore,
    sortBy,
    setSortBy,
    loadMore,
    refresh,
  };
}

// ==================== Review Submission Hook ====================

interface ReviewEligibility {
  canReview: boolean;
  reason?: string;
  hasExistingReview: boolean;
  existingReview?: Review;
}

interface UseReviewSubmissionReturn {
  eligibility: ReviewEligibility | null;
  checkingEligibility: boolean;
  submitting: boolean;
  submitReview: (data: { rating: 1 | 2 | 3 | 4 | 5; comment?: string; isAnonymous: boolean }) => Promise<Review | null>;
  error: string | null;
}

/**
 * Hook for submitting a review
 * Checks eligibility based on:
 * - Event has ended
 * - User has a confirmed/checked_in booking
 * - User hasn't already reviewed
 */
export function useReviewSubmission(
  userId: string | undefined,
  eventId: string | undefined,
  event: Event | null,
  userBookings: Booking[]
): UseReviewSubmissionReturn {
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check eligibility
  useEffect(() => {
    const checkEligibility = async () => {
      if (!userId || !eventId || !event) {
        setEligibility({ canReview: false, reason: 'Missing data', hasExistingReview: false });
        setCheckingEligibility(false);
        return;
      }

      setCheckingEligibility(true);

      try {
        // Check 1: Event must have ended
        const eventDate = new Date(event.eventDate);
        const now = new Date();
        if (eventDate > now) {
          setEligibility({ 
            canReview: false, 
            reason: 'Event has not ended yet',
            hasExistingReview: false 
          });
          setCheckingEligibility(false);
          return;
        }

        // Check 2: User must have a valid booking
        const validBooking = userBookings.find(
          b => b.eventId === eventId && (b.status === 'confirmed' || b.status === 'checked_in')
        );
        if (!validBooking) {
          setEligibility({ 
            canReview: false, 
            reason: 'You must have attended this event to leave a review',
            hasExistingReview: false 
          });
          setCheckingEligibility(false);
          return;
        }

        // Check 3: User hasn't already reviewed
        const existingReview = await getUserReviewForEvent(userId, eventId);
        if (existingReview) {
          setEligibility({ 
            canReview: false, 
            reason: 'You have already reviewed this event',
            hasExistingReview: true,
            existingReview 
          });
          setCheckingEligibility(false);
          return;
        }

        // All checks passed
        setEligibility({ canReview: true, hasExistingReview: false });
      } catch (err) {
        console.error('Error checking review eligibility:', err);
        setEligibility({ canReview: false, reason: 'Error checking eligibility', hasExistingReview: false });
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [userId, eventId, event, userBookings]);

  const submitReview = useCallback(async (data: { 
    rating: 1 | 2 | 3 | 4 | 5; 
    comment?: string; 
    isAnonymous: boolean 
  }): Promise<Review | null> => {
    if (!userId || !eventId || !eligibility?.canReview) {
      setError('Not eligible to submit review');
      return null;
    }

    // Validate comment length if provided
    if (data.comment && (data.comment.length < 10 || data.comment.length > 500)) {
      setError('Comment must be between 10 and 500 characters');
      return null;
    }

    setSubmitting(true);
    setError(null);

    try {
      const review = await createReview({
        userId,
        eventId,
        rating: data.rating,
        comment: data.comment,
        isAnonymous: data.isAnonymous,
      });

      // Update eligibility to reflect that user has now reviewed
      setEligibility({
        canReview: false,
        reason: 'You have already reviewed this event',
        hasExistingReview: true,
        existingReview: review,
      });

      return review;
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [userId, eventId, eligibility]);

  return {
    eligibility,
    checkingEligibility,
    submitting,
    submitReview,
    error,
  };
}

// ==================== Admin Reviews Hook ====================

interface UseAdminReviewsReturn {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  flaggedCount: number;
  deleteReview: (reviewId: string) => Promise<boolean>;
  toggleFlag: (reviewId: string, flagged: boolean, reason?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for admin review moderation
 */
export function useAdminReviews(): UseAdminReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allReviews = await getAllReviews();
      setReviews(allReviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDeleteReview = useCallback(async (reviewId: string): Promise<boolean> => {
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      return true;
    } catch (err) {
      console.error('Error deleting review:', err);
      return false;
    }
  }, []);

  const toggleFlag = useCallback(async (
    reviewId: string, 
    flagged: boolean, 
    reason?: string
  ): Promise<boolean> => {
    try {
      await flagReview(reviewId, flagged, reason);
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, isFlagged: flagged, flagReason: reason } 
          : r
      ));
      return true;
    } catch (err) {
      console.error('Error flagging review:', err);
      return false;
    }
  }, []);

  const flaggedCount = reviews.filter(r => r.isFlagged).length;

  return {
    reviews,
    loading,
    error,
    flaggedCount,
    deleteReview: handleDeleteReview,
    toggleFlag,
    refresh: fetchReviews,
  };
}
