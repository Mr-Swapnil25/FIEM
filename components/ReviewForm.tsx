/**
 * ReviewForm Component
 * Form for submitting reviews with star rating, comment, and anonymous option
 */

import React, { useState } from 'react';
import StarRating from './StarRating';
import { Review } from '../types';

interface ReviewFormProps {
  onSubmit: (data: { rating: 1 | 2 | 3 | 4 | 5; comment?: string; isAnonymous: boolean }) => Promise<Review | null>;
  submitting: boolean;
  error: string | null;
  existingReview?: Review;
}

export default function ReviewForm({ onSubmit, submitting, error, existingReview }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isAnonymous, setIsAnonymous] = useState(existingReview?.isAnonymous || false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validate rating
    if (rating < 1 || rating > 5) {
      setLocalError('Please select a rating');
      return;
    }

    // Validate comment if provided
    if (comment.trim() && (comment.trim().length < 10 || comment.trim().length > 500)) {
      setLocalError('Comment must be between 10 and 500 characters');
      return;
    }

    const result = await onSubmit({
      rating: rating as 1 | 2 | 3 | 4 | 5,
      comment: comment.trim() || undefined,
      isAnonymous,
    });

    if (result) {
      setSuccess(true);
    }
  };

  // Show success state
  if (success || existingReview) {
    const displayReview = existingReview || { rating, comment, isAnonymous };
    return (
      <div className="bg-[#151921] rounded-2xl p-6 border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <span 
            className="material-symbols-outlined text-emerald-400 text-[24px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <h3 className="text-lg font-bold text-white">
            {existingReview ? 'Your Review' : 'Review Submitted!'}
          </h3>
        </div>
        
        <div className="space-y-3">
          <StarRating rating={displayReview.rating} size="md" />
          {displayReview.comment && (
            <p className="text-slate-300 text-sm">{displayReview.comment}</p>
          )}
          {displayReview.isAnonymous && (
            <p className="text-xs text-slate-500">Posted anonymously</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#151921] rounded-2xl p-6 border border-white/5">
      <h3 className="text-lg font-bold text-white mb-4">Rate this Event</h3>
      
      {/* Star Rating */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-3">Your Rating *</label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onRatingChange={setRating}
        />
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Your Review <span className="text-slate-600">(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience... (10-500 characters)"
          rows={4}
          className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          maxLength={500}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-600">
            {comment.length > 0 && comment.length < 10 ? 'Minimum 10 characters' : ''}
          </span>
          <span className="text-[10px] text-slate-600">{comment.length}/500</span>
        </div>
      </div>

      {/* Anonymous Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${
              isAnonymous ? 'bg-indigo-500' : 'bg-slate-700'
            }`}>
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                isAnonymous ? 'translate-x-4' : ''
              }`} />
            </div>
          </div>
          <span className="text-sm text-slate-300">Post anonymously</span>
        </label>
        <p className="text-[10px] text-slate-600 mt-1 ml-[52px]">
          Your name won't be shown with the review
        </p>
      </div>

      {/* Error Messages */}
      {(localError || error) && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{localError || error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            Submitting...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">send</span>
            Submit Review
          </>
        )}
      </button>
    </form>
  );
}
