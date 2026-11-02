import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, XCircle, Play, RefreshCw, Zap } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const ConcurrencyAndSecurityTester = ({ isOpen, onClose, tasks = [] }) => {
  const { user, selectedTenant, currentRole } = useAuth();
  const { connectionStatus, simulateNetworkDisconnect, simulateNetworkReconnect } = useSocket();

  const [testResults, setTestResults] = useState({});
  const [running, setRunning] = useState(false);

  if (!isOpen) return null;

  // Test 1: Cross Tenant Isolation
  const runCrossTenantTest = async () => {
    setRunning(true);
    try {
      // First get a tenant that is NOT currently selected
      const res = await api.get('/tenants');
      const otherTenant = res.data.data.find((t) => t.id !== selectedTenant?.id);

      if (!otherTenant) {
        setTestResults((prev) => ({
          ...prev,
          crossTenant: {
            success: false,
            message: 'Only 1 tenant found in this organization. Switch to another account or org to test.'
          }
        }));
        return;
      }

      // Deliberately request otherTenant boards with explicit x-tenant-id header
      try {
        await api.get('/boards', {
          headers: { 'x-tenant-id': otherTenant.id }
        });

        // If current role is Org Admin, they are permitted across their org tenants; otherwise they must be blocked!
        if (currentRole === 'Org Admin') {
          setTestResults((prev) => ({
            ...prev,
            crossTenant: {
              success: true,
              message: `Org Admin privilege verified: Org Admins have overarching jurisdiction across ${otherTenant.name} within their company. (Test with Member persona 'Arjun' or 'Priya' to see strict 403 block)`
            }
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            crossTenant: {
              success: false,
              message: `Unexpected: Server did not return 403 for unauthorized tenant ${otherTenant.name}`
            }
          }));
        }
      } catch (err) {
        if (err.response && err.response.status === 403) {
          setTestResults((prev) => ({
            ...prev,
            crossTenant: {
              success: true,
              message: `PASS: Cross-tenant access strictly blocked with HTTP 403 Forbidden! Server error: "${err.response.data.error}"`
            }
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            crossTenant: {
              success: false,
              message: `Failed: Status code ${err.response?.status || err.message}`
            }
          }));
        }
      }
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        crossTenant: { success: false, message: err.message }
      }));
    } finally {
      setRunning(false);
    }
  };

  // Test 2: Concurrency 409 Conflict Test
  const runConcurrencyTest = async () => {
    if (tasks.length === 0) {
      alert('Please select a board with tasks first to run concurrency test');
      return;
    }
    setRunning(true);
    const targetTask = tasks[0];

    try {
      // Deliberately send stale version
      await api.put(`/tasks/${targetTask.id}`, {
        title: targetTask.title + ' (Simulated Edit)',
        expectedVersion: 99999 // Intentionally stale!
      });

      setTestResults((prev) => ({
        ...prev,
        concurrency: {
          success: false,
          message: 'Failed: Stale edit was accepted instead of returning 409 Conflict'
        }
      }));
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setTestResults((prev) => ({
          ...prev,
          concurrency: {
            success: true,
            message: `PASS: Optimistic locking detected stale write and returned HTTP 409 Conflict!\nServer: "${err.response.data.error}"`
          }
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          concurrency: {
            success: false,
            message: `Unexpected status: ${err.response?.status || err.message}`
          }
        }));
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Evaluation Test Suite & Security Lab
              </h3>
              <p className="text-[11px] text-slate-400">
                Live verification of Tenancy, Concurrency, and Real-time constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Active Context */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400">Current User:</span>{' '}
              <strong className="text-slate-200">{user?.name}</strong>{' '}
              <span className="text-[10px] text-indigo-400 font-mono">({user?.email})</span>
            </div>
            <div>
              <span className="text-slate-400">Active Role:</span>{' '}
              <strong className="text-emerald-400">{currentRole}</strong>
            </div>
          </div>

          {/* Test Card 1: Multi-Tenant Data Isolation */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-100">
                  1. Cross-Tenant Isolation Enforcement
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sends an unauthorized API call with foreign branch tenant ID. Verifies HTTP 403 Forbidden.
                </p>
              </div>
              <button
                onClick={runCrossTenantTest}
                disabled={running}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                Run Test
              </button>
            </div>

            {testResults.crossTenant && (
              <div
                className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  testResults.crossTenant.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {testResults.crossTenant.message}
              </div>
            )}
          </div>

          {/* Test Card 2: Concurrency 409 Conflict */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-100">
                  2. Optimistic Concurrency Control (Version 409 Conflict)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Attempts to update a task using a stale version number. Verifies HTTP 409 Conflict rejection.
                </p>
              </div>
              <button
                onClick={runConcurrencyTest}
                disabled={running}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                Run Test
              </button>
            </div>

            {testResults.concurrency && (
              <div
                className={`p-2.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                  testResults.concurrency.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {testResults.concurrency.message}
              </div>
            )}
          </div>

          {/* Test Card 3: Network Recovery */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-100">
                  3. Socket.IO Network Recovery & Disconnection
                </h4>
                <p className="text-[11px] text-slate-400">
                  Simulate connection loss, reconnection, and state reconciliation (Section 6 Step 7).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={simulateNetworkDisconnect}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
                >
                  Drop Socket
                </button>
                <button
                  onClick={simulateNetworkReconnect}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                >
                  Reconnect
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Current WebSocket State:{' '}
              <span
                className={`font-semibold ${
                  connectionStatus === 'connected'
                    ? 'text-emerald-400'
                    : connectionStatus === 'reconnecting'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {connectionStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
};
