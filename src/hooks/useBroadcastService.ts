/**
 * React hook for the Wallet BroadcastChannel Service
 * 
 * Manages the BroadcastChannel service that allows dApps in other
 * browser tabs to communicate with the PWA wallet. Handles incoming
 * requests and exposes them to the wallet UI for user approval.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from './useWallet';
import {
  getWalletBroadcastService,
  WalletBroadcastService,
  PWAApprovalRequest,
  PWAConnectedApp,
} from '../core/wallet-broadcast';
import { PWAMessageType } from '../core/pwa-provider';
import { getBalance, getStakingInfo } from '../api/sultanAPI';

export interface UseBroadcastServiceReturn {
  // State  
  isActive: boolean;
  connectedApps: PWAConnectedApp[];
  pendingApprovals: PWAApprovalRequest[];
  
  // Actions
  approveRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string, reason?: string) => void;
  disconnectApp: (origin: string) => void;
  disconnectAll: () => void;
}

export function useBroadcastService(): UseBroadcastServiceReturn {
  const { wallet, currentAccount, isLocked, isInitialized } = useWallet();
  const serviceRef = useRef<WalletBroadcastService | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [connectedApps, setConnectedApps] = useState<PWAConnectedApp[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PWAApprovalRequest[]>([]);

  // Initialize broadcast service when wallet is ready
  useEffect(() => {
    if (!isInitialized || isLocked || !wallet || !currentAccount) {
      return;
    }

    const service = getWalletBroadcastService();
    serviceRef.current = service;

    // Start service with wallet callbacks
    service.start({
      getAddress: async () => currentAccount.address,
      getPublicKey: async () => currentAccount.publicKey,
      getBalance: async () => {
        try {
          const balanceResult = await getBalance(currentAccount.address);
          let staked = '0';
          let rewards = '0';
          try {
            const stakingResult = await getStakingInfo(currentAccount.address);
            staked = stakingResult.staked || '0';
            rewards = stakingResult.pendingRewards || '0';
          } catch {
            // Staking info may not be available
          }
          return {
            available: balanceResult.available || balanceResult.balance || '0',
            staked,
            rewards,
          };
        } catch {
          return { available: '0', staked: '0', rewards: '0' };
        }
      },
    });

    setIsActive(true);
    setConnectedApps(service.getConnectedApps());
    setPendingApprovals(service.getPendingApprovals());

    // Subscribe to new approval requests
    const unsubApproval = service.onApproval(() => {
      setPendingApprovals(service.getPendingApprovals());
    });

    // Subscribe to connection changes
    const unsubConnection = service.onConnectionChange((apps) => {
      setConnectedApps(apps);
    });

    return () => {
      unsubApproval();
      unsubConnection();
      // Don't stop the service on unmount - we want it to keep running
      // while the wallet tab is open. Only stop it explicitly.
    };
  }, [isInitialized, isLocked, wallet, currentAccount]);

  // Notify account changes to connected dApps
  useEffect(() => {
    if (serviceRef.current && currentAccount) {
      serviceRef.current.notifyAccountChange(
        currentAccount.address,
        currentAccount.publicKey
      );
    }
  }, [currentAccount?.address]);

  const approveRequest = useCallback(async (requestId: string) => {
    const service = serviceRef.current;
    if (!service || !wallet || !currentAccount) {
      throw new Error('Wallet not ready');
    }

    const request = service.getPendingApprovals().find(r => r.id === requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    let result: any;

    switch (request.type) {
      case PWAMessageType.CONNECT:
        result = {
          address: currentAccount.address,
          publicKey: currentAccount.publicKey,
        };
        break;

      case PWAMessageType.SIGN_MESSAGE: {
        const message = request.payload?.message;
        if (!message) throw new Error('No message to sign');
        const signature = await wallet.signMessage(
          currentAccount.index,
          message
        );
        result = {
          signature,
          publicKey: currentAccount.publicKey,
        };
        break;
      }

      case PWAMessageType.SIGN_TRANSACTION: {
        const tx = request.payload?.transaction;
        if (!tx) throw new Error('No transaction to sign');
        const signature = await wallet.signTransaction(
          tx,
          currentAccount.index
        );
        result = {
          signature,
          publicKey: currentAccount.publicKey,
          transaction: tx,
        };
        break;
      }

      case PWAMessageType.SEND_TRANSACTION: {
        const tx = request.payload?.transaction;
        if (!tx) throw new Error('No transaction to send');
        const signature = await wallet.signTransaction(
          tx,
          currentAccount.index
        );
        // Import broadcastTransaction dynamically to avoid circular deps
        const { broadcastTransaction } = await import('../api/sultanAPI');
        try {
          const broadcastResult = await broadcastTransaction({
            transaction: {
              from: tx.from || currentAccount.address,
              to: tx.to,
              amount: tx.amount,
              memo: tx.memo,
              nonce: tx.nonce,
              timestamp: tx.timestamp,
            },
            signature,
            publicKey: currentAccount.publicKey,
          });
          result = {
            txHash: broadcastResult.hash,
            signature,
            publicKey: currentAccount.publicKey,
          };
        } catch (broadcastError) {
          result = {
            signature,
            publicKey: currentAccount.publicKey,
            broadcastError: broadcastError instanceof Error 
              ? broadcastError.message 
              : 'Broadcast failed',
          };
        }
        break;
      }

      case PWAMessageType.ADD_TOKEN:
        // Accept token additions 
        result = { success: true };
        break;

      default:
        throw new Error(`Unsupported request type: ${request.type}`);
    }

    service.approveRequest(requestId, result);
    setPendingApprovals(service.getPendingApprovals());
  }, [wallet, currentAccount]);

  const rejectRequest = useCallback((requestId: string, reason?: string) => {
    const service = serviceRef.current;
    if (!service) return;

    service.rejectRequest(requestId, reason);
    setPendingApprovals(service.getPendingApprovals());
  }, []);

  const disconnectApp = useCallback((origin: string) => {
    serviceRef.current?.disconnectApp(origin);
    setConnectedApps(serviceRef.current?.getConnectedApps() || []);
  }, []);

  const disconnectAll = useCallback(() => {
    serviceRef.current?.disconnectAll();
    setConnectedApps([]);
  }, []);

  return {
    isActive,
    connectedApps,
    pendingApprovals,
    approveRequest,
    rejectRequest,
    disconnectApp,
    disconnectAll,
  };
}
