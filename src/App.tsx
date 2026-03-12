import { useRef, useCallback } from 'react';
import { SelectionProvider } from './context/SelectionProvider';
import { useSelection } from './context/useSelection';
import { usePlanner } from './hooks/usePlanner';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PropertyPanel } from './components/PropertyPanel';
import { ModelPickerModal } from './components/ModelPickerModal';
import { GameProvider } from './game/context/GameContext';
import { useGame } from './game/context/GameContext';
import { GameHUD } from './components/game/GameHUD';
import { GameModeToggle } from './components/game/GameModeToggle';
import type { HouseInstance } from './types/HouseInstance';

function AppInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setSelectedHouse } = useSelection();

  const onSelectChange = useCallback(
    (house: HouseInstance | null) => { setSelectedHouse(house); },
    [setSelectedHouse],
  );

  const controls = usePlanner(canvasRef, { onSelectChange });

  // Game context ---------------------------------------------------------------
  const game = useGame();
  const { isGameMode, startGame, stopGame } = game;

  // When user starts the game, grab the live Babylon scene from the planner
  // and hand it to the GameContext so it can build 3-D renderers.
  const handleStartGame = useCallback(
    (playerName: string, aiCount: number) => {
      const scene = controls.getScene();
      if (!scene) {
        console.warn('[App] Scene not ready yet – cannot start game.');
        return;
      }
      startGame(scene, playerName, aiCount);
    },
    [controls, startGame],
  );

  const handleStopGame = useCallback(() => {
    stopGame();
  }, [stopGame]);

  // While game is active: disable the planner's pointer interactions so that
  // clicks on the canvas are not intercepted by the placement / selection system.
  // We achieve this cheaply by overlaying a transparent div over the canvas
  // (rendered below in JSX) rather than patching usePlanner.

  return (
    <div className="app-layout">
      {/* ── Planner UI (hidden during game) ─────────────────────────────── */}
      {!isGameMode && <Toolbar controls={controls} />}
      {!isGameMode && (
        <StatusBar status={controls.status} />
      )}

      {/* ── The shared Babylon canvas ─────────────────────────────────────── */}
      <canvas ref={canvasRef} id="renderCanvas" />

      {/* Block planner pointer events while game is running */}
      {isGameMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            // transparent overlay – swallows pointer events so the planner
            // selection / placement doesn't fire during game mode
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}

      {/* ── Planner panels (hidden during game) ─────────────────────────── */}
      {!isGameMode && (
        <>
          <div id="info">
            <strong>Controls</strong><br />
            Click house → Select<br />
            Click ground → Place / Move<br />
            <span className="key">R</span> → Rotate 90°<br />
            <span className="key">Del</span> → Delete selected<br />
            <span className="key">Esc</span> → Cancel / Deselect<br />
            Scroll → Zoom &nbsp;|&nbsp; Drag → Orbit
          </div>
          <PropertyPanel
            gizmoMode={controls.gizmoMode}
            setGizmoMode={controls.setGizmoMode}
          />
          <ModelPickerModal controls={controls} />

          {/* Inspector toggle — bottom left */}
          <button
            className={`inspector-btn${controls.isInspectorOpen ? ' active' : ''}`}
            onClick={controls.toggleInspector}
            title="Toggle Babylon Inspector"
          >
            🔍
          </button>
        </>
      )}

      {/* ── Game HUD (shown during game) ──────────────────────────────────── */}
      {isGameMode && game.state && (
        <GameHUD engine={game} />
      )}

      {/* ── Game mode toggle (always visible, top-right) ─────────────────── */}
      <GameModeToggle
        isGameActive={isGameMode}
        onStartGame={handleStartGame}
        onStopGame={handleStopGame}
      />
    </div>
  );
}

export default function App() {
  return (
    <SelectionProvider>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </SelectionProvider>
  );
}
