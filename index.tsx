import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runStartupValidation, ValidationResult } from './services/envValidator';

// ============================================================================
// ENVIRONMENT VALIDATION AT STARTUP
// ============================================================================

const validationResult: ValidationResult = runStartupValidation();

// Handle validation failures gracefully
if (!validationResult.valid) {
  console.error('❌ Application cannot start due to configuration errors');
  
  // Store errors for the error page to display
  try {
    localStorage.setItem('envErrors', JSON.stringify(validationResult.errors));
  } catch (e) {
    console.error('Failed to store error details:', e);
  }
  
  // Redirect to config error page
  const errorPageUrl = '/error-pages/config-error.html';
  
  // Check if we're not already on the error page to prevent infinite loop
  if (!window.location.pathname.includes('error-pages')) {
    window.location.href = errorPageUrl;
  }
}

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
  
  // Report to monitoring service in production
  if (import.meta.env.PROD) {
    // Could send to Firebase Analytics or custom endpoint
    console.error('[Error Report]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  
  // Check for rate limiting errors
  if (event.reason?.message?.includes('Rate limit') || 
      event.reason?.code === 'resource-exhausted') {
    const retryAfter = event.reason?.retryAfter || 60;
    window.location.href = `/error-pages/429.html?retry=${retryAfter}`;
  }
});

// ============================================================================
// RENDER APPLICATION
// ============================================================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);