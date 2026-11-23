import type { z } from 'zod';
import type { BaseUnit, InventoryCategory, LotStatus } from '../enums.js';
import type {
  CompleteRoastBatchSchema,
  FifoAllocationRequestSchema,
  IngestWarehouseLotSchema,
  WarehouseLotQuerySchema,
} from '../schemas/warehouse.schema.js';
import type { RoastBatchDto, WarehouseLotFullDto } from './domain.types.js';

export type IngestWarehouseLotDTO = z.infer<typeof IngestWarehouseLotSchema>;
export type CompleteRoastBatchDTO = z.infer<typeof CompleteRoastBatchSchema>;
export type FifoAllocationRequestDTO = z.infer<typeof FifoAllocationRequestSchema>;
export type WarehouseLotQueryDTO = z.infer<typeof WarehouseLotQuerySchema>;

export interface WarehouseLotIngestResultDTO {
  lot: WarehouseLotFullDto;
  item_id: string;
  previous_qty: number;
  previous_mac_vnd: number;
  effective_unit_cost_vnd: number;
  new_mac_vnd: number;
}

export interface CompleteRoastBatchResultDTO {
  roast_batch: RoastBatchDto;
  output_lot: WarehouseLotFullDto;
  source_lot_id: string;
  source_lot_remaining_qty: number;
  source_lot_status: LotStatus;
  weight_loss_pct: number;
  is_abnormal_yield_loss: boolean;
  output_unit_cost_vnd: number;
  new_output_item_mac_vnd: number;
}

export interface FifoLotAllocationSliceDTO {
  lot_id: string;
  lot_code: string;
  roast_date: string | null;
  received_at: string;
  allocated_qty: number;
  remaining_after_qty: number;
  lot_status_after: LotStatus;
  unit_cost_vnd: number;
  slice_cogs_vnd: number;
}

export interface FifoAllocationResultDTO {
  warehouse_store_id: string;
  item_id: string;
  requested_qty: number;
  total_allocated_qty: number;
  total_cogs_vnd: number;
  weighted_unit_cost_vnd: number;
  reference_code: string | null;
  allocations: FifoLotAllocationSliceDTO[];
}

export interface WarehouseStockSummaryDTO {
  item_id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  base_unit: BaseUnit;
  min_stock_threshold: number;
  total_available_qty: number;
  available_lot_count: number;
  moving_avg_cost_vnd: number;
  estimated_stock_value_vnd: number;
  is_low_stock: boolean;
}

export interface WarehouseOverviewDTO {
  warehouse_store_id: string;
  warehouse_code: string;
  warehouse_name: string;
  total_skus: number;
  total_available_lots: number;
  low_stock_sku_count: number;
  total_inventory_value_vnd: number;
  recent_roast_batches_count: number;
  stock_summaries: WarehouseStockSummaryDTO[];
}
