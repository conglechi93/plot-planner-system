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

  async function handleSave() {
    const layout = exportLayout();
    if (layout.houses.length === 0) return;

    const json = JSON.stringify(layout, null, 2);

    // File System Access API — mở dialog chọn folder + tên file
    if ('showSaveFilePicker' in window) {
      try {
        const picker = window.showSaveFilePicker as (opts: object) => Promise<FileSystemFileHandle>;
        const handle = await picker({
          suggestedName: 'plot-layout.json',
          types: [{ description: 'JSON Layout', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return; // user nhấn Cancel
      }
    }

    // Fallback cho Firefox / Safari
    const blob   = new Blob([json], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
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
