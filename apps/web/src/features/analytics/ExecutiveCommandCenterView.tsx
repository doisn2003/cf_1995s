import { useState } from 'react';
import type { CloneFranchiseStoreResultDTO } from '@cf19/shared';
import { ExecutivePnlConsolidationPanel } from './ExecutivePnlConsolidationPanel';
import { FranchiseStoreCloningWizard } from './FranchiseStoreCloningWizard';

export interface ExecutiveCommandCenterViewProps {
  onBranchAdded?: (result: CloneFranchiseStoreResultDTO) => void;
}

export function ExecutiveCommandCenterView({
  onBranchAdded,
}: ExecutiveCommandCenterViewProps) {
  const [pnlRefreshSignal, setPnlRefreshSignal] = useState<number>(0);

  const handleStoreCloned = (result: CloneFranchiseStoreResultDTO) => {
    setPnlRefreshSignal((n) => n + 1);
    onBranchAdded?.(result);
  };

  return (
    <div className="space-y-6">
      <ExecutivePnlConsolidationPanel refreshSignal={pnlRefreshSignal} />
      <FranchiseStoreCloningWizard onStoreCloned={handleStoreCloned} />
    </div>
  );
}
