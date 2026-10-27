import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  WaterNetworkModel,
  SimulationResults,
  DisasterScenario,
  PipeCriticalityItem,
  DemandModelType,
} from './types/network';
import { NET1_MODEL } from './models/builtinNetworks';
import { runSimulation, runCriticalityAnalysis } from './engine/hydraulicSolver';
import { Navbar } from './components/Navbar';
import { ResilienceOverview } from './components/ResilienceOverview';
import { NetworkCanvas } from './components/NetworkCanvas';
import { TimeController } from './components/TimeController';
import { ScenarioManager } from './components/ScenarioManager';
import { CriticalityTable } from './components/CriticalityTable';
import { ElementInspector } from './components/ElementInspector';
import { TimeSeriesCharts } from './components/TimeSeriesCharts';
import { InpManagerModal } from './components/InpManagerModal';
import { Activity, Droplet, Flame, AlertTriangle, ShieldCheck, Database, Layers } from 'lucide-react';

export default function App() {
  const [model, setModel] = useState<WaterNetworkModel>(NET1_MODEL);
  const [scenario, setScenario] = useState<DisasterScenario>({
    id: 'none',
    type: 'none',
    name: 'Nominal Baseline',
    description: 'Normal unperturbed 24-hr diurnal demand operation',
    params: {},
  });
  const [activeScenarioTab, setActiveScenarioTab] = useState<'scenarios' | 'criticality'>('scenarios');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(12); // start at noon (peak demand)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<{ type: 'node' | 'link'; id: string } | null>(null);
  const [colorLayer, setColorLayer] = useState<'pressure' | 'head' | 'demand' | 'quality' | 'flow' | 'damage'>('pressure');
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [criticalityList, setCriticalityList] = useState<PipeCriticalityItem[]>([]);

  // Simulation execution: Baseline
  const baselineResults = useMemo(() => {
    return runSimulation(model, {
      id: 'none',
      type: 'none',
      name: 'Baseline',
      description: 'Nominal operation',
      params: {},
    });
  }, [model]);

  // Simulation execution: Current active scenario
  const simulationResults: SimulationResults = useMemo(() => {
    return runSimulation(model, scenario);
  }, [model, scenario]);

  // Handle pipe criticality calculation
  const handleRunCriticality = useCallback(() => {
    const list = runCriticalityAnalysis(model);
    setCriticalityList(list);
  }, [model]);

  // Auto-run criticality if tab is opened
  useEffect(() => {
    if (activeScenarioTab === 'criticality' && criticalityList.length === 0) {
      handleRunCriticality();
    }
  }, [activeScenarioTab, criticalityList.length, handleRunCriticality]);

  // Solver Demand Model toggle
  const handleChangeDemandModel = (demandModel: DemandModelType) => {
    setModel((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        demandModel,
      },
    }));
  };

  // Required pressure setting
  const handleChangeRequiredPressure = (requiredPressure: number) => {
    setModel((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        requiredPressure,
      },
    }));
  };

  const currentStepData = simulationResults.timesteps[currentStepIndex] || simulationResults.timesteps[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar
        currentModel={model}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        demandModel={model.options.demandModel}
        onChangeDemandModel={handleChangeDemandModel}
        requiredPressure={model.options.requiredPressure}
        onChangeRequiredPressure={handleChangeRequiredPressure}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Resilience Overview KPIs */}
        <ResilienceOverview
          currentStepData={currentStepData}
          summary={simulationResults.summary}
          requiredPressure={model.options.requiredPressure}
        />

        {/* Network Schematic Map & Inspector Split */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 flex flex-col space-y-3">
            {/* Network Canvas */}
            <div className="h-[460px] sm:h-[520px] w-full">
              <NetworkCanvas
                model={model}
                currentStepData={currentStepData}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                scenario={scenario}
                colorLayer={colorLayer}
                onChangeColorLayer={setColorLayer}
              />
            </div>

            {/* Playback Time Controller */}
            <TimeController
              currentStepIndex={currentStepIndex}
              totalSteps={simulationResults.timesteps.length}
              currentStepData={currentStepData}
              onStepChange={setCurrentStepIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              timestepSeconds={model.options.hydraulicTimestep}
            />
          </div>

          {/* Right Column: Element Inspector or Scenario Quick Status */}
          <div className="flex flex-col space-y-3">
            {selectedElement ? (
              <ElementInspector
                selectedElement={selectedElement}
                onClose={() => setSelectedElement(null)}
                model={model}
                currentStepData={currentStepData}
                onUpdateScenario={setScenario}
                scenario={scenario}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-slate-100">Network Summary</h3>
                </div>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Network Model:</span>
                    <span className="font-semibold text-slate-200">{model.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Junctions:</span>
                    <span className="font-mono text-cyan-300">
                      {Object.values(model.nodes).filter((n) => n.type === 'Junction').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Storage Tanks:</span>
                    <span className="font-mono text-cyan-300">
                      {Object.values(model.nodes).filter((n) => n.type === 'Tank').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Water Reservoirs:</span>
                    <span className="font-mono text-cyan-300">
                      {Object.values(model.nodes).filter((n) => n.type === 'Reservoir').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pipes & Pumps:</span>
                    <span className="font-mono text-cyan-300">
                      {Object.keys(model.links).length} links
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Simulation Length:</span>
                    <span className="font-mono text-slate-300">
                      {model.options.duration / 3600} hours
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Interactive Inspection
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Click any node or pipeline on the schematic map to inspect hydraulic pressures, flow velocities, or induce localized failure leaks.
                  </p>
                </div>
              </div>
            )}

            {/* Active Stress Condition Alert Card */}
            <div
              className={`border rounded-xl p-3 text-xs shadow-md ${
                scenario.type === 'none'
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-amber-950/40 border-amber-800/70 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {scenario.type === 'none' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">System Operating Nominally</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Disaster Active: {scenario.name}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {scenario.description}
              </p>
              {scenario.type !== 'none' && (
                <button
                  onClick={() =>
                    setScenario({
                      id: 'none',
                      type: 'none',
                      name: 'Nominal Baseline',
                      description: 'Normal unperturbed 24-hr diurnal demand operation',
                      params: {},
                    })
                  }
                  className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium block"
                >
                  &larr; Reset to Nominal Baseline
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Disaster Scenarios or Pipe Criticality Scan */}
        <div className="space-y-4">
          <ScenarioManager
            model={model}
            scenario={scenario}
            onUpdateScenario={setScenario}
            onRunCriticality={handleRunCriticality}
            activeTab={activeScenarioTab}
            onSelectTab={setActiveScenarioTab}
          />

          {activeScenarioTab === 'criticality' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <CriticalityTable
                criticalityList={criticalityList}
                selectedPipeId={selectedElement?.type === 'link' ? selectedElement.id : undefined}
                onSelectPipe={(pipeId) => setSelectedElement({ type: 'link', id: pipeId })}
                onSimulatePipeOutage={(pipeId) => {
                  setScenario({
                    id: 'pipe_outage',
                    type: 'pipe_break',
                    name: `Criticality Outage on Pipe ${pipeId}`,
                    description: `Testing isolation of single most critical pipe ${pipeId}`,
                    params: { pipeId, leakAreaMm2: 0, startTimeHour: 0, durationHours: 24 },
                  });
                  setSelectedElement({ type: 'link', id: pipeId });
                }}
              />
            </div>
          )}
        </div>

        {/* Time-Series Dynamics Section */}
        <TimeSeriesCharts
          results={simulationResults}
          baselineResults={scenario.type !== 'none' ? baselineResults : null}
          currentStepIndex={currentStepIndex}
          model={model}
          selectedNodeId={selectedElement?.type === 'node' ? selectedElement.id : undefined}
          onSelectNodeId={(nodeId) => setSelectedElement({ type: 'node', id: nodeId })}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
        <p>
          Water Network Tool for Resilience (WNTR) &bull; U.S. Environmental Protection Agency (EPA) &amp; Sandia National Laboratories
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Based on Klise, Murray, Haxton et al. &bull; EPANET-compatible Hazen-Williams, PDD Wagner Demand, and ALA Seismic Fragility modeling
        </p>
      </footer>

      {/* Model Selector / INP Import Modal */}
      <InpManagerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        currentModel={model}
        onLoadModel={(newModel) => {
          setModel(newModel);
          setSelectedElement(null);
          setCurrentStepIndex(12);
        }}
        simulationResults={simulationResults}
      />
    </div>
  );
}
