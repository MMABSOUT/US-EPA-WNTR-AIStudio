import React from 'react';
import {
  WaterNetworkModel,
  TimeStepResult,
  DisasterScenario,
} from '../types/network';
import {
  X,
  Droplet,
  Flame,
  Activity,
  Layers,
  Zap,
  Gauge,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

interface ElementInspectorProps {
  selectedElement: { type: 'node' | 'link'; id: string } | null;
  onClose: () => void;
  model: WaterNetworkModel;
  currentStepData: TimeStepResult;
  onUpdateScenario: (scenario: DisasterScenario) => void;
  scenario: DisasterScenario;
}

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  selectedElement,
  onClose,
  model,
  currentStepData,
  onUpdateScenario,
  scenario,
}) => {
  if (!selectedElement) return null;

  const isNode = selectedElement.type === 'node';
  const node = isNode ? model.nodes[selectedElement.id] : null;
  const link = !isNode ? model.links[selectedElement.id] : null;

  const nodeRes = isNode && selectedElement ? currentStepData.nodes[selectedElement.id] : null;
  const linkRes = !isNode && selectedElement ? currentStepData.links[selectedElement.id] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
            {isNode ? <Gauge className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              {isNode ? `${node?.type} ${node?.id}` : `${link?.type} ${link?.id}`}
            </h3>
            <span className="text-[10px] text-slate-400">Element Properties & State</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node Details */}
      {isNode && node && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-400 text-[11px] block">Coordinates</span>
              <span className="font-mono text-slate-200">
                ({node.x.toFixed(1)}, {node.y.toFixed(1)})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Elevation</span>
              <span className="font-mono text-slate-200">
                {node.type === 'Reservoir' ? 'Source Head' : `${node.elevation.toFixed(1)} m`}
              </span>
            </div>

            {node.type === 'Junction' && (
              <>
                <div>
                  <span className="text-slate-400 text-[11px] block">Base Demand</span>
                  <span className="font-mono text-cyan-300">
                    {(node.baseDemand * 1000).toFixed(2)} L/s
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Pattern</span>
                  <span className="font-mono text-slate-200">{node.patternName || '1'}</span>
                </div>
              </>
            )}

            {node.type === 'Tank' && (
              <>
                <div>
                  <span className="text-slate-400 text-[11px] block">Diameter</span>
                  <span className="font-mono text-slate-200">{node.diameter} m</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Level Range</span>
                  <span className="font-mono text-slate-200">
                    {node.minLevel}m - {node.maxLevel}m
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Dynamic State */}
          {nodeRes && (
            <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
                Simulated Operational State
              </span>
              <div className="flex justify-between text-slate-300">
                <span>Pressure:</span>
                <span
                  className={`font-mono font-bold ${
                    nodeRes.pressure < model.options.requiredPressure
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {nodeRes.pressure.toFixed(2)} m
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Hydraulic Head:</span>
                <span className="font-mono text-slate-200">{nodeRes.head.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Actual Demand:</span>
                <span className="font-mono text-cyan-300">
                  {(nodeRes.demand * 1000).toFixed(2)} L/s
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Water Quality (Chlorine):</span>
                <span className="font-mono text-indigo-300">{nodeRes.quality.toFixed(2)} mg/L</span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {node.type === 'Junction' && (
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() =>
                  onUpdateScenario({
                    id: 'fire_flow',
                    type: 'fire_flow',
                    name: `Fire Flow at Junction ${node.id}`,
                    description: `Emergency 2500 GPM firefighting discharge at node ${node.id}`,
                    params: {
                      nodeId: node.id,
                      fireFlowGPM: 2500,
                      startTimeHour: 10,
                      durationHours: 4,
                    },
                  })
                }
                className="w-full py-1.5 px-3 rounded-lg bg-orange-950/60 hover:bg-orange-900 border border-orange-800/80 text-orange-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Flame className="w-3.5 h-3.5" /> Inject Fire Flow Demand
              </button>

              <button
                onClick={() =>
                  onUpdateScenario({
                    id: 'contamination',
                    type: 'contamination',
                    name: `Chemical Spill at J-${node.id}`,
                    description: `Inject toxic backflow plume at junction ${node.id}`,
                    params: {
                      contaminantNodeId: node.id,
                      contaminantConcentration: 12.0,
                      startTimeHour: 2,
                      durationHours: 16,
                    },
                  })
                }
                className="w-full py-1.5 px-3 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-800/80 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Inject Contaminant Plume
              </button>
            </div>
          )}
        </div>
      )}

      {/* Link Details */}
      {!isNode && link && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-400 text-[11px] block">Topology</span>
              <span className="font-mono text-slate-200">
                {link.startNode} &rarr; {link.endNode}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Status</span>
              <span
                className={`font-mono font-bold ${
                  linkRes?.status === 'Open'
                    ? 'text-emerald-400'
                    : linkRes?.status === 'Leaking'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {linkRes?.status || link.status}
              </span>
            </div>

            {link.type === 'Pipe' && (
              <>
                <div>
                  <span className="text-slate-400 text-[11px] block">Length</span>
                  <span className="font-mono text-slate-200">{link.length.toFixed(1)} m</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Diameter</span>
                  <span className="font-mono text-slate-200">
                    {(link.diameter * 1000).toFixed(0)} mm ({(link.diameter / 0.0254).toFixed(0)} in)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Roughness (C)</span>
                  <span className="font-mono text-slate-200">{link.roughness}</span>
                </div>
              </>
            )}

            {link.type === 'Pump' && (
              <>
                <div>
                  <span className="text-slate-400 text-[11px] block">Shutoff Head</span>
                  <span className="font-mono text-cyan-300">{link.headCurve?.h0} m</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Efficiency</span>
                  <span className="font-mono text-slate-200">{link.efficiency}%</span>
                </div>
              </>
            )}
          </div>

          {/* Dynamic State */}
          {linkRes && (
            <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
                Simulated Flow Hydraulics
              </span>
              <div className="flex justify-between text-slate-300">
                <span>Flow Rate:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {(linkRes.flow * 1000).toFixed(2)} L/s
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Flow Velocity:</span>
                <span className="font-mono text-slate-200">{linkRes.velocity.toFixed(2)} m/s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Head Loss:</span>
                <span className="font-mono text-slate-200">{linkRes.headloss.toFixed(2)} m</span>
              </div>
              {link.type === 'Pump' && (
                <div className="flex justify-between text-slate-300">
                  <span>Power Consumption:</span>
                  <span className="font-mono text-amber-300">
                    {linkRes.energyKW.toFixed(2)} kW
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {link.type === 'Pipe' && (
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() =>
                  onUpdateScenario({
                    id: 'pipe_break',
                    type: 'pipe_break',
                    name: `Pipe Break on Link ${link.id}`,
                    description: `Active leak burst on pipe ${link.id}`,
                    params: {
                      pipeId: link.id,
                      leakAreaMm2: 4000,
                      startTimeHour: 4,
                      durationHours: 12,
                    },
                  })
                }
                className="w-full py-1.5 px-3 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Droplet className="w-3.5 h-3.5" /> Induce Leak Rupture on Pipe
              </button>

              <button
                onClick={() => {
                  const newModel = JSON.parse(JSON.stringify(model));
                  newModel.links[link.id].status =
                    link.status === 'Closed' ? 'Open' : 'Closed';
                  // trigger simulation via scenario
                  onUpdateScenario({
                    id: 'pipe_isolation',
                    type: 'pipe_break',
                    name: `Isolation of Pipe ${link.id}`,
                    description: `Manual valve isolation of pipe ${link.id}`,
                    params: { pipeId: link.id, leakAreaMm2: 0, startTimeHour: 0, durationHours: 24 },
                  });
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Layers className="w-3.5 h-3.5" /> Toggle Valve Isolation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
