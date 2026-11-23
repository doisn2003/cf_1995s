# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M7.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M7.3)

- **Tiểu phân hệ:** `M7.3 - Frontend Executive P&L Command Center, Store Comparison Matrix & 1-Click Franchise Store Cloning Wizard + Vitest Suite (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` Ở Tiểu Phân Hệ M7.3 (6 Files)

Tiểu phân hệ **M7.3** hoàn thiện trung tâm điều hành của **Chủ Chuỗi (`SUPER_ADMIN`)** trên `ExecutiveLayout.tsx` với 6 file chuyên biệt chia đều cho 2 Quân Tốt (`3 + 3 files`):

### Nhóm A: Typed Executive Analytics API Client + 2 Modular Executive Panels (Do `pawn-flash-1` thực thi — 3 files)
1. `C:\bib\cf_19\apps\web\src\api\executiveAnalyticsApi.ts` (Tạo mới):
   - Typed HTTP Client gọi trực tiếp 3 endpoints của `@cf19/api` (`/api/v1/analytics/pnl-consolidation`, `/api/v1/analytics/franchise/preview-pricing`, `/api/v1/analytics/franchise/clone-store`).
   - Có deterministic offline fallback engine sử dụng trực tiếp 4 hàm toán học `executivePnlAndFranchiseMath.ts` từ `@cf19/shared` (kèm `resetOfflineExecutiveAnalyticsState()` phục vụ Vitest!).
2. `C:\bib\cf_19\apps\web\src\features\analytics\ExecutivePnlConsolidationPanel.tsx` (Tạo mới):
   - **Bảng Điều Khiển Lãi - Lỗ (P&L) Hợp Nhất Đa Thực Thể (`Real-time Multi-Entity P&L`):**
     - **4 Thẻ KPI Hợp Nhất Toàn Chuỗi:**
       1. Tổng Doanh Thu Ngoại Chuỗi Hợp Nhất (`consolidated_external_revenue_vnd` = Bán sỉ B2B + Bán nước POS 4 Quán).
       2. Bút Toán Loại Trừ Giao Dịch Chuyển Kho Nội Bộ (`intercompany_eliminated_revenue_vnd` — chống tính trùng doanh thu).
       3. Lợi Nhuận Gộp Hợp Nhất Toàn Chuỗi (`consolidated_gross_profit_vnd` & `consolidated_gross_margin_pct`).
       4. Lợi Nhuận Ròng Thực Thu Toàn Chuỗi (`consolidated_net_profit_vnd` & `consolidated_net_margin_pct`).
     - **Khối 1 — Báo Cáo P&L Mảng Cung Ứng Kho Tổng Tây Nguyên (`CentralWarehousePnlDTO`):**
       - Hiển thị rõ Doanh thu Bán sỉ B2B bên ngoài vs Doanh thu Chuyển kho nội bộ, Giá vốn gốc Tây Nguyên (`b2b_raw_cogs_vnd`, `internal_transfer_raw_cogs_vnd`), Lãi gộp B2B, Chênh lệch giá nội bộ (`internal_markup_profit_vnd`) và Lợi nhuận ròng Kho Tổng.
     - **Khối 2 — Ma Trận So Sánh & Xếp Hạng Lãi - Lỗ Từng Quán Cà Phê (`StoreNodePnlDTO[]` — Quán 1..4 & các Quán Nhượng Quyền mới):**
       - Bảng so sánh trực quan từng quán: Doanh thu POS (`Tiền mặt` + `VietQR`), Giá vốn định mức BOM nội bộ, Lãi gộp Quán, Chi phí nhân sự, Tổn thất lệch két Đóng ca mù (`cash_shortage_loss_vnd`), Tổn thất hao hụt kiểm kho cuối ngày (`stocktake_shrinkage_loss_vnd`), Phí bản quyền Nhượng quyền (`franchise_royalty_fee_vnd`), Lợi nhuận ròng (`store_net_profit_vnd`) và Xếp hạng hiệu quả (`#1, #2...`).
