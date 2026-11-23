# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M5.2 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M5.2 - Backend EMVCo Dynamic VietQR Service, Idempotent Banking Webhook Consumer & Supertest Suite (@cf19/api)`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M5_2_KING_CHARTER.md` và `M5_1_QUEEN_PAWN_SPECS.md`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi/sửa **100% nguyên văn từng ký tự** đúng các file được giao. Không sửa đổi, không dùng `any`, không bỏ `.js` trong import tương đối (`moduleResolution: "NodeNext"`).
  - Bảo toàn 100% toàn bộ dữ liệu seed M1–M4 để **77/77 bài test hiện có của `@cf19/api`** tiếp tục PASS tuyệt đối.
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 3 files trong `@cf19/api`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Chỉnh sửa bằng 3 lệnh `edit_file` chính xác dưới đây — KHÔNG xóa hay thay đổi bất kỳ bản ghi seed M1–M4 nào!)
  2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Overwrite)
  3. `C:\bib\cf_19\apps\api\src\modules\pos\vietqr.service.ts` (Tạo mới)

### File 1: `C:\bib\cf_19\apps\api\src\db\seedData.ts` (3 Edit Blocks — dùng `edit_file`)

#### Edit 1A — Bổ sung type imports `PaymentWebhookLogDto` và `VietQrBankAccountConfigDto`
**Target:**
```ts
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
```

**Replacement:**
```ts
  type OrganizationDto,
  type PaymentWebhookLogDto,
  type PosOrderFullDto,
  type PosOrderItemDto,
  type PosShiftFullDto,
  type RoastBatchDto,
  type StoreDto,
  type UserRole,
  type VietQrBankAccountConfigDto,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
} from '@cf19/shared';
```

#### Edit 1B — Bổ sung `STORE_BANK_ACCOUNTS`, `DEFAULT_STORE_BANK_ACCOUNT`, và trường `paymentWebhookLogs` vào `InMemoryDatabaseState`
**Target:**
```ts
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
```

**Replacement:**
```ts
export const DEFAULT_STORE_BANK_ACCOUNT: VietQrBankAccountConfigDto = {
  bank_bin: '970436',
  bank_short_name: 'Vietcombank',
  account_number: '1019001919',
  account_name: 'CF19 TAY NGUYEN COFFEE',
  merchant_city: 'BUON MA THUOT',
};

export const STORE_BANK_ACCOUNTS: Readonly<Record<string, VietQrBankAccountConfigDto>> = {
  [SEED_IDS.stores.store01]: {
    bank_bin: '970436',
    bank_short_name: 'Vietcombank',
    account_number: '1019001901',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
  [SEED_IDS.stores.store02]: {
    bank_bin: '970422',
    bank_short_name: 'MB Bank',
    account_number: '1900191902',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
  [SEED_IDS.stores.store03]: {
    bank_bin: '970436',
    bank_short_name: 'Vietcombank',
    account_number: '1019001903',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
  [SEED_IDS.stores.store04]: {
    bank_bin: '970422',
    bank_short_name: 'MB Bank',
    account_number: '1900191904',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
};

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
  paymentWebhookLogs: PaymentWebhookLogDto[];
  auditLogs: AuditLogDto[];
}
```

#### Edit 1C — Khởi tạo `paymentWebhookLogs: []` trong `createInitialSeedState()`
**Target:**
```ts
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
```

**Replacement:**
```ts
  const paymentWebhookLogs: PaymentWebhookLogDto[] = [];
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
    paymentWebhookLogs,
    auditLogs,
  };
```

### File 2: `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts`

```ts
import type { VietQrBankAccountConfigDto } from '@cf19/shared';
import {
  DEFAULT_STORE_BANK_ACCOUNT,
  STORE_BANK_ACCOUNTS,
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

export function getStoreBankAccountConfig(
  storeId: string,
): VietQrBankAccountConfigDto {
  const configured = STORE_BANK_ACCOUNTS[storeId] ?? DEFAULT_STORE_BANK_ACCOUNT;
  return structuredClone(configured);
}
```

### File 3: `C:\bib\cf_19\apps\api\src\modules\pos\vietqr.service.ts`

