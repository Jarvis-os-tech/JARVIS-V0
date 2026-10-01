import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Save, 
  FileText, 
  Clock, 
  Hash, 
  CheckCircle2, 
  AlertTriangle,
  Folder,
  Layers,
  ArrowRight
} from 'lucide-react';

interface LedgerRecord {
  id: string;
  agent_id: string;
  session_id: string;
  timestamp: string;
  raw_tokens: number;
  distilled_tokens: number;
  summary: string;
  artifacts: string;
  source_path?: string;
  event_hash?: string;
}

interface DataCurationModalProps {
  record: LedgerRecord | null;
  onClose: () => void;
  onSaveSummary: (id: string, newSummary: string) => Promise<void>;
  onPurgeRecord: (id: string) => Promise<void>;
}

export const DataCurationModal: React.FC<DataCurationModalProps> = ({
  record,
  onClose,
  onSaveSummary,
  onPurgeRecord,
}) => {
  if (!record) return null;

  const [editedSummary, setEditedSummary] = useState(record.summary);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setEditedSummary(record.summary);
    setSaveSuccess(false);
  }, [record]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSummary(record.id, editedSummary);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handlePurge = async () => {
    if (window.confirm('Cascade Purge: This will permanently delete this memory from the ledger and wipe its deduplication fingerprint. Proceed?')) {
      setIsPurging(true);
      await onPurgeRecord(record.id);
      setIsPurging(false);
      onClose();
    }
  };

  const savings =
    record.raw_tokens > 0
      ? (((record.raw_tokens - record.distilled_tokens) / record.raw_tokens) * 100).toFixed(1)
      : '0.0';

  let artifactsList: string[] = [];
  try {
    artifactsList = JSON.parse(record.artifacts || '[]');
  } catch (e) {
    artifactsList = [];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#060a14] px-6 py-4 border-b border-[#162342] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Memory Inspection & Curation
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  {record.agent_id}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Review, edit, or purge this memory cell before J.A.R.V.I.S. acts on it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#05070d] p-3 rounded-xl border border-[#162342]">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3 text-cyan-400" /> Session ID
              </span>
              <span className="font-mono text-xs text-slate-200 truncate block font-semibold" title={record.session_id}>
                {record.session_id}
              </span>
            </div>

            <div className="bg-[#05070d] p-3 rounded-xl border border-[#162342]">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Recorded At
              </span>
              <span className="font-mono text-xs text-slate-200 block font-semibold">
                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="bg-[#05070d] p-3 rounded-xl border border-[#162342]">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-amber-400" /> Raw Activity
              </span>
              <span className="font-mono text-xs text-amber-400 font-bold block">
                {record.raw_tokens.toLocaleString()} tokens
              </span>
            </div>

            <div className="bg-[#05070d] p-3 rounded-xl border border-[#162342]">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Compressed
              </span>
              <span className="font-mono text-xs text-emerald-400 font-bold block">
                {record.distilled_tokens.toLocaleString()} (-{savings}%)
              </span>
            </div>
          </div>

          {/* Source Location */}
          {record.source_path && (
            <div className="bg-[#05070d] px-3.5 py-2.5 rounded-xl border border-[#162342] flex items-center gap-2 text-xs">
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-medium">Source Path:</span>
              <code className="text-slate-200 font-mono truncate text-[11px]">
                {record.source_path}
              </code>
            </div>
          )}

          {/* Editable Distilled Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>Distilled Memory Summary</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase font-mono">
                  (editable in-place)
                </span>
              </label>
              {editedSummary !== record.summary && (
                <button
                  type="button"
                  onClick={() => setEditedSummary(record.summary)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Reset to Original
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              placeholder="Enter refined summary..."
              className="w-full bg-[#05070d] border border-[#1a2c4e] focus:border-cyan-500 rounded-xl p-3.5 text-slate-100 placeholder-slate-600 focus:outline-none transition-colors text-sm leading-relaxed"
            />
          </div>

          {/* Artifacts & Referenced Files */}
          {artifactsList.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Referenced Deliverables & Files:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {artifactsList.map((art, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#05070d] border border-[#162342] text-xs font-mono text-cyan-300 flex items-center gap-1.5"
                  >
                    <span>📄</span> {art}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cascade Purge Information Box */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200/90 leading-relaxed">
              <span className="font-semibold text-red-300 block mb-0.5">Cascade Purge Protection</span>
              Purging permanently drops this row from SQLite, erases its SHA-256 fingerprint from the deduplication bank (allowing re-ingestion if desired), and refreshes <code className="text-red-200 font-mono">master_index.json/.md</code>.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#060a14] px-6 py-4 border-t border-[#162342] flex items-center justify-between">
          <button
            onClick={handlePurge}
            disabled={isPurging}
            className="px-3.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 text-red-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isPurging ? 'Purging Cascade...' : 'Purge from Brain'}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#0a0f1d] hover:bg-slate-800 border border-[#162342] text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Summary'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
