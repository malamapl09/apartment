import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALL_MODULES, type ModuleKey } from "@/types";

export { ALL_MODULES };
export type { ModuleKey };

/**
 * Server-component guard. Reads the current user's building's enabled_modules
 * and 404s if the requested module is off. Call at the very top of any
 * page.tsx that belongs to a gateable module — e.g.
 *   await assertCurrentUserHasModule("visitors");
 *
 * Costs one tiny SELECT on profiles+buildings; pages are already doing their
 * own queries so the marginal overhead is negligible.
 */
export async function assertCurrentUserHasModule(module: ModuleKey): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: row } = await supabase
    .from("profiles")
    .select("buildings!building_id(enabled_modules)")
    .eq("id", user.id)
    .single();

  const buildingsRel = (row as { buildings?: unknown } | null)?.buildings;
  const buildingRow = Array.isArray(buildingsRel) ? buildingsRel[0] : buildingsRel;
  const enabled =
    (buildingRow as { enabled_modules?: string[] } | null)?.enabled_modules ?? [];

  if (!isModuleEnabled(enabled, module)) notFound();
}

export function isModuleEnabled(
  enabledModules: string[] | null | undefined,
  module: ModuleKey,
): boolean {
  return Array.isArray(enabledModules) && enabledModules.includes(module);
}

/**
 * For server actions: returns `{error}` shape if the module is disabled,
 * `null` otherwise. Call site:
 *   const moduleError = requireModuleEnabled(profile.enabled_modules, "visitors");
 *   if (moduleError) return moduleError;
 */
export function requireModuleEnabled(
  enabledModules: string[] | null | undefined,
  module: ModuleKey,
): { error: string } | null {
  if (isModuleEnabled(enabledModules, module)) return null;
  return { error: "Module not enabled for this building" };
}

/**
 * For server components / page.tsx: throws notFound() so the disabled
 * module shows the standard 404 page rather than a confusing empty state.
 */
export function assertModuleEnabled(
  enabledModules: string[] | null | undefined,
  module: ModuleKey,
): void {
  if (!isModuleEnabled(enabledModules, module)) notFound();
}
