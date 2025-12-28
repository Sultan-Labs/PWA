
/**
 * Bookmark Reminder
 * 
 * Shows a subtle reminder to bookmark the wallet after successful login/setup.
 * Appears once per user and displays platform-specific shortcuts.
 */

import { useState, useEffect } from 'react';
import './BookmarkReminder.css';

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

interface BookmarkReminderProps {
  context?: 'welcome' | 'dashboard';
  delay?: number;
}

export default function BookmarkReminder({ context = 'welcome', delay = 3000 }: BookmarkReminderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Use different storage keys for different contexts
    const storageKey = `sultan-bookmark-reminder-${context}`;
    const hasBeenShown = localStorage.getItem(storageKey);
    
    if (!hasBeenShown) {
      setShouldRender(true);
      // Show after delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [context, delay]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Save that we've shown the reminder for this context
    const storageKey = `sultan-bookmark-reminder-${context}`;
    localStorage.setItem(storageKey, 'true');
    // Remove from DOM after animation
    setTimeout(() => setShouldRender(false), 300);
  };

  if (!shouldRender) return null;

  // Detect platform for keyboard shortcut
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcut = isMac ? '⌘+D' : 'Ctrl+D';

  return (
    <div className={`bookmark-reminder ${isVisible ? 'visible' : ''}`}>
      <div className="bookmark-content">
        <div className="bookmark-icon">
          <BookmarkIcon />
        </div>
        <div className="bookmark-text">
          <strong>Bookmark this wallet</strong>
          <span className="bookmark-hint">Press {shortcut} for quick access</span>
        </div>
        <button 
          className="bookmark-dismiss" 
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}
