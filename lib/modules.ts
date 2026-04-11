import { notFound } from "next/navigation";
import { getAuthProfile } from "@/lib/actions/helpers";
import { ALL_MODULES, type ModuleKey } from "@/types";

export { ALL_MODULES };
export type { ModuleKey };

/**
 * Server-component guard. 404s if the requested module is off. Calls the
 * cached getAuthProfile() so if the layout has already fetched the profile
 * in the same request, this is free (React.cache dedupes).
 */
export async function assertCurrentUserHasModule(module: ModuleKey): Promise<void> {
  const { profile } = await getAuthProfile();
  if (!profile) notFound();
  if (!isModuleEnabled(profile.enabled_modules, module)) notFound();
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
