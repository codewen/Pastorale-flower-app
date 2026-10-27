type LogLevel = "info" | "warn" | "error";

/**
 * Emit one searchable JSON line for Vercel runtime logs.
 * Callers should pass operational identifiers only; never pass request bodies,
 * customer data, credentials, full URLs, or arbitrary third-party error text.
 */
export function logOperationalEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
) {
  const entry = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(entry);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(entry);
  } else {
    // eslint-disable-next-line no-console
    console.info(entry);
  }
}

export function getRequestId(request: Request): string | null {
  return request.headers.get("x-vercel-id");
}

export function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
