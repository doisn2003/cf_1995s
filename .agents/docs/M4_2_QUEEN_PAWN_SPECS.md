# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M4.2 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **8 files (4 + 4)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1–M1.3, M2.1–M2.3, M3.1–M3.3, M4.1 (`0005` SQL RPCs + `@cf19/shared` M4 schemas, types & `posBomAndReceiptMath.ts`).
- **Cam kết tương thích ngược:** Giữ nguyên 100% dữ liệu M1.2, M2.2 & M3.2 để toàn bộ **57/57 tests của `@cf19/api`** tiếp tục PASS tuyệt đối!

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# MỞ RỘNG SEED STORE (CATALOG + BOM + SHIFTS) & CATALOG MODULE (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây cho tầng DB In-Memory (bổ sung Menu/Variants/Modifiers/BOM/Shifts Quán 2 & 3) và phân hệ Catalog (`modules/catalog/*`) của `@cf19/api`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thay đổi tên hàm, mã lỗi hay đuôi `.js` trong import ESM.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `modules/pos/*`, `index.ts`, hay `m4-pos-catalog-offline.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M4.2 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Cập nhật — Overwrite)
2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\api\src\modules\catalog\catalog.service.ts` (Tạo mới)
4. `C:\bib\cf_19\apps\api\src\modules\catalog\catalog.routes.ts` (Tạo mới)

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
  type BomRecipeWithItemsDTO,
  type EmploymentType,
  type InternalTransferDto,
  type InternalTransferItemDto,
  type MenuCategoryDto,
  type MenuModifierDto,
  type MenuProductDto,
  type MenuVariantDto,
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

export const SEED_EXTRA_MODIFIER_IDS = {
  sugar0: '63000000-0000-4000-8000-000000000005',
  ice0: '63000000-0000-4000-8000-000000000006',
} as const;

export const SEED_EXTRA_SHIFT_IDS = {
  store02OpenShift: '80000000-0000-4000-8000-000000000002',
  store03OpenShift: '80000000-0000-4000-8000-000000000003',
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
  menuCategories: MenuCategoryDto[];
  menuProducts: MenuProductDto[];
  menuVariants: MenuVariantDto[];
  menuModifiers: MenuModifierDto[];
  bomRecipes: BomRecipeWithItemsDTO[];
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

  const menuCategories: MenuCategoryDto[] = [
    {
      id: SEED_IDS.menuCategories.coffee,
      organization_id: SEED_IDS.organization.cf19,
      code: 'CAT-COFFEE',
      name: 'Cà Phê Tây Nguyên',
      sort_order: 1,
      is_active: true,
    },
    {
      id: SEED_IDS.menuCategories.milkAndTea,
      organization_id: SEED_IDS.organization.cf19,
      code: 'CAT-MILK',
      name: 'Cà Phê Sữa & Bạc Xỉu',
      sort_order: 2,
      is_active: true,
    },
  ];

  const menuProducts: MenuProductDto[] = [
    {
      id: SEED_IDS.menuProducts.caPheSuaDa,
      organization_id: SEED_IDS.organization.cf19,
      category_id: SEED_IDS.menuCategories.coffee,
      code: 'PRD-CF-SUA-DA',
      name: 'Cà Phê Sữa Đá Tây Nguyên',
      base_price_vnd: 29000,
      is_active: true,
    },
    {
      id: SEED_IDS.menuProducts.caPheDenDa,
      organization_id: SEED_IDS.organization.cf19,
      category_id: SEED_IDS.menuCategories.coffee,
      code: 'PRD-CF-DEN-DA',
      name: 'Cà Phê Đen Đá Nguyên Chất',
      base_price_vnd: 25000,
      is_active: true,
    },
    {
      id: SEED_IDS.menuProducts.bacXiuTayNguyen,
      organization_id: SEED_IDS.organization.cf19,
      category_id: SEED_IDS.menuCategories.milkAndTea,
      code: 'PRD-BAC-XIU',
      name: 'Bạc Xỉu Tây Nguyên',
      base_price_vnd: 35000,
      is_active: true,
    },
  ];

  const menuVariants: MenuVariantDto[] = [
    {
      id: SEED_IDS.menuVariants.caPheSuaDaM,
      product_id: SEED_IDS.menuProducts.caPheSuaDa,
      size_code: 'M',
      name: 'Size M (Tiêu chuẩn)',
      price_delta_vnd: 0,
      is_default: true,
      is_active: true,
    },
    {
      id: SEED_IDS.menuVariants.caPheSuaDaL,
      product_id: SEED_IDS.menuProducts.caPheSuaDa,
      size_code: 'L',
      name: 'Size L (Lớn)',
      price_delta_vnd: 6000,
      is_default: false,
      is_active: true,
    },
    {
      id: SEED_IDS.menuVariants.caPheDenDaM,
      product_id: SEED_IDS.menuProducts.caPheDenDa,
      size_code: 'M',
      name: 'Size M (Tiêu chuẩn)',
      price_delta_vnd: 0,
      is_default: true,
      is_active: true,
    },
    {
      id: SEED_IDS.menuVariants.caPheDenDaL,
      product_id: SEED_IDS.menuProducts.caPheDenDa,
      size_code: 'L',
      name: 'Size L (Lớn)',
      price_delta_vnd: 6000,
      is_default: false,
      is_active: true,
    },
    {
      id: SEED_IDS.menuVariants.bacXiuM,
      product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
      size_code: 'M',
      name: 'Size M (Tiêu chuẩn)',
      price_delta_vnd: 0,
      is_default: true,
      is_active: true,
    },
    {
      id: SEED_IDS.menuVariants.bacXiuL,
      product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
      size_code: 'L',
      name: 'Size L (Lớn)',
      price_delta_vnd: 6000,
      is_default: false,
      is_active: true,
    },
  ];

  const menuModifiers: MenuModifierDto[] = [
    {
      id: SEED_IDS.menuModifiers.sugar50,
      organization_id: SEED_IDS.organization.cf19,
      code: 'MOD-SUGAR-50',
      modifier_group: 'SUGAR',
      name: 'Ít đường (50%)',
      price_delta_vnd: 0,
      inventory_item_id: null,
      bom_qty_base_unit: 0,
      is_active: true,
    },
    {
      id: SEED_EXTRA_MODIFIER_IDS.sugar0,
      organization_id: SEED_IDS.organization.cf19,
      code: 'MOD-SUGAR-0',
      modifier_group: 'SUGAR',
      name: 'Không đường (0%)',
      price_delta_vnd: 0,
      inventory_item_id: null,
      bom_qty_base_unit: 0,
      is_active: true,
    },
    {
      id: SEED_IDS.menuModifiers.ice50,
      organization_id: SEED_IDS.organization.cf19,
      code: 'MOD-ICE-50',
      modifier_group: 'ICE',
      name: 'Ít đá (50%)',
      price_delta_vnd: 0,
      inventory_item_id: null,
      bom_qty_base_unit: 0,
      is_active: true,
    },
    {
      id: SEED_EXTRA_MODIFIER_IDS.ice0,
      organization_id: SEED_IDS.organization.cf19,
      code: 'MOD-ICE-0',
      modifier_group: 'ICE',
      name: 'Không đá (0%)',
      price_delta_vnd: 0,
      inventory_item_id: null,
      bom_qty_base_unit: 0,
      is_active: true,
    },
    {
      id: SEED_IDS.menuModifiers.extraEspressoShot,
      organization_id: SEED_IDS.organization.cf19,
      code: 'MOD-TOP-SHOT',
      modifier_group: 'TOPPING',
      name: 'Thêm 1 Shot Espresso',
      price_delta_vnd: 10000,
      inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      bom_qty_base_unit: 18,
      is_active: true,
    },
    {
      id: SEED_IDS.menuModifiers.extraCondensedMilk,
      organization_id: SEED_IDS.organization.cf19,
      code: 'MOD-TOP-MILK',
      modifier_group: 'TOPPING',
      name: 'Thêm Sữa Đặc',
      price_delta_vnd: 5000,
      inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
      bom_qty_base_unit: 15,
      is_active: true,
    },
  ];

  const bomRecipes: BomRecipeWithItemsDTO[] = [
    {
      id: SEED_IDS.bomRecipes.caPheSuaDaM,
      product_id: SEED_IDS.menuProducts.caPheSuaDa,
      variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
      version: 1,
      is_active: true,
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          sku: 'RC-ROB-MED',
          name: 'Cà phê hạt rang Robusta Medium (Kg)',
          base_unit: 'g',
          quantity_per_cup_base_unit: 20,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 155000,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
          sku: 'ING-COND-MILK',
          name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
          base_unit: 'ml',
          quantity_per_cup_base_unit: 25,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 60,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
          sku: 'PKG-CUP-500',
          name: 'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 1350,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
          sku: 'PKG-STRAW-BIO',
          name: 'Ống hút sinh học phi 6 bọc giấy',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 220,
        },
      ],
    },
    {
      id: '64000000-0000-4000-8000-000000000004',
      product_id: SEED_IDS.menuProducts.caPheSuaDa,
      variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
      version: 1,
      is_active: true,
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          sku: 'RC-ROB-MED',
          name: 'Cà phê hạt rang Robusta Medium (Kg)',
          base_unit: 'g',
          quantity_per_cup_base_unit: 28,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 155000,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
          sku: 'ING-COND-MILK',
          name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
          base_unit: 'ml',
          quantity_per_cup_base_unit: 35,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 60,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
          sku: 'PKG-CUP-500',
          name: 'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 1350,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
          sku: 'PKG-STRAW-BIO',
          name: 'Ống hút sinh học phi 6 bọc giấy',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 220,
        },
      ],
    },
    {
      id: SEED_IDS.bomRecipes.caPheDenDaM,
      product_id: SEED_IDS.menuProducts.caPheDenDa,
      variant_id: SEED_IDS.menuVariants.caPheDenDaM,
      version: 1,
      is_active: true,
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          sku: 'RC-ROB-MED',
          name: 'Cà phê hạt rang Robusta Medium (Kg)',
          base_unit: 'g',
          quantity_per_cup_base_unit: 22,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 155000,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
          sku: 'PKG-CUP-500',
          name: 'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 1350,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
          sku: 'PKG-STRAW-BIO',
          name: 'Ống hút sinh học phi 6 bọc giấy',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 220,
        },
      ],
    },
    {
      id: SEED_IDS.bomRecipes.bacXiuM,
      product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
      variant_id: SEED_IDS.menuVariants.bacXiuM,
      version: 1,
      is_active: true,
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          sku: 'RC-ROB-MED',
          name: 'Cà phê hạt rang Robusta Medium (Kg)',
          base_unit: 'g',
          quantity_per_cup_base_unit: 15,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 155000,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
          sku: 'ING-COND-MILK',
          name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
          base_unit: 'ml',
          quantity_per_cup_base_unit: 25,
          wastage_allowance_pct: 2,
          internal_transfer_price_vnd: 60,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.freshMilk,
          sku: 'ING-FRESH-MILK',
          name: 'Sữa tươi thanh trùng DalatMilk không đường',
          base_unit: 'ml',
          quantity_per_cup_base_unit: 80,
          wastage_allowance_pct: 3,
          internal_transfer_price_vnd: 39,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
          sku: 'PKG-CUP-500',
          name: 'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 1350,
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
          sku: 'PKG-STRAW-BIO',
          name: 'Ống hút sinh học phi 6 bọc giấy',
          base_unit: 'pcs',
          quantity_per_cup_base_unit: 1,
          wastage_allowance_pct: 0,
          internal_transfer_price_vnd: 220,
        },
      ],
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
    {
      id: SEED_EXTRA_SHIFT_IDS.store02OpenShift,
      store_id: SEED_IDS.stores.store02,
      cashier_id: SEED_IDS.users.cashier02,
      opened_at: BASE_TS,
      closed_at: null,
      opening_cash_vnd: 1500000,
      blind_counted_cash_vnd: null,
      system_expected_cash_vnd: 1570000,
      variance_cash_vnd: null,
      status: 'OPEN',
      notes: 'Ca sáng Quán 2 khởi tạo mặc định',
    },
    {
      id: SEED_EXTRA_SHIFT_IDS.store03OpenShift,
      store_id: SEED_IDS.stores.store03,
      cashier_id: SEED_IDS.users.superAdmin,
      opened_at: BASE_TS,
      closed_at: null,
      opening_cash_vnd: 2000000,
      blind_counted_cash_vnd: null,
      system_expected_cash_vnd: 2000000,
      variance_cash_vnd: null,
      status: 'OPEN',
      notes: 'Ca sáng Quán 3 (Hệ số vùng 1.05x)',
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
      shift_id: SEED_EXTRA_SHIFT_IDS.store02OpenShift,
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
    menuCategories,
    menuProducts,
    menuVariants,
    menuModifiers,
    bomRecipes,
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

### File 3: `C:\bib\cf_19\apps\api\src\modules\catalog\catalog.service.ts`
```ts
import {
  calculateBranchAdjustedBasePriceVnd,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BomInventoryCostLookup,
  type BomMaterialRequirementSliceDTO,
  type MenuModifierDto,
  type PosLinePricingBreakdownDTO,
  type PosOrderCartItemInputDTO,
  type StorePosCatalogDTO,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

export interface PreviewPricingResultDTO {
  store_id: string;
  price_multiplier: number;
  lines: Array<
    PosLinePricingBreakdownDTO & {
      product_id: string;
      variant_id: string;
    }
  >;
  total_amount_vnd: number;
  bom_requirements: BomMaterialRequirementSliceDTO[];
  cogs_amount_vnd: number;
}

export async function getStorePosCatalog(
  storeId: string,
  includeInactive = false,
): Promise<StorePosCatalogDTO> {
  const db = getInMemoryDb();
  const store = db.stores.find((s) => s.id === storeId && s.is_active);
  if (!store) {
    throw new WarehouseDomainError(404, 'NOT_FOUND', `Store ${storeId} not found`);
  }
  if (store.type === 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_POS_STORE',
      'CENTRAL_WAREHOUSE does not serve a retail POS menu catalog',
    );
  }

  const categories = db.menuCategories
    .filter((c) => includeInactive || c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => structuredClone(c));

  const products = db.menuProducts
    .filter((p) => includeInactive || p.is_active)
    .map((p) => {
      const variants = db.menuVariants
        .filter((v) => v.product_id === p.id && (includeInactive || v.is_active))
        .sort((a, b) => a.price_delta_vnd - b.price_delta_vnd)
        .map((v) => structuredClone(v));

      return {
        ...structuredClone(p),
        effective_base_price_vnd: calculateBranchAdjustedBasePriceVnd(
          p.base_price_vnd,
          store.price_multiplier,
        ),
        variants,
      };
    });

  const modifiers = db.menuModifiers
    .filter((m) => includeInactive || m.is_active)
    .map((m) => structuredClone(m));

  const bomRecipes = db.bomRecipes
    .filter((r) => includeInactive || r.is_active)
    .map((r) => structuredClone(r));

  return {
    store: {
      id: store.id,
      code: store.code,
      name: store.name,
      price_multiplier: store.price_multiplier,
    },
    categories,
    products,
    modifiers,
    bom_recipes: bomRecipes,
  };
}

