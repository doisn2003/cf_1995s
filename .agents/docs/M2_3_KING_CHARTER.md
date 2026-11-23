# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M2.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M2.3)

- **Tiểu phân hệ:** `M2.3 - Frontend Modular WMS & Roastery FIFO Workbench + Vitest Frontend Suite (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` Ở Tiểu Phân Hệ M2.3 (8 Files)

Tuyệt đối KHÔNG nhồi nhét toàn bộ giao diện Kho Tổng & Mẻ Rang vào 1 file duy nhất. Tiểu phân hệ **M2.3** bắt buộc tách thành **8 file chuyên biệt** chia đều cho 2 Quân Tốt (`4 + 4 files`):

### Nhóm A: Typed Warehouse API Client & 3 Modular Feature Panels (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\web\src\api\warehouseApi.ts` (Tạo mới):
   - Typed HTTP Client gọi trực tiếp 6 endpoints của `@cf19/api` (`/api/v1/warehouse/overview`, `/api/v1/warehouse/lots`, `/api/v1/warehouse/lots/ingest`, `/api/v1/warehouse/roast-batches`, `/api/v1/warehouse/roast-batches` POST, `/api/v1/warehouse/fifo/allocate`), sử dụng trực tiếp các hàm toán học `warehouseMath.ts` từ `@cf19/shared` làm deterministic fallback khi chạy offline preview.
2. `C:\bib\cf_19\apps\web\src\features\warehouse\LotIngestMacPanel.tsx` (Tạo mới):
   - Bảng tổng hợp Tồn Kho Tổng & Giá vốn MAC (`WarehouseStockSummaryDTO[]`) kèm badge cảnh báo dưới ngưỡng an toàn (`is_below_reorder_threshold`) và mã lô FIFO ưu tiên kế tiếp (`next_fifo_lot_code`).
   - Form Nhập Lô Hàng Tây Nguyên (`IngestWarehouseLotDTO`) kèm khối **Live Preview MAC** tính toán tức thời `effectiveUnitCostVnd` và `projectedNewMacVnd` bằng hàm `calculateEffectiveLotUnitCostVnd` & `calculateMovingAverageCostVnd` từ `@cf19/shared`.
   - Bảng danh sách Lô hàng tại Kho Tổng sắp xếp theo thứ tự FIFO.
3. `C:\bib\cf_19\apps\web\src\features\warehouse\RoasteryBatchLifecyclePanel.tsx` (Tạo mới):
   - Form Hoàn tất Mẻ Rang Xay (`CompleteRoastBatchDTO`) chọn lô nhân xanh nguồn (`GREEN_BEAN`) và mặt hàng hạt rang đích (`ROASTED_COFFEE`).
   - Khối **Live Preview Hao Hụt & Kết Chuyển Giá Vốn**: dùng `calculateRoastYieldLossPct`, `isAbnormalRoastYieldLoss`, `calculateRoastedOutputUnitCostVnd` từ `@cf19/shared`.
   - Cảnh báo trực quan nếu hao hụt ngoài ngưỡng `12.00% – 20.00%` hoặc nếu người dùng chọn lô nhân xanh mới hơn trong khi vẫn còn lô nhân xanh cũ hơn đang `AVAILABLE` mà chưa bật `enforce_fifo: false` (vượt khóa FIFO).
   - Bảng lịch sử các mẻ rang (`RoastBatchDTO[]`).
4. `C:\bib\cf_19\apps\web\src\features\warehouse\FifoAllocationWorkbench.tsx` (Tạo mới):
   - Công cụ Phân bổ & Khóa xuất kho đa lô FIFO với 2 nút hành động riêng biệt:
     - **Mô phỏng Phân bổ FIFO (Dry-Run)** (`dry_run: true`)
     - **Khóa & Trừ Kho Thực Tế (Atomic Commit)** (`dry_run: false`)
   - Bảng hiển thị chi tiết từng lát cắt lô FIFO (`FifoLotAllocationSliceDTO[]`), tổng lượng xuất, tổng giá vốn COGS (`total_cogs_vnd`) và đơn giá vốn bình quân xuất (`weighted_unit_cost_vnd`).

### Nhóm B: Container Orchestrator, Tích Hợp Layout & Bộ Vitest Frontend Tests (Do `pawn-flash-2` thực thi — 4 files)
5. `C:\bib\cf_19\apps\web\src\features\warehouse\WarehousePortalView.tsx` (Tạo mới):
   - Quản lý state `WarehouseOverviewDTO`, thanh chuyển đổi 3 Tab (`LotIngestMacPanel`, `RoasteryBatchLifecyclePanel`, `FifoAllocationWorkbench`), 4 thẻ KPI tổng quan Kho Tổng và nút làm mới dữ liệu.
6. `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx` (Cập nhật):
   - Giữ nguyên `RoleShellHeader` và thông báo chính sách tách bạch Kho Tổng khỏi doanh thu POS/két tiền 4 Quán, nhúng `<WarehousePortalView />` làm bàn làm việc chính của `WAREHOUSE_MANAGER`.
7. `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (Cập nhật):
   - Cho phép `SUPER_ADMIN` chuyển đổi giữa Tab **"Tổng quan Chuỗi & Audit Logs"** (của M1.3) và Tab **"Kho Tổng & Mẻ Rang FIFO"** (`<WarehousePortalView />`).
8. `C:\bib\cf_19\apps\web\src\__tests__\m2-warehouse-workbench.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động chạy bằng **`vitest`** gồm tối thiểu **12 test cases** kiểm tra logic của `warehouseApi.ts` (tính toán overview, ingest lot MAC, roast batch FIFO lock & yield loss, multi-lot FIFO dry-run vs commit) và đảm bảo toàn bộ 14 bài test cũ của M1.3 (`m1-role-routing.test.ts`) tiếp tục PASS 100%!
