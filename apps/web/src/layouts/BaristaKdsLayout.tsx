import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SEED_IDS, type StoreDto } from '@cf19/shared';
import { fetchStores } from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { BaristaKdsQueueWorkbench } from '../features/kds/BaristaKdsQueueWorkbench';
import { useAuthStore } from '../store/authStore';

export function BaristaKdsLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId =
    storeId ?? currentUser.assigned_store_id ?? SEED_IDS.stores.store01;
  const [storeInfo, setStoreInfo] = useState<StoreDto | null>(null);

  useEffect(() => {
    void fetchStores()
      .then((list) =>
        setStoreInfo(list.find((s) => s.id === activeStoreId) ?? null),
      )
      .catch(() => setStoreInfo(null));
  }, [activeStoreId]);

  const storeTitle = storeInfo
    ? `${storeInfo.code} — ${storeInfo.name}`
    : 'Quầy Pha Chế';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <RoleShellHeader
        title={`Màn Hình Quầy Pha Chế KDS — ${storeTitle}`}
        subtitle="Hiển thị đơn đã thanh toán theo thứ tự ưu tiên • Đồng hồ SLA • Tự động trừ kho BOM FIFO"
        badgeText="PHA CHẾ KDS"
        dark
      />

      <main className="max-w-7xl mx-auto p-6">
        <BaristaKdsQueueWorkbench storeId={activeStoreId} />
      </main>
    </div>
  );
}
