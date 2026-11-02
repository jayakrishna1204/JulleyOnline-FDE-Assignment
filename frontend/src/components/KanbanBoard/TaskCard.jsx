import React from 'react';
import { Clock, AlertCircle, GripVertical, CheckCircle2 } from 'lucide-react';

export const TaskCard = ({ task, onSelect, onDragStart }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column?.name !== 'Done';

  const priorityStyles = {
    Low: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  const formattedDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onSelect(task)}
      className="group relative bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top Header: Priority, Version badge, & Grip */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
            priorityStyles[task.priority] || priorityStyles.Medium
          }`}
        >
          {task.priority}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Version badge to showcase optimistic locking */}
          <span
            title="Optimistic Concurrency Version"
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400"
          >
            v{task.version}
          </span>
          <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition line-clamp-2 mb-1.5">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: Due date & Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px]">
        {/* Due Date */}
        {formattedDate ? (
          <div
            className={`flex items-center gap-1 font-medium ${
              isOverdue ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{formattedDate}</span>
          </div>
        ) : (
          <span className="text-slate-500 text-[10px]">No due date</span>
        )}

        {/* Assignee */}
        {task.assignee ? (
          <div
            title={`Assigned to ${task.assignee.name}`}
            className="flex items-center gap-1.5"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600/80 text-white font-bold text-[9px] flex items-center justify-center border border-indigo-400/30 uppercase">
              {task.assignee.name.charAt(0)}
            </div>
            <span className="text-slate-300 max-w-[80px] truncate">{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-slate-500 text-[10px] italic">Unassigned</span>
        )}
      </div>
    </div>
  );
};
