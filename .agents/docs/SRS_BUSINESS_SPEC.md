# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ TOÀN DIỆN (SRS / PRD MASTER)
## HỆ THỐNG QUẢN TRỊ KHO CUNG ỨNG & VẬN HÀNH CHUỖI QUÁN CÀ PHÊ NỘI BỘ

> **Tài liệu này là chuẩn nghiệp vụ gốc (Single Source of Truth)** cho toàn bộ AI Agents (Vua Argon, Hậu Neon, Tốt Flash) trong suốt vòng đời phát triển dự án.

---

## PHẦN 1: TỔNG QUAN BÀI TOÁN KINH DOANH & PHÂN QUYỀN

### 1.1. Mô hình vận hành tích hợp dọc (Vertical Integration)
Hệ thống quản lý đồng thời 2 mảng kinh doanh gắn kết chặt chẽ trên cùng một nền tảng:
1. **Kho Tổng (Cung ứng & Phân phối cà phê):**
   - Nhập cà phê (nhân xanh hoặc hạt/bột) từ Tây Nguyên về Kho Tổng.
   - Quản lý sơ chế, rang xay, đóng gói: Tự động tính tỷ lệ hao hụt trọng lượng sau mỗi mẻ rang (thường 15%–18%), quy đổi đơn vị (Bao 60kg → Kg → Túi 500g/1kg → Gram pha chế), quản lý Mã lô (`Lot ID`), Ngày rang (`Roast Date`) và khóa xuất kho theo nguyên tắc **Lô rang cũ xuất trước (FIFO)**.
   - **Bán sỉ (B2B)** cho các chủ quán cà phê, F&B khác trong thị trấn: Áp giá chiết khấu tự động theo bậc sản lượng mua và quản lý sổ công nợ gối đầu (hạn mức nợ, tuổi nợ, nhắc nợ quá hạn).
   - **Bán lẻ (B2C)** cho khách mua cà phê hạt/bột về pha.
   - **Cấp phát nội bộ (Internal Transfer):** Xuất cà phê và nguyên phụ liệu từ Kho Tổng về 4 quán nhà theo giá vốn/giá hạch toán nội bộ.
2. **Chuỗi 4 Quán Cà Phê (Sẵn sàng mở rộng & Nhượng quyền):**
   - Nhận nguyên liệu từ Kho Tổng để pha chế và bán đồ uống cho khách.
   - Mỗi quán vận hành độc lập về ca kíp, tồn kho tại quầy, doanh thu và chi phí, nhưng dùng chung danh mục Thực đơn gốc (Master Menu), Công thức định lượng (Master BOM) và Ví tích điểm khách hàng toàn chuỗi.
   - Đội ngũ gồm: 1 Chủ chuỗi, 1 Quản lý Kho Tổng, 4 Quản lý Quán (mỗi người phụ trách đúng 1 quán), cùng đội ngũ Thu ngân, Phục vụ, Pha chế (gồm cả nhân viên cố định Full-time và nhân viên làm theo giờ Part-time có thể điều động liên quán).

### 1.2. Ma trận Phân quyền 5 Vai trò (RBAC)

