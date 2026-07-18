import * as React from "react";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { Flame, Trophy, Clock, CheckCircle } from "lucide-react";

interface HeroCardProps {
  streak: number;
  maxStreak: number;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  studyTimeMs: number;
  id: string;
}

const MOTIVATIONAL_QUOTES = [
  "Consistency is what transforms average into excellence.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
  "Focus is a muscle, and you build it by resisting distraction.",
  "Small daily improvements over time lead to stunning results.",
  "It is not that we have a short time to live, but that we waste a lot of it.",
  "Amateurs wait for inspiration. Professionals get to work.",
  "The only bad study session is the one that did not happen.",
];

export const HeroCard: React.FC<HeroCardProps> = ({
  streak,
  maxStreak,
  completionRate,
  completedCount,
  totalCount,
  studyTimeMs,
  id,
}) => {
  // Deterministic quote of the day based on day of the month
  const quote = React.useMemo(() => {
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
  }, []);

  // Format study time: e.g. "8h 12m"
  const formatStudyTime = (ms: number): string => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hours === 0 && mins === 0) return "0m";
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card id={id} className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 shadow-sm relative overflow-hidden rounded-[16px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Section: Today's Completion & Quote */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#5F6368] dark:text-zinc-400 uppercase tracking-wider">
              Today's Progress
            </span>
            <h2 className="text-2xl md:text-3xl font-sans font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
              Completion Rate: <span className="text-[#1A73E8] dark:text-blue-400">{completionRate}%</span>
            </h2>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400 font-medium">
              <span>{completedCount} of {totalCount} tasks completed</span>
              <span className="font-semibold text-gray-800 dark:text-zinc-300">{completionRate}%</span>
            </div>
            <Progress value={completionRate} indicatorColor="bg-[#34A853]" className="h-2.5 bg-[#F1F3F4] dark:bg-zinc-800 rounded-full" />
          </div>

          <p className="text-xs text-[#5F6368] dark:text-zinc-400 italic pt-3 border-t border-[#F1F3F4] dark:border-zinc-800/50 leading-relaxed">
            "{quote}"
          </p>
        </div>

        {/* Right Section: Streak and Study Time Block */}
        <div className="lg:col-span-5 grid grid-cols-3 gap-3 md:gap-4 lg:border-l lg:border-[#F1F3F4] lg:dark:border-zinc-800 lg:pl-8">
          {/* Streak 1 */}
          <div id={`${id}-streak`} className="flex flex-col p-3 rounded-xl bg-[#F8F9FA] dark:bg-zinc-950 border border-[#F1F3F4] dark:border-zinc-900 transition-all hover:shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-[#5F6368] dark:text-zinc-400 font-bold mb-1">Streak</span>
            <span className="text-xl font-semibold text-[#4285F4] dark:text-blue-400 mt-auto">{streak} Days</span>
          </div>

          {/* Streak 2 */}
          <div id={`${id}-longest`} className="flex flex-col p-3 rounded-xl bg-[#F8F9FA] dark:bg-zinc-950 border border-[#F1F3F4] dark:border-zinc-900 transition-all hover:shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-[#5F6368] dark:text-zinc-400 font-bold mb-1">Best</span>
            <span className="text-xl font-semibold text-[#1A73E8] dark:text-blue-500 mt-auto">{maxStreak} Days</span>
          </div>

          {/* Active Work Time */}
          <div id={`${id}-time`} className="flex flex-col p-3 rounded-xl bg-[#F8F9FA] dark:bg-zinc-950 border border-[#F1F3F4] dark:border-zinc-900 transition-all hover:shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-[#5F6368] dark:text-zinc-400 font-bold mb-1">Study Time</span>
            <span className="text-xl font-semibold text-[#3C4043] dark:text-zinc-100 mt-auto font-sans tracking-tight">{formatStudyTime(studyTimeMs)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
