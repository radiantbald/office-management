/**
 * Pure utility functions — no DOM mutations, no global state, no network.
 *
 * Every export is a pure function (or a constant) safe for unit testing.
 * The only browser API used is `CSS.escape` (optional polyfill inside).
 */

/**
 * Escape a value so it can be safely interpolated into a CSS selector.
 * Falls back to a simple backslash-escaping when `CSS.escape` is unavailable.
 *
 * @param {string} value
 * @returns {string}
 */
export const escapeSelectorValue = (value) => {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
};

/**
 * Extract the `YYYY-MM-DD` date portion from any date-like string.
 *
 * Handles ISO timestamps (`2025-06-01T10:00:00Z`) and space-delimited
 * formats (`2025-06-01 10:00:00`).
 *
 * @param {string|null|undefined} raw
 * @returns {string} `YYYY-MM-DD` or empty string
 */
export const normalizeBookingDate = (raw) => {
  if (!raw) {
    return "";
  }
  return String(raw).split("T")[0].split(" ")[0].trim();
};

/**
 * Check whether a string is a valid `YYYY-MM-DD` date.
 * @param {string} dateStr
 * @returns {boolean}
 */
export const isValidBookingDate = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "");

/**
 * Format a date-like string as `DD.MM.YYYY`.
 * @param {string} raw
 * @returns {string} e.g. `"01.06.2025"` or the original value on failure
 */
export const formatBookingDate = (raw) => {
  const dateStr = normalizeBookingDate(raw);
  if (!isValidBookingDate(dateStr)) {
    return raw || "";
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
};

/**
 * Return the Russian weekday name for a date string.
 * @param {string} raw – date-like string (ISO or `YYYY-MM-DD`)
 * @returns {string} e.g. `"Понедельник"`, or empty string
 */
export const formatBookingWeekday = (raw) => {
  const dateStr = normalizeBookingDate(raw);
  if (!isValidBookingDate(dateStr)) {
    return "";
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  return weekdays[date.getDay()];
};

/**
 * Build a human-readable title for the space view header.
 * @param {string} raw – date-like string
 * @returns {string} e.g. `"Понедельник, 01.06.2025"` or `"Схема пространства"`
 */
export const formatSelectedDateTitle = (raw) => {
  const dateStr = normalizeBookingDate(raw);
  if (!isValidBookingDate(dateStr)) {
    return "Схема пространства";
  }
  const weekday = formatBookingWeekday(dateStr);
  const date = formatBookingDate(dateStr);
  if (!weekday || !date) {
    return "Схема пространства";
  }
  return `${weekday}, ${date}`;
};

/**
 * Pluralise "человек" for a given count (nominative case).
 * @param {number|string} value
 * @returns {string} e.g. `"5 человек"`, `"2 человека"`, or empty string for ≤0
 */
export const getPeopleCountLabel = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) {
    return "";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun =
    mod10 === 1 && mod100 !== 11
      ? "человек"
      : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)
        ? "человека"
        : "человек";
  return `${count} ${noun}`;
};

/**
 * Pluralise "человек" for a limit label (genitive case).
 * @param {number|string} value
 * @returns {string} e.g. `"5 человек"`, `"1 человека"`
 */
export const getPeopleCountLimitLabel = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) {
    return "";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? "человека" : "человек";
  return `${count} ${noun}`;
};

/**
 * Shorten a full name to "Фамилия И.О." format.
 * @param {string} value – e.g. `"Иванов Иван Иванович"`
 * @returns {string} e.g. `"Иванов И.И."`
 */
export const formatUserNameInitials = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || "";
  }
  const [base, ...rest] = parts;
  const initials = rest
    .map((part) => (part ? `${part[0].toUpperCase()}.` : ""))
    .join("");
  return `${base} ${initials}`.trim();
};

/**
 * Extract a stable user identifier from a user-like object.
 *
 * Tries several known field names (wb_user_id, employee_id, email, …)
 * and returns the first truthy value as a trimmed string.
 *
 * @param {object|null|undefined} user
 * @returns {string} identifier or empty string
 */
export const getBookingUserKey = (user) =>
  String(
    user?.wb_user_id ||
      user?.wbUserId ||
      user?.wbUserID ||
      user?.wb_team_profile_id ||
      user?.wbTeamProfileId ||
      user?.wbteam_user_id ||
      user?.wbteamUserId ||
      user?.id ||
      user?.employee_id ||
      user?.employeeId ||
      user?.employeeID ||
      user?.email ||
      user?.phone ||
      ""
  ).trim();

/** @type {Record<string, string>} Human-readable labels for space kinds */
export const spaceKindLabels = {
  coworking: "Коворкинг",
  meeting: "Переговорка",
};

/** @type {Record<string, string>} Plural labels for space kinds */
export const spaceKindPluralLabels = {
  coworking: "Коворкинги",
  meeting: "Переговорки",
};

/** @type {string} The default space kind used on first load */
export const defaultSpaceKind = "coworking";

/** @type {string} SVG namespace URI */
export const svgNamespace = "http://www.w3.org/2000/svg";
