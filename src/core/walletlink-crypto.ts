/**
 * Sultan WalletLink Cryptography Module
 * 
 * Provides AES-256-GCM encryption for secure communication between
 * wallet and dApp via the relay server. The relay server never sees
 * plaintext messages.
 * 
 * Security properties:
 * - AES-256-GCM: Authenticated encryption with associated data
 * - Random IV: Unique 12-byte IV for each message (NIST recommended)
 * - Key derivation: HKDF for deriving encryption key from session key
 * - Message authentication: GCM tag prevents tampering
 */

// Constants
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // 128-bit authentication tag

/**
 * Derive an AES-256 key from the session key using HKDF
 */
export async function deriveEncryptionKey(
  sessionKey: Uint8Array,
  info: string = 'walletlink-v1'
): Promise<CryptoKey> {
  // Import session key as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sessionKey,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using HKDF
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('sultan-walletlink'),
      info: new TextEncoder().encode(info),
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a message using AES-256-GCM
 * 
 * Output format: base64(IV || ciphertext || tag)
 * - IV: 12 bytes
 * - Ciphertext: variable length
 * - Tag: 16 bytes (appended by GCM)
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encode plaintext
  const plaintextBytes = new TextEncoder().encode(plaintext);
  
  // Encrypt with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    plaintextBytes
  );

  // Combine IV + ciphertext (tag is appended by GCM)
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  // Encode as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a message using AES-256-GCM
 * 
 * Input format: base64(IV || ciphertext || tag)
 */
export async function decryptMessage(
  encryptedBase64: string,
  key: CryptoKey
): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // Validate minimum length (IV + at least 1 byte + tag)
  if (combined.length < IV_LENGTH + 1 + (TAG_LENGTH / 8)) {
    throw new Error('Invalid encrypted message: too short');
  }

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt with AES-GCM (automatically verifies tag)
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintextBuffer);
}

/**
 * Generate a cryptographically secure session key
 */
export function generateSessionKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32)); // 256 bits
}

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode a session key to base64 for QR code
 */
export function encodeSessionKey(key: Uint8Array): string {
  return btoa(String.fromCharCode(...key));
}

/**
 * Decode a session key from base64
 */
export function decodeSessionKey(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function secureCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Secure random bytes as hex string
 */
export function randomHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash data with SHA-256
 */
export async function sha256(data: string | Uint8Array): Promise<Uint8Array> {
  const bytes = typeof data === 'string' 
    ? new TextEncoder().encode(data) 
    : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hash);
}

/**
 * Create a message authentication code for integrity verification
 */
export async function hmacSign(
  message: string,
  key: Uint8Array
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify a message authentication code
 */
export async function hmacVerify(
  message: string,
  signature: string,
  key: Uint8Array
): Promise<boolean> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

  return crypto.subtle.verify(
    'HMAC',
    cryptoKey,
    signatureBytes,
    new TextEncoder().encode(message)
  );
}
