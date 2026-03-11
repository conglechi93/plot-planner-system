import { ArcRotateCamera, Vector3, Scene } from '@babylonjs/core';

/**
 * Tạo ArcRotateCamera nhìn từ trên xuống, xoay quanh điểm gốc.
 * - alpha: góc ngang
 * - beta: góc dọc (nhìn chếch xuống)
 * - radius: khoảng cách đến target
 */
export function createCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    'mainCamera',
    -Math.PI / 2,  // alpha: nhìn từ hướng -Z
    Math.PI / 3.5, // beta: góc dọc ~51° so với mặt phẳng
    42,            // radius: khoảng cách ban đầu
    Vector3.Zero(),
    scene
  );

  // Gắn điều khiển chuột/cảm ứng vào canvas
  camera.attachControl(canvas, true);

  // Giới hạn zoom
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 90;

  // Giới hạn góc đứng - không cho phép nhìn từ dưới đất lên
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.1;

  // Độ trơn (inertia) khi xoay và zoom
  camera.inertia = 0.65;
  camera.wheelPrecision = 5;

  return camera;
}
