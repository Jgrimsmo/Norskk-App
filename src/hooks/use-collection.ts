"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAll,
  create,
  update,
  remove,
  subscribe,
  type QueryConstraint,
} from "@/lib/firebase/firestore";

interface UseCollectionReturn<T extends { id: string }> {
  data: T[];
  loading: boolean;
  error: Error | null;
  add: (item: T) => Promise<void>;
  update: (id: string, data: Partial<Omit<T, "id">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Generic hook that subscribes to a Firestore collection in
 * real-time and provides CRUD helpers.
 *
 * Usage:
 *   const { data, loading, add, update, remove } = useCollection<Employee>("employees");
 */
export function useCollection<T extends { id: string }>(
  path: string,
  ...constraints: QueryConstraint[]
): UseCollectionReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Real-time subscription
  useEffect(() => {
    setLoading(true);
    const unsub = subscribe<T>(
      path,
      (items) => {
        setData(items);
        setLoading(false);
      },
      ...constraints
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const addItem = useCallback(
    async (item: T) => {
      try {
        await create<T>(path, item);
      } catch (e) {
        setError(e as Error);
        throw e;
      }
    },
    [path]
  );

  const updateItem = useCallback(
    async (id: string, partial: Partial<Omit<T, "id">>) => {
      try {
        await update<T>(path, id, partial);
      } catch (e) {
        setError(e as Error);
        throw e;
      }
    },
    [path]
  );

  const removeItem = useCallback(
    async (id: string) => {
      try {
        await remove(path, id);
      } catch (e) {
        setError(e as Error);
        throw e;
      }
    },
    [path]
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getAll<T>(path, ...constraints);
      setData(items);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return {
    data,
    loading,
    error,
    add: addItem,
    update: updateItem,
    remove: removeItem,
    refresh,
  };
}
