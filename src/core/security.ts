/**
 * Security Utilities for Sultan Wallet
 * 
 * Production-grade security primitives for handling sensitive data.
 * 
 * SECURITY FEATURES:
 * - Secure memory wiping
 * - Constant-time comparison
 * - Rate limiting
 * - Session management with auto-lock
 * - Input validation and sanitization
 */

import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

// ============================================================================
// Constants
// ============================================================================

/** Minimum PIN length */
export const MIN_PIN_LENGTH = 6;

/** Maximum PIN length */
export const MAX_PIN_LENGTH = 12;

/** Maximum failed PIN attempts before lockout */
export const MAX_PIN_ATTEMPTS = 5;

/** Lockout duration in milliseconds (5 minutes) */
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

/** Session timeout in milliseconds (5 minutes of inactivity) */
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/** PBKDF2 iterations - OWASP 2024 recommendation for SHA-256 */
export const PBKDF2_ITERATIONS = 600_000;

/** Minimum salt length in bytes */
export const SALT_LENGTH = 32;

/** AES-GCM IV length in bytes */
export const IV_LENGTH = 12;

// ============================================================================
// Secure Memory Handling
// ============================================================================

/**
 * Securely wipe a Uint8Array by overwriting with random data then zeros.
 * This helps prevent memory forensics attacks.
 */
export function secureWipe(data: Uint8Array): void {
  if (!data || data.length === 0) return;
  
  // First pass: random data
  const random = randomBytes(data.length);
  data.set(random);
  
  // Second pass: zeros
  data.fill(0);
  
  // Third pass: ones (helps with some memory types)
  data.fill(0xFF);
  
  // Final pass: zeros
  data.fill(0);
}

/**
 * Securely wipe a string by creating a buffer and wiping it.
 * Note: Due to JS string immutability, the original string may remain in memory.
 * Use SecureString class for sensitive strings.
 */
export function secureWipeString(str: string): void {
  // Create a buffer from the string and wipe it
  const encoder = new TextEncoder();
  const buffer = encoder.encode(str);
  secureWipe(buffer);
}

/**
 * SecureString class for handling sensitive string data.
 * Stores data as encrypted bytes, decrypts only when needed.
 */
export class SecureString {
  private data: Uint8Array;
  private key: Uint8Array;
  
  constructor(value: string) {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(value);
    
    // Generate random XOR key
    this.key = randomBytes(plaintext.length);
    
    // XOR encrypt the data
    this.data = new Uint8Array(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
      this.data[i] = plaintext[i] ^ this.key[i];
    }
    
    // Wipe plaintext
    secureWipe(plaintext);
  }
  
  /**
   * Get the decrypted value. Caller is responsible for wiping.
   */
  getValue(): Uint8Array {
    const result = new Uint8Array(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      result[i] = this.data[i] ^ this.key[i];
    }
    return result;
  }
  
  /**
   * Get as string (use sparingly - strings are immutable)
   */
  toString(): string {
    const bytes = this.getValue();
    const str = new TextDecoder().decode(bytes);
    secureWipe(bytes);
    return str;
  }

  /**
   * Reveal the secret value as a string.
   * SECURITY: The returned string is immutable and cannot be wiped.
   * Use only when absolutely necessary (e.g., passing to library functions).
   * Alias for toString() with more explicit naming.
   */
  reveal(): string {
    return this.toString();
  }
  
  /**
   * Securely destroy this secure string
   */
  destroy(): void {
    secureWipe(this.data);
    secureWipe(this.key);
  }
}

// ============================================================================
// Constant-Time Operations
// ============================================================================

/**
 * Constant-time comparison of two byte arrays.
 * Prevents timing attacks by always comparing all bytes.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Constant-time string comparison
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  // Pad to equal length to prevent length-based timing attacks
  const maxLen = Math.max(aBytes.length, bBytes.length);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  
  const equal = constantTimeEqual(aPadded, bPadded) && aBytes.length === bBytes.length;
  
  secureWipe(aPadded);
  secureWipe(bPadded);
  
  return equal;
}

// ============================================================================
// Rate Limiting & Lockout
// ============================================================================

interface LockoutState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

const LOCKOUT_KEY = 'sultan_wallet_lockout';

/**
 * Get current lockout state from localStorage
 */
