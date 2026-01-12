import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend } from '../../services/mockBackend';
import { Event } from '../../types';
import { useAuth } from '../../App';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, CreditCard, Ticket, CheckCircle } from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;
      
      const [eventData, userBookings] = await Promise.all([
        backend.getEventById(id),
        backend.getUserBookings(user.id)
      ]);

      setEvent(eventData || null);
      
      // Check if user already booked this event
      const hasBooked = userBookings.some(b => b.eventId === id && b.status !== 'cancelled');
      setIsBooked(hasBooked);

      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleBook = async () => {
    if (!event || !user) return;
    if (isBooked) {
      navigate('/student/events'); // Go to My Events
      return;
    }

    setBookingLoading(true);
    try {
      await backend.createBooking(user.id, event.id);
      navigate('/student/booking-success', { state: { event } });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading || !event) return <div className="p-12 text-center text-gray-500">Loading event details...</div>;

  const progress = ((event.totalSlots - event.availableSlots) / event.totalSlots) * 100;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 max-w-5xl mx-auto">
      <div className="md:flex">
        {/* Left Side: Image */}
        <div className="md:w-1/2 relative h-64 md:h-auto min-h-[400px]">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent md:hidden" />
          
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Right Side: Details */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-md">
                {event.category}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${event.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {event.status.toUpperCase()}
              </span>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <Share2 size={20} />
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">{event.title}</h1>

          <div className="space-y-4 mb-8">
            <div className="flex items-center text-gray-600">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 text-primary">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Date</p>
                <p className="font-medium text-gray-900">{new Date(event.eventDate).toDateString()}</p>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 text-primary">
                <Clock size={20} />
              </div>
              <div>
                 <p className="text-xs text-gray-500 font-bold uppercase">Time</p>
                 <p className="font-medium text-gray-900">{new Date(event.eventDate).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 text-primary">
                <MapPin size={20} />
              </div>
              <div>
                 <p className="text-xs text-gray-500 font-bold uppercase">Venue</p>
                 <p className="font-medium text-gray-900">{event.venue}</p>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 text-primary">
                <CreditCard size={20} />
              </div>
              <div>
                 <p className="text-xs text-gray-500 font-bold uppercase">Price</p>
                 <p className="font-medium text-gray-900">{event.price === 0 ? 'Free Entry' : `$${event.price} per person`}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-2">About Event</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {event.description}
            </p>
          </div>

          <div className="mt-auto">
             {/* Capacity Widget */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Availability</span>
                <span className="text-xs text-gray-500">{event.availableSlots} spots left</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${event.availableSlots === 0 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={(event.availableSlots <= 0 && !isBooked) || bookingLoading || event.status !== 'published'}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center
                ${isBooked 
                  ? 'bg-secondary hover:bg-emerald-600' 
                  : (event.availableSlots > 0 ? 'bg-primary hover:bg-primaryLight hover:shadow-xl active:scale-[0.99]' : 'bg-gray-300 cursor-not-allowed')
                }
              `}
            >
              {bookingLoading ? 'Processing...' : (
                isBooked ? (
                  <><CheckCircle className="mr-2" size={20} /> View My Ticket</>
                ) : (
                  event.availableSlots > 0 ? 'Book My Slot' : 'Sold Out'
                )
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}