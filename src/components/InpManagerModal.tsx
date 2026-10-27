import React, { useState } from 'react';
import { WaterNetworkModel, SimulationResults } from '../types/network';
import { BUILTIN_NETWORKS } from '../models/builtinNetworks';
import { parseInpFile, exportToInpFile } from '../engine/inpParser';
import { X, Upload, Download, FileText, Check, Database, RefreshCw } from 'lucide-react';

interface InpManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: WaterNetworkModel;
  onLoadModel: (model: WaterNetworkModel) => void;
  simulationResults: SimulationResults;
}

export const InpManagerModal: React.FC<InpManagerModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onLoadModel,
  simulationResults,
}) => {
  const [tab, setTab] = useState<'builtin' | 'import' | 'export'>('builtin');
  const [pastedText, setPastedText] = useState('');
  const [importName, setImportName] = useState('Imported Custom Network');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseInpFile(text, file.name.replace(/\.[^/.]+$/, ''));
        onLoadModel(parsed);
        onClose();
      } catch (err: any) {
        setErrorMsg('Failed to parse INP file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    try {
      const parsed = parseInpFile(pastedText, importName);
      onLoadModel(parsed);
      onClose();
    } catch (err: any) {
      setErrorMsg('Failed to parse pasted INP: ' + err.message);
    }
  };

  const handleDownloadInp = () => {
    const content = exportToInpFile(currentModel);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentModel.name.replace(/\s+/g, '_')}.inp`;
    a.click();
  };

  const handleDownloadResultsJson = () => {
    const jsonStr = JSON.stringify(simulationResults, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentModel.name.replace(/\s+/g, '_')}_results.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Water Network Models & EPANET I/O</h2>
              <p className="text-xs text-slate-400">Load benchmark datasets or import/export .inp models</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs px-4">
          <button
            onClick={() => setTab('builtin')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition ${
              tab === 'builtin'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            EPA Benchmark Networks
          </button>
          <button
            onClick={() => setTab('import')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition ${
              tab === 'import'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import .INP File
          </button>
          <button
            onClick={() => setTab('export')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition ${
              tab === 'export'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Export & Data Downloads
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="bg-rose-950/50 border border-rose-800/80 p-3 rounded-lg text-rose-200">
              {errorMsg}
            </div>
          )}

          {tab === 'builtin' && (
            <div className="space-y-3">
              <p className="text-slate-300">
                Select an authentic EPA / WNTR benchmark network model to analyze:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(BUILTIN_NETWORKS).map(([key, model]) => {
                  const isCurrent = currentModel.name === model.name;
                  const nodeCount = Object.keys(model.nodes).length;
                  const linkCount = Object.keys(model.links).length;
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        onLoadModel(model);
                        onClose();
                      }}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500 shadow ring-1 ring-cyan-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-100 text-sm">{model.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mb-3">{model.description}</p>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                        <span>{nodeCount} Nodes</span>
                        <span>&bull;</span>
                        <span>{linkCount} Links</span>
                        <span>&bull;</span>
                        <span>PDD Demand</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  1. Upload .INP File from Disk
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer bg-slate-950/60 transition">
                  <input
                    type="file"
                    accept=".inp,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="inp-file-input"
                  />
                  <label htmlFor="inp-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                    <Upload className="w-6 h-6 text-cyan-400" />
                    <span className="font-medium text-slate-200">Click to select EPANET .inp file</span>
                    <span className="text-[11px] text-slate-400">Standard EPANET format supported</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  2. Or Paste Raw .INP Content
                </label>
                <input
                  type="text"
                  placeholder="Network Name"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-200 mb-2 focus:outline-none focus:border-cyan-500"
                />
                <textarea
                  rows={6}
                  placeholder="[TITLE]&#10;...&#10;[JUNCTIONS]&#10;...&#10;[PIPES]"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleParsePasted}
                  disabled={!pastedText.trim()}
                  className="mt-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold transition"
                >
                  Parse & Load Pasted Network
                </button>
              </div>
            </div>
          )}

          {tab === 'export' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Export current network model or simulated resilience results for downstream analysis:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadInp}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/80 hover:border-slate-700 text-left transition flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm">
                    <FileText className="w-5 h-5" /> EPANET .INP File
                  </div>
                  <p className="text-slate-400 text-xs mb-3">
                    Download complete water network topology, geometry, and pipe attributes in standard EPANET .inp format.
                  </p>
                  <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download .inp
                  </span>
                </button>

                <button
                  onClick={handleDownloadResultsJson}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/80 hover:border-slate-700 text-left transition flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-sm">
                    <Database className="w-5 h-5" /> Simulation Results JSON
                  </div>
                  <p className="text-slate-400 text-xs mb-3">
                    Download full 24-step simulation arrays: nodal pressures, pipe flow velocities, WSA, and resilience indices.
                  </p>
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download JSON
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
