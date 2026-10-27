import React from 'react';
import { TimeStepResult, SimulationResults } from '../types/network';
import { ShieldCheck, AlertTriangle, Droplet, Activity, Database, Flame } from 'lucide-react';

interface ResilienceOverviewProps {
  currentStepData: TimeStepResult;
  summary: SimulationResults['summary'];
  requiredPressure: number;
}

export const ResilienceOverview: React.FC<ResilienceOverviewProps> = ({
  currentStepData,
  summary,
  requiredPressure,
}) => {
  const wsa = currentStepData.wsa;
  const wsaColor =
    wsa >= 95 ? 'text-emerald-400' : wsa >= 80 ? 'text-amber-400' : 'text-red-400';
  const wsaBarBg =
    wsa >= 95 ? 'bg-emerald-500' : wsa >= 80 ? 'bg-amber-500' : 'bg-red-500';

  const popImpacted = currentStepData.populationImpacted;
  const popColor = popImpacted === 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Water Service Availability (WSA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="font-medium">Water Service (WSA)</span>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono ${wsaColor}`}>
              {wsa.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-400">
              (Avg: {summary.averageWSA.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${wsaBarBg} transition-all duration-300`}
              style={{ width: `${Math.min(100, Math.max(0, wsa))}%` }}
            />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex justify-between">
          <span>Min: {summary.minWSA.toFixed(1)}%</span>
          <span>{currentStepData.systemDemandDelivered > 0 ? (currentStepData.systemDemandDelivered * 1000).toFixed(1) : 0} L/s delivered</span>
        </div>
      </div>

      {/* 2. Todini Resilience Index */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="font-medium">Todini Index (Ir)</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {currentStepData.todiniIndex.toFixed(3)}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, currentStepData.todiniIndex * 100)}%` }}
            />
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Hydraulic Power Surplus (0.0 to 1.0)
        </div>
      </div>

      {/* 3. Under-Pressure Nodes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="font-medium">Pressure Deficits</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono ${popColor}`}>
              {popImpacted}
            </span>
            <span className="text-[11px] text-slate-400">nodes &lt; {requiredPressure}m</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 truncate">
            {summary.criticalDeficitNodes.length > 0 ? (
              <span>Vulnerable: J-{summary.criticalDeficitNodes.join(', J-')}</span>
            ) : (
              <span className="text-emerald-400">All nodes compliant</span>
            )}
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Max impacted in run: {summary.maxPopulationImpacted}
        </div>
      </div>

      {/* 4. Tank Storage Autonomy */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="font-medium">Tank Reserve</span>
          <Database className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {currentStepData.tankAutonomyPercent.toFixed(0)}%
            </span>
            <span className="text-[11px] text-slate-400">effective volume</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, currentStepData.tankAutonomyPercent))}%` }}
            />
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Gravity buffer during power cuts
        </div>
      </div>

      {/* 5. Leakage & Water Lost */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow flex flex-col justify-between col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="font-medium">Leakage Rate</span>
          <Droplet className="w-4 h-4 text-sky-400" />
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {(currentStepData.systemLeakage * 1000).toFixed(1)}
            </span>
            <span className="text-[11px] text-slate-400">L/s</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Total lost: {summary.totalWaterLostM3.toLocaleString()} m³
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Supplied: {summary.totalWaterSuppliedM3.toLocaleString()} m³
        </div>
      </div>
    </div>
  );
};
