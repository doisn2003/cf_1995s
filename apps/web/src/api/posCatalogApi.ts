import type {
  BomRecipeWithItemsDTO,
  CreateMenuCategoryInput,
  CreateMenuModifierInput,
  CreateMenuProductInput,
  MenuCategoryDto,
  MenuModifierDto,
  MenuProductDto,
  MenuVariantDto,
  OfflinePosBatchSyncDTO,
  OfflinePosBatchSyncResultDTO,
  PosOrderDetailResultDTO,
  PosOrderFullDto,
  StorePosCatalogDTO,
  SubmitPosOrderDTO,
  UpdateMenuCategoryInput,
  UpdateMenuModifierInput,
  UpdateMenuProductInput,
  UpsertBomRecipeInput,
  UpsertMenuVariantInput,
} from '@cf19/shared';
import { apiRequest } from './httpClient';

export async function fetchStorePosCatalogApi(
  storeId: string,
  includeInactive = false,
): Promise<StorePosCatalogDTO> {
  const qs = includeInactive ? '?include_inactive=true' : '';
  const res = await apiRequest<StorePosCatalogDTO>(
    `/api/v1/catalog/stores/${storeId}${qs}`,
  );
  return res.data;
}

export async function fetchStorePosOrdersApi(
  storeId: string,
): Promise<PosOrderFullDto[]> {
  const res = await apiRequest<PosOrderFullDto[]>(
    `/api/v1/pos/stores/${storeId}/orders`,
  );
  return res.data;
}

export async function submitPosOrderApi(
  storeId: string,
  payload: SubmitPosOrderDTO,
): Promise<PosOrderDetailResultDTO> {
  const res = await apiRequest<PosOrderDetailResultDTO>(
    `/api/v1/pos/stores/${storeId}/orders`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function syncOfflinePosOrdersApi(
  storeId: string,
  payload: OfflinePosBatchSyncDTO,
): Promise<OfflinePosBatchSyncResultDTO> {
  const res = await apiRequest<OfflinePosBatchSyncResultDTO>(
    `/api/v1/pos/stores/${storeId}/orders/offline-sync`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function fetchOrderReceiptApi(
  storeId: string,
  orderId: string,
): Promise<{ order: PosOrderFullDto; thermal_receipt_text: string }> {
  const res = await apiRequest<{
    order: PosOrderFullDto;
    thermal_receipt_text: string;
  }>(`/api/v1/pos/stores/${storeId}/orders/${orderId}/receipt`);
  return res.data;
}

// MASTER MENU & BOM CRUD (SUPER_ADMIN)
export async function createMenuCategoryApi(
  payload: CreateMenuCategoryInput,
): Promise<MenuCategoryDto> {
  const res = await apiRequest<MenuCategoryDto>('/api/v1/catalog/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMenuCategoryApi(
  categoryId: string,
  payload: UpdateMenuCategoryInput,
): Promise<MenuCategoryDto> {
  const res = await apiRequest<MenuCategoryDto>(
    `/api/v1/catalog/categories/${categoryId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function createMenuProductApi(
  payload: CreateMenuProductInput,
): Promise<MenuProductDto & { variants: MenuVariantDto[] }> {
  const res = await apiRequest<MenuProductDto & { variants: MenuVariantDto[] }>(
    '/api/v1/catalog/products',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function updateMenuProductApi(
  productId: string,
  payload: UpdateMenuProductInput,
): Promise<MenuProductDto> {
  const res = await apiRequest<MenuProductDto>(
    `/api/v1/catalog/products/${productId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function upsertMenuVariantApi(
  productId: string,
  payload: UpsertMenuVariantInput,
): Promise<MenuVariantDto> {
  const res = await apiRequest<MenuVariantDto>(
    `/api/v1/catalog/products/${productId}/variants`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function createMenuModifierApi(
  payload: CreateMenuModifierInput,
): Promise<MenuModifierDto> {
  const res = await apiRequest<MenuModifierDto>('/api/v1/catalog/modifiers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMenuModifierApi(
  modifierId: string,
  payload: UpdateMenuModifierInput,
): Promise<MenuModifierDto> {
  const res = await apiRequest<MenuModifierDto>(
    `/api/v1/catalog/modifiers/${modifierId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function upsertBomRecipeApi(
  payload: UpsertBomRecipeInput,
): Promise<BomRecipeWithItemsDTO> {
  const res = await apiRequest<BomRecipeWithItemsDTO>('/api/v1/catalog/bom-recipes', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}
