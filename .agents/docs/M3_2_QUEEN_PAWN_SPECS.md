# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M3.2 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **8 files (4 + 4)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1–M1.3, M2.1–M2.3, M3.1 (`0004` SQL RPCs + `@cf19/shared` M3 schemas, types & `b2bAndTransferMath.ts`).
- **Cam kết tương thích ngược:** Giữ nguyên 100% dữ liệu M1.2 & M2.2 trong `seedData.ts` để toàn bộ **37/37 tests của M1.2 + M2.2** tiếp tục PASS tuyệt đối!

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# MỞ RỘNG SEED STORE, B2B SERVICE & B2B ROUTES (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây cho tầng DB In-Memory và phân hệ Bán sỉ B2B (`modules/b2b/*`) của `@cf19/api`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thay đổi tên hàm, mã lỗi hay đuôi `.js` trong import ESM.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `modules/transfers/*`, `index.ts`, hay `m3-b2b-transfers.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M3.2 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật — Overwrite)
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\api\src\modules\b2b\b2b.service.ts` (Tạo mới)
4. `C:\bib\cf_19\apps\api\src\modules\b2b\b2b.routes.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\src\db\seedData.ts`
```ts
import {
  SEED_IDS,
  type AuditLogDto,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
  type B2bOrderItemDto,
  type B2bPriceTierDto,
  type EmploymentType,
  type InternalTransferDto,
  type InternalTransferItemDto,
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

export const SEED_B2B_ORDER_IDS = {
  phoNuiPendingOrder: '92000000-0000-4000-8000-000000000001',
} as const;

export const SEED_TRANSFER_ITEM_IDS = {
  store01InitialItem01: '93000000-0000-4000-8000-000000000001',
} as const;

export interface InMemoryDatabaseState {
  organizations: OrganizationDto[];
  stores: StoreDto[];
  users: StoredUserRecord[];
  inventoryItems: WarehouseInventoryItemDto[];
  warehouseLots: WarehouseLotFullDto[];
  roastBatches: RoastBatchDto[];
  b2bCustomers: B2bCustomerDto[];
  b2bPriceTiers: B2bPriceTierDto[];
  b2bOrders: B2bOrderDto[];
  b2bOrderItems: B2bOrderItemDto[];
  b2bDebtLedger: B2bDebtLedgerEntryDto[];
  internalTransfers: InternalTransferDto[];
  internalTransferItems: InternalTransferItemDto[];
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

  const b2bCustomers: B2bCustomerDto[] = [
    {
      id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      organization_id: SEED_IDS.organization.cf19,
      code: 'B2B-001',
      name: 'Nguyễn Thành Nam',
      shop_name: 'Quán Cà Phê Phố Núi',
      phone: '0912345001',
      address: '42 Quang Trung, Thị Trấn',
      price_tier: 'TIER_2',
      credit_limit_vnd: 50000000,
      current_debt_vnd: 12500000,
      payment_term_days: 15,
      is_active: true,
    },
    {
      id: SEED_IDS.b2bCustomers.hoaDoBakery,
      organization_id: SEED_IDS.organization.cf19,
      code: 'B2B-002',
      name: 'Trần Mỹ Hạnh',
      shop_name: 'Tiệm Bánh & Trà Hoa Đỏ',
      phone: '0912345002',
      address: '77 Phan Bội Châu, Thị Trấn',
      price_tier: 'TIER_1',
      credit_limit_vnd: 20000000,
      current_debt_vnd: 0,
      payment_term_days: 7,
      is_active: true,
    },
  ];

  const b2bPriceTiers: B2bPriceTierDto[] = [
    {
      id: SEED_IDS.b2bPriceTiers.robustaTier1,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      price_tier: 'TIER_1',
      min_qty_kg: 0,
      unit_price_vnd: 185000,
    },
    {
      id: SEED_IDS.b2bPriceTiers.robustaTier2,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      price_tier: 'TIER_2',
      min_qty_kg: 10,
      unit_price_vnd: 172000,
    },
    {
      id: SEED_IDS.b2bPriceTiers.robustaTier3,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      price_tier: 'TIER_3',
      min_qty_kg: 50,
      unit_price_vnd: 160000,
    },
    {
      id: SEED_IDS.b2bPriceTiers.blendTier1,
      item_id: SEED_IDS.inventoryItems.roastedSignatureBlend,
      price_tier: 'TIER_1',
      min_qty_kg: 0,
      unit_price_vnd: 240000,
    },
  ];

  const b2bOrders: B2bOrderDto[] = [
    {
      id: SEED_B2B_ORDER_IDS.phoNuiPendingOrder,
      order_code: 'B2B-20261101-001',
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      created_by: SEED_IDS.users.warehouseManager,
      payment_method: 'VIETQR',
      payment_status: 'PENDING',
      total_amount_vnd: 18500000,
      paid_amount_vnd: 6000000,
      cogs_amount_vnd: 12450000,
      due_date: '2026-11-16',
      notes: 'Đơn sỉ đầu tháng 11 (gối đầu 15 ngày)',
      created_at: '2026-11-01T08:00:00.000Z',
      updated_at: '2026-11-01T08:00:00.000Z',
    },
  ];

  const b2bOrderItems: B2bOrderItemDto[] = [
    {
      id: '92100000-0000-4000-8000-000000000001',
      b2b_order_id: SEED_B2B_ORDER_IDS.phoNuiPendingOrder,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
      quantity_base_unit: 100000,
      unit_price_vnd: 185000,
      unit_cost_vnd: 124500,
      line_total_vnd: 18500000,
      created_at: '2026-11-01T08:00:00.000Z',
    },
  ];

  const b2bDebtLedger: B2bDebtLedgerEntryDto[] = [
    {
      id: '92200000-0000-4000-8000-000000000001',
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      b2b_order_id: SEED_B2B_ORDER_IDS.phoNuiPendingOrder,
      entry_type: 'DEBIT_INVOICE',
      amount_vnd: 18500000,
      balance_after_vnd: 18500000,
      recorded_by: SEED_IDS.users.warehouseManager,
      reference_note: 'Ghi nợ đơn bán sỉ B2B-20261101-001',
      created_at: '2026-11-01T08:00:00.000Z',
    },
    {
      id: '92200000-0000-4000-8000-000000000002',
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      b2b_order_id: SEED_B2B_ORDER_IDS.phoNuiPendingOrder,
      entry_type: 'CREDIT_PAYMENT',
      amount_vnd: 6000000,
      balance_after_vnd: 12500000,
      recorded_by: SEED_IDS.users.warehouseManager,
      reference_note: 'Thanh toán trước 6,000,000 đ khi nhận hàng',
      created_at: '2026-11-01T08:05:00.000Z',
    },
  ];

  const internalTransfers: InternalTransferDto[] = [
    {
      id: SEED_IDS.internalTransfers.store01InitialRequest,
      transfer_code: 'TRF-20261122-001',
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.store01,
      status: 'REQUESTED',
      total_internal_value_vnd: 775000,
      requested_by: SEED_IDS.users.storeManager01,
      dispatched_by: null,
      received_by: null,
      requested_at: BASE_TS,
      dispatched_at: null,
      received_at: null,
      notes: 'Phiếu xin bổ sung 5kg Robusta rang cho Quán 1',
    },
  ];

  const internalTransferItems: InternalTransferItemDto[] = [
    {
      id: SEED_TRANSFER_ITEM_IDS.store01InitialItem01,
      transfer_id: SEED_IDS.internalTransfers.store01InitialRequest,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      source_lot_id: null,
      destination_lot_id: null,
      requested_qty: 5000,
      dispatched_qty: 0,
      received_qty: 0,
      internal_unit_price_vnd: 155000,
      line_total_vnd: 775000,
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
    b2bCustomers,
    b2bPriceTiers,
    b2bOrders,
    b2bOrderItems,
    b2bDebtLedger,
    internalTransfers,
    internalTransferItems,
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

### File 3: `C:\bib\cf_19\apps\api\src\modules\b2b\b2b.service.ts`
```ts
import { randomUUID } from 'node:crypto';
import {
  calculateB2bCreditCheck,
  classifyArAgingBucket,
  compareFifoLots,
  convertToKgForTierPricing,
  resolveB2bTieredUnitPriceVnd,
  settleFifoPendingInvoices,
  type ArAgingBucket,
  type ArAgingSummaryDTO,
  type ArCustomerAgingRowDTO,
  type B2bCatalogOverviewDTO,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
  type B2bOrderItemDto,
  type B2bPriceQuoteQueryDTO,
  type B2bPriceQuoteResultDTO,
  type CreateB2bOrderDTO,
  type CreateB2bOrderResultDTO,
  type LotStatus,
  type PaymentStatus,
  type RecordB2bDebtPaymentDTO,
  type RecordB2bDebtPaymentResultDTO,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

const BUCKET_RANK: Record<ArAgingBucket, number> = {
  CURRENT: 0,
  OVERDUE_1_30: 1,
  OVERDUE_31_60: 2,
  OVERDUE_60_PLUS: 3,
};

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function computeDaysOverdue(dueDateIso: string | null, asOfDateIso: string): number {
  if (!dueDateIso) {
    return 0;
  }
  const dueMs = Date.parse(`${dueDateIso}T00:00:00.000Z`);
  const asOfMs = Date.parse(`${asOfDateIso}T00:00:00.000Z`);
  if (Number.isNaN(dueMs) || Number.isNaN(asOfMs)) {
    return 0;
  }
  return Math.floor((asOfMs - dueMs) / 86_400_000);
}

export async function listCustomers(): Promise<B2bCustomerDto[]> {
  return getInMemoryDb().b2bCustomers.map((c) => structuredClone(c));
}

export async function getOverview(
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<B2bCatalogOverviewDTO> {
  const db = getInMemoryDb();

  let totalReceivablesVnd = 0;
  let totalCurrentVnd = 0;
  let totalOverdue1To30Vnd = 0;
  let totalOverdue31To60Vnd = 0;
  let totalOverdue60PlusVnd = 0;

  const customerAgingRows: ArCustomerAgingRowDTO[] = db.b2bCustomers.map(
    (customer) => {
      const pendingOrders = db.b2bOrders.filter(
        (ord) =>
          ord.customer_id === customer.id &&
          ord.payment_status === 'PENDING' &&
          ord.paid_amount_vnd < ord.total_amount_vnd,
      );

      let currentVnd = 0;
      let overdue1To30Vnd = 0;
      let overdue31To60Vnd = 0;
      let overdue60PlusVnd = 0;
      let worstBucket: ArAgingBucket = 'CURRENT';

      for (const ord of pendingOrders) {
        const outstanding = ord.total_amount_vnd - ord.paid_amount_vnd;
        const daysOverdue = computeDaysOverdue(ord.due_date, asOfDate);
        const bucket = classifyArAgingBucket(daysOverdue);
        if (BUCKET_RANK[bucket] > BUCKET_RANK[worstBucket]) {
          worstBucket = bucket;
        }
        if (bucket === 'CURRENT') {
          currentVnd += outstanding;
        } else if (bucket === 'OVERDUE_1_30') {
          overdue1To30Vnd += outstanding;
        } else if (bucket === 'OVERDUE_31_60') {
          overdue31To60Vnd += outstanding;
        } else {
          overdue60PlusVnd += outstanding;
        }
      }

      const totalOutstanding =
        currentVnd + overdue1To30Vnd + overdue31To60Vnd + overdue60PlusVnd;

      totalReceivablesVnd += totalOutstanding;
      totalCurrentVnd += currentVnd;
      totalOverdue1To30Vnd += overdue1To30Vnd;
      totalOverdue31To60Vnd += overdue31To60Vnd;
      totalOverdue60PlusVnd += overdue60PlusVnd;

      return {
        customer: structuredClone(customer),
        pending_invoice_count: pendingOrders.length,
        current_vnd: currentVnd,
        overdue_1_30_vnd: overdue1To30Vnd,
        overdue_31_60_vnd: overdue31To60Vnd,
        overdue_60_plus_vnd: overdue60PlusVnd,
        total_outstanding_vnd: totalOutstanding,
        worst_bucket: worstBucket,
      };
    },
  );

  const agingSummary: ArAgingSummaryDTO = {
    as_of_date: asOfDate,
    total_receivables_vnd: totalReceivablesVnd,
    current_vnd: totalCurrentVnd,
    overdue_1_30_vnd: totalOverdue1To30Vnd,
    overdue_31_60_vnd: totalOverdue31To60Vnd,
    overdue_60_plus_vnd: totalOverdue60PlusVnd,
    customers: customerAgingRows,
  };

  const recentOrders = db.b2bOrders
    .map((ord) => ({
      ...structuredClone(ord),
      items: db.b2bOrderItems
        .filter((it) => it.b2b_order_id === ord.id)
        .map((it) => structuredClone(it)),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    customers: db.b2bCustomers.map((c) => structuredClone(c)),
    price_tiers: db.b2bPriceTiers.map((t) => structuredClone(t)),
    recent_orders: recentOrders,
    aging_summary: agingSummary,
  };
}

export async function quoteTieredPrice(
  query: B2bPriceQuoteQueryDTO,
): Promise<B2bPriceQuoteResultDTO> {
  const db = getInMemoryDb();
  const customer = db.b2bCustomers.find(
    (c) => c.id === query.customer_id && c.is_active,
  );
  if (!customer) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Active B2B customer ${query.customer_id} not found`,
    );
  }

  const item = db.inventoryItems.find(
    (i) => i.id === query.item_id && i.is_active,
  );
  if (!item) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Active inventory item ${query.item_id} not found`,
    );
  }

  const itemTiers = db.b2bPriceTiers.filter((t) => t.item_id === item.id);
  const resolved = resolveB2bTieredUnitPriceVnd({
    qtyBaseUnit: query.quantity_base_unit,
    baseUnit: item.base_unit,
    customerPriceTier: customer.price_tier,
    tiers: itemTiers,
    fallbackRetailPriceVnd: item.retail_price_vnd,
    fallbackInternalTransferPriceVnd: item.internal_transfer_price_vnd,
  });

  return {
    customer_id: customer.id,
    item_id: item.id,
    base_unit: item.base_unit,
    quantity_base_unit: query.quantity_base_unit,
    qty_kg: resolved.qty_kg,
    customer_price_tier: customer.price_tier,
    applied_price_tier: resolved.applied_price_tier,
    unit_price_vnd: resolved.unit_price_vnd,
    estimated_line_total_vnd: resolved.estimated_line_total_vnd,
    price_source: resolved.price_source,
  };
}

export async function createB2bOrder(
  actor: AuthActor,
  input: CreateB2bOrderDTO,
): Promise<CreateB2bOrderResultDTO> {
  const db = getInMemoryDb();

  const warehouse = db.stores.find(
    (s) => s.id === input.warehouse_store_id && s.is_active,
  );
  if (!warehouse || warehouse.type !== 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_WAREHOUSE_STORE',
      'warehouse_store_id must be an active CENTRAL_WAREHOUSE',
    );
  }

  const customer = db.b2bCustomers.find(
    (c) => c.id === input.customer_id && c.is_active,
  );
  if (!customer) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Active B2B customer ${input.customer_id} not found`,
    );
  }

  const orderCode =
    input.order_code?.trim() ??
    `B2B-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(db.b2bOrders.length + 1).padStart(3, '0')}`;

  if (db.b2bOrders.some((o) => o.order_code === orderCode)) {
    throw new WarehouseDomainError(
      409,
      'DUPLICATE_ORDER_CODE',
      `B2B order code ${orderCode} already exists`,
    );
  }

  // Phase A (Atomic Pre-Validation): Resolve prices, check FIFO stock & credit limit BEFORE mutating state
  interface PlannedAllocation {
    itemId: string;
    baseUnit: 'g' | 'ml' | 'pcs';
    unitPriceVnd: number;
    lotId: string;
    takeQty: number;
    unitCostVnd: number;
    sliceLineTotalVnd: number;
    sliceCogsVnd: number;
  }

  const plannedAllocations: PlannedAllocation[] = [];
  const plannedLotDeductions = new Map<string, number>();
  let totalAmountVnd = 0;
  let totalCogsVnd = 0;

  for (const line of input.items) {
    const item = db.inventoryItems.find(
      (i) => i.id === line.item_id && i.is_active,
    );
    if (!item) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Active inventory item ${line.item_id} not found`,
      );
    }

    const itemTiers = db.b2bPriceTiers.filter((t) => t.item_id === item.id);
    const quote = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: line.quantity_base_unit,
      baseUnit: item.base_unit,
      customerPriceTier: customer.price_tier,
      tiers: itemTiers,
      fallbackRetailPriceVnd: item.retail_price_vnd,
      fallbackInternalTransferPriceVnd: item.internal_transfer_price_vnd,
    });

    const candidateLots = db.warehouseLots
      .filter(
        (lot) =>
          lot.store_id === input.warehouse_store_id &&
          lot.item_id === item.id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .sort(compareFifoLots);

    let remainingNeeded = line.quantity_base_unit;
    for (const lot of candidateLots) {
      if (remainingNeeded <= 0) {
        break;
      }
      const alreadyPlanned = plannedLotDeductions.get(lot.id) ?? 0;
      const availableInLot = roundQty2(lot.remaining_qty - alreadyPlanned);
      if (availableInLot <= 0) {
        continue;
      }

      const takeQty = roundQty2(Math.min(availableInLot, remainingNeeded));
      const billingQty = convertToKgForTierPricing(takeQty, item.base_unit);
      const sliceLineTotalVnd = Math.round(billingQty * quote.unit_price_vnd);
      const sliceCogsVnd = Math.round(billingQty * lot.unit_cost_vnd);

      plannedAllocations.push({
        itemId: item.id,
        baseUnit: item.base_unit,
        unitPriceVnd: quote.unit_price_vnd,
        lotId: lot.id,
        takeQty,
        unitCostVnd: lot.unit_cost_vnd,
        sliceLineTotalVnd,
        sliceCogsVnd,
      });

      plannedLotDeductions.set(lot.id, roundQty2(alreadyPlanned + takeQty));
      totalAmountVnd += sliceLineTotalVnd;
      totalCogsVnd += sliceCogsVnd;
      remainingNeeded = roundQty2(remainingNeeded - takeQty);
    }

    if (remainingNeeded > 0) {
      throw new WarehouseDomainError(
        409,
        'INSUFFICIENT_FIFO_STOCK',
        `Insufficient FIFO stock for ${item.sku}: shortage ${remainingNeeded}`,
      );
    }
  }

  if (input.paid_amount_vnd > totalAmountVnd) {
    throw new WarehouseDomainError(
      400,
      'INVALID_PAYMENT_AMOUNT',
      `paid_amount_vnd (${input.paid_amount_vnd}) cannot exceed total_amount_vnd (${totalAmountVnd})`,
    );
  }

  const creditCheck = calculateB2bCreditCheck({
    currentDebtVnd: customer.current_debt_vnd,
    creditLimitVnd: customer.credit_limit_vnd,
    totalAmountVnd,
    paidAmountVnd: input.paid_amount_vnd,
  });

  if (creditCheck.exceeds_credit_limit) {
    throw new WarehouseDomainError(
      409,
      'CREDIT_LIMIT_EXCEEDED',
      `Projected debt (${creditCheck.projected_debt_vnd}) exceeds credit limit (${customer.credit_limit_vnd})`,
    );
  }

  // Phase B (Atomic Commit): Apply lot deductions, create order + items + double-entry debt ledger + audit
  const nowIso = new Date().toISOString();
  const orderId = randomUUID();
  const paymentStatus: PaymentStatus =
    input.paid_amount_vnd === totalAmountVnd ? 'PAID' : 'PENDING';
  const dueDate = addDaysToIsoDate(nowIso.slice(0, 10), customer.payment_term_days);

  for (const [lotId, deductedQty] of plannedLotDeductions.entries()) {
    const lot = db.warehouseLots.find((l) => l.id === lotId)!;
    const afterQty = roundQty2(lot.remaining_qty - deductedQty);
    const statusAfter: LotStatus = afterQty === 0 ? 'DEPLETED' : 'AVAILABLE';
    lot.remaining_qty = afterQty;
    lot.status = statusAfter;
    lot.updated_at = nowIso;
  }

  const createdOrder: B2bOrderDto = {
    id: orderId,
    order_code: orderCode,
    warehouse_store_id: input.warehouse_store_id,
    customer_id: customer.id,
    created_by: actor.id,
    payment_method: input.payment_method,
    payment_status: paymentStatus,
    total_amount_vnd: totalAmountVnd,
    paid_amount_vnd: input.paid_amount_vnd,
    cogs_amount_vnd: totalCogsVnd,
    due_date: dueDate,
    notes: input.notes ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };
  db.b2bOrders.push(createdOrder);

  const createdItems: B2bOrderItemDto[] = plannedAllocations.map((alloc) => {
    const itemRecord: B2bOrderItemDto = {
      id: randomUUID(),
      b2b_order_id: orderId,
      item_id: alloc.itemId,
      lot_id: alloc.lotId,
      quantity_base_unit: alloc.takeQty,
      unit_price_vnd: alloc.unitPriceVnd,
      unit_cost_vnd: alloc.unitCostVnd,
      line_total_vnd: alloc.sliceLineTotalVnd,
      created_at: nowIso,
    };
    db.b2bOrderItems.push(itemRecord);
    return itemRecord;
  });

  // Double-entry AR Debt Ledger: DEBIT_INVOICE (+ optional immediate CREDIT_PAYMENT)
  const balanceAfterDebit = customer.current_debt_vnd + totalAmountVnd;
  const debitEntry: B2bDebtLedgerEntryDto = {
    id: randomUUID(),
    customer_id: customer.id,
    b2b_order_id: orderId,
    entry_type: 'DEBIT_INVOICE',
    amount_vnd: totalAmountVnd,
    balance_after_vnd: balanceAfterDebit,
    recorded_by: actor.id,
    reference_note: `Ghi nợ đơn bán sỉ ${orderCode}`,
    created_at: nowIso,
  };
  db.b2bDebtLedger.push(debitEntry);

  let finalLedgerEntry: B2bDebtLedgerEntryDto = debitEntry;

  if (input.paid_amount_vnd > 0) {
    const creditEntry: B2bDebtLedgerEntryDto = {
      id: randomUUID(),
      customer_id: customer.id,
      b2b_order_id: orderId,
      entry_type: 'CREDIT_PAYMENT',
      amount_vnd: input.paid_amount_vnd,
      balance_after_vnd: creditCheck.projected_debt_vnd,
      recorded_by: actor.id,
      reference_note: `Thanh toán ngay đơn bán sỉ ${orderCode}`,
      created_at: nowIso,
    };
    db.b2bDebtLedger.push(creditEntry);
    finalLedgerEntry = creditEntry;
  }

  customer.current_debt_vnd = creditCheck.projected_debt_vnd;

  recordAuditLog({
    actorId: actor.id,
    storeId: input.warehouse_store_id,
    action: 'M3_B2B_ORDER_CREATED',
    targetTable: 'b2b_orders',
    targetId: orderId,
    reason: input.notes ?? `B2B order ${orderCode} created`,
    payload: {
      order_code: orderCode,
      customer_code: customer.code,
      total_amount_vnd: totalAmountVnd,
      paid_amount_vnd: input.paid_amount_vnd,
      debt_added_vnd: creditCheck.debt_added_vnd,
      projected_debt_vnd: creditCheck.projected_debt_vnd,
      cogs_amount_vnd: totalCogsVnd,
    },
  });

  return {
    order: { ...structuredClone(createdOrder), items: createdItems.map((i) => structuredClone(i)) },
    items: createdItems.map((i) => structuredClone(i)),
    debt_added_vnd: creditCheck.debt_added_vnd,
    projected_debt_vnd: creditCheck.projected_debt_vnd,
    remaining_credit_vnd: creditCheck.remaining_credit_vnd,
    ledger_entry: structuredClone(finalLedgerEntry),
  };
}

export async function recordDebtPayment(
  actor: AuthActor,
  input: RecordB2bDebtPaymentDTO,
): Promise<RecordB2bDebtPaymentResultDTO> {
  const db = getInMemoryDb();
  const customer = db.b2bCustomers.find(
    (c) => c.id === input.customer_id && c.is_active,
  );
  if (!customer) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Active B2B customer ${input.customer_id} not found`,
    );
  }

  const previousDebtVnd = customer.current_debt_vnd;
  if (input.payment_amount_vnd > previousDebtVnd) {
    throw new WarehouseDomainError(
      409,
      'PAYMENT_EXCEEDS_CURRENT_DEBT',
      `Payment (${input.payment_amount_vnd}) exceeds customer current debt (${previousDebtVnd})`,
    );
  }

  const pendingOrders = db.b2bOrders.filter(
    (ord) =>
      ord.customer_id === customer.id &&
      ord.payment_status === 'PENDING' &&
      ord.paid_amount_vnd < ord.total_amount_vnd,
  );

  const settlement = settleFifoPendingInvoices(
    pendingOrders.map((ord) => ({
      id: ord.id,
      order_code: ord.order_code,
      ordered_at: ord.created_at,
      total_amount_vnd: ord.total_amount_vnd,
      paid_amount_vnd: ord.paid_amount_vnd,
      payment_status: ord.payment_status,
    })),
    input.payment_amount_vnd,
  );

  const nowIso = new Date().toISOString();
  for (const slice of settlement.settled) {
    const orderRecord = db.b2bOrders.find((o) => o.id === slice.order_id)!;
    orderRecord.paid_amount_vnd = slice.new_paid_amount_vnd;
    orderRecord.payment_status = slice.new_payment_status;
    orderRecord.updated_at = nowIso;
  }

  const newDebtVnd = previousDebtVnd - input.payment_amount_vnd;
  customer.current_debt_vnd = newDebtVnd;

  const ledgerEntry: B2bDebtLedgerEntryDto = {
    id: randomUUID(),
    customer_id: customer.id,
    b2b_order_id:
      settlement.settled.length === 1
        ? (settlement.settled[0]?.order_id ?? null)
        : null,
    entry_type: 'CREDIT_PAYMENT',
    amount_vnd: input.payment_amount_vnd,
    balance_after_vnd: newDebtVnd,
    recorded_by: actor.id,
    reference_note: input.reference_note ?? 'Thu nợ khách sỉ theo nguyên tắc FIFO',
    created_at: nowIso,
  };
  db.b2bDebtLedger.push(ledgerEntry);

  recordAuditLog({
    actorId: actor.id,
    storeId: input.warehouse_store_id,
    action: 'M3_B2B_DEBT_PAYMENT_RECORDED',
    targetTable: 'b2b_debt_ledger',
    targetId: ledgerEntry.id,
    reason: input.reference_note ?? 'B2B debt payment settled FIFO',
    payload: {
      customer_code: customer.code,
      payment_amount_vnd: input.payment_amount_vnd,
      previous_debt_vnd: previousDebtVnd,
      new_debt_vnd: newDebtVnd,
      settled_orders: settlement.settled,
    },
  });

  return {
    customer_id: customer.id,
    payment_amount_vnd: input.payment_amount_vnd,
    previous_debt_vnd: previousDebtVnd,
    new_debt_vnd: newDebtVnd,
    ledger_entry: structuredClone(ledgerEntry),
    settled_orders: settlement.settled,
  };
}
```

### File 4: `C:\bib\cf_19\apps\api\src\modules\b2b\b2b.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import {
  B2bPriceQuoteQuerySchema,
  CreateB2bOrderSchema,
  RecordB2bDebtPaymentSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  createB2bOrder,
  getOverview,
  listCustomers,
  quoteTieredPrice,
  recordDebtPayment,
} from './b2b.service.js';

