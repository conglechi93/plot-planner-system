import { useRef, useCallback, useState } from 'react';
import { SelectionProvider } from './context/SelectionProvider';
import { useSelection } from './context/useSelection';
import { usePlanner } from './hooks/usePlanner';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PropertyPanel } from './components/PropertyPanel';
import { ModelPickerModal } from './components/ModelPickerModal';
import { GameModeToggle } from './components/game/GameModeToggle';
import { GameHUD } from './components/game/GameHUD';
import { useGameEngine } from './game/hooks/useGameEngine';
import type { HouseInstance } from './types/HouseInstance';

function AppInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setSelectedHouse } = useSelection();
  const [isGameActive, setIsGameActive] = useState(false);

  const onSelectChange = useCallback((house: HouseInstance | null) => {
    setSelectedHouse(house);
  }, [setSelectedHouse]);

  const controls = usePlanner(canvasRef, { onSelectChange });
  const gameEngine = useGameEngine();

  const handleStartGame = useCallback((playerName: string, aiCount: number) => {
    const scene = controls.getScene();
    if (!scene) {
      console.warn('[GameMode] Scene not ready yet — try again after canvas loads.');
      return;
    }
    gameEngine.startGame(scene, playerName, aiCount);
    setIsGameActive(true);
  }, [controls, gameEngine]);

  const handleStopGame = useCallback(() => {
    gameEngine.stopGame();
    setIsGameActive(false);
  }, [gameEngine]);

  return (
    <div className="app-layout">
      {/* Planner UI — hidden in game mode */}
      {!isGameActive && <Toolbar controls={controls} />}

      {!isGameActive && (
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

      {/* The 3D canvas — always visible */}
      <canvas ref={canvasRef} id="renderCanvas" />

      {!isGameActive && <StatusBar status={controls.status} />}
      {!isGameActive && (
        <PropertyPanel
          gizmoMode={controls.gizmoMode}
          setGizmoMode={controls.setGizmoMode}
        />
      )}
      {!isGameActive && <ModelPickerModal controls={controls} />}

      {/* Babylon Inspector toggle — bottom left — only in planner mode */}
      {!isGameActive && (
        <button
          className={`inspector-btn${controls.isInspectorOpen ? ' active' : ''}`}
          onClick={controls.toggleInspector}
          title="Toggle Babylon Inspector"
        >
          🔍
        </button>
      )}

      {/* Game mode toggle — always visible (top-right) */}
      <GameModeToggle
        isGameActive={isGameActive}
        onStartGame={handleStartGame}
        onStopGame={handleStopGame}
      />

      {/* Game HUD overlay — only while game is running */}
      {isGameActive && gameEngine.state && (
        <GameHUD engine={gameEngine} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SelectionProvider>
      <AppInner />
    </SelectionProvider>
  );
}
