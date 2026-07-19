import { Task, DayRecord, Settings, HistoryData, Category } from '../types';

const OLD_KEYS = {
  TODAY: 'consistency_pro_today_v1',
  HISTORY: 'consistency_pro_history_v1',
  SETTINGS: 'consistency_pro_settings_v1',
  CUSTOM_TEMPLATES: 'consistency_pro_custom_templates_v1',
};

const STORAGE_KEYS = {
  TODAY: 'grindstreaks_today_v1',
  HISTORY: 'grindstreaks_history_v1',
  SETTINGS: 'grindstreaks_settings_v1',
  CUSTOM_TEMPLATES: 'grindstreaks_custom_templates_v1',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'Routine', name: 'Routine', isRoutine: true, isPredefined: true },
  { id: 'DSA', name: 'DSA', isRoutine: false, isPredefined: true },
  { id: 'Web', name: 'Web', isRoutine: false, isPredefined: true },
  { id: 'CAT', name: 'CAT', isRoutine: false, isPredefined: true },
  { id: 'GATE', name: 'GATE', isRoutine: false, isPredefined: true },
  { id: 'Extras', name: 'Extras', isRoutine: false, isPredefined: true },
  { id: 'Custom', name: 'Custom', isRoutine: false, isPredefined: true },
];

export const loadCategories = (): Category[] => {
  const migrated = localStorage.getItem('grindstreaks_categories_migrated_v1');
  const data = localStorage.getItem('grindstreaks_categories_v1');
  
  if (migrated === 'true' && data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse categories', e);
    }
  }

  // Handle migration of existing categories
  let categoriesToSave = DEFAULT_CATEGORIES;
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const merged = [...DEFAULT_CATEGORIES];
      parsed.forEach((cat: Category) => {
        if (!merged.find(m => m.id.toLowerCase() === cat.id.toLowerCase())) {
          merged.push(cat);
        }
      });
      categoriesToSave = merged;
    } catch (e) {
      console.error('Failed to parse categories', e);
    }
  }

  localStorage.setItem('grindstreaks_categories_v1', JSON.stringify(categoriesToSave));
  localStorage.setItem('grindstreaks_categories_migrated_v1', 'true');
  return categoriesToSave;
};

export const saveCategories = (categories: Category[]) => {
  localStorage.setItem('grindstreaks_categories_v1', JSON.stringify(categories));
};

export const isStudyCategory = (categoryName: string, categories: Category[] = loadCategories()): boolean => {
  const found = categories.find(c => c.id.toLowerCase() === categoryName.toLowerCase() || c.name.toLowerCase() === categoryName.toLowerCase());
  if (found) {
    return !found.isRoutine;
  }
  return categoryName.toLowerCase() !== 'routine';
};

export const getStudyTimeForTasks = (tasks: Task[], categories: Category[] = loadCategories()): number => {
  return tasks
    .filter(t => isStudyCategory(t.category, categories))
    .reduce((sum, t) => sum + (t.duration || 0), 0);
};

export const DEFAULT_TIMETABLE_TASKS = [
  { id: 't1', name: 'Wake Up', category: 'Routine', type: 'Main', scheduledStart: '06:45 AM', scheduledEnd: '07:00 AM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't2', name: 'DSA / Striver / Codeforces', category: 'DSA', type: 'Main', scheduledStart: '07:00 AM', scheduledEnd: '09:00 AM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't3', name: 'Breakfast', category: 'Routine', type: 'Main', scheduledStart: '09:00 AM', scheduledEnd: '10:30 AM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't4', name: 'Web Development', category: 'Web', type: 'Main', scheduledStart: '10:30 AM', scheduledEnd: '01:00 PM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't5_1', name: 'Certifications / AI / Cybersecurity', category: 'Extras', type: 'Main', scheduledStart: '03:00 PM', scheduledEnd: '04:00 PM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't5_2', name: 'Nap', category: 'Routine', type: 'Main', scheduledStart: '04:00 PM', scheduledEnd: '06:00 PM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't6', name: 'DSA', category: 'DSA', type: 'Main', scheduledStart: '06:30 PM', scheduledEnd: '08:00 PM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't7', name: 'Web Development', category: 'Web', type: 'Main', scheduledStart: '08:00 PM', scheduledEnd: '10:00 PM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
  { id: 't8', name: 'CAT Preparation', category: 'CAT', type: 'Main', scheduledStart: '11:00 PM', scheduledEnd: '01:30 AM', status: 'idle', duration: 0, createdAt: 1783452400000, updatedAt: 1783452400000 },
] as Task[];

export const loadTimetable = (): Task[] => {
  const data = localStorage.getItem('grindstreaks_timetable_v1');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Migrate "Study" categories in timetable to "Extras"
      return parsed.map((t: Task) => {
        if (t.category === 'Study') {
          return { ...t, category: 'Extras' };
        }
        return t;
      });
    } catch (e) {
      console.error('Failed to parse timetable', e);
    }
  }
  const defaults = DEFAULT_TIMETABLE_TASKS.map(t => {
    if (t.category === 'Study') {
      return { ...t, category: 'Extras' };
    }
    return t;
  });
  localStorage.setItem('grindstreaks_timetable_v1', JSON.stringify(defaults));
  return defaults;
};

