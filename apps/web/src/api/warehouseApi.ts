import type {
  CompleteRoastBatchDTO,
  CompleteRoastBatchResultDTO,
  CreateWarehouseInventoryItemInput,
  FifoAllocationRequestDTO,
  FifoAllocationResultDTO,
  IngestWarehouseLotDTO,
  RoastBatchDto,
  UpdateLotStatusInput,
  UpdateWarehouseInventoryItemInput,
  WarehouseInventoryItemDto,
  WarehouseLotFullDto,
  WarehouseLotIngestResultDTO,
  WarehouseOverviewDTO,
} from '@cf19/shared';
import { apiRequest } from './httpClient';

export async function fetchWarehouseItems(
  includeInactive = false,
): Promise<WarehouseInventoryItemDto[]> {
  const qs = includeInactive ? '?include_inactive=true' : '';
  const res = await apiRequest<WarehouseInventoryItemDto[]>(
    `/api/v1/warehouse/items${qs}`,
  );
  return res.data;
}

export async function createWarehouseItemApi(
  payload: CreateWarehouseInventoryItemInput,
): Promise<WarehouseInventoryItemDto> {
  const res = await apiRequest<WarehouseInventoryItemDto>('/api/v1/warehouse/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateWarehouseItemApi(
  itemId: string,
  payload: UpdateWarehouseInventoryItemInput,
): Promise<WarehouseInventoryItemDto> {
  const res = await apiRequest<WarehouseInventoryItemDto>(
    `/api/v1/warehouse/items/${itemId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function fetchWarehouseOverview(): Promise<WarehouseOverviewDTO> {
  const res = await apiRequest<WarehouseOverviewDTO>('/api/v1/warehouse/overview');
  return res.data;
}

export async function fetchWarehouseLots(): Promise<WarehouseLotFullDto[]> {
  const res = await apiRequest<WarehouseLotFullDto[]>('/api/v1/warehouse/lots');
  return res.data;
}

export async function updateWarehouseLotStatusApi(
  lotId: string,
  payload: UpdateLotStatusInput,
): Promise<WarehouseLotFullDto> {
  const res = await apiRequest<WarehouseLotFullDto>(
    `/api/v1/warehouse/lots/${lotId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function fetchRoastBatches(): Promise<RoastBatchDto[]> {
  const res = await apiRequest<RoastBatchDto[]>('/api/v1/warehouse/roast-batches');
  return res.data;
}

export async function ingestWarehouseLotApi(
  payload: IngestWarehouseLotDTO,
): Promise<WarehouseLotIngestResultDTO> {
  const res = await apiRequest<WarehouseLotIngestResultDTO>(
    '/api/v1/warehouse/lots/ingest',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function completeRoastBatchApi(
  payload: CompleteRoastBatchDTO,
): Promise<CompleteRoastBatchResultDTO> {
  const res = await apiRequest<CompleteRoastBatchResultDTO>(
    '/api/v1/warehouse/roast-batches',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function allocateFifoStockApi(
  payload: FifoAllocationRequestDTO & { dry_run: boolean },
): Promise<FifoAllocationResultDTO> {
  const res = await apiRequest<FifoAllocationResultDTO>(
    '/api/v1/warehouse/fifo/allocate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
