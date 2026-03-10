"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getActivePolls() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found", data: [] };

  const { data: polls, error } = await supabase
    .from("polls")
    .select(`*, poll_options (*), poll_votes (*)`)
    .eq("building_id", profile.building_id)
    .in("status", ["active", "closed"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { error: error.message, data: [] };

  // Mark each poll with whether the current user has voted
  const enrichedPolls = (polls || []).map((poll) => {
    const userVotes = (poll.poll_votes || []).filter(
      (v: { user_id: string }) => v.user_id === user.id
    );
    return {
      ...poll,
      has_voted: userVotes.length > 0,
      user_votes: userVotes,
    };
  });

  return { error: null, data: enrichedPolls };
}

export async function castVote(pollId: string, optionIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify the poll exists and is active
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("*, poll_options (*)")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) return { error: "Poll not found" };
  if (poll.status !== "active") return { error: "Poll is not active" };

  // Check if user has already voted
  const { data: existingVotes } = await supabase
    .from("poll_votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id);

  if (existingVotes && existingVotes.length > 0) {
    return { error: "You have already voted on this poll" };
  }

  // Validate option count based on poll type
  if (poll.poll_type === "single_choice" || poll.poll_type === "yes_no") {
    if (optionIds.length !== 1) {
      return { error: "Please select exactly one option" };
    }
  } else if (poll.poll_type === "multiple_choice") {
    if (optionIds.length < 1) {
      return { error: "Please select at least one option" };
    }
  }

  // Validate all option IDs belong to this poll
  const validOptionIds = (poll.poll_options || []).map(
    (o: { id: string }) => o.id
  );
  const allValid = optionIds.every((id) => validOptionIds.includes(id));
  if (!allValid) return { error: "Invalid option selected" };

  // Get user's apartment
  const { data: apartmentOwner } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Insert votes
  const votesToInsert = optionIds.map((optionId) => ({
    poll_id: pollId,
    option_id: optionId,
    user_id: user.id,
    apartment_id: apartmentOwner?.apartment_id ?? null,
  }));

  const { error } = await supabase.from("poll_votes").insert(votesToInsert);

  if (error) {
    if (error.code === "23505") return { error: "You have already voted on this poll" };
    return { error: error.message };
  }

  revalidatePath("/portal/polls");
  revalidatePath(`/portal/polls/${pollId}`);
  return { error: null };
}

export async function getPollResults(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(`*, poll_options (*), poll_votes (*)`)
    .eq("id", pollId)
    .single();

  if (pollError) return { error: pollError.message };

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
      };
    });

  return {
    error: null,
    data: {
      ...poll,
      results,
      totalVotes,
    },
  };
}
