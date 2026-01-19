/**
 * Real-time Firestore Hooks
 * 
 * Provides hooks that subscribe to Firestore real-time updates
 * Falls back gracefully if real-time fails
 * 
 * @module hooks/useRealtime
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Event, Booking, Notification } from '../types';
import * as firestoreService from '../services/firestoreService';
import { queryKeys } from './useFirebaseData';

// ============================================================================
// REAL-TIME EVENT HOOK
// ============================================================================

interface UseRealtimeEventsOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Subscribe to real-time event updates
 * Automatically updates React Query cache
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const { enabled = true, onError } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    try {
      const unsubscribe = firestoreService.subscribeToEvents(
        { status: 'published' },
        (events) => {
          setIsConnected(true);
          setError(null);
          
          // Map Firestore events to app Event type
          const mappedEvents: Event[] = events.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            eventDate: firestoreService.timestampToISO(e.date),
            venue: e.venue || e.location,
            totalSlots: e.capacity,
            availableSlots: e.capacity - e.registeredCount,
            price: e.price,
            category: (e.categoryName || 'Other') as Event['category'],
            imageUrl: e.imageUrl,
            adminId: e.organizerId,
            status: e.status,
            createdAt: firestoreService.timestampToISO(e.createdAt),
            isPaid: !e.isFree,
            requiresApproval: e.requiresApproval,
            averageRating: e.averageRating,
            totalReviews: e.totalReviews
          }));
          
          // Update React Query cache
          queryClient.setQueryData(queryKeys.publishedEvents, 
            mappedEvents.filter(e => e.status === 'published')
          );
          
          // Also update individual event caches
          mappedEvents.forEach(event => {
            queryClient.setQueryData(queryKeys.event(event.id), event);
          });
        }
      );
      
      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to events');
      setError(error);
      onError?.(error);
      console.error('[Realtime] Failed to subscribe to events:', err);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, queryClient, onError]);

  return { isConnected, error };
}

// ============================================================================
// REAL-TIME SINGLE EVENT HOOK
// ============================================================================

interface UseRealtimeEventOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Subscribe to real-time updates for a single event
 */
export function useRealtimeEvent(eventId: string | undefined, options: UseRealtimeEventOptions = {}) {
  const { enabled = true, onError } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !eventId) {
      setIsConnected(false);
      return;
    }

    try {
      const unsubscribe = firestoreService.subscribeToEvent(
        eventId,
        (event) => {
          setIsConnected(true);
          setError(null);
          
          if (event) {
            const mappedEvent: Event = {
              id: event.id,
              title: event.title,
              description: event.description,
              eventDate: firestoreService.timestampToISO(event.date),
              venue: event.venue || event.location,
              totalSlots: event.capacity,
              availableSlots: event.capacity - event.registeredCount,
              price: event.price,
              category: (event.categoryName || 'Other') as Event['category'],
              imageUrl: event.imageUrl,
              adminId: event.organizerId,
              status: event.status,
              createdAt: firestoreService.timestampToISO(event.createdAt),
              isPaid: !event.isFree,
              requiresApproval: event.requiresApproval,
              averageRating: event.averageRating,
              totalReviews: event.totalReviews
            };
            
            queryClient.setQueryData(queryKeys.event(eventId), mappedEvent);
          }
        }
      );
      
      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to event');
      setError(error);
      onError?.(error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, eventId, queryClient, onError]);

  return { isConnected, error };
}

// ============================================================================
// REAL-TIME USER BOOKINGS HOOK
// ============================================================================

interface UseRealtimeBookingsOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Subscribe to real-time updates for user's bookings
 */
export function useRealtimeUserBookings(userId: string | undefined, options: UseRealtimeBookingsOptions = {}) {
  const { enabled = true, onError } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      setIsConnected(false);
      return;
    }

    try {
      const unsubscribe = firestoreService.subscribeToUserBookings(
        userId,
        (bookings) => {
          setIsConnected(true);
          setError(null);
          
          const mappedBookings: Booking[] = bookings.map(b => ({
            id: b.id,
            userId: b.userId,
            eventId: b.eventId,
            ticketId: b.ticketId,
            qrCode: b.qrCode || '',
            status: b.status as Booking['status'],
            amountPaid: b.totalAmount,
            bookedAt: firestoreService.timestampToISO(b.createdAt),
            createdAt: firestoreService.timestampToISO(b.createdAt),
            checkedInAt: b.checkInTime ? firestoreService.timestampToISO(b.checkInTime) : undefined,
            isWaitlist: b.isWaitlist,
            eventTitle: b.eventTitle,
            eventDate: b.eventDate ? firestoreService.timestampToISO(b.eventDate) : undefined,
            eventVenue: b.eventVenue,
            userName: b.userName,
            userEmail: b.userEmail
          }));
          
          queryClient.setQueryData(queryKeys.userBookings(userId), mappedBookings);
        }
      );
      
      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to bookings');
      setError(error);
      onError?.(error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, userId, queryClient, onError]);

  return { isConnected, error };
}

