import React, { useState, useRef, useMemo } from 'react';
import {
  WaterNetworkModel,
  TimeStepResult,
  NetworkNode,
  NetworkLink,
  DisasterScenario,
} from '../types/network';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Flame,
  AlertCircle,
  ZapOff,
  Droplets,
  Layers,
} from 'lucide-react';

interface NetworkCanvasProps {
  model: WaterNetworkModel;
  currentStepData: TimeStepResult;
  selectedElement: { type: 'node' | 'link'; id: string } | null;
  onSelectElement: (element: { type: 'node' | 'link'; id: string } | null) => void;
  scenario: DisasterScenario;
  colorLayer: 'pressure' | 'head' | 'demand' | 'quality' | 'flow' | 'damage';
  onChangeColorLayer: (layer: 'pressure' | 'head' | 'demand' | 'quality' | 'flow' | 'damage') => void;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  model,
  currentStepData,
  selectedElement,
  onSelectElement,
  scenario,
  colorLayer,
  onChangeColorLayer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredElement, setHoveredElement] = useState<{
    type: 'node' | 'link';
    id: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Compute bounding box of network coordinates
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    Object.values(model.nodes).forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });
    if (!isFinite(minX)) {
      minX = 0; maxX = 100; minY = 0; maxY = 100;
    }
    const paddingX = Math.max((maxX - minX) * 0.12, 10);
    const paddingY = Math.max((maxY - minY) * 0.12, 10);
    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
      width: (maxX - minX) + 2 * paddingX || 100,
      height: (maxY - minY) + 2 * paddingY || 100,
    };
  }, [model]);

  // Coordinate transform to SVG viewBox (flip Y for standard Cartesian water network maps)
  const mapX = (x: number) => x;
  const mapY = (y: number) => bounds.maxY - (y - bounds.minY);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement && (e.target.dataset.interactive === 'true')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(4, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z / 1.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Node coloring
  const getNodeColor = (node: NetworkNode) => {
    const nodeRes = currentStepData.nodes[node.id];
    if (node.type === 'Reservoir') return '#0284c7'; // Cyan/Blue
    if (node.type === 'Tank') return '#06b6d4'; // Bright teal

    if (!nodeRes) return '#64748b';

    if (colorLayer === 'pressure') {
      const p = nodeRes.pressure;
      if (p <= 5) return '#ef4444'; // Critically low (red)
      if (p < 15) return '#f59e0b'; // Low pressure below required (amber)
      if (p < 30) return '#10b981'; // Optimal (green)
      return '#3b82f6'; // High pressure (blue)
    }

    if (colorLayer === 'quality') {
      // Chlorine residual mg/L: <0.2 unsafe, 0.2-1.0 good, >2.0 high
      const q = nodeRes.quality;
      if (q < 0.2) return '#ef4444';
      if (q < 0.8) return '#10b981';
      return '#8b5cf6';
    }

    if (colorLayer === 'demand') {
      const d = nodeRes.demand * 1000; // L/s
      if (d === 0) return '#64748b';
      if (d < 10) return '#38bdf8';
      if (d < 25) return '#f59e0b';
      return '#ec4899';
    }

    if (colorLayer === 'damage') {
      if (scenario.type === 'fire_flow' && scenario.params.nodeId === node.id) {
        return '#f97316';
      }
      if (scenario.type === 'contamination' && scenario.params.contaminantNodeId === node.id) {
        return '#a855f7';
      }
      if (nodeRes.pressure < model.options.requiredPressure) {
        return '#ef4444';
      }
      return '#10b981';
    }

    return '#38bdf8';
  };

  // Link coloring and width
  const getLinkStyle = (link: NetworkLink) => {
    const linkRes = currentStepData.links[link.id];
    const isSelected = selectedElement?.type === 'link' && selectedElement.id === link.id;

    if (link.type === 'Pump') {
      const isOutage = linkRes?.status === 'Closed' || link.status === 'Closed';
      return {
        stroke: isOutage ? '#ef4444' : '#10b981',
        strokeWidth: isSelected ? 5 : 3.5,
        strokeDasharray: isOutage ? '4,4' : undefined,
      };
    }

    if (linkRes?.status === 'Broken' || link.status === 'Broken') {
      return {
        stroke: '#ef4444',
        strokeWidth: isSelected ? 5 : 3.5,
        strokeDasharray: '6,4',
      };
    }

    if (linkRes?.status === 'Leaking' || link.status === 'Leaking') {
      return {
        stroke: '#f59e0b',
        strokeWidth: isSelected ? 5 : 3.5,
      };
    }

    if (link.status === 'Closed') {
      return {
        stroke: '#475569',
        strokeWidth: isSelected ? 4 : 2,
        strokeDasharray: '4,4',
      };
    }

    if (colorLayer === 'flow') {
      const flow = Math.abs(linkRes?.flow || 0) * 1000; // L/s
      if (flow < 1) return { stroke: '#475569', strokeWidth: isSelected ? 4 : 2 };
      if (flow < 15) return { stroke: '#38bdf8', strokeWidth: isSelected ? 5 : 3 };
      if (flow < 40) return { stroke: '#06b6d4', strokeWidth: isSelected ? 6 : 4 };
      return { stroke: '#6366f1', strokeWidth: isSelected ? 7 : 5 };
    }

    return {
      stroke: isSelected ? '#38bdf8' : '#334155',
      strokeWidth: isSelected ? 4 : 2.5,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[480px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2 py-1.5 rounded-lg shadow-lg">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 pl-1 pr-2 border-r border-slate-700">
          <Layers className="w-3.5 h-3.5 text-cyan-400" /> Layer
        </span>
        {(['pressure', 'flow', 'quality', 'demand', 'damage'] as const).map((layer) => (
          <button
            key={layer}
            onClick={() => onChangeColorLayer(layer)}
            className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-all ${
              colorLayer === layer
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {layer}
          </button>
        ))}
      </div>

      {/* Zoom / Navigation Buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1 rounded-lg shadow-lg">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset View"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-2 rounded-lg text-xs shadow-xl flex flex-col gap-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {colorLayer === 'pressure' && 'Node Pressure (m)'}
          {colorLayer === 'flow' && 'Pipe Flow Rate (L/s)'}
          {colorLayer === 'quality' && 'Chlorine Residual (mg/L)'}
          {colorLayer === 'demand' && 'Nodal Demand (L/s)'}
          {colorLayer === 'damage' && 'Service Status'}
        </div>

        {colorLayer === 'pressure' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;5m
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 5-15m
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 15-30m
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> &gt;30m
            </span>
          </div>
        )}

        {colorLayer === 'flow' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-4 h-0.5 bg-slate-500 inline-block" /> &lt;1
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-4 h-1 bg-sky-400 inline-block" /> 1-15
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-4 h-1.5 bg-cyan-400 inline-block" /> 15-40
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-4 h-2 bg-indigo-500 inline-block" /> &gt;40
            </span>
          </div>
        )}

        {colorLayer === 'quality' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;0.2 (Low)
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 0.2-0.8 (Safe)
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> &gt;0.8 (High)
            </span>
          </div>
        )}

        {colorLayer === 'damage' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Normal
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Deficit/Break
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Leaking
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Fire
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <defs>
          {/* Arrow markers for flow directions */}
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
          </marker>
          <marker
            id="arrowhead-reverse"
            markerWidth="8"
            markerHeight="6"
            refX="2"
            refY="3"
            orient="auto"
          >
            <polygon points="8 0, 0 3, 8 6" fill="#38bdf8" />
          </marker>

          {/* Background grid pattern */}
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.2" />
          </pattern>
        </defs>

        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="url(#grid)"
        />

        {/* 1. Links Layer (Pipes, Pumps) */}
        <g id="links-group">
          {Object.values(model.links).map((link) => {
            const startNode = model.nodes[link.startNode];
            const endNode = model.nodes[link.endNode];
            if (!startNode || !endNode) return null;

            const x1 = mapX(startNode.x);
            const y1 = mapY(startNode.y);
            const x2 = mapX(endNode.x);
            const y2 = mapY(endNode.y);

            const style = getLinkStyle(link);
            const isSelected = selectedElement?.type === 'link' && selectedElement.id === link.id;
            const linkRes = currentStepData.links[link.id];
            const flow = linkRes?.flow || 0;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g
                key={link.id}
                data-interactive="true"
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement({ type: 'link', id: link.id });
                }}
                onMouseEnter={(e) => {
                  setHoveredElement({
                    type: 'link',
                    id: link.id,
                    screenX: e.clientX,
                    screenY: e.clientY,
                  });
                }}
                onMouseLeave={() => setHoveredElement(null)}
              >
                {/* Invisible wider hit area for easy clicking */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="8"
                  data-interactive="true"
                />

                {/* Main Link Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  strokeLinecap="round"
                  data-interactive="true"
                  className="transition-colors duration-200"
                />

                {/* Pump Icon / Symbol */}
                {link.type === 'Pump' && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <circle r="3.5" fill="#0f172a" stroke={style.stroke} strokeWidth="1.2" />
                    <polygon
                      points="-1.5,-2 2.5,0 -1.5,2"
                      fill={style.stroke}
                    />
                  </g>
                )}

                {/* Leak Orifice Indicator */}
                {linkRes?.status === 'Leaking' && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <circle r="4" fill="none" stroke="#f59e0b" strokeWidth="1.2" className="animate-ping" />
                    <circle r="2.5" fill="#f59e0b" />
                  </g>
                )}

                {/* Broken Pipe Indicator */}
                {linkRes?.status === 'Broken' && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <line x1="-3" y1="-3" x2="3" y2="3" stroke="#ef4444" strokeWidth="2" />
                    <line x1="-3" y1="3" x2="3" y2="-3" stroke="#ef4444" strokeWidth="2" />
                  </g>
                )}

                {/* Small Flow Direction Arrow indicator on active pipe */}
                {link.type === 'Pipe' && Math.abs(flow) > 0.001 && linkRes?.status === 'Open' && (
                  <circle
                    cx={midX}
                    cy={midY}
                    r="1.2"
                    fill="#38bdf8"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* 2. Nodes Layer (Junctions, Reservoirs, Tanks) */}
        <g id="nodes-group">
          {Object.values(model.nodes).map((node) => {
            const cx = mapX(node.x);
            const cy = mapY(node.y);
            const isSelected = selectedElement?.type === 'node' && selectedElement.id === node.id;
            const color = getNodeColor(node);
            const nodeRes = currentStepData.nodes[node.id];

            // Render node based on type
            if (node.type === 'Reservoir') {
              return (
                <g
                  key={node.id}
                  data-interactive="true"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'node', id: node.id });
                  }}
                  onMouseEnter={(e) => {
                    setHoveredElement({
                      type: 'node',
                      id: node.id,
                      screenX: e.clientX,
                      screenY: e.clientY,
                    });
                  }}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  {/* Reservoir symbol: Square with water waves */}
                  <rect
                    x={cx - 4.5}
                    y={cy - 4.5}
                    width="9"
                    height="9"
                    rx="1.5"
                    fill="#0284c7"
                    stroke={isSelected ? '#ffffff' : '#38bdf8'}
                    strokeWidth={isSelected ? 2 : 1.2}
                    data-interactive="true"
                  />
                  <path
                    d={`M ${cx - 3} ${cy} Q ${cx - 1} ${cy - 1.5} ${cx} ${cy} T ${cx + 3} ${cy}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                  <text
                    x={cx}
                    y={cy + 8}
                    fill="#94a3b8"
                    fontSize="3"
                    textAnchor="middle"
                    className="font-medium pointer-events-none"
                  >
                    Res {node.id}
                  </text>
                </g>
              );
            }

            if (node.type === 'Tank') {
              return (
                <g
                  key={node.id}
                  data-interactive="true"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'node', id: node.id });
                  }}
                  onMouseEnter={(e) => {
                    setHoveredElement({
                      type: 'node',
                      id: node.id,
                      screenX: e.clientX,
                      screenY: e.clientY,
                    });
                  }}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  {/* Tank symbol: Cylinder / Rounded Rect with Level Fill */}
                  <rect
                    x={cx - 5}
                    y={cy - 6}
                    width="10"
                    height="12"
                    rx="2"
                    fill="#082f49"
                    stroke={isSelected ? '#ffffff' : '#06b6d4'}
                    strokeWidth={isSelected ? 2 : 1.4}
                    data-interactive="true"
                  />
                  {/* Fill level representation */}
                  <rect
                    x={cx - 4}
                    y={cy - 1}
                    width="8"
                    height="6"
                    rx="1"
                    fill="#0284c7"
                    opacity="0.8"
                  />
                  <text
                    x={cx}
                    y={cy + 10}
                    fill="#38bdf8"
                    fontSize="3.2"
                    textAnchor="middle"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    Tank {node.id}
                  </text>
                </g>
              );
            }

            // Junction node
            return (
              <g
                key={node.id}
                data-interactive="true"
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement({ type: 'node', id: node.id });
                }}
                onMouseEnter={(e) => {
                  setHoveredElement({
                    type: 'node',
                    id: node.id,
                    screenX: e.clientX,
                    screenY: e.clientY,
                  });
                }}
                onMouseLeave={() => setHoveredElement(null)}
              >
                {/* Fire hydrant active indicator */}
                {scenario.type === 'fire_flow' && scenario.params.nodeId === node.id && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="6.5"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.2"
                    className="animate-ping"
                  />
                )}

                {/* Selection Ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                )}

                {/* Junction circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.2"
                  fill={color}
                  stroke={isSelected ? '#ffffff' : '#0f172a'}
                  strokeWidth="0.8"
                  data-interactive="true"
                  className="transition-colors duration-200"
                />

                {/* Node ID label */}
                <text
                  x={cx}
                  y={cy - 4.5}
                  fill="#94a3b8"
                  fontSize="2.8"
                  textAnchor="middle"
                  className="pointer-events-none select-none font-medium"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover Floating Tooltip */}
      {hoveredElement && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur border border-slate-700 px-3 py-2 rounded-lg shadow-xl text-xs text-slate-200"
          style={{
            left: hoveredElement.screenX + 12,
            top: hoveredElement.screenY + 12,
          }}
        >
          {hoveredElement.type === 'node' ? (
            (() => {
              const node = model.nodes[hoveredElement.id];
              const res = currentStepData.nodes[hoveredElement.id];
              const elev = node ? (node.type === 'Reservoir' ? node.head : node.elevation) : 0;
              return (
                <div className="space-y-1">
                  <div className="font-semibold text-cyan-400 flex items-center justify-between gap-4">
                    <span>{node?.type} {hoveredElement.id}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Elev: {elev}m</span>
                  </div>
                  {node?.type === 'Junction' && res && (
                    <>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Pressure:</span>
                        <span className={`font-mono ${res.pressure < model.options.requiredPressure ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                          {res.pressure.toFixed(2)} m
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Actual Demand:</span>
                        <span className="font-mono text-cyan-300">{(res.demand * 1000).toFixed(2)} L/s</span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Chlorine:</span>
                        <span className="font-mono text-indigo-300">{res.quality.toFixed(2)} mg/L</span>
                      </div>
                    </>
                  )}
                  {node?.type === 'Tank' && (
                    <div className="text-cyan-300">
                      Level: {(currentStepData.nodes[hoveredElement.id]?.head - (node?.elevation || 0)).toFixed(2)}m / {node?.maxLevel}m
                    </div>
                  )}
                  {node?.type === 'Reservoir' && (
                    <div className="text-cyan-300">Total Source Head: {node.head.toFixed(1)}m</div>
                  )}
                </div>
              );
            })()
          ) : (
            (() => {
              const link = model.links[hoveredElement.id];
              const res = currentStepData.links[hoveredElement.id];
              return (
                <div className="space-y-1">
                  <div className="font-semibold text-cyan-400 flex items-center justify-between gap-4">
                    <span>{link?.type} {hoveredElement.id}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{link?.startNode} &rarr; {link?.endNode}</span>
                  </div>
                  {res && (
                    <>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Flow Rate:</span>
                        <span className="font-mono text-cyan-300">{(res.flow * 1000).toFixed(2)} L/s</span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Velocity:</span>
                        <span className="font-mono text-slate-200">{res.velocity.toFixed(2)} m/s</span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Status:</span>
                        <span className={`font-semibold ${res.status === 'Open' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {res.status}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};
