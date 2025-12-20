/**
 * Import Wallet Screen
 * 
 * Allows users to restore wallet from mnemonic phrase.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import PinInput from '../components/PinInput';
import './ImportWallet.css';

type Step = 'mnemonic' | 'pin' | 'confirm-pin';

export default function ImportWallet() {
  const navigate = useNavigate();
  const { importWallet, error, clearError } = useWallet();
  
  const [step, setStep] = useState<Step>('mnemonic');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(Array(24).fill(''));
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mnemonicError, setMnemonicError] = useState('');

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...mnemonicWords];
    newWords[index] = value.toLowerCase().trim();
    setMnemonicWords(newWords);
    setMnemonicError('');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const words = pastedText.toLowerCase().trim().split(/\s+/);
    
    if (words.length === 24 || words.length === 12) {
      e.preventDefault();
      const newWords = Array(24).fill('');
      words.forEach((word, i) => {
        if (i < newWords.length) {
          newWords[i] = word;
        }
      });
      setMnemonicWords(newWords);
    }
  };

  const handleContinue = () => {
    const mnemonic = mnemonicWords.filter(w => w).join(' ');
    const wordCount = mnemonic.split(' ').length;
    
    if (wordCount !== 12 && wordCount !== 24) {
      setMnemonicError('Please enter 12 or 24 words');
      return;
    }

    setStep('pin');
  };

  const handlePinComplete = async (enteredPin: string) => {
    if (step === 'pin') {
      setPin(enteredPin);
      setStep('confirm-pin');
    } else if (step === 'confirm-pin') {
      if (enteredPin === pin) {
        await handleImportWallet(enteredPin);
      } else {
        clearError();
        setStep('pin');
        setPin('');
      }
    }
  };

  const handleImportWallet = async (walletPin: string) => {
    setIsLoading(true);
    try {
      const mnemonic = mnemonicWords.filter(w => w).join(' ');
      await importWallet(mnemonic, walletPin);
      navigate('/dashboard');
    } catch {
      setStep('mnemonic');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const filledWordCount = mnemonicWords.filter(w => w.length > 0).length;
  const canContinue = filledWordCount === 12 || filledWordCount === 24;

  if (isLoading) {
    return (
      <div className="import-screen">
        <div className="import-content">
          <div className="spinner" />
          <p className="mt-md">Importing your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="import-screen">
      <div className="import-content fade-in">
        {step === 'mnemonic' && (
          <>
            <h2>Import Wallet</h2>
            <p className="text-muted mb-md">
              Enter your 12 or 24-word recovery phrase
            </p>
            
            <div className="mnemonic-input-grid" onPaste={handlePaste}>
              {mnemonicWords.map((word, index) => (
                <div key={index} className="mnemonic-input-item">
                  <span className="word-number">{index + 1}</span>
                  <input
                    type="text"
                    className="input word-input"
                    value={word}
                    onChange={e => handleWordChange(index, e.target.value)}
                    autoComplete="off"
                    autoCapitalize="off"
                  />
                </div>
              ))}
            </div>

            <p className="text-muted text-sm mt-md">
              💡 Tip: Paste your entire phrase to auto-fill
            </p>

            {mnemonicError && (
              <p className="text-error mt-sm">{mnemonicError}</p>
            )}

            <button 
              className="btn btn-primary mt-lg"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              Continue ({filledWordCount}/24 words)
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <h2>Create a PIN</h2>
            <p className="text-muted mb-lg">
              This PIN will be used to unlock your wallet
            </p>
            <PinInput length={6} onComplete={handlePinComplete} />
          </>
        )}

        {step === 'confirm-pin' && (
          <>
            <h2>Confirm PIN</h2>
            <p className="text-muted mb-lg">
              Enter your PIN again to confirm
            </p>
            <PinInput length={6} onComplete={handlePinComplete} />
            {error && <p className="text-error mt-md">{error}</p>}
          </>
        )}

        <button 
          className="btn btn-secondary mt-md"
          onClick={() => step === 'mnemonic' ? navigate('/') : setStep('mnemonic')}
        >
          {step === 'mnemonic' ? 'Cancel' : 'Back'}
        </button>
      </div>
    </div>
  );
}
