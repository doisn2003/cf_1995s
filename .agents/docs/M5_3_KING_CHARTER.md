# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M5.3 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M5.3)

- **Tiểu phân hệ:** `M5.3 - Frontend POS Dynamic VietQR Payment Modal, Idempotent Webhook Simulator & Web Audio Voice Payment Announcer + Vitest Suite (@cf19/web)`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Kiến Trúc Tách File Modular Cho `@cf19/web` Ở Tiểu Phân Hệ M5.3 (6 Files)

Tiểu phân hệ **M5.3** tích hợp trọn vẹn trải nghiệm **Thanh toán Chuyển khoản VietQR Động EMVCo**, **Mô phỏng tín hiệu Ngân hàng IPN chống gạch nợ trùng**, và **Loa Thông Báo Thanh Toán Tự Động (Web Audio Chime + Vietnamese Speech Synthesis)** vào màn hình Thu ngân POS (`CashierPosLayout` / `PosTerminalWorkbench`) và màn hình Giám sát của Quản lý Quán (`StoreManagerLayout`):

### Nhóm A: Typed VietQR API Client, Web Audio Voice Announcer & Dynamic VietQR Payment Modal (Do `pawn-flash-1` thực thi — 3 files)
1. `C:\bib\cf_19\apps\web\src\api\vietqrApi.ts` (Tạo mới):
   - Typed HTTP Client gọi trực tiếp 4 endpoints của `@cf19/api`:
     - `POST /api/v1/vietqr/stores/:storeId/orders/:orderId/generate`
     - `POST /api/v1/vietqr/webhook/ipn`
     - `POST /api/v1/vietqr/stores/:storeId/orders/:orderId/simulate-webhook`
     - `GET /api/v1/vietqr/stores/:storeId/webhook-logs`
   - Có deterministic offline fallback engine sử dụng trực tiếp 6 hàm toán học `emvcoVietQrMath.ts` từ `@cf19/shared` (kèm `resetOfflineVietQrState()` và `registerOfflinePosOrderForVietQr(...)` để đồng bộ với đơn POS tạo trên UI hoặc trong Vitest!).
2. `C:\bib\cf_19\apps\web\src\utils\voiceSpeakerAnnouncer.ts` (Tạo mới):
   - Bộ phát âm thanh Loa Thu Ngân (`Web Audio API` + `window.speechSynthesis` an toàn trong cả môi trường Browser lẫn Node/Vitest headless):
     - `playPaymentSuccessChime(frequenciesHz: number[]): boolean`: Nếu có `window.AudioContext`, phát chuỗi 4 nốt chuông "Ting-ting!" (`523.25Hz -> 659.25Hz -> 783.99Hz -> 1046.5Hz`); trong môi trường headless/Vitest không có `window.AudioContext`, trả về `false` an toàn mà không throw lỗi.
     - `announceVietQrPaymentVoice(announcement: SpeakerAnnouncementPayloadDTO, options?: { muted?: boolean }): { announced: boolean; script: string; mode: 'WEB_SPEECH_API' | 'SIMULATED_CONSOLE' | 'MUTED' }`:
       - Lưu lịch sử các lần phát loa (`getSpeakerAnnouncementHistory()`, `clearSpeakerAnnouncementHistory()`) để Thu ngân nhìn thấy nhật ký loa phát trên màn hình và để Vitest kiểm chứng rằng gói tin Webhook lần 1 kích hoạt loa (`announced: true`) còn gói tin Webhook trùng lặp lần 2 (`IDEMPOTENT_REPLAY`) tuyệt đối KHÔNG phát loa lần 2!
