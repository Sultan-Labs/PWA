/**
 * QR Scanner Component for WalletLink
 * 
 * Uses the device camera to scan QR codes for connecting to dApps.
 * Uses jsQR for reliable QR code detection.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useWalletLink } from '../hooks/useWalletLink';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasScannedRef = useRef(false); // Prevent double-scanning

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      // Reset scan state
      hasScannedRef.current = false;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (e) {
      console.error('Camera error:', e);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Scan frame for QR code using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || hasScannedRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data and scan for QR code
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    
    if (code && code.data) {
      // Validate it's a Sultan WalletLink QR
      if (code.data.startsWith('sultan://wl?')) {
        hasScannedRef.current = true;
        stopCamera();
        onScan(code.data);
      }
    }
  }, [stopCamera, onScan]);

  // Start scanning on mount
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Scan frames periodically
  useEffect(() => {
    if (isScanning) {
      scanIntervalRef.current = setInterval(scanFrame, 250); // 4 FPS
    }
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, scanFrame]);

  // Handle manual paste (fallback)
  const handleManualInput = () => {
    const input = prompt('Paste WalletLink QR data:');
    if (input && input.startsWith('sultan://wl?')) {
      stopCamera();
      onScan(input);
    } else if (input) {
      setError('Invalid QR code format');
    }
  };

  return (
    <div className="qr-scanner">
      <style>{`
        .qr-scanner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }
        
        .qr-scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
        }
        
        .qr-scanner-header h2 {
          margin: 0;
          font-size: 18px;
        }
        
        .qr-scanner-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
        }
        
        .qr-scanner-viewport {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        
        .qr-scanner-viewport video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .qr-scanner-viewport canvas {
          display: none;
        }
        
        .qr-scanner-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 250px;
          border: 3px solid var(--accent-primary, #d4af37);
          border-radius: 16px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
        }
        
        .qr-scanner-overlay::before,
        .qr-scanner-overlay::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          border: 4px solid var(--accent-primary, #d4af37);
        }
        
        .qr-scanner-overlay::before {
          top: -2px;
          left: -2px;
          border-right: none;
          border-bottom: none;
          border-radius: 16px 0 0 0;
        }
        
        .qr-scanner-overlay::after {
          bottom: -2px;
          right: -2px;
          border-left: none;
          border-top: none;
          border-radius: 0 0 16px 0;
        }
        
        .qr-scanner-hint {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          text-align: center;
          font-size: 14px;
          opacity: 0.8;
        }
        
        .qr-scanner-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          max-width: 300px;
        }
        
        .qr-scanner-error p {
          margin: 0 0 16px;
          color: #ef4444;
        }
        
        .qr-scanner-footer {
          padding: 16px;
          background: rgba(0, 0, 0, 0.8);
        }
        
        .qr-scanner-manual {
          width: 100%;
          padding: 12px 24px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        
        .qr-scanner-manual:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div className="qr-scanner-header">
        <h2>Scan QR Code</h2>
        <button className="qr-scanner-close" onClick={onClose}>×</button>
      </div>

      <div className="qr-scanner-viewport">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        
        {error ? (
          <div className="qr-scanner-error">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={handleManualInput}>
              Paste QR Data Manually
            </button>
          </div>
        ) : (
          <>
            <div className="qr-scanner-overlay" />
            <p className="qr-scanner-hint">
              Position the QR code within the frame
            </p>
          </>
        )}
      </div>

      <div className="qr-scanner-footer">
        <button className="qr-scanner-manual" onClick={handleManualInput}>
          📋 Paste QR code data manually
        </button>
      </div>
    </div>
  );
}

/**
 * WalletLink Connection Screen
 * Shows when user wants to connect to a desktop dApp
 */
export function WalletLinkScreen() {
  const navigate = useNavigate();
  const { 
    isConnected, 
    isConnecting, 
    sessionOrigin,
    pendingRequests,
    error,
    isMobile,
    canScanQR,
    connectFromQR, 
    disconnect,
    clearError
  } = useWalletLink();
  
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = async (data: string) => {
    setShowScanner(false);
    const success = await connectFromQR(data);
    if (!success) {
      // Error is set in hook
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/dashboard');
  };

  // Not on mobile - show message
  if (!isMobile) {
    return (
      <div className="walletlink-screen">
        <style>{walletLinkStyles}</style>
        <header className="screen-header">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            ←
          </button>
          <h2>Connect to dApp</h2>
        </header>
        
        <div className="walletlink-content">
          <div className="walletlink-card">
            <div className="walletlink-icon">📱</div>
            <h3>Mobile Only</h3>
            <p>
              WalletLink QR scanning is only available on mobile devices.
              Use the browser extension on desktop for dApp connections.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show QR scanner
  if (showScanner) {
    return <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />;
  }

  return (
    <div className="walletlink-screen">
      <style>{walletLinkStyles}</style>
      
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ←
        </button>
        <h2>Connect to dApp</h2>
      </header>

      <div className="walletlink-content">
        {isConnected ? (
          // Connected state
          <div className="walletlink-connected">
            <div className="connected-badge">
              <span className="connected-dot" />
              Connected
            </div>
            <p className="connected-origin">{sessionOrigin || 'Unknown dApp'}</p>
            
            {pendingRequests.length > 0 && (
              <div className="pending-badge">
                {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
              </div>
            )}
            
            <button className="btn btn-secondary mt-lg" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          // Not connected state
          <div className="walletlink-card">
            <div className="walletlink-icon">📷</div>
            <h3>Scan QR Code</h3>
            <p>
              Scan the QR code displayed on the desktop dApp to connect your wallet.
            </p>
            
            {error && (
              <div className="walletlink-error">
                <p>{error}</p>
                <button className="btn-link" onClick={clearError}>Dismiss</button>
              </div>
            )}
            
            <button 
              className="btn btn-primary mt-lg"
              onClick={() => setShowScanner(true)}
              disabled={isConnecting || !canScanQR}
            >
              {isConnecting ? (
                <>
                  <span className="spinner-small" />
                  Connecting...
                </>
              ) : (
                '📷 Scan QR Code'
              )}
            </button>
            
            {!canScanQR && (
              <p className="text-muted text-sm mt-md">
                Camera access required
              </p>
            )}
          </div>
        )}

        <div className="walletlink-info">
          <h4>How it works</h4>
          <ol>
            <li>Open a dApp on your desktop browser</li>
            <li>Click "Connect with Sultan Wallet"</li>
            <li>Scan the QR code with this app</li>
            <li>Approve connection and sign transactions</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const walletLinkStyles = `
  .walletlink-screen {
    min-height: 600px;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
  }
  
  .walletlink-content {
    flex: 1;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  
  .walletlink-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
    width: 100%;
  }
  
  .walletlink-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .walletlink-card h3 {
    margin: 0 0 8px;
    font-size: 20px;
    color: var(--text-primary);
  }
  
  .walletlink-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.5;
  }
  
  .walletlink-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin-top: 16px;
  }
  
  .walletlink-error p {
    color: #ef4444;
    margin-bottom: 8px;
  }
  
  .walletlink-connected {
    text-align: center;
    width: 100%;
  }
  
  .connected-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 14px;
    color: #22c55e;
  }
  
  .connected-dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .connected-origin {
    margin: 16px 0 8px;
    font-size: 16px;
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .pending-badge {
    display: inline-block;
    background: var(--accent-primary);
    color: #000;
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .walletlink-info {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    padding: 20px;
    width: 100%;
  }
  
  .walletlink-info h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  .walletlink-info ol {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.8;
  }
  
  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 8px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default WalletLinkScreen;
