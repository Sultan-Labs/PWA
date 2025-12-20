/**
 * Receive Screen
 * 
 * Display address with QR code for receiving SLTN.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTheme } from '../hooks/useTheme';
import AddressQR from '../components/AddressQR';
import './Receive.css';

// Premium SVG Icons
const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
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

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function Receive() {
  const navigate = useNavigate();
  const { currentAccount } = useWallet();
  const { theme, setTheme } = useTheme();
  
  const [showCopied, setShowCopied] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleCopyAddress = async () => {
    if (currentAccount?.address) {
      await navigator.clipboard.writeText(currentAccount.address);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (currentAccount?.address && navigator.share) {
      try {
        await navigator.share({
          title: 'My Sultan Wallet Address',
          text: currentAccount.address,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  return (
    <div className="receive-screen">
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <BackIcon />
        </button>
        <h2>Receive SLTN</h2>
        <button className="btn-icon theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <div className="receive-content fade-in">
        <div className="receive-card">
          <p className="text-muted mb-lg">
            Scan this QR code or copy the address below to receive SLTN
          </p>

          <div className="qr-container">
            <AddressQR address={currentAccount?.address || ''} size={200} />
          </div>

          <div className="address-display">
            <span className="address-text">
              {currentAccount?.address || 'No address'}
            </span>
          </div>

          <div className="button-row mt-lg">
            <button 
              className="btn btn-secondary"
              onClick={handleCopyAddress}
            >
              {showCopied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
            </button>
            {'share' in navigator && (
              <button 
                className="btn btn-secondary"
                onClick={handleShare}
              >
                <ShareIcon /> Share
              </button>
            )}
          </div>
        </div>

        <div className="receive-info">
          <h3><AlertIcon /> Important</h3>
          <ul>
            <li>Only send SLTN to this address</li>
            <li>Sending other assets may result in permanent loss</li>
            <li>Double-check the address before sending</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
