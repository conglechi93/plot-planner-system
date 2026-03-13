import { useRef, useState } from 'react';
import type { ModelEntry } from '../types/ModelEntry';
import type { PlannerControls } from '../hooks/usePlanner';

interface Props {
  controls: PlannerControls;
}

/** Extract a display name from a URL (filename without extension, prettified). */
function nameFromUrl(url: string): string {
  const filename = url.split('?')[0].split('/').pop() ?? 'model';
  return filename
    .replace(/\.(glb|gltf|babylon|obj|stl)$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Toolbar({ controls }: Props) {
  const { isPlacing, cancelPlacement, openPicker, startPlacement, exportLayout, importLayout } = controls;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL input state ────────────────────────────────────────────────────────
  const [urlPanelOpen, setUrlPanelOpen] = useState(false);
  const [urlValue,     setUrlValue]     = useState('');
  const [urlError,     setUrlError]     = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  function handleAddModel() {
    openPicker((model) => {
      startPlacement(model);
    });
  }

  function handleOpenUrlPanel() {
    setUrlPanelOpen(true);
    setUrlError('');
    // Focus the input on next paint
    requestAnimationFrame(() => urlInputRef.current?.focus());
  }

  function handleCloseUrlPanel() {
    setUrlPanelOpen(false);
    setUrlValue('');
    setUrlError('');
  }

  function handleLoadFromUrl() {
    const trimmed = urlValue.trim();
    if (!trimmed) {
      setUrlError('Vui lòng nhập URL.');
      return;
    }
    try {
      new URL(trimmed); // validates URL syntax
    } catch {
      setUrlError('URL không hợp lệ.');
      return;
    }

    const entry: ModelEntry = {
      name:     nameFromUrl(trimmed),
      path:     trimmed,
      category: 'url',
    };

    handleCloseUrlPanel();
    startPlacement(entry);
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  handleLoadFromUrl();
    if (e.key === 'Escape') handleCloseUrlPanel();
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

      <button className="btn btn-url-model" onClick={handleOpenUrlPanel}>
        🔗 Add Model From URL
      </button>

      {/* ── URL input panel ── */}
      {urlPanelOpen && (
        <div className="url-panel">
          <div className="url-panel-header">
            <span className="url-panel-title">🔗 Load model from URL</span>
            <button className="url-panel-close" onClick={handleCloseUrlPanel} title="Đóng">✕</button>
          </div>
          <input
            ref={urlInputRef}
            className={`url-panel-input${urlError ? ' url-panel-input--error' : ''}`}
            type="url"
            placeholder="https://example.com/model.babylon"
            value={urlValue}
            onChange={(e) => { setUrlValue(e.target.value); setUrlError(''); }}
            onKeyDown={handleUrlKeyDown}
            spellCheck={false}
          />
          {urlError && <div className="url-panel-error">{urlError}</div>}
          <div className="url-panel-hint">
            Hỗ trợ: .glb · .gltf · .babylon
          </div>
          <div className="url-panel-actions">
            <button className="url-panel-btn url-panel-btn--load" onClick={handleLoadFromUrl}>
              ▶ Load
            </button>
            <button className="url-panel-btn url-panel-btn--cancel" onClick={handleCloseUrlPanel}>
              Huỷ
            </button>
          </div>
        </div>
      )}

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

