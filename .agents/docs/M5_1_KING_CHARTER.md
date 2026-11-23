# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M5.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M5.1)

- **Tiểu phân hệ:** `M5.1 - SQL Atomic RPCs (0006_m5_emvco_vietqr_and_webhook_rpcs.sql), EMVCo CRC16-CCITT Dynamic VietQR Payload Engine & @cf19/shared M5 Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Năm Quy Tắc Toán Học & Giao Thức EMVCo VietQR Của Phân Hệ M5

Toàn bộ các quy tắc dưới đây phải được cài đặt chuẩn xác 100% trong cả PL/pgSQL (`0006_m5_emvco_vietqr_and_webhook_rpcs.sql`) và TypeScript (`packages/shared/src/utils/emvcoVietQrMath.ts`):

1. **Thuật Toán Tính Checksum `CRC16-CCITT (0xFFFF)` Theo Chuẩn EMVCo (`computeEmvCoCrc16Hex`):**
   - Đa thức sinh (Polynomial): `0x1021`
   - Giá trị khởi tạo (Initial Value): `0xFFFF`
   - Không đảo bit đầu vào/đầu ra, `xorOut = 0x0000`.
   - Duyệt từng byte ASCII của chuỗi payload (đã nối sẵn `'6304'` ở cuối):
     - `crc ^= (byte << 8)`
     - Lặp 8 bit: nếu `(crc & 0x8000) !== 0` thì `crc = ((crc << 1) ^ 0x1021) & 0xFFFF`, ngược lại `crc = (crc << 1) & 0xFFFF`.
   - Trả về chuỗi 4 ký tự Hex in hoa (`crc.toString(16).toUpperCase().padStart(4, '0')`).
2. **Trình Đóng Gói TLV (`Tag-Length-Value`) & Sinh Chuỗi EMVCo Dynamic VietQR NAPAS247 (`buildEmvCoDynamicVietQrPayload`):**
   - Hàm `formatEmvTlv(tag: string, value: string): string`: trả về `${tag}${value.length.toString().padStart(2, '0')}${value}`.
   - Cấu trúc cây TLV chuẩn NAPAS247 Dynamic QR:
     - Tag `00`: `'01'` (Payload Format Indicator)
     - Tag `01`: `'12'` (Point of Initiation Method — `12` = Dynamic QR riêng cho từng hóa đơn)
     - Tag `38` (Merchant Account Information — NAPAS247):
       - Sub-tag `00`: `'A000000727'` (NAPAS GUID)
       - Sub-tag `01`: `formatEmvTlv('00', bankBin) + formatEmvTlv('01', accountNumber)`
       - Sub-tag `02`: `'QRIBFTTA'` (Service Code chuyển nhanh 24/7 đến tài khoản)
     - Tag `52`: `'5814'` (MCC — Quán cà phê / Fast Food)
     - Tag `53`: `'704'` (Mã tiền tệ ISO 4217 cho VNĐ)
     - Tag `54`: `String(amountVnd)` (Số tiền nguyên VNĐ `> 0`)
     - Tag `58`: `'VN'` (Country Code)
     - Tag `59`: Tên đơn vị thụ hưởng chuẩn hóa ASCII in hoa không dấu, cắt tối đa 25 ký tự (mặc định `'CF19 TAY NGUYEN COFFEE'`)
     - Tag `60`: Thành phố chuẩn hóa ASCII in hoa không dấu, cắt tối đa 15 ký tự (mặc định `'BUON MA THUOT'`)
     - Tag `62` (Additional Data Field Template):
       - Sub-tag `01`: `orderCode` (Bill Number)
       - Sub-tag `08`: `vietqrRefCode` (Purpose / Reference Code)
     - Tag `63`: `'6304' + computeEmvCoCrc16Hex(payloadWithoutCrc + '6304')`.
   - Hàm kiểm chứng ngược `verifyEmvCoPayloadCrc(payload: string): boolean`: kiểm tra chuỗi có chứa `'6304'` ở vị trí `payload.length - 8` và 4 ký tự cuối khớp tuyệt đối với `computeEmvCoCrc16Hex(payload.slice(0, -4))`.
3. **Trình Trích Xuất Mã Tham Chiếu `vietqr_ref_code` Từ Nội Dung Giao Dịch Ngân Hàng (`extractVietQrRefFromTransferContent`):**
   - Quét chuỗi nội dung chuyển khoản hỗn hợp của các ngân hàng Việt Nam (ví dụ `"MBVCB.998123.VQR-POS-20261122-001 chuyen khoan"`, `"IBFT VQR_S01_0001GD"`, `"TT don hang VQR-1002"`) để trích xuất chính xác mã `VQR-[A-Z0-9_-]+` (chuẩn hóa chữ hoa).
4. **Cơ Chế Gạch Nợ Webhook/IPN Ngân Hàng Bất Biến (`Idempotent Webhook Consumer` — `payment_webhook_logs`):**
   - Mỗi sự kiện Webhook ngân hàng gửi vào có `idempotency_key` và `bank_tx_id`.
   - Nếu `idempotency_key` hoặc `bank_tx_id` đã tồn tại trong `payment_webhook_logs`: trả về kết quả `status: 'IDEMPOTENT_REPLAY'` (`already_processed: true`), không thực hiện gạch nợ lần 2 và không phát lại âm thanh loa thông báo (`should_trigger_speaker: false`).
   - Nếu đơn hàng ở trạng thái `VOIDED`: từ chối `409 ORDER_ALREADY_VOIDED`.
   - Nếu số tiền chuyển khoản `amount_vnd < order.total_amount_vnd`: từ chối `409 WEBHOOK_AMOUNT_MISMATCH`.
   - Nếu hợp lệ: ghi `payment_webhook_logs`, cập nhật `pos_orders.payment_status = 'PAID'`, `payment_method = 'VIETQR'`, trả về `status: 'RECONCILED_PAID'`, `should_trigger_speaker: true` và câu thông báo tiếng Việt chuẩn cho Loa IoT / Web Audio API!
5. **Trình Tạo Kịch Bản Phát Loa Thông Báo Thanh Toán (`buildVoiceAnnouncementScript`):**
   - Sinh câu thông báo rõ ràng bằng tiếng Việt cho Loa thu ngân & quầy Bar:
     `"Ting ting! Đã nhận chuyển khoản <số tiền định dạng chấm phân cách> đồng cho đơn hàng <order_code>."` kèm chuỗi nốt nhạc chuông báo (`chimeFrequenciesHz: [523.25, 659.25, 783.99, 1046.5]`).

---

## 2. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M5.1

### Nhóm A: Tầng SQL Atomic RPCs (Do Quân Hậu `queen-neon` trực tiếp thiết kế & ghi file)
1. `C:\bib\cf_19\supabase\migrations\0006_m5_emvco_vietqr_and_webhook_rpcs.sql`:
   - Hàm PL/pgSQL `public.fn_m5_crc16_ccitt_hex(p_input TEXT)` và `public.fn_m5_build_emvco_vietqr_payload(...)`.
   - `public.rpc_m5_generate_order_vietqr(p_store_id UUID, p_order_id UUID, p_bank_bin TEXT, p_account_no TEXT, p_account_name TEXT, p_actor_id UUID)`
   - `public.rpc_m5_process_vietqr_webhook(p_idempotency_key TEXT, p_bank_tx_id TEXT, p_amount_vnd BIGINT, p_transfer_content TEXT, p_order_id UUID, p_vietqr_ref_code TEXT, p_raw_payload JSONB)` (gạch nợ nguyên tử, idempotent trên `payment_webhook_logs`, kiểm tra `VOIDED` / `WEBHOOK_AMOUNT_MISMATCH`, cập nhật `pos_orders.payment_status = 'PAID'`, ghi `audit_logs`).

### Nhóm B: Hợp Đồng `@cf19/shared` M5 Schemas, Types & Barrel Exports (Do `pawn-flash-1` thực thi — 4 files)
2. `C:\bib\cf_19\packages\shared\src\schemas\vietqr.schema.ts` (Tạo mới):
   - `GenerateOrderVietQrSchema`, `VietQrBankingWebhookPayloadSchema`, `SimulateVietQrWebhookSchema`, `WebhookLogQuerySchema`.
3. `C:\bib\cf_19\packages\shared\src\types\vietqr.types.ts` (Tạo mới):
   - Toàn bộ DTOs cho cấu hình tài khoản ngân hàng thụ hưởng, `EmvCoVietQrPayloadDTO`, `PaymentWebhookLogDto`, `VietQrWebhookProcessResultDTO`, `SpeakerAnnouncementPayloadDTO`.
4. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Re-export `./vietqr.schema.js`).
5. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Re-export `./types/vietqr.types.js` và `./utils/emvcoVietQrMath.js`).

### Nhóm C: Pure EMVCo CRC16-CCITT & Webhook Math Engine + Bộ Vitest Unit Tests (Do `pawn-flash-2` thực thi — 2 files)
6. `C:\bib\cf_19\packages\shared\src\utils\emvcoVietQrMath.ts` (Tạo mới):
   - 6 hàm thuần túy: `formatEmvTlv`, `computeEmvCoCrc16Hex`, `buildEmvCoDynamicVietQrPayload`, `verifyEmvCoPayloadCrc`, `extractVietQrRefFromTransferContent`, `buildVoiceAnnouncementScript`.
7. `C:\bib\cf_19\packages\shared\src\__tests__\vietqr-webhook-m5.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động Vitest gồm tối thiểu **20 test cases** kiểm tra toàn diện vector chuẩn CRC16-CCITT (`"123456789"` -> `"29B1"`), cấu trúc TLV EMVCo NAPAS247, phát hiện giả mạo số tiền trong QR qua `verifyEmvCoPayloadCrc`, bóc tách mã `vietqr_ref_code` từ nội dung chuyển khoản hỗn hợp, kịch bản phát loa tiếng Việt và các Zod schemas của M5.
