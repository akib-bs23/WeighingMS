import { useCallback, useEffect, useState } from 'react';
import { listBatches } from '../../net/orgatex';
import { ApiError } from '../../net/http';
import type { OrgatexBatch } from '../../../shared/contracts/orgatex';

interface QueueState {
  batches: OrgatexBatch[] | null;
  receivedAt: string | null;
  error: string | null;
  loading: boolean;
}

/** Loads the station's batch queue from OrgaTEX and exposes a Retry (FR-1, FR-31). */
export function useBatchQueue() {
  const [state, setState] = useState<QueueState>({
    batches: null,
    receivedAt: null,
    error: null,
    loading: true,
  });

  // No setState call runs synchronously here: the loading flag is already true in the initial
  // state, so the mount effect only needs to await the fetch and settle its result.
  const fetchQueue = useCallback(() => {
    listBatches()
      .then((batches) => {
        setState({
          batches,
          receivedAt: new Date().toLocaleTimeString('en-GB'),
          error: null,
          loading: false,
        });
      })
      .catch((e: unknown) => {
        const message = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
        setState({ batches: null, receivedAt: null, error: message, loading: false });
      });
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchQueue();
  }, [fetchQueue]);

  return { ...state, retry };
}
