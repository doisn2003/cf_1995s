# BẢN VẼ KIẾN TRÚC KỸ THUẬT & CƠ SỞ DỮ LIỆU GỐC (ARCHITECTURE BLUEPRINT)

> **Quyết định Kiến trúc từ Quân Vua (`Gemini 4 Argon High` - Chief Architect):**
> Bản thiết kế này cố định toàn bộ Tech Stack, Cấu trúc Monorepo, Chuẩn Database Schema trên **Supabase (PostgreSQL)** và Kiến trúc API **Node.js TypeScript** để Quân Hậu (`Neon High`) và Quân Tốt (`Flash High`) cứ thế triển khai đồng nhất, không bao giờ xung đột.

---

## 1. Quyết Định Tech Stack Toàn Hệ Thống (Đã Chốt & Tư Vấn Bởi Quân Vua)

### 1.1. Backend & Database (Theo chỉ định của Chủ dự án)
- **Database & BaaS Core:** **PostgreSQL trên Supabase**
  - Tận dụng **Supabase Auth + Row Level Security (RLS)** để khóa chặt dữ liệu giữa Kho Tổng và 4 Quán ngay từ tầng Database.
  - Tận dụng **Supabase Realtime (WebSocket Postgres Changes / Broadcast)** để đẩy lệnh gọi món tức thời từ màn hình Thu ngân POS sang màn hình Quầy Pha chế (KDS) và cập nhật trạng thái thanh toán VietQR trong `< 1 giây` mà không cần dựng hạ tầng Socket server phức tạp riêng lẻ.
  - Sử dụng **PostgreSQL RPC Functions (PL/pgSQL Transactions)** cho các nghiệp vụ tài chính/kho đòi hỏi tính nguyên tử (Atomic): Trừ kho theo BOM, Kết chuyển mẻ rang FIFO, Chuyển kho nội bộ 2 pha, Đóng ca mù.
- **Backend API Server:** **Node.js + TypeScript (Fastify hoặc NestJS/Express theo kiến trúc Modular Clean Architecture)**
  - **ORM / Query Builder:** **Prisma ORM** (hoặc **Drizzle ORM** kết hợp Supabase typed client) để đảm bảo **100% End-to-End Type Safety** từ bảng PostgreSQL lên tới code TypeScript. (Ưu tiên **Drizzle ORM + Supabase JS** hoặc **Prisma** vì sinh sẵn file schema rõ ràng để Quân Hậu kiểm soát Quân Tốt).
  - **Validation:** **Zod** (kiểm tra chặt mọi dữ liệu đầu vào API; dùng chung schema giữa Backend và Frontend).

### 1.2. Tư Vấn & Quyết Định Frontend Webapp Từ Quân Vua (`Gemini 4 Argon High`)
Để phục vụ cùng lúc **4 giao diện vận hành khác nhau** (Dashboard Chủ chuỗi/Kho Tổng, Máy Thu ngân POS cảm ứng cần chạy mượt cả khi mạng chập chờn, Màn hình Quầy pha chế KDS, và Giao diện Điện thoại cho Nhân viên/Khách hàng), Quân Vua quyết định kiến trúc Frontend như sau:
- **Framework Cốt lõi:** **React 19 + TypeScript + Vite (SPA / PWA - Progressive Web App)** *(hoặc Next.js App Router, nhưng với hệ thống POS + KDS nội bộ cần tốc độ phản hồi chạm 0ms, hỗ trợ cài đặt ra màn hình máy tính bảng như App thật và lưu đệm Offline qua IndexedDB, **React + Vite + TypeScript + PWA** là lựa chọn tối ưu, nhẹ và dễ cho Quân Tốt Flash code nhất without SSR hydration bugs)*.
- **UI Component & Styling:** **Tailwind CSS + shadcn/ui (Radix UI)** + **Lucide Icons**
  - Giao diện hiện đại, sạch sẽ, hỗ trợ nút bấm to rõ trên màn hình cảm ứng POS/KDS và tương thích hoàn hảo trên điện thoại của Chủ chuỗi.
- **Quản lý State & Đồng bộ dữ liệu:**
  - **TanStack Query (React Query v5):** Đồng bộ dữ liệu Server (Kho, Báo cáo P&L, Công nợ B2B).
  - **Zustand + IndexedDB (`idb-keyval` / `Dexie.js`):** Quản lý Giỏ hàng POS tại quầy (chống mất đơn khi rớt mạng tạm thời).
  - **TanStack Router (hoặc React Router v7):** Phân luồng rõ ràng theo từng Role (`/executive/*`, `/warehouse/*`, `/store/:storeId/pos`, `/store/:storeId/kds`, `/store/:storeId/manage`).

---

## 2. Cấu Trúc Thư Mục Dự Án Chuẩn (Monorepo Layout)

