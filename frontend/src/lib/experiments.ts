import { LANDING_EXPERIMENT_VARIANT } from "@/lib/feature-flags";

const LANDING_VARIANT_STORAGE_KEY = "smartdesign_landing_variant_v1";
const LANDING_SEED_STORAGE_KEY = "smartdesign_landing_seed_v1";

function parseVariants(raw: string | undefined): string[] {
  const candidates = (raw || "control")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const unique = Array.from(new Set(candidates));
  return unique.length > 0 ? unique : ["control"];
}

function normalizeVariant(raw: string | null | undefined): string {
  return (raw || "").trim().toLowerCase();
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getOrCreateSeed(): string {
  const existing = window.localStorage.getItem(LANDING_SEED_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created =
    typeof window.crypto !== "undefined" && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(LANDING_SEED_STORAGE_KEY, created);
  return created;
}

export function resolveLandingExperimentVariant(distinctId?: string | null): string {
  return resolveLandingExperimentVariantWithOptions({ distinctId });
}

export function clearLandingExperimentAssignment(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(LANDING_VARIANT_STORAGE_KEY);
  window.localStorage.removeItem(LANDING_SEED_STORAGE_KEY);
}

interface LandingExperimentOptions {
  distinctId?: string | null;
  reset?: boolean;
  overrideVariant?: string | null;
}

export function resolveLandingExperimentVariantWithOptions(
  options: LandingExperimentOptions,
): string {
  const { distinctId, reset = false, overrideVariant } = options;
  const forcedVariant = (LANDING_EXPERIMENT_VARIANT || "").trim().toLowerCase();
  const normalizedOverride = normalizeVariant(overrideVariant);

  if (typeof window !== "undefined" && reset) {
    clearLandingExperimentAssignment();
  }

  if (normalizedOverride) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANDING_VARIANT_STORAGE_KEY, normalizedOverride);
    }
    return normalizedOverride;
  }

  // Non-auto value is treated as explicit override, useful for QA and controlled rollout.
  if (forcedVariant && forcedVariant !== "auto") {
    return forcedVariant;
  }

  if (typeof window === "undefined") {
    return "control";
  }

  const storedVariant = window.localStorage.getItem(LANDING_VARIANT_STORAGE_KEY);
  if (storedVariant) {
    return storedVariant;
  }

  const variants = parseVariants(process.env.NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANTS);
  const seed = distinctId && distinctId.length > 0 ? distinctId : getOrCreateSeed();
  const bucket = hashString(seed) % variants.length;
  const assigned = variants[bucket] || "control";
  window.localStorage.setItem(LANDING_VARIANT_STORAGE_KEY, assigned);
  return assigned;
}