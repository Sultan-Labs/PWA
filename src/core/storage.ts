/**
 * Secure Storage for Sultan Wallet
 * 
 * Uses IndexedDB with AES-GCM encryption for persistent storage.
 * All sensitive data is encrypted with a user-provided PIN/password.
 */

import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

const DB_NAME = 'sultan-wallet';
const DB_VERSION = 1;
const STORE_NAME = 'wallet';

interface StoredWallet {
  encryptedMnemonic: string;
  accounts: string[]; // Encrypted account addresses for quick lookup
  createdAt: number;
  version: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Derive encryption key from PIN using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-GCM
 */
async function encrypt(data: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  
  const key = await deriveKey(pin, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Combine: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data with AES-GCM
 */
async function decrypt(encryptedData: string, pin: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(pin, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Save encrypted wallet to storage
 */
export async function saveWallet(mnemonic: string, pin: string): Promise<void> {
  const database = await initDB();
  const encryptedMnemonic = await encrypt(mnemonic, pin);
  
  const wallet: StoredWallet = {
    encryptedMnemonic,
    accounts: [],
    createdAt: Date.now(),
    version: 1,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(wallet, 'wallet');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load and decrypt wallet from storage
 */
export async function loadWallet(pin: string): Promise<string> {
  const database = await initDB();

  const wallet = await new Promise<StoredWallet | undefined>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('wallet');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  if (!wallet) {
    throw new Error('No wallet found');
  }

  try {
    return await decrypt(wallet.encryptedMnemonic, pin);
  } catch {
    throw new Error('Invalid PIN');
  }
}

/**
 * Check if a wallet exists
 */
export async function hasWallet(): Promise<boolean> {
  try {
    const database = await initDB();
    
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('wallet');

      request.onerror = () => resolve(false);
      request.onsuccess = () => resolve(!!request.result);
    });
  } catch {
    return false;
  }
}

/**
 * Delete wallet from storage
 */
export async function deleteWallet(): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete('wallet');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Hash PIN for session storage (never store plain PIN)
 */
export function hashPin(pin: string): string {
  const encoder = new TextEncoder();
  const hash = sha256(encoder.encode(pin));
  return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Session storage for unlocked state (in-memory only)
 */
let sessionPin: string | null = null;

export function setSessionPin(pin: string): void {
  sessionPin = pin;
}

export function getSessionPin(): string | null {
  return sessionPin;
}

export function clearSession(): void {
  sessionPin = null;
}

/**
 * Get decrypted mnemonic using PIN
 * Wrapper for loadWallet for semantic clarity
 */
export async function getMnemonic(pin: string): Promise<string | null> {
  try {
    return await loadWallet(pin);
  } catch {
    return null;
  }
}

/**
 * Export as object for easier imports
 */
export const walletStorage = {
  saveWallet,
  loadWallet,
  hasWallet,
  deleteWallet,
  getMnemonic,
  setSessionPin,
  getSessionPin,
  clearSession,
};
