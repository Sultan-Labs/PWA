/**
 * Sultan Wallet - Pending Approvals Hook
 * 
 * Checks for pending dApp approval requests when the extension popup opens
 * and redirects to the approval screen if any are pending.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  isExtensionContext, 
  getPendingApprovals, 
  ApprovalRequest 
} from '../core/extension-bridge';

/**
 * Hook to check and handle pending approval requests
 * Should be used in the main App component
 */
export function usePendingApprovals() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Only run in extension context
    if (!isExtensionContext()) {
      setChecked(true);
      return;
    }

    // Don't redirect if already on approval screen
    if (location.pathname === '/approval') {
      setChecked(true);
      return;
    }

    async function checkPendingApprovals() {
      try {
        const approvals = await getPendingApprovals();
        setPendingCount(approvals.length);

        if (approvals.length > 0) {
          // Redirect to approval screen
          navigate('/approval', { replace: true });
        }
      } catch (error) {
        console.error('[Sultan] Failed to check pending approvals:', error);
      } finally {
        setChecked(true);
      }
    }

    checkPendingApprovals();
  }, [navigate, location.pathname]);

  return { pendingCount, checked };
}

/**
 * Hook to subscribe to new approval requests
 * Useful for showing a badge or notification
 */
export function useApprovalListener() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isExtensionContext()) return;

    // Listen for new approval requests from background
    const handleMessage = (message: any) => {
      if (message.type === 'SULTAN_NEW_APPROVAL') {
        // Refresh approvals list
        getPendingApprovals().then(setApprovals);
        
        // Navigate to approval screen if not already there
        navigate('/approval');
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Initial load
    getPendingApprovals().then(setApprovals);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [navigate]);

  return approvals;
}
