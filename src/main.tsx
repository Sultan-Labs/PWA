import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './hooks/useWallet';
import { ThemeProvider } from './hooks/useTheme';
import App from './App';
import './index.css';
import { runSecurityChecks, setupAntiDebugging } from './core/csp';

// Run security checks before initializing the app
const securityCheck = runSecurityChecks();
if (!securityCheck.passed) {
  console.error('Security checks failed:', securityCheck.warnings);
  // In production, we could redirect to an error page
  if (import.meta.env.PROD) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#fff;font-family:sans-serif;text-align:center;padding:20px;">
        <div>
          <h1>Security Error</h1>
          <p>Sultan Wallet requires a secure environment (HTTPS) to operate.</p>
          <p>Please access this wallet via https://wallet.sltn.io</p>
        </div>
      </div>
    `;
    throw new Error('Security requirements not met');
  }
}

// Setup anti-debugging in production
setupAntiDebugging();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 seconds
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - app still works
    });
  });
}
