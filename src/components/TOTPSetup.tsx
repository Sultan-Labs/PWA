/**
 * TOTP Setup Component
 * 
 * Handles 2FA setup flow:
 * 1. Generate secret & show QR code
 * 2. User scans with authenticator app
 * 3. User verifies with code from app
 * 4. Show backup codes
 */

import { useState, useEffect } from 'react';
import {
  generateTOTPUrl,
  enable2FA,
  disable2FA,
  is2FAEnabled,
  verify2FA,
  load2FAState,
  generateBackupCodes,
  save2FAState,
} from '../core/totp';
import './TOTPSetup.css';

interface TOTPSetupProps {
  accountName: string; // Usually the wallet address
  onClose: () => void;
}

type SetupStep = 'intro' | 'scan' | 'verify' | 'backup' | 'complete' | 'disable';

export default function TOTPSetup({ accountName, onClose }: TOTPSetupProps) {
  const [step, setStep] = useState<SetupStep>(is2FAEnabled() ? 'disable' : 'intro');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Generate QR code when secret changes
  useEffect(() => {
    if (secret && step === 'scan') {
      const url = generateTOTPUrl(secret, accountName);
      // Generate QR code using a simple SVG-based approach
      generateQRCode(url).then(setQrDataUrl);
    }
  }, [secret, accountName, step]);

  const handleStartSetup = () => {
    const result = enable2FA();
    setSecret(result.secret);
    setBackupCodes(result.backupCodes);
    setStep('scan');
  };

  const handleVerify = async () => {
    setError('');
    setIsVerifying(true);

    try {
      const isValid = await verify2FA(verifyCode);
      if (isValid) {
        setStep('backup');
      } else {
        setError('Invalid code. Please try again.');
        setVerifyCode('');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = () => {
    disable2FA();
    onClose();
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleRegenerateBackupCodes = () => {
    const state = load2FAState();
    if (state) {
      const newCodes = generateBackupCodes();
      state.backupCodes = newCodes;
      save2FAState(state);
      setBackupCodes(newCodes);
    }
  };

  const formatSecret = (s: string) => {
    // Split into groups of 4 for readability
    return s.match(/.{1,4}/g)?.join(' ') ?? s;
  };

  return (
    <div className="totp-setup">
      {/* Introduction Step */}
      {step === 'intro' && (
        <div className="totp-step fade-in">
          <div className="totp-icon-wrapper">
            <div className="totp-icon">🔐</div>
          </div>
          <h3>Two-Factor Authentication</h3>
          <p className="text-muted mb-md">
            Add an extra layer of security using an authenticator app.
          </p>
          <div className="totp-benefits">
            <div className="benefit-item">
              <div className="benefit-icon-circle">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Login verification only</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-circle">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Works offline</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-circle">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Recovery codes included</span>
            </div>
          </div>
          <p className="totp-apps-hint">
            Compatible with Google Authenticator, Authy, 1Password
          </p>
          <button className="btn btn-primary mt-md" onClick={handleStartSetup}>
            Set Up 2FA
          </button>
          <button className="btn btn-secondary mt-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}

      {/* Scan QR Code Step */}
      {step === 'scan' && (
        <div className="totp-step fade-in">
          <h3>Scan QR Code</h3>
          <p className="text-muted mb-md">
            Open your authenticator app and scan this QR code:
          </p>
          
          <div className="qr-container">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="TOTP QR Code" className="qr-code" />
            ) : (
              <div className="qr-placeholder">
                <div className="spinner" />
              </div>
            )}
          </div>

          <div className="manual-entry">
            <p className="text-muted text-sm">Can't scan? Enter this code manually:</p>
            <code className="secret-code">{formatSecret(secret)}</code>
          </div>

          <button className="btn btn-primary" onClick={() => setStep('verify')}>
            Next: Verify Code
          </button>
        </div>
      )}

      {/* Verify Step */}
      {step === 'verify' && (
        <div className="totp-step fade-in">
          <h3>Verify Setup</h3>
          <p className="text-muted mb-md">
            Enter the 6-digit code from your authenticator app:
          </p>
          
          <input
            type="text"
            className="totp-input"
            value={verifyCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerifyCode(val);
            }}
            placeholder="000000"
            maxLength={6}
            autoFocus
          />

          {error && <p className="text-error mt-sm">{error}</p>}

          <button 
            className="btn btn-primary mt-md"
            onClick={handleVerify}
            disabled={verifyCode.length !== 6 || isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify & Enable'}
          </button>
          <button 
            className="btn btn-secondary mt-sm"
            onClick={() => setStep('scan')}
          >
            Back
          </button>
        </div>
      )}

      {/* Backup Codes Step */}
      {step === 'backup' && (
        <div className="totp-step fade-in">
          <h3>Save Backup Codes</h3>
          <p className="text-muted mb-md">
            Save these codes somewhere safe. Use them to access your wallet if you lose your authenticator.
          </p>
          
          <div className="backup-codes-grid">
            {backupCodes.map((code, i) => (
              <div key={i} className="backup-code">{code}</div>
            ))}
          </div>

          <div className="backup-actions">
            <button className="btn btn-secondary" onClick={handleCopyBackupCodes}>
              {copiedBackup ? '✓ Copied!' : '📋 Copy All'}
            </button>
          </div>

          <div className="warning-box mt-md">
            ⚠️ Each code can only be used once. Store them securely!
          </div>

          <button className="btn btn-primary mt-md" onClick={() => setStep('complete')}>
            I've Saved My Codes
          </button>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="totp-step fade-in">
          <div className="totp-icon success">✓</div>
          <h3>2FA Enabled!</h3>
          <p className="text-muted mb-md">
            Your wallet is now protected with two-factor authentication.
          </p>
          <p className="text-muted text-sm mb-lg">
            You'll need your authenticator code when logging in.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      )}

      {/* Disable 2FA Step */}
      {step === 'disable' && (
        <div className="totp-step fade-in">
          <div className="totp-icon">🔐</div>
          <h3>2FA is Enabled</h3>
          <p className="text-muted mb-md">
            Two-factor authentication is currently active on your wallet.
          </p>
          
          <div className="totp-status">
            <div className="status-item">
              <span className="status-label">Status</span>
              <span className="status-value enabled">Enabled</span>
            </div>
            <div className="status-item">
              <span className="status-label">Backup Codes</span>
              <span className="status-value">{load2FAState()?.backupCodes.length ?? 0} remaining</span>
            </div>
          </div>

          <button 
            className="btn btn-secondary mb-sm"
            onClick={handleRegenerateBackupCodes}
          >
            Regenerate Backup Codes
          </button>
          <button className="btn btn-danger" onClick={handleDisable}>
            Disable 2FA
          </button>
          <button className="btn btn-secondary mt-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Generate QR code as data URL using the qrcode library
 */
async function generateQRCode(data: string): Promise<string> {
  try {
    // Dynamic import to keep bundle smaller
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch {
    // Fallback to placeholder if QR generation fails
    return generateQRCodePlaceholder();
  }
}

/**
 * Placeholder SVG if QR code generation fails
 */
function generateQRCodePlaceholder(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#ffffff"/>
      <rect x="20" y="20" width="160" height="160" fill="none" stroke="#00d4aa" stroke-width="4" stroke-dasharray="10,5"/>
      <text x="100" y="90" text-anchor="middle" font-family="system-ui" font-size="14" fill="#666">
        Scan with
      </text>
      <text x="100" y="110" text-anchor="middle" font-family="system-ui" font-size="14" fill="#666">
        Authenticator App
      </text>
      <text x="100" y="140" text-anchor="middle" font-family="system-ui" font-size="11" fill="#999">
        or enter code manually
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
