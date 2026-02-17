# Sultan Wallet

## Overview

Sultan Wallet is a non-custodial cryptocurrency wallet for the Sultan L1 blockchain, built as both a Progressive Web App (PWA) and a Chrome/Firefox browser extension. It provides zero-fee transactions, staking, governance voting, NFT management, and dApp integration via `window.sultan`. The wallet handles all cryptographic operations client-side — private keys never leave the user's device.

The project lives in a single codebase that produces two build targets:
- **PWA** — deployed to `wallet.sltn.io`, full responsive layout
- **Browser Extension** — Chrome MV3 and Firefox MV2, popup-sized (380×600px)

Core crypto/security code (`src/core/`) is shared identically between both targets. Extension-specific files (background service worker, content script, inpage provider) live in `extension/`.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React 18 + TypeScript + Vite)

- **Framework**: React 18 with TypeScript 5.6, bundled by Vite 6
- **Routing**: React Router (wouter also listed as a dependency but react-router-dom is primary)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin, with CSS custom properties in `src/index.css` for the design system (dark theme, cyan brand colors, glassmorphism). Shadcn/ui components configured in `components.json` with New York style.
- **State Management**: React hooks + `@tanstack/react-query` for server state. Wallet state managed via `useWallet` hook with context provider.
- **PWA**: Configured via `vite-plugin-pwa` with service worker auto-update, offline capability, and web app manifest.

### Core Security Layer (`src/core/`)

This is the most critical part of the codebase. All cryptographic and security operations are here:

| File | Purpose |
|------|---------|
| `wallet.ts` | BIP39 mnemonic generation (24 words), SLIP-0010 Ed25519 key derivation (`m/44'/1984'/0'/0'/{index}`), transaction signing, bech32 `sultan1` address encoding |
| `security.ts` | SecureString (XOR-encrypted in-memory storage), memory wiping (`secureWipe`), PIN verification with SHA-256, rate limiting (5 failed attempts → 5 min lockout), session timeout (15 min inactivity) |
| `storage.secure.ts` | AES-256-GCM encryption of wallet data, PBKDF2 key derivation (600K iterations), IndexedDB storage backend |
| `csp.ts` | Content Security Policy enforcement |
| `totp.ts` | Optional TOTP-based 2FA (RFC 6238) |
| `clipboard.ts` | Secure clipboard with auto-clear |
| `logger.ts` | Production logging guards, sensitive data filtering |
| `extension-bridge.ts` | Chrome message passing for extension context |
| `wallet-link.ts` | WalletConnect-style protocol for mobile-to-desktop dApp connections via QR code |

### Cryptographic Libraries

All crypto comes from Paul Miller's audited noble/scure family:
- `@noble/ed25519` — Ed25519 signatures (RFC 8032)
- `@noble/hashes` — SHA-256, SHA-512, PBKDF2
- `@scure/bip39` — BIP39 mnemonic generation/validation
- `bech32` — Address encoding (`sultan1` prefix)

### API Layer (`src/api/sultanAPI.ts`)

REST/RPC client connecting to Sultan L1 blockchain nodes. The production RPC endpoint is at `https://rpc.sltn.io` (proxied to `206.189.224.142`). Handles balance queries, transaction broadcasting, staking info, validator lists, and governance proposals. Uses Zod for response validation and retry logic.

### Screen Components (`src/screens/`)

- Welcome, CreateWallet, ImportWallet — Onboarding flow
- Unlock — PIN entry with lockout protection
- Dashboard — Main wallet view with balance, recent activity
- Send, Receive — Transfer screens (sultan1 addresses only, 9 decimals)
- Stake, BecomeValidator — Staking (13.33% APY, 10K SLTN min for validators)
- Governance — Vote on proposals (1K SLTN deposit to create)
- NFTs — NFT gallery
- Activity — Transaction history
- Settings — Wallet management
- ApprovalScreen, ConnectedAppsScreen — Extension dApp management
- WalletLinkScreen, DeepLinkConnect — QR-based mobile-desktop pairing

