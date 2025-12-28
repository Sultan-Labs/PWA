/**
 * Dashboard Screen
 * 
 * Main wallet view with balance and quick actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTheme } from '../hooks/useTheme';
import { useBalance, useStakingInfo, useTransactions } from '../hooks/useBalance';
import { SultanWallet } from '../core/wallet';
import { hapticFeedback } from '../utils/haptics';
import BackgroundAnimation from '../components/BackgroundAnimation';
import BookmarkReminder from '../components/BookmarkReminder';
import './Dashboard.css';

// Premium SVG Icons - matching Welcome screen style
const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const ReceiveIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const StakeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NFTIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const SwapIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);


const GovernanceIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { lock, currentAccount } = useWallet();
  const { theme, setTheme } = useTheme();
  const { data: balanceData, isLoading: balanceLoading } = useBalance(currentAccount?.address);
  const { data: stakingData, isLoading: stakingLoading } = useStakingInfo(currentAccount?.address);
  const { data: transactions, isLoading: txLoading } = useTransactions(currentAccount?.address, 3);
  
  const [showCopied, setShowCopied] = useState(false);

  const toggleTheme = () => {
    hapticFeedback.soft();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleCopyAddress = async () => {
    if (currentAccount?.address) {
      hapticFeedback.success();
      await navigator.clipboard.writeText(currentAccount.address);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleLock = () => {
    hapticFeedback.medium();
    lock();
    navigate('/unlock');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 12)}...${address.slice(-8)}`;
  };

  const formatBalance = (atomicBalance: string | undefined) => {
    if (!atomicBalance) return '0.00';
    return SultanWallet.formatSLTN(atomicBalance);
  };

  const totalBalance = Number(formatBalance(balanceData?.available)) + 
                       Number(formatBalance(stakingData?.staked));

  return (
    <div className="dashboard-screen">
      <BackgroundAnimation />
      <BookmarkReminder context="dashboard" delay={5000} />
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <div className="account-selector">
            <span className="account-name">{currentAccount?.name || 'Account 1'}</span>
            <span className="account-address" onClick={handleCopyAddress}>
              {currentAccount?.address ? formatAddress(currentAccount.address) : '...'}
              {showCopied && <span className="copied-badge">Copied!</span>}
            </span>
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon theme-toggle" onClick={toggleTheme} title="Toggle theme" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="btn-icon" onClick={() => navigate('/settings')} title="Settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon />
          </button>
          <button className="btn-icon" onClick={handleLock} title="Lock Wallet" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LockIcon />
          </button>
        </div>
      </header>

      <main className="dashboard-main fade-in">
        <div className="balance-card">
          <span className="balance-label">Total Balance</span>
          <h1 className="balance-amount">
            {balanceLoading || stakingLoading ? (
              <span className="loading-shimmer">Loading...</span>
            ) : (
              <>
                {totalBalance.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 4 
                })}
                <span className="balance-currency"> SLTN</span>
              </>
            )}
          </h1>
          
          <div className="balance-breakdown">
            <div className="breakdown-item">
              <span>Available</span>
              <span>{formatBalance(balanceData?.available)} SLTN</span>
            </div>
            <div className="breakdown-item">
              <span>Staked</span>
              <span>{formatBalance(stakingData?.staked)} SLTN</span>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <button className="action-btn" onClick={() => { hapticFeedback.soft(); navigate('/send'); }}>
            <span className="action-icon"><SendIcon /></span>
            <span>Send</span>
          </button>
          <button className="action-btn" onClick={() => { hapticFeedback.soft(); navigate('/receive'); }}>
            <span className="action-icon"><ReceiveIcon /></span>
            <span>Receive</span>
          </button>
          <button className="action-btn" onClick={() => { hapticFeedback.soft(); navigate('/stake'); }}>
            <span className="action-icon"><StakeIcon /></span>
            <span>Stake</span>
          </button>
          <button className="action-btn" onClick={() => { hapticFeedback.soft(); navigate('/governance'); }}>
            <span className="action-icon"><GovernanceIcon /></span>
            <span>Governance</span>
          </button>
          <button className="action-btn" onClick={() => { hapticFeedback.soft(); navigate('/nfts'); }}>
            <span className="action-icon"><NFTIcon /></span>
            <span>NFTs</span>
          </button>
        </div>

        <div className="dex-banner" onClick={() => window.open('https://hodlholdings.com', '_blank')}>
          <div className="dex-banner-content">
            <SwapIcon />
            <div className="dex-banner-text">
              <span className="dex-title">Trade on HODL Holdings</span>
              <span className="dex-subtitle">Zero-fee P2P trading</span>
            </div>
          </div>
          <span className="dex-arrow">→</span>
        </div>

        {stakingData && stakingData.staked !== '0' && (
          <div className="staking-summary">
            <h3>Earn</h3>
            <div className="staking-info">
              <div className="staking-stat">
                <span className="stat-label">APY</span>
                <span className="stat-value accent">13.33%</span>
              </div>
              <div className="staking-stat">
                <span className="stat-label">Pending Rewards</span>
                <span className="stat-value">{formatBalance(stakingData.pendingRewards)} SLTN</span>
              </div>
            </div>
          </div>
        )}

        <div className="activity-section">
          <div className="section-header">
            <h3>Recent Activity</h3>
            <button className="btn-link" onClick={() => navigate('/activity')}>
              See All
            </button>
          </div>
          {txLoading ? (
            <div className="empty-activity">
              <div className="spinner"></div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="recent-transactions">
              {transactions.map((tx) => {
                const isSent = tx.from === currentAccount?.address;
                return (
                  <div key={tx.hash} className="tx-preview">
                    <span className={`tx-icon ${isSent ? 'sent' : 'received'}`}>
                      {isSent ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </span>
                    <div className="tx-details">
                      <span className="tx-type">{isSent ? 'Sent' : 'Received'}</span>
                      <span className="tx-address">
                        {isSent ? tx.to.slice(0, 10) + '...' : tx.from.slice(0, 10) + '...'}
                      </span>
                    </div>
                    <span className={`tx-amount ${isSent ? 'sent' : 'received'}`}>
                      {isSent ? '-' : '+'}{formatBalance(tx.amount)} SLTN
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-activity">
              <p className="text-muted">No recent transactions</p>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
