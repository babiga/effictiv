import { useEffect, useState } from "react";

type FetchResult<Page> = { key: string; page: Page } | { key: string; error: true };

export function useMeasurementsPage<Page>(url: string | null) {
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<FetchResult<Page>>();
  const key = `${url}#${refresh}`;
  const current = result?.key === key ? result : undefined;

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    async function load(pageUrl: string) {
      try {
        const response = await fetch(pageUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Measurements request failed");
        const page: Page = await response.json();
        if (!controller.signal.aborted) setResult({ key, page });
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: true });
      }
    }
    void load(url);
    return () => controller.abort();
  }, [url, key]);

  return {
    page: current && "page" in current ? current.page : undefined,
    error: current && "error" in current,
    loading: Boolean(url) && !current,
    refresh: () => setRefresh((previous) => previous + 1),
  };
}
