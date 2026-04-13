"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminProfileForModule,
  getAuthProfileForModule,
} from "@/lib/actions/helpers";
import { createBulkNotifications } from "@/lib/notifications/create";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { logAuditEvent } from "@/lib/audit/log";
import type { DocumentAudienceMember } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resident marks a document as read. Idempotent on the (document_id, profile_id)
 * unique constraint — re-clicking returns success without duplicating the row.
 */
export async function acknowledgeDocument(documentId: string) {
  const { error: authError, supabase, user } = await getAuthProfileForModule(
    "documents",
  );
  if (authError || !user) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(documentId)) return { error: "Invalid document id" };

  // upsert on (document_id, profile_id) — ignore conflicts so double-clicks are no-ops.
  const { error } = await supabase
    .from("document_acknowledgments")
    .upsert(
      { document_id: documentId, profile_id: user.id },
      { onConflict: "document_id,profile_id", ignoreDuplicates: true },
    );

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "document.acknowledge",
    tableName: "document_acknowledgments",
    newData: { document_id: documentId, profile_id: user.id },
  });

  revalidatePath("/portal/documents");
  revalidatePath("/portal");
  return { success: true };
}

/** For the portal home banner: which ack-required docs are still pending? */
export async function getMyPendingAcknowledgments() {
  const { error: authError, supabase, user } = await getAuthProfileForModule(
    "documents",
  );
  if (authError || !user) return { error: authError ?? "Unauthorized", data: [] };

  const { data, error } = await supabase.rpc("my_pending_acknowledgments");
  if (error) return { error: error.message, data: [] };
  return { data: data ?? [] };
}

/** Admin: full audience + ack status for a single document. */
export async function getDocumentAcknowledgmentStatus(documentId: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule(
    "documents",
  );
  if (authError || !profile) {
    return { error: authError ?? "Unauthorized", data: [] };
  }
  if (!UUID_RE.test(documentId)) return { error: "Invalid document id", data: [] };

  const { data, error } = await supabase.rpc("document_audience", {
    p_document_id: documentId,
  });
  if (error) return { error: error.message, data: [] };
  return { data: (data ?? []) as DocumentAudienceMember[] };
}

/** Admin: re-fire notifications to everyone who hasn't acknowledged yet. */
export async function sendAcknowledgmentReminder(documentId: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule(
    "documents",
  );
  if (authError || !profile) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(documentId)) return { error: "Invalid document id" };

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, building_id, requires_acknowledgment, buildings(name)")
    .eq("id", documentId)
    .eq("building_id", profile.building_id)
    .single();
  if (!doc) return { error: "Document not found" };
  if (!doc.requires_acknowledgment) {
    return { error: "Document does not require acknowledgment" };
  }

  const { data: audience, error: audienceError } = await supabase.rpc(
    "document_audience",
    { p_document_id: documentId },
  );
  if (audienceError) return { error: audienceError.message };

  const pending = ((audience ?? []) as DocumentAudienceMember[]).filter(
    (m) => !m.has_acked,
  );
  if (pending.length === 0) {
    return { success: true, notified: 0 };
  }

  const buildingsRel = (doc as { buildings?: unknown }).buildings;
  const buildingRow = Array.isArray(buildingsRel) ? buildingsRel[0] : buildingsRel;
  const buildingName = (buildingRow as { name?: string } | null)?.name ?? "";

  await notifyAcknowledgmentRequired({
    recipientIds: pending.map((m) => m.profile_id),
    documentId,
    documentTitle: doc.title,
    buildingName,
  });

  await logAuditEvent({
    action: "document.reminder",
    tableName: "documents",
    recordId: documentId,
    newData: { count: pending.length },
  });

  revalidatePath(`/admin/documents/${documentId}`);
  return { success: true, notified: pending.length };
}

/**
 * Fires both the in-app notification and the email. Called from here (reminder)
 * and from uploadDocument/uploadNewVersion when requires_acknowledgment=true.
 */
export async function notifyAcknowledgmentRequired(params: {
  recipientIds: string[];
  documentId: string;
  documentTitle: string;
  buildingName: string;
}) {
  if (params.recipientIds.length === 0) return;

  // In-app (single bulk insert)
  createBulkNotifications(params.recipientIds, {
    type: "document_ack_required",
    title: `Please acknowledge: ${params.documentTitle}`,
    body: "Open the document and confirm you've read it.",
    data: { action_url: "/portal/documents", document_id: params.documentId },
  }).catch((err) => {
    console.error("[documents] ack bulk-notification failed", err);
  });

  // Email (one per recipient — sendNotificationEmail handles preference/errors)
  for (const userId of params.recipientIds) {
    sendNotificationEmail({
      userId,
      type: "document_ack_required",
      templateProps: {
        documentTitle: params.documentTitle,
        buildingName: params.buildingName,
      },
    }).catch((err) => {
      console.error("[documents] ack email failed for", userId, err);
    });
  }
}

/**
 * Helper to resolve the building name for notification dispatch from a
 * document row — used by uploadDocument / uploadNewVersion.
 */
export async function fireAckNotificationsForDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  documentTitle: string,
  buildingId: string,
) {
  const { data: building } = await supabase
    .from("buildings")
    .select("name")
    .eq("id", buildingId)
    .single();

  const { data: audience } = await supabase.rpc("document_audience", {
    p_document_id: documentId,
  });

  const recipients = ((audience ?? []) as DocumentAudienceMember[])
    .filter((m) => !m.has_acked)
    .map((m) => m.profile_id);

  await notifyAcknowledgmentRequired({
    recipientIds: recipients,
    documentId,
    documentTitle,
    buildingName: building?.name ?? "",
  });
}
