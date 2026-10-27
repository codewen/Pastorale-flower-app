import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";
import { toThemePayload } from "@/lib/blackout-dates-format";
import { getErrorName, getRequestId, logOperationalEvent } from "@/lib/operational-log";
import type { BlackoutDate, BlackoutDateFormData } from "@/types/blackout-date";

const CACHE_CONTROL = "public, max-age=300";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase not configured");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders(),
      ...(init?.headers ?? {}),
    },
  });
}

async function requireAuth(request: Request, method: string) {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    logOperationalEvent("error", "blackout_dates.auth_check_failed", {
      route: "/api/blackout-dates",
      requestId: getRequestId(request),
      method,
      errorName: getErrorName(error),
    });
    throw error;
  }
}

function parseFormData(body: unknown): BlackoutDateFormData | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return null;
  }
  const pickupHour =
    data.pickup_start_hour === null || data.pickup_start_hour === undefined
      ? null
      : Number(data.pickup_start_hour);
  if (
    pickupHour !== null &&
    (!Number.isInteger(pickupHour) || pickupHour < 0 || pickupHour > 23)
  ) {
    return null;
  }
  return {
    date: data.date,
    disable_pickup: Boolean(data.disable_pickup),
    disable_delivery: Boolean(data.disable_delivery),
    pickup_start_hour: pickupHour,
    notes: typeof data.notes === "string" ? data.notes : null,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("blackout_dates")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      logOperationalEvent("error", "blackout_dates.read_failed", {
        route: "/api/blackout-dates",
        requestId,
        errorCode: error.code ?? null,
      });
      return jsonResponse({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as BlackoutDate[];
    const format = request.nextUrl.searchParams.get("format");

    if (format === "admin") {
      const session = await requireAuth(request, "GET");
      if (!session) {
        logOperationalEvent("warn", "blackout_dates.read_rejected", {
          route: "/api/blackout-dates",
          requestId,
          reason: "unauthorized",
        });
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }
      return jsonResponse({ entries: rows });
    }

    const payload = toThemePayload(rows);
    return jsonResponse(payload, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logOperationalEvent("error", "blackout_dates.read_failed", {
      route: "/api/blackout-dates",
      requestId,
      errorName: getErrorName(err),
    });
    return jsonResponse({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const session = await requireAuth(request, "POST");
  if (!session) {
    logOperationalEvent("warn", "blackout_dates.write_rejected", {
      route: "/api/blackout-dates",
      method: "POST",
      requestId,
      reason: "unauthorized",
    });
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const formData = parseFormData(body);
    if (!formData) {
      logOperationalEvent("warn", "blackout_dates.write_rejected", {
        route: "/api/blackout-dates",
        method: "POST",
        requestId,
        reason: "invalid_body",
      });
      return jsonResponse({ error: "Invalid request body" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("blackout_dates")
      .upsert(
        {
          date: formData.date,
          disable_pickup: formData.disable_pickup,
          disable_delivery: formData.disable_delivery,
          pickup_start_hour: formData.pickup_start_hour,
          notes: formData.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "date" },
      )
      .select()
      .single();

    if (error) {
      logOperationalEvent("error", "blackout_dates.create_failed", {
        route: "/api/blackout-dates",
        requestId,
        date: formData.date,
        errorCode: error.code ?? null,
      });
      return jsonResponse({ error: error.message }, { status: 500 });
    }

    logOperationalEvent("info", "blackout_dates.created", {
      route: "/api/blackout-dates",
      requestId,
      date: formData.date,
    });
    return jsonResponse({ entry: data as BlackoutDate }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logOperationalEvent("error", "blackout_dates.create_failed", {
      route: "/api/blackout-dates",
      requestId,
      errorName: getErrorName(err),
    });
    return jsonResponse({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);
  const session = await requireAuth(request, "PUT");
  if (!session) {
    logOperationalEvent("warn", "blackout_dates.write_rejected", {
      route: "/api/blackout-dates",
      method: "PUT",
      requestId,
      reason: "unauthorized",
    });
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : null;
    const formData = parseFormData(body);
    if (!id || !formData) {
      logOperationalEvent("warn", "blackout_dates.write_rejected", {
        route: "/api/blackout-dates",
        method: "PUT",
        requestId,
        reason: "invalid_body",
      });
      return jsonResponse({ error: "Invalid request body" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("blackout_dates")
      .update({
        date: formData.date,
        disable_pickup: formData.disable_pickup,
        disable_delivery: formData.disable_delivery,
        pickup_start_hour: formData.pickup_start_hour,
        notes: formData.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logOperationalEvent("error", "blackout_dates.update_failed", {
        route: "/api/blackout-dates",
        requestId,
        entryId: id,
        date: formData.date,
        errorCode: error.code ?? null,
      });
      return jsonResponse({ error: error.message }, { status: 500 });
    }

    logOperationalEvent("info", "blackout_dates.updated", {
      route: "/api/blackout-dates",
      requestId,
      entryId: id,
      date: formData.date,
    });
    return jsonResponse({ entry: data as BlackoutDate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logOperationalEvent("error", "blackout_dates.update_failed", {
      route: "/api/blackout-dates",
      requestId,
      errorName: getErrorName(err),
    });
    return jsonResponse({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);
  const session = await requireAuth(request, "DELETE");
  if (!session) {
    logOperationalEvent("warn", "blackout_dates.write_rejected", {
      route: "/api/blackout-dates",
      method: "DELETE",
      requestId,
      reason: "unauthorized",
    });
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    logOperationalEvent("warn", "blackout_dates.write_rejected", {
      route: "/api/blackout-dates",
      method: "DELETE",
      requestId,
      reason: "missing_id",
    });
    return jsonResponse({ error: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("blackout_dates").delete().eq("id", id);

    if (error) {
      logOperationalEvent("error", "blackout_dates.delete_failed", {
        route: "/api/blackout-dates",
        requestId,
        entryId: id,
        errorCode: error.code ?? null,
      });
      return jsonResponse({ error: error.message }, { status: 500 });
    }

    logOperationalEvent("info", "blackout_dates.deleted", {
      route: "/api/blackout-dates",
      requestId,
      entryId: id,
    });
    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logOperationalEvent("error", "blackout_dates.delete_failed", {
      route: "/api/blackout-dates",
      requestId,
      errorName: getErrorName(err),
    });
    return jsonResponse({ error: message }, { status: 500 });
  }
}