export const saveTimetable = (timetable: Task[]) => {
  localStorage.setItem('grindstreaks_timetable_v1', JSON.stringify(timetable));
  syncTodayRecordWithTimetable(timetable);
};

export const syncTodayRecordWithTimetable = (timetable: Task[]) => {
  const todayStr = getLocalDateString();
  const data = localStorage.getItem(STORAGE_KEYS.TODAY);
  if (!data) return;
  
  try {
    const record: DayRecord = JSON.parse(data);
    if (record.date !== todayStr) return;
    
    const customTasks = record.tasks.filter(t => t.type === 'Custom');
    const existingMainTasks = record.tasks.filter(t => t.type === 'Main');
    
    const updatedMainTasks = timetable.map(timetableTask => {
      const existing = existingMainTasks.find(t => t.id === timetableTask.id);
      if (existing) {
        return {
          ...existing,
          name: timetableTask.name,
          category: timetableTask.category,
          scheduledStart: timetableTask.scheduledStart,
          scheduledEnd: timetableTask.scheduledEnd,
          updatedAt: Date.now(),
        };
      } else {
        return {
          ...timetableTask,
          status: 'idle' as const,
          duration: 0,
          lastStarted: null,
          completedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
    });
    
    const newTasks = [...updatedMainTasks, ...customTasks];
    const updatedRecord = {
      ...record,
      tasks: newTasks,
    };
    
    saveTodayRecord(updatedRecord);
  } catch (e) {
    console.error('Failed to sync today record with timetable', e);
  }
};

export const runSchemaMigration = () => {
  // 1. Migrate keys from Consistency Pro to GrindStreaks
  Object.keys(STORAGE_KEYS).forEach(k => {
    const key = k as keyof typeof STORAGE_KEYS;
    const oldVal = localStorage.getItem(OLD_KEYS[key]);
    const newVal = localStorage.getItem(STORAGE_KEYS[key]);
    if (oldVal && !newVal) {
      localStorage.setItem(STORAGE_KEYS[key], oldVal);
    }
  });

  // Check if we need to migrate today record
  const todayRaw = localStorage.getItem(STORAGE_KEYS.TODAY);
  if (todayRaw) {
    try {
      const record: DayRecord = JSON.parse(todayRaw);
      let migrated = false;
      const updatedTasks = record.tasks.flatMap(t => {
        if (t.id === 't5' || t.name === 'Certifications / AI / Cybersecurity / Nap') {
          migrated = true;
          return [
            { id: 't5_1', name: 'Certifications / AI / Cybersecurity', category: 'Study', type: 'Main' as const, scheduledStart: '03:00 PM', scheduledEnd: '04:00 PM', status: t.status, duration: t.status === 'completed' ? Math.min(t.duration, 3600000) : t.status === 'running' ? t.duration : 0, lastStarted: t.status === 'running' ? t.lastStarted : null, completedAt: t.status === 'completed' ? t.completedAt : null, createdAt: t.createdAt, updatedAt: Date.now() },
            { id: 't5_2', name: 'Nap', category: 'Routine', type: 'Main' as const, scheduledStart: '04:00 PM', scheduledEnd: '06:00 PM', status: t.status === 'completed' ? ('completed' as const) : ('idle' as const), duration: t.status === 'completed' ? Math.max(0, t.duration - 3600000) : 0, completedAt: t.status === 'completed' ? t.completedAt : null, createdAt: t.createdAt, updatedAt: Date.now() }
          ];
        }
        return [t];
      });
      if (migrated) {
        record.tasks = updatedTasks;
        saveTodayRecord(record);
      }
    } catch (e) {
      console.error('Migration failed for today record', e);
    }
  }

  // Check if we need to migrate history records
  const historyRaw = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (historyRaw) {
    try {
      const history: HistoryData = JSON.parse(historyRaw);
      let migrated = false;
      Object.keys(history).forEach(date => {
        const record = history[date];
        let dayMigrated = false;
        const updatedTasks = record.tasks.flatMap(t => {
          if (t.id === 't5' || t.name === 'Certifications / AI / Cybersecurity / Nap') {
            dayMigrated = true;
            migrated = true;
            return [
              { id: 't5_1', name: 'Certifications / AI / Cybersecurity', category: 'Study', type: 'Main' as const, scheduledStart: '03:00 PM', scheduledEnd: '04:00 PM', status: t.status, duration: t.status === 'completed' ? Math.min(t.duration, 3600000) : 0, completedAt: t.status === 'completed' ? t.completedAt : null, createdAt: t.createdAt, updatedAt: Date.now() },
              { id: 't5_2', name: 'Nap', category: 'Routine', type: 'Main' as const, scheduledStart: '04:00 PM', scheduledEnd: '06:00 PM', status: t.status === 'completed' ? ('completed' as const) : ('idle' as const), duration: t.status === 'completed' ? Math.max(0, t.duration - 3600000) : 0, completedAt: t.status === 'completed' ? t.completedAt : null, createdAt: t.createdAt, updatedAt: Date.now() }
            ];
          }
          return [t];
        });
        if (dayMigrated) {
          record.tasks = updatedTasks;
          // Recalculate completions/durations
          const completedCount = record.tasks.filter(t => t.status === 'completed').length;
          const totalCount = record.tasks.length;
          record.completedCount = completedCount;
          record.totalCount = totalCount;
          record.completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          
          record.studyTime = getStudyTimeForTasks(record.tasks);
        }
      });
      if (migrated) {
        saveHistory(history);
      }
    } catch (e) {
      console.error('Migration failed for history records', e);
    }
  }
};

export const getLocalDateString = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

export const loadSettings = (): Settings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse settings', e);
    }
  }
  const defaultSettings: Settings = {
    darkMode: false,
    version: '1.0',
    streak: 0,
    maxStreak: 0,
    lastActiveDate: getLocalDateString(),
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
  return defaultSettings;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const loadHistory = (): HistoryData => {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse history', e);
    }
  }
  return {};
};

