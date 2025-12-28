import React from "react";

type Importer<T extends React.ComponentType<any>> = () => Promise<{ default: T }>;

const RELOAD_KEY = "lazyWithRetry:reloaded";

function isDynamicImportError(err: unknown) {
  const message = (err as any)?.message as string | undefined;
  if (!message) return false;
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message
  );
}

/**
 * Wrap React.lazy so that when a code-split chunk fails to download (often due to stale cached HTML/assets),
 * we hard-reload once with a cache-busting query param.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(importer: Importer<T>) {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      if (isDynamicImportError(err) && typeof window !== "undefined") {
        try {
          if (!sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, "1");
            const url = new URL(window.location.href);
            url.searchParams.set("reload", String(Date.now()));
            window.location.href = url.toString();
          }
        } catch {
          // ignore reload failures; rethrow original error
        }
      }
      throw err;
    }
  });
}

export function clearLazyWithRetryFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}
