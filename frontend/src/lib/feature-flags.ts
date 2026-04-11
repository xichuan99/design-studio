const envFlag =
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH ??
  process.env.ENABLE_GOOGLE_OAUTH ??
  "false";

export const GOOGLE_OAUTH_ENABLED = envFlag.toLowerCase() === "true";
