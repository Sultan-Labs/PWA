/**
 * Sultan PWA Provider - BroadcastChannel-based dApp ↔ PWA Wallet Communication
 * 
 * When the Sultan Wallet browser extension is NOT installed, dApps can still
 * communicate with the Sultan Wallet PWA (wallet.sltn.io) if it's open in
 * another tab of the same browser. This module provides:
 * 
 * 1. `SultanPWAProvider` - A provider class that dApps use (injected as window.sultan)
 *    Sends requests over BroadcastChannel, falls back to WalletLink if PWA not detected.
 * 
 * 2. Protocol:
 *    - dApp sends request on channel "sultan-wallet-dapp"
 *    - PWA wallet listens on "sultan-wallet-dapp", processes, responds on "sultan-wallet-response"
 *    - dApp listens on "sultan-wallet-response" for results
 *    - Heartbeat/discovery: dApp pings, wallet pongs to confirm presence
 * 
 * Usage in dApps:
 * ```ts
 * import { SultanPWAProvider } from '@sultan/wallet-sdk';
 * const provider = new SultanPWAProvider();
 * const isAvailable = await provider.discover(); // true if PWA is open
 * const { address } = await provider.connect();
 * ```
 */

// Channel names
const DAPP_CHANNEL = 'sultan-wallet-dapp';
const WALLET_CHANNEL = 'sultan-wallet-response';

// Request timeout (ms)
const REQUEST_TIMEOUT = 120_000; // 2 minutes for user approval
const DISCOVER_TIMEOUT = 2_000;  // 2 seconds to check if PWA is open

// Message types
export enum PWAMessageType {
  // Discovery
  PING = 'ping',
  PONG = 'pong',
  
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // Queries
  GET_ADDRESS = 'getAddress',
  GET_PUBLIC_KEY = 'getPublicKey',
  GET_BALANCE = 'getBalance',
  GET_NETWORK = 'getNetwork',
  IS_CONNECTED = 'isConnected',
  
  // Signing
  SIGN_MESSAGE = 'signMessage',
  SIGN_TRANSACTION = 'signTransaction',
  SEND_TRANSACTION = 'sendTransaction',
  
  // Token
  ADD_TOKEN = 'addToken',
  
  // Events (wallet → dApp, unsolicited)
  EVENT_ACCOUNT_CHANGE = 'event:accountChange',
  EVENT_DISCONNECT = 'event:disconnect',
  EVENT_NETWORK_CHANGE = 'event:networkChange',
  
  // Responses
  RESPONSE = 'response',
  ERROR = 'error',
}

export interface PWAMessage {
  id: string;
  type: PWAMessageType;
  payload?: any;
  origin?: string;
  timestamp: number;
}

export interface PWAResponse {
  id: string;
  type: PWAMessageType.RESPONSE | PWAMessageType.ERROR;
  payload?: any;
  error?: string;
  timestamp: number;
}

type EventHandler = (data: any) => void;

/**
 * Sultan PWA Provider for dApps
 * 
 * Can be used as a drop-in replacement for window.sultan when the
 * browser extension is not installed. Uses BroadcastChannel API to
 * communicate with the wallet PWA in another tab.
 */
export class SultanPWAProvider {
  readonly isSultan = true;
  readonly isPWAProvider = true;
  readonly version = '1.0.0';

  private dappChannel: BroadcastChannel | null = null;
  private walletChannel: BroadcastChannel | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private _isConnected = false;
  private _address: string | null = null;
  private _publicKey: string | null = null;
  private _walletDetected = false;

