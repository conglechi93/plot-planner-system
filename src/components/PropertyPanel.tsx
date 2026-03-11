import { useState, useEffect } from 'react';
import { AbstractMesh, PBRMaterial, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { useSelection } from '../context/useSelection';
import type { HouseInstance } from '../types/HouseInstance';
import type { GizmoMode } from '../hooks/usePlanner';
import { toDegrees, toRadians } from '../utils/math';

type PartKey = 'body' | 'roof' | 'door' | 'window' | 'foundation';
type PanelTab = 'transform' | 'material';

const PART_PREFIXES: Record<PartKey, string[]> = {
  body:       ['house_body_'],
  roof:       ['house_roof_', 'house_eave_', 'house_chimney_', 'house_chimneycap_'],
  door:       ['house_door_', 'house_dframe_', 'house_knob_', 'house_step_'],
  window:     ['house_win_', 'house_wframe_'],
  foundation: ['house_found_'],
};

const PALETTE: string[] = [
  '#F5E4CE', '#EDD5A3', '#F2C9A6', '#D8BDB8', '#B8CDD8', '#C2D5BA',
  '#E07840', '#C85248', '#9A6E4A', '#6888A0', '#50885A', '#909060',
  '#7A3B18', '#8B4513', '#425A68', '#2A5A3A', '#344855', '#181818',
];

const PRESETS = [
  { label: 'Vữa',      icon: '🪨', roughness: 0.90, metallic: 0.00 },
  { label: 'Gạch',     icon: '🧱', roughness: 0.96, metallic: 0.00 },
  { label: 'Gỗ',       icon: '🪵', roughness: 0.72, metallic: 0.02 },
  { label: 'Sơn',      icon: '🎨', roughness: 0.50, metallic: 0.00 },
  { label: 'Kim loại', icon: '⚙️',  roughness: 0.28, metallic: 0.85 },
];

function hexToColor3(hex: string): Color3 {
  return new Color3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );
}

function isProceduralHouse(house: HouseInstance): boolean {
  return house.mesh.getChildMeshes().some((m) => m.name.startsWith('house_body_'));
}

function getPartMeshes(house: HouseInstance, part: PartKey, procedural: boolean): AbstractMesh[] {
  const all = house.mesh.getChildMeshes().filter((m) => m.material);
  if (!procedural) return all;
  const prefixes = PART_PREFIXES[part];
  return all.filter((m) => prefixes.some((p) => m.name.startsWith(p)));
}

function getSliderValues(house: HouseInstance, part: PartKey, procedural: boolean) {
  const meshes = getPartMeshes(house, part, procedural);
  const mat = meshes.find((m) => m.material instanceof PBRMaterial)?.material as PBRMaterial | undefined;
  return {
    roughness: Math.round((mat?.roughness ?? 0.85) * 100),
    metallic:  Math.round((mat?.metallic  ?? 0)    * 100),
  };
}

interface Props {
  gizmoMode: GizmoMode;
  setGizmoMode: (mode: GizmoMode) => void;
}