export async function previewBomAndLinePricing(
  storeId: string,
  items: PosOrderCartItemInputDTO[],
): Promise<PreviewPricingResultDTO> {
  const db = getInMemoryDb();
  const store = db.stores.find((s) => s.id === storeId && s.is_active);
  if (!store || store.type === 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_POS_STORE',
      'Target store must be an active retail or franchise store',
    );
  }

  const modifiersById: Record<string, MenuModifierDto> = {};
  for (const mod of db.menuModifiers) {
    if (mod.is_active) {
      modifiersById[mod.id] = mod;
    }
  }

  const inventoryItemsById: Record<string, BomInventoryCostLookup> = {};
  for (const inv of db.inventoryItems) {
    inventoryItemsById[inv.id] = {
      id: inv.id,
      sku: inv.sku,
      name: inv.name,
      base_unit: inv.base_unit,
      internal_transfer_price_vnd: inv.internal_transfer_price_vnd,
    };
  }

  const pricedLines: PreviewPricingResultDTO['lines'] = [];
  let totalAmountVnd = 0;

  for (const line of items) {
    const product = db.menuProducts.find(
      (p) => p.id === line.product_id && p.is_active,
    );
    if (!product) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Active menu product ${line.product_id} not found`,
      );
    }

    const variant = db.menuVariants.find(
      (v) =>
        v.id === line.variant_id &&
        v.product_id === product.id &&
        v.is_active,
    );
    if (!variant) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Active variant ${line.variant_id} not found for product ${product.code}`,
      );
    }

    const selectedMods: MenuModifierDto[] = [];
    for (const modId of line.modifier_ids) {
      const mod = modifiersById[modId];
      if (!mod) {
        throw new WarehouseDomainError(
          404,
          'NOT_FOUND',
          `Active menu modifier ${modId} not found`,
        );
      }
      selectedMods.push(mod);
    }

    const matrixCheck = validateModifierSelectionMatrix(selectedMods);
    if (!matrixCheck.valid) {
      throw new WarehouseDomainError(
        400,
        'INVALID_MODIFIER_MATRIX',
        matrixCheck.errors.join('; '),
      );
    }

    const breakdown = calculatePosLinePricing({
      basePriceVnd: product.base_price_vnd,
      priceMultiplier: store.price_multiplier,
      variantPriceDeltaVnd: variant.price_delta_vnd,
      modifiers: selectedMods,
      quantity: line.quantity,
    });

    totalAmountVnd += breakdown.line_total_vnd;
    pricedLines.push({
      ...breakdown,
      product_id: product.id,
      variant_id: variant.id,
    });
  }

  const bom = calculateOrderBomRequirementsAndCogs({
    lines: items,
    recipes: db.bomRecipes,
    modifiersById,
    inventoryItemsById,
  });

  return {
    store_id: store.id,
    price_multiplier: store.price_multiplier,
    lines: pricedLines,
    total_amount_vnd: totalAmountVnd,
    bom_requirements: bom.requirements,
    cogs_amount_vnd: bom.total_cogs_vnd,
  };
}
```

### File 4: `C:\bib\cf_19\apps\api\src\modules\catalog\catalog.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  PosCatalogQuerySchema,
  PosOrderCartItemInputSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  getStorePosCatalog,
  previewBomAndLinePricing,
} from './catalog.service.js';

