/**
 * Stateless API request utilities.
 *
 * Handles auth headers (Bearer token, forwarded cookies) and
 * response parsing.  Permission checking stays in app.js where
 * it has access to application state.
 */
import { getAuthToken, getAuthCookies } from "./auth.js";

/**
 * Base HTTP helper — adds auth headers, parses the JSON response.
 *
 * - Automatically sets `Content-Type: application/json` unless the body is
 *   `FormData` (multipart upload).
 * - Attaches `Authorization` and `X-Cookie` headers when credentials exist.
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
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const authToken = getAuthToken();
  if (authToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const authCookies = getAuthCookies();
  if (authCookies && !headers["X-Cookie"] && !headers["x-cookie"]) {
    headers["X-Cookie"] = authCookies;
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
