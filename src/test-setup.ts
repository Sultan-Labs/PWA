/**
 * Test setup for Sultan Wallet
 * Configures jsdom environment and mocks for browser APIs
 */

import '@testing-library/jest-dom';

// Mock IndexedDB is more complex - tests that need it will skip gracefully
if (typeof globalThis.indexedDB === 'undefined') {
  console.warn('IndexedDB not available in test environment - related tests will be skipped');
}

// Ensure crypto.subtle is available (jsdom should provide this)
if (typeof globalThis.crypto?.subtle === 'undefined') {
  console.warn('Web Crypto API not available - crypto tests will be skipped');
}
