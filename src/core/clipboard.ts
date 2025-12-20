/**
 * Secure Clipboard Utility
 * 
 * SECURITY: Auto-clears sensitive data from clipboard after a timeout.
 * Prevents clipboard snooping of addresses, amounts, and especially mnemonics.
 */

import { logger } from './logger';

/**
 * Default timeout for auto-clearing clipboard (in milliseconds)
 * 60 seconds is a balance between usability and security
 */
const DEFAULT_CLEAR_TIMEOUT_MS = 60_000;

/**
 * Shorter timeout for highly sensitive data like mnemonics
 */
const SENSITIVE_CLEAR_TIMEOUT_MS = 30_000;

// Track active clear timeout
let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Copy text to clipboard with automatic clearing
 * 
 * @param text - Text to copy
 * @param options - Configuration options
 * @returns Promise that resolves when text is copied
 */
export async function secureCopy(
  text: string,
  options: {
    /** Timeout in ms before clipboard is cleared (default: 60s) */
    clearAfterMs?: number;
    /** Whether this is highly sensitive data (uses shorter timeout) */
    sensitive?: boolean;
    /** Callback when clipboard is cleared */
    onClear?: () => void;
  } = {}
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);

    // Determine timeout
    const timeout = options.clearAfterMs ?? 
      (options.sensitive ? SENSITIVE_CLEAR_TIMEOUT_MS : DEFAULT_CLEAR_TIMEOUT_MS);

    // Cancel any existing timeout
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
    }

    // Schedule auto-clear
    clearTimeoutId = setTimeout(async () => {
      try {
        // Read current clipboard to check if it's still our content
        const currentContent = await navigator.clipboard.readText();
        if (currentContent === text) {
          await navigator.clipboard.writeText('');
          logger.debug('Clipboard auto-cleared for security');
          options.onClear?.();
        }
      } catch {
        // Can't read clipboard - clear it anyway for safety
        try {
          await navigator.clipboard.writeText('');
        } catch {
          // Clipboard API not available
        }
      }
      clearTimeoutId = null;
    }, timeout);

    return true;
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Copy an address to clipboard with 60-second auto-clear
 */
export async function copyAddress(
  address: string,
  onClear?: () => void
): Promise<boolean> {
  return secureCopy(address, {
    clearAfterMs: DEFAULT_CLEAR_TIMEOUT_MS,
    onClear,
  });
}

/**
 * Copy a mnemonic to clipboard with 30-second auto-clear
 * SECURITY: Uses shorter timeout for highly sensitive data
 */
export async function copyMnemonic(
  mnemonic: string,
  onClear?: () => void
): Promise<boolean> {
  return secureCopy(mnemonic, {
    sensitive: true,
    clearAfterMs: SENSITIVE_CLEAR_TIMEOUT_MS,
    onClear,
  });
}

/**
 * Copy a transaction hash to clipboard
 */
export async function copyTxHash(
  hash: string,
  onClear?: () => void
): Promise<boolean> {
  return secureCopy(hash, {
    clearAfterMs: DEFAULT_CLEAR_TIMEOUT_MS * 2, // 2 minutes for tx hashes
    onClear,
  });
}

/**
 * Immediately clear the clipboard
 */
export async function clearClipboard(): Promise<void> {
  try {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    await navigator.clipboard.writeText('');
    logger.debug('Clipboard cleared');
  } catch {
    // Clipboard API not available
  }
}

/**
 * Check if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  return typeof navigator !== 'undefined' && 
         typeof navigator.clipboard !== 'undefined' &&
         typeof navigator.clipboard.writeText === 'function';
}

export default {
  secureCopy,
  copyAddress,
  copyMnemonic,
  copyTxHash,
  clearClipboard,
  isClipboardAvailable,
};
