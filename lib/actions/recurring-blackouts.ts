"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminProfileForModule } from "@/lib/actions/helpers";
import { logAuditEvent } from "@/lib/audit/log";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const createSchema = z.object({
  space_id: z.string().regex(UUID_RE),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  start_time: z.string().regex(TIME_RE),
  end_time: z.string().regex(TIME_RE),
  reason: z.string().max(200).optional().nullable(),
});

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export async function getRecurringBlackoutsForSpace(spaceId: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };
  if (!UUID_RE.test(spaceId)) return { error: "Invalid id", data: [] };

  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found", data: [] };

  const { data, error } = await supabase
    .from("recurring_blackouts")
    .select("*")
    .eq("space_id", spaceId)
    .order("day_of_week")
    .order("start_time");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function createRecurringBlackout(formData: FormData) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const daysRaw = formData.getAll("days").map((d) => Number(d));
  const parsed = createSchema.safeParse({
    space_id: formData.get("space_id"),
    days: daysRaw,
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    reason: formData.get("reason") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", parsed.data.space_id)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found" };

  const start = normalizeTime(parsed.data.start_time);
  const end = normalizeTime(parsed.data.end_time);
  const reason = parsed.data.reason || null;
  const isOvernight = timeToMinutes(end) <= timeToMinutes(start);

  const rows: {
    space_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    reason: string | null;
  }[] = [];

  for (const day of parsed.data.days) {
    if (isOvernight) {
      // Split into two rows: [start, 23:59:59] on day, [00:00:00, end] on (day+1) % 7
      rows.push({
        space_id: parsed.data.space_id,
        day_of_week: day,
        start_time: start,
        end_time: "23:59:59",
        reason,
      });
      rows.push({
        space_id: parsed.data.space_id,
        day_of_week: (day + 1) % 7,
        start_time: "00:00:00",
        end_time: end,
        reason,
      });
    } else {
      rows.push({
        space_id: parsed.data.space_id,
        day_of_week: day,
        start_time: start,
        end_time: end,
        reason,
      });
    }
  }

  const { error } = await supabase.from("recurring_blackouts").insert(rows);
  if (error) return { error: error.message };

  await logAuditEvent({
    action: "recurring_blackout.create",
    tableName: "recurring_blackouts",
    newData: { space_id: parsed.data.space_id, rows: rows.length },
  });

  revalidatePath(`/admin/spaces/${parsed.data.space_id}`);
  return { success: true };
}

export async function deleteRecurringBlackout(id: string, spaceId: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(id) || !UUID_RE.test(spaceId)) return { error: "Invalid id" };

  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found" };

  const { error } = await supabase
    .from("recurring_blackouts")
    .delete()
    .eq("id", id)
    .eq("space_id", spaceId);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "recurring_blackout.delete",
    tableName: "recurring_blackouts",
    recordId: id,
  });

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true };
}
