# Security Audit Checklist

**Project**: Sultan Wallet  
**Version**: 1.0  
**Date**: December 2025  

Use this checklist during security audit to verify all security controls.

---

## 1. Key Management

### 1.1 Mnemonic Handling

- [ ] **M1**: Mnemonic generated with 256-bit entropy (24 words)
  - File: `wallet.ts:generateMnemonic()`
  - Verify: Uses `@scure/bip39` with proper entropy

- [ ] **M2**: Mnemonic validated using BIP39 checksum
  - File: `wallet.ts:validateMnemonic()`
  - Verify: Rejects invalid word combinations

- [ ] **M3**: Mnemonic stored using SecureString (XOR encrypted)
  - File: `wallet.ts` - `secureMnemonic` field
  - Verify: Never stored as plain string after creation

- [ ] **M4**: Mnemonic access via callback pattern only
  - File: `wallet.ts:withMnemonic()`
  - Verify: No `getMnemonic()` returning raw string

### 1.2 Private Key Handling

- [ ] **K1**: Private keys derived on-demand
  - File: `wallet.ts:derivePrivateKeyForSigning()`
  - Verify: Keys not cached in account objects

- [ ] **K2**: Private keys wiped after signing
  - File: `wallet.ts:signTransaction()`, `signMessage()`
  - Verify: `finally` block calls `secureWipe()`

- [ ] **K3**: Account objects do NOT contain privateKey
  - File: `wallet.ts` - `SultanAccount` interface
  - Verify: Only address, publicKey, index, path exposed

- [ ] **K4**: Correct SLIP-0010 derivation path
  - Expected: `m/44'/1984'/0'/0'/{index}`
  - Verify: All path components are hardened

---

## 2. Encryption

### 2.1 Storage Encryption

- [ ] **E1**: AES-256-GCM used for wallet encryption
  - File: `storage.secure.ts`
  - Verify: `crypto.subtle.encrypt({ name: 'AES-GCM', ... })`

- [ ] **E2**: Unique IV generated per encryption
  - File: `storage.secure.ts`
  - Verify: 12-byte IV from `crypto.getRandomValues()`

- [ ] **E3**: IV stored alongside ciphertext
  - Verify: Format includes `{ iv, salt, ciphertext, version }`

- [ ] **E4**: Authentication tag verified on decrypt
  - Verify: GCM mode provides implicit authentication

### 2.2 Key Derivation

- [ ] **D1**: PBKDF2 iterations ≥ 600,000
  - File: `security.ts` or `storage.secure.ts`
  - Verify: `PBKDF2_ITERATIONS` constant value

- [ ] **D2**: Unique salt per wallet
  - Verify: 32-byte salt from `crypto.getRandomValues()`

- [ ] **D3**: Derived key used only for encryption
  - Verify: Key not stored, re-derived on each unlock

---

## 3. Memory Safety

### 3.1 Secure Wipe

- [ ] **W1**: secureWipe() overwrites with random then zeros
  - File: `security.ts:secureWipe()`
  - Verify: Multi-pass overwrite

- [ ] **W2**: secureWipe() called on sensitive Uint8Arrays
  - Verify: Called in `finally` blocks after signing

- [ ] **W3**: SecureString.destroy() wipes internal data
  - File: `security.ts:SecureString.destroy()`
  - Verify: Internal buffers zeroed

### 3.2 SecureString

- [ ] **S1**: SecureString uses XOR encryption
  - File: `security.ts:SecureString`
  - Verify: Random key XORed with plaintext

- [ ] **S2**: XOR key regenerated on each store
  - Verify: New random key per SecureString instance

- [ ] **S3**: getValue() returns decrypted copy
  - Verify: Caller responsible for wiping returned value

---

## 4. Authentication

### 4.1 PIN/Password

- [ ] **P1**: PIN minimum length enforced (≥6)
  - File: `security.ts:MIN_PIN_LENGTH`
  - Verify: UI and validation enforce minimum

- [ ] **P2**: PIN never stored (only derived key)
  - Verify: No plaintext PIN in storage

- [ ] **P3**: PIN verification uses constant-time comparison
  - File: `security.ts:constantTimeEqual()` or `verifySessionPin()`
  - Verify: No early exit on mismatch

### 4.2 Rate Limiting

- [ ] **R1**: Failed attempts tracked
  - File: `security.ts:recordFailedAttempt()`
  - Verify: Counter increments correctly

- [ ] **R2**: Lockout after 5 failures
  - File: `security.ts:MAX_PIN_ATTEMPTS`
  - Verify: `isLockedOut()` returns true after 5

- [ ] **R3**: Lockout duration is 5 minutes
  - File: `security.ts:LOCKOUT_DURATION_MS`
  - Verify: 300,000 ms

- [ ] **R4**: Lockout persists across sessions
  - Verify: State stored in localStorage