| Mã Role | Tên Vai trò | Phạm vi dữ liệu | Quyền hạn cốt lõi | Giới hạn bảo mật bắt buộc |
| :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | **1. Chủ chuỗi** | Toàn hệ thống (Kho Tổng + 4 Quán) | Xem báo cáo Lãi - Lỗ (P&L) tức thời của Kho Tổng và từng Quán; cấu hình giá vốn, công thức pha chế (BOM), thực đơn; duyệt bảng lương; bấm nút nhân bản mở quán mới/nhượng quyền. | Toàn quyền kiểm soát; xem toàn bộ nhật ký hệ thống (`Audit Logs`). |
| `WAREHOUSE_MANAGER` | **2. Quản lý Kho Tổng** | Kho Tổng & Khách mua sỉ B2B | Nhập hàng Tây Nguyên, tạo lệnh rang xay, tạo đơn bán sỉ/lẻ, quản lý công nợ khách sỉ thị trấn, duyệt xuất hàng nội bộ cho 4 quán. | Không xem được doanh thu bán nước và két tiền của 4 quán. |
| `STORE_MANAGER` | **3. Quản lý Quán (4 người)** | Chỉ 1 Chi nhánh (`store_id`) được giao | Quản lý ca tại quán, kiểm kho cuối ngày, tạo phiếu xin cấp nguyên liệu từ Kho Tổng, duyệt hủy hóa đơn (kèm lý do), duyệt lịch làm việc tại quán. | Không xem được dữ liệu 3 quán kia; **tuyệt đối không thấy giá nhập gốc Tây Nguyên**. |
| `CASHIER_STAFF` | **4. Thu ngân / Phục vụ** | Quầy thu ngân tại quán trong ca | Chọn món POS, sinh mã VietQR động theo từng hóa đơn, in bill, mở ca & chốt ca đếm tiền mù, đăng ký lịch rảnh hàng tuần. | Muốn hủy hóa đơn đã in bắt buộc phải có mã PIN/xác nhận của Quản lý quán. |
| `BARISTA_KDS` | **5. Nhân viên Pha chế** | Màn hình Quầy Bar (KDS) tại quán | Xem danh sách món cần làm theo thứ tự thời gian, bấm hoàn thành món, bấm cảnh báo nguyên liệu sắp hết tại quầy. | Không truy cập được tiền mặt, công nợ và báo cáo doanh thu. |

---

## PHẦN 2: ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH & LUỒNG NGHIỆP VỤ

### 2.1. Phân hệ Kho Tổng & Bán Sỉ (WMS & B2B Portal)
1. **Màn hình Nhập kho Tây Nguyên & Quản lý Mẻ rang (Roastery & Batch FIFO):**
   - Ghi nhận phiếu nhập lô nhân xanh/nguyên liệu: Nhà cung cấp, mã lô, khối lượng, độ ẩm, giá nhập, chi phí vận chuyển (tự động tính giá vốn bình quân gia quyền - MAC).
   - Lệnh Rang & Đóng gói: Chọn lô nhân xanh xuất rang → Nhập khối lượng hạt rang thành phẩm thu được → Hệ thống tự tính `% hao hụt sau rang`, sinh lô thành phẩm mới kèm ngày rang (`roast_date`) và hạn sử dụng tối ưu.
2. **Màn hình Bán sỉ Thị trấn & Sổ cái Công nợ (B2B Sales & Credit Ledger):**
   - Quản lý danh sách chủ quán F&B trong thị trấn, hạng giá chiết khấu theo bậc sản lượng (`<10kg`, `10-50kg`, `>50kg`), hạn mức nợ tối đa.
   - Tạo đơn bán sỉ/lẻ → Sinh mã QR thanh toán ngay hoặc ghi nhận thanh toán một phần / nợ gối đầu → Theo dõi tuổi nợ và cảnh báo nợ quá hạn.
3. **Màn hình Điều phối Xuất kho Nội bộ 2 Pha (2-Phase Internal Stock Transfer):**
   - Khi tồn kho tại quán xuống dưới ngưỡng an toàn (ví dụ `< 3kg`), hệ thống gợi ý Quản lý quán gửi **Phiếu Xin Cấp Hàng** về Kho Tổng.
   - Quản lý Kho Tổng duyệt xuất theo lô rang cũ trước (FIFO) → Trừ tồn Kho Tổng, chuyển trạng thái phiếu sang `IN_TRANSIT` (Đang giao).
   - Khi Quản lý quán kiểm nhận đủ hàng và bấm **Xác nhận nhận hàng**, phiếu chuyển sang `RECONCILED` → Cộng tồn kho quán và ghi nhận bút toán chi phí nguyên liệu nội bộ cho quán đó.

### 2.2. Phân hệ Bán hàng POS, VietQR Động & Chống thất thoát tại 4 Quán
1. **Màn hình Thu ngân POS & Sinh mã VietQR Động (EMVCo + Webhook):**
   - Giao diện tối ưu cho Tablet/PC cảm ứng: Chọn món, chọn Size (`S/M/L`), mức đường/đá (`0%/50%/100%`), Topping thêm, nhập SĐT khách tích điểm.
   - Khi bấm thanh toán chuyển khoản: Hệ thống sinh **Mã VietQR Động riêng cho từng hóa đơn** (chứa sẵn đúng số tiền và mã định danh đơn hàng).
   - Khi khách quét thanh toán thành công: Hệ thống nhận tín hiệu Webhook ngân hàng trong 1–3 giây → Tự động gạch nợ chuyển đơn sang `PAID`, kích hoạt **Loa thông báo**, tự động in hóa đơn và đẩy món xuống màn hình Quầy Pha chế (KDS).
2. **Màn hình Quầy Pha chế (KDS - Kitchen/Bar Display System):**
   - Hiển thị thẻ món theo thời gian thực qua WebSocket kèm đồng hồ đếm thời gian chờ (quá 5 phút đổi màu vàng, quá 10 phút đổi màu đỏ).
   - Khi Pha chế bấm **[Hoàn thành]**: Hệ thống ghi nhận KPI tốc độ pha chế và **tự động trừ kho tại quán theo công thức định lượng (BOM)** (ví dụ: 1 ly Cà phê sữa tự trừ `20g bột cà phê + 25ml sữa đặc + 1 ly nhựa + 1 ống hút`).
3. **Màn hình Đóng ca đếm tiền mù (Blind Shift Close) & Kiểm kho cuối ngày:**
   - **Đếm tiền mù:** Cuối ca, thu ngân bắt buộc nhập số tiền mặt thực tế đếm được trong két vào ô trống mà không nhìn thấy số tiền mặt lý thuyết trên máy. Sau khi bấm chốt, hệ thống mới đối chiếu, ghi nhận độ lệch (`Thừa/Thiếu`) và báo ngay cho Quản lý quán & Chủ chuỗi.
   - **Kiểm kho đối chiếu BOM:** Cuối ngày, Quản lý quán nhập lượng tồn thực tế tại quầy (số kg cà phê, số hộp sữa, số ly nhựa). Hệ thống tự so sánh với `Tồn lý thuyết = Tồn đầu + Nhập trong ngày - (Số ly bán × Định mức BOM)` để chỉ ra chính xác lượng nguyên liệu hao hụt bất thường.

### 2.3. Phân hệ Quản trị Đa Chi nhánh & Dashboard Chủ Chuỗi (Executive Portal)
1. **Bảng theo dõi Lãi - Lỗ tức thời (Real-time Multi-Entity P&L):**
   - Báo cáo tách biệt rõ ràng: **Lợi nhuận mảng Cung ứng Kho Tổng** và **Lợi nhuận ròng của từng Quán (Quán 1, 2, 3, 4)** theo thời gian thực (Doanh thu bán nước − Giá vốn BOM − Chi phí nhân sự − Chi phí vận hành).
2. **Công cụ Nhân bản Chi nhánh / Nhượng quyền (Franchise Cloning Engine):**
   - Khi mở quán thứ 5 hoặc nhượng quyền: Chỉ cần bấm 1 nút để sao chép toàn bộ Thực đơn gốc (Master Menu), Công thức định lượng (Master BOM) và Cấu hình vận hành sang chi nhánh mới, cho phép tùy chỉnh hệ số giá bán riêng theo khu vực.

---

## PHẦN 3: DANH MỤC 8 PHÂN HỆ NGHIỆP VỤ CHÍNH & 3 PHÂN HỆ TÙY CHỌN MỞ RỘNG