export function PropertyPanel({ gizmoMode, setGizmoMode }: Props) {
  const { selectedHouse } = useSelection();

  const [panelTab, setPanelTab] = useState<PanelTab>('transform');
  const [currentPart, setCurrentPart] = useState<PartKey>('body');
  const [roughness, setRoughness] = useState(85);
  const [metallic, setMetallic]   = useState(0);

  // ── Transform state (synced from mesh via polling) ──
  const [posX, setPosX] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [rotDeg, setRotDeg] = useState(0);
  const [scale, setScale] = useState(1);

  // Poll mesh transform values every 120ms while selected
  useEffect(() => {
    if (!selectedHouse) return;
    // Initial sync
    const sync = () => {
      const m = selectedHouse.mesh;
      setPosX(Math.round(m.position.x * 10) / 10);
      setPosZ(Math.round(m.position.z * 10) / 10);
      setRotDeg(Math.round(((toDegrees(m.rotation.y) % 360) + 360) % 360));
      setScale(Math.round(m.scaling.x * 100) / 100);
    };
    sync();
    const id = setInterval(sync, 120);
    return () => clearInterval(id);
  }, [selectedHouse]);

  if (!selectedHouse) return null;

  const procedural = isProceduralHouse(selectedHouse);
  const t = selectedHouse.type.toLowerCase();
  const emoji = t.includes('house') ? '🏠'
              : t.includes('grass') || t.includes('tree') ? '🌿'
              : '📦';

  // ── Transform handlers ──
  function applyPosX(val: number) {
    setPosX(val);
    selectedHouse!.mesh.position.x = val;
  }
  function applyPosZ(val: number) {
    setPosZ(val);
    selectedHouse!.mesh.position.z = val;
  }
  function applyRot(deg: number) {
    setRotDeg(deg);
    selectedHouse!.mesh.rotation.y = toRadians(deg);
    selectedHouse!.rotation = selectedHouse!.mesh.rotation;
  }
  function applyScale(s: number) {
    setScale(s);
    selectedHouse!.mesh.scaling = new Vector3(s, s, s);
  }

  // ── Material handlers ──
  function handlePartChange(part: PartKey) {
    setCurrentPart(part);
    const vals = getSliderValues(selectedHouse!, part, procedural);
    setRoughness(vals.roughness);
    setMetallic(vals.metallic);
  }
  function handleColor(hex: string) {
    const color = hexToColor3(hex);
    getPartMeshes(selectedHouse!, currentPart, procedural).forEach((m) => {
      if (m.material instanceof PBRMaterial)           m.material.albedoColor = color;
      else if (m.material instanceof StandardMaterial) m.material.diffuseColor = color;
    });
  }
  function handlePreset(preset: { roughness: number; metallic: number }) {
    setRoughness(Math.round(preset.roughness * 100));
    setMetallic(Math.round(preset.metallic * 100));
    getPartMeshes(selectedHouse!, currentPart, procedural).forEach((m) => {
      if (m.material instanceof PBRMaterial) {
        m.material.roughness = preset.roughness;
        m.material.metallic  = preset.metallic;
      }
    });
  }
  function handleRoughness(val: number) {
    setRoughness(val);
    getPartMeshes(selectedHouse!, currentPart, procedural).forEach((m) => {
      if (m.material instanceof PBRMaterial) m.material.roughness = val / 100;
    });
  }
  function handleMetallic(val: number) {
    setMetallic(val);
    getPartMeshes(selectedHouse!, currentPart, procedural).forEach((m) => {
      if (m.material instanceof PBRMaterial) m.material.metallic = val / 100;
    });
  }

  const GIZMO_BTNS: { mode: GizmoMode; icon: string; tip: string }[] = [
    { mode: 'position', icon: '↕️', tip: 'Move (kéo mũi tên)' },
    { mode: 'rotation', icon: '🔄', tip: 'Rotate (kéo vòng)' },
    { mode: 'scale',    icon: '⤡',  tip: 'Scale (kéo tay cầm)' },
    { mode: null,       icon: '⊘',  tip: 'Tắt gizmo' },
  ];

  const partBtns: { key: PartKey; label: string }[] = [
    { key: 'body',       label: '🧱 Tường' },
    { key: 'roof',       label: '⛺ Mái' },
    { key: 'door',       label: '🚪 Cửa' },
    { key: 'window',     label: '🪟 Kính' },
    { key: 'foundation', label: '⬛ Móng' },
  ];

  return (
    <div id="propertyPanel" className="visible">
      {/* Header */}
      <div className="pp-header">
        <span id="ppTitle">{emoji} {selectedHouse.type}</span>
        {/* Tab switcher */}
        <div className="pp-tab-switcher">
          <button
            className={`pp-tab-btn${panelTab === 'transform' ? ' active' : ''}`}
            onClick={() => setPanelTab('transform')}
            title="Transform"
          >⟳ Transform</button>
          <button
            className={`pp-tab-btn${panelTab === 'material' ? ' active' : ''}`}
            onClick={() => setPanelTab('material')}
            title="Material"
          >🎨 Material</button>
        </div>
      </div>

      <div className="pp-content">

        {/* ─── TRANSFORM TAB ─── */}
        {panelTab === 'transform' && (
          <>
            {/* Gizmo mode buttons */}
            <div className="pp-label">Gizmo</div>
            <div className="pp-gizmo-btns">
              {GIZMO_BTNS.map(({ mode, icon, tip }) => (
                <button
                  key={String(mode)}
                  className={`pp-gizmo-btn${gizmoMode === mode ? ' active' : ''}`}
                  title={tip}
                  onClick={() => setGizmoMode(mode)}
                >
                  {icon}
                </button>
              ))}
            </div>

            <div className="pp-divider" />

            {/* Position */}
            <div className="pp-label">Position</div>
            <div className="pp-xyz-row">
              <label className="pp-xyz-label" style={{ color: '#ff7070' }}>X</label>
              <input
                type="number"
                className="pp-xyz-input"
                step={0.5}
                value={posX}
                onChange={(e) => applyPosX(+e.target.value)}
              />
              <label className="pp-xyz-label" style={{ color: '#70b0ff' }}>Z</label>
              <input
                type="number"
                className="pp-xyz-input"
                step={0.5}
                value={posZ}
                onChange={(e) => applyPosZ(+e.target.value)}
              />
            </div>

            <div className="pp-divider" />

            {/* Rotation */}
            <div className="pp-label">
              Rotation Y <span className="pp-val">{rotDeg}°</span>
            </div>
            <div className="pp-rot-row">
              <input
                type="range"
                className="pp-slider"
                min={0} max={359} step={1}
                value={rotDeg}
                onChange={(e) => applyRot(+e.target.value)}
              />
              <div className="pp-rot-btns">
                {[0, 90, 180, 270].map((d) => (
                  <button
                    key={d}
                    className={`pp-rot-snap${rotDeg === d ? ' active' : ''}`}
                    onClick={() => applyRot(d)}
                  >{d}°</button>
                ))}
              </div>
            </div>

            <div className="pp-divider" />

            {/* Scale */}
            <div className="pp-label">
              Scale <span className="pp-val">×{scale}</span>
            </div>
            <div className="pp-xyz-row">
              <input
                type="range"
                className="pp-slider"
                min={0.1} max={5} step={0.05}
                value={scale}
                onChange={(e) => applyScale(+e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="pp-xyz-input"
                style={{ width: 52, marginLeft: 6 }}
                step={0.1} min={0.1} max={10}
                value={scale}
                onChange={(e) => applyScale(+e.target.value)}
              />
            </div>
          </>
        )}

        {/* ─── MATERIAL TAB ─── */}
        {panelTab === 'material' && (
          <>
            {/* Part tabs (procedural only) */}
            {procedural ? (
              <div className="pp-part-group pp-parts">
                {partBtns.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`pp-part${currentPart === key ? ' active' : ''}`}
                    onClick={() => handlePartChange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div id="ppGlbNote" style={{ display: 'flex' }}>
                ℹ️ Model 3D – áp lên toàn bộ
              </div>
            )}

            <div className="pp-divider" />

            <div className="pp-label">Màu sắc</div>
            <div className="pp-colors">
              {PALETTE.map((hex) => (
                <button
                  key={hex}
                  className="pp-swatch"
                  style={{ background: hex }}
                  title={hex}
                  onClick={() => handleColor(hex)}
                />
              ))}
            </div>

            <div className="pp-divider" />

            <div className="pp-label">Vật liệu nhanh</div>
            <div className="pp-presets">
              {PRESETS.map((p) => (
                <button key={p.label} className="pp-preset" onClick={() => handlePreset(p)}>
                  <span className="pp-preset-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="pp-divider" />

            <div className="pp-slider-row">
              <div className="pp-label">
                Độ nhám <span className="pp-val">{roughness}%</span>
              </div>
              <input type="range" className="pp-slider" min={0} max={100}
                value={roughness} onChange={(e) => handleRoughness(+e.target.value)} />
            </div>

            <div className="pp-slider-row">
              <div className="pp-label">
                Kim loại <span className="pp-val">{metallic}%</span>
              </div>
              <input type="range" className="pp-slider" min={0} max={100}
                value={metallic} onChange={(e) => handleMetallic(+e.target.value)} />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