export const saveHistory = (history: HistoryData) => {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const loadCustomTemplates = (): Task[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse custom templates', e);
    }
  }
  return [];
};

export const saveCustomTemplates = (templates: Task[]) => {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
};

export const loadTodayRecord = (): DayRecord => {
  const todayStr = getLocalDateString();
  const data = localStorage.getItem(STORAGE_KEYS.TODAY);
  if (data) {
    try {
      const record: DayRecord = JSON.parse(data);
      if (record.date === todayStr) {
        return record;
      }
    } catch (e) {
      console.error('Failed to parse today record', e);
    }
  }

  // If no record exists or it is from a previous day, create a fresh dynamic record.
  const newRecord: DayRecord = {
    date: todayStr,
    tasks: [],
    completionRate: 0,
    studyTime: 0,
    completedCount: 0,
    totalCount: 0,
    isDayStarted: false,
    isDayEnded: false,
  };

  localStorage.setItem(STORAGE_KEYS.TODAY, JSON.stringify(newRecord));
  return newRecord;
};

export const saveTodayRecord = (record: DayRecord) => {
  // Recalculate rates
  const completedCount = record.tasks.filter(t => t.status === 'completed').length;
  const totalCount = record.tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const studyTime = getStudyTimeForTasks(record.tasks);

  const updatedRecord = {
    ...record,
    completedCount,
    totalCount,
    completionRate,
    studyTime,
  };

  localStorage.setItem(STORAGE_KEYS.TODAY, JSON.stringify(updatedRecord));
  return updatedRecord;
};

