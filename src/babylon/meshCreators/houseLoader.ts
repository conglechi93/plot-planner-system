import {
  Scene,
  Mesh,
  AbstractMesh,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  SceneLoader,
} from '@babylonjs/core';
// Đăng ký GLB/GLTF loader (side-effect import)
import '@babylonjs/loaders/glTF';

import type { HouseInstance } from '../../types/HouseInstance';
import { generateId } from '../../utils/math';

export type HouseType = 'small' | 'medium';

/** Chiều cao phần móng (foundation) */
const FH = 0.25;

interface HouseConfig {
  glbPath: string;
  /** Scale áp dụng lên GLB sau khi load (1.0 = giữ nguyên) */
  glbScale: number;
  body: { w: number; h: number; d: number };
  roofHeight: number;
  /** diameterBottom của cone 4 mặt. Cần ≥ body.w × √2 để mái phủ hết thân */
  roofDiameter: number;
  bodyColor: Color3;
  roofColor: Color3;
  doorColor: Color3;
  chimneyOffset: { x: number; z: number };
  chimneySize: { w: number; h: number; d: number };
}

const GLB_MODEL = '/models/charmander_house.glb';

const HOUSE_CONFIG: Record<HouseType, HouseConfig> = {
  small: {
    glbPath: GLB_MODEL,
    glbScale: 1.0,
    body: { w: 3.5, h: 2.5, d: 3.0 },
    roofHeight: 1.6,
    roofDiameter: 5.2,                           // 5.2 / √2 ≈ 3.68m > body.w = 3.5 ✓
    bodyColor: new Color3(0.87, 0.44, 0.25),     // Cam đất
    roofColor: new Color3(0.48, 0.22, 0.10),     // Nâu sẫm
    doorColor: new Color3(0.32, 0.16, 0.07),
    chimneyOffset: { x: 0.55, z: -0.40 },
    chimneySize: { w: 0.44, h: 1.10, d: 0.44 },
  },
  medium: {
    glbPath: GLB_MODEL,
    glbScale: 1.5,                               // Medium = phiên bản lớn hơn 1.5×
    body: { w: 5.5, h: 3.2, d: 4.5 },
    roofHeight: 2.2,
    roofDiameter: 8.0,                           // 8.0 / √2 ≈ 5.66m > body.w = 5.5 ✓
    bodyColor: new Color3(0.88, 0.87, 0.78),     // Trắng kem
    roofColor: new Color3(0.55, 0.28, 0.14),     // Nâu đỏ
    doorColor: new Color3(0.28, 0.14, 0.06),
    chimneyOffset: { x: 1.2, z: -0.8 },
    chimneySize: { w: 0.55, h: 1.40, d: 0.55 },
  },
};

/**
 * Load một model GLB/GLTF tùy ý từ URL path.
 * Dùng cho ModelPicker – không phụ thuộc HOUSE_CONFIG.
 * Fallback: hình hộp xám đơn giản nếu load thất bại.
 */
export async function createModelInstance(
  scene: Scene,
  glbPath: string,
  displayName: string,
  position: Vector3 = Vector3.Zero()
): Promise<HouseInstance> {
  const id = generateId();
  let rootMesh: AbstractMesh;

  try {
    const result = await SceneLoader.ImportMeshAsync('', glbPath, '', scene);
    rootMesh = result.meshes[0];
    rootMesh.name = `model_root_${id}`;
  } catch {
    // Fallback: hình hộp xám đơn giản
    rootMesh = buildFallbackBox(scene, id);
  }

  rootMesh.position = position.clone();
  rootMesh.position.y = 0;
  tagMeshWithHouseId(rootMesh, id);

  return {
    id,
    mesh: rootMesh,
    type: displayName,
    path: glbPath,
    position: rootMesh.position,
    rotation: rootMesh.rotation,
  };
}

/** Fallback box khi GLB không load được */
function buildFallbackBox(scene: Scene, id: string): Mesh {
  const root = new Mesh(`model_root_${id}`, scene);
  root.isPickable = false;

  const box = MeshBuilder.CreateBox(`model_body_${id}`, { width: 4, height: 3, depth: 4 }, scene);
  box.position.y = 1.5;
  box.parent = root;
  box.isPickable = true;

  const mat = pbr(`model_mat_${id}`, scene, new Color3(0.55, 0.55, 0.55), 0.80);
  box.material = mat;

  return root;
}

