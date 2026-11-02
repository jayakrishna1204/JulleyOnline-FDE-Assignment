import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  AlertTriangle,
  Trash2,
  Save,
  CheckCircle,
  RefreshCw,
  GitBranch,
  Flame
} from 'lucide-react';
import api from '../../services/api';

export const TaskDetailsModal = ({
  task,
  columns = [],
  tenantUsers = [],
  onClose,
  onUpdateTask,
  onDeleteTask
}) => {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'Medium');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || '');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [taskActivities, setTaskActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  useEffect(() => {
    // Load task-specific activity log
    const loadActivities = async () => {
      try {
        const res = await api.get(`/activities/entity/Task/${task.id}`);
        setTaskActivities(res.data.data || []);
      } catch (err) {
        console.error('Failed to load task activities:', err);
      }
    };
    loadActivities();
  }, [task.id]);

  const handleSave = async (forceStaleVersion = false) => {
    try {
      setSaving(true);
      setConflictError(null);

      // If forceStaleVersion is true (for testing simulation), intentionally send an older version!
      const versionToSend = forceStaleVersion ? task.version - 1 : task.version;

      const payload = {
        title,
        description,
        priority,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        expectedVersion: versionToSend
      };

      await onUpdateTask(task.id, payload);
      onClose();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setConflictError(err.response.data);
      } else {
        alert(err.response?.data?.error || 'Failed to update task');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResolveConflict = () => {
    if (conflictError?.serverTask) {
      const server = conflictError.serverTask;
      setTitle(server.title);
      setDescription(server.description || '');
      setPriority(server.priority);
      setAssignedTo(server.assignedTo || '');
      setDueDate(server.dueDate ? new Date(server.dueDate).toISOString().split('T')[0] : '');
      setConflictError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              Task Details
            </span>
            <span
              title="Optimistic Concurrency Control Version"
              className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300"
            >
              Version: {task.version}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Alert Banner (409 Conflict) */}
        {conflictError && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-bold text-rose-200">
                  Concurrency Conflict Detected (HTTP 409)
                </div>
                <div className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                  {conflictError.error}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleResolveConflict}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Load Server's Latest Version
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
              placeholder="Task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
              placeholder="Provide context, acceptance criteria..."
            />
          </div>

          {/* Grid: Priority, Assignee, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {tenantUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Concurrency Simulator Helper */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Scenario 1 Concurrency Simulator
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Simulate two users editing simultaneously by submitting with a stale version.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium whitespace-nowrap transition"
            >
              Trigger Stale Conflict
            </button>
          </div>

          {/* Task Activity Audit Trail */}
          <div className="pt-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Audit History for this Task
            </h5>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {taskActivities.length > 0 ? (
                taskActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-indigo-300">
                        {act.user?.name || 'System'}:
                      </span>{' '}
                      <span className="text-slate-300">{act.action} task</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">No recent activity recorded.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDeleteTask(task.id)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
