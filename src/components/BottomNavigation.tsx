import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNavigation.css';

// Icons
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={active ? "var(--color-primary)" : "var(--color-text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const StakeIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={active ? "var(--color-primary)" : "var(--color-text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ActivityIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={active ? "var(--color-primary)" : "var(--color-text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const NFTIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={active ? "var(--color-primary)" : "var(--color-text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={active ? "var(--color-primary)" : "var(--color-text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bottom-nav-container">
      <div className="bottom-nav">
        <button 
          className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <HomeIcon active={isActive('/dashboard')} />
          <span>Home</span>
        </button>
        
        <button 
          className={`nav-item ${isActive('/stake') ? 'active' : ''}`}
          onClick={() => navigate('/stake')}
        >
          <StakeIcon active={isActive('/stake')} />
          <span>Stake</span>
        </button>

        <button 
          className={`nav-item ${isActive('/nfts') ? 'active' : ''}`}
          onClick={() => navigate('/nfts')}
        >
          <NFTIcon active={isActive('/nfts')} />
          <span>NFTs</span>
        </button>
        
        <button 
          className={`nav-item ${isActive('/activity') ? 'active' : ''}`}
          onClick={() => navigate('/activity')}
        >
          <ActivityIcon active={isActive('/activity')} />
          <span>Activity</span>
        </button>
        
        <button 
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <SettingsIcon active={isActive('/settings')} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