/**
 * Tạo một HouseInstance mới.
 * Ưu tiên load file GLB từ /public/models/.
 * Nếu không tìm thấy model, fallback sang mesh thủ công (procedural).
 */
export async function createHouseInstance(
  scene: Scene,
  type: HouseType,
  position: Vector3 = Vector3.Zero()
): Promise<HouseInstance> {
  const id = generateId();
  const config = HOUSE_CONFIG[type];

  let rootMesh: AbstractMesh;

  try {
    const result = await SceneLoader.ImportMeshAsync('', config.glbPath, '', scene);
    rootMesh = result.meshes[0];
    rootMesh.name = `house_root_${id}`;
    // Áp dụng scale (small = 1.0, medium = 1.5)
    rootMesh.scaling = new Vector3(config.glbScale, config.glbScale, config.glbScale);
  } catch {
    rootMesh = buildProceduralHouse(scene, id, type);
  }

  rootMesh.position = position.clone();
  rootMesh.position.y = 0;

  tagMeshWithHouseId(rootMesh, id);

  return {
    id,
    mesh: rootMesh,
    type,
    position: rootMesh.position,
    rotation: rootMesh.rotation,
  };
}

/** Gắn houseId vào metadata của mesh và tất cả children */
function tagMeshWithHouseId(mesh: AbstractMesh, houseId: string): void {
  mesh.metadata = { ...mesh.metadata, houseId };
  mesh.getChildMeshes().forEach((child) => {
    child.metadata = { ...child.metadata, houseId };
  });
}

/** Helper: tạo PBRMaterial với các thông số cơ bản */
function pbr(
  name: string,
  scene: Scene,
  color: Color3,
  roughness: number,
  metallic = 0
): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  mat.albedoColor = color;
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}

/**
 * Xây ngôi nhà bằng Babylon.js primitive meshes.
 *
 * Cấu trúc node:
 *   root          – pivot (không có geometry)
 *   ├─ foundation – móng bê tông
 *   ├─ body       – thân nhà  ← isPickable = true
 *   ├─ roof       – mái hình chóp 4 mặt
 *   ├─ eave       – gờ mái (viền chân mái)
 *   ├─ chimney    – ống khói + nắp
 *   ├─ doorFrame  – khung cửa ra vào
 *   ├─ door       – cánh cửa
 *   ├─ doorKnob   – tay nắm (PBR metallic brass)
 *   ├─ step       – bậc thềm trước cửa
 *   └─ windows    – khung + kính (mặt trước, bên trái, bên phải, và sau với medium)
 */
