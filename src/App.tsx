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
import { fetchMorningQuote } from "./services/ai";
import { Sun, Sparkles, Coffee, Target, ArrowRight, BookOpen, Moon } from "lucide-react";
import { Card } from "./components/ui/card";

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
    savedTags,
    startDay,
    wrapUpDay,
    reopenDay,
    addDynamicTask,
  } = useTaskEngine();

  const [currentView, setView] = React.useState<"dashboard" | "analytics">("dashboard");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [confettiTrigger, setConfettiTrigger] = React.useState(false);

  // Onboarding wizard states
  const [morningStep, setMorningStep] = React.useState<"welcome" | "goals" | "task" | "none">("none");
  const [morningQuote, setMorningQuote] = React.useState("Your limitation—it's only your imagination. Make today count.");
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [firstTaskName, setFirstTaskName] = React.useState("");
  const [firstTaskTag, setFirstTaskTag] = React.useState("DSA");
  const [isCustomFirstTag, setIsCustomFirstTag] = React.useState(false);
  const [customFirstTagVal, setCustomFirstTagVal] = React.useState("");
  const [dailyTargetCount, setDailyTargetCount] = React.useState(4);
  const [dailyGoalsText, setDailyGoalsText] = React.useState("");

  // Sync dark mode class on initial mount
  React.useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  // Load quote on mount or when day reset occurs
  React.useEffect(() => {
    if (todayRecord && !todayRecord.isDayStarted) {
      setMorningStep("welcome");
      fetchMorningQuote("Parthiv").then((q) => {
        if (q) setMorningQuote(q);
      });
    } else {
      setMorningStep("none");
    }
  }, [todayRecord?.isDayStarted]);

  const handleQuoteClick = async () => {
    if (quoteLoading) return;
    setQuoteLoading(true);
    try {
      const q = await fetchMorningQuote("Parthiv");
      if (q) setMorningQuote(q);
    } catch (e) {
      console.error(e);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleStartDaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTag = isCustomFirstTag ? customFirstTagVal.trim() : firstTaskTag;
    if (!firstTaskName.trim() || !finalTag) return;

    startDay(firstTaskName.trim(), finalTag, dailyTargetCount, dailyGoalsText);
    setMorningStep("none");
    
    // Fire celebratory confetti!
    setConfettiTrigger(true);
    setTimeout(() => setConfettiTrigger(false), 4000);
  };

  // Trigger celebration on completing any task
  const lastCompletedCountRef = React.useRef(todayRecord.completedCount);
  React.useEffect(() => {
    if (todayRecord.completedCount > lastCompletedCountRef.current) {
      setConfettiTrigger(true);
      const timer = setTimeout(() => setConfettiTrigger(false), 4000);
      lastCompletedCountRef.current = todayRecord.completedCount;
      return () => clearTimeout(timer);
    }
    lastCompletedCountRef.current = todayRecord.completedCount;
  }, [todayRecord.completedCount]);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return; // Skip shortcuts when typing
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (activeTaskId) {
          pauseTask(activeTaskId);
        } else if (todayRecord.tasks.length > 0) {
          const firstIncomplete = todayRecord.tasks.find((t) => t.status !== "completed");
          if (firstIncomplete) {
            startTask(firstIncomplete.id);
          }
        }
      } else if (e.key === "Enter") {
        if (activeTaskId) {
          e.preventDefault();
          completeTask(activeTaskId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTaskId, todayRecord.tasks, startTask, pauseTask, completeTask]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-gray-800 dark:bg-zinc-950 dark:text-zinc-200 transition-colors duration-200 selection:bg-[#4285F4]/20 selection:text-[#4285F4] relative">
      {/* Dynamic Celebration */}
      <ConfettiEffect trigger={confettiTrigger} />

      {/* Top Header Navigation Panel */}
      <Header
        id="app-header"
        currentView={currentView}
        setView={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Content */}
      <main className="px-4 md:px-8 py-6">
        {/* Morning Setup Overlay / Popup */}
        {morningStep !== "none" && !todayRecord.isDayStarted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
            {morningStep === "welcome" ? (
              <Card className="w-full max-w-lg p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-3xl shadow-2xl text-center space-y-6 transform animate-scale-up">
                <div className="mx-auto w-14 h-14 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                  <Sun className="w-8 h-8 animate-spin-slow" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Good Morning, Parthiv!
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Your focus is your greatest asset. Click the quote below to cycle daily inspiration:
                  </p>
                </div>

                <div 
                  onClick={handleQuoteClick}
                  className={`p-6 bg-zinc-50 hover:bg-zinc-100/70 active:scale-[0.99] dark:bg-zinc-950/40 dark:hover:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-850 relative cursor-pointer group transition-all duration-300 shadow-sm hover:shadow ${quoteLoading ? 'opacity-50' : ''}`}
                  title="Click to refresh quote"
                >
                  <span className="absolute top-2 left-3 text-4xl font-serif text-gray-200 dark:text-zinc-800 pointer-events-none select-none">“</span>
                  <span className="absolute bottom-2 right-4 text-4xl font-serif text-gray-200 dark:text-zinc-800 pointer-events-none select-none">”</span>
                  
                  <p className="text-sm font-medium italic text-gray-700 dark:text-zinc-300 leading-relaxed font-sans px-4">
                    {morningQuote}
                  </p>
                  
                  <div className="mt-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span>Click to change quote</span>
                  </div>
                </div>

                <button
                  onClick={() => setMorningStep("goals")}
                  className="w-full py-3.5 bg-black hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-white rounded-2xl text-sm font-bold transition-all shadow-md border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  LET'S START THE DAY
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Card>
            ) : morningStep === "goals" ? (
              <Card className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-3xl shadow-2xl space-y-5 transform animate-scale-up">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#4285F4]/10 dark:bg-blue-950/40 text-[#4285F4] rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                      Today's Ambition Target
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Set a completion target and focus goals before scheduling tasks.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Target Completed Tasks Count
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={dailyTargetCount}
                        onChange={(e) => setDailyTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white font-bold"
                      />
                      <span className="absolute right-3 text-[10px] text-gray-400 font-medium">tasks</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Your daily completion rate will scale against this benchmark.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Goal Focus List (Rough Notes)
                    </label>
                    <textarea
                      placeholder="e.g. Finish 3 Leetcode, Review Web UI layout, Complete GATE revision notes"
                      value={dailyGoalsText}
                      onChange={(e) => setDailyGoalsText(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white font-sans resize-none"
                    />
                  </div>

                  <button
                    onClick={() => setMorningStep("task")}
                    className="w-full py-3.5 bg-black hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-white rounded-2xl text-xs font-bold transition-all shadow-md border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    NEXT: INITIALIZE FIRST TASK
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ) : (
              <Card className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-3xl shadow-2xl space-y-5 transform animate-scale-up">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                      First Task of the Day
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Specify what you are starting with now.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleStartDaySubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Activity Title
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Preparing DSA Array Problems, Designing UI mockups"
                      value={firstTaskName}
                      onChange={(e) => setFirstTaskName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Select Tag
                      </label>
                      {isCustomFirstTag ? (
                        <input
                          type="text"
                          required
                          placeholder="Type custom tag..."
                          value={customFirstTagVal}
                          onChange={(e) => setCustomFirstTagVal(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#4285F4] dark:text-white"
                        />
                      ) : (
                        <select
                          value={firstTaskTag}
                          onChange={(e) => setFirstTaskTag(e.target.value)}
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
                        onClick={() => setIsCustomFirstTag(!isCustomFirstTag)}
                        className="text-xs text-[#4285F4] hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer font-semibold"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {isCustomFirstTag ? "Select from list" : "Use custom tag"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#4285F4] hover:bg-blue-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sun className="w-4 h-4" />
                    START MY DAY & TRACK TIMER
                  </button>
                </form>
              </Card>
            )}
          </div>
        )}

        {/* Regular views content */}
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
                  addDynamicTask={addDynamicTask}
                  deleteCustomTask={deleteCustomTask}
                  savedTags={savedTags}
                />
              </div>

              {/* Custom habits/study items (40% width on LG+) */}
              <div className="lg:col-span-5">
                <CustomTaskList
                  id="custom-tasks-section"
                  todayRecord={todayRecord}
                  addDynamicTask={addDynamicTask}
                  wrapUpDay={wrapUpDay}
                  reopenDay={reopenDay}
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
