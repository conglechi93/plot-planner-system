/**
 * GameContext.tsx
 *
 * Provides the Cờ Tỉ Phú game engine to the entire component tree.
 *
 * Design:
 *   - `useGameEngine()` is called unconditionally at the top level of
 *     GameProvider (hooks must never be called conditionally).
 *   - `isGameMode` is a simple boolean that the UI uses to show/hide panels.
 *   - `startGame(scene, playerName, aiCount)` delegates to the engine and
 *     flips `isGameMode` to true.
 *   - `stopGame()` delegates to the engine and resets `isGameMode`.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Scene } from '@babylonjs/core';
import { useGameEngine } from '../hooks/useGameEngine';
import type { UseGameEngineReturn } from '../hooks/useGameEngine';

// ─── Context shape ────────────────────────────────────────────────────────────

interface GameContextValue extends UseGameEngineReturn {
  isGameMode:    boolean;
  playerName:    string;
  setPlayerName: (name: string) => void;
  aiCount:       number;
  setAiCount:    (count: number) => void;
  // Override startGame / stopGame with versions that also toggle isGameMode
  startGame: (scene: Scene, name: string, count: number) => void;
  stopGame:  () => void;
}

// ─── Context instance ─────────────────────────────────────────────────────────

// Start with a null context; useGame() throws if used outside provider.
const GameContext = createContext<GameContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Call the engine hook unconditionally — it manages its own null/active state.
  const engine = useGameEngine();

  const [isGameMode,  setIsGameMode ] = useState(false);
  const [playerName,  setPlayerName ] = useState('Bạn');
  const [aiCount,     setAiCount    ] = useState(3);

  // Wrap startGame: kick off the 3-D renderers then flip the mode flag.
  const startGame = useCallback(
    (scene: Scene, name: string, count: number): void => {
      engine.startGame(scene, name, count);
      setIsGameMode(true);
    },
    // engine.startGame is stable (useCallback([rawDispatch]) inside the hook).
    [engine.startGame],
  );

  // Wrap stopGame: tear down renderers then reset the mode flag.
  const stopGame = useCallback((): void => {
    engine.stopGame();
    setIsGameMode(false);
  }, [engine.stopGame]);

  const value: GameContextValue = {
    // Spread all engine properties first …
    ...engine,
    // … then override the two lifecycle methods with our wrapped versions.
    startGame,
    stopGame,
    // Game-mode / lobby state
    isGameMode,
    playerName,
    setPlayerName,
    aiCount,
    setAiCount,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame() must be used inside <GameProvider>');
  return ctx;
}
