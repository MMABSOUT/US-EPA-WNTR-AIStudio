import React from 'react';
import { DisasterScenario, WaterNetworkModel, PipeLink, JunctionNode } from '../types/network';
import {
  AlertTriangle,
  Flame,
  Activity,
  ZapOff,
  Skull,
  Shield,
  Layers,
  BarChart2,
} from 'lucide-react';

interface ScenarioManagerProps {
  model: WaterNetworkModel;
  scenario: DisasterScenario;
  onUpdateScenario: (newScenario: DisasterScenario) => void;
  onRunCriticality: () => void;
  activeTab: 'scenarios' | 'criticality';
  onSelectTab: (tab: 'scenarios' | 'criticality') => void;
}

export const ScenarioManager: React.FC<ScenarioManagerProps> = ({
  model,
  scenario,
  onUpdateScenario,
  onRunCriticality,
  activeTab,
  onSelectTab,
}) => {
  const pipeIds = Object.keys(model.links).filter((id) => model.links[id].type === 'Pipe');
  const junctionIds = Object.keys(model.nodes).filter((id) => model.nodes[id].type === 'Junction');

  const scenarioTypes = [
    {
      id: 'none',
      name: 'Nominal Baseline',
      icon: Shield,
      desc: 'Normal unperturbed 24-hr diurnal demand operation',
      color: 'text-emerald-400',
    },
    {
      id: 'pipe_break',
      name: 'Pipe Break / Leak',
      icon: AlertTriangle,
      desc: 'Rupture or fissure on a critical distribution main',
      color: 'text-amber-400',
    },
    {
      id: 'fire_flow',
      name: 'Fire Flow Demand',
      icon: Flame,
      desc: 'Emergency high-rate hydrant demand (NFPA 20-psi rule)',
      color: 'text-orange-400',
    },
    {
      id: 'earthquake',
      name: 'Seismic / Earthquake',
      icon: Activity,
      desc: 'Ground motion PGA fragility curves and pipeline breaks',
      color: 'text-rose-400',
    },
    {
      id: 'power_outage',
      name: 'Pump Power Outage',
      icon: ZapOff,
      desc: 'Electric grid failure tripping all high-lift pumps',
      color: 'text-yellow-400',
    },
    {
      id: 'contamination',
      name: 'Contaminant Intrusion',
      icon: Skull,
      desc: 'Chemical backflow or toxic injection into drinking water',
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Tab Switcher: Scenarios vs Criticality Sweep */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('scenarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'scenarios'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Disaster & Hazard Scenarios
          </button>
          <button
            onClick={() => {
              onSelectTab('criticality');
              onRunCriticality();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'criticality'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Pipe Criticality Scan
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Current: <strong className="text-slate-200">{scenario.name}</strong>
        </span>
      </div>

      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          {/* Scenario Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {scenarioTypes.map((sc) => {
              const Icon = sc.icon;
              const isSelected = scenario.type === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    let defaultParams: any = {};
                    if (sc.id === 'pipe_break') {
                      defaultParams = {
                        pipeId: pipeIds[0] || '10',
                        leakAreaMm2: 3000,
                        startTimeHour: 4,
                        durationHours: 12,
                      };
                    } else if (sc.id === 'fire_flow') {
                      defaultParams = {
                        nodeId: junctionIds[junctionIds.length - 1] || '13',
                        fireFlowGPM: 2500,
                        startTimeHour: 10,
                        durationHours: 4,
                      };
                    } else if (sc.id === 'earthquake') {
                      defaultParams = { pgaG: 0.35 };
                    } else if (sc.id === 'power_outage') {
                      defaultParams = { outageStartHour: 6, outageDurationHours: 10 };
                    } else if (sc.id === 'contamination') {
                      defaultParams = {
                        contaminantNodeId: junctionIds[0] || '10',
                        contaminantConcentration: 10.0,
                        startTimeHour: 2,
                        durationHours: 16,
                      };
                    }

                    onUpdateScenario({
                      id: sc.id,
                      type: sc.id as any,
                      name: sc.name,
                      description: sc.desc,
                      params: defaultParams,
                    });
                  }}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <Icon className={`w-4 h-4 ${sc.color}`} />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 line-clamp-1">{sc.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{sc.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Scenario Specific Parameter Adjusters */}
          {scenario.type === 'pipe_break' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Pipe:</label>
                <select
                  value={scenario.params.pipeId || pipeIds[0]}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, pipeId: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {pipeIds.map((p) => {
                    const l = model.links[p];
                    const diam = l?.type === 'Pipe' ? (l as PipeLink).diameter : 0.3;
                    return (
                      <option key={p} value={p}>
                        Pipe {p} ({(diam * 1000).toFixed(0)}mm)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Leak Hole Area: <strong>{scenario.params.leakAreaMm2 || 3000} mm²</strong>
                </label>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={500}
                  value={scenario.params.leakAreaMm2 || 3000}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, leakAreaMm2: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Start Hour: <strong>{scenario.params.startTimeHour ?? 4}:00</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={scenario.params.startTimeHour ?? 4}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, startTimeHour: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Duration: <strong>{scenario.params.durationHours ?? 12} hrs</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={scenario.params.durationHours ?? 12}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, durationHours: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {scenario.type === 'fire_flow' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Fire Hydrant Junction:</label>
                <select
                  value={scenario.params.nodeId || junctionIds[0]}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, nodeId: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {junctionIds.map((j) => {
                    const n = model.nodes[j];
                    const baseDem = n?.type === 'Junction' ? (n as JunctionNode).baseDemand : 0;
                    return (
                      <option key={j} value={j}>
                        Junction {j} (Base: {(baseDem * 1000).toFixed(1)} L/s)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Fire Demand: <strong>{scenario.params.fireFlowGPM || 2500} GPM</strong> (
                  {((scenario.params.fireFlowGPM || 2500) * 0.06309).toFixed(1)} L/s)
                </label>
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={250}
                  value={scenario.params.fireFlowGPM || 2500}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, fireFlowGPM: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Ignition Time: <strong>{scenario.params.startTimeHour ?? 10}:00</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={scenario.params.startTimeHour ?? 10}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, startTimeHour: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Fire Fighting Duration: <strong>{scenario.params.durationHours ?? 4} hrs</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={scenario.params.durationHours ?? 4}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, durationHours: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {scenario.type === 'earthquake' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400">Peak Ground Acceleration (PGA):</span>
                  <span className="font-mono text-rose-400 font-bold">
                    {(scenario.params.pgaG || 0.35).toFixed(2)} g (
                    {(scenario.params.pgaG || 0.35) > 0.4 ? 'Severe Shaking' : 'Moderate Shaking'})
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={scenario.params.pgaG || 0.35}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, pgaG: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div className="text-slate-400 flex flex-col justify-center">
                <span className="text-[11px] text-slate-300">
                  American Lifelines Alliance (ALA) pipe repair rate:
                </span>
                <span className="font-mono text-cyan-300 text-xs mt-0.5">
                  R = 0.00187 &times; (PGA &times; 980)<sup>1.2</sup> repairs / km
                </span>
              </div>
            </div>
          )}

          {scenario.type === 'power_outage' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Outage Start Time: <strong>{scenario.params.outageStartHour ?? 6}:00</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={scenario.params.outageStartHour ?? 6}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, outageStartHour: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-yellow-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Outage Duration: <strong>{scenario.params.outageDurationHours ?? 10} hrs</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={scenario.params.outageDurationHours ?? 10}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, outageDurationHours: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-yellow-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {scenario.type === 'contamination' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Injection Junction:</label>
                <select
                  value={scenario.params.contaminantNodeId || junctionIds[0]}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, contaminantNodeId: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {junctionIds.map((j) => (
                    <option key={j} value={j}>
                      Junction {j}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Contaminant Concentration:{' '}
                  <strong>{scenario.params.contaminantConcentration || 10} mg/L</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={scenario.params.contaminantConcentration || 10}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: {
                        ...scenario.params,
                        contaminantConcentration: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Injection Duration:{' '}
                  <strong>{scenario.params.durationHours || 16} hrs</strong>
                </label>
                <input
                  type="range"
                  min={2}
                  max={24}
                  value={scenario.params.durationHours || 16}
                  onChange={(e) =>
                    onUpdateScenario({
                      ...scenario,
                      params: { ...scenario.params, durationHours: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
