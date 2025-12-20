# Sultan Wallet Threat Model

**Document Version**: 1.0  
**Date**: December 2025  
**Classification**: Security-Sensitive  

---

## 1. System Overview

### 1.1 What is Sultan Wallet?

Sultan Wallet is a Progressive Web App (PWA) cryptocurrency wallet that:
- Generates and stores Ed25519 key pairs
- Signs transactions for the Sultan blockchain
- Runs entirely in the browser (no backend for key operations)
- Stores encrypted wallet data in IndexedDB

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Sultan Wallet PWA                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  UI Layer           │  Core Layer                       │   │
│  │  - React screens    │  - wallet.ts (key ops)            │   │
│  │  - User input       │  - security.ts (memory safety)    │   │
│  │  - Display data     │  - storage.secure.ts (encryption) │   │
│  └──────────┬──────────┴──────────────┬────────────────────┘   │
│             │                         │                         │
│  ┌──────────▼──────────┐   ┌──────────▼────────────────────┐   │
│  │   Web Crypto API    │   │        IndexedDB              │   │
│  │   (browser native)  │   │   (encrypted wallet data)     │   │
│  └─────────────────────┘   └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
                    ┌─────────────────────┐
                    │   Sultan RPC Node   │
                    │   (read-only ops)   │
                    └─────────────────────┘
```

---

## 2. Assets

### 2.1 Asset Classification

| Asset | Value | Confidentiality | Integrity | Availability |
|-------|-------|-----------------|-----------|--------------|
| **Mnemonic phrase** | User's entire wallet | CRITICAL | CRITICAL | HIGH |
| **Private keys** | Derived from mnemonic | CRITICAL | CRITICAL | HIGH |
| **PIN/Password** | Protects encrypted data | HIGH | HIGH | MEDIUM |
| **Encrypted wallet blob** | Protected mnemonic | MEDIUM | HIGH | HIGH |
| **Account addresses** | Public identifiers | LOW | MEDIUM | HIGH |
| **Transaction history** | Privacy-sensitive | MEDIUM | LOW | LOW |
| **Session state** | Temporary unlock | MEDIUM | MEDIUM | LOW |

### 2.2 Data Flow

```
User PIN ──► PBKDF2 (600K iterations) ──► Encryption Key
                                              │
                                              ▼
Mnemonic ──────────────────────────────► AES-256-GCM Encrypt
                                              │
                                              ▼
                                         IndexedDB
                                    (encrypted blob stored)
```

---

## 3. Threat Actors

### 3.1 Actor Profiles

| Actor | Capability | Motivation | Likelihood |
|-------|------------|------------|------------|
| **Script Kiddie** | Automated tools, known exploits | Opportunistic theft | HIGH |
| **Cybercriminal** | Custom exploits, phishing | Financial gain | HIGH |
| **Malware Author** | Keyloggers, clipboard hijackers | Mass theft | MEDIUM |
| **Insider Threat** | Code access, social engineering | Various | LOW |
| **Nation State** | Advanced persistent threats | Targeted surveillance | VERY LOW |

### 3.2 Actor Capabilities Matrix

| Capability | Script Kiddie | Cybercriminal | Malware | Nation State |
|------------|---------------|---------------|---------|--------------|
| Network interception | ✗ | ✓ | ✗ | ✓ |
| XSS exploitation | ✓ | ✓ | ✗ | ✓ |
| Phishing | ✓ | ✓ | ✗ | ✓ |
| Browser exploits | ✗ | △ | ✓ | ✓ |
| Physical access | ✗ | ✗ | ✗ | ✓ |
| Supply chain attack | ✗ | ✗ | ✗ | ✓ |

---

## 4. Threats and Mitigations

### 4.1 Network Attacks

#### T1: Man-in-the-Middle (MITM)

| Attribute | Value |
|-----------|-------|
| **Description** | Attacker intercepts RPC traffic |
| **Impact** | Can see addresses, balances, modify displayed data |
| **Cannot** | Steal keys (signing is local) |
| **Likelihood** | LOW (HTTPS required) |
| **Mitigation** | HTTPS-only, CSP, future: certificate pinning |

#### T2: DNS Hijacking

| Attribute | Value |
|-----------|-------|
| **Description** | Redirect to malicious wallet clone |
| **Impact** | Phishing for mnemonic |
| **Likelihood** | LOW |
| **Mitigation** | User education, DNSSEC (planned), origin verification |

### 4.2 Application Attacks

#### T3: Cross-Site Scripting (XSS)

| Attribute | Value |
|-----------|-------|
| **Description** | Inject malicious JavaScript |
| **Impact** | CRITICAL - Full wallet compromise |
| **Likelihood** | MEDIUM |
| **Mitigations** | |

**Implemented Controls:**
- [x] Strict Content Security Policy (no inline scripts)
- [x] React's automatic XSS protection
- [x] No `dangerouslySetInnerHTML` usage
- [x] Input sanitization on user input
- [x] No `eval()` or `Function()` constructor

#### T4: Supply Chain Attack

| Attribute | Value |
|-----------|-------|
| **Description** | Compromised npm package |
| **Impact** | CRITICAL - Backdoored crypto |
| **Likelihood** | LOW |
| **Mitigations** | |

**Implemented Controls:**
- [x] Minimal dependencies
- [x] Audited crypto libraries (Cure53)
- [x] Package-lock.json committed
- [x] npm audit in CI
- [ ] Subresource Integrity (planned)

### 4.3 Local Attacks

#### T5: Physical Device Access

| Attribute | Value |
|-----------|-------|
| **Description** | Attacker has unlocked device |
| **Impact** | HIGH - Can view if wallet unlocked |
| **Likelihood** | LOW |
| **Mitigations** | |

**Implemented Controls:**
- [x] PIN required to unlock
- [x] Auto-lock after 5 minutes inactivity
- [x] Rate limiting on PIN attempts
- [x] 5-minute lockout after 5 failures

#### T6: Memory Forensics

| Attribute | Value |
|-----------|-------|
| **Description** | Extract secrets from RAM dump |
| **Impact** | CRITICAL - Mnemonic recovery possible |
| **Likelihood** | VERY LOW |
| **Mitigations** | |

**Implemented Controls:**
- [x] SecureString XOR encryption in memory
- [x] secureWipe() zeros sensitive data
- [x] Private keys derived on-demand, wiped after use
- [x] Minimal time in memory

**Known Limitations:**
- JavaScript strings are immutable (cannot wipe)
- Browser may GC slowly
- Swap file may contain secrets

#### T7: Clipboard Hijacking

| Attribute | Value |
|-----------|-------|
| **Description** | Malware monitors clipboard for addresses/mnemonics |
| **Impact** | MEDIUM - Address replacement, mnemonic theft |
| **Likelihood** | MEDIUM |
| **Mitigations** | |

**Implemented Controls:**
- [x] Auto-clear clipboard (30s for mnemonics, 60s for addresses)
- [x] Warning before copying mnemonic
- [ ] Address verification prompt (planned)

### 4.4 User-Targeted Attacks

#### T8: Phishing

| Attribute | Value |
|-----------|-------|
| **Description** | Fake wallet site requests mnemonic |
| **Impact** | CRITICAL - Complete fund loss |
| **Likelihood** | HIGH |
| **Mitigations** | |

**Implemented Controls:**
- [x] Never request mnemonic after initial setup
- [x] Clear warnings about mnemonic sharing
- [ ] Domain verification UI (planned)

#### T9: Social Engineering

| Attribute | Value |
|-----------|-------|
| **Description** | Trick user into revealing secrets |
| **Impact** | CRITICAL |
| **Likelihood** | MEDIUM |
| **Mitigations** | Education, UI warnings |

---

## 5. Security Controls Summary

### 5.1 Defense in Depth

```
Layer 1: Network Security
├── HTTPS-only
├── Content Security Policy
└── Origin validation

