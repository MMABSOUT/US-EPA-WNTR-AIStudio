import React, { useState } from 'react';
import { WaterNetworkModel, DemandModelType } from '../types/network';
import {
  Droplets,
  FolderOpen,
  HelpCircle,
  Settings,
  Shield,
  Activity,
  Layers,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  currentModel: WaterNetworkModel;
  onOpenModelModal: () => void;
  demandModel: DemandModelType;
  onChangeDemandModel: (mode: DemandModelType) => void;
  requiredPressure: number;
  onChangeRequiredPressure: (p: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModel,
  onOpenModelModal,
  demandModel,
  onChangeDemandModel,
  requiredPressure,
  onChangeRequiredPressure,
}) => {
  const [showDocs, setShowDocs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-900/30 text-white">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white font-mono">
                WNTR
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                v1.5 Resilience Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Water Network Tool for Resilience &bull; EPA / Sandia National Laboratories
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2.5">
          {/* Active Model Button */}
          <button
            onClick={onOpenModelModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentModel.name}</span>
          </button>

          {/* Demand Model Mode (PDD vs DDA) */}
          <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Solver</span>
            <button
              onClick={() => onChangeDemandModel('PDD')}
              title="Pressure-Dependent Demand (Wagner equation) - accurate during low-pressure failures"
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                demandModel === 'PDD'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PDD (Wagner)
            </button>
            <button
              onClick={() => onChangeDemandModel('DDA')}
              title="Demand-Driven Analysis (fixed demands regardless of pressure)"
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                demandModel === 'DDA'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DDA (EPANET)
            </button>
          </div>

          {/* Quick Settings for Required Pressure */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Hydraulic Constraints"
              className={`p-2 rounded-lg border transition ${
                showSettings
                  ? 'bg-slate-800 border-cyan-500 text-cyan-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {showSettings && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 text-xs space-y-3">
                <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex justify-between">
                  <span>Hydraulic Constraints</span>
                  <span className="text-[10px] text-cyan-400 font-mono">PDD Options</span>
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Required Pressure (Preq):</span>
                    <strong className="text-cyan-300 font-mono">{requiredPressure} m</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={requiredPressure}
                    onChange={(e) => onChangeRequiredPressure(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {requiredPressure} m &asymp; {(requiredPressure * 1.422).toFixed(1)} psi
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Docs / About Modal Button */}
          <button
            onClick={() => setShowDocs(true)}
            title="WNTR Theory & Resilience Guide"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Docs / Theory Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  WNTR Resilience Modeling & Science Background
                </h3>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                &times;
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <h4 className="font-bold text-cyan-300 text-sm mb-1">
                  What is WNTR?
                </h4>
                <p>
                  The <strong>Water Network Tool for Resilience (WNTR)</strong> is an open-source Python framework developed jointly by the <strong>United States Environmental Protection Agency (EPA)</strong> and <strong>Sandia National Laboratories</strong>. WNTR integrates EPANET hydraulic modeling with disaster scenario simulation, disaster response actions, and resilience metrics.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 mb-1">Key Resilience Metrics</h4>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong>Water Service Availability (WSA):</strong> The fraction of customer demand that can actually be delivered at the required pressure during normal and disaster conditions.
                  </li>
                  <li>
                    <strong>Pressure-Dependent Demand (PDD):</strong> Uses Wagner&apos;s relationship to realistically throttle water withdrawal at consumer taps when pressure drops below 20 psi (14m).
                  </li>
                  <li>
                    <strong>Todini Resilience Index (Ir):</strong> Quantifies the capability of a pipe network to overcome unexpected stress (pipe breaks, outages) through surplus hydraulic power.
                  </li>
                  <li>
                    <strong>Seismic Fragility (ALA):</strong> Computes pipeline repair and break rates based on Peak Ground Acceleration (PGA) using empirical American Lifelines Alliance fragility distributions.
                  </li>
                  <li>
                    <strong>N-1 Criticality Analysis:</strong> Automatically isolates links one-by-one to identify the most vulnerable single points of failure in municipal infrastructure.
                  </li>
                </ul>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-end">
                <button
                  onClick={() => setShowDocs(false)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
