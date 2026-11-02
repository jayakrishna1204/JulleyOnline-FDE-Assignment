import React from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RefreshCw } from 'lucide-react';

export function App() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-xs font-medium">Initializing workspace session...</span>
      </div>
    );
  }

  return token ? <Dashboard /> : <Login />;
}

export default App;
