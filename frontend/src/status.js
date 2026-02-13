/**
 * Status-bar management — factory for inline status messages
 * and a top-alert banner with auto-dismiss.
 */

/**
 * Creates a status controller bound to a specific DOM element.
 *
 * ```js
 * const status = createStatusManager(document.getElementById("pageStatus"));
 * status.set("Загрузка…", "info");
 * status.clear();
 * ```
 *
 * @param {HTMLElement|null} element – the container whose textContent
 *   and `data-tone` attribute will be managed
 * @returns {{ set(message: string, tone?: string): void, clear(): void }}
 */
export const createStatusManager = (element) => ({
  set(message, tone = "info") {
    if (!element) return;
    element.textContent = message;
    element.dataset.tone = tone;
  },
  clear() {
    if (!element) return;
    element.textContent = "";
    element.dataset.tone = "";
  },
});

/** @type {number|null} */
let topAlertTimer = null;
/** @type {number|null} */
let topAlertClearTimer = null;

/**
 * Creates a top-alert controller (toast-like banner).
 *
 * The banner auto-hides after 5 s.  Calling `show()` again resets the
 * timer.  After hiding, the text is cleared with a 300 ms delay so that
 * CSS transitions can finish.
 *
 * @param {HTMLElement|null} alertElement – the `.top-alert` container
 * @returns {{ show(message: string, tone?: string): void, hide(): void }}
 */
export const createTopAlert = (alertElement) => {
  const hide = () => {
    if (!alertElement) return;
    if (topAlertTimer) {
      clearTimeout(topAlertTimer);
      topAlertTimer = null;
    }
    alertElement.classList.remove("is-visible");
    if (topAlertClearTimer) {
      clearTimeout(topAlertClearTimer);
    }
    topAlertClearTimer = setTimeout(() => {
      alertElement.textContent = "";
      alertElement.dataset.tone = "";
    }, 300);
  };

  const show = (message, tone = "success") => {
    if (!alertElement) return;
    alertElement.textContent = message;
    alertElement.dataset.tone = tone;
    alertElement.classList.add("is-visible");
    if (topAlertTimer) clearTimeout(topAlertTimer);
    if (topAlertClearTimer) clearTimeout(topAlertClearTimer);
    topAlertTimer = setTimeout(() => hide(), 5000);
  };

  return { show, hide };
};
