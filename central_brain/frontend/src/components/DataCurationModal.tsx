import React, { useState } from 'react';

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

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSummary(record.id, editedSummary);
    setIsSaving(false);
    onClose();
  };

  const handlePurge = async () => {
    if (confirm('Are you sure you want to permanently purge this memory cell and its deduplication fingerprint from Central Brain?')) {
      setIsPurging(true);
      await onPurgeRecord(record.id);
      setIsPurging(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0f1d] border border-cyan-500/40 rounded-2xl w-full max-w-2xl overflow-hidden cyber-glow shadow-2xl">
        {/* Header */}
        <div className="bg-[#05070d] px-6 py-4 border-b border-[#15233e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-slate-100">
              Memory Inspection & Curation Cell
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-mono"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3 bg-[#05070d] p-3 rounded-lg border border-[#15233e]">
            <div>
              <span className="text-slate-500 block">Agent ID:</span>
              <span className="text-cyan-400 font-bold">{record.agent_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Session ID:</span>
              <span className="text-slate-200">{record.session_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Raw Tokens Ingested:</span>
              <span className="text-amber-400">{record.raw_tokens} tokens</span>
            </div>
            <div>
              <span className="text-slate-500 block">Distilled Tokens Stored:</span>
              <span className="text-emerald-400">{record.distilled_tokens} tokens</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Source Trace:</span>
              <span className="text-slate-400 truncate block">{record.source_path || 'Unknown'}</span>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
              <span>Distilled Memory Summary (Editable):</span>
              <span className="text-[10px] text-slate-500">Edit in-place if inaccurate</span>
            </label>
            <textarea
              rows={4}
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="w-full bg-[#05070d] border border-[#1a2c4e] rounded-lg p-3 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Cascade Purge Warning Notice */}
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-[11px] text-red-300">
            <strong>Cascade Purge Guarantee:</strong> Purging permanently removes this row from the SQLite ledger and wipes its SHA-256 deduplication fingerprint from <code className="text-red-200">event_dedup</code>. The single-index ledger files (<code className="text-red-200">master_index.json/.md</code>) will synchronize immediately.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#05070d] px-6 py-4 border-t border-[#15233e] flex items-center justify-between">
          <button
            onClick={handlePurge}
            disabled={isPurging}
            className="px-4 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {isPurging ? 'Purging Cascade...' : '🗑️ Delete / Purge from Brain'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Summary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