function buildProceduralHouse(scene: Scene, id: string, type: HouseType): Mesh {
  const cfg = HOUSE_CONFIG[type];
  const { w, h, d } = cfg.body;
  const bodyTop = FH + h; // Đỉnh tường (trước khi có mái)

  const root = new Mesh(`house_root_${id}`, scene);
  root.isPickable = false;

  // ──────────────────────────────────────────
  // 1. FOUNDATION – móng bê tông
  // ──────────────────────────────────────────
  const found = MeshBuilder.CreateBox(`house_found_${id}`, {
    width: w + 0.5,
    height: FH,
    depth: d + 0.5,
  }, scene);
  found.position.y = FH / 2;
  found.parent = root;
  found.isPickable = false;
  found.material = pbr(`mat_found_${id}`, scene, new Color3(0.72, 0.70, 0.65), 0.92);

  // ──────────────────────────────────────────
  // 2. BODY – thân nhà (điểm click chính)
  // ──────────────────────────────────────────
  const body = MeshBuilder.CreateBox(`house_body_${id}`, {
    width: w,
    height: h,
    depth: d,
  }, scene);
  body.position.y = FH + h / 2;
  body.parent = root;
  body.isPickable = true;
  body.material = pbr(`mat_body_${id}`, scene, cfg.bodyColor, 0.85);

  // ──────────────────────────────────────────
  // 3. ROOF – mái chóp 4 mặt (tessellation=4)
  // Xoay 45° để các cạnh mái căn theo body
  // ──────────────────────────────────────────
  const roof = MeshBuilder.CreateCylinder(`house_roof_${id}`, {
    diameterTop: 0,
    diameterBottom: cfg.roofDiameter,
    height: cfg.roofHeight,
    tessellation: 4,
  }, scene);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = bodyTop + cfg.roofHeight / 2;
  roof.parent = root;
  roof.isPickable = false;
  roof.material = pbr(`mat_roof_${id}`, scene, cfg.roofColor, 0.72);

  // 3a. EAVE – gờ mái nằm ngang (cùng hình dạng/hướng với mái)
  const eave = MeshBuilder.CreateCylinder(`house_eave_${id}`, {
    diameterTop: cfg.roofDiameter + 0.4,
    diameterBottom: cfg.roofDiameter + 0.4,
    height: 0.14,
    tessellation: 4,
  }, scene);
  eave.rotation.y = Math.PI / 4;
  eave.position.y = bodyTop + 0.07;
  eave.parent = root;
  eave.isPickable = false;
  eave.material = pbr(
    `mat_eave_${id}`, scene,
    new Color3(cfg.roofColor.r * 0.80, cfg.roofColor.g * 0.80, cfg.roofColor.b * 0.80),
    0.75
  );

  // ──────────────────────────────────────────
  // 4. CHIMNEY – ống khói + nắp
  // ──────────────────────────────────────────
  const { x: cx, z: cz } = cfg.chimneyOffset;
  const { w: chW, h: chH, d: chD } = cfg.chimneySize;
  const chimneyY = bodyTop + cfg.roofHeight * 0.52;

  const chimney = MeshBuilder.CreateBox(`house_chimney_${id}`, {
    width: chW, height: chH, depth: chD,
  }, scene);
  chimney.position.set(cx, chimneyY, cz);
  chimney.parent = root;
  chimney.isPickable = false;
  chimney.material = pbr(`mat_chimney_${id}`, scene, new Color3(0.50, 0.24, 0.11), 0.95);

  const cap = MeshBuilder.CreateBox(`house_chimneycap_${id}`, {
    width: chW + 0.16, height: 0.10, depth: chD + 0.16,
  }, scene);
  cap.position.set(cx, chimneyY + chH / 2 + 0.06, cz);
  cap.parent = root;
  cap.isPickable = false;
  cap.material = pbr(`mat_chimneycp_${id}`, scene, new Color3(0.35, 0.16, 0.07), 0.90);

  // ──────────────────────────────────────────
  // 5. DOOR – khung + cánh + tay nắm + bậc thềm
  // ──────────────────────────────────────────
  const doorW = type === 'medium' ? 1.0 : 0.82;
  const doorH = h * 0.56;
  const dz = d / 2; // Mặt trước body (+Z)

  // Khung cửa
  const dFrame = MeshBuilder.CreateBox(`house_dframe_${id}`, {
    width: doorW + 0.20, height: doorH + 0.14, depth: 0.12,
  }, scene);
  dFrame.position.set(0, FH + doorH / 2, dz + 0.04);
  dFrame.parent = root;
  dFrame.isPickable = false;
  dFrame.material = pbr(`mat_dframe_${id}`, scene, new Color3(0.88, 0.84, 0.75), 0.80);

  // Cánh cửa
  const door = MeshBuilder.CreateBox(`house_door_${id}`, {
    width: doorW, height: doorH, depth: 0.08,
  }, scene);
  door.position.set(0, FH + doorH / 2, dz + 0.07);
  door.parent = root;
  door.isPickable = false;
  door.material = pbr(`mat_door_${id}`, scene, cfg.doorColor, 0.70);

  // Tay nắm cửa – metallic (đồng thau)
  const knob = MeshBuilder.CreateSphere(`house_knob_${id}`, {
    diameter: 0.11, segments: 8,
  }, scene);
  knob.position.set(doorW * 0.32, FH + doorH * 0.45, dz + 0.13);
  knob.parent = root;
  knob.isPickable = false;
  knob.material = pbr(`mat_knob_${id}`, scene, new Color3(0.84, 0.68, 0.22), 0.22, 0.95);

  // Bậc thềm – ngay ngoài móng trước cửa
  const step = MeshBuilder.CreateBox(`house_step_${id}`, {
    width: doorW + 0.60, height: 0.12, depth: 0.55,
  }, scene);
  step.position.set(0, 0.06, (d + 0.5) / 2 + 0.28);
  step.parent = root;
  step.isPickable = false;
  step.material = pbr(`mat_step_${id}`, scene, new Color3(0.68, 0.66, 0.61), 0.92);

  // ──────────────────────────────────────────
  // 6. WINDOWS – cửa sổ (trước + bên + sau)
  // ──────────────────────────────────────────

  // Material kính – PBR bán trong suốt, phát sáng nhẹ
  const winGlassMat = new PBRMaterial(`mat_wglass_${id}`, scene);
  winGlassMat.albedoColor = new Color3(0.55, 0.78, 0.97);
  winGlassMat.roughness = 0.06;
  winGlassMat.metallic = 0.0;
  winGlassMat.alpha = 0.70;
  winGlassMat.emissiveColor = new Color3(0.06, 0.12, 0.30);

  // Khung cửa sổ
  const winFrameMat = pbr(`mat_wfr_${id}`, scene, new Color3(0.88, 0.84, 0.75), 0.80);

  const winSize = type === 'medium' ? 0.72 : 0.62;
  const winY = FH + h * 0.62;
  const winDepth = 0.07;

  // Mặt TRƯỚC – 2 cửa sổ
  const fxOffsets = type === 'medium' ? [-w / 3.6, w / 3.6] : [-w / 4.2, w / 4.2];
  fxOffsets.forEach((xOff, i) => {
    addWindow(scene, id, `ff${i}`, root,
      { x: xOff, y: winY, z: dz + 0.04 },
      { w: winSize, h: winSize, d: winDepth },
      winGlassMat, winFrameMat
    );
  });

  // Mặt BÊN – 1 cửa sổ mỗi bên (trái + phải)
  [-1, 1].forEach((side, i) => {
    addWindow(scene, id, `fs${i}`, root,
      { x: side * (w / 2 + 0.04), y: winY, z: 0 },
      { w: winDepth, h: winSize, d: winSize },
      winGlassMat, winFrameMat
    );
  });

  // Mặt SAU – chỉ có với medium
  if (type === 'medium') {
    fxOffsets.forEach((xOff, i) => {
      addWindow(scene, id, `fb${i}`, root,
        { x: xOff, y: winY, z: -(dz + 0.04) },
        { w: winSize, h: winSize, d: winDepth },
        winGlassMat, winFrameMat
      );
    });
  }

  return root;
}

