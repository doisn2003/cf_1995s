# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M4.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M4.2)

- **Tiểu phân hệ:** `M4.2 - Backend Master Catalog, Multi-level BOM Cost Calculator, POS Order State-Machine & Offline Batch Sync API + Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc 8 Files Chuyên Biệt Của Tiểu Phân Hệ M4.2 (`@cf19/api`)

Tiểu phân hệ **M4.2** xây dựng toàn bộ tầng Backend cho **Thực đơn & Định mức BOM (`modules/catalog/*`)** và **Quầy Thu ngân POS Đa Chi Nhánh + Đồng bộ Offline (`modules/pos/*`)**, sử dụng trực tiếp các hàm toán học thuần túy trong `@cf19/shared` ở **M4.1**, đồng bộ 100% với 3 hàm PL/pgSQL RPCs trong `0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql` và bảo toàn 100% **57/57 bài test hiện có của M1.2 + M2.2 + M3.2**:

### Nhóm A: Mở Rộng Seed Store (Catalog + BOM + Shifts) & Catalog Module (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật):
   - Giữ nguyên 100% toàn bộ dữ liệu M1.2, M2.2 & M3.2 để 57 bài test hiện có pass tuyệt đối.
   - Bổ sung vào `InMemoryDatabaseState` và `createInitialSeedState()` các bảng thực đơn & BOM khớp 100% với `supabase/seed.sql` và `SEED_IDS`:
     - `menuCategories: MenuCategoryDto[]` (2 nhóm: `coffee`, `milkAndTea`)
     - `menuProducts: MenuProductDto[]` (3 món: `caPheSuaDa` 29.000đ, `caPheDenDa` 25.000đ, `bacXiuTayNguyen` 32.000đ)
     - `menuVariants: MenuVariantDto[]` (Size M `+0đ`, Size L `+6.000đ` cho cả 3 món)
     - `menuModifiers: MenuModifierDto[]` (`sugar50` SUGAR `+0đ`, `ice50` ICE `+0đ`, `extraEspressoShot` TOPPING `+8.000đ` gắn `roastedRobustaMed` `10g`, `extraCondensedMilk` TOPPING `+5.000đ` gắn `condensedMilk` `15ml`)
     - `bomRecipes: BomRecipeDto[]` & `bomRecipeItems: BomRecipeItemDto[]` (định lượng chuẩn cho `caPheSuaDaM`, `caPheDenDaM`, `bacXiuM` kèm `% hao hụt pha chế`)
     - Bổ sung thêm ca đang mở cho Quán 2 và Quán 3 (hoặc hàm mở ca / seed ca `OPEN` cho `store02`, `store03` có `price_multiplier = 1.05`) để test tạo đơn POS trên nhiều chi nhánh khác nhau mà không làm ảnh hưởng các test M1.2!
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật):
   - Đảm bảo `resetInMemoryDb()` khôi phục đầy đủ các bảng Catalog & BOM mới.
3. `C:\bib\cf_19\apps\api\src\modules\catalog\catalog.service.ts` (Tạo mới):
   - Sử dụng `calculateBranchAdjustedBasePriceVnd` và `calculateOrderBomRequirementsAndCogs` từ `@cf19/shared`.
   - Cung cấp các phương thức:
     1. `getStorePosCatalog(storeId: string, includeInactive?: boolean): Promise<StorePosCatalogDTO>` (trả về danh mục menu đã nhân hệ số giá vùng `store.price_multiplier`, kèm variants, modifiers và BOM recipes).
     2. `previewBomAndLinePricing(storeId: string, items: PosOrderCartItemInputDTO[])` (tính trước chi tiết giá bán từng dòng, định lượng nguyên liệu BOM cần tiêu hao và `totalInternalCogsVnd`).
4. `C:\bib\cf_19\apps\api\src\modules\catalog\catalog.routes.ts` (Tạo mới):
   - Bảo vệ bởi `authenticate`, `requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')`, `requireStoreScope()`, `sanitizeCostFields()`.
   - Endpoints:
     - `GET /stores/:storeId` (lấy `StorePosCatalogDTO` của chi nhánh)
     - `POST /stores/:storeId/preview-pricing` (xem trước giá bán & định lượng BOM)

### Nhóm B: POS Order State-Machine, Offline Batch Sync, App Mount & Bộ Supertest 20 Kịch Bản (Do `pawn-flash-2` thực thi — 4 files)
5. `C:\bib\cf_19\apps\api\src\modules\pos\pos.service.ts` (Tạo mới):
   - Sử dụng trực tiếp `calculatePosLinePricing`, `validateModifierSelectionMatrix`, `calculateOrderBomRequirementsAndCogs`, `buildEscPosThermalReceiptText` từ `@cf19/shared`.
   - Cung cấp các phương thức:
     1. `listStoreOrders(storeId: string, filter: PosOrdersFilterQueryDTO): Promise<PosOrderDetailDTO[]>`
     2. `getOrderReceipt(storeId: string, orderId: string): Promise<{ order: PosOrderDetailDTO; escPosText: string }>`
     3. `createPosOrder(actor: AuthActor, storeId: string, input: SubmitPosOrderDTO): Promise<{ order: PosOrderDetailDTO; idempotent_replay: boolean; esc_pos_receipt: string }>`:
        - Kiểm tra `shift_id` thuộc `storeId` và đang ở trạng thái `'OPEN'` (nếu không báo `409 SHIFT_NOT_OPEN`).
        - **Idempotency Check:** Nếu `input.client_order_code` đã tồn tại trong `pos_orders` của `storeId`, trả về ngay đơn hiện có với `idempotent_replay: true` (không tạo trùng đơn!).
        - Kiểm tra từng dòng món bằng `validateModifierSelectionMatrix` (nếu chọn 2 mức đường hoặc 2 mức đá trên cùng 1 ly -> chặn `400 INVALID_MODIFIER_MATRIX`).
        - Tính tiền theo hệ số vùng `store.price_multiplier` + variant + modifiers, tính `cogs_amount_vnd` theo BOM đa tầng (Tầng 1 recipe + Tầng 2 modifier linked items), sinh `vietqr_ref_code` khi `payment_method === 'VIETQR'`, lưu đơn + chi tiết món, cập nhật `system_expected_cash_vnd` của ca mở nếu thanh toán `CASH`, và ghi `audit_logs` (`POS_ORDER_CREATED`).
     4. `syncOfflinePosOrders(actor: AuthActor, storeId: string, input: OfflinePosBatchSyncDTO): Promise<OfflinePosBatchSyncResultDTO>`:
        - Duyệt tuần tự từng đơn trong lô offline, gọi logic idempotent để phân loại `SYNCED_NEW` và `IDEMPOTENT_EXISTING`, ghi `audit_logs` (`POS_OFFLINE_BATCH_SYNCED`).
6. `C:\bib\cf_19\apps\api\src\modules\pos\pos.routes.ts` (Tạo mới):
   - Bảo vệ bởi `authenticate`, `requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF')`, `requireStoreScope()`, `sanitizeCostFields()`.
   - Endpoints:
     - `GET /stores/:storeId/orders`
     - `POST /stores/:storeId/orders`
     - `POST /stores/:storeId/orders/offline-sync`
     - `GET /stores/:storeId/orders/:orderId/receipt`
7. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật):
   - Mount `app.use('/api/v1/catalog', catalogRouter);` và `app.use('/api/v1/pos', posRouter);`.
8. `C:\bib\cf_19\apps\api\src\__tests__\m4-pos-catalog-offline.test.ts` (Tạo mới):
   - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **20 test cases** kiểm chứng:
     - RBAC & Multi-Tenant Isolation: Chặn `WAREHOUSE_MANAGER` truy cập `/api/v1/catalog/*` và `/api/v1/pos/*` (`403`); chặn Thu ngân Quán 1 tạo đơn hoặc xem menu tại Quán 2 (`403 FORBIDDEN_CROSS_TENANT_ACCESS`).
     - Hệ số giá vùng (`price_multiplier`): `GET /api/v1/catalog/stores/:storeId` tại Quán 1 (`1.00`) trả giá Cà phê sữa đá `29.000đ`, tại Quán 3 (`1.05` do `SUPER_ADMIN` truy cập) trả giá `30.450đ`.
     - Tạo đơn POS `CASH` thành công với Size L + Topping `extraEspressoShot` + `sugar50`: tính đúng tổng tiền, tự động cộng `system_expected_cash_vnd` của ca mở (nhưng vẫn ẩn `system_expected_cash_vnd: null` đối với `CASHIER_STAFF` nhờ Blind Shift Close!), ẩn `cogs_amount_vnd` khỏi `CASHIER_STAFF` nhưng hiển thị đúng `cogs_amount_vnd` cho `SUPER_ADMIN`.
     - Tạo đơn POS `VIETQR`: trạng thái `PENDING`, tự động sinh mã tham chiếu `vietqr_ref_code` và trạng thái KDS `QUEUED`.
     - Chặn ma trận Modifier không hợp lệ (`400 INVALID_MODIFIER_MATRIX` khi truyền 2 modifier nhóm `SUGAR` hoặc `ICE`).
     - Idempotent Replay & Offline-First Batch Sync (`POST /api/v1/pos/stores/:storeId/orders/offline-sync`): gửi lô 3 đơn offline, sau đó gửi lại cùng lô đó lần 2 $\rightarrow$ lần 1 có `synced_new_count = 3`, lần 2 có `idempotent_existing_count = 3, synced_new_count = 0`, không nhân đôi đơn hàng hay doanh thu!
     - Xuất bill nhiệt ESC/POS 42 cột (`GET /api/v1/pos/stores/:storeId/orders/:orderId/receipt`).
