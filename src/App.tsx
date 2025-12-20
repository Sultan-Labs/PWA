import { Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from './hooks/useWallet';

// Screens
import Welcome from './screens/Welcome';
import CreateWallet from './screens/CreateWallet';
import ImportWallet from './screens/ImportWallet';
import Unlock from './screens/Unlock';
import Dashboard from './screens/Dashboard';
import Send from './screens/Send';
import Receive from './screens/Receive';
import Stake from './screens/Stake';
import BecomeValidator from './screens/BecomeValidator';
import Settings from './screens/Settings';
import Activity from './screens/Activity';
import Governance from './screens/Governance';
import NFTs from './screens/NFTs';

function App() {
  const { isInitialized, isLocked, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={
          !isInitialized ? <Welcome /> :
          isLocked ? <Navigate to="/unlock" replace /> :
          <Navigate to="/dashboard" replace />
        } 
      />
      <Route path="/create" element={<CreateWallet />} />
      <Route path="/import" element={<ImportWallet />} />
      <Route path="/unlock" element={<Unlock />} />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={isInitialized && !isLocked ? <Dashboard /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/send" 
        element={isInitialized && !isLocked ? <Send /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/receive" 
        element={isInitialized && !isLocked ? <Receive /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/stake" 
        element={isInitialized && !isLocked ? <Stake /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/become-validator" 
        element={isInitialized && !isLocked ? <BecomeValidator /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/settings" 
        element={isInitialized && !isLocked ? <Settings /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/activity" 
        element={isInitialized && !isLocked ? <Activity /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/governance" 
        element={isInitialized && !isLocked ? <Governance /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/nfts" 
        element={isInitialized && !isLocked ? <NFTs /> : <Navigate to="/" replace />} 
      />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