/**
 * Helper: tạo một cửa sổ gồm khung gỗ + kính.
 * pos  – tâm cửa sổ (tọa độ local trong root)
 * size – { w, h, d }  (d nhỏ, ví dụ 0.07)
 */
function addWindow(
  scene: Scene,
  id: string,
  suffix: string,
  parent: Mesh,
  pos: { x: number; y: number; z: number },
  size: { w: number; h: number; d: number },
  glassMat: PBRMaterial,
  frameMat: PBRMaterial
): void {
  const ft = 0.08; // độ dày khung

  // Khung (lớn hơn kính)
  const frame = MeshBuilder.CreateBox(`house_wframe_${suffix}_${id}`, {
    width: size.w + ft,
    height: size.h + ft,
    depth: size.d + ft,
  }, scene);
  frame.position.set(pos.x, pos.y, pos.z);
  frame.parent = parent;
  frame.isPickable = false;
  frame.material = frameMat;

  // Kính (nằm trong khung)
  const glass = MeshBuilder.CreateBox(`house_win_${suffix}_${id}`, {
    width: size.w,
    height: size.h,
    depth: size.d,
  }, scene);
  glass.position.set(pos.x, pos.y, pos.z);
  glass.parent = parent;
  glass.isPickable = false;
  glass.material = glassMat;
}
