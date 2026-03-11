import {
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Scene,
  ShadowGenerator,
} from '@babylonjs/core';

export interface LightSetup {
  dirLight: DirectionalLight;
  shadowGen: ShadowGenerator;
}

/**
 * Tạo hệ thống ánh sáng gồm:
 * - HemisphericLight: ánh sáng môi trường (ambient) mềm từ trên
 * - DirectionalLight: ánh sáng định hướng tạo chiều sâu và bóng đổ
 * - ShadowGenerator: bóng đổ mềm (blur exponential shadow map)
 */
export function setupLighting(scene: Scene): LightSetup {
  // --- Hemispheric Light (ambient) ---
  const hemiLight = new HemisphericLight(
    'hemiLight',
    new Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.65;
  hemiLight.diffuse = new Color3(1.0, 0.98, 0.9);         // Trắng ấm
  hemiLight.groundColor = new Color3(0.25, 0.30, 0.22);   // Phản chiếu đất, hơi xanh lá

  // --- Directional Light (ánh nắng) ---
  const dirLight = new DirectionalLight(
    'dirLight',
    new Vector3(-1, -2, -1).normalize(),
    scene
  );
  dirLight.position = new Vector3(20, 40, 20);
  dirLight.intensity = 1.1;
  dirLight.diffuse = new Color3(1.0, 0.95, 0.8);  // Vàng nắng nhẹ

  // --- Shadow Generator (bóng đổ mềm) ---
  const shadowGen = new ShadowGenerator(2048, dirLight);
  shadowGen.useBlurExponentialShadowMap = true;  // Bóng mờ, đẹp hơn
  shadowGen.blurKernel = 32;
  shadowGen.darkness = 0.35;  // 0 = tối hoàn toàn, 1 = không có bóng

  return { dirLight, shadowGen };
}
