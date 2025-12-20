/**
 * Welcome Screen
 * 
 * First screen shown to new users - create or import wallet.
 * Premium design matching the Unlock screen aesthetic.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

// Sultan Crown Logo - uses PNG images, switches based on theme
const SultanLogo = ({ size = 56, isDark }: { size?: number; isDark: boolean }) => (
  <img 
    src={isDark ? "/sultan-logo-dark.png" : "/sultan-logo-light.png"} 
    alt="Sultan" 
    width={size} 
    height={size}
    className="sultan-logo-img"
  />
);

// Premium SVG Icons
const ZapIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const VoteIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
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

export default function Welcome() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check current theme on mount
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setIsDark(currentTheme !== 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('sultan-wallet-theme', newTheme);
    setIsDark(!isDark);
  };

  return (
    <div className="welcome-screen">
      {/* Theme toggle in top right */}
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="welcome-content fade-in">
        <div className="logo-container">
          <div className="sultan-icon">
            <SultanLogo size={56} isDark={isDark} />
          </div>
          <h1>Wallet</h1>
        </div>

        <div className="features-card">
          <div className="feature">
            <div className="feature-icon-wrapper">
              <ZapIcon />
            </div>
            <div className="feature-text">
              <span className="feature-title">Zero Fees</span>
              <span className="feature-desc">No transaction costs, ever</span>
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon-wrapper">
              <TrendingUpIcon />
            </div>
            <div className="feature-text">
              <span className="feature-title">13.33% APY</span>
              <span className="feature-desc">Earn rewards by staking</span>
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon-wrapper">
              <ShieldIcon />
            </div>
            <div className="feature-text">
              <span className="feature-title">Self-Custody</span>
              <span className="feature-desc">You control your keys</span>
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon-wrapper">
              <VoteIcon />
            </div>
            <div className="feature-text">
              <span className="feature-title">Governance</span>
              <span className="feature-desc">Vote on network proposals</span>
            </div>
          </div>
        </div>

        <div className="button-group">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/create')}
          >
            Create New Wallet
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/import')}
          >
            Import Existing Wallet
          </button>
        </div>

        <p className="version">
          v1.0.0 • Sultan Chain
        </p>
      </div>
    </div>
  );
}
