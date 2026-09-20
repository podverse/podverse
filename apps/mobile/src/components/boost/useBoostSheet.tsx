import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { BoostSheet } from './BoostSheet';
import type { BoostSheetTarget } from './BoostSheet';

type UseBoostSheet = {
  boostSheet: ReactNode;
  openBoost: (target: BoostSheetTarget) => void;
};

export function useBoostSheet(): UseBoostSheet {
  const [target, setTarget] = useState<BoostSheetTarget | null>(null);

  const openBoost = useCallback((next: BoostSheetTarget) => {
    setTarget(next);
  }, []);

  return {
    boostSheet: (
      <BoostSheet
        onClose={() => {
          setTarget(null);
        }}
        target={target}
      />
    ),
    openBoost,
  };
}
