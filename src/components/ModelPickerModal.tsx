import { useState, useEffect, useRef } from 'react';
import type { ModelEntry, ModelsManifest } from '../types/ModelEntry';
import type { PlannerControls } from '../hooks/usePlanner';
import { ModelPreview } from './ModelPreview';

const PAGE_SIZE = 10;

const CATEGORY_ICONS: Record<string, string> = {
  house:      '🏠',
  grass:      '🌿',
  tree:       '🌲',
  car:        '🚗',
  common:     '📦',
  furniture:  '🪑',
  road:       '🛣️',
  water:      '💧',
};

function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat.toLowerCase()] ?? '📦';
}

function prettifyName(filename: string): string {
  return filename
    .replace(/\.(glb|gltf)$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  controls: PlannerControls;
}

export function ModelPickerModal({ controls }: Props) {
  const { isPickerOpen, closePicker, pickerCallback } = controls;

  const [manifest, setManifest]         = useState<ModelsManifest>({});
  const [categories, setCategories]     = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('house');
  const [currentPage, setCurrentPage]   = useState(1);
  const [loading, setLoading]           = useState(false);
  const [hoveredPath, setHoveredPath]   = useState<string | null>(null);
  const loaded = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazy-load manifest on first open
  useEffect(() => {
    if (!isPickerOpen || loaded.current) return;

    setLoading(true);
    fetch('/models/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ModelsManifest>;
      })
      .then((data) => {
        const cats = Object.keys(data).sort((a, b) => {
          if (a === 'house') return -1;
          if (b === 'house') return 1;
          return a.localeCompare(b);
        });
        setManifest(data);
        setCategories(cats);
        setActiveCategory(cats[0] ?? 'house');
        loaded.current = true;
      })
      .catch((err) => {
        console.error('[ModelPicker] Failed to load manifest:', err);
      })
      .finally(() => setLoading(false));
  }, [isPickerOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isPickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closePicker(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isPickerOpen, closePicker]);

  if (!isPickerOpen) return null;

  function getEntries(category: string): ModelEntry[] {
    return (manifest[category] ?? []).map((p) => ({
      name:     prettifyName(p.split('/').pop() ?? p),
      path:     p,
      category,
    }));
  }

  function handleSelect(entry: ModelEntry) {
    closePicker();
    pickerCallback.current?.(entry);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) closePicker();
  }

  function handleTabClick(cat: string) {
    setActiveCategory(cat);
    setCurrentPage(1);
    setHoveredPath(null);
  }

  function handleCardHover(path: string) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredPath(path), 220);
  }

  function handleCardLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }

  const entries    = getEntries(activeCategory);
  const total      = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page       = Math.min(currentPage, totalPages);
  const start      = (page - 1) * PAGE_SIZE;
  const pageItems  = entries.slice(start, start + PAGE_SIZE);
  const endIdx     = Math.min(start + PAGE_SIZE, total);

  return (
    <div
      className="mp-overlay visible"
      id="modelPickerOverlay"
      onClick={handleOverlayClick}
    >
      <div className="mp-panel mp-panel-wide">
        {/* Header */}
        <div className="mp-header">
          <span className="mp-title">📦 Chọn Model</span>
          <button className="mp-close-btn" onClick={closePicker}>✕</button>
        </div>

        <div className="mp-body-row">
          {/* Left: tabs + grid + footer */}
          <div className="mp-main">
            {/* Tabs */}
            <div className="mp-tabs" id="mpTabs">
              {loading ? (
                <span className="mp-no-tabs">Đang tải danh sách model…</span>
              ) : categories.length === 0 ? (
                <span className="mp-no-tabs">Không tìm thấy thư mục nào</span>
              ) : (
                categories.map((cat) => {
                  const count = manifest[cat]?.length ?? 0;
                  return (
                    <button
                      key={cat}
                      className={`mp-tab${cat === activeCategory ? ' active' : ''}`}
                      onClick={() => handleTabClick(cat)}
                    >
                      {getCategoryIcon(cat)}{' '}
                      <span className="mp-tab-label">{cat}</span>
                      <span className="mp-tab-count">{count}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Grid */}
            <div className="mp-body">
              <div className="mp-grid" id="mpGrid">
                {loading ? (
                  <div className="mp-empty">Đang tải danh sách model…</div>
                ) : pageItems.length === 0 ? (
                  <div className="mp-empty">
                    📂 Chưa có model nào trong thư mục <strong>{activeCategory}</strong>
                  </div>
                ) : (
                  pageItems.map((entry) => (
                    <button
                      key={entry.path}
                      className={`mp-card${hoveredPath === entry.path ? ' hovered' : ''}`}
                      title={entry.path}
                      onClick={() => handleSelect(entry)}
                      onMouseEnter={() => handleCardHover(entry.path)}
                      onMouseLeave={handleCardLeave}
                    >
                      <div className="mp-card-thumb">{getCategoryIcon(entry.category)}</div>
                      <div className="mp-card-name">{entry.name}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mp-footer">
              <span className="mp-count" id="mpCount">
                {total === 0 ? '0 model' : `${start + 1}–${endIdx} / ${total} model`}
              </span>
              <div className="mp-pagination" id="mpPagination">
                {totalPages > 1 && (
                  <>
                    <button
                      className="mp-page-btn"
                      disabled={page === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >‹</button>
                    <span className="mp-page-info">Trang {page} / {totalPages}</span>
                    <button
                      className="mp-page-btn"
                      disabled={page === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >›</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: 3D preview */}
          <ModelPreview path={hoveredPath} />
        </div>
      </div>
    </div>
  );
}