### Browser Extension Architecture (`extension/`)

Three plain JS files (not bundled through React):
- `background.js` — MV3 service worker handling message routing, connection state, RPC proxying, cross-browser compatible (Chrome MV3 / Firefox MV2)
- `content-script.js` — Bridge between web pages and background, with rate limiting (100 req/min) and method whitelisting
- `inpage-provider.js` — Injects `window.sultan` API into web pages, frozen to prevent tampering

### WalletLink Relay Server (`server/`)

A standalone lightweight WebSocket relay server (Node.js + `ws`) that routes end-to-end encrypted messages between mobile wallet and desktop dApps. No decryption — just message routing. Has its own `package.json`, separate from the main wallet. Runs on port 8765.

### Database Schema (`shared/schema.ts`)

Minimal PostgreSQL schema via Drizzle ORM with a single `users` table (id, username, password). This appears to be scaffolding from the Replit template and is NOT used by the wallet's core functionality. The wallet stores all data client-side in encrypted IndexedDB. The `drizzle.config.ts` requires `DATABASE_URL` environment variable pointing to PostgreSQL.

### Build System

- `npm run dev` — Vite dev server on port 5000
- `npm run build` — PWA production build
- `npm run build:extension` — Extension build via `vite.config.extension.ts` (outputs to `dist-extension/` and `dist-extension-firefox/`)
- `npm run build:all` — Both builds
- `npm run package:chrome` / `npm run package:firefox` — Zip for store submission

### Testing

- Vitest with jsdom environment, React Testing Library
- 271+ tests covering core crypto, security, and components
- Coverage via `@vitest/coverage-v8` focused on `src/core/`
- Setup in `src/test-setup.ts`
- Run with `npm test`

### Parity Between PWA and Extension

Files in `src/api/sultanAPI.ts`, `src/core/wallet.ts`, `src/core/security.ts`, and `src/core/wallet-link.ts` MUST be identical between PWA and extension builds. A verification script exists: `npm run verify:parity`. See `SYNC.md` for the sync workflow.

## External Dependencies

### Blockchain RPC

- **Production**: `https://rpc.sltn.io` and `https://api.sltn.io/rpc` (HTTPS, proxied to Sultan L1 validator node at `206.189.224.142`)
- **Development fallback**: `http://206.189.224.142:8545`
- Sultan L1 is a native Rust blockchain (NOT Cosmos/Tendermint/Substrate)

### DNS / Hosting

- `sltn.io` — Main website (separate project)
- `wallet.sltn.io` — This PWA (deployed via Replit static deployment)
- DNS managed via Hostinger with A records pointing to Replit (`34.111.179.208`) and RPC nodes (`206.189.224.142`)

### Key NPM Dependencies

| Package | Purpose |
|---------|---------|
| `@noble/ed25519`, `@noble/hashes`, `@scure/bip39` | Cryptography (Cure53 audited) |
| `bech32` | Address encoding |
| `react`, `react-dom`, `react-router-dom` | UI framework |
| `@tanstack/react-query` | Server state management |
| `vite`, `vite-plugin-pwa` | Build and PWA support |
| `qrcode`, `jsqr` | QR code generation and scanning |
| `fast-json-stable-stringify` | Deterministic JSON for transaction signing |
| `zod` | Runtime type validation (API responses) |
| `ws` (server only) | WebSocket relay server |
| `drizzle-orm`, `drizzle-kit` | Database ORM (scaffolding, not actively used by wallet) |

### Database

PostgreSQL via Drizzle ORM is configured but minimally used. The wallet itself is entirely client-side with IndexedDB + AES-256-GCM encryption. If Postgres is needed for future server features, the schema is in `shared/schema.ts` and migrations go to `./migrations`.

### Chrome Web Store / Firefox Add-ons

- Chrome extension manifest: `public/manifest.json` (MV3, version 1.7.4)
- Firefox extension manifest: `public/manifest.firefox.json` (MV2, version 1.6.8)