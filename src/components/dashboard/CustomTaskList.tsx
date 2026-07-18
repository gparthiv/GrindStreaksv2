import * as React from "react";
import { Card } from "../ui/card";
import { Task } from "../../types";
import { Plus, Search, Edit2, Trash2, Undo, Play, Check, RotateCcw, Clock, CheckSquare } from "lucide-react";
import { formatTimer } from "./TimetableList";

interface CustomTaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  startTask: (id: string, force?: boolean) => { conflict: boolean; runningTaskId?: string };
  pauseTask: (id: string) => void;
  completeTask: (id: string) => void;
  resetTask: (id: string) => void;
  addCustomTask: (name: string, category: string) => void;
  renameCustomTask: (id: string, newName: string) => void;
  deleteCustomTask: (id: string) => { deletedTask: Task | undefined; undo: () => void };
  getLiveDuration: (task: Task) => number;
  id: string;
}

const CATEGORIES = ["Custom", "DSA", "Web", "CAT", "Certificates", "Routine"];

export const CustomTaskList: React.FC<CustomTaskListProps> = ({
  tasks,
  activeTaskId,
  startTask,
  pauseTask,
  completeTask,
  resetTask,
  addCustomTask,
  renameCustomTask,
  deleteCustomTask,
  getLiveDuration,
  id,
}) => {
  const [taskName, setTaskName] = React.useState("");
  const [taskCategory, setTaskCategory] = React.useState("Custom");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  
  // Undo state
  const [lastDeleted, setLastDeleted] = React.useState<{
    task: Task;
    restore: () => void;
  } | null>(null);

  const customTasks = React.useMemo(() => tasks.filter((t) => t.type === "Custom"), [tasks]);

  const filteredTasks = React.useMemo(() => {
    return customTasks.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customTasks, searchQuery]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    addCustomTask(taskName.trim(), taskCategory);
    setTaskName("");
    setTaskCategory("Custom");
  };

  const handleRenameSubmit = (id: string) => {
    if (!editName.trim()) return;
    renameCustomTask(id, editName.trim());
    setEditingTaskId(null);
  };

  const handleDelete = (id: string) => {
    const res = deleteCustomTask(id);
    if (res.deletedTask) {
      setLastDeleted({
        task: res.deletedTask,
        restore: res.undo,
      });
      // Clear undo notice after 6 seconds
      setTimeout(() => {
        setLastDeleted((prev) => (prev?.task.id === id ? null : prev));
      }, 6000);
    }
  };

  const triggerUndo = () => {
    if (lastDeleted) {
      lastDeleted.restore();
      setLastDeleted(null);
    }
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditName(task.name);
  };

  return (
    <div id={id} className="space-y-4">
      {/* Header section with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="font-sans font-semibold text-[#3C4043] dark:text-zinc-100 text-lg">
            Custom Tasks
          </h3>
          <p className="text-xs text-[#5F6368] dark:text-zinc-500 font-medium">Track tasks outside your regular timetable.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search custom tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#E0E3E7] rounded-xl text-xs text-[#3C4043] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200"
          />
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-white dark:bg-zinc-950 border border-[#E0E3E7] dark:border-zinc-900 rounded-[16px] items-center shadow-sm">
        <div className="sm:col-span-6">
          <input
            type="text"
            placeholder="What study session or habit to track today?"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-[#E0E3E7] rounded-xl text-xs text-[#3C4043] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={taskCategory}
            onChange={(e) => setTaskCategory(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-[#E0E3E7] rounded-xl text-xs text-[#5F6368] dark:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 font-semibold"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#34A853] hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </form>

      {/* Undo Banner */}
      {lastDeleted && (
        <div className="flex items-center justify-between p-3 bg-gray-950 text-white rounded-xl shadow-lg border border-gray-800 text-xs animate-fade-in animate-duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#34A853]" />
            <span>Task <strong>"{lastDeleted.task.name}"</strong> deleted.</span>
          </div>
          <button
            onClick={triggerUndo}
            className="flex items-center gap-1 text-[#4285F4] hover:text-blue-400 font-semibold transition-colors uppercase text-[10px] tracking-wider"
          >
            <Undo className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}

      {/* Task List Grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-[#E0E3E7] dark:border-zinc-800 rounded-[16px] bg-[#F8F9FA] dark:bg-zinc-950/20">
          <p className="text-xs text-[#5F6368] dark:text-zinc-500 font-medium">
            {searchQuery ? "No matching custom tasks found." : "No custom tasks created for today."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const liveDuration = getLiveDuration(task);
            const isCompleted = task.status === "completed";
            const isRunning = task.status === "running";
            const isEditing = editingTaskId === task.id;

            return (
              <Card
                key={task.id}
                id={`custom-task-card-${task.id}`}
                className={`p-4 md:p-5 flex flex-col justify-between gap-4 transition-all duration-200 bg-white dark:bg-zinc-900 ${
                  isCompleted 
                    ? "border border-[#E0E3E7] dark:border-zinc-850 opacity-40 select-none" 
                    : isRunning
                      ? "border-2 border-[#4285F4] ring-4 ring-[#4285F4]/10 shadow-md"
                      : "border border-[#E0E3E7] dark:border-zinc-800 shadow-sm"
                }`}
              >
                {/* Upper block with Title / Category / Rename Input */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-mono font-bold text-[#1A73E8] bg-[#E8F0FE] dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {task.category}
                    </span>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(task.id)}
                          className="px-2 py-1 border border-[#E0E3E7] dark:border-zinc-800 text-xs text-[#3C4043] dark:text-zinc-100 bg-white dark:bg-zinc-900 rounded-lg w-full focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameSubmit(task.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-[#34A853] hover:bg-green-600 text-white rounded-lg cursor-pointer border-none"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-lg cursor-pointer border-none"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h4 className={`text-sm md:text-base font-semibold font-sans mt-2 ${
                        isRunning ? "text-[#1A73E8] dark:text-blue-400 font-bold" : "text-[#3C4043] dark:text-zinc-200"
                      }`}>
                        {task.name}
                      </h4>
                    )}
                  </div>

                  {/* Actions (Rename / Delete) - Only if not completed */}
                  {!isCompleted && !isEditing && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1 text-gray-400 hover:text-[#1A73E8] dark:hover:text-zinc-200 rounded hover:bg-[#F1F3F4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Rename task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1 text-gray-400 hover:text-[#EA4335] dark:hover:text-red-400 rounded hover:bg-[#F1F3F4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {isCompleted && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 text-gray-400 hover:text-[#EA4335] dark:hover:text-red-400 rounded hover:bg-[#F1F3F4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete task history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lower block with Live Timer & Controls */}
                <div className="flex items-center justify-between border-t border-[#F1F3F4] dark:border-zinc-800/50 pt-3">
                  {/* Timer */}
                  <div className="flex items-center gap-1.5 font-sans text-xs md:text-sm text-[#5F6368] dark:text-zinc-400">
                    <Clock className={`w-3.5 h-3.5 ${isRunning ? "text-[#4285F4] animate-pulse" : ""}`} />
                    <span className={`font-semibold tabular-nums ${isRunning ? "text-[#4285F4] font-bold" : ""}`}>
                      {formatTimer(liveDuration)}
                    </span>
                  </div>

                  {/* Play & Complete controls */}
                  <div className="flex gap-1.5">
                    {!isCompleted && isRunning ? (
                      <button
                        onClick={() => pauseTask(task.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#EA4335] text-white hover:bg-red-600 text-xs font-bold shadow-sm transition-colors cursor-pointer border-none"
                        title="Pause task"
                      >
                        PAUSE
                      </button>
                    ) : (
                      <button
                        onClick={() => startTask(task.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-[#34A853] hover:bg-green-600 text-white shadow-sm border-none"
                        title={isCompleted ? "Restart session" : "Start task"}
                      >
                        {isCompleted ? "RESTART" : "START"}
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        onClick={() => completeTask(task.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer bg-[#34A853] hover:bg-green-600 text-white disabled:bg-[#34A853]/40 disabled:text-white/60 disabled:cursor-not-allowed border-none"
                        title="Mark as Completed"
                        disabled={!isRunning && liveDuration === 0}
                      >
                        DONE
                      </button>
                    )}

                    {(isCompleted || liveDuration > 0) && (
                      <button
                        onClick={() => resetTask(task.id)}
                        className="p-1.5 rounded-lg bg-white border border-[#E0E3E7] hover:bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        title="Reset task timer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
