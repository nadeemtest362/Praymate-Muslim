import { useState, useCallback } from 'react';
import { useSession } from './useAuth';

interface UseMagicLinkReturn {
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string; cooldownSeconds?: number }>;
  isSending: boolean;
  lastError: string | null;
  cooldownSeconds: number | null;
  clearError: () => void;
}

export const useMagicLink = (): UseMagicLinkReturn => {
  const { sendMagicLink, isSendingMagicLink, lastError, clearError } = useSession();
  const [localError, setLocalError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const sendMagicLinkWrapper = useCallback(async (email: string) => {
    try {
      // Clear any previous errors and cooldown
      setLocalError(null);
      setCooldownSeconds(null);
      clearError();
      
      // Validate email
      if (!email || !email.trim()) {
        const error = 'Please enter a valid email address';
        setLocalError(error);
        return { success: false, error };
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const error = 'Please enter a valid email address';
        setLocalError(error);
        return { success: false, error };
      }

      console.log('[useMagicLink] Sending magic link to:', email);
      
      // Send magic link
      const result = await sendMagicLink(email.trim());
      
      if (result.success) {
        console.log('[useMagicLink] Magic link sent successfully');
      } else {
        console.error('[useMagicLink] Magic link failed:', result.error);
        setLocalError(result.error || 'Failed to send magic link');
        if (result.cooldownSeconds) {
          setCooldownSeconds(result.cooldownSeconds);
        }
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[useMagicLink] Unexpected error:', error);
      setLocalError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [sendMagicLink, clearError]);

  const clearLocalError = useCallback(() => {
    setLocalError(null);
    setCooldownSeconds(null);
    clearError();
  }, [clearError]);

  return {
    sendMagicLink: sendMagicLinkWrapper,
    isSending: isSendingMagicLink,
    lastError: localError || lastError,
    cooldownSeconds,
    clearError: clearLocalError,
  };
};
