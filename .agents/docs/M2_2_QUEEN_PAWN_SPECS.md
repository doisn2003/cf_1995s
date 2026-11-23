# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M2.2 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **7 files (4 + 3)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1, M1.2, M1.3 và M2.1 (`@cf19/shared` M2 schemas, types & `warehouseMath.ts`).
- **Cam kết tương thích ngược:** Giữ nguyên 100% 3 lô tại Kho Tổng và 2 lô tại Quán 1–2 trong `seedData.ts` để toàn bộ **18/18 test cases của M1.2** tiếp tục PASS tuyệt đối!

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# MỞ RỘNG SEED STORE, DOMAIN ERROR MAPPER & WAREHOUSE SERVICE (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây cho tầng DB In-Memory, Error Mapper và Warehouse Service của `@cf19/api`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thay đổi tên hàm, tên lỗi, hay đuôi `.js` trong import ESM.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `warehouse.routes.ts`, `index.ts`, hay `m2-wms-roastery-fifo.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy lệnh `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M2.2 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật — Overwrite)
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.errors.ts` (Tạo mới)
4. `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.service.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\src\db\seedData.ts`
```ts
import {
  SEED_IDS,
  type AuditLogDto,
  type EmploymentType,
  type OrganizationDto,
  type PosOrderFullDto,
  type PosOrderItemDto,
  type PosShiftFullDto,
  type RoastBatchDto,
  type StoreDto,
  type UserRole,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
} from '@cf19/shared';

export interface StoredUserRecord {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  assigned_store_id: string | null;
  manager_pin_hash: string | null;
  dev_password: string;
  hourly_rate_vnd: number;
  employment_type: EmploymentType;
  is_active: boolean;
}

export const SEED_ORDER_IDS = {
  store01SampleOrder: '90000000-0000-4000-8000-000000000001',
  store02SampleOrder: '90000000-0000-4000-8000-000000000002',
} as const;

export const SEED_ORDER_ITEM_IDS = {
  store01Item01: '91000000-0000-4000-8000-000000000001',
  store02Item01: '91000000-0000-4000-8000-000000000002',
} as const;

export interface InMemoryDatabaseState {
  organizations: OrganizationDto[];
  stores: StoreDto[];
  users: StoredUserRecord[];
  inventoryItems: WarehouseInventoryItemDto[];
  warehouseLots: WarehouseLotFullDto[];
  roastBatches: RoastBatchDto[];
  posShifts: PosShiftFullDto[];
  posOrders: PosOrderFullDto[];
  posOrderItems: PosOrderItemDto[];
  auditLogs: AuditLogDto[];
}

const BASE_TS = '2026-11-22T01:00:00.000Z';

