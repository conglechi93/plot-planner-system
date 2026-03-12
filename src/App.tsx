import { useRef, useCallback } from 'react';
import { SelectionProvider } from './context/SelectionProvider';
import { useSelection } from './context/useSelection';
import { usePlanner } from './hooks/usePlanner';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { PropertyPanel } from './components/PropertyPanel';
import { ModelPickerModal } from './components/ModelPickerModal';
import type { HouseInstance } from './types/HouseInstance';

function AppInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setSelectedHouse } = useSelection();

  const onSelectChange = useCallback((house: HouseInstance | null) => {
    setSelectedHouse(house);
  }, [setSelectedHouse]);

  const controls = usePlanner(canvasRef, { onSelectChange });

  return (
    <div className="app-layout">
      <Toolbar controls={controls} />
      <canvas ref={canvasRef} id="renderCanvas" />
      <StatusBar status={controls.status} />
      <div id="info">
        <strong>Controls</strong><br />
        Click house → Select<br />
        Click ground → Place / Move<br />
        <span className="key">R</span> → Rotate 90°<br />
        <span className="key">Del</span> → Delete selected<br />
        <span className="key">Esc</span> → Cancel / Deselect<br />
        Scroll → Zoom &nbsp;|&nbsp; Drag → Orbit
      </div>
      <PropertyPanel gizmoMode={controls.gizmoMode} setGizmoMode={controls.setGizmoMode} />
      <ModelPickerModal controls={controls} />

      {/* Inspector toggle — bottom left */}
      <button
        className={`inspector-btn${controls.isInspectorOpen ? ' active' : ''}`}
        onClick={controls.toggleInspector}
        title="Toggle Babylon Inspector"
      >
        🔍
      </button>
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
