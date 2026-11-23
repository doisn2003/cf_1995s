import { Router, type Request, type Response } from 'express';
import {
  CompleteRoastBatchSchema,
  CreateWarehouseInventoryItemSchema,
  FifoAllocationRequestSchema,
  IngestWarehouseLotSchema,
  SEED_IDS,
  UpdateLotStatusSchema,
  UpdateWarehouseInventoryItemSchema,
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
  createInventoryItem,
  getOverview,
  ingestLot,
  listInventoryItems,
  listLots,
  listRoastBatches,
  updateInventoryItem,
  updateLotStatus,
} from './warehouse.service.js';

export const warehouseRouter = Router();

warehouseRouter.use(
  authenticate,
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER'),
  sanitizeCostFields(),
);

function handleWarehouseError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Lỗi xử lý nghiệp vụ Kho Tổng';
  res.status(500).json({
    error: { code: 'WAREHOUSE_INTERNAL_ERROR', message },
  });
}

// Inventory Items Full CRUD
warehouseRouter.get('/items', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const items = await listInventoryItems(includeInactive);
    res.status(200).json({ data: items });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.post('/items', async (req: Request, res: Response) => {
  const parsed = CreateWarehouseInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_INVENTORY_ITEM_PAYLOAD',
        message: 'Dữ liệu tạo mặt hàng vật tư chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }
  try {
    const created = await createInventoryItem(req.actor!, parsed.data);
    res.status(201).json({ data: created });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.put('/items/:itemId', async (req: Request, res: Response) => {
  const parsed = UpdateWarehouseInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_INVENTORY_ITEM_UPDATE',
        message: 'Dữ liệu cập nhật vật tư chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }
  try {
    const updated = await updateInventoryItem(
      req.actor!,
      req.params.itemId,
      parsed.data,
    );
    res.status(200).json({ data: updated });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

// Overview, Lots, Ingest, Roastery, FIFO
warehouseRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const warehouseId =
      typeof req.query.warehouse_store_id === 'string'
        ? req.query.warehouse_store_id
        : SEED_IDS.stores.centralWarehouse;
    const overview = await getOverview(warehouseId);
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
        code: 'INVALID_LOT_QUERY',
        message: 'Tham số lọc lô hàng không hợp lệ',
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
        code: 'INVALID_INGEST_PAYLOAD',
        message: 'Dữ liệu nhập lô Tây Nguyên chưa hợp lệ',
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

warehouseRouter.patch('/lots/:lotId/status', async (req: Request, res: Response) => {
  const parsed = UpdateLotStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_LOT_STATUS_PAYLOAD',
        message: 'Trạng thái lô hoặc lý do điều chỉnh chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await updateLotStatus(req.actor!, req.params.lotId, parsed.data);
    res.status(200).json({ data: updated });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});

warehouseRouter.get('/roast-batches', async (req: Request, res: Response) => {
  try {
    const warehouseId =
      typeof req.query.warehouse_store_id === 'string'
        ? req.query.warehouse_store_id
        : SEED_IDS.stores.centralWarehouse;
    const batches = await listRoastBatches(warehouseId);
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
        message: 'Dữ liệu kết chuyển mẻ rang chưa hợp lệ',
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
  const parsed = FifoAllocationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_FIFO_ALLOCATION_PAYLOAD',
        message: 'Dữ liệu yêu cầu phân bổ FIFO chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const dryRun =
    req.query.dry_run === 'true' ||
    (typeof req.body === 'object' &&
      req.body !== null &&
      (req.body as Record<string, unknown>)['dry_run'] === true);

  try {
    const result = await allocateFifoStock(req.actor!, parsed.data, dryRun);
    res.status(200).json({ data: result });
  } catch (err) {
    handleWarehouseError(res, err);
  }
});
