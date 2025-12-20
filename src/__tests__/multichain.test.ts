/**
 * Multi-chain Address Detection Tests
 * 
 * Verifies that the wallet correctly detects and validates
 * addresses for Sultan, Ethereum, Bitcoin, Solana, and TON chains.
 */

import { describe, it, expect } from 'vitest';
import { 
  detectChainFromAddress, 
  validateAddress, 
  getChainInfo,
  validateSultanOnlyAddress,
  ChainType 
} from '../core/security';

describe('Multi-chain Address Detection', () => {
  describe('detectChainFromAddress', () => {
    it('should detect Sultan chain addresses', () => {
      expect(detectChainFromAddress('sultan1qpzry9x8gf2tvdw0s3jn54khce6mua7lz')).toBe('sultan');
      expect(detectChainFromAddress('sultan1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq')).toBe('sultan');
    });

    it('should detect Ethereum addresses', () => {
      expect(detectChainFromAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f8e2D0')).toBe('ethereum');
      expect(detectChainFromAddress('0x0000000000000000000000000000000000000000')).toBe('ethereum');
    });

    it('should detect Bitcoin addresses', () => {
      // Native SegWit (bc1)
      expect(detectChainFromAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe('bitcoin');
      // Legacy P2PKH (starts with 1)
      expect(detectChainFromAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('bitcoin');
      // P2SH (starts with 3)
      expect(detectChainFromAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe('bitcoin');
    });

    it('should detect Solana addresses', () => {
      expect(detectChainFromAddress('7EFvUvMvuqVGXpTPCHQJeXwkvGHKiYxdHk6bVPWfWS8m')).toBe('solana');
      expect(detectChainFromAddress('So11111111111111111111111111111111111111112')).toBe('solana');
    });

    it('should detect TON addresses', () => {
      expect(detectChainFromAddress('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2')).toBe('ton');
      expect(detectChainFromAddress('UQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2')).toBe('ton');
    });

    it('should return null for invalid/unknown addresses', () => {
      expect(detectChainFromAddress('')).toBeNull();
      expect(detectChainFromAddress('invalid_address')).toBeNull();
      expect(detectChainFromAddress('cosmos1...')).toBeNull();
      expect(detectChainFromAddress('12345')).toBeNull();
    });
  });

  describe('validateAddress', () => {
    it('should validate Sultan addresses correctly', () => {
      const result = validateAddress('sultan1qpzry9x8gf2tvdw0s3jn54khce6mua7lz');
      expect(result.valid).toBe(true);
      expect(result.chain).toBe('sultan');
      expect(result.chainName).toBe('Sultan Chain');
    });

    it('should validate Ethereum addresses correctly', () => {
      const result = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f8e2D0');
      expect(result.valid).toBe(true);
      expect(result.chain).toBe('ethereum');
      expect(result.chainName).toBe('Ethereum');
      expect(result.wrappedToken).toBe('sETH');
    });

    it('should validate Bitcoin bc1 addresses correctly', () => {
      const result = validateAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
      expect(result.valid).toBe(true);
      expect(result.chain).toBe('bitcoin');
      expect(result.chainName).toBe('Bitcoin');
      expect(result.wrappedToken).toBe('sBTC');
    });

    it('should validate Solana addresses correctly', () => {
      const result = validateAddress('7EFvUvMvuqVGXpTPCHQJeXwkvGHKiYxdHk6bVPWfWS8m');
      expect(result.valid).toBe(true);
      expect(result.chain).toBe('solana');
      expect(result.chainName).toBe('Solana');
      expect(result.wrappedToken).toBe('sSOL');
    });

    it('should validate TON addresses correctly', () => {
      const result = validateAddress('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2');
      expect(result.valid).toBe(true);
      expect(result.chain).toBe('ton');
      expect(result.chainName).toBe('TON');
      expect(result.wrappedToken).toBe('sTON');
    });

    it('should reject invalid addresses with helpful error messages', () => {
      const result = validateAddress('invalid_address_here');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown address format');
      expect(result.error).toContain('Supported');
    });

    it('should reject empty addresses', () => {
      const result = validateAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address is required');
    });

    it('should reject short Sultan addresses', () => {
      const result = validateAddress('sultan1abc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Sultan address length');
    });
  });

  describe('getChainInfo', () => {
    const chains: ChainType[] = ['sultan', 'ethereum', 'bitcoin', 'solana', 'ton'];
    
    it.each(chains)('should return valid info for %s', (chain) => {
      const info = getChainInfo(chain);
      expect(info.name).toBeDefined();
      expect(info.symbol).toBeDefined();
      expect(info.wrappedToken).toBeDefined();
    });

    it('should have correct wrapped tokens for bridges', () => {
      expect(getChainInfo('ethereum').wrappedToken).toBe('sETH');
      expect(getChainInfo('bitcoin').wrappedToken).toBe('sBTC');
      expect(getChainInfo('solana').wrappedToken).toBe('sSOL');
      expect(getChainInfo('ton').wrappedToken).toBe('sTON');
      expect(getChainInfo('sultan').wrappedToken).toBe('SLTN');
    });
  });
});

describe('Cross-chain Transaction Flow', () => {
  it('should identify cross-chain transfers correctly', () => {
    // Native transfer (sultan to sultan)
    const sultanResult = validateAddress('sultan1qpzry9x8gf2tvdw0s3jn54khce6mua7lz');
    expect(sultanResult.chain).toBe('sultan');
    
    // Cross-chain transfers should be flagged
    const ethResult = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f8e2D0');
    expect(ethResult.chain).not.toBe('sultan');
    expect(ethResult.wrappedToken).toBe('sETH');
    
    const btcResult = validateAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
    expect(btcResult.chain).not.toBe('sultan');
    expect(btcResult.wrappedToken).toBe('sBTC');
  });
});

describe('Sultan-Only Wallet Validation', () => {
  it('should accept valid sultan1 addresses', () => {
    const result = validateSultanOnlyAddress('sultan1qpzry9x8gf2tvdw0s3jn54khce6mua7lz');
    expect(result.valid).toBe(true);
  });

  it('should reject Ethereum addresses (wallet is Sultan-only)', () => {
    const result = validateSultanOnlyAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f8e2D0');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sultan1');
  });

  it('should reject Bitcoin addresses (wallet is Sultan-only)', () => {
    const result = validateSultanOnlyAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sultan1');
  });

  it('should reject Solana addresses (wallet is Sultan-only)', () => {
    const result = validateSultanOnlyAddress('7EFvUvMvuqVGXpTPCHQJeXwkvGHKiYxdHk6bVPWfWS8m');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sultan1');
  });

  it('should reject empty addresses', () => {
    const result = validateSultanOnlyAddress('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Address is required');
  });

  it('should validate bech32 format for Sultan addresses', () => {
    // Valid Sultan address format
    const validResult = validateSultanOnlyAddress('sultan1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    expect(validResult.valid).toBe(true);
    
    // Invalid - too short
    const shortResult = validateSultanOnlyAddress('sultan1abc');
    expect(shortResult.valid).toBe(false);
    
    // Invalid - contains invalid chars
    const invalidCharsResult = validateSultanOnlyAddress('sultan1ABCD123');
    expect(invalidCharsResult.valid).toBe(false);
  });
});
