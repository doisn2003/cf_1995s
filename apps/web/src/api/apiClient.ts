import type {
  AuditLogDto,
  AuthenticatedUserDto,
  CreateStoreDirectInput,
  CreateUserInput,
  PosOrderFullDto,
  PosShiftFullDto,
  StoreDto,
  UpdateStoreInput,
  UpdateUserInput,
  UserRole,
  WarehouseInventoryItemDto,
  WarehouseLotFullDto,
} from '@cf19/shared';
import { ApiClientError, apiRequest } from './httpClient';

export { ApiClientError };

export interface ManagerOptionDto {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  assigned_store_id: string | null;
}

export interface StaffProfileRecord extends AuthenticatedUserDto {
  store_code: string | null;
  store_name: string | null;
  created_at: string;
  updated_at: string;
}

export type StoreInventoryItemRecord = Partial<WarehouseInventoryItemDto> & {
  id: string;
  sku: string;
  name: string;
  category: string;
  base_unit: 'g' | 'ml' | 'pcs';
  min_stock_threshold: number;
  internal_transfer_price_vnd: number;
  retail_price_vnd: number;
  store_available_qty?: number;
};

export type StoreLotRecord = Partial<WarehouseLotFullDto> & {
  id: string;
  store_id: string;
  item_id: string;
  sku?: string;
  item_name?: string;
  base_unit?: 'g' | 'ml' | 'pcs';
  lot_code: string;
  roast_date: string | null;
  expiry_date: string | null;
  remaining_qty: number;
  initial_qty: number;
  status: string;
};

export type ShiftRecord = Partial<PosShiftFullDto> & {
  id: string;
  store_id: string;
  cashier_id: string;
  opening_cash_vnd: number;
  status: 'OPEN' | 'CLOSED';
  system_expected_cash_vnd?: number | null;
  variance_cash_vnd?: number | null;
};

export interface VoidOrderRequestPayload {
  manager_id: string;
  pin: string;
  reason: string;
}

export interface VoidOrderResponse {
  order: Partial<PosOrderFullDto> & {
    id: string;
    order_code: string;
    payment_status: string;
  };
  approval_audit_id: string;
}

// AUTH
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ access_token: string; user: AuthenticatedUserDto }> {
  const res = await apiRequest<{
    access_token: string;
    user: AuthenticatedUserDto;
  }>(
    '/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    { skipAuth: true },
  );
  return res.data;
}

export async function fetchCurrentUser(): Promise<AuthenticatedUserDto> {
  const res = await apiRequest<AuthenticatedUserDto>('/api/v1/auth/me');
  return res.data;
}

export async function fetchEligibleManagers(
  storeId?: string,
): Promise<ManagerOptionDto[]> {
  const qs = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const res = await apiRequest<ManagerOptionDto[]>(`/api/v1/auth/managers${qs}`);
  return res.data;
}

// STORES CRUD
export async function fetchStores(includeInactive = false): Promise<StoreDto[]> {
  const qs = includeInactive ? '?include_inactive=true' : '';
  const res = await apiRequest<StoreDto[]>(`/api/v1/stores${qs}`);
  return res.data;
}

export async function createStoreApi(payload: CreateStoreDirectInput): Promise<StoreDto> {
  const res = await apiRequest<StoreDto>('/api/v1/stores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateStoreApi(
  storeId: string,
  payload: UpdateStoreInput,
): Promise<StoreDto> {
  const res = await apiRequest<StoreDto>(`/api/v1/stores/${storeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

// USERS / STAFF CRUD
export async function fetchUsersApi(): Promise<StaffProfileRecord[]> {
  const res = await apiRequest<StaffProfileRecord[]>('/api/v1/users');
  return res.data;
}

export async function createUserApi(
  payload: CreateUserInput,
): Promise<StaffProfileRecord> {
  const res = await apiRequest<StaffProfileRecord>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateUserApi(
  userId: string,
  payload: UpdateUserInput,
): Promise<StaffProfileRecord> {
  const res = await apiRequest<StaffProfileRecord>(`/api/v1/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function resetUserPinApi(userId: string, pin: string): Promise<void> {
  await apiRequest(`/api/v1/users/${userId}/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

// STORE OPERATIONAL QUERIES
export async function fetchStoreInventory(
  storeId: string,
): Promise<StoreInventoryItemRecord[]> {
  const res = await apiRequest<StoreInventoryItemRecord[]>(
    `/api/v1/stores/${storeId}/inventory`,
  );
  return res.data;
}

export async function fetchStoreLots(storeId: string): Promise<StoreLotRecord[]> {
  const res = await apiRequest<StoreLotRecord[]>(`/api/v1/stores/${storeId}/lots`);
  return res.data;
}

export async function fetchCurrentShift(
  storeId: string,
): Promise<ShiftRecord | null> {
  try {
    const res = await apiRequest<ShiftRecord>(
      `/api/v1/stores/${storeId}/shifts/current`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function voidPosOrder(
  storeId: string,
  orderId: string,
  payload: VoidOrderRequestPayload,
): Promise<VoidOrderResponse> {
  const res = await apiRequest<VoidOrderResponse['order']>(
    `/api/v1/stores/${storeId}/orders/${orderId}/void`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return {
    order: res.data,
    approval_audit_id: String(res.meta?.approval_audit_id ?? ''),
  };
}

export async function fetchAuditLogs(limit = 50): Promise<AuditLogDto[]> {
  const res = await apiRequest<AuditLogDto[]>(
    `/api/v1/audit-logs?limit=${limit}`,
  );
  return res.data;
}
