'use client';

import { useEffect, useState } from 'react';
import { apiClient } from './api-client';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<T>(path);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (path) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data, error, loading, refetch };
}
