# Sultan Wallet - Audit Package

This directory contains all documentation required for a security audit.

## Contents

| Document | Description |
|----------|-------------|
| [SCOPE.md](./SCOPE.md) | Defines exactly what files are in-scope for audit |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Analysis of all dependencies and their security status |
| [THREAT_MODEL.md](./THREAT_MODEL.md) | Comprehensive threat model and risk assessment |
| [CHECKLIST.md](./CHECKLIST.md) | Audit checklist for auditors to complete |
| [npm-audit.json](./npm-audit.json) | Raw npm audit output |

## Quick Start for Auditors

### 1. Clone and Setup

```bash
git clone https://github.com/Wollnbergen/0xv7.git
cd 0xv7/wallet-extension
npm ci
```

### 2. Run Tests

```bash
npm test
```

### 3. Review Scope

Start with [SCOPE.md](./SCOPE.md) to understand:
- Which files to audit (1,623 LOC critical)
- Cryptographic algorithms used
- Security properties to verify

### 4. Use Checklist

Work through [CHECKLIST.md](./CHECKLIST.md) to systematically verify all security controls.

## Critical Files

Priority order for review:

1. **`src/core/wallet.ts`** - Key derivation, signing
2. **`src/core/security.ts`** - Memory protection, rate limiting
3. **`src/core/storage.secure.ts`** - Encryption, storage

## Key Findings to Look For

- [ ] Mnemonic handling (never plaintext in memory)
- [ ] Private key lifecycle (derive → use → wipe)
- [ ] AES-GCM usage (unique IV, proper auth)
- [ ] PBKDF2 iterations (≥600,000)
- [ ] Rate limiting implementation
- [ ] Session timeout enforcement

## Contact

**Security Issues**: security@sltn.io  
**Repository**: https://github.com/Wollnbergen/0xv7  
**Audit Target**: `wallet-extension/` directory  
