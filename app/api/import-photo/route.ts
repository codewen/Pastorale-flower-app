import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getErrorName, getRequestId, logOperationalEvent } from "@/lib/operational-log";

const STORAGE_BUCKET = "order-photos";

/**
 * POST: Fetch an image from an external URL (e.g. Google App Sheet / lh3.googleusercontent.com)
 * and upload it to Supabase storage. Returns the new public URL.
 * Used during CSV import to migrate external photo links into our DB.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    logOperationalEvent("error", "import_photo.failed", {
      route: "/api/import-photo",
      requestId,
      reason: "supabase_not_configured",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    logOperationalEvent("warn", "import_photo.request_rejected", {
      route: "/api/import-photo",
      requestId,
      reason: "invalid_json",
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { url } = body;
  if (!url || typeof url !== "string" || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    logOperationalEvent("warn", "import_photo.request_rejected", {
      route: "/api/import-photo",
      requestId,
      reason: "invalid_url",
    });
    return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
  }

  try {
    let sourceHost = "unknown";
    try {
      sourceHost = new URL(url).hostname;
    } catch {
      // URL validation below handles malformed input without logging it.
    }
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/*" },
      cache: "no-store",
    });
    // External server rejected — return 200 with no url so importer keeps original path.
    if (!res.ok) {
      logOperationalEvent("warn", "import_photo.source_fetch_failed", {
        route: "/api/import-photo",
        requestId,
        sourceHost,
        upstreamStatus: res.status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { url: null, reason: "fetch_failed", status: res.status }
      );
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `import-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType: contentType.split(";")[0].trim() });

    if (uploadError) {
      logOperationalEvent("error", "import_photo.storage_upload_failed", {
        route: "/api/import-photo",
        requestId,
        sourceHost,
        errorCode: uploadError.name ?? null,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    logOperationalEvent("info", "import_photo.completed", {
      route: "/api/import-photo",
      requestId,
      sourceHost,
      bytes: buffer.byteLength,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logOperationalEvent("error", "import_photo.failed", {
      route: "/api/import-photo",
      requestId,
      errorName: getErrorName(err),
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