export const b2bRouter = Router();

b2bRouter.use(
  authenticate,
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER'),
  sanitizeCostFields(),
);

function handleB2bError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected B2B error';
  res.status(500).json({
    error: {
      code: 'B2B_INTERNAL_ERROR',
      message,
    },
  });
}

b2bRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const asOfDate =
      typeof req.query.as_of_date === 'string'
        ? req.query.as_of_date
        : undefined;
    const overview = await getOverview(asOfDate);
    res.status(200).json({ data: overview });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.get('/customers', async (_req: Request, res: Response) => {
  try {
    const customers = await listCustomers();
    res.status(200).json({ data: customers });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.get('/price-quote', async (req: Request, res: Response) => {
  const parsed = B2bPriceQuoteQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_PRICE_QUOTE_QUERY',
        message: 'Invalid B2B price quote query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const quote = await quoteTieredPrice(parsed.data);
    res.status(200).json({ data: quote });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.post('/orders', async (req: Request, res: Response) => {
  const parsed = CreateB2bOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_B2B_ORDER_PAYLOAD',
        message: 'Invalid B2B order payload',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const result = await createB2bOrder(req.actor!, parsed.data);
    res.status(201).json({ data: result });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.post('/debt-payments', async (req: Request, res: Response) => {
  const parsed = RecordB2bDebtPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_DEBT_PAYMENT_PAYLOAD',
        message: 'Invalid B2B debt payment payload',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const result = await recordDebtPayment(req.actor!, parsed.data);
    res.status(200).json({ data: result });
  } catch (err) {
    handleB2bError(res, err);
  }
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M3.2 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\db\seedData.ts','C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts','C:\bib\cf_19\apps\api\src\modules\b2b\b2b.service.ts','C:\bib\cf_19\apps\api\src\modules\b2b\b2b.routes.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# 2-PHASE INTERNAL TRANSFERS SERVICE/ROUTES, APP MOUNT & 20 SUPERTEST CASES (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây: `transfers.service.ts`, `transfers.routes.ts`, cập nhật `index.ts` (mount `/api/v1/b2b` & `/api/v1/transfers`), và bộ 20 Vitest + Supertest Integration Tests `m3-b2b-transfers.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không rút gọn test cases, không đổi mã lỗi hay status codes.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M3.2 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\modules\transfers\transfers.service.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\api\src\modules\transfers\transfers.routes.ts` (Tạo mới)
3. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\apps\api\src\__tests__\m3-b2b-transfers.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\src\modules\transfers\transfers.service.ts`
```ts
import { randomUUID } from 'node:crypto';
import {
  calculateInternalTransferTotalVnd,
  compareFifoLots,
  convertToKgForTierPricing,
  type CreateInternalTransferRequest,
  type DispatchInternalTransferFifoDTO,
  type InternalTransferDispatchResultDTO,
  type InternalTransferDto,
  type InternalTransferItemDto,
  type InternalTransferReconcileResultDTO,
  type LotStatus,
  type ReconcileInternalTransferInput,
  type TransferFilterQueryDTO,
  type WarehouseLotFullDto,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function hydrateTransfer(transfer: InternalTransferDto): InternalTransferDto {
  const items = getInMemoryDb()
    .internalTransferItems.filter((it) => it.transfer_id === transfer.id)
    .map((it) => structuredClone(it));
  return {
    ...structuredClone(transfer),
    items,
  };
}

/**
 * Lists internal transfers scoped by role:
 * - STORE_MANAGER: strictly restricted to transfers targeting assignedStoreId.
 * - SUPER_ADMIN / WAREHOUSE_MANAGER: sees all transfers (optionally filtered).
 */
export async function listTransfers(
  actor: AuthActor,
  query: TransferFilterQueryDTO = {},
): Promise<InternalTransferDto[]> {
  const db = getInMemoryDb();

  return db.internalTransfers
    .filter((tr) => {
      if (actor.role === 'STORE_MANAGER') {
        if (tr.to_store_id !== actor.assignedStoreId) {
          return false;
        }
      } else if (query.store_id && tr.to_store_id !== query.store_id) {
        return false;
      }

      if (query.status && tr.status !== query.status) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
    .map(hydrateTransfer);
}

/**
 * Phase 0 (REQUESTED): Store Manager (for own store) or Super Admin requests replenishment.
 * Priced strictly using inventory_items.internal_transfer_price_vnd.
 */
export async function requestTransfer(
  actor: AuthActor,
  input: CreateInternalTransferRequest,
): Promise<InternalTransferDto> {
  if (actor.role === 'STORE_MANAGER' && actor.assignedStoreId !== input.to_store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      'STORE_MANAGER can only request internal transfers for their own assigned store',
    );
  }
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'STORE_MANAGER') {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      `Role ${actor.role} cannot create internal transfer requests`,
    );
  }

  const db = getInMemoryDb();
  const fromStore = db.stores.find(
    (s) => s.id === input.from_warehouse_id && s.is_active,
  );
  if (!fromStore || fromStore.type !== 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_WAREHOUSE_STORE',
      'from_warehouse_id must be an active CENTRAL_WAREHOUSE',
    );
  }

  const toStore = db.stores.find(
    (s) => s.id === input.to_store_id && s.is_active,
  );
  if (!toStore || toStore.type === 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_DESTINATION_STORE',
      'to_store_id must be an active retail or franchise store',
    );
  }

  const nowIso = new Date().toISOString();
  const transferId = randomUUID();
  const transferCode = `TRF-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(db.internalTransfers.length + 1).padStart(3, '0')}`;

  const createdItems: InternalTransferItemDto[] = [];
  const priceInputs: Array<{
    qty_base_unit: number;
    base_unit: 'g' | 'ml' | 'pcs';
    internal_unit_price_vnd: number;
  }> = [];

  for (const itemReq of input.items) {
    const invItem = db.inventoryItems.find(
      (i) => i.id === itemReq.item_id && i.is_active,
    );
    if (!invItem) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Active inventory item ${itemReq.item_id} not found`,
      );
    }

    const billingQty = convertToKgForTierPricing(
      itemReq.requested_qty,
      invItem.base_unit,
    );
    const lineTotalVnd = Math.round(
      billingQty * invItem.internal_transfer_price_vnd,
    );

    priceInputs.push({
      qty_base_unit: itemReq.requested_qty,
      base_unit: invItem.base_unit,
      internal_unit_price_vnd: invItem.internal_transfer_price_vnd,
    });

    createdItems.push({
      id: randomUUID(),
      transfer_id: transferId,
      item_id: invItem.id,
      source_lot_id: null,
      destination_lot_id: null,
      requested_qty: itemReq.requested_qty,
      dispatched_qty: 0,
      received_qty: 0,
      internal_unit_price_vnd: invItem.internal_transfer_price_vnd,
      line_total_vnd: lineTotalVnd,
    });
  }

  const totalInternalValueVnd = calculateInternalTransferTotalVnd(priceInputs);

  const transfer: InternalTransferDto = {
    id: transferId,
    transfer_code: transferCode,
    from_warehouse_id: input.from_warehouse_id,
    to_store_id: input.to_store_id,
    status: 'REQUESTED',
    total_internal_value_vnd: totalInternalValueVnd,
    requested_by: actor.id,
    dispatched_by: null,
    received_by: null,
    requested_at: nowIso,
    dispatched_at: null,
    received_at: null,
    notes: input.notes ?? null,
  };

  db.internalTransfers.push(transfer);
  db.internalTransferItems.push(...createdItems);

  recordAuditLog({
    actorId: actor.id,
    storeId: input.to_store_id,
    action: 'M3_INTERNAL_TRANSFER_REQUESTED',
    targetTable: 'internal_transfers',
    targetId: transferId,
    reason: input.notes ?? `Internal transfer ${transferCode} requested`,
    payload: {
      transfer_code: transferCode,
      to_store_id: input.to_store_id,
      total_internal_value_vnd: totalInternalValueVnd,
      item_count: createdItems.length,
    },
  });

  return hydrateTransfer(transfer);
}

/**
 * Phase 1 (REQUESTED -> IN_TRANSIT): Warehouse Manager / Super Admin dispatches stock
 * from Central Warehouse using strict Multi-Lot FIFO ordering.
 */
export async function dispatchTransferFifo(
  actor: AuthActor,
  input: DispatchInternalTransferFifoDTO,
): Promise<InternalTransferDispatchResultDTO> {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'WAREHOUSE_MANAGER') {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      'Only SUPER_ADMIN or WAREHOUSE_MANAGER can dispatch internal transfers',
    );
  }

  const db = getInMemoryDb();
  const transfer = db.internalTransfers.find((t) => t.id === input.transfer_id);
  if (!transfer) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Internal transfer ${input.transfer_id} not found`,
    );
  }

  if (transfer.status !== 'REQUESTED') {
    throw new WarehouseDomainError(
      409,
      'INVALID_TRANSFER_STATE',
      `Transfer ${transfer.transfer_code} has status ${transfer.status}, expected REQUESTED`,
    );
  }

  const originalItems = db.internalTransferItems.filter(
    (it) => it.transfer_id === transfer.id,
  );

  // Atomic Pre-Validation before any mutation
  interface PlannedSlice {
    sourceTransferItemId: string;
    itemId: string;
    lotId: string;
    qty: number;
    internalUnitPriceVnd: number;
    lineTotalVnd: number;
    isFirstForItem: boolean;
  }

  const plannedSlices: PlannedSlice[] = [];
  const plannedLotDeductions = new Map<string, number>();

  for (const titem of originalItems) {
    const invItem = db.inventoryItems.find((i) => i.id === titem.item_id)!;
    const candidateLots = db.warehouseLots
      .filter(
        (lot) =>
          lot.store_id === transfer.from_warehouse_id &&
          lot.item_id === titem.item_id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .sort(compareFifoLots);

    let remainingNeeded = titem.requested_qty;
    let isFirst = true;

    for (const lot of candidateLots) {
      if (remainingNeeded <= 0) {
        break;
      }
      const alreadyPlanned = plannedLotDeductions.get(lot.id) ?? 0;
      const availableInLot = roundQty2(lot.remaining_qty - alreadyPlanned);
      if (availableInLot <= 0) {
        continue;
      }

      const takeQty = roundQty2(Math.min(availableInLot, remainingNeeded));
      const billingQty = convertToKgForTierPricing(takeQty, invItem.base_unit);
      const sliceLineTotalVnd = Math.round(
        billingQty * titem.internal_unit_price_vnd,
      );

      plannedSlices.push({
        sourceTransferItemId: titem.id,
        itemId: titem.item_id,
        lotId: lot.id,
        qty: takeQty,
        internalUnitPriceVnd: titem.internal_unit_price_vnd,
        lineTotalVnd: sliceLineTotalVnd,
        isFirstForItem: isFirst,
      });

      plannedLotDeductions.set(lot.id, roundQty2(alreadyPlanned + takeQty));
      remainingNeeded = roundQty2(remainingNeeded - takeQty);
      isFirst = false;
    }

    if (remainingNeeded > 0) {
      throw new WarehouseDomainError(
        409,
        'INSUFFICIENT_FIFO_STOCK',
        `Warehouse lacks ${remainingNeeded} base units of ${invItem.sku} to dispatch transfer`,
      );
    }
  }

  // Atomic Commit: deduct warehouse lots & update/split transfer items
  const nowIso = new Date().toISOString();
  for (const [lotId, deductedQty] of plannedLotDeductions.entries()) {
    const lot = db.warehouseLots.find((l) => l.id === lotId)!;
    const afterQty = roundQty2(lot.remaining_qty - deductedQty);
    const statusAfter: LotStatus = afterQty === 0 ? 'DEPLETED' : 'AVAILABLE';
    lot.remaining_qty = afterQty;
    lot.status = statusAfter;
    lot.updated_at = nowIso;
  }

  let totalDispatchedValueVnd = 0;
  const resultingItems: InternalTransferItemDto[] = [];

  for (const slice of plannedSlices) {
    totalDispatchedValueVnd += slice.lineTotalVnd;

    if (slice.isFirstForItem) {
      const targetItem = db.internalTransferItems.find(
        (it) => it.id === slice.sourceTransferItemId,
      )!;
      targetItem.source_lot_id = slice.lotId;
      targetItem.dispatched_qty = slice.qty;
      targetItem.line_total_vnd = slice.lineTotalVnd;
      resultingItems.push(structuredClone(targetItem));
    } else {
      const splitItem: InternalTransferItemDto = {
        id: randomUUID(),
        transfer_id: transfer.id,
        item_id: slice.itemId,
        source_lot_id: slice.lotId,
        destination_lot_id: null,
        requested_qty: slice.qty,
        dispatched_qty: slice.qty,
        received_qty: 0,
        internal_unit_price_vnd: slice.internalUnitPriceVnd,
        line_total_vnd: slice.lineTotalVnd,
      };
      db.internalTransferItems.push(splitItem);
      resultingItems.push(structuredClone(splitItem));
    }
  }

  transfer.status = 'IN_TRANSIT';
  transfer.total_internal_value_vnd = totalDispatchedValueVnd;
  transfer.dispatched_by = actor.id;
  transfer.dispatched_at = nowIso;
  if (input.notes) {
    transfer.notes = input.notes;
  }

  recordAuditLog({
    actorId: actor.id,
    storeId: transfer.from_warehouse_id,
    action: 'M3_INTERNAL_TRANSFER_DISPATCHED',
    targetTable: 'internal_transfers',
    targetId: transfer.id,
    reason: input.notes ?? `Dispatched transfer ${transfer.transfer_code} via FIFO`,
    payload: {
      transfer_code: transfer.transfer_code,
      to_store_id: transfer.to_store_id,
      total_internal_value_vnd: totalDispatchedValueVnd,
      slice_count: resultingItems.length,
    },
  });

  return {
    transfer: hydrateTransfer(transfer),
    items: resultingItems,
  };
}

/**
 * Phase 2 (IN_TRANSIT -> RECONCILED): Destination Store Manager (or Super Admin)
 * confirms physical received_qty and creates destination store lots priced at
 * internal_unit_price_vnd (strictly hiding Central Warehouse origin MAC).
 */
export async function reconcileTransfer(
  actor: AuthActor,
  input: ReconcileInternalTransferInput,
): Promise<InternalTransferReconcileResultDTO> {
  const db = getInMemoryDb();
  const transfer = db.internalTransfers.find((t) => t.id === input.transfer_id);
  if (!transfer) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `Internal transfer ${input.transfer_id} not found`,
    );
  }

  if (actor.role === 'STORE_MANAGER' && actor.assignedStoreId !== transfer.to_store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      'STORE_MANAGER can only reconcile transfers destined for their own store',
    );
  }
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'STORE_MANAGER') {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      `Role ${actor.role} cannot reconcile internal transfers`,
    );
  }

  if (transfer.status !== 'IN_TRANSIT') {
    throw new WarehouseDomainError(
      409,
      'INVALID_TRANSFER_STATE',
      `Transfer ${transfer.transfer_code} has status ${transfer.status}, expected IN_TRANSIT`,
    );
  }

  // Validate all received items before mutating state
  for (const rec of input.items) {
    const titem = db.internalTransferItems.find(
      (it) => it.id === rec.transfer_item_id && it.transfer_id === transfer.id,
    );
    if (!titem) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Transfer item ${rec.transfer_item_id} not found in transfer ${transfer.transfer_code}`,
      );
    }
    if (rec.received_qty < 0 || rec.received_qty > titem.dispatched_qty) {
      throw new WarehouseDomainError(
        400,
        'INVALID_RECEIVED_QTY',
        `received_qty (${rec.received_qty}) must be between 0 and dispatched_qty (${titem.dispatched_qty})`,
      );
    }
  }

  const toStore = db.stores.find((s) => s.id === transfer.to_store_id)!;
  const nowIso = new Date().toISOString();
  const createdLots: WarehouseLotFullDto[] = [];
  const reconciledItems: InternalTransferItemDto[] = [];
  let totalReconciledVnd = 0;

  for (const rec of input.items) {
    const titem = db.internalTransferItems.find(
      (it) => it.id === rec.transfer_item_id && it.transfer_id === transfer.id,
    )!;
    const invItem = db.inventoryItems.find((i) => i.id === titem.item_id)!;
    const sourceLot = db.warehouseLots.find((l) => l.id === titem.source_lot_id);

    const billingQty = convertToKgForTierPricing(
      rec.received_qty,
      invItem.base_unit,
    );
    const reconciledLineVnd = Math.round(
      billingQty * titem.internal_unit_price_vnd,
    );
    totalReconciledVnd += reconciledLineVnd;

    titem.received_qty = rec.received_qty;
    titem.line_total_vnd = reconciledLineVnd;

    if (rec.received_qty > 0) {
      const destLot: WarehouseLotFullDto = {
        id: randomUUID(),
        store_id: transfer.to_store_id,
        item_id: titem.item_id,
        lot_code: `${toStore.code}-${transfer.transfer_code}-${titem.id.slice(0, 6).toUpperCase()}`,
        supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
        moisture_pct: sourceLot?.moisture_pct ?? null,
        roast_date: sourceLot?.roast_date ?? null,
        received_at: nowIso,
        expiry_date: sourceLot?.expiry_date ?? null,
        initial_qty: rec.received_qty,
        remaining_qty: rec.received_qty,
        unit_cost_vnd: titem.internal_unit_price_vnd, // Internal transfer price only!
        shipping_cost_vnd: 0,
        status: 'AVAILABLE',
        created_at: nowIso,
        updated_at: nowIso,
      };
      db.warehouseLots.push(destLot);
      titem.destination_lot_id = destLot.id;
      createdLots.push(structuredClone(destLot));
    }

    reconciledItems.push(structuredClone(titem));
  }

  transfer.status = 'RECONCILED';
  transfer.total_internal_value_vnd = totalReconciledVnd;
  transfer.received_by = actor.id;
  transfer.received_at = nowIso;
  if (input.notes) {
    transfer.notes = input.notes;
  }

  recordAuditLog({
    actorId: actor.id,
    storeId: transfer.to_store_id,
    action: 'M3_INTERNAL_TRANSFER_RECONCILED',
    targetTable: 'internal_transfers',
    targetId: transfer.id,
    reason: input.notes ?? `Reconciled transfer ${transfer.transfer_code}`,
    payload: {
      transfer_code: transfer.transfer_code,
      to_store_id: transfer.to_store_id,
      total_internal_value_vnd: totalReconciledVnd,
      created_lot_count: createdLots.length,
    },
  });

  return {
    transfer: hydrateTransfer(transfer),
    items: reconciledItems,
    created_store_lots: createdLots,
  };
}
```

### File 2: `C:\bib\cf_19\apps\api\src\modules\transfers\transfers.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import {
  CreateInternalTransferRequestSchema,
  DispatchInternalTransferFifoSchema,
  ReconcileInternalTransferSchema,
  TransferFilterQuerySchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  dispatchTransferFifo,
  listTransfers,
  reconcileTransfer,
  requestTransfer,
} from './transfers.service.js';

export const transfersRouter = Router();

transfersRouter.use(authenticate, sanitizeCostFields());

function handleTransferError(res: Response, err: unknown): void {
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
    err instanceof Error ? err.message : 'Unexpected transfer error';
  res.status(500).json({
    error: {
      code: 'TRANSFER_INTERNAL_ERROR',
      message,
    },
  });
}

transfersRouter.get(
  '/',
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = TransferFilterQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSFER_QUERY',
          message: 'Invalid transfer query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const transfers = await listTransfers(req.actor!, parsed.data);
      res.status(200).json({ data: transfers });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/request',
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = CreateInternalTransferRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSFER_REQUEST_PAYLOAD',
          message: 'Invalid internal transfer request payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const transfer = await requestTransfer(req.actor!, parsed.data);
      res.status(201).json({ data: transfer });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/:transferId/dispatch',
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER'),
  async (req: Request, res: Response) => {
    const bodyNotes =
      typeof req.body === 'object' &&
      req.body !== null &&
      typeof (req.body as Record<string, unknown>)['notes'] === 'string'
        ? ((req.body as Record<string, unknown>)['notes'] as string)
        : undefined;

    const parsed = DispatchInternalTransferFifoSchema.safeParse({
      transfer_id: req.params.transferId,
      notes: bodyNotes,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_DISPATCH_PAYLOAD',
          message: 'Invalid internal transfer dispatch payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await dispatchTransferFifo(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/:transferId/reconcile',
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, unknown>)
        : {};

    const parsed = ReconcileInternalTransferSchema.safeParse({
      transfer_id: req.params.transferId,
      items: rawBody['items'],
      notes: rawBody['notes'],
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_RECONCILE_PAYLOAD',
          message: 'Invalid internal transfer reconcile payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await reconcileTransfer(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);
```

### File 3: `C:\bib\cf_19\apps\api\src\index.ts`
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
import { b2bRouter } from './modules/b2b/b2b.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';
import { transfersRouter } from './modules/transfers/transfers.routes.js';
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
  app.use('/api/v1/b2b', b2bRouter);
  app.use('/api/v1/transfers', transfersRouter);

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

### File 4: `C:\bib\cf_19\apps\api\src\__tests__\m3-b2b-transfers.test.ts`
```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS, SENSITIVE_COST_KEYS } from '@cf19/shared';
import { resetInMemoryDb } from '../db/inMemoryDb.js';
import { SEED_TRANSFER_ITEM_IDS } from '../db/seedData.js';
import { app } from '../index.js';

function authAs(userId: string): Record<string, string> {
  return { Authorization: `Bearer dev:${userId}` };
}

describe('M3.2 — @cf19/api B2B Tiered Pricing, AR Credit Ledger & 2-Phase Internal Stock Transfer', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. blocks STORE_MANAGER, CASHIER_STAFF, and BARISTA_KDS from /api/v1/b2b/* (403 FORBIDDEN_ROLE)', async () => {
    for (const userId of [
      SEED_IDS.users.storeManager01,
      SEED_IDS.users.cashier01,
      SEED_IDS.users.barista01,
    ]) {
      const res = await request(app)
        .get('/api/v1/b2b/overview')
        .set(authAs(userId));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    }
  });

  it('2. GET /api/v1/b2b/overview returns customers, price tiers, pending orders & AR aging summary', async () => {
    const res = await request(app)
      .get('/api/v1/b2b/overview?as_of_date=2026-11-22')
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(200);
    expect(res.body.data.customers).toHaveLength(2);
    expect(res.body.data.price_tiers).toHaveLength(4);
    expect(res.body.data.recent_orders).toHaveLength(1);
    expect(res.body.data.aging_summary.total_receivables_vnd).toBe(12500000);
    expect(res.body.data.aging_summary.overdue_1_30_vnd).toBe(12500000);
  });

  it('3. GET /api/v1/b2b/customers returns seeded wholesale customers', async () => {
    const res = await request(app)
      .get('/api/v1/b2b/customers')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].code).toBe('B2B-001');
  });

  it('4. GET /api/v1/b2b/price-quote applies tiered volume breaks for TIER_1 customer (5kg -> 185k, 15kg -> 172k, 50kg -> 160k)', async () => {
    const q5 = await request(app)
      .get(
        `/api/v1/b2b/price-quote?customer_id=${SEED_IDS.b2bCustomers.hoaDoBakery}&item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}&quantity_base_unit=5000`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(q5.status).toBe(200);
    expect(q5.body.data.unit_price_vnd).toBe(185000);
    expect(q5.body.data.estimated_line_total_vnd).toBe(925000);

    const q15 = await request(app)
      .get(
        `/api/v1/b2b/price-quote?customer_id=${SEED_IDS.b2bCustomers.hoaDoBakery}&item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}&quantity_base_unit=15000`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(q15.status).toBe(200);
    expect(q15.body.data.unit_price_vnd).toBe(172000);

    const q50 = await request(app)
      .get(
        `/api/v1/b2b/price-quote?customer_id=${SEED_IDS.b2bCustomers.hoaDoBakery}&item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}&quantity_base_unit=50000`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(q50.status).toBe(200);
    expect(q50.body.data.unit_price_vnd).toBe(160000);
  });

  it('5. GET /api/v1/b2b/price-quote honors VIP TIER_2 rate (172k) for phoNuiCoffee on 5kg restock', async () => {
    const res = await request(app)
      .get(
        `/api/v1/b2b/price-quote?customer_id=${SEED_IDS.b2bCustomers.phoNuiCoffee}&item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}&quantity_base_unit=5000`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(200);
    expect(res.body.data.unit_price_vnd).toBe(172000);
    expect(res.body.data.applied_price_tier).toBe('TIER_2');
  });

  it('6. POST /api/v1/b2b/orders deducts Multi-Lot FIFO, updates current_debt_vnd, writes ledger & audit log', async () => {
    // 30kg RC-ROB-MED @ 172,000 = 5,160,000 VND; paid 1,160,000 -> debt added 4,000,000
    // New debt for phoNuiCoffee: 12,500,000 + 4,000,000 = 16,500,000
    const res = await request(app)
      .post('/api/v1/b2b/orders')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_method: 'VIETQR',
        paid_amount_vnd: 1160000,
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_base_unit: 30000,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.total_amount_vnd).toBe(5160000);
    expect(res.body.data.order.payment_status).toBe('PENDING');
    expect(res.body.data.items).toHaveLength(2); // Split across LOT-CW-RC-ROB-001 (24.9kg) + LOT-CW-RC-ROB-002 (5.1kg)
    expect(res.body.data.debt_added_vnd).toBe(4000000);
    expect(res.body.data.projected_debt_vnd).toBe(16500000);

    // Verify FIFO warehouse deduction
    const lotsRes = await request(app)
      .get(`/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(lotsRes.body.data[0].status).toBe('DEPLETED');
    expect(lotsRes.body.data[0].remaining_qty).toBe(0);
    expect(lotsRes.body.data[1].remaining_qty).toBe(14900);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M3_B2B_ORDER_CREATED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });

  it('7. POST /api/v1/b2b/orders marks order PAID with zero debt added when paid in full', async () => {
    // 5kg @ 185,000 = 925,000 VND paid in full
    const res = await request(app)
      .post('/api/v1/b2b/orders')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.hoaDoBakery,
        payment_method: 'CASH',
        paid_amount_vnd: 925000,
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_base_unit: 5000,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.payment_status).toBe('PAID');
    expect(res.body.data.debt_added_vnd).toBe(0);
    expect(res.body.data.projected_debt_vnd).toBe(0);
  });

  it('8. POST /api/v1/b2b/orders blocks orders exceeding credit_limit_vnd (409 CREDIT_LIMIT_EXCEEDED) without deducting stock', async () => {
    // Ingest extra roasted stock first so stock is sufficient, then exceed hoaDoBakery's 20,000,000 credit limit
    await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-CW-RC-EXTRA-200KG',
        roast_date: '2026-11-22',
        initial_qty: 200000,
        unit_cost_vnd: 125000,
      });

    // 150kg @ 160,000 = 24,000,000 VND > 20,000,000 credit limit
    const res = await request(app)
      .post('/api/v1/b2b/orders')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.hoaDoBakery,
        payment_method: 'VIETQR',
        paid_amount_vnd: 0,
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_base_unit: 150000,
          },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CREDIT_LIMIT_EXCEEDED');

    // Confirm zero stock was deducted
    const lotsRes = await request(app)
      .get(`/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(lotsRes.body.data[0].remaining_qty).toBe(24900);
  });

  it('9. POST /api/v1/b2b/orders rejects insufficient warehouse FIFO stock (409 INSUFFICIENT_FIFO_STOCK) atomically', async () => {
    const res = await request(app)
      .post('/api/v1/b2b/orders')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        paid_amount_vnd: 0,
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_base_unit: 60000, // Exceeds 44,900 available
          },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_FIFO_STOCK');
  });

  it('10. POST /api/v1/b2b/debt-payments settles oldest PENDING invoice first (FIFO) and partially settles second invoice', async () => {
    // Create a second pending order for phoNuiCoffee (10kg @ 172k = 1,720,000, unpaid)
    await request(app)
      .post('/api/v1/b2b/orders')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        order_code: 'B2B-20261122-002',
        paid_amount_vnd: 0,
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_base_unit: 10000,
          },
        ],
      });

    // Total debt is now 12,500,000 (oldest) + 1,720,000 (second) = 14,220,000
    // Pay 13,000,000 -> settles 12,500,000 of B2B-20261101-001 (PAID) + 500,000 of B2B-20261122-002 (PENDING)
    const payRes = await request(app)
      .post('/api/v1/b2b/debt-payments')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_amount_vnd: 13000000,
        reference_note: 'Chuyển khoản tất toán đợt 1 + trả một phần đơn mới',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.previous_debt_vnd).toBe(14220000);
    expect(payRes.body.data.new_debt_vnd).toBe(1220000);
    expect(payRes.body.data.settled_orders).toHaveLength(2);
    expect(payRes.body.data.settled_orders[0].order_code).toBe('B2B-20261101-001');
    expect(payRes.body.data.settled_orders[0].new_payment_status).toBe('PAID');
    expect(payRes.body.data.settled_orders[1].order_code).toBe('B2B-20261122-002');
    expect(payRes.body.data.settled_orders[1].applied_vnd).toBe(500000);
    expect(payRes.body.data.settled_orders[1].new_payment_status).toBe('PENDING');

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M3_B2B_DEBT_PAYMENT_RECORDED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });

  it('11. POST /api/v1/b2b/debt-payments rejects payment exceeding current_debt_vnd (409 PAYMENT_EXCEEDS_CURRENT_DEBT)', async () => {
    const res = await request(app)
      .post('/api/v1/b2b/debt-payments')
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_amount_vnd: 12500001,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_EXCEEDS_CURRENT_DEBT');
  });

  it('12. GET /api/v1/transfers enforces Multi-Tenant isolation (Store 1 sees its transfer, Store 2 sees 0)', async () => {
    const mgr1Res = await request(app)
      .get('/api/v1/transfers')
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(mgr1Res.status).toBe(200);
    expect(mgr1Res.body.data).toHaveLength(1);
    expect(mgr1Res.body.data[0].to_store_id).toBe(SEED_IDS.stores.store01);

    const mgr2Res = await request(app)
      .get('/api/v1/transfers')
      .set(authAs(SEED_IDS.users.storeManager02));
    expect(mgr2Res.status).toBe(200);
    expect(mgr2Res.body.data).toHaveLength(0);
  });

  it('13. Phase 0 (REQUESTED): STORE_MANAGER Quán 1 creates internal transfer priced by internal_transfer_price_vnd', async () => {
    const res = await request(app)
      .post('/api/v1/transfers/request')
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        from_warehouse_id: SEED_IDS.stores.centralWarehouse,
        to_store_id: SEED_IDS.stores.store01,
        notes: 'Xin bổ sung 10kg Robusta cho cuối tuần',
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            requested_qty: 10000,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('REQUESTED');
    expect(res.body.data.total_internal_value_vnd).toBe(1550000);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M3_INTERNAL_TRANSFER_REQUESTED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });

  it('14. Phase 0 Cross-Branch Block: STORE_MANAGER Quán 1 CANNOT request transfer for Quán 2 (403 FORBIDDEN_CROSS_TENANT_ACCESS)', async () => {
    const res = await request(app)
      .post('/api/v1/transfers/request')
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        from_warehouse_id: SEED_IDS.stores.centralWarehouse,
        to_store_id: SEED_IDS.stores.store02,
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            requested_qty: 5000,
          },
        ],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('15. Phase 1 RBAC Block: STORE_MANAGER cannot dispatch internal transfers (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({ notes: 'Tự ý duyệt xuất' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('16. Phase 1 (IN_TRANSIT): WAREHOUSE_MANAGER dispatches REQUESTED transfer via FIFO, deducting Central Warehouse lot', async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({ notes: 'Xuất lô rang ngày 10/11 cho Quán 1' });

    expect(res.status).toBe(200);
    expect(res.body.data.transfer.status).toBe('IN_TRANSIT');
    expect(res.body.data.items[0].source_lot_id).toBe(SEED_IDS.warehouseLots.cwRoastedRobusta01);
    expect(res.body.data.items[0].dispatched_qty).toBe(5000);

    // Central Warehouse LOT-CW-RC-ROB-001 deducted from 24,900 -> 19,900
    const lotsRes = await request(app)
      .get(`/api/v1/warehouse/lots?item_id=${SEED_IDS.inventoryItems.roastedRobustaMed}`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(lotsRes.body.data[0].remaining_qty).toBe(19900);
  });

  it('17. Phase 1 State Guard: cannot dispatch a transfer that is already IN_TRANSIT (409 INVALID_TRANSFER_STATE)', async () => {
    await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({});

    const secondRes = await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({});

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('INVALID_TRANSFER_STATE');
  });

  it('18. Phase 2 Cross-Branch Block: STORE_MANAGER Quán 2 CANNOT reconcile Quán 1 transfer (403 FORBIDDEN_CROSS_TENANT_ACCESS)', async () => {
    await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({});

    const recRes = await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/reconcile`)
      .set(authAs(SEED_IDS.users.storeManager02))
      .send({
        items: [
          {
            transfer_item_id: SEED_TRANSFER_ITEM_IDS.store01InitialItem01,
            received_qty: 5000,
          },
        ],
      });

    expect(recRes.status).toBe(403);
    expect(recRes.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('19. Phase 2 Validation Guard: rejects received_qty exceeding dispatched_qty (400 INVALID_RECEIVED_QTY)', async () => {
    await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({});

    const recRes = await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/reconcile`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        items: [
          {
            transfer_item_id: SEED_TRANSFER_ITEM_IDS.store01InitialItem01,
            received_qty: 5500,
          },
        ],
      });

    expect(recRes.status).toBe(400);
    expect(recRes.body.error.code).toBe('INVALID_RECEIVED_QTY');
  });

  it('20. Phase 2 (RECONCILED) + Cost Masking: Store 1 Manager confirms 4800g -> creates Store 1 lot priced at internal_transfer_price_vnd while hiding all origin costs', async () => {
    await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`)
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({});

    const recRes = await request(app)
      .post(`/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/reconcile`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        items: [
          {
            transfer_item_id: SEED_TRANSFER_ITEM_IDS.store01InitialItem01,
            received_qty: 4800,
          },
        ],
        notes: 'Nhận thực tế 4.8kg (hao hụt vận chuyển 200g)',
      });

    expect(recRes.status).toBe(200);
    expect(recRes.body.data.transfer.status).toBe('RECONCILED');
    expect(recRes.body.data.transfer.total_internal_value_vnd).toBe(744000); // 4.8kg * 155,000
    expect(recRes.body.data.created_store_lots).toHaveLength(1);

    // STORE_MANAGER response MUST NOT leak any SENSITIVE_COST_KEYS
    for (const forbiddenKey of SENSITIVE_COST_KEYS) {
      expect(recRes.body.data.created_store_lots[0]).not.toHaveProperty(forbiddenKey);
    }

    // Verify via SUPER_ADMIN that stored Store 1 lot uses internal_transfer_price_vnd (155,000), NEVER Central Warehouse MAC (124,500)
    const store1LotsAdminRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/lots`)
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(store1LotsAdminRes.status).toBe(200);
    expect(store1LotsAdminRes.body.data).toHaveLength(2);
    const createdLot = store1LotsAdminRes.body.data.find(
      (l: { initial_qty: number }) => l.initial_qty === 4800,
    );
    expect(createdLot).toBeDefined();
    expect(createdLot.unit_cost_vnd).toBe(155000);
    expect(createdLot.roast_date).toBe('2026-11-10');

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=M3_INTERNAL_TRANSFER_RECONCILED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M3.2 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\modules\transfers\transfers.service.ts','C:\bib\cf_19\apps\api\src\modules\transfers\transfers.routes.ts','C:\bib\cf_19\apps\api\src\index.ts','C:\bib\cf_19\apps\api\src\__tests__\m3-b2b-transfers.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
