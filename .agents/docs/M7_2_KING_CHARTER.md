# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M7.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M7.2)

- **Tiểu phân hệ:** `M7.2 - Backend Multi-Entity OLAP P&L Consolidation Service (Kho Tổng vs 4 Quán) & 1-Click Franchise Cloner + Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc 4 Files Chuyên Biệt Của Tiểu Phân Hệ M7.2 (`@cf19/api`)

Tiểu phân hệ **M7.2** xây dựng tầng Backend cho **Báo cáo Lãi - Lỗ Hợp Nhất Đa Thực Thể (`Executive OLAP P&L Consolidation`)** và **Công cụ Nhân Bản Chi Nhánh / Nhượng Quyền 1-Click (`Franchise Store Cloning Engine`)** trong `apps/api/src/modules/analytics/`, sử dụng trực tiếp các hàm toán học thuần túy trong `@cf19/shared` ở **M7.1**, đồng bộ 100% với `0008_m7_olap_pnl_and_franchise_cloning.sql` và bảo toàn 100% **117/117 bài test hiện có của `@cf19/api`**:

### Nhóm A: Analytics P&L Consolidation & Franchise Cloning Service + Routes (Do `pawn-flash-1` thực thi — 2 files)
1. `C:\bib\cf_19\apps\api\src\modules\analytics\analytics.service.ts` (Tạo mới):
   - Sử dụng trực tiếp `calculateCentralWarehousePnl`, `calculateStoreNodePnl`, `consolidateEnterprisePnl`, `previewClonedStoreMenuPricing` từ `@cf19/shared`.
   - Cung cấp 3 phương thức chuẩn:
     1. `getExecutivePnlConsolidation(query: ExecutivePnlQueryDTO): Promise<EnterpriseConsolidatedPnlDTO>`:
        - **Hạch toán Kho Tổng Tây Nguyên (`centralWarehouse`):**
          - Tổng hợp doanh thu bán sỉ B2B (`b2bOrders` không bị `VOIDED`) và giá vốn gốc Tây Nguyên của hàng bán sỉ B2B (tra từ `warehouseLots.unit_cost_vnd` hoặc `inventoryItems.moving_avg_cost_vnd`).
          - Tổng hợp doanh thu xuất chuyển kho nội bộ (`internalTransfers` đã `RECONCILED`) và giá vốn gốc Tây Nguyên của hàng chuyển kho nội bộ.
          - Gọi `calculateCentralWarehousePnl(...)`.
        - **Hạch toán Từng Điểm Quán (`store01..store04` và mọi chi nhánh mới vừa nhân bản):**
          - Với mỗi chi nhánh có `type === 'RETAIL_STORE' || type === 'FRANCHISE_STORE'`:
            - Tổng hợp các đơn `posOrders` của quán có `payment_status === 'PAID'` (tách `cash_revenue_vnd`, `vietqr_revenue_vnd`, `store_internal_bom_cogs_vnd`).
            - Tính `cash_shortage_loss_vnd` từ các ca `posShifts` đã `'CLOSED'` của quán có `variance_cash_vnd < 0`.
            - Tính `stocktake_shrinkage_loss_vnd` từ các bản ghi `storeDailyStocktakes` của quán có `variance_qty < 0` nhân với `internal_transfer_price_vnd`.
            - Gọi `calculateStoreNodePnl(...)`.
        - **Hợp nhất Toàn Chuỗi Có Loại Trừ Giao Dịch Nội Bộ (`consolidateEnterprisePnl`):**
          - Gọi `consolidateEnterprisePnl(...)` trả về `EnterpriseConsolidatedPnlDTO` (bao gồm bảng xếp hạng hiệu quả các quán theo `store_net_profit_vnd` giảm dần!).
     2. `previewFranchisePricing(query: PreviewFranchisePricingInput): Promise<ClonedMenuProductPricePreviewDTO[]>`:
        - Lấy danh mục sản phẩm `menuProducts`, variants mặc định (`is_default === true`) và công thức `bomRecipes` để tính giá vốn BOM mỗi ly tiêu chuẩn, sau đó gọi `previewClonedStoreMenuPricing(items, query.price_multiplier)`.
     3. `cloneFranchiseStore(actor: AuthActor, input: CloneFranchiseStoreInput): Promise<CloneFranchiseStoreResultDTO>`:
        - Kiểm tra trùng `code` trong `inMemoryDb.stores` (nếu trùng throw `409 DUPLICATE_STORE_CODE`).
        - Trong 1 luồng nguyên tử:
          1. Tạo bản ghi chi nhánh mới trong `inMemoryDb.stores` (`id: randomUUID()`, `organization_id: SEED_IDS.organization.cf19`, `code: input.code`, `name: input.name`, `type: input.type`, `address: input.address`, `phone: input.phone ?? null`, `price_multiplier: input.price_multiplier`, `is_active: true`).
          2. Tạo ca thu ngân khai trương đầu tiên trong `inMemoryDb.posShifts` (`status: 'OPEN'`, `opening_cash_vnd: input.opening_cash_vnd`, `cashier_id: actor.userId`).
          3. Nếu `input.create_starter_transfer === true`: tạo tự động 1 phiếu xin cấp nguyên liệu khai trương (`internalTransfers` trạng thái `'REQUESTED'`) từ `centralWarehouse` về chi nhánh mới cho mặt hàng cà phê hạt rang `roastedRobustaMed` với số lượng `input.starter_coffee_qty_g` (theo `internal_transfer_price_vnd`).
          4. Tính bảng giá thực đơn đã nhân bản `cloned_menu_preview` bằng `previewFranchisePricing({ price_multiplier: input.price_multiplier })`.
          5. Ghi nhật ký bất biến vào `audit_logs` (`FRANCHISE_STORE_CLONED`).
          6. Trả về `CloneFranchiseStoreResultDTO`.
2. `C:\bib\cf_19\apps\api\src\modules\analytics\analytics.routes.ts` (Tạo mới):
   - **Bảo mật Phân quyền Tối cao:** Toàn bộ router `/api/v1/analytics` CHỈ cho phép duy nhất **`requireRoles('SUPER_ADMIN')`**! (`WAREHOUSE_MANAGER`, `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS` đều bị chặn `403 FORBIDDEN_ROLE` để bảo vệ tuyệt đối bí mật biên lợi nhuận chuỗi và giá vốn Tây Nguyên).
   - Endpoints:
     - `GET /pnl-consolidation`
     - `GET /franchise/preview-pricing`
     - `POST /franchise/clone-store`

### Nhóm B: App Mount & Bộ Supertest 18 Kịch Bản (Do `pawn-flash-2` thực thi — 2 files)
3. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật):
   - Mount `app.use('/api/v1/analytics', analyticsRouter);`.
4. `C:\bib\cf_19\apps\api\src\__tests__\m7-executive-pnl-franchise.test.ts` (Tạo mới):
   - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **18 test cases** kiểm chứng:
     - RBAC Guard: Chặn cả 4 Role dưới (`WAREHOUSE_MANAGER`, `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS`) truy cập `/api/v1/analytics/*` (`403 FORBIDDEN_ROLE`); chỉ `SUPER_ADMIN` truy cập thành công (`200` / `201`).
     - Báo cáo P&L Hợp nhất (`GET /api/v1/analytics/pnl-consolidation`):
       - Tách biệt rõ P&L của Kho Tổng (`central_warehouse`) và từng Quán (`store_nodes`: Quán 1, 2, 3, 4).
       - Khi phát sinh phiếu chuyển kho nội bộ đã đối soát (`RECONCILED`), Kho Tổng ghi nhận `internal_transfer_revenue_vnd` và `internal_markup_profit_vnd`, nhưng trên bảng Hợp nhất Toàn chuỗi, khoản này được loại trừ chính xác vào `intercompany_eliminated_revenue_vnd` (không bị tính trùng vào `consolidated_external_revenue_vnd`!).
       - Khi Quán 1 bán thêm đơn POS `PAID`, закрывает ca đếm tiền mù có thiếu hụt két tiền (`SHORTAGE`) và kiểm kho cuối ngày có hao hụt nguyên liệu (`variance_qty < 0`), báo cáo P&L của Quán 1 tự động phản ánh chính xác tăng doanh thu POS, tăng `cash_shortage_loss_vnd` và tăng `stocktake_shrinkage_loss_vnd`!
     - Xem trước bảng giá Nhượng quyền (`GET /api/v1/analytics/franchise/preview-pricing?price_multiplier=1.15`): nhân đúng hệ số `1.15x` và tính đúng biên lợi nhuận gộp dự kiến.
     - Nhân bản Chi nhánh mới / Nhượng quyền 1-Click (`POST /api/v1/analytics/franchise/clone-store`):
       - Tạo thành công Quán thứ 5 (`STORE-05-FRANCHISE`, `type: 'FRANCHISE_STORE'`, `price_multiplier: 1.15`), tự động mở ca khai trương `OPEN`, tự động sinh phiếu xin cấp hàng khai trương `REQUESTED` về Kho Tổng, ghi `audit_logs` (`FRANCHISE_STORE_CLONED`).
       - Ngay sau khi nhân bản, Quán thứ 5 xuất hiện trong `GET /api/v1/stores`, lấy được thực đơn POS với giá `1.15x` tại `GET /api/v1/catalog/stores/:newStoreId`, và xuất hiện trong báo cáo P&L hợp nhất (kèm tính phí bản quyền nhượng quyền `franchise_royalty_fee_vnd` 5% khi Quán 5 có doanh thu POS!).
       - Chặn nhân bản trùng mã chi nhánh (`409 DUPLICATE_STORE_CODE`).
