import React, { useState, useEffect } from 'react';
import { X, History, Activity, User, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../../services/api';

export const ActivityDrawer = ({ isOpen, onClose, tenantName }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activities?limit=50');
      setActivities(res.data.data || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Activity Trail</h3>
            <p className="text-[11px] text-slate-400">Branch: {tenantName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={fetchActivities}
            title="Refresh activities"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.length > 0 ? (
          activities.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-semibold text-indigo-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {act.user?.name || 'System User'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(act.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-slate-200 flex items-center gap-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    act.action === 'Created'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : act.action === 'Moved'
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : act.action === 'Updated'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {act.action}
                </span>
                <span className="text-slate-400">{act.entityType}:</span>
                <span className="font-medium text-slate-200 truncate">
                  {act.details?.title || act.details?.name || act.entityId}
                </span>
              </div>

              {act.details?.fromColumn && act.details?.toColumn && (
                <div className="mt-2 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {act.details.fromColumn}
                  </span>
                  <ArrowRight className="w-3 h-3 text-indigo-400" />
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                    {act.details.toColumn}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            {loading ? 'Loading activities...' : 'No activity records found.'}
          </div>
        )}
      </div>
    </div>
  );
};
