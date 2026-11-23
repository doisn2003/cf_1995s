# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M3.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M3.3)

- **Tiểu phân hệ:** `M3.3 - Frontend B2B Wholesale & AR Aging Portal (Kho Tổng) + 2-Phase Store Replenishment Portal (4 Quán) + Vitest Suite (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` Ở Tiểu Phân Hệ M3.3 (8 Files)

Tiểu phân hệ **M3.3** bắt buộc tách bạch thành **8 file chuyên biệt** chia đều cho 2 Quân Tốt (`4 + 4 files`) để phục vụ 2 nhóm vai trò hoàn toàn tách biệt:
- **`WAREHOUSE_MANAGER` & `SUPER_ADMIN`**: Quản lý Bán sỉ B2B bậc thang, Sổ cái Công nợ AR Aging và Duyệt xuất Chuyển kho nội bộ Pha 1 (`REQUESTED` → `IN_TRANSIT`).
- **`STORE_MANAGER` (4 Quán)**: Tạo Phiếu xin cấp nguyên liệu Pha 0 (`REQUESTED`) và Kiểm nhận hàng thực tế Pha 2 (`IN_TRANSIT` → `RECONCILED`) theo giá hạch toán nội bộ (`internal_transfer_price_vnd`, tuyệt đối ẩn giá nhập gốc Tây Nguyên).

### Nhóm A: Typed B2B & Transfer API Client + 3 Modular Feature Panels (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\web\src\api\b2bAndTransferApi.ts` (Tạo mới):
   - Typed HTTP Client gọi sống các endpoints `/api/v1/b2b/*` (`GET /overview`, `GET /customers`, `GET /price-quote`, `POST /orders`, `POST /debt-payments`) và `/api/v1/transfers/*` (`GET /`, `POST /request`, `POST /:id/dispatch`, `POST /:id/reconcile`).
   - Có deterministic offline fallback engine dùng trực tiếp các hàm toán học `b2bAndTransferMath.ts` và `compareFifoLots` từ `@cf19/shared` (kèm hàm `resetOfflineB2bAndTransfersState()` phục vụ Vitest!).
2. `C:\bib\cf_19\apps\web\src\features\b2b\B2bOrderTieredPricingPanel.tsx` (Tạo mới):
   - Dành cho Kho Tổng & Chủ chuỗi:
     - Bảng danh sách khách sỉ thị trấn (`B2bCustomerDto[]`) kèm hạng giá (`TIER_1..3`), hạn mức nợ, nợ hiện tại và thanh tiến trình hạn mức.
     - Form tạo đơn bán sỉ B2B có **Live Preview Bậc Giá Sỉ & Hạn Mức Công Nợ** (tự động gọi `resolveB2bTieredUnitPriceVnd` và `calculateB2bCreditCheck` khi đổi khách hàng, mặt hàng, khối lượng gram/kg hoặc số tiền trả trước; hiện cảnh báo đỏ nếu vượt `credit_limit_vnd`).
     - Bảng danh sách đơn hàng B2B và chi tiết các lát cắt lô FIFO đã xuất.
3. `C:\bib\cf_19\apps\web\src\features\b2b\B2bArAgingAndLedgerPanel.tsx` (Tạo mới):
   - Dành cho Kho Tổng & Chủ chuỗi:
     - Bảng Phân tích Tuổi nợ Khách sỉ (`AR Aging`: `CURRENT`, `OVERDUE_1_30`, `OVERDUE_31_60`, `OVERDUE_60_PLUS`).
     - Form Thu nợ Gối đầu theo nguyên tắc **Hóa đơn cũ gạch trước (`FIFO Debt Settlement`)** kèm Live Preview bằng `settleFifoPendingInvoices` từ `@cf19/shared`.
     - Bảng Sổ cái Công nợ Bất biến (`b2b_debt_ledger`: `DEBIT_INVOICE`, `CREDIT_PAYMENT`).
4. `C:\bib\cf_19\apps\web\src\features\transfers\WarehouseTransferDispatchPanel.tsx` (Tạo mới):
   - Dành cho Kho Tổng & Chủ chuỗi:
     - Danh sách toàn bộ Phiếu chuyển kho nội bộ (`REQUESTED`, `IN_TRANSIT`, `RECONCILED`) giữa Kho Tổng và 4 Quán.
     - Nút **"Duyệt Xuất Kho Theo Lô FIFO (Chuyển sang IN_TRANSIT)"** cho các phiếu đang `REQUESTED`, hiển thị rõ các lô FIFO đã cắt và tổng giá trị hạch toán nội bộ.

### Nhóm B: Store Manager 2-Phase Transfer Workbench, Tích Hợp 3 Layouts & Bộ Vitest Tests (Do `pawn-flash-2` thực thi — 4 files)
5. `C:\bib\cf_19\apps\web\src\features\transfers\StoreTransferReplenishmentPanel.tsx` (Tạo mới):
   - Dành riêng cho `STORE_MANAGER` tại từng Quán (`storeId`):
     - Banner bảo mật khẳng định chỉ hiển thị `internal_transfer_price_vnd` (ẩn hoàn toàn giá vốn MAC Tây Nguyên).
     - Form **Pha 0 (`REQUESTED` — Tạo Phiếu Xin Cấp Hàng về Quán)** kèm Live Preview tổng giá trị hạch toán nội bộ bằng `calculateInternalTransferTotalVnd`.
     - Danh sách các phiếu chuyển kho của đúng chi nhánh đó; với các phiếu đang ở trạng thái **`IN_TRANSIT`**, hiển thị form & nút **"Pha 2: Kiểm Nhận Thực Tế & Cộng Tồn Kho Quán (Chuyển sang RECONCILED)"** cho phép nhập `received_qty` (`<= dispatched_qty`).
6. `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx` (Cập nhật):
   - Bổ sung thanh chuyển đổi trên `WarehouseLayout` giữa 3 phân khu của Kho Tổng:
     1. **Kho Tổng & Mẻ Rang FIFO (`WarehousePortalView` của M2.3)**
     2. **Bán Sỉ B2B & Sổ Cái Công Nợ AR (`B2bOrderTieredPricingPanel` + `B2bArAgingAndLedgerPanel`)**
     3. **Điều Phối Chuyển Kho Nội Bộ Pha 1 (`WarehouseTransferDispatchPanel`)**
7. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` & `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (Cập nhật — hoặc tích hợp `StoreTransferReplenishmentPanel` vào `StoreManagerLayout.tsx`):
   - Trong `StoreManagerLayout.tsx`: thêm tab chuyển đổi giữa **"Tồn Kho Tại Quán & Kiểm Thử Cách Ly"** (của M1.3) và **"Xin Cấp Hàng & Nhận Kho Nội Bộ 2 Pha (M3)"** (`<StoreTransferReplenishmentPanel storeId={activeStoreId} />`).
8. `C:\bib\cf_19\apps\web\src\__tests__\m3-b2b-transfers-ui.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động chạy bằng **`vitest`** gồm tối thiểu **14 test cases** kiểm tra toàn diện `b2bAndTransferApi.ts` (báo giá bậc thang, tạo đơn B2B trừ lô FIFO, chặn vượt hạn mức nợ, thu nợ FIFO gạch đơn cũ trước, và vòng đời 2 pha `REQUESTED` → `IN_TRANSIT` → `RECONCILED` sinh lô mới tại Quán với giá nội bộ), đồng thời bảo toàn 100% **28/28 bài test cũ của M1.3 + M2.3**!
