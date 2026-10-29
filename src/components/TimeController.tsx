import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Zap } from 'lucide-react';
import { TimeStepResult } from '../types/network';

interface TimeControllerProps {
  currentStepIndex: number;
  totalSteps: number;
  currentStepData: TimeStepResult;
  onStepChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  timestepSeconds: number;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  currentStepIndex,
  totalSteps,
  currentStepData,
  onStepChange,
  isPlaying,
  onTogglePlay,
  timestepSeconds,
}) => {
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // ms per step

  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        onStepChange((currentStepIndex + 1) % totalSteps);
      }, playSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentStepIndex, totalSteps, playSpeed, onStepChange]);

  const currentSeconds = currentStepData.time;
  const currentHours = Math.floor(currentSeconds / 3600);
  const currentMins = Math.floor((currentSeconds % 3600) / 60);
  const formattedTime = `${String(currentHours).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}:00`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 text-slate-200">
      {/* Left: Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
          disabled={currentStepIndex === 0}
          aria-label="Previous Timestep"
          title="Previous Timestep"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause timeline simulation' : 'Start timeline simulation'}
          className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Simulate Timeline
            </>
          )}
        </button>

        <button
          onClick={() => onStepChange((currentStepIndex + 1) % totalSteps)}
          aria-label="Next Timestep"
          title="Next Timestep"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed toggle */}
        <div
          className="flex items-center gap-1 ml-2 bg-slate-800/80 p-1 rounded-lg text-xs"
          role="group"
          aria-label="Playback speed controls"
        >
          {[
            { label: '1x', delay: 1000 },
            { label: '2x', delay: 500 },
            { label: '5x', delay: 200 },
          ].map((spd) => (
            <button
              key={spd.label}
              onClick={() => setPlaySpeed(spd.delay)}
              aria-label={`Set speed to ${spd.label}`}
              aria-pressed={playSpeed === spd.delay}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                playSpeed === spd.delay
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd.label}
            </button>
          ))}
        </div>
      </div>

      {/* Middle: Slider track */}
      <div className="flex-1 w-full max-w-xl flex items-center gap-3 px-2">
        <span className="text-xs font-mono text-cyan-400 font-bold min-w-[55px] text-right">
          Hr {currentHours}
        </span>
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={currentStepIndex}
          onChange={(e) => onStepChange(Number(e.target.value))}
          aria-label="Timeline step slider"
          aria-valuetext={`Hour ${currentHours}`}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        />
        <span className="text-xs font-mono text-slate-400 min-w-[55px]">
          Hr {Math.floor(((totalSteps - 1) * timestepSeconds) / 3600)}
        </span>
      </div>

      {/* Right: Real-time clock & step stats */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{formattedTime}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentStepData.pumpingEnergyKWh.toFixed(1)} kWh</span>
        </div>
      </div>
    </div>
  );
};