export function getLockoutState(): LockoutState {
  try {
    const stored = localStorage.getItem(LOCKOUT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  
  return {
    attempts: 0,
    lastAttempt: 0,
    lockedUntil: 0,
  };
}

/**
 * Save lockout state to localStorage
 */
function saveLockoutState(state: LockoutState): void {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
}

/**
 * Check if wallet is currently locked out due to failed attempts
 */
export function isLockedOut(): boolean {
  const state = getLockoutState();
  return Date.now() < state.lockedUntil;
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutRemaining(): number {
  const state = getLockoutState();
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Record a failed PIN attempt
 */
export function recordFailedAttempt(): { locked: boolean; attemptsRemaining: number } {
  const state = getLockoutState();
  
  // Reset if last attempt was more than lockout duration ago
  if (Date.now() - state.lastAttempt > LOCKOUT_DURATION_MS) {
    state.attempts = 0;
  }
  
  state.attempts++;
  state.lastAttempt = Date.now();
  
  if (state.attempts >= MAX_PIN_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    saveLockoutState(state);
    return { locked: true, attemptsRemaining: 0 };
  }
  
  saveLockoutState(state);
  return { 
    locked: false, 
    attemptsRemaining: MAX_PIN_ATTEMPTS - state.attempts 
  };
}

/**
 * Clear failed attempts on successful unlock
 */
export function clearFailedAttempts(): void {
  localStorage.removeItem(LOCKOUT_KEY);
}

// ============================================================================
// Session Management
// ============================================================================

interface SessionState {
  lastActivity: number;
  sessionId: string;
}

let currentSession: SessionState | null = null;
let sessionTimeoutId: number | null = null;
let onSessionExpired: (() => void) | null = null;

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  const bytes = randomBytes(32);
  const id = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  secureWipe(bytes);
  return id;
}

/**
 * Start a new session with auto-lock timeout
 */
export function startSession(onExpire: () => void): string {
  endSession(); // Clean up any existing session
  
  onSessionExpired = onExpire;
  currentSession = {
    lastActivity: Date.now(),
    sessionId: generateSessionId(),
  };
  
  resetSessionTimeout();
  
  return currentSession.sessionId;
}

/**
 * Record activity to reset the timeout
 */
export function recordActivity(): void {
  if (currentSession) {
    currentSession.lastActivity = Date.now();
    resetSessionTimeout();
  }
}

/**
 * Reset the session timeout timer
 */
function resetSessionTimeout(): void {
  if (sessionTimeoutId !== null) {
    clearTimeout(sessionTimeoutId);
  }
  
  sessionTimeoutId = window.setTimeout(() => {
    if (onSessionExpired) {
      onSessionExpired();
    }
    endSession();
  }, SESSION_TIMEOUT_MS);
}

/**
 * End the current session
 */
export function endSession(): void {
  if (sessionTimeoutId !== null) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
  
  currentSession = null;
  onSessionExpired = null;
}

/**
 * Check if session is valid
 */
export function isSessionValid(): boolean {
  if (!currentSession) return false;
  
  const elapsed = Date.now() - currentSession.lastActivity;
  return elapsed < SESSION_TIMEOUT_MS;
}

// Session PIN storage for verification (in-memory only, hash only)
let sessionPinHash: string | null = null;

/**
 * Set the session PIN hash for verification
 * SECURITY: Only stores hash, never the plain PIN
 */
export function setSessionPinHash(pinHash: string): void {
  sessionPinHash = pinHash;
}

/**
 * Clear the session PIN hash
 */
export function clearSessionPinHash(): void {
  sessionPinHash = null;
}

/**
 * Hash a PIN for comparison/storage
 * Uses SHA-256 for consistency
 * Exported for use in unlock flow
 */
export function hashPinForVerification(pin: string): string {
  const encoder = new TextEncoder();
  const hash = sha256(encoder.encode(pin));
  return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against the session PIN hash
 * SECURITY: Used to re-verify PIN before sensitive operations like signing
 * 
 * @param pin - The PIN entered by the user
 * @returns True if PIN matches, false otherwise
 */
export async function verifySessionPin(pin: string): Promise<boolean> {
  // Check if locked out
  if (isLockedOut()) {
    const remaining = getLockoutRemaining();
    throw new Error(`Too many attempts. Try again in ${remaining} seconds.`);
  }

  if (!sessionPinHash) {
    // No session PIN stored - session may have expired
    return false;
  }

  const inputHash = hashPinForVerification(pin);
  
  // Use constant-time comparison to prevent timing attacks
  const encoder = new TextEncoder();
  const storedBytes = encoder.encode(sessionPinHash);
  const inputBytes = encoder.encode(inputHash);
  
  const isValid = constantTimeEqual(storedBytes, inputBytes);
  
  if (!isValid) {
    // Record failed attempt for rate limiting
    recordFailedAttempt();
  }
  
  return isValid;
}

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate PIN format
 */
export function validatePin(pin: string): { valid: boolean; error?: string } {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN is required' };
  }
  
  if (pin.length < MIN_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at least ${MIN_PIN_LENGTH} digits` };
  }
  
  if (pin.length > MAX_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at most ${MAX_PIN_LENGTH} digits` };
  }
  
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }
  
  // Check for sequential digits (123456)
  let sequential = true;
  for (let i = 1; i < pin.length; i++) {
    if (parseInt(pin[i]) !== parseInt(pin[i-1]) + 1) {
      sequential = false;
      break;
    }
  }
  if (sequential) {
    return { valid: false, error: 'PIN cannot be sequential digits' };
  }
  
  // Check for repeated digits (111111)
  if (new Set(pin.split('')).size === 1) {
    return { valid: false, error: 'PIN cannot be all the same digit' };
  }
  
  return { valid: true };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate Sultan address format
 */
export function validateAddress(address: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }
  
  if (!address.startsWith('sultan1')) {
    return { valid: false, error: 'Address must start with "sultan1"' };
  }
  
  if (address.length < 39 || address.length > 59) {
    return { valid: false, error: 'Invalid address length' };
  }
  
  // Check for valid bech32 characters
  const validChars = /^sultan1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/;
  if (!validChars.test(address)) {
    return { valid: false, error: 'Address contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validate transaction amount
 */
export function validateAmount(
  amount: string, 
  available: string,
  decimals: number = 9
): { valid: boolean; error?: string } {
  if (!amount || typeof amount !== 'string') {
    return { valid: false, error: 'Amount is required' };
  }
  
  // Check format
  const amountRegex = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!amountRegex.test(amount)) {
    return { valid: false, error: 'Invalid amount format' };
  }
  
  const amountNum = parseFloat(amount);
  const availableNum = parseFloat(available);
  
  if (isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (amountNum > availableNum) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  return { valid: true };
}

// ============================================================================
// Cryptographic Helpers
// ============================================================================

/**
 * Generate a nonce for transaction uniqueness
 */
export function generateNonce(): string {
  const timestamp = Date.now().toString(16);
  const random = Array.from(randomBytes(8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}-${random}`;
}

/**
 * Hash data using SHA-256
 */
export function hash(data: string | Uint8Array): Uint8Array {
  if (typeof data === 'string') {
    return sha256(new TextEncoder().encode(data));
  }
  return sha256(data);
}

/**
 * Create a checksum for data verification
 */
export function createChecksum(data: string): string {
  const hashBytes = hash(data);
  const checksum = Array.from(hashBytes.slice(0, 4))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  secureWipe(hashBytes);
  return checksum;
}

/**
 * Verify data checksum
 */
export function verifyChecksum(data: string, checksum: string): boolean {
  const expected = createChecksum(data);
  return constantTimeStringEqual(expected, checksum);
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/** Alias for getLockoutRemaining - returns remaining seconds */
export function getRemainingLockoutTime(): number {
  return getLockoutRemaining();
}

/** Alias for recordActivity */
export function updateActivity(): void {
  recordActivity();
}

/** Check if session has timed out */
export function checkSessionTimeout(): boolean {
  return !isSessionValid();
}
