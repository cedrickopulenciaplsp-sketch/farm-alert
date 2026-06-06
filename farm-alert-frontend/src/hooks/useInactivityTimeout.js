import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';

/**
 * Custom hook that automatically logs the user out if they are inactive 
 * for a specified number of minutes.
 * 
 * @param {number} timeoutMinutes - How long to wait before logging out (default 2)
 */
export function useInactivityTimeout(timeoutMinutes = 2) {
  const { session } = useAuth();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // If the user isn't logged in, we don't need to track inactivity
    if (!session) return;

    const performLogout = async () => {
      console.log(`User inactive for ${timeoutMinutes} minutes. Auto-logging out...`);
      await logout();
      // Once logged out, the AuthContext state updates, and ProtectedRoute
      // will instantly kick them back to the /login page.
    };

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(performLogout, timeoutMinutes * 60 * 1000);
    };

    // Track standard user interaction events
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Initialize timer on mount
    resetTimer();

    // Cleanup listeners and timer on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [session, timeoutMinutes]);
}
