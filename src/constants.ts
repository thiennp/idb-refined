/** Default TTL in ms (1 hour). Used for values without `expiresAt`. */
export const DEFAULT_TTL_MS = 3600 * 1000;

/** Default max entries before eviction. */
export const DEFAULT_MAX_COUNT = 1000;

/** Default TTL in seconds (1 hour). Used by putWithEviction when expiresAt is not set. */
export const DEFAULT_TTL_SECONDS = 3600;
