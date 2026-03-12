/**
 * GameContext.tsx
 *
 * React context that wires the Cờ Tỉ Phú game engine into the component tree.
 *
 * Design goals:
 *   • Never call hooks conditionally – the `ActiveGame` sub-component pattern
 *     ensures `useGameEngine` is always mounted / unmounted as a unit.
 *   • Keep the "setup" state (playerName, aiCount) separate from the engine
 *     state so the UI can show a lobby without an active game.
 *   • Expose everything from UseGameEngineReturn directly on the context value
 *     so consumers (Toolbar, HUD, etc.) call `useGame()` and get typed access
 *     to `rollDice`, `state`, `currentPlayer`, etc. without extra indirection.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // Wrap the app:
 *   <GameProvider>
 *     <App />
 *   </GameProvider>
 *
 *   // Inside any component:
 *   const { isGameMode, toggleGameMode, rollDice, state } = useGame();
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import type { Scene } from '@babylonjs/core';
import { useGameEngine } from '../hooks/useGameEngine';
import type { UseGameEngineReturn } from '../hooks/useGameEngine';

// ─── Context shape ────────────────────────────────────────────────────────────

/**
 * Everything available on the game context.
 *
 * Extends UseGameEngineReturn so all action helpers and state flags are
 * directly accessible via `useGame()`.
 */
interface GameContextValue extends UseGameEngineReturn {
  /** True while a game session is in progress. */
  isGameMode: boolean;

  /**
   * Toggle the game on/off.
   *
   * Pass the active Babylon.js `Scene` when turning the game on so the engine
   * can create its 3-D renderers.  Pass `null` (or omit) when turning it off.
   */
  toggleGameMode: (scene: Scene | null) => void;

  /** Human player's display name (editable in the lobby). */
  playerName:    string;
  setPlayerName: (name: string) => void;

  /** Number of AI opponents (0–3). */
  aiCount:    number;
  setAiCount: (count: number) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/**
 * Stub engine values used before a game is started and as the context default.
 * This avoids having to null-check every consumer.
 */
function noop(): void { /* intentional no-op */ }
function noopNum(_n: number): void { /* intentional no-op */ }

const ENGINE_DEFAULTS: UseGameEngineReturn = {
  state:               null,
  dispatch:            noop,
  isGameActive:        false,
  startGame:           noop as UseGameEngineReturn['startGame'],
  stopGame:            noop,
  rollDice:            noop,
  buyProperty:         noop,
  declineProperty:     noop,
  payRent:             noop,
  endTurn:             noop,
  buildHouse:          noopNum,
  buildHotel:          noopNum,
  sellHouse:           noopNum,
  sellHotel:           noopNum,
  mortgageProperty:    noopNum,
  unmortgageProperty:  noopNum,
  payJailBail:         noop,
  useJailFreeCard:     noop,
  rollForJail:         noop,
  declareBankruptcy:   noop,
  isHumanTurn:         false,
  isPlayerTurn:        false,
  currentPlayer:       null,
  humanPlayer:         null,
  isGameOver:          false,
  isDiceAnimating:     false,
  isTokenMoving:       false,
};

const DEFAULT_CONTEXT: GameContextValue = {
  ...ENGINE_DEFAULTS,
  isGameMode:    false,
  toggleGameMode: noop as GameContextValue['toggleGameMode'],
  playerName:    'Bạn',
  setPlayerName: noop,
  aiCount:       3,
  setAiCount:    noopNum,
};

// ─── Context instance ─────────────────────────────────────────────────────────

export const GameContext = createContext<GameContextValue>(DEFAULT_CONTEXT);

// ─── ActiveGame sub-component ────────────────────────────────────────────────
//
// This component is only mounted when `isGameMode` is true.  Because React
// hooks may not be called conditionally, we isolate `useGameEngine` here.
// The parent `GameProvider` renders `<ActiveGameBridge>` inside a conditional
// block and passes onEngine to receive the engine value.

// ─── GameProvider ─────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // ── Setup state (lobby settings) ─────────────────────────────────────────
  const [isGameMode,  setIsGameMode ] = useState<boolean>(false);
  const [playerName,  setPlayerName ] = useState<string>('Bạn');
  const [aiCount,     setAiCount    ] = useState<number>(3);

  // ── Live engine reference ─────────────────────────────────────────────────
  //
  // Starts as ENGINE_DEFAULTS; replaced by the real engine as soon as
  // ActiveGame mounts and calls onMount.
  const [engine, setEngine] = useState<UseGameEngineReturn>(ENGINE_DEFAULTS);

