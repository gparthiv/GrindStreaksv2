import * as React from "react";
import { Card } from "../ui/card";
import { Task } from "../../types";
import { Play, Check, RotateCcw, AlertTriangle, Clock } from "lucide-react";
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

  const mainTasks = React.useMemo(() => tasks.filter((t) => t.type === "Main"), [tasks]);

  const handleStart = (task: Task) => {
    // If completed, ask "Restart this task?"
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

  // Maps category to styling
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Routine":
        return "border-l-4 border-l-zinc-300 dark:border-l-zinc-700 bg-zinc-500/5";
      case "DSA":
        return "border-l-4 border-l-[#34A853] bg-[#34A853]/5";
      case "Web":
        return "border-l-4 border-l-[#4285F4] bg-[#4285F4]/5";
      case "CAT":
        return "border-l-4 border-l-[#EA4335] bg-[#EA4335]/5";
      case "GATE":
        return "border-l-4 border-l-purple-500 bg-purple-500/5";
      case "Extras":
        return "border-l-4 border-l-[#FBBC05] bg-[#FBBC05]/5";
      case "Custom":
        return "border-l-4 border-l-teal-500 bg-teal-500/5";
      default:
        return "border-l-4 border-l-pink-500 bg-pink-500/5";
    }
  };

  return (
    <div id={id} className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-sans font-semibold text-[#3C4043] dark:text-zinc-100 text-lg">
          Daily Timetable
        </h3>
        <span className="text-xs font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider">{mainTasks.length} Fixed blocks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
        {mainTasks.map((task) => {
          const liveDuration = getLiveDuration(task);
          const isCompleted = task.status === "completed";
          const isRunning = task.status === "running";

          return (
            <Card
              key={task.id}
              id={`task-card-${task.id}`}
              className={`p-5 flex flex-col justify-between gap-5 transition-all duration-200 bg-white dark:bg-zinc-900 ${getCategoryColor(task.category)} ${
                isCompleted 
                  ? "border border-y-[#E0E3E7] border-r-[#E0E3E7] dark:border-zinc-850 opacity-40 select-none pointer-events-none sm:pointer-events-auto" 
                  : isRunning
                    ? "border-2 border-[#4285F4] ring-4 ring-[#4285F4]/10 shadow-md"
                    : "border border-[#E0E3E7] dark:border-zinc-800 shadow-sm"
              }`}
            >
              {/* Task info */}
              <div className="space-y-3 flex-1">
                {/* 1. Large Time Range */}
                <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-sans tracking-tight">
                  {task.scheduledStart} – {task.scheduledEnd}
                </div>

                {/* 2. Task Name */}
                <h4 className={`text-base sm:text-lg font-bold font-sans tracking-tight leading-snug ${
                  isRunning ? "text-[#1A73E8] dark:text-blue-400 font-extrabold" : "text-[#3C4043] dark:text-zinc-200"
                }`}>
                  {task.name}
                </h4>

                {/* 3. Category Chip & 4. Status Tag */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                    {task.category}
                  </span>
                  
                  {isRunning ? (
                    <span className="text-[10px] bg-[#E8F0FE] text-[#1967D2] dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      Active
                    </span>
                  ) : isCompleted ? (
                    <span className="text-[10px] bg-[#E6F4EA] text-[#137333] dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      Done
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Live Counter & Action buttons */}
              <div className="flex items-center gap-4 w-full justify-between pt-3 border-t border-[#F1F3F4] dark:border-zinc-800/60">
                {/* Timer block */}
                <div className="flex items-center gap-1.5 font-sans text-xs md:text-sm text-[#5F6368] dark:text-zinc-400">
                  <Clock className={`w-3.5 h-3.5 ${isRunning ? "text-[#4285F4] animate-pulse" : ""}`} />
                  <span className={`font-bold tabular-nums ${isRunning ? "text-[#4285F4]" : ""}`}>
                    {formatTimer(liveDuration)}
                  </span>
                </div>

                {/* Control Action Buttons */}
                <div className="flex gap-1.5">
                  {/* START / PAUSE */}
                  {!isCompleted && isRunning ? (
                    <button
                      onClick={() => pauseTask(task.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#EA4335] text-white hover:bg-red-600 text-xs font-bold shadow-sm transition-colors cursor-pointer border-none"
                      title="Pause session"
                    >
                      PAUSE
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStart(task)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-[#34A853] hover:bg-green-600 text-white shadow-sm border-none"
                      title={isCompleted ? "Restart task" : "Start timer"}
                    >
                      {isCompleted ? "RESTART" : "START"}
                    </button>
                  )}

                  {/* DONE */}
                  {!isCompleted && (
                    <button
                      onClick={() => completeTask(task.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer bg-[#34A853] hover:bg-green-600 text-white disabled:bg-[#34A853]/40 disabled:text-white/60 disabled:cursor-not-allowed border-none"
                      title="Mark as Done"
                      disabled={!isRunning && liveDuration === 0}
                    >
                      DONE
                    </button>
                  )}

                  {/* RESET (Only show if has recorded time or is completed) */}
                  {(isCompleted || liveDuration > 0) && (
                    <button
                      onClick={() => resetTask(task.id)}
                      className="p-1.5 rounded-lg bg-white border border-[#E0E3E7] hover:bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      title="Reset progress"
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
              Only one task can be active at a time. Starting this task will automatically pause the currently running task: <strong>"{conflictModal.runningTaskName}"</strong> and save its duration.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setConflictModal({ isOpen: false, pendingId: "", runningTaskName: "" })}
              className="px-4 py-2 text-xs bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl transition-colors font-bold border-none"
            >
              Cancel
            </button>
            <button
              onClick={confirmSwitch}
              className="px-4 py-2 text-xs bg-[#34A853] hover:bg-green-600 text-white rounded-xl transition-colors font-bold border-none"
            >
              Switch Task
            </button>
          </div>
        </div>
      </Modal>

      {/* Restart Task Confirmation Modal */}
      <Modal
        id="restart-dialog"
        isOpen={restartConfirmModal.isOpen}
        onClose={() => setRestartConfirmModal({ isOpen: false, taskId: "", taskName: "" })}
        title="Restart Completed Task?"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
            Do you want to restart <strong>"{restartConfirmModal.taskName}"</strong>? This will clear its completed status and reset its tracked duration so you can start tracking a fresh session.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRestartConfirmModal({ isOpen: false, taskId: "", taskName: "" })}
              className="px-4 py-2 text-xs bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl transition-colors font-bold border-none"
            >
              Cancel
            </button>
            <button
              onClick={confirmRestart}
              className="px-4 py-2 text-xs bg-[#34A853] hover:bg-green-600 text-white rounded-xl transition-colors font-bold border-none"
            >
              Reset & Start
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