```ts
import { randomUUID } from 'node:crypto';
import {
  buildEmvCoDynamicVietQrPayload,
  buildVoiceAnnouncementScript,
  extractVietQrRefFromTransferContent,
  verifyEmvCoPayloadCrc,
  type EmvCoVietQrPayloadDTO,
  type GenerateOrderVietQrInput,
  type PaymentWebhookLogDto,
  type PosOrderFullDto,
  type SimulateVietQrWebhookInput,
  type VietQrBankingWebhookPayloadInput,
  type VietQrWebhookProcessResultDTO,
  type WebhookLogQueryInput,
} from '@cf19/shared';
import {
  getInMemoryDb,
  getStoreBankAccountConfig,
} from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

function resolveBankShortName(bankBin: string, fallback: string): string {
  if (bankBin === '970436') {
    return 'Vietcombank';
  }
  if (bankBin === '970422') {
    return 'MB Bank';
  }
  if (bankBin === '970415') {
    return 'VietinBank';
  }
  if (bankBin === '970418') {
    return 'BIDV';
  }
  if (bankBin === '970407') {
    return 'Techcombank';
  }
  return fallback;
}

function buildFallbackVietQrRefCode(orderCode: string): string {
  const compact = orderCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `VQR-${compact}`;
}

function findOrderForWebhook(
  orders: PosOrderFullDto[],
  orderId: string | undefined,
  extractedRef: string | null,
  transferContent: string,
): PosOrderFullDto | undefined {
  if (orderId) {
    return orders.find((o) => o.id === orderId);
  }

  if (extractedRef) {
    const normalizedRef = extractedRef.toUpperCase();
    const byDirectRef = orders.find(
      (o) =>
        o.vietqr_ref_code?.toUpperCase() === normalizedRef ||
        o.order_code.toUpperCase() === normalizedRef ||
        buildFallbackVietQrRefCode(o.order_code) === normalizedRef,
    );
    if (byDirectRef) {
      return byDirectRef;
    }
  }

  const upperMemo = transferContent.toUpperCase();
  return orders.find((o) => {
    if (o.vietqr_ref_code && upperMemo.includes(o.vietqr_ref_code.toUpperCase())) {
      return true;
    }
    return upperMemo.includes(o.order_code.toUpperCase());
  });
}

/**
 * 1. Generate a NAPAS247 EMVCo Dynamic VietQR payload with valid CRC16-CCITT checksum.
 */
export async function generateOrderVietQr(
  actor: AuthActor,
  input: GenerateOrderVietQrInput,
): Promise<EmvCoVietQrPayloadDTO> {
  const db = getInMemoryDb();
  const order = db.posOrders.find((o) => o.id === input.order_id);

  if (!order) {
    throw new WarehouseDomainError(
      404,
      'ORDER_NOT_FOUND',
      `POS order ${input.order_id} not found`,
    );
  }

  if (order.store_id !== input.store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS order ${input.order_id} does not belong to store ${input.store_id}`,
    );
  }

  if (order.payment_status === 'VOIDED') {
    throw new WarehouseDomainError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot generate VietQR for voided order ${order.order_code}`,
    );
  }

  if (order.total_amount_vnd <= 0) {
    throw new WarehouseDomainError(
      400,
      'EMVCO_INVALID_AMOUNT',
      `Order ${order.order_code} total_amount_vnd must be greater than zero`,
    );
  }

  const nowIso = new Date().toISOString();
  if (!order.vietqr_ref_code || order.vietqr_ref_code.trim().length === 0) {
    order.vietqr_ref_code = buildFallbackVietQrRefCode(order.order_code);
    order.updated_at = nowIso;
  }

  const defaultBankConfig = getStoreBankAccountConfig(order.store_id);
  const bankBin = input.bank_bin ?? defaultBankConfig.bank_bin;
  const accountNumber = input.account_number ?? defaultBankConfig.account_number;
  const accountName = input.account_name ?? defaultBankConfig.account_name;
  const merchantCity = input.merchant_city ?? defaultBankConfig.merchant_city;
  const bankShortName = resolveBankShortName(
    bankBin,
    defaultBankConfig.bank_short_name,
  );

  const built = buildEmvCoDynamicVietQrPayload({
    bank_bin: bankBin,
    account_number: accountNumber,
    amount_vnd: order.total_amount_vnd,
    order_code: order.order_code,
    vietqr_ref_code: order.vietqr_ref_code,
    merchant_name: accountName,
    merchant_city: merchantCity,
  });

  if (!verifyEmvCoPayloadCrc(built.emvco_payload)) {
    throw new WarehouseDomainError(
      500,
      'EMVCO_CRC_GENERATION_FAILED',
      'Generated EMVCo payload failed internal CRC16-CCITT verification',
    );
  }

  recordAuditLog({
    actorId: actor.id,
    storeId: order.store_id,
    action: 'VIETQR_PAYLOAD_GENERATED',
    targetTable: 'pos_orders',
    targetId: order.id,
    reason: `Generated dynamic EMVCo VietQR for order ${order.order_code}`,
    payload: {
      order_code: order.order_code,
      vietqr_ref_code: order.vietqr_ref_code,
      amount_vnd: order.total_amount_vnd,
      bank_bin: bankBin,
      account_number: accountNumber,
      crc16_hex: built.crc16_hex,
    },
  });

  return {
    order_id: order.id,
    store_id: order.store_id,
    order_code: order.order_code,
    vietqr_ref_code: order.vietqr_ref_code,
    amount_vnd: order.total_amount_vnd,
    payment_status: order.payment_status,
    bank_bin: bankBin,
    bank_short_name: bankShortName,
    account_number: accountNumber,
    account_name: built.merchant_name,
    merchant_city: built.merchant_city,
    emvco_payload: built.emvco_payload,
    crc16_hex: built.crc16_hex,
    is_dynamic: true,
    generated_at: nowIso,
  };
}

/**
 * 2. Idempotent Banking Webhook/IPN Consumer (payment_webhook_logs).
 */
export async function processBankingWebhook(
  input: VietQrBankingWebhookPayloadInput,
  extraMeta?: Record<string, unknown>,
): Promise<VietQrWebhookProcessResultDTO> {
  const db = getInMemoryDb();
  const idempotencyKey = input.idempotency_key.trim();
  const bankTxId = input.bank_tx_id.trim();

  // Step 1: Strictly Idempotent Replay Check (idempotency_key OR bank_tx_id)
  const existingLog = db.paymentWebhookLogs.find(
    (log) =>
      log.idempotency_key === idempotencyKey || log.bank_tx_id === bankTxId,
  );

  if (existingLog) {
    const existingOrder = existingLog.order_id
      ? db.posOrders.find((o) => o.id === existingLog.order_id)
      : undefined;

    return {
      status: 'IDEMPOTENT_REPLAY',
      already_processed: true,
      should_trigger_speaker: false,
      webhook_log_id: existingLog.id,
      idempotency_key: existingLog.idempotency_key,
      bank_tx_id: existingLog.bank_tx_id,
      store_id: existingLog.store_id,
      order_id: existingLog.order_id,
      order_code: existingOrder?.order_code ?? null,
      vietqr_ref_code: existingOrder?.vietqr_ref_code ?? null,
      amount_vnd: existingLog.amount_vnd,
      order_total_vnd: existingOrder?.total_amount_vnd ?? null,
      payment_status: existingOrder?.payment_status ?? null,
      processed_at: existingLog.processed_at,
      speaker_announcement: null,
    };
  }

  // Step 2: Resolve Target POS Order from order_id, vietqr_ref_code, or bank transfer_content
  const extractedRef =
    input.vietqr_ref_code?.trim().toUpperCase() ??
    extractVietQrRefFromTransferContent(input.transfer_content);

  const order = findOrderForWebhook(
    db.posOrders,
    input.order_id,
    extractedRef,
    input.transfer_content,
  );

  if (!order) {
    throw new WarehouseDomainError(
      404,
      'ORDER_NOT_FOUND_FOR_WEBHOOK',
      `No matching POS order found for transfer content "${input.transfer_content}"`,
    );
  }

  // Step 3: Domain Invariants (Void Guard, Already-Paid Guard, Underpayment Guard)
  if (order.payment_status === 'VOIDED') {
    throw new WarehouseDomainError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot reconcile payment for voided order ${order.order_code}`,
    );
  }

  if (order.payment_status === 'PAID') {
    throw new WarehouseDomainError(
      409,
      'ORDER_ALREADY_PAID',
      `Order ${order.order_code} is already paid`,
    );
  }

  if (input.amount_vnd < order.total_amount_vnd) {
    throw new WarehouseDomainError(
      409,
      'WEBHOOK_AMOUNT_MISMATCH',
      `Received ${input.amount_vnd} VND is less than order total ${order.total_amount_vnd} VND for ${order.order_code}`,
    );
  }

  // Step 4: Atomic Reconciliation (log + order PAID + speaker payload + audit log)
  const nowIso = new Date().toISOString();
  const resolvedRef =
    order.vietqr_ref_code ?? extractedRef ?? buildFallbackVietQrRefCode(order.order_code);

  const webhookLog: PaymentWebhookLogDto = {
    id: randomUUID(),
    idempotency_key: idempotencyKey,
    store_id: order.store_id,
    order_id: order.id,
    amount_vnd: input.amount_vnd,
    bank_tx_id: bankTxId,
    raw_payload: {
      ...input,
      resolved_vietqr_ref_code: resolvedRef,
      ...(extraMeta ?? {}),
    },
    processed_at: nowIso,
    created_at: nowIso,
  };

  db.paymentWebhookLogs.unshift(webhookLog);

  order.payment_status = 'PAID';
  order.payment_method = 'VIETQR';
  order.vietqr_ref_code = resolvedRef;
  order.updated_at = nowIso;

  const speakerAnnouncement = buildVoiceAnnouncementScript({
    order_id: order.id,
    order_code: order.order_code,
    store_id: order.store_id,
    amount_vnd: input.amount_vnd,
    vietqr_ref_code: resolvedRef,
    generated_at: nowIso,
  });

  recordAuditLog({
    actorId: order.cashier_id,
    storeId: order.store_id,
    action: 'VIETQR_WEBHOOK_RECONCILED',
    targetTable: 'pos_orders',
    targetId: order.id,
    reason: `Reconciled POS order ${order.order_code} via banking webhook ${bankTxId}`,
    payload: {
      source: 'VIETQR_BANK_WEBHOOK',
      webhook_log_id: webhookLog.id,
      idempotency_key: idempotencyKey,
      bank_tx_id: bankTxId,
      order_code: order.order_code,
      vietqr_ref_code: resolvedRef,
      amount_vnd: input.amount_vnd,
      order_total_vnd: order.total_amount_vnd,
      ...(extraMeta ?? {}),
    },
  });

  return {
    status: 'RECONCILED_PAID',
    already_processed: false,
    should_trigger_speaker: true,
    webhook_log_id: webhookLog.id,
    idempotency_key: webhookLog.idempotency_key,
    bank_tx_id: webhookLog.bank_tx_id,
    store_id: order.store_id,
    order_id: order.id,
    order_code: order.order_code,
    vietqr_ref_code: resolvedRef,
    amount_vnd: input.amount_vnd,
    order_total_vnd: order.total_amount_vnd,
    payment_status: order.payment_status,
    processed_at: nowIso,
    speaker_announcement: speakerAnnouncement,
  };
}