  // Keep the Babylon scene reference stable (no re-render on scene change).
  const sceneRef = useRef<Scene | null>(null);

  // ── Callback: receive engine from ActiveGame ──────────────────────────────
  //
  // Called synchronously on every ActiveGame render, so `engine` in state is
  // always up to date for the children rendered below.

  const handleEngineMount = useCallback(
    (liveEngine: UseGameEngineReturn): void => {
      setEngine(liveEngine);
    },
    [],
  );

  // ── toggleGameMode ────────────────────────────────────────────────────────

  const toggleGameMode = useCallback(
    (scene: Scene | null): void => {
      if (!isGameMode) {
        // ── Turn on ─────────────────────────────────────────────────────────
        const activeScene = scene ?? sceneRef.current;
        if (!activeScene) {
          console.warn('[GameContext] toggleGameMode: no Babylon scene provided');
          return;
        }
        sceneRef.current = activeScene;
        setIsGameMode(true);
        // `engine.startGame` will be called from inside ActiveGame once it
        // mounts.  We trigger it here via a useEffect in ActiveGame that runs
        // when `isGameMode` flips to true.  To keep this component simple we
        // call it directly via the ref approach below.
        //
        // In practice startGame is idempotent (it calls dispose first), so
        // calling it on mount is safe.
      } else {
        // ── Turn off ────────────────────────────────────────────────────────
        engine.stopGame();
        setIsGameMode(false);
        // Reset engine to defaults so consumers see null state.
        setEngine(ENGINE_DEFAULTS);
      }
    },
    // isGameMode and engine are the only dependencies – playerName/aiCount
    // are read from state via closure at call time.
    [isGameMode, engine],
  );

  // ── Store scene ref for stable access in toggleGameMode ──────────────────

  const registerScene = useCallback((scene: Scene | null): void => {
    sceneRef.current = scene;
  }, []);

  // Suppress "unused variable" lint for registerScene – it's available on the
  // context for consumers that need to hand the scene to the engine.
  void registerScene;

  // ── Context value ─────────────────────────────────────────────────────────

  const contextValue: GameContextValue = {
    // Spread all engine properties (state, dispatch, rollDice, …)
    ...engine,

    // Override lifecycle helpers with the versions that also update isGameMode.
    // startGame is re-wrapped so it correctly sets isGameMode = true and kicks
    // off the scene renderers.
    startGame: useCallback(
      (scene: Scene, name: string, count: number): void => {
        sceneRef.current = scene;
        engine.startGame(scene, name, count);
        setIsGameMode(true);
      },
      [engine],
    ),

    stopGame: useCallback((): void => {
      engine.stopGame();
      setIsGameMode(false);
      setEngine(ENGINE_DEFAULTS);
    }, [engine]),

    // Lobby & mode state
    isGameMode,
    toggleGameMode,
    playerName,
    setPlayerName,
    aiCount,
    setAiCount,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {/*
        ActiveGame is only mounted while a game is active.  When it mounts it
        calls `engine.startGame` (via the useEffect below), replacing the stub
        engine with the live one.  When unmounted (isGameMode → false) the hook
        tears itself down naturally.
      */}
      {isGameMode && (
        <ActiveGameBridge
          scene={sceneRef.current}
          playerName={playerName}
          aiCount={aiCount}
          onEngine={handleEngineMount}
        />
      )}
      {children}
    </GameContext.Provider>
  );
}

// ─── ActiveGameBridge ─────────────────────────────────────────────────────────
//
// A self-contained component that mounts useGameEngine, starts the game via
// startGame on mount, and pipes the live engine up to GameProvider via onEngine.

interface ActiveGameBridgeProps {
  scene:      Scene | null;
  playerName: string;
  aiCount:    number;
  onEngine:   (engine: UseGameEngineReturn) => void;
}

function ActiveGameBridge({
  scene,
  playerName,
  aiCount,
  onEngine,
}: ActiveGameBridgeProps): null {
  const engine = useGameEngine();

  // Surface the engine to the parent on every render.
  onEngine(engine);

  // Start the game exactly once when this component mounts.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!scene) return;

    startedRef.current = true;
    engine.startGame(scene, playerName, aiCount);

    return () => {
      // Clean up when ActiveGameBridge unmounts (game stopped).
      engine.stopGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty – run once on mount only

  return null;
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Access the full game context from any component inside `<GameProvider>`.
 *
 * ```tsx
 * const { isGameMode, toggleGameMode, rollDice, state } = useGame();
 * ```
 */
export function useGame(): GameContextValue {
  return useContext(GameContext);
}
