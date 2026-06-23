import React from 'react';
import { MoveLog, PieceType } from '../types';
import { ChessPiece } from './ChessPiece';

interface MoveHistoryProps {
  logs: MoveLog[];
  whiteCaptured: PieceType[];
  blackCaptured: PieceType[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  logs,
  whiteCaptured,
  blackCaptured,
}) => {
  // Pivot log list to dual column (pair white and black moves together)
  const pairedMoves: { white?: MoveLog; black?: MoveLog }[] = [];
  for (let i = 0; i < logs.length; i += 2) {
    pairedMoves.push({
      white: logs[i],
      black: logs[i + 1],
    });
  }

  // Value maps to sort captured pieces
  const pieceWeights: Record<PieceType, number> = {
    q: 5,
    r: 4,
    b: 3,
    n: 2,
    p: 1,
    k: 0,
  };

  const getSortedCaptured = (list: PieceType[]) => {
    return [...list].sort((a, b) => pieceWeights[b] - pieceWeights[a]);
  };

  return (
    <div className="border-4 border-[#333] bg-[#111111] p-4 font-mono shadow-[0_10px_25px_rgba(0,0,0,0.4)] text-[#f0f0f0] select-none">
      <div className="bg-[#1a1a1a] text-white border-2 border-[#ff0055] p-2 text-center text-[9px] font-bold tracking-widest uppercase mb-4 shadow-[3px_3px_0px_#80002b] font-press-start">
        🏆 MOVES DIRECTORY 🏆
      </div>

      {/* Captured Stat tracker */}
      <div className="grid grid-cols-2 gap-4 border-b-4 border-[#333] pb-3 mb-4 text-xs font-bold leading-normal">
        {/* White captures (Black pieces captured) */}
        <div>
          <span className="text-[#00ff41] block text-[9px] uppercase mb-1 font-bold">PLAYER ACQUISITION:</span>
          {whiteCaptured.length === 0 ? (
            <span className="text-zinc-600 block italic text-[10px] bg-black/40 p-1 border border-[#333]">NULL CODES</span>
          ) : (
            <div className="flex flex-wrap gap-1 bg-black p-1 border border-[#333] min-h-[32px] items-center">
              {getSortedCaptured(whiteCaptured).map((pType, idx) => (
                <div key={idx} className="scale-75 select-none -mx-1">
                  <ChessPiece type={pType} color="b" size={20} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Black captures (White pieces captured) */}
        <div>
          <span className="text-[#ff0055] block text-[9px] uppercase mb-1 font-bold">GEMMA ACQUISITION:</span>
          {blackCaptured.length === 0 ? (
            <span className="text-zinc-600 block italic text-[10px] bg-black/40 p-1 border border-[#333]">NULL CODES</span>
          ) : (
            <div className="flex flex-wrap gap-1 bg-black p-1 border border-[#333] min-h-[32px] items-center">
              {getSortedCaptured(blackCaptured).map((pType, idx) => (
                <div key={idx} className="scale-75 select-none -mx-1">
                  <ChessPiece type={pType} color="w" size={20} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Move Lists Grid */}
      <div className="h-48 overflow-y-auto pr-1 text-xs border border-[#333] bg-black p-3 scrollbar-thin">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="border-b-2 border-[#333] pb-1 text-zinc-500 font-bold tracking-wider text-[9px] font-press-start">
              <th className="py-2.5 w-1/4">SEQ</th>
              <th className="py-2.5 w-3/8 text-[#00ff41]">WHITE</th>
              <th className="py-2.5 w-3/8 text-[#ff0055]">BLACK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {pairedMoves.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-zinc-600 italic uppercase tracking-wider text-[10px]">
                  &gt;&gt; Awaiting initial move &lt;&lt;
                </td>
              </tr>
            ) : (
              pairedMoves.map((pair, idx) => (
                <tr key={idx} className="hover:bg-zinc-950 font-medium text-[11px]">
                  <td className="py-1.5 text-zinc-500 font-bold">
                    {(idx + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="py-1.5 font-bold text-[#00ff41] uppercase tracking-wide">
                    {pair.white?.san}
                  </td>
                  <td className="py-1.5 font-bold text-[#ff0055] uppercase tracking-wide">
                    {pair.black ? pair.black.san : '...'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
