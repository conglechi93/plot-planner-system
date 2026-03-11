/** Một entry model đã được parse từ manifest */
export interface ModelEntry {
  /** Tên hiển thị (filename không extension, prettified) */
  name: string;
  /** URL đường dẫn tới file .glb / .gltf */
  path: string;
  /** Thư mục chứa model (= tên tab) */
  category: string;
}

/** Cấu trúc file manifest.json được sinh tự động bởi Vite plugin */
export type ModelsManifest = Record<string, string[]>;
