# 🎮 UI Upgrade Checklist — Cờ Tỷ Phú 3D

> Cập nhật trạng thái sau mỗi task: `⬜ pending` → `🔄 in progress` → `✅ done`

---

## Phase 1 — Design Consistency *(quick wins)*

> Mục tiêu: thống nhất visual language, xoá inconsistency, cải thiện các component hiện có.

| # | Task | File(s) liên quan | Status |
|---|------|--------------------|--------|
| 1.1 | Dark-theme `PropertyCard` — xoá background trắng, đồng bộ với `ActionDialog` | `components/game/PropertyCard.tsx` | ✅ |
| 1.2 | Extract `GROUP_COLORS` / `GROUP_LABELS` ra file constants chung, xoá duplicate ở 4 chỗ | `game/constants/groupColors.ts` *(new)*, `PlayerPanel`, `ActionDialog`, `BuildPanel`, `PropertyCard` | ✅ |
| 1.3 | Redesign `BuildPanel` — nút +/− lớn hơn, icon 🏠/🏨, progress dots số nhà, tooltip giá | `components/game/BuildPanel.tsx` | ✅ |
| 1.4 | Cải thiện `DicePanel` — tách khu xúc xắc / khu nút, visual hierarchy, label trạng thái AI | `components/game/DicePanel.tsx` | ✅ |
| 1.5 | Game Over screen — bảng xếp hạng tất cả players, stats trận, nút Chơi lại + Về thiết kế | `components/game/GameHUD.tsx` + `GameOverScreen.tsx` *(new)* | ✅ |

---

## Phase 2 — Live Feedback *(experience)*

> Mục tiêu: người chơi cảm nhận được mọi thay đổi trạng thái ngay lập tức.

| # | Task | File(s) liên quan | Status |
|---|------|--------------------|--------|
| 2.1 | Floating money popup — số +/− bay lên fade out khi tiền thay đổi | `components/game/PlayerPanel.tsx` (inline hook + component) | ✅ |
| 2.2 | Hiển thị `freeParkingPot` trên HUD — badge "🅿️ Quỹ chung: X tr" khi pot > 0 | `components/game/GameHUD.tsx` | ✅ |
| 2.3 | Net worth bar trong `PlayerPanel` — progress bar tương đối so với player giàu nhất | `components/game/PlayerPanel.tsx`, `game/utils/netWorth.ts` *(new)* | ✅ |
| 2.4 | Shake animation khi không đủ tiền — nút MUA / nút xây nhà rung khi balance < cost | `components/game/ActionDialog.tsx`, `BuildPanel.tsx` | ✅ |

---

## Phase 3 — Polish *(notifications & transitions)*

> Mục tiêu: game có cảm giác "alive" — người chơi không bị miss sự kiện quan trọng.

| # | Task | File(s) liên quan | Status |
|---|------|--------------------|--------|
| 3.1 | `TurnBanner` — slide-in từ top khi đổi lượt, tự dismiss sau 1.5s | `components/game/TurnBanner.tsx` *(new)*, `GameHUD.tsx` | ✅ |
| 3.2 | Toast notification system — thuê, rút thẻ, xây nhà, vào tù, phá sản | `components/game/ToastManager.tsx` *(new)*, `GameHUD.tsx` | ✅ |

---

## Phase 4 — First-run Experience *(lobby)*

> Mục tiêu: màn hình bắt đầu game xứng tầm, thay thế dropdown nhỏ trong Toolbar.

| # | Task | File(s) liên quan | Status |
|---|------|--------------------|--------|
| 4.1 | `GameLobbyScreen` full-screen — tên player, số AI, strategy per bot, preview danh sách | `components/game/GameLobbyScreen.tsx` *(new)*, `App.tsx`, `Toolbar.tsx` | ✅ |
| 4.2 | Token color picker — chọn màu token, loại trừ màu AI đã dùng | `components/game/GameLobbyScreen.tsx`, `game/engine/gameReducer.ts` | ✅ |

---

## 📋 Tóm tắt tiến độ

```
Phase 1  [█████]  5 / 5  done ✅
Phase 2  [█████]  4 / 4  done ✅
Phase 3  [██░░░]  2 / 2  done ✅
Phase 4  [█████]  2 / 2  done ✅
─────────────────────────────
Total    [█████]  13 / 13 done ✅
```

---

## 📝 Ghi chú

- **Bug fix ngoài checklist:** Infinite card-draw loop khi landing on Community Chest / Chance — đã fix tại `gameReducer.ts` (commit `a6f679e`)
- **Bug fix ngoài checklist:** Token scale sai cho Soldier / Fox / character_2 — đã fix tại `TokenRenderer.ts` (commit `871be89`)

