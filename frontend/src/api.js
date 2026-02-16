/**
 * Stateless API request utilities.
 *
 * Handles response parsing and credentials.
 * The Office-Access-Token is sent automatically as an HttpOnly cookie
 * (credentials: "include"), so no manual header injection is needed.
 * Permission checking stays in app.js where it has access to application state.
 */

const getCookieValue = (name) => {
  if (typeof document === "undefined" || !document.cookie) {
    return "";
  }
  const encodedName = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }
  return "";
};

const isUnsafeMethod = (method) => {
  const normalized = String(method || "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(normalized);
};

/**
 * Base HTTP helper — parses the JSON response.
 *
 * - Automatically sets `Content-Type: application/json` unless the body is
 *   `FormData` (multipart upload).
 * - Sends cookies (credentials: "include") so the HttpOnly
 *   office_access_token cookie is attached automatically.
 * - Returns `null` for 204 / empty responses.
 * - Throws `Error` with the server-provided `error` message on non-2xx.
 *
 * @param {string} path            – URL path (e.g. "/api/buildings")
 * @param {RequestInit} [options]  – fetch options; `headers` are merged, not replaced
 * @returns {Promise<any>}         – parsed JSON body, or null
 * @throws {Error} with server error message
 */
export const makeApiRequest = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (isUnsafeMethod(options.method)) {
    const csrfToken = getCookieValue("office_csrf_token");
    if (csrfToken && !headers["X-CSRF-Token"]) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error || "Ошибка запроса";
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
};

/**
 * Creates a cancellable wrapper around a request function.
 *
 * Each new call automatically aborts the previous in-flight request,
 * preventing stale/out-of-order data from race conditions (e.g. rapid
 * navigation between pages).
 *
 * ```js
 * const fetchDesks = createCancellableRequest(apiRequest);
 * // Second call aborts the first; only the latest result arrives.
 * fetchDesks("/api/desks?space=1");
 * fetchDesks("/api/desks?space=2"); // ← this one wins
 * ```
 *
 * @param {Function} requestFn – the function to wrap (must accept `options.signal`)
 * @returns {(path: string, options?: RequestInit) => Promise<any>}
 */
export const createCancellableRequest = (requestFn) => {
  /** @type {AbortController|null} */
  let controller = null;
  return async (path, options = {}) => {
    if (controller) {
      controller.abort();
    }
    controller = new AbortController();
    try {
      const result = await requestFn(path, { ...options, signal: controller.signal });
      return result;
    } catch (error) {
      if (error.name === "AbortError") {
        return undefined;
      }
      throw error;
    } finally {
      controller = null;
    }
  };
};
