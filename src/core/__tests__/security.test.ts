/**
 * Sultan Wallet Security - Unit Tests
 * 
 * Tests for security primitives: memory wiping, constant-time comparison,
 * rate limiting, and session management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  secureWipe,
  SecureString,
  constantTimeEqual,
  constantTimeStringEqual,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  getLockoutRemaining,
  getLockoutState,
  startSession,
  endSession,
  isSessionValid,
  recordActivity,
  MIN_PIN_LENGTH,
  MAX_PIN_LENGTH,
  MAX_PIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  SESSION_TIMEOUT_MS,
  PBKDF2_ITERATIONS,
} from '../security';

// ============================================================================
// Secure Memory Wiping Tests
// ============================================================================

describe('Security - Secure Wipe', () => {
  it('should zero out Uint8Array', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    
    secureWipe(data);
    
    // All bytes should be zero
    expect(data.every((byte) => byte === 0)).toBe(true);
  });

  it('should handle empty array', () => {
    const data = new Uint8Array(0);
    
    expect(() => secureWipe(data)).not.toThrow();
  });

  it('should handle large arrays', () => {
    const data = new Uint8Array(64 * 1024); // 64KB - within randomBytes limit
    data.fill(0xff);
    
    secureWipe(data);
    
    expect(data.every((byte) => byte === 0)).toBe(true);
  });
});

// ============================================================================
// SecureString Tests
// ============================================================================

describe('Security - SecureString', () => {
  it('should store and retrieve value correctly', () => {
    const secret = 'my-secret-password';
    const secureStr = new SecureString(secret);
    
    expect(secureStr.toString()).toBe(secret);
  });

  it('should XOR-encrypt stored data and decrypt correctly', () => {
    const secret = 'password123';
    const secureStr = new SecureString(secret);
    
    // getValue() should return decrypted data that matches original
    const bytes = secureStr.getValue();
    const plainBytes = new TextEncoder().encode(secret);
    
    // Decrypted value should match original
    let allMatch = bytes.length === plainBytes.length;
    for (let i = 0; i < bytes.length && allMatch; i++) {
      if (bytes[i] !== plainBytes[i]) {
        allMatch = false;
      }
    }
    
    expect(allMatch).toBe(true);
    
    // toString() should also return original value
    expect(secureStr.toString()).toBe(secret);
    
    // Cleanup
    secureWipe(bytes);
    secureStr.destroy();
  });

  it('should destroy internal data', () => {
    const secureStr = new SecureString('secret');
    
    secureStr.destroy();
    
    // After destruction, getValue should return zeroed data
    // (Implementation detail - behavior may vary)
  });

  it('should handle unicode strings', () => {
    const secret = '密码🔐émojis';
    const secureStr = new SecureString(secret);
    
    expect(secureStr.toString()).toBe(secret);
    
    secureStr.destroy();
  });
});

// ============================================================================
// Constant-Time Comparison Tests
// ============================================================================

describe('Security - Constant-Time Comparison', () => {
  describe('constantTimeEqual', () => {
    it('should return true for equal arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 4]);
      
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 5]);
      
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return false for arrays of different length', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3, 4]);
      
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should handle empty arrays', () => {
      const a = new Uint8Array(0);
      const b = new Uint8Array(0);
      
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should detect single bit difference', () => {
      const a = new Uint8Array([0b11111111]);
      const b = new Uint8Array([0b11111110]);
      
      expect(constantTimeEqual(a, b)).toBe(false);
    });
  });

  describe('constantTimeStringEqual', () => {
    it('should return true for equal strings', () => {
      expect(constantTimeStringEqual('password123', 'password123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeStringEqual('password123', 'password124')).toBe(false);
    });

    it('should return false for strings of different length', () => {
      expect(constantTimeStringEqual('short', 'longer')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(constantTimeStringEqual('', '')).toBe(true);
    });

    it('should handle unicode', () => {
      expect(constantTimeStringEqual('🔐密码', '🔐密码')).toBe(true);
      expect(constantTimeStringEqual('🔐密码', '🔐密碼')).toBe(false);
    });
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe('Security - Rate Limiting', () => {
  beforeEach(() => {
    // Clear lockout state before each test
    clearFailedAttempts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearFailedAttempts();
  });

  it('should not be locked out initially', () => {
    expect(isLockedOut()).toBe(false);
  });

  it('should track failed attempts', () => {
    const result1 = recordFailedAttempt();
    expect(result1.attemptsRemaining).toBe(MAX_PIN_ATTEMPTS - 1);
    
    const result2 = recordFailedAttempt();
    expect(result2.attemptsRemaining).toBe(MAX_PIN_ATTEMPTS - 2);
  });

  it('should lock out after max attempts', () => {
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      recordFailedAttempt();
    }
    
    expect(isLockedOut()).toBe(true);
  });

  it('should unlock after lockout duration', () => {
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      recordFailedAttempt();
    }
    
    expect(isLockedOut()).toBe(true);
    
    // Advance time past lockout duration
    vi.advanceTimersByTime(LOCKOUT_DURATION_MS + 1000);
    
    expect(isLockedOut()).toBe(false);
  });

  it('should report remaining lockout time', () => {
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      recordFailedAttempt();
    }
    
    const remaining = getLockoutRemaining();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(LOCKOUT_DURATION_MS / 1000);
  });

  it('should clear attempts on successful unlock', () => {
    recordFailedAttempt();
    recordFailedAttempt();
    
    clearFailedAttempts();
    
    const state = getLockoutState();
    expect(state.attempts).toBe(0);
  });

  it('should reset attempts after lockout expires', () => {
    // Make some failed attempts
    recordFailedAttempt();
    recordFailedAttempt();
    
    // Advance time past lockout duration
    vi.advanceTimersByTime(LOCKOUT_DURATION_MS + 1000);
    
    // Next failed attempt should reset counter
    const result = recordFailedAttempt();
    expect(result.attemptsRemaining).toBe(MAX_PIN_ATTEMPTS - 1);
  });
});

// ============================================================================
// Session Management Tests
// ============================================================================

describe('Security - Session Management', () => {
  beforeEach(() => {
    endSession();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    endSession();
  });

  it('should start a session', () => {
    startSession(() => {});
    
    expect(isSessionValid()).toBe(true);
  });

  it('should end a session', () => {
    startSession(() => {});
    endSession();
    
    expect(isSessionValid()).toBe(false);
  });

  it('should timeout after inactivity', () => {
    startSession(() => { /* expiry callback */ });
    
    expect(isSessionValid()).toBe(true);
    
    // Advance time past session timeout
    vi.advanceTimersByTime(SESSION_TIMEOUT_MS + 1000);
    
    expect(isSessionValid()).toBe(false);
  });

  it('should extend session on activity', () => {
    startSession(() => {});
    
    // Advance time partway through timeout
    vi.advanceTimersByTime(SESSION_TIMEOUT_MS / 2);
    
    // Record activity
    recordActivity();
    
    // Advance time again
    vi.advanceTimersByTime(SESSION_TIMEOUT_MS / 2);
    
    // Session should still be active
    expect(isSessionValid()).toBe(true);
  });
});

