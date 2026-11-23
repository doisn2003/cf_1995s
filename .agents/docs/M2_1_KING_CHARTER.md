# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M2.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M2.1)

- **Tiểu phân hệ:** `M2.1 - SQL Atomic RPCs (0003_m2_wms_roastery_fifo_rpcs.sql), Pure Warehouse Math Engine & @cf19/shared M2 Modular Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Các Công Thức Toán Học Tài Chính — Kho Vận Bất Biến Của M2

Toàn bộ công thức dưới đây phải được cài đặt đồng nhất 100% trong cả PL/pgSQL (`0003_m2_wms_roastery_fifo_rpcs.sql`) lẫn TypeScript (`packages/shared/src/utils/warehouseMath.ts`):

1. **Đơn giá vốn thực tế của lô nhập có phân bổ chi phí vận chuyển (`effective_unit_cost_vnd`):**
   $$\text{effective\_unit\_cost\_vnd} = \text{unit\_cost\_vnd} + \text{ROUND}\left(\frac{\text{shipping\_cost\_vnd}}{\text{initial\_qty}}\right)$$
   *(Tất cả tiền tệ làm tròn về số nguyên `BIGINT` / `Math.round`, cấm để số thập phân).*
2. **Giá vốn bình quân gia quyền (`Moving Average Cost — MAC`):**
   Gọi $Q_{\text{old}}$ là tổng `remaining_qty` của các lô đang `AVAILABLE` (`remaining_qty > 0`) của mặt hàng đó tại Kho Tổng trước khi cộng lô mới, $C_{\text{old}}$ là `moving_avg_cost_vnd` hiện tại:
   $$\text{new\_mac\_vnd} = \begin{cases} \text{effective\_unit\_cost\_vnd} & \text{nếu } Q_{\text{old}} + Q_{\text{new}} \le 0 \\ \text{ROUND}\left(\frac{Q_{\text{old}} \times C_{\text{old}} + Q_{\text{new}} \times \text{effective\_unit\_cost\_vnd}}{Q_{\text{old}} + Q_{\text{new}}}\right) & \text{ngược lại} \end{cases}$$
3. **Ma trận Hao hụt sau rang (`weight_loss_pct`) & Cảnh báo Hao hụt Bất thường:**
   - Ràng buộc vật lý: $0 < \text{roasted\_output\_weight\_g} \le \text{green\_input\_weight\_g}$.
   - Công thức tỷ lệ hao hụt (làm tròn 2 chữ số thập phân):
     $$\text{weight\_loss\_pct} = \text{ROUND}\left(\frac{\text{green\_input\_weight\_g} - \text{roasted\_output\_weight\_g}}{\text{green\_input\_weight\_g}} \times 100, 2\right)$$
   - Ngưỡng chuẩn rang xay Tây Nguyên là `[12.00%, 20.00%]`. Nếu $\text{weight\_loss\_pct} < 12.00$ hoặc $\text{weight\_loss\_pct} > 20.00$, gắn cờ `is_abnormal_yield_loss = true`.
4. **Kết chuyển Giá vốn từ Nhân xanh sang Hạt rang thành phẩm (`output_unit_cost_vnd`):**
   $$\text{output\_unit\_cost\_vnd} = \text{ROUND}\left(\frac{\text{green\_input\_weight\_g} \times \text{source\_green\_lot.unit\_cost\_vnd}}{\text{roasted\_output\_weight\_g}}\right)$$
5. **Thứ tự Ưu tiên Khóa & Vét cạn Đa lô FIFO (`Multi-Lot FIFO Ordering`):**
   Sắp xếp các lô có `status = 'AVAILABLE' AND remaining_qty > 0` theo thứ tự ưu tiên:
   - Khóa 1: `COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC` (ngày rang hoặc ngày nhập cũ nhất xuất trước).
   - Khóa 2: `received_at ASC` (thời điểm nhập kho cũ nhất trước).
   - Khóa 3: `lot_code ASC`, `id ASC` (deterministic tie-breaker).

---

## 2. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M2.1

### Nhóm A: Tầng SQL Atomic RPCs (Do Quân Hậu `queen-neon` trực tiếp thiết kế & ghi file)
1. `C:\bib\cf_19\supabase\migrations\0003_m2_wms_roastery_fifo_rpcs.sql`:
   - Hàm bảo vệ RBAC `public._m2_assert_warehouse_actor(p_actor_id UUID)` (chỉ cho phép `SUPER_ADMIN` và `WAREHOUSE_MANAGER`).
   - `public.rpc_m2_ingest_warehouse_lot(...)`
   - `public.rpc_m2_complete_roast_batch(...)`
   - `public.rpc_m2_allocate_fifo_stock(...)`

### Nhóm B: Hợp Đồng `@cf19/shared` M2 Modular Files (Do `pawn-flash-1` thực thi — 4 files)
2. `C:\bib\cf_19\packages\shared\src\schemas\warehouse.schema.ts`:
   - `IngestWarehouseLotSchema`, `CompleteRoastBatchSchema`, `FifoAllocationRequestSchema`, `WarehouseLotQuerySchema`.
3. `C:\bib\cf_19\packages\shared\src\types\warehouse.types.ts`:
   - `IngestWarehouseLotDTO`, `CompleteRoastBatchDTO`, `FifoAllocationRequestDTO`, `WarehouseLotQueryDTO`, `WarehouseLotIngestResultDTO`, `CompleteRoastBatchResultDTO`, `FifoLotAllocationSliceDTO`, `FifoAllocationResultDTO`, `WarehouseStockSummaryDTO`, `WarehouseOverviewDTO`.
4. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Re-export thêm `./warehouse.schema.js`).
5. `C:\bib\cf_19\packages\shared\src\index.ts` (Re-export thêm `./types/warehouse.types.js` và `./utils/warehouseMath.js`).

### Nhóm C: Pure Mathematical Engine & Bộ Vitest Unit Tests (Do `pawn-flash-2` thực thi — 2 files)
6. `C:\bib\cf_19\packages\shared\src\utils\warehouseMath.ts`:
   - `calculateEffectiveLotUnitCostVnd(unitCostVnd: number, shippingCostVnd: number, initialQty: number): number`
   - `calculateMovingAverageCostVnd(oldQty: number, oldMacVnd: number, newQty: number, newEffectiveUnitCostVnd: number): number`
   - `calculateRoastYieldLossPct(greenInputWeightG: number, roastedOutputWeightG: number): number`
   - `isAbnormalRoastYieldLoss(weightLossPct: number): boolean`
   - `calculateRoastedOutputUnitCostVnd(greenInputWeightG: number, sourceGreenUnitCostVnd: number, roastedOutputWeightG: number): number`
   - `compareFifoLots(a: { id: string; lot_code: string; roast_date: string | null; received_at: string }, b: { id: string; lot_code: string; roast_date: string | null; received_at: string }): number`
7. `C:\bib\cf_19\packages\shared\src\__tests__\warehouse-m2.test.ts`:
   - Bộ kiểm thử tự động Vitest gồm tối thiểu **18 test cases** kiểm tra toàn diện các công thức toán học trong `warehouseMath.ts` và các Zod schemas trong `warehouse.schema.ts`.
