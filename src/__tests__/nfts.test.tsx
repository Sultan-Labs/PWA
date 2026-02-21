/**
 * NFT Gallery Tests
 * 
 * Tests for the NFT Gallery screen and Sultan native NFT integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NFTs from '../screens/NFTs';
import { sultanAPI } from '../api/sultanAPI';

// Mock the hooks
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    currentAccount: {
      address: 'sultan1testaddress12345678901234567890',
      name: 'Test Account',
      index: 0,
      publicKey: 'testpubkey',
    },
  }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

// Mock the API
vi.mock('../api/sultanAPI', () => ({
  sultanAPI: {
    queryNFTs: vi.fn(),
  },
}));

const mockNFTResponse = {
  collections: [
    {
      address: 'sultan1nftcontract123',
      name: 'Sultan Genesis',
      symbol: 'SGEN',
      nfts: [
        {
          tokenId: '1',
          contractAddress: 'sultan1nftcontract123',
          name: 'Sultan #1',
          description: 'The first Sultan NFT',
          image: 'https://example.com/nft1.png',
          collection: 'Sultan Genesis',
          attributes: [
            { trait_type: 'Rarity', value: 'Legendary' },
          ],
        },
        {
          tokenId: '42',
          contractAddress: 'sultan1nftcontract123',
          name: 'Sultan #42',
          description: 'A rare Sultan NFT',
          image: 'https://example.com/nft42.png',
          collection: 'Sultan Genesis',
          attributes: [
            { trait_type: 'Rarity', value: 'Epic' },
          ],
        },
      ],
    },
  ],
};

const renderNFTs = () => {
  return render(
    <BrowserRouter>
      <NFTs />
    </BrowserRouter>
  );
};

describe('NFT Gallery Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    vi.mocked(sultanAPI.queryNFTs).mockImplementation(() => new Promise(() => {}));
    renderNFTs();
    
    expect(screen.getByText('Loading your NFTs...')).toBeInTheDocument();
  });

  it('should show empty state when no NFTs', async () => {
    vi.mocked(sultanAPI.queryNFTs).mockResolvedValue({ collections: [] });
    renderNFTs();
    
    await waitFor(() => {
      expect(screen.getByText('No NFTs Yet')).toBeInTheDocument();
    });
  });

  it('should display NFT collections when available', async () => {
    vi.mocked(sultanAPI.queryNFTs).mockResolvedValue(mockNFTResponse);
    renderNFTs();
    
    await waitFor(() => {
      expect(screen.getByText('Sultan Genesis')).toBeInTheDocument();
      expect(screen.getByText('Sultan #1')).toBeInTheDocument();
      expect(screen.getByText('Sultan #42')).toBeInTheDocument();
    });
  });

  it('should show stats with correct counts', async () => {
    vi.mocked(sultanAPI.queryNFTs).mockResolvedValue(mockNFTResponse);
    renderNFTs();
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total NFTs
      expect(screen.getByText('1')).toBeInTheDocument(); // Collections
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(sultanAPI.queryNFTs).mockRejectedValue(new Error('Network error'));
    renderNFTs();
    
    // Should show empty state, not crash
    await waitFor(() => {
      expect(screen.getByText('No NFTs Yet')).toBeInTheDocument();
    });
  });

  it('should have NFT Gallery in header', async () => {
    vi.mocked(sultanAPI.queryNFTs).mockResolvedValue({ collections: [] });
    renderNFTs();
    
    expect(screen.getByText('NFT Gallery')).toBeInTheDocument();
  });
});

describe('NFT API Integration', () => {
  it('should call queryNFTs with correct address', async () => {
    vi.mocked(sultanAPI.queryNFTs).mockResolvedValue({ collections: [] });
    renderNFTs();
    
    await waitFor(() => {
      expect(sultanAPI.queryNFTs).toHaveBeenCalledWith('sultan1testaddress12345678901234567890');
    });
  });
});
