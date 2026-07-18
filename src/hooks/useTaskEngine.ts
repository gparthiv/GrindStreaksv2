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

  // 5. ADD CUSTOM TASK (CRUD - CREATE)
  const addCustomTask = useCallback((name: string, category: string) => {
    const now = Date.now();
    const newId = `custom-${now}`;
    const newTask: Task = {
      id: newId,
      name,
      category,
      type: 'Custom',
      status: 'idle',
      duration: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Save template for future resets
    const currentTemplates = storage.loadCustomTemplates();
    storage.saveCustomTemplates([...currentTemplates, newTask]);

    // Add to active task list
    const updatedTasks = [...todayRecord.tasks, newTask];
    saveAndSetToday(updatedTasks);
  }, [todayRecord, saveAndSetToday]);

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
    setHistory
  };
};