  constructor() {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[Sultan PWA Provider] BroadcastChannel not supported in this browser');
      return;
    }
    this.initChannels();
  }

  /**
   * Initialize BroadcastChannel listeners
   */
  private initChannels(): void {
    // Channel TO send requests to wallet
    this.dappChannel = new BroadcastChannel(DAPP_CHANNEL);

    // Channel to RECEIVE responses from wallet
    this.walletChannel = new BroadcastChannel(WALLET_CHANNEL);
    this.walletChannel.onmessage = (event: MessageEvent<PWAResponse>) => {
      this.handleResponse(event.data);
    };
  }

  /**
   * Handle incoming response from wallet
   */
  private handleResponse(response: PWAResponse): void {
    // Handle unsolicited events from wallet
    if (response.type === PWAMessageType.ERROR && !response.id) {
      return; // Ignore broadcast errors not targeted at us
    }

    // Handle wallet-initiated events
    if (response.id?.startsWith('event:')) {
      this.handleWalletEvent(response);
      return;
    }

    // Handle pong (discovery response)
    if ((response as any).type === PWAMessageType.PONG) {
      this._walletDetected = true;
      // Resolve any pending PING request
      const pending = this.pendingRequests.get('discover');
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve(true);
        this.pendingRequests.delete('discover');
      }
      return;
    }

    // Handle normal request responses
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(response.id);

    if (response.type === PWAMessageType.ERROR) {
      pending.reject(new Error(response.error || 'Request failed'));
    } else {
      pending.resolve(response.payload);
    }
  }

  /**
   * Handle events pushed from wallet (account change, disconnect, etc.)
   */
  private handleWalletEvent(response: PWAResponse): void {
    const eventType = response.id?.replace('event:', '') || '';
    
    switch (eventType) {
      case 'accountChange':
        this._address = response.payload?.address || null;
        this._publicKey = response.payload?.publicKey || null;
        this.emitEvent('accountChange', response.payload);
        break;
        
      case 'disconnect':
        this._isConnected = false;
        this._address = null;
        this._publicKey = null;
        this.emitEvent('disconnect', null);
        break;
        
      case 'networkChange':
        this.emitEvent('networkChange', response.payload);
        break;
    }
  }

  /**
   * Send a request to the wallet PWA and wait for a response
   */
  private sendRequest(type: PWAMessageType, payload?: any, timeout = REQUEST_TIMEOUT): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.dappChannel) {
        reject(new Error('BroadcastChannel not available'));
        return;
      }

      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out (${type})`));
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const message: PWAMessage = {
        id,
        type,
        payload,
        origin: window.location.origin,
        timestamp: Date.now(),
      };

      this.dappChannel.postMessage(message);
    });
  }

  /**
   * Discover if Sultan Wallet PWA is open in another tab
   */
  async discover(timeout = DISCOVER_TIMEOUT): Promise<boolean> {
    if (!this.dappChannel) return false;

    const channel = this.dappChannel;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete('discover');
        resolve(false);
      }, timeout);

      this.pendingRequests.set('discover', {
        resolve: (val) => resolve(val as boolean),
        reject: () => resolve(false),
        timer,
      });

      const message: PWAMessage = {
        id: 'discover',
        type: PWAMessageType.PING,
        origin: window.location.origin,
        timestamp: Date.now(),
      };

      channel.postMessage(message);
    });
  }

  /**
   * Check if PWA wallet was detected
   */
  get walletDetected(): boolean {
    return this._walletDetected;
  }

  // ========================================================================
  // Provider API (matches window.sultan interface)
  // ========================================================================

  /**
   * Connect to wallet
   */
  async connect(): Promise<{ address: string; publicKey: string }> {
    const result = await this.sendRequest(PWAMessageType.CONNECT, {
      origin: window.location.origin,
      name: document.title || 'Unknown dApp',
      icon: this.getFaviconUrl(),
    });

    this._isConnected = true;
    this._address = result.address;
    this._publicKey = result.publicKey;

    this.emitEvent('connect', result);
    return result;
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    await this.sendRequest(PWAMessageType.DISCONNECT).catch(() => {});
    this._isConnected = false;
    this._address = null;
    this._publicKey = null;
    this.emitEvent('disconnect', null);
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get current address
   */
  async getAddress(): Promise<string | null> {
    if (this._address) return this._address;
    return this.sendRequest(PWAMessageType.GET_ADDRESS, {}, 5000);
  }

  /**
   * Get current public key
   */
  async getPublicKey(): Promise<string | null> {
    if (this._publicKey) return this._publicKey;
    return this.sendRequest(PWAMessageType.GET_PUBLIC_KEY, {}, 5000);
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<{ available: string; staked: string; rewards: string }> {
    return this.sendRequest(PWAMessageType.GET_BALANCE, {}, 10000);
  }

  /**
   * Get network info
   */
  async getNetwork(): Promise<{ chainId: string; name: string; rpcUrl: string }> {
    return this.sendRequest(PWAMessageType.GET_NETWORK, {}, 5000);
  }

  /**
   * Sign a message
   */
  async signMessage(message: string | Uint8Array): Promise<{ signature: string; publicKey: string }> {
    const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
    return this.sendRequest(PWAMessageType.SIGN_MESSAGE, { message: msgStr });
  }

  /**
   * Sign a transaction
   */
  async signTransaction(tx: object, broadcast?: boolean): Promise<{ signature: string; publicKey: string; txHash?: string }> {
    return this.sendRequest(PWAMessageType.SIGN_TRANSACTION, { transaction: tx, broadcast });
  }

  /**
   * Send (sign + broadcast) a transaction
   */
  async sendTransaction(tx: object): Promise<{ txHash: string }> {
    return this.sendRequest(PWAMessageType.SEND_TRANSACTION, { transaction: tx });
  }

  /**
   * Add a custom token to wallet
   */
  async addToken(token: { denom: string; symbol: string; name: string; decimals: number; logoUrl?: string }): Promise<void> {
    return this.sendRequest(PWAMessageType.ADD_TOKEN, { token });
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler?: EventHandler): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler);
    } else {
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Emit an event to handlers
   */
  private emitEvent(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error('[Sultan PWA Provider] Event handler error:', e);
      }
    });
  }

  /**
   * Get current page favicon for display in wallet approval
   */
  private getFaviconUrl(): string | undefined {
    const link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    return link?.href || undefined;
  }

  /**
   * Cleanup - call when provider is no longer needed
   */
  destroy(): void {
    // Clear pending requests
    this.pendingRequests.forEach(({ timer, reject }) => {
      clearTimeout(timer);
      reject(new Error('Provider destroyed'));
    });
    this.pendingRequests.clear();

    // Close channels
    this.dappChannel?.close();
    this.walletChannel?.close();
    this.dappChannel = null;
    this.walletChannel = null;

    // Clear event handlers
    this.eventHandlers.clear();
  }
}

/**
 * Auto-detect and install the best available provider
 * 
 * Priority:
 * 1. Browser extension (window.sultan already set)
 * 2. PWA provider via BroadcastChannel
 * 3. null (no wallet available)
 * 
 * Call this from dApps to automatically get the best connection method.
 */
export async function detectSultanWallet(): Promise<{
  provider: SultanPWAProvider | any | null;
  method: 'extension' | 'pwa' | 'none';
}> {
  // Check for extension first
  if (typeof window !== 'undefined' && (window as any).sultan?.isSultan) {
    return { provider: (window as any).sultan, method: 'extension' };
  }

  // Try PWA provider
  if (typeof BroadcastChannel !== 'undefined') {
    const pwaProvider = new SultanPWAProvider();
    const detected = await pwaProvider.discover();
    
    if (detected) {
      return { provider: pwaProvider, method: 'pwa' };
    }
    
    // Clean up if not detected
    pwaProvider.destroy();
  }

  return { provider: null, method: 'none' };
}

/**
 * Install Sultan PWA Provider as window.sultan if extension is not present
 * Returns true if the provider was installed.
 */
export async function installPWAProvider(): Promise<boolean> {
  // Don't override extension
  if (typeof window !== 'undefined' && (window as any).sultan?.isSultan) {
    return false;
  }

  const { provider, method } = await detectSultanWallet();
  
  if (method === 'pwa' && provider) {
    try {
      Object.defineProperty(window, 'sultan', {
        value: provider,
        writable: false,
        configurable: false,
      });
      
      // Dispatch initialized event
      window.dispatchEvent(new CustomEvent('sultan#initialized', {
        detail: { method: 'pwa' }
      }));
      
      return true;
    } catch (e) {
      console.warn('[Sultan PWA Provider] Failed to install:', e);
    }
  }

  return false;
}

// Export channel names for the wallet side
export { DAPP_CHANNEL, WALLET_CHANNEL };
