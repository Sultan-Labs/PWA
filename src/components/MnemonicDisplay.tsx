/**
 * Mnemonic Display Component
 * 
 * Displays recovery phrase in a grid with copy functionality.
 */

import { useState } from 'react';
import './MnemonicDisplay.css';

interface MnemonicDisplayProps {
  mnemonic: string;
  onCopy?: () => void;
}

export default function MnemonicDisplay({ mnemonic, onCopy }: MnemonicDisplayProps) {
  const [showWords, setShowWords] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = mnemonic.split(' ');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="mnemonic-display">
      <div className="mnemonic-header">
        <button 
          className="visibility-toggle"
          onClick={() => setShowWords(!showWords)}
        >
          {showWords ? '👁️ Hide' : '👁️ Show'}
        </button>
        <button 
          className="copy-btn"
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      <div className={`mnemonic-grid ${showWords ? '' : 'blurred'}`}>
        {words.map((word, index) => (
          <div key={index} className="mnemonic-word">
            <span className="word-index">{index + 1}</span>
            <span className="word-text">{showWords ? word : '•••••'}</span>
          </div>
        ))}
      </div>

      {!showWords && (
        <div className="blur-overlay" onClick={() => setShowWords(true)}>
          <span>Tap to reveal</span>
        </div>
      )}
    </div>
  );
}
