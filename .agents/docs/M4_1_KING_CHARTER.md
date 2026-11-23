# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M4.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M4.1)

- **Tiểu phân hệ:** `M4.1 - SQL Atomic RPCs (0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql), Pure POS/BOM/ESC-POS Math Engine & @cf19/shared M4 Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Năm Quy Tắc Toán Học & Nghiệp Vụ Cốt Lõi Của Phân Hệ M4

Toàn bộ các quy tắc dưới đây phải được cài đặt đồng nhất 100% trong cả PL/pgSQL (`0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql`) lẫn TypeScript (`packages/shared/src/utils/posBomAndReceiptMath.ts`):

1. **Định Giá Món Theo Hệ Số Vùng Chi Nhánh, Biến Thể Size (`S/M/L`) & Ma Trận Topping/Modifiers (`calculatePosLinePricing`):**
   - Mỗi chi nhánh (`stores`) có hệ số nhân giá vùng `price_multiplier` (ví dụ Quán 1, 2, 4 là `1.00`, Quán 3 Đại Lộ Đông Tây là `1.05`).
   - Giá cơ sở tại chi nhánh:
     $$\text{effective\_base\_price\_vnd} = \text{ROUND}(\text{product.base\_price\_vnd} \times \text{store.price\_multiplier})$$
   - Đơn giá 1 ly sau khi cộng Size (`variant.price_delta_vnd`) và danh sách Modifiers (`modifier.extra_price_vnd`):
     $$\text{unit\_price\_vnd} = \text{effective\_base\_price\_vnd} + \text{COALESCE}(\text{variant.price\_delta\_vnd}, 0) + \sum_{m \in \text{modifiers}} m.\text{extra\_price\_vnd}$$
   - Thành tiền dòng món:
     $$\text{line\_total\_vnd} = \text{unit\_price\_vnd} \times \text{quantity}$$
2. **Ma Trận Kiểm Tra Ràng Buộc Modifiers (`validateModifierSelectionMatrix`):**
   - Trong 1 dòng món đồ uống:
     - Nhóm `'SUGAR'` (Mức đường): Tối đa **1** lựa chọn (ví dụ không thể vừa chọn `Ít đường 50%` vừa chọn `Không đường 0%` trên cùng 1 ly).
     - Nhóm `'ICE'` (Mức đá): Tối đa **1** lựa chọn.
     - Nhóm `'TOPPING'` (hoặc `'EXTRA'`): Cho phép chọn **nhiều** topping khác nhau trên cùng 1 ly (ví dụ vừa `Thêm Shot Espresso` vừa `Thêm Kem Sữa`).
3. **Động Cơ Tính Định Lượng Nguyên Liệu Đa Tầng (Multi-level BOM + Hao Hụt Pha Chế) & Giá Vốn Nội Bộ (`calculateOrderBomRequirementsAndCogs`):**
   - Khi bán 1 dòng món có `quantity` ly:
     - **Tầng 1 (Công thức gốc `bom_recipes` + `bom_recipe_items` theo `product_id` & `variant_id`):**
       Với mỗi nguyên liệu trong công thức có `quantity_per_cup_base_unit` và tỷ lệ hao hụt pha chế cho phép `wastage_allowance_pct`:
       $$\text{required\_qty} = \text{ROUND}\left(\text{quantity} \times \text{quantity\_per\_cup\_base\_unit} \times \left(1 + \frac{\text{wastage\_allowance\_pct}}{100}\right), 2\right)$$
     - **Tầng 2 (Nguyên liệu gắn kèm Modifier/Topping `menu_modifiers.linked_inventory_item_id`):**
       Nếu khách chọn modifier có gắn nguyên liệu kho (`linked_inventory_item_id !== null` và `linked_qty_base_unit > 0`, ví dụ `Thêm Shot Espresso` trừ thêm `10g` cà phê hạt rang, `Thêm Sữa Đặc` trừ thêm `15ml` sữa đặc):
       $$\text{modifier\_required\_qty} = \text{ROUND}(\text{quantity} \times \text{linked\_qty\_base\_unit}, 2)$$
     - **Tổng hợp theo từng `inventory_item_id`** và nhân với `internal_transfer_price_vnd` để ra `cogs_amount_vnd` của đơn hàng (lưu vào `pos_orders.cogs_amount_vnd` phục vụ P&L Chủ chuỗi, và tự động bị `sanitizeCostFields()` ẩn khỏi `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS`).
4. **Cơ Chế Đồng Bộ Hóa Đơn POS Offline-First Bất Biến (`Idempotent Offline Sync`):**
   - Khi máy tính bảng POS tại quán bị mất mạng tạm thời, các đơn hàng được lưu vào hàng đợi cục bộ (`IndexedDB` / Offline Queue) kèm `client_order_code` duy nhất (ví dụ `POS-S01-OFFLINE-001`).
   - Khi có mạng trở lại, endpoint đồng bộ lô (`batch sync`) gửi danh sách đơn lên Server:
     - Nếu `order_code` đã tồn tại tại `store_id` đó: trả về `status: 'IDEMPOTENT_EXISTING'` cùng bản ghi đơn đã lưu trước đó (tuyệt đối không tạo trùng đơn thứ 2 hay tính trùng doanh thu!).
     - Nếu chưa tồn tại: tạo đơn mới nguyên tử và trả về `status: 'SYNCED_NEW'`.
5. **Trình Kết Xuất Hóa Đơn Nhiệt Chuẩn ESC/POS 42 Cột (`buildEscPosThermalReceiptText`):**
   - Sinh chuỗi hóa đơn nhiệt 42 ký tự/dòng gồm: Tên Quán, Mã đơn, Thời gian, Thu ngân, Bảng món + Size + Modifiers, Tổng thanh toán VNĐ, Phương thức thanh toán (`CASH` / `VIETQR`), Mã tham chiếu `vietqr_ref_code` và Trạng thái thanh toán.

---

## 2. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M4.1

### Nhóm A: Tầng SQL Atomic RPCs (Do Quân Hậu `queen-neon` trực tiếp thiết kế & ghi file)
1. `C:\bib\cf_19\supabase\migrations\0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql`:
   - `public.rpc_m4_get_store_pos_catalog(...)`
   - `public.rpc_m4_create_pos_order(...)` (hỗ trợ idempotent replay theo `order_code`, tính giá hệ số vùng + variants + modifiers, tính BOM COGS đa tầng, sinh `vietqr_ref_code`, ghi `audit_logs`)
   - `public.rpc_m4_sync_offline_pos_orders(...)` (đồng bộ lô nhiều đơn offline idempotent trong 1 transaction)

### Nhóm B: Hợp Đồng `@cf19/shared` M4 Schemas, Types & Barrel Exports (Do `pawn-flash-1` thực thi — 4 files)
2. `C:\bib\cf_19\packages\shared\src\schemas\posCatalog.schema.ts` (Tạo mới):
   - `PosCatalogQuerySchema`, `PosOrderCartItemInputSchema`, `SubmitPosOrderSchema`, `OfflinePosBatchSyncSchema`, `PosOrdersFilterQuerySchema`.
3. `C:\bib\cf_19\packages\shared\src\types\posCatalog.types.ts` (Tạo mới):
   - Toàn bộ DTOs cho Master Catalog, Variants, Modifiers, BOM Recipes, BOM Material Requirement Slices, POS Line Price Breakdown, POS Order Detail, Offline Batch Sync Result & ESC/POS Thermal Receipt.
4. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Re-export `./posCatalog.schema.js`).
5. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Re-export `./types/posCatalog.types.js` và `./utils/posBomAndReceiptMath.js`).

### Nhóm C: Pure POS/BOM/Receipt Mathematical Engine + Bộ Vitest Unit Tests (Do `pawn-flash-2` thực thi — 2 files)
6. `C:\bib\cf_19\packages\shared\src\utils\posBomAndReceiptMath.ts` (Tạo mới):
   - 5 hàm thuần túy: `calculateBranchAdjustedBasePriceVnd`, `calculatePosLinePricing`, `validateModifierSelectionMatrix`, `calculateOrderBomRequirementsAndCogs`, `buildEscPosThermalReceiptText`.
7. `C:\bib\cf_19\packages\shared\src\__tests__\pos-catalog-m4.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động Vitest gồm tối thiểu **20 test cases** kiểm tra toàn diện `posBomAndReceiptMath.ts` và `posCatalog.schema.ts`.
