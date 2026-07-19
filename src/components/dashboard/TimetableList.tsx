import * as React from "react";
import { Card } from "../ui/card";
import { Task } from "../../types";
import { Play, Check, RotateCcw, AlertTriangle, Clock, Trash2, Plus, Tag, HelpCircle, Pause } from "lucide-react";
import { Modal } from "../shared/Modal";

interface TimetableListProps {
  tasks: Task[];
  activeTaskId: string | null;
  startTask: (id: string, force?: boolean) => { conflict: boolean; runningTaskId?: string };
  pauseTask: (id: string) => void;
  completeTask: (id: string) => void;
  resetTask: (id: string) => void;
  getLiveDuration: (task: Task) => number;
  id: string;
  addDynamicTask?: (name: string, tag: string, startImmediately?: boolean) => void;
  deleteCustomTask?: (id: string) => void;
  savedTags?: string[];
}

export const formatTimer = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
};

export const TimetableList: React.FC<TimetableListProps> = ({
  tasks,
  activeTaskId,
  startTask,
  pauseTask,
  completeTask,
  resetTask,
  getLiveDuration,
  id,
  addDynamicTask,
  deleteCustomTask,
  savedTags = ['DSA', 'Web Dev', 'CAT Prep', 'Certifications & AI', 'Routines & Rest'],
}) => {
  const [conflictModal, setConflictModal] = React.useState<{
    isOpen: boolean;
    pendingId: string;
    runningTaskName: string;
  }>({
    isOpen: false,
    pendingId: "",
    runningTaskName: "",
  });

  const [restartConfirmModal, setRestartConfirmModal] = React.useState<{
    isOpen: boolean;
    taskId: string;
    taskName: string;
  }>({
    isOpen: false,
    taskId: "",
    taskName: "",
  });

  // Adding dynamic task form state
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTaskName, setNewTaskName] = React.useState("");
  const [newTaskTag, setNewTaskTag] = React.useState("DSA");
  const [isCustomTag, setIsCustomTag] = React.useState(false);
  const [customTagVal, setCustomTagVal] = React.useState("");

  const handleStart = (task: Task) => {
    if (task.status === "completed") {
      setRestartConfirmModal({
        isOpen: true,
        taskId: task.id,
        taskName: task.name,
      });
      return;
    }

    const res = startTask(task.id);
    if (res.conflict && res.runningTaskId) {
      const runningTask = tasks.find((t) => t.id === res.runningTaskId);
      setConflictModal({
        isOpen: true,
        pendingId: task.id,
        runningTaskName: runningTask ? runningTask.name : "another task",
      });
    }
  };

  const confirmSwitch = () => {
    startTask(conflictModal.pendingId, true);
    setConflictModal({ isOpen: false, pendingId: "", runningTaskName: "" });
  };

  const confirmRestart = () => {
    resetTask(restartConfirmModal.taskId);
    setTimeout(() => {
      startTask(restartConfirmModal.taskId);
    }, 50);
    setRestartConfirmModal({ isOpen: false, taskId: "", taskName: "" });
  };

  const handleSubmitNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !addDynamicTask) return;

    const finalTag = isCustomTag ? customTagVal.trim() : newTaskTag;
    if (!finalTag) return;

    addDynamicTask(newTaskName.trim(), finalTag, true); // Auto-start for quick focus loop
    setNewTaskName("");
    setCustomTagVal("");
    setShowAddForm(false);
  };

  const getTagColor = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes("dsa")) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50";
    if (t.includes("web") || t.includes("dev")) return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50";
    if (t.includes("cat") || t.includes("prep")) return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/50";
    if (t.includes("cert") || t.includes("ai")) return "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200/50";
    if (t.includes("routine") || t.includes("rest") || t.includes("sleep")) return "bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-700/50";
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50";
  };

  return (
    <div id={id} className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-sans font-semibold text-[#3C4043] dark:text-zinc-100 text-lg">
            Today's Activity Log
          </h3>
          <p className="text-[11px] text-[#5F6368] dark:text-zinc-400 mt-0.5">
            Log and track what you are doing in real time.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Activity
        </button>
      </div>

      {/* Inline Quick Add Activity Form */}
      {showAddForm && (
        <Card className="p-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 rounded-2xl shadow-md space-y-3">
          <form onSubmit={handleSubmitNewTask} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                What are you starting now?
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Solving Striver's Array Problems, Web dev backend, CAT Mock"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Tag / Category
                </label>
                {isCustomTag ? (
                  <input
                    type="text"
                    required
                    placeholder="Type custom tag..."
                    value={customTagVal}
                    onChange={(e) => setCustomTagVal(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white"
                  />
                ) : (
                  <select
                    value={newTaskTag}
                    onChange={(e) => setNewTaskTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white"
                  >
                    {savedTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-end pb-1.5">
                <button
                  type="button"
                  onClick={() => setIsCustomTag(!isCustomTag)}
                  className="text-xs text-[#4285F4] hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer font-semibold"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {isCustomTag ? "Select from list" : "Use custom tag"}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 text-xs text-gray-500 hover:bg-[#F1F3F4] dark:hover:bg-zinc-800 rounded-xl transition-colors border-none bg-transparent cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors border-none cursor-pointer"
              >
                Start Tracking Now
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Dynamic Tasks Timeline */}
      {tasks.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 rounded-3xl flex flex-col items-center gap-3">
          <Clock className="w-10 h-10 text-gray-300 dark:text-zinc-700 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-semibold text-gray-800 dark:text-zinc-200 text-sm">No active tasks</h4>
            <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-xs leading-normal">
              Click "+ Add Activity" above to create and start tracking what you're working on today!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const liveDuration = getLiveDuration(task);
            const isCompleted = task.status === "completed";
            const isRunning = task.status === "running";

            return (
              <Card
                key={task.id}
                id={`task-card-${task.id}`}
                className={`p-4 transition-all duration-200 bg-white dark:bg-zinc-900 border ${
                  isCompleted
                    ? "border-[#E0E3E7] dark:border-zinc-850 opacity-50"
                    : isRunning
                    ? "border-[#4285F4] ring-4 ring-[#4285F4]/5 shadow-md"
                    : "border-[#E0E3E7] dark:border-zinc-800 shadow-sm"
                } rounded-2xl`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getTagColor(task.category)}`}>
                        {task.category}
                      </span>
                      {isRunning && (
                        <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-950/40 text-[#1A73E8] dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Active
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                    </div>
                    <h4 className={`text-sm font-bold leading-snug font-sans ${
                      isCompleted ? "line-through text-gray-400 dark:text-zinc-500" : "text-[#3C4043] dark:text-zinc-200"
                    }`}>
                      {task.name}
                    </h4>
                  </div>

                  {/* Right: Timer and Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-none border-[#F1F3F4] dark:border-zinc-800/60 pt-2 sm:pt-0">
                    {/* Live Tracker */}
                    <div className="flex items-center gap-1.5 font-sans text-xs font-medium text-[#5F6368] dark:text-zinc-400">
                      <Clock className={`w-3.5 h-3.5 ${isRunning ? "text-[#4285F4] animate-spin" : ""}`} />
                      <span className={`font-bold tabular-nums ${isRunning ? "text-[#4285F4]" : ""}`}>
                        {formatTimer(liveDuration)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Start/Pause */}
                      {!isCompleted && (
                        isRunning ? (
                          <button
                            onClick={() => pauseTask(task.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-all border-none cursor-pointer"
                            title="Pause tracking"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(task)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 transition-all border-none cursor-pointer"
                            title="Resume tracking"
                          >
                            <Play className="w-3.5 h-3.5 animate-pulse" />
                          </button>
                        )
                      )}

                      {/* Restart Completed */}
                      {isCompleted && (
                        <button
                          onClick={() => handleStart(task)}
                          className="px-2 py-1 bg-[#F1F3F4] text-[#5F6368] hover:bg-[#E8EAED] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded text-[10px] font-bold border-none cursor-pointer"
                        >
                          REOPEN
                        </button>
                      )}

                      {/* Done */}
                      {!isCompleted && (
                        <button
                          onClick={() => completeTask(task.id)}
                          className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all border-none cursor-pointer"
                          title="Complete Activity"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Reset */}
                      {(isCompleted || liveDuration > 0) && (
                        <button
                          onClick={() => resetTask(task.id)}
                          className="p-1.5 rounded-lg border border-[#E0E3E7] text-[#5F6368] hover:bg-[#F1F3F4] dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 bg-transparent transition-all cursor-pointer"
                          title="Reset progress"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      {deleteCustomTask && (
                        <button
                          onClick={() => deleteCustomTask(task.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all border-none bg-transparent cursor-pointer"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Switch Task Confirmation Modal */}
      <Modal
        id="conflict-dialog"
        isOpen={conflictModal.isOpen}
        onClose={() => setConflictModal({ isOpen: false, pendingId: "", runningTaskName: "" })}
        title="Switch Active Task?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 items-start p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Only one activity can be tracked in real-time. Starting this activity will automatically pause: <strong>"{conflictModal.runningTaskName}"</strong> and save its duration.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setConflictModal({ isOpen: false, pendingId: "", runningTaskName: "" })}
              className="px-4 py-2 text-xs bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl transition-colors font-bold border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmSwitch}
              className="px-4 py-2 text-xs bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl transition-colors font-bold border-none cursor-pointer"
            >
              Switch Activity
            </button>
          </div>
        </div>
      </Modal>

      {/* Restart Task Confirmation Modal */}
      <Modal
        id="restart-dialog"
        isOpen={restartConfirmModal.isOpen}
        onClose={() => setRestartConfirmModal({ isOpen: false, taskId: "", taskName: "" })}
        title="Resume Completed Activity?"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
            Do you want to reopen <strong>"{restartConfirmModal.taskName}"</strong>? This will clear its completed status and let you track more time on it.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRestartConfirmModal({ isOpen: false, taskId: "", taskName: "" })}
              className="px-4 py-2 text-xs bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl transition-colors font-bold border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmRestart}
              className="px-4 py-2 text-xs bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl transition-colors font-bold border-none cursor-pointer"
            >
              Reopen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
