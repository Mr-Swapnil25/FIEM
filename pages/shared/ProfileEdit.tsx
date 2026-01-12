import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { useProfileUpdate, DEPARTMENTS, YEARS } from '../../hooks/useProfileUpdate';

interface ProfileEditProps {
  variant?: 'student' | 'admin';
}

export default function ProfileEdit({ variant = 'student' }: ProfileEditProps) {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    formData,
    errors,
    loading,
    uploadProgress,
    avatarPreview,
    setField,
    setAvatarFile,
    saveProfile,
    resetForm
  } = useProfileUpdate(user);

  // Reset form when user changes
  useEffect(() => {
    resetForm(user);
  }, [user?.id]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const updatedUser = await saveProfile(user.id);
    
    if (updatedUser) {
      // Update the auth context with new user data
      updateUserProfile({
        ...user,
        name: updatedUser.name,
        phone: updatedUser.phone,
        department: updatedUser.department,
        year: updatedUser.year,
        rollNo: updatedUser.rollNo,
        avatarUrl: updatedUser.avatarUrl
      });

      // Navigate back to profile with success message
      navigate(variant === 'admin' ? '/admin/profile' : '/student/profile', {
        state: { message: 'Profile updated successfully!' }
      });
    }
  };

  const handleCancel = () => {
    resetForm(user);
    navigate(-1);
  };

  if (!user) return null;

  const currentAvatar = avatarPreview || formData.avatarUrl || 'https://picsum.photos/200';
  const isAdmin = variant === 'admin';

  return (
    <div className={`relative min-h-screen ${isAdmin ? 'bg-[#101622]' : 'bg-background'} font-display text-white antialiased`}>
      {/* Background Gradient */}
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-[80px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-md border-b border-white/5">
        <button 
          onClick={handleCancel}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white">Edit Profile</h1>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center justify-center px-4 h-10 rounded-full bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px] mr-2">progress_activity</span>
              {uploadProgress > 0 ? `${uploadProgress}%` : 'Saving...'}
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>

      <div className="flex flex-col px-6 pt-8 pb-32 max-w-lg mx-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            {/* Avatar Glow */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-indigo-500 rounded-full opacity-50 blur group-hover:opacity-75 transition duration-300"></div>
            
            {/* Avatar Image */}
            <div className="relative w-32 h-32 rounded-full p-[3px] bg-background">
              <div 
                className="w-full h-full rounded-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${currentAvatar}")` }}
              ></div>
            </div>

            {/* Edit Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
            </div>

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <span className="absolute text-lg font-bold">{uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <button 
            onClick={handleAvatarClick}
            disabled={loading}
            className="mt-4 text-primary text-sm font-semibold hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            Change Photo
          </button>

          {errors.avatar && (
            <p className="mt-2 text-red-400 text-xs text-center">{errors.avatar}</p>
          )}

          <p className="mt-1 text-slate-500 text-xs">JPG, PNG or WebP. Max 5MB.</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
              className={`w-full bg-surface border rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                errors.name 
                  ? 'border-red-500 focus:ring-red-500/50' 
                  : 'border-white/10 focus:ring-primary/50 focus:border-primary'
              }`}
            />
            {errors.name && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.name}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+91</span>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setField('phone', value);
                }}
                placeholder="9876543210"
                disabled={loading}
                className={`w-full bg-surface border rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                  errors.phone 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : 'border-white/10 focus:ring-primary/50 focus:border-primary'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.phone}
              </p>
            )}
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Department
            </label>
            <div className="relative">
              <select
                value={formData.department}
                onChange={(e) => setField('department', e.target.value)}
                disabled={loading}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 cursor-pointer"
              >
                <option value="" className="bg-surface">Select department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept} className="bg-surface">{dept}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Year */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Year / Position
            </label>
            <div className="relative">
              <select
                value={formData.year}
                onChange={(e) => setField('year', e.target.value)}
                disabled={loading}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 cursor-pointer"
              >
                <option value="" className="bg-surface">Select year</option>
                {YEARS.map(year => (
                  <option key={year} value={year} className="bg-surface">{year}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Roll Number / Employee ID */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              {isAdmin ? 'Employee ID' : 'Roll Number'}
            </label>
            <input
              type="text"
              value={formData.rollNo}
              onChange={(e) => setField('rollNo', e.target.value.toUpperCase())}
              placeholder={isAdmin ? 'EMP-001' : '20CS1088'}
              disabled={loading}
              className={`w-full bg-surface border rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                errors.rollNo 
                  ? 'border-red-500 focus:ring-red-500/50' 
                  : 'border-white/10 focus:ring-primary/50 focus:border-primary'
              }`}
            />
            {errors.rollNo && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.rollNo}
              </p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-surface/50 border border-white/5 rounded-xl px-4 py-3.5 text-slate-400 cursor-not-allowed"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-[18px]">
                lock
              </span>
            </div>
            <p className="text-slate-500 text-xs">Email cannot be changed</p>
          </div>
        </div>

        {/* Cancel Button (Mobile) */}
        <button
          onClick={handleCancel}
          disabled={loading}
          className="mt-8 w-full py-3.5 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