export function createInitialSeedState(): InMemoryDatabaseState {
  const organizations: OrganizationDto[] = [
    {
      id: SEED_IDS.organization.cf19,
      code: 'CF19',
      name: 'Chuỗi Cung Ứng Kho Tổng Tây Nguyên & Cà Phê CF19',
      tax_code: '6001900019',
      base_currency: 'VND',
      franchise_enabled: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const stores: StoreDto[] = [
    {
      id: SEED_IDS.stores.centralWarehouse,
      organization_id: SEED_IDS.organization.cf19,
      code: 'CW-TAYNGUYEN',
      name: 'Kho Tổng Rang Xay Tây Nguyên',
      type: 'CENTRAL_WAREHOUSE',
      address: 'Khu Công Nghiệp Tân An, TP. Buôn Ma Thuột, Đắk Lắk',
      phone: '02623888001',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store01,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-01',
      name: 'CF19 Quán 1 — Trung Tâm Thị Trấn',
      type: 'RETAIL_STORE',
      address: '19 Trần Phú, Trung Tâm Thị Trấn',
      phone: '02623888101',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store02,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-02',
      name: 'CF19 Quán 2 — Quảng Trường',
      type: 'RETAIL_STORE',
      address: '88 Hùng Vương, Khu Quảng Trường',
      phone: '02623888102',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store03,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-03',
      name: 'CF19 Quán 3 — Đại Lộ Đông Tây',
      type: 'RETAIL_STORE',
      address: '120 Lê Duẩn, Đại Lộ Đông Tây',
      phone: '02623888103',
      price_multiplier: 1.05,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store04,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-04',
      name: 'CF19 Quán 4 — Công Viên Hồ Điều Hòa',
      type: 'RETAIL_STORE',
      address: '05 Nguyễn Tất Thành, Công Viên Hồ Điều Hòa',
      phone: '02623888104',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const users: StoredUserRecord[] = [
    {
      id: SEED_IDS.users.superAdmin,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Nguyễn Minh Quân (Chủ Chuỗi)',
      email: 'admin@cf19.vn',
      phone: '0901000001',
      role: 'SUPER_ADMIN',
      assigned_store_id: null,
      manager_pin_hash:
        'scrypt$cf19_salt_admin_01$0c6150e2972c3db6c399d3fae73d4cc8276dd29e0a3ec30e5cfc165555d27a360efe28390ddf69cd04fd12237eb757e901a883fad4e4f3dce236d2d95916fd9b',
      dev_password: 'Cf19@Admin123',
      hourly_rate_vnd: 0,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.warehouseManager,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Trần Văn Hùng (Quản Lý Kho Tổng)',
      email: 'warehouse@cf19.vn',
      phone: '0901000002',
      role: 'WAREHOUSE_MANAGER',
      assigned_store_id: SEED_IDS.stores.centralWarehouse,
      manager_pin_hash: null,
      dev_password: 'Cf19@Warehouse123',
      hourly_rate_vnd: 75000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.storeManager01,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Lê Thị Thảo (Quản Lý Quán 1)',
      email: 'manager.store01@cf19.vn',
      phone: '0901000003',
      role: 'STORE_MANAGER',
      assigned_store_id: SEED_IDS.stores.store01,
      manager_pin_hash:
        'scrypt$cf19_salt_store01_01$79d6ce09a13ca647774e321a7f348bd49eb5b503f76f11bf17cc1c52f16980fb4dabe41e134cb30ac4f0e38ebed46f07c3f174d94c89a0b8c6fba78985129a17',
      dev_password: 'Cf19@Manager01',
      hourly_rate_vnd: 65000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.storeManager02,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Phạm Quốc Bảo (Quản Lý Quán 2)',
      email: 'manager.store02@cf19.vn',
      phone: '0901000004',
      role: 'STORE_MANAGER',
      assigned_store_id: SEED_IDS.stores.store02,
      manager_pin_hash:
        'scrypt$cf19_salt_store02_01$ff4a685894b7d9f52f4e497c27e48b37b944e7e82df0fee18e11a80d5b30de824239bf6cd6ac7094ede07eaf63997f75098ae974af9a4076cb7293c73b8e3247',
      dev_password: 'Cf19@Manager02',
      hourly_rate_vnd: 65000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.cashier01,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Võ Ngọc Linh (Thu Ngân Quán 1)',
      email: 'cashier.store01@cf19.vn',
      phone: '0901000005',
      role: 'CASHIER_STAFF',
      assigned_store_id: SEED_IDS.stores.store01,
      manager_pin_hash: null,
      dev_password: 'Cf19@Cashier01',
      hourly_rate_vnd: 30000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.cashier02,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Đặng Minh Anh (Thu Ngân Quán 2)',
      email: 'cashier.store02@cf19.vn',
      phone: '0901000006',
      role: 'CASHIER_STAFF',
      assigned_store_id: SEED_IDS.stores.store02,
      manager_pin_hash: null,
      dev_password: 'Cf19@Cashier02',
      hourly_rate_vnd: 28000,
      employment_type: 'PART_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.barista01,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Hoàng Gia Huy (Pha Chế Quán 1)',
      email: 'barista.store01@cf19.vn',
      phone: '0901000007',
      role: 'BARISTA_KDS',
      assigned_store_id: SEED_IDS.stores.store01,
      manager_pin_hash: null,
      dev_password: 'Cf19@Barista01',
      hourly_rate_vnd: 32000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.barista02,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Bùi Tuấn Kiệt (Pha Chế Quán 2)',
      email: 'barista.store02@cf19.vn',
      phone: '0901000008',
      role: 'BARISTA_KDS',
      assigned_store_id: SEED_IDS.stores.store02,
      manager_pin_hash: null,
      dev_password: 'Cf19@Barista02',
      hourly_rate_vnd: 30000,
      employment_type: 'PART_TIME',
      is_active: true,
    },
  ];

  const inventoryItems: WarehouseInventoryItemDto[] = [
    {
      id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'GB-ROB-TN',
      name: 'Cà phê nhân xanh Robusta Đắk Lắk S18',
      category: 'GREEN_BEAN',
      base_unit: 'g',
      min_stock_threshold: 60000,
      moving_avg_cost_vnd: 98000,
      internal_transfer_price_vnd: 0,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.greenArabicaCauDat,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'GB-ARA-CD',
      name: 'Cà phê nhân xanh Arabica Cầu Đất Washed',
      category: 'GREEN_BEAN',
      base_unit: 'g',
      min_stock_threshold: 30000,
      moving_avg_cost_vnd: 165000,
      internal_transfer_price_vnd: 0,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.roastedRobustaMed,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'RC-ROB-MED',
      name: 'Cà phê hạt rang Robusta Medium (Kg)',
      category: 'ROASTED_COFFEE',
      base_unit: 'g',
      min_stock_threshold: 3000,
      moving_avg_cost_vnd: 125000,
      internal_transfer_price_vnd: 155000,
      retail_price_vnd: 210000,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.roastedSignatureBlend,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'RC-BLEND-SIG',
      name: 'Cà phê hạt rang Signature Blend 70/30 (Kg)',
      category: 'ROASTED_COFFEE',
      base_unit: 'g',
      min_stock_threshold: 3000,
      moving_avg_cost_vnd: 158000,
      internal_transfer_price_vnd: 195000,
      retail_price_vnd: 265000,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.condensedMilk,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'ING-COND-MILK',
      name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
      category: 'INGREDIENT',
      base_unit: 'ml',
      min_stock_threshold: 2000,
      moving_avg_cost_vnd: 52,
      internal_transfer_price_vnd: 60,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.freshMilk,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'ING-FRESH-MILK',
      name: 'Sữa tươi thanh trùng DalatMilk không đường',
      category: 'INGREDIENT',
      base_unit: 'ml',
      min_stock_threshold: 5000,
      moving_avg_cost_vnd: 34,
      internal_transfer_price_vnd: 39,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.plasticCup500ml,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'PKG-CUP-500',
      name: 'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
      category: 'PACKAGING',
      base_unit: 'pcs',
      min_stock_threshold: 200,
      moving_avg_cost_vnd: 1150,
      internal_transfer_price_vnd: 1350,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.bioStraw,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'PKG-STRAW-BIO',
      name: 'Ống hút sinh học phi 6 bọc giấy',
      category: 'PACKAGING',
      base_unit: 'pcs',
      min_stock_threshold: 300,
      moving_avg_cost_vnd: 180,
      internal_transfer_price_vnd: 220,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const warehouseLots: WarehouseLotFullDto[] = [
    {
      id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-GB-ROB-001',
      supplier_name: 'HTX Nông Sản Cư Mgar Đắk Lắk',
      moisture_pct: 12.2,
      roast_date: null,
      received_at: '2026-11-01T08:00:00.000Z',
      expiry_date: '2027-11-01',
      initial_qty: 120000,
      remaining_qty: 90000,
      unit_cost_vnd: 95000,
      shipping_cost_vnd: 360000,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-RC-ROB-001',
      supplier_name: 'Xưởng Rang Nội Bộ CF19',
      moisture_pct: 3.1,
      roast_date: '2026-11-10',
      received_at: '2026-11-10T10:30:00.000Z',
      expiry_date: '2027-02-10',
      initial_qty: 24900,
      remaining_qty: 24900,
      unit_cost_vnd: 124500,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.cwRoastedRobusta02,
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-RC-ROB-002',
      supplier_name: 'Xưởng Rang Nội Bộ CF19',
      moisture_pct: 3.0,
      roast_date: '2026-11-18',
      received_at: '2026-11-18T14:00:00.000Z',
      expiry_date: '2027-02-18',
      initial_qty: 20000,
      remaining_qty: 20000,
      unit_cost_vnd: 126000,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.store01RoastedRobusta01,
      store_id: SEED_IDS.stores.store01,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-S01-RC-ROB-001',
      supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
      moisture_pct: 3.1,
      roast_date: '2026-11-10',
      received_at: '2026-11-12T07:30:00.000Z',
      expiry_date: '2027-02-10',
      initial_qty: 5000,
      remaining_qty: 4500,
      unit_cost_vnd: 155000,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.store02RoastedRobusta01,
      store_id: SEED_IDS.stores.store02,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-S02-RC-ROB-001',
      supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
      moisture_pct: 3.1,
      roast_date: '2026-11-10',
      received_at: '2026-11-12T08:15:00.000Z',
      expiry_date: '2027-02-10',
      initial_qty: 5000,
      remaining_qty: 4800,
      unit_cost_vnd: 155000,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const roastBatches: RoastBatchDto[] = [
    {
      id: SEED_IDS.roastBatches.batchRobusta001,
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-20261110-001',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_lot_id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
      green_input_weight_g: 30000,
      roasted_output_weight_g: 24900,
      weight_loss_pct: 17,
      roast_profile: 'Medium Full City 212C - 14 phút',
      roasted_by: SEED_IDS.users.warehouseManager,
      roasted_at: '2026-11-10T10:30:00.000Z',
      notes: 'Mẻ rang chuẩn định mức hao hụt 17% phục vụ 4 quán và bán sỉ',
    },
  ];

  const posShifts: PosShiftFullDto[] = [
    {
      id: SEED_IDS.posShifts.store01OpenShift,
      store_id: SEED_IDS.stores.store01,
      cashier_id: SEED_IDS.users.cashier01,
      opened_at: BASE_TS,
      closed_at: null,
      opening_cash_vnd: 2000000,
      blind_counted_cash_vnd: null,
      system_expected_cash_vnd: 2145000,
      variance_cash_vnd: null,
      status: 'OPEN',
      notes: 'Ca sáng Quán 1 khởi tạo mặc định',
    },
  ];

  const posOrders: PosOrderFullDto[] = [
    {
      id: SEED_ORDER_IDS.store01SampleOrder,
      order_code: 'POS-S01-20261122-001',
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      cashier_id: SEED_IDS.users.cashier01,
      customer_phone: '0988111222',
      payment_method: 'VIETQR',
      payment_status: 'PAID',
      kds_status: 'QUEUED',
      vietqr_ref_code: 'CF19S01001',
      total_amount_vnd: 58000,
      cogs_amount_vnd: 16500,
      bom_deducted_at: null,
      void_approved_by_manager_id: null,
      void_reason: null,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_ORDER_IDS.store02SampleOrder,
      order_code: 'POS-S02-20261122-001',
      store_id: SEED_IDS.stores.store02,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      cashier_id: SEED_IDS.users.cashier02,
      customer_phone: '0988333444',
      payment_method: 'CASH',
      payment_status: 'PAID',
      kds_status: 'PREPARING',
      vietqr_ref_code: null,
      total_amount_vnd: 70000,
      cogs_amount_vnd: 19200,
      bom_deducted_at: null,
      void_approved_by_manager_id: null,
      void_reason: null,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const posOrderItems: PosOrderItemDto[] = [
    {
      id: SEED_ORDER_ITEM_IDS.store01Item01,
      order_id: SEED_ORDER_IDS.store01SampleOrder,
      store_id: SEED_IDS.stores.store01,
      product_id: SEED_IDS.menuProducts.caPheSuaDa,
      variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
      modifiers_json: [
        {
          id: SEED_IDS.menuModifiers.sugar50,
          name: 'Ít đường (50%)',
          price_delta_vnd: 0,
        },
      ],
      quantity: 2,
      unit_price_vnd: 29000,
      line_total_vnd: 58000,
      notes: 'Ít đá',
      created_at: BASE_TS,
    },
    {
      id: SEED_ORDER_ITEM_IDS.store02Item01,
      order_id: SEED_ORDER_IDS.store02SampleOrder,
      store_id: SEED_IDS.stores.store02,
      product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
      variant_id: SEED_IDS.menuVariants.bacXiuM,
      modifiers_json: [],
      quantity: 2,
      unit_price_vnd: 35000,
      line_total_vnd: 70000,
      notes: null,
      created_at: BASE_TS,
    },
  ];

  const auditLogs: AuditLogDto[] = [];

  return {
    organizations,
    stores,
    users,
    inventoryItems,
    warehouseLots,
    roastBatches,
    posShifts,
    posOrders,
    posOrderItems,
    auditLogs,
  };
}
```

### File 2: `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts`
```ts
import {
  createInitialSeedState,
  type InMemoryDatabaseState,
} from './seedData.js';

let currentState: InMemoryDatabaseState = createInitialSeedState();

export function getInMemoryDb(): InMemoryDatabaseState {
  return currentState;
}

export function resetInMemoryDb(): InMemoryDatabaseState {
  currentState = createInitialSeedState();
  return currentState;
}
```

### File 3: `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.errors.ts`
```ts
export class WarehouseDomainError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'WarehouseDomainError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Maps PostgreSQL PL/pgSQL RPC exception messages from 0003_m2_wms_roastery_fifo_rpcs.sql
 * to consistent HTTP status codes and structured error codes.
 */
export function mapWarehouseRpcError(message: string): WarehouseDomainError {
  const upper = message.toUpperCase();

  if (upper.includes('FIFO_VIOLATION_OLDER_LOT_EXISTS') || upper.includes('FIFO_VIOLATION')) {
    return new WarehouseDomainError(409, 'FIFO_VIOLATION_OLDER_LOT_EXISTS', message);
  }
  if (upper.includes('INSUFFICIENT_GREEN_BEAN_STOCK')) {
    return new WarehouseDomainError(409, 'INSUFFICIENT_GREEN_BEAN_STOCK', message);
  }
  if (upper.includes('INSUFFICIENT_FIFO_STOCK') || upper.includes('INSUFFICIENT_STOCK')) {
    return new WarehouseDomainError(409, 'INSUFFICIENT_FIFO_STOCK', message);
  }
  if (upper.includes('DUPLICATE_LOT_CODE')) {
    return new WarehouseDomainError(409, 'DUPLICATE_LOT_CODE', message);
  }
  if (upper.includes('DUPLICATE_BATCH_CODE')) {
    return new WarehouseDomainError(409, 'DUPLICATE_BATCH_CODE', message);
  }
  if (upper.includes('UNIQUE CONSTRAINT') || upper.includes('DUPLICATE KEY')) {
    return new WarehouseDomainError(409, 'DUPLICATE_RESOURCE', message);
  }
  if (upper.includes('FORBIDDEN_ROLE') || upper.includes('SECURITY_VIOLATION')) {
    return new WarehouseDomainError(403, 'FORBIDDEN_ROLE', message);
  }
  if (upper.includes('NOT_FOUND')) {
    return new WarehouseDomainError(404, 'NOT_FOUND', message);
  }
  if (
    upper.includes('INVALID_') ||
    upper.includes('VALIDATION_ERROR') ||
    upper.includes('DOMAIN_VIOLATION')
  ) {
    return new WarehouseDomainError(400, 'INVALID_WAREHOUSE_REQUEST', message);
  }

  return new WarehouseDomainError(500, 'WAREHOUSE_INTERNAL_ERROR', message);
}
```

### File 4: `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.service.ts`
```ts
import { randomUUID } from 'node:crypto';
import {
  SEED_IDS,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  calculateRoastYieldLossPct,
  calculateRoastedOutputUnitCostVnd,
  compareFifoLots,
  isAbnormalRoastYieldLoss,
  type CompleteRoastBatchDTO,
  type CompleteRoastBatchResultDTO,
  type FifoAllocationRequestDTO,
  type FifoAllocationResultDTO,
  type FifoLotAllocationSliceDTO,
  type IngestWarehouseLotDTO,
  type LotStatus,
  type RoastBatchDto,
  type WarehouseLotFullDto,
  type WarehouseLotIngestResultDTO,
  type WarehouseLotQueryDTO,
  type WarehouseOverviewDTO,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from './warehouse.errors.js';

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assertCentralWarehouseAccess(
  actor: AuthActor,
  warehouseStoreId: string,
): void {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'WAREHOUSE_MANAGER') {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      `Role ${actor.role} is not authorized for Central Warehouse WMS operations`,
    );
  }

  const store = getInMemoryDb().stores.find(
    (s) => s.id === warehouseStoreId && s.is_active,
  );
  if (!store) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Warehouse store ${warehouseStoreId} not found`,
    );
  }
  if (store.type !== 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_WAREHOUSE_STORE',
      `Store ${store.code} is not a CENTRAL_WAREHOUSE`,
    );
  }

  if (
    actor.role === 'WAREHOUSE_MANAGER' &&
    actor.assignedStoreId !== warehouseStoreId
  ) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      'WAREHOUSE_MANAGER can only operate on their assigned Central Warehouse',
    );
  }
}

export async function getOverview(
  warehouseStoreId: string = SEED_IDS.stores.centralWarehouse,
): Promise<WarehouseOverviewDTO> {
  const db = getInMemoryDb();
  const warehouse = db.stores.find(
    (s) => s.id === warehouseStoreId && s.is_active,
  );
  if (!warehouse || warehouse.type !== 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Central Warehouse ${warehouseStoreId} not found`,
    );
  }

  const availableLots = db.warehouseLots.filter(
    (lot) =>
      lot.store_id === warehouseStoreId &&
      lot.status === 'AVAILABLE' &&
      lot.remaining_qty > 0,
  );

  let totalInventoryValueVnd = 0;
  let lowStockSkuCount = 0;

  const stockSummaries: WarehouseStockSummaryDTO[] = db.inventoryItems
    .filter((item) => item.is_active)
    .map((item) => {
      const itemLots = availableLots.filter((lot) => lot.item_id === item.id);
      const totalAvailableQty = roundQty2(
        itemLots.reduce((sum, lot) => sum + lot.remaining_qty, 0),
      );
      const estimatedStockValueVnd = Math.round(
        totalAvailableQty * item.moving_avg_cost_vnd,
      );
      const isLowStock = totalAvailableQty < item.min_stock_threshold;

      totalInventoryValueVnd += estimatedStockValueVnd;
      if (isLowStock) {
        lowStockSkuCount += 1;
      }

      return {
        item_id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        base_unit: item.base_unit,
        min_stock_threshold: item.min_stock_threshold,
        total_available_qty: totalAvailableQty,
        available_lot_count: itemLots.length,
        moving_avg_cost_vnd: item.moving_avg_cost_vnd,
        estimated_stock_value_vnd: estimatedStockValueVnd,
        is_low_stock: isLowStock,
      };
    });

  const recentRoastBatchesCount = db.roastBatches.filter(
    (b) => b.warehouse_store_id === warehouseStoreId,
  ).length;

  return {
    warehouse_store_id: warehouse.id,
    warehouse_code: warehouse.code,
    warehouse_name: warehouse.name,
    total_skus: stockSummaries.length,
    total_available_lots: availableLots.length,
    low_stock_sku_count: lowStockSkuCount,
    total_inventory_value_vnd: totalInventoryValueVnd,
    recent_roast_batches_count: recentRoastBatchesCount,
    stock_summaries: stockSummaries,
  };
}

export async function listLots(
  query: WarehouseLotQueryDTO = {},
): Promise<WarehouseLotFullDto[]> {
  const targetStoreId =
    query.warehouse_store_id ?? SEED_IDS.stores.centralWarehouse;

  return getInMemoryDb()
    .warehouseLots.filter((lot) => {
      if (lot.store_id !== targetStoreId) {
        return false;
      }
      if (query.item_id && lot.item_id !== query.item_id) {
        return false;
      }
      if (query.status && lot.status !== query.status) {
        return false;
      }
      if (
        query.only_available &&
        (lot.status !== 'AVAILABLE' || lot.remaining_qty <= 0)
      ) {
        return false;
      }
      return true;
    })
    .sort(compareFifoLots)
    .map((lot) => structuredClone(lot));
}

export async function listRoastBatches(
  warehouseStoreId: string = SEED_IDS.stores.centralWarehouse,
): Promise<RoastBatchDto[]> {
  return getInMemoryDb()
    .roastBatches.filter((batch) => batch.warehouse_store_id === warehouseStoreId)
    .sort((a, b) => b.roasted_at.localeCompare(a.roasted_at))
    .map((batch) => structuredClone(batch));
}

export async function ingestLot(
  actor: AuthActor,
  input: IngestWarehouseLotDTO,
): Promise<WarehouseLotIngestResultDTO> {
  assertCentralWarehouseAccess(actor, input.warehouse_store_id);

  const db = getInMemoryDb();
  const item = db.inventoryItems.find(
    (i) => i.id === input.item_id && i.is_active,
  );
  if (!item) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Active inventory item ${input.item_id} not found`,
    );
  }

  const normalizedLotCode = input.lot_code.trim();
  const duplicateLot = db.warehouseLots.find(
    (lot) =>
      lot.store_id === input.warehouse_store_id &&
      lot.lot_code === normalizedLotCode,
  );
  if (duplicateLot) {
    throw new WarehouseDomainError(
      409,
      'DUPLICATE_LOT_CODE',
      `Lot code ${normalizedLotCode} already exists in this warehouse`,
    );
  }

  const previousQty = roundQty2(
    db.warehouseLots
      .filter(
        (lot) =>
          lot.store_id === input.warehouse_store_id &&
          lot.item_id === input.item_id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .reduce((sum, lot) => sum + lot.remaining_qty, 0),
  );
  const previousMacVnd = item.moving_avg_cost_vnd;

  const effectiveUnitCostVnd = calculateEffectiveLotUnitCostVnd(
    input.unit_cost_vnd,
    input.shipping_cost_vnd,
    input.initial_qty,
  );
  const newMacVnd = calculateMovingAverageCostVnd(
    previousQty,
    previousMacVnd,
    input.initial_qty,
    effectiveUnitCostVnd,
  );

  const nowIso = new Date().toISOString();
  const newLot: WarehouseLotFullDto = {
    id: randomUUID(),
    store_id: input.warehouse_store_id,
    item_id: input.item_id,
    lot_code: normalizedLotCode,
    supplier_name: input.supplier_name ?? null,
    moisture_pct: input.moisture_pct ?? null,
    roast_date: input.roast_date ?? null,
    received_at: nowIso,
    expiry_date: input.expiry_date ?? null,
    initial_qty: input.initial_qty,
    remaining_qty: input.initial_qty,
    unit_cost_vnd: effectiveUnitCostVnd,
    shipping_cost_vnd: input.shipping_cost_vnd,
    status: 'AVAILABLE',
    created_at: nowIso,
    updated_at: nowIso,
  };

  db.warehouseLots.push(newLot);
  item.moving_avg_cost_vnd = newMacVnd;
  item.updated_at = nowIso;

  recordAuditLog({
    actorId: actor.id,
    storeId: input.warehouse_store_id,
    action: 'M2_WAREHOUSE_LOT_INGESTED',
    targetTable: 'warehouse_lots',
    targetId: newLot.id,
    reason: 'Central Warehouse lot ingestion with MAC recalculation',
    payload: {
      sku: item.sku,
      lot_code: newLot.lot_code,
      initial_qty: input.initial_qty,
      raw_unit_cost_vnd: input.unit_cost_vnd,
      shipping_cost_vnd: input.shipping_cost_vnd,
      effective_unit_cost_vnd: effectiveUnitCostVnd,
      previous_qty: previousQty,
      previous_mac_vnd: previousMacVnd,
      new_mac_vnd: newMacVnd,
    },
  });

  return {
    lot: structuredClone(newLot),
    item_id: item.id,
    previous_qty: previousQty,
    previous_mac_vnd: previousMacVnd,
    effective_unit_cost_vnd: effectiveUnitCostVnd,
    new_mac_vnd: newMacVnd,
  };
}

export async function completeRoastBatch(
  actor: AuthActor,
  input: CompleteRoastBatchDTO,
): Promise<CompleteRoastBatchResultDTO> {
  assertCentralWarehouseAccess(actor, input.warehouse_store_id);

  const db = getInMemoryDb();
  const normalizedBatchCode = input.batch_code.trim();
  const normalizedOutputLotCode = input.output_lot_code.trim();

  if (db.roastBatches.some((b) => b.batch_code === normalizedBatchCode)) {
    throw new WarehouseDomainError(
      409,
      'DUPLICATE_BATCH_CODE',
      `Roast batch code ${normalizedBatchCode} already exists`,
    );
  }

  if (
    db.warehouseLots.some(
      (lot) =>
        lot.store_id === input.warehouse_store_id &&
        lot.lot_code === normalizedOutputLotCode,
    )
  ) {
    throw new WarehouseDomainError(
      409,
      'DUPLICATE_LOT_CODE',
      `Output lot code ${normalizedOutputLotCode} already exists in this warehouse`,
    );
  }

  const sourceLot = db.warehouseLots.find(
    (lot) =>
      lot.id === input.source_green_lot_id &&
      lot.store_id === input.warehouse_store_id,
  );
  if (!sourceLot) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Source green bean lot ${input.source_green_lot_id} not found in warehouse`,
    );
  }

  const sourceItem = db.inventoryItems.find((i) => i.id === sourceLot.item_id);
  if (!sourceItem || sourceItem.category !== 'GREEN_BEAN') {
    throw new WarehouseDomainError(
      400,
      'INVALID_SOURCE_ITEM_CATEGORY',
      'Source lot must belong to a GREEN_BEAN item',
    );
  }

  if (
    sourceLot.status !== 'AVAILABLE' ||
    sourceLot.remaining_qty < input.green_input_weight_g
  ) {
    throw new WarehouseDomainError(
      409,
      'INSUFFICIENT_GREEN_BEAN_STOCK',
      `Source lot ${sourceLot.lot_code} has remaining_qty=${sourceLot.remaining_qty}, requested=${input.green_input_weight_g}`,
    );
  }

  const outputItem = db.inventoryItems.find(
    (i) => i.id === input.output_item_id && i.is_active,
  );
  if (!outputItem || outputItem.category !== 'ROASTED_COFFEE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_OUTPUT_ITEM_CATEGORY',
      'Output item must be an active ROASTED_COFFEE SKU',
    );
  }

  if (input.enforce_fifo !== false) {
    const oldestGreenLot = db.warehouseLots
      .filter(
        (lot) =>
          lot.store_id === input.warehouse_store_id &&
          lot.item_id === sourceLot.item_id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .sort(compareFifoLots)[0];

    if (oldestGreenLot && oldestGreenLot.id !== sourceLot.id) {
      throw new WarehouseDomainError(
        409,
        'FIFO_VIOLATION_OLDER_LOT_EXISTS',
        `FIFO violation: older green bean lot ${oldestGreenLot.lot_code} must be roasted before ${sourceLot.lot_code}`,
      );
    }
  }

  const weightLossPct = calculateRoastYieldLossPct(
    input.green_input_weight_g,
    input.roasted_output_weight_g,
  );
  const isAbnormalLoss = isAbnormalRoastYieldLoss(weightLossPct);
  const outputUnitCostVnd = calculateRoastedOutputUnitCostVnd(
    input.green_input_weight_g,
    sourceLot.unit_cost_vnd,
    input.roasted_output_weight_g,
  );

  const nowIso = new Date().toISOString();
  const effectiveRoastDate = input.roast_date ?? nowIso.slice(0, 10);
  const effectiveExpiryDate =
    input.expiry_date ?? addDaysToIsoDate(effectiveRoastDate, 90);

  const sourceRemainingAfter = roundQty2(
    sourceLot.remaining_qty - input.green_input_weight_g,
  );
  const sourceStatusAfter: LotStatus =
    sourceRemainingAfter === 0 ? 'DEPLETED' : 'AVAILABLE';

  sourceLot.remaining_qty = sourceRemainingAfter;
  sourceLot.status = sourceStatusAfter;
  sourceLot.updated_at = nowIso;

  const oldOutputQty = roundQty2(
    db.warehouseLots
      .filter(
        (lot) =>
          lot.store_id === input.warehouse_store_id &&
          lot.item_id === outputItem.id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .reduce((sum, lot) => sum + lot.remaining_qty, 0),
  );
  const newOutputItemMacVnd = calculateMovingAverageCostVnd(
    oldOutputQty,
    outputItem.moving_avg_cost_vnd,
    input.roasted_output_weight_g,
    outputUnitCostVnd,
  );

  const outputLot: WarehouseLotFullDto = {
    id: randomUUID(),
    store_id: input.warehouse_store_id,
    item_id: outputItem.id,
    lot_code: normalizedOutputLotCode,
    supplier_name: 'Xưởng Rang Nội Bộ CF19',
    moisture_pct: input.moisture_pct ?? null,
    roast_date: effectiveRoastDate,
    received_at: nowIso,
    expiry_date: effectiveExpiryDate,
    initial_qty: input.roasted_output_weight_g,
    remaining_qty: input.roasted_output_weight_g,
    unit_cost_vnd: outputUnitCostVnd,
    shipping_cost_vnd: 0,
    status: 'AVAILABLE',
    created_at: nowIso,
    updated_at: nowIso,
  };

  db.warehouseLots.push(outputLot);
  outputItem.moving_avg_cost_vnd = newOutputItemMacVnd;
  outputItem.updated_at = nowIso;

  const roastBatch: RoastBatchDto = {
    id: randomUUID(),
    warehouse_store_id: input.warehouse_store_id,
    batch_code: normalizedBatchCode,
    source_green_lot_id: sourceLot.id,
    output_lot_id: outputLot.id,
    green_input_weight_g: input.green_input_weight_g,
    roasted_output_weight_g: input.roasted_output_weight_g,
    weight_loss_pct: weightLossPct,
    roast_profile: input.roast_profile ?? null,
    roasted_by: actor.id,
    roasted_at: nowIso,
    notes: input.notes ?? null,
  };

  db.roastBatches.push(roastBatch);

  recordAuditLog({
    actorId: actor.id,
    storeId: input.warehouse_store_id,
    action: isAbnormalLoss
      ? 'M2_ROAST_BATCH_ABNORMAL_LOSS'
      : 'M2_ROAST_BATCH_COMPLETED',
    targetTable: 'roast_batches',
    targetId: roastBatch.id,
    reason: input.notes ?? 'Roast batch completed with FIFO lock & cost transfer',
    payload: {
      batch_code: roastBatch.batch_code,
      source_green_lot_code: sourceLot.lot_code,
      output_lot_code: outputLot.lot_code,
      weight_loss_pct: weightLossPct,
      is_abnormal_yield_loss: isAbnormalLoss,
      output_unit_cost_vnd: outputUnitCostVnd,
      new_output_item_mac_vnd: newOutputItemMacVnd,
    },
  });

  return {
    roast_batch: structuredClone(roastBatch),
    output_lot: structuredClone(outputLot),
    source_lot_id: sourceLot.id,
    source_lot_remaining_qty: sourceRemainingAfter,
    source_lot_status: sourceStatusAfter,
    weight_loss_pct: weightLossPct,
    is_abnormal_yield_loss: isAbnormalLoss,
    output_unit_cost_vnd: outputUnitCostVnd,
    new_output_item_mac_vnd: newOutputItemMacVnd,
  };
}

export async function allocateFifoStock(
  actor: AuthActor,
  input: FifoAllocationRequestDTO & { dry_run?: boolean },
): Promise<FifoAllocationResultDTO> {
  assertCentralWarehouseAccess(actor, input.warehouse_store_id);

  const db = getInMemoryDb();
  const item = db.inventoryItems.find(
    (i) => i.id === input.item_id && i.is_active,
  );
  if (!item) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Active inventory item ${input.item_id} not found`,
    );
  }

  const candidateLots = db.warehouseLots
    .filter(
      (lot) =>
        lot.store_id === input.warehouse_store_id &&
        lot.item_id === input.item_id &&
        lot.status === 'AVAILABLE' &&
        lot.remaining_qty > 0,
    )
    .sort(compareFifoLots);

  const totalAvailable = roundQty2(
    candidateLots.reduce((sum, lot) => sum + lot.remaining_qty, 0),
  );
  if (totalAvailable < input.requested_qty) {
    throw new WarehouseDomainError(
      409,
      'INSUFFICIENT_FIFO_STOCK',
      `Insufficient FIFO stock for ${item.sku}: requested ${input.requested_qty}, available ${totalAvailable}`,
    );
  }

  let remainingToAllocate = input.requested_qty;
  let totalCogsVnd = 0;
  const allocations: FifoLotAllocationSliceDTO[] = [];
  const nowIso = new Date().toISOString();
  const isDryRun = Boolean(input.dry_run);

  for (const lot of candidateLots) {
    if (remainingToAllocate <= 0) {
      break;
    }

    const allocatedQty = roundQty2(Math.min(lot.remaining_qty, remainingToAllocate));
    const remainingAfterQty = roundQty2(lot.remaining_qty - allocatedQty);
    const lotStatusAfter: LotStatus =
      remainingAfterQty === 0 ? 'DEPLETED' : 'AVAILABLE';
    const sliceCogsVnd = Math.round(allocatedQty * lot.unit_cost_vnd);

    if (!isDryRun) {
      lot.remaining_qty = remainingAfterQty;
      lot.status = lotStatusAfter;
      lot.updated_at = nowIso;
    }

    totalCogsVnd += sliceCogsVnd;
    allocations.push({
      lot_id: lot.id,
      lot_code: lot.lot_code,
      roast_date: lot.roast_date,
      received_at: lot.received_at,
      allocated_qty: allocatedQty,
      remaining_after_qty: remainingAfterQty,
      lot_status_after: lotStatusAfter,
      unit_cost_vnd: lot.unit_cost_vnd,
      slice_cogs_vnd: sliceCogsVnd,
    });

    remainingToAllocate = roundQty2(remainingToAllocate - allocatedQty);
  }

  const weightedUnitCostVnd = Math.round(totalCogsVnd / input.requested_qty);

  if (!isDryRun) {
    recordAuditLog({
      actorId: actor.id,
      storeId: input.warehouse_store_id,
      action: 'M2_FIFO_STOCK_ALLOCATED',
      targetTable: 'warehouse_lots',
      targetId: item.id,
      reason: input.reason ?? 'Multi-lot FIFO stock allocation',
      payload: {
        sku: item.sku,
        reference_code: input.reference_code ?? null,
        requested_qty: input.requested_qty,
        total_cogs_vnd: totalCogsVnd,
        weighted_unit_cost_vnd: weightedUnitCostVnd,
        allocations,
      },
    });
  }

  return {
    warehouse_store_id: input.warehouse_store_id,
    item_id: input.item_id,
    requested_qty: input.requested_qty,
    total_allocated_qty: input.requested_qty,
    total_cogs_vnd: totalCogsVnd,
    weighted_unit_cost_vnd: weightedUnitCostVnd,
    reference_code: input.reference_code ?? null,
    allocations,
  };
}
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M2.2 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\db\seedData.ts','C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts','C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.errors.ts','C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.service.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# WAREHOUSE ROUTES, APP MOUNT & BỘ SUPERTEST 19 KỊCH BẢN M2.2 (3 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 3 file dưới đây: `warehouse.routes.ts`, cập nhật `index.ts` để mount `/api/v1/warehouse`, và bộ 19 Vitest + Supertest Integration Tests `m2-wms-roastery-fifo.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không rút gọn test cases, không đổi route paths hay status codes.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 3 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 3 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M2.2 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (3 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.routes.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\api\src\__tests__\m2-wms-roastery-fifo.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  CompleteRoastBatchSchema,
  FifoAllocationRequestSchema,
  IngestWarehouseLotSchema,
  WarehouseLotQuerySchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from './warehouse.errors.js';
import {
  allocateFifoStock,
  completeRoastBatch,
  getOverview,
  ingestLot,
  listLots,
  listRoastBatches,
} from './warehouse.service.js';

export const warehouseRouter = Router();

const AllocateRequestWithDryRunSchema = FifoAllocationRequestSchema.extend({
  dry_run: z.boolean().optional().default(false),
});

warehouseRouter.use(
  authenticate,
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER'),
  sanitizeCostFields(),
);

function handleWarehouseError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Unexpected warehouse error';
  res.status(500).json({
    error: {
      code: 'WAREHOUSE_INTERNAL_ERROR',
      message,
    },
  });
}

warehouseRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const storeId =
      typeof req.query.warehouse_store_id === 'string'
        ? req.query.warehouse_store_id
        : undefined;
    const overview = await getOverview(storeId);
    res.status(200).json({ data: overview });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.get('/lots', async (req: Request, res: Response) => {
  const parsed = WarehouseLotQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_WAREHOUSE_QUERY',
        message: 'Invalid warehouse lot query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const lots = await listLots(parsed.data);
    res.status(200).json({ data: lots });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.post('/lots/ingest', async (req: Request, res: Response) => {
  const parsed = IngestWarehouseLotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_WAREHOUSE_PAYLOAD',
        message: 'Invalid warehouse lot ingestion payload',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const result = await ingestLot(req.actor!, parsed.data);
    res.status(201).json({ data: result });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.get('/roast-batches', async (req: Request, res: Response) => {
  try {
    const storeId =
      typeof req.query.warehouse_store_id === 'string'
        ? req.query.warehouse_store_id
        : undefined;
    const batches = await listRoastBatches(storeId);
    res.status(200).json({ data: batches });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.post('/roast-batches', async (req: Request, res: Response) => {
  const parsed = CompleteRoastBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_ROAST_BATCH_PAYLOAD',
        message: 'Invalid roast batch completion payload',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const result = await completeRoastBatch(req.actor!, parsed.data);
    res.status(201).json({ data: result });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.post('/fifo/allocate', async (req: Request, res: Response) => {
  const parsed = AllocateRequestWithDryRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_FIFO_ALLOCATION_PAYLOAD',
        message: 'Invalid FIFO allocation request payload',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const result = await allocateFifoStock(req.actor!, parsed.data);
    res.status(200).json({
      data: result,
      meta: {
        dry_run: parsed.data.dry_run,
      },
    });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});
```

### File 2: `C:\bib\cf_19\apps\api\src\index.ts`
```ts
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { dbMode, env } from './config/env.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';
import { warehouseRouter } from './modules/warehouse/warehouse.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: '@cf19/api',
      db_mode: dbMode,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/stores', storesRouter);
  app.use('/api/v1/audit-logs', auditRouter);
  app.use('/api/v1/warehouse', warehouseRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Requested endpoint does not exist',
      },
    });
  });

  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ): void => {
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            env.NODE_ENV === 'production'
              ? 'An unexpected error occurred'
              : err.message,
        },
      });
    },
  );

  return app;
}

export const app = createApp();

const isTestEnv =
  env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

if (!isTestEnv) {
  app.listen(env.PORT, () => {
    console.log(
      `[@cf19/api] running on http://localhost:${env.PORT} (mode=${dbMode})`,
    );
  });
}
```

### File 3: `C:\bib\cf_19\apps\api\src\__tests__\m2-wms-roastery-fifo.test.ts`
```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS } from '@cf19/shared';
import { resetInMemoryDb } from '../db/inMemoryDb.js';
import { app } from '../index.js';
import { mapWarehouseRpcError } from '../modules/warehouse/warehouse.errors.js';

function authAs(userId: string): Record<string, string> {
  return { Authorization: `Bearer dev:${userId}` };
}

describe('M2.2 — @cf19/api WMS Core Engine, MAC Costing, Roastery Lifecycle & Multi-Lot FIFO', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. blocks STORE_MANAGER from accessing /api/v1/warehouse/overview (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .get('/api/v1/warehouse/overview')
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('2. blocks CASHIER_STAFF and BARISTA_KDS from warehouse lots & FIFO endpoints (403 FORBIDDEN_ROLE)', async () => {
    const cashierRes = await request(app)
      .get('/api/v1/warehouse/lots')
      .set(authAs(SEED_IDS.users.cashier01));
    expect(cashierRes.status).toBe(403);
    expect(cashierRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const baristaRes = await request(app)
      .post('/api/v1/warehouse/fifo/allocate')
      .set(authAs(SEED_IDS.users.barista01))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        requested_qty: 1000,
      });
    expect(baristaRes.status).toBe(403);
    expect(baristaRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('3. GET /api/v1/warehouse/overview returns stock summaries, available lots count & roast batch count', async () => {
    const res = await request(app)
      .get('/api/v1/warehouse/overview')
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(200);
    expect(res.body.data.warehouse_code).toBe('CW-TAYNGUYEN');
    expect(res.body.data.total_skus).toBe(8);
    expect(res.body.data.total_available_lots).toBe(3);
    expect(res.body.data.recent_roast_batches_count).toBe(1);
    expect(res.body.data.total_inventory_value_vnd).toBeGreaterThan(0);
  });

  it('4. GET /api/v1/warehouse/lots returns Central Warehouse lots ordered strictly FIFO with cost fields', async () => {
    const res = await request(app)
      .get(
        `/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}&only_available=true`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].lot_code).toBe('LOT-CW-RC-ROB-001');
    expect(res.body.data[1].lot_code).toBe('LOT-CW-RC-ROB-002');
    expect(res.body.data[0].unit_cost_vnd).toBe(124500);
  });

  it('5. GET /api/v1/warehouse/roast-batches returns seeded roast batch history', async () => {
    const res = await request(app)
      .get('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].batch_code).toBe('RB-20261110-001');
    expect(res.body.data[0].weight_loss_pct).toBe(17);
  });

  it('6. POST /api/v1/warehouse/lots/ingest amortizes shipping cost, updates MAC and writes audit log', async () => {
    // Existing GB-ROB-TN at CW: 90,000g @ MAC 98,000 VND
    // Ingest new lot: 30,000g @ 105,000 VND + shipping 150,000 VND -> +5 VND/g -> effective 105,005 VND
    // New MAC = ROUND((90000*98000 + 30000*105005) / 120000) = ROUND(99751.25) = 99751
    const res = await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-ROB-002',
        supplier_name: 'Nông Trường Krông Pắc',
        moisture_pct: 11.8,
        initial_qty: 30000,
        unit_cost_vnd: 105000,
        shipping_cost_vnd: 150000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.effective_unit_cost_vnd).toBe(105005);
    expect(res.body.data.previous_qty).toBe(90000);
    expect(res.body.data.previous_mac_vnd).toBe(98000);
    expect(res.body.data.new_mac_vnd).toBe(99751);
    expect(res.body.data.lot.unit_cost_vnd).toBe(105005);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M2_WAREHOUSE_LOT_INGESTED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
    expect(auditRes.body.data[0].payload_json.new_mac_vnd).toBe(99751);
  });

  it('7. POST /api/v1/warehouse/lots/ingest rejects duplicate lot_code with 409 DUPLICATE_LOT_CODE', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-ROB-001',
        initial_qty: 10000,
        unit_cost_vnd: 95000,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_LOT_CODE');
  });

  it('8. POST /api/v1/warehouse/lots/ingest rejects floating-point VND or non-positive qty with 400', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-BAD-001',
        initial_qty: 10000,
        unit_cost_vnd: 95000.25,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_WAREHOUSE_PAYLOAD');
  });

  it('9. POST /api/v1/warehouse/roast-batches blocks roasting newer green lot while older lot still has stock (409 FIFO_VIOLATION_OLDER_LOT_EXISTS)', async () => {
    const ingestRes = await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-ROB-NEW',
        initial_qty: 50000,
        unit_cost_vnd: 100000,
      });
    const newerGreenLotId = ingestRes.body.data.lot.id as string;

    const roastRes = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-FIFO-BLOCK-01',
        source_green_lot_id: newerGreenLotId,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-BLOCK-01',
        green_input_weight_g: 10000,
        roasted_output_weight_g: 8300,
      });

    expect(roastRes.status).toBe(409);
    expect(roastRes.body.error.code).toBe('FIFO_VIOLATION_OLDER_LOT_EXISTS');
  });

  it('10. POST /api/v1/warehouse/roast-batches allows explicit FIFO override when enforce_fifo is false', async () => {
    const ingestRes = await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-ROB-OVERRIDE',
        initial_qty: 20000,
        unit_cost_vnd: 100000,
      });
    const newerGreenLotId = ingestRes.body.data.lot.id as string;

    const roastRes = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-FIFO-OVERRIDE-01',
        source_green_lot_id: newerGreenLotId,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-OVERRIDE-01',
        green_input_weight_g: 10000,
        roasted_output_weight_g: 8400,
        enforce_fifo: false,
      });

    expect(roastRes.status).toBe(201);
    expect(roastRes.body.data.weight_loss_pct).toBe(16);
    expect(roastRes.body.data.is_abnormal_yield_loss).toBe(false);
  });

  it('11. POST /api/v1/warehouse/roast-batches completes normal roast batch, transfers cost, updates roasted MAC & logs audit', async () => {
    // Source LOT-CW-GB-ROB-001: 90,000g @ 95,000 VND
    // Input 30,000g -> Output 24,900g (17.00% loss)
    // output_unit_cost_vnd = ROUND(30000 * 95000 / 24900) = 114458
    const res = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-20261122-001',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-ROB-003',
        green_input_weight_g: 30000,
        roasted_output_weight_g: 24900,
        roast_date: '2026-11-22',
        roast_profile: 'Medium City 210C',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.weight_loss_pct).toBe(17);
    expect(res.body.data.is_abnormal_yield_loss).toBe(false);
    expect(res.body.data.output_unit_cost_vnd).toBe(114458);
    expect(res.body.data.source_lot_remaining_qty).toBe(60000);
    expect(res.body.data.source_lot_status).toBe('AVAILABLE');
    expect(res.body.data.output_lot.lot_code).toBe('LOT-CW-RC-ROB-003');
    // Existing RC-ROB-MED: 44,900g @ MAC 125,000 + 24,900g @ 114,458 -> ROUND(121239.32) = 121239
    expect(res.body.data.new_output_item_mac_vnd).toBe(121239);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M2_ROAST_BATCH_COMPLETED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });

  it('12. POST /api/v1/warehouse/roast-batches flags abnormal yield loss (<12% or >20%) and writes ABNORMAL_LOSS audit log', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-ABNORMAL-01',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-ABNORMAL-01',
        green_input_weight_g: 10000,
        roasted_output_weight_g: 7500, // 25% loss > 20%
      });

    expect(res.status).toBe(201);
    expect(res.body.data.weight_loss_pct).toBe(25);
    expect(res.body.data.is_abnormal_yield_loss).toBe(true);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M2_ROAST_BATCH_ABNORMAL_LOSS')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
    expect(auditRes.body.data[0].payload_json.is_abnormal_yield_loss).toBe(true);
  });

  it('13. POST /api/v1/warehouse/roast-batches transitions source green lot to DEPLETED when remaining hits 0', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-DEPLETE-ALL',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-DEPLETE-ALL',
        green_input_weight_g: 90000,
        roasted_output_weight_g: 74700, // 17% loss
      });

    expect(res.status).toBe(201);
    expect(res.body.data.source_lot_remaining_qty).toBe(0);
    expect(res.body.data.source_lot_status).toBe('DEPLETED');
  });

  it('14. POST /api/v1/warehouse/roast-batches rejects when green_input_weight_g exceeds lot stock (409 INSUFFICIENT_GREEN_BEAN_STOCK)', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-OVERSTOCK-01',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-OVERSTOCK',
        green_input_weight_g: 95000,
        roasted_output_weight_g: 78000,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_GREEN_BEAN_STOCK');
  });

  it('15. POST /api/v1/warehouse/roast-batches rejects duplicate batch_code (409) and roasted > green (400)', async () => {
    const dupRes = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-20261110-001',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-UNIQUE-99',
        green_input_weight_g: 10000,
        roasted_output_weight_g: 8300,
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_BATCH_CODE');

    const badWeightRes = await request(app)
      .post('/api/v1/warehouse/roast-batches')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-PHYSICS-ERR',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-PHYSICS',
        green_input_weight_g: 10000,
        roasted_output_weight_g: 10500,
      });
    expect(badWeightRes.status).toBe(400);
    expect(badWeightRes.body.error.code).toBe('INVALID_ROAST_BATCH_PAYLOAD');
  });

  it('16. POST /api/v1/warehouse/fifo/allocate (dry_run: true) previews multi-lot FIFO slices without mutating stock', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/fifo/allocate')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        requested_qty: 30000,
        reference_code: 'PREVIEW-TRF-01',
        dry_run: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.meta.dry_run).toBe(true);
    expect(res.body.data.allocations).toHaveLength(2);
    expect(res.body.data.allocations[0].lot_code).toBe('LOT-CW-RC-ROB-001');
    expect(res.body.data.allocations[0].allocated_qty).toBe(24900);
    expect(res.body.data.allocations[1].lot_code).toBe('LOT-CW-RC-ROB-002');
    expect(res.body.data.allocations[1].allocated_qty).toBe(5100);

    // Verify stock was NOT mutated
    const lotsRes = await request(app)
      .get(
        `/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(lotsRes.body.data[0].remaining_qty).toBe(24900);
    expect(lotsRes.body.data[1].remaining_qty).toBe(20000);
  });

  it('17. POST /api/v1/warehouse/fifo/allocate (dry_run: false) depletes oldest lot, slices second lot, calculates exact COGS & writes audit log', async () => {
    // 24900 * 124500 = 3,100,050,000
    // 5100  * 126000 =   642,600,000
    // Total COGS     = 3,742,650,000 ; Weighted unit cost = ROUND(3742650000 / 30000) = 124755
    const res = await request(app)
      .post('/api/v1/warehouse/fifo/allocate')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        requested_qty: 30000,
        reference_code: 'TRF-20261122-005',
        dry_run: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.meta.dry_run).toBe(false);
    expect(res.body.data.total_cogs_vnd).toBe(3742650000);
    expect(res.body.data.weighted_unit_cost_vnd).toBe(124755);
    expect(res.body.data.allocations[0].lot_status_after).toBe('DEPLETED');
    expect(res.body.data.allocations[0].remaining_after_qty).toBe(0);
    expect(res.body.data.allocations[1].lot_status_after).toBe('AVAILABLE');
    expect(res.body.data.allocations[1].remaining_after_qty).toBe(14900);

    const lotsRes = await request(app)
      .get(
        `/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(lotsRes.body.data[0].status).toBe('DEPLETED');
    expect(lotsRes.body.data[0].remaining_qty).toBe(0);
    expect(lotsRes.body.data[1].remaining_qty).toBe(14900);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M2_FIFO_STOCK_ALLOCATED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });

  it('18. POST /api/v1/warehouse/fifo/allocate rejects over-allocation (409 INSUFFICIENT_FIFO_STOCK) atomically without partial deduction', async () => {
    const res = await request(app)
      .post('/api/v1/warehouse/fifo/allocate')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        requested_qty: 50000, // Total available is 44,900
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_FIFO_STOCK');

    const lotsRes = await request(app)
      .get(
        `/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(lotsRes.body.data[0].remaining_qty).toBe(24900);
    expect(lotsRes.body.data[1].remaining_qty).toBe(20000);
  });

  it('19. mapWarehouseRpcError accurately maps PL/pgSQL RPC errors to 409, 403, 404, 400 and 500 status codes', () => {
    expect(mapWarehouseRpcError('FIFO_VIOLATION: older lot exists').statusCode).toBe(409);
    expect(mapWarehouseRpcError('INSUFFICIENT_GREEN_BEAN_STOCK: empty').statusCode).toBe(409);
    expect(mapWarehouseRpcError('INSUFFICIENT_FIFO_STOCK: shortage').statusCode).toBe(409);
    expect(mapWarehouseRpcError('duplicate key value violates unique constraint').statusCode).toBe(409);
    expect(mapWarehouseRpcError('SECURITY_VIOLATION: forbidden').statusCode).toBe(403);
    expect(mapWarehouseRpcError('NOT_FOUND: missing item').statusCode).toBe(404);
    expect(mapWarehouseRpcError('VALIDATION_ERROR: bad qty').statusCode).toBe(400);
    expect(mapWarehouseRpcError('unexpected crash').statusCode).toBe(500);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 3 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M2.2 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\modules\warehouse\warehouse.routes.ts','C:\bib\cf_19\apps\api\src\index.ts','C:\bib\cf_19\apps\api\src\__tests__\m2-wms-roastery-fifo.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
