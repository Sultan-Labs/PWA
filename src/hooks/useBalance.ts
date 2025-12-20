/**
 * Balance Hook
 * 
 * Fetches and caches balance data using React Query.
 */

import { useQuery } from '@tanstack/react-query';
import { getBalance, getStakingInfo, getValidators, getTransactions, getNetworkStatus, AccountBalance, StakingInfo, Validator, Transaction, NetworkStatus } from '../api/sultanAPI';

/**
 * Get balance for a specific address (or active account if not provided)
 */
export function useBalance(address?: string) {
  return useQuery<AccountBalance>({
    queryKey: ['balance', address],
    queryFn: () => getBalance(address!),
    enabled: !!address,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

/**
 * Get staking info for a specific address
 */
export function useStakingInfo(address?: string) {
  return useQuery<StakingInfo>({
    queryKey: ['staking', address],
    queryFn: () => getStakingInfo(address!),
    enabled: !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
}

/**
 * Alias for useStakingInfo
 */
export const useStaking = useStakingInfo;

/**
 * Get list of validators
 */
export function useValidators() {
  return useQuery<Validator[]>({
    queryKey: ['validators'],
    queryFn: () => getValidators(),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

/**
 * Get transaction history for an address
 */
export function useTransactions(address?: string, limit = 50) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', address, limit],
    queryFn: () => getTransactions(address!, limit),
    enabled: !!address,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  });
}

/**
 * Get network status
 */
export function useNetworkStatus() {
  return useQuery<NetworkStatus>({
    queryKey: ['networkStatus'],
    queryFn: () => getNetworkStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
}
