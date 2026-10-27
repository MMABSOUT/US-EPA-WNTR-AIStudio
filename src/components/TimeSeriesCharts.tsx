import React, { useState } from 'react';
import { SimulationResults, TimeStepResult, WaterNetworkModel } from '../types/network';
import { TrendingUp, Activity, Droplets, Database, Clock } from 'lucide-react';

interface TimeSeriesChartsProps {
  results: SimulationResults;
  baselineResults: SimulationResults | null;
  currentStepIndex: number;
  model: WaterNetworkModel;
  selectedNodeId?: string;
  onSelectNodeId: (nodeId: string) => void;
}

type ChartMetric = 'wsa' | 'pressure' | 'demand' | 'tank_level' | 'chlorine';

export const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({
  results,
  baselineResults,
  currentStepIndex,
  model,
  selectedNodeId,
  onSelectNodeId,
}) => {
  const [metric, setMetric] = useState<ChartMetric>('wsa');

  const timesteps = results.timesteps;
  const numSteps = timesteps.length;
  const hours = timesteps.map((t) => t.time / 3600);

  const junctionIds = Object.keys(model.nodes).filter((id) => model.nodes[id].type === 'Junction');
  const tankIds = Object.keys(model.nodes).filter((id) => model.nodes[id].type === 'Tank');
  const activeNodeId = selectedNodeId || junctionIds[0] || '11';

  // Compute series data based on chosen metric
  let seriesTitle = '';
  let yUnit = '';
  let yMin = 0;
  let yMax = 100;
  let scenarioValues: number[] = [];
  let baselineValues: number[] = [];
  let referenceLineY: number | null = null;
  let referenceLineLabel = '';

  if (metric === 'wsa') {
    seriesTitle = 'Water Service Availability (WSA)';
    yUnit = '%';
    yMin = 0;
    yMax = 105;
    scenarioValues = timesteps.map((t) => t.wsa);
    if (baselineResults) {
      baselineValues = baselineResults.timesteps.map((t) => t.wsa);
    }
    referenceLineY = 90;
    referenceLineLabel = 'Resilience Target (90%)';
  } else if (metric === 'pressure') {
    seriesTitle = `Junction ${activeNodeId} Pressure`;
    yUnit = 'm';
    scenarioValues = timesteps.map((t) => t.nodes[activeNodeId]?.pressure ?? 0);
    if (baselineResults) {
      baselineValues = baselineResults.timesteps.map((t) => t.nodes[activeNodeId]?.pressure ?? 0);
    }
    const maxP = Math.max(...scenarioValues, ...(baselineValues.length ? baselineValues : [30]), 30);
    yMin = Math.min(0, ...scenarioValues);
    yMax = Math.ceil(maxP * 1.15);
    referenceLineY = model.options.requiredPressure;
    referenceLineLabel = `Required Minimum (${model.options.requiredPressure}m)`;
  } else if (metric === 'demand') {
    seriesTitle = 'System Water Demand (Requested vs Delivered)';
    yUnit = 'L/s';
    scenarioValues = timesteps.map((t) => t.systemDemandDelivered * 1000);
    baselineValues = timesteps.map((t) => t.systemDemandRequested * 1000);
    const maxD = Math.max(...scenarioValues, ...baselineValues, 20);
    yMin = 0;
    yMax = Math.ceil(maxD * 1.2);
  } else if (metric === 'tank_level') {
    const targetTank = tankIds[0] || '2';
    seriesTitle = `Tank ${targetTank} Water Elevation`;
    yUnit = 'm';
    scenarioValues = timesteps.map((t) => t.nodes[targetTank]?.head ?? 260);
    if (baselineResults) {
      baselineValues = baselineResults.timesteps.map((t) => t.nodes[targetTank]?.head ?? 260);
    }
    const minL = Math.min(...scenarioValues, ...(baselineValues.length ? baselineValues : [250]));
    const maxL = Math.max(...scenarioValues, ...(baselineValues.length ? baselineValues : [270]));
    yMin = Math.floor(minL - 2);
    yMax = Math.ceil(maxL + 2);
  } else if (metric === 'chlorine') {
    seriesTitle = `Junction ${activeNodeId} Chlorine Residual`;
    yUnit = 'mg/L';
    scenarioValues = timesteps.map((t) => t.nodes[activeNodeId]?.quality ?? 0);
    if (baselineResults) {
      baselineValues = baselineResults.timesteps.map((t) => t.nodes[activeNodeId]?.quality ?? 0);
    }
    yMin = 0;
    yMax = Math.max(1.5, ...scenarioValues) * 1.15;
    referenceLineY = 0.2;
    referenceLineLabel = 'EPA Minimum (0.2 mg/L)';
  }

  // Chart dimensions in SVG coordinates
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (idx: number) => padLeft + (idx / (numSteps - 1 || 1)) * plotWidth;
  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const ratio = (clamped - yMin) / (yMax - yMin || 1);
    return padTop + plotHeight - ratio * plotHeight;
  };

  // Generate SVG path strings
  const generatePath = (vals: number[]) => {
    if (!vals || vals.length === 0) return '';
    return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' ');
  };

  const currentScenVal = scenarioValues[currentStepIndex] ?? 0;
  const currentBaseVal = baselineValues[currentStepIndex] ?? 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col space-y-3">
      {/* Top Header: Metric buttons & selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200">Extended Period Dynamics</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {[
            { id: 'wsa', label: 'WSA Index' },
            { id: 'pressure', label: 'Junction Pressure' },
            { id: 'demand', label: 'Flow Demand' },
            { id: 'tank_level', label: 'Tank Storage' },
            { id: 'chlorine', label: 'Chlorine Residual' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id as ChartMetric)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                metric === m.id
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Junction selector for pressure / chlorine */}
        {(metric === 'pressure' || metric === 'chlorine') && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Node:</span>
            <select
              value={activeNodeId}
              onChange={(e) => onSelectNodeId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              {junctionIds.map((j) => (
                <option key={j} value={j}>
                  Junction {j}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SVG Time Series Plot */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none font-sans"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const val = yMin + pct * (yMax - yMin);
            const y = getY(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="2,2"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  className="font-mono"
                >
                  {val.toFixed(metric === 'chlorine' ? 2 : 0)}
                  {yUnit}
                </text>
              </g>
            );
          })}

          {/* Time axis ticks (every 4 hours) */}
          {hours.map((h, i) => {
            if (h % 4 !== 0 && i !== numSteps - 1) return null;
            const x = getX(i);
            return (
              <g key={i}>
                <line x1={x} y1={padTop + plotHeight} x2={x} y2={padTop + plotHeight + 4} stroke="#475569" />
                <text
                  x={x}
                  y={padTop + plotHeight + 16}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  className="font-mono"
                >
                  {h}h
                </text>
              </g>
            );
          })}

          {/* Reference Line (e.g. required pressure or EPA safe limit) */}
          {referenceLineY !== null && referenceLineY >= yMin && referenceLineY <= yMax && (
            <g>
              <line
                x1={padLeft}
                y1={getY(referenceLineY)}
                x2={svgWidth - padRight}
                y2={getY(referenceLineY)}
                stroke="#f43f5e"
                strokeWidth="1.2"
                strokeDasharray="4,3"
              />
              <text
                x={svgWidth - padRight - 5}
                y={getY(referenceLineY) - 4}
                textAnchor="end"
                fill="#f43f5e"
                fontSize="8.5"
                fontWeight="bold"
              >
                {referenceLineLabel}
              </text>
            </g>
          )}

          {/* Baseline Curve (Dashed Sky Blue) */}
          {baselineValues.length > 0 && (
            <path
              d={generatePath(baselineValues)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.8"
              strokeDasharray="4,3"
              opacity="0.8"
            />
          )}

          {/* Scenario Curve (Solid Cyan / Amber / Rose depending on metric) */}
          <path
            d={generatePath(scenarioValues)}
            fill="none"
            stroke={metric === 'wsa' ? '#10b981' : metric === 'chlorine' ? '#a855f7' : '#06b6d4'}
            strokeWidth="2.4"
          />

          {/* Vertical Playhead Cursor Line for currentStepIndex */}
          <line
            x1={getX(currentStepIndex)}
            y1={padTop}
            x2={getX(currentStepIndex)}
            y2={padTop + plotHeight}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3,2"
          />

          {/* Current Step Dot */}
          <circle
            cx={getX(currentStepIndex)}
            cy={getY(currentScenVal)}
            r="4"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Chart Legend & Instant Stats */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-3 h-1 rounded ${
                metric === 'wsa' ? 'bg-emerald-500' : metric === 'chlorine' ? 'bg-purple-500' : 'bg-cyan-500'
              }`}
            />
            <strong className="text-slate-200">Current Scenario:</strong>
            <span className="font-mono text-cyan-300 font-bold">
              {currentScenVal.toFixed(2)} {yUnit}
            </span>
          </span>

          {baselineValues.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-sky-400" />
              <strong className="text-slate-400">Baseline:</strong>
              <span className="font-mono text-sky-300">
                {currentBaseVal.toFixed(2)} {yUnit}
              </span>
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>At time: <strong>{hours[currentStepIndex]} hrs</strong></span>
        </div>
      </div>
    </div>
  );
};
