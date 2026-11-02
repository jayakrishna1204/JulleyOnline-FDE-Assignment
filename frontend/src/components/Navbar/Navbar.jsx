import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Building2,
  GitBranch,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  History,
  ShieldAlert,
  LogOut,
  User,
  Users,
  ChevronDown
} from 'lucide-react';

export const Navbar = ({ onOpenAI, onOpenActivities, onOpenTester }) => {
  const {
    user,
    organizations,
    selectedOrg,
    tenants,
    selectedTenant,
    currentRole,
    switchOrganization,
    switchTenant,
    logout,
    login
  } = useAuth();

  const { connectionStatus, onlineUsers, simulateNetworkDisconnect, simulateNetworkReconnect } = useSocket();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const demoAccounts = [
    { name: 'Rahul Sharma', email: 'rahul@abctech.com', role: 'Org Admin (ABC)' },
    { name: 'Priya Patel', email: 'priya@abctech.com', role: 'Tenant Admin (Hyd)' },
    { name: 'Arjun Verma', email: 'arjun@abctech.com', role: 'Member (Hyd)' },
    { name: 'Sneha Reddy', email: 'sneha@abctech.com', role: 'Tenant Admin (Blr)' },
    { name: 'Kiran Desai', email: 'kiran@xyzsol.com', role: 'Member (Mumbai)' }
  ];

  const handleQuickSwitch = async (email) => {
    try {
      await login(email, 'Password123!');
      setUserDropdownOpen(false);
    } catch (err) {
      console.error('Quick switch failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 min-w-max">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-black text-white text-lg">
            J
          </div>
          <div>
            <div className="font-bold text-base tracking-tight leading-tight flex items-center gap-1.5">
              <span>JulleyOnline</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Multi-Tenant
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-none">Collaborative Kanban</div>
          </div>
        </div>

        {/* Multi-Tenant Organization & Branch Switchers */}
        <div className="hidden md:flex items-center gap-2">
          {/* Org Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">Org:</span>
            <select
              value={selectedOrg?.id || ''}
              onChange={(e) => switchOrganization(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id} className="bg-slate-900 text-slate-200">
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tenant/Branch Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 font-medium">Branch:</span>
            <select
              value={selectedTenant?.id || ''}
              onChange={(e) => switchTenant(e.target.value)}
              className="bg-transparent text-emerald-300 font-semibold focus:outline-none cursor-pointer"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id} className="bg-slate-900 text-slate-200">
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Status & Action Tools */}
        <div className="flex items-center gap-3">
          {/* Socket Connection Status & Network Disconnect Simulator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (connectionStatus === 'connected') {
                  simulateNetworkDisconnect();
                } else {
                  simulateNetworkReconnect();
                }
              }}
              title="Click to simulate Network Disconnect / Reconnect"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <Wifi className="w-3 h-3" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : connectionStatus === 'reconnecting' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Reconnecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline (Click to Reconnect)</span>
                </>
              )}
            </button>
          </div>

          {/* Presence Indicator (Section 6 Step 6) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/40 text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300 font-semibold">{onlineUsers.length} Online:</span>
            <div className="flex -space-x-1.5 overflow-hidden">
              {onlineUsers.slice(0, 4).map((u) => (
                <div
                  key={u.id}
                  title={`${u.name} (${u.email}) is currently active`}
                  className="w-5 h-5 rounded-full bg-indigo-600 border border-slate-900 text-[9px] font-bold text-white flex items-center justify-center uppercase shadow"
                >
                  {u.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Drawer Button */}
          <button
            onClick={onOpenActivities}
            title="Activity Audit Log"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <History className="w-4 h-4" />
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAI}
            title="AI Kanban Assistant (Python FastAPI Agent)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Security & Concurrency Test Lab */}
          <button
            onClick={onOpenTester}
            title="Open Concurrency & Cross-Tenant Test Suite"
            className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 text-xs font-medium transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Test Lab</span>
          </button>

          {/* User Profile & Quick Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden xl:block leading-tight">
                <div className="text-xs font-semibold text-slate-200">{user?.name}</div>
                <div className="text-[10px] text-indigo-400 font-medium">{currentRole}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-slate-200">{user?.name}</div>
                  <div className="text-[11px] text-slate-400">{user?.email}</div>
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                    Active Role: {currentRole}
                  </div>
                </div>

                {/* Quick Persona Switcher */}
                <div className="py-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Quick Switch Persona
                  </div>
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleQuickSwitch(account.email)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between hover:bg-slate-800 transition ${
                        user?.email === account.email ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <span>{account.name}</span>
                      <span className="text-[10px] text-slate-500">{account.role}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
