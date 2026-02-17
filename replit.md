# Sultan Wallet

## Overview

Sultan Wallet is a non-custodial cryptocurrency wallet for the Sultan L1 blockchain, deployed as both a Progressive Web App (PWA) at `wallet.sltn.io` and a Chrome/Firefox browser extension. The wallet enables users to manage SLTN tokens with zero transaction fees, stake to validators, participate in governance, hold NFTs, and connect to dApps. All cryptographic operations happen client-side — the server never sees private keys. The core codebase is shared between the PWA and extension builds, with only UI chrome and platform-specific plumbing differing between them.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript 5.6, bundled by Vite 6
- **Routing**: React Router (react-router-dom v7) with screen-based navigation
- **State Management**: React hooks (`useWallet`, `useTheme`) plus `@tanstack/react-query` for data fetching
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin) with CSS custom properties in `src/index.css` for theming. Shadcn/ui components configured in `components.json` with the "new-york" style
- **PWA**: `vite-plugin-pwa` handles service worker registration, offline caching, and manifest generation. The app is installable on mobile and desktop

### Core Crypto Layer (`src/core/`)

This is the security-critical code. All cryptographic operations live here and are shared between PWA and extension:

- **`wallet.ts`** — Ed25519 key derivation (SLIP-0010 path `m/44'/1984'/0'/0'/{index}`), BIP39 24-word mnemonic generation, transaction signing, bech32 address encoding (`sultan1...`). Private keys are derived on-demand and wiped after use
- **`security.ts`** — SecureString (XOR-encrypted in-memory mnemonic storage), secure memory wiping, PIN verification with SHA-256 hashing, rate limiting (5 failed attempts → 5-min lockout), 15-min session timeout, amount/address validation
- **`storage.secure.ts`** — AES-256-GCM encryption with PBKDF2 key derivation (600K iterations), IndexedDB for encrypted wallet data, localStorage for preferences/lockout state
- **`totp.ts`** — Optional TOTP-based 2FA (RFC 6238)
- **`csp.ts`** — Content Security Policy enforcement
- **`clipboard.ts`** — Secure clipboard with auto-clear
- **`logger.ts`** — Production logging with sensitive data filtering

**Cryptographic libraries are all from the audited `@noble`/`@scure` family by Paul Miller (Cure53 audited):**
- `@noble/ed25519` for signatures
- `@noble/hashes` for SHA-256, SHA-512, PBKDF2
- `@scure/bip39` for mnemonic generation
- `bech32` for address encoding

### API Layer (`src/api/sultanAPI.ts`)

- Connects to Sultan L1 blockchain RPC nodes at `https://rpc.sltn.io` (production) or `http://206.189.224.142:26657` (dev fallback)
- Handles account balances, staking info, validator lists, transaction submission, governance proposals
- Uses Zod validation on responses and retry logic

### Screen Components (`src/screens/`)

Main screens: Welcome, CreateWallet, ImportWallet, Unlock, Dashboard, Send, Receive, Stake, BecomeValidator, Settings, Activity, Governance, NFTs, ApprovalScreen, ConnectedAppsScreen, WalletLinkScreen

### Browser Extension Architecture (`extension/`)

Extension-only files that are NOT shared with the PWA:
- **`background.js`** — Service worker handling message routing, connection state, RPC proxy, icon switching. Cross-browser compatible (Chrome MV3 + Firefox MV2)
- **`content-script.js`** — Bridge between web pages and background, with message validation, rate limiting (100 req/min), method whitelist
- **`inpage-provider.js`** — Injects `window.sultan` API into web pages. Frozen object to prevent tampering. EIP-1193 inspired interface

Two build configs:
- `vite.config.ts` — PWA build (outputs to `dist/`)
- `vite.config.extension.ts` — Extension build (outputs to `dist-extension/` for Chrome and `dist-extension-firefox/` for Firefox)

### Dual Build Strategy

The PWA and extension share the same `src/` directory. Key shared files that MUST stay identical: `sultanAPI.ts`, `wallet.ts`, `security.ts`, `wallet-link.ts`. The `SYNC.md` document tracks parity requirements.

### WalletLink Relay Server (`server/`)

A separate lightweight WebSocket relay server (`server/relay-server.ts`) that connects mobile wallets to desktop dApps via QR code scanning. It's a simple message router — all payloads are end-to-end encrypted with AES-256-GCM. Uses the `ws` library, runs on port 8765.

### Database Schema

There's a Drizzle ORM schema in `shared/schema.ts` with a basic `users` table (id, username, password) using PostgreSQL via `DATABASE_URL`. This appears to be scaffolding from the Replit template and is NOT used by the wallet's core functionality — the wallet is entirely client-side with IndexedDB storage. The `drizzle.config.ts` expects a PostgreSQL `DATABASE_URL` environment variable.

### Testing

- **Framework**: Vitest with jsdom environment and React Testing Library
- **Setup**: `src/test-setup.ts` configures jsdom mocks
- **Coverage**: V8 provider targeting `src/core/**/*.ts`
- **Test count**: 271+ tests covering crypto operations, security controls, and UI components
- Run with `npm test` (single run) or `npm run test:watch`

### Key Domain Rules

- Sultan addresses use bech32 format starting with `sultan1`
- Token decimals: 9 (1 SLTN = 1,000,000,000 base units)
- Zero transaction fees on Sultan L1
- Staking APY: 13.33%
- Minimum validator stake: 10,000 SLTN
- Governance proposal deposit: 1,000 SLTN
- Sultan is a native Rust L1 blockchain — NOT Cosmos, Tendermint, or Substrate

## External Dependencies

### Blockchain Infrastructure
- **Sultan L1 RPC**: `https://rpc.sltn.io` (production), `https://api.sltn.io/rpc` (backup), `http://206.189.224.142:26657` (dev fallback) — REST API for account data, transaction submission, staking, governance
- **Domain**: `sltn.io` with subdomains `wallet.sltn.io` (PWA), `rpc.sltn.io`, `api.sltn.io`, `grpc.sltn.io`

### Database
- **PostgreSQL** via Drizzle ORM — configured in `drizzle.config.ts`, schema in `shared/schema.ts`. Requires `DATABASE_URL` environment variable. Currently minimal (users table only); the wallet core does NOT depend on it

### Browser APIs
- **IndexedDB** — Primary encrypted storage for wallet data
- **Web Crypto API** (`crypto.subtle`) — AES-256-GCM encryption, PBKDF2 key derivation
- **Service Worker** — PWA offline caching via vite-plugin-pwa
- **localStorage** — Lockout state, preferences

### Chrome/Firefox Extension APIs
- `chrome.storage` / `browser.storage` — Extension storage
- `chrome.runtime` / `browser.runtime` — Message passing between content scripts and background
- `chrome.action` / `browser.browserAction` — Extension popup management

### Distribution
- **PWA**: Deployed to `wallet.sltn.io` via Replit static deployment
- **Chrome Extension**: Chrome Web Store (MV3 manifest, v1.7.4)
- **Firefox Add-on**: Planned (MV2 manifest at `public/manifest.firefox.json`)

### WalletLink Relay
- **WebSocket server** using `ws` library — deployed separately, routes encrypted messages between mobile wallet and desktop dApps