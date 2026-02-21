
# Sultan Wallet PWA - Audit Preparation Guide

**Document Version**: 1.0  
**Date**: December 2025  
**Target Audience**: Third-Party Security Auditors  

---

## Quick Start for Auditors

This guide helps you efficiently audit the Sultan Wallet PWA.

### 1. Environment Setup (5 minutes)

```bash
# Clone repository
git clone https://github.com/Wollnbergen/0xv7.git
cd 0xv7/wallet-extension

# Install dependencies (uses locked versions)
npm ci

# Run tests
npm test

# Start development server
npm run dev
```

### 2. Documentation Review (30 minutes)

Read in this order:

1. **README.md** - Project overview, quick start
2. **SECURITY.md** - Security architecture, threat model
3. **audit/SCOPE.md** - What to audit (1,623 critical LOC)
4. **audit/TECHNICAL_ARCHITECTURE.md** - Deep technical dive
5. **audit/DEPENDENCIES.md** - Third-party library analysis
6. **audit/THREAT_MODEL.md** - Comprehensive threat analysis

### 3. Code Review Priority (4-8 hours)

Review files in this order:

| Priority | File | LOC | Time | What to Check |
|----------|------|-----|------|---------------|
| 1 | `src/core/wallet.ts` | 544 | 2h | Key derivation, signing, no key caching |
| 2 | `src/core/security.ts` | 611 | 2h | Memory wipe, rate limiting, sessions |
| 3 | `src/core/storage.secure.ts` | 468 | 1.5h | AES-GCM usage, PBKDF2 iterations |
| 4 | `src/core/clipboard.ts` | 155 | 30m | Auto-clear implementation |
| 5 | `src/core/logger.ts` | 140 | 30m | Production filters |
| 6 | `src/core/csp.ts` | 192 | 30m | CSP directives |

### 4. Interactive Testing (2-4 hours)

```bash
# Start app
npm run dev

# Open browser to http://localhost:5000

# Test flows:
# 1. Create wallet → verify mnemonic shown once
# 2. Lock wallet → verify session timeout
# 3. Wrong PIN 5 times → verify lockout
# 4. Create transaction → verify PIN required
# 5. Check browser DevTools → verify no mnemonic in console
```

### 5. Use Checklist (1-2 hours)

Work through `audit/CHECKLIST.md` systematically:
- [ ] Key management (8 items)
- [ ] Encryption (7 items)
- [ ] Memory safety (6 items)
- [ ] Authentication (8 items)
- [ ] Session management (6 items)
- [ ] Input validation (6 items)
- [ ] Logging (5 items)
- [ ] Content security (5 items)

---

## Common Questions

### Q1: Where are private keys stored?

**A**: They are NOT stored. Private keys are derived on-demand from the encrypted mnemonic only when signing, then immediately wiped.

**Verification**:
```typescript
// src/core/wallet.ts:542
async signTransaction(txData, accountIndex) {
  const privateKey = await this.derivePrivateKeyForSigning(accountIndex);
  try {
    const signature = await ed25519.signAsync(msgBytes, privateKey);
    return bytesToHex(signature);
  } finally {
    secureWipe(privateKey);  // <-- ALWAYS wiped
  }
}
```

### Q2: How is the mnemonic protected in memory?

**A**: Stored as `SecureString` (XOR encrypted with random key).

**Verification**:
```typescript
// src/core/security.ts:80
class SecureString {
  private data: Uint8Array;  // XOR encrypted
  private key: Uint8Array;   // Random key
  
  constructor(value: string) {
    this.key = randomBytes(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
      this.data[i] = plaintext[i] ^ this.key[i];
    }
  }
}
```

### Q3: What if an attacker dumps IndexedDB?

**A**: They get AES-256-GCM encrypted blob. Without the PIN, it's protected by 600K PBKDF2 iterations.

**Brute-force estimate**:
- 6-digit PIN: 1 million combinations
- Time per attempt: ~2 seconds (PBKDF2)
- Total: ~23 days per PIN guess
- With GPU acceleration: Still weeks/months

### Q4: Can the server steal keys?

**A**: No. The server never sees keys or mnemonics. All signing is client-side.

**Network traffic**:
```typescript
// Only signed transactions are sent
POST /tx
{
  "tx": { /* public data */ },
  "signature": "a1b2c3...",
  "public_key": "d4e5f6..."  // Public key, not private
}
```

### Q5: What about XSS attacks?

