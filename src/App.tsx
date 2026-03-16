import { useRef, useCallback, useState } from 'react';
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
import { GameLobbyScreen } from './components/game/GameLobbyScreen';
import type { LobbyResult } from './components/game/GameLobbyScreen';
import type { HouseInstance } from './types/HouseInstance';

// ─── Inner App (has access to both SelectionContext and GameContext) ───────────

function AppInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setSelectedHouse } = useSelection();
  const game = useGame();

  const [lobbyOpen, setLobbyOpen] = useState(false);

  // Keep selection in sync with React context
  const onSelectChange = useCallback((house: HouseInstance | null) => {
    setSelectedHouse(house);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSelectedHouse]);

  // Pass gameModeActive to suppress planner pointer events during game
  const controls = usePlanner(canvasRef, {
    onSelectChange,
    gameModeActive: game.isGameMode,
  });

  // Toolbar requests to open lobby
  const handleOpenLobby = useCallback(() => {
    setLobbyOpen(true);
  }, []);

  // Lobby confirmed — start game
  const handleLobbyStart = useCallback((result: LobbyResult) => {
    const scene = controls.getScene();
    if (!scene) {
      console.warn('[App] Scene not ready, cannot start game');
      return;
    }
    if (controls.isPlacing) controls.cancelPlacement();
    setLobbyOpen(false);
    game.startGame(scene, result.playerName, result.aiCount, result.tokenColor, result.aiStrategies);
  }, [controls, game]);

  const handleLobbyCancel = useCallback(() => {
    setLobbyOpen(false);
  }, []);

  const handleStopGame = useCallback(() => {
    game.stopGame();
  }, [game]);

  return (
    <div className="app-layout">
      {/* ── Planner UI — hidden during game mode ── */}
      {!game.isGameMode && (
        <Toolbar controls={controls} onOpenLobby={handleOpenLobby} />
      )}

      {/* ── Babylon canvas ── */}
      <canvas ref={canvasRef} id="renderCanvas" />

      {/* ── Status bar — hidden during game mode ── */}
      {!game.isGameMode && (
        <StatusBar status={controls.status} />
      )}

      {/* ── Property panel — hidden during game mode ── */}
      {!game.isGameMode && (
        <PropertyPanel
          gizmoMode={controls.gizmoMode}
          setGizmoMode={controls.setGizmoMode}
        />
      )}

      {/* ── Model picker (only relevant in planner mode) ── */}
      {!game.isGameMode && (
        <ModelPickerModal controls={controls} />
      )}

      {/* ── Inspector toggle — only in planner mode ── */}
      {!game.isGameMode && (
        <button
          className={`inspector-btn${controls.isInspectorOpen ? ' active' : ''}`}
          onClick={controls.toggleInspector}
          title="Toggle Babylon Inspector"
        >
          🔍
        </button>
      )}

      {/* ── Info box — only in planner mode ── */}
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

      {/* ── Game lobby overlay ── */}
      {lobbyOpen && (
        <GameLobbyScreen
          onStart={handleLobbyStart}
          onCancel={handleLobbyCancel}
        />
      )}

      {/* ── Game Mode Toggle button (always visible) ── */}
      <GameModeToggle
        isGameActive={game.isGameMode}
        onStopGame={handleStopGame}
      />

      {/* ── Game HUD overlay (only when game is active) ── */}
      {game.isGameMode && game.state && (
        <GameHUD engine={game} />
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SelectionProvider>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </SelectionProvider>
  );
}
