import { useRef, useCallback } from 'react';
import { SelectionProvider } from './context/SelectionProvider';
import { useSelection } from './context/useSelection';
import { usePlanner } from './hooks/usePlanner';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PropertyPanel } from './components/PropertyPanel';
import { ModelPickerModal } from './components/ModelPickerModal';
import { GameProvider, useGame } from './game/context/GameContext';
import { GameModeToggle } from './components/game/GameModeToggle';
import { GameHUD } from './components/game/GameHUD';
import type { HouseInstance } from './types/HouseInstance';

// ── Inner component has access to both SelectionContext and GameContext ────────

function AppInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setSelectedHouse } = useSelection();
  const game = useGame();

  const onSelectChange = useCallback(
    (house: HouseInstance | null) => {
      setSelectedHouse(house);
    },
    [setSelectedHouse],
  );

  const controls = usePlanner(canvasRef, {
    onSelectChange,
    gameModeActive: game.isGameMode,
  });

  // ── Start/stop game handlers ───────────────────────────────────────────────

  const handleStartGame = useCallback(
    (playerName: string, aiCount: number) => {
      const scene = controls.getScene();
      if (!scene) return;
      game.startGame(scene, playerName, aiCount);
    },
    [controls, game],
  );

  const handleStopGame = useCallback(() => {
    game.stopGame();
  }, [game]);

  return (
    <div className="app-layout">
      {/* ── Planner UI (hidden during game) ───────────────────────────────── */}
      {!game.isGameMode && <Toolbar controls={controls} />}

      {/* ── 3-D canvas (always visible) ───────────────────────────────────── */}
      <canvas ref={canvasRef} id="renderCanvas" />

      {/* ── Planner status & panels ───────────────────────────────────────── */}
      {!game.isGameMode && <StatusBar status={controls.status} />}

      {!game.isGameMode && (
        <div id="info">
          <strong>Controls</strong><br />
          Click house → Select<br />
          Click ground → Place / Move<br />
          <span className="key">R</span> → Rotate 90°<br />
          <span className="key">Del</span> → Delete selected<br />
          <span className="key">Esc</span> → Cancel / Deselect<br />
          Scroll → Zoom &nbsp;|&nbsp; Drag → Orbit
        </div>
      )}

      {!game.isGameMode && (
        <PropertyPanel
          gizmoMode={controls.gizmoMode}
          setGizmoMode={controls.setGizmoMode}
        />
      )}

      {!game.isGameMode && <ModelPickerModal controls={controls} />}

      {/* ── Inspector toggle ──────────────────────────────────────────────── */}
      <button
        className={`inspector-btn${controls.isInspectorOpen ? ' active' : ''}`}
        onClick={controls.toggleInspector}
        title="Toggle Babylon Inspector"
      >
        🔍
      </button>

      {/* ── Game mode toggle (always visible) ────────────────────────────── */}
      <GameModeToggle
        isGameActive={game.isGameMode}
        onStartGame={handleStartGame}
        onStopGame={handleStopGame}
      />

      {/* ── Game HUD (only visible during active game) ───────────────────── */}
      {game.isGameMode && <GameHUD engine={game} />}
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SelectionProvider>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </SelectionProvider>
  );
}
