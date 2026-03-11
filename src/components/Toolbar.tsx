import { useRef } from 'react';
import type { PlannerControls } from '../hooks/usePlanner';

interface Props {
  controls: PlannerControls;
}

export function Toolbar({ controls }: Props) {
  const { isPlacing, cancelPlacement, openPicker, startPlacement, exportLayout, importLayout } = controls;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAddModel() {
    openPicker((model) => {
      startPlacement(model);
    });
  }

  function handleSave() {
    const layout = exportLayout();
    if (layout.houses.length === 0) {
      return;
    }
    console.log('[PlotPlanner] Layout JSON:', JSON.stringify(layout, null, 2));
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plot-layout.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void importLayout(file);
    // Reset để có thể chọn lại cùng file
    e.target.value = '';
  }

  return (
    <div id="ui">
      <button className="btn btn-add-model" onClick={handleAddModel}>
        📦 Add Model
      </button>
      <button className="btn btn-save" onClick={handleSave}>
        💾 Save Layout
      </button>
      <button className="btn btn-import" onClick={handleImportClick}>
        📂 Import Layout
      </button>
      {isPlacing && (
        <button className="btn btn-cancel" onClick={cancelPlacement}>
          ✕ Cancel Placement
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
