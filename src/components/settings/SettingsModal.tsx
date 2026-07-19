import * as React from "react";
import { Modal } from "../shared/Modal";
import { Settings } from "../../types";
import {
  Sun,
  Moon,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  FileCheck,
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

  // 1. Export Backup
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify({
        settings: localStorage.getItem("grindstreaks_settings_v1") ? JSON.parse(localStorage.getItem("grindstreaks_settings_v1")!) : {},
        history: localStorage.getItem("grindstreaks_history_v1") ? JSON.parse(localStorage.getItem("grindstreaks_history_v1")!) : {},
        today: localStorage.getItem("grindstreaks_today_v1") ? JSON.parse(localStorage.getItem("grindstreaks_today_v1")!) : {},
        saved_tags: localStorage.getItem("grindstreaks_saved_tags_v1") ? JSON.parse(localStorage.getItem("grindstreaks_saved_tags_v1")!) : []
      }, null, 2);

      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grindstreaks_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup failed", e);
    }
  };

  // 2. Import Backup
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        if (parsed.settings && parsed.history) {
          localStorage.setItem("grindstreaks_settings_v1", JSON.stringify(parsed.settings));
          localStorage.setItem("grindstreaks_history_v1", JSON.stringify(parsed.history));
          if (parsed.today) {
            localStorage.setItem("grindstreaks_today_v1", JSON.stringify(parsed.today));
          }
          if (parsed.saved_tags) {
            localStorage.setItem("grindstreaks_saved_tags_v1", JSON.stringify(parsed.saved_tags));
          }
          
          setImportStatus({ success: true });
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setImportStatus({ error: "Invalid backup format. Missing settings or history." });
        }
      } catch (err) {
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs rounded-xl transition-all font-bold cursor-pointer border-none ${
                  !settings.darkMode
                    ? "bg-[#E8F0FE] text-[#1A73E8] shadow-sm font-black"
                    : "text-[#5F6368] hover:text-[#3C4043] dark:text-zinc-400 hover:bg-[#F1F3F4] bg-transparent"
                }`}
              >
                <Sun className="w-4 h-4 text-[#FBBC05]" />
                Light Mode
              </button>
              <button
                onClick={() => toggleDarkMode(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs rounded-xl transition-all font-bold cursor-pointer border-none ${
                  settings.darkMode
                    ? "bg-[#E8F0FE] text-[#1A73E8] shadow-sm font-black dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-[#5F6368] hover:text-[#3C4043] dark:text-zinc-400 hover:bg-[#F1F3F4] bg-transparent"
                }`}
              >
                <Moon className="w-4 h-4 text-[#4285F4]" />
                Dark Mode
              </button>
            </div>
          </div>

          {/* Data Portability (Backup / Import) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#5F6368] dark:text-zinc-500 uppercase tracking-widest">
              Data Portability
            </h4>
            <p className="text-[11px] text-[#5F6368] dark:text-zinc-400 leading-normal font-medium">
              Keep your progress safe. Export your habits, custom tag definitions, and completed session history logs as a portable JSON file to back up or migrate to another browser.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer border-none"
              >
                <Download className="w-4 h-4 text-blue-450" />
                Export Backup
              </button>
              
              <button
                onClick={triggerFileInput}
                className="flex items-center justify-center gap-2 p-3 bg-black hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer border-none"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
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
                className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-[#EA4335] hover:bg-red-600 text-white text-xs font-bold rounded-[16px] shadow-sm transition-all cursor-pointer border-none"
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
            This will clear your tracking status, completed counts, active timer loops, and reset all of today's activities to <strong>idle (00:00:00)</strong>. This cannot be undone. Are you sure you want to proceed?
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
