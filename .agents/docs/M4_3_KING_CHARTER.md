# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M4.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M4.3)

- **Tiểu phân hệ:** `M4.3 - Frontend Touch POS Terminal, Modifier Matrix Modal, Offline-First Sync Queue & ESC/POS Thermal Bill Preview + Vitest Suite (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` Ở Tiểu Phân Hệ M4.3 (8 Files)

Tiểu phân hệ **M4.3** nâng cấp toàn diện màn hình Thu ngân POS cảm ứng (`CASHIER_STAFF`, `STORE_MANAGER`, `SUPER_ADMIN`) thành một hệ thống POS phản ứng tức thời, hỗ trợ chọn Size (`S/M/L`), Ma trận Đường/Đá/Topping, lưu đệm Offline khi mất mạng + Đồng bộ lô Idempotent (`Batch Offline Sync`) và Xem/In hóa đơn nhiệt chuẩn ESC/POS 42 cột:

### Nhóm A: Typed POS Catalog API Client, Zustand POS Cart & Offline Queue Store + 2 Modular POS Components (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\web\src\api\posCatalogApi.ts` (Tạo mới):
   - Typed HTTP Client gọi sống các endpoints `/api/v1/catalog/stores/:storeId`, `/api/v1/catalog/stores/:storeId/preview-pricing`, `/api/v1/pos/stores/:storeId/orders`, `/api/v1/pos/stores/:storeId/orders/offline-sync`, `/api/v1/pos/stores/:storeId/orders/:orderId/receipt`.
   - Có deterministic offline fallback engine sử dụng trực tiếp 5 hàm toán học `posBomAndReceiptMath.ts` từ `@cf19/shared` (kèm `resetOfflinePosCatalogState()` phục vụ Vitest!).
2. `C:\bib\cf_19\apps\web\src\store\posTerminalStore.ts` (Tạo mới):
   - Zustand Store quản lý trạng thái máy Thu ngân POS:
     - `cartItems`: Danh sách các dòng món trong giỏ hàng hiện tại (mỗi dòng có `cartLineId`, `productId`, `variantId`, `modifierIds`, `quantity`, `notes`, `unitPriceVnd`, `lineTotalVnd`).
     - `isOfflineSimulationMode: boolean`: Công tắc giả lập mất mạng Internet tại quán để Thu ngân vẫn bấm bán hàng bình thường và đẩy đơn vào hàng đợi Offline!
     - `offlineOrderQueue: OfflinePosOrderEntryDTO[]`: Hàng đợi đơn hàng POS đã thanh toán khi mất mạng (lưu kèm `client_order_code` deterministic/unique để đồng bộ Idempotent khi có mạng lại).
     - Các actions: `addToCart`, `updateCartLineQty`, `removeCartLine`, `clearCart`, `setOfflineSimulationMode`, `enqueueOfflineOrder`, `removeSyncedOfflineOrders`, `resetPosTerminalStore`.
3. `C:\bib\cf_19\apps\web\src\features\pos\PosModifierMatrixModal.tsx` (Tạo mới):
   - Modal cảm ứng nút lớn mở ra khi Thu ngân chạm vào 1 món đồ uống:
     - Chọn Size (`S / M / L`) kèm chênh lệch giá (`price_delta_vnd`).
     - Chọn Mức Đường (`SUGAR` — radio single-select, tự động thay thế nếu bấm mức đường khác theo đúng quy tắc tối đa 1 `SUGAR`).
     - Chọn Mức Đá (`ICE` — radio single-select, tối đa 1 `ICE`).
     - Chọn Topping / Extra (`TOPPING` / `EXTRA` — multi-select checkboxes kèm `extra_price_vnd`).
     - Chọn số lượng ly (`-` / `+`) và ghi chú pha chế.
     - Hiển thị tức thời đơn giá 1 ly và thành tiền dòng món bằng `calculatePosLinePricing` từ `@cf19/shared`.
4. `C:\bib\cf_19\apps\web\src\features\pos\EscPosThermalReceiptModal.tsx` (Tạo mới):
   - Hiển thị bản in hóa đơn nhiệt chuẩn **ESC/POS 42 cột** (font monospace trên nền giấy in nhiệt trắng, kèm mã tham chiếu `vietqr_ref_code` nếu thanh toán chuyển khoản VietQR) và nút **"In Hóa Đơn Nhiệt (ESC/POS)"** + nút **"Hủy Hóa Đơn Đã In (Yêu Cầu Mã PIN Quản Lý 6 Số)"**.

### Nhóm B: Touch POS Terminal Workbench, Tích Hợp `CashierPosLayout.tsx` & `ExecutiveLayout.tsx` + Bộ Vitest Tests (Do `pawn-flash-2` thực thi — 4 files)
5. `C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx` (Tạo mới):
   - Bàn làm việc Thu ngân POS đa chi nhánh gồm:
     - Thanh lọc nhóm thực đơn (`Tất cả`, `Cà Phê Truyền Thống`, `Trà & Sữa Tây Nguyên`), hiển thị hệ số giá vùng của chi nhánh (`price_multiplier`, ví dụ `1.00x` tại Quán 1, `1.05x` tại Quán 3).
     - Lưới thẻ món cảm ứng chạm mở `PosModifierMatrixModal`.
     - Cột Giỏ hàng POS bên phải: danh sách món đã chọn, tổng tiền, chọn phương thức thanh toán (`CASH` / `VIETQR`), nhập SĐT khách tích điểm.
     - Khối **Điều khiển Offline-First Sync Engine**: công tắc bật/tắt chế độ Offline, hiển thị số đơn đang nằm trong `offlineOrderQueue` và nút **"Đồng Bộ Lô Đơn Offline Lên Server (Idempotent Batch Sync)"** gọi `syncOfflinePosOrders`.
     - Danh sách các hóa đơn gần nhất trong ca kèm nút xem Bill nhiệt `EscPosThermalReceiptModal` và nút **Hủy Hóa Đơn Đã In (mở `ManagerPinModal`)**!
6. `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx` (Cập nhật):
   - Nhúng `<PosTerminalWorkbench storeId={activeStoreId} />` cùng khu vực **Đóng Ca Đếm Tiền Mù (Blind Shift Close)** và `ManagerPinModal` của M1.3.
7. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (Cập nhật):
   - Bổ sung Tab thứ 3 **"Thực Đơn, Định Mức BOM & Giám Sát Đơn POS (M4)"** để Quản lý Quán có thể xem thực đơn hệ số vùng, kiểm tra định lượng nguyên liệu BOM từng món và giám sát/duyệt hủy đơn POS tại quán!
8. `C:\bib\cf_19\apps\web\src\__tests__\m4-pos-terminal-offline.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động chạy bằng **`vitest`** gồm tối thiểu **14 test cases** kiểm tra toàn diện `posCatalogApi.ts` và `posTerminalStore.ts` (tải catalog theo hệ số giá vùng Quán 1 vs Quán 3, thêm giỏ hàng + cộng dồn dòng món, kiểm tra ma trận Modifier, tạo đơn online + sinh bill nhiệt ESC/POS 42 cột, xếp hàng đợi đơn khi mất mạng và đồng bộ lô `syncOfflinePosOrders` idempotent), đồng thời bảo toàn 100% **42/42 bài test hiện có của `@cf19/web`**!
