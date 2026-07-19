import * as React from "react";
import { Card } from "../ui/card";
import { Task, DayRecord } from "../../types";
import { Play, Sparkles, Moon, Sun, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";

interface CustomTaskListProps {
  todayRecord: DayRecord;
  addDynamicTask: (name: string, tag: string, startImmediately?: boolean) => void;
  wrapUpDay: () => void;
  reopenDay: () => void;
  id: string;
}

interface TemplateItem {
  name: string;
  tag: string;
  desc: string;
  color: string;
}

const QUICK_TEMPLATES: TemplateItem[] = [
  {
    name: "DSA Speedrun Session",
    tag: "DSA",
    desc: "Solve 2-3 LeetCode problems on arrays or trees.",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  {
    name: "Web Crafting & Code",
    tag: "Web Dev",
    desc: "Build APIs, design features, or fix layout bugs.",
    color: "from-blue-500/20 to-indigo-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  {
    name: "CAT Preparation Sprint",
    tag: "CAT Prep",
    desc: "Solve a mock paper or practice quantitative ability.",
    color: "from-rose-500/20 to-orange-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300",
  },
  {
    name: "AI & Certifications Research",
    tag: "Certifications & AI",
    desc: "Read research papers or complete cloud modules.",
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
  },
  {
    name: "Routine, Rest & Meal Break",
    tag: "Routines & Rest",
    desc: "Recharge, take a walk, eat, or stretch.",
    color: "from-zinc-500/20 to-slate-500/10 border-zinc-500/20 text-zinc-700 dark:text-zinc-300",
  },
];

export const CustomTaskList: React.FC<CustomTaskListProps> = ({
  todayRecord,
  addDynamicTask,
  wrapUpDay,
  reopenDay,
  id,
}) => {
  const [showConfirmWrapUp, setShowConfirmWrapUp] = React.useState(false);

  const completedStudyCount = React.useMemo(() => {
    return todayRecord.tasks.filter(
      (t) =>
        t.status === "completed" &&
        !(
          t.category.toLowerCase().includes("routine") ||
          t.category.toLowerCase().includes("rest") ||
          t.category.toLowerCase().includes("sleep")
        )
    ).length;
  }, [todayRecord.tasks]);

  const handleSpawnTemplate = (template: TemplateItem) => {
    if (todayRecord.isDayEnded) return;
    addDynamicTask(template.name, template.tag, true);
  };

  const handleConfirmWrapUp = () => {
    wrapUpDay();
    setShowConfirmWrapUp(false);
  };

  return (
    <div id={id} className="space-y-6">
      {/* 1. Day Control Widget */}
      <Card className="p-5 border border-[#E0E3E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-[#4285F4] uppercase tracking-widest">
                Day Controller
              </span>
              <h4 className="font-sans font-bold text-gray-800 dark:text-zinc-100 text-lg mt-0.5">
                {todayRecord.isDayEnded ? "Day Completed!" : "In-Progress Flow"}
              </h4>
            </div>
            {todayRecord.isDayEnded ? (
              <Moon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-spin-slow" />
            )}
          </div>

          {!todayRecord.isDayEnded ? (
            <>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                Log what you're working on, mark tasks as complete, and wrap up your day when you are ready to rest. We'll secure your daily metrics.
              </p>

              {showConfirmWrapUp ? (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/25 rounded-2xl border border-amber-200/50 space-y-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Confirm Wrap Up
                    </h5>
                    <p className="text-[11px] text-amber-700/95 dark:text-amber-400/90 leading-normal">
                      Are you sure you want to end your productive day? Any active trackers will be paused, and your stats will be recorded.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowConfirmWrapUp(false)}
                      className="px-3 py-1 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-gray-500 dark:text-zinc-400 border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmWrapUp}
                      className="px-3.5 py-1 bg-[#EA4335] hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors border-none cursor-pointer"
                    >
                      Yes, Wrap Up
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmWrapUp(true)}
                  disabled={!todayRecord.isDayStarted}
                  className="w-full py-3 bg-[#EA4335] hover:bg-red-600 disabled:bg-[#EA4335]/35 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <Moon className="w-4 h-4" />
                  WRAP UP & END THE DAY
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex gap-3 items-start">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Day Log Secured
                  </h5>
                  <p className="text-[11px] text-emerald-700/90 dark:text-zinc-400 leading-normal">
                    You have logged <span className="font-bold">{completedStudyCount} study session(s)</span> today. Enjoy your rest! Come back tomorrow to start a fresh cycle.
                  </p>
                </div>
              </div>

              <button
                onClick={reopenDay}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#5F6368] dark:text-zinc-300 rounded-2xl text-xs font-bold transition-colors border-none cursor-pointer flex items-center justify-center gap-2"
              >
                <Sun className="w-4 h-4" />
                Reopen Active Day
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Quick Templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#4285F4] animate-pulse" />
          <h4 className="font-sans font-semibold text-[#3C4043] dark:text-zinc-100 text-sm">
            Quick Spark templates
          </h4>
        </div>

        <div className="space-y-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              disabled={todayRecord.isDayEnded}
              onClick={() => handleSpawnTemplate(tpl)}
              className={`w-full text-left p-3.5 rounded-2xl border bg-gradient-to-r transition-all duration-200 ${tpl.color} ${
                todayRecord.isDayEnded
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 cursor-pointer"
              } flex justify-between items-center`}
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase bg-white/60 dark:bg-black/30 px-2 py-0.5 rounded-md">
                    {tpl.tag}
                  </span>
                </div>
                <h5 className="text-xs font-extrabold tracking-tight font-sans">
                  {tpl.name}
                </h5>
                <p className="text-[11px] opacity-75 leading-normal">
                  {tpl.desc}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/70 dark:bg-black/30 flex-shrink-0">
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
