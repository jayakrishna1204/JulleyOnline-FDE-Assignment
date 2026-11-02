import React, { useState } from 'react';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

export const BoardColumn = ({
  column,
  tasks = [],
  onSelectTask,
  onOpenCreateTask,
  onMoveTask
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const columnThemes = {
    'To Do': {
      indicator: 'bg-slate-400',
      badge: 'bg-slate-700/60 text-slate-300'
    },
    'In Progress': {
      indicator: 'bg-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-300'
    },
    Testing: {
      indicator: 'bg-amber-400',
      badge: 'bg-amber-500/20 text-amber-300'
    },
    Done: {
      indicator: 'bg-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300'
    }
  };

  const theme = columnThemes[column.name] || {
    indicator: 'bg-purple-400',
    badge: 'bg-purple-500/20 text-purple-300'
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const taskDataStr = e.dataTransfer.getData('application/json');
      if (!taskDataStr) return;
      const draggedTask = JSON.parse(taskDataStr);

      // Trigger task move to this column at position tasks.length
      onMoveTask(draggedTask, column.id, tasks.length);
    } catch (err) {
      console.error('Failed to parse dropped task data:', err);
    }
  };

  const handleTaskDragStart = (e, task) => {
    e.dataTransfer.setData('application/json', JSON.stringify(task));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-full bg-slate-900/60 rounded-2xl border transition-all duration-150 p-3.5 ${
        isDragOver
          ? 'border-indigo-500 bg-slate-800/80 ring-2 ring-indigo-500/20'
          : 'border-slate-800'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${theme.indicator}`} />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">{column.name}</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme.badge}`}>
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onOpenCreateTask(column.id)}
          title={`Add task to ${column.name}`}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[300px] max-h-[calc(100vh-250px)] pr-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onSelect={onSelectTask}
            onDragStart={handleTaskDragStart}
          />
        ))}

        {tasks.length === 0 && (
          <div
            className={`h-28 border border-dashed rounded-xl flex items-center justify-center text-xs text-slate-500 transition ${
              isDragOver ? 'border-indigo-400 bg-indigo-500/5 text-indigo-300' : 'border-slate-800'
            }`}
          >
            {isDragOver ? 'Drop task here' : 'No tasks in this column'}
          </div>
        )}
      </div>
    </div>
  );
};