**A**: Mitigated by strict CSP (no inline scripts, no eval).

**Verification**:
```typescript
// src/core/csp.ts:15
'script-src': ["'self'"],  // Only same-origin scripts
'frame-ancestors': ["'none'"],  // No iframe embedding
```

---

## Known Limitations

Document these in your audit report:

1. **JavaScript string immutability**: Strings cannot be wiped. We mitigate by using `Uint8Array` and `SecureString`.

2. **Browser memory management**: V8 may keep copies during GC. We mitigate with multi-pass wipe.

3. **No memory locking**: Browser cannot `mlock()`. Sensitive data may swap to disk.

4. **Single RPC endpoint**: No redundancy if `rpc.sltn.io` is down.

5. **Client-side entropy**: Relies on `crypto.getRandomValues()` (browser CSPRNG).

---

## Red Flags to Look For

### ❌ Bad Patterns (should NOT exist in code)

```typescript
// Storing private key in object
interface Account {
  privateKey: string;  // ❌ NEVER
}

// Logging sensitive data
console.log('Mnemonic:', mnemonic);  // ❌ NEVER

// Insecure random
Math.random();  // ❌ Use crypto.getRandomValues()

// Weak key derivation
pbkdf2(pin, salt, 1000);  // ❌ Too few iterations

// No rate limiting
async unlock(pin) {
  const mnemonic = await decrypt(pin);  // ❌ No lockout
}
```

### ✅ Good Patterns (should exist in code)

```typescript
// Private key derived on-demand
async signTransaction() {
  const key = await deriveKey();  // ✅ On-demand
  try {
    return await sign(key);
  } finally {
    secureWipe(key);  // ✅ Always wiped
  }
}

// Secure random
const salt = randomBytes(32);  // ✅ crypto.getRandomValues()

// Strong key derivation
pbkdf2(pin, salt, 600_000);  // ✅ OWASP 2024

// Rate limiting
if (isLockedOut()) {  // ✅ Check lockout
  throw new Error('Too many attempts');
}
```

---

## Testing Scenarios

### Scenario 1: Key Extraction Attempt

**Goal**: Verify private keys cannot be extracted via DevTools

**Steps**:
1. Create wallet
2. Open DevTools Console
3. Try: `window.wallet.privateKey`
4. Try: `localStorage.getItem('privateKey')`
5. Try: Search memory for mnemonic words

**Expected**: No access to private keys or mnemonic

### Scenario 2: Brute Force PIN

**Goal**: Verify rate limiting works

**Steps**:
1. Create wallet with PIN `123456`
2. Lock wallet
3. Enter wrong PIN 5 times
4. Observe lockout message
5. Wait 5 minutes
6. Verify unlock works

**Expected**: 5-minute lockout after 5 failures

### Scenario 3: Session Timeout

**Goal**: Verify auto-lock after inactivity

**Steps**:
1. Unlock wallet
2. Wait 5 minutes (no interaction)
3. Try to send transaction

**Expected**: Redirected to Unlock screen

### Scenario 4: Memory Forensics

**Goal**: Verify sensitive data is wiped

**Steps**:
1. Create wallet
2. Sign transaction
3. Take memory snapshot (DevTools Memory Profiler)
4. Search for mnemonic words

**Expected**: Mnemonic not found in plain text

---

## Performance Testing

### Load Testing

```bash
# Stress test key derivation
for i in {0..100}; do
  time npm run test -- wallet.test.ts -t "derives account"
done

# Expected: ~100ms per derivation
```

### Memory Leak Testing

```bash
# Run wallet creation 1000 times
# Monitor memory usage in DevTools

# Expected: Memory should stabilize (no leaks)
```

---

## Deliverables

### Audit Report Should Include

1. **Executive Summary**
   - Overall security posture
   - Critical findings
   - Risk rating

2. **Detailed Findings**
   - Vulnerability description
   - Severity (Critical/High/Medium/Low)
   - Proof of concept
   - Remediation recommendation

3. **Checklist Results**
   - Pass/fail for each item
   - Evidence (code snippets, screenshots)

4. **Recommendations**
   - Short-term fixes
   - Long-term improvements

5. **Test Results**
   - Scenarios tested
   - Results
   - Evidence

---

## Contact Information

**Security Issues**: security@sltn.io  
**Repository**: https://github.com/Wollnbergen/0xv7  
**Audit Scope**: `wallet-extension/` directory  

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | Sultan Core Team | Initial audit preparation guide |
