import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import RetroSound from './utils/sound';
import { GameSettings as SettingsType, MoveLog, EngineStatus, PieceType, Color } from './types';
import { ChessBoard, BoardTheme } from './components/ChessBoard';
import { GemmaDialogue } from './components/GemmaDialogue';
import { GameSettings } from './components/GameSettings';
import { MoveHistory } from './components/MoveHistory';
import { getLocalFallbackMove } from './utils/engine';

// Standard storage keys
const SETTINGS_KEY = '8bit_chess_settings_v1';

const DEFAULT_SETTINGS: SettingsType = {
  lmStudioUrl: 'http://localhost:1234/v1',
  modelName: 'gemma',
  playerColor: 'w',
  soundEnabled: true,
  thinkingDelayMs: 1500,
};

export default function App() {
  // Core chess instance (ref so it survives updates without resetting current match state)
  const chessRef = useRef<Chess>(new Chess());
  
  // Game state trigger to force re-render when chessRef updates
  const [boardUpdateKey, setBoardUpdateKey] = useState<number>(0);
  
  // Settings
  const [settings, setSettings] = useState<SettingsType>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEFAULT_SETTINGS;
  });

  // Match info
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [logs, setLogs] = useState<MoveLog[]>([]);
  
  // AI State
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [dialogueText, setDialogueText] = useState<string>(
    'WELCOME USER! POWER UP LM STUDIO IN YOUR ENVIRONMENT CODE, CHOOSE THE PORT AND LOAD THE GEMMA MODEL TO SYNC NEURAL CHESSPLAY.'
  );
  
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    isOnline: false,
    checking: false,
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Check connection to LM Studio on load
  useEffect(() => {
    probeLMStudioConnection();
  }, [settings.lmStudioUrl]);

  // Auto trigger Gemma move if it's AI's turn
  useEffect(() => {
    const chess = chessRef.current;
    if (chess.isGameOver()) return;

    const currentTurn = chess.turn(); // 'w' or 'b'
    const isPlayerTurn = currentTurn === settings.playerColor;

    if (!isPlayerTurn && !isThinking) {
      // Simulate think delay prefix
      setIsThinking(true);
      const timer = setTimeout(() => {
        executeGemmaTurn();
      }, settings.thinkingDelayMs);

      return () => clearTimeout(timer);
    }
  }, [boardUpdateKey, settings.playerColor]);

  // Adventure RPG Mechanics State
  const [playerClass, setPlayerClass] = useState<'mage' | 'paladin' | 'rogue'>('mage');
  const [spellResource, setSpellResource] = useState<number>(3); // Max 10, start at 3
  const [gemmaResource, setGemmaResource] = useState<number>(3); // Max 10, start at 3
  const [activeSpell, setActiveSpell] = useState<string | null>(null); // e.g. 'fireball', 'teleport', 'freeze', 'shield', 'swap', 'resurrect'
  const [frozenSquares, setFrozenSquares] = useState<Record<string, number>>({}); // coords -> turns left
  const [shieldedSquares, setShieldedSquares] = useState<string[]>([]); // coords protected
  const [teleportSource, setTeleportSource] = useState<string | null>(null); // used for source-selection of two-step spells
  const [resurrectPieceType, setResurrectPieceType] = useState<PieceType | null>(null); // selected piece to resurrect

  const decrementFrozenTurns = () => {
    setFrozenSquares((prev) => {
      const next: Record<string, number> = {};
      for (const [coord, count] of Object.entries(prev)) {
        const val = count as number;
        if (val > 1) {
          next[coord] = val - 1;
        }
      }
      return next;
    });
  };

  const forceEndTurn = () => {
    const chess = chessRef.current;
    const fen = chess.fen();
    const parts = fen.split(' ');
    // Flip active color from parts[1]: 'w' -> 'b', 'b' -> 'w'
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    if (parts[1] === 'w') {
      parts[5] = (parseInt(parts[5] || '1') + 1).toString();
    }
    const nextFen = parts.join(' ');
    chess.load(nextFen);

    decrementFrozenTurns();
    setBoardUpdateKey((prev) => prev + 1);
  };

  // Check connection probe
  const probeLMStudioConnection = async () => {
    setEngineStatus((prev) => ({ ...prev, checking: true }));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      
      const res = await fetch(`${settings.lmStudioUrl}/models`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        // Discovered active model name
        let discoveredModel = settings.modelName;
        if (data && data.data && data.data.length > 0) {
          discoveredModel = data.data[0].id;
        }

        setEngineStatus({ isOnline: true, checking: false });
        setSettings((prev) => ({ ...prev, modelName: discoveredModel }));
        setDialogueText(`LINK SYNCED 🟢! Loaded model: "${discoveredModel}". I am ready to challenge you in 8-bit space!`);
      } else {
        throw new Error('HTTP Status invalid');
      }
    } catch (e) {
      setEngineStatus({ isOnline: false, checking: false, error: 'Offline' });
      // Don't override if there was already dialogue
      if (dialogueText.includes('WELCOME') || dialogueText.includes('LINK SYNCED')) {
        setDialogueText('No local LM Studio found on localhost. Running local heuristic CPU backup.');
      }
    }
  };

  // trigger Gemma's Void Boss active powers
  const triggerGemmaSpell = (): boolean => {
    const chess = chessRef.current;
    if (gemmaResource < 4 || Math.random() > 0.35) return false;

    const filesList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranksList = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const spellChoices: string[] = ['drain'];
    
    if (gemmaResource >= 5) spellChoices.push('spawn');
    
    const playerSquareList: string[] = [];
    const cells = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = cells[r][c];
        if (p && p.color === settings.playerColor && p.type !== 'k') {
          playerSquareList.push(filesList[c] + ranksList[r]);
        }
      }
    }
    if (playerSquareList.length > 0) {
      spellChoices.push('vaporize');
    }

    const chosenSpell = spellChoices[Math.floor(Math.random() * spellChoices.length)];

    if (chosenSpell === 'spawn') {
      const targetRanks = settings.playerColor === 'w' ? ['5', '6'] : ['3', '4'];
      const emptySquares: string[] = [];
      for (const r of targetRanks) {
        for (const f of filesList) {
          if (!chess.get((f + r) as any)) {
            emptySquares.push((f + r));
          }
        }
      }
      if (emptySquares.length > 0) {
        const randomSq = emptySquares[Math.floor(Math.random() * emptySquares.length)];
        chess.put({ type: 'p', color: settings.playerColor === 'w' ? 'b' : 'w' }, randomSq as any);
        setGemmaResource((prev) => Math.max(0, prev - 5));
        setDialogueText(`👾 VOID SPELL: GLITCH CLONE! Gemma generated an extra Pawn on sector ${randomSq}!`);
        RetroSound.playDefeat(settings.soundEnabled); // explosion sound
        
        // Advance turn since spell is played
        decrementFrozenTurns();
        // Since turn flipped back to player, let chess naturally pass
        const parts = chess.fen().split(' ');
        parts[1] = parts[1] === 'w' ? 'b' : 'w';
        if (parts[1] === 'w') parts[5] = (parseInt(parts[5] || '1') + 1).toString();
        chess.load(parts.join(' '));
        
        setIsThinking(false);
        setBoardUpdateKey((prev) => prev + 1);
        return true;
      }
    } else if (chosenSpell === 'vaporize' && playerSquareList.length > 0) {
      const randomSq = playerSquareList[Math.floor(Math.random() * playerSquareList.length)];
      const piece = chess.get(randomSq as any);
      if (piece) {
        chess.remove(randomSq as any);
        setGemmaResource((prev) => Math.max(0, prev - 4));
        setDialogueText(`👾 VOID SPELL: DATA INTEGRATION EXPLOSION! Gemma vaporized your ${piece.type.toUpperCase()} on square ${randomSq}!`);
        RetroSound.playDefeat(settings.soundEnabled);
        
        // Pass turn
        decrementFrozenTurns();
        const parts = chess.fen().split(' ');
        parts[1] = parts[1] === 'w' ? 'b' : 'w';
        if (parts[1] === 'w') parts[5] = (parseInt(parts[5] || '1') + 1).toString();
        chess.load(parts.join(' '));
        
        setIsThinking(false);
        setBoardUpdateKey((prev) => prev + 1);
        return true;
      }
    } else if (chosenSpell === 'drain') {
      setSpellResource((prev) => Math.max(0, prev - 3));
      setGemmaResource((prev) => Math.max(0, prev - 4));
      setDialogueText(`👾 VOID SPELL: RESOURCE COMPILER DAMPENER! Gemma disrupted your power, draining 3 resources!`);
      RetroSound.playCheck(settings.soundEnabled);
      
      // Pass turn
      decrementFrozenTurns();
      const parts = chess.fen().split(' ');
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      if (parts[1] === 'w') parts[5] = (parseInt(parts[5] || '1') + 1).toString();
      chess.load(parts.join(' '));
      
      setIsThinking(false);
      setBoardUpdateKey((prev) => prev + 1);
      return true;
    }

    return false;
  };

  // Gemma AI execution turn
  const executeGemmaTurn = async () => {
    const chess = chessRef.current;
    
    // Check if Gemma plays a boss spell before computing moves!
    if (triggerGemmaSpell()) {
      return;
    }

    const currentFen = chess.fen();
    const possibleMoves = chess.moves({ verbose: true });
    if (possibleMoves.length === 0) {
      setIsThinking(false);
      return;
    }

    // Filter out starting coordinates that are under frozen lock!
    const frozenCoords = Object.keys(frozenSquares).filter((k) => frozenSquares[k] > 0);
    const nonFrozenMoves = possibleMoves.filter((m) => !frozenCoords.includes(m.from));

    if (nonFrozenMoves.length === 0) {
      setDialogueText("❄️ GEMMA IS INHIBITED! All of Gemma's active units are locked in glacial ice barrier!");
      const parts = chess.fen().split(' ');
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      if (parts[1] === 'w') parts[5] = (parseInt(parts[5] || '1') + 1).toString();
      chess.load(parts.join(' '));
      
      decrementFrozenTurns();
      setIsThinking(false);
      setBoardUpdateKey((prev) => prev + 1);
      return;
    }

    const legalListStr = nonFrozenMoves.map((m) => `${m.san} (${m.from}${m.to})`).join(', ');

    // Let's decide if online or fallback
    let moveUci = '';
    let moveSan = '';
    let comment = '';

    if (engineStatus.isOnline) {
      try {
        const prompt = `You are a retro pixel-game AI opponent playing Chess named GEMMA. 
Current Board FEN: "${currentFen}"
You are playing as ${chess.turn() === 'w' ? 'WHITE' : 'BLACK'} pieces.
Here is the list of all legal moves in this board state: [${legalListStr}].

Choose EXACTLY ONE move from that list. Do not select any move that is not listed.
You must respond with a JSON object in this exact schema, without any markdown wrappers:
{
  "explanation": "A short, 1-sentence retro 8-bit robotic or space-invader dialogue",
  "selectedMove": "the chosen coordinate string, e.g. e2e4"
}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Fail fast and fallback

        const response = await fetch(`${settings.lmStudioUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: settings.modelName,
            messages: [
              { role: 'system', content: 'You are a helpful retro arcade gaming chess rival.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
        });

        clearTimeout(timeoutId);
        
        if (response.ok) {
          const resData = await response.json();
          const content = resData?.choices?.[0]?.message?.content || '';
          
          // Custom robust parsing
          const parsed = parseGemmaResponse(content, possibleMoves);
          if (parsed) {
            moveUci = parsed.from + parsed.to;
            moveSan = parsed.san;
            comment = parsed.phrase;
          } else {
            console.warn("Gemma responded but move was unavailable or illegible. Fallback.");
            throw new Error("No parseable move");
          }
        } else {
          throw new Error("Local query un-successful");
        }
      } catch (err) {
        console.warn("LM Studio query error, running fallback chess engine...", err);
        // Instant micro fallback
        const fbObj = getLocalFallbackMove(currentFen);
        moveUci = fbObj.move;
        moveSan = fbObj.san;
        comment = fbObj.phrase + " (fallback cpu)";
      }
    } else {
      // Local fallback immediate
      const fbObj = getLocalFallbackMove(currentFen);
      moveUci = fbObj.move;
      moveSan = fbObj.san;
      comment = fbObj.phrase;
    }

    // Execute Move on Board
    if (moveUci && moveUci.length >= 4) {
      const source = moveUci.slice(0, 2);
      const target = moveUci.slice(2, 4);
      
      try {
        const mv = chess.move({ from: source, to: target, promotion: 'q' });
        
        // Check if target was shielded with a Divine Covenant!
        const wasShielded = shieldedSquares.includes(target);
        if (wasShielded && mv.captured) {
          // DIVINE BARRIER ABSORBS AND COUNTERS!
          // Remove attacker and restore player's captured defender
          chess.remove(target);
          chess.put({ type: mv.captured, color: settings.playerColor }, target as any);
          
          setShieldedSquares((prev) => prev.filter((s) => s !== target));
          comment = `🛡️ COVENANT REFLECTION! Gemma's attacking ${mv.piece.toUpperCase()} was disintegrated by your Divine Aegis on ${target}!`;
          RetroSound.playCheck(settings.soundEnabled);
        } else {
          // Play audio feed based on capture or normal move
          if (mv.captured) {
            RetroSound.playCapture(settings.soundEnabled);
          } else {
            RetroSound.playMove(settings.soundEnabled);
          }
        }

        // Add history log
        const newLog: MoveLog = {
          san: mv.san,
          from: source,
          to: target,
          color: settings.playerColor === 'w' ? 'b' : 'w',
          piece: mv.piece as PieceType,
          captured: mv.captured ? (mv.captured as PieceType) : undefined,
          dialogue: comment,
          timestamp: new Date().toLocaleTimeString(),
        };

        setLogs((prev) => [...prev, newLog]);
        setLastMove({ from: source, to: target });
        setDialogueText(comment);

        // Gemma resource updates
        setGemmaResource((prev) => {
          let added = 1;
          if (mv.captured && !wasShielded) added += 2;
          if (chess.isCheckmate() || chess.inCheck()) added += 2;
          return Math.min(10, prev + added);
        });
        
        // Alert checks!
        if (chess.inCheck()) {
          RetroSound.playCheck(settings.soundEnabled);
          if (chess.isCheckmate()) {
            RetroSound.playDefeat(settings.soundEnabled);
            setDialogueText("CORE SHUTDOWN! GAME OVER, USER VICTOR!");
          } else {
            setDialogueText("SYSTEM WARNING! INTERRUPT VECTOR CHECK!");
          }
        }
        
      } catch (e) {
        console.error("Illegal move applied from Gemma, resolving safely", e);
      }
    }

    setIsThinking(false);
    setBoardUpdateKey((prev) => prev + 1);
  };

  // Helper response parsing
  const parseGemmaResponse = (text: string, legalList: any[]) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const moveChoice = (parsed.selectedMove || parsed.moveChoice || parsed.move || '').toLowerCase().trim();
        
        // Search UCI coords
        let targetLegal = legalList.find(m => (m.from + m.to) === moveChoice || m.san.toLowerCase() === moveChoice);
        if (targetLegal) {
          return { from: targetLegal.from, to: targetLegal.to, san: targetLegal.san, phrase: parsed.explanation || "" };
        }
      }
    } catch (e) { /* fall to scanning keywords */ }

    // Text scan keywords
    for (const m of legalList) {
      const coords = m.from + m.to;
      const searchTerms = [coords, m.san];
      for (const term of searchTerms) {
        const escTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const rx = new RegExp(`\\b${escTerm}\\b`, 'i');
        if (rx.test(text)) {
          return { from: m.from, to: m.to, san: m.san, phrase: text.slice(0, 120) };
        }
      }
    }
    return null;
  };

  const handleSpellCast = (square: string) => {
    const chess = chessRef.current;
    if (chess.isGameOver()) return;
    if (chess.turn() !== settings.playerColor) return;

    const cell = chess.get(square as any);

    if (activeSpell === 'fireball') {
      if (spellResource < 4) {
        setDialogueText("INSUFFICIENT SPELL POWER! Fireball requires 4 Resource cells.");
        setActiveSpell(null);
        return;
      }
      if (cell && cell.color !== settings.playerColor && cell.type !== 'k') {
        chess.remove(square as any);
        setSpellResource(prev => Math.max(0, prev - 4));
        setActiveSpell(null);
        setDialogueText(`☄️ FIREBALL STRUCK! Vaporized enemy ${cell.type.toUpperCase()} on square ${square}!`);
        RetroSound.playDefeat(settings.soundEnabled); // explosion!
        forceEndTurn();
      } else {
        setDialogueText("INVALID FIREBALL TARGET! Choose any active enemy piece (except King).");
      }
    } else if (activeSpell === 'teleport') {
      if (spellResource < 3) {
        setDialogueText("INSUFFICIENT SPELL POWER! Teleport requires 3 Resource cells.");
        setActiveSpell(null);
        setTeleportSource(null);
        return;
      }
      if (!teleportSource) {
        if (cell && cell.color === settings.playerColor) {
          setTeleportSource(square);
          setDialogueText(`🌌 TELEPORT SOURCE PINNED: ${cell.type.toUpperCase()} on ${square}. Click any empty destination tile!`);
          RetroSound.playMove(settings.soundEnabled);
        } else {
          setDialogueText("INVALID SELECTOR! Click one of your own active pieces to teleport.");
        }
      } else {
        if (!cell) {
          const piece = chess.get(teleportSource as any);
          if (piece) {
            chess.remove(teleportSource as any);
            chess.put({ type: piece.type, color: piece.color }, square as any);
            setSpellResource(prev => Math.max(0, prev - 3));
            setActiveSpell(null);
            setTeleportSource(null);
            setDialogueText(`🌌 COORDINATE WARPED! Translocated ${piece.type.toUpperCase()} to ${square}!`);
            RetroSound.playVictory(settings.soundEnabled);
            forceEndTurn();
          }
        } else {
          setDialogueText("COLLISION INTERRUPTED! Target square must be empty to teleport.");
        }
      }
    } else if (activeSpell === 'freeze') {
      if (spellResource < 3) {
        setDialogueText("INSUFFICIENT SPELL POWER! Freeze requires 3 Resource cells.");
        setActiveSpell(null);
        return;
      }
      if (cell && cell.color !== settings.playerColor) {
        setFrozenSquares(prev => ({ ...prev, [square]: 2 }));
        setSpellResource(prev => Math.max(0, prev - 3));
        setActiveSpell(null);
        setDialogueText(`❄️ GLACIAL COLD! Frozen enemy ${cell.type.toUpperCase()} on ${square} for 2 turns!`);
        RetroSound.playCheck(settings.soundEnabled);
        forceEndTurn();
      } else {
        setDialogueText("INVALID FREEZE TARGET! Choose any active enemy piece.");
      }
    } else if (activeSpell === 'shield') {
      if (spellResource < 3) {
        setDialogueText("INSUFFICIENT SPELL POWER! Divine Shield requires 3 Resource cells.");
        setActiveSpell(null);
        return;
      }
      if (cell && cell.color === settings.playerColor) {
        setShieldedSquares(prev => [...prev, square]);
        setSpellResource(prev => Math.max(0, prev - 3));
        setActiveSpell(null);
        setDialogueText(`🛡️ DIVINE SHIELD ENGAGED! Unit on ${square} is blessed with defensive barrier!`);
        RetroSound.playCheck(settings.soundEnabled);
        forceEndTurn();
      } else {
        setDialogueText("INVALID BARRIER BENEFACTOR! Select one of your own pieces.");
      }
    } else if (activeSpell === 'resurrect') {
      if (spellResource < 5) {
        setDialogueText("INSUFFICIENT SPELL POWER! Resurrect requires 5 Resource cells.");
        setActiveSpell(null);
        setResurrectPieceType(null);
        return;
      }
      if (!resurrectPieceType) {
        setDialogueText("NULL PROFILE SELECTOR! Select a captured piece to revive first.");
        return;
      }
      const allowedRanks = settings.playerColor === 'w' ? ['1', '2'] : ['7', '8'];
      const isStartingRank = allowedRanks.includes(square[1]);
      if (!cell && isStartingRank) {
        chess.put({ type: resurrectPieceType, color: settings.playerColor }, square as any);
        setSpellResource(prev => Math.max(0, prev - 5));
        setActiveSpell(null);
        setResurrectPieceType(null);
        setDialogueText(`😇 DIVINE INTERVENTION! Resurrected friendly ${resurrectPieceType.toUpperCase()} onto ${square}!`);
        RetroSound.playVictory(settings.soundEnabled);
        forceEndTurn();
      } else {
        setDialogueText(`SLOT ERROR! Resurrect must target empty squares on your starting ranks: ${allowedRanks.join('/')}`);
      }
    } else if (activeSpell === 'swap') {
      if (spellResource < 4) {
        setDialogueText("INSUFFICIENT SPELL POWER! Smoke Bomb Swap requires 4 Resource cells.");
        setActiveSpell(null);
        setTeleportSource(null);
        return;
      }
      if (!teleportSource) {
        if (cell && cell.color === settings.playerColor) {
          setTeleportSource(square);
          setDialogueText(`🔮 SWAP INITIATOR SELECT: ${cell.type.toUpperCase()} on ${square}. Choose target piece to swap!`);
          RetroSound.playMove(settings.soundEnabled);
        } else {
          setDialogueText("INVALID SELECTOR! Select one of your own pieces.");
        }
      } else {
        const initiator = chess.get(teleportSource as any);
        if (cell && initiator && cell.type !== 'k') {
          chess.remove(teleportSource as any);
          chess.remove(square as any);
          chess.put({ type: cell.type, color: cell.color }, teleportSource as any);
          chess.put({ type: initiator.type, color: initiator.color }, square as any);
          setSpellResource(prev => Math.max(0, prev - 4));
          setActiveSpell(null);
          setTeleportSource(null);
          setDialogueText(`🔮 MOLECULAR SWAP COMPLETE! Exchanged coordinates of ${initiator.type.toUpperCase()}(${teleportSource}) and ${cell.type.toUpperCase()}(${square})!`);
          RetroSound.playVictory(settings.soundEnabled);
          forceEndTurn();
        } else {
          setDialogueText("GRID DISRUPTION EXCEPTION! Target must contain another piece (except King).");
        }
      }
    }
  };

  // Handle human move square clicks
  const handleSquareSelection = (square: string) => {
    const chess = chessRef.current;
    
    // Check game active and correct turn
    if (chess.isGameOver()) return;
    if (chess.turn() !== settings.playerColor) return;

    if (activeSpell) {
      handleSpellCast(square);
      return;
    }

    const cell = chess.get(square as any);

    // If square is already selected, click same deselects
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Capture move target executes the match move if clicked square stands in highlighted paths
    if (selectedSquare && validMoves.includes(square)) {
      executePlayerMove(selectedSquare, square);
      return;
    }

    // Select piece
    if (cell && cell.color === settings.playerColor) {
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as any, verbose: true }) as any[];
      setValidMoves(moves.map((m) => m.to));
      // Light feedback move touch
      RetroSound.playMove(settings.soundEnabled);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // Action processor for player legal moves
  const executePlayerMove = (from: string, to: string, promotePiece: PieceType = 'q') => {
    const chess = chessRef.current;
    try {
      const mv = chess.move({ from, to, promotion: promotePiece });
      
      // Play retro audio
      if (mv.captured) {
        RetroSound.playCapture(settings.soundEnabled);
      } else {
        RetroSound.playMove(settings.soundEnabled);
      }

      // Add to log
      const newLog: MoveLog = {
        san: mv.san,
        from,
        to,
        color: settings.playerColor,
        piece: mv.piece as PieceType,
        captured: mv.captured ? (mv.captured as PieceType) : undefined,
        timestamp: new Date().toLocaleTimeString(),
      };

      setLogs((prev) => [...prev, newLog]);
      setLastMove({ from, to });
      setSelectedSquare(null);
      setValidMoves([]);

      // RPG resource updates
      setSpellResource((prev) => {
        let added = 1;
        if (mv.captured) added += 2;
        if (chess.isCheckmate() || chess.inCheck()) added += 2;
        return Math.min(10, prev + added);
      });

      decrementFrozenTurns();

      // Prompt Dialogue
      if (chess.inCheck()) {
        RetroSound.playCheck(settings.soundEnabled);
        if (chess.isCheckmate()) {
          RetroSound.playVictory(settings.soundEnabled);
          setDialogueText("CONGRATULATIONS USER! YOU INFLICTED CHECKMATE!");
        } else {
          setDialogueText("SYSTEM WARNING! INTERRUPT VECTOR REGISTER ALERT!");
        }
      } else {
        setDialogueText("Computing CPU strategy response...");
      }

    } catch (e) {
      console.warn("Execution error", e);
    }

    setBoardUpdateKey((prev) => prev + 1);
  };

  const handlePromoteAndMove = (from: string, to: string, promoteTo: PieceType) => {
    executePlayerMove(from, to, promoteTo);
  };

  // Mathematical Captured statistics
  const getBoardCaptures = () => {
    const chess = chessRef.current;
    
    const startCounts: Record<string, number> = {
      wp: 8, wn: 2, wb: 2, wr: 2, wq: 1,
      bp: 8, bn: 2, bb: 2, br: 2, bq: 1
    };
    
    const currents: Record<string, number> = {
      wp: 0, wn: 0, wb: 0, wr: 0, wq: 0,
      bp: 0, bn: 0, bb: 0, br: 0, bq: 0
    };

    const grid = chess.board();
    for (const row of grid) {
      for (const square of row) {
        if (square) {
          const key = square.color + square.type;
          currents[key] = (currents[key] || 0) + 1;
        }
      }
    }

    const whiteCaptured: PieceType[] = []; // Black pieces captured by White player
    const blackCaptured: PieceType[] = []; // White pieces captured by Black AI

    // Calculate Black pieces captured
    ['p', 'n', 'b', 'r', 'q'].forEach((t) => {
      const diff = (startCounts['b' + t] || 0) - (currents['b' + t] || 0);
      for (let i = 0; i < diff; i++) {
        whiteCaptured.push(t as PieceType);
      }
    });

    // Calculate White pieces captured
    ['p', 'n', 'b', 'r', 'q'].forEach((t) => {
      const diff = (startCounts['w' + t] || 0) - (currents['w' + t] || 0);
      for (let i = 0; i < diff; i++) {
        blackCaptured.push(t as PieceType);
      }
    });

    return {
      whiteCaptured: settings.playerColor === 'w' ? whiteCaptured : blackCaptured,
      blackCaptured: settings.playerColor === 'w' ? blackCaptured : whiteCaptured,
    };
  };

  // Reset and remake Game core FEN
  const handleGameReset = () => {
    chessRef.current = new Chess();
    setLogs([]);
    setLastMove(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setDialogueText("SYSTEM REBOOT! Insert Coin to initiate new Chess Match.");
    
    // Core RPG Reset
    setSpellResource(3);
    setGemmaResource(3);
    setFrozenSquares({});
    setShieldedSquares([]);
    setActiveSpell(null);
    setTeleportSource(null);
    setResurrectPieceType(null);

    if (settings.soundEnabled) {
      RetroSound.playVictory(settings.soundEnabled);
    }
    setBoardUpdateKey((prev) => prev + 1);
  };

  const handleUndoMove = () => {
    const chess = chessRef.current;
    if (logs.length < 1) return;
    
    // Undo both human & computer moves if it's currently the human's turn. 
    // Otherwise if thinking or computer's Turn, undo once to bring it back to active human choice.
    const isPlayerTurn = chess.turn() === settings.playerColor;
    if (isPlayerTurn && logs.length >= 2) {
      chess.undo();
      chess.undo();
      setLogs((prev) => prev.slice(0, -2));
    } else {
      chess.undo();
      setLogs((prev) => prev.slice(0, -1));
    }
    
    setLastMove(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setDialogueText("SEGMENT BACKTRACKED! Move reverted successfully.");
    RetroSound.playMove(settings.soundEnabled);
    setBoardUpdateKey((prev) => prev + 1);
  };

  const { whiteCaptured, blackCaptured } = getBoardCaptures();
  const currentBoard = chessRef.current.board();
  const isGameOver = chessRef.current.isGameOver();
  const isDraw = chessRef.current.isDraw();
  const isCheckmate = chessRef.current.isCheckmate();
  const activeTurn = chessRef.current.turn();
  const isPlayerTurn = activeTurn === settings.playerColor;

  return (
    <div className="min-h-screen bg-[#0c0c0c] py-6 px-4 md:px-8 text-[#f0f0f0] select-none relative font-mono overflow-x-hidden">
      {/* Grid Decoration Background */}
      <div 
        className="absolute inset-0 opacity-[0.08] pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }}
      ></div>

      <div className="max-w-6xl mx-auto flex flex-col gap-6 select-none relative z-10">
        
        {/* Header Section from Immersive UI design */}
        <header className="h-16 border-b-4 border-[#333] bg-[#1a1a1a] flex items-center justify-between px-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-[#ff0055] shadow-[3px_3px_0px_#80002b] animate-pulse"></div>
            <h1 className="text-[12px] md:text-lg font-bold tracking-tighter uppercase font-press-start flex items-center gap-1 text-white">
              Pixel Chess <span className="text-[#ff0055] font-press-start">v1.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-[#666] uppercase font-bold tracking-widest">Opponent</span>
              <span className="text-[#00ff41] text-xs md:text-sm font-bold tracking-wide">GEMMA-4 (LM STUDIO)</span>
            </div>
            <div className={`w-8 h-8 border-2 ${engineStatus.isOnline ? 'border-[#00ff41] bg-[#00ff4110]' : 'border-amber-400 bg-amber-400/10'} flex items-center justify-center`}>
              <div className={`w-4 h-4 ${engineStatus.isOnline ? 'bg-[#00ff41]' : 'bg-amber-400'} ${isThinking ? 'animate-ping' : 'animate-pulse'}`}></div>
            </div>
          </div>
        </header>

        {/* Dynamic Game Ending Status Overlay Banner */}
        {isGameOver && (
          <div className="border-4 border-[#ff0055] bg-[#ff005515] p-4 text-center shadow-[4px_4px_0px_#80002b] animate-pulse select-none">
            <h2 className="text-sm md:text-lg font-bold text-white uppercase tracking-widest font-press-start">
              --- COMBAT COMPLETED ---
            </h2>
            <p className="text-xs md:text-sm text-[#00ff41] font-bold leading-normal mt-1">
              {isCheckmate ? (
                isPlayerTurn ? 'FATAL LOSS! BLACK GEMMA DEFEATED YOU.' : '🏆 PERFECT WIN! YOU DEFEATED CHIP-GEMMA!'
              ) : isDraw ? (
                'LOOP BALANCE DEADLOCK! DRAW REGISTERED.'
              ) : (
                'MATCH TERMINATED'
              )}
            </p>
            <button
              onClick={handleGameReset}
              className="mt-3 px-4 py-1 border-2 border-[#ff0055] text-white text-xs uppercase font-bold hover:bg-[#ff0055] hover:text-white transition-colors cursor-pointer active:translate-y-0.5"
            >
              INSERT COIN / REMATCH
            </button>
          </div>
        )}

        {/* Secondary Grid Split Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Main Game Chessboard */}
          <section className="lg:col-span-7 flex flex-col items-center justify-center bg-[#111111]/95 p-4 border-4 border-[#333] relative shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
            {/* Quick scanning line inside card */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30"></div>
            
            <div className="w-full flex items-center justify-between mb-4 text-xs font-bold bg-[#1a1a1a] border-2 border-[#333] p-2 uppercase">
              <div className="flex items-center gap-2 select-none">
                <span className="w-2 h-2 bg-[#00ff41] animate-pulse"></span>
                <span className="text-zinc-500">TURN ACTION:</span>
                <span className={isPlayerTurn ? 'text-[#00ff41]' : 'text-[#ff0055] animate-pulse'}>
                  {isPlayerTurn ? '🎮 USER (PLAY)' : '👾 GEMMA (INFERENCE)'}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500">
                REGISTERS: {logs.length}
              </div>
            </div>

            <ChessBoard
              board={currentBoard}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              playerColor={settings.playerColor}
              isPlayerTurn={isPlayerTurn && !isThinking && !isGameOver}
              onSquareClick={handleSquareSelection}
              onPromoteAndMove={handlePromoteAndMove}
              frozenSquares={frozenSquares}
              shieldedSquares={shieldedSquares}
              activeSpell={activeSpell}
            />

            {/* SPELLBOOK DASHBOARD PANEL */}
            <div className="w-full mt-6 border-4 border-[#333] bg-[#1a1a1a] p-4 text-xs font-mono relative">
              <div className="flex items-center justify-between border-b-2 border-[#333] pb-2 mb-3 flex-wrap gap-2">
                <span className="text-[#00ff41] font-bold uppercase tracking-wider text-[11px] sm:text-xs">🔮 RPG Spellbook &amp; Special Abilities</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setPlayerClass('mage'); setActiveSpell(null); }}
                    className={`px-2 py-0.5 border text-[10px] cursor-pointer ${playerClass === 'mage' ? 'border-[#ff0055] text-white bg-[#ff0055]/20 font-bold' : 'border-zinc-700 text-zinc-500'}`}
                  >
                    MAGE
                  </button>
                  <button 
                    onClick={() => { setPlayerClass('paladin'); setActiveSpell(null); }}
                    className={`px-2 py-0.5 border text-[10px] cursor-pointer ${playerClass === 'paladin' ? 'border-yellow-500 text-white bg-yellow-500/20 font-bold' : 'border-zinc-700 text-zinc-500'}`}
                  >
                    PALADIN
                  </button>
                  <button 
                    onClick={() => { setPlayerClass('rogue'); setActiveSpell(null); }}
                    className={`px-2 py-0.5 border text-[10px] cursor-pointer ${playerClass === 'rogue' ? 'border-cyan-400 text-white bg-cyan-400/20 font-bold' : 'border-zinc-700 text-zinc-500'}`}
                  >
                    ROGUE
                  </button>
                </div>
              </div>

              {/* RESOURCE STATUS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#111] p-3 border-2 border-[#333] mb-4">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold mb-1 uppercase">
                    <span>PLAYER POWER GRIDS ({playerClass.toUpperCase()})</span>
                    <span className="text-white">{spellResource}/10 {playerClass === 'mage' ? '🛡️ MANA' : playerClass === 'paladin' ? '✨ FAITH' : '⚡ ENERGY'}</span>
                  </div>
                  <div className="flex gap-0.5 h-3 bg-[#222] p-0.5 border border-[#444]">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div 
                        key={idx}
                        className={`flex-1 ${
                          idx < spellResource 
                            ? playerClass === 'mage' ? 'bg-[#ff0055]' : playerClass === 'paladin' ? 'bg-yellow-400' : 'bg-cyan-400' 
                            : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold mb-1 uppercase">
                    <span>👿 GEMMA ABYSS FORCE</span>
                    <span className="text-zinc-300">{gemmaResource}/10 VOID CELLS</span>
                  </div>
                  <div className="flex gap-0.5 h-3 bg-[#222] p-0.5 border border-[#444]">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div 
                        key={idx}
                        className={`flex-1 ${idx < gemmaResource ? 'bg-[#ff3300] animate-pulse' : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD SPELLS ACTIVE ROW */}
              {activeSpell && (
                <div className="border border-dashed border-rose-500 bg-rose-950/20 px-3 py-2 text-rose-300 font-bold flex items-center justify-between mb-3 rounded-none animate-pulse flex-wrap gap-2 text-[10px]">
                  <span>🎯 CASTING {activeSpell.toUpperCase()}: CLICK ON ANY CORRESPONDING CELL ON CHESSBOARD TO CAST SPELL...</span>
                  <button 
                    onClick={() => { setActiveSpell(null); setTeleportSource(null); setResurrectPieceType(null); }}
                    className="px-2 py-0.5 bg-rose-950 border border-rose-400 hover:bg-rose-500 hover:text-white transition-all text-[9px] cursor-pointer"
                  >
                    CANCEL CAST
                  </button>
                </div>
              )}

              {/* SPELL CARDS LIST DYNAMIC BASED ON CLASS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {playerClass === 'mage' && (
                  <>
                    {/* Fireball card */}
                    <button 
                      disabled={spellResource < 4 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => setActiveSpell(activeSpell === 'fireball' ? null : 'fireball')}
                      className={`flex flex-col text-left p-3 border-2 transition-all cursor-pointer ${
                        activeSpell === 'fireball' 
                          ? 'bg-[#ff0055]/20 border-[#ff0055] text-white shadow-[0_0_12px_#ff0055]' 
                          : 'bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>☄️ Fireball</span>
                        <span className="text-[#ff0055]">4 MP</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Vaporizes any active enemy Pawn, Knight or Bishop.</p>
                    </button>

                    {/* Teleport card */}
                    <button 
                      disabled={spellResource < 3 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => { setActiveSpell(activeSpell === 'teleport' ? null : 'teleport'); setTeleportSource(null); }}
                      className={`flex flex-col text-left p-3 border-2 transition-all cursor-pointer ${
                        activeSpell === 'teleport' 
                          ? 'bg-[#ff0055]/20 border-[#ff0055] text-white shadow-[0_0_12px_#ff0055]' 
                          : 'bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>🌌 Teleport</span>
                        <span className="text-[#ff0055]">3 MP</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Translocates one friendly piece to any empty cell.</p>
                    </button>

                    {/* Frost Nova card */}
                    <button 
                      disabled={spellResource < 3 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => setActiveSpell(activeSpell === 'freeze' ? null : 'freeze')}
                      className={`flex flex-col text-left p-3 border-2 transition-all cursor-pointer ${
                        activeSpell === 'freeze' 
                          ? 'bg-[#ff0055]/20 border-[#ff0055] text-white shadow-[0_0_12px_#ff0055]' 
                          : 'bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>❄️ Glacial Chill</span>
                        <span className="text-[#ff0055]">3 MP</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Phases out and freezes enemy piece, locking moves for 2 turns.</p>
                    </button>
                  </>
                )}

                {playerClass === 'paladin' && (
                  <>
                    {/* Lay on hands / Resurrect card */}
                    <div className="flex flex-col border-2 border-[#333] bg-[#151515] p-2 leading-relaxed">
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>😇 Resurrect</span>
                        <span className="text-yellow-400">5 Faith</span>
                      </div>
                      
                      {/* Sub-selection of friendly captured pieces */}
                      <div className="flex gap-1 mb-1 mt-1 justify-center flex-wrap">
                        {['q', 'r', 'b', 'n', 'p'].map((type) => {
                          const count = whiteCaptured.filter(p => p === type).length;
                          const isCapturedAvailable = count > 0;
                          
                          return (
                            <button
                              key={type}
                              disabled={!isCapturedAvailable || spellResource < 5 || !isPlayerTurn || isThinking || isGameOver}
                              onClick={() => {
                                setActiveSpell('resurrect');
                                setResurrectPieceType(type as PieceType);
                              }}
                              className={`w-7 h-7 border text-center flex items-center justify-center font-bold font-mono text-[10px] uppercase transition-all ${
                                resurrectPieceType === type
                                  ? 'border-yellow-400 bg-yellow-500/25 text-white shadow-[0_0_8px_#ea580c]'
                                  : isCapturedAvailable
                                    ? 'border-zinc-500 bg-zinc-800 text-yellow-300 hover:bg-zinc-700 cursor-pointer'
                                    : 'border-[#222] bg-[#0c0c0c] text-zinc-700'
                              }`}
                              title={`Click to resurrect captured friendly ${type.toUpperCase()}`}
                            >
                              {type.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight">Revive captured unit to empty slot on starting rank.</p>
                    </div>

                    {/* Divine Shield card */}
                    <button 
                      disabled={spellResource < 3 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => setActiveSpell(activeSpell === 'shield' ? null : 'shield')}
                      className={`flex flex-col text-left p-3 border-2 transition-all cursor-pointer ${
                        activeSpell === 'shield' 
                          ? 'bg-yellow-500/25 border-yellow-400 text-white shadow-[0_0_12px_#fbbf24]' 
                          : 'bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>🛡️ Aegis Shield</span>
                        <span className="text-yellow-400">3 Faith</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Adds capture-barrier shield. Enemies capturing it are disintegrated!</p>
                    </button>

                    {/* Meditation card */}
                    <button 
                      disabled={spellResource < 3 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => {
                        if (spellResource >= 3) {
                          setSpellResource(prev => Math.min(10, prev + 2 - 3));
                          setDialogueText("🙏 SPECIAL RITE: MEDITATION! Channeled holy energy to gather +2 Spell points.");
                          RetroSound.playVictory(settings.soundEnabled);
                          forceEndTurn();
                        }
                      }}
                      className="flex flex-col text-left p-3 bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515] border-2 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>🙏 Meditation</span>
                        <span className="text-yellow-400">3 Faith</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Recover systems. Restores +2 active RPG force fields instantly!</p>
                    </button>
                  </>
                )}

                {playerClass === 'rogue' && (
                  <>
                    {/* Shadowstep card */}
                    <button 
                      disabled={spellResource < 4 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => { setActiveSpell(activeSpell === 'swap' ? null : 'swap'); setTeleportSource(null); }}
                      className={`flex flex-col text-left p-3 border-2 transition-all cursor-pointer ${
                        activeSpell === 'swap' 
                          ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_12px_#22d3ee]' 
                          : 'bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>🎭 Smoke Swap</span>
                        <span className="text-cyan-400">4 NRJ</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Exchanges coordinates of one of your units with any other non-King piece.</p>
                    </button>

                    {/* Sleep dart card */}
                    <button 
                      disabled={spellResource < 3 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => setActiveSpell(activeSpell === 'freeze' ? null : 'freeze')}
                      className={`flex flex-col text-left p-3 border-2 transition-all cursor-pointer ${
                        activeSpell === 'freeze' 
                          ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_12px_#22d3ee]' 
                          : 'bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>💨 Sleep Dart</span>
                        <span className="text-cyan-400">3 NRJ</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Sleep lock-down target enemy piece. Stuns them for 2 consecutive turns!</p>
                    </button>

                    {/* Assassinate card */}
                    <button 
                      disabled={spellResource < 2 || !isPlayerTurn || isThinking || isGameOver}
                      onClick={() => {
                        if (spellResource >= 2) {
                          setSpellResource(prev => Math.max(0, prev - 2));
                          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                          const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
                          const enemyPawns: string[] = [];
                          for (const f of files) {
                            for (const r of ranks) {
                              const p = chessRef.current.get((f + r) as any);
                              if (p && p.color !== settings.playerColor && p.type === 'p') {
                                enemyPawns.push(f + r);
                              }
                            }
                          }
                          if (enemyPawns.length > 0) {
                            const target = enemyPawns[Math.floor(Math.random() * enemyPawns.length)];
                            chessRef.current.remove(target as any);
                            setDialogueText(`🗡️ SPECIAL RITE: ASSASSINATION! Extracted enemy Pawn on ${target} from the shadows!`);
                            RetroSound.playDefeat(settings.soundEnabled);
                            forceEndTurn();
                          } else {
                            setDialogueText("NO TARGET FOUND! Assassination requires an active enemy Pawn on board.");
                          }
                        }
                      }}
                      className="flex flex-col text-left p-3 bg-[#151515] hover:bg-[#202020] border-[#333] hover:border-zinc-500 disabled:opacity-30 disabled:hover:bg-[#151515] border-2 transition-all cursor-pointer pb-2"
                    >
                      <div className="flex items-center justify-between font-bold text-white uppercase text-[11px] mb-1 w-full">
                        <span>🗡️ Assassinate</span>
                        <span className="text-cyan-400">2 NRJ</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">Silently vaporize a random enemy Pawn from the shadows.</p>
                    </button>
                  </>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-[#333] text-[9px] text-[#555] uppercase leading-tight justify-between flex flex-wrap gap-1">
                <span>⚡ SPARK MECHANICS: Normal moves yield +1 Power, +3 on capture, and +3 on Deliver Check!</span>
                <span>🔥 RPG BOARD CLASS: {playerClass.toUpperCase()}</span>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: AI Dialogue bubble, Move statistics, Config controls */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Dialogue widget and Status checker */}
            <GemmaDialogue
              currentText={dialogueText}
              isThinking={isThinking}
              engineStatus={engineStatus}
              testConnection={probeLMStudioConnection}
            />

            {/* Move scores / logs tab */}
            <MoveHistory
              logs={logs}
              whiteCaptured={whiteCaptured}
              blackCaptured={blackCaptured}
            />

            {/* Config Controller inputs */}
            <GameSettings
              settings={settings}
              onChange={setSettings}
              onReset={handleGameReset}
            />

            {/* Interactive tutorial guide on how to launch LM Studio locally */}
            <div className="border-4 border-[#333] bg-[#111] text-zinc-400 p-4 font-mono text-xs shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
              <div className="text-[#00ff41] font-bold mb-2 uppercase select-none tracking-wider border-b-2 border-[#333] pb-1">
                🕹️ LOCAL NEURAL COMPILER SETUP
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed select-none text-[11px]">
                <li>
                  Download &amp; Launch <span className="font-bold text-white">LM Studio</span> in host space.
                </li>
                <li>
                  Search / load <span className="font-bold text-white">gemma-2b-it</span> inside LM directory.
                </li>
                <li>
                  Head to <span className="font-bold text-white">Local Server (🌐 Tab)</span> of LM Studio.
                </li>
                <li>
                  Verify loaded model, bind to port <span className="font-bold text-[#00ff41]">1234</span>, and press <span className="font-bold text-[#00ff41]">Start Server</span>.
                </li>
                <li>
                  Touch <span className="text-white underline font-bold">TEST LINK</span> above to synchronize neural stream!
                </li>
              </ol>
              <div className="mt-3 pt-2 border-t border-[#333] text-[9px] text-[#555] uppercase leading-normal">
                💡 OFFLINE DETECTED? Heuristic fallback algorithm runs instantly without configuration dependencies!
              </div>
            </div>

          </section>
        </div>

        {/* Footer controls section from Immersive UI design layout */}
        <footer className="h-20 border-t-4 border-[#333] bg-[#1a1a1a] flex flex-col md:flex-row items-center justify-between px-6 py-4 md:py-0 gap-4 mt-4 select-none relative shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex gap-4">
            <button 
              onClick={handleUndoMove}
              disabled={logs.length === 0}
              className="px-4 py-1.5 border-2 border-white text-white text-xs uppercase font-bold hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white cursor-pointer active:translate-y-0.5"
            >
              Undo Move
            </button>
            <button 
              onClick={handleGameReset}
              className="px-4 py-1.5 border-2 border-white text-white text-xs uppercase font-bold hover:bg-white hover:text-black transition-colors cursor-pointer active:translate-y-0.5"
            >
              New Match
            </button>
            <button 
              onClick={handleGameReset}
              className="px-4 py-1.5 border-2 border-[#ff0055] text-[#ff0055] text-xs uppercase font-bold hover:bg-[#ff0055] hover:text-white transition-colors cursor-pointer active:translate-y-0.5"
            >
              Resign
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Player 01 (You)</span>
              <span className="text-[#00ff41] text-base md:text-lg leading-none font-bold tracking-widest">
                {settings.playerColor === 'w' ? 'WHITE' : 'BLACK'}
              </span>
            </div>
            <div className="w-[2px] h-8 bg-[#333]"></div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Gemma AI Opponent</span>
              <span className="text-[#ff0055] text-base md:text-lg leading-none font-bold tracking-widest uppercase animate-pulse">
                {settings.playerColor === 'w' ? 'BLACK' : 'WHITE'}
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
