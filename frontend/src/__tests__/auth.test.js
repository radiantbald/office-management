import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_COOKIES_KEY,
  AVATAR_CACHE_STORE_KEY,
  AVATAR_CACHE_MAX_ENTRIES,
  setAuthToken,
  getAuthToken,
  setUserInfo,
  getUserInfo,
  setAuthCookies,
  getAuthCookies,
  setSessionClaims,
  getSessionClaims,
  clearSessionClaims,
  getAvatarCacheStore,
  setAvatarCacheStore,
  getCachedAvatar,
  cacheAvatarData,
  clearAuthStorage,
} from "../auth.js";

// In-memory localStorage stub
const store = new Map();
const localStorageMock = {
  getItem: vi.fn((key) => store.get(key) ?? null),
  setItem: vi.fn((key, val) => store.set(key, String(val))),
  removeItem: vi.fn((key) => store.delete(key)),
  clear: vi.fn(() => store.clear()),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  store.clear();
  clearSessionClaims();
  vi.clearAllMocks();
});

// ---------- Token ----------

describe("auth token", () => {
  it("sets and gets a token", () => {
    setAuthToken("abc123");
    expect(getAuthToken()).toBe("abc123");
  });

  it("removes token when falsy", () => {
    setAuthToken("abc123");
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });
});

// ---------- User Info ----------

describe("user info", () => {
  it("round-trips an object", () => {
    const user = { id: 1, name: "Test" };
    setUserInfo(user);
    expect(getUserInfo()).toEqual(user);
  });

  it("returns null when empty", () => {
    expect(getUserInfo()).toBeNull();
  });
});

// ---------- Cookies ----------

describe("auth cookies", () => {
  it("sets and gets cookies string", () => {
    setAuthCookies("session=abc");
    expect(getAuthCookies()).toBe("session=abc");
  });

  it("removes on falsy", () => {
    setAuthCookies("session=abc");
    setAuthCookies(null);
    expect(getAuthCookies()).toBeNull();
  });
});

// ---------- Session Claims (in-memory) ----------

describe("session claims", () => {
  it("stores and retrieves session claims", () => {
    const claims = {
      employee_id: "42",
      user_name: "Test User",
      role: 2,
      access_exp: 9999999999,
      refresh_exp: 9999999999,
    };
    setSessionClaims(claims);
    expect(getSessionClaims()).toEqual(claims);
  });

  it("returns null when not set", () => {
    expect(getSessionClaims()).toBeNull();
  });

  it("clears session claims", () => {
    setSessionClaims({ employee_id: "1", role: 1, access_exp: 0 });
    clearSessionClaims();
    expect(getSessionClaims()).toBeNull();
  });

  it("sets to null when called with falsy", () => {
    setSessionClaims({ employee_id: "1", role: 1, access_exp: 0 });
    setSessionClaims(null);
    expect(getSessionClaims()).toBeNull();
  });
});

// ---------- Avatar Cache Store ----------

describe("avatar cache store", () => {
  it("returns empty object by default", () => {
    expect(getAvatarCacheStore()).toEqual({});
  });

  it("round-trips", () => {
    const data = { "/avatar.png": { dataUrl: "data:image/png;base64,x", at: 1000 } };
    setAvatarCacheStore(data);
    expect(getAvatarCacheStore()).toEqual(data);
  });
});

// ---------- getCachedAvatar ----------

describe("getCachedAvatar", () => {
  it("returns null for unknown URL", () => {
    expect(getCachedAvatar("/unknown.png")).toBeNull();
  });

  it("returns dataUrl from store", () => {
    const data = { "/a.png": { dataUrl: "data:image/png;base64,abc", at: 100 } };
    setAvatarCacheStore(data);
    expect(getCachedAvatar("/a.png")).toBe("data:image/png;base64,abc");
  });

  it("returns null for empty input", () => {
    expect(getCachedAvatar("")).toBeNull();
    expect(getCachedAvatar(null)).toBeNull();
  });
});

// ---------- cacheAvatarData ----------

describe("cacheAvatarData", () => {
  it("caches a new entry", () => {
    cacheAvatarData("/b.png", "data:image/png;base64,xyz");
    expect(getCachedAvatar("/b.png")).toBe("data:image/png;base64,xyz");
  });

  it("evicts oldest when exceeding max entries", () => {
    for (let i = 0; i < AVATAR_CACHE_MAX_ENTRIES + 5; i++) {
      cacheAvatarData(`/img-${i}.png`, `data:${i}`);
    }
    const storeData = getAvatarCacheStore();
    expect(Object.keys(storeData).length).toBeLessThanOrEqual(AVATAR_CACHE_MAX_ENTRIES);
  });

  it("skips when URL or dataUrl is falsy", () => {
    cacheAvatarData("", "data:x");
    cacheAvatarData("/a.png", "");
    expect(getAvatarCacheStore()).toEqual({});
  });
});

// ---------- clearAuthStorage ----------

describe("clearAuthStorage", () => {
  it("removes token, user, cookies, session claims but keeps avatar cache", () => {
    setAuthToken("tok");
    setUserInfo({ id: 1 });
    setAuthCookies("c=1");
    setSessionClaims({ employee_id: "1", role: 1, access_exp: 0 });
    cacheAvatarData("/a.png", "data:x");

    clearAuthStorage();

    expect(getAuthToken()).toBeNull();
    expect(getUserInfo()).toBeNull();
    expect(getAuthCookies()).toBeNull();
    expect(getSessionClaims()).toBeNull();
    // avatar cache survives
    expect(getCachedAvatar("/a.png")).toBe("data:x");
  });

  it("cleans up legacy localStorage keys", () => {
    store.set("office_access_token", "legacy");
    store.set("office_refresh_token", "legacy");
    clearAuthStorage();
    expect(store.has("office_access_token")).toBe(false);
    expect(store.has("office_refresh_token")).toBe(false);
  });
});
