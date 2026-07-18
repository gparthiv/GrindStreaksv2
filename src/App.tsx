import * as React from "react";
import { useTaskEngine } from "./hooks/useTaskEngine";
import { Header } from "./components/layout/Header";
import { HeroCard } from "./components/dashboard/HeroCard";
import { Heatmap } from "./components/dashboard/Heatmap";
import { TimetableList } from "./components/dashboard/TimetableList";
import { CustomTaskList } from "./components/dashboard/CustomTaskList";
import { AnalyticsPage } from "./components/analytics/AnalyticsPage";
import { SettingsModal } from "./components/settings/SettingsModal";
import { ConfettiEffect } from "./components/shared/ConfettiEffect";

export default function App() {
  const {
    todayRecord,
    settings,
    history,
    activeTaskId,
    startTask,
    pauseTask,
    completeTask,
    resetTask,
    addCustomTask,
    renameCustomTask,
    deleteCustomTask,
    toggleDarkMode,
    handleResetToday,
    handleImportJSON,
    getLiveDuration,
    reloadTodayRecord,
  } = useTaskEngine();

  const [currentView, setView] = React.useState<"dashboard" | "analytics">("dashboard");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [confettiTrigger, setConfettiTrigger] = React.useState(false);

  // Sync dark mode class on initial mount
  React.useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  // Trigger celebration only when ALL 8 timetable tasks are completed!
  const allMainCompleted = React.useMemo(() => {
    const mainTasks = todayRecord.tasks.filter((t) => t.type === "Main");
    return mainTasks.length > 0 && mainTasks.every((t) => t.status === "completed");
  }, [todayRecord.tasks]);

  React.useEffect(() => {
    if (allMainCompleted) {
      setConfettiTrigger(true);
      const timer = setTimeout(() => setConfettiTrigger(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [allMainCompleted]);

  // Global Keyboard Shortcuts
  // Space = Start/Pause, Enter = Complete, Ctrl + N = Focus custom task add input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return; // Skip shortcuts when typing
      }

      if (e.code === "Space") {
        e.preventDefault(); // Prevent window scrolling
        if (activeTaskId) {
          pauseTask(activeTaskId);
        } else {
          // Find the first non-completed Main timetable task to auto-start
          const firstIncomplete = todayRecord.tasks.find(
            (t) => t.type === "Main" && t.status !== "completed"
          );
          if (firstIncomplete) {
            startTask(firstIncomplete.id);
          }
        }
      } else if (e.key === "Enter") {
        if (activeTaskId) {
          e.preventDefault();
          completeTask(activeTaskId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        // Shift view to dashboard if currently in analytics to allow adding
        setView("dashboard");
        setTimeout(() => {
          const inputEl = document.querySelector("input[placeholder*='track today']");
          if (inputEl instanceof HTMLInputElement) {
            inputEl.focus();
          }
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTaskId, todayRecord.tasks, startTask, pauseTask, completeTask]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-gray-800 dark:bg-zinc-950 dark:text-zinc-200 transition-colors duration-200 selection:bg-[#4285F4]/20 selection:text-[#4285F4]">
      {/* Dynamic Celebration */}
      <ConfettiEffect trigger={confettiTrigger} />

      {/* Top Header Navigation Panel */}
      <Header
        id="app-header"
        currentView={currentView}
        setView={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* View Content Layout Container */}
      <main className="px-4 md:px-8 py-6">
        {currentView === "dashboard" ? (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Row 1: Hero stats block */}
            <HeroCard
              id="hero-stats"
              streak={settings.streak}
              maxStreak={settings.maxStreak}
              completionRate={todayRecord.completionRate}
              completedCount={todayRecord.completedCount}
              totalCount={todayRecord.totalCount}
              studyTimeMs={todayRecord.studyTime}
            />

            {/* Row 2: Consistency heatmap */}
            <Heatmap
              id="consistency-heatmap"
              history={history}
              todayRecord={todayRecord}
            />

            {/* Row 3: Timetable & Custom Task Cards Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Daily timetable list (60% width on LG+) */}
              <div className="lg:col-span-7">
                <TimetableList
                  id="timetable-section"
                  tasks={todayRecord.tasks}
                  activeTaskId={activeTaskId}
                  startTask={startTask}
                  pauseTask={pauseTask}
                  completeTask={completeTask}
                  resetTask={resetTask}
                  getLiveDuration={getLiveDuration}
                />
              </div>

              {/* Custom habits/study items (40% width on LG+) */}
              <div className="lg:col-span-5">
                <CustomTaskList
                  id="custom-tasks-section"
                  tasks={todayRecord.tasks}
                  activeTaskId={activeTaskId}
                  startTask={startTask}
                  pauseTask={pauseTask}
                  completeTask={completeTask}
                  resetTask={resetTask}
                  addCustomTask={addCustomTask}
                  renameCustomTask={renameCustomTask}
                  deleteCustomTask={deleteCustomTask}
                  getLiveDuration={getLiveDuration}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Multi-dimensional analytics dashboard */
          <AnalyticsPage
            id="analytics-section"
            history={history}
            todayRecord={todayRecord}
            settings={settings}
          />
        )}
      </main>

      {/* Preferences & Backup Manager Modal */}
      <SettingsModal
        id="settings-overlay-panel"
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        toggleDarkMode={toggleDarkMode}
        handleResetToday={handleResetToday}
        handleImportJSON={handleImportJSON}
        reloadTodayRecord={reloadTodayRecord}
      />
    </div>
  );
}
