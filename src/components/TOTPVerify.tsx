/**
 * TOTP Verification Component
 * 
 * Used on the unlock screen when 2FA is enabled.
 * Shows after PIN is verified.
 */

import { useState, useRef, useEffect } from 'react';
import { verify2FA, getRemainingBackupCodes } from '../core/totp';
import './TOTPVerify.css';

interface TOTPVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TOTPVerify({ onSuccess, onCancel }: TOTPVerifyProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showBackupOption, setShowBackupOption] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [showBackupOption]);

  const handleVerify = async () => {
    if (code.length < 6) return;
    
    setError('');
    setIsVerifying(true);

    try {
      const isValid = await verify2FA(code);
      if (isValid) {
        onSuccess();
      } else {
        setError('Invalid code. Please try again.');
        setCode('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = showBackupOption 
      ? e.target.value.toUpperCase().slice(0, 9) // Backup codes are 8 chars + dash
      : e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const remainingBackupCodes = getRemainingBackupCodes();

  return (
    <div className="totp-verify fade-in">
      <div className="totp-verify-icon">🔐</div>
      
      <h2>Two-Factor Authentication</h2>
      
      {!showBackupOption ? (
        <>
          <p className="text-muted mb-md">
            Enter the 6-digit code from your authenticator app
          </p>
          
          <input
            ref={inputRef}
            type="text"
            className="totp-verify-input"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </>
      ) : (
        <>
          <p className="text-muted mb-md">
            Enter one of your backup codes
          </p>
          
          <input
            ref={inputRef}
            type="text"
            className="totp-verify-input backup"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="XXXX-XXXX"
            maxLength={9}
            autoComplete="off"
          />
          
          <p className="text-muted text-sm mt-sm">
            {remainingBackupCodes} backup codes remaining
          </p>
        </>
      )}

      {error && <p className="text-error mt-sm">{error}</p>}

      <button
        className="btn btn-primary mt-md"
        onClick={handleVerify}
        disabled={isVerifying || (showBackupOption ? code.length < 8 : code.length < 6)}
      >
        {isVerifying ? 'Verifying...' : 'Verify'}
      </button>

      <button
        className="btn-link mt-md"
        onClick={() => {
          setShowBackupOption(!showBackupOption);
          setCode('');
          setError('');
        }}
      >
        {showBackupOption ? 'Use authenticator code' : 'Use backup code'}
      </button>

      <button className="btn-link mt-sm" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
