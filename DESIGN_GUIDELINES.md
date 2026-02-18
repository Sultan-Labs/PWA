# Sultan Wallet Design System Guidelines

## Core Aesthetic
- **Visual Direction**: High-fidelity, polished, "crafted" feel. 
- **Typography**: Primary font is 'Outfit'. Headings should use bold weights (700) with subtle letter spacing (0.5px).
- **Colors**: 
  - Dark Mode: Pure black (#000000) base, Cyan/Teal accents (#00ffff, #00e5cc).
  - Light Mode: Soft white/grey (#f5f7fa), muted teal accents (#0099aa).
- **Depth & Dimension**: Extensive use of Glassmorphism (`backdrop-filter: blur(20px)`), subtle borders (1px solid rgba accents), and glow effects (`drop-shadow`).

## Layout Principles
- **Container**: Max width of 480px for main content areas to maintain a mobile-first/extension feel.
- **Spacing**: Use standard CSS variables (`--spacing-md`, `--spacing-lg`) for consistent whitespace.
- **Responsiveness**: Ensure background animations use viewport units (`100vw/vh`) to avoid clustering.

## UI Components
- **Buttons**: Circular for icon-only buttons. Primary buttons use gradients and hover scaling (1.02x).
- **Cards**: Use the `.card` or `.glass-panel` classes with standard blur and shadow.
- **Interactions**: Include haptic feedback on actions (soft/medium) and smooth transitions for all state changes.

## Non-Custodial Compliance
- **Local Data**: Any custom UI data (like account names) must be stored locally.
- **Transparency**: Always include a note when features are device-specific to remind users of the non-custodial nature.
