/**
 * Sultan Wallet - BroadcastChannel Listener (Wallet Side)
 * 
 * Runs inside the Sultan Wallet PWA to listen for dApp requests
 * coming over BroadcastChannel. This is the wallet-side counterpart
 * to the dApp-side SultanPWAProvider (pwa-provider.ts).
 * 
 * When a dApp in another tab sends a message, this module:
 * 1. Receives it on the DAPP_CHANNEL
 * 2. Queues it as a pending approval (like the extension's background.js does)
 * 3. Emits events so the wallet UI can show approval dialogs
 * 4. Sends responses back on the WALLET_CHANNEL
 */

import { DAPP_CHANNEL, WALLET_CHANNEL, PWAMessageType } from './pwa-provider';
import type { PWAMessage, PWAResponse } from './pwa-provider';

// Connected dApp session
export interface PWAConnectedApp {
  origin: string;
  name: string;
  icon?: string;
  connectedAt: number;
  lastActivity: number;
}

// Pending approval request
export interface PWAApprovalRequest {
  id: string;
  type: PWAMessageType;
  origin: string;
  name: string;
  icon?: string;
  payload: any;
  timestamp: number;
}

// Storage keys
const CONNECTED_APPS_KEY = 'sultan_pwa_connected_apps';

type ApprovalHandler = (request: PWAApprovalRequest) => void;
type ConnectionHandler = (apps: PWAConnectedApp[]) => void;

/**
 * Wallet-side BroadcastChannel service
 * 
 * Manages incoming dApp requests and routes them to the wallet UI.
 */
export class WalletBroadcastService {
  private dappChannel: BroadcastChannel | null = null;
  private walletChannel: BroadcastChannel | null = null;
  private connectedApps = new Map<string, PWAConnectedApp>();
  private pendingApprovals = new Map<string, PWAApprovalRequest>();
  private approvalHandlers = new Set<ApprovalHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private isRunning = false;

  // Callbacks for the wallet to provide
  private getAddress: (() => Promise<string | null>) | null = null;
  private getPublicKey: (() => Promise<string | null>) | null = null;
  private getBalanceFn: (() => Promise<{ available: string; staked: string; rewards: string }>) | null = null;

  constructor() {
    this.loadConnectedApps();
  }

  /**
   * Start listening for dApp messages
   * Call this when the wallet UI is active and ready.
   */
  start(handlers: {
    getAddress: () => Promise<string | null>;
    getPublicKey: () => Promise<string | null>;
    getBalance: () => Promise<{ available: string; staked: string; rewards: string }>;
  }): void {
    if (this.isRunning) return;
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[Wallet Broadcast] BroadcastChannel not supported');
      return;
    }

    this.getAddress = handlers.getAddress;
    this.getPublicKey = handlers.getPublicKey;
    this.getBalanceFn = handlers.getBalance;

    // Listen for dApp requests
    this.dappChannel = new BroadcastChannel(DAPP_CHANNEL);
    this.dappChannel.onmessage = (event: MessageEvent<PWAMessage>) => {
      this.handleRequest(event.data).catch(e => {
        console.error('[Wallet Broadcast] Error handling request:', e);
      });
    };

    // Channel to send responses
    this.walletChannel = new BroadcastChannel(WALLET_CHANNEL);

