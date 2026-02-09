# Tabs Permission Justification

## Summary

Sultan Wallet requires the `tabs` permission to enable dApp communication. This permission is actively used in `background.js` to notify connected websites when wallet state changes (account switches, connection status, etc.).

## Code Usage

The `tabs` permission is used in three places in `background.js`:

### 1. Query tabs by origin URL (line 811)
```javascript
tabs = await chrome.tabs.query({ url: `${origin}/*` });
```
**Purpose**: Find all tabs from a specific dApp origin to send wallet events.

### 2. Query all tabs as fallback (line 821)
```javascript
const allTabs = await chrome.tabs.query({});
tabs = allTabs.filter(tab => tab.url && tab.url.startsWith(origin));
```
**Purpose**: Fallback for localhost URLs where pattern matching fails.

### 3. Send messages to tabs (line 832)
```javascript
await chrome.tabs.sendMessage(tab.id, {
  type: 'SULTAN_PROVIDER_EVENT',
  eventName,
  payload
});
```
**Purpose**: Deliver wallet events (account changes, connection status) to dApps.

## Why This Permission is Required

Without the `tabs` permission:
- `chrome.tabs.query({ url: ... })` returns empty results
- dApps cannot receive wallet state updates
- The `accountsChanged` and `chainChanged` events (required by EIP-1193 provider spec) would not work

## Testing Instructions

1. Load the extension in Chrome
2. Visit https://wallet.sltn.io (or any dApp)
3. Connect the wallet
4. Open extension popup and switch accounts
5. The dApp should receive an `accountsChanged` event

**Without tabs permission**: Step 5 would fail - the dApp would not be notified of the account change.

## Alternative Approaches Considered

1. **Remove tabs, use only `chrome.runtime.sendMessage`**: This would require the dApp to actively poll for changes rather than receive events, breaking standard wallet provider behavior.

2. **Use `activeTab` instead**: `activeTab` only works on user-initiated actions and doesn't allow querying other tabs.

## Conclusion

The `tabs` permission is essential for Sultan Wallet's core dApp integration functionality. Removing it would break the wallet's ability to notify connected dApps of state changes, which is a standard feature expected by web3 applications.
