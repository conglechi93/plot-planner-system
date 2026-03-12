/**
 * useGameEngine.ts
 *
 * Central React hook that bridges the pure `gameReducer` with React's
 * `useReducer` and orchestrates all Babylon.js 3-D rendering side-effects.
 *
 * Responsibilities:
 *   • Manage nullable GameState (null before a game is started)
 *   • Expose typed action helpers (rollDice, buyProperty, …)
 *   • Auto-drive AI players with a 1-second think delay
 *   • Sync token / house meshes in the Babylon scene after every state change
 *
 * ── Exported surface ──────────────────────────────────────────────────────────
 *
 *  UseGameEngineReturn  – the full interface returned by the hook (also used by
 *                         GameContext to type-spread engine values).
 *
 *  useGameEngine()      – the hook itself.
 */

import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { Scene } from '@babylonjs/core';
import { Animation, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import { gameReducer, createInitialState } from '../engine/gameReducer';
import { pickDecision } from '../ai/aiPlayer';
import { computeTileTransforms } from '../board/tileLayout';
import { BoardRenderer } from '../../babylon/game/BoardRenderer';
import { TokenRenderer } from '../../babylon/game/TokenRenderer';
import { HouseHotelRenderer } from '../../babylon/game/HouseHotelRenderer';
import { DiceAnimator } from '../../babylon/game/DiceAnimator';
import type { GameState, GameEvent, Player, AIStrategy } from '../types';

// ─── Nullable-state reducer wrapper ──────────────────────────────────────────
//
// useReducer starts in the null state.  A private __INIT__ action seeds the
// full GameState without needing a lazy initialiser that would require
// parameters at hook mount time.

type NullableState = GameState | null;

interface InitAction {
  type: '__INIT__';
  initialState: GameState;
}

type WrappedAction = GameEvent | InitAction;

function wrappedReducer(state: NullableState, action: WrappedAction): NullableState {
  if (action.type === '__INIT__') return action.initialState;
  if (state === null) return null;
  return gameReducer(state, action as GameEvent);
}

// ─── Public interface ─────────────────────────────────────────────────────────

/** Options accepted when starting a new game. */
export interface UseGameEngineOptions {
  playerName:    string;
  aiCount:       number;
  aiStrategies?: AIStrategy[];
}

/**
 * Everything returned by `useGameEngine`.
 *
 * NOTE: GameContext spreads this directly onto its context value, so every
 * field here becomes accessible via `useGame()`.
 */
export interface UseGameEngineReturn {
  // ── Raw state & dispatch ─────────────────────────────────────────────────
  state:          GameState | null;
  dispatch:       (event: GameEvent) => void;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  isGameActive:   boolean;
  startGame:      (scene: Scene, playerName: string, aiCount: number) => void;
  stopGame:       () => void;

  // ── Convenience action helpers ───────────────────────────────────────────
  rollDice:             () => void;
  buyProperty:          () => void;
  declineProperty:      () => void;
  payRent:              () => void;
  endTurn:              () => void;
  buildHouse:           (squareIndex: number) => void;
  buildHotel:           (squareIndex: number) => void;
  sellHouse:            (squareIndex: number) => void;
  sellHotel:            (squareIndex: number) => void;
  mortgageProperty:     (squareIndex: number) => void;
  unmortgageProperty:   (squareIndex: number) => void;
  payJailBail:          () => void;
  useJailFreeCard:      () => void;
  rollForJail:          () => void;
  declareBankruptcy:    () => void;

  // ── Derived flags ─────────────────────────────────────────────────────────
  /** True when the current player is the human (not an AI and not bankrupt). */
  isHumanTurn:    boolean;
  /** Alias kept for GameContext spread compatibility. */
  isPlayerTurn:   boolean;
  currentPlayer:  Player | null;
  humanPlayer:    Player | null;
  isGameOver:     boolean;
  /** True while the 3-D dice-roll animation is playing. */
  isDiceAnimating: boolean;
  /** True while the token is walking step-by-step to its destination. */
  isTokenMoving: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Milliseconds the AI "thinks" before acting. */
const AI_ACTION_DELAY = 1000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameEngine(): UseGameEngineReturn {
  const [state, rawDispatch] = useReducer(wrappedReducer, null);

  // ── Refs (do not trigger re-renders) ─────────────────────────────────────
  const isActiveRef      = useRef<boolean>(false);
  const boardRendererRef = useRef<BoardRenderer | null>(null);
  const tokenRendererRef = useRef<TokenRenderer | null>(null);
  const houseRendererRef = useRef<HouseHotelRenderer | null>(null);
  const diceAnimatorRef  = useRef<DiceAnimator | null>(null);
  const aiTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Stores the player + fromTile right before a ROLL_DICE / ROLL_FOR_JAIL
   * dispatch so the scene-sync effect can detect a new movement and animate it.
   * Also holds diceTotal so we can distinguish normal moves from specials
   * (go_to_jail, card teleports).
   */
  const pendingMoveRef = useRef<{
    playerId:  string;
    fromTile:  number;
    diceTotal: number;
  } | null>(null);

  /**
   * Id of the player whose token is currently mid-walk animation.
   * Used by the scene-sync effect to skip teleporting that player.
   */
  const movingPlayerIdRef = useRef<string | null>(null);

  /** The Babylon scene, kept so panCameraToTile can reach it. */
  const sceneRef = useRef<Scene | null>(null);

  // ── State that drives UI re-renders ───────────────────────────────────────
  const [isDiceAnimating, setIsDiceAnimating] = useState(false);
  const [isTokenMoving,   setIsTokenMoving]   = useState(false);

  // ── Lifecycle: startGame ──────────────────────────────────────────────────

  const startGame = useCallback(
    (scene: Scene, playerName: string, aiCount: number): void => {
      isActiveRef.current = true;
      sceneRef.current    = scene;

      // Tear down any previous renderers.
      boardRendererRef.current?.dispose();
      tokenRendererRef.current?.dispose();
      houseRendererRef.current?.clearAll();
      diceAnimatorRef.current?.dispose();

      // Build fresh renderers.
      const boardRenderer = new BoardRenderer(scene);
      const tokenRenderer = new TokenRenderer(scene);
      const houseRenderer = new HouseHotelRenderer(scene);
      const diceAnimator  = new DiceAnimator(scene);
      boardRendererRef.current = boardRenderer;
      tokenRendererRef.current = tokenRenderer;
      houseRendererRef.current = houseRenderer;
      diceAnimatorRef.current  = diceAnimator;

      // Prime the dice asset cache in the background (non-blocking).
      void diceAnimator.preload();

      // Create initial game state with one human player + N AI opponents.
      const strategies: AIStrategy[] = Array.from({ length: aiCount }, (_, i) => {
        const pool: AIStrategy[] = ['aggressive', 'balanced', 'conservative'];
        return pool[i % pool.length];
      });
      const initialState = createInitialState([playerName], strategies);

      // Seed the reducer.
      rawDispatch({ type: '__INIT__', initialState });

      // Render the 40 board tiles.
      boardRenderer.renderBoard(initialState.squares);

      // Create token meshes and place them all at GO (index 0).
      const transforms   = computeTileTransforms();
      const goTransform  = transforms[0];
      const goPos        = goTransform
        ? { x: goTransform.position.x, y: 0.15, z: goTransform.position.z }
        : { x: 20, y: 0.15, z: -20 };
      const totalPlayers = initialState.players.length;

      initialState.players.forEach((player: Player, idx: number) => {
        tokenRenderer.createToken(player.id, player.tokenColor, 0);
        tokenRenderer.placeTokenAtTile(player.id, goPos, idx, totalPlayers);
      });
    },
    [rawDispatch],
  );

  // ── Lifecycle: stopGame ───────────────────────────────────────────────────

  const stopGame = useCallback((): void => {
    isActiveRef.current = false;

    if (aiTimerRef.current !== null) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    boardRendererRef.current?.dispose();
    tokenRendererRef.current?.dispose();
    houseRendererRef.current?.clearAll();
    diceAnimatorRef.current?.dispose();

    boardRendererRef.current = null;
    tokenRendererRef.current = null;
    houseRendererRef.current = null;
    diceAnimatorRef.current  = null;
    sceneRef.current         = null;
    pendingMoveRef.current   = null;
    movingPlayerIdRef.current = null;

    // Reset state back to null via the init action with a placeholder; the
    // cleanest approach without adding a __RESET__ action type is to just let
    // the null guard in wrappedReducer handle it.  We do this by re-dispatching
    // __INIT__ with a sentinel, but for true reset we rely on startGame being
    // called again next time.  Nothing in the UI reads state after stopGame
    // while isGameActive is false.
  }, []);

  // ── Camera follow ─────────────────────────────────────────────────────────

  /**
   * Smoothly pan the ArcRotateCamera target to look at a tile's world position.
   * Runs a short 8-frame (≈133 ms) animation so motion is fluid but snappy.
   */
  const panCameraToTile = useCallback((tileIndex: number): void => {
    const scene = sceneRef.current;
    if (!scene) return;

    const camera = scene.activeCamera;
    if (!(camera instanceof ArcRotateCamera)) return;

    const transforms = computeTileTransforms();
    const t = transforms[tileIndex];
    if (!t) return;

    const targetPos = new Vector3(t.position.x, 0, t.position.z);

    Animation.CreateAndStartAnimation(
      'cameraFollow',
      camera,
      'target',
      60,                                      // fps
      8,                                       // total frames ≈ 133 ms
      camera.target.clone(),
      targetPos,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
  }, []);

  // ── Public dispatch ───────────────────────────────────────────────────────

  const dispatch = useCallback(
    (event: GameEvent): void => {
      rawDispatch(event);
    },
    [rawDispatch],
  );

  // ── Typed action helpers ──────────────────────────────────────────────────

  const rollDice = useCallback((): void => {
    if (!state) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);

    // Snapshot current position BEFORE dispatch so the scene-sync effect can
    // detect the movement and animate it step-by-step.
    pendingMoveRef.current = {
      playerId:  currentPlayer.id,
      fromTile:  currentPlayer.position,
      diceTotal: d1 + d2,
    };

    const doDispatch = () => dispatch({ type: 'ROLL_DICE', payload: { d1, d2 } });

    const animator = diceAnimatorRef.current;
    if (animator) {
      setIsDiceAnimating(true);
      void animator.rollDice(d1, d2).then(async () => {
        setIsDiceAnimating(false);
        // Keep dice result visible for 600 ms so the player can read it.
        await new Promise<void>(resolve => setTimeout(resolve, 600));
        doDispatch();
      });
    } else {
      doDispatch();
    }
  }, [state, dispatch]);

  const buyProperty = useCallback(
    (): void => dispatch({ type: 'BUY_PROPERTY' }),
    [dispatch],
  );

  const declineProperty = useCallback(
    (): void => dispatch({ type: 'DECLINE_PROPERTY' }),
    [dispatch],
  );

  const payRent = useCallback(
    (): void => dispatch({ type: 'PAY_RENT' }),
    [dispatch],
  );

  const endTurn = useCallback(
    (): void => dispatch({ type: 'END_TURN' }),
    [dispatch],
  );

  const buildHouse = useCallback(
    (squareIndex: number): void =>
      dispatch({ type: 'BUILD_HOUSE', payload: { squareIndex } }),
    [dispatch],
  );

  const buildHotel = useCallback(
    (squareIndex: number): void =>
      dispatch({ type: 'BUILD_HOTEL', payload: { squareIndex } }),
    [dispatch],
  );

  const sellHouse = useCallback(
    (squareIndex: number): void =>
      dispatch({ type: 'SELL_HOUSE', payload: { squareIndex } }),
    [dispatch],
  );

  const sellHotel = useCallback(
    (squareIndex: number): void =>
      dispatch({ type: 'SELL_HOTEL', payload: { squareIndex } }),
    [dispatch],
  );

  const mortgageProperty = useCallback(
    (squareIndex: number): void =>
      dispatch({ type: 'MORTGAGE_PROPERTY', payload: { squareIndex } }),
    [dispatch],
  );

  const unmortgageProperty = useCallback(
    (squareIndex: number): void =>
      dispatch({ type: 'UNMORTGAGE_PROPERTY', payload: { squareIndex } }),
    [dispatch],
  );

  const payJailBail = useCallback(
    (): void => dispatch({ type: 'PAY_JAIL_BAIL' }),
    [dispatch],
  );

  const useJailFreeCard = useCallback(
    (): void => dispatch({ type: 'USE_JAIL_FREE_CARD' }),
    [dispatch],
  );

  const rollForJail = useCallback((): void => {
    if (!state) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);

    pendingMoveRef.current = {
      playerId:  currentPlayer.id,
      fromTile:  currentPlayer.position,
      diceTotal: d1 + d2,
    };

    const doDispatch = () => dispatch({ type: 'ROLL_FOR_JAIL', payload: { d1, d2 } });

    const animator = diceAnimatorRef.current;
    if (animator) {
      setIsDiceAnimating(true);
      void animator.rollDice(d1, d2).then(async () => {
        setIsDiceAnimating(false);
        await new Promise<void>(resolve => setTimeout(resolve, 600));
        doDispatch();
      });
    } else {
      doDispatch();
    }
  }, [state, dispatch]);

  const declareBankruptcy = useCallback(
    (): void => dispatch({ type: 'DECLARE_BANKRUPTCY' }),
    [dispatch],
  );

  // ── AI turn automation ────────────────────────────────────────────────────
  //
  // Fires whenever phase or currentPlayerIndex changes.  If the active player
  // is an AI, schedule a single delayed decision.  We also handle secondary
  // AI decision points (paying rent, buying property, drawing cards, etc.)
  // because the reducer always transitions to a new phase after each event.

  useEffect(() => {
    // No-op before game starts or after it ends.
    if (!state || !isActiveRef.current) return;
    if (state.phase === 'game_over' || state.phase === 'moving_token') return;

    // ── Current player must be AI ─────────────────────────────────────────────
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.isBankrupt) return;

    // Cancel any in-flight timer to avoid double-firing.
    if (aiTimerRef.current !== null) {
      clearTimeout(aiTimerRef.current);
    }

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      // Guard: game might have been stopped while the timer was pending.
      if (!isActiveRef.current) return;
      const decision = pickDecision(currentPlayer, state);
      dispatch(decision);
    }, AI_ACTION_DELAY);

    return () => {
      if (aiTimerRef.current !== null) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
    // We intentionally depend on the full `state` object so that AI decisions
    // at every phase (buying, rent, cards, …) are handled, not just turn-start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, dispatch]);

  // ── 3-D scene sync ────────────────────────────────────────────────────────
  //
  // After every state transition bring the Babylon scene up to date.
  //
  // Key behaviour:
  //   1. If a pendingMove was recorded (just after ROLL_DICE/ROLL_FOR_JAIL),
  //      animate the active player's token step-by-step while the camera
  //      follows.  All other players are still teleported instantly.
  //   2. For special jumps (go_to_jail, card teleports) where the actual
  //      destination doesn't match a straight dice walk, just teleport.
  //   3. After the walk animation completes, re-sync all tokens and mark
  //      isTokenMoving = false so the UI can reveal pending dialogs.

  useEffect(() => {
    if (!state || !isActiveRef.current) return;

    const tokenRenderer = tokenRendererRef.current;
    const transforms    = computeTileTransforms();
    const activePlayers = state.players.filter(p => !p.isBankrupt);
    const totalActive   = activePlayers.length;

    // ── Helper: place all (non-moving) tokens instantly ───────────────────
    const syncTokensImmediately = (skipPlayerId?: string): void => {
      if (!tokenRenderer) return;
      state.players.forEach((player) => {
        if (player.isBankrupt) return;
        if (player.id === skipPlayerId) return;

        const tt = transforms[player.position];
        if (!tt) return;

        const activeIdx = activePlayers.findIndex(p => p.id === player.id);
        tokenRenderer.placeTokenAtTile(
          player.id,
          { x: tt.position.x, y: 0.15, z: tt.position.z },
          activeIdx >= 0 ? activeIdx : 0,
          totalActive,
        );
      });
    };

    // ── Check for a pending move that should be animated ──────────────────
    const pendingMove = pendingMoveRef.current;

    if (pendingMove && tokenRenderer) {
      pendingMoveRef.current = null; // consume immediately to avoid re-entry

      const player = state.players.find(p => p.id === pendingMove.playerId);

      if (!player || player.isBankrupt) {
        // Player bankrupt or missing — just sync everyone normally.
        syncTokensImmediately();
      } else {
        const actualDest   = player.position;
        const BOARD        = 40;
        // Steps for a standard dice walk wrapping around the board.
        const stepCount    = (BOARD - pendingMove.fromTile + actualDest) % BOARD;
        const isNormalMove = stepCount > 0 && stepCount === pendingMove.diceTotal;

        if (!isNormalMove) {
          // Special jump (go_to_jail, card effect, stayed in jail) — teleport.
          syncTokensImmediately();
        } else {
          // Normal dice move — walk step by step with camera following.
          syncTokensImmediately(player.id); // sync everyone except the walker

          const activeIdx = activePlayers.findIndex(p => p.id === player.id);
          const spreadIdx = activeIdx >= 0 ? activeIdx : 0;

          movingPlayerIdRef.current = player.id;
          setIsTokenMoving(true);
          panCameraToTile(pendingMove.fromTile); // start at origin tile

          void tokenRenderer.moveToken(
            player.id,
            pendingMove.fromTile,
            actualDest,
            transforms.map(t => ({ x: t.position.x, y: 0.15, z: t.position.z })),
            spreadIdx,
            totalActive,
            (currentStep) => panCameraToTile(currentStep), // follow each step
          ).then(() => {
            movingPlayerIdRef.current = null;
            setIsTokenMoving(false);
            panCameraToTile(actualDest); // settle camera at destination
            // Final teleport snaps the token exactly on its spread position.
            const tt = transforms[actualDest];
            if (tt) {
              tokenRenderer.placeTokenAtTile(
                player.id,
                { x: tt.position.x, y: 0.15, z: tt.position.z },
                spreadIdx,
                totalActive,
              );
            }
          });

          // Don't run the default sync below — walker is being animated.
        }
      }
    } else {
      // No pending movement — ordinary sync for all tokens.
      syncTokensImmediately(movingPlayerIdRef.current ?? undefined);
    }

    // House / hotel update ----------------------------------------------------
    const houseRenderer = houseRendererRef.current;
    if (houseRenderer) {
      state.squares.forEach(sq => {
        if (sq.type === 'property') {
          houseRenderer.updateSquareBuildings(sq.index, sq.houses);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, panCameraToTile]);

  // ── Derived values ────────────────────────────────────────────────────────

  const currentPlayer: Player | null =
    state?.players[state.currentPlayerIndex] ?? null;

  // The human player is always players[0] (only one human supported).
  const humanPlayer: Player | null =
    state?.players.find(p => !p.isAI) ?? null;

  const isHumanTurn: boolean =
    currentPlayer !== null &&
    !currentPlayer.isAI &&
    !currentPlayer.isBankrupt;

  const isGameOver: boolean = state?.phase === 'game_over' || state?.winner !== null
    ? true
    : false;

  return {
    // Raw
    state,
    dispatch,

    // Lifecycle
    isGameActive: isActiveRef.current,
    startGame,
    stopGame,

    // Action helpers
    rollDice,
    buyProperty,
    declineProperty,
    payRent,
    endTurn,
    buildHouse,
    buildHotel,
    sellHouse,
    sellHotel,
    mortgageProperty,
    unmortgageProperty,
    payJailBail,
    useJailFreeCard,
    rollForJail,
    declareBankruptcy,

    // Derived flags
    isHumanTurn,
    isPlayerTurn: isHumanTurn,
    currentPlayer,
    humanPlayer,
    isGameOver,
    isDiceAnimating,
    isTokenMoving,
  };
}
