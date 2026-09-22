"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { StatusPage } from "@/components/layout/status-page";

/**
 * Root error boundary — catches anything thrown while rendering a page or
 * nested layout below the root layout (a backend fetch blowing up, a bad
 * record shape, ...). The root layout itself is outside this boundary; see
 * global-error.tsx for that case.
 *
 * `error.message` is a generic placeholder in production for server-thrown
 * errors (Next strips the real one so nothing sensitive leaks), so the only
 * thing worth surfacing to the visitor is the digest — that's the key to
 * find the matching entry in the Workers logs.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      titleKey="status.errorTitle"
      descriptionKey="status.errorDesc"
      detail={error.digest}
      detailLabelKey="status.errorCode"
      onRetry={retry}
    />
  );
}
