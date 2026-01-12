import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Calendar, MapPin, Download, Home, Ticket } from 'lucide-react';
import { Event } from '../../types';

export default function BookingConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const event = state?.event as Event;

  if (!event) return <div className="p-8 text-center text-gray-500">No booking data found.</div>;

  const ticketId = `EVT-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="max-w-2xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="text-green-500 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500">Your ticket has been successfully booked. Show the QR code at the venue.</p>
        </div>

        {/* Ticket Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 relative">
          {/* Tear Line visual */}
          <div className="absolute top-[60%] left-0 w-5 h-10 bg-gray-50 rounded-r-full"></div>
          <div className="absolute top-[60%] right-0 w-5 h-10 bg-gray-50 rounded-l-full"></div>
          <div className="absolute top-[62%] left-6 right-6 border-t-2 border-dashed border-gray-200"></div>

          <div className="p-8 pb-12">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-3">
                  {event.category}
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Amount Paid</p>
                <p className="text-2xl font-bold text-primary">{event.price === 0 ? 'FREE' : `$${event.price}`}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                  <Calendar size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase">Date & Time</p>
                  <p className="font-semibold text-gray-900">{new Date(event.eventDate).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                  <MapPin size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase">Venue</p>
                  <p className="font-semibold text-gray-900">{event.venue}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-8 pt-12 flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <QRCodeSVG value={`TICKET:${ticketId}`} size={180} />
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Ticket ID</p>
              <p className="font-mono font-bold text-xl text-gray-800 mb-4">{ticketId}</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Present this QR code at the event entrance for quick check-in.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button className="flex-1 bg-white text-primary font-semibold py-4 px-6 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center">
            <Download size={20} className="mr-2" /> Download Ticket
          </button>
          <button 
            onClick={() => navigate('/student/events')}
            className="flex-1 bg-white text-gray-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center"
          >
            <Ticket size={20} className="mr-2" /> View My Events
          </button>
          <button 
            onClick={() => navigate('/student/home')}
            className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:bg-primaryLight transition flex items-center justify-center"
          >
            <Home size={20} className="mr-2" /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
