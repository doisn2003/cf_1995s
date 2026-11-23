# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M1.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M1.2)

- **Tiểu phân hệ:** `M1.2 - Backend RBAC Policy Engine, Cost-Masking Interceptor, Manager PIN Cryptographic Verifier & Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc Modular Clean Architecture Cho `@cf19/api` (14 Files Chuyên Biệt)

Để đảm bảo không có bất kỳ file monolith sơ sài nào, gói `@cf19/api` ở Tiểu phân hệ **M1.2** bắt buộc tách thành **14 file** rõ ràng giữa cấu hình, cơ sở dữ liệu Dual-Adapter, dịch vụ mã hóa/audit, 4 tầng middleware bảo mật, controllers/routes và bộ kiểm thử tích hợp Supertest:

### Nhóm A: Cấu Hình, Dual Database Adapter & Core Services (Do `pawn-flash-1` thực thi — 7 files)
1. `C:\bib\cf_19\apps\api\package.json`:
   - Dependencies: `@cf19/shared: "*"`, `@supabase/supabase-js`, `cors`, `dotenv`, `express`, `helmet`, `zod`.
   - DevDependencies: `@types/cors`, `@types/express`, `@types/node`, `@types/supertest`, `supertest`, `tsx`, `typescript`, `vitest`.
   - Scripts: `"typecheck": "tsc --noEmit"`, `"build": "tsc"`, `"test": "vitest run"`, `"dev": "tsx watch src/index.ts"`.
2. `C:\bib\cf_19\apps\api\tsconfig.json`:
   - Extends `../../tsconfig.base.json`, `rootDir: "src"`, `outDir: "dist"`.
3. `C:\bib\cf_19\apps\api\src\config\env.ts`:
   - Validate biến môi trường bằng Zod, khởi tạo `supabaseAdmin` khi có cấu hình Supabase, hoặc bật `inMemoryDb` deterministic mode khi chạy dev/test.
4. `C:\bib\cf_19\apps\api\src\services\crypto.service.ts`:
   - Cài đặt chuẩn `node:crypto` (`scryptSync`, `timingSafeEqual`, `randomBytes`) với định dạng hash khớp 100% với `supabase/seed.sql` trong M1.1 (`scrypt$<salt>$<64-byte-hex>`):
     - `hashManagerPin(plainPin: string, customSalt?: string): string`
     - `verifyManagerPin(plainPin: string, storedHash: string | null | undefined): boolean`
5. `C:\bib\cf_19\apps\api\src\db\seedData.ts`:
   - Chứa dữ liệu khởi tạo chuẩn khớp 100% với `SEED_IDS` trong `@cf19/shared` và `supabase/seed.sql`:
     - 1 Tổ chức (`CF19`)
     - 5 Điểm vận hành (`CW-TAYNGUYEN`, `STORE-01`..`STORE-04`)
     - **8 Tài khoản nhân sự** (`superAdmin`, `warehouseManager`, `storeManager01` PIN `123456`, `storeManager02` PIN `654321`, `cashier01`, `cashier02`, `barista01`, `barista02`)
     - **8 Vật tư (`inventory_items`)** kèm đầy đủ `moving_avg_cost_vnd`, `internal_transfer_price_vnd`, `retail_price_vnd`
     - **5 Lô hàng (`warehouse_lots`)** phân bổ tại Kho Tổng, Quán 1 và Quán 2
     - **1 Ca làm việc đang mở (`pos_shifts`)** tại Quán 1 (`status: 'OPEN'`, có `opening_cash_vnd`, `system_expected_cash_vnd`, `variance_cash_vnd`) và **2 Hóa đơn POS mẫu (`pos_orders`)** tại Quán 1 và Quán 2 để phục vụ kiểm thử hủy đơn bằng PIN Quản lý và kiểm thử Blind Shift Close!
6. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts`:
   - Quản lý trạng thái In-Memory Relational Store có hàm `resetInMemoryDb()` để mỗi test case trong Vitest/Supertest chạy hoàn toàn độc lập, không nhiễm bẩn trạng thái.
7. `C:\bib\cf_19\apps\api\src\services\audit.service.ts`:
   - Ghi nhận nhật ký bất biến (`recordAuditLog`, `listAuditLogs`) hỗ trợ lọc theo `storeId`, `actorId`, `action`, `targetTable`.

### Nhóm B: 4 Tầng Middleware Bảo Mật RBAC, Controllers/Routes & Bộ Supertest 16 Kịch Bản (Do `pawn-flash-2` thực thi — 7 files)
8. `C:\bib\cf_19\apps\api\src\middlewares\auth.middleware.ts`:
   - Xác thực `Authorization: Bearer <token>` (hỗ trợ Supabase JWT và `dev:<userId>` / `x-dev-user-id`), gắn `req.actor` kiểu `AuthActor`.
