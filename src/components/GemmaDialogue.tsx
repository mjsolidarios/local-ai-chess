import React from 'react';
import { EngineStatus } from '../types';

interface GemmaDialogueProps {
  currentText: string;
  isThinking: boolean;
  engineStatus: EngineStatus;
  testConnection: () => void;
}

export const GemmaDialogue: React.FC<GemmaDialogueProps> = ({
  currentText,
  isThinking,
  engineStatus,
  testConnection,
}) => {
  return (
    <div className="border-4 border-[#333] bg-[#111111] p-4 font-mono shadow-[0_10px_25px_rgba(0,0,0,0.4)] relative flex flex-col md:flex-row gap-4 items-center md:items-start text-zinc-100">
      {/* 8-Bit Glowing AI CRT Head */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-20 h-20 bg-[#1a1a1a] border-4 border-[#333] relative flex items-center justify-center shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Scanlines Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none z-10 opacity-40"></div>
          
          {/* Pixel Face */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 16 16"
            className={`w-full h-full p-2 transition-transform ${isThinking ? 'animate-bounce' : 'scale-100'}`}
            style={{ shapeRendering: 'crispEdges' }}
          >
            {/* Robot Base Frame */}
            <path d="M2 3h12v10H2z" fill="#ff0055" />
            <path d="M3 4h10v8H3z" fill="#111" />
            
            {/* Glowing purple details (Gemma Branding Violet) */}
            <path d="M4 11h8v1H4z" fill="#8B5CF6" />
            
            {/* Eyes */}
            {isThinking ? (
              <>
                {/* Rolling blinking eyes */}
                <path d="M4 6h2v1H4zm6 0h2v1h-2z" fill="#00ff41" />
                <path d="M4 7h2v1H4zm6 0h2v1h-2z" fill="#FFF" />
              </>
            ) : (
              <>
                {/* Happy normal eyes */}
                <path d="M4 5h2v1H4zm6 0h2v1h-2z" fill="#FFF" />
                <path d="M5 6h1v1H5zm6 0h1v1h-1z" fill="#FFF" />
                <path d="M4 6h1v1H4zm6 0h1v1h-1z" fill="#00ff41" />
              </>
            )}
            
            {/* Mouth */}
            {isThinking ? (
              <path d="M7 9h2v1H7z" fill="#00ff41" />
            ) : (
              <path d="M6 9h4v1H6zm1-1h2v1H7z" fill="#FFF" />
            )}
            
            {/* Antenna with LED */}
            <path d="M7 1h2v2H7z" fill={isThinking ? '#ff0055' : '#00ff41'} />
            <path d="M8 0h1v1H8z" fill="#FFF" />
          </svg>
        </div>
        <span className="mt-2 text-[9px] font-bold leading-none tracking-widest px-2 py-1 bg-[#ff0055] text-white rounded-none select-none font-press-start scale-95">
          AI: GEMMA
        </span>
      </div>

      {/* Bubble / Text Context */}
      <div className="flex-1 w-full">
        {/* Connection status header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#333] pb-2 mb-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-zinc-500 font-bold">LM STUDIO:</span>
            <span
              className={`px-2 py-0.5 rounded-none text-[8px] tracking-wider select-none font-bold ${
                engineStatus.isOnline
                  ? 'bg-[#00ff41]/20 text-[#00ff41]'
                  : 'bg-amber-400/20 text-amber-300'
              }`}
            >
              {engineStatus.isOnline ? '● ONLINE 🟢' : '● OFFLINE 🔴 (FALLBACK)'}
            </span>
          </div>
          
          <button
            onClick={testConnection}
            disabled={engineStatus.checking}
            className="text-[9px] px-2.5 py-0.5 border-2 border-[#ff0055] bg-[#ff0055]/10 text-[#ff0055] hover:bg-[#ff0055] hover:text-white font-bold active:translate-y-0.5 select-none transition-all cursor-pointer"
          >
            {engineStatus.checking ? 'PROBING...' : 'TEST LINK'}
          </button>
        </div>

        {/* dialogue box text */}
        <div className="relative font-mono h-16 flex flex-col justify-center select-none">
          {isThinking ? (
            <div className="text-[#00ff41] animate-pulse text-xs md:text-sm leading-tight">
              &gt; COMPUTING CHESS CODES... <br />
              <span className="text-[9px] text-[#ff0055] font-bold uppercase tracking-wider block mt-1">
                Awaiting LM Studio local neural inference...
              </span>
            </div>
          ) : (
            <div className="text-zinc-200 text-xs md:text-sm leading-tight font-medium relative italic">
              &quot;{currentText}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
