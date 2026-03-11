/**
 * Snap một giá trị về điểm lưới gần nhất.
 * Ví dụ: snap(2.3, 1) = 2, snap(2.6, 1) = 3
 *
 * @param value - Giá trị cần snap
 * @param grid  - Kích thước ô lưới (mét)
 */
export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

/**
 * Sinh ID duy nhất cho một HouseInstance.
 */
export function generateId(): string {
  return `house_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Chuyển radian sang độ.
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Chuyển độ sang radian.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
