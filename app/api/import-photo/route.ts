import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "order-photos";

/**
 * POST: Fetch an image from an external URL (e.g. Google App Sheet / lh3.googleusercontent.com)
 * and upload it to Supabase storage. Returns the new public URL.
 * Used during CSV import to migrate external photo links into our DB.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { url } = body;
  if (!url || typeof url !== "string" || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/*" },
      cache: "no-store",
    });
    // External server rejected — return 200 with no url so importer keeps original path.
    if (!res.ok) {
      // Log full URL for 4xx to debug AppSheet (e.g. 400 = missing appVersion/signature or bad fileName).
      const urlLog = res.status >= 400 && res.status < 500 ? url : (url.length > 120 ? url.slice(0, 120) + "..." : url);
      console.warn(
        `[import-photo] Image fetch failed: status=${res.status} ${res.statusText} url=${urlLog}`
      );
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
      console.error("[import-photo] Supabase upload failed:", uploadError.message);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[import-photo] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
