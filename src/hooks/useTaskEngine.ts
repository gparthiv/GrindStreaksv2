import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, DayRecord, Settings, HistoryData } from '../types';
import * as storage from '../services/storage';

export const useTaskEngine = () => {
  // Run schema migration to split Certifications and Nap on startup
  useState(() => {
    storage.runSchemaMigration();
  });

  const [todayRecord, setTodayRecord] = useState<DayRecord>(() => storage.loadTodayRecord());
  const [settings, setSettings] = useState<Settings>(() => storage.loadSettings());
  const [history, setHistory] = useState<HistoryData>(() => storage.loadHistory());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<{ [id: string]: number }>({});
  
  // Custom tasks search
  const [searchQuery, setSearchQuery] = useState('');

  // Track the timer interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync active task on load
  useEffect(() => {
    // 1. Check for daily reset first!
    const { resetHappened, yesterdaySummary } = storage.checkDailyReset();
    if (resetHappened) {
      setTodayRecord(storage.loadTodayRecord());
      setSettings(storage.loadSettings());
      setHistory(storage.loadHistory());
    }

    // 2. Find if any task is currently running (resilient to page reload)
    const runningTask = todayRecord.tasks.find(t => t.status === 'running');
    if (runningTask) {
      setActiveTaskId(runningTask.id);
    }
  }, []);

  // Timer loop that updates every second for running tasks
  useEffect(() => {
    if (activeTaskId) {
      // Set interval to update elapsed live time
      timerRef.current = setInterval(() => {
        const task = todayRecord.tasks.find(t => t.id === activeTaskId);
        if (task && task.lastStarted) {
          const liveDuration = (task.duration || 0) + (Date.now() - task.lastStarted);
          setElapsedTime(prev => ({
            ...prev,
            [activeTaskId]: liveDuration
          }));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeTaskId, todayRecord.tasks]);

  // Sync today's record updates to local storage
  const saveAndSetToday = (updatedTasks: Task[]) => {
    const record = { ...todayRecord, tasks: updatedTasks };
    const savedRecord = storage.saveTodayRecord(record);
    setTodayRecord(savedRecord);
    
    // Also sync the history (just in case they need instant update in other tabs or analytics)
    setHistory(storage.loadHistory());
  };

  // 1. START TASK
  const startTask = useCallback((id: string, forceSwitch = false) => {
    const now = Date.now();
    
    // Check if another task is running
    if (activeTaskId && activeTaskId !== id && !forceSwitch) {
      return { conflict: true, runningTaskId: activeTaskId };
    }

    const updatedTasks = todayRecord.tasks.map(t => {
      // If we are forcing a switch, pause the currently active task
      if (activeTaskId && t.id === activeTaskId) {
        const accumulated = t.duration + (t.lastStarted ? (now - t.lastStarted) : 0);
        return {
          ...t,
          status: 'idle' as const,
          duration: accumulated,
          lastStarted: null,
          updatedAt: now
        };
      }
      
      // Start the requested task
      if (t.id === id) {
        return {
          ...t,
          status: 'running' as const,
          lastStarted: now,
          updatedAt: now
        };
      }
      return t;
    });

    setActiveTaskId(id);
    saveAndSetToday(updatedTasks);
    return { conflict: false };
  }, [activeTaskId, todayRecord, saveAndSetToday]);

  // 2. PAUSE TASK
  const pauseTask = useCallback((id: string) => {
    const now = Date.now();
    const updatedTasks = todayRecord.tasks.map(t => {
      if (t.id === id && t.status === 'running') {
        const sessionDuration = t.lastStarted ? (now - t.lastStarted) : 0;
        return {
          ...t,
          status: 'idle' as const,
          duration: t.duration + sessionDuration,
          lastStarted: null,
          updatedAt: now
        };
      }
      return t;
    });

    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
    saveAndSetToday(updatedTasks);
  }, [activeTaskId, todayRecord, saveAndSetToday]);

  // 3. COMPLETE (DONE) TASK
  const completeTask = useCallback((id: string) => {
    const now = Date.now();
    const updatedTasks = todayRecord.tasks.map(t => {
      if (t.id === id) {
        const sessionDuration = (t.status === 'running' && t.lastStarted) ? (now - t.lastStarted) : 0;
        return {
          ...t,
          status: 'completed' as const,
          duration: t.duration + sessionDuration,
          lastStarted: null,
          completedAt: now,
          updatedAt: now
        };
      }
      return t;
    });

    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
    saveAndSetToday(updatedTasks);
  }, [activeTaskId, todayRecord, saveAndSetToday]);

  // 4. RESET TASK
  const resetTask = useCallback((id: string) => {
    const now = Date.now();
    const updatedTasks = todayRecord.tasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'idle' as const,
          duration: 0,
          lastStarted: null,
          completedAt: null,
          updatedAt: now
        };
      }
      return t;
    });

    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
    // Clear live elapsed helper state for this task
    setElapsedTime(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    saveAndSetToday(updatedTasks);
  }, [activeTaskId, todayRecord, saveAndSetToday]);

  // Dynamic Tags management
  const [savedTags, setSavedTags] = useState<string[]>(() => {
    const raw = localStorage.getItem('grindstreaks_saved_tags_v1');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    const defaults = ['DSA', 'Web Dev', 'CAT Prep', 'Certifications & AI', 'Routines & Rest'];
    localStorage.setItem('grindstreaks_saved_tags_v1', JSON.stringify(defaults));
    return defaults;
  });

  const saveTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setSavedTags(prev => {
      if (prev.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const updated = [...prev, trimmed];
      localStorage.setItem('grindstreaks_saved_tags_v1', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Morning Let's Start the Day Flow
  const startDay = useCallback((firstTaskName: string, firstTaskTag: string) => {
    const now = Date.now();
    const newId = `task-${now}`;
    
    const firstTask: Task = {
      id: newId,
      name: firstTaskName.trim() || "First Task",
      category: firstTaskTag.trim() || "Study",
      type: 'Custom',
      status: 'running',
      duration: 0,
      lastStarted: now,
      createdAt: now,
      updatedAt: now,
    };

    saveTag(firstTaskTag);

    const updatedTasks = [firstTask];
    const record = { 
      ...todayRecord, 
      tasks: updatedTasks, 
      isDayStarted: true,
      isDayEnded: false 
    };
    
    const savedRecord = storage.saveTodayRecord(record);
    setTodayRecord(savedRecord);
    setActiveTaskId(newId);
    
    // Refresh history
    setHistory(storage.loadHistory());
  }, [todayRecord, saveTag]);

  // Wrap Up Day Flow
  const wrapUpDay = useCallback(() => {
    const now = Date.now();
    
    // Pause any active task
    const updatedTasks = todayRecord.tasks.map(t => {
      if (t.status === 'running') {
        const sessionDuration = t.lastStarted ? (now - t.lastStarted) : 0;
        return {
          ...t,
          status: 'idle' as const,
          duration: t.duration + sessionDuration,
          lastStarted: null,
          updatedAt: now
        };
      }
      return t;
    });

    setActiveTaskId(null);

    // Compute completed rate and duration
    const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
    const totalCount = updatedTasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const studyTime = storage.getStudyTimeForTasks(updatedTasks);

    const finalizedRecord: DayRecord = {
      ...todayRecord,
      tasks: updatedTasks,
      completedCount,
      totalCount,
      completionRate,
      studyTime,
      isDayEnded: true
    };

    // Save active record
    const savedRecord = storage.saveTodayRecord(finalizedRecord);
    setTodayRecord(savedRecord);

    // Sync to History
    const currentHistory = storage.loadHistory();
    currentHistory[todayRecord.date] = savedRecord;
    storage.saveHistory(currentHistory);
    setHistory(currentHistory);

    // Calculate dynamic streak increment
    const completedStudyTasks = updatedTasks.filter(
      t => storage.isStudyCategory(t.category) && t.status === 'completed'
    ).length;

    const currentSettings = storage.loadSettings();
    let newStreak = currentSettings.streak;
    
    if (completedStudyTasks > 0) {
      newStreak += 1;
    } else {
      newStreak = 0;
    }

    const updatedSettings = {
      ...currentSettings,
      streak: newStreak,
      maxStreak: Math.max(currentSettings.maxStreak, newStreak),
    };

    storage.saveSettings(updatedSettings);
    setSettings(updatedSettings);
  }, [todayRecord]);

  // Reopen Day Flow
  const reopenDay = useCallback(() => {
    const record = {
      ...todayRecord,
      isDayEnded: false
    };
    const savedRecord = storage.saveTodayRecord(record);
    setTodayRecord(savedRecord);

    // Remove from yesterday's history
    const currentHistory = storage.loadHistory();
    delete currentHistory[todayRecord.date];
    storage.saveHistory(currentHistory);
    setHistory(currentHistory);
  }, [todayRecord]);

  // General Dynamic addTask
  const addDynamicTask = useCallback((name: string, tag: string, startImmediately: boolean = false) => {
    const now = Date.now();
    const newId = `task-${now}`;
    
    saveTag(tag);

    const newTask: Task = {
      id: newId,
      name: name.trim(),
      category: tag.trim(),
      type: 'Custom',
      status: startImmediately ? 'running' : 'idle',
      duration: 0,
      lastStarted: startImmediately ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    let updatedTasks = todayRecord.tasks;
    if (startImmediately) {
      // Pause current active task
      updatedTasks = todayRecord.tasks.map(t => {
        if (t.status === 'running') {
          const sessionDuration = t.lastStarted ? (now - t.lastStarted) : 0;
          return {
            ...t,
            status: 'idle' as const,
            duration: t.duration + sessionDuration,
            lastStarted: null,
            updatedAt: now
          };
        }
        return t;
      });
      setActiveTaskId(newId);
    }

    updatedTasks = [...updatedTasks, newTask];
    saveAndSetToday(updatedTasks);
  }, [todayRecord, saveAndSetToday, saveTag]);

  // 5. ADD CUSTOM TASK (Backward Compatibility)
  const addCustomTask = useCallback((name: string, category: string) => {
    addDynamicTask(name, category, false);
  }, [addDynamicTask]);

  // 6. RENAME CUSTOM TASK (CRUD - UPDATE)
  const renameCustomTask = useCallback((id: string, newName: string) => {
    const now = Date.now();
    
    // Update templates
    const currentTemplates = storage.loadCustomTemplates();
    const updatedTemplates = currentTemplates.map(t => 
      t.id === id ? { ...t, name: newName, updatedAt: now } : t
    );
    storage.saveCustomTemplates(updatedTemplates);

    // Update today's task
    const updatedTasks = todayRecord.tasks.map(t => 
      t.id === id ? { ...t, name: newName, updatedAt: now } : t
    );
    saveAndSetToday(updatedTasks);
  }, [todayRecord, saveAndSetToday]);

  // 7. DELETE CUSTOM TASK (CRUD - DELETE)
  const deleteCustomTask = useCallback((id: string) => {
    // Save last state for potential undo
    const lastTasks = [...todayRecord.tasks];
    const taskToDelete = todayRecord.tasks.find(t => t.id === id);

    // Update templates
    const currentTemplates = storage.loadCustomTemplates();
    storage.saveCustomTemplates(currentTemplates.filter(t => t.id !== id));

    // Update today's task
    const updatedTasks = todayRecord.tasks.filter(t => t.id !== id);
    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
    saveAndSetToday(updatedTasks);

    // Return the deleted task & restore handler for undo implementation
    return {
      deletedTask: taskToDelete,
      undo: () => {
        if (taskToDelete) {
          const currentTemplatesLater = storage.loadCustomTemplates();
          storage.saveCustomTemplates([...currentTemplatesLater, taskToDelete]);
          saveAndSetToday(lastTasks);
        }
      }
    };
  }, [activeTaskId, todayRecord, saveAndSetToday]);

  // 8. UPDATE THEME SETTINGS
  const toggleDarkMode = useCallback((enabled: boolean) => {
    const updatedSettings = { ...settings, darkMode: enabled };
    storage.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    
    // Apply class to body
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // 9. RESET TODAY
  const handleResetToday = useCallback(() => {
    setActiveTaskId(null);
    setElapsedTime({});
    const updatedRecord = storage.resetTodayTasks();
    setTodayRecord(updatedRecord);
  }, []);

  // 10. IMPORT JSON BACKUP
  const handleImportJSON = useCallback((jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      // Validate structure loosely
      if (data.today && data.history && data.settings) {
        localStorage.setItem('grindstreaks_today_v1', JSON.stringify(data.today));
        localStorage.setItem('grindstreaks_history_v1', JSON.stringify(data.history));
        localStorage.setItem('grindstreaks_settings_v1', JSON.stringify(data.settings));
        if (data.customTemplates) {
          localStorage.setItem('grindstreaks_custom_templates_v1', JSON.stringify(data.customTemplates));
        }
        
        // Reload states
        setTodayRecord(storage.loadTodayRecord());
        setSettings(storage.loadSettings());
        setHistory(storage.loadHistory());
        
        // Re-align dark mode
        if (data.settings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON file imported', e);
    }
    return false;
  }, []);

  // Helper to format live timer of any task
  const getLiveDuration = (task: Task): number => {
    if (task.status === 'running' && task.id === activeTaskId) {
      return elapsedTime[task.id] || task.duration;
    }
    return task.duration;
  };

  const reloadTodayRecord = useCallback(() => {
    setTodayRecord(storage.loadTodayRecord());
    setHistory(storage.loadHistory());
  }, []);

  return {
    todayRecord,
    settings,
    history,
    activeTaskId,
    elapsedTime,
    searchQuery,
    setSearchQuery,
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
    setTodayRecord,
    setSettings,
    setHistory,
    savedTags,
    startDay,
    wrapUpDay,
    reopenDay,
    addDynamicTask
  };
};