```text
C:\bib\cf_19\
├── .agents\                        # Bộ não điều phối Multi-Agents (Rules, Docs, Skills)
├── supabase\
│   ├── migrations\                 # Các file SQL tạo bảng, RLS Policies, Triggers & RPCs
│   └── seed.sql                    # Dữ liệu mẫu: 1 Kho Tổng, 4 Quán, 5 Role, Menu & BOM chuẩn
├── packages\
│   └── shared\                     # Zod Schemas, TypeScript Interfaces, Constants dùng chung BE & FE
│       └── src\
│           ├── enums.ts            # Roles, OrderStatus, TransferStatus, LotType
│           ├── schemas\            # Zod validation schemas
│           └── types\              # DTOs & Domain Models
├── apps\
│   ├── api\                        # Backend Node.js + TypeScript
│   │   └── src\
│   │       ├── config\             # Supabase Admin Client, Env validation
│   │       ├── middlewares\        # JWT Auth, RBAC Guard, Store Scope Guard, Audit Logger
│   │       ├── modules\
│   │       │   ├── auth\           # Đăng nhập, phân quyền, PIN xác nhận của Quản lý quán
│   │       │   ├── warehouse\      # Nhập Tây Nguyên, Lệnh rang xay FIFO, Tồn kho tổng
│   │       │   ├── b2b\            # Khách sỉ thị trấn, Bảng giá bậc thang, Công nợ AR/AP
│   │       │   ├── transfers\      # Chuyển kho nội bộ 2 pha (Kho Tổng -> 4 Quán)
│   │       │   ├── catalog\        # Thực đơn (Menu), Size/Topping, Định mức pha chế (BOM)
│   │       │   ├── pos\            # Tạo đơn, Sinh VietQR EMVCo, Webhook gạch nợ, Đóng ca mù
│   │       │   ├── kds\            # Luồng quầy Bar & kích hoạt trừ kho BOM
│   │       │   ├── analytics\      # Báo cáo P&L tách biệt Kho Tổng vs 4 Quán, Nhân bản quán mới
│   │       │   ├── hrm-optional\   # [Tùy chọn] Hồ sơ nhân sự, Chấm công, Thuật toán xếp lịch
│   │       │   └── customer-app\   # [Tùy chọn] Khách tự đặt món, Tích điểm, Sự kiện
│   │       └── index.ts
│   └── web\                        # Frontend React + TypeScript + Vite + Tailwind + shadcn/ui (PWA)
│       └── src\
│           ├── components\         # UI dùng chung
│           ├── layouts\            # Layout riêng cho từng Role
│           ├── features\           # Tương ứng 1-1 với các modules của Backend
│           └── main.tsx
└── package.json                    # npm/pnpm workspaces
```

---

## 3. Thiết Kế Khung Cơ Sở Dữ Liệu Chuẩn 3NF (PostgreSQL on Supabase)

Mọi Agent khi thiết kế chi tiết hoặc viết truy vấn bắt buộc bám sát danh mục các bảng cốt lõi sau:

### 3.1. Nhóm Tổ Chức, Đa Chi Nhánh & Phân Quyền (`Core & RBAC`)
1. `organizations`: Thông tin chuỗi & cấu hình nhượng quyền.
2. `stores`: Danh sách điểm vận hành (`id`, `code`, `name`, `type`: `'CENTRAL_WAREHOUSE' | 'RETAIL_STORE' | 'FRANCHISE_STORE'`, `address`, `is_active`).
   - Mặc định có: `1 Kho Tổng` + `4 Quán Cà Phê (Quán 1..4)`.
3. `user_profiles`: Liên kết với `auth.users` của Supabase (`id`, `full_name`, `phone`, `role`: `'SUPER_ADMIN' | 'WAREHOUSE_MANAGER' | 'STORE_MANAGER' | 'CASHIER_STAFF' | 'BARISTA_KDS'`, `assigned_store_id`, `manager_pin_hash`, `hourly_rate`, `employment_type`: `'FULL_TIME' | 'PART_TIME'`).
4. `audit_logs`: Nhật ký bất biến ghi lại mọi thao tác nhạy cảm (`id`, `actor_id`, `store_id`, `action`, `target_table`, `target_id`, `reason`, `payload_json`, `created_at`).

### 3.2. Nhóm Kho Tổng, Lô Rang FIFO & Chuyển Kho Nội Bộ (`WMS & Supply Chain`)
5. `inventory_items`: Danh mục vật tư & hàng hóa chuẩn (`id`, `sku`, `name`, `category`: `'GREEN_BEAN' | 'ROASTED_COFFEE' | 'INGREDIENT' | 'PACKAGING'`, `base_unit`: `'g' | 'ml' | 'pcs'`, `moving_avg_cost_vnd`, `internal_transfer_price_vnd`, `retail_price_vnd`).
6. `warehouse_lots`: Quản lý tồn kho theo từng Lô (`id`, `store_id`, `item_id`, `lot_code`, `roast_date`, `expiry_date`, `initial_qty`, `remaining_qty`, `unit_cost_vnd`, `status`: `'AVAILABLE' | 'DEPLETED' | 'EXPIRED'`).
   - *Quy tắc:* `unit_cost_vnd` tại Kho Tổng bị ẩn hoàn toàn khỏi quyền truy cập của `STORE_MANAGER`, `CASHIER_STAFF`, `BARISTA_KDS`.
