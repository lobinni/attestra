"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWallet } from "@/components/WalletProvider";
import { AttestraClient } from "@/lib/attestra";

/** Build one contract client around the exact wallet provider the user chose. */
export function useAttestra() {
  const wallet = useWallet();
  const client = useMemo(
    () => new AttestraClient(wallet.address, wallet.provider ?? undefined),
    [wallet.address, wallet.provider],
  );
  return { client, ...wallet };
}

export interface LiveQuery<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * A small live-read hook. It never writes optimistic state: after every chain
 * transaction the caller invokes refresh and accepted contract state is read
 * again from StudioNet.
 */
export function useLiveQuery<T>(
  loader: (client: AttestraClient) => Promise<T>,
  dependencyKey = "",
): LiveQuery<T> {
  const { client } = useAttestra();
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    void dependencyKey;
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current(client));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "StudioNet could not be read.",
      );
    } finally {
      setLoading(false);
    }
  }, [client, dependencyKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
