# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M3.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M3.2)

- **Tiểu phân hệ:** `M3.2 - Backend B2B Tiered-Pricing, AR Credit Ledger & 2-Phase Internal Transfer Service + Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc 8 Files Chuyên Biệt Của Tiểu Phân Hệ M3.2 (`@cf19/api`)

Tiểu phân hệ **M3.2** xây dựng toàn bộ tầng Backend cho **Bán sỉ B2B Thị trấn (`modules/b2b/*`)** và **Chuyển kho Nội bộ 2 Pha (`modules/transfers/*`)**, sử dụng trực tiếp các hàm toán học thuần túy vừa định nghĩa trong `@cf19/shared` ở **M3.1**, đồng bộ 100% với 5 hàm PL/pgSQL RPCs trong `0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql` và giữ nguyên 100% tương thích ngược với **37/37 bài test của M1.2 + M2.2**:

### Nhóm A: Mở Rộng Seed Store, B2B Service & B2B Routes (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật):
   - Giữ nguyên 100% toàn bộ dữ liệu M1.2 & M2.2 để 37 bài test hiện có pass tuyệt đối.
   - Bổ sung vào `InMemoryDatabaseState` và `createInitialSeedState()` các bảng của M3 khớp 100% với `supabase/seed.sql` và `SEED_IDS`:
     - `b2bCustomers: B2bCustomerDto[]` (2 khách sỉ `phoNuiCoffee` hạng `TIER_2`, `credit_limit_vnd: 50_000_000`, `current_debt_vnd: 12_500_000` và `hoaDoBakery` hạng `TIER_1`, `credit_limit_vnd: 20_000_000`, `current_debt_vnd: 0`).
     - `b2bPriceTiers: B2bPriceTierDto[]` (4 bậc giá sỉ cho `roastedRobustaMed` và `roastedSignatureBlend`).
     - `b2bOrders: B2bOrderDto[]` (1 đơn mẫu đang nợ gối đầu `PENDING` của `phoNuiCoffee` với `total_amount_vnd: 18_500_000`, `paid_amount_vnd: 6_000_000` để test thu nợ FIFO!).
     - `b2bOrderItems: B2bOrderItemDto[]`
     - `b2bDebtLedger: B2bDebtLedgerEntryDto[]`
     - `internalTransfers: InternalTransferDto[]` (1 phiếu chuyển kho mẫu `store01InitialRequest` trạng thái `REQUESTED` từ `centralWarehouse` về `store01`).
     - `internalTransferItems: InternalTransferItemDto[]`
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật):
   - Đảm bảo `resetInMemoryDb()` khôi phục đầy đủ cả 7 bảng mới của M3.
3. `C:\bib\cf_19\apps\api\src\modules\b2b\b2b.service.ts` (Tạo mới):
   - Sử dụng trực tiếp `convertToKgForTierPricing`, `resolveB2bTieredUnitPriceVnd`, `calculateB2bCreditCheck`, `settleFifoPendingInvoices`, `classifyArAgingBucket` và `compareFifoLots` từ `@cf19/shared`.
   - Cung cấp các phương thức:
     1. `getOverview()` (danh sách khách sỉ kèm phân tích tuổi nợ AR Aging, bảng giá bậc thang, danh sách đơn B2B, sổ cái công nợ).
     2. `quoteTieredPrice(query: B2bPriceQuoteQueryDTO)` (tra giá sỉ bậc thang tức thời theo khách & sản lượng).
     3. `createB2bOrder(actor: AuthActor, input: CreateB2bOrderDTO)` (kiểm tra `409 CREDIT_LIMIT_EXCEEDED`, trừ tồn Kho Tổng theo Multi-Lot FIFO, tạo dòng `b2b_order_items` theo từng lát cắt lô FIFO, ghi `b2b_debt_ledger` bút toán kép `DEBIT_INVOICE` + `CREDIT_PAYMENT`, cập nhật `current_debt_vnd`, ghi `audit_logs`).
     4. `recordDebtPayment(actor: AuthActor, input: RecordB2bDebtPaymentDTO)` (kiểm tra `409 PAYMENT_EXCEEDS_CURRENT_DEBT`, gạch nợ tự động các đơn `PENDING` theo thứ tự đơn cũ trước — FIFO Debt Settlement, ghi `b2b_debt_ledger`, giảm `current_debt_vnd`, ghi `audit_logs`).
4. `C:\bib\cf_19\apps\api\src\modules\b2b\b2b.routes.ts` (Tạo mới):
   - Bảo vệ toàn bộ router bằng `authenticate`, `requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER')`, `sanitizeCostFields()`.
   - Endpoints:
     - `GET /overview`
     - `GET /customers`
     - `GET /price-quote`
     - `POST /orders`
     - `POST /debt-payments`

### Nhóm B: 2-Phase Internal Transfer Service/Routes, App Mount & Bộ Supertest 20 Kịch Bản (Do `pawn-flash-2` thực thi — 4 files)
5. `C:\bib\cf_19\apps\api\src\modules\transfers\transfers.service.ts` (Tạo mới):
   - Cung cấp các phương thức thực thi luồng Chuyển kho Nội bộ 2 Pha (`REQUESTED` → `IN_TRANSIT` → `RECONCILED`):
     1. `listTransfers(actor: AuthActor, query: TransferFilterQueryDTO)` (Nếu là `STORE_MANAGER`, chỉ trả các phiếu có `to_store_id === actor.assignedStoreId`; nếu `SUPER_ADMIN` hoặc `WAREHOUSE_MANAGER`, trả toàn bộ hoặc lọc theo `query.store_id` & `query.status`).
     2. `requestTransfer(actor: AuthActor, input: CreateInternalTransferRequestDto)` (Pha 0 `REQUESTED`: chỉ `SUPER_ADMIN` hoặc `STORE_MANAGER` của đúng `to_store_id` mới được tạo; cố tình tạo cho quán khác bị chặn `403 FORBIDDEN_CROSS_TENANT_ACCESS`; hạch toán theo `internal_transfer_price_vnd`, ghi `audit_logs`).
     3. `dispatchTransferFifo(actor: AuthActor, input: DispatchInternalTransferFifoDTO)` (Pha 1 `REQUESTED` → `IN_TRANSIT`: chỉ `SUPER_ADMIN` hoặc `WAREHOUSE_MANAGER`; phiếu phải ở trạng thái `REQUESTED`, sai báo `409 INVALID_TRANSFER_STATE`; tự động khóa và trừ tồn Kho Tổng theo **Multi-Lot FIFO**, gắn `lot_id` và `dispatched_qty`, chuyển phiếu sang `IN_TRANSIT`, ghi `audit_logs`).
     4. `reconcileTransfer(actor: AuthActor, input: ReconcileInternalTransferDto)` (Pha 2 `IN_TRANSIT` → `RECONCILED`: chỉ `SUPER_ADMIN` hoặc `STORE_MANAGER` của đúng `to_store_id`; cố tình lấy `STORE_MANAGER` Quán 2 duyệt nhận phiếu của Quán 1 bị chặn `403 FORBIDDEN_CROSS_TENANT_ACCESS`; phiếu phải đang `IN_TRANSIT`; kiểm tra `received_qty <= dispatched_qty`; tạo lô tồn kho mới tại kho Quán với **`unit_cost_vnd = internal_unit_price_vnd`** ẩn tuyệt đối giá vốn Tây Nguyên, chuyển phiếu sang `RECONCILED`, ghi `audit_logs`).
6. `C:\bib\cf_19\apps\api\src\modules\transfers\transfers.routes.ts` (Tạo mới):
   - Bảo vệ bởi `authenticate`, `sanitizeCostFields()`.
   - Endpoints:
     - `GET /` (`requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'STORE_MANAGER')`)
     - `POST /request` (`requireRoles('SUPER_ADMIN', 'STORE_MANAGER')`)
     - `POST /:transferId/dispatch` (`requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER')`)
     - `POST /:transferId/reconcile` (`requireRoles('SUPER_ADMIN', 'STORE_MANAGER')`)
7. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật):
   - Mount `app.use('/api/v1/b2b', b2bRouter);` và `app.use('/api/v1/transfers', transfersRouter);`.
8. `C:\bib\cf_19\apps\api\src\__tests__\m3-b2b-transfers.test.ts` (Tạo mới):
   - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **20 test cases** kiểm chứng toàn diện:
     - RBAC: Chặn `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS` truy cập `/api/v1/b2b/*` (`403`).
     - Tra giá sỉ bậc thang (`/api/v1/b2b/price-quote`) theo hạng khách & bậc khối lượng (`<10kg`, `10–50kg`, `>50kg`).
     - Tạo đơn B2B thành công: tự động trừ lô Kho Tổng theo Multi-Lot FIFO, ghi `b2b_debt_ledger` (`DEBIT_INVOICE` + `CREDIT_PAYMENT`), tăng `current_debt_vnd` và ghi `audit_logs`.
     - Chặn tạo đơn B2B vượt hạn mức công nợ (`409 CREDIT_LIMIT_EXCEEDED`).
     - Thu nợ gối đầu (`/api/v1/b2b/debt-payments`): tự động gạch nợ đơn cũ trước (FIFO Debt Settlement), chuyển đơn sang `PAID` khi trả đủ, và chặn trả lố dư nợ (`409 PAYMENT_EXCEEDS_CURRENT_DEBT`).
     - Chuyển kho nội bộ 2 pha:
       - Pha 0 (`POST /api/v1/transfers/request`): Quản lý Quán 1 tạo phiếu xin cấp hàng thành công (`REQUESTED`), nhưng nếu cố tạo phiếu cho Quán 2 thì bị chặn `403 FORBIDDEN_CROSS_TENANT_ACCESS`.
       - Pha 1 (`POST /api/v1/transfers/:id/dispatch`): Quản lý Kho Tổng duyệt xuất phiếu `REQUESTED` $\rightarrow$ tự động trừ lô Kho Tổng theo FIFO, chuyển sang `IN_TRANSIT` (Quản lý Quán không có quyền tự dispatch `403`).
       - Pha 2 (`POST /api/v1/transfers/:id/reconcile`): Quản lý Quán 2 cố nhận hàng của Quán 1 bị chặn `403`; Quản lý Quán 1 xác nhận thực nhận $\rightarrow$ chuyển sang `RECONCILED`, sinh lô tồn kho mới tại Quán 1 với giá hạch toán nội bộ (`internal_transfer_price_vnd`) và khi Quản lý Quán 1 đọc API thì hoàn toàn không thấy `moving_avg_cost_vnd` hay `unit_cost_vnd` của Kho Tổng!
