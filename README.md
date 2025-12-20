# Sultan Wallet

A secure, zero-fee blockchain wallet built as a Progressive Web App (PWA).

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB)

## Features

- 🔐 **Secure Key Management** - Ed25519 keys with BIP39 mnemonic
- 💰 **Zero Transaction Fees** - Send and receive without fees
- 📱 **PWA Support** - Install on mobile or desktop
- 🔒 **Encrypted Storage** - AES-256-GCM with PBKDF2 key derivation
- ⚡ **Offline Capable** - Transaction signing works offline
- 🗳️ **Governance** - Vote on proposals directly from wallet
- 💎 **Staking** - Stake SLTN and become a validator

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Architecture

```
src/
├── api/           # Network API client
├── components/    # Reusable UI components
├── core/          # Cryptographic core
│   ├── wallet.ts       # Key derivation, signing
│   ├── security.ts     # Memory wiping, rate limiting
│   ├── storage.secure.ts # Encrypted IndexedDB storage
│   └── csp.ts          # Content Security Policy
├── hooks/         # React hooks
└── screens/       # Application screens
```

## Security

See [SECURITY.md](./SECURITY.md) for:
- Threat model
- Cryptographic design
- Security features
- Vulnerability disclosure

### Key Security Features

| Feature | Implementation |
|---------|----------------|
| Key Derivation | SLIP-0010 Ed25519 |
| Encryption | AES-256-GCM |
| Key Stretching | PBKDF2 (600K iterations) |
| Memory Protection | Secure wipe, XOR encryption |
| Rate Limiting | 5 attempts, 5 min lockout |
| Session Timeout | 5 minutes inactivity |

## Cryptographic Libraries

All crypto libraries are independently audited:

- [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) - Ed25519 signatures
- [@noble/hashes](https://github.com/paulmillr/noble-hashes) - SHA-256, SHA-512, PBKDF2
- [@scure/bip39](https://github.com/paulmillr/scure-bip39) - BIP39 mnemonic generation
- [bech32](https://github.com/bitcoinjs/bech32) - Address encoding

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Testing
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode

# Build
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing

Tests are located in `src/core/__tests__/`:

- `wallet.test.ts` - Key derivation, signing, address validation
- `security.test.ts` - Memory wiping, rate limiting, sessions
- `storage.secure.test.ts` - Encryption, IndexedDB operations

Run with:
```bash
npm test
```

## Configuration

### Chain Configuration

| Parameter | Value |
|-----------|-------|
| Prefix | `sultan` |
| Coin Type | `1984` |
| Decimals | `9` |
| Derivation Path | `m/44'/1984'/0'/0'/{index}` |

### RPC Endpoints

Configure in `vite.config.ts`:

```typescript
// Production
'https://rpc.sltn.io'
'https://api.sltn.io'
```

## PWA Installation

The wallet can be installed as a PWA:

1. Visit the wallet URL in Chrome/Edge/Safari
2. Click "Install" in the address bar or browser menu
3. The wallet will be installed as a standalone app

### Offline Support

- Transaction signing works offline
- Balances cached for offline viewing
- Transactions queued when offline

## API Reference

### SultanWallet

```typescript
// Generate new wallet
const mnemonic = SultanWallet.generateMnemonic();

// Create from mnemonic
const wallet = await SultanWallet.fromMnemonic(mnemonic);

// Derive accounts
const account = await wallet.deriveAccount(0);
console.log(account.address); // sultan1...

// Sign transaction
const signed = await wallet.signTransaction(tx, 0);
```

### Secure Storage

```typescript
// Save wallet (encrypts with PIN)
await saveWallet(mnemonic, pin);

// Unlock wallet
const mnemonic = await unlockWallet(pin);

// Lock wallet
lockWallet();

// Check status
const hasWallet = await hasWallet();
const isLocked = isWalletLocked();
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Disclaimer

This wallet is provided "as is" without warranty. Users are responsible for:
- Securely backing up their mnemonic phrase
- Keeping their PIN confidential
- Verifying transaction details before signing

**Never share your mnemonic phrase with anyone.**