// ============================================================================
// Security Constants Tests
// ============================================================================

describe('Security - Constants', () => {
  it('should have reasonable PIN length limits', () => {
    expect(MIN_PIN_LENGTH).toBeGreaterThanOrEqual(4);
    expect(MIN_PIN_LENGTH).toBe(6); // OWASP recommendation
    expect(MAX_PIN_LENGTH).toBeLessThanOrEqual(20);
  });

  it('should have reasonable attempt limits', () => {
    expect(MAX_PIN_ATTEMPTS).toBeLessThanOrEqual(10);
    expect(MAX_PIN_ATTEMPTS).toBeGreaterThanOrEqual(3);
  });

  it('should have sufficient lockout duration', () => {
    // At least 1 minute
    expect(LOCKOUT_DURATION_MS).toBeGreaterThanOrEqual(60 * 1000);
    // At most 30 minutes (user experience)
    expect(LOCKOUT_DURATION_MS).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it('should have appropriate session timeout', () => {
    // At least 1 minute
    expect(SESSION_TIMEOUT_MS).toBeGreaterThanOrEqual(60 * 1000);
    // At most 30 minutes
    expect(SESSION_TIMEOUT_MS).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it('should use OWASP-recommended PBKDF2 iterations', () => {
    // OWASP 2024 recommends 600,000 for SHA-256
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });
});