- [ ] **R5**: Counter resets on successful auth
  - File: `security.ts:clearFailedAttempts()`
  - Verify: Called on successful unlock

### 4.3 Transaction Authorization

- [ ] **T1**: PIN required before signing
  - File: `Send.tsx` - PIN step
  - Verify: `verifySessionPin()` called before `signTransaction()`

- [ ] **T2**: Transaction details shown before PIN entry
  - Verify: Amount, recipient visible during PIN step

---

## 5. Session Management

### 5.1 Session Lifecycle

- [ ] **L1**: Session starts on successful unlock
  - File: `security.ts:startSession()`
  - Verify: Called after PIN verification

- [ ] **L2**: Session timeout after 5 minutes inactivity
  - File: `security.ts:SESSION_TIMEOUT_MS`
  - Verify: 300,000 ms

- [ ] **L3**: Activity extends session
  - File: `security.ts:recordActivity()`
  - Verify: Timer reset on user interaction

- [ ] **L4**: Session cleared on lock
  - File: `security.ts:endSession()`
  - Verify: Session PIN hash cleared, mnemonic destroyed

### 5.2 Session State

- [ ] **SS1**: Session PIN hash stored securely
  - File: `security.ts:setSessionPinHash()`
  - Verify: Used for transaction authorization

- [ ] **SS2**: Session state not persisted to storage
  - Verify: Memory-only, lost on page reload

---

## 6. Input Validation

### 6.1 Address Validation

- [ ] **A1**: Bech32 checksum verified
  - File: `wallet.ts:isValidAddress()`
  - Verify: Invalid checksum rejected

- [ ] **A2**: Correct prefix enforced ("sultan")
  - Verify: Other prefixes rejected

- [ ] **A3**: Malformed addresses rejected
  - Verify: Empty string, wrong format handled

### 6.2 Amount Validation

- [ ] **AM1**: Negative amounts rejected
  - Verify: UI and core validation

- [ ] **AM2**: Precision limited to 9 decimals
  - File: `wallet.ts:parseSLTN()`
  - Verify: Excess precision truncated

- [ ] **AM3**: Overflow prevented
  - Verify: BigInt used for amounts

---

## 7. Logging & Information Disclosure

### 7.1 Production Logging

- [ ] **LOG1**: No console.log in production
  - File: `logger.ts`
  - Verify: Debug/info only in dev mode

- [ ] **LOG2**: Sensitive patterns filtered
  - Verify: mnemonic, private, key, seed, password, pin blocked

- [ ] **LOG3**: Error logs sanitized
  - Verify: Sensitive data redacted before logging

### 7.2 Error Handling

- [ ] **ERR1**: Crypto errors don't leak sensitive data
  - Verify: Generic error messages to user

- [ ] **ERR2**: Stack traces not exposed in production
  - Verify: Error boundaries catch and sanitize

---

## 8. Content Security

### 8.1 CSP

- [ ] **CSP1**: No 'unsafe-inline' for scripts
  - File: `csp.ts` or meta tag
  - Verify: `script-src 'self'`

- [ ] **CSP2**: No 'unsafe-eval'
  - Verify: No eval(), Function constructor

- [ ] **CSP3**: frame-ancestors 'none'
  - Verify: Prevents clickjacking

### 8.2 XSS Prevention

- [ ] **XSS1**: No dangerouslySetInnerHTML
  - Verify: Grep codebase

- [ ] **XSS2**: User input sanitized before display
  - Verify: React auto-escaping used

---

## 9. Clipboard Security

- [ ] **C1**: Mnemonic cleared from clipboard in 30s
  - File: `clipboard.ts:copyMnemonic()`
  - Verify: `SENSITIVE_CLEAR_TIMEOUT_MS`

- [ ] **C2**: Addresses cleared from clipboard in 60s
  - File: `clipboard.ts:copyAddress()`
  - Verify: `DEFAULT_CLEAR_TIMEOUT_MS`

- [ ] **C3**: Clipboard cleared on wallet lock
  - Verify: Optional, nice-to-have

---

## 10. Signature Verification

### 10.1 Ed25519

- [ ] **SIG1**: Signatures are 64 bytes (128 hex chars)
  - Verify: `signTransaction()` output format

- [ ] **SIG2**: Deterministic signatures for same input
  - Verify: Ed25519 is deterministic

- [ ] **SIG3**: Different signatures for different inputs
  - Verify: Nonce changes produce different sigs

---

## Audit Sign-Off

| Section | Auditor | Date | Pass/Fail |
|---------|---------|------|-----------|
| 1. Key Management | | | |
| 2. Encryption | | | |
| 3. Memory Safety | | | |
| 4. Authentication | | | |
| 5. Session Management | | | |
| 6. Input Validation | | | |
| 7. Logging | | | |
| 8. Content Security | | | |
| 9. Clipboard | | | |
| 10. Signatures | | | |

**Overall Result**: ____________

**Auditor Signature**: ____________

**Date**: ____________
