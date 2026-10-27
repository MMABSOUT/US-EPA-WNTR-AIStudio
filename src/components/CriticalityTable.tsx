import React from 'react';
import { PipeCriticalityItem } from '../types/network';
import { Download, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface CriticalityTableProps {
  criticalityList: PipeCriticalityItem[];
  onSelectPipe: (pipeId: string) => void;
  selectedPipeId?: string;
  onSimulatePipeOutage: (pipeId: string) => void;
}

export const CriticalityTable: React.FC<CriticalityTableProps> = ({
  criticalityList,
  onSelectPipe,
  selectedPipeId,
  onSimulatePipeOutage,
}) => {
  const exportCsv = () => {
    const headers = 'Rank,Pipe ID,Diameter (mm),Length (m),WSA Drop (%),Nodes Under Pressure,Demand Deficit (m3)\n';
    const rows = criticalityList
      .map(
        (c) =>
          `${c.criticalityRank},${c.pipeId},${c.diameterMm},${c.lengthM},${c.wsaDropPercent},${c.nodesUnderPressure},${c.demandDeficitM3}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wntr_pipe_criticality_results.csv';
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            N-1 Single Pipe Outage Criticality Ranking
          </h3>
          <p className="text-xs text-slate-400">
            Pipes ranked by system resilience loss when isolated (WSA drop & under-pressure junctions)
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
        >
          <Download className="w-3.5 h-3.5" /> Export Criticality CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2 px-3">Rank</th>
              <th className="py-2 px-3">Pipe ID</th>
              <th className="py-2 px-3">Diameter</th>
              <th className="py-2 px-3">Length</th>
              <th className="py-2 px-3">WSA Impact</th>
              <th className="py-2 px-3">Deficit Nodes</th>
              <th className="py-2 px-3">Volume Lost</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
            {criticalityList.map((item) => {
              const isSelected = selectedPipeId === item.pipeId;
              const severityBadge =
                item.wsaDropPercent > 10
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : item.wsaDropPercent > 3
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

              return (
                <tr
                  key={item.pipeId}
                  onClick={() => onSelectPipe(item.pipeId)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-cyan-950/40 text-cyan-200' : 'hover:bg-slate-800/60'
                  }`}
                >
                  <td className="py-2 px-3 font-bold text-slate-400">#{item.criticalityRank}</td>
                  <td className="py-2 px-3 font-semibold text-slate-200">Pipe {item.pipeId}</td>
                  <td className="py-2 px-3">{item.diameterMm} mm</td>
                  <td className="py-2 px-3">{item.lengthM} m</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${severityBadge}`}>
                      -{item.wsaDropPercent}% WSA
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {item.nodesUnderPressure > 0 ? (
                      <span className="text-rose-400 font-bold">{item.nodesUnderPressure} nodes</span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 0
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-400">{item.demandDeficitM3} m³</td>
                  <td className="py-2 px-3 text-right font-sans">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSimulatePipeOutage(item.pipeId);
                      }}
                      className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-[11px] font-medium transition"
                    >
                      Isolate & Test
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
