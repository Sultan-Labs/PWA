/**
 * Sultan WalletLink SDK for dApps
 * 
 * Use this SDK in your dApp to connect to Sultan Wallet on mobile devices.
 * Works alongside the browser extension - automatically falls back to WalletLink
 * when extension is not available (mobile browsers).
 * 
 * Usage:
 * ```javascript
 * import { SultanWalletSDK } from '@sultan/wallet-sdk';
 * 
 * const wallet = new SultanWalletSDK();
 * 
 * // Connect - auto-detects extension vs WalletLink
 * const { address, publicKey } = await wallet.connect();
 * 
 * // Sign transaction
 * const result = await wallet.signTransaction({
 *   to: 'sultan1...',
 *   amount: '1000000000',
 *   memo: 'Payment'
 * });
 * ```
 */

import { WalletLinkSessionGenerator, WalletLinkEvent } from './wallet-link';

// Types
export interface WalletAccount {
  address: string;
  publicKey: string;
}

export interface TransactionRequest {
  to: string;
  amount: string;
  memo?: string;
  denom?: string;
}

export interface SignedTransaction {
  transaction: TransactionRequest;
  signature: string;
  publicKey: string;
  txHash?: string;
}

export interface ConnectionOptions {
  /** Force WalletLink even if extension is available */
  forceWalletLink?: boolean;
  /** Custom relay server URL */
  relayUrl?: string;
  /** QR code container element ID */
  qrContainerId?: string;
  /** Callback when QR code is ready */
  onQRReady?: (qrData: string) => void;
  /** Callback when waiting for mobile connection */
  onWaiting?: () => void;
  /** Callback when deep link is ready (for mobile-to-mobile) */
  onDeepLinkReady?: (deepLink: string) => void;
  /** Auto-redirect to wallet on mobile (default: true) */
  autoRedirectMobile?: boolean;
}

type ConnectionMethod = 'extension' | 'walletlink' | 'none';

/**
 * Sultan Wallet SDK
 * Unified interface for connecting to Sultan Wallet via extension or WalletLink
 */
export class SultanWalletSDK {
  private connectionMethod: ConnectionMethod = 'none';
  private account: WalletAccount | null = null;
  private walletLink: WalletLinkSessionGenerator | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private options: ConnectionOptions;

  constructor(options: ConnectionOptions = {}) {
    this.options = options;
  }

