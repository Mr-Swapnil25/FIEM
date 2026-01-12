/**
 * ReviewModeration Page
 * Admin dashboard for viewing and moderating all reviews
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminReviews } from '../../hooks/useReviews';
import StarRating from '../../components/StarRating';
import { Review } from '../../types';

type FilterType = 'all' | 'flagged' | 'recent';

export default function ReviewModeration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    reviews, 
    loading, 
    error, 
    flaggedCount,
    deleteReview, 
    toggleFlag, 
    refresh 
  } = useAdminReviews();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    // Apply filter type
    if (filter === 'flagged' && !review.isFlagged) return false;
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        review.userName?.toLowerCase().includes(term) ||
        review.comment?.toLowerCase().includes(term) ||
        review.eventId?.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  const handleDelete = async (reviewId: string) => {
    setActionLoading(reviewId);
    const success = await deleteReview(reviewId);
    setActionLoading(null);
    if (success) {
      setShowDeleteConfirm(false);
      setSelectedReview(null);
    }
  };

  const handleToggleFlag = async (review: Review) => {
    setActionLoading(review.id);
    await toggleFlag(review.id, !review.isFlagged, review.isFlagged ? undefined : 'Flagged by admin');
    setActionLoading(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative min-h-screen bg-[#0B0E14] text-slate-200 font-display antialiased">
      {/* Background Gradient Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen pb-[120px]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-white tracking-wide">Review Moderation</h1>
          <button 
            onClick={refresh}
            className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="px-5 py-4 grid grid-cols-3 gap-3">
          <div className="bg-[#151921] p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">rate_review</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{reviews.length}</p>
          </div>
          <div className="bg-[#151921] p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-red-400 text-[18px]">flag</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Flagged</span>
            </div>
            <p className="text-2xl font-bold text-white">{flaggedCount}</p>
          </div>
          <div className="bg-[#151921] p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">star</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Avg</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {reviews.length > 0 
                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                : '0.0'
              }
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 p-1 bg-[#151921] rounded-xl border border-white/5">
            {[
              { key: 'all', label: 'All Reviews', count: reviews.length },
              { key: 'flagged', label: 'Flagged', count: flaggedCount },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterType)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key 
                    ? 'bg-indigo-500 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 mb-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#151921] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Reviews List */}
        <div className="px-5 flex-1">
          {loading ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">progress_activity</span>
              <p className="text-slate-500 mt-4 text-sm">Loading reviews...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-400 text-[32px]">error</span>
              </div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-slate-500 text-[32px]">rate_review</span>
              </div>
              <p className="text-slate-500 text-sm">
                {searchTerm ? 'No matching reviews found.' : filter === 'flagged' ? 'No flagged reviews.' : 'No reviews yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div 
                  key={review.id}
                  className={`bg-[#151921] rounded-xl p-4 border transition-colors ${
                    review.isFlagged ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
                        {review.isAnonymous ? '?' : review.userName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">
                          {review.isAnonymous ? 'Anonymous' : review.userName || 'User'}
                        </p>
                        <p className="text-[10px] text-slate-500">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    
                    {/* Flagged Badge */}
                    {review.isFlagged && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20">
                        FLAGGED
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <StarRating rating={review.rating} size="sm" className="mb-2" />

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-slate-300 mb-3">{review.comment}</p>
                  )}

                  {/* Event ID */}
                  <p className="text-[10px] text-slate-500 mb-3">
                    Event: <span className="font-mono">{review.eventId}</span>
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => handleToggleFlag(review)}
                      disabled={actionLoading === review.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        review.isFlagged 
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {actionLoading === review.id ? (
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">
                          {review.isFlagged ? 'check_circle' : 'flag'}
                        </span>
                      )}
                      {review.isFlagged ? 'Unflag' : 'Flag'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedReview(review);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Delete
                    </button>
                    
                    <button
                      onClick={() => navigate(`/student/event/${review.eventId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors ml-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      View Event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 w-full z-50">
          <div className="h-8 w-full bg-gradient-to-b from-transparent to-[#0B0E14] pointer-events-none"></div>
          <div className="bg-[#151c2b] border-t border-slate-800 pb-6 pt-2">
            <div className="flex justify-around items-center px-4">
              <button 
                onClick={() => navigate('/admin/dashboard')}
                className="flex flex-col items-center gap-1 min-w-[64px] transition-colors text-slate-400 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[24px]">dashboard</span>
                <span className="text-[10px] font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => navigate('/admin/events')}
                className="flex flex-col items-center gap-1 min-w-[64px] transition-colors text-slate-400 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[24px]">event</span>
                <span className="text-[10px] font-medium">Events</span>
              </button>
              
              {/* Center QR Scan Button */}
              <button 
                onClick={() => navigate('/admin/scan-ticket')}
                className="flex flex-col items-center gap-1 min-w-[64px] -mt-8 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border-4 border-[#151c2b] hover:scale-105 active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-[26px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
                </div>
                <span className="text-[10px] font-medium text-primary">Scan</span>
              </button>
              
              <button 
                onClick={() => navigate('/admin/reviews')}
                className="flex flex-col items-center gap-1 min-w-[64px] transition-colors text-primary"
              >
                <span 
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >rate_review</span>
                <span className="text-[10px] font-medium">Reviews</span>
              </button>
              <button 
                onClick={() => navigate('/admin/profile')}
                className="flex flex-col items-center gap-1 min-w-[64px] transition-colors text-slate-400 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[24px]">settings</span>
                <span className="text-[10px] font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#151921] rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400 text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Review</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-[#0B0E14] rounded-xl p-4 mb-4 border border-white/5">
              <StarRating rating={selectedReview.rating} size="sm" className="mb-2" />
              {selectedReview.comment && (
                <p className="text-sm text-slate-300 line-clamp-2">{selectedReview.comment}</p>
              )}
              <p className="text-[10px] text-slate-500 mt-2">
                by {selectedReview.isAnonymous ? 'Anonymous' : selectedReview.userName}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedReview(null);
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedReview.id)}
                disabled={actionLoading === selectedReview.id}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading === selectedReview.id ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