/**
 * Checks if a new day has arrived. If so:
 * 1. Finalizes yesterday's data and saves it to history.
 * 2. Updates current and max streaks using the custom "Streak freeze if only 1 task missed" rule.
 * 3. Resets today's active tasks.
 */
export const checkDailyReset = (): { resetHappened: boolean; yesterdaySummary?: DayRecord } => {
  const todayStr = getLocalDateString();
  const settings = loadSettings();
  
  if (settings.lastActiveDate === todayStr) {
    return { resetHappened: false };
  }

  // It's a new day! Finalize yesterday's data.
  const history = loadHistory();
  const todayDataRaw = localStorage.getItem(STORAGE_KEYS.TODAY);
  let yesterdayRecord: DayRecord | null = null;

  if (todayDataRaw) {
    try {
      yesterdayRecord = JSON.parse(todayDataRaw);
    } catch (e) {
      console.error('Failed to parse yesterday raw record', e);
    }
  }

  if (yesterdayRecord && yesterdayRecord.date !== todayStr) {
    // 1. Calculate final rates for yesterday and save to history
    const completedTasks = yesterdayRecord.tasks.filter(t => t.status === 'completed');
    const totalTasks = yesterdayRecord.tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    
    const studyTime = getStudyTimeForTasks(yesterdayRecord.tasks);

    yesterdayRecord.completionRate = completionRate;
    yesterdayRecord.completedCount = completedTasks.length;
    yesterdayRecord.totalCount = totalTasks;
    yesterdayRecord.studyTime = studyTime;

    history[yesterdayRecord.date] = yesterdayRecord;
    saveHistory(history);

    // 2. Streak calculation: Dynamic study consistency
    const completedStudyTasks = yesterdayRecord.tasks.filter(
      t => isStudyCategory(t.category) && t.status === 'completed'
    ).length;

    let newStreak = settings.streak;
    if (yesterdayRecord.isDayStarted && completedStudyTasks > 0) {
      newStreak += 1;
    } else if (yesterdayRecord.isDayStarted) {
      newStreak = 0;
    } // If day was never started, freeze streak (maintain it)

    const newMaxStreak = Math.max(settings.maxStreak, newStreak);
    
    settings.streak = newStreak;
    settings.maxStreak = newMaxStreak;
  } else if (!yesterdayRecord) {
    // If no record existed at all (e.g., first run ever)
    settings.streak = 0;
  }

  // Update settings with new date
  settings.lastActiveDate = todayStr;
  saveSettings(settings);

  // 3. Create fresh record for today
  const newRecord: DayRecord = {
    date: todayStr,
    tasks: [],
    completionRate: 0,
    studyTime: 0,
    completedCount: 0,
    totalCount: 0,
    isDayStarted: false,
    isDayEnded: false,
  };

  localStorage.setItem(STORAGE_KEYS.TODAY, JSON.stringify(newRecord));

  return { 
    resetHappened: true, 
    yesterdaySummary: yesterdayRecord || undefined 
  };
};

export const resetTodayTasks = () => {
  const record = loadTodayRecord();
  const resetTasks = record.tasks.map(t => ({
    ...t,
    status: 'idle' as const,
    duration: 0,
    lastStarted: null,
    completedAt: null,
    updatedAt: Date.now(),
  }));
  
  const updatedRecord = {
    ...record,
    tasks: resetTasks,
    completionRate: 0,
    studyTime: 0,
    completedCount: 0,
  };
  
  localStorage.setItem(STORAGE_KEYS.TODAY, JSON.stringify(updatedRecord));
  return updatedRecord;
};

export const deleteEverything = () => {
  localStorage.removeItem(STORAGE_KEYS.TODAY);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
  localStorage.removeItem('grindstreaks_timetable_v1');
  localStorage.removeItem('grindstreaks_categories_v1');
};
