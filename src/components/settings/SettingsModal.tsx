import * as React from "react";
import { Modal } from "../shared/Modal";
import { Settings, Task, Category } from "../../types";
import * as storage from "../../services/storage";
import {
  Sun,
  Moon,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Undo,
  Tag,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  toggleDarkMode: (enabled: boolean) => void;
  handleResetToday: () => void;
  handleImportJSON: (jsonData: string) => boolean;
  reloadTodayRecord: () => void;
  id: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  toggleDarkMode,
  handleResetToday,
  handleImportJSON,
  reloadTodayRecord,
  id,
}) => {
  const [resetConfirm, setResetConfirm] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // States for Timetable & Category Management
  const [timetable, setTimetable] = React.useState<Task[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [activeTab, setActiveTab] = React.useState<"timetable" | "categories">("timetable");

  // Form states for custom Timetable Task block addition
  const [newTaskName, setNewTaskName] = React.useState("");
  const [newTaskStart, setNewTaskStart] = React.useState("");
  const [newTaskEnd, setNewTaskEnd] = React.useState("");
  const [newTaskCategory, setNewTaskCategory] = React.useState("DSA");

  // Form states for custom Category addition
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatIsRoutine, setNewCatIsRoutine] = React.useState(false);

  // Synchronize internal states with storage when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimetable(storage.loadTimetable());
      setCategories(storage.loadCategories());
    }
  }, [isOpen]);

  // Timetable Handlers
  const handleAddTimetableTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !newTaskStart.trim() || !newTaskEnd.trim()) return;

    const newTask: Task = {
      id: `t-custom-${Date.now()}`,
      name: newTaskName.trim(),
      category: newTaskCategory,
      type: "Main",
      scheduledStart: newTaskStart.trim(),
      scheduledEnd: newTaskEnd.trim(),
      status: "idle",
      duration: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...timetable, newTask];
    setTimetable(updated);
    storage.saveTimetable(updated);
    reloadTodayRecord();

    setNewTaskName("");
    setNewTaskStart("");
    setNewTaskEnd("");
  };

  const handleEditTimetableTask = (taskId: string, field: keyof Task, value: any) => {
    const updated = timetable.map((t) =>
      t.id === taskId ? { ...t, [field]: value, updatedAt: Date.now() } : t
    );
    setTimetable(updated);
    storage.saveTimetable(updated);
    reloadTodayRecord();
  };

  const handleDeleteTimetableTask = (taskId: string) => {
    const updated = timetable.filter((t) => t.id !== taskId);
    setTimetable(updated);
    storage.saveTimetable(updated);
    reloadTodayRecord();
  };

  const handleMoveTask = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === timetable.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...timetable];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setTimetable(updated);
    storage.saveTimetable(updated);
    reloadTodayRecord();
  };

  const handleRestoreDefaultTimetable = () => {
    if (window.confirm("Are you sure you want to restore the default timetable? This will overwrite your customized timetable blocks.")) {
      const defaults = storage.DEFAULT_TIMETABLE_TASKS.map(t => {
        if (t.category === 'Study') {
          return { ...t, category: 'Extras' };
        }
        return t;
      });
      setTimetable(defaults);
      storage.saveTimetable(defaults);
      
      const defaultCats = storage.DEFAULT_CATEGORIES;
      setCategories(defaultCats);
      storage.saveCategories(defaultCats);

      reloadTodayRecord();
    }
  };

  // Category Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const catId = newCatName.trim();
    
    // Check if category name already exists (case-insensitive)
    const exists = categories.some(
      (c) => c.name.toLowerCase() === catId.toLowerCase()
    );
    if (exists) {
      window.alert("This category already exists!");
      return;
    }

    const newCat: Category = {
      id: catId,
      name: newCatName.trim(),
      isRoutine: newCatIsRoutine,
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    storage.saveCategories(updated);
    reloadTodayRecord();
    
    setNewCatName("");
    setNewCatIsRoutine(false);
  };

  const handleEditCategory = (catId: string, field: keyof Category, value: any) => {
    let newId = catId;
    if (field === "name") {
      const trimmedValue = (value as string).trim();
      if (!trimmedValue) return; // Do not allow empty category name
      
      if (trimmedValue !== catId) {
        newId = trimmedValue;
      }
    }

    // 1. Update categories array
    const updatedCategories = categories.map((c) => {
      if (c.id === catId) {
        if (field === "name") {
          return { ...c, id: newId, name: newId };
        } else {
          return { ...c, [field]: value };
        }
      }
      return c;
    });

    setCategories(updatedCategories);
    storage.saveCategories(updatedCategories);

    // 2. Update timetable tasks
    const updatedTimetable = timetable.map((t) => {
      if (t.category === catId) {
        return { ...t, category: newId };
      }
      return t;
    });
    setTimetable(updatedTimetable);
    storage.saveTimetable(updatedTimetable);

    // 3. Update today record tasks in localStorage
    const todayData = localStorage.getItem("grindstreaks_today_v1");
    if (todayData) {
      try {
        const record = JSON.parse(todayData);
        if (record && Array.isArray(record.tasks)) {
          record.tasks = record.tasks.map((t: any) => {
            if (t.category === catId) {
              return { ...t, category: newId };
            }
            return t;
          });
          localStorage.setItem("grindstreaks_today_v1", JSON.stringify(record));
        }
      } catch (e) {
        console.error("Failed to update categories in today's record", e);
      }
    }

    reloadTodayRecord();
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    // Warning if category is currently in use
    const isUsed = timetable.some((t) => t.category === catId);
    if (isUsed) {
      const fallbackCat = categories.find(c => c.id !== catId)?.id || "Custom";
      if (!window.confirm(`Warning: This category is currently used by some timetable tasks. Deleting it will change those tasks' category to "${fallbackCat}". Proceed?`)) {
        return;
      }
      const updatedTimetable = timetable.map((t) =>
        t.category === catId ? { ...t, category: fallbackCat } : t
      );
      setTimetable(updatedTimetable);
      storage.saveTimetable(updatedTimetable);

      // Also update today record tasks in localStorage
      const todayData = localStorage.getItem("grindstreaks_today_v1");
      if (todayData) {
        try {
          const record = JSON.parse(todayData);
          if (record && Array.isArray(record.tasks)) {
            record.tasks = record.tasks.map((t: any) => {
              if (t.category === catId) {
                return { ...t, category: fallbackCat };
              }
              return t;
            });
            localStorage.setItem("grindstreaks_today_v1", JSON.stringify(record));
          }
        } catch (e) {
          console.error("Failed to update deleted category in today's record", e);
        }
      }
    }

    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    storage.saveCategories(updated);
    reloadTodayRecord();
  };

  // 1. Export entire application schema backup
  const handleExport = () => {
    const backupData = {
      today: JSON.parse(localStorage.getItem("grindstreaks_today_v1") || "null"),
      history: JSON.parse(localStorage.getItem("grindstreaks_history_v1") || "null"),
      settings: JSON.parse(localStorage.getItem("grindstreaks_settings_v1") || "null"),
      customTemplates: JSON.parse(localStorage.getItem("grindstreaks_custom_templates_v1") || "null"),
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grindstreaks_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Import backup schema
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = handleImportJSON(content);
      if (success) {
        setImportStatus({ success: true });
        setTimeout(() => {
          setImportStatus(null);
          onClose();
        }, 1500);
      } else {
        setImportStatus({ error: "Invalid backup file. Please make sure the JSON schema is valid." });
      }
    };
    reader.onerror = () => {
      setImportStatus({ error: "Failed to read backup file." });
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 3. Destructive deletion
  const handleDeleteAll = () => {
    localStorage.clear();
    setDeleteConfirm(false);
    onClose();
    // Trigger fully clean reload
    window.location.reload();
  };

  const onResetTodayClick = () => {
    handleResetToday();
    setResetConfirm(false);
    onClose();
  };

  return (
    <>
      <Modal id={id} isOpen={isOpen} onClose={onClose} title="Preferences & Tools" size="md">
        <div className="space-y-6 pt-2">
          
          {/* Theme Settings block */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-widest">
              Visual Theme
            </h4>
            <div className="flex gap-2 p-1 bg-white dark:bg-zinc-950 border border-[#E0E3E7] dark:border-zinc-900 rounded-[16px] shadow-sm">
              <button
                onClick={() => toggleDarkMode(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs rounded-xl transition-all font-bold cursor-pointer ${
                  !settings.darkMode
                    ? "bg-[#E8F0FE] text-[#1A73E8] shadow-sm font-black"
                    : "text-[#5F6368] hover:text-[#3C4043] dark:text-zinc-400 hover:bg-[#F1F3F4]"
                }`}
              >
                <Sun className="w-4 h-4 text-[#FBBC05]" />
                Light Mode
              </button>
              <button
                onClick={() => toggleDarkMode(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs rounded-xl transition-all font-bold cursor-pointer ${
                  settings.darkMode
                    ? "bg-[#E8F0FE] text-[#1A73E8] shadow-sm font-black dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-[#5F6368] hover:text-[#3C4043] dark:text-zinc-400 hover:bg-[#F1F3F4]"
                }`}
              >
                <Moon className="w-4 h-4 text-[#4285F4]" />
                Dark Mode
              </button>
            </div>
          </div>

          {/* Timetable & Category Customizer */}
          <div className="border border-[#E0E3E7] dark:border-zinc-850 rounded-[16px] overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50/50 dark:bg-zinc-900/50 border-b border-[#E0E3E7] dark:border-zinc-850 gap-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#1A73E8]" />
                <span className="font-bold text-sm text-[#3C4043] dark:text-zinc-100">Timetable & Categories</span>
              </div>
              
              {/* Segmented Tab Controls */}
              <div className="flex bg-[#F1F3F4] dark:bg-zinc-950 p-1 rounded-xl gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("timetable")}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all font-bold cursor-pointer border-none flex items-center gap-1.5 ${
                    activeTab === "timetable"
                      ? "bg-white dark:bg-zinc-900 text-[#1A73E8] shadow-sm"
                      : "text-[#5F6368] hover:text-[#3C4043] dark:text-zinc-400 bg-transparent"
                  }`}
                >
                  Timetable ({timetable.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("categories")}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all font-bold cursor-pointer border-none flex items-center gap-1.5 ${
                    activeTab === "categories"
                      ? "bg-white dark:bg-zinc-900 text-[#1A73E8] shadow-sm"
                      : "text-[#5F6368] hover:text-[#3C4043] dark:text-zinc-400 bg-transparent"
                  }`}
                >
                  Categories ({categories.length})
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {activeTab === "timetable" ? (
                <>
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <p className="text-[11px] text-[#5F6368] dark:text-zinc-400 max-w-[280px]">
                      Add, edit, delete, or reorder your scheduled daily timetable blocks. Changes immediately sync to today's task card progress.
                    </p>
                    <button
                      type="button"
                      onClick={handleRestoreDefaultTimetable}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-[#EA4335] bg-[#EA4335]/5 hover:bg-[#EA4335]/15 border border-[#EA4335]/20 rounded-lg cursor-pointer transition-colors"
                    >
                      <Undo className="w-3 h-3" />
                      Reset Default
                    </button>
                  </div>

                  {/* Timetable Block List - Scrollable */}
                  <div className="space-y-3 max-h-[220px] md:max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                    {timetable.map((task, index) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/20 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          {/* Task name inline edit */}
                          <input
                            type="text"
                            value={task.name}
                            onChange={(e) => handleEditTimetableTask(task.id, "name", e.target.value)}
                            className="flex-1 font-bold text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1A73E8] focus:outline-none py-0.5 text-gray-800 dark:text-zinc-200"
                          />
                          
                          {/* Order Controls & Delete */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveTask(index, "up")}
                              disabled={index === 0}
                              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer border-none bg-transparent"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTask(index, "down")}
                              disabled={index === timetable.length - 1}
                              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer border-none bg-transparent"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTimetableTask(task.id)}
                              className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/15 cursor-pointer border-none bg-transparent"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Schedule times & Category select inline */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-0.5">Start Time</label>
                            <input
                              type="text"
                              value={task.scheduledStart || ""}
                              onChange={(e) => handleEditTimetableTask(task.id, "scheduledStart", e.target.value)}
                              placeholder="e.g. 07:00 AM"
                              className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-lg focus:outline-none focus:border-[#1A73E8]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-0.5">End Time</label>
                            <input
                              type="text"
                              value={task.scheduledEnd || ""}
                              onChange={(e) => handleEditTimetableTask(task.id, "scheduledEnd", e.target.value)}
                              placeholder="e.g. 09:00 AM"
                              className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-lg focus:outline-none focus:border-[#1A73E8]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-0.5">Category</label>
                            <select
                              value={task.category}
                              onChange={(e) => handleEditTimetableTask(task.id, "category", e.target.value)}
                              className="w-full px-1.5 py-1 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-lg focus:outline-none focus:border-[#1A73E8] cursor-pointer"
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Timetable Block Form */}
                  <form onSubmit={handleAddTimetableTask} className="pt-3 border-t border-[#E0E3E7] dark:border-zinc-800 space-y-2.5">
                    <div className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                      Add scheduled task block
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Task name (e.g. Web Development)"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#1A73E8] w-full"
                      />
                      <select
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#1A73E8] cursor-pointer w-full"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Start Time (e.g. 10:30 AM)"
                        value={newTaskStart}
                        onChange={(e) => setNewTaskStart(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#1A73E8]"
                      />
                      <input
                        type="text"
                        placeholder="End Time (e.g. 01:00 PM)"
                        value={newTaskEnd}
                        onChange={(e) => setNewTaskEnd(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#1A73E8]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Timetable Block
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-[#5F6368] dark:text-zinc-400">
                    Manage tags/categories. Study categories will count toward academic study hours, while Routine categories (like sleep, breakfast) are excluded.
                  </p>

                  {/* Categories List - Scrollable */}
                  <div className="space-y-2 max-h-[220px] md:max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/20"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => handleEditCategory(cat.id, "name", e.target.value)}
                            className="font-bold text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1A73E8] focus:outline-none py-0.5 text-gray-800 dark:text-zinc-200 w-full max-w-[120px] sm:max-w-[160px]"
                            placeholder="Category name"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditCategory(cat.id, "isRoutine", !cat.isRoutine)}
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all cursor-pointer border-none flex-shrink-0 ${
                              cat.isRoutine
                                ? "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                : "bg-blue-50 text-[#1A73E8] dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                            }`}
                            title="Click to toggle type: Study / Routine"
                          >
                            {cat.isRoutine ? "Routine" : "Study"}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/15 transition-colors cursor-pointer border-none bg-transparent"
                            title="Delete category"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Category Form */}
                  <form onSubmit={handleAddCategory} className="pt-3 border-t border-[#E0E3E7] dark:border-zinc-800 space-y-2.5">
                    <div className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                      Add custom category
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Category name (e.g. Gate, Fitness)"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-[#1A73E8]"
                      />
                      <div className="flex items-center gap-1.5 px-1 flex-shrink-0">
                        <input
                          type="checkbox"
                          id="catIsRoutine"
                          checked={newCatIsRoutine}
                          onChange={(e) => setNewCatIsRoutine(e.target.checked)}
                          className="rounded border-gray-300 dark:border-zinc-700 text-[#1A73E8] focus:ring-[#1A73E8] w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="catIsRoutine" className="text-xs text-gray-600 dark:text-zinc-400 select-none cursor-pointer font-bold">
                          Is Routine block?
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Category
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>



          {/* Data Portability (Backup / Import) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-widest">
              Data Portability
            </h4>
            <p className="text-[11px] text-[#5F6368] dark:text-zinc-500 leading-normal font-medium">
              Keep your progress safe. Export your habits, custom task definitions, and completed session history logs as a portable JSON file to back up or migrate to another browser.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer border-none"
              >
                <Download className="w-4 h-4 text-blue-400" />
                Export Backup
              </button>
              
              <button
                onClick={triggerFileInput}
                className="flex items-center justify-center gap-2 p-3 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer border-none"
              >
                <Upload className="w-4 h-4 text-[#34A853]" />
                Import Backup
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            {/* Import Status feedback */}
            {importStatus && (
              <div className="mt-2 text-xs">
                {importStatus.success && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl font-medium">
                    <FileCheck className="w-4 h-4" />
                    Backup imported successfully! Reloading...
                  </div>
                )}
                {importStatus.error && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                    {importStatus.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="space-y-3 pt-4 border-t border-[#E0E3E7] dark:border-zinc-900">
            <h4 className="text-xs font-bold text-[#EA4335] uppercase tracking-widest">
              Danger Zone
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Reset Today */}
              <button
                onClick={() => setResetConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-white border border-[#E0E3E7] hover:bg-[#F1F3F4] text-[#EA4335] dark:border-red-950/30 dark:hover:bg-red-950/15 text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Today's Progress
              </button>

              {/* Reset All */}
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-[#EA4335] hover:bg-red-600 text-white text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 animate-bounce" />
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reset today confirmation dialog */}
      <Modal
        id="reset-today-confirm"
        isOpen={resetConfirm}
        onClose={() => setResetConfirm(false)}
        title="Reset Today's Tasks?"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-[#5F6368] dark:text-zinc-400 font-sans font-medium">
            This will clear your tracking status, completed counts, active timer loops, and reset all of today's timetable and custom tasks to <strong>idle (00:00:00)</strong>. This cannot be undone. Are you sure you want to proceed?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setResetConfirm(false)}
              className="px-4 py-2 text-xs bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl transition-colors font-bold border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onResetTodayClick}
              className="px-4 py-2 text-xs bg-[#EA4335] text-white rounded-xl hover:bg-red-600 font-bold transition-colors shadow-sm cursor-pointer border-none"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete All confirmation dialog */}
      <Modal
        id="delete-all-confirm"
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="WARNING: Delete All Data?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 items-start p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-xl">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
            <p className="text-xs leading-relaxed font-sans font-bold">
              This action is extremely destructive and is permanent. It completely clears all local storage, deleting your active streak, max streak, custom task templates, and all historical consistency graph logs.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-4 py-2 text-xs bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white rounded-xl transition-colors font-bold border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2 text-xs bg-[#EA4335] text-white rounded-xl hover:bg-red-700 font-bold transition-colors shadow-sm cursor-pointer border-none"
            >
              Delete Everything
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
