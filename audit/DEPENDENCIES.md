# Sultan Wallet Dependency Security Analysis

**Document Version**: 1.0  
**Date**: December 2025  
**Last Audit**: `npm audit` run on December 20, 2025  

---

## Production Dependencies

These dependencies are bundled into the production wallet:

### Cryptographic Libraries (CRITICAL)

| Package | Version | Audit Status | Notes |
|---------|---------|--------------|-------|
| `@noble/ed25519` | 2.2.3 | ✅ **Cure53 Audited** | Ed25519 signatures. [Audit Report](https://github.com/paulmillr/noble-curves#security) |
| `@noble/hashes` | 1.7.1 | ✅ **Cure53 Audited** | SHA-256, SHA-512, PBKDF2. [Audit Report](https://github.com/paulmillr/noble-hashes#security) |
| `@scure/bip39` | 1.5.4 | ✅ **Cure53 Audited** | BIP39 mnemonic generation. [Audit Report](https://github.com/paulmillr/scure-bip39#security) |
| `bech32` | 2.0.0 | ✅ **Widely Used** | Address encoding. Used by Bitcoin, Cosmos ecosystems |

**All cryptographic libraries are from Paul Miller's audited noble/scure family.**

### UI Framework

| Package | Version | Audit Status | Notes |
|---------|---------|--------------|-------|
| `react` | 18.3.1 | ✅ **Meta Maintained** | Facebook/Meta security team maintains |
| `react-dom` | 18.3.1 | ✅ **Meta Maintained** | DOM rendering |
| `react-router-dom` | 7.1.0 | ✅ **Widely Used** | Client-side routing |

### Utility Libraries

| Package | Version | Audit Status | Notes |
|---------|---------|--------------|-------|
| `@tanstack/react-query` | 5.62.16 | ✅ **Widely Used** | Data fetching, no security concerns |
| `qrcode` | 1.5.4 | ⚠️ **Review** | QR code generation, minimal attack surface |

---

## Development Dependencies

These are NOT included in production builds:

| Package | Version | Purpose | Production Impact |
|---------|---------|---------|-------------------|
| `vite` | 6.0.5 | Build tool | None (dev only) |
| `typescript` | 5.6.2 | Type checking | None (dev only) |
| `vitest` | 2.1.8 | Test runner | None (dev only) |
| `jsdom` | 27.3.0 | Test environment | None (dev only) |
| `@vitejs/plugin-react` | 4.3.4 | React HMR | None (dev only) |
| `vite-plugin-pwa` | 0.21.1 | PWA generation | Build-time only |
| `workbox-window` | 7.3.0 | Service worker | Runtime SW only |
| `@vitest/coverage-v8` | 2.1.9 | Code coverage | None (dev only) |

---

## npm audit Results

### Summary

| Severity | Count | In Production? |
|----------|-------|----------------|
| Critical | 0 | - |
| High | 0 | - |
| Moderate | 5 | ❌ No (dev deps only) |
| Low | 0 | - |

### Moderate Vulnerabilities (Development Only)

All moderate vulnerabilities are in **development dependencies** and do **NOT** affect production builds:

1. **esbuild** (via vitest) - GHSA-67mh-4wv8-2f99
   - Issue: Dev server CORS bypass
   - Impact: None - dev dependency only
   - Fix: Upgrade vitest to 4.x (breaking change, defer)

2. **vite** (via vitest) - Transitive from esbuild
   - Impact: None - dev dependency only

### Production Dependencies: CLEAN ✅

```
0 vulnerabilities in production dependencies
```

---

## Supply Chain Security

### Verification Steps

```bash
# Verify package integrity
npm ci --ignore-scripts
npm audit signatures

# Check for known vulnerabilities
npm audit --production

# Verify lockfile integrity
npm ci
```

### Lockfile Policy

- `package-lock.json` is committed to repository
- Exact versions pinned for reproducible builds
- CI/CD uses `npm ci` (not `npm install`)

---

## Web Crypto API Usage

The wallet uses the browser's native Web Crypto API for:

| Operation | API Used | Implementation |
|-----------|----------|----------------|
| AES-GCM Encryption | `crypto.subtle.encrypt()` | Native browser |
| AES-GCM Decryption | `crypto.subtle.decrypt()` | Native browser |
| PBKDF2 Key Derivation | `crypto.subtle.deriveBits()` | Native browser |
| Random Generation | `crypto.getRandomValues()` | Native browser |

**No JavaScript-only crypto for symmetric encryption** - all handled by audited browser implementations.

---

## Dependency Update Policy

| Category | Policy |
|----------|--------|
| Crypto libraries | Update within 48 hours of security release |
| React/UI | Monthly updates, test thoroughly |
| Dev dependencies | Quarterly, unless security issue |
| Breaking changes | Evaluate risk/benefit, schedule for next major |

---

## License Compliance

All dependencies use permissive licenses compatible with MIT:

| License | Packages |
|---------|----------|
| MIT | react, react-dom, react-router-dom, @noble/*, @scure/*, bech32, qrcode, vite, vitest |
| ISC | - |
| Apache-2.0 | - |

No GPL or copyleft licenses in production dependencies.

---

## Recommendations for Auditors

1. **Focus on first-party code** - All crypto libraries are Cure53 audited
2. **Verify Web Crypto usage** - Check `storage.secure.ts` for correct API usage
3. **Review key handling** - Focus on `wallet.ts` key derivation and wiping
4. **Check for sensitive data leaks** - Verify `logger.ts` filters work correctly

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial dependency analysis |
