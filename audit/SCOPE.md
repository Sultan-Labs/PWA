# Sultan Wallet Security Audit Scope

**Document Version**: 1.0  
**Date**: December 2025  
**Repository**: https://github.com/Wollnbergen/0xv7  
**Audit Target**: `wallet-extension/` directory  

---

## Executive Summary

Sultan Wallet is a Progressive Web App (PWA) cryptocurrency wallet for the Sultan blockchain network. This document defines the scope for security auditing.

### Key Statistics

| Metric | Value |
|--------|-------|
| Total LOC (core) | ~2,772 |
| Total LOC (with tests) | ~3,656 |
| Primary Language | TypeScript 5.6 |
| Framework | React 18.3, Vite 6 |
| Crypto Libraries | @noble/ed25519, @noble/hashes, @scure/bip39 |

---

## In-Scope Components

### 1. Cryptographic Core (CRITICAL)

These files contain all cryptographic operations and MUST be audited:

| File | LOC | Description | Priority |
|------|-----|-------------|----------|
| `src/core/wallet.ts` | 544 | Key derivation, Ed25519 signing, address encoding | **CRITICAL** |
| `src/core/security.ts` | 611 | SecureString, memory wiping, rate limiting, sessions | **CRITICAL** |
| `src/core/storage.secure.ts` | 468 | AES-256-GCM encryption, PBKDF2, IndexedDB storage | **CRITICAL** |

**Total Critical LOC**: 1,623

### 2. Security Utilities (HIGH)

| File | LOC | Description | Priority |
|------|-----|-------------|----------|
| `src/core/clipboard.ts` | 155 | Secure clipboard with auto-clear | HIGH |
| `src/core/logger.ts` | 140 | Production logging guards, sensitive data filtering | HIGH |
| `src/core/csp.ts` | 192 | Content Security Policy enforcement | HIGH |
| `src/core/totp.ts` | 404 | Time-based OTP (if 2FA enabled) | HIGH |

**Total High Priority LOC**: 891

### 3. Legacy/Deprecated (LOW)

| File | LOC | Description | Priority |
|------|-----|-------------|----------|
| `src/core/storage.ts` | 258 | Old storage (being phased out) | LOW |

---

## Out of Scope

The following are explicitly **NOT** in audit scope:

| Category | Reason |
|----------|--------|
| `src/screens/*.tsx` | UI presentation only, no crypto operations |
| `src/components/*.tsx` | Reusable UI components |
| `src/api/*.ts` | Network API client (reviewed separately) |
| `src/hooks/*.tsx` | React state management (except security-related) |
| `*.css`, `*.html` | Styling, no security impact |
| `src/core/__tests__/*.ts` | Test files (for reference only) |
| `node_modules/` | Third-party dependencies (see DEPENDENCIES.md) |
| Build configuration | `vite.config.ts`, `tsconfig.json` |

### Conditional Scope

| Component | Condition |
|-----------|-----------|
| `src/hooks/useWallet.tsx` | Include if auditor wants session management context |
| `src/screens/Send.tsx` | Include PIN verification flow review |

---

## Cryptographic Algorithms

### Key Derivation
- **BIP39**: 24-word mnemonic (256-bit entropy)
- **SLIP-0010**: Ed25519 key derivation from seed
- **Path**: `m/44'/1984'/0'/0'/{index}` (hardened)

### Encryption at Rest
- **Algorithm**: AES-256-GCM
- **IV**: 12 bytes, cryptographically random
- **Key Derivation**: PBKDF2-HMAC-SHA256
- **Iterations**: 600,000 (OWASP 2024 recommendation)
- **Salt**: 32 bytes, cryptographically random

### Signatures
- **Algorithm**: Ed25519 (RFC 8032)
- **Library**: @noble/ed25519 v2.2.3 (Cure53 audited)

### Address Encoding
- **Format**: Bech32
- **Prefix**: `sultan`
- **Data**: SHA-256 of public key, first 20 bytes

---

## Security Properties to Verify

### 1. Key Management
- [ ] Mnemonic never stored in plaintext
- [ ] Private keys derived on-demand, never cached
- [ ] Private keys wiped after signing operations
- [ ] SecureString XOR encryption provides memory protection

### 2. Encryption
- [ ] AES-GCM used correctly (unique IV per encryption)
- [ ] PBKDF2 iterations meet OWASP standards (≥600,000)
- [ ] Encryption key never persisted
- [ ] Authenticated encryption prevents tampering

### 3. Rate Limiting
- [ ] Failed PIN attempts tracked correctly
- [ ] Lockout enforced after 5 failures
- [ ] Lockout persists across browser sessions
- [ ] No timing attacks on PIN verification

### 4. Session Management
- [ ] Session timeout enforced (5 minutes)
- [ ] Activity tracking extends session correctly
- [ ] Session cleared on lock
- [ ] No session fixation vulnerabilities

### 5. Memory Safety
- [ ] `secureWipe()` zeroes sensitive data
- [ ] No sensitive data in console logs (production)
- [ ] Clipboard auto-cleared for sensitive data

### 6. Input Validation
- [ ] Address validation (bech32 checksum)
- [ ] Amount validation (no negative, precision limits)
- [ ] Mnemonic validation (BIP39 wordlist + checksum)

---

## Threat Model Reference

See `SECURITY.md` in the wallet-extension root for:
- Full threat model
- Security assumptions
- Known limitations
- Attack surface analysis

---

## Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `wallet.test.ts` | 20+ | Key derivation, signing, address validation |
| `security.test.ts` | 25+ | Memory wiping, rate limiting, sessions |
| `storage.secure.test.ts` | 10+ | Encryption, decryption, storage ops |

**Run tests**: `npm test`  
**Current status**: 73 pass, 6 skipped (IndexedDB unavailable in Node)

---

## Commit for Audit

**Branch**: `feat/become-validator`  
**Commit**: _(to be filled before audit)_  

```bash
# Get exact commit hash
git rev-parse HEAD
```

---

## Contact

**Security Contact**: security@sltn.io  
**Repository Owner**: Wollnbergen  

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial audit scope document |
