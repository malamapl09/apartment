"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPoll(data: {
  title: string;
  description?: string;
  poll_type: "single_choice" | "multiple_choice" | "yes_no";
  target: "all" | "owners" | "residents";
  ends_at: string;
  is_anonymous: boolean;
  options: string[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  // For yes_no polls, override options with Yes/No
  const optionLabels =
    data.poll_type === "yes_no" ? ["Yes", "No"] : data.options;

  if (data.poll_type !== "yes_no" && optionLabels.length < 2) {
    return { error: "At least 2 options are required" };
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      building_id: profile.building_id,
      title: data.title,
      description: data.description || null,
      poll_type: data.poll_type,
      target: data.target,
      created_by: user.id,
      ends_at: data.ends_at,
      is_anonymous: data.is_anonymous,
      status: "draft",
    })
    .select()
    .single();

  if (pollError) return { error: pollError.message };

  // Insert options
  const optionsToInsert = optionLabels.map((label, index) => ({
    poll_id: poll.id,
    label,
    sort_order: index,
  }));

  const { error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionsToInsert);

  if (optionsError) return { error: optionsError.message };

  revalidatePath("/admin/polls");
  return { success: true, data: poll };
}

export async function publishPoll(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("polls")
    .update({
      status: "active",
      starts_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/polls");
  revalidatePath(`/admin/polls/${id}`);
  return { success: true };
}

export async function closePoll(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("polls")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/polls");
  revalidatePath(`/admin/polls/${id}`);
  return { success: true };
}

export async function getPolls() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [] };
  }

  const { data, error } = await supabase
    .from("polls")
    .select(
      `*, poll_options (*), poll_votes(count)`
    )
    .eq("building_id", profile.building_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getPollResults(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      `*, poll_options (*), poll_votes (*)`
    )
    .eq("id", id)
    .single();

  if (pollError || !poll) return { error: pollError?.message || "Poll not found" };

  // Fetch creator's name separately if created_by exists
  let creatorName: string | null = null;
  if (poll.created_by) {
    const { data: creator } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", poll.created_by)
      .single();
    creatorName = creator?.full_name ?? null;
  }

  // For non-anonymous polls, fetch voter names
  let voterNames: Record<string, string> = {};
  if (!poll.is_anonymous && poll.poll_votes?.length > 0) {
    const userIds = [...new Set((poll.poll_votes as { user_id: string }[]).map((v) => v.user_id))];
    const { data: voters } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (voters) {
      voterNames = Object.fromEntries(voters.map((v) => [v.id, v.full_name]));
    }
  }

  // Calculate results per option
  const totalVotes = new Set(
    (poll.poll_votes || []).map((v: { user_id: string }) => v.user_id)
  ).size;

  const results = (poll.poll_options || [])
    .sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    )
    .map((option: { id: string; label: string; sort_order: number }) => {
      const optionVotes = (poll.poll_votes || []).filter(
        (v: { option_id: string }) => v.option_id === option.id
      );
      return {
        ...option,
        vote_count: optionVotes.length,
        percentage: totalVotes > 0 ? (optionVotes.length / totalVotes) * 100 : 0,
        voters: poll.is_anonymous
          ? []
          : optionVotes.map(
              (v: { user_id: string }) => ({
                user_id: v.user_id,
                full_name: voterNames[v.user_id] || "Unknown",
              })
            ),
      };
    });

  return {
    data: {
      ...poll,
      created_by_profile: creatorName ? { full_name: creatorName } : null,
      results,
      totalVotes,
    },
  };
}
