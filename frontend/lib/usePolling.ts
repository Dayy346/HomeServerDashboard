"use client";

import { useEffect, useRef, useState } from "react";


export type PollState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};


export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  onData?: (data: T) => void,
): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);

  const onDataRef = useRef(onData);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onDataRef.current = onData;
  }, [fetcher, onData]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const tick = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const next = await fetcherRef.current(controller.signal);
        if (!cancelled) {
          setData(next);
          setError(null);
          onDataRef.current?.(next);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(tick, intervalMs);
        }
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [intervalMs]);

  return { data, error, loading };
}
