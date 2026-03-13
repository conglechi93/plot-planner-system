# 🏗️ Plot Planner + 🎲 Cờ Tỉ Phú (Monopoly)

Ứng dụng kết hợp **3D Plot Planner** (thiết kế mặt bằng) và **Cờ Tỉ Phú Việt Nam** (Monopoly) chạy trên cùng một sân 50×50 đơn vị, được dựng bằng Babylon.js và React.

---

## Tính năng

### ✏️ Chế độ Thiết Kế (Plot Planner)
- Đặt, di chuyển, xoay, xóa mô hình 3D (nhà, cây, cỏ, …)
- Chỉnh màu và vật liệu cho các mô hình procedural
- Gizmo kéo-thả để biến đổi chính xác (position / rotation / scale)
- Xuất / nhập layout dưới dạng JSON
- Babylon Inspector tích hợp để debug scene

### 🎲 Chế độ Cờ Tỉ Phú
- **40 ô đất** theme Việt Nam bao quanh viền 50×50 (Đồng Tháp → Vịnh Hạ Long)
- **1 người chơi** + tối đa **3 AI** (aggressive / balanced / conservative)
- Tiền đơn vị **triệu VNĐ** — khởi điểm 1 500 triệu/người
- **Token 3D procedural** (cylinder + sphere) mỗi người màu khác nhau
- **Board 3D render** trực tiếp lên ground — tile màu theo nhóm, label DynamicTexture
- **Luật đầy đủ**: GO bonus, tù, doubles, xây nhà/khách sạn, thế chấp, phá sản
- **Thẻ Cơ Hội & Công Quỹ** (16 thẻ mỗi loại, tiếng Việt)
- **Free Parking** tích lũy tiền phạt/thuế
- AI tự động hành động sau 1 giây (dễ theo dõi)
- **Game Over screen** khi chỉ còn 1 người

---

## Cách chạy

```bash
# Lần đầu clone (Git LFS tự pull model về)
git lfs install
git clone <repo-url>

npm install
npm run dev     # http://localhost:5173
npm run build   # production build
```

---

## Hướng dẫn chơi

1. Nhấn **🎲 Chơi Cờ Tỉ Phú** (trong Toolbar bên trái)
2. Nhập tên, chọn số AI (1–3), nhấn **BẮT ĐẦU GAME**
3. 40 ô đất xuất hiện quanh viền, token đứng ở ô XUẤT PHÁT
4. Nhấn **TUNG XÚC XẮC** mỗi lượt
5. Làm theo hướng dẫn: mua đất, đóng thuê, xây nhà, …
6. Còn 1 người sống sót → **THẮNG** 🏆
7. Nhấn **✏️ Quay lại Thiết kế** để thoát, bố cục 3D vẫn còn nguyên

---

## Cấu trúc dự án

```
src/
├── babylon/
│   ├── core/           # Engine, camera, lighting
│   ├── game/           # BoardRenderer, TokenRenderer, HouseHotelRenderer
│   ├── interactions/   # SelectionSystem, PlacementSystem, TransformSystem
│   ├── meshCreators/   # Ground, houseLoader (GLB + procedural)
│   └── scenes/         # sceneFactory
│
├── game/
│   ├── ai/             # pickDecision() — 3 chiến lược AI
│   ├── board/          # boardData (40 ô), tileLayout (tọa độ 3D)
│   ├── cards/          # chanceCards, communityChestCards (16 thẻ mỗi loại)
│   ├── context/        # GameContext + useGame()
│   ├── engine/         # gameReducer (pure), rentCalculator, buildingActions, cardActions
│   ├── hooks/          # useGameEngine — bridge reducer ↔ React + Babylon 3D
│   └── types/          # GameState, Player, Square, Card, PendingAction, …
│
├── components/
│   ├── game/           # GameHUD, DicePanel, PlayerPanel, ActionDialog, BuildPanel, …
│   └── (planner)       # Toolbar, PropertyPanel, ModelPickerModal, StatusBar
│
├── context/            # SelectionContext (planner)
├── hooks/              # usePlanner, useInspector
└── types/              # HouseInstance, ModelEntry
```

---

## Kiến trúc game engine

```
GameEvent ──► gameReducer (pure) ──► GameState
                                          │
                              useGameEngine (React hook)
                              ├─ useReducer  → re-render UI
                              ├─ AI timer    → pickDecision() sau 1s
                              └─ Babylon sync → token/house mesh
                                          │
                              GameContext → useGame() → components
```

---

## Ô đất theo nhóm màu

| Nhóm | Ô đất |
|------|-------|
| 🟫 Brown | Đồng Tháp, An Giang |
| 🩵 Light Blue | Cần Thơ, Tiền Giang, Vĩnh Long |
| 🩷 Pink | Huế, Đà Nẵng, Quảng Nam |
| 🟧 Orange | Bình Định, Khánh Hòa, Lâm Đồng |
| 🟥 Red | Gia Lai, Đắk Lắk, Bình Dương |
| 🟨 Yellow | Đồng Nai, Bà Rịa-Vũng Tàu, Bình Thuận |
| 🟩 Green | TP. Hồ Chí Minh, Hà Nội, Đà Lạt |
| 🟦 Dark Blue | Hội An, Vịnh Hạ Long |

Ngoài ra: 4 nhà ga (railroad), 2 tiện ích (utility), 3 thẻ Cơ Hội, 3 thẻ Công Quỹ, 2 ô thuế, và 4 ô đặc biệt (GO, Tù, Đỗ xe, Vào tù).

---

## Tech stack

| | |
|---|---|
| 3D Engine | Babylon.js 6.x |
| UI | React 19 + TypeScript (strict) |
| Build | Vite 5 |
| State game | Pure reducer + `useReducer` |
| State planner | Refs + callbacks |
| Style | Inline CSS (zero UI deps) |

---

## Assets 3D

File model nằm trong `public/models/`, được quản lý bằng **Git LFS** và nén bằng **Draco**.

| File | Trước | Sau |
|---|---|---|
| stylized_sakura_tree.glb | 48 MB | 13 MB |
| maple_tree.glb | 5.5 MB | 3.5 MB |
| dice.glb | 1.6 MB | 68 KB |
| charmander_house.glb | 1.3 MB | 1.2 MB |
| bus.glb | 212 KB | 140 KB |

Thêm model mới:
```bash
# Compress trước khi commit
npx @gltf-transform/cli optimize ten_model.glb ten_model.glb --compress draco

# Git LFS tự track nhờ .gitattributes
git add public/models/ten_model.glb
git commit -m "feat: add <tên model>"
```
