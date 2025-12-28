/**
 * Become Validator Screen
 * 
 * Premium flow for setting up a validator node.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTheme } from '../hooks/useTheme';
import { useBalance } from '../hooks/useBalance';
import { SultanWallet } from '../core/wallet';
import { sultanAPI } from '../api/sultanAPI';
import { validateAddress, validateAmount } from '../core/security';
import BackgroundAnimation from '../components/BackgroundAnimation';
import './BecomeValidator.css';

// --- Icons ---

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

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

type Step = 'overview' | 'server' | 'address' | 'fund';

export default function BecomeValidator() {
  const navigate = useNavigate();
  const { wallet, currentAccount, lock } = useWallet();
  const { theme, setTheme } = useTheme();
  const { data: balanceData, refetch: refetchBalance } = useBalance(currentAccount?.address);
  
  const [step, setStep] = useState<Step>('overview');
  const [validatorAddress, setValidatorAddress] = useState('');
  const [moniker, setMoniker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLock = () => {
    lock();
    navigate('/unlock');
  };

  const availableBalance = SultanWallet.formatSLTN(balanceData?.available || '0');
  const hasMinimumStake = parseFloat(availableBalance) >= 10000;

  const handleCopyCommand = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFundValidator = async () => {
    if (!wallet || !currentAccount) return;

    const addrValidation = validateAddress(validatorAddress);
    if (!addrValidation.valid) {
      setError(addrValidation.error || 'Invalid validator address');
      return;
    }

    const amount = '10000';
    const amountValidation = validateAmount(amount, availableBalance);
    if (!amountValidation.valid) {
      setError(amountValidation.error || 'Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const atomicAmount = SultanWallet.parseSLTN(amount);
      
      // Fetch current nonce from blockchain BEFORE signing
      const currentNonce = await sultanAPI.getNonce(currentAccount.address);
      
      const txData = {
        type: 'fund_validator' as const,
        from: currentAccount.address,
        to: validatorAddress,
        amount: atomicAmount,
        moniker: moniker.trim() || 'Sultan Validator',
        nonce: currentNonce,
        timestamp: Date.now(),
      };

      const signature = await wallet.signTransaction(txData, currentAccount.index);
      
      await sultanAPI.broadcastTransaction({
        from: currentAccount.address,
        to: validatorAddress,
        amount: atomicAmount,
        memo: `validator:${moniker.trim() || 'Sultan Validator'}`,
        nonce: currentNonce,
        timestamp: Date.now(),
        signature,
        publicKey: currentAccount.publicKey,
      });

      setSuccess(`🎉 Validator funded! Auto-registration in progress.`);
      refetchBalance();
      
      setTimeout(() => {
        navigate('/stake');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fund validator');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 'overview', label: 'Start' },
    { id: 'server', label: 'Setup Server' },
    { id: 'address', label: 'Link Address' },
    { id: 'fund', label: 'Fund' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="validator-screen">
      <BackgroundAnimation />
      <header className="screen-header">
        <button className="btn-back" onClick={() => step === 'overview' ? navigate('/stake') : setStep('overview')}>
          <BackIcon />
        </button>
        <h2>Become Validator</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="btn-icon" onClick={() => navigate('/settings')} title="Settings">
            <SettingsIcon />
          </button>
          <button className="btn-icon" onClick={handleLock} title="Lock Wallet">
            <LockIcon />
          </button>
        </div>
      </header>

      <div className="validator-content fade-in">
        
        {/* Step Progress Bar */}
        <div className="steps-progress">
          {steps.map((s, index) => (
            <div 
              key={s.id} 
              className={`step-item ${index <= currentStepIndex ? 'active' : ''}`}
            >
              <div className="step-bar"></div>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {step === 'overview' && (
          <div className="overview-section">
            <div className="hero-card">
              <h3>Run a Full Node</h3>
              <p>Earn ~13.33% APY + Commission</p>
            </div>

            <div className="requirements-grid">
              <div className="req-card">
                <span className="req-label">Stake Required</span>
                <span className="req-val">10,000 SLTN</span>
              </div>
              <div className="req-card">
                <span className="req-label">Server Cost</span>
                <span className="req-val">~$5/month</span>
              </div>
              <div className="req-card">
                <span className="req-label">Difficulty</span>
                <span className="req-val">Medium</span>
              </div>
            </div>

            <div className="balance-check-card">
              <div className="balance-row">
                <span>Your Balance:</span>
                <span className={hasMinimumStake ? 'text-success' : 'text-error'}>
                  {availableBalance} SLTN
                </span>
              </div>
              {!hasMinimumStake && (
                <p className="balance-note">You need 10,000 SLTN to start.</p>
              )}
            </div>

            <button 
              className="btn btn-primary btn-large"
              disabled={!hasMinimumStake}
              onClick={() => setStep('server')}
            >
              Get Started
            </button>
          </div>
        )}

        {step === 'server' && (
          <div className="step-section">
            <h3>1. Server Setup</h3>
            <p className="text-muted">Rent a VPS (Ubuntu 22.04) and run this command:</p>
            
            <div className="code-block">
              <pre>
curl -L https://get.sultan.network/node | bash
              </pre>
              <button className="copy-btn" onClick={() => handleCopyCommand('curl -L https://get.sultan.network/node | bash')}>
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>

            <div className="info-box">
              <p>This script will install the node, sync headers, and generate your validator keys.</p>
            </div>

            <button className="btn btn-primary btn-full" onClick={() => setStep('address')}>
              I've installed the node
            </button>
          </div>
        )}

        {step === 'address' && (
          <div className="step-section">
            <h3>2. Link Validator</h3>
            <p className="text-muted">Enter the address generated by your node:</p>
            
            <div className="input-group">
              <label>Validator Address</label>
              <input 
                type="text" 
                className="input" 
                placeholder="sltn1..."
                value={validatorAddress}
                onChange={(e) => setValidatorAddress(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Moniker (Name)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="My Node"
                value={moniker}
                onChange={(e) => setMoniker(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-primary btn-full"
              disabled={!validatorAddress.startsWith('sltn1')} 
              onClick={() => setStep('fund')}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'fund' && (
          <div className="step-section">
            <h3>3. Fund Validator</h3>
            <p className="text-muted">Send the initial stake to activate your node.</p>

            <div className="summary-card">
              <div className="summary-row">
                <span>To Validator</span>
                <span className="mono">{validatorAddress.slice(0, 10)}...</span>
              </div>
              <div className="summary-row highlight">
                <span>Amount</span>
                <span>10,000 SLTN</span>
              </div>
            </div>

            {error && <p className="text-error">{error}</p>}
            {success && <p className="text-success">{success}</p>}

            <button 
              className="btn btn-primary btn-full"
              disabled={isLoading}
              onClick={handleFundValidator}
            >
              {isLoading ? 'Processing...' : 'Fund & Activate Node'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
