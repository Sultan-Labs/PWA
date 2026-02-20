/**
 * Sultan Wallet - Connected Apps Screen
 * 
 * Shows all dApps connected to the wallet with ability to disconnect.
 * Works in both extension mode (chrome.runtime) and PWA mode (BroadcastChannel).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Trash2, ExternalLink, Radio } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import {
  ConnectedApp,
  getConnectedApps,
  disconnectApp,
  disconnectAllApps,
  formatOrigin,
  getFaviconUrl,
  isExtensionContext
} from '../core/extension-bridge';
import { useBroadcastService } from '../hooks/useBroadcastService';

export function ConnectedAppsScreen() {
  const navigate = useNavigate();
  useTheme(); // Keep hook for context
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const isExtension = isExtensionContext();
  
  // PWA mode: use broadcast service for connected apps
  const broadcastService = useBroadcastService();

  useEffect(() => {
    loadApps();
  }, []);

  // Keep PWA apps in sync
  useEffect(() => {
    if (!isExtension && broadcastService.connectedApps.length > 0) {
      const pwaApps: ConnectedApp[] = broadcastService.connectedApps.map(app => ({
        origin: app.origin,
        address: '',  // PWA connected apps don't track address per-origin
        publicKey: '',
        connectedAt: app.connectedAt,
      }));
      setApps(pwaApps);
      setLoading(false);
    }
  }, [isExtension, broadcastService.connectedApps]);

  async function loadApps() {
    if (isExtension) {
      try {
        const connectedApps = await getConnectedApps();
        setApps(connectedApps);
      } catch (e) {
        console.error('Failed to load connected apps:', e);
      }
    } else {
      // PWA mode: apps loaded via broadcastService hook above
      const pwaApps: ConnectedApp[] = broadcastService.connectedApps.map(app => ({
        origin: app.origin,
        address: '',
        publicKey: '',
        connectedAt: app.connectedAt,
      }));
      setApps(pwaApps);
    }
    setLoading(false);
  }

  const handleDisconnect = async (origin: string) => {
    setDisconnecting(origin);
    try {
      if (isExtension) {
        await disconnectApp(origin);
      } else {
        broadcastService.disconnectApp(origin);
      }
      setApps(apps.filter(app => app.origin !== origin));
    } catch (e) {
      console.error('Failed to disconnect:', e);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleDisconnectAll = async () => {
    if (!confirm('Disconnect all connected apps?')) return;
    
    setDisconnecting('all');
    try {
      if (isExtension) {
        await disconnectAllApps();
      } else {
        broadcastService.disconnectAll();
      }
      setApps([]);
    } catch (e) {
      console.error('Failed to disconnect all:', e);
    } finally {
      setDisconnecting(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isExtension && !broadcastService.isActive && apps.length === 0) {
    return (
      <div className="screen connected-apps-screen">
        <header className="screen-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>
          <h2>Connected Apps</h2>
        </header>
        <div className="empty-state">
          <Globe className="empty-icon" />
          <h3>No Connected Apps</h3>
          <p>
            dApps can connect to your wallet via QR code scanning or by opening in a browser tab alongside this wallet.
          </p>
          <button
            className="btn-walletlink"
            onClick={() => navigate('/walletlink')}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              background: 'var(--accent-primary, #d4af37)',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Radio size={16} />
            Scan QR to Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen connected-apps-screen">
      <header className="screen-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <h2>Connected Apps</h2>
        {apps.length > 0 && (
          <button 
            className="btn-text danger"
            onClick={handleDisconnectAll}
            disabled={disconnecting === 'all'}
          >
            Disconnect All
          </button>
        )}
      </header>

      <main className="screen-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="empty-state">
            <Globe className="empty-icon" />
            <h3>No Connected Apps</h3>
            <p>When you connect to a dApp, it will appear here.</p>
          </div>
        ) : (
          <div className="apps-list">
            {apps.map(app => (
              <div key={app.origin} className="app-card">
                <img 
                  src={getFaviconUrl(app.origin)}
                  alt=""
                  className="app-favicon"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="app-info">
                  <div className="app-name">
                    {formatOrigin(app.origin)}
                    <a 
                      href={app.origin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="app-link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="app-meta">
                    Connected {formatDate(app.connectedAt)}
                  </div>
                  <div className="app-address">
                    {app.address.slice(0, 12)}...{app.address.slice(-8)}
                  </div>
                </div>
                <button
                  className="btn-disconnect"
                  onClick={() => handleDisconnect(app.origin)}
                  disabled={disconnecting === app.origin}
                  title="Disconnect"
                >
                  {disconnecting === app.origin ? (
                    <div className="spinner-small" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .connected-apps-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
        }

        .screen-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
        }

        .screen-header h2 {
          flex: 1;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .btn-back {
          background: none;
          border: none;
          padding: var(--spacing-sm);
          cursor: pointer;
          color: var(--text-primary);
        }

        .btn-text {
          background: none;
          border: none;
          font-size: 0.875rem;
          cursor: pointer;
          color: var(--text-muted);
        }

        .btn-text.danger {
          color: #ef4444;
        }

        .btn-text:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .screen-content {
          flex: 1;
          padding: var(--spacing-md);
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.125rem;
          margin-bottom: var(--spacing-xs);
          color: var(--text-primary);
        }

        .apps-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .app-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .app-favicon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--bg-tertiary);
        }

        .app-info {
          flex: 1;
          min-width: 0;
        }

        .app-name {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .app-link {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .app-link:hover {
          opacity: 1;
          color: var(--color-primary);
        }

        .app-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .app-address {
          font-size: 0.75rem;
          font-family: monospace;
          color: var(--text-muted);
        }

        .btn-disconnect {
          background: none;
          border: none;
          padding: var(--spacing-sm);
          cursor: pointer;
          color: var(--text-muted);
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }

        .btn-disconnect:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .btn-disconnect:disabled {
          cursor: not-allowed;
        }

        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border-color);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ConnectedAppsScreen;
