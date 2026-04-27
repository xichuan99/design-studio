const envFlag =
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH ??
  process.env.ENABLE_GOOGLE_OAUTH ??
  "false";

export const GOOGLE_OAUTH_ENABLED = envFlag.toLowerCase() === "true";

export const INTENT_FIRST_ENTRY_ENABLED = (
  process.env.NEXT_PUBLIC_INTENT_FIRST_V1 ?? 
  "true"
).toLowerCase() === "true";

export const START_HUB_ENABLED = (
  process.env.NEXT_PUBLIC_START_HUB_V1 ??
  "true"
).toLowerCase() === "true";

export const PREVIEW_REAL_GENERATION_ENABLED = (
  process.env.NEXT_PUBLIC_PREVIEW_REAL_GENERATION_V1 ??
  "true"
).toLowerCase() === "true";

export const IMPORT_QUEUE_ENABLED = (
  process.env.NEXT_PUBLIC_IMPORT_QUEUE_V1 ??
  "true"
).toLowerCase() === "true";

export const PRODUCT_SCENE_REDIRECT_ENABLED = (
  process.env.NEXT_PUBLIC_PRODUCT_SCENE_REDIRECT_V1 ??
  "true"
).toLowerCase() === "true";

export const PRODUCT_SCENE_REDIRECT_HANDOFF_ENABLED = (
  process.env.NEXT_PUBLIC_PRODUCT_SCENE_REDIRECT_HANDOFF_V1 ??
  "true"
).toLowerCase() === "true";
