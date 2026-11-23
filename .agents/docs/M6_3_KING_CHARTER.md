# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M6.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M6.3)

- **Tiểu phân hệ:** `M6.3 - Frontend Barista KDS Board (SLA Timer Xanh/Vàng/Đỏ), Blind Shift Cash Close & Store EOD BOM Stocktake UI + Vitest Suite (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` Ở Tiểu Phân Hệ M6.3 (7 Files)

Tiểu phân hệ **M6.3** hoàn thiện trọn vẹn 3 màn hình vận hành chống thất thoát tại 4 Quán Cà Phê (`BARISTA_KDS`, `CASHIER_STAFF`, `STORE_MANAGER`):

### Nhóm A: Typed KDS & Shift/Stocktake API Client + 2 Modular Feature Panels (Do `pawn-flash-1` thực thi — 3 files)
1. `C:\bib\cf_19\apps\web\src\api\kdsAndShiftApi.ts` (Tạo mới):
   - Typed HTTP Client gọi trực tiếp các endpoints của `@cf19/api`:
     - `GET /api/v1/kds/stores/:storeId/board`
     - `POST /api/v1/kds/stores/:storeId/orders/:orderId/advance`
     - `POST /api/v1/kds/stores/:storeId/orders/:orderId/complete-bom`
     - `GET /api/v1/kds/stores/:storeId/low-stock-alerts`
     - `POST /api/v1/kds/stores/:storeId/low-stock-alerts`
     - `POST /api/v1/shifts-stocktakes/stores/:storeId/shifts/open`
     - `POST /api/v1/shifts-stocktakes/stores/:storeId/shifts/:shiftId/blind-close`
     - `GET /api/v1/shifts-stocktakes/stores/:storeId/stocktakes`
     - `POST /api/v1/shifts-stocktakes/stores/:storeId/stocktakes`
   - Có deterministic offline fallback engine sử dụng trực tiếp 5 hàm toán học `kdsBomAndVarianceMath.ts` từ `@cf19/shared` (kèm `resetOfflineKdsAndShiftState()` phục vụ Vitest!).
2. `C:\bib\cf_19\apps\web\src\features\kds\BaristaKdsQueueWorkbench.tsx` (Tạo mới):
   - Giao diện **Dark Mode High-Contrast** chuyên biệt cho Quầy Pha Chế (`BARISTA_KDS`):
     - Tuyệt đối KHÔNG hiển thị bất kỳ con số tiền tệ (`VNĐ`), giá bán hay giá vốn nào!
     - Hiển thị các thẻ món chờ theo thời gian thực với đồng hồ đếm thời gian chờ và khung màu SLA:
       - `NORMAL_GREEN` (`< 5 phút`): Viền xanh ngọc
       - `WARNING_YELLOW` (`5 – 9 phút`): Viền vàng hổ phách cảnh báo
       - `CRITICAL_RED` (`>= 10 phút`): Viền đỏ nhấp nháy khẩn cấp
     - Nút **"Bắt Đầu Pha Chế (QUEUED -> PREPARING)"** và nút **"Hoàn Thành Món & Tự Động Trừ Kho BOM Theo FIFO (COMPLETED)"** hiển thị chi tiết từng nguyên liệu (`gram`, `ml`, `pcs`) và mã lô FIFO tại quán vừa bị trừ!
     - Khối **"Báo Sắp Hết / Hết Nguyên Liệu Tại Quầy Bar"** gửi cảnh báo tức thì lên Quản lý Quán.
