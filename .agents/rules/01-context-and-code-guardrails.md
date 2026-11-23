---
trigger: always_on
description: Quy tắc chống quên ngữ cảnh, chuẩn code TypeScript/Supabase và giao thức bàn giao PROJECT_STATE.md
---

# QUY TẮC CHỐNG LẠC LỐI, CHỐNG QUÊN NGỮ CẢNH & CHUẨN CODE (CODE GUARDRAILS)

## 1. Quy Trình Bắt Buộc Khi Bắt Đầu & Kết Thúc Mỗi Tác Vụ (Context Continuity Protocol)
1. **Bước Khởi Động (Pre-Flight Check):**
   - Đọc `.agents/docs/PROJECT_STATE.md` để nắm chính xác phân hệ nào đã xong, phân hệ nào đang làm dở.
   - Đọc `.agents/docs/ARCHITECTURE_BLUEPRINT.md` để lấy đúng tên bảng, tên cột, kiểu dữ liệu và cấu trúc thư mục hiện hành.
   - Tuyệt đối không tạo bảng mới, trường mới hoặc thư mục mới trùng lặp với cấu trúc đã quy định.
2. **Bước Bàn Giao (Post-Task Handover):**
   - Kiểm tra biên dịch TypeScript (`tsc --noEmit`) và chạy test/linter trước khi báo cáo hoàn thành.
   - Cập nhật ngay tiến độ, danh sách file vừa tạo/sửa và các lưu ý kỹ thuật vào `.agents/docs/PROJECT_STATE.md`.

## 2. Quy Chuẩn Kỹ Thuật Fullstack (Node.js TypeScript + Supabase PostgreSQL + Webapp)
- **Strict TypeScript:** Bật `strict: true`. Cấm sử dụng `any` cho dữ liệu tiền tệ, khối lượng kho, công nợ và phân quyền (`role`, `store_id`).
- **Chuẩn Tiền Tệ & Khối Lượng:**
  - Tiền tệ (`VNĐ`): Lưu trữ dưới dạng số nguyên lớn (`BIGINT` hoặc `NUMERIC(15,0)`) để không bao giờ xảy ra lỗi làm tròn số thực dấu phẩy động.
  - Định lượng nguyên vật liệu (`BOM` & Tồn kho): Quy đổi về đơn vị cơ sở chuẩn (`gram` cho cà phê/bột, `ml` cho sữa/siro, `cái` cho ly/ống hút) lưu kiểu `NUMERIC(12,2)`.
- **Tính Toàn Vẹn Giao Dịch (Atomicity):**
  - Các nghiệp vụ: (1) Xuất chuyển kho nội bộ, (2) Hoàn thành đơn POS + Trừ kho theo BOM, (3) Gạch nợ Webhook VietQR, (4) Kết chuyển mẻ rang (Trừ nhân xanh -> Cộng hạt rang + Ghi nhận hao hụt) **BẮT BUỘC** thực thi trong PostgreSQL Transaction (`BEGIN ... COMMIT` hoặc Supabase RPC `SECURITY DEFINER` có kiểm tra quyền).
- **Bảo Mật Đa Chi Nhánh (Multi-Tenant Isolation):**
  - Mọi bảng dữ liệu cấp quán (`pos_orders`, `store_inventory`, `shifts`, `kds_tickets`, `staff_schedules`) đều bắt buộc có cột `store_id` và được kiểm soát cả ở tầng API Middleware lẫn Supabase Row Level Security (RLS).
  - Các API trả dữ liệu cho `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS` tuyệt đối không được phép trả về trường `raw_import_cost` (giá nhập gốc Tây Nguyên của Kho Tổng).
