# PWA ↔ Extension Sync Guide

The Sultan Wallet exists in two forms:
- **PWA** (`wallet.sltn.io`) - Hosted on Replit
- **Browser Extension** - This repository (`wallet-extension/`)

**Core code is IDENTICAL. Only UI/screens differ for form factor.**

## Files That MUST Be Identical

These files must be byte-for-byte the same. Any change here must be copied to both.

| File | Purpose |
|------|---------|
| `src/api/sultanAPI.ts` | All RPC calls to Sultan L1 |
| `src/core/wallet.ts` | Wallet operations, SLTN formatting, address generation |
| `src/core/security.ts` | Amount validation, address validation, PIN verification |
| `src/core/wallet-link.ts` | WalletConnect protocol for dApp connections |

## UI Files (Can Differ)

Screens may have different layouts for form factor:
- Extension popup: 360×600px
- PWA: Full responsive browser

These files serve the same purpose but can have different implementations.

## Extension-Only Files (Do NOT Sync)

These are specific to the Chrome extension architecture:

- `src/core/extension-bridge.ts` - Chrome message passing
- `src/core/csp.ts` - Content Security Policy  
- `src/core/storage.secure.ts` - Chrome storage API
- `src/background/` - Service worker
- `src/content-script.ts` - Page injection
- `public/manifest.json` - Extension manifest

## Sync Workflow

### When editing in this workspace (Extension):
1. Make changes to shared files
2. Note which files changed
3. Copy updated files to Replit PWA via the sync script or manually

### When editing on Replit (PWA):
1. Make changes on Replit
2. Tell the agent which files changed
3. Agent will update extension files to match

### Quick Sync Check
```bash
# Compare a core file between PWA and extension
diff wallet-extension/src/api/sultanAPI.ts /path/to/pwa/client/src/lib/sultanAPI.ts
```

## Version History

Keep versions aligned when possible:

| Version | Extension | PWA | Notes |
|---------|-----------|-----|-------|
| 1.7.0 | ✅ | ✅ | Hex-encoded address charset support (v25 node compat) |
| 1.6.8 | ✅ | ✅ | Floating-point epsilon fix for balance validation |
| 1.6.7 | ✅ | ✅ | MAX button fix, comma formatting |
| 1.6.6 | ✅ | ✅ | Initial sync completed |

### v1.7.0 Sync Completed (Apr 15, 2026)

Address charset updated for v25 node compatibility. Node-generated validator
addresses use hex-encoded format (charset `0-9a-hj-np-z`) instead of pure
bech32. All validation, logging, and tests updated to accept both formats.

Files synced from `wallet-extension/`:
- `src/core/security.ts` - `validateSultanAddressInternal()` regex: `[0-9a-hj-np-z]`
- `src/core/wallet.ts` - `isValidAddress()` bech32 + hex fallback
- `src/core/logger.ts` - SENSITIVE_PATTERNS updated to new charset
- `src/core/__tests__/logger.test.ts` - Test patterns updated

### v1.6.8 Sync Completed (Feb 7, 2026)

Files synced to `/workspaces/PWA/`:
- `src/api/sultanAPI.ts` - Error handling fix
- `src/core/security.ts` - Epsilon comparison in validateAmount()
- `src/screens/Send.tsx` - Raw balance validation
- `src/screens/Stake.tsx` - Raw balance validation
- `src/screens/BecomeValidator.tsx` - Raw balance validation
- `src/screens/Governance.tsx` - validateAmount() fix

See `docs/TRANSACTION_AUDIT_FEB_2026.md` for full details.

## Checklist for Major Updates

When making significant changes:

- [ ] Update shared core files in both places
- [ ] Test extension locally (`npm run build:extension`)
- [ ] Test PWA on Replit
- [ ] Bump version in both `manifest.json` and PWA `package.json`
- [ ] Update this sync log
