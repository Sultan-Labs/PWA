/**
 * Transaction Simulation Preview Component
 * 
 * Shows users a human-readable preview of what a transaction will do
 * before they sign it. Includes balance impact and risk assessment.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Loader,
  TrendingDown,
  Coins
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface TransactionData {
  to: string;
  amount: string;
  memo?: string;
  from?: string;
  denom?: string;
  nonce?: number;
  timestamp?: number;
}

interface SimulationResult {
  success: boolean;
  balanceBefore: string;
  balanceAfter: string;
  fee: string;
  totalCost: string;
  recipientLabel?: string;
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface TransactionSimulationProps {
  transaction: TransactionData;
  onSimulationComplete?: (result: SimulationResult) => void;
}

/**
 * Format SLTN amount from smallest unit to display format
 */
function formatAmount(amount: string): string {
  const num = BigInt(amount || '0');
  const whole = num / BigInt(1_000_000_000);
  const decimal = num % BigInt(1_000_000_000);
  
  if (decimal === BigInt(0)) {
    return `${whole.toLocaleString()} SLTN`;
  }
  
  // Show up to 4 decimal places
  const decimalStr = decimal.toString().padStart(9, '0').slice(0, 4).replace(/0+$/, '');
  return `${whole.toLocaleString()}${decimalStr ? '.' + decimalStr : ''} SLTN`;
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

/**
 * Estimate risk level based on transaction properties
 */
function assessRisk(tx: TransactionData, balance: string): { level: 'low' | 'medium' | 'high'; warnings: string[] } {
  const warnings: string[] = [];
  let riskScore = 0;

  const amount = BigInt(tx.amount || '0');
  const currentBalance = BigInt(balance || '0');
  
  // Check if sending more than 50% of balance
  if (currentBalance > 0 && amount > currentBalance / BigInt(2)) {
    warnings.push('Sending more than 50% of your balance');
    riskScore += 2;
  }
  
  // Check if sending more than balance
  if (amount > currentBalance) {
    warnings.push('Insufficient balance for this transaction');
    riskScore += 3;
  }
  
  // Check for very large amounts (> 10,000 SLTN)
  if (amount > BigInt(10_000_000_000_000)) {
    warnings.push('Large transaction amount');
    riskScore += 1;
  }
  
  // Check for unknown/suspicious memo
  if (tx.memo && (tx.memo.includes('urgent') || tx.memo.includes('emergency') || tx.memo.includes('verify'))) {
    warnings.push('Memo contains suspicious keywords');
    riskScore += 2;
  }
  
  // Check recipient address format
  if (!tx.to.startsWith('sultan1')) {
    warnings.push('Recipient address has unusual format');
    riskScore += 2;
  }

  const level = riskScore >= 3 ? 'high' : riskScore >= 1 ? 'medium' : 'low';
  
  return { level, warnings };
}

export function TransactionSimulation({ transaction, onSimulationComplete }: TransactionSimulationProps) {
  const { currentAccount } = useWallet();
  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Get current balance from wallet context
  const currentBalance = useMemo(() => {
    // In real implementation, this would fetch from wallet state
    // For now, return a mock balance for simulation
    return '1000000000000'; // 1000 SLTN in smallest units
  }, [currentAccount]);

  useEffect(() => {
    async function simulate() {
      setLoading(true);
      
      try {
        // Simulate a small delay for UX
        await new Promise(r => setTimeout(r, 300));
        
        const amount = BigInt(transaction.amount || '0');
        const balance = BigInt(currentBalance);
        const fee = BigInt(0); // Sultan L1 is zero-fee
        const totalCost = amount + fee;
        const newBalance = balance >= totalCost ? balance - totalCost : BigInt(0);
        
        const { level, warnings } = assessRisk(transaction, currentBalance);
        
        const result: SimulationResult = {
          success: balance >= totalCost,
          balanceBefore: currentBalance,
          balanceAfter: newBalance.toString(),
          fee: fee.toString(),
          totalCost: totalCost.toString(),
          warnings,
          riskLevel: level,
        };
        
        setSimulation(result);
        onSimulationComplete?.(result);
      } catch (error) {
        console.error('Simulation failed:', error);
        setSimulation({
          success: false,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          fee: '0',
          totalCost: transaction.amount || '0',
          warnings: ['Simulation failed - proceed with caution'],
          riskLevel: 'high',
        });
      } finally {
        setLoading(false);
      }
    }
    
    simulate();
  }, [transaction, currentBalance, onSimulationComplete]);

  if (loading) {
    return (
      <div className="tx-simulation tx-simulation-loading">
        <Loader className="spin" size={20} />
        <span>Simulating transaction...</span>
      </div>
    );
  }

  if (!simulation) {
    return null;
  }

  const getRiskIcon = () => {
    switch (simulation.riskLevel) {
      case 'high': return <AlertTriangle size={16} color="#ef4444" />;
      case 'medium': return <Info size={16} color="#f59e0b" />;
      case 'low': return <CheckCircle size={16} color="#22c55e" />;
    }
  };

  return (
    <div className={`tx-simulation tx-simulation-${simulation.riskLevel}`}>
      <style>{`
        .tx-simulation {
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid var(--border-primary, #e0e0e0);
        }
        
        .tx-simulation-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--text-secondary, #666);
          padding: 24px;
        }
        
        .tx-simulation-high {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }
        
        .tx-simulation-medium {
          border-color: rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.05);
        }
        
        .tx-simulation-low {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.05);
        }
        
        .sim-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .sim-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        
        .sim-toggle {
          background: none;
          border: none;
          color: var(--accent-primary, #d4af37);
          cursor: pointer;
          font-size: 13px;
          padding: 4px 8px;
        }
        
        .sim-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-primary, #fff);
          border-radius: 8px;
          margin-bottom: 12px;
        }
        
        .sim-amount {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .sim-amount-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #000);
        }
        
        .sim-amount-label {
          font-size: 11px;
          color: var(--text-secondary, #666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .sim-arrow {
          color: var(--text-secondary, #666);
        }
        
        .sim-balance-change {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-primary, #fff);
          border-radius: 8px;
          font-size: 13px;
        }
        
        .sim-balance-change.decrease {
          color: #ef4444;
        }
        
        .sim-balance-change.increase {
          color: #22c55e;
        }
        
        .sim-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-primary, #e0e0e0);
        }
        
        .sim-detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 6px 0;
        }
        
        .sim-detail-label {
          color: var(--text-secondary, #666);
        }
        
        .sim-detail-value {
          color: var(--text-primary, #000);
          font-weight: 500;
        }
        
        .sim-warnings {
          margin-top: 12px;
        }
        
        .sim-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          font-size: 13px;
          color: #dc2626;
          margin-bottom: 8px;
        }
        
        .sim-warning:last-child {
          margin-bottom: 0;
        }
        
        .sim-recipient {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-primary, #fff);
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 8px;
        }
        
        .sim-recipient-address {
          font-family: monospace;
          font-size: 12px;
          color: var(--text-secondary, #666);
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .sim-fee-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>

      {/* Header */}
      <div className="sim-header">
        <div className="sim-title">
          {getRiskIcon()}
          <span>Transaction Preview</span>
        </div>
        <button className="sim-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {/* Recipient */}
      <div className="sim-recipient">
        <Coins size={16} />
        <span>To:</span>
        <span className="sim-recipient-address">{truncateAddress(transaction.to)}</span>
      </div>

      {/* Amount Summary */}
      <div className="sim-summary">
        <div className="sim-amount">
          <span className="sim-amount-value">{formatAmount(transaction.amount)}</span>
          <span className="sim-amount-label">Sending</span>
        </div>
        <ArrowRight className="sim-arrow" size={20} />
        <div className="sim-amount">
          <span className="sim-fee-badge">
            <CheckCircle size={12} />
            Zero Fee
          </span>
          <span className="sim-amount-label">Network Fee</span>
        </div>
      </div>

      {/* Balance Impact */}
      <div className={`sim-balance-change decrease`}>
        <TrendingDown size={16} />
        <span>Balance after: {formatAmount(simulation.balanceAfter)}</span>
      </div>

      {/* Warnings */}
      {simulation.warnings.length > 0 && (
        <div className="sim-warnings">
          {simulation.warnings.map((warning, i) => (
            <div key={i} className="sim-warning">
              <AlertTriangle size={14} />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="sim-details">
          <div className="sim-detail-row">
            <span className="sim-detail-label">Current Balance</span>
            <span className="sim-detail-value">{formatAmount(simulation.balanceBefore)}</span>
          </div>
          <div className="sim-detail-row">
            <span className="sim-detail-label">Amount</span>
            <span className="sim-detail-value">-{formatAmount(transaction.amount)}</span>
          </div>
          <div className="sim-detail-row">
            <span className="sim-detail-label">Network Fee</span>
            <span className="sim-detail-value" style={{ color: '#22c55e' }}>0 SLTN</span>
          </div>
          <div className="sim-detail-row">
            <span className="sim-detail-label">New Balance</span>
            <span className="sim-detail-value">{formatAmount(simulation.balanceAfter)}</span>
          </div>
          {transaction.memo && (
            <div className="sim-detail-row">
              <span className="sim-detail-label">Memo</span>
              <span className="sim-detail-value">{transaction.memo}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionSimulation;
