import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Sparkles, Shield, Users, ArrowRight, Lock, Mail, User } from 'lucide-react';

export const Login = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      name: 'Rahul Sharma',
      email: 'rahul@abctech.com',
      role: 'Org Admin',
      tenant: 'ABC Tech / Hyderabad',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      name: 'Priya Patel',
      email: 'priya@abctech.com',
      role: 'Tenant Admin',
      tenant: 'ABC Tech / Hyderabad',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    {
      name: 'Arjun Verma',
      email: 'arjun@abctech.com',
      role: 'Member',
      tenant: 'ABC Tech / Hyderabad',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha@abctech.com',
      role: 'Tenant Admin',
      tenant: 'ABC Tech / Bangalore',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      name: 'Kiran Desai',
      email: 'kiran@xyzsol.com',
      role: 'Member',
      tenant: 'XYZ Sol / Mumbai',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    try {
      setLoading(true);
      if (isRegister) {
        await register({ name, email, password });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setError('');
    try {
      setLoading(true);
      await login(demoEmail, 'Password123!');
    } catch (err) {
      console.error('Quick login failed:', err);
      const msg = err.response?.data?.error || err.message || 'Quick login failed. Please ensure the backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-xl shadow-indigo-600/30 text-white font-black text-2xl mb-4">
          J
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          JulleyOnline Collaborative Kanban
        </h2>
        <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
          Multi-Tenant Real-Time Task Management with Optimistic Concurrency Control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@abctech.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Register/Login */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500 font-bold">
                Or Quick Test Demo Personas
              </span>
            </div>
          </div>

          {/* 1-Click Persona Login Buttons */}
          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleQuickLogin(account.email)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 flex items-center justify-between transition group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                    {account.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{account.tenant}</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${account.badge}`}>
                  {account.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
