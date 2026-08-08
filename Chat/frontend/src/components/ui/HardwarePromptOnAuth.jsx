import { useEffect, useRef } from 'react';
import { useAuth } from '@context/AuthContext';
import { usePerformance } from '@context/PerformanceContext';

/**
 * Every time a user enters an authenticated session (login or restored session),
 * ask for hardware strength again — even if they chose before.
 */
export default function HardwarePromptOnAuth() {
  const { isAuthenticated, loading } = useAuth();
  const { requestHardwarePrompt } = usePerformance();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && !wasAuthenticated.current) {
      requestHardwarePrompt();
    }

    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, loading, requestHardwarePrompt]);

  return null;
}
