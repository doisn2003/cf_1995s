# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M1.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M1.1)

- **Tiểu phân hệ:** `M1.1 - DB Schema 3NF, RLS Policies, Security Views, Seed SQL & @cf19/shared Modular Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)** — ghim cứng qua `swarm`)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)** — ghim cứng qua `swarm`)

---

## 1. Yêu Cầu Phân Tách Sâu & Chống Gộp File (Anti-Monolith Guardrails)

Để đảm bảo chất lượng kiến trúc cấp Enterprise (không gộp file sơ sài), Tiểu phân hệ **M1.1** bắt buộc tách bạch thành **17 file chuyên biệt** thuộc 3 nhóm:

### Nhóm A: Tầng Cơ Sở Dữ Liệu PostgreSQL / Supabase (Do Quân Hậu `queen-neon` trực tiếp thiết kế & kiểm chứng)
1. `C:\bib\cf_19\supabase\migrations\0001_m1_core_3nf_schema.sql`:
   - 12 PostgreSQL ENUMs (`user_role_enum`, `store_type_enum`, `employment_type_enum`, `inventory_category_enum`, `base_unit_enum`, `lot_status_enum`, `transfer_status_enum`, `b2b_price_tier_enum`, `shift_status_enum`, `payment_method_enum`, `payment_status_enum`, `kds_status_enum`).
   - Hàm trigger `public.set_updated_at_timestamp()`.
   - Đầy đủ **25 bảng chuẩn 3NF** theo `ARCHITECTURE_BLUEPRINT.md`:
     - Nhóm Core & RBAC (4 bảng): `organizations`, `stores`, `user_profiles`, `audit_logs`.
     - Nhóm WMS & Supply Chain (5 bảng): `inventory_items`, `warehouse_lots`, `roast_batches`, `internal_transfers`, `internal_transfer_items`.
     - Nhóm B2B & AR Ledger (5 bảng): `b2b_customers`, `b2b_price_tiers`, `b2b_orders`, `b2b_order_items`, `b2b_debt_ledger`.
     - Nhóm Store Ops (11 bảng): `menu_categories`, `menu_products`, `menu_variants`, `menu_modifiers`, `bom_recipes`, `bom_recipe_items`, `pos_shifts` (kèm CHECK constraint Blind Shift Close `chk_blind_shift_open_nulls` & `chk_blind_shift_closed_vals`), `pos_orders` (kèm CHECK `chk_pos_order_void_requires_manager`), `pos_order_items`, `payment_webhook_logs`, `store_daily_stocktakes`.
   - Đầy đủ Indexes tối ưu truy vấn FIFO (`idx_warehouse_lots_fifo`) và Multi-Tenant (`store_id`).
2. `C:\bib\cf_19\supabase\migrations\0002_m1_rls_policies_and_views.sql`:
   - 3 Triggers bảo vệ toàn vẹn nghiệp vụ:
     1. `trg_audit_logs_immutable` (`public.prevent_audit_log_mutation()`): Cấm tuyệt đối `UPDATE` và `DELETE` trên `audit_logs`.
     2. `trg_pos_orders_void_manager` (`public.enforce_pos_order_void_manager()`): Bắt buộc hóa đơn `VOIDED` phải được phê duyệt bởi `SUPER_ADMIN` hoặc `STORE_MANAGER` của chính chi nhánh đó (`assigned_store_id = NEW.store_id`).
     3. `trg_pos_order_items_store_match` (`public.enforce_pos_order_item_store_match()`): Đảm bảo `store_id` của dòng chi tiết khớp tuyệt đối với hóa đơn cha.
   - 2 Hàm Helper RLS (`STABLE SECURITY DEFINER SET search_path = public`): `public.current_user_role()` và `public.current_user_store_id()`.
   - Bật `ENABLE ROW LEVEL SECURITY` trên cả **25 bảng** và định nghĩa **55 RLS Policies** chặt chẽ cho 5 Role (`SUPER_ADMIN`, `WAREHOUSE_MANAGER`, `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS`).
   - 5 Views bảo mật (`WITH (security_barrier = true)`):
     1. `public.store_safe_inventory_items`: Ẩn hoàn toàn `moving_avg_cost_vnd` khỏi 3 Role cấp quán.
     2. `public.store_safe_warehouse_lots`: Ẩn hoàn toàn `unit_cost_vnd` và `shipping_cost_vnd` đối với các lô tại Kho Tổng khỏi 3 Role cấp quán.
     3. `public.kds_safe_order_tickets`: Ẩn hoàn toàn `total_amount_vnd`, `cogs_amount_vnd`, `payment_method` khỏi `BARISTA_KDS`.
     4. `public.kds_safe_order_items`: Ẩn hoàn toàn `unit_price_vnd`, `line_total_vnd` khỏi `BARISTA_KDS`.
     5. `public.cashier_safe_pos_shifts`: Ẩn hoàn toàn `system_expected_cash_vnd` và `variance_cash_vnd` khi `status = 'OPEN'` đối với `CASHIER_STAFF`.

### Nhóm B: Cấu Hình Monorepo & Gói `@cf19/shared` Tách File Modular (Do `pawn-flash-1` thực thi theo Phiếu Tốt #1)
3. `C:\bib\cf_19\package.json` (Root workspace có `vitest` và `typescript`).
4. `C:\bib\cf_19\tsconfig.base.json` (`strict: true`, `noImplicitAny: true`).
5. `C:\bib\cf_19\packages\shared\package.json` (Có scripts `typecheck`, `build`, `test: "vitest run"`).
6. `C:\bib\cf_19\packages\shared\tsconfig.json`.
7. `C:\bib\cf_19\packages\shared\src\enums.ts` (12 Domain Enums + Role Grouping Arrays).
8. `C:\bib\cf_19\packages\shared\src\constants\seedIds.ts` (Định danh UUID bất biến cho 1 Tổ chức, 1 Kho Tổng, 4 Quán, **8 Tài khoản nhân sự gồm cả Quản lý Quán 1 và Quản lý Quán 2** để test chéo Multi-Tenant Isolation, 10 Vật tư, 6 Lô hàng, Thực đơn & Khách sỉ B2B).
9. `C:\bib\cf_19\packages\shared\src\constants\securityKeys.ts` (`SENSITIVE_COST_KEYS`, `KDS_FORBIDDEN_FINANCE_KEYS`, `BLIND_SHIFT_HIDDEN_KEYS`).
10. `C:\bib\cf_19\packages\shared\src\schemas\auth.schema.ts` (`UuidSchema`, `VndNonNegativeSchema`, `QtyPositiveSchema`, `QtyNonNegativeSchema`, `LoginRequestSchema`, `ManagerPinApprovalSchema`, `AuditLogQuerySchema`).
11. `C:\bib\cf_19\packages\shared\src\schemas\store.schema.ts` (`StoreIdParamSchema`, `CreateStoreSchema`, `CreateInventoryItemSchema`, `WarehouseLotCreateSchema`).
12. `C:\bib\cf_19\packages\shared\src\schemas\operations.schema.ts` (`InternalTransferItemRequestSchema`, `CreateInternalTransferRequestSchema`, `DispatchInternalTransferSchema`, `ReconcileInternalTransferSchema`, `PosOrderItemInputSchema`, `CreatePosOrderSchema`, `VoidPosOrderSchema`, `OpenShiftSchema`, `BlindCloseShiftSchema`).
13. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Barrel export cho toàn bộ schemas).
14. `C:\bib\cf_19\packages\shared\src\types\domain.types.ts` (Toàn bộ DTOs tách biệt rõ bản đầy đủ giá vốn cho Kho Tổng vs bản ẩn giá vốn cho Cấp Quán, bản ẩn tiền cho KDS, bản ẩn tiền lý thuyết cho Ca mở).
15. `C:\bib\cf_19\packages\shared\src\index.ts` (Barrel export cho `@cf19/shared`).

### Nhóm C: Dữ Liệu Mẫu Đa Chi Nhánh `seed.sql` & Bộ Unit Tests `vitest` (Do `pawn-flash-2` thực thi theo Phiếu Tốt #2)
16. `C:\bib\cf_19\supabase\seed.sql`:
    - 1 Tổ chức (`CF19`).
    - 5 Điểm vận hành (`CW-TAYNGUYEN` + `STORE-01..04`).
    - **8 Tài khoản nhân sự (`auth.users` + `public.user_profiles`)**:
      1. `SUPER_ADMIN` (`admin@cf19.vn`, PIN `123456`)
      2. `WAREHOUSE_MANAGER` (`warehouse@cf19.vn`, gán `CW-TAYNGUYEN`)
      3. `STORE_MANAGER` Quán 1 (`manager.store01@cf19.vn`, gán `STORE-01`, PIN `123456`)
      4. `STORE_MANAGER` Quán 2 (`manager.store02@cf19.vn`, gán `STORE-02`, PIN `654321`) — *Dùng để kiểm thử chặn Quản lý Quán 2 duyệt PIN hoặc xem kho của Quán 1!*
      5. `CASHIER_STAFF` Quán 1 (`cashier.store01@cf19.vn`, gán `STORE-01`)
      6. `CASHIER_STAFF` Quán 2 (`cashier.store02@cf19.vn`, gán `STORE-02`)
      7. `BARISTA_KDS` Quán 1 (`barista.store01@cf19.vn`, gán `STORE-01`)
      8. `BARISTA_KDS` Quán 2 (`barista.store02@cf19.vn`, gán `STORE-02`)
    - **8 Vật tư (`inventory_items`)**, **5 Lô hàng (`warehouse_lots`)** tại Kho Tổng, Quán 1 và Quán 2, **1 Mẻ rang (`roast_batches`)**, **Thực đơn + Variants + Modifiers + BOM Recipes**, **2 Khách sỉ B2B + 4 Bậc giá sỉ (`b2b_price_tiers`)**.
17. `C:\bib\cf_19\packages\shared\src\__tests__\schemas.test.ts`:
    - Bộ kiểm thử tự động chạy bằng `vitest` với tối thiểu **16 test cases** kiểm tra nghiêm ngặt:
      - Tiền tệ VNĐ bắt buộc là số nguyên không âm (chặn số thực dấu phẩy động như `25000.5` và số âm `-100`).
      - Khối lượng kho/định lượng BOM bắt buộc `> 0` (chặn `0` hoặc âm).
      - Mã PIN Quản lý bắt buộc đúng 6 chữ số (chặn `12345`, `1234567`, `12345a`) và lý do tối thiểu 3 ký tự.
      - Đơn POS bắt buộc có ít nhất 1 món, số lượng món là số nguyên dương.
      - Phiếu chuyển kho 2 pha bắt buộc có ít nhất 1 mặt hàng.
      - Đóng ca đếm tiền mù bắt buộc `blind_counted_cash_vnd` là số nguyên không âm.
      - Kiểm tra danh sách hằng số bảo mật `SENSITIVE_COST_KEYS` và `KDS_FORBIDDEN_FINANCE_KEYS` chứa đầy đủ các trường nhạy cảm.
