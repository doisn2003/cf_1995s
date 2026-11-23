# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M2.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M2.2)

- **Tiểu phân hệ:** `M2.2 - Backend WMS Repository/Service, MAC Costing, Roastery Batch Lifecycle, Multi-Lot FIFO Engine & Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M2.2 (`@cf19/api`)

Tiểu phân hệ **M2.2** xây dựng toàn bộ tầng Backend cho Kho Tổng Tây Nguyên, sử dụng trực tiếp các hàm toán học thuần túy và schemas vừa định nghĩa trong `@cf19/shared` ở **M2.1**, đồng bộ 100% với 3 hàm PL/pgSQL RPCs trong `0003_m2_wms_roastery_fifo_rpcs.sql`:

### Nhóm A: Mở Rộng In-Memory Seed Store, Domain Error Mapper & Warehouse Service (Do `pawn-flash-1` thực thi — 4 files)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật):
   - Giữ nguyên 100% toàn bộ dữ liệu M1.2 để **18 bài test của M1.2 không bị ảnh hưởng bất kỳ dòng nào**.
   - Bổ sung thêm 1 lô nhân xanh thứ 2 tại Kho Tổng (`cwGreenRobusta02` hoặc thêm vào `INITIAL_LOTS` với ngày nhập mới hơn lô `cwGreenRobusta01` của mặt hàng `greenRobustaDakLak`) và xuất `INITIAL_ROAST_BATCHES: RoastBatchDTO[]` (gồm mẻ rang mẫu `batchRobusta001`) để kiểm thử khóa FIFO giữa 2 lô nhân xanh cùng `item_id`!
   - *(Lưu ý quan trọng: Kiểm tra xem trong `m1-rbac-security.test.ts` có assert cứng số lượng phần tử của `INITIAL_LOTS` hay không; nếu có thì tạo lô nhân xanh thứ 2 ngay trong test hoặc giữ `INITIAL_LOTS` tương thích 100% với `m1-rbac-security.test.ts`!)*.
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật):
   - Bổ sung bảng `roastBatches: RoastBatchDTO[]` vào `inMemoryDb` và khôi phục trong `resetInMemoryDb()`.
3. `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.errors.ts` (Tạo mới):
   - `WarehouseDomainError(statusCode: number, code: string, message: string)`
   - `mapWarehouseRpcError(message: string): WarehouseDomainError` ánh xạ chính xác các lỗi:
     - `FIFO_VIOLATION_OLDER_LOT_EXISTS` -> `409`
     - `INSUFFICIENT_FIFO_STOCK` -> `409`
     - `INSUFFICIENT_GREEN_BEAN_STOCK` -> `409`
     - `DUPLICATE_LOT_CODE` / `DUPLICATE_BATCH_CODE` / `unique constraint` -> `409`
     - `FORBIDDEN_ROLE` -> `403`
     - `NOT_FOUND` -> `404`
     - `INVALID_` -> `400`
4. `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.service.ts` (Tạo mới):
   - Sử dụng trực tiếp 6 hàm toán học từ `@cf19/shared` (`calculateEffectiveLotUnitCostVnd`, `calculateMovingAverageCostVnd`, `calculateRoastYieldLossPct`, `isAbnormalRoastYieldLoss`, `calculateRoastedOutputUnitCostVnd`, `compareFifoLots`).
   - Cung cấp 6 phương thức chuẩn:
     1. `getOverview(warehouseStoreId?: string): Promise<WarehouseOverviewDTO>`
     2. `listLots(query: WarehouseLotQueryDTO): Promise<WarehouseLotDTO[]>`
     3. `listRoastBatches(warehouseStoreId?: string): Promise<RoastBatchDTO[]>`
     4. `ingestLot(actor: AuthActor, input: IngestWarehouseLotDTO): Promise<WarehouseLotIngestResultDTO>`
     5. `completeRoastBatch(actor: AuthActor, input: CompleteRoastBatchDTO): Promise<CompleteRoastBatchResultDTO>`
     6. `allocateFifoStock(actor: AuthActor, input: FifoAllocationRequestDTO & { dry_run?: boolean }): Promise<FifoAllocationResultDTO>`
   - Mọi thao tác ghi (`ingestLot`, `completeRoastBatch`, `allocateFifoStock` khi `dry_run !== true`) đều tự động ghi nhật ký bất biến vào `audit_logs` qua `recordAuditLog`.

### Nhóm B: Warehouse Express Routes, App Mount & Bộ Supertest 18 Kịch Bản (Do `pawn-flash-2` thực thi — 3 files)
5. `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.routes.ts` (Tạo mới):
   - Bảo vệ toàn bộ router bằng `authenticate`, `requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER')`, `sanitizeCostFields()`.
   - Endpoints:
     - `GET /overview`
     - `GET /lots`
     - `POST /lots/ingest`
     - `GET /roast-batches`
     - `POST /roast-batches`
     - `POST /fifo/allocate` (hỗ trợ cả `dry_run: true` và `dry_run: false`)
6. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật):
   - Mount `app.use('/api/v1/warehouse', warehouseRouter);`
7. `C:\bib\cf_19\apps\api\src\__tests__\m2-wms-roastery-fifo.test.ts` (Tạo mới):
   - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **18 test cases** kiểm chứng:
     - Chặn `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS` truy cập `/api/v1/warehouse/*` (`403 FORBIDDEN_ROLE`).
     - `GET /api/v1/warehouse/overview` trả đầy đủ tồn kho, giá trị kho, danh sách lô sắp xếp FIFO và lịch sử mẻ rang.
     - `POST /api/v1/warehouse/lots/ingest`: phân bổ chính xác cước vận chuyển vào `effective_unit_cost_vnd`, cập nhật `moving_avg_cost_vnd` (MAC) trên mặt hàng và ghi `audit_logs`.
     - Chặn trùng `lot_code` (`409`).
     - `POST /api/v1/warehouse/roast-batches`: chặn rang lô nhân xanh mới khi lô nhân xanh cũ còn tồn (`409 FIFO_VIOLATION_OLDER_LOT_EXISTS`), cho phép vượt khóa khi `enforce_fifo: false`, tính đúng `weight_loss_pct`, gắn cờ `is_abnormal_yield_loss` khi `< 12%` hoặc `> 20%`, kết chuyển đúng `output_unit_cost_vnd`, chuyển lô nhân xanh về `DEPLETED` khi hết tồn, cập nhật MAC cà phê rang và ghi `audit_logs`.
     - `POST /api/v1/warehouse/fifo/allocate`: chế độ `dry_run: true` tính đúng các lát cắt đa lô mà không trừ kho; chế độ `dry_run: false` vét cạn lô cũ thứ 1 (`DEPLETED`) rồi cắt tiếp lô thứ 2, tính đúng `total_cogs_vnd` & `weighted_unit_cost_vnd`; và chặn `409 INSUFFICIENT_FIFO_STOCK` khi vượt tổng tồn khả dụng.