export const catalogRouter = Router();

const PreviewPricingBodySchema = z.object({
  items: z
    .array(PosOrderCartItemInputSchema)
    .min(1, 'Preview requires at least 1 cart item'),
});

function handleCatalogError(res: Response, err: unknown): void {
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
    err instanceof Error ? err.message : 'Unexpected catalog error';
  res.status(500).json({
    error: {
      code: 'CATALOG_INTERNAL_ERROR',
      message,
    },
  });
}

catalogRouter.get(
  '/stores/:storeId',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsedQuery = PosCatalogQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CATALOG_QUERY',
          message: 'Invalid catalog query parameters',
          details: parsedQuery.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const catalog = await getStorePosCatalog(
        req.params.storeId,
        parsedQuery.data.include_inactive,
      );
      res.status(200).json({ data: catalog });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.post(
  '/stores/:storeId/preview-pricing',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsedBody = PreviewPricingBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PREVIEW_PAYLOAD',
          message: 'Invalid pricing preview payload',
          details: parsedBody.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const preview = await previewBomAndLinePricing(
        req.params.storeId,
        parsedBody.data.items,
      );
      res.status(200).json({ data: preview });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M4.2 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\db\seedData.ts','C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts','C:\bib\cf_19\apps\api\src\modules\catalog\catalog.service.ts','C:\bib\cf_19\apps\api\src\modules\catalog\catalog.routes.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# POS ORDER STATE-MACHINE, OFFLINE SYNC, APP MOUNT & 20 SUPERTEST CASES (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây: `pos.service.ts`, `pos.routes.ts`, cập nhật `index.ts` (mount `/api/v1/catalog` & `/api/v1/pos`), và bộ 20 Vitest + Supertest Integration Tests `m4-pos-catalog-offline.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không rút gọn test cases, không đổi mã lỗi hay route paths.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M4.2 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\modules\pos\pos.service.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\api\src\modules\pos\pos.routes.ts` (Tạo mới)
3. `C:\bib\cf_19\apps\api\src\index.ts` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\apps\api\src\__tests__\m4-pos-catalog-offline.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\src\modules\pos\pos.service.ts`
```ts
import { randomUUID } from 'node:crypto';
import {
  buildEscPosThermalReceiptText,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BomInventoryCostLookup,
  type MenuModifierDto,
  type OfflinePosBatchSyncDTO,
  type OfflinePosBatchSyncResultDTO,
  type PaymentStatus,
  type PosOrderDetailResultDTO,
  type PosOrderFullDto,
  type PosOrderItemDto,
  type PosOrdersFilterQueryDTO,
  type SubmitPosOrderDTO,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

function hydrateOrder(order: PosOrderFullDto): PosOrderFullDto {
  const items = getInMemoryDb()
    .posOrderItems.filter((it) => it.order_id === order.id)
    .map((it) => structuredClone(it));
  return {
    ...structuredClone(order),
    items,
  };
}

function renderThermalReceiptForOrder(
  order: PosOrderFullDto,
  items: PosOrderItemDto[],
): string {
  const db = getInMemoryDb();
  const store = db.stores.find((s) => s.id === order.store_id);
  const cashier = db.users.find((u) => u.id === order.cashier_id);

  return buildEscPosThermalReceiptText({
    store_name: store?.name ?? 'CF19 Store',
    store_address: store?.address,
    order_code: order.order_code,
    created_at: order.created_at,
    cashier_name: cashier?.full_name ?? 'Cashier',
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    vietqr_ref_code: order.vietqr_ref_code,
    total_amount_vnd: order.total_amount_vnd,
    lines: items.map((it) => {
      const product = db.menuProducts.find((p) => p.id === it.product_id);
      const variant = db.menuVariants.find((v) => v.id === it.variant_id);
      return {
        product_name: product?.name ?? 'Do uong',
        size_code: variant?.size_code ?? 'M',
        modifier_names: it.modifiers_json.map((m) => m.name),
        quantity: it.quantity,
        unit_price_vnd: it.unit_price_vnd,
        line_total_vnd: it.line_total_vnd,
        notes: it.notes,
      };
    }),
  });
}

export async function listStoreOrders(
  storeId: string,
  filter: PosOrdersFilterQueryDTO = { limit: 50 },
): Promise<PosOrderFullDto[]> {
  return getInMemoryDb()
    .posOrders.filter((ord) => {
      if (ord.store_id !== storeId) {
        return false;
      }
      if (filter.payment_status && ord.payment_status !== filter.payment_status) {
        return false;
      }
      if (filter.kds_status && ord.kds_status !== filter.kds_status) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, filter.limit)
    .map(hydrateOrder);
}

export async function getOrderReceipt(
  storeId: string,
  orderId: string,
): Promise<{ order: PosOrderFullDto; thermal_receipt_text: string }> {
  const db = getInMemoryDb();
  const order = db.posOrders.find(
    (o) => o.id === orderId && o.store_id === storeId,
  );
  if (!order) {
    throw new WarehouseDomainError(
      404,
      'NOT_FOUND',
      `POS order ${orderId} not found in store ${storeId}`,
    );
  }

  const hydrated = hydrateOrder(order);
  const receiptText = renderThermalReceiptForOrder(
    hydrated,
    hydrated.items ?? [],
  );

  return {
    order: hydrated,
    thermal_receipt_text: receiptText,
  };
}

export async function createPosOrder(
  actor: AuthActor,
  storeId: string,
  input: SubmitPosOrderDTO,
): Promise<PosOrderDetailResultDTO> {
  const db = getInMemoryDb();
  const store = db.stores.find((s) => s.id === storeId && s.is_active);
  if (!store || store.type === 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_POS_STORE',
      'Target store must be an active retail or franchise store',
    );
  }

  // Idempotent Replay Check by client_order_code
  const normalizedClientCode = input.client_order_code?.trim();
  if (normalizedClientCode) {
    const existing = db.posOrders.find(
      (o) => o.order_code === normalizedClientCode,
    );
    if (existing) {
      if (existing.store_id !== storeId) {
        throw new WarehouseDomainError(
          403,
          'FORBIDDEN_CROSS_TENANT_ACCESS',
          `Order code ${normalizedClientCode} belongs to another store`,
        );
      }

      const hydrated = hydrateOrder(existing);
      const items = hydrated.items ?? [];
      return {
        sync_status: 'IDEMPOTENT_EXISTING',
        order: hydrated,
        items,
        bom_requirements: [],
        thermal_receipt_text: renderThermalReceiptForOrder(hydrated, items),
      };
    }
  }

  // Validate OPEN shift belongs to this store
  const shift = db.posShifts.find(
    (sh) =>
      sh.id === input.shift_id &&
      sh.store_id === storeId &&
      sh.status === 'OPEN',
  );
  if (!shift) {
    throw new WarehouseDomainError(
      409,
      'SHIFT_NOT_OPEN',
      `Shift ${input.shift_id} is not OPEN for store ${store.code}`,
    );
  }

  const modifiersById: Record<string, MenuModifierDto> = {};
  for (const mod of db.menuModifiers) {
    if (mod.is_active) {
      modifiersById[mod.id] = mod;
    }
  }

  const inventoryItemsById: Record<string, BomInventoryCostLookup> = {};
  for (const inv of db.inventoryItems) {
    inventoryItemsById[inv.id] = {
      id: inv.id,
      sku: inv.sku,
      name: inv.name,
      base_unit: inv.base_unit,
      internal_transfer_price_vnd: inv.internal_transfer_price_vnd,
    };
  }

  const nowIso = new Date().toISOString();
  const orderId = randomUUID();
  const preparedItems: PosOrderItemDto[] = [];
  let totalAmountVnd = 0;

  for (const line of input.items) {
    const product = db.menuProducts.find(
      (p) => p.id === line.product_id && p.is_active,
    );
    if (!product) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Active menu product ${line.product_id} not found`,
      );
    }

    const variant = db.menuVariants.find(
      (v) =>
        v.id === line.variant_id &&
        v.product_id === product.id &&
        v.is_active,
    );
    if (!variant) {
      throw new WarehouseDomainError(
        404,
        'NOT_FOUND',
        `Active variant ${line.variant_id} not found for product ${product.code}`,
      );
    }

    const selectedMods: MenuModifierDto[] = [];
    for (const modId of line.modifier_ids) {
      const mod = modifiersById[modId];
      if (!mod) {
        throw new WarehouseDomainError(
          404,
          'NOT_FOUND',
          `Active menu modifier ${modId} not found`,
        );
      }
      selectedMods.push(mod);
    }

    const matrixCheck = validateModifierSelectionMatrix(selectedMods);
    if (!matrixCheck.valid) {
      throw new WarehouseDomainError(
        400,
        'INVALID_MODIFIER_MATRIX',
        matrixCheck.errors.join('; '),
      );
    }

    const pricing = calculatePosLinePricing({
      basePriceVnd: product.base_price_vnd,
      priceMultiplier: store.price_multiplier,
      variantPriceDeltaVnd: variant.price_delta_vnd,
      modifiers: selectedMods,
      quantity: line.quantity,
    });

    totalAmountVnd += pricing.line_total_vnd;

    preparedItems.push({
      id: randomUUID(),
      order_id: orderId,
      store_id: storeId,
      product_id: product.id,
      variant_id: variant.id,
      modifiers_json: selectedMods.map((m) => ({
        id: m.id,
        name: m.name,
        price_delta_vnd: m.price_delta_vnd,
      })),
      quantity: line.quantity,
      unit_price_vnd: pricing.unit_price_vnd,
      line_total_vnd: pricing.line_total_vnd,
      notes: line.notes ?? null,
      created_at: nowIso,
    });
  }

  const bom = calculateOrderBomRequirementsAndCogs({
    lines: input.items,
    recipes: db.bomRecipes,
    modifiersById,
    inventoryItemsById,
  });

  const compactStoreCode = store.code.replace(/-/g, '');
  const orderCode =
    normalizedClientCode ??
    `POS-${compactStoreCode}-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(db.posOrders.length + 1).padStart(3, '0')}`;

  const paymentStatus: PaymentStatus =
    input.payment_method === 'CASH' ? 'PAID' : 'PENDING';
  const vietqrRefCode =
    input.payment_method === 'VIETQR'
      ? `CF19${compactStoreCode}${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
      : null;

  const createdOrder: PosOrderFullDto = {
    id: orderId,
    order_code: orderCode,
    store_id: storeId,
    shift_id: shift.id,
    cashier_id: actor.id,
    customer_phone: input.customer_phone ?? null,
    payment_method: input.payment_method,
    payment_status: paymentStatus,
    kds_status: 'QUEUED',
    vietqr_ref_code: vietqrRefCode,
    total_amount_vnd: totalAmountVnd,
    cogs_amount_vnd: bom.total_cogs_vnd,
    bom_deducted_at: null,
    void_approved_by_manager_id: null,
    void_reason: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  db.posOrders.push(createdOrder);
  db.posOrderItems.push(...preparedItems);

  // Update open shift theoretical cash ONLY for CASH orders (remains hidden from Cashier via Blind Close!)
  if (input.payment_method === 'CASH') {
    shift.system_expected_cash_vnd =
      (shift.system_expected_cash_vnd ?? shift.opening_cash_vnd) +
      totalAmountVnd;
  }

  recordAuditLog({
    actorId: actor.id,
    storeId,
    action: 'POS_ORDER_CREATED',
    targetTable: 'pos_orders',
    targetId: orderId,
    reason: `POS order ${orderCode} created (${input.payment_method})`,
    payload: {
      order_code: orderCode,
      payment_method: input.payment_method,
      payment_status: paymentStatus,
      total_amount_vnd: totalAmountVnd,
      cogs_amount_vnd: bom.total_cogs_vnd,
      item_count: preparedItems.length,
    },
  });

  const hydrated = hydrateOrder(createdOrder);
  const receiptText = renderThermalReceiptForOrder(hydrated, preparedItems);

  return {
    sync_status: 'SYNCED_NEW',
    order: hydrated,
    items: preparedItems.map((it) => structuredClone(it)),
    bom_requirements: bom.requirements,
    thermal_receipt_text: receiptText,
  };
}

export async function syncOfflinePosOrders(
  actor: AuthActor,
  storeId: string,
  input: OfflinePosBatchSyncDTO,
): Promise<OfflinePosBatchSyncResultDTO> {
  const results: PosOrderDetailResultDTO[] = [];
  let syncedNewCount = 0;
  let idempotentExistingCount = 0;

  for (const entry of input.orders) {
    const single = await createPosOrder(actor, storeId, {
      shift_id: input.shift_id,
      payment_method: entry.payment_method,
      customer_phone: entry.customer_phone,
      client_order_code: entry.client_order_code,
      items: entry.items,
    });

    if (single.sync_status === 'SYNCED_NEW') {
      syncedNewCount += 1;
    } else {
      idempotentExistingCount += 1;
    }
    results.push(single);
  }

  recordAuditLog({
    actorId: actor.id,
    storeId,
    action: 'POS_OFFLINE_BATCH_SYNCED',
    targetTable: 'pos_orders',
    targetId: input.shift_id,
    reason: 'Idempotent offline-first POS batch sync completed',
    payload: {
      total_received: input.orders.length,
      synced_new_count: syncedNewCount,
      idempotent_existing_count: idempotentExistingCount,
    },
  });

  return {
    total_received: input.orders.length,
    synced_new_count: syncedNewCount,
    idempotent_existing_count: idempotentExistingCount,
    results,
  };
}
```

### File 2: `C:\bib\cf_19\apps\api\src\modules\pos\pos.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import {
  OfflinePosBatchSyncSchema,
  PosOrdersFilterQuerySchema,
  SubmitPosOrderSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  createPosOrder,
  getOrderReceipt,
  listStoreOrders,
  syncOfflinePosOrders,
} from './pos.service.js';

export const posRouter = Router();

function handlePosError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected POS error';
  res.status(500).json({
    error: {
      code: 'POS_INTERNAL_ERROR',
      message,
    },
  });
}

posRouter.get(
  '/stores/:storeId/orders',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsedQuery = PosOrdersFilterQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_POS_ORDERS_QUERY',
          message: 'Invalid POS orders query parameters',
          details: parsedQuery.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const orders = await listStoreOrders(req.params.storeId, parsedQuery.data);
      res.status(200).json({ data: orders });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);

posRouter.post(
  '/stores/:storeId/orders',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = SubmitPosOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_POS_ORDER_PAYLOAD',
          message: 'Invalid POS order submission payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await createPosOrder(
        req.actor!,
        req.params.storeId,
        parsed.data,
      );
      const status = result.sync_status === 'SYNCED_NEW' ? 201 : 200;
      res.status(status).json({ data: result });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);

posRouter.post(
  '/stores/:storeId/orders/offline-sync',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = OfflinePosBatchSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_OFFLINE_SYNC_PAYLOAD',
          message: 'Invalid offline POS batch sync payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await syncOfflinePosOrders(
        req.actor!,
        req.params.storeId,
        parsed.data,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);

posRouter.get(
  '/stores/:storeId/orders/:orderId/receipt',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const receipt = await getOrderReceipt(
        req.params.storeId,
        req.params.orderId,
      );
      res.status(200).json({ data: receipt });
    } catch (err) {
      handlePosError(res, err);
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
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { posRouter } from './modules/pos/pos.routes.js';
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
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/pos', posRouter);

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

### File 4: `C:\bib\cf_19\apps\api\src\__tests__\m4-pos-catalog-offline.test.ts`
```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ESC_POS_RECEIPT_WIDTH,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
} from '@cf19/shared';
import { resetInMemoryDb } from '../db/inMemoryDb.js';
import {
  SEED_EXTRA_MODIFIER_IDS,
  SEED_EXTRA_SHIFT_IDS,
} from '../db/seedData.js';
import { app } from '../index.js';

function authAs(userId: string): Record<string, string> {
  return { Authorization: `Bearer dev:${userId}` };
}

describe('M4.2 — @cf19/api Master Catalog, Regional Pricing, BOM COGS, POS Orders & Offline Batch Sync', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. blocks WAREHOUSE_MANAGER from accessing retail store catalog (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .get(`/api/v1/catalog/stores/${SEED_IDS.stores.store01}`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('2. blocks WAREHOUSE_MANAGER and BARISTA_KDS from creating POS orders (403 FORBIDDEN_ROLE)', async () => {
    for (const userId of [
      SEED_IDS.users.warehouseManager,
      SEED_IDS.users.barista01,
    ]) {
      const res = await request(app)
        .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
        .set(authAs(userId))
        .send({
          shift_id: SEED_IDS.posShifts.store01OpenShift,
          payment_method: 'CASH',
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheSuaDa,
              variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
              quantity: 1,
            },
          ],
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    }
  });

  it('3. Multi-Tenant Isolation: CASHIER_STAFF Quán 1 blocked from Quán 2 catalog (403 FORBIDDEN_CROSS_TENANT_ACCESS)', async () => {
    const res = await request(app)
      .get(`/api/v1/catalog/stores/${SEED_IDS.stores.store02}`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('4. Multi-Tenant Isolation: CASHIER_STAFF Quán 1 blocked from creating POS order at Quán 2 (403 FORBIDDEN_CROSS_TENANT_ACCESS)', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store02}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_EXTRA_SHIFT_IDS.store02OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            quantity: 1,
          },
        ],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('5. GET /api/v1/catalog/stores/:store01 returns Store 1 catalog (1.00x: Cà Phê Sữa Đá = 29,000đ)', async () => {
    const res = await request(app)
      .get(`/api/v1/catalog/stores/${SEED_IDS.stores.store01}`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(res.status).toBe(200);
    expect(res.body.data.store.price_multiplier).toBe(1);
    expect(res.body.data.categories).toHaveLength(2);
    expect(res.body.data.products).toHaveLength(3);
    expect(res.body.data.modifiers).toHaveLength(6);
    expect(res.body.data.bom_recipes).toHaveLength(4);
    const suaDa = res.body.data.products.find(
      (p: { code: string }) => p.code === 'PRD-CF-SUA-DA',
    );
    expect(suaDa.effective_base_price_vnd).toBe(29000);
  });

  it('6. GET /api/v1/catalog/stores/:store03 applies 1.05x regional price_multiplier (29,000 -> 30,450đ)', async () => {
    const res = await request(app)
      .get(`/api/v1/catalog/stores/${SEED_IDS.stores.store03}`)
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(res.status).toBe(200);
    expect(res.body.data.store.price_multiplier).toBe(1.05);
    const suaDa = res.body.data.products.find(
      (p: { code: string }) => p.code === 'PRD-CF-SUA-DA',
    );
    const denDa = res.body.data.products.find(
      (p: { code: string }) => p.code === 'PRD-CF-DEN-DA',
    );
    expect(suaDa.effective_base_price_vnd).toBe(30450);
    expect(denDa.effective_base_price_vnd).toBe(26250);
  });

  it('7. BARISTA_KDS Quán 1 can read Store 1 catalog with ZERO confidential origin costs leaked', async () => {
    const res = await request(app)
      .get(`/api/v1/catalog/stores/${SEED_IDS.stores.store01}`)
      .set(authAs(SEED_IDS.users.barista01));
    expect(res.status).toBe(200);
    const rawJson = JSON.stringify(res.body);
    for (const forbidden of SENSITIVE_COST_KEYS) {
      expect(rawJson).not.toContain(`"${forbidden}"`);
    }
  });

  it('8. POST /api/v1/catalog/stores/:store01/preview-pricing calculates multi-level BOM requirements & COGS for SUPER_ADMIN', async () => {
    const res = await request(app)
      .post(`/api/v1/catalog/stores/${SEED_IDS.stores.store01}/preview-pricing`)
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [
              SEED_IDS.menuModifiers.extraEspressoShot,
              SEED_IDS.menuModifiers.extraCondensedMilk,
            ],
            quantity: 2,
          },
        ],
      });
    expect(res.status).toBe(200);
    // 2 * (29000 + 10000 + 5000) = 88,000 VND
    expect(res.body.data.total_amount_vnd).toBe(88000);
    expect(res.body.data.cogs_amount_vnd).toBe(19904);
    expect(res.body.data.bom_requirements).toHaveLength(4);
  });

  it('9. POST /api/v1/pos/stores/:store01/orders (CASH) calculates Size L + Extra Shot + Sugar 50% and strips cogs_amount_vnd for Cashier', async () => {
    // 29,000 + 6,000 (L) + 10,000 (Shot) = 45,000 * 2 = 90,000 VND
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
            modifier_ids: [
              SEED_IDS.menuModifiers.extraEspressoShot,
              SEED_IDS.menuModifiers.sugar50,
            ],
            quantity: 2,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sync_status).toBe('SYNCED_NEW');
    expect(res.body.data.order.payment_status).toBe('PAID');
    expect(res.body.data.order.kds_status).toBe('QUEUED');
    expect(res.body.data.order.total_amount_vnd).toBe(90000);
    expect(res.body.data.order).not.toHaveProperty('cogs_amount_vnd');
  });

  it('10. CASH order increments shift system_expected_cash_vnd (visible to Manager) while keeping Blind Close (null) for Cashier', async () => {
    await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
            modifier_ids: [SEED_IDS.menuModifiers.extraEspressoShot],
            quantity: 2,
          },
        ],
      });

    // Manager sees updated expected cash: 2,145,000 + 90,000 = 2,235,000
    const mgrShift = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(mgrShift.status).toBe(200);
    expect(mgrShift.body.data.system_expected_cash_vnd).toBe(2235000);

    // Cashier STILL sees null (Blind Shift Close!)
    const cashierShift = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(cashierShift.status).toBe(200);
    expect(cashierShift.body.data.system_expected_cash_vnd).toBeNull();
  });

  it('11. SUPER_ADMIN sees exact multi-level BOM cogs_amount_vnd on created POS order and POS_ORDER_CREATED audit log', async () => {
    const createRes = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [],
            quantity: 1,
          },
        ],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.order.cogs_amount_vnd).toBe(6262);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=POS_ORDER_CREATED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
  });

  it('12. POST /api/v1/pos/stores/:store01/orders (VIETQR) creates PENDING order with vietqr_ref_code and does NOT increment shift cash', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'VIETQR',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheDenDa,
            variant_id: SEED_IDS.menuVariants.caPheDenDaM,
            quantity: 2,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.payment_status).toBe('PENDING');
    expect(res.body.data.order.kds_status).toBe('QUEUED');
    expect(res.body.data.order.vietqr_ref_code).toMatch(/^CF19STORE01/);
    expect(res.body.data.order.total_amount_vnd).toBe(50000);

    const mgrShift = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(mgrShift.body.data.system_expected_cash_vnd).toBe(2145000);
  });

  it('13. Regional Store 3 POS order applies 1.05x multiplier + Size L delta accurately (30,450 + 6,000 = 36,450đ)', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store03}/orders`)
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        shift_id: SEED_EXTRA_SHIFT_IDS.store03OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.total_amount_vnd).toBe(36450);
  });

  it('14. blocks 2 SUGAR modifiers on the same drink line (400 INVALID_MODIFIER_MATRIX)', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [
              SEED_IDS.menuModifiers.sugar50,
              SEED_EXTRA_MODIFIER_IDS.sugar0,
            ],
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MODIFIER_MATRIX');
  });

  it('15. blocks 2 ICE modifiers on the same drink line (400 INVALID_MODIFIER_MATRIX)', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [
              SEED_IDS.menuModifiers.ice50,
              SEED_EXTRA_MODIFIER_IDS.ice0,
            ],
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MODIFIER_MATRIX');
  });

  it('16. rejects POS order when shift_id does not belong to target store (409 SHIFT_NOT_OPEN)', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_EXTRA_SHIFT_IDS.store02OpenShift, // Store 2 shift!
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SHIFT_NOT_OPEN');
  });

  it('17. Single order idempotent replay returns SYNCED_NEW (201) then IDEMPOTENT_EXISTING (200) without double-counting cash', async () => {
    const payload = {
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      client_order_code: 'POS-S01-IDEMP-001',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheDenDa,
          variant_id: SEED_IDS.menuVariants.caPheDenDaM,
          quantity: 1,
        },
      ],
    };

    const first = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send(payload);
    expect(first.status).toBe(201);
    expect(first.body.data.sync_status).toBe('SYNCED_NEW');

    const second = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.data.sync_status).toBe('IDEMPOTENT_EXISTING');
    expect(second.body.data.order.id).toBe(first.body.data.order.id);

    // Cash incremented ONLY ONCE (+25,000)
    const mgrShift = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(mgrShift.body.data.system_expected_cash_vnd).toBe(2170000);
  });

  it('18. Offline-First Batch Sync: first sync creates 3 new orders, second replay returns 3 IDEMPOTENT_EXISTING & 0 new', async () => {
    const batchPayload = {
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      orders: [
        {
          client_order_code: 'POS-S01-OFFLINE-001',
          payment_method: 'CASH',
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheSuaDa,
              variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
              quantity: 1,
            },
          ],
        },
        {
          client_order_code: 'POS-S01-OFFLINE-002',
          payment_method: 'VIETQR',
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheDenDa,
              variant_id: SEED_IDS.menuVariants.caPheDenDaM,
              quantity: 2,
            },
          ],
        },
        {
          client_order_code: 'POS-S01-OFFLINE-003',
          payment_method: 'CASH',
          items: [
            {
              product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
              variant_id: SEED_IDS.menuVariants.bacXiuM,
              quantity: 1,
            },
          ],
        },
      ],
    };

    const sync1 = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders/offline-sync`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send(batchPayload);
    expect(sync1.status).toBe(200);
    expect(sync1.body.data.synced_new_count).toBe(3);
    expect(sync1.body.data.idempotent_existing_count).toBe(0);

    const sync2 = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders/offline-sync`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send(batchPayload);
    expect(sync2.status).toBe(200);
    expect(sync2.body.data.synced_new_count).toBe(0);
    expect(sync2.body.data.idempotent_existing_count).toBe(3);

    const ordersRes = await request(app)
      .get(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01));
    // 1 seeded order + 3 offline synced orders = 4 total (no duplicates!)
    expect(ordersRes.body.data).toHaveLength(4);
  });

  it('19. GET /api/v1/pos/stores/:store01/orders supports payment_status and kds_status filters', async () => {
    await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'VIETQR',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheDenDa,
            variant_id: SEED_IDS.menuVariants.caPheDenDaM,
            quantity: 1,
          },
        ],
      });

    const pendingRes = await request(app)
      .get(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders?payment_status=PENDING`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data).toHaveLength(1);
    expect(pendingRes.body.data[0].payment_method).toBe('VIETQR');
  });

  it('20. GET /api/v1/pos/stores/:store01/orders/:orderId/receipt renders valid 42-column ESC/POS thermal receipt', async () => {
    const createRes = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'VIETQR',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [SEED_IDS.menuModifiers.sugar50],
            quantity: 1,
          },
        ],
      });

    const orderId = createRes.body.data.order.id as string;
    const receiptRes = await request(app)
      .get(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders/${orderId}/receipt`)
      .set(authAs(SEED_IDS.users.cashier01));

    expect(receiptRes.status).toBe(200);
    const text = receiptRes.body.data.thermal_receipt_text as string;
    expect(text).toContain(createRes.body.data.order.order_code);
    expect(text).toContain('Ma VietQR:');
    expect(text).toContain('29,000d');
    for (const line of text.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(ESC_POS_RECEIPT_WIDTH);
    }
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M4.2 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\modules\pos\pos.service.ts','C:\bib\cf_19\apps\api\src\modules\pos\pos.routes.ts','C:\bib\cf_19\apps\api\src\index.ts','C:\bib\cf_19\apps\api\src\__tests__\m4-pos-catalog-offline.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
