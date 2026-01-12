import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { backend } from '../../services/mockBackend';
import { ChevronLeft, Calendar, MapPin, Tag, Users, DollarSign, Image, Trash2, Save, X } from 'lucide-react';
import { EventCategory } from '../../types';

export default function CreateEditEvent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    price: 0,
    totalSlots: 100,
    category: 'Cultural' as EventCategory
  });

  useEffect(() => {
    if (isEditing && id) {
      const loadEvent = async () => {
        setLoading(true);
        const event = await backend.getEventById(id);
        if (event) {
          const dateObj = new Date(event.eventDate);
          setFormData({
            title: event.title,
            description: event.description,
            date: dateObj.toISOString().split('T')[0],
            time: dateObj.toTimeString().slice(0, 5),
            venue: event.venue,
            price: event.price,
            totalSlots: event.totalSlots,
            category: event.category
          });
        }
        setLoading(false);
      };
      loadEvent();
    }
  }, [id, isEditing]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const eventDate = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      if (isEditing && id) {
        await backend.updateEvent(id, {
          ...formData,
          eventDate,
        });
      } else {
        await backend.createEvent({
          ...formData,
          eventDate,
          adminId: 'u1',
          status: 'published',
          imageUrl: `https://picsum.photos/800/400?random=${Math.random()}`
        });
      }
      navigate('/admin/events');
    } catch (e) {
      alert('Error saving event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      setLoading(true);
      try {
        await backend.deleteEvent(id);
        navigate('/admin/events');
      } catch (e) {
        alert('Error deleting event');
        setLoading(false);
      }
    }
  };

  if (loading && isEditing && !formData.title) {
    return <div className="p-8 text-center text-gray-500">Loading event details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Event' : 'Create New Event'}</h1>
            <p className="text-gray-500 text-sm">{isEditing ? 'Update event details' : 'Fill in the details to create a new event'}</p>
          </div>
        </div>
        {isEditing && (
          <button 
            onClick={handleDelete}
            className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={18} className="mr-2" /> Delete Event
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 space-y-6">
          {/* Basic Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Event Title *</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="e.g. Annual Tech Fest 2024"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea 
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition h-32 resize-none"
                placeholder="Describe your event in detail..."
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
              />
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-4 text-gray-400" size={18} />
                <input 
                  required
                  type="date"
                  className="w-full pl-12 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  value={formData.date}
                  onChange={e => handleChange('date', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Time *</label>
              <input 
                required
                type="time"
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                value={formData.time}
                onChange={e => handleChange('time', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Total Slots *</label>
              <div className="relative">
                <Users className="absolute left-4 top-4 text-gray-400" size={18} />
                <input 
                  type="number"
                  min="1"
                  className="w-full pl-12 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="100"
                  value={formData.totalSlots}
                  onChange={e => handleChange('totalSlots', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-4 text-gray-400" size={18} />
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full pl-12 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="0 for free"
                  value={formData.price}
                  onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Venue & Category Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Venue *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                <input 
                  required
                  className="w-full pl-12 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="e.g. Main Auditorium, Building A"
                  value={formData.venue}
                  onChange={e => handleChange('venue', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
              <div className="relative">
                <Tag className="absolute left-4 top-4 text-gray-400" size={18} />
                <select 
                  className="w-full pl-12 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none transition cursor-pointer"
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                >
                  <option value="Cultural">Cultural</option>
                  <option value="Technical">Technical</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Image Upload Placeholder */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Image</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:bg-primary/5 transition cursor-pointer">
              <Image size={48} className="mb-3 opacity-50" />
              <span className="text-sm font-medium">Click to upload cover image</span>
              <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="px-6 py-3 font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center"
          >
            <X size={18} className="mr-2" /> Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-8 py-3 font-bold text-white bg-primary rounded-xl shadow-lg hover:bg-primaryLight transition flex items-center disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Publish Event')}
          </button>
        </div>
      </form>
    </div>
  );
}