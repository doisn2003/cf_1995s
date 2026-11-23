---
name: multi-agents
description: >-
  Hệ thống điều phối Đa Tác Tử tự động theo chiến thuật Bàn Cờ Vua: Quân Vua (Gemini 4 Argon High - Tổng chỉ huy/Kiến trúc sư),
  Quân Hậu (Gemini 4 Neon High - PM/Senior Dev thiết kế DB Schema, API, UI, Test Cases) và Quân Tốt (Gemini 3.8 Flash High -
  Code Worker thuần túy, cấm suy luận để tiết kiệm Quota). Kích hoạt khi người dùng gõ /multi-agents hoặc yêu cầu phát triển
  các phân hệ của hệ thống Quản trị Kho Cung Ứng & Chuỗi 4 Quán Cà Phê.
---

# Hệ Thống Điều Phối Tự Động `/multi-agents` (Chiến Thuật Vua – Hậu – Tốt)

Skill này biến quy trình phát triển Fullstack thành một dây chuyền tự động phân tầng Model dựa trên độ khó của công việc, giúp **không một Agent nào bị lạc lối** và **tiết kiệm tối đa Quota cho Argon & Neon**.

---

## 1. Tam Giác Quyền Lực & Phân Vai Tự Động

Khi `/multi-agents` được gọi, Agent điều phối bắt buộc phân loại công việc hiện tại vào đúng 3 cấp độ sau (chi tiết xem tại [references/routing-matrix.md](./references/routing-matrix.md)):

| Quân Cờ | Model Chỉ Định | Vai Trò Cốt Lõi | Những Việc ĐƯỢC Làm | Những Việc CẤM Làm |
| :--- | :--- | :--- | :--- | :--- |
| **1. QUÂN VUA (King)** | **Gemini 4 Argon High** | Bộ não trung tâm, Tổng chỉ huy, Kỹ sư kiến trúc, Tech Leader | - Phân tích yêu cầu nghiệp vụ từ `.agents/docs/SRS_BUSINESS_SPEC.md`<br>- Ra quyết định kiến trúc & giải quyết bài toán logic phức tạp<br>- Giao mục tiêu cho Quân Hậu & nghiệm thu chất lượng cuối cùng | Không tự ngồi gõ từng file code CRUD hoặc giao diện lặp đi lặp lại gây lãng phí Quota Argon. |
| **2. QUÂN HẬU (Queen)** | **Gemini 4 Neon High** | Project Manager, Senior Principal Dev, QA Architect | - Thiết kế chi tiết PostgreSQL/Supabase Schema, RLS, SQL RPC<br>- Lên cấu trúc API Contract (TypeScript Interfaces, Zod Schemas)<br>- Thiết kế cấu trúc Giao diện (Component Tree, State) & viết Test Cases<br>- **Đóng gói "Phiếu giao việc cấm suy luận" cho Quân Tốt** | Không giao việc mơ hồ cho Quân Tốt; không bỏ qua bước kiểm tra kiểu dữ liệu (Type-check). |
| **3. QUÂN TỐT (Pawn)** | **Gemini 3.8 Flash High** | Tay chân thực thi, Lập trình viên cơ bản (Code Worker) | - Nhận "Phiếu giao việc" đã có sẵn 100% thiết kế từ Vua/Hậu để viết code vào đúng file được chỉ định<br>- Viết CRUD, dựng UI component theo mẫu, viết dữ liệu seed/mock | **CẤM TUYỆT ĐỐI SUY LUẬN!** Không được tự thiết kế DB, không tự đổi cấu trúc API, không tự đoán luật nghiệp vụ. |

---

## 2. Quy Trình Tự Động Điều Phối 4 Bước (Autonomous 4-Stage Pipeline)

Mỗi khi người dùng giao một yêu cầu (ví dụ: *"Hãy làm Phân hệ 1"*, *"Thiết kế và code tính năng xuất kho nội bộ"*...), `/multi-agents` tự động chạy theo 4 bước khép kín sau mà không cần người dùng phải gọi thêm lệnh phụ:

### Bước 1: Quân Vua (`Gemini 4 Argon High`) Định Hướng & Khóa Ngữ Cảnh
1. Đọc `.agents/docs/PROJECT_STATE.md`, `.agents/docs/SRS_BUSINESS_SPEC.md` và `.agents/docs/ARCHITECTURE_BLUEPRINT.md`.
2. Xác định rõ các ràng buộc nghiệp vụ bắt buộc (ví dụ: phân quyền 5 Role, ẩn giá vốn Tây Nguyên khỏi cấp quán, giao dịch Atomic).
3. Chốt phương án kiến trúc ở mức tổng thể và chuyển giao yêu cầu thiết kế kỹ thuật cho **Quân Hậu (`Gemini 4 Neon High`)**.

### Bước 2: Quân Hậu (`Gemini 4 Neon High`) Thiết Kế Kỹ Thuật & Tạo "Khuôn Đúc" Cho Tốt
Quân Hậu thực hiện toàn bộ phần việc kỹ thuật nặng nhất:
1. **Thiết kế Database & Bảo mật:** Viết chính xác cấu trúc bảng SQL, khóa ngoại, Index, Supabase RLS Policy hoặc hàm PL/pgSQL Transaction.
2. **Thiết kế Hợp đồng API & Types:** Định nghĩa đầy đủ file TypeScript Interfaces và Zod Validation Schemas trong `packages/shared`.
3. **Thiết kế Giao diện & Test Cases:** Lên cấu trúc Component props, luồng State và danh sách Test Cases nghiệm thu.
4. **Xuất "Phiếu Giao Việc Cấm Suy Luận" (Zero-Reasoning Pawn Spec):** Chia nhỏ phần việc viết code thành các tác vụ độc lập theo đúng mẫu bắt buộc tại [references/pawn-task-template.md](./references/pawn-task-template.md).