3. `C:\bib\cf_19\apps\web\src\features\pos\BlindShiftCloseWorkbench.tsx` (Tạo mới):
   - Giao diện **Đóng Ca Đếm Tiền Mù (Blind Shift Close)** dành cho Thu ngân (`CASHIER_STAFF`) và Quản lý Quán (`STORE_MANAGER`):
     - Khi ca đang `OPEN`: Hiển thị `opening_cash_vnd` và trạng thái **`Số tiền mặt lý thuyết hệ thống: •••••• (ĐÃ KHÓA MÙ — BLIND GUARD)`**.
     - Form nhập số tiền mặt thực tế đếm được tại két (`blind_counted_cash_vnd`) + ghi chú cuối ca.
     - Sau khi bấm **"Xác Nhận Chốt Ca Đếm Tiền Mù"**: Hệ thống khóa ca sang `CLOSED` và mở khóa bảng đối soát hiển thị `system_expected_cash_vnd`, `variance_cash_vnd` và badge trạng thái `BALANCED` (Khớp tuyệt đối), `SURPLUS` (Thừa tiền), hoặc `SHORTAGE` (Thiếu hụt két tiền — Cảnh báo đỏ!), kèm nút Mở ca mới.

### Nhóm B: Store Manager EOD BOM Stocktake Panel, Tích Hợp 3 Layouts & Bộ Vitest Tests (Do `pawn-flash-2` thực thi — 4 files)
4. `C:\bib\cf_19\apps\web\src\features\stocktake\StoreDailyStocktakePanel.tsx` (Tạo mới):
   - Giao diện **Kiểm Kho Cuối Ngày Đối Chiếu Định Mức BOM** dành cho Quản lý Quán (`STORE_MANAGER` & `SUPER_ADMIN`):
     - Bảng nhập số lượng kiểm đếm thực tế cuối ngày (`actual_counted_qty`) cho từng nguyên liệu tại quán (`opening_qty`, `received_in_qty`, `bom_consumed_qty`).
     - Khối **Live Preview Độ Lệch BOM (`calculateDailyStocktakeVariance`)**: hiển thị tức thời `theoretical_closing_qty`, `variance_qty`, `variance_pct` và cảnh báo đỏ **`HAO HỤT BẤT THƯỜNG (> 3.0%)`** nếu nguyên liệu thất thoát vượt ngưỡng cho phép!
     - Nút gửi phiếu kiểm kho cuối ngày và bảng lịch sử đối soát kiểm kho.
5. `C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx` (Cập nhật):
   - Nhúng `<BaristaKdsQueueWorkbench storeId={activeStoreId} />` thay cho bảng tĩnh của M1.3, giữ nguyên `RoleShellHeader` và kiểm soát bảo mật ẩn 100% trường tài chính.
6. `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx` & `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (Cập nhật — hoặc nhúng `BlindShiftCloseWorkbench` vào `CashierPosLayout.tsx` và nhúng `StoreDailyStocktakePanel` vào `StoreManagerLayout.tsx`):
   - Trong `CashierPosLayout.tsx`: tích hợp `<BlindShiftCloseWorkbench storeId={activeStoreId} />`.
   - Trong `StoreManagerLayout.tsx`: bổ sung Tab thứ 4 **"Kiểm Kho Cuối Ngày Đối Chiếu BOM & Cảnh Báo Quầy Bar (M6)"** nhúng `<StoreDailyStocktakePanel storeId={activeStoreId} />` (bảo toàn 100% 3 tab hiện có của M1.3, M3.3, M4.3).
7. `C:\bib\cf_19\apps\web\src\__tests__\m6-kds-blindclose-stocktake-ui.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động chạy bằng **`vitest`** gồm tối thiểu **14 test cases** kiểm tra toàn diện `kdsAndShiftApi.ts` (tải KDS board kèm phân loại SLA Xanh/Vàng/Đỏ và ẩn trường tiền tệ, chuyển trạng thái `QUEUED -> PREPARING -> COMPLETED` trừ lô tồn kho tại quán theo BOM 2 tầng + FIFO, chống trừ kho trùng idempotent, gửi cảnh báo hết nguyên liệu quầy bar, đóng ca đếm tiền mù phát hiện `SHORTAGE`/`BALANCED`/`SURPLUS`, mở ca mới, và kiểm kho cuối ngày phát hiện hao hụt bất thường `> 3%`), đồng thời bảo toàn 100% **72/72 bài test hiện có của `@cf19/web`**!