// ============================================================================
// REAL-TIME EVENT PARTICIPANTS HOOK
// ============================================================================

/**
 * Subscribe to real-time updates for event participants
 */
export function useRealtimeEventParticipants(eventId: string | undefined, options: UseRealtimeBookingsOptions = {}) {
  const { enabled = true, onError } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !eventId) {
      setIsConnected(false);
      return;
    }

    try {
      const unsubscribe = firestoreService.subscribeToEventParticipants(
        eventId,
        (bookings) => {
          setIsConnected(true);
          setError(null);
          
          const mappedBookings: Booking[] = bookings.map(b => ({
            id: b.id,
            userId: b.userId,
            eventId: b.eventId,
            ticketId: b.ticketId,
            qrCode: b.qrCode || '',
            status: b.status as Booking['status'],
            amountPaid: b.totalAmount,
            bookedAt: firestoreService.timestampToISO(b.createdAt),
            createdAt: firestoreService.timestampToISO(b.createdAt),
            checkedInAt: b.checkInTime ? firestoreService.timestampToISO(b.checkInTime) : undefined,
            isWaitlist: b.isWaitlist,
            eventTitle: b.eventTitle,
            eventDate: b.eventDate ? firestoreService.timestampToISO(b.eventDate) : undefined,
            eventVenue: b.eventVenue,
            userName: b.userName,
            userEmail: b.userEmail
          }));
          
          queryClient.setQueryData(queryKeys.eventParticipants(eventId), mappedBookings);
        }
      );
      
      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to participants');
      setError(error);
      onError?.(error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, eventId, queryClient, onError]);

  return { isConnected, error };
}

// ============================================================================
// REAL-TIME NOTIFICATIONS HOOK
// ============================================================================

interface UseRealtimeNotificationsOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onNewNotification?: (notification: Notification) => void;
}

/**
 * Subscribe to real-time notifications
 */
export function useRealtimeNotifications(userId: string | undefined, options: UseRealtimeNotificationsOptions = {}) {
  const { enabled = true, onError, onNewNotification } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousNotificationsRef = useRef<string[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      setIsConnected(false);
      return;
    }

    try {
      const unsubscribe = firestoreService.subscribeToNotifications(
        userId,
        (notifications) => {
          setIsConnected(true);
          setError(null);
          
          const mappedNotifications: Notification[] = notifications.map(n => ({
            id: n.id,
            userId: userId,
            title: n.title,
            message: n.message,
            type: (n.type || 'general') as Notification['type'],
            eventType: n.type,
            isRead: n.read,
            createdAt: firestoreService.timestampToISO(n.createdAt),
            link: n.actionUrl,
            eventId: n.eventId
          }));
          
          // Check for new notifications
          const currentIds = mappedNotifications.map(n => n.id);
          const newNotifications = mappedNotifications.filter(
            n => !previousNotificationsRef.current.includes(n.id) && !n.isRead
          );
          
          if (newNotifications.length > 0 && previousNotificationsRef.current.length > 0) {
            newNotifications.forEach(n => onNewNotification?.(n));
          }
          
          previousNotificationsRef.current = currentIds;
          
          // Update unread count
          setUnreadCount(mappedNotifications.filter(n => !n.isRead).length);
          
          // Update React Query cache
          queryClient.setQueryData(queryKeys.userNotifications(userId), mappedNotifications);
        }
      );
      
      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to notifications');
      setError(error);
      onError?.(error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, userId, queryClient, onError, onNewNotification]);

  return { isConnected, error, unreadCount };
}

// ============================================================================
// CONNECTION STATUS HOOK
// ============================================================================

/**
 * Hook to track overall real-time connection status
 */
export function useRealtimeConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isFirestoreConnected,
    isFullyConnected: isOnline && isFirestoreConnected
  };
}

// ============================================================================
// LIVE INDICATOR COMPONENT DATA
// ============================================================================

/**
 * Hook to provide data for live indicator
 */
export function useLiveIndicator() {
  const { isOnline, isFirestoreConnected, isFullyConnected } = useRealtimeConnectionStatus();
  
  const status = isFullyConnected 
    ? 'live' 
    : isOnline 
      ? 'degraded' 
      : 'offline';
  
  const label = status === 'live' 
    ? 'Live' 
    : status === 'degraded' 
      ? 'Syncing...' 
      : 'Offline';
  
  const color = status === 'live' 
    ? 'bg-green-500' 
    : status === 'degraded' 
      ? 'bg-yellow-500' 
      : 'bg-red-500';

  return { status, label, color, isOnline, isFirestoreConnected };
}
