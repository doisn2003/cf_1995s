import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SEED_IDS, type StoreDto } from '@cf19/shared';
import {
  fetchCurrentShift,
  fetchStores,
  type ShiftRecord,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { BlindShiftCloseWorkbench } from '../features/pos/BlindShiftCloseWorkbench';
import { PosTerminalWorkbench } from '../features/pos/PosTerminalWorkbench';
import { useAuthStore } from '../store/authStore';

export function CashierPosLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId =
    storeId ?? currentUser.assigned_store_id ?? SEED_IDS.stores.store01;

  const [storeInfo, setStoreInfo] = useState<StoreDto | null>(null);
  const [shift, setShift] = useState<ShiftRecord | null>(null);

  const loadShift = useCallback(async () => {
    try {
      const [storesList, currentShift] = await Promise.all([
        fetchStores(),
        fetchCurrentShift(activeStoreId),
      ]);
      setStoreInfo(storesList.find((s) => s.id === activeStoreId) ?? null);
      setShift(currentShift);
    } catch {
      setShift(null);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void loadShift();
  }, [loadShift]);

  const storeTitle = storeInfo
    ? `${storeInfo.code} — ${storeInfo.name}`
    : 'Chi Nhánh POS';

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title={`Quầy Thu Ngân POS — ${storeTitle}`}
        subtitle="Lên đơn đồ uống, thanh toán Tiền mặt / VietQR động, in bill nhiệt & Đóng ca đếm tiền mù"
        badgeText="THU NGÂN POS"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <BlindShiftCloseWorkbench
          storeId={activeStoreId}
          shift={shift}
          onShiftChanged={() => void loadShift()}
        />

        <PosTerminalWorkbench
          storeId={activeStoreId}
          shiftId={shift?.status === 'OPEN' ? shift.id : null}
        />
      </main>
    </div>
  );
}