7. `roast_batches`: Lệnh rang xay chuyển đổi nhân xanh thành hạt rang (`id`, `batch_code`, `source_green_lot_id`, `green_input_weight_g`, `roasted_output_weight_g`, `weight_loss_pct`, `output_lot_id`, `roasted_by`, `roasted_at`).
8. `internal_transfers`: Phiếu chuyển kho nội bộ 2 pha từ Kho Tổng về 4 Quán (`id`, `transfer_code`, `from_warehouse_id`, `to_store_id`, `status`: `'REQUESTED' | 'IN_TRANSIT' | 'RECONCILED' | 'CANCELLED'`, `requested_by`, `dispatched_by`, `received_by`, `dispatched_at`, `received_at`).
9. `internal_transfer_items`: Chi tiết mặt hàng & mã lô (`lot_id`) xuất chuyển nội bộ.

### 3.3. Nhóm Bán Sỉ B2B Thị Trấn & Công Nợ (`B2B & AR Ledger`)
10. `b2b_customers`: Hồ sơ các chủ quán F&B trong thị trấn (`id`, `name`, `shop_name`, `phone`, `price_tier`: `'TIER_1' | 'TIER_2' | 'TIER_3'`, `credit_limit_vnd`, `current_debt_vnd`).
11. `b2b_price_tiers`: Bảng giá sỉ theo bậc sản lượng (`item_id`, `min_qty_kg`, `unit_price_vnd`).
12. `b2b_orders` & `b2b_order_items`: Đơn bán sỉ/lẻ từ Kho Tổng và lịch sử thanh toán/gối đầu công nợ (`b2b_debt_ledger`).

### 3.4. Nhóm Thực Đơn, Định Mức BOM, Bán Hàng POS, VietQR & Đóng Ca Mù (`Store Ops`)
13. `menu_categories` & `menu_products`: Danh mục đồ uống (`id`, `code`, `name`, `base_price_vnd`, `is_active`).
14. `menu_variants` & `menu_modifiers`: Biến thể Size (`S/M/L`), mức đường/đá và Topping cộng thêm.
15. `bom_recipes` & `bom_recipe_items`: Công thức định lượng chuẩn (`product_id`, `variant_id`, `inventory_item_id`, `quantity_per_cup_base_unit`, `wastage_allowance_pct`).
16. `pos_shifts`: Ca làm việc & Đóng ca đếm tiền mù (`id`, `store_id`, `cashier_id`, `opened_at`, `closed_at`, `opening_cash_vnd`, `blind_counted_cash_vnd`, `system_expected_cash_vnd`, `variance_cash_vnd`, `status`: `'OPEN' | 'CLOSED'`).
17. `pos_orders` & `pos_order_items`: Hóa đơn bán nước tại quán (`id`, `order_code`, `store_id`, `shift_id`, `cashier_id`, `customer_id`, `payment_method`: `'CASH' | 'VIETQR'`, `payment_status`: `'PENDING' | 'PAID' | 'VOIDED'`, `kds_status`: `'QUEUED' | 'PREPARING' | 'COMPLETED'`, `vietqr_ref_code`, `total_amount_vnd`, `cogs_amount_vnd`, `void_approved_by_manager_id`, `void_reason`).
18. `payment_webhook_logs`: Lưu vết gói tin Webhook ngân hàng chống gạch nợ trùng (`idempotency_key`, `order_id`, `amount_vnd`, `bank_tx_id`, `raw_payload`, `processed_at`).
19. `store_daily_stocktakes`: Phiếu kiểm kho cuối ngày tại quán đối chiếu Tồn thực tế vs. Tồn lý thuyết theo BOM.

### 3.5. Nhóm Phân Hệ Mở Rộng (`Optional Modules Schema`)
20. `hrm_staff_availabilities` & `hrm_shift_rosters`: Đăng ký lịch rảnh Part-time, nhu cầu nhân sự theo ca và kết quả xếp lịch tự động (hỗ trợ điều động liên quán `worked_store_id`).
21. `hrm_attendance_logs` & `hrm_payrolls`: Chấm công sinh trắc học/GPS/Wi-Fi và bảng lương tự động.
22. `loyalty_customers`, `loyalty_point_ledger` & `marketing_events`: Ứng dụng khách hàng tự đặt món, tích điểm liên thông 4 quán và xem sự kiện.
