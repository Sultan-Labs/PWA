# Sultan Wallet - Replit Agent Guide

## Overview

Sultan Wallet is a secure, zero-fee blockchain wallet for the Sultan L1 blockchain. It ships as both a **Progressive Web App (PWA)** deployed at `wallet.sltn.io` and a **Chrome/Firefox browser extension**. The wallet is non-custodial — all cryptographic operations happen client-side in the browser. Private keys never leave the device.

The project is a React 18 + TypeScript frontend application built with Vite. There is no traditional backend for wallet operations. The only server component is a lightweight WebSocket relay (`server/relay-server.ts`) used for WalletLink (connecting mobile wallet to desktop dApps via QR code). A Drizzle/PostgreSQL schema exists in `shared/schema.ts` but is minimal (just a users table) and may not be actively used by the wallet itself.

**Key blockchain facts:**
- Sultan is a native Rust L1 blockchain (NOT Cosmos, NOT Tendermint, NOT Substrate)
- Addresses use bech32 format starting with `sultan1`
- 9 decimal places (1 SLTN = 1,000,000,000 base units)
- Zero transaction fees
- 13.33% staking APY
- Ed25519 signatures

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (PWA + Extension)

- **Framework**: React 18 with TypeScript 5.6, bundled by Vite 6
- **Routing**: React Router (react-router-dom v7) with screen-based navigation
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin, with CSS custom properties in `src/index.css` controlling the entire design system (dark theme, cyan/black brand colors, glassmorphism effects)
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, configured via `components.json`
- **State Management**: React hooks + `@tanstack/react-query` for server state; wallet state managed via custom `useWallet` hook/provider
- **PWA**: Configured via `vite-plugin-pwa` with service worker auto-update, offline capable

### Core Cryptographic Layer (`src/core/`)

This is the security-critical code. All crypto lives here — never duplicate crypto logic elsewhere.

| File | Purpose |
|------|---------|
| `wallet.ts` | BIP39 mnemonic generation, SLIP-0010 Ed25519 key derivation (`m/44'/1984'/0'/0'/{index}`), transaction signing, bech32 address encoding |
| `security.ts` | SecureString (XOR-encrypted in-memory storage), memory wiping, PIN verification with SHA-256, rate limiting (5 attempts → 5min lockout), 15min session timeout |
| `storage.secure.ts` | AES-256-GCM encryption with PBKDF2 (600K iterations), IndexedDB for encrypted wallet data |
| `csp.ts` | Content Security Policy enforcement |
| `totp.ts` | Optional TOTP-based 2FA (RFC 6238) |
| `clipboard.ts` | Secure clipboard with auto-clear |
| `logger.ts` | Production logging with sensitive data filtering |

### API Layer (`src/api/sultanAPI.ts`)

- Connects to Sultan L1 blockchain via REST/RPC
- Production RPC: `https://rpc.sltn.io` (NYC bootstrap validator at `206.189.224.142`)
- Handles balance queries, transaction broadcasting, staking, governance
- Uses Zod for response validation and retry logic

### Browser Extension Architecture (`extension/`)

- `background.js` — Service worker for Chrome MV3 (message routing, connection state, RPC proxy)
- `content-script.js` — Bridge between page and extension (message validation, rate limiting, method whitelist)
- `inpage-provider.js` — Injects `window.sultan` API for dApp integration (frozen object, EIP-1193 inspired)
- Chrome uses Manifest V3 (`public/manifest.json`), Firefox uses Manifest V2 (`public/manifest.firefox.json`)

### PWA ↔ Extension Code Sharing

Core code in `src/core/` and `src/api/` is **identical** between PWA and extension. Only UI screens may differ for form factor (extension popup: 380×600px vs PWA: full responsive). See `SYNC.md` for the sync protocol.

### Build Targets

- `npm run dev` — Vite dev server on port 5000 (PWA mode)
- `npm run build` — Production PWA build to `dist/`
- `npm run build:extension` — Extension build via `vite.config.extension.ts` to `dist-extension/` (Chrome) and `dist-extension-firefox/` (Firefox)
- `npm run package:chrome` / `npm run package:firefox` — Zip packages for store submission

### Server Component (`server/`)

- **WalletLink Relay Server**: Standalone WebSocket relay (`relay-server.ts`) using the `ws` library
- Routes encrypted messages between mobile wallet and desktop dApp — doesn't decrypt anything
- Supports multi-instance deployment on Fly.io via machine ID routing
- Has its own `package.json` and `tsconfig.json` — separate from the main app
- Health endpoint at `/health`

### Database

- Drizzle ORM with PostgreSQL configured in `drizzle.config.ts`
- Schema in `shared/schema.ts` — currently just a basic `users` table with id, username, password
- Requires `DATABASE_URL` environment variable
- Migrations output to `./migrations`

### Testing

- **Framework**: Vitest with jsdom environment
- **271 tests** covering core cryptographic operations
- Setup file: `src/test-setup.ts`
- Coverage via `@vitest/coverage-v8`, focused on `src/core/**/*.ts`
- Run with `npm test`

### Screen Flow

```
Welcome → Create/Import Wallet → Dashboard
                                    ├── Send
                                    ├── Receive  
                                    ├── Stake → Become Validator
                                    ├── Governance
                                    ├── NFTs
                                    ├── Activity
                                    ├── Settings
                                    ├── Connected Apps
                                    └── WalletLink
```

Locked wallet redirects to `Unlock` screen. Extension mode checks for pending dApp approvals on startup.

## External Dependencies

### Cryptographic Libraries (Cure53 Audited)
- `@noble/ed25519` — Ed25519 signature operations
- `@noble/hashes` — SHA-256, SHA-512, PBKDF2
- `@scure/bip39` — BIP39 mnemonic generation/validation
- `bech32` — Address encoding (sultan1... format)

### Blockchain RPC
- Production endpoint: `https://rpc.sltn.io` (A record → `206.189.224.142`)
- API endpoint: `https://api.sltn.io`
- gRPC endpoint: `https://grpc.sltn.io`

### DNS/Hosting
- Domain: `sltn.io` managed via Hostinger DNS
- PWA deployed at `wallet.sltn.io` via Replit (A record → `34.111.179.208`)
- Main website at `www.sltn.io` also via Replit

### Key Frontend Dependencies
- `react`, `react-dom` 18.3 — UI framework
- `react-router-dom` 7.x — Client-side routing
- `@tanstack/react-query` — Server state management
- `qrcode` + `jsqr` — QR code generation and scanning
- `lucide-react` — Icons
- `tailwindcss` v4 + `tw-animate-css` — Styling
- `zod` v4 — Runtime validation

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- `drizzle-orm` + `drizzle-kit` for schema management and migrations