# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M6.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M6.2)

- **Tiểu phân hệ:** `M6.2 - Backend KDS Queue Engine, Multi-level BOM Atomic FIFO Deduction, Blind Shift Cash Close & End-of-Day Stocktake Variance Service + Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M6.2 (`@cf19/api`)

Tiểu phân hệ **M6.2** xây dựng toàn bộ tầng Backend cho **Quầy Pha chế KDS & Trừ kho BOM tự động theo FIFO (`modules/kds/*`)** và **Đóng Ca Đếm Tiền Mù + Kiểm Kho Cuối Ngày Đối Chiếu BOM (`modules/pos/shift-stocktake.*`)**, sử dụng trực tiếp các hàm toán học thuần túy trong `@cf19/shared` ở **M6.1**, đồng bộ 100% với `0007_m6_kds_bom_deduction_and_blind_close_rpcs.sql` và bảo toàn 100% **97/97 bài test hiện có của `@cf19/api`**:

### Nhóm A: Mở Rộng Seed Store (Đầy Đủ Lô Tồn Tại Quán 1 + `storeDailyStocktakes` + `baristaLowStockAlerts`) & KDS Service/Routes (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật bằng `edit_file` phẫu thuật chính xác):
   - Bảo toàn 100% dữ liệu M1–M5 (đặc biệt giữ nguyên số lượng lô tại Kho Tổng và không làm gãy bất kỳ assertion nào của 97 tests hiện có!).
   - Bổ sung vào `InMemoryDatabaseState` và `createInitialSeedState()`:
     - `storeDailyStocktakes: StoreDailyStocktakeItemResultDTO[]` (mảng khởi tạo `[]`)
     - `baristaLowStockAlerts: BaristaLowStockAlertDTO[]` (mảng khởi tạo `[]`)
     - Để phục vụ kiểm thử trừ kho BOM đầy đủ 4 nguyên liệu của 1 ly **Cà Phê Sữa Đá Size M** tại Quán 1 (`store01`: `roastedRobustaMed` đã có lô `store01RoastedRobusta01` `10.000g`, bổ sung thêm 3 lô nguyên phụ liệu tại Quán 1 cho `condensedMilk` `5.000ml`, `plasticCup500ml` `500 pcs`, `bioStraw` `500 pcs` — **LƯU Ý SỐNG CÒN:** kiểm tra xem trong `m1-rbac-security.test.ts` có test nào assert cứng số lượng phần tử của `GET /api/v1/stores/:storeId/lots` cho `store01` hay không! Nếu trong `m1-rbac-security.test.ts` có assert số lượng `warehouseLots` của `store01`, thì KHÔNG sửa `warehouseLots` gốc của `seedData.ts` mà viết hàm helper hoặc tự động cấp lô nguyên phụ liệu trong `kds.service.ts` / test setup để 97 bài test cũ PASS 100%!).
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật):
   - Khôi phục đầy đủ `storeDailyStocktakes` và `baristaLowStockAlerts` trong `resetInMemoryDb()`.
3. `C:\bib\cf_19\apps\api\src\modules\kds\kds.service.ts` (Tạo mới):
   - Sử dụng trực tiếp `classifyKdsWaitSla`, `allocateStoreBomFifoDeduction`, `calculateOrderBomRequirementsAndCogs`, `compareFifoLots` từ `@cf19/shared`.
   - Cung cấp các phương thức:
     1. `getStoreKdsBoard(storeId: string, query: KdsQueueQueryInput, referenceNowIso?: string): Promise<KdsTicketBoardItemDTO[]>`:
        - Lọc các đơn `pos_orders` của `storeId` có `payment_status !== 'VOIDED'` (mặc định lọc `kds_status !== 'COMPLETED'` trừ khi `query.include_completed === true`), sắp xếp đơn cũ nhất lên đầu (`created_at ASC`), tính `wait_minutes` và `sla_level` (`NORMAL_GREEN`, `WARNING_YELLOW`, `CRITICAL_RED`) bằng `classifyKdsWaitSla`.
        - Không chứa bất kỳ trường doanh thu/tiền tệ nào để an toàn tuyệt đối cho `BARISTA_KDS`.
     2. `advanceKdsTicketStatus(actor: AuthActor, input: AdvanceKdsTicketStatusInput): Promise<KdsOrderCompletionResultDTO>`:
        - Nếu `input.target_status === 'PREPARING'`: chuyển `order.kds_status = 'PREPARING'`, ghi `audit_logs` (`KDS_ORDER_PREPARING`), trả về kết quả không trừ kho.
        - Nếu `input.target_status === 'COMPLETED'`: ủy quyền sang `completeKdsOrderWithBomDeduction`.
     3. `completeKdsOrderWithBomDeduction(actor: AuthActor, input: CompleteKdsBomDeductionInput): Promise<KdsOrderCompletionResultDTO>`:
        - Kiểm tra đơn thuộc `input.store_id`; nếu `order.payment_status === 'VOIDED'` -> throw `409 ORDER_ALREADY_VOIDED`.
        - **Idempotency Guard:** Nếu `order.bom_deducted_at !== null`, trả về `already_deducted: true`, `kds_status: 'COMPLETED'` mà không trừ kho lần 2!
        - Tính tổng định lượng nguyên liệu cần trừ theo BOM 2 tầng (`bomRecipes` + `menuModifiers`) và gọi `allocateStoreBomFifoDeduction` trên các lô `warehouseLots` của `input.store_id`.
        - Nếu thiếu tồn kho tại quán và `!input.allow_partial_on_shortage` -> throw `409 INSUFFICIENT_STORE_BOM_STOCK`.
        - Áp dụng trừ `remaining_qty` và cập nhật `status = 'DEPLETED'` cho các lô tại quán, đặt `order.kds_status = 'COMPLETED'`, `order.bom_deducted_at = new Date().toISOString()`, ghi `audit_logs` (`KDS_ORDER_BOM_DEDUCTED`).
     4. `reportBaristaLowStockAlert(actor: AuthActor, input: ReportBaristaLowStockAlertInput): Promise<BaristaLowStockAlertDTO>` & `listLowStockAlerts(storeId: string): Promise<BaristaLowStockAlertDTO[]>`:
        - Cho phép `BARISTA_KDS` bấm báo nguyên liệu sắp hết / đã hết tại quầy bar và ghi `audit_logs` (`BARISTA_LOW_STOCK_REPORTED`).
4. `C:\bib\cf_19\apps\api\src\modules\kds\kds.routes.ts` (Tạo mới):
   - Bảo vệ bởi `authenticate`, `requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS')`, `requireStoreScope()`, `sanitizeCostFields()`.
   - Endpoints:
     - `GET /stores/:storeId/board`
     - `POST /stores/:storeId/orders/:orderId/advance`
     - `POST /stores/:storeId/orders/:orderId/complete-bom`
     - `GET /stores/:storeId/low-stock-alerts`
     - `POST /stores/:storeId/low-stock-alerts`

### Nhóm B: Blind Shift Close & EOD Stocktake Variance Service/Routes, App Mount & Bộ Supertest 20 Kịch Bản (Do `pawn-flash-2` thực thi — 3 files)
5. `C:\bib\cf_19\apps\api\src\modules\pos\shiftStocktake.service.ts` (hoặc gộp service + routes vào `C:\bib\cf_19\apps\api\src\modules\pos\shiftStocktake.routes.ts` để tách gọn 3 file cho Tốt #2):
   - Cung cấp các nghiệp vụ:
     1. `openPosShift(actor: AuthActor, storeId: string, openingCashVnd: number, notes?: string)`: Mở ca mới nếu quán chưa có ca `OPEN` (nếu đã có ca `OPEN` -> throw `409 SHIFT_ALREADY_OPEN`).
     2. `blindClosePosShift(actor: AuthActor, input: BlindClosePosShiftRequestInput): Promise<BlindShiftCloseResultDTO>`:
        - Tìm ca theo `input.shift_id` và `input.store_id`. Nếu đã `'CLOSED'` -> throw `409 SHIFT_ALREADY_CLOSED`.
        - Tính tổng doanh thu tiền mặt thực thu trong ca (`cash_sales_total_vnd` của các đơn `payment_method === 'CASH' && payment_status === 'PAID'` thuộc `shift_id`).
        - Dùng `calculateBlindShiftCloseVariance` từ `@cf19/shared` tính `system_expected_cash_vnd`, `variance_cash_vnd`, `variance_status` (`BALANCED` / `SURPLUS` / `SHORTAGE`).
        - Cập nhật `shift.status = 'CLOSED'`, `shift.closed_at`, `shift.blind_counted_cash_vnd`, `shift.system_expected_cash_vnd`, `shift.variance_cash_vnd` (sau khi ca chuyển sang `'CLOSED'`, Thu ngân được phép nhìn thấy số đối soát và độ lệch!).
        - Ghi `audit_logs` (`POS_SHIFT_BLIND_CLOSED`).
     3. `submitStoreDailyStocktake(actor: AuthActor, input: SubmitStoreDailyStocktakeInput): Promise<StoreDailyStocktakeBatchResultDTO>` & `listStoreDailyStocktakes(storeId: string)`:
        - Chỉ dành cho `SUPER_ADMIN` và `STORE_MANAGER` của đúng `storeId`.
        - Dùng `calculateDailyStocktakeVariance` từ `@cf19/shared` tính `theoretical_closing_qty`, `variance_qty`, `variance_pct`, `is_abnormal_shrinkage` cho từng mặt hàng kiểm kho, lưu vào `storeDailyStocktakes` và ghi `audit_logs` (`STORE_DAILY_STOCKTAKE_SUBMITTED`).
   - Mount các endpoints dưới `/api/v1/shifts-stocktakes`:
     - `POST /stores/:storeId/shifts/open` (`SUPER_ADMIN`, `STORE_MANAGER`, `CASHIER_STAFF`)
     - `POST /stores/:storeId/shifts/:shiftId/blind-close` (`SUPER_ADMIN`, `STORE_MANAGER`, `CASHIER_STAFF`)
     - `GET /stores/:storeId/stocktakes` (`SUPER_ADMIN`, `STORE_MANAGER`)
     - `POST /stores/:storeId/stocktakes` (`SUPER_ADMIN`, `STORE_MANAGER`)
6. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật):
   - Mount `app.use('/api/v1/kds', kdsRouter);` và `app.use('/api/v1/shifts-stocktakes', shiftStocktakeRouter);`.
7. `C:\bib\cf_19\apps\api\src\__tests__\m6-kds-bom-blindclose.test.ts` (Tạo mới):
   - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **18 test cases** kiểm chứng:
     - RBAC & Multi-Tenant Isolation: Chặn `WAREHOUSE_MANAGER` và `CASHIER_STAFF` bấm hoàn tất món KDS (`403`); chặn `BARISTA_KDS` Quán 1 xem hoặc thao tác KDS Quán 2 (`403 FORBIDDEN_CROSS_TENANT_ACCESS`); chặn `CASHIER_STAFF` và `BARISTA_KDS` gửi phiếu kiểm kho cuối ngày (`403`).
     - KDS Board & SLA Classification (`GET /api/v1/kds/stores/:storeId/board`): trả danh sách thẻ món kèm `wait_minutes` và `sla_level`, đồng thời chứng minh payload trả cho `BARISTA_KDS` bị `sanitizeCostFields()` cắt sạch mọi trường tiền tệ (`total_amount_vnd`, `unit_price_vnd`, `cogs_amount_vnd`, `unit_cost_vnd`).
     - KDS Status Progression & Atomic BOM FIFO Deduction (`POST /api/v1/kds/stores/:storeId/orders/:orderId/complete-bom`):
       - Chuyển `QUEUED` $\rightarrow$ `PREPARING` $\rightarrow$ `COMPLETED`.
       - Trừ chính xác định lượng BOM 2 tầng (cả hao hụt pha chế + nguyên liệu modifier) từ lô tồn kho tại Quán 1 theo thứ tự FIFO.
       - **Idempotency Guard:** Gọi `complete-bom` lần thứ 2 trên cùng đơn $\rightarrow$ trả `already_deducted: true`, không trừ kho lần 2!
       - Chặn trừ kho khi thiếu nguyên liệu và `allow_partial_on_shortage: false` (`409 INSUFFICIENT_STORE_BOM_STOCK`), và cho phép vét cạn ghi nhận `shortage_qty` khi `allow_partial_on_shortage: true`.
     - Barista Low-Stock Alert (`POST /api/v1/kds/stores/:storeId/low-stock-alerts`).
     - Blind Shift Cash Close (`POST /api/v1/shifts-stocktakes/stores/:storeId/shifts/:shiftId/blind-close`):
       - Khi ca đang `OPEN`, `CASHIER_STAFF` đọc ca thấy `system_expected_cash_vnd: null`.
       - Sau khi tạo thêm đơn POS tiền mặt và gửi `blind_counted_cash_vnd`, hệ thống khóa ca `CLOSED`, trả về chính xác `system_expected_cash_vnd`, `variance_cash_vnd` và `variance_status` (`SHORTAGE` / `BALANCED` / `SURPLUS`), chặn đóng lại ca đã đóng (`409 SHIFT_ALREADY_CLOSED`).
     - End-of-Day Store Stocktake (`POST /api/v1/shifts-stocktakes/stores/:storeId/stocktakes`): tính chính xác `theoretical_closing_qty`, `variance_qty`, `variance_pct` và phát hiện `is_abnormal_shrinkage: true` khi hao hụt vượt ngưỡng 3%.
