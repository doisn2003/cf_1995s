# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M5.2 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M5.2)

- **Tiểu phân hệ:** `M5.2 - Backend EMVCo Dynamic VietQR Service, Idempotent Banking Webhook Consumer & Supertest Suite (@cf19/api)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Cấu Trúc 6 Files Chuyên Biệt Của Tiểu Phân Hệ M5.2 (`@cf19/api`)

Tiểu phân hệ **M5.2** xây dựng toàn bộ tầng Backend cho **Sinh mã VietQR Động EMVCo** và **Cổng Tiêu Thụ Webhook/IPN Ngân Hàng Bất Biến (`payment_webhook_logs`)** kèm kích hoạt **Loa Thông Báo Thanh Toán IoT/Web Audio**, sử dụng trực tiếp các hàm toán học trong `@cf19/shared` ở **M5.1**, đồng bộ 100% với `0006_m5_emvco_vietqr_and_webhook_rpcs.sql` và bảo toàn 100% **77/77 bài test hiện có của `@cf19/api`**:

### Nhóm A: Mở Rộng Seed Store (`paymentWebhookLogs`) & VietQR Service (Do `pawn-flash-1` thực thi — 3 files)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật):
   - Giữ nguyên 100% toàn bộ dữ liệu M1.2, M2.2, M3.2 & M4.2 để 77 bài test hiện có pass tuyệt đối.
   - Bổ sung `paymentWebhookLogs: PaymentWebhookLogDto[]` vào `InMemoryDatabaseState` (khởi tạo mảng rỗng `[]` hoặc 1 bản ghi mẫu không ảnh hưởng các đơn `PENDING` hiện có) và cấu hình tài khoản ngân hàng thụ hưởng mặc định theo từng Quán (`STORE_BANK_ACCOUNTS`: BIN `970436` Vietcombank / `970422` MB Bank, số tài khoản riêng cho từng quán, tên thụ hưởng `'CF19 TAY NGUYEN COFFEE'`).
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật):
   - Đảm bảo `resetInMemoryDb()` khôi phục đầy đủ `paymentWebhookLogs`.
3. `C:\bib\cf_19\apps\api\src\modules\pos\vietqr.service.ts` (Tạo mới):
   - Sử dụng trực tiếp `buildEmvCoDynamicVietQrPayload`, `verifyEmvCoPayloadCrc`, `extractVietQrRefFromTransferContent`, `buildVoiceAnnouncementScript` từ `@cf19/shared`.
   - Cung cấp các phương thức:
     1. `generateOrderVietQr(actor: AuthActor, input: GenerateOrderVietQrInput): Promise<EmvCoVietQrPayloadDTO>`:
        - Kiểm tra đơn hàng tồn tại và thuộc đúng `input.store_id`.
        - Nếu đơn hàng đã `VOIDED`, chặn `409 ORDER_ALREADY_VOIDED`.
        - Nếu đơn hàng chưa có `vietqr_ref_code`, tự động gán `VQR-${order.order_code.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`.
        - Sinh chuỗi EMVCo Dynamic VietQR chuẩn NAPAS247 có checksum CRC16-CCITT 4 ký tự Hex hợp lệ, ghi `audit_logs` (`VIETQR_PAYLOAD_GENERATED`).
     2. `processBankingWebhook(input: VietQrBankingWebhookPayloadInput): Promise<VietQrWebhookProcessResultDTO>`:
        - **Idempotency Guard:** Kiểm tra `idempotency_key` hoặc `bank_tx_id` trong `payment_webhook_logs`. Nếu đã tồn tại, trả về ngay `status: 'IDEMPOTENT_REPLAY'`, `already_processed: true`, `should_trigger_speaker: false` (không báo lỗi 500, không gạch nợ lần 2!).
        - **Order Resolution:** Tìm đơn theo `input.order_id`, hoặc `input.vietqr_ref_code`, hoặc gọi `extractVietQrRefFromTransferContent(input.transfer_content)` để đối chiếu với `pos_orders.vietqr_ref_code` / `pos_orders.order_code`. Nếu không tìm thấy đơn -> throw `404 ORDER_NOT_FOUND_FOR_WEBHOOK`.
        - **State & Amount Guards:**
          - Nếu `order.payment_status === 'VOIDED'` -> throw `409 ORDER_ALREADY_VOIDED`.
          - Nếu `order.payment_status === 'PAID'` -> throw `409 ORDER_ALREADY_PAID`.
          - Nếu `input.amount_vnd < order.total_amount_vnd` -> throw `409 WEBHOOK_AMOUNT_MISMATCH`.
        - **Atomic Reconciliation:**
          - Lưu bản ghi mới vào `payment_webhook_logs`.
          - Cập nhật `order.payment_status = 'PAID'`, `order.payment_method = 'VIETQR'`.
          - Sinh `speaker_announcement = buildVoiceAnnouncementScript(order.order_code, input.amount_vnd, store.name)`.
          - Ghi `audit_logs` (`VIETQR_WEBHOOK_RECONCILED`).
          - Trả về `VietQrWebhookProcessResultDTO` với `status: 'RECONCILED_PAID'`, `already_processed: false`, `should_trigger_speaker: true`.
     3. `simulateOrderWebhook(actor: AuthActor, input: SimulateVietQrWebhookInput): Promise<VietQrWebhookProcessResultDTO>`:
        - Cho phép Thu ngân/Quản lý tại quầy hoặc bộ kiểm thử kích hoạt giả lập gói tin IPN ngân hàng (hỗ trợ cả `simulate_duplicate: true` để kiểm chứng chống gạch nợ trùng ngay trên UI!).
     4. `listWebhookLogs(actor: AuthActor, query: WebhookLogQueryInput): Promise<PaymentWebhookLogDto[]>`:
        - Lọc lịch sử gói tin Webhook ngân hàng theo `store_id` và `order_id`.

### Nhóm B: VietQR & Webhook Express Routes, App Mount & Bộ Supertest 18 Kịch Bản (Do `pawn-flash-2` thực thi — 3 files)
4. `C:\bib\cf_19\apps\api\src\modules\pos\vietqr.routes.ts` (Tạo mới):
   - Endpoints:
     - `POST /stores/:storeId/orders/:orderId/generate` (`authenticate`, `requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF')`, `requireStoreScope()`, `sanitizeCostFields()`)
     - `POST /webhook/ipn` (Public/Signed Banking Webhook IPN listener — có kiểm tra optional header `x-webhook-secret` và `sanitizeCostFields()`)
     - `POST /stores/:storeId/orders/:orderId/simulate-webhook` (`authenticate`, `requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF')`, `requireStoreScope()`, `sanitizeCostFields()`)
     - `GET /stores/:storeId/webhook-logs` (`authenticate`, `requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF')`, `requireStoreScope()`, `sanitizeCostFields()`)
5. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật):
   - Mount `app.use('/api/v1/vietqr', vietqrRouter);`.