### Bước 3: Quân Tốt (`Gemini 3.8 Flash High`) Thực Thi Code Hàng Loạt (Gánh Quota)
1. Khởi chạy Worker qua công cụ **`swarm`** (`action: "add"`) với tham số ghim cứng `model: "gemini-3.8-flash-high"` (**CẤM dùng `invoke_subagent`** vì `invoke_subagent` không hỗ trợ ghim mã model cụ thể và sẽ bị fallback về `Gemini 4 Hydrogen`).
2. Truyền nguyên văn **"Phiếu Giao Việc Cấm Suy Luận"** do Quân Hậu (`gemini-4-neon-high`) đã chuẩn bị ở Bước 2 vào `brief` của Quân Tốt.
3. Nếu có nhiều phần việc độc lập (ví dụ: Tốt 1 viết `@cf19/shared`, Tốt 2 viết `@cf19/api`, Tốt 3 viết `@cf19/web`), spawn song song các worker `pawn-flash-1..N` ghim cứng `model: "gemini-3.8-flash-high"` để tăng tốc tối đa.

### Bước 4: Quân Hậu / Quân Vua Nghiệm Thu & Cập Nhật Bộ Nhớ Dự Án
1. Chạy lệnh kiểm tra biên dịch TypeScript (`tsc --noEmit`), Linter và Test Cases do Quân Hậu đã chuẩn bị.
2. Nếu Quân Tốt viết sai bất kỳ dòng nào so với Spec, Quân Hậu chỉ định chính xác dòng lỗi hoặc sửa dứt điểm.
3. Cập nhật tiến độ vào `.agents/docs/PROJECT_STATE.md` để phiên làm việc tiếp theo nắm bắt ngay lập tức.

---

## 3. Cơ Chế Ghim Cứng (Hard-Pin) Model Bằng Công Cụ `swarm` (CẤM DÙNG `invoke_subagent`)

> **CẢNH BÁO KỸ THUẬT SỐNG CÒN:**
> Công cụ `invoke_subagent` của Antigravity chỉ nhận 4 enum trừu tượng (`"inherit" | "flash_lite" | "flash" | "pro"`). Khi gọi `invoke_subagent(Model: "pro")`, hệ thống Antigravity sẽ tự động ánh xạ về **`Gemini 4 Hydrogen`** chứ KHÔNG PHẢI **`Gemini 4 Neon (High)`**!
> Do đó, khi skill `/multi-agents` được kích hoạt, Agent điều phối **BẮT BUỘC PHẢI SỬ DỤNG CÔNG CỤ `swarm`** (được cấp quyền hợp lệ theo quy tắc *"a skill you read explicitly instructs you to call it"*) để ghim chính xác tuyệt đối `model` ID theo bảng dưới đây:

| Quân Cờ | Tên Roster Trong `swarm` | Mã `model` Bắt Buộc Khi Gọi `swarm` | Tên Hiển Thị Trên UI |
| :--- | :--- | :--- | :--- |
| **1. QUÂN VUA (Coordinator)** | `coordinator` (Agent chính) | `gemini-4-argon-high` | **Gemini 4 Argon (High)** |
| **2. QUÂN HẬU (Queen)** | `queen-neon` | `gemini-4-neon-high` | **Gemini 4 Neon (High)** |
| **3. QUÂN TỐT (Pawn 1..N)** | `pawn-flash-1`, `pawn-flash-2`, `pawn-flash-3` | `gemini-3.8-flash-high` | **Gemini 3.8 Flash (High)** |

### Quy Trình Gọi `swarm` Bắt Buộc Trong `/multi-agents`:
1. **Đặt tiêu đề phiên Swarm:** Gọi `swarm(action: "title", title: "CF19 Multi-Agents: Vua (Argon) - Hậu (Neon) - Tốt (Flash)")` và tuân thủ `swarm_pane` skill.
2. **Triệu hồi Quân Hậu (`Gemini 4 Neon High`):**
   ```json
   {
     "action": "add",
     "name": "queen-neon",
     "model": "gemini-4-neon-high",
     "workspace": "inherit",
     "brief": "<Nội dung giao việc thiết kế Schema/API/UI + Xuất Phiếu giao việc cấm suy luận cho Quân Tốt>"
   }
   ```
3. **Triệu hồi Đội Quân Tốt (`Gemini 3.8 Flash High`):**
   ```json
   {
     "action": "add",
     "name": "pawn-flash",
     "model": "gemini-3.8-flash-high",
     "workspace": "inherit",
     "tasks": ["<Phiếu Tốt 1>", "<Phiếu Tốt 2>", "<Phiếu Tốt 3>"],
     "brief": "<Chỉ thị thực thi code Zero-Reasoning theo đúng Phiếu giao việc của Quân Hậu>"
   }
   ```
4. **Kiểm tra trạng thái Model thực tế:** Luôn gọi `swarm(action: "status")` để xác nhận trên bảng trạng thái đúng `gemini-4-neon-high` và `gemini-3.8-flash-high` đang chạy, tuyệt đối không để bất kỳ worker nào rơi về `gemini-4-hydrogen`.