3. `C:\bib\cf_19\apps\web\src\features\analytics\FranchiseStoreCloningWizard.tsx` (Tạo mới):
   - **Công Cụ Nhân Bản Chi Nhánh Mới / Nhượng Quyền 1-Click (`1-Click Franchise Store Cloning Wizard`):**
     - Form cấu hình chi nhánh mới: Mã chi nhánh (`code`, ví dụ `'STORE-05-DALAT'`), Tên chi nhánh (`name`), Mô hình (`'FRANCHISE_STORE'` hoặc `'RETAIL_STORE'`), Địa chỉ, SĐT, Thanh trượt/ô nhập Hệ số giá vùng (`price_multiplier`, từ `0.50x` đến `3.00x`, mặc định `1.15x`), Tiền mặt đầu ca khai trương (`opening_cash_vnd`), và Checkbox **"Tự động tạo Phiếu xin cấp cà phê khai trương từ Kho Tổng (`create_starter_transfer`)"**.
     - **Bảng Live Preview Thực Đơn & Biên Lợi Nhuận Theo Hệ Số Giá Vùng (`ClonedMenuProductPricePreviewDTO[]`):**
       - Tự động cập nhật ngay khi kéo/đổi `price_multiplier`: hiển thị Giá gốc Master Menu, Giá bán tại chi nhánh mới sau nhân hệ số, Giá vốn BOM tiêu chuẩn và Biên lợi nhuận gộp dự kiến (`estimated_gross_margin_pct`).
     - Nút **"1-Click Nhân Bản Chi Nhánh Mới & Sao Chép Toàn Bộ Master Menu/BOM"** $\rightarrow$ sau khi bấm thành công, hiển thị Biên lai Nhân bản (`CloneFranchiseStoreResultDTO` gồm thông tin chi nhánh mới, ca mở đầu tiên, phiếu chuyển kho khai trương `REQUESTED`) và tự động làm mới Báo cáo P&L để Quán mới xuất hiện ngay trong bảng P&L chuỗi!

### Nhóm B: Container Orchestrator, Tích Hợp `ExecutiveLayout.tsx` & Bộ Vitest Tests (Do `pawn-flash-2` thực thi — 3 files)
4. `C:\bib\cf_19\apps\web\src\features\analytics\ExecutiveCommandCenterView.tsx` (Tạo mới):
   - Điều phối dữ liệu giữa `<ExecutivePnlConsolidationPanel />` và `<FranchiseStoreCloningWizard />` (khi nhân bản xong 1 quán mới ở Wizard, callback `onStoreCloned` tự động tải lại báo cáo P&L hợp nhất để hiển thị ngay quán mới trong bảng so sánh!).
5. `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (Cập nhật):
   - Nâng cấp `ExecutiveLayout` của Chủ chuỗi (`SUPER_ADMIN`) thành 3 phân khu hoàn chỉnh:
     1. **Báo Cáo Lãi - Lỗ Hợp Nhất (OLAP P&L) & Nhân Bản Nhượng Quyền (M7)** (`<ExecutiveCommandCenterView />`)
     2. **Giám Sát Kho Tổng Tây Nguyên & Mẻ Rang FIFO (M2)** (`<WarehousePortalView />`)
     3. **Danh Mục Giá Vốn Gốc & Nhật Ký Audit Logs Bất Biến (M1)**
6. `C:\bib\cf_19\apps\web\src\__tests__\m7-executive-pnl-franchise-ui.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động chạy bằng **`vitest`** gồm tối thiểu **14 test cases** kiểm tra toàn diện `executiveAnalyticsApi.ts` (báo cáo P&L hợp nhất tách biệt Kho Tổng vs 4 Quán, loại trừ doanh thu chuyển kho nội bộ `intercompany_eliminated_revenue_vnd`, bảng xếp hạng hiệu quả các quán, xem trước bảng giá thực đơn theo hệ số vùng `1.15x`, nhân bản Quán thứ 5 nhượng quyền 1-Click kèm mở ca khai trương + tạo phiếu chuyển kho khai trương `REQUESTED` + xuất hiện ngay trong P&L chuỗi, và chặn trùng mã chi nhánh `409 DUPLICATE_STORE_CODE`), đồng thời bảo toàn 100% **88/88 bài test hiện có của `@cf19/web`**!
