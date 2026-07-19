import * as React from "react";
import { HistoryData, DayRecord, Settings } from "../../types";
import { getLocalDateString } from "../../services/storage";
import { fetchAICoach, getCachedAICoach, AICoachResponse } from "../../services/ai";
import { exportToCSV, exportToPDF } from "../../services/export";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend
} from "recharts";
import {
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  Calendar,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  HelpCircle,
  BarChart2,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AnalyticsPageProps {
  history: HistoryData;
  todayRecord: DayRecord;
  settings: Settings;
  id: string;
}

// Category styling colors
const GOOGLE_COLORS = [
  "#4285F4", // Blue (Web)
  "#34A853", // Green (DSA)
  "#FBBC05", // Yellow (Certificates)
  "#EA4335", // Red (CAT)
  "#9333EA", // Purple (Custom)
  "#64748B", // Slate (Routine)
];

const CATEGORY_LABEL_MAP: { [key: string]: string } = {
  Web: "Web Development",
  DSA: "DSA / Striver / CP",
  Certificates: "Certifications & AI",
  CAT: "CAT Preparation",
  Custom: "Custom Tasks",
  Routine: "Routines & Rest",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  history,
  todayRecord,
  settings,
  id,
}) => {
  // Combine historical logs and today's current log for a unified analytical database
  const combinedHistory = React.useMemo(() => {
    const db = { ...history };
    const todayStr = getLocalDateString();
    db[todayStr] = todayRecord;
    return db;
  }, [history, todayRecord]);

  // Extract all months available in the data (Format: YYYY-MM)
  const availableMonths = React.useMemo(() => {
    const dates = Object.keys(combinedHistory);
    if (dates.length === 0) {
      const d = new Date();
      return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`];
    }
    const monthsSet = new Set<string>();
    dates.forEach((d) => {
      monthsSet.add(d.substring(0, 7)); // get YYYY-MM
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a)); // newest first
  }, [combinedHistory]);

  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const todayStr = getLocalDateString();
    return todayStr.substring(0, 7);
  });

  // AI Recommendation State
  const [aiCoach, setAICoach] = React.useState<AICoachResponse | null>(null);
  const [aiLoading, setAILoading] = React.useState(false);
  const [aiError, setAIError] = React.useState<string | null>(null);

  // Fetch AI insights
  const handleFetchAIInsights = async (force = false) => {
    if (!force) {
      const cached = getCachedAICoach();
      if (cached) {
        setAICoach(cached);
        setAIError(null);
        return;
      }
    }

    setAILoading(true);
    setAIError(null);
    try {
      const res = await fetchAICoach(
        history,
        todayRecord,
        settings.streak,
        settings.maxStreak
      );
      setAICoach(res);
    } catch (err: any) {
      console.error(err);
      setAIError(err.message || "Failed to contact Consistency Coach. Please make sure server is running and GEMINI_API_KEY is configured.");
    } finally {
      setAILoading(false);
    }
  };

  React.useEffect(() => {
    handleFetchAIInsights();
  }, [history, todayRecord]);

  // Process data for the selected month
  const monthStats = React.useMemo(() => {
    const monthRecords = (Object.entries(combinedHistory) as [string, DayRecord][]).filter(([date]) =>
      date.startsWith(selectedMonth)
    );

    let totalStudyMs = 0;
    let totalRoutineMs = 0;
    let totalCompletedTasks = 0;
    let totalScheduledTasks = 0;
    let maxStudySessionMs = 0;
    let totalDaysLogged = monthRecords.length;

    // Category distributions (fully dynamic map)
    const categoryDurations: { [cat: string]: number } = {};

    // Calculate weekly study trend
    // Group by week of the month (1 to 5)
    const weeklyWork: { [week: string]: number } = {
      "Week 1": 0,
      "Week 2": 0,
      "Week 3": 0,
      "Week 4": 0,
      "Week 5": 0,
    };

    const weekdayCompletions: { [day: number]: { completed: number; total: number } } = {};
    for (let i = 0; i < 7; i++) {
      weekdayCompletions[i] = { completed: 0, total: 0 };
    }

    monthRecords.forEach(([date, record]) => {
      totalStudyMs += record.studyTime;
      
      record.tasks.forEach((task) => {
        const isStudy = !(
          task.category.toLowerCase().includes("routine") ||
          task.category.toLowerCase().includes("rest") ||
          task.category.toLowerCase().includes("sleep")
        );

        // Find longest study session (excluding Routine)
        if (isStudy && task.status === "completed" && task.duration > maxStudySessionMs) {
          maxStudySessionMs = task.duration;
        }

        // Category sums
        if (task.status === "completed") {
          if (isStudy) {
            const cat = task.category || "General";
            categoryDurations[cat] = (categoryDurations[cat] || 0) + task.duration;
          } else {
            totalRoutineMs += task.duration;
          }
        }
      });

      const dayTasks = record.tasks;
      const completed = dayTasks.filter((t) => t.status === "completed").length;
      totalCompletedTasks += completed;
      totalScheduledTasks += dayTasks.length;

      // Weekly binning
      const dayNum = new Date(date).getDate();
      const weekIndex = Math.min(5, Math.ceil(dayNum / 7));
      weeklyWork[`Week ${weekIndex}`] += record.studyTime;

      // Weekday analysis (0 = Sun, 6 = Sat)
      const wDay = new Date(date).getDay();
      weekdayCompletions[wDay].completed += completed;
      weekdayCompletions[wDay].total += dayTasks.length;
    });

    // Compute averages
    const avgDailyStudyMs = totalDaysLogged > 0 ? totalStudyMs / totalDaysLogged : 0;
    const overallCompletionRate =
      totalScheduledTasks > 0 ? Math.round((totalCompletedTasks / totalScheduledTasks) * 100) : 0;

    // Find most consistent weekday
    let bestWDay = 0;
    let maxDayRate = 0;
    Object.entries(weekdayCompletions).forEach(([day, vals]) => {
      const rate = vals.total > 0 ? vals.completed / vals.total : 0;
      if (rate > maxDayRate) {
        maxDayRate = rate;
        bestWDay = Number(day);
      }
    });
    const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const mostConsistentWeekdayName = totalDaysLogged > 0 ? DAYS_OF_WEEK[bestWDay] : "N/A";

    // Format category data for Pie Chart
    const categoryPieData = Object.entries(categoryDurations)
      .map(([cat, ms]) => ({
        name: CATEGORY_LABEL_MAP[cat] || cat,
        value: Number((ms / (1000 * 60 * 60)).toFixed(1)), // Hours
        rawMs: ms,
      }))
      .filter((d) => d.value > 0);

    // Format weekly trends for Bar Chart
    const weeklyBarData = Object.entries(weeklyWork).map(([week, ms]) => ({
      name: week,
      hours: Number((ms / (1000 * 60 * 60)).toFixed(1)),
    }));

    // Calculate Productivity Score
    // Formula: (Completion% * 0.4) + (Consistency Ratio * 0.3) + (Total study hours relative to ideal goal * 0.3)
    // Consistency ratio = days with >= 75% completion / total logged days
    const consistencyCount = monthRecords.filter(
      ([_, r]) => r.completionRate >= 75
    ).length;
    const consistencyRatio = totalDaysLogged > 0 ? consistencyCount / totalDaysLogged : 0;
    const totalStudyHours = totalStudyMs / (1000 * 60 * 60);
    const expectedHoursGoal = totalDaysLogged * 5.5; // Expect 5.5 hours/day study average
    const studyHoursRatio = Math.min(1, expectedHoursGoal > 0 ? totalStudyHours / expectedHoursGoal : 0);

    const productivityScore = Math.round(
      overallCompletionRate * 0.4 +
      consistencyRatio * 100 * 0.3 +
      studyHoursRatio * 100 * 0.3
    );

    // Programmatic Insights calculations (Topic, Consistency, Time Preference, Habit, Smart Suggestions)
    const categoryCompletionCounts: { [cat: string]: { completed: number; total: number } } = {};
    monthRecords.forEach(([_, r]) => {
      r.tasks.forEach(task => {
        const isStudy = !(
          task.category.toLowerCase().includes("routine") ||
          task.category.toLowerCase().includes("rest") ||
          task.category.toLowerCase().includes("sleep")
        );

        if (isStudy) {
          const cat = task.category || "General";
          if (!categoryCompletionCounts[cat]) {
            categoryCompletionCounts[cat] = { completed: 0, total: 0 };
          }
          categoryCompletionCounts[cat].total++;
          if (task.status === 'completed') {
            categoryCompletionCounts[cat].completed++;
          }
        }
      });
    });

    const categoryCompletionRates = Object.entries(categoryCompletionCounts)
      .map(([cat, vals]) => {
        const rate = vals.total > 0 ? Math.round((vals.completed / vals.total) * 100) : 0;
        return { category: CATEGORY_LABEL_MAP[cat] || cat, rate, ...vals };
      })
      .sort((a, b) => b.rate - a.rate);

    let morningTotal = 0;
    let morningCompleted = 0;
    let eveningTotal = 0;
    let eveningCompleted = 0;

    monthRecords.forEach(([_, r]) => {
      r.tasks.forEach(task => {
        const isStudy = !(
          task.category.toLowerCase().includes("routine") ||
          task.category.toLowerCase().includes("rest") ||
          task.category.toLowerCase().includes("sleep")
        );

        if (isStudy) {
          // Fall back to task creation/update hours if scheduledStart does not exist
          let isAm = true;
          if (task.scheduledStart) {
            isAm = task.scheduledStart.includes('AM');
          } else {
            const dateObj = new Date(task.createdAt || Date.now());
            isAm = dateObj.getHours() < 12;
          }

          if (isAm) {
            morningTotal++;
            if (task.status === 'completed') morningCompleted++;
          } else {
            eveningTotal++;
            if (task.status === 'completed') eveningCompleted++;
          }
        }
      });
    });

    const morningRate = morningTotal > 0 ? Math.round((morningCompleted / morningTotal) * 100) : 0;
    const eveningRate = eveningTotal > 0 ? Math.round((eveningCompleted / eveningTotal) * 100) : 0;

    let mainTotal = 0;
    let mainCompleted = 0;
    let customTotal = 0;
    let customCompleted = 0;

    monthRecords.forEach(([_, r]) => {
      r.tasks.forEach(task => {
        if (task.category !== 'Routine') {
          if (task.type === 'Main') {
            mainTotal++;
            if (task.status === 'completed') mainCompleted++;
          } else {
            customTotal++;
            if (task.status === 'completed') customCompleted++;
          }
        }
      });
    });

    const mainRate = mainTotal > 0 ? Math.round((mainCompleted / mainTotal) * 100) : 0;
    const customRate = customTotal > 0 ? Math.round((customCompleted / customTotal) * 100) : 0;

    const bestCategoryObj = categoryCompletionRates.length > 0 ? categoryCompletionRates[0] : null;
    const worstCategoryObj = categoryCompletionRates.length > 1 ? categoryCompletionRates[categoryCompletionRates.length - 1] : null;

    let consistencyRating = "Developing";
    if (consistencyRatio >= 0.8) consistencyRating = "Exceptional";
    else if (consistencyRatio >= 0.6) consistencyRating = "Highly Disciplined";
    else if (consistencyRatio >= 0.4) consistencyRating = "Steady Progress";

    // Standard deviation of study hours
    const dailyStudyHours = monthRecords.map(([_, r]) => r.studyTime / (1000 * 60 * 60));
    const meanHours = dailyStudyHours.length > 0 ? dailyStudyHours.reduce((s, h) => s + h, 0) / dailyStudyHours.length : 0;
    const variance = dailyStudyHours.length > 0 ? dailyStudyHours.reduce((s, h) => s + Math.pow(h - meanHours, 2), 0) / dailyStudyHours.length : 0;
    const stdDev = Math.sqrt(variance);

    return {
      totalStudyMs,
      totalRoutineMs,
      overallCompletionRate,
      totalDaysLogged,
      maxStudySessionMs,
      avgDailyStudyMs,
      mostConsistentWeekdayName,
      categoryPieData,
      weeklyBarData,
      productivityScore,
      monthRecordsCount: monthRecords.length,
      categoryCompletionRates,
      morningRate,
      eveningRate,
      mainRate,
      customRate,
      bestCategoryObj,
      worstCategoryObj,
      consistencyRating,
      consistencyRatio,
      stdDev,
    };
  }, [combinedHistory, selectedMonth]);

  // Formats ms duration into standard elegant display: e.g. "8.2 hrs"
  const formatHours = (ms: number): string => {
    const hrs = ms / (1000 * 60 * 60);
    return `${hrs.toFixed(1)} hrs`;
  };

  // Navigating month by month selection
  const handlePrevMonthSelect = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonthSelect = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  return (
    <div id={id} className="space-y-6 max-w-7xl mx-auto pb-12 print:bg-white print:p-0">
      {/* Month Filter and Controls Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 p-4 rounded-[16px] print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#4285F4]" />
          <div className="space-y-0.5">
            <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-widest font-bold">
              Selected Month
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonthSelect}
                disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}
                className="p-1 hover:bg-[#F1F3F4] dark:hover:bg-zinc-800 rounded-lg text-[#5F6368] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-base font-bold text-[#3C4043] dark:text-zinc-200 focus:outline-none focus:ring-0 cursor-pointer text-center font-sans"
              >
                {availableMonths.map((m) => {
                  const [y, mNum] = m.split("-");
                  return (
                    <option key={m} value={m} className="dark:bg-zinc-950">
                      {MONTH_NAMES[Number(mNum) - 1]} {y}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleNextMonthSelect}
                disabled={availableMonths.indexOf(selectedMonth) === 0}
                className="p-1 hover:bg-[#F1F3F4] dark:hover:bg-zinc-800 rounded-lg text-[#5F6368] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons (Export PDF, CSV) */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportToCSV(combinedHistory, selectedMonth)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-[#F1F3F4] border border-[#E0E3E7] rounded-xl text-xs text-[#3C4043] dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850 font-bold shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#34A853]" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#1A73E8] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Save as PDF
          </button>
        </div>
      </div>

      {/* Main Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Quick Stats Bento Box & Charts */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick Metrics Bento Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            
            {/* Metric 1 */}
            <Card className="p-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800/80 hover:shadow-sm rounded-[16px] transition-all">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider font-bold">Total Hours</span>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-1.5 rounded-lg bg-[#4285F4]/10 text-[#4285F4]">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-[#3C4043] dark:text-zinc-100 font-sans">
                  {formatHours(monthStats.totalStudyMs)}
                </span>
              </div>
            </Card>

            {/* Metric 2 */}
            <Card className="p-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800/80 hover:shadow-sm rounded-[16px] transition-all">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider font-bold">Daily Average</span>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-1.5 rounded-lg bg-[#34A853]/10 text-[#34A853]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-[#3C4043] dark:text-zinc-100 font-sans">
                  {formatHours(monthStats.avgDailyStudyMs)}
                </span>
              </div>
            </Card>

            {/* Metric 3 */}
            <Card className="p-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800/80 hover:shadow-sm rounded-[16px] transition-all">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider font-bold">Completion %</span>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-1.5 rounded-lg bg-[#FBBC05]/10 text-[#FBBC05]">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-[#3C4043] dark:text-zinc-100 font-sans">
                  {monthStats.overallCompletionRate}%
                </span>
              </div>
            </Card>

            {/* Metric 4 */}
            <Card className="p-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800/80 hover:shadow-sm rounded-[16px] transition-all">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider font-bold">Max Session</span>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-1.5 rounded-lg bg-[#EA4335]/10 text-[#EA4335]">
                  <Zap className="w-4 h-4 animate-pulse" />
                </div>
                <span className="text-xl font-bold text-[#3C4043] dark:text-zinc-100 font-sans">
                  {formatHours(monthStats.maxStudySessionMs)}
                </span>
              </div>
            </Card>

            {/* Metric 5 */}
            <Card className="p-4 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800/80 hover:shadow-sm rounded-[16px] transition-all">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider font-bold">Routine Time</span>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 dark:bg-purple-950/30">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-[#3C4043] dark:text-zinc-100 font-sans">
                  {formatHours(monthStats.totalRoutineMs)}
                </span>
              </div>
            </Card>
          </div>

          {/* Visual Charts Block */}
          {monthStats.monthRecordsCount === 0 ? (
            <Card className="p-8 text-center text-gray-400 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No recorded tracking history available for this month yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pie Chart: Time Spent Per Category */}
              <Card className="p-5 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 flex flex-col h-full justify-between rounded-[16px] shadow-sm">
                <div className="space-y-1 mb-4">
                  <h4 className="font-semibold text-[#3C4043] dark:text-zinc-100 flex items-center gap-1.5 text-sm font-sans">
                    <PieIcon className="w-4 h-4 text-[#FBBC05]" />
                    Time Spent per Category
                  </h4>
                  <p className="text-[10px] text-[#5F6368] dark:text-zinc-500">Distribution of hours logged for each discipline.</p>
                </div>

                <div className="h-[220px] md:h-[260px] lg:h-[300px] xl:h-[340px]">
                  {monthStats.categoryPieData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      No completed session data for this month.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={monthStats.categoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {monthStats.categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={GOOGLE_COLORS[index % GOOGLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} hours`, "Work Log"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-gray-500 dark:text-zinc-400 font-semibold">
                  {monthStats.categoryPieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: GOOGLE_COLORS[idx % GOOGLE_COLORS.length] }}
                      />
                      <span className="truncate">{item.name} ({item.value}h)</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Bar Chart: Weekly trend */}
              <Card className="p-5 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 flex flex-col h-full justify-between rounded-[16px] shadow-sm">
                <div className="space-y-1 mb-4">
                  <h4 className="font-semibold text-[#3C4043] dark:text-zinc-100 flex items-center gap-1.5 text-sm font-sans">
                    <BarChart2 className="w-4 h-4 text-[#4285F4]" />
                    Weekly Focus Trend
                  </h4>
                  <p className="text-[10px] text-[#5F6368] dark:text-zinc-500">Total study and deep focus hours logged weekly.</p>
                </div>

                <div className="h-[220px] md:h-[260px] lg:h-[300px] xl:h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthStats.weeklyBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <RechartsTooltip formatter={(value) => [`${value} hrs`, "Duration"]} />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {monthStats.weeklyBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.hours > 15 ? "#34A853" : "#4285F4"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <span className="text-[9px] text-gray-400 dark:text-zinc-500 block text-right mt-2">
                  * Based on expected study sessions.
                </span>
              </Card>
            </div>
          )}

          {/* Daily Timeline Tracker Grid */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 rounded-[16px] shadow-sm">
            <h4 className="font-semibold text-[#3C4043] dark:text-zinc-100 text-sm mb-3">
              Monthly Calendar Breakdown
            </h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
              {(Object.entries(combinedHistory) as [string, DayRecord][])
                .filter(([date]) => date.startsWith(selectedMonth))
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, record]) => (
                  <div
                    key={date}
                    className="flex justify-between items-center p-2.5 bg-[#F8F9FA] dark:bg-zinc-950 border border-[#F1F3F4] dark:border-zinc-900 rounded-xl text-xs"
                  >
                    <span className="font-sans text-[#5F6368] dark:text-zinc-400 font-bold">{date}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 dark:text-zinc-500 font-sans">
                        {record.tasks.filter((t) => t.status === "completed").length} done
                      </span>
                      <span className="font-sans font-bold text-[#3C4043] dark:text-zinc-300">
                        {(record.studyTime / (1000 * 60 * 60)).toFixed(2)} hrs
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          record.completionRate >= 100
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                            : record.completionRate >= 50
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                            : "bg-gray-100 text-gray-500 dark:bg-zinc-800"
                        }`}
                      >
                        {record.completionRate}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        {/* Right column: Productivity score & AI Coach guidance */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Productivity score gauge */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 relative overflow-hidden flex flex-col justify-between items-center text-center rounded-[16px] shadow-sm">
            <div className="absolute top-2 right-2 p-1 text-[#EA4335] bg-[#EA4335]/10 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            
            <div className="space-y-1 w-full text-left">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider font-bold">
                CONSISTENCY ENGINE
              </span>
              <h4 className="text-base font-bold text-[#3C4043] dark:text-zinc-200 font-sans">
                Productivity Score
              </h4>
            </div>

            {/* Big Circular percentage */}
            <div className="my-6 relative flex items-center justify-center">
              {/* Outer ring */}
              <div className="w-32 h-32 rounded-full border-4 border-[#F1F3F4] dark:border-zinc-800 flex items-center justify-center relative">
                <span className="text-4xl font-black text-[#1A73E8] dark:text-blue-400 font-sans">
                  {monthStats.productivityScore}
                </span>
              </div>
            </div>

            <div className="space-y-3 w-full">
              <div className="flex justify-between text-xs text-[#5F6368] dark:text-zinc-400 font-medium">
                <span>Monthly Efficiency</span>
                <span className="font-semibold font-sans">{monthStats.productivityScore}/100</span>
              </div>
              <Progress value={monthStats.productivityScore} indicatorColor="bg-[#EA4335]" />
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-normal text-left">
                Score dynamically calculated using: Today's study completion rate ({monthStats.overallCompletionRate}%), consistency ratios, and total deep focus hours logged.
              </p>
            </div>
          </Card>

          {/* Programmatic Pattern Analysis */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 rounded-[16px] shadow-sm space-y-4">
            <div className="space-y-1 pb-3 border-b border-[#F1F3F4] dark:border-zinc-800/60">
              <span className="text-[10px] text-[#5F6368] dark:text-zinc-500 uppercase tracking-widest font-bold">
                Local Pattern Engine
              </span>
              <h4 className="text-sm font-semibold text-[#3C4043] dark:text-zinc-200 font-sans flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#34A853]" />
                Programmatic Insights
              </h4>
            </div>

            {monthStats.monthRecordsCount === 0 ? (
              <p className="text-xs text-gray-400">Complete study sessions to generate pattern insights.</p>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 1. Topic Analysis */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider">
                    <span>Topic Focus</span>
                    <span className="text-[#34A853]">Analysis</span>
                  </div>
                  {monthStats.bestCategoryObj ? (
                    <p className="text-[#3C4043] dark:text-zinc-300 leading-normal">
                      Your peak performance discipline is <strong className="text-gray-900 dark:text-white font-semibold">{monthStats.bestCategoryObj.category}</strong> with an outstanding <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{monthStats.bestCategoryObj.rate}%</strong> completion rate. 
                      {monthStats.worstCategoryObj && (
                        <span> Conversely, <strong className="text-gray-900 dark:text-white font-semibold">{monthStats.worstCategoryObj.category}</strong> has room for improvement at <strong className="text-red-500 dark:text-red-400 font-bold">{monthStats.worstCategoryObj.rate}%</strong>.</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-gray-400">Insufficient category logs.</p>
                  )}
                </div>

                {/* 2. Consistency */}
                <div className="space-y-1.5 pt-3 border-t border-[#F1F3F4] dark:border-zinc-800/60">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider">
                    <span>Stability Index</span>
                    <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded font-sans font-bold text-[9px] uppercase tracking-normal">
                      {monthStats.consistencyRating}
                    </span>
                  </div>
                  <p className="text-[#3C4043] dark:text-zinc-300 leading-normal">
                    With an active consistency score of <strong className="font-semibold text-gray-900 dark:text-white">{(monthStats.consistencyRatio * 100).toFixed(0)}%</strong>, your daily study time variance is <strong className="font-semibold text-gray-900 dark:text-white">±{monthStats.stdDev.toFixed(1)} hours</strong>. {monthStats.stdDev < 1.5 ? "This indicates a highly reliable study system." : "Consider standardizing your session blocks to stabilize daily efforts."}
                  </p>
                </div>

                {/* 3. Time Preference */}
                <div className="space-y-1.5 pt-3 border-t border-[#F1F3F4] dark:border-zinc-800/60">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider">
                    <span>Time Preference</span>
                    <span className="text-blue-500">Analysis</span>
                  </div>
                  <p className="text-[#3C4043] dark:text-zinc-300 leading-normal">
                    You completed <strong className="font-semibold text-gray-900 dark:text-white">{monthStats.morningRate}%</strong> of morning blocks (AM) compared to <strong className="font-semibold text-gray-900 dark:text-white">{monthStats.eveningRate}%</strong> of afternoon/evening blocks (PM). {monthStats.morningRate > monthStats.eveningRate ? "You show a distinct cognitive preference for early study sessions." : "You are more effective during afternoon and evening focus periods."}
                  </p>
                </div>

                {/* 4. Habit Analysis */}
                <div className="space-y-1.5 pt-3 border-t border-[#F1F3F4] dark:border-zinc-800/60">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-wider">
                    <span>Habit Structure</span>
                    <span className="text-purple-500">Analysis</span>
                  </div>
                  <p className="text-[#3C4043] dark:text-zinc-300 leading-normal">
                    Your adherence rate to structured timetable slots is <strong className="font-semibold text-gray-900 dark:text-white">{monthStats.mainRate}%</strong>, while ad-hoc custom tasks have a <strong className="font-semibold text-gray-900 dark:text-white">{monthStats.customRate}%</strong> completion rate. {monthStats.mainRate >= monthStats.customRate ? "Rigid timetable blocks provide your best consistency multiplier." : "You thrive on the fluid flexibility of custom ad-hoc tracking."}
                  </p>
                </div>

                {/* 5. Smart Suggestions */}
                <div className="p-3 bg-[#F8F9FA] dark:bg-zinc-950 border border-[#F1F3F4] dark:border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">
                    Smart System Suggestion
                  </span>
                  <p className="text-[11px] leading-relaxed text-gray-700 dark:text-zinc-400 font-medium">
                    {monthStats.morningRate > monthStats.eveningRate
                      ? `Schedule your lowest consistency task (${monthStats.worstCategoryObj?.category || "CAT Preparation"}) before noon to take advantage of your peak ${monthStats.morningRate}% morning focus window.`
                      : `Capitalize on your ${monthStats.eveningRate}% evening focus by assigning critical study deliverables to PM slots.`
                    }
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* AI consistency recommendations coach */}
          <Card className="p-5 bg-white dark:bg-zinc-950 border border-[#E0E3E7] dark:border-zinc-900 flex flex-col justify-between relative min-h-[300px] rounded-[16px] shadow-sm">
            
            <div className="flex justify-between items-center pb-3 border-b border-[#F1F3F4] dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4285F4]" />
                <h4 className="font-sans font-semibold text-[#3C4043] dark:text-zinc-200 text-sm">
                  AI Consistency Coach
                </h4>
              </div>
              <button
                onClick={() => handleFetchAIInsights(true)}
                disabled={aiLoading}
                className="p-1 text-[#5F6368] hover:text-[#1A73E8] dark:hover:text-zinc-300 rounded hover:bg-[#F1F3F4] dark:hover:bg-zinc-900 disabled:opacity-40 transition-colors cursor-pointer"
                title="Refresh AI Insights"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin text-[#4285F4]" : ""}`} />
              </button>
            </div>

            {/* Coaching content area */}
            <div className="flex-1 py-4 text-xs text-[#3C4043] dark:text-zinc-300 space-y-4 leading-relaxed font-sans">
              {aiLoading ? (
                <div className="space-y-3 py-6">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse w-1/2 pt-2" />
                </div>
              ) : aiError ? (
                <div className="flex flex-col items-center justify-center text-center p-4 gap-2 text-gray-500">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-xs leading-normal">{aiError}</p>
                </div>
              ) : aiCoach ? (
                <div className="space-y-4">
                  {/* Guideline banner */}
                  <div className="p-3 bg-blue-50/50 border border-blue-100/50 dark:bg-blue-950/20 dark:border-blue-900/30 rounded-xl text-[11px] text-[#4285F4] font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-[#4285F4] animate-pulse" />
                    <span>{aiCoach.guideline}</span>
                  </div>

                  {/* Highlights Bullet-points */}
                  {aiCoach.highlights && aiCoach.highlights.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">
                        Monthly Highlights
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {aiCoach.highlights.map((bullet, idx) => (
                          <li key={idx} className="flex gap-2 items-start text-xs font-semibold text-[#3C4043] dark:text-zinc-300">
                            <span className="text-[#34A853] font-bold select-none">•</span>
                            <span className="leading-tight">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendation narrative */}
                  <div className="pt-2 border-t border-[#F1F3F4] dark:border-zinc-900 text-[11px] leading-relaxed font-sans text-[#5F6368] dark:text-zinc-400 markdown-body">
                    <ReactMarkdown>{aiCoach.recommendations}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <p>No coaching reports loaded. Click refresh to query AI Coach.</p>
                </div>
              )}
            </div>

            {/* Bottom info banner */}
            <div className="text-[9px] text-[#5F6368] dark:text-zinc-500 italic pt-2 border-t border-[#F1F3F4] dark:border-zinc-900 flex items-center gap-1 font-medium">
              <span>* AI Coach recommendations are custom generated based on your real activity logs.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
