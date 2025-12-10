// Suppress ResizeObserver errors aggressively - MUST load before React
(function() {
  'use strict';
  
  // Method 1: Override console.error before anything else
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('ResizeObserver') || 
        message.includes('loop limit exceeded') ||
        message.includes('loop completed with undelivered notifications')) {
      return; // Silently ignore
    }
    originalError.apply(console, args);
  };

  // Method 2: Override console.warn
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('ResizeObserver')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Method 3: Capture all error events
  window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('ResizeObserver')) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true);

  // Method 4: Patch ResizeObserver itself
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class PatchedResizeObserver extends OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (e) {
            if (!e.message.includes('ResizeObserver')) {
              throw e;
            }
          }
        });
      });
    }
  };

  // Method 5: Additional error boundary
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && e.reason.message.includes('ResizeObserver')) {
      e.preventDefault();
      return false;
    }
  });

  console.log('✅ ResizeObserver error suppression loaded');
})();
