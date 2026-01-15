/**
 * File Upload Components
 * 
 * Provides reusable file upload components with:
 * - Drag and drop support
 * - Progress tracking
 * - File validation
 * - Preview functionality
 * - Error handling
 * 
 * @module components/FileUpload
 */

import React, { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Loader2, Check, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FileUploadProps {
  /** Accepted file types (e.g., "image/*", ".pdf,.doc") */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Whether to show image preview */
  showPreview?: boolean;
  /** Upload function that returns URL */
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  /** Callback when upload completes */
  onComplete?: (url: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Current value (URL) */
  value?: string;
  /** Label for the upload area */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Whether upload is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'avatar' | 'compact';
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  previewUrl?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file type
 */
function isValidFileType(file: File, accept?: string): boolean {
  if (!accept) return true;
  
  const acceptedTypes = accept.split(',').map(t => t.trim());
  const fileType = file.type;
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  return acceptedTypes.some(type => {
    if (type.startsWith('.')) {
      return fileExtension === type.toLowerCase();
    }
    if (type.endsWith('/*')) {
      const category = type.replace('/*', '');
      return fileType.startsWith(category);
    }
    return fileType === type;
  });
}

/**
 * Get file type icon
 */
function getFileIcon(file: File): React.ReactNode {
  if (file.type.startsWith('image/')) {
    return <ImageIcon className="w-8 h-8 text-blue-500" />;
  }
  return <FileText className="w-8 h-8 text-gray-500" />;
}

// ============================================================================
// FILE UPLOAD COMPONENT
// ============================================================================

export function FileUpload({
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  showPreview = true,
  onUpload,
  onComplete,
  onError,
  value,
  label = 'Upload file',
  helperText,
  disabled = false,
  className = '',
  variant = 'default',
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>({
    status: value ? 'success' : 'idle',
    progress: 0,
    previewUrl: value,
  });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!isValidFileType(file, accept)) {
      return `Invalid file type. Accepted: ${accept}`;
    }
    if (file.size > maxSize) {
      return `File too large. Maximum: ${formatFileSize(maxSize)}`;
    }
    return null;
  }, [accept, maxSize]);

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({ ...prev, status: 'error', error: validationError }));
      onError?.(validationError);
      return;
    }

    // Create preview URL for images
    let previewUrl: string | undefined;
    if (showPreview && file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    setState({
      status: 'uploading',
      progress: 0,
      previewUrl,
    });

    try {
      const url = await onUpload(file, (progress) => {
        setState(prev => ({ ...prev, progress }));
      });

      setState({
        status: 'success',
        progress: 100,
        previewUrl: url,
      });

      onComplete?.(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
      onError?.(errorMessage);
      
      // Clean up preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, [validateFile, showPreview, onUpload, onComplete, onError]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [disabled, handleUpload]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    // Reset input to allow selecting same file
    e.target.value = '';
  }, [handleUpload]);

  const handleClick = useCallback(() => {
    if (!disabled && state.status !== 'uploading') {
      inputRef.current?.click();
    }
  }, [disabled, state.status]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setState({
      status: 'idle',
      progress: 0,
      previewUrl: undefined,
    });
  }, []);

  // Variant-specific styles
  const variantStyles = {
    default: 'p-6 border-2 border-dashed rounded-xl',
    avatar: 'w-32 h-32 rounded-full border-2 border-dashed',
    compact: 'p-3 border-2 border-dashed rounded-lg',
  };

  const baseStyles = `
    relative flex flex-col items-center justify-center
    transition-all cursor-pointer
    ${variantStyles[variant]}
    ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
    ${state.status === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && variant !== 'avatar' && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div
        className={baseStyles}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Preview Image */}
        {showPreview && state.previewUrl && state.status !== 'error' && (
          <div className={`relative ${variant === 'avatar' ? 'w-full h-full' : 'w-full'}`}>
            <img
              src={state.previewUrl}
              alt="Preview"
              className={`object-cover ${
                variant === 'avatar' 
                  ? 'w-full h-full rounded-full' 
                  : 'w-full h-48 rounded-lg'
              }`}
            />
            {state.status === 'success' && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            {state.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <span className="text-sm">{Math.round(state.progress)}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload UI */}
        {(!state.previewUrl || state.status === 'error') && (
          <>
            {state.status === 'uploading' ? (
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uploading... {Math.round(state.progress)}%
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              </div>
            ) : state.status === 'error' ? (
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setState({ status: 'idle', progress: 0 }); }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                </p>
                {variant !== 'compact' && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {accept.includes('image') ? 'PNG, JPG, GIF' : accept} up to {formatFileSize(maxSize)}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {helperText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}

// ============================================================================
// AVATAR UPLOAD COMPONENT
// ============================================================================

interface AvatarUploadProps {
  value?: string;
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({
  value,
  onUpload,
  onComplete,
  onError,
  disabled = false,
  size = 'md',
}: AvatarUploadProps) {
  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <FileUpload
      accept="image/jpeg,image/png,image/gif,image/webp"
      maxSize={5 * 1024 * 1024} // 5MB for avatars
      showPreview={true}
      onUpload={onUpload}
      onComplete={onComplete}
      onError={onError}
      value={value}
      disabled={disabled}
      variant="avatar"
      className={sizes[size]}
    />
  );
}

// ============================================================================
// EVENT IMAGE UPLOAD COMPONENT
// ============================================================================

interface EventImageUploadProps {
  value?: string;
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function EventImageUpload({
  value,
  onUpload,
  onComplete,
  onError,
  disabled = false,
}: EventImageUploadProps) {
  return (
    <FileUpload
      accept="image/jpeg,image/png,image/gif,image/webp"
      maxSize={10 * 1024 * 1024} // 10MB for event images
      showPreview={true}
      onUpload={onUpload}
      onComplete={onComplete}
      onError={onError}
      value={value}
      label="Event Image"
      helperText="Recommended: 1200x630px for best display"
      disabled={disabled}
    />
  );
}

// ============================================================================
// ID CARD UPLOAD COMPONENT
// ============================================================================

interface IdCardUploadProps {
  value?: string;
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  onComplete?: (url: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function IdCardUpload({
  value,
  onUpload,
  onComplete,
  onError,
  disabled = false,
}: IdCardUploadProps) {
  return (
    <FileUpload
      accept="image/jpeg,image/png,application/pdf"
      maxSize={5 * 1024 * 1024} // 5MB for ID cards
      showPreview={true}
      onUpload={onUpload}
      onComplete={onComplete}
      onError={onError}
      value={value}
      label="College ID Card"
      helperText="Upload a clear image of your college ID card"
      disabled={disabled}
    />
  );
}

export default FileUpload;