9. `C:\bib\cf_19\apps\api\src\middlewares\rbac.middleware.ts`:
   - `requireRoles(...allowedRoles: UserRole[])`: Chặn `403 FORBIDDEN_ROLE`.
   - `requireStoreScope(options?)`:
     - `SUPER_ADMIN`: truy cập toàn chuỗi.
     - `WAREHOUSE_MANAGER`: chỉ truy cập `CW-TAYNGUYEN` (hoặc route được bật `allowWarehouseManager: true`); cố tình đọc doanh thu/ca/đơn POS của 4 Quán bị chặn `403 FORBIDDEN_WAREHOUSE_SCOPE`.
     - `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS`: khóa cứng vào `req.actor.assignedStoreId`; cố tình truyền `storeId` của quán khác (ví dụ Quản lý Quán 1 truy cập Quán 2) bị chặn `403 FORBIDDEN_CROSS_TENANT_ACCESS`.
   - `sanitizeCostFields()`:
     - Interceptor bọc `res.json` đệ quy loại bỏ toàn bộ khóa trong `SENSITIVE_COST_KEYS` (`moving_avg_cost_vnd`, `unit_cost_vnd`, `shipping_cost_vnd`, `raw_import_cost`, `raw_import_cost_vnd`, `cogs_amount_vnd`) khi `req.actor.role` thuộc `STORE_LEVEL_ROLES` (`STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS`).
     - Loại bỏ toàn bộ khóa trong `KDS_FORBIDDEN_FINANCE_KEYS` khi `req.actor.role === 'BARISTA_KDS'`.
     - Khi `req.actor.role === 'CASHIER_STAFF'` và object là một ca làm việc có `status === 'OPEN'`, tự động ẩn/đặt `null` cho các khóa trong `BLIND_SHIFT_HIDDEN_KEYS` (`system_expected_cash_vnd`, `variance_cash_vnd`).
     - Luôn loại bỏ `manager_pin_hash` ở mọi role.
   - `requireManagerPin(actionName: string, targetTable: string)`:
     - Validate body bằng `ManagerPinApprovalSchema`.
     - Chỉ chấp nhận mã PIN 6 số của `SUPER_ADMIN` hoặc **`STORE_MANAGER` được gán đúng `targetStoreId` hiện tại** (nếu lấy PIN `654321` của Quản lý Quán 2 đem duyệt hủy đơn tại Quán 1 thì bắt buộc từ chối `403 INVALID_MANAGER_PIN` và ghi audit log `${actionName}_PIN_FAILED`!).
     - Khi khớp PIN hợp lệ, ghi ngay 1 bản ghi bất biến vào `audit_logs` và đính kèm `req.managerApproval`.
10. `C:\bib\cf_19\apps\api\src\modules\auth\auth.routes.ts`:
    - `POST /api/v1/auth/login`
    - `GET /api/v1/auth/me`
    - `POST /api/v1/auth/verify-manager-pin`
11. `C:\bib\cf_19\apps\api\src\modules\stores\stores.routes.ts`:
    - `GET /api/v1/stores` (cấp quán chỉ thấy đúng quán của mình; Kho Tổng & Chủ chuỗi thấy toàn bộ)
    - `GET /api/v1/stores/:storeId`
    - `GET /api/v1/stores/:storeId/inventory`
    - `GET /api/v1/stores/:storeId/lots`
    - `GET /api/v1/stores/:storeId/shifts/current` (kiểm chứng Blind Shift Close ẩn tiền lý thuyết với `CASHIER_STAFF`)
    - `GET /api/v1/stores/:storeId/kds/tickets` (kiểm chứng `BARISTA_KDS` bị ẩn toàn bộ số tiền/doanh thu)
    - `POST /api/v1/stores/:storeId/orders/:orderId/void` (kiểm chứng `requireManagerPin` + cập nhật trạng thái đơn sang `VOIDED` + ghi `audit_logs`)
12. `C:\bib\cf_19\apps\api\src\modules\audit\audit.routes.ts`:
    - `GET /api/v1/audit-logs` (chỉ dành cho `SUPER_ADMIN`).
13. `C:\bib\cf_19\apps\api\src\index.ts`:
    - Khởi tạo Express `app`, mount `/health`, `/api/v1/auth`, `/api/v1/stores`, `/api/v1/audit-logs`, global 404 & error handler.
14. `C:\bib\cf_19\apps\api\src\__tests__\m1-rbac-security.test.ts`:
    - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **16 test cases** bao phủ toàn diện 5 Quy tắc Nghiệp vụ Bất di Bất dịch của M1!
