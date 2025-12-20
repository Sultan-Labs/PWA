/**
 * Security Headers and CSP Configuration
 * 
 * Production security headers for the Sultan Wallet PWA.
 * These should be served by the web server, but we also
 * implement them via meta tags as a fallback.
 */

/**
 * Content Security Policy directives
 * 
 * This is a STRICT CSP that:
 * - Blocks inline scripts (XSS protection)
 * - Only allows HTTPS connections
 * - Blocks all frame embedding
 * - Restricts connections to known endpoints
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"], // Required for styled-components/emotion
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': [
    "'self'",
    'https://rpc.sltn.io',
    'https://api.sltn.io',
    'https://*.app.github.dev',  // GitHub Codespaces
    'wss://*.app.github.dev',    // WebSocket for HMR
  ],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

/**
 * Build CSP header string
 */
export function buildCSPString(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers to set on the server
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': buildCSPString(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * Apply CSP via meta tag (fallback for environments without server control)
 */
export function applyCSPMetaTag(): void {
  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.remove();
  }
  
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = buildCSPString();
  document.head.appendChild(meta);
}

/**
 * Security checks to run on app initialization
 */
export function runSecurityChecks(): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Skip security checks in development or GitHub Codespaces
  if (import.meta.env.DEV || window.location.hostname.endsWith('.app.github.dev')) {
    return { passed: true, warnings: ['Development mode - security checks skipped'] };
  }
  
  // Check if running in secure context
  if (!window.isSecureContext) {
    warnings.push('CRITICAL: Not running in secure context (HTTPS required)');
  }
  
  // Check for Web Crypto API availability
  if (!crypto || !crypto.subtle) {
    warnings.push('CRITICAL: Web Crypto API not available');
  }
  
  // Check for IndexedDB availability
  if (!indexedDB) {
    warnings.push('CRITICAL: IndexedDB not available');
  }
  
  // Warn if running in iframe
  if (window.self !== window.top) {
    warnings.push('WARNING: Running inside an iframe - potential clickjacking risk');
  }
  
  // Check for devtools (optional warning)
  const devtoolsOpen = /./;
  devtoolsOpen.toString = function() {
    warnings.push('WARNING: Developer tools detected');
    return 'devtools';
  };
  
  return {
    passed: warnings.filter(w => w.startsWith('CRITICAL')).length === 0,
    warnings,
  };
}

/**
 * Prevent certain debugging techniques
 */
export function setupAntiDebugging(): void {
  // Disable right-click context menu in production
  if (import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  // Clear console periodically in production
  if (import.meta.env.PROD) {
    setInterval(() => {
      console.clear();
    }, 30000);
  }
}

/**
 * Secure clipboard operations
 */
export async function secureClipboardWrite(text: string, clearAfterMs = 60000): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    
    // Auto-clear clipboard after timeout
    if (clearAfterMs > 0) {
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Clipboard access may be denied after timeout
        }
      }, clearAfterMs);
    }
  } catch (error) {
    throw new Error('Failed to write to clipboard');
  }
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: Error): string {
  // Never expose internal error details in production
  if (import.meta.env.PROD) {
    const safeMessages: Record<string, string> = {
      'Invalid PIN': 'Authentication failed',
      'No wallet found': 'Wallet not found',
      'Decryption failed': 'Authentication failed',
      'Network error': 'Connection failed',
    };
    
    for (const [key, value] of Object.entries(safeMessages)) {
      if (error.message.includes(key)) {
        return value;
      }
    }
    
    return 'An error occurred';
  }
  
  return error.message;
}