    this.isRunning = true;
    console.log('[Wallet Broadcast] Service started');
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.dappChannel?.close();
    this.walletChannel?.close();
    this.dappChannel = null;
    this.walletChannel = null;
    this.isRunning = false;
    console.log('[Wallet Broadcast] Service stopped');
  }

  /**
   * Handle an incoming dApp request
   */
  private async handleRequest(message: PWAMessage): Promise<void> {
    const { id, type, payload, origin, timestamp } = message;

    // Rate limiting: max 60 requests per minute per origin
    // (simple check - production should use a proper rate limiter)
    
    switch (type) {
      case PWAMessageType.PING:
        // Discovery: dApp is asking if wallet is open
        this.sendResponse({
          id,
          type: PWAMessageType.PONG as any,
          payload: { walletReady: true },
          timestamp: Date.now(),
        });
        break;

      case PWAMessageType.CONNECT:
        this.handleConnectRequest(id, origin || 'unknown', payload);
        break;

      case PWAMessageType.DISCONNECT:
        this.handleDisconnect(origin || 'unknown');
        this.sendResponse({
          id,
          type: PWAMessageType.RESPONSE,
          payload: { success: true },
          timestamp: Date.now(),
        });
        break;

      case PWAMessageType.IS_CONNECTED:
        this.sendResponse({
          id,
          type: PWAMessageType.RESPONSE,
          payload: this.connectedApps.has(origin || ''),
          timestamp: Date.now(),
        });
        break;

      case PWAMessageType.GET_ADDRESS:
        if (!this.isAppConnected(origin)) {
          this.sendError(id, 'Not connected');
          return;
        }
        try {
          const address = await this.getAddress?.();
          this.sendResponse({ id, type: PWAMessageType.RESPONSE, payload: address, timestamp: Date.now() });
        } catch (e) {
          this.sendError(id, (e as Error).message);
        }
        break;

      case PWAMessageType.GET_PUBLIC_KEY:
        if (!this.isAppConnected(origin)) {
          this.sendError(id, 'Not connected');
          return;
        }
        try {
          const pubKey = await this.getPublicKey?.();
          this.sendResponse({ id, type: PWAMessageType.RESPONSE, payload: pubKey, timestamp: Date.now() });
        } catch (e) {
          this.sendError(id, (e as Error).message);
        }
        break;

      case PWAMessageType.GET_BALANCE:
        if (!this.isAppConnected(origin)) {
          this.sendError(id, 'Not connected');
          return;
        }
        try {
          const balance = await this.getBalanceFn?.();
          this.sendResponse({ id, type: PWAMessageType.RESPONSE, payload: balance, timestamp: Date.now() });
        } catch (e) {
          this.sendError(id, (e as Error).message);
        }
        break;

      case PWAMessageType.GET_NETWORK:
        this.sendResponse({
          id,
          type: PWAMessageType.RESPONSE,
          payload: {
            chainId: 'sultan-1',
            name: 'Sultan Mainnet',
            rpcUrl: 'https://rpc.sltn.io',
          },
          timestamp: Date.now(),
        });
        break;

      case PWAMessageType.SIGN_MESSAGE:
      case PWAMessageType.SIGN_TRANSACTION:
      case PWAMessageType.SEND_TRANSACTION:
        if (!this.isAppConnected(origin)) {
          this.sendError(id, 'Not connected. Call connect() first.');
          return;
        }
        // These require user approval - queue them
        this.queueApproval({
          id,
          type,
          origin: origin || 'unknown',
          name: this.connectedApps.get(origin || '')?.name || 'Unknown dApp',
          icon: this.connectedApps.get(origin || '')?.icon,
          payload,
          timestamp,
        });
        break;

      case PWAMessageType.ADD_TOKEN:
        if (!this.isAppConnected(origin)) {
          this.sendError(id, 'Not connected');
          return;
        }
        this.queueApproval({
          id,
          type,
          origin: origin || 'unknown',
          name: this.connectedApps.get(origin || '')?.name || 'Unknown dApp',
          payload,
          timestamp,
        });
        break;

      default:
        this.sendError(id, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle connection request - needs user approval
   */
  private handleConnectRequest(id: string, origin: string, payload: any): void {
    // If already connected to this origin, return immediately
    if (this.connectedApps.has(origin)) {
      const app = this.connectedApps.get(origin)!;
      app.lastActivity = Date.now();
      this.saveConnectedApps();
      
      // Return current address/pubkey
      Promise.all([this.getAddress?.(), this.getPublicKey?.()]).then(([address, publicKey]) => {
        this.sendResponse({
          id,
          type: PWAMessageType.RESPONSE,
          payload: { address, publicKey },
          timestamp: Date.now(),
        });
      });
      return;
    }

    // New connection - requires user approval
    this.queueApproval({
      id,
      type: PWAMessageType.CONNECT,
      origin,
      name: payload?.name || 'Unknown dApp',
      icon: payload?.icon,
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle disconnect from a dApp
   */
  private handleDisconnect(origin: string): void {
    this.connectedApps.delete(origin);
    this.saveConnectedApps();
    this.notifyConnectionChange();
  }

  /**
   * Queue an approval request for the user
   */
  private queueApproval(request: PWAApprovalRequest): void {
    this.pendingApprovals.set(request.id, request);
    this.approvalHandlers.forEach(handler => {
      try {
        handler(request);
      } catch (e) {
        console.error('[Wallet Broadcast] Approval handler error:', e);
      }
    });
  }

  /**
   * Approve a pending request (called by wallet UI after user confirms)
   */
  approveRequest(requestId: string, result: any): void {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      console.warn('[Wallet Broadcast] Request not found:', requestId);
      return;
    }

    // If this was a connect request, save the app as connected
    if (request.type === PWAMessageType.CONNECT && result?.address) {
      this.connectedApps.set(request.origin, {
        origin: request.origin,
        name: request.name,
        icon: request.icon,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      });
      this.saveConnectedApps();
      this.notifyConnectionChange();
    }

    this.sendResponse({
      id: requestId,
      type: PWAMessageType.RESPONSE,
      payload: result,
      timestamp: Date.now(),
    });

    this.pendingApprovals.delete(requestId);
  }

  /**
   * Reject a pending request
   */
  rejectRequest(requestId: string, reason = 'User rejected'): void {
    const request = this.pendingApprovals.get(requestId);
    if (!request) return;

    this.sendError(requestId, reason);
    this.pendingApprovals.delete(requestId);
  }

  /**
   * Disconnect a specific app from wallet side
   */
  disconnectApp(origin: string): void {
    this.connectedApps.delete(origin);
    this.saveConnectedApps();
    this.notifyConnectionChange();

    // Notify the dApp
    if (this.walletChannel) {
      this.walletChannel.postMessage({
        id: 'event:disconnect',
        type: PWAMessageType.RESPONSE,
        payload: { origin },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Disconnect all apps
   */
  disconnectAll(): void {
    const origins = Array.from(this.connectedApps.keys());
    this.connectedApps.clear();
    this.saveConnectedApps();
    this.notifyConnectionChange();

    // Notify all dApps
    if (this.walletChannel) {
      origins.forEach(origin => {
        this.walletChannel!.postMessage({
          id: 'event:disconnect',
          type: PWAMessageType.RESPONSE,
          payload: { origin },
          timestamp: Date.now(),
        });
      });
    }
  }

  /**
   * Notify dApps of account change
   */
  notifyAccountChange(address: string, publicKey: string): void {
    if (!this.walletChannel) return;
    
    this.walletChannel.postMessage({
      id: 'event:accountChange',
      type: PWAMessageType.RESPONSE,
      payload: { address, publicKey },
      timestamp: Date.now(),
    });
  }

  // ========================================================================
  // Event subscription (for wallet UI)
  // ========================================================================

  /**
   * Subscribe to new approval requests
   */
  onApproval(handler: ApprovalHandler): () => void {
    this.approvalHandlers.add(handler);
    return () => this.approvalHandlers.delete(handler);
  }

  /**
   * Subscribe to connection changes
   */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // ========================================================================
  // Getters
  // ========================================================================

  /** Get all connected apps */
  getConnectedApps(): PWAConnectedApp[] {
    return Array.from(this.connectedApps.values());
  }

  /** Get pending approval requests */
  getPendingApprovals(): PWAApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /** Check if an origin is connected */
  isAppConnected(origin: string | undefined): boolean {
    if (!origin) return false;
    return this.connectedApps.has(origin);
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private sendResponse(response: PWAResponse): void {
    if (!this.walletChannel) return;
    this.walletChannel.postMessage(response);
  }

  private sendError(id: string, error: string): void {
    this.sendResponse({
      id,
      type: PWAMessageType.ERROR,
      error,
      timestamp: Date.now(),
    });
  }

  private notifyConnectionChange(): void {
    const apps = this.getConnectedApps();
    this.connectionHandlers.forEach(handler => {
      try {
        handler(apps);
      } catch (e) {
        console.error('[Wallet Broadcast] Connection handler error:', e);
      }
    });
  }

  private saveConnectedApps(): void {
    try {
      const data = Array.from(this.connectedApps.entries());
      localStorage.setItem(CONNECTED_APPS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Wallet Broadcast] Failed to save connected apps:', e);
    }
  }

  private loadConnectedApps(): void {
    try {
      const stored = localStorage.getItem(CONNECTED_APPS_KEY);
      if (stored) {
        const entries: [string, PWAConnectedApp][] = JSON.parse(stored);
        this.connectedApps = new Map(entries);
      }
    } catch (e) {
      console.warn('[Wallet Broadcast] Failed to load connected apps:', e);
    }
  }
}

// Singleton instance for the wallet
let instance: WalletBroadcastService | null = null;

export function getWalletBroadcastService(): WalletBroadcastService {
  if (!instance) {
    instance = new WalletBroadcastService();
  }
  return instance;
}
