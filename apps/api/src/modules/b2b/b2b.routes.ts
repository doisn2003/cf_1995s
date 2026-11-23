import { Router, type Request, type Response } from 'express';
import {
  B2bPriceQuoteQuerySchema,
  CreateB2bCustomerSchema,
  CreateB2bOrderSchema,
  CreateB2cRetailOrderSchema,
  RecordB2bDebtPaymentSchema,
  UpdateB2bCustomerSchema,
  UpsertB2bPriceTierSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  createB2bOrder,
  createB2cRetailOrder,
  createCustomer,
  deletePriceTier,
  getOverview,
  listCustomers,
  listDebtLedger,
  listPriceTiers,
  quoteTieredPrice,
  recordDebtPayment,
  updateCustomer,
  upsertPriceTier,
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
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Lỗi nghiệp vụ Bán sỉ B2B';
  res.status(500).json({
    error: { code: 'B2B_INTERNAL_ERROR', message },
  });
}

b2bRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const asOfDate =
      typeof req.query.as_of_date === 'string' ? req.query.as_of_date : undefined;
    const overview = await getOverview(asOfDate);
    res.status(200).json({ data: overview });
  } catch (err) {
    handleB2bError(res, err);
  }
});

// Customers CRUD
b2bRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const customers = await listCustomers(req.query.include_inactive === 'true');
    res.status(200).json({ data: customers });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.post('/customers', async (req: Request, res: Response) => {
  const parsed = CreateB2bCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_CUSTOMER_PAYLOAD',
        message: 'Dữ liệu tạo khách sỉ B2B chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }
  try {
    const created = await createCustomer(req.actor!, parsed.data);
    res.status(201).json({ data: created });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.put('/customers/:customerId', async (req: Request, res: Response) => {
  const parsed = UpdateB2bCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_CUSTOMER_UPDATE',
        message: 'Dữ liệu cập nhật khách sỉ chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }
  try {
    const updated = await updateCustomer(req.actor!, req.params.customerId, parsed.data);
    res.status(200).json({ data: updated });
  } catch (err) {
    handleB2bError(res, err);
  }
});

// Price Tiers CRUD
b2bRouter.get('/price-tiers', async (_req: Request, res: Response) => {
  try {
    const tiers = await listPriceTiers();
    res.status(200).json({ data: tiers });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.post('/price-tiers', async (req: Request, res: Response) => {
  const parsed = UpsertB2bPriceTierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_PRICE_TIER_PAYLOAD',
        message: 'Cấu hình bậc giá sỉ chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }
  try {
    const tier = await upsertPriceTier(req.actor!, parsed.data);
    res.status(201).json({ data: tier });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.delete('/price-tiers/:tierId', async (req: Request, res: Response) => {
  try {
    const result = await deletePriceTier(req.actor!, req.params.tierId);
    res.status(200).json({ data: result });
  } catch (err) {
    handleB2bError(res, err);
  }
});

// Price quote, Orders (B2B + B2C) & Debt Ledger
b2bRouter.get('/price-quote', async (req: Request, res: Response) => {
  const parsed = B2bPriceQuoteQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_PRICE_QUOTE_QUERY',
        message: 'Tham số báo giá B2B chưa hợp lệ',
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
        message: 'Dữ liệu đơn bán sỉ B2B chưa hợp lệ',
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

b2bRouter.post('/retail-orders', async (req: Request, res: Response) => {
  const parsed = CreateB2cRetailOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_B2C_RETAIL_PAYLOAD',
        message: 'Dữ liệu đơn bán lẻ B2C chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const result = await createB2cRetailOrder(req.actor!, parsed.data);
    res.status(201).json({ data: result });
  } catch (err) {
    handleB2bError(res, err);
  }
});

b2bRouter.get('/debt-ledger', async (req: Request, res: Response) => {
  try {
    const customerId =
      typeof req.query.customer_id === 'string' ? req.query.customer_id : undefined;
    const entries = await listDebtLedger(customerId);
    res.status(200).json({ data: entries });
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
        message: 'Dữ liệu thu nợ khách sỉ chưa hợp lệ',
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
