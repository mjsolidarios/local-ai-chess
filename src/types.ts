export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface GameSettings {
  lmStudioUrl: string;
  modelName: string;
  playerColor: Color;
  soundEnabled: boolean;
  thinkingDelayMs: number;
}

export interface MoveLog {
  san: string;
  from: string;
  to: string;
  color: Color;
  piece: PieceType;
  captured?: PieceType;
  dialogue?: string;
  timestamp: string;
}

export interface EngineStatus {
  isOnline: boolean;
  checking: boolean;
  error?: string;
}
