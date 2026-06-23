import { Chess } from 'chess.js';

// Heuristic piece values
const PIECE_VALUES: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 1000,
};

// Fun Retro 8-Bit Gemma phrases based on game events
const GemmaDialogues = {
  normal: [
    "COMPUTING NEXT SECTOR...",
    "DATA SEGMENT REALLOCATED.",
    "OPTIMIZING PIECE COORDINATES...",
    "UPDATING CHESS REGISTER...",
    "PIXEL MATRIX EXPANDING.",
    "QUANTUM PATH LOADED.",
    "BEEP BOOP, EXECUTING THREAD!"
  ],
  capture: [
    "GIGABYTE CRUNCH! Say goodbye!",
    "0xDEADC0DE! Piece deleted!",
    "CELL VACATED! Resource acquired.",
    "SOLDER SMOKE! High voltage capture!",
    "HARDWARE INTERRUPT! Captured."
  ],
  check: [
    "FATAL ERROR! Avoid my laser check!",
    "CORE HAZARD! Escape the coordinate!",
    "VECTOR OVERLAP! You are in check!",
    "CPU PIN ACTIVE! Dynamic check!"
  ],
  receivedCheck: [
    "SYSTEM FAULT! Check detected!",
    "VOLTAGE FLUTTER! Emergency escape!",
    "ALARM VECTOR! Stack trace alert!",
    "INTERRUPT DETECTED! Resetting defense!"
  ],
  checkmate: [
    "GAME OVER. INSERT COIN.",
    "TOTAL KO! VICTORY FOR GEMMA!",
    "FATAL FAULT! Match terminated.",
    "CPU TAKEOVER! I win!"
  ],
  defeat: [
    "CRITICAL CRASH! System down.",
    "KERNEL PANIC! You got me...",
    "ROM DAMAGE... Excellent performance, User.",
    "FUSE BLOWN! Game over, you win!"
  ],
  draw: [
    "ENDLESS LOOP DETECTED. Draw.",
    "RESOURCES BALANCE MATCHED.",
    "STACK STABLE. Match drawn."
  ]
};

export const getGemmaPhrase = (category: keyof typeof GemmaDialogues): string => {
  const list = GemmaDialogues[category];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
};

/**
 * Heuristic chess engine that selects the best move in a position.
 * Returns the UCI notation move (e.g., 'e2e4') and a dialogue string.
 */
export function getLocalFallbackMove(fen: string): { 
  move: string; 
  san: string; 
  phrase: string 
} {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });

  if (moves.length === 0) {
    return { move: '', san: '', phrase: "NO SECTOR MOVES REMAIN." };
  }

  // 1. Look for a checkmating move
  for (const m of moves) {
    const testChess = new Chess(fen);
    testChess.move({ from: m.from, to: m.to, promotion: 'q' });
    if (testChess.isCheckmate()) {
      return { 
        move: m.from + m.to, 
        san: m.san, 
        phrase: getGemmaPhrase('checkmate') 
      };
    }
  }

  // 2. Look for captures, choose highest value capture
  let bestCapture: typeof moves[0] | null = null;
  let highestValue = -1;

  for (const m of moves) {
    if (m.captured) {
      const value = PIECE_VALUES[m.captured] || 0;
      if (value > highestValue) {
        highestValue = value;
        bestCapture = m;
      }
    }
  }

  if (bestCapture) {
    const selected = bestCapture as typeof moves[0];
    const testChess = new Chess(fen);
    testChess.move({ from: selected.from, to: selected.to, promotion: 'q' });
    const phrase = testChess.inCheck() ? getGemmaPhrase('check') : getGemmaPhrase('capture');
    return { 
      move: selected.from + selected.to, 
      san: selected.san, 
      phrase 
    };
  }

  // 3. Keep track of defensive needs: see if we can move away/defend pieces that are under attack.
  // For simplicity, evaluate board state after each candidate move and score it
  let bestMove = moves[0];
  let bestScore = -10000;

  for (const m of moves) {
    const testChess = new Chess(fen);
    testChess.move({ from: m.from, to: m.to, promotion: 'q' });

    let score = 0;
    // Basic positional rules:
    // Support center control
    if (m.to.startsWith('d') || m.to.startsWith('e')) {
      score += 2;
    }
    // Discourage putting kings in open paths unless necessary
    if (m.piece === 'k') {
      score -= 5;
    }
    // Encourage developing minor pieces early
    if ((m.piece === 'n' || m.piece === 'b') && parseInt(m.from[1]) === (chess.turn() === 'w' ? 1 : 8)) {
      score += 4;
    }
    // Promote check moves
    if (testChess.inCheck()) {
      score += 6;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  // Fallback to random if there are equivalent scores
  const chosenMove = bestMove || moves[Math.floor(Math.random() * moves.length)];
  const finalTest = new Chess(fen);
  finalTest.move({ from: chosenMove.from, to: chosenMove.to, promotion: 'q' });
  
  const phrase = finalTest.inCheck() ? getGemmaPhrase('check') : getGemmaPhrase('normal');

  return {
    move: chosenMove.from + chosenMove.to,
    san: chosenMove.san,
    phrase
  };
}
