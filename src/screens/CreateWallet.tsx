/**
 * Create Wallet Screen
 * 
 * Generates new mnemonic and secures with PIN.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import PinInput from '../components/PinInput';
import MnemonicDisplay from '../components/MnemonicDisplay';
import './CreateWallet.css';

type Step = 'pin' | 'confirm-pin' | 'mnemonic' | 'verify';

export default function CreateWallet() {
  const navigate = useNavigate();
  const { createWallet, error, clearError } = useWallet();
  
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [verifyWords, setVerifyWords] = useState<{ index: number; word: string }[]>([]);
  const [verifyInput, setVerifyInput] = useState<string[]>(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  // Force dark mode for Create Wallet screen
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const handlePinComplete = (enteredPin: string) => {
    if (step === 'pin') {
      setPin(enteredPin);
      setStep('confirm-pin');
    } else if (step === 'confirm-pin') {
      if (enteredPin === pin) {
        handleCreateWallet(enteredPin);
      } else {
        clearError();
        setStep('pin');
        setPin('');
      }
    }
  };

  const handleCreateWallet = async (walletPin: string) => {
    setIsLoading(true);
    try {
      const newMnemonic = await createWallet(walletPin);
      setMnemonic(newMnemonic);
      
      // Select 3 random words to verify
      const words = newMnemonic.split(' ');
      const indices: number[] = [];
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * words.length);
        if (!indices.includes(idx)) {
          indices.push(idx);
        }
      }
      indices.sort((a, b) => a - b);
      setVerifyWords(indices.map(i => ({ index: i, word: words[i] })));
      
      setStep('mnemonic');
    } catch {
      setStep('pin');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToVerify = () => {
    setStep('verify');
  };

  const handleVerify = () => {
    const isValid = verifyWords.every((vw, i) => 
      verifyInput[i].toLowerCase().trim() === vw.word.toLowerCase()
    );

    if (isValid) {
      navigate('/dashboard');
    } else {
      setVerifyInput(['', '', '']);
    }
  };

  const isVerifyComplete = verifyInput.every(w => w.length > 0);

  if (isLoading) {
    return (
      <>
        <div className="create-screen">
          <div className="create-content">
            <div className="spinner" />
            <p className="mt-md">Creating your wallet...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="create-screen">
        <div className="create-content fade-in">
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

        {step === 'mnemonic' && (
          <>
            <h2>Recovery Phrase</h2>
            <p className="text-muted mb-md">
              Write down these 24 words in order. They are the ONLY way to recover your wallet.
            </p>
            <div className="warning-box mb-lg">
              ⚠️ Never share your recovery phrase with anyone!
            </div>
            <MnemonicDisplay mnemonic={mnemonic} />
            <button 
              className="btn btn-primary mt-lg"
              onClick={handleContinueToVerify}
            >
              I've Written It Down
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <h2>Verify Recovery Phrase</h2>
            <p className="text-muted mb-lg">
              Enter the following words from your recovery phrase
            </p>
            
            <div className="verify-inputs">
              {verifyWords.map((vw, i) => (
                <div key={vw.index} className="verify-input-group">
                  <label>Word #{vw.index + 1}</label>
                  <input
                    type="text"
                    className="input"
                    value={verifyInput[i]}
                    onChange={e => {
                      const newInput = [...verifyInput];
                      newInput[i] = e.target.value;
                      setVerifyInput(newInput);
                    }}
                    autoComplete="off"
                    autoCapitalize="off"
                  />
                </div>
              ))}
            </div>

            <button 
              className="btn btn-primary mt-lg"
              onClick={handleVerify}
              disabled={!isVerifyComplete}
            >
              Verify & Continue
            </button>
          </>
        )}

        <button 
          className="btn btn-secondary mt-md"
          onClick={() => navigate('/')}
        >
          Cancel
        </button>
      </div>
    </div>
    </>
  );
}
