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
