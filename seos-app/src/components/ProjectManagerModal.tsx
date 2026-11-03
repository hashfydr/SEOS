import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  exportProjectAsJSON,
  importProjectFromJSON,
  PRESET_CASE_STUDIES,
} from '../lib/projectManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectName = useStore((s) => s.projectName);
  const resetProject = useStore((s) => s.resetProject);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importProjectFromJSON(content);
      if (res.success) {
        setSuccessMsg(`Project loaded successfully!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Failed to import project.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleLoadPreset = (loadFn: () => void) => {
    loadFn();
    setSuccessMsg('Reference project loaded!');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to start a new blank project? Current unsaved changes will be cleared.')) {
      resetProject();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in text-seos-text cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-seos-border flex justify-between items-center bg-seos-surface-2/40">
          <div>
            <h3 className="font-semibold text-lg">Project Management & Case Studies</h3>
            <p className="text-xs text-seos-text-3 mt-0.5">Switch projects, load reference benchmarks, or backup to JSON</p>
          </div>
          <button
            onClick={onClose}
            className="text-seos-text-3 hover:text-seos-text p-1 rounded-md text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 text-sm max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-seos-red/10 border border-seos-red/30 text-seos-red text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-seos-green/10 border border-seos-green/30 text-seos-green text-xs font-semibold">
              {successMsg}
            </div>
          )}

          {/* Current Project Actions */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-seos-surface-2/30 border border-seos-border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-seos-text-3 font-medium">Active Workspace</span>
                <div className="font-bold text-base mt-0.5 text-seos-text">{projectName}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportProjectAsJSON}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-seos-surface border border-seos-border hover:border-seos-accent text-seos-text hover:text-seos-accent transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Export complete project as JSON"
                >
                  <span>⬇️</span> Export .json
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-seos-surface border border-seos-border hover:border-seos-accent text-seos-text hover:text-seos-accent transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Import project from JSON backup"
                >
                  <span>⬆️</span> Import .json
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          {/* Academic Reference Case Studies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase tracking-wider text-seos-text-3 font-semibold">
                Reference Case Studies (§3.1 Evaluation Benchmarks)
              </h4>
            </div>

            <div className="flex flex-col gap-3">
              {PRESET_CASE_STUDIES.map((preset) => (
                <div
                  key={preset.id}
                  className="p-4 rounded-xl bg-seos-surface border border-seos-border hover:border-seos-accent/50 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1">
                    <div className="font-bold text-sm text-seos-text group-hover:text-seos-accent transition-colors">
                      {preset.title}
                    </div>
                    <div className="text-xs text-seos-text-3 mt-1 leading-relaxed">
                      {preset.tagline}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoadPreset(preset.load)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-seos-accent text-white hover:bg-seos-accent/90 transition-colors shrink-0 shadow cursor-pointer"
                  >
                    Load Project
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Start Blank */}
          <div className="pt-2 border-t border-seos-border flex justify-between items-center text-xs text-seos-text-3">
            <span>Want to start an entirely new concept?</span>
            <button
              onClick={handleReset}
              className="text-seos-red hover:underline font-medium cursor-pointer"
            >
              Reset to Blank Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
