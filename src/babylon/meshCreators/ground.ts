import { MeshBuilder, StandardMaterial, DynamicTexture, Color3, Scene, Mesh } from '@babylonjs/core';

/**
 * Tạo mặt đất 100x100 với texture lưới kẻ để dễ căn chỉnh nhà.
 * Ground là mesh duy nhất được dùng làm mục tiêu raycast cho việc đặt nhà.
 */
export function createGround(scene: Scene): Mesh {
  const ground = MeshBuilder.CreateGround(
    'ground',
    {
      width: 100,
      height: 100,
      subdivisions: 2,
    },
    scene
  );

  ground.isPickable = true; // Cho phép raycast chọn mặt đất khi đặt nhà
  ground.receiveShadows = true; // Bật nhận bóng đổ từ nhà

  // --- Texture lưới độ phân giải cao ---
  const textureSize = 1024;
  const gridTexture = new DynamicTexture('groundTex', textureSize, scene, false);
  const ctx = gridTexture.getContext() as CanvasRenderingContext2D;

  // Nền cỏ xanh
  ctx.fillStyle = '#5c9042';
  ctx.fillRect(0, 0, textureSize, textureSize);

  // Texture bàn cờ nhẹ để tạo chiều sâu
  ctx.fillStyle = 'rgba(0, 20, 0, 0.05)';
  const patchSize = textureSize / 10;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(c * patchSize, r * patchSize, patchSize, patchSize);
      }
    }
  }

  const cellSize = textureSize / 100;

  // Đường kẻ nhỏ (1m) – mờ nhẹ
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.10)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i <= 100; i++) {
    const pos = i * cellSize;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, textureSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(textureSize, pos); ctx.stroke();
  }

  // Đường kẻ lớn (5m) – đậm hơn để dễ định hướng
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 20; i++) {
    const pos = i * cellSize * 5;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, textureSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(textureSize, pos); ctx.stroke();
  }

  gridTexture.update();

  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseTexture = gridTexture;
  groundMat.specularColor = new Color3(0.02, 0.02, 0.02); // Mờ, không bóng loáng

  ground.material = groundMat;

  return ground;
}