/**
 * 3. Cashier/Manager Sandbox Webhook Simulator (supports simulate_duplicate=true replay test).
 */
export async function simulateOrderWebhook(
  actor: AuthActor,
  input: SimulateVietQrWebhookInput,
): Promise<VietQrWebhookProcessResultDTO> {
  const db = getInMemoryDb();
  const order = db.posOrders.find((o) => o.id === input.order_id);

  if (!order) {
    throw new WarehouseDomainError(
      404,
      'ORDER_NOT_FOUND',
      `POS order ${input.order_id} not found`,
    );
  }

  if (order.store_id !== input.store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS order ${input.order_id} does not belong to store ${input.store_id}`,
    );
  }

  const refCode = order.vietqr_ref_code ?? buildFallbackVietQrRefCode(order.order_code);
  const amountVnd = input.amount_vnd ?? order.total_amount_vnd;
  const transferContent =
    input.transfer_content ?? `MBVCB.SIM.${refCode} thanh toan ${order.order_code}`;

  if (input.simulate_duplicate) {
    const existingForOrder = db.paymentWebhookLogs.find(
      (log) => log.order_id === order.id,
    );
    if (existingForOrder) {
      return processBankingWebhook(
        {
          idempotency_key: existingForOrder.idempotency_key,
          bank_tx_id: existingForOrder.bank_tx_id,
          amount_vnd: existingForOrder.amount_vnd,
          transfer_content: transferContent,
          order_id: order.id,
          vietqr_ref_code: refCode,
        },
        {
          simulated_by_actor_id: actor.id,
          simulate_duplicate: true,
        },
      );
    }

    const sharedKey =
      input.idempotency_key ?? `SIM-DUP-${order.order_code}-${Date.now()}`;
    const sharedTx =
      input.bank_tx_id ?? `FTSIMDUP${Date.now().toString().slice(-8)}`;

    await processBankingWebhook(
      {
        idempotency_key: sharedKey,
        bank_tx_id: sharedTx,
        amount_vnd: amountVnd,
        transfer_content: transferContent,
        order_id: order.id,
        vietqr_ref_code: refCode,
      },
      {
        simulated_by_actor_id: actor.id,
        simulate_duplicate: false,
      },
    );

    return processBankingWebhook(
      {
        idempotency_key: sharedKey,
        bank_tx_id: sharedTx,
        amount_vnd: amountVnd,
        transfer_content: transferContent,
        order_id: order.id,
        vietqr_ref_code: refCode,
      },
      {
        simulated_by_actor_id: actor.id,
        simulate_duplicate: true,
      },
    );
  }

  const idempotencyKey =
    input.idempotency_key ?? `SIM-${order.order_code}-${randomUUID().slice(0, 8)}`;
  const bankTxId =
    input.bank_tx_id ?? `FTSIM${Date.now().toString().slice(-8)}${randomUUID().slice(0, 4).toUpperCase()}`;

  return processBankingWebhook(
    {
      idempotency_key: idempotencyKey,
      bank_tx_id: bankTxId,
      amount_vnd: amountVnd,
      transfer_content: transferContent,
      order_id: order.id,
      vietqr_ref_code: refCode,
    },
    {
      simulated_by_actor_id: actor.id,
      simulated_by_role: actor.role,
    },
  );
}

/**
 * 4. List store-scoped Banking Webhook logs ordered newest-first.
 */
export async function listWebhookLogs(
  actor: AuthActor,
  query: WebhookLogQueryInput,
): Promise<PaymentWebhookLogDto[]> {
  const effectiveStoreId =
    actor.role === 'SUPER_ADMIN'
      ? query.store_id
      : actor.assignedStoreId ?? query.store_id;

  return getInMemoryDb()
    .paymentWebhookLogs.filter((log) => {
      if (effectiveStoreId && log.store_id !== effectiveStoreId) {
        return false;
      }
      if (query.order_id && log.order_id !== query.order_id) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.processed_at.localeCompare(a.processed_at))
    .slice(0, query.limit)
    .map((log) => structuredClone(log));
}
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 3 files trong `@cf19/api`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\api\src\modules\pos\vietqr.routes.ts` (Tạo mới)
  2. `C:\bib\cf_19\apps\api\src\index.ts` (Overwrite)
  3. `C:\bib\cf_19\apps\api\src\__tests__\m5-vietqr-webhook.test.ts` (Tạo mới — 20 Vitest + Supertest integration tests)

### File 1: `C:\bib\cf_19\apps\api\src\modules\pos\vietqr.routes.ts`

```ts
import { Router, type Request, type Response } from 'express';
import {
  GenerateOrderVietQrSchema,
  SimulateVietQrWebhookSchema,
  VietQrBankingWebhookPayloadSchema,
  WebhookLogQuerySchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  generateOrderVietQr,
  listWebhookLogs,
  processBankingWebhook,
  simulateOrderWebhook,
} from './vietqr.service.js';

export const vietqrRouter = Router();

const DEFAULT_DEV_WEBHOOK_SECRET = 'cf19-vietqr-dev-secret';

function handleVietQrError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected VietQR error';
  res.status(500).json({
    error: {
      code: 'VIETQR_INTERNAL_ERROR',
      message,
    },
  });
}

function verifyOptionalWebhookSecret(req: Request): boolean {
  const configuredSecret = process.env.VIETQR_WEBHOOK_SECRET?.trim();
  const headerValue = req.headers['x-webhook-secret'];
  const providedSecret =
    typeof headerValue === 'string' ? headerValue.trim() : undefined;

  if (configuredSecret && configuredSecret.length > 0) {
    return providedSecret === configuredSecret;
  }

  if (providedSecret !== undefined && providedSecret.length > 0) {
    return providedSecret === DEFAULT_DEV_WEBHOOK_SECRET;
  }

  return true;
}

/**
 * POST /api/v1/vietqr/stores/:storeId/orders/:orderId/generate
 */
vietqrRouter.post(
  '/stores/:storeId/orders/:orderId/generate',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = GenerateOrderVietQrSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_VIETQR_GENERATE_PAYLOAD',
          message: 'Invalid VietQR generation parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const payload = await generateOrderVietQr(req.actor!, parsed.data);
      res.status(200).json({ data: payload });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);

/**
 * POST /api/v1/vietqr/webhook/ipn
 * Banking IPN / Webhook listener with optional x-webhook-secret verification & idempotent replay.
 */
vietqrRouter.post(
  '/webhook/ipn',
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    if (!verifyOptionalWebhookSecret(req)) {
      res.status(401).json({
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Invalid x-webhook-secret header',
        },
      });
      return;
    }

    const parsed = VietQrBankingWebhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_WEBHOOK_PAYLOAD',
          message: 'Invalid banking IPN webhook payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await processBankingWebhook(parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);

/**
 * POST /api/v1/vietqr/stores/:storeId/orders/:orderId/simulate-webhook
 */
vietqrRouter.post(
  '/stores/:storeId/orders/:orderId/simulate-webhook',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = SimulateVietQrWebhookSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_SIMULATE_WEBHOOK_PAYLOAD',
          message: 'Invalid simulate webhook payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await simulateOrderWebhook(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);

/**
 * GET /api/v1/vietqr/stores/:storeId/webhook-logs
 */
vietqrRouter.get(
  '/stores/:storeId/webhook-logs',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = WebhookLogQuerySchema.safeParse({
      ...req.query,
      store_id: req.params.storeId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_WEBHOOK_LOG_QUERY',
          message: 'Invalid webhook logs query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const logs = await listWebhookLogs(req.actor!, parsed.data);
      res.status(200).json({ data: logs });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);
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
import { b2bRouter } from './modules/b2b/b2b.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { posRouter } from './modules/pos/pos.routes.js';
import { vietqrRouter } from './modules/pos/vietqr.routes.js';
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
  app.use('/api/v1/vietqr', vietqrRouter);

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

### File 3: `C:\bib\cf_19\apps\api\src\__tests__\m5-vietqr-webhook.test.ts`

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
  NAPAS_GUID,
  NAPAS_SERVICE_CODE_ACCOUNT,
  SEED_IDS,
  verifyEmvCoPayloadCrc,
} from '@cf19/shared';
import { getInMemoryDb, resetInMemoryDb } from '../db/inMemoryDb.js';
import { SEED_EXTRA_SHIFT_IDS, SEED_ORDER_IDS } from '../db/seedData.js';
import { app } from '../index.js';

function devAuthHeader(userId: string): string {
  return `Bearer dev:${userId}`;
}

async function createPendingVietQrOrder(
  storeId: string = SEED_IDS.stores.store01,
  shiftId: string = SEED_IDS.posShifts.store01OpenShift,
  actorId: string = SEED_IDS.users.cashier01,
  clientOrderCode?: string,
): Promise<{
  id: string;
  order_code: string;
  vietqr_ref_code: string;
  total_amount_vnd: number;
}> {
  const res = await request(app)
    .post(`/api/v1/pos/stores/${storeId}/orders`)
    .set('Authorization', devAuthHeader(actorId))
    .send({
      shift_id: shiftId,
      payment_method: 'VIETQR',
      client_order_code: clientOrderCode,
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
          modifier_ids: [SEED_IDS.menuModifiers.extraEspressoShot],
          quantity: 2,
        },
      ],
    });

  expect(res.status).toBe(201);
  return {
    id: res.body.data.order.id as string,
    order_code: res.body.data.order.order_code as string,
    vietqr_ref_code: res.body.data.order.vietqr_ref_code as string,
    total_amount_vnd: res.body.data.order.total_amount_vnd as number,
  };
}

describe('M5.2 EMVCo Dynamic VietQR & Idempotent Banking Webhook Suite (@cf19/api)', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. RBAC blocks WAREHOUSE_MANAGER from generating VietQR payload (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.warehouseManager))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('2. RBAC blocks BARISTA_KDS from generating VietQR payload (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.barista01))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('3. Multi-Tenant Isolation blocks Store 1 CASHIER_STAFF from generating VietQR for Store 2 (403)', async () => {
    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store02}/orders/${SEED_ORDER_IDS.store02SampleOrder}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('4. Multi-Tenant Isolation blocks Store 1 CASHIER_STAFF from reading Store 2 webhook logs (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/vietqr/stores/${SEED_IDS.stores.store02}/webhook-logs`)
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('5. Cross-Tenant Order Guard blocks Store 1 cashier requesting Store 2 orderId under Store 1 URL (403)', async () => {
    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store02SampleOrder}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('6. Generates valid NAPAS247 EMVCo Dynamic VietQR with verified CRC16-CCITT and audit trail', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-001',
    );

    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${order.id}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({});

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.is_dynamic).toBe(true);
    expect(data.bank_bin).toBe('970436');
    expect(data.amount_vnd).toBe(order.total_amount_vnd);
    expect(data.emvco_payload.startsWith('000201010212')).toBe(true);
    expect(data.emvco_payload).toContain(NAPAS_GUID);
    expect(data.emvco_payload).toContain(NAPAS_SERVICE_CODE_ACCOUNT);
    expect(data.emvco_payload).toContain(`54${String(String(order.total_amount_vnd).length).padStart(2, '0')}${order.total_amount_vnd}`);
    expect(data.emvco_payload).toContain(data.vietqr_ref_code);
    expect(verifyEmvCoPayloadCrc(data.emvco_payload)).toBe(true);

    const auditEntry = getInMemoryDb().auditLogs.find(
      (a) => a.action === 'VIETQR_PAYLOAD_GENERATED' && a.target_id === order.id,
    );
    expect(auditEntry).toBeDefined();
  });

  it('7. Auto-generates vietqr_ref_code when an order initially has null vietqr_ref_code', async () => {
    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store02}/orders/${SEED_ORDER_IDS.store02SampleOrder}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier02))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.vietqr_ref_code).toMatch(/^VQR-/);
    expect(res.body.data.bank_bin).toBe('970422');
    expect(verifyEmvCoPayloadCrc(res.body.data.emvco_payload)).toBe(true);
  });

  it('8. Supports explicit bank_bin & account_number overrides while validating CRC16-CCITT', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.storeManager01,
      'POS-S01-M5-002',
    );

    const res = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${order.id}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.storeManager01))
      .send({
        bank_bin: '970418',
        account_number: '63110000191919',
        account_name: 'CF19 QUAN 1 DAK LAK',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.bank_bin).toBe('970418');
    expect(res.body.data.bank_short_name).toBe('BIDV');
    expect(res.body.data.emvco_payload).toContain('970418');
    expect(res.body.data.emvco_payload).toContain('63110000191919');
    expect(verifyEmvCoPayloadCrc(res.body.data.emvco_payload)).toBe(true);
  });

  it('9. Rejects generating VietQR for a VOIDED POS order (409 ORDER_ALREADY_VOIDED)', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-VOID1',
    );

    const voidRes = await request(app)
      .post(`/api/v1/stores/${SEED_IDS.stores.store01}/orders/${order.id}/void`)
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({
        manager_id: SEED_IDS.users.storeManager01,
        pin: '123456',
        reason: 'Khach doi y huy don truoc khi quet QR',
      });
    expect(voidRes.status).toBe(200);

    const qrRes = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${order.id}/generate`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({});

    expect(qrRes.status).toBe(409);
    expect(qrRes.body.error.code).toBe('ORDER_ALREADY_VOIDED');
  });

  it('10. Banking Webhook IPN extracts VQR ref from transfer_content, reconciles PENDING->PAID, logs webhook & emits Vietnamese speaker payload', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-IPN1',
    );

    const res = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-M5-001',
        bank_tx_id: 'FT26326990001',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `MBVCB.998123.${order.vietqr_ref_code} chuyen khoan`,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.status).toBe('RECONCILED_PAID');
    expect(data.already_processed).toBe(false);
    expect(data.should_trigger_speaker).toBe(true);
    expect(data.order_id).toBe(order.id);
    expect(data.payment_status).toBe('PAID');
    expect(data.speaker_announcement).not.toBeNull();
    expect(data.speaker_announcement.message_vi).toContain('Ting ting! Đã nhận chuyển khoản');
    expect(data.speaker_announcement.message_vi).toContain(order.order_code);
    expect(data.speaker_announcement.chime_frequencies_hz).toEqual(
      DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
    );

    const db = getInMemoryDb();
    const updatedOrder = db.posOrders.find((o) => o.id === order.id);
    expect(updatedOrder?.payment_status).toBe('PAID');
    expect(db.paymentWebhookLogs).toHaveLength(1);

    const auditEntry = db.auditLogs.find(
      (a) => a.action === 'VIETQR_WEBHOOK_RECONCILED' && a.target_id === order.id,
    );
    expect(auditEntry).toBeDefined();
  });

  it('11. Idempotency Replay (same idempotency_key): returns IDEMPOTENT_REPLAY, suppresses speaker & prevents duplicate log', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-DUP1',
    );

    const payload = {
      idempotency_key: 'IPN-KEY-DUP-001',
      bank_tx_id: 'FT26326990002',
      amount_vnd: order.total_amount_vnd,
      transfer_content: `TT don hang ${order.vietqr_ref_code}`,
    };

    const first = await request(app).post('/api/v1/vietqr/webhook/ipn').send(payload);
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('RECONCILED_PAID');
    expect(first.body.data.should_trigger_speaker).toBe(true);

    const second = await request(app).post('/api/v1/vietqr/webhook/ipn').send(payload);
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe('IDEMPOTENT_REPLAY');
    expect(second.body.data.already_processed).toBe(true);
    expect(second.body.data.should_trigger_speaker).toBe(false);
    expect(second.body.data.speaker_announcement).toBeNull();
    expect(getInMemoryDb().paymentWebhookLogs).toHaveLength(1);
  });

  it('12. Idempotency Replay (same bank_tx_id with different idempotency_key): returns IDEMPOTENT_REPLAY & no duplicate log', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-DUP2',
    );

    const first = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-TX-A',
        bank_tx_id: 'FT26326990003',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `IBFT ${order.vietqr_ref_code}`,
      });
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('RECONCILED_PAID');

    const second = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-TX-B',
        bank_tx_id: 'FT26326990003',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `IBFT ${order.vietqr_ref_code}`,
      });
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe('IDEMPOTENT_REPLAY');
    expect(second.body.data.already_processed).toBe(true);
    expect(second.body.data.should_trigger_speaker).toBe(false);
    expect(getInMemoryDb().paymentWebhookLogs).toHaveLength(1);
  });

  it('13. Rejects underpaid banking transfer (409 WEBHOOK_AMOUNT_MISMATCH) and keeps order PENDING', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-UNDER',
    );

    const res = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-UNDER-001',
        bank_tx_id: 'FT26326990004',
        amount_vnd: order.total_amount_vnd - 5000,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WEBHOOK_AMOUNT_MISMATCH');

    const db = getInMemoryDb();
    expect(db.posOrders.find((o) => o.id === order.id)?.payment_status).toBe('PENDING');
    expect(db.paymentWebhookLogs).toHaveLength(0);
  });

  it('14. Accepts overpaid banking transfer (customer rounds up) and reconciles order to PAID', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store02,
      SEED_EXTRA_SHIFT_IDS.store02OpenShift,
      SEED_IDS.users.cashier02,
      'POS-S02-M5-OVER',
    );

    const overpaidAmount = order.total_amount_vnd + 2000;
    const res = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-OVER-001',
        bank_tx_id: 'FT26326990005',
        amount_vnd: overpaidAmount,
        transfer_content: `CK ${order.vietqr_ref_code}`,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RECONCILED_PAID');
    expect(res.body.data.amount_vnd).toBe(overpaidAmount);
    expect(res.body.data.payment_status).toBe('PAID');
  });

  it('15. Rejects banking webhook for a VOIDED order (409 ORDER_ALREADY_VOIDED)', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-VOID2',
    );

    const voidRes = await request(app)
      .post(`/api/v1/stores/${SEED_IDS.stores.store01}/orders/${order.id}/void`)
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({
        manager_id: SEED_IDS.users.storeManager01,
        pin: '123456',
        reason: 'Huy don do bam nham so luong',
      });
    expect(voidRes.status).toBe(200);

    const res = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-VOID-001',
        bank_tx_id: 'FT26326990006',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_ALREADY_VOIDED');
    expect(getInMemoryDb().paymentWebhookLogs).toHaveLength(0);
  });

  it('16. Rejects brand-new webhook transaction against an order already PAID (409 ORDER_ALREADY_PAID)', async () => {
    const res = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-ALREADY-PAID',
        bank_tx_id: 'FT26326990007',
        amount_vnd: 58000,
        transfer_content: 'TT don hang CF19S01001',
        order_id: SEED_ORDER_IDS.store01SampleOrder,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_ALREADY_PAID');
  });

  it('17. Returns 404 ORDER_NOT_FOUND_FOR_WEBHOOK when transfer memo matches no order', async () => {
    const res = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .send({
        idempotency_key: 'IPN-KEY-MISSING-001',
        bank_tx_id: 'FT26326990008',
        amount_vnd: 55000,
        transfer_content: 'MBVCB.999999.VQR-NONEXISTENT-9999',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND_FOR_WEBHOOK');
  });

  it('18. Enforces x-webhook-secret validation (rejects invalid secret 401, accepts valid dev secret)', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-SEC1',
    );

    const rejected = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .set('x-webhook-secret', 'wrong-secret-token')
      .send({
        idempotency_key: 'IPN-KEY-SEC-001',
        bank_tx_id: 'FT26326990009',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });
    expect(rejected.status).toBe(401);
    expect(rejected.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');

    const accepted = await request(app)
      .post('/api/v1/vietqr/webhook/ipn')
      .set('x-webhook-secret', 'cf19-vietqr-dev-secret')
      .send({
        idempotency_key: 'IPN-KEY-SEC-001',
        bank_tx_id: 'FT26326990009',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('RECONCILED_PAID');
  });

  it('19. Simulate Webhook endpoint reconciles first call and replays idempotently when simulate_duplicate=true', async () => {
    const order = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-SIM1',
    );

    const firstSim = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${order.id}/simulate-webhook`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({});

    expect(firstSim.status).toBe(200);
    expect(firstSim.body.data.status).toBe('RECONCILED_PAID');
    expect(firstSim.body.data.should_trigger_speaker).toBe(true);

    const dupSim = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${order.id}/simulate-webhook`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({ simulate_duplicate: true });

    expect(dupSim.status).toBe(200);
    expect(dupSim.body.data.status).toBe('IDEMPOTENT_REPLAY');
    expect(dupSim.body.data.already_processed).toBe(true);
    expect(dupSim.body.data.should_trigger_speaker).toBe(false);
    expect(getInMemoryDb().paymentWebhookLogs).toHaveLength(1);
  });

  it('20. Lists store-scoped webhook logs with order_id filtering and zero confidential cost leakage', async () => {
    const order1 = await createPendingVietQrOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.posShifts.store01OpenShift,
      SEED_IDS.users.cashier01,
      'POS-S01-M5-LOG1',
    );
    const order2 = await createPendingVietQrOrder(
      SEED_IDS.stores.store02,
      SEED_EXTRA_SHIFT_IDS.store02OpenShift,
      SEED_IDS.users.cashier02,
      'POS-S02-M5-LOG2',
    );

    await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${order1.id}/simulate-webhook`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier01))
      .send({});

    await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store02}/orders/${order2.id}/simulate-webhook`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.cashier02))
      .send({});

    const store1Logs = await request(app)
      .get(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/webhook-logs?order_id=${order1.id}`,
      )
      .set('Authorization', devAuthHeader(SEED_IDS.users.storeManager01));

    expect(store1Logs.status).toBe(200);
    expect(store1Logs.body.data).toHaveLength(1);
    expect(store1Logs.body.data[0].store_id).toBe(SEED_IDS.stores.store01);
    expect(store1Logs.body.data[0].order_id).toBe(order1.id);
    expect(JSON.stringify(store1Logs.body)).not.toContain('moving_avg_cost_vnd');

    const adminStore2Logs = await request(app)
      .get(`/api/v1/vietqr/stores/${SEED_IDS.stores.store02}/webhook-logs`)
      .set('Authorization', devAuthHeader(SEED_IDS.users.superAdmin));

    expect(adminStore2Logs.status).toBe(200);
    expect(adminStore2Logs.body.data).toHaveLength(1);
    expect(adminStore2Logs.body.data[0].store_id).toBe(SEED_IDS.stores.store02);
  });
});
```
