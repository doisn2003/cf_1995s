# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M3.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M3.1)

- **Tiểu phân hệ:** `M3.1 - SQL Atomic RPCs (0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql), Pure B2B/Transfer Math Engine & @cf19/shared M3 Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Năm Quy Tắc Toán Học & Nghiệp Vụ Cốt Lõi Của Phân Hệ M3

Toàn bộ các quy tắc dưới đây phải được cài đặt đồng nhất 100% trong cả PL/pgSQL (`0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql`) lẫn TypeScript (`packages/shared/src/utils/b2bAndTransferMath.ts`):

1. **Thuật toán Tra Giá Sỉ B2B Theo Bậc Sản Lượng & Hạng Khách Hàng (`resolveB2bTieredUnitPriceVnd`):**
   - Quy đổi số lượng đặt theo đơn vị cơ sở (`qty_base_unit`) sang `kg`:
     $$\text{qty\_kg} = \begin{cases} \text{qty\_base\_unit} / 1000.0 & \text{nếu } \text{base\_unit} = \text{'g'} \\ \text{qty\_base\_unit} & \text{ngược lại} \end{cases}$$
   - Lọc các bậc giá đang active (`is_active = true`) của `item_id` trong `b2b_price_tiers` thỏa mãn:
     - `min_qty_kg <= qty_kg` VÀ (`tier_code === customerPriceTier` HOẶC bậc giá đạt ngưỡng sản lượng `min_qty_kg <= qty_kg`).
     - Chọn mức `unit_price_vnd` **thấp nhất (ưu đãi nhất cho khách sỉ)** trong các bậc thỏa mãn.
     - Nếu không có bậc giá sỉ nào thỏa mãn, fallback về `item.retail_price_vnd > 0 ? item.retail_price_vnd : item.internal_transfer_price_vnd`.
2. **Kiểm Soát Hạn Mức Công Nợ Gối Đầu (`calculateB2bCreditCheck`):**
   - Với `totalAmountVnd` và `paidAmountVnd` (`0 <= paidAmountVnd <= totalAmountVnd`):
     - `debtAddedVnd = totalAmountVnd - paidAmountVnd`
     - `projectedDebtVnd = currentDebtVnd + debtAddedVnd`
     - `exceedsCreditLimit = projectedDebtVnd > creditLimitVnd` (nếu `true`, chặn giao dịch với lỗi `409 CREDIT_LIMIT_EXCEEDED`).
     - `remainingCreditVnd = Math.max(0, creditLimitVnd - projectedDebtVnd)`.
3. **Thuật Toán Gạch Nợ Hóa Đơn B2B Cũ Trước (`settleFifoPendingInvoices`):**
   - Khi khách sỉ thanh toán số tiền `paymentAmountVnd` (`0 < paymentAmountVnd <= currentDebtVnd`):
   - Sắp xếp các hóa đơn `b2b_orders` đang `payment_status === 'PENDING'` (`paid_amount_vnd < total_amount_vnd`) theo thứ tự cũ nhất trước: `ordered_at ASC, order_code ASC, id ASC`.
   - Phân bổ tiền thanh toán lần lượt từ hóa đơn cũ nhất sang hóa đơn mới hơn:
     - $\text{apply}_i = \min(\text{remainingPayment}, \text{order}_i.\text{total\_amount\_vnd} - \text{order}_i.\text{paid\_amount\_vnd})$.
     - $\text{new\_paid}_i = \text{order}_i.\text{paid\_amount\_vnd} + \text{apply}_i$.
     - Nếu $\text{new\_paid}_i === \text{order}_i.\text{total\_amount\_vnd}$, chuyển $\text{new\_status}_i = \text{'PAID'}$, ngược lại giữ `'PENDING'`.
4. **Phân Nhóm Tuổi Nợ Khách Sỉ (`classifyArAgingBucket`):**
   - Dựa trên số ngày quá hạn (`daysOverdue` tính từ `due_date` đến ngày đối soát):
     - `daysOverdue <= 0`: `'CURRENT'` (Trong hạn)
     - `1 <= daysOverdue <= 30`: `'OVERDUE_1_30'` (Quá hạn 1–30 ngày)
     - `31 <= daysOverdue <= 60`: `'OVERDUE_31_60'` (Quá hạn 31–60 ngày)
     - `daysOverdue > 60`: `'OVERDUE_60_PLUS'` (Nợ xấu > 60 ngày)
5. **Luồng Chuyển Kho Nội Bộ 2 Pha (`REQUESTED` → `IN_TRANSIT` → `RECONCILED`):**
   - **Pha 0 (`REQUESTED`):** Quản lý quán (`STORE_MANAGER` của đúng `to_store_id`, hoặc `SUPER_ADMIN`) tạo Phiếu xin cấp hàng, định giá dự kiến theo `inventory_items.internal_transfer_price_vnd`.
   - **Pha 1 (`IN_TRANSIT`):** Quản lý Kho Tổng (`WAREHOUSE_MANAGER` hoặc `SUPER_ADMIN`) duyệt xuất; hệ thống tự động trừ tồn Kho Tổng theo thứ tự **Multi-Lot FIFO** (4 khóa ưu tiên của M2), gắn `lot_id` của Kho Tổng và `dispatched_qty` vào `internal_transfer_items`, chuyển phiếu sang `'IN_TRANSIT'`.
   - **Pha 2 (`RECONCILED`):** Quản lý quán nhận (`STORE_MANAGER` của đúng `to_store_id`, hoặc `SUPER_ADMIN`) xác nhận số lượng thực nhận (`received_qty`, `0 <= received_qty <= dispatched_qty`); hệ thống tính lại `total_internal_value_vnd` theo lượng thực nhận, tạo lô hàng mới tại kho của Quán (`warehouse_lots` với `store_id = to_store_id`, kế thừa `roast_date` & `expiry_date` từ lô nguồn, **`unit_cost_vnd = internal_unit_price_vnd`** để ẩn tuyệt đối giá vốn Tây Nguyên!), và chuyển phiếu sang `'RECONCILED'`.

---

## 2. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M3.1

### Nhóm A: Tầng SQL Atomic RPCs (Do Quân Hậu `queen-neon` trực tiếp thiết kế & ghi file)
1. `C:\bib\cf_19\supabase\migrations\0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql`:
   - `public.rpc_m3_create_b2b_order(...)`
   - `public.rpc_m3_record_b2b_debt_payment(...)`
   - `public.rpc_m3_request_internal_transfer(...)`
   - `public.rpc_m3_dispatch_internal_transfer_fifo(...)`
   - `public.rpc_m3_reconcile_internal_transfer(...)`

### Nhóm B: Hợp Đồng `@cf19/shared` M3 Schemas, Types & Barrel Exports (Do `pawn-flash-1` thực thi — 4 files)
2. `C:\bib\cf_19\packages\shared\src\schemas\b2b.schema.ts` (Tạo mới):
   - `B2bPriceQuoteQuerySchema`, `B2bOrderItemInputSchema`, `CreateB2bOrderSchema`, `RecordB2bDebtPaymentSchema`, `TransferFilterQuerySchema`, `DispatchInternalTransferFifoSchema`.
3. `C:\bib\cf_19\packages\shared\src\types\b2b.types.ts` (Tạo mới):
   - Toàn bộ DTOs cho B2B Customers, Price Tiers, Price Quote Result, B2B Orders, B2B Order Items, B2B Debt Ledger Entries, AR Aging Summary, Internal Transfers (`REQUESTED` / `IN_TRANSIT` / `RECONCILED`), Internal Transfer Items, Dispatch Result & Reconcile Result.
4. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Re-export `./b2b.schema.js`).
5. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Re-export `./types/b2b.types.js` và `./utils/b2bAndTransferMath.js`).

### Nhóm C: Pure B2B & Transfer Mathematical Engine + Bộ Vitest Unit Tests (Do `pawn-flash-2` thực thi — 2 files)
6. `C:\bib\cf_19\packages\shared\src\utils\b2bAndTransferMath.ts` (Tạo mới):
   - 6 hàm toán học thuần túy: `convertToKgForTierPricing`, `resolveB2bTieredUnitPriceVnd`, `calculateB2bCreditCheck`, `settleFifoPendingInvoices`, `classifyArAgingBucket`, `calculateInternalTransferTotalVnd`.
7. `C:\bib\cf_19\packages\shared\src\__tests__\b2b-transfers-m3.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động Vitest gồm tối thiểu **20 test cases** kiểm tra toàn diện `b2bAndTransferMath.ts` và `b2b.schema.ts`.
