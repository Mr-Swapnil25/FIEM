import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserFavoriteEvents, removeFavorite, getUserFavorites } from '../../services/backend';
import { Event } from '../../types';
import { useAuth } from '../../App';

interface FavoriteWithEvent extends Event {
  favoriteId: string;
}

export default function FavoritesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get favorite records and events in parallel
        const [favoriteRecords, events] = await Promise.all([
          getUserFavorites(user.id),
          getUserFavoriteEvents(user.id)
        ]);

        // Merge favorite IDs with event data
        const favoritesWithEvents: FavoriteWithEvent[] = events.map(event => {
          const favoriteRecord = favoriteRecords.find(f => f.eventId === event.id);
          return {
            ...event,
            favoriteId: favoriteRecord?.id || ''
          };
        }).filter(f => f.favoriteId); // Only include valid favorites

        setFavorites(favoritesWithEvents);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleRemoveFavorite = async (favoriteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (removingId) return;

    setRemovingId(favoriteId);
    try {
      await removeFavorite(favoriteId);
      setFavorites(prev => prev.filter(f => f.favoriteId !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove from favorites');
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    const day = date.getDate().toString().padStart(2, '0');
    return `${month} ${day}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const isPastEvent = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (!user) return null;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col font-sans overflow-x-hidden pb-6 bg-background text-white">
      {/* Background Gradient */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-red-500/10 via-red-500/5 to-transparent blur-[80px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-5 bg-background/80 backdrop-blur-md border-b border-white/5">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/20 transition active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white">My Favorites</h1>
        <div className="w-10"></div>
      </div>

      {/* Stats Banner */}
      <div className="px-6 py-4">
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <span 
                className="material-symbols-outlined text-red-400 text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{favorites.length}</p>
              <p className="text-sm text-slate-400">Saved Events</p>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites List */}
      <div className="flex flex-col gap-4 px-6 mt-2 pb-28 w-full max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-primary text-[40px]">progress_activity</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span 
                className="material-symbols-outlined text-slate-500 text-[40px]"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                favorite
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No favorites yet</h3>
            <p className="text-slate-400 mb-6 max-w-[280px]">
              Tap the heart icon on any event to save it here for quick access.
            </p>
            <button 
              onClick={() => navigate('/student/home')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold shadow-lg shadow-primary/25 hover:bg-primaryDark transition-all active:scale-95"
            >
              Explore Events
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        ) : (
          favorites.map(favorite => {
            const isPast = isPastEvent(favorite.eventDate);
            return (
              <div 
                key={favorite.id}
                onClick={() => navigate(`/student/event/${favorite.id}`)}
                className="group relative flex items-center gap-4 p-3 pr-4 rounded-2xl bg-surface border border-white/5 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] overflow-hidden cursor-pointer"
              >
                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                {/* Event Image */}
                <div className="relative z-10 w-20 h-20 shrink-0">
                  <div 
                    className={`w-full h-full rounded-xl bg-cover bg-center ${isPast ? 'grayscale' : ''}`}
                    style={{ backgroundImage: `url("${favorite.imageUrl || `https://picsum.photos/200/200?random=${favorite.id}`}")` }}
                  ></div>
                  {/* Date Badge */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                    {formatDate(favorite.eventDate)}
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex flex-col justify-center flex-1 relative z-10 gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white leading-tight truncate">{favorite.title}</h3>
                    {isPast && (
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-semibold">
                        Past
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>{formatTime(favorite.eventDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="truncate">{favorite.venue}</span>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemoveFavorite(favorite.favoriteId, e)}
                  disabled={removingId === favorite.favoriteId}
                  className="relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors active:scale-95 disabled:opacity-50"
                  title="Remove from favorites"
                >
                  {removingId === favorite.favoriteId ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  ) : (
                    <span 
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      heart_minus
                    </span>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
