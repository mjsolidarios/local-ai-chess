import React from 'react';
import { GameSettings as SettingsType, Color } from '../types';

interface GameSettingsProps {
  settings: SettingsType;
  onChange: (settings: SettingsType) => void;
  onReset: () => void;
}

export const GameSettings: React.FC<GameSettingsProps> = ({
  settings,
  onChange,
  onReset,
}) => {
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, lmStudioUrl: e.target.value });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, modelName: e.target.value });
  };

  const handleColorChange = (color: Color) => {
    onChange({ ...settings, playerColor: color });
  };

  const handleSoundToggle = () => {
    onChange({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  const handleDelayChange = (value: number) => {
    onChange({ ...settings, thinkingDelayMs: value });
  };

  return (
    <div className="border-4 border-[#333] bg-[#111111] p-5 font-mono shadow-[0_10px_25px_rgba(0,0,0,0.4)] text-[#f0f0f0] select-none">
      <div className="bg-[#1a1a1a] text-white border-2 border-[#ff0055] p-2 text-center text-[9px] font-bold tracking-widest uppercase mb-4 shadow-[3px_3px_0px_#80002b] font-press-start">
        === CONFIG PANEL ===
      </div>

      <div className="space-y-4">
        {/* LM Studio Connection */}
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1 text-zinc-400">
            LM Studio Server URL:
          </label>
          <input
            type="text"
            value={settings.lmStudioUrl}
            onChange={handleUrlChange}
            placeholder="http://localhost:1234/v1"
            className="w-full text-xs font-mono p-2 border-2 border-[#333] bg-black text-[#00ff41] focus:outline-none focus:border-[#ff0055] block rounded-none"
          />
          <span className="text-[9px] text-zinc-600 mt-1 block leading-tight">
            Typical LM Studio endpoint. Check &apos;Local Server&apos; tab inside LM Studio.
          </span>
        </div>

        {/* Model ID */}
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1 text-zinc-400">
            Model ID (Gemma):
          </label>
          <input
            type="text"
            value={settings.modelName}
            onChange={handleModelChange}
            placeholder="gemma"
            className="w-full text-xs font-mono p-2 border-2 border-[#333] bg-black text-[#00ff41] focus:outline-none focus:border-[#ff0055] block rounded-none"
          />
          <span className="text-[9px] text-zinc-600 mt-1 block leading-tight">
            Make sure your model is loaded inside LM Studio.
          </span>
        </div>

        {/* Player Side preference */}
        <div>
          <span className="block text-[10px] font-bold uppercase mb-1 text-zinc-400">
            Your Pieces Side:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleColorChange('w')}
              className={`p-2 border-2 font-bold text-xs cursor-pointer transition-colors ${
                settings.playerColor === 'w'
                  ? 'bg-[#ff0055] border-[#ff0055] text-white'
                  : 'bg-black text-zinc-400 border-[#333] hover:text-white hover:border-zinc-500'
              }`}
            >
              WHITE (⚔️ FIRST)
            </button>
            <button
              onClick={() => handleColorChange('b')}
              className={`p-2 border-2 font-bold text-xs cursor-pointer transition-colors ${
                settings.playerColor === 'b'
                  ? 'bg-[#ff0055] border-[#ff0055] text-white'
                  : 'bg-black text-zinc-400 border-[#333] hover:text-white hover:border-zinc-500'
              }`}
            >
              BLACK (🛡️ DEFEN)
            </button>
          </div>
        </div>

        {/* Micro elements */}
        <div className="flex justify-between items-center py-2 border-b-2 border-dashed border-[#333]">
          <span className="text-[10px] font-bold uppercase text-zinc-400">Sound Effects:</span>
          <button
            onClick={handleSoundToggle}
            className={`px-3 py-1 border-2 font-bold text-xs cursor-pointer rounded-none transition-colors ${
              settings.soundEnabled 
                ? 'bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41]' 
                : 'bg-[#ff0055]/20 text-[#ff0055] border-[#ff0055]'
            }`}
          >
            {settings.soundEnabled ? '🔈 ENABLED' : '🔇 MUTED'}
          </button>
        </div>

        {/* Thinking Delay */}
        <div>
          <div className="flex justify-between text-[10px] font-bold uppercase mb-1 text-zinc-400">
            <span>AI Simulation pause:</span>
            <span className="text-[#00ff41]">{(settings.thinkingDelayMs / 1000).toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="500"
            max="4000"
            step="250"
            value={settings.thinkingDelayMs}
            onChange={(e) => handleDelayChange(parseInt(e.target.value))}
            className="w-full accent-[#ff0055] cursor-pointer bg-black h-2 border-md rounded-none"
          />
          <span className="text-[9px] text-zinc-600 block text-right mt-1">
            Adds aesthetic pause simulating model compute.
          </span>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={onReset}
            className="w-full bg-[#ff0055]/15 hover:bg-[#ff0055] text-white font-bold p-3 border-4 border-[#333] text-[10px] tracking-widest cursor-pointer transition-all active:translate-y-0.5"
          >
            🗑️ REBOOT GAME
          </button>
        </div>
      </div>
    </div>
  );
};
