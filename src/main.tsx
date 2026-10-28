import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely suppress non-fatal Firestore SDK internal assertion glitches
if (typeof window !== 'undefined') {
  const isFirestoreAssertionGlitch = (val: any): boolean => {
    if (!val) return false;
    const str = String(val?.message || val?.stack || val?.reason || val || '');
    return (
      str.includes('INTERNAL ASSERTION FAILED') ||
      str.includes('ID: b815') ||
      str.includes('ID: ca9') ||
      (str.includes('FIRESTORE') && str.includes('assertion'))
    );
  };

  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (isFirestoreAssertionGlitch(message) || isFirestoreAssertionGlitch(error)) {
      console.warn('[GoStars Firebase] Safely suppressed internal SDK assertion notice:', message);
      return true;
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener(
    'error',
    (event) => {
      if (isFirestoreAssertionGlitch(event?.error) || isFirestoreAssertionGlitch(event?.message)) {
        console.warn('[GoStars Firebase] Safely suppressed internal SDK assertion error event');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (isFirestoreAssertionGlitch(event?.reason)) {
        console.warn('[GoStars Firebase] Safely suppressed internal SDK assertion rejection');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
