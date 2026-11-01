import { useCallback, useState } from 'react';
import { checkEligibility } from '../../../shared/batches/eligibility';
import { classifyScan } from '../../../shared/batches/scan-code';
import type { BatchSelection } from '../../../shared/contracts/station';
import { ApiError } from '../../net/http';
import { getBatch, getRecipe } from '../../net/orgatex';
import { messages } from '../../i18n/messages';

interface SelectionState {
  pending: boolean;
  reason: string | null;
}

/**
 * Selects a batch by touched id or scanned code: reads the batch, applies the shared eligibility
 * rule, and only then reads the recipe (workbook Step 19's exact two-call sequence). The server
 * re-enforces this independently at session start (bolt 006).
 */
export function useBatchSelection(onSelected: (selection: BatchSelection) => void) {
  const [state, setState] = useState<SelectionState>({ pending: false, reason: null });

  const select = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (trimmed.length === 0) return;
      if (classifyScan(trimmed) !== 'BATCH') {
        setState({ pending: false, reason: messages.notABatchCode(trimmed) });
        return;
      }
      setState({ pending: true, reason: null });
      getBatch(trimmed)
        .then(async (batch) => {
          const eligibility = checkEligibility(batch);
          if (!eligibility.eligible) {
            setState({ pending: false, reason: eligibility.message });
            return;
          }
          const recipe = await getRecipe(trimmed);
          setState({ pending: false, reason: null });
          onSelected({ batch, recipe });
        })
        .catch((e: unknown) => {
          const reason = e instanceof ApiError ? e.message : 'Station service unreachable';
          setState({ pending: false, reason });
        });
    },
    [onSelected],
  );

  const dismiss = useCallback(() => {
    setState({ pending: false, reason: null });
  }, []);

  return { ...state, select, dismiss };
}
