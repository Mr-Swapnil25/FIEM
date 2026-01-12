import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { backend } from '../../services/mockBackend';
import { EventCategory } from '../../types';

export default function CreateEditEvent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
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
          if (event.imageUrl) {
            setCoverImage(event.imageUrl);
          }
        }
        setLoading(false);
      };
      loadEvent();
    }
  }, [id, isEditing]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!formData.title || !formData.date || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const eventDate = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      if (isEditing && id) {
        await backend.updateEvent(id, {
          ...formData,
          eventDate,
          status: isDraft ? 'draft' : 'published',
        });
        navigate('/admin/dashboard');
      } else {
        const newEvent = await backend.createEvent({
          ...formData,
          eventDate,
          adminId: 'u1',
          status: isDraft ? 'draft' : 'published',
          imageUrl: coverImage || `https://picsum.photos/800/400?random=${Math.random()}`
        });
        if (isDraft) {
          navigate('/admin/events');
        } else {
          navigate('/admin/event-published', { state: { event: newEvent } });
        }
      }
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
        navigate('/admin/dashboard');
      } catch (e) {
        alert('Error deleting event');
        setLoading(false);
      }
    }
  };

  // Format display date for the datetime input
  const formatDisplayDateTime = () => {
    if (!formData.date || !formData.time) return '';
    const date = new Date(`${formData.date}T${formData.time}`);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading && isEditing && !formData.title) {
    return (
      <div className="min-h-screen bg-[#0B1019] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[#135bec] text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-[#0B1019] font-display text-white antialiased">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-[#0B1019]/90 px-4 backdrop-blur-md transition-colors">
        <button 
          onClick={() => navigate(-1)}
          className="group flex size-10 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
        </button>
        <h1 className="text-[17px] font-semibold tracking-tight text-white">
          {isEditing ? 'Edit Event' : 'New Event'}
        </h1>
        {isEditing ? (
          <button 
            onClick={handleDelete}
            className="flex size-10 items-center justify-center rounded-full text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        ) : (
          <button className="flex size-10 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 transition-all active:scale-95">
            <span className="material-symbols-outlined text-xl">more_horiz</span>
          </button>
        )}
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex flex-col gap-8 px-5 py-6">
          
          {/* Cover Photo Upload */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-[#151B28] transition-all hover:shadow-[0_0_15px_rgba(19,91,236,0.15)] cursor-pointer border border-dashed border-white/10 hover:border-[#135bec]"
          >
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Upload Cover Photo"
            />
            
            {coverImage ? (
              <>
                <img 
                  src={coverImage} 
                  alt="Cover" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-3xl text-white">edit</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#135bec]/10 text-[#135bec] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Add Cover Photo</p>
                  <p className="mt-1 text-xs text-slate-400">High quality recommended (16:9)</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-[#135bec]/5 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none"></div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-6">
            
            {/* Event Title */}
            <div className="group relative">
              <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="event-name">
                Event Title
              </label>
              <input 
                id="event-name"
                type="text"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-[15px] font-medium text-white outline-none transition-all placeholder:text-gray-500 hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec]"
                placeholder="e.g. Innovation Summit 2024"
              />
            </div>

            {/* About the Event */}
            <div className="group relative">
              <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="description">
                About the Event
              </label>
              <textarea 
                id="description"
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                className="min-h-[140px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none transition-all placeholder:text-gray-500 hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec]"
                placeholder="Share the details, agenda, and what students can expect..."
              />
            </div>

            {/* Date & Time */}
            <div className="group relative">
              <label className="mb-2 block text-sm font-medium text-slate-300">Date & Time</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-500 material-symbols-outlined">event</span>
                <input 
                  type="datetime-local"
                  value={formData.date && formData.time ? `${formData.date}T${formData.time}` : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val) {
                      const [date, time] = val.split('T');
                      handleChange('date', date);
                      handleChange('time', time);
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-[15px] font-medium text-white outline-none transition-all placeholder:text-gray-500 hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec] [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Venue */}
            <div className="group relative">
              <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="venue">
                Venue
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-500 material-symbols-outlined">location_on</span>
                <input 
                  id="venue"
                  type="text"
                  value={formData.venue}
                  onChange={e => handleChange('venue', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-[15px] font-medium text-white outline-none transition-all placeholder:text-gray-500 hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec]"
                  placeholder="e.g. Main Auditorium, Building A"
                />
              </div>
            </div>

            {/* Category */}
            <div className="group relative">
              <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-500 material-symbols-outlined">category</span>
                <select 
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-10 text-[15px] font-medium text-white outline-none transition-all hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec] appearance-none cursor-pointer"
                >
                  <option value="Cultural" className="bg-[#151B28]">Cultural</option>
                  <option value="Technical" className="bg-[#151B28]">Technical</option>
                  <option value="Sports" className="bg-[#151B28]">Sports</option>
                  <option value="Workshop" className="bg-[#151B28]">Workshop</option>
                  <option value="Seminar" className="bg-[#151B28]">Seminar</option>
                  <option value="Other" className="bg-[#151B28]">Other</option>
                </select>
                <span className="absolute right-4 text-gray-400 pointer-events-none material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>

            {/* Price & Capacity Row */}
            <div className="grid grid-cols-2 gap-5">
              {/* Ticket Price */}
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-slate-300">Ticket Price</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-500 font-medium">$</span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-9 pr-4 text-[15px] font-medium text-white outline-none transition-all placeholder:text-gray-500 hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec]"
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-slate-300">Capacity</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-500 material-symbols-outlined text-[20px]">group</span>
                  <input 
                    type="number"
                    min="1"
                    value={formData.totalSlots || ''}
                    onChange={e => handleChange('totalSlots', parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-[15px] font-medium text-white outline-none transition-all placeholder:text-gray-500 hover:bg-white/10 focus:border-[#135bec] focus:bg-[#151B28] focus:ring-1 focus:ring-[#135bec]"
                    inputMode="numeric"
                    placeholder="Unlim."
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 z-20 w-full border-t border-white/5 bg-[#0B1019]/80 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[15px] font-semibold text-slate-200 transition-colors active:bg-white/10 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex h-12 flex-[2] items-center justify-center rounded-xl bg-[#135bec] text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#0e4ac4] active:scale-[0.98] active:shadow-none disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Publish Event')}
          </button>
        </div>
      </footer>
    </div>
  );
}