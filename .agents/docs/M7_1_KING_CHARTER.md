# CHỈ THỊ KIẾN TRÚC TIỂU PHÂN HỆ M7.1 TỪ QUÂN VUA (KING'S ARCHITECTURAL CHARTER — SUBMODULE M7.1)

- **Tiểu phân hệ:** `M7.1 - SQL OLAP P&L Consolidation & Atomic Franchise Store Cloning RPCs (0008_m7_olap_pnl_and_franchise_cloning.sql), Pure Executive P&L Math Engine & @cf19/shared M7 Contracts + Unit Tests`
- **Quân Vua (Coordinator):** `gemini-4-argon-high` (**Gemini 4 Argon (High)**)
- **Quân Hậu (`queen-neon`):** `gemini-4-neon-high` (**Gemini 4 Neon (High)**)
- **Đội Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):** `gemini-3.8-flash-high` (**Gemini 3.8 Flash (High)**)

---

## 1. Bốn Quy Tắc Toán Học Tài Chính — Hợp Nhất P&L & Nhân Bản Nhượng Quyền Của Phân Hệ M7

Toàn bộ công thức dưới đây phải được cài đặt đồng nhất 100% trong cả PL/pgSQL (`0008_m7_olap_pnl_and_franchise_cloning.sql`) lẫn TypeScript (`packages/shared/src/utils/executivePnlAndFranchiseMath.ts`):

1. **Báo Cáo Lãi - Lỗ Mảng Cung Ứng Kho Tổng Tây Nguyên (`calculateCentralWarehousePnl`):**
   - Tách bạch rõ 2 nguồn doanh thu của Kho Tổng:
     - `b2b_external_revenue_vnd`: Tổng doanh thu bán sỉ B2B cho các chủ quán F&B ngoài thị trấn (`b2b_orders.payment_status <> 'VOIDED'`).
     - `internal_transfer_revenue_vnd`: Tổng giá trị xuất chuyển kho nội bộ về 4 quán nhà đã đối soát (`internal_transfers.status = 'RECONCILED'`, tính theo `internal_unit_price_vnd`).
   - Tách bạch rõ 2 phần giá vốn gốc Tây Nguyên (`raw_cost_vnd` — chỉ `SUPER_ADMIN` được xem báo cáo P&L này!):
     - `b2b_raw_cogs_vnd`: Tổng giá vốn gốc Tây Nguyên của hàng bán sỉ B2B.
     - `internal_transfer_raw_cogs_vnd`: Tổng giá vốn gốc Tây Nguyên của hàng đã xuất chuyển nội bộ về 4 quán.
   - Lợi nhuận Kho Tổng:
     - `b2b_external_gross_profit_vnd = b2b_external_revenue_vnd - b2b_raw_cogs_vnd`
     - `internal_markup_profit_vnd = internal_transfer_revenue_vnd - internal_transfer_raw_cogs_vnd`
     - `warehouse_total_gross_profit_vnd = b2b_external_gross_profit_vnd + internal_markup_profit_vnd`
     - `warehouse_operating_expense_vnd` (chi phí vận hành kho tổng)
     - `warehouse_net_profit_vnd = warehouse_total_gross_profit_vnd - warehouse_operating_expense_vnd`
2. **Báo Cáo Lãi - Lỗ Từng Điểm Quán Cà Phê (`Quán 1..4` & Quán Nhượng Quyền — `calculateStoreNodePnl`):**
   - `pos_gross_revenue_vnd` = `cash_revenue_vnd + vietqr_revenue_vnd` (tổng các đơn `pos_orders` có `payment_status === 'PAID'` của chi nhánh).
   - `store_internal_bom_cogs_vnd`: Tổng `cogs_amount_vnd` của các đơn `PAID` (tính theo giá hạch toán nội bộ `internal_transfer_price_vnd`).
   - `store_gross_profit_vnd = pos_gross_revenue_vnd - store_internal_bom_cogs_vnd`.
   - Các khoản giảm trừ lợi nhuận tại quán:
     - `labor_cost_vnd`: Chi phí nhân sự tại quán.
     - `cash_shortage_loss_vnd`: Tổng độ lệch âm két tiền mặt từ các ca đóng mù (`variance_cash_vnd < 0` $\rightarrow$ `Math.abs(variance_cash_vnd)`).
     - `stocktake_shrinkage_loss_vnd`: Tổng giá trị nguyên liệu hao hụt kiểm kho cuối ngày (`variance_qty < 0` $\rightarrow$ `Math.round(Math.abs(variance_qty) * internal_transfer_price_vnd)`).
     - `franchise_royalty_fee_vnd`: Nếu `store.type === 'FRANCHISE_STORE'`, tính phí nhượng quyền `Math.round((pos_gross_revenue_vnd * royaltyPct) / 100)`, ngược lại bằng `0` đối với quán tự sở hữu `'RETAIL_STORE'`.
   - `store_net_profit_vnd = store_gross_profit_vnd - labor_cost_vnd - cash_shortage_loss_vnd - stocktake_shrinkage_loss_vnd - franchise_royalty_fee_vnd`.
   - Tỷ suất lợi nhuận gộp `gross_margin_pct` và tỷ suất lợi nhuận ròng `net_margin_pct` (làm tròn 2 chữ số thập phân).
3. **Báo Cáo Hợp Nhất Toàn Chuỗi Có Loại Trừ Giao Dịch Nội Bộ (`consolidateEnterprisePnl`):**
   - **Doanh thu Ngoại chuỗi Hợp nhất (`consolidated_external_revenue_vnd`):**
     $$\text{consolidated\_external\_revenue\_vnd} = \text{b2b\_external\_revenue\_vnd} + \sum_{s \in \text{stores}} s.\text{pos\_gross\_revenue\_vnd}$$
   - **Loại trừ doanh thu chuyển kho nội bộ (`intercompany_eliminated_revenue_vnd`):**
     $$\text{intercompany\_eliminated\_revenue\_vnd} = \text{internal\_transfer\_revenue\_vnd}$$
   - **Tổng Lợi nhuận Ròng Hợp nhất Toàn Tập Đoàn (`consolidated_net_profit_vnd`):**
     $$\text{consolidated\_net\_profit\_vnd} = \text{warehouse\_net\_profit\_vnd} + \sum_{s \in \text{stores}} s.\text{store\_net\_profit\_vnd} + \sum_{s \in \text{stores}} s.\text{franchise\_royalty\_fee\_vnd}$$
     *(Ghi chú: Phí bản quyền `franchise_royalty_fee_vnd` mà quán nhượng quyền nộp về chuỗi được cộng vào thu nhập của Công ty Mẹ; hoặc tổng lợi nhuận ròng hợp nhất được hạch toán minh bạch kèm bảng xếp hạng hiệu quả các quán theo `store_net_profit_vnd` giảm dần!).*
4. **Động Cơ Nhân Bản Chi Nhánh Mới / Nhượng Quyền 1-Click (`previewClonedStoreMenuPricing` & `rpc_m7_clone_franchise_store`):**
   - Chỉ `SUPER_ADMIN` được phép thực thi.
   - Sao chép toàn bộ Thực đơn gốc (`Master Menu`), Biến thể (`S/M/L`), Topping/Modifiers và Công thức định lượng chuẩn (`Master BOM`) sang chi nhánh mới với hệ số giá vùng tùy chỉnh `price_multiplier` (`0.50 <= price_multiplier <= 3.00`):
     $$\text{cloned\_base\_price\_vnd} = \text{ROUND}(\text{master\_base\_price\_vnd} \times \text{price\_multiplier})$$
     $$\text{estimated\_gross\_margin\_pct} = \text{ROUND}\left(\frac{\text{cloned\_base\_price\_vnd} - \text{default\_variant\_bom\_cogs\_vnd}}{\text{cloned\_base\_price\_vnd}} \times 100, 2\right)$$
   - Tùy chọn tự động khởi tạo **Phiếu Xin Cấp Hàng Khai Trương (`starter_transfer_request`)** từ Kho Tổng Tây Nguyên (`CW-TAYNGUYEN`) về chi nhánh mới vừa nhân bản và ghi `audit_logs` (`FRANCHISE_STORE_CLONED`).

---

## 2. Cấu Trúc 7 Files Chuyên Biệt Của Tiểu Phân Hệ M7.1

### Nhóm A: Tầng SQL OLAP & Atomic Franchise Cloning RPCs (Do Quân Hậu `queen-neon` trực tiếp thiết kế & ghi file)
1. `C:\bib\cf_19\supabase\migrations\0008_m7_olap_pnl_and_franchise_cloning.sql`:
   - Hàm bảo vệ RBAC `public._m7_assert_super_admin(p_actor_id UUID)` (chỉ cho phép duy nhất `SUPER_ADMIN` truy cập P&L hợp nhất và nhân bản chi nhánh!).
   - `public.rpc_m7_get_executive_pnl_consolidation(...)` (trả về JSONB báo cáo P&L tách biệt Kho Tổng vs từng Quán 1..N + bảng hợp nhất đã loại trừ doanh thu nội bộ).
   - `public.rpc_m7_clone_franchise_store(...)` (tạo chi nhánh mới trong `stores`, áp hệ số `price_multiplier`, khởi tạo ca đầu tiên + tùy chọn sinh phiếu chuyển kho khai trương `REQUESTED`, trả về bảng giá thực đơn đã nhân bản và ghi `audit_logs`).

### Nhóm B: Hợp Đồng `@cf19/shared` M7 Schemas, Types & Barrel Exports (Do `pawn-flash-1` thực thi — 4 files)
2. `C:\bib\cf_19\packages\shared\src\schemas\executivePnl.schema.ts` (Tạo mới):
   - `ExecutivePnlQuerySchema`, `CloneFranchiseStoreSchema`, `PreviewFranchisePricingSchema`.
   - *(Lưu ý: Kiểm tra kỹ các file trong `packages/shared/src/schemas/` để không đặt trùng bất kỳ tên symbol nào của M1–M6!)*.
3. `C:\bib\cf_19\packages\shared\src\types\executivePnl.types.ts` (Tạo mới):
   - Toàn bộ DTOs cho `CentralWarehousePnlDTO`, `StoreNodePnlDTO`, `EnterpriseConsolidatedPnlDTO`, `ClonedMenuProductPricePreviewDTO`, `CloneFranchiseStoreResultDTO`.
4. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Re-export `./executivePnl.schema.js`).
5. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Re-export `./types/executivePnl.types.js` và `./utils/executivePnlAndFranchiseMath.js`).

### Nhóm C: Pure Executive P&L & Franchise Cloning Math Engine + Bộ Vitest Unit Tests (Do `pawn-flash-2` thực thi — 2 files)
6. `C:\bib\cf_19\packages\shared\src\utils\executivePnlAndFranchiseMath.ts` (Tạo mới):
   - 4 hàm thuần túy: `calculateCentralWarehousePnl`, `calculateStoreNodePnl`, `consolidateEnterprisePnl`, `previewClonedStoreMenuPricing`.
7. `C:\bib\cf_19\packages\shared\src\__tests__\executive-pnl-franchise-m7.test.ts` (Tạo mới):
   - Bộ kiểm thử tự động Vitest gồm tối thiểu **20 test cases** kiểm tra toàn diện `executivePnlAndFranchiseMath.ts` và `executivePnl.schema.ts` (lưu ý dùng `.safeParse(...)` nhất quán khi kiểm tra `.success`!).
