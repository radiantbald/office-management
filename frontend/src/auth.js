/**
 * Authentication and avatar caching — pure localStorage operations.
 *
 * All functions are side-effect free except for localStorage reads/writes.
 * No DOM access, no network — safe for unit testing.
 */

/** @type {string} localStorage key for the JWT access token */
export const AUTH_TOKEN_KEY = "auth_access_token";
/** @type {string} localStorage key for serialised user info (JSON) */
export const AUTH_USER_KEY = "auth_user_info";
/** @type {string} localStorage key for forwarded auth cookies */
export const AUTH_COOKIES_KEY = "auth_cookies";
/** @type {string} localStorage key for the server-signed Office Access Token JWT */
export const OFFICE_ACCESS_TOKEN_KEY = "office_access_token";
/** @type {string} localStorage key for the server-signed Office Refresh Token JWT */
export const OFFICE_REFRESH_TOKEN_KEY = "office_refresh_token";
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

/**
 * Persist or clear the server-signed Office Access Token.
 * @param {string|null} token – Office Access Token JWT string, or falsy to remove
 */
export const setOfficeAccessToken = (token) => {
  if (token) {
    localStorage.setItem(OFFICE_ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(OFFICE_ACCESS_TOKEN_KEY);
  }
};

/** @returns {string|null} The stored Office Access Token, or null */
export const getOfficeAccessToken = () => localStorage.getItem(OFFICE_ACCESS_TOKEN_KEY);

/**
 * Persist or clear the server-signed Office Refresh Token.
 * @param {string|null} token – Office Refresh Token JWT string, or falsy to remove
 */
export const setOfficeRefreshToken = (token) => {
  if (token) {
    localStorage.setItem(OFFICE_REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(OFFICE_REFRESH_TOKEN_KEY);
  }
};

/** @returns {string|null} The stored Office Refresh Token, or null */
export const getOfficeRefreshToken = () => localStorage.getItem(OFFICE_REFRESH_TOKEN_KEY);

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

/**
 * Remove all auth-related localStorage entries (token, user, cookies).
 * Does NOT touch avatar cache.
 */
export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_COOKIES_KEY);
  localStorage.removeItem(OFFICE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(OFFICE_REFRESH_TOKEN_KEY);
};