3. `C:\bib\cf_19\apps\web\src\features\pos\PosDynamicVietQrModal.tsx` (Tạo mới):
   - Modal hiển thị Mã VietQR Động chuẩn EMVCo NAPAS247 cho khách hàng quét:
     - Hiển thị Tên Ngân hàng thụ hưởng (`Vietcombank` / `MB Bank`), Số tài khoản, Tên tài khoản (`CF19 TAY NGUYEN COFFEE`), Số tiền chính xác (`total_amount_vnd`), Nội dung chuyển khoản bắt buộc (`vietqr_ref_code`), chuỗi EMVCo Raw Payload và badge xác nhận **`CRC16-CCITT: <crc> (VERIFIED)`**.
     - Khung vẽ mã QR SVG/Grid trực quan sinh deterministic từ chuỗi EMVCo payload.
     - Khối **Giả Lập Tín Hiệu Ngân Hàng (Banking IPN Webhook Simulator)** ngay trên modal để kiểm thử trực tiếp:
       - Nút 1: **"Giả Lập Khách Quét QR Chuyển Khoản Thành Công (1–3s Webhook IPN)"** $\rightarrow$ gọi `simulateOrderWebhook(..., { simulate_duplicate: false })`, chuyển trạng thái đơn sang `PAID`, tự động kích hoạt **Loa Thông Báo (`announceVietQrPaymentVoice`)** và cập nhật danh sách đơn POS!
       - Nút 2: **"Bắn Lại Gói Tin Webhook Trùng (Test Chống Gạch Nợ Kép Idempotency)"** $\rightarrow$ gọi `simulateOrderWebhook(..., { simulate_duplicate: true })`, hiển thị rõ kết quả `IDEMPOTENT_REPLAY — Đã chặn gạch nợ trùng & không phát lại loa!`.

### Nhóm B: Nhật Ký Webhook/Loa Ngân Hàng, Tích Hợp POS Workbench & Bộ Vitest Tests (Do `pawn-flash-2` thực thi — 3 files)
4. `C:\bib\cf_19\apps\web\src\features\pos\VietQrWebhookMonitorPanel.tsx` (Tạo mới):
   - Bảng giám sát thời gian thực các gói tin Webhook/IPN ngân hàng (`PaymentWebhookLogDto[]`) và Nhật ký Loa Thông Báo Thanh Toán (`getSpeakerAnnouncementHistory()`), nút bật/tắt âm lượng loa thu ngân, và công cụ kiểm thử gửi gói tin IPN tùy chỉnh (test chuyển đúng tiền vs chuyển thiếu tiền `409 WEBHOOK_AMOUNT_MISMATCH`).
5. `C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx` (Cập nhật):
   - Khi Thu ngân tạo đơn POS với phương thức `VIETQR` (hoặc bấm nút **"Hiện Mã VietQR Động / Gạch Nợ IPN"** trên bất kỳ hóa đơn `VIETQR` nào trong danh sách đơn gần nhất), mở ngay `PosDynamicVietQrModal`!
   - Nhúng `<VietQrWebhookMonitorPanel storeId={storeId} />` bên dưới khu vực danh sách đơn của `PosTerminalWorkbench` để Thu ngân và Quản lý giám sát trực tiếp tín hiệu Webhook ngân hàng và Loa thông báo.
6. `C:\bib\cf_19\apps\web\src\__tests__\m5-vietqr-announcer-ui.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động chạy bằng **`vitest`** gồm tối thiểu **14 test cases** kiểm tra toàn diện `vietqrApi.ts` và `voiceSpeakerAnnouncer.ts` (sinh mã EMVCo VietQR khớp CRC16-CCITT cho đơn POS, xử lý Webhook IPN chuyển đơn từ `PENDING` sang `PAID` + kích hoạt Loa thông báo 1 lần duy nhất, chặn gói tin Webhook trùng `IDEMPOTENT_REPLAY` không phát loa lần 2, chặn chuyển khoản thiếu tiền `409 WEBHOOK_AMOUNT_MISMATCH`, bóc tách mã `vietqr_ref_code` từ nội dung chuyển khoản tự do, và chế độ tắt tiếng `muted`), đồng thời bảo toàn 100% **56/56 bài test hiện có của `@cf19/web`**!