### 3.1. Tám (08) Phân hệ Nghiệp vụ Chính (Core Scope – 60 Ngày công)
1. **Phân hệ 1 (8 ngày):** `Core System Architecture, Multi-Tenant Relational Database Schema & RBAC Security Middleware` (PostgreSQL 3NF Schema, Tenant Isolation, JWT/OAuth2, RBAC Policy Engine, Immutable Audit Trail).
2. **Phân hệ 2 (9 ngày):** `WMS Core Engine, Roastery Batch/Lot Lifecycle & FIFO Costing Algorithm` (Moving Average Cost - MAC, Green-Bean to Roasted Yield Loss Matrix, Batch/Lot Traceability, FIFO Transaction Locking).
3. **Phân hệ 3 (8 ngày):** `B2B Dynamic Tiered-Pricing Engine, AR/AP Credit Ledger & 2-Phase Internal Stock Transfer` (Dynamic Price-Tier Schema, AR/AP Aging Schedule, 2-Phase Commit Internal Transfer `IN_TRANSIT` → `RECONCILED`).
4. **Phân hệ 4 (10 ngày):** `Multi-Branch POS Terminal State-Machine, Modifier Matrix & Offline-First Sync Engine` (POS Reactive UI, SKU Variants & Topping Modifiers, IndexedDB Local Cache Sync, ESC/POS Thermal Printing).
5. **Phân hệ 5 (7 ngày):** `EMVCo Dynamic VietQR Payload Generator & Async Banking Webhook/IPN Consumer` (EMVCo Dynamic QR per Order ID, Idempotent Webhook Listener, Auto Order Reconciliation & IoT Audio Speaker Trigger).
6. **Phân hệ 6 (8 ngày):** `KDS WebSocket Pub/Sub Broker, Multi-level BOM Atomic Deduction & Blind-Close Variance Engine` (Real-time KDS WebSocket, Atomic BOM Inventory Deduction, Blind Shift Cash & Stock Variance Reconciliation).
7. **Phân hệ 7 (6 ngày):** `Executive OLAP Data Aggregation, Multi-Entity P&L Consolidation & Franchise Metadata Cloning` (Real-time P&L Pipeline separating Warehouse vs. Store Nodes, 1-Click Master BOM/Menu Franchise Cloning).
8. **Phân hệ 8 (4 ngày):** `Cloud Infrastructure Provisioning, Docker/Nginx CI/CD Pipeline & Security Hardening` (Docker/Nginx Reverse Proxy, SSL/TLS, Point-in-Time Backup, Load Testing & Production Cut-over).

### 3.2. Ba (03) Phân hệ Tùy chọn Mở rộng (Optional Add-on Modules)
1. **Tùy chọn 1 (12 ngày):** `Native/Cross-Platform Mobile App (iOS & Android) & Hardware-Level Security Hardening` (Device ID Binding, Biometric Keychain/Keystore, SSL Pinning, Push Notification, Geofencing/Wi-Fi BSSID).
2. **Tùy chọn 2 (10 ngày):** `HRM Profile Schema, Automated Payroll Engine, Biometric Attendance & Constraint-Based Auto-Scheduling Algorithm` (Hồ sơ nhân sự, đồng bộ chấm công sinh trắc học/GPS, tự động tính lương theo ca/KPI, và thuật toán xếp lịch tự động tối ưu hóa ràng buộc cho nhân viên cố định & theo giờ liên quán).
3. **Tùy chọn 3 (15 ngày):** `Customer-Facing Ordering Portal, Omni-Channel Loyalty Ledger & Event Campaign Engine` (Giao diện ứng dụng dành cho khách hàng tự đặt đồ uống từ xa/tại bàn kết nối thẳng vào POS/KDS, tích điểm đổi quà liên thông 4 quán và xem sự kiện/ưu đãi).
