import * as React from "react";
import { Card } from "../ui/card";
import { HistoryData, DayRecord } from "../../types";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

interface HeatmapProps {
  history: HistoryData;
  todayRecord: DayRecord;
  id: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Heatmap: React.FC<HeatmapProps> = ({ history, todayRecord, id }) => {
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [hoveredDay, setHoveredDay] = React.useState<{
    date: string;
    rate: number;
    completed: number;
    total: number;
    time: string;
    x: number;
    y: number;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Generate grid cells for the selected month
  // We want to align Sunday-Saturday as rows, weeks as columns.
  const gridData = React.useMemo(() => {
    // Helper to calculate study-only rates (excluding Routine)
    const getStudyStats = (rec: DayRecord | undefined) => {
      if (!rec) return { rate: 0, completed: 0, total: 0 };
      const studyTasks = rec.tasks.filter(t => t.category !== 'Routine');
      const completedStudy = studyTasks.filter(t => t.status === 'completed').length;
      const rate = studyTasks.length > 0 ? Math.round((completedStudy / studyTasks.length) * 100) : 0;
      return { rate, completed: completedStudy, total: studyTasks.length };
    };

    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // First day of the month is what day of the week? (0 = Sun, 6 = Sat)
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const cells: {
      dateStr: string;
      dayNum: number;
      completionRate: number;
      completedCount: number;
      totalCount: number;
      studyTime: number;
      isCurrentMonth: boolean;
    }[] = [];

    // 1. Padding days from the previous month to align with the first week's start
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayVal = daysInPrevMonth - i;
      const dateString = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`;
      
      const record = history[dateString];
      const stats = getStudyStats(record);
      cells.push({
        dateStr: dateString,
        dayNum: dayVal,
        completionRate: stats.rate,
        completedCount: stats.completed,
        totalCount: stats.total,
        studyTime: record ? record.studyTime : 0,
        isCurrentMonth: false,
      });
    }

    // 2. Days of the current month
    const todayStr = new Date().toISOString().split("T")[0];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      let record: DayRecord | undefined = history[dateString];
      // If it's today, merge the live active record
      if (dateString === todayStr) {
        record = todayRecord;
      }

      const stats = getStudyStats(record);
      cells.push({
        dateStr: dateString,
        dayNum: d,
        completionRate: stats.rate,
        completedCount: stats.completed,
        totalCount: stats.total,
        studyTime: record ? record.studyTime : 0,
        isCurrentMonth: true,
      });
    }

    // 3. Padding days of the next month to complete the last week grid
    const remainingCells = 42 - cells.length; // Standard 6 weeks calendar grid
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;

    for (let d = 1; d <= remainingCells; d++) {
      const dateString = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const record = history[dateString];
      const stats = getStudyStats(record);

      cells.push({
        dateStr: dateString,
        dayNum: d,
        completionRate: stats.rate,
        completedCount: stats.completed,
        totalCount: stats.total,
        studyTime: record ? record.studyTime : 0,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month, history, todayRecord]);

  // Map completion % to GitHub green palette
  const getCellColorClass = (rate: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      return "bg-gray-100/40 dark:bg-zinc-800/20 text-gray-300 dark:text-zinc-700";
    }
    if (rate === 0) return "bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700";
    if (rate <= 25) return "bg-[#D1FAE5] dark:bg-emerald-950/50 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-[#065F46]";
    if (rate <= 50) return "bg-[#A7F3D0] dark:bg-emerald-900/60 hover:bg-emerald-300 dark:hover:bg-emerald-800 text-[#047857]";
    if (rate <= 75) return "bg-[#34D399] dark:bg-emerald-700/70 hover:bg-emerald-400 dark:hover:bg-emerald-600 text-[#065F46]";
    return "bg-[#10B981] dark:bg-[#10B981] hover:bg-emerald-500 text-white";
  };

  const formatTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, cell: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    
    const x = rect.left - (parentRect?.left || 0) + rect.width / 2;
    const y = rect.top - (parentRect?.top || 0) - 10;

    setHoveredDay({
      date: cell.dateStr,
      rate: cell.completionRate,
      completed: cell.completedCount,
      total: cell.totalCount,
      time: formatTime(cell.studyTime),
      x,
      y,
    });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  // Group cells into Weeks (6 weeks max) to render like GitHub's vertical column layout
  // Column-based: week 1 has 7 items, week 2 has 7 items, etc.
  const weeks = React.useMemo(() => {
    const weeksList = [];
    for (let i = 0; i < gridData.length; i += 7) {
      weeksList.push(gridData.slice(i, i + 7));
    }
    return weeksList;
  }, [gridData]);

  return (
    <Card id={id} className="p-6 bg-white dark:bg-zinc-900 border border-[#E0E3E7] dark:border-zinc-800 relative rounded-[16px] shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="space-y-1">
          <h3 className="font-sans font-semibold text-[#3C4043] dark:text-zinc-100 text-base flex items-center gap-1.5">
            Consistency Graph
            <span title="Darker green squares represent higher calendar consistency.">
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </span>
          </h3>
          <p className="text-xs text-[#5F6368] dark:text-zinc-500">Each grid square shows completion percentage on that day.</p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
          <div className="flex border border-[#E0E3E7] dark:border-zinc-800 rounded-lg overflow-hidden text-xs shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-2 bg-white hover:bg-[#F1F3F4] dark:bg-zinc-950 dark:hover:bg-zinc-900 border-r border-[#E0E3E7] dark:border-zinc-800 text-gray-600 dark:text-zinc-400 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleCurrentMonth}
              className="px-3 py-2 bg-white hover:bg-[#F1F3F4] dark:bg-zinc-950 dark:hover:bg-zinc-900 border-r border-[#E0E3E7] dark:border-zinc-800 font-semibold text-gray-700 dark:text-zinc-300 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 bg-white hover:bg-[#F1F3F4] dark:bg-zinc-950 dark:hover:bg-zinc-900 text-gray-600 dark:text-zinc-400 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <span className="text-sm font-semibold text-[#3C4043] dark:text-zinc-200 min-w-[100px] text-right font-sans">
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
      </div>

      {/* Heatmap Grid Wrapper with horizontal scroll on small viewports */}
      <div className="relative overflow-x-auto pb-2 scrollbar-none">
        <div className="flex gap-2 min-w-max select-none">
          {/* Weekday Row Header Labels */}
          <div className="flex flex-col justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-medium h-[116px] pr-2 pt-0.5">
            <span>Sun</span>
            <span>Tue</span>
            <span>Thu</span>
            <span>Sat</span>
          </div>

          {/* GitHub Squares Columns (Each column is a Week) */}
          <div className="flex gap-[4px] relative">
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-col gap-[4px]">
                {week.map((cell, dIndex) => (
                  <div
                    key={cell.dateStr}
                    onMouseEnter={(e) => handleMouseEnter(e, cell)}
                    onMouseLeave={handleMouseLeave}
                    className={`w-3.5 h-3.5 rounded-[2.5px] cursor-pointer transition-all duration-150 ${getCellColorClass(
                      cell.completionRate,
                      cell.isCurrentMonth
                    )}`}
                  />
                ))}
              </div>
            ))}

            {/* Custom Tooltip */}
            {hoveredDay && (
              <div
                className="absolute z-40 bg-gray-900 text-white dark:bg-zinc-950 text-[11px] p-2 rounded-lg shadow-xl border border-gray-800/40 pointer-events-none -translate-x-1/2 -translate-y-full flex flex-col gap-0.5 whitespace-nowrap leading-tight"
                style={{
                  left: `${hoveredDay.x - 20}px`, // Offset weekday labels
                  top: `${hoveredDay.y}px`,
                }}
              >
                <span className="font-semibold text-gray-200 font-sans">{hoveredDay.date}</span>
                <span className="text-emerald-400 font-sans">Completion: {hoveredDay.rate}%</span>
                <span className="text-gray-300 font-sans">{hoveredDay.completed}/{hoveredDay.total} tasks done</span>
                <span className="text-gray-400 font-sans">Work Time: {hoveredDay.time}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Legend */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#F1F3F4] dark:border-zinc-800/50 text-[10px] text-[#5F6368] dark:text-zinc-500 font-medium">
        <span>* Completed main tasks are calculated to evaluate the consistency index.</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[1.5px] bg-[#F1F3F4] dark:bg-zinc-800" />
          <div className="w-2.5 h-2.5 rounded-[1.5px] bg-[#D1FAE5] dark:bg-emerald-950/50" />
          <div className="w-2.5 h-2.5 rounded-[1.5px] bg-[#A7F3D0] dark:bg-emerald-900/60" />
          <div className="w-2.5 h-2.5 rounded-[1.5px] bg-[#34D399] dark:bg-emerald-700/70" />
          <div className="w-2.5 h-2.5 rounded-[1.5px] bg-[#10B981] dark:bg-[#10B981]" />
          <span>More</span>
        </div>
      </div>
    </Card>
  );
};
