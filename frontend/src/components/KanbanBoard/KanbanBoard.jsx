import React, { useState, useEffect } from 'react';
import { BoardColumn } from './BoardColumn';
import { TaskDetailsModal } from '../TaskDetails/TaskDetailsModal';
import { CreateTaskModal } from '../TaskCreate/CreateTaskModal';
import {
  Layout,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const KanbanBoard = () => {
  const { selectedTenant, currentRole } = useAuth();
  const { socket } = useSocket();

  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createTaskColumnId, setCreateTaskColumnId] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);

  // Load boards when tenant changes
  useEffect(() => {
    if (selectedTenant) {
      loadBoards();
      loadTenantUsers();
    }
  }, [selectedTenant]);

  // Load board columns and tasks when activeBoard changes
  useEffect(() => {
    if (activeBoard) {
      loadBoardData(activeBoard.id);
    }
  }, [activeBoard]);

  // Socket.IO Real-Time Synchronization Listener
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = ({ task }) => {
      if (task.boardId === activeBoard?.id) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === task.id)) return prev;
          return [...prev, task];
        });
      }
    };

    const handleTaskUpdated = ({ task }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...task } : t))
      );
      if (selectedTask?.id === task.id) {
        setSelectedTask(task);
      }
    };

    const handleTaskMoved = ({ taskId, task, sourceColumnId, destinationColumnId, newPosition }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...task } : t))
      );
    };

    const handleTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    };

    const handleBoardUpdated = ({ action, board, boardId }) => {
      if (action === 'created') {
        setBoards((prev) => [board, ...prev]);
      } else if (action === 'updated') {
        setBoards((prev) => prev.map((b) => (b.id === board.id ? board : b)));
        if (activeBoard?.id === board.id) setActiveBoard(board);
      } else if (action === 'deleted') {
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
        if (activeBoard?.id === boardId) {
          setActiveBoard(boards.find((b) => b.id !== boardId) || null);
        }
      }
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('board:updated', handleBoardUpdated);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('board:updated', handleBoardUpdated);
    };
  }, [socket, activeBoard, selectedTask]);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/boards');
      const bList = res.data.data;
      setBoards(bList);
      if (bList.length > 0) {
        setActiveBoard(bList[0]);
      } else {
        setActiveBoard(null);
        setColumns([]);
        setTasks([]);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoardData = async (boardId) => {
    try {
      setLoading(true);
      const res = await api.get(`/boards/${boardId}`);
      const bData = res.data.data;
      setColumns(bData.columns || []);

      // Flatten tasks from columns
      const allTasks = [];
      (bData.columns || []).forEach((c) => {
        if (c.tasks) {
          c.tasks.forEach((t) => allTasks.push({ ...t, column: c }));
        }
      });
      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to load board columns & tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantUsers = async () => {
    try {
      const res = await api.get(`/tenants/${selectedTenant.id}/users`);
      setTenantUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tenant users:', err);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      const res = await api.post('/boards', {
        name: newBoardName.trim(),
        description: 'New Kanban Project Board'
      });
      const created = res.data.data;
      setBoards((prev) => [created, ...prev]);
      setActiveBoard(created);
      setNewBoardName('');
      setShowNewBoardInput(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create board');
    }
  };

  // Drag and Drop with Optimistic UI Update & Version Checking
  const handleMoveTask = async (task, destinationColumnId, newPosition) => {
    if (task.columnId === destinationColumnId) return;

    const previousTasks = [...tasks];
    const destinationColumn = columns.find((c) => c.id === destinationColumnId);

    // 1. Optimistic Update in UI
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              columnId: destinationColumnId,
              column: destinationColumn,
              position: newPosition,
              version: t.version + 1
            }
          : t
      )
    );

    // 2. Persist to Backend with Expected Version
    try {
      const res = await api.patch(`/tasks/${task.id}/move`, {
        destinationColumnId,
        newPosition,
        expectedVersion: task.version
      });

      // Update with server confirmed version
      const confirmedTask = res.data.data;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...confirmedTask } : t))
      );
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert optimistic update
      setTasks(previousTasks);

      if (err.response && err.response.status === 409) {
        alert(
          `Conflict detected! Another user moved or updated this task concurrently. UI has been resynchronized.`
        );
        loadBoardData(activeBoard.id);
      } else {
        alert(err.response?.data?.error || 'Failed to move task');
      }
    }
  };

  const handleCreateTask = async (taskData) => {
    const res = await api.post('/tasks', taskData);
    const created = res.data.data;
    setTasks((prev) => [...prev, created]);
  };

  const handleUpdateTask = async (taskId, updateData) => {
    const res = await api.put(`/tasks/${taskId}`, updateData);
    const updated = res.data.data;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
    setSelectedTask(updated);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      {/* Board Selector Tabs & Top Control Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-6 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Boards Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBoard(b)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  activeBoard?.id === b.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>{b.name}</span>
              </button>
            ))}

            {/* Create Board Button (Admins only) */}
            {(currentRole === 'Org Admin' || currentRole === 'Tenant Admin') && (
              <>
                {showNewBoardInput ? (
                  <form onSubmit={handleCreateBoard} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Board name..."
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewBoardInput(false)}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewBoardInput(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 border border-slate-700/60 text-xs font-medium flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Board</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Search, Filter & Add Task Button */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            {/* Add Task Button */}
            <button
              onClick={() => {
                setCreateTaskColumnId(columns[0]?.id || null);
                setCreateTaskModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Board description header */}
        {activeBoard && (
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <p>{activeBoard.description || 'Collaborative Kanban workspace'}</p>
            <span className="text-[11px] text-slate-500">
              {filteredTasks.length} total tasks displayed
            </span>
          </div>
        )}
      </div>

      {/* Kanban Board Columns Area */}
      <div className="flex-1 overflow-x-auto p-6">
        {loading && tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading board tasks...</span>
          </div>
        ) : activeBoard ? (
          <div className="flex items-start gap-4 min-w-max h-full">
            {columns.map((column) => {
              const colTasks = filteredTasks
                .filter((t) => t.columnId === column.id)
                .sort((a, b) => a.position - b.position);

              return (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={colTasks}
                  onSelectTask={(task) => setSelectedTask(task)}
                  onOpenCreateTask={(colId) => {
                    setCreateTaskColumnId(colId);
                    setCreateTaskModalOpen(true);
                  }}
                  onMoveTask={handleMoveTask}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <FolderPlus className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-200">No Kanban Boards Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Create a board to start collaborating on tasks with your team in this branch.
            </p>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          columns={columns}
          tenantUsers={tenantUsers}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Create Task Modal */}
      {createTaskModalOpen && (
        <CreateTaskModal
          boardId={activeBoard?.id}
          initialColumnId={createTaskColumnId}
          columns={columns}
          tenantUsers={tenantUsers}
          onClose={() => setCreateTaskModalOpen(false)}
          onCreateTask={handleCreateTask}
        />
      )}
    </div>
  );
};
