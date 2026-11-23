# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M6.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M6.1)

- **Tiểu phân hệ:** `M6.1 - SQL Atomic RPCs (0007_m6_kds_bom_deduction_and_blind_close_rpcs.sql), Pure KDS/BOM/Blind-Close/Stocktake Math Engine & @cf19/shared M6 Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Bốn Quy Tắc Toán Học & Nghiệp Vụ Cốt Lõi Của Phân Hệ M6

Toàn bộ công thức dưới đây phải được cài đặt đồng nhất 100% trong cả PL/pgSQL (`0007_m6_kds_bom_deduction_and_blind_close_rpcs.sql`) lẫn TypeScript (`packages/shared/src/utils/kdsBomAndVarianceMath.ts`):

1. **Ma Trận Phân Loại Thời Gian Chờ SLA Trên Màn Hình KDS (`classifyKdsWaitSla`):**
   - Tính số phút chờ kể từ `created_at`:
     $$\text{wait\_minutes} = \max\left(0, \left\lfloor \frac{\text{now\_ms} - \text{created\_at\_ms}}{60000} \right\rfloor\right)$$
   - Phân nhóm SLA chuẩn `SRS_BUSINESS_SPEC.md` Mục 2.2.2:
     - `wait_minutes < 5`: `'NORMAL_GREEN'` (Xanh — Trong chuẩn < 5 phút)
     - `5 <= wait_minutes < 10`: `'WARNING_YELLOW'` (Vàng — Cảnh báo 5–10 phút)
     - `wait_minutes >= 10`: `'CRITICAL_RED'` (Đỏ — Trễ nghiêm trọng $\ge 10$ phút)
2. **Trừ Kho Tự Động Nguyên Tử Đa Tầng Theo Công Thức BOM & Lô FIFO Tại Quán (`allocateStoreBomFifoDeduction` & `rpc_m6_complete_kds_order_bom_deduction`):**
   - Khi Pha chế (`BARISTA_KDS`, `STORE_MANAGER`, hoặc `SUPER_ADMIN`) hoàn tất món trên KDS (`QUEUED` / `PREPARING` $\rightarrow$ `COMPLETED`):
   - **Idempotency Guard:** Nếu `pos_orders.bom_deducted_at IS NOT NULL`, trả về `already_deducted: true` mà không trừ kho lần 2.
   - **Void Guard:** Nếu `pos_orders.payment_status = 'VOIDED'`, chặn `409 ORDER_ALREADY_VOIDED`.
   - **Tính tổng lượng nguyên liệu cần trừ theo BOM 2 tầng** (sử dụng định mức `bom_recipes` + `bom_recipe_items` có `wastage_allowance_pct` và nguyên liệu gắn kèm modifier `menu_modifiers.inventory_item_id` + `bom_qty_base_unit`).
   - **Khóa & Vét cạn các lô `AVAILABLE` tại kho Quán (`warehouse_lots.store_id = p_store_id`) theo đúng thứ tự FIFO 4 khóa ưu tiên (`compareFifoLots`):**
     - Trừ `remaining_qty`, chuyển `status = 'DEPLETED'` khi `remaining_qty = 0`.
     - Nếu tồn tại quán không đủ và `allow_partial_on_shortage = false`: rollback với `409 INSUFFICIENT_STORE_BOM_STOCK`.
     - Nếu `allow_partial_on_shortage = true`: trừ tối đa lượng khả dụng hiện có tại quán và ghi nhận chính xác `shortage_qty` cho từng nguyên liệu bị thiếu.
     - Cập nhật `pos_orders.kds_status = 'COMPLETED'`, `pos_orders.bom_deducted_at = NOW()`, ghi `audit_logs` (`KDS_ORDER_BOM_DEDUCTED`).
3. **Đóng Ca Đếm Tiền Mù (`calculateBlindShiftCloseVariance` & `rpc_m6_blind_close_pos_shift`):**
   - Trước khi đóng ca (`status = 'OPEN'`): `system_expected_cash_vnd` và `variance_cash_vnd` là `NULL` (thu ngân không thể nhìn thấy số tiền lý thuyết để tự bù trừ).
   - Khi thu ngân nhập `blind_counted_cash_vnd` và bấm Chốt ca:
     $$\text{system\_expected\_cash\_vnd} = \text{opening\_cash\_vnd} + \sum_{\substack{o \in \text{shift\_orders} \\ o.\text{payment\_method} = \text{'CASH'} \\ o.\text{payment\_status} = \text{'PAID'}}} o.\text{total\_amount\_vnd}$$
     $$\text{variance\_cash\_vnd} = \text{blind\_counted\_cash\_vnd} - \text{system\_expected\_cash\_vnd}$$
   - Phân loại kết quả đối soát két tiền (`variance_status`):
     - `variance_cash_vnd === 0`: `'BALANCED'`
     - `variance_cash_vnd > 0`: `'SURPLUS'`
     - `variance_cash_vnd < 0`: `'SHORTAGE'`
   - Chuyển `pos_shifts.status = 'CLOSED'`, `closed_at = NOW()`, lưu 3 cột tiền (khớp 100% constraint `chk_blind_shift_closed_vals` trong `0001_m1_core_3nf_schema.sql`), ghi `audit_logs` (`POS_SHIFT_BLIND_CLOSED`).
4. **Kiểm Kho Cuối Ngày Đối Chiếu Định Mức BOM (`calculateDailyStocktakeVariance` & `rpc_m6_submit_store_daily_stocktake`):**
   - Khớp 100% constraint `chk_stocktake_variance_formula` của bảng `store_daily_stocktakes`:
     $$\text{theoretical\_closing\_qty} = \text{ROUND}(\text{opening\_qty} + \text{received\_in\_qty} - \text{bom\_consumed\_qty}, 2)$$
     $$\text{variance\_qty} = \text{ROUND}(\text{actual\_counted\_qty} - \text{theoretical\_closing\_qty}, 2)$$
     $$\text{variance\_pct} = \begin{cases} 0 & \text{nếu } \text{theoretical\_closing\_qty} \le 0 \\ \text{ROUND}\left(\frac{\text{variance\_qty}}{\text{theoretical\_closing\_qty}} \times 100, 2\right) & \text{ngược lại} \end{cases}$$
   - Gắn cờ cảnh báo hao hụt bất thường `is_abnormal_shrinkage = (variance_qty < 0 && Math.abs(variance_pct) > 3.0)`.

---

## 2. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M6.1

### Nhóm A: Tầng SQL Atomic RPCs (Do Quân Hậu `queen-neon` trực tiếp thiết kế & ghi file)
1. `C:\bib\cf_19\supabase\migrations\0007_m6_kds_bom_deduction_and_blind_close_rpcs.sql`:
   - `public.rpc_m6_advance_kds_order_status(...)` (chuyển `QUEUED` $\rightarrow$ `PREPARING`, hoặc gọi hoàn tất `COMPLETED` kích hoạt trừ kho BOM)
   - `public.rpc_m6_complete_kds_order_bom_deduction(...)` (trừ kho FIFO tại quán theo BOM 2 tầng, idempotent trên `bom_deducted_at`, ghi `audit_logs`)
   - `public.rpc_m6_blind_close_pos_shift(...)` (tính `system_expected_cash_vnd` từ `opening_cash_vnd` + tổng đơn `CASH` `PAID`, tính `variance_cash_vnd`, khóa ca `CLOSED`, ghi `audit_logs`)
   - `public.rpc_m6_submit_store_daily_stocktake(...)` (kiểm kho cuối ngày đối chiếu BOM, upsert vào `store_daily_stocktakes`, ghi `audit_logs`)

### Nhóm B: Hợp Đồng `@cf19/shared` M6 Schemas, Types & Barrel Exports (Do `pawn-flash-1` thực thi — 4 files)
2. `C:\bib\cf_19\packages\shared\src\schemas\kdsAndShift.schema.ts` (Tạo mới):
   - `AdvanceKdsTicketStatusSchema`, `CompleteKdsBomDeductionSchema`, `ReportBaristaLowStockAlertSchema`, `BlindClosePosShiftRequestSchema`, `SubmitStoreDailyStocktakeSchema`, `KdsQueueQuerySchema`.
   - *(Lưu ý: Kiểm tra kỹ `packages/shared/src/schemas/` để không đặt trùng tên schema đã export ở M1.1 như `OpenShiftSchema` hay `BlindCloseShiftSchema`!)*.
3. `C:\bib\cf_19\packages\shared\src\types\kdsAndShift.types.ts` (Tạo mới):
   - Toàn bộ DTOs cho KDS SLA Ticket (`KdsSlaLevel`, `KdsTicketBoardItemDTO`, `KdsBomDeductionLotSliceDTO`, `KdsBomItemDeductionResultDTO`, `KdsOrderCompletionResultDTO`, `BaristaLowStockAlertDTO`), Blind Shift Close (`ShiftVarianceStatus`, `BlindShiftCloseResultDTO`), và Daily Stocktake (`StoreDailyStocktakeItemResultDTO`, `StoreDailyStocktakeBatchResultDTO`).
4. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Re-export `./kdsAndShift.schema.js`).
5. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Re-export `./types/kdsAndShift.types.js` và `./utils/kdsBomAndVarianceMath.js`).

### Nhóm C: Pure KDS/BOM/Blind-Close/Stocktake Math Engine + Bộ Vitest Unit Tests (Do `pawn-flash-2` thực thi — 2 files)
6. `C:\bib\cf_19\packages\shared\src\utils\kdsBomAndVarianceMath.ts` (Tạo mới):
   - 5 hàm thuần túy: `classifyKdsWaitSla`, `allocateStoreBomFifoDeduction`, `calculateBlindShiftCloseVariance`, `classifyShiftCashVarianceStatus`, `calculateDailyStocktakeVariance`.
7. `C:\bib\cf_19\packages\shared\src\__tests__\kds-bom-blindclose-m6.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động Vitest gồm tối thiểu **20 test cases** kiểm tra toàn diện `kdsBomAndVarianceMath.ts` và `kdsAndShift.schema.ts`.