  /**
   * Check if Sultan Wallet extension is available
   */
  static isExtensionAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).sultan !== 'undefined' &&
           (window as any).sultan.isSultan === true;
  }

  /**
   * Check if running on mobile device
   */
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Check if Sultan PWA is installed (has service worker)
   */
  static async isPWAInstalled(): Promise<boolean> {
    // Check if the PWA manifest link points to Sultan wallet
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      return false; // This page has its own manifest, so it's not the wallet
    }
    
    // On mobile, we can check if we're in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isStandalone;
  }

  /**
   * Generate deep link URL for mobile-to-mobile connection
   * Includes return URL so wallet can redirect back after approval
   */
  static generateDeepLink(sessionData: string, returnUrl?: string): string {
    // Universal link format that works on both iOS and Android
    // Falls back to web URL if wallet not installed
    const encoded = encodeURIComponent(sessionData);
    const currentUrl = returnUrl || window.location.href;
    const returnEncoded = encodeURIComponent(currentUrl);
    return `https://wallet.sltn.io/connect?session=${encoded}&return=${returnEncoded}`;
  }

  /**
   * Connect to wallet
   * Automatically chooses extension or WalletLink based on availability
   */
  async connect(): Promise<WalletAccount> {
    // Check for extension first (unless forced to use WalletLink)
    if (!this.options.forceWalletLink && SultanWalletSDK.isExtensionAvailable()) {
      return this.connectViaExtension();
    }

    // Fall back to WalletLink (for mobile browsers or no extension)
    return this.connectViaWalletLink();
  }

  /**
   * Connect via browser extension
   */
  private async connectViaExtension(): Promise<WalletAccount> {
    const sultan = (window as any).sultan;
    
    try {
      const result = await sultan.connect();
      
      this.connectionMethod = 'extension';
      this.account = {
        address: result.address,
        publicKey: result.publicKey,
      };

      // Forward extension events
      sultan.on('accountChange', (data: any) => {
        this.account = { address: data.address, publicKey: data.publicKey };
        this.emit('accountChange', data);
      });

      sultan.on('disconnect', () => {
        this.disconnect();
      });

      this.emit('connect', this.account);
      return this.account;
    } catch (error) {
      throw new Error(`Extension connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Connect via WalletLink (QR code scanning or deep link)
   * On mobile: uses deep link to open wallet app
   * On desktop: shows QR code for mobile wallet to scan
   */
  private async connectViaWalletLink(): Promise<WalletAccount> {
    // Initialize WalletLink session generator
    const relayUrl = this.options.relayUrl || 'wss://relay.sltn.io';
    this.walletLink = new WalletLinkSessionGenerator(relayUrl);
    const isMobile = SultanWalletSDK.isMobile();

    return new Promise(async (resolve, reject) => {
      try {
        // Create session and get QR data
        const { qrData } = await this.walletLink!.createSession();

        // Generate deep link for mobile-to-mobile
        const deepLink = SultanWalletSDK.generateDeepLink(qrData);

        // Notify callbacks
        this.options.onQRReady?.(qrData);
        this.options.onDeepLinkReady?.(deepLink);

        // Mobile-to-mobile: redirect to wallet app via deep link
        if (isMobile && this.options.autoRedirectMobile !== false) {
          this.renderMobileConnect(qrData, deepLink, this.options.qrContainerId);
          
          // Auto-open wallet after short delay (gives user time to see UI)
          setTimeout(() => {
            window.location.href = deepLink;
          }, 500);
        } else if (this.options.qrContainerId) {
          // Desktop: show QR code
          this.renderQRCode(qrData, this.options.qrContainerId);
        }

        this.options.onWaiting?.();

        // Listen for connection events
        this.walletLink!.on((event: WalletLinkEvent) => {
          if (event.type === 'connected' && event.data?.address) {
            this.connectionMethod = 'walletlink';
            this.account = {
              address: event.data.address,
              publicKey: event.data.publicKey || '',
            };
            this.emit('connect', this.account);
            resolve(this.account);
          } else if (event.type === 'error') {
            reject(new Error(event.data?.message || 'WalletLink connection failed'));
          } else if (event.type === 'disconnected') {
            this.disconnect();
          }
        });

        // Request connection after wallet joins
        await this.walletLink!.requestConnect({
          name: document.title || 'Sultan dApp',
          origin: window.location.origin,
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Render QR code to a container element
   */
  private renderQRCode(data: string, containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`QR container #${containerId} not found`);
      return;
    }

    // Create QR display (basic text for now - could use qrcode library)
    container.innerHTML = `
      <div style="
        background: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        font-family: system-ui, sans-serif;
      ">
        <div style="
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          word-break: break-all;
          font-family: monospace;
          font-size: 10px;
          margin-bottom: 16px;
        ">
          ${data}
        </div>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Scan with Sultan Wallet mobile app
        </p>
        <p style="margin: 8px 0 0; color: #888; font-size: 12px;">
          Open Sultan Wallet → Connect → Scan QR
        </p>
      </div>
    `;

    // For production, use a proper QR code library:
    // import QRCode from 'qrcode';
    // QRCode.toCanvas(document.createElement('canvas'), data, ...);
  }

  /**
   * Render mobile-to-mobile connection UI
   * Shows a button to open the wallet app via deep link
   */
  private renderMobileConnect(qrData: string, deepLink: string, containerId?: string): void {
    const container = containerId ? document.getElementById(containerId) : null;
    if (!container) return;

    container.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 24px;
        border-radius: 16px;
        text-align: center;
        font-family: system-ui, sans-serif;
        color: white;
      ">
        <div style="
          font-size: 48px;
          margin-bottom: 16px;
        ">👛</div>
        
        <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">
          Connect Sultan Wallet
        </h3>
        
        <p style="margin: 0 0 20px; opacity: 0.9; font-size: 14px;">
          Tap the button below to open your wallet and approve the connection
        </p>
        
        <a href="${deepLink}" style="
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 14px 32px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        ">
          Open Sultan Wallet
        </a>
        
        <p style="
          margin: 20px 0 0;
          opacity: 0.7;
          font-size: 12px;
        ">
          Don't have Sultan Wallet?
          <a href="https://wallet.sltn.io" style="color: white; text-decoration: underline;">
            Get it here
          </a>
        </p>
      </div>
    `;

    // Store session data for manual copy if needed
    const sessionDiv = document.createElement('details');
    sessionDiv.style.cssText = 'margin-top: 12px; font-size: 12px; color: #666;';
    sessionDiv.innerHTML = `
      <summary style="cursor: pointer;">Connection not working? Copy manually</summary>
      <div style="
        margin-top: 8px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 8px;
        word-break: break-all;
        font-family: monospace;
        font-size: 10px;
      ">
        ${qrData}
      </div>
      <button onclick="navigator.clipboard.writeText('${qrData}')" style="
        margin-top: 8px;
        padding: 8px 16px;
        background: #e0e0e0;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      ">Copy to clipboard</button>
    `;
    container.appendChild(sessionDiv);
  }

  /**
   * Get connected account
   */
  getAccount(): WalletAccount | null {
    return this.account;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.account !== null;
  }

  /**
   * Get connection method
   */
  getConnectionMethod(): ConnectionMethod {
    return this.connectionMethod;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<{ signature: string }> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    if (this.connectionMethod === 'extension') {
      const sultan = (window as any).sultan;
      return sultan.signMessage(message);
    }

    // WalletLink
    return new Promise((resolve, reject) => {
      this.walletLink!.on((event: WalletLinkEvent) => {
        if (event.type === 'request' && event.data?.approved) {
          resolve({ signature: event.data.signature });
        } else if (event.type === 'request' && !event.data?.approved) {
          reject(new Error(event.data?.error || 'User rejected'));
        }
      });
      
      this.walletLink!.requestSignMessage(message);
    });
  }

  /**
   * Sign a transaction
   */
  async signTransaction(tx: TransactionRequest): Promise<SignedTransaction> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    if (this.connectionMethod === 'extension') {
      const sultan = (window as any).sultan;
      return sultan.signTransaction(tx);
    }

    // WalletLink
    return new Promise((resolve, reject) => {
      this.walletLink!.on((event: WalletLinkEvent) => {
        if (event.type === 'request' && event.data?.approved) {
          resolve({
            transaction: tx,
            signature: event.data.signature,
            publicKey: event.data.publicKey,
            txHash: event.data.txHash,
          });
        } else if (event.type === 'request' && !event.data?.approved) {
          reject(new Error(event.data?.error || 'User rejected'));
        }
      });
      
      this.walletLink!.requestSignTransaction(tx);
    });
  }

  /**
   * Send a transaction (sign and broadcast)
   */
  async sendTransaction(tx: TransactionRequest): Promise<{ txHash: string }> {
    const signed = await this.signTransaction(tx);
    
    if (signed.txHash) {
      return { txHash: signed.txHash };
    }

    // Broadcast if not already done
    // This would call the RPC to broadcast
    throw new Error('Transaction was signed but not broadcast');
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    if (this.connectionMethod === 'extension') {
      const sultan = (window as any).sultan;
      sultan?.disconnect?.();
    } else if (this.walletLink) {
      this.walletLink.disconnect();
      this.walletLink = null;
    }

    this.connectionMethod = 'none';
    this.account = null;
    this.emit('disconnect', null);
  }

  /**
   * Add event listener
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    });
  }
}

// Export singleton for simple usage
export const sultanWallet = new SultanWalletSDK();

// Export types
export type { WalletLinkEvent } from './wallet-link';