Layer 2: Application Security
├── Input validation
├── XSS protection (React)
└── No dynamic code execution

Layer 3: Data Protection
├── AES-256-GCM encryption
├── PBKDF2 key derivation (600K iterations)
└── Unique salt and IV per wallet

Layer 4: Memory Protection
├── SecureString (XOR encryption)
├── Secure wipe
└── Minimal key exposure time

Layer 5: Access Control
├── PIN/password authentication
├── Rate limiting (5 attempts)
├── Lockout (5 minutes)
└── Session timeout (5 minutes)
```

### 5.2 Control Effectiveness

| Control | Effectiveness | Threats Mitigated |
|---------|---------------|-------------------|
| AES-256-GCM | HIGH | T5, T6 (at rest) |
| PBKDF2 600K | HIGH | Brute force |
| Rate limiting | HIGH | Online PIN guessing |
| Session timeout | MEDIUM | Unattended device |
| SecureString | MEDIUM | Basic memory inspection |
| CSP | HIGH | XSS |
| Auto-lock | MEDIUM | Physical access |

---

## 6. Risk Assessment

### 6.1 Risk Matrix

| Threat | Likelihood | Impact | Risk Level |
|--------|------------|--------|------------|
| XSS | MEDIUM | CRITICAL | **HIGH** |
| Phishing | HIGH | CRITICAL | **HIGH** |
| Supply chain | LOW | CRITICAL | **MEDIUM** |
| MITM | LOW | MEDIUM | **LOW** |
| Memory forensics | VERY LOW | CRITICAL | **LOW** |
| Physical access | LOW | HIGH | **MEDIUM** |
| Clipboard hijack | MEDIUM | MEDIUM | **MEDIUM** |

### 6.2 Residual Risks

After all mitigations, the following risks remain:

1. **Compromised browser/OS** - We cannot protect against a rooted device
2. **Zero-day browser exploits** - Beyond our control
3. **User negligence** - Sharing mnemonic, weak PIN
4. **Advanced persistent threats** - Nation-state level attacks

---

## 7. Security Assumptions

1. **Trusted browser**: Browser correctly implements Web Crypto, CSP, origin isolation
2. **Trusted device**: Device OS is not compromised with malware
3. **HTTPS integrity**: TLS certificates are valid and not intercepted
4. **User responsibility**: User protects mnemonic backup and PIN
5. **Library integrity**: @noble/@scure libraries are correctly implemented

---

## 8. Recommendations

### 8.1 Implemented ✅

- [x] AES-256-GCM encryption for storage
- [x] PBKDF2 with 600K iterations
- [x] Secure memory handling (SecureString)
- [x] Rate limiting and lockout
- [x] Session timeout
- [x] Content Security Policy
- [x] Production logging guards
- [x] Clipboard auto-clear
- [x] PIN verification for transactions

### 8.2 Planned 🔜

- [ ] Hardware wallet support (Ledger/Trezor)
- [ ] Biometric authentication (WebAuthn)
- [ ] Multi-signature support
- [ ] Certificate pinning
- [ ] Address book with verification
- [ ] Transaction simulation before signing

### 8.3 Out of Scope ❌

- TEE/Secure Enclave (requires native app)
- Memory locking (mlock unavailable in browser)
- Air-gapped signing (requires separate device)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial threat model |
