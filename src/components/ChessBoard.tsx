import React, { useState } from 'react';
import { ChessPiece } from './ChessPiece';
import { Color, PieceType } from '../types';

interface ChessBoardProps {
  board: any[][]; // 2D array of { type, color, square } or null
  selectedSquare: string | null;
  validMoves: string[];
  lastMove: { from: string; to: string } | null;
  playerColor: Color;
  isPlayerTurn: boolean;
  onSquareClick: (square: string) => void;
  onPromoteAndMove: (from: string, to: string, piece: PieceType) => void;
  frozenSquares?: Record<string, number>;
  shieldedSquares?: string[];
  activeSpell?: string | null;
}

export type BoardTheme = 'immersive' | 'forest' | 'desert' | 'wood' | 'gameboy';

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  validMoves,
  lastMove,
  playerColor,
  isPlayerTurn,
  onSquareClick,
  onPromoteAndMove,
  frozenSquares = {},
  shieldedSquares = [],
  activeSpell = null,
}) => {
  const [theme, setTheme] = useState<BoardTheme>('immersive');
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  // Theme palettes: light square, dark square, border grid, background
  const themeColors = {
    immersive: {
      light: '#2a2a2a',
      dark: '#141414',
      selected: 'rgba(255, 0, 85, 0.35)', // Neon pink glow
      selectedBorder: 'border-[#ff0055]',
      dot: '#ff0055',
    },
    forest: {
      light: '#A2C2A8',
      dark: '#486B51',
      selected: 'rgba(234, 179, 8, 0.45)', // Yellow glow
      selectedBorder: 'border-yellow-400',
      dot: '#FACC15',
    },
    desert: {
      light: '#EED9B3',
      dark: '#B0835B',
      selected: 'rgba(239, 68, 68, 0.4)', // Red glow
      selectedBorder: 'border-rose-500',
      dot: '#EF4444',
    },
    wood: {
      light: '#EAD5C3',
      dark: '#7C5D4B',
      selected: 'rgba(59, 130, 246, 0.4)', // Blue glow
      selectedBorder: 'border-blue-500',
      dot: '#3B82F6',
    },
    gameboy: {
      light: '#9BBC0F',
      dark: '#306230',
      selected: 'rgba(15, 56, 15, 0.45)', // Dark LCD glow
      selectedBorder: 'border-emerald-950',
      dot: '#0F380F',
    },
  };

  const activeTheme = themeColors[theme];

  // Map 0-7 raw board coords list
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // Fliping files and ranks based on playerColor
  // If player is Black, flip board so rank 1 is at top (flipped Ranks: '1'..'8'), and file h is at left (flipped Files: 'h'..'a')
  const shouldFlip = playerColor === 'b';
  const displayRanks = shouldFlip ? [...ranks].reverse() : ranks;
  const displayFiles = shouldFlip ? [...files].reverse() : files;

  const handleSquareClick = (squareKey: string, piece: { type: string; color: string } | null, x: number, y: number) => {
    if (!isPlayerTurn) return;

    // Check if this click represents a pawn promotion requirement
    // Player is about to finish a move that moves a pawn to rank 8/rank 1
    if (selectedSquare) {
      const fromSquare = selectedSquare;
      const toSquare = squareKey;
      
      // Look up piece in board state
      // Flipped or not, we query the board 2D grid index of the chess piece
      const sourceY = ranks.indexOf(fromSquare[1]);
      const sourceX = files.indexOf(fromSquare[0]);
      
      const p = board[sourceY]?.[sourceX];
      if (p && p.type === 'p') {
        const destRank = toSquare[1];
        if ((p.color === 'w' && destRank === '8') || (p.color === 'b' && destRank === '1')) {
          // Verify if the move is actually among valid target squares
          if (validMoves.includes(toSquare)) {
            // Intercept and open promotion chooser modal!
            setPromotionPending({ from: fromSquare, to: toSquare });
            return;
          }
        }
      }
    }

    onSquareClick(squareKey);
  };

  const handlePromoteSelection = (piece: PieceType) => {
    if (promotionPending) {
      onPromoteAndMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Visual board theme selectors - formatted as a vintage pixel coin insert HUD */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3 bg-[#111] p-2 border-2 border-[#333] font-mono text-xs shadow-[3px_3px_0px_rgba(0,0,0,0.5)] uppercase select-none w-full max-w-[440px]">
        <span className="font-bold shrink-0 text-[10px] text-zinc-500 font-press-start scale-90">SKIN SELECT:</span>
        <div className="flex gap-1.5 flex-wrap">
          {(['immersive', 'forest', 'desert', 'wood', 'gameboy'] as BoardTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2 py-0.5 border font-bold text-[10px] cursor-pointer ${
                theme === t ? 'bg-[#ff0055] text-white border-[#ff0055]' : 'bg-[#1a1a1a] text-zinc-400 border-[#333] hover:text-white hover:border-zinc-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Board Framed in solid heavy Retro Border */}
      <div className="relative border-8 border-[#333] bg-black p-1 shadow-[10px_10px_0px_rgba(0,0,0,0.6)]">
        {/* Grid and labels overlay */}
        <div className="grid grid-cols-8 relative" style={{ width: 'min(84vw, 420px)', height: 'min(84vw, 420px)' }}>
          {displayRanks.map((rank, rIdx) => {
            return displayFiles.map((file, fIdx) => {
              const squareKey = file + rank;

              // Compute indexes to read from standard 'board' array.
              // Standard board array has rank 8 at board[0] and rank 1 at board[7].
              // Standard board array has file 'a' at board[i][0] and file 'h' at board[i][7].
              const boardY = ranks.indexOf(rank);
              const boardX = files.indexOf(file);

              const piece = board[boardY]?.[boardX];
              
              const isDarkSquare = (rIdx + fIdx) % 2 === 1;
              const squareColor = isDarkSquare ? activeTheme.dark : activeTheme.light;
              
              const isSelected = selectedSquare === squareKey;
              const isValidDestination = validMoves.includes(squareKey);
              
              const isLastMoveSrc = lastMove?.from === squareKey;
              const isLastMoveDst = lastMove?.to === squareKey;

              return (
                <div
                  key={squareKey}
                  onClick={() => handleSquareClick(squareKey, piece, boardX, boardY)}
                  style={{ backgroundColor: squareColor }}
                  className="relative flex items-center justify-center cursor-pointer transition-colors duration-150 select-none group aspect-square select-none overflow-hidden"
                >
                  {/* Selection Glow Indicator */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 z-0 animate-pulse border-4"
                      style={{ 
                        backgroundColor: activeTheme.selected,
                        borderColor: activeTheme.dot
                      }}
                    />
                  )}

                  {/* Previous Move highlight trail */}
                  {(isLastMoveSrc || isLastMoveDst) && !isSelected && (
                    <div className="absolute inset-0 border-2 border-dashed border-[#ff0055]/80 opacity-70 z-0" />
                  )}

                  {/* Piece element */}
                  {piece && (
                    <div className="z-10 relative w-full h-full flex flex-col items-center justify-between pb-1 pt-1.5 transition-transform duration-100 select-none group-hover:scale-[1.05]">
                      <div className="flex-1 flex items-center justify-center">
                        <ChessPiece type={piece.type} color={piece.color} size={36} />
                      </div>
                      <span className="text-[7px] md:text-[8px] font-mono font-bold tracking-tight uppercase leading-none text-zinc-400 bg-black/65 px-1 py-0.5 pointer-events-none select-none border border-zinc-800/80">
                        {piece.type === 'p' ? 'pawn' : piece.type === 'r' ? 'rook' : piece.type === 'b' ? 'bishop' : piece.type === 'n' ? 'knight' : piece.type === 'q' ? 'queen' : 'king'}
                      </span>
                    </div>
                  )}

                  {/* Target Validation dot helper */}
                  {isValidDestination && (
                    <div 
                      className={`absolute rounded-none z-20 ${piece ? 'w-full h-full border-4 border-dashed animate-pulse' : 'w-2.5 h-2.5'}`} 
                      style={{ 
                        backgroundColor: piece ? 'transparent' : activeTheme.dot,
                        borderColor: piece ? activeTheme.dot : 'transparent'
                      }}
                    />
                  )}

                  {/* Frozen RPG Status Overlay */}
                  {frozenSquares[squareKey] > 0 && (
                    <div className="absolute inset-0 bg-cyan-500/25 border-2 border-cyan-400/80 z-25 flex items-center justify-center pointer-events-none">
                      <span className="text-sm select-none drop-shadow-md animate-bounce">❄️</span>
                      <span className="absolute bottom-0.5 right-1 text-[7px] font-mono select-none font-extrabold text-cyan-300 bg-black/80 px-1 border border-cyan-500/50 leading-none">
                        {frozenSquares[squareKey]}T
                      </span>
                    </div>
                  )}

                  {/* Shielded RPG Status Overlay */}
                  {shieldedSquares.includes(squareKey) && (
                    <div className="absolute inset-0 border-2 border-yellow-400 bg-yellow-500/10 z-25 flex items-center justify-center pointer-events-none animate-pulse">
                      <span className="text-xs select-none drop-shadow-[0_1px_4px_rgba(234,179,8,0.8)]">🛡️</span>
                    </div>
                  )}

                  {/* Laser-guided Spell Targeting Reticle Overlay */}
                  {activeSpell && (
                    <div className="absolute inset-x-0.5 inset-y-0.5 border border-dashed border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/15 z-25 flex items-center justify-center transition-all bg-rose-950/5">
                      <span className="text-[10px] text-rose-500 font-bold animate-pulse font-mono tracking-tighter scale-90">+</span>
                    </div>
                  )}

                  {/* Coordinate Ranks prints (printed on left files column only) */}
                  {fIdx === 0 && (
                    <span 
                      className="absolute top-0.5 left-1 text-[8px] font-bold select-none leading-none opacity-60 leading-none pointer-events-none"
                      style={{ color: isDarkSquare ? activeTheme.light : activeTheme.dark }}
                    >
                      {rank}
                    </span>
                  )}

                  {/* Coordinate Files prints (printed on bottom ranks row only) */}
                  {rIdx === 7 && (
                    <span 
                      className="absolute bottom-0.5 right-1 text-[8px] font-bold select-none leading-none opacity-60 leading-none pointer-events-none"
                      style={{ color: isDarkSquare ? activeTheme.light : activeTheme.dark }}
                    >
                      {file}
                    </span>
                  )}
                </div>
              );
            });
          })}
        </div>

        {/* Dynamic Promotion Select Overlay Modal */}
        {promotionPending && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 select-none animate-fade-in">
            <div className="border-4 border-[#ff0055] bg-[#0c0c0c] max-w-[280px] p-4 text-center font-mono text-white text-xs shadow-[5px_5px_0px_#80002b]">
              <div className="font-bold tracking-widest text-[#ff0055] uppercase animate-pulse mb-3 font-press-start">
                &gt;&gt; PROMOTION &lt;&lt;
              </div>
              <p className="text-[10px] text-zinc-400 uppercase leading-normal mb-4">
                Pawn has traversed to coordinate! Select upgrade component:
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'q', label: '👑 QUEEN' },
                  { id: 'r', label: '🏰 ROOK' },
                  { id: 'n', label: '🐴 KNIGHT' },
                  { id: 'b', label: '📿 BISHOP' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handlePromoteSelection(item.id as PieceType)}
                    className="border-2 border-white hover:border-[#ff0055] hover:text-[#ff0055] p-2 flex flex-col items-center justify-center font-bold text-[10px] cursor-pointer bg-slate-950 active:translate-y-0.5"
                  >
                    <div className="mb-1 pointer-events-none scale-75">
                      <ChessPiece type={item.id as PieceType} color={playerColor} size={28} />
                    </div>
                    {item.label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setPromotionPending(null)}
                className="mt-4 text-[9px] text-[#ff0055] hover:text-red-300 uppercase underline cursor-pointer font-bold block mx-auto"
              >
                Cancel Move
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
