import * as Clipboard from 'expo-clipboard';
import { secureLog } from './secureLogger';

/**
 * Secure clipboard utilities with automatic data clearing
 * Prevents clipboard data from persisting indefinitely
 */

/**
 * Copy text to clipboard with automatic clearing after timeout
 * @param text Text to copy
 * @param clearAfterMs Time in milliseconds before clearing (default 2 minutes)
 */
export async function copyToClipboardSecurely(
  text: string, 
  clearAfterMs: number = 120000 // 2 minutes default
): Promise<void> {
  try {
    await Clipboard.setStringAsync(text);
    
    secureLog.debug('Text copied to clipboard with auto-clear', { 
      length: text.length,
      clearAfterSeconds: clearAfterMs / 1000
    });
    
    // Auto-clear clipboard after timeout
    setTimeout(async () => {
      try {
        // Check if our content is still in clipboard before clearing
        const currentClipboard = await Clipboard.getStringAsync();
        if (currentClipboard === text) {
          await Clipboard.setStringAsync('');
          secureLog.debug('Clipboard auto-cleared after timeout');
        }
      } catch (error) {
        secureLog.error('Error during clipboard auto-clear', error);
      }
    }, clearAfterMs);
    
  } catch (error) {
    secureLog.error('Error copying to clipboard', error);
    throw error;
  }
}

/**
 * Immediately clear clipboard
 */
export async function clearClipboard(): Promise<void> {
  try {
    await Clipboard.setStringAsync('');
    secureLog.debug('Clipboard manually cleared');
  } catch (error) {
    secureLog.error('Error clearing clipboard', error);
    throw error;
  }
}