export type TaskStatus = 'idle' | 'running' | 'completed';

export interface Task {
  id: string;
  name: string;
  category: string; // 'DSA' | 'Web' | 'CAT' | 'Certificates' | 'Routine' | 'Custom'
  type: 'Main' | 'Custom';
  scheduledStart?: string; // e.g. "07:00 AM"
  scheduledEnd?: string;   // e.g. "09:00 AM"
  status: TaskStatus;
  duration: number;        // total duration in milliseconds
  lastStarted?: number | null; // timestamp of last start
  completedAt?: number | null; // timestamp of completion
  createdAt: number;
  updatedAt: number;
}

export interface DayRecord {
  date: string;            // "YYYY-MM-DD"
  tasks: Task[];           // List of all tasks for this day (both main and custom)
  completionRate: number;  // 0 to 100
  studyTime: number;       // total active study/work duration in ms for this day
  completedCount: number;
  totalCount: number;
  isDayStarted?: boolean;  // whether the user started their day
  isDayEnded?: boolean;    // whether the user wrapped up their day
  targetCount?: number;    // targeted number of completed tasks
  dailyGoalsText?: string; // rough wording description of today's target/goals
}

export interface Settings {
  darkMode: boolean;
  version: string;         // Schema version e.g., "1.0"
  streak: number;          // Current consistency streak
  maxStreak: number;       // Longest streak
  lastActiveDate: string;  // "YYYY-MM-DD" to detect daily resets
}

export interface HistoryData {
  [date: string]: DayRecord;
}

export interface AIRecommendation {
  text: string;
  timestamp: number;
}

export interface Category {
  id: string;
  name: string;
  isRoutine: boolean;
  isPredefined?: boolean;
}
