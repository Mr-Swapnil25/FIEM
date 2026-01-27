/**
 * useProfileUpdate Hook
 * Handles profile update operations with validation and avatar upload
 */

import React, { useState, useCallback } from 'react';
import { updateUser } from '../services/backend';
import { uploadUserAvatar, UploadProgress } from '../services/storageService';
import { User } from '../types';

// ==================== TYPES ====================

export interface ProfileFormData {
  name: string;
  phone: string;
  department: string;
  year: string;
  rollNo: string;
  avatarUrl?: string;
}

export interface ValidationErrors {
  name?: string;
  phone?: string;
  department?: string;
  year?: string;
  rollNo?: string;
  avatar?: string;
}

export interface UseProfileUpdateReturn {
  formData: ProfileFormData;
  errors: ValidationErrors;
  loading: boolean;
  uploadProgress: number;
  avatarPreview: string | null;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  setField: (field: keyof ProfileFormData, value: string) => void;
  setAvatarFile: (file: File | null) => void;
  validate: () => boolean;
  saveProfile: (userId: string) => Promise<User | null>;
  resetForm: (user: User | null) => void;
}

// ==================== CONSTANTS ====================

export const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Other'
];

export const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Faculty',
  'Staff'
];

// ==================== VALIDATION HELPERS ====================

const validateName = (name: string): string | undefined => {
  if (!name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 3) {
    return 'Name must be at least 3 characters';
  }
  if (name.trim().length > 50) {
    return 'Name must be less than 50 characters';
  }
  // Only allow letters, spaces, and common name characters
  if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) {
    return 'Name can only contain letters, spaces, and common punctuation';
  }
  return undefined;
};

const validatePhone = (phone: string): string | undefined => {
  if (!phone) {
    return undefined; // Phone is optional
  }
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    return 'Phone number must be 10 digits';
  }
  // Indian mobile number validation (starts with 6-9)
  if (!/^[6-9]/.test(digits)) {
    return 'Please enter a valid Indian mobile number';
  }
  return undefined;
};

const validateRollNo = (rollNo: string): string | undefined => {
  if (!rollNo) {
    return undefined; // Roll number is optional
  }
  if (rollNo.length > 20) {
    return 'Roll number must be less than 20 characters';
  }
  // Allow alphanumeric and common separators
  if (!/^[a-zA-Z0-9-/]+$/.test(rollNo)) {
    return 'Roll number can only contain letters, numbers, hyphens, and slashes';
  }
  return undefined;
};

// ==================== HOOK ====================

export function useProfileUpdate(initialUser: User | null): UseProfileUpdateReturn {
  const [formData, setFormData] = useState<ProfileFormData>(() => ({
    name: initialUser?.name || '',
    phone: initialUser?.phone || '',
    department: initialUser?.department || '',
    year: initialUser?.year || '',
    rollNo: initialUser?.rollNo || '',
    avatarUrl: initialUser?.avatarUrl
  }));

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarFile, setAvatarFileState] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Set a single form field
  const setField = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  // Handle avatar file selection
  const setAvatarFile = useCallback((file: File | null) => {
    // Revoke previous preview URL to prevent memory leaks
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFileState(file);

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, avatar: 'Please select an image file (JPG, PNG)' }));
        setAvatarPreview(null);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, avatar: 'Image must be less than 5MB' }));
        setAvatarPreview(null);
        return;
      }

      // Clear avatar error and set preview
      setErrors(prev => ({ ...prev, avatar: undefined }));
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview(null);
    }
  }, [avatarPreview]);

  // Validate all fields
  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      phone: validatePhone(formData.phone),
      rollNo: validateRollNo(formData.rollNo)
    };

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== undefined);
  }, [formData]);

  // Save profile to database
  const saveProfile = useCallback(async (userId: string): Promise<User | null> => {
    if (!validate()) {
      return null;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let avatarUrl = formData.avatarUrl;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const uploadResult = await uploadUserAvatar(
          avatarFile,
          userId,
          (progress: UploadProgress) => {
            setUploadProgress(Math.round(progress.progress));
          }
        );

        if (!uploadResult.success) {
          setErrors(prev => ({ ...prev, avatar: uploadResult.error || 'Failed to upload avatar' }));
          setLoading(false);
          return null;
        }

        avatarUrl = uploadResult.url;
      }

      // Update user profile in database
      const updateData: Partial<User> = {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, '') || null,
        department: formData.department || null,
        year: formData.year || null,
        rollNo: formData.rollNo || null,
        avatarUrl
      };

      await updateUser(userId, updateData);

      // Return updated user object
      const updatedUser: User = {
        id: userId,
        email: '', // Will be filled by caller
        role: 'student', // Will be filled by caller
        createdAt: new Date().toISOString(), // Will be overwritten by caller with actual value
        ...updateData,
        name: formData.name.trim()
      };

      return updatedUser;
    } catch (error) {
      console.error('[useProfileUpdate] Error saving profile:', error);
      setErrors(prev => ({
        ...prev,
        name: 'Failed to save profile. Please try again.'
      }));
      return null;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [formData, avatarFile, validate]);

  // Reset form to user's current data
  const resetForm = useCallback((user: User | null) => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      department: user?.department || '',
      year: user?.year || '',
      rollNo: user?.rollNo || '',
      avatarUrl: user?.avatarUrl
    });
    setErrors({});
    setAvatarFileState(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
  }, [avatarPreview]);

  return {
    formData,
    errors,
    loading,
    uploadProgress,
    avatarPreview,
    setFormData,
    setField,
    setAvatarFile,
    validate,
    saveProfile,
    resetForm
  };
}

export default useProfileUpdate;
