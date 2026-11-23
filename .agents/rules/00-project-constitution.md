---
trigger: always_on
description: Hiến pháp dự án Quản trị Kho Cung Ứng & Chuỗi 4 Quán Cà Phê và Kỷ luật điều phối Vua - Hậu - Tốt
---

# HIẾN PHÁP DỰ ÁN & KỶ LUẬT ĐIỀU PHỐI MULTI-AGENTS (ALWAYS-ON RULE)

Mọi AI Agent hoạt động trong workspace `C:\bib\cf_19` BẮT BUỘC tuân thủ tuyệt đối các nguyên tắc sống còn sau đây:

## 1. Nguồn Sự Thật Duy Nhất (Single Source of Truth)
Trước khi thiết kế, lập kế hoạch hoặc viết bất kỳ dòng code nào, Agent phải đối chiếu với 3 tài liệu gốc tại `.agents/docs/`:
1. **[SRS_BUSINESS_SPEC.md](../docs/SRS_BUSINESS_SPEC.md):** Đặc tả toàn diện bài toán kinh doanh Chuỗi Cung Ứng Kho Tổng Tây Nguyên (B2B/B2C/Nội bộ) & Vận hành Chuỗi 4 Quán Cà Phê.
2. **[ARCHITECTURE_BLUEPRINT.md](../docs/ARCHITECTURE_BLUEPRINT.md):** Kiến trúc kỹ thuật chuẩn (Node.js + TypeScript, PostgreSQL on Supabase, Frontend Webapp), chuẩn Database Schema 3NF, phân quyền RBAC 5 Role và cấu trúc API.
3. **[PROJECT_STATE.md](../docs/PROJECT_STATE.md):** Trạng thái tiến độ hiện tại của dự án. **Đọc file này đầu tiên khi bắt đầu phiên làm việc và cập nhật ngay sau khi hoàn tất mỗi hạng mục.**

## 2. Năm Quy Tắc Nghiệp Vụ Bất Di Bất Dịch (Domain Invariants)
1. **Tách bạch tuyệt đối Kho Tổng và 4 Quán:** Hàng xuất từ Kho Tổng về 4 quán nhà bắt buộc đi qua luồng **Chuyển kho nội bộ 2 pha (`IN_TRANSIT` → `RECONCILED`)** theo giá vốn/giá hạch toán nội bộ; tuyệt đối KHÔNG gộp chung với đơn bán sỉ B2B hoặc bán lẻ B2C ra thị trấn.
2. **Bảo mật phân quyền 5 Role (RBAC & Supabase RLS):**
   - Chủ chuỗi (`SUPER_ADMIN`): Toàn quyền xem lãi lỗ (P&L) hợp nhất và từng điểm.
   - Quản lý Kho Tổng (`WAREHOUSE_MANAGER`): Quản lý nhập Tây Nguyên, mẻ rang, bán sỉ/công nợ B2B, xuất nội bộ; không xem doanh thu bán nước của 4 quán.
   - Quản lý Quán (`STORE_MANAGER` - 4 người): Chỉ truy cập đúng `store_id` được giao; tuyệt đối không thấy dữ liệu 3 quán còn lại và không thấy giá nhập gốc Tây Nguyên.
   - Thu ngân/Phục vụ (`CASHIER_STAFF`): Tạo đơn POS, sinh mã VietQR động, đóng ca mù; muốn hủy hóa đơn đã in bắt buộc phải có mã PIN/xác nhận của Quản lý quán và ghi `audit_logs`.
   - Pha chế (`BARISTA_KDS`): Chỉ thao tác màn hình KDS và báo hết nguyên liệu tại quầy; không xem doanh thu và tiền mặt.
3. **Truy xuất Lô rang (FIFO) & Hao hụt:** Mọi lô cà phê nhập và rang phải có `lot_code`, `roast_date`, tỷ lệ hao hụt sau rang và khóa xuất kho theo nguyên tắc lô rang cũ xuất trước (FIFO).
4. **Thanh toán VietQR Động & Tự động trừ kho theo Công thức (BOM):** Mỗi hóa đơn POS sinh 1 mã VietQR EMVCo chứa đúng số tiền và mã đơn; khi Webhook xác nhận tiền vào hoặc pha chế hoàn tất món trên KDS, hệ thống tự động trừ nguyên vật liệu tại kho quán theo định mức `BOM` trong cùng 1 Database Transaction (Atomic).
5. **Đóng ca đếm tiền mù (Blind Shift Close):** Thu ngân bắt buộc nhập số tiền mặt thực đếm trước khi hệ thống hiển thị số tiền lý thuyết để chống gian lận tự bù trừ.

## 3. Kỷ Luật Tự Động Điều Phối "Bàn Cờ Vua" (Vua - Hậu - Tốt)
Khi người dùng kích hoạt `/multi-agents` (hoặc yêu cầu triển khai tính năng), hệ thống tự động phân tầng công việc để **bảo vệ chất lượng kiến trúc và tiết kiệm tối đa Quota**:
- **Quân Vua (`Gemini 4 Argon High` – Chief Architect / Tech Lead):** Chịu trách nhiệm suy luận, ra quyết định kiến trúc, giải quyết bài toán nghiệp vụ phức tạp, điều phối tổng thể và nghiệm thu cuối cùng.
- **Quân Hậu (`Gemini 4 Neon High` – PM / Senior Principal Dev):** Thực hiện các tác vụ kỹ thuật khó nhất: Thiết kế chi tiết Database Schema (Supabase SQL/RLS), định nghĩa API Contract (TypeScript Interface/Zod), thiết kế cấu trúc UI/State, viết Test Cases và **biên soạn "Phiếu giao việc cấm suy luận (Zero-Reasoning Pawn Spec)"**.
- **Quân Tốt (`Gemini 3.8 Flash High` – Code Worker):**
  - **CHỈ ĐƯỢC DÙNG CHO CÁC TÁC VỤ VIẾT CODE CƠ BẢN NHẤT** đã có sẵn bản đặc tả chi tiết từ Quân Vua hoặc Quân Hậu.
  - **CẤM TUYỆT ĐỐI** giao việc mở hoặc yêu cầu Flash tự suy luận kiến trúc, tự thiết kế schema, hay tự suy đoán nghiệp vụ.
