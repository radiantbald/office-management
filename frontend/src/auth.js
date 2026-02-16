/**
 * Authentication helpers — localStorage for non-sensitive data,
 * in-memory store for session claims.
 *
 * Office tokens (access + refresh) now live exclusively in HttpOnly
 * Secure cookies set by the backend.  JS never sees the raw JWT strings.
 * Instead the backend returns a `session` object with the non-sensitive
 * claims (employee_id, role, responsibilities, exp).
 */

/** @type {string} localStorage key for the JWT access token (external, team.wb.ru) */
export const AUTH_TOKEN_KEY = "auth_access_token";
/** @type {string} localStorage key for serialised user info (JSON) */
export const AUTH_USER_KEY = "auth_user_info";
/** @type {string} localStorage key for forwarded auth cookies */
export const AUTH_COOKIES_KEY = "auth_cookies";
/** @type {string} localStorage key – last-cached avatar URL */
export const AVATAR_CACHE_URL_KEY = "avatar_cache_url";
/** @type {string} localStorage key – last-cached avatar data-URL */
export const AVATAR_CACHE_DATA_KEY = "avatar_cache_data";
/** @type {string} localStorage key – timestamp of last avatar cache write */
export const AVATAR_CACHE_AT_KEY = "avatar_cache_at";
/** @type {string} localStorage key – JSON object of all cached avatars */
export const AVATAR_CACHE_STORE_KEY = "avatar_cache_store";
/** @type {number} Maximum avatar entries kept in cache before eviction */
export const AVATAR_CACHE_MAX_ENTRIES = 40;

// ─── In-memory session claims ────────────────────────────────────────
// These are populated from backend responses (/api/auth/office-token,
// /api/auth/refresh, /api/auth/session) and never written to localStorage.

/**
 * @typedef {Object} SessionClaims
 * @property {string}  employee_id
 * @property {string}  [user_name]
 * @property {number}  role
 * @property {Object}  [responsibilities]
 * @property {number}  access_exp   – Unix epoch seconds
 * @property {number}  [refresh_exp] – Unix epoch seconds
 */

/** @type {SessionClaims|null} */
let _sessionClaims = null;

/**
 * Store session claims received from the backend.
 * @param {SessionClaims|null} claims
 */
export const setSessionClaims = (claims) => {
  _sessionClaims = claims || null;
};

/** @returns {SessionClaims|null} */
export const getSessionClaims = () => _sessionClaims;

/** Clear the in-memory session. */
export const clearSessionClaims = () => {
  _sessionClaims = null;
};

// ─── External auth token (team.wb.ru) — localStorage ─────────────────

/**
 * Persist or clear the access token.
 * @param {string|null} token – JWT string, or falsy to remove
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

/** @returns {string|null} The stored JWT token, or null */
export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

/**
 * Persist or clear the current user info object.
 * @param {object|null} userInfo – plain object serialisable to JSON
 */
export const setUserInfo = (userInfo) => {
  if (userInfo) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userInfo));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

/**
 * Read stored user info.
 * @returns {object|null} Parsed user info or null
 */
export const getUserInfo = () => {
  const stored = localStorage.getItem(AUTH_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

/**
 * Persist or clear forwarded cookies string.
 * @param {string|null} cookies
 */
export const setAuthCookies = (cookies) => {
  if (cookies) {
    localStorage.setItem(AUTH_COOKIES_KEY, cookies);
  } else {
    localStorage.removeItem(AUTH_COOKIES_KEY);
  }
};

/** @returns {string|null} Stored cookies string, or null */
export const getAuthCookies = () => localStorage.getItem(AUTH_COOKIES_KEY);

// ─── Avatar cache ────────────────────────────────────────────────────

/**
 * Read the avatar cache store (all cached avatar data-URLs).
 * @returns {Record<string, {dataUrl: string, at: number}>} URL → cache entry
 */
export const getAvatarCacheStore = () => {
  try {
    const raw = localStorage.getItem(AVATAR_CACHE_STORE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Write the full avatar cache store to localStorage.
 * @param {Record<string, {dataUrl: string, at: number}>} store
 */
export const setAvatarCacheStore = (store) => {
  try {
    localStorage.setItem(AVATAR_CACHE_STORE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors (quota exceeded or private mode)
  }
};

/**
 * Look up a cached data-URL for a given avatar URL.
 * Falls back to the legacy single-entry cache and migrates it.
 * @param {string} avatarUrl – the original image URL
 * @returns {string|null} data-URL or null if not cached
 */
export const getCachedAvatar = (avatarUrl) => {
  if (!avatarUrl) {
    return null;
  }
  const store = getAvatarCacheStore();
  const cachedEntry = store?.[avatarUrl];
  if (cachedEntry && typeof cachedEntry.dataUrl === "string") {
    return cachedEntry.dataUrl;
  }
  const cachedUrl = localStorage.getItem(AVATAR_CACHE_URL_KEY);
  const cachedData = localStorage.getItem(AVATAR_CACHE_DATA_KEY);
  if (cachedUrl && cachedData && cachedUrl === avatarUrl) {
    store[avatarUrl] = {
      dataUrl: cachedData,
      at: Number(localStorage.getItem(AVATAR_CACHE_AT_KEY)) || Date.now(),
    };
    setAvatarCacheStore(store);
    return cachedData;
  }
  return null;
};

/**
 * Cache an avatar image as a data-URL.
 * Evicts oldest entries when the cache exceeds {@link AVATAR_CACHE_MAX_ENTRIES}.
 * @param {string} avatarUrl – original image URL (cache key)
 * @param {string} dataUrl   – base64 data-URL of the image
 */
export const cacheAvatarData = (avatarUrl, dataUrl) => {
  if (!avatarUrl || !dataUrl) {
    return;
  }
  try {
    const store = getAvatarCacheStore();
    store[avatarUrl] = { dataUrl, at: Date.now() };
    const entries = Object.entries(store);
    if (entries.length > AVATAR_CACHE_MAX_ENTRIES) {
      entries
        .sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0))
        .slice(0, entries.length - AVATAR_CACHE_MAX_ENTRIES)
        .forEach(([key]) => delete store[key]);
    }
    setAvatarCacheStore(store);
    localStorage.setItem(AVATAR_CACHE_URL_KEY, avatarUrl);
    localStorage.setItem(AVATAR_CACHE_DATA_KEY, dataUrl);
    localStorage.setItem(AVATAR_CACHE_AT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors (quota exceeded or private mode)
  }
};

// ─── Cleanup ─────────────────────────────────────────────────────────

/**
 * Remove all auth-related localStorage entries (token, user, cookies)
 * and clear in-memory session claims.
 * Does NOT touch avatar cache.
 * Note: Office token cookies are cleared server-side via POST /api/auth/logout.
 */
export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_COOKIES_KEY);
  clearSessionClaims();
  // Clean up any legacy localStorage keys from before the HttpOnly cookie migration.
  localStorage.removeItem("office_access_token");
  localStorage.removeItem("office_refresh_token");
};
