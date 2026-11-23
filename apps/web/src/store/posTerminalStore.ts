import { create } from 'zustand';
import type { OfflinePosOrderEntryDTO } from '@cf19/shared';

export interface PosCartLine {
  cartLineId: string;
  productId: string;
  productName: string;
  variantId: string;
  sizeCode: string;
  modifierIds: string[];
  modifierNames: string[];
  quantity: number;
  notes?: string;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

interface PosTerminalStoreState {
  cartItems: PosCartLine[];
  isOfflineSimulationMode: boolean;
  offlineOrderQueue: OfflinePosOrderEntryDTO[];
  addToCart: (line: Omit<PosCartLine, 'cartLineId' | 'lineTotalVnd'>) => void;
  updateCartLineQty: (cartLineId: string, nextQty: number) => void;
  removeCartLine: (cartLineId: string) => void;
  clearCart: () => void;
  setOfflineSimulationMode: (enabled: boolean) => void;
  enqueueOfflineOrder: (entry: OfflinePosOrderEntryDTO) => void;
  removeSyncedOfflineOrders: (clientOrderCodes: readonly string[]) => void;
  resetPosTerminalStore: () => void;
}

export const usePosTerminalStore = create<PosTerminalStoreState>((set) => ({
  cartItems: [],
  isOfflineSimulationMode: false,
  offlineOrderQueue: [],

  addToCart: (line) =>
    set((state) => {
      const sortedModKey = [...line.modifierIds].sort().join(',');
      const existing = state.cartItems.find(
        (c) =>
          c.productId === line.productId &&
          c.variantId === line.variantId &&
          [...c.modifierIds].sort().join(',') === sortedModKey &&
          (c.notes ?? '') === (line.notes ?? ''),
      );

      if (existing) {
        const nextQty = existing.quantity + line.quantity;
        return {
          cartItems: state.cartItems.map((c) =>
            c.cartLineId === existing.cartLineId
              ? { ...c, quantity: nextQty, lineTotalVnd: c.unitPriceVnd * nextQty }
              : c,
          ),
        };
      }

      const created: PosCartLine = {
        ...line,
        cartLineId: crypto.randomUUID(),
        lineTotalVnd: line.unitPriceVnd * line.quantity,
      };
      return {
        cartItems: [...state.cartItems, created],
      };
    }),

  updateCartLineQty: (cartLineId, nextQty) =>
    set((state) => {
      if (nextQty <= 0) {
        return {
          cartItems: state.cartItems.filter((c) => c.cartLineId !== cartLineId),
        };
      }
      return {
        cartItems: state.cartItems.map((c) =>
          c.cartLineId === cartLineId
            ? { ...c, quantity: nextQty, lineTotalVnd: c.unitPriceVnd * nextQty }
            : c,
        ),
      };
    }),

  removeCartLine: (cartLineId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((c) => c.cartLineId !== cartLineId),
    })),

  clearCart: () => set({ cartItems: [] }),

  setOfflineSimulationMode: (enabled) =>
    set({ isOfflineSimulationMode: enabled }),

  enqueueOfflineOrder: (entry) =>
    set((state) => ({
      offlineOrderQueue: [...state.offlineOrderQueue, entry],
    })),

  removeSyncedOfflineOrders: (clientOrderCodes) =>
    set((state) => {
      const syncedSet = new Set(clientOrderCodes);
      return {
        offlineOrderQueue: state.offlineOrderQueue.filter(
          (entry) => !syncedSet.has(entry.client_order_code),
        ),
      };
    }),

  resetPosTerminalStore: () =>
    set({
      cartItems: [],
      isOfflineSimulationMode: false,
      offlineOrderQueue: [],
    }),
}));
