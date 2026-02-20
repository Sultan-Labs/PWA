/**
 * Sultan Wallet - PWA dApp Approval Screen
 * 
 * Shows pending approval requests from dApps connected via BroadcastChannel.
 * This is the PWA equivalent of the extension's ApprovalScreen.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBroadcastService } from '../hooks/useBroadcastService';
import { PWAMessageType } from '../core/pwa-provider';
import type { PWAApprovalRequest } from '../core/wallet-broadcast';

function getRequestTitle(type: PWAMessageType): string {
  switch (type) {
    case PWAMessageType.CONNECT: return 'Connection Request';
    case PWAMessageType.SIGN_MESSAGE: return 'Sign Message';
    case PWAMessageType.SIGN_TRANSACTION: return 'Sign Transaction';
    case PWAMessageType.SEND_TRANSACTION: return 'Send Transaction';
    case PWAMessageType.ADD_TOKEN: return 'Add Token';
    default: return 'Request';
  }
}

function getRequestIcon(type: PWAMessageType): string {
  switch (type) {
    case PWAMessageType.CONNECT: return '🔗';
    case PWAMessageType.SIGN_MESSAGE: return '✍️';
    case PWAMessageType.SIGN_TRANSACTION: return '📝';
    case PWAMessageType.SEND_TRANSACTION: return '📤';
    case PWAMessageType.ADD_TOKEN: return '🪙';
    default: return '❓';
  }
}

function getRequestDescription(request: PWAApprovalRequest): string {
  switch (request.type) {
    case PWAMessageType.CONNECT:
      return `${request.name} wants to connect to your wallet`;
    case PWAMessageType.SIGN_MESSAGE:
      return `${request.name} is requesting you to sign a message`;
    case PWAMessageType.SIGN_TRANSACTION:
      return `${request.name} is requesting a transaction signature`;
    case PWAMessageType.SEND_TRANSACTION:
      return `${request.name} wants to send a transaction`;
    case PWAMessageType.ADD_TOKEN:
      return `${request.name} wants to add a custom token`;
    default:
      return `${request.name} sent a request`;
  }
}

function getPermissions(type: PWAMessageType): string[] {
  switch (type) {
    case PWAMessageType.CONNECT:
      return [
        'View your wallet address',
        'Request transaction signatures',
        'Request message signatures',
      ];
    default:
      return [];
  }
}

function RequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: {
  request: PWAApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  const permissions = getPermissions(request.type);

  return (
    <div className="pwa-approval-card">
      {/* Header */}
      <div className="pwa-approval-header">
        <div className="pwa-approval-icon">
          {request.icon ? (
            <img src={request.icon} alt="" className="pwa-approval-favicon" />
          ) : (
            <span>{getRequestIcon(request.type)}</span>
          )}
        </div>
        <div className="pwa-approval-info">
          <h3>{getRequestTitle(request.type)}</h3>
          <p className="pwa-approval-origin">{request.origin}</p>
        </div>
      </div>

      {/* Description */}
      <p className="pwa-approval-description">
        {getRequestDescription(request)}
      </p>

      {/* Permissions (for connect) */}
      {permissions.length > 0 && (
        <div className="pwa-approval-permissions">
          <p className="pwa-approval-permissions-title">This dApp will be able to:</p>
          <ul>
            {permissions.map((perm, i) => (
              <li key={i}>{perm}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Message preview (for signMessage) */}
      {request.type === PWAMessageType.SIGN_MESSAGE && request.payload?.message && (
        <div className="pwa-approval-data">
          <p className="pwa-approval-data-label">Message:</p>
          <pre className="pwa-approval-data-content">
            {request.payload.message.length > 500
              ? request.payload.message.slice(0, 500) + '...'
              : request.payload.message}
          </pre>
        </div>
      )}

      {/* Transaction preview (for signTransaction/sendTransaction) */}
      {(request.type === PWAMessageType.SIGN_TRANSACTION || 
        request.type === PWAMessageType.SEND_TRANSACTION) && 
        request.payload?.transaction && (
        <div className="pwa-approval-data">
          <p className="pwa-approval-data-label">Transaction Details:</p>
          <div className="pwa-approval-tx">
            {request.payload.transaction.to && (
              <div className="pwa-approval-tx-row">
                <span>To:</span>
                <span className="pwa-approval-tx-value">
                  {request.payload.transaction.to}
                </span>
              </div>
            )}
            {request.payload.transaction.amount && (
              <div className="pwa-approval-tx-row">
                <span>Amount:</span>
                <span className="pwa-approval-tx-value">
                  {formatAmount(request.payload.transaction.amount)} SLTN
                </span>
              </div>
            )}
            {request.payload.transaction.memo && (
              <div className="pwa-approval-tx-row">
                <span>Memo:</span>
                <span className="pwa-approval-tx-value">
                  {request.payload.transaction.memo}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="pwa-approval-warning">
        ⚠️ Only approve requests from sites you trust.
        {request.type !== PWAMessageType.CONNECT && (
          <> Verify the details before approving.</>
        )}
      </div>

      {/* Action buttons */}
      <div className="pwa-approval-actions">
        <button
          className="pwa-approval-btn pwa-approval-btn-reject"
          onClick={onReject}
          disabled={isProcessing}
        >
          Reject
        </button>
        <button
          className="pwa-approval-btn pwa-approval-btn-approve"
          onClick={onApprove}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="pwa-spinner" />
              Processing...
            </>
          ) : (
            request.type === PWAMessageType.CONNECT ? 'Connect' : 'Approve'
          )}
        </button>
      </div>
    </div>
  );
}

function formatAmount(amount: string): string {
  const value = Number(amount) / 1e9;
  if (isNaN(value)) return amount;
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 9 
  });
}

export function PWAApprovalScreen() {
  const navigate = useNavigate();
  const {
    pendingApprovals,
    approveRequest,
    rejectRequest,
  } = useBroadcastService();
  
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    setError(null);
    try {
      await approveRequest(requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (requestId: string) => {
    rejectRequest(requestId, 'User rejected');
  };

  // No pending approvals
  if (pendingApprovals.length === 0) {
    return (
      <div className="pwa-approval-screen">
        <style>{styles}</style>
        <header className="pwa-approval-screen-header">
          <button className="pwa-btn-back" onClick={() => navigate(-1)}>
            ←
          </button>
          <h2>Approvals</h2>
        </header>
        <div className="pwa-approval-empty">
          <div className="pwa-approval-empty-icon">✅</div>
          <h3>All Clear</h3>
          <p>No pending approval requests.</p>
          <button
            className="pwa-approval-btn pwa-approval-btn-approve"
            onClick={() => navigate('/dashboard')}
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-approval-screen">
      <style>{styles}</style>
      <header className="pwa-approval-screen-header">
        <button className="pwa-btn-back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2>Approvals</h2>
        <span className="pwa-approval-badge">
          {pendingApprovals.length}
        </span>
      </header>

      {error && (
        <div className="pwa-approval-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="pwa-approval-list">
        {pendingApprovals.map(request => (
          <RequestCard
            key={request.id}
            request={request}
            onApprove={() => handleApprove(request.id)}
            onReject={() => handleReject(request.id)}
            isProcessing={processing === request.id}
          />
        ))}
      </div>
    </div>
  );
}

const styles = `
  .pwa-approval-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #0a0a0a);
    color: var(--text-primary, #fff);
  }
  
  .pwa-approval-screen-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border-color, #222);
  }
  
  .pwa-approval-screen-header h2 {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  
  .pwa-btn-back {
    background: none;
    border: none;
    color: var(--text-primary, #fff);
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
  }
  
  .pwa-approval-badge {
    background: var(--accent-primary, #d4af37);
    color: #000;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 13px;
    font-weight: 600;
  }
  
  .pwa-approval-list {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }
  
  .pwa-approval-card {
    background: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 16px;
    padding: 20px;
  }
  
  .pwa-approval-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }
  
  .pwa-approval-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .pwa-approval-favicon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }
  
  .pwa-approval-info h3 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
  }
  
  .pwa-approval-origin {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary, #888);
    word-break: break-all;
  }
  
  .pwa-approval-description {
    font-size: 14px;
    color: var(--text-secondary, #aaa);
    margin: 0 0 16px;
    line-height: 1.5;
  }
  
  .pwa-approval-permissions {
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }
  
  .pwa-approval-permissions-title {
    font-size: 13px;
    font-weight: 500;
    margin: 0 0 8px;
    color: var(--text-primary, #fff);
  }
  
  .pwa-approval-permissions ul {
    margin: 0;
    padding: 0 0 0 18px;
    font-size: 13px;
    color: var(--text-secondary, #aaa);
    line-height: 1.8;
  }
  
  .pwa-approval-data {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border-color, #333);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }
  
  .pwa-approval-data-label {
    font-size: 12px;
    color: var(--text-secondary, #888);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .pwa-approval-data-content {
    margin: 0;
    font-family: monospace;
    font-size: 13px;
    color: var(--text-primary, #fff);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .pwa-approval-tx {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .pwa-approval-tx-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
  }
  
  .pwa-approval-tx-row > span:first-child {
    color: var(--text-secondary, #888);
    flex-shrink: 0;
  }
  
  .pwa-approval-tx-value {
    color: var(--text-primary, #fff);
    text-align: right;
    word-break: break-all;
    font-family: monospace;
  }
  
  .pwa-approval-warning {
    background: rgba(255, 193, 7, 0.08);
    border: 1px solid rgba(255, 193, 7, 0.25);
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #ffc107;
    line-height: 1.5;
  }
  
  .pwa-approval-actions {
    display: flex;
    gap: 12px;
  }
  
  .pwa-approval-btn {
    flex: 1;
    padding: 14px 20px;
    border-radius: 12px;
    border: none;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.15s;
  }
  
  .pwa-approval-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .pwa-approval-btn-reject {
    background: var(--bg-tertiary, #2a2a2a);
    color: var(--text-primary, #fff);
  }
  
  .pwa-approval-btn-approve {
    background: var(--accent-primary, #d4af37);
    color: #000;
  }
  
  .pwa-approval-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
  }
  
  .pwa-approval-empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .pwa-approval-empty h3 {
    margin: 0 0 8px;
    font-size: 20px;
  }
  
  .pwa-approval-empty p {
    margin: 0 0 24px;
    color: var(--text-secondary, #888);
  }
  
  .pwa-approval-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 12px 16px;
    margin: 12px 16px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  
  .pwa-approval-error p {
    margin: 0;
    color: #ef4444;
    font-size: 13px;
  }
  
  .pwa-approval-error button {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
    white-space: nowrap;
  }
  
  .pwa-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: pwa-spin 1s linear infinite;
    display: inline-block;
  }
  
  @keyframes pwa-spin {
    to { transform: rotate(360deg); }
  }
`;

export default PWAApprovalScreen;
