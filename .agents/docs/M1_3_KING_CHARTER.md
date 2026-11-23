# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M1.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M1.3)

- **Tiểu phân hệ:** `M1.3 - Frontend 5-Role Modular Layouts, Live API Client, Multi-Tenant Guard & Interactive Security Console (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` (16 Files — Cấm Gộp Monolith)

Tuyệt đối KHÔNG nhồi nhét 5 Layout vào chung 1 file `RoleLayouts.tsx`. Gói `@cf19/web` ở Tiểu phân hệ **M1.3** bắt buộc tách bạch thành **16 file chuyên biệt** chia đều cho 2 Quân Tốt (`8 + 8 files`):

### Nhóm A: Cấu Hình, Typed API Client, Multi-Account Auth Store & Core Security Components (Do `pawn-flash-1` thực thi — 8 files)
1. `C:\bib\cf_19\apps\web\package.json`:
   - Dependencies: `@cf19/shared: "*"`, `lucide-react`, `react`, `react-dom`, `react-router-dom`, `zustand`.
   - DevDependencies: `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `typescript`, `vite`, `vitest`.
   - Scripts: `"dev": "vite"`, `"typecheck": "tsc --noEmit"`, `"build": "tsc --noEmit && vite build"`, `"test": "vitest run"`.
2. `C:\bib\cf_19\apps\web\tsconfig.json`:
   - Cấu hình `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, `"noEmit": true`.
3. `C:\bib\cf_19\apps\web\vite.config.ts`:
   - Cấu hình proxy `/api` sang `http://localhost:4000`.
4. `C:\bib\cf_19\apps\web\index.html`:
   - Tích hợp Tailwind CSS, font chữ chuẩn tiếng Việt.
5. `C:\bib\cf_19\apps\web\src\api\apiClient.ts`:
   - Typed HTTP Client kết nối trực tiếp các endpoints thực tế của `@cf19/api` (`/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/verify-manager-pin`, `/api/v1/stores`, `/api/v1/stores/:storeId/inventory`, `/api/v1/stores/:storeId/lots`, `/api/v1/stores/:storeId/shifts/current`, `/api/v1/stores/:storeId/kds/tickets`, `/api/v1/stores/:storeId/orders/:orderId/void`, `/api/v1/audit-logs`), kèm fallback dữ liệu seed deterministic khi chạy preview tĩnh không bật server API.
6. `C:\bib\cf_19\apps\web\src\store\authStore.ts`:
   - Quản lý danh sách **8 Tài khoản nhân sự (`SEED_ACTORS`)** khớp 100% với `SEED_IDS.users` (`superAdmin`, `warehouseManager`, `storeManager01` Quán 1, `storeManager02` Quán 2, `cashier01` Quán 1, `cashier02` Quán 2, `barista01` Quán 1, `barista02` Quán 2).
   - Hàm `getRoleDefaultRoute(actor: AuthActor): string` và `canAccessStore(actor: AuthActor, targetStoreId: string): boolean`.
7. `C:\bib\cf_19\apps\web\src\components\RoleGuard.tsx`:
   - Kiểm tra xác thực, kiểm tra `allowedRoles` và kiểm tra `requireStoreMatch` (chặn nhân sự Quán 1 truy cập URL của Quán 2 với màn hình 403 chi tiết).
8. `C:\bib\cf_19\apps\web\src\components\ManagerPinModal.tsx` & `C:\bib\cf_19\apps\web\src\components\RoleShellHeader.tsx` (hoặc gộp `RoleShellHeader` vào `RoleGuard.tsx` / file riêng để giữ đúng 8 file cho Tốt #1).

### Nhóm B: 5 File Layout Độc Lập Cho 5 Role, Router `App.tsx` & Bộ Vitest Tests (Do `pawn-flash-2` thực thi — 8 files)
9. `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (`SUPER_ADMIN`):
   - Tải dữ liệu từ `apiClient` hiển thị toàn bộ 5 điểm vận hành (`CW-TAYNGUYEN` + 4 Quán), bảng vật tư có cột **Giá vốn MAC Tây Nguyên (`moving_avg_cost_vnd`)**, và bảng **Nhật ký `audit_logs` bất biến** thời gian thực.
10. `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx` (`WAREHOUSE_MANAGER`):
    - Tải dữ liệu tồn kho và lô hàng FIFO của Kho Tổng (`CW-TAYNGUYEN`) có đầy đủ `moving_avg_cost_vnd` và `unit_cost_vnd`, tuyệt đối không có menu hay số liệu doanh thu bán nước/két tiền của 4 Quán.
11. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (`STORE_MANAGER`):
    - Tải dữ liệu tồn kho và lô hàng của đúng chi nhánh (`storeId`), chứng minh trực quan trên UI rằng các trường `moving_avg_cost_vnd`, `unit_cost_vnd`, `shipping_cost_vnd` đã bị tầng RBAC Sanitizer cắt bỏ (chỉ hiển thị `internal_transfer_price_vnd`), kèm công cụ kiểm thử bấm nhảy sang chi nhánh khác (`STORE-02`) để kiểm chứng `RoleGuard` chặn `403 Store Isolation`.
12. `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx` (`CASHIER_STAFF`):
    - Giao diện POS cảm ứng tải trạng thái Ca hiện tại từ `getCurrentShift` (hiển thị `system_expected_cash_vnd: null` ở chế độ **Blind Shift Close**), danh sách hóa đơn POS và nút **"Hủy Hóa Đơn Đã In (Cần PIN Quản Lý)"** mở `ManagerPinModal` gọi API `voidPosOrder` thật (hỗ trợ test nhập PIN `123456` của Quản lý Quán 1 thành công vs nhập PIN `654321` của Quản lý Quán 2 bị từ chối `403`).
13. `C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx` (`BARISTA_KDS`):
    - Giao diện High-Contrast Dark Mode cho Quầy Pha chế tải danh sách thẻ món KDS từ `getKdsTickets` (đã ẩn hoàn toàn `total_amount_vnd`, `unit_price_vnd`, `payment_method`), đồng hồ đếm SLA chờ (Xanh/Vàng/Đỏ) và nút Báo hết nguyên liệu.
14. `C:\bib\cf_19\apps\web\src\App.tsx`:
    - Trang `/login` cho phép chọn đăng nhập bất kỳ tài khoản nào trong **8 Tài khoản nhân sự** (bao gồm cả nhân sự Quán 1 và Quán 2) và cấu hình `Routes` bảo vệ từng nhánh bằng `RoleGuard`.
15. `C:\bib\cf_19\apps\web\src\main.tsx`:
    - Điểm vào React 19 DOM.
16. `C:\bib\cf_19\apps\web\src\__tests__\m1-role-routing.test.ts`:
    - Bộ kiểm thử tự động chạy bằng `vitest` kiểm tra logic phân luồng 8 tài khoản trong `authStore`, `getRoleDefaultRoute`, `canAccessStore` (Store 1 vs Store 2 isolation), và kiểm tra xác thực schema PIN trên Frontend.