6. `C:\bib\cf_19\apps\api\src\__tests__\m5-vietqr-webhook.test.ts` (Tạo mới):
   - Bộ kiểm thử tích hợp tự động bằng **`vitest` + `supertest`** gồm tối thiểu **18 test cases** kiểm chứng:
     - RBAC & Multi-Tenant Isolation: Chặn `WAREHOUSE_MANAGER` và `BARISTA_KDS` gọi sinh mã VietQR (`403`); chặn Thu ngân Quán 1 sinh mã VietQR hoặc xem log Webhook của Quán 2 (`403 FORBIDDEN_CROSS_TENANT_ACCESS`).
     - Sinh mã EMVCo Dynamic VietQR (`POST /api/v1/vietqr/stores/:storeId/orders/:orderId/generate`): kiểm tra chuỗi EMVCo bắt đầu bằng `000201010212`, chứa đúng số tiền `total_amount_vnd`, chứa mã tham chiếu `vietqr_ref_code`, và vượt qua kiểm tra `verifyEmvCoPayloadCrc(payload) === true`.
     - Tiêu thụ Webhook ngân hàng (`POST /api/v1/vietqr/webhook/ipn`):
       - Tự động bóc tách mã `vietqr_ref_code` từ nội dung chuyển khoản hỗn hợp (`transfer_content`), chuyển đơn từ `PENDING` sang `PAID`, tạo bản ghi `payment_webhook_logs`, trả về `speaker_announcement` tiếng Việt và ghi `audit_logs`.
       - **Idempotency Replay:** Gửi lại đúng gói tin Webhook đó lần thứ 2 (cùng `idempotency_key` hoặc cùng `bank_tx_id`) $\rightarrow$ trả về `200` với `status: 'IDEMPOTENT_REPLAY'`, `already_processed: true`, `should_trigger_speaker: false`, không tạo bản ghi log thứ 2!
       - Chặn chuyển khoản thiếu tiền (`409 WEBHOOK_AMOUNT_MISMATCH` khi `amount_vnd < total_amount_vnd`).
       - Chặn gạch nợ cho đơn đã bị hủy (`409 ORDER_ALREADY_VOIDED`).
       - Trả `404 ORDER_NOT_FOUND_FOR_WEBHOOK` khi nội dung chuyển khoản không khớp bất kỳ đơn nào.
