const buildingForm = document.getElementById("buildingForm");
const buildingNameInput = document.getElementById("buildingName");
const buildingAddressInput = document.getElementById("buildingAddress");
const buildingImageInput = document.getElementById("buildingImage");
const submitBtn = document.getElementById("submitBtn");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const editBuildingBtn = document.getElementById("editBuildingBtn");
const editFloorBtn = document.getElementById("editFloorBtn");
const editSpaceBtn = document.getElementById("editSpaceBtn");
const cancelSpaceEditBtn = document.getElementById("cancelSpaceEditBtn");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewImg = document.getElementById("imagePreviewImg");
const removeImageBtn = document.getElementById("removeImageBtn");
const imageHint = document.getElementById("imageHint");
const buildingModal = document.getElementById("buildingModal");
const headerActions = document.getElementById("headerActions");
const authGate = document.getElementById("authGate");
const authSubtitle = document.getElementById("authSubtitle");
const authPhoneForm = document.getElementById("authPhoneForm");
const authPhoneInput = document.getElementById("authPhoneInput");
const authCodeForm = document.getElementById("authCodeForm");
const authCodeInput = document.getElementById("authCodeInput");
const authCodeHint = document.getElementById("authCodeHint");
const authStatus = document.getElementById("authStatus");
const requestCodeBtn = document.getElementById("requestCodeBtn");
const confirmCodeBtn = document.getElementById("confirmCodeBtn");
const backToPhoneBtn = document.getElementById("backToPhoneBtn");
const authUserBlock = document.getElementById("authUserBlock");
const authUserName = document.getElementById("authUserName");
const breadcrumbProfiles = document.querySelectorAll('[data-role="breadcrumb-profile"]');
const floorPlanLayout = document.getElementById("floorPlanLayout");
const floorPlanActions = document.getElementById("floorPlanActions");
const floorPlanActionLabel = document.getElementById("floorPlanActionLabel");
const floorPlanModal = document.getElementById("floorPlanModal");
const floorPlanModalBody = document.getElementById("floorPlanModalBody");
const openFloorPlanModalBtn = document.getElementById("openFloorPlanModalBtn");
const modalTitle = document.getElementById("modalTitle");
const floorsFields = document.getElementById("floorsFields");
const buildingUndergroundFloorsInput = document.getElementById("buildingUndergroundFloors");
const buildingAbovegroundFloorsInput = document.getElementById("buildingAbovegroundFloors");
const deleteBuildingBtn = document.getElementById("deleteBuildingBtn");
const buildingsGrid = document.getElementById("buildingsGrid");
const emptyState = document.getElementById("emptyState");
const statusBox = document.getElementById("status");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const buildingsPage = document.getElementById("buildingsPage");
const buildingPage = document.getElementById("buildingPage");
const floorsCount = document.getElementById("floorsCount");
const floorsList = document.getElementById("floorsList");
const floorsEmpty = document.getElementById("floorsEmpty");
const buildingStatus = document.getElementById("buildingStatus");
const floorPage = document.getElementById("floorPage");
const floorTitle = document.getElementById("floorTitle");
const floorSubtitle = document.getElementById("floorSubtitle");
const floorLevelTag = document.getElementById("floorLevelTag");
const floorStatus = document.getElementById("floorStatus");
const spacePage = document.getElementById("spacePage");
const floorPlanPreview = document.getElementById("floorPlanPreview");
const floorPlanPlaceholder = document.getElementById("floorPlanPlaceholder");
const floorPlanCanvas = document.getElementById("floorPlanCanvas");
const floorPlanFile = document.getElementById("floorPlanFile");
const uploadFloorPlanBtn = document.getElementById("uploadFloorPlanBtn");
const deleteFloorPlanBtn = document.getElementById("deleteFloorPlanBtn");
const cancelFloorEditBtn = document.getElementById("cancelFloorEditBtn");
const floorPlanSpaces = document.getElementById("floorPlanSpaces");
const floorSpacesList = document.getElementById("floorSpacesList");
const floorSpacesEmpty = document.getElementById("floorSpacesEmpty");
const addSpaceBtn = document.getElementById("addSpaceBtn");
const spaceModal = document.getElementById("spaceModal");
const spaceModalTitle = document.getElementById("spaceModalTitle");
const spaceForm = document.getElementById("spaceForm");
const spaceNameField = document.getElementById("spaceNameField");
const spaceKindField = document.getElementById("spaceKindField");
const spaceCapacityFieldRow = document.getElementById("spaceCapacityFieldRow");
const spaceCapacityField = document.getElementById("spaceCapacityField");
const spaceColorInput = document.getElementById("spaceColorInput");
const spaceColorPreview = document.getElementById("spaceColorPreview");
const spaceSaveBtn = document.getElementById("spaceSaveBtn");
const spaceModalCloseBtn = document.getElementById("spaceModalCloseBtn");
const spaceDeleteBtn = document.getElementById("spaceDeleteBtn");
const spaceStatus = document.getElementById("spaceStatus");
const breadcrumbBuildings = document.getElementById("breadcrumbBuildings");
const breadcrumbBuilding = document.getElementById("breadcrumbBuilding");
const spaceBreadcrumbBuildings = document.getElementById("spaceBreadcrumbBuildings");
const spaceBreadcrumbBuilding = document.getElementById("spaceBreadcrumbBuilding");
const spaceBreadcrumbFloor = document.getElementById("spaceBreadcrumbFloor");
const spaceName = document.getElementById("spaceName");
const spaceKindTag = document.getElementById("spaceKindTag");
const spaceCapacityTag = document.getElementById("spaceCapacityTag");
const spaceIdTag = document.getElementById("spaceIdTag");
const spaceLayout = document.getElementById("spaceLayout");
const spaceSnapshot = document.getElementById("spaceSnapshot");
const spaceSnapshotCanvas = document.getElementById("spaceSnapshotCanvas");
const spaceSnapshotPlaceholder = document.getElementById("spaceSnapshotPlaceholder");
const spacePageStatus = document.getElementById("spacePageStatus");
const spaceDesksPanel = document.getElementById("spaceDesksPanel");
const spaceDesksList = document.getElementById("spaceDesksList");
const spaceDesksEmpty = document.getElementById("spaceDesksEmpty");
const deskModal = document.getElementById("deskModal");
const deskModalTitle = document.getElementById("deskModalTitle");
const deskForm = document.getElementById("deskForm");
const deskNameField = document.getElementById("deskNameField");
const deskSaveBtn = document.getElementById("deskSaveBtn");
const deskModalCloseBtn = document.getElementById("deskModalCloseBtn");
const deskCancelBtn = document.getElementById("deskCancelBtn");
const deskStatus = document.getElementById("deskStatus");
const addDeskBtn = document.getElementById("addDeskBtn");
const deleteDeskBtn = document.getElementById("deleteDeskBtn");
const copyDeskBtn = document.getElementById("copyDeskBtn");
const pasteDeskBtn = document.getElementById("pasteDeskBtn");
const shrinkDeskBtn = document.getElementById("shrinkDeskBtn");
const rotateDeskBtn = document.getElementById("rotateDeskBtn");

let buildings = [];
let editingId = null;
let currentBuilding = null;
let currentFloor = null;
let currentSpace = null;
let currentSpaces = [];
let currentDesks = [];
let isFloorEditing = false;
let isSpaceEditing = false;
let isDeskPlacementActive = false;
let pendingDeskUpdates = new Map();
let pendingDeskRender = false;
let currentSpaceBounds = null;
let copiedDesk = null;
const deskEditState = {
  selectedDeskId: null,
  selectedDeskIds: new Set(),
  draggingDeskId: null,
  draggingDeskIds: null,
  draggingPointerId: null,
  groupDragStartPoint: null,
  groupDragStartPositions: null,
  groupDragBounds: null,
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
  hasMoved: false,
  skipSelectionClear: false,
  transformMode: null,
  transformPointerId: null,
  groupTransformStartBounds: null,
  groupTransformStartDesks: null,
  transformStartX: 0,
  transformStartY: 0,
  transformStartWidth: 0,
  transformStartHeight: 0,
  transformStartRotation: 0,
  transformHandle: null,
};
let hasFloorPlan = false;
let removeImage = false;
let previewObjectUrl = null;
let editingSpace = null;
let editingDesk = null;
const svgNamespace = "http://www.w3.org/2000/svg";
const lassoDefaults = {
  kind: "polygon",
  fillOpacity: 0.35,
};
const lassoState = {
  active: false,
  points: [],
  pendingPoints: null,
  svg: null,
  spacesLayer: null,
  previewLayer: null,
  previewPolygon: null,
  handlesLayer: null,
};
const spaceTooltipState = {
  element: null,
  polygon: null,
};
const spaceEditDefaults = {
  handleRadius: 4,
  edgeSnapDistance: 8,
};
const spaceEditState = {
  selectedPolygon: null,
  selectedLabel: null,
  handleElements: [],
  points: [],
  draggingIndex: null,
  isDragging: false,
  dragPointerId: null,
  isPolygonDragging: false,
  polygonDragPointerId: null,
  polygonDragStartPoint: null,
  polygonDragStartPoints: [],
  isEditingPolygon: false,
  skipClick: false,
  lastHandleClickTime: 0,
  lastHandleClickIndex: null,
};
let floorPlanDirty = false;
let floorPlanModalRequested = false;
const addSpaceBtnLabel = addSpaceBtn
  ? addSpaceBtn.dataset.label || addSpaceBtn.getAttribute("aria-label") || addSpaceBtn.textContent
  : "Добавить пространство";
const addSpaceBtnActiveLabel = addSpaceBtn
  ? addSpaceBtn.dataset.activeLabel || "Отменить выделение"
  : "Отменить выделение";
const addSpaceBtnIcon = addSpaceBtn ? addSpaceBtn.dataset.icon || "+" : "+";
const addSpaceBtnActiveIcon = addSpaceBtn ? addSpaceBtn.dataset.activeIcon || "×" : "×";
const addDeskBtnLabel = addDeskBtn
  ? addDeskBtn.dataset.label || addDeskBtn.getAttribute("aria-label") || addDeskBtn.textContent
  : "Добавить стол";
const addDeskBtnActiveLabel = addDeskBtn
  ? addDeskBtn.dataset.activeLabel || "Отменить размещение"
  : "Отменить размещение";
const addDeskBtnIcon = addDeskBtn ? addDeskBtn.dataset.icon || "+" : "+";
const addDeskBtnActiveIcon = addDeskBtn ? addDeskBtn.dataset.activeIcon || "×" : "×";
const deskPixelWidth = 200;
const deskPixelHeight = 100;
const deskMinWidth = 60;
const deskMinHeight = 40;
const deskShrinkFactor = 0.9;
const deskRotateStep = 15;
const deskSnapDistance = 8;
const deskRotationSnapTolerance = 6;
const spaceKindLabels = {
  coworking: "Коворкинг",
  meeting: "Переговорка",
};
const spaceKindPluralLabels = {
  coworking: "Коворкинги",
  meeting: "Переговорки",
};
const defaultSpaceKind = "coworking";
const fallbackBuildingImages = [
  "/assets/buildings/1.png",
  "/assets/buildings/2.png",
  "/assets/buildings/3.png",
];
const cancelFloorEditHome = cancelFloorEditBtn
  ? { parent: cancelFloorEditBtn.parentElement, nextSibling: cancelFloorEditBtn.nextElementSibling }
  : null;

const AUTH_TOKEN_KEY = "auth_access_token";
const AUTH_USER_KEY = "auth_user_info";
const AUTH_COOKIES_KEY = "auth_cookies";
const AVATAR_CACHE_URL_KEY = "avatar_cache_url";
const AVATAR_CACHE_DATA_KEY = "avatar_cache_data";
const AVATAR_CACHE_AT_KEY = "avatar_cache_at";
const avatarInFlight = new Map();
const imagePreloadCache = new Map();

let authSticker = null;
let authTTL = null;
let appInitialized = false;

const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const setUserInfo = (userInfo) => {
  if (userInfo) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userInfo));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

const getUserInfo = () => {
  const stored = localStorage.getItem(AUTH_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

const setAuthCookies = (cookies) => {
  if (cookies) {
    localStorage.setItem(AUTH_COOKIES_KEY, cookies);
  } else {
    localStorage.removeItem(AUTH_COOKIES_KEY);
  }
};

const getAuthCookies = () => localStorage.getItem(AUTH_COOKIES_KEY);

const getCachedAvatar = (avatarUrl) => {
  if (!avatarUrl) {
    return null;
  }
  const cachedUrl = localStorage.getItem(AVATAR_CACHE_URL_KEY);
  const cachedData = localStorage.getItem(AVATAR_CACHE_DATA_KEY);
  if (cachedUrl && cachedData && cachedUrl === avatarUrl) {
    return cachedData;
  }
  return null;
};

const cacheAvatarData = (avatarUrl, dataUrl) => {
  if (!avatarUrl || !dataUrl) {
    return;
  }
  try {
    localStorage.setItem(AVATAR_CACHE_URL_KEY, avatarUrl);
    localStorage.setItem(AVATAR_CACHE_DATA_KEY, dataUrl);
    localStorage.setItem(AVATAR_CACHE_AT_KEY, String(Date.now()));
  } catch (error) {
    // Ignore storage errors (quota exceeded or private mode)
  }
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const cacheAvatarFromUrl = async (avatarUrl) => {
  if (!avatarUrl) {
    return null;
  }
  const cached = getCachedAvatar(avatarUrl);
  if (cached) {
    return cached;
  }
  if (avatarInFlight.has(avatarUrl)) {
    return avatarInFlight.get(avatarUrl);
  }
  const fetchPromise = (async () => {
    let url;
    try {
      url = new URL(avatarUrl, window.location.href);
    } catch (error) {
      return null;
    }
    const isSameOrigin = url.origin === window.location.origin;
    try {
      const response = await fetch(url.toString(), {
        credentials: isSameOrigin ? "include" : "omit",
      });
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        return null;
      }
      const dataUrl = await blobToDataUrl(blob);
      if (typeof dataUrl === "string") {
        cacheAvatarData(avatarUrl, dataUrl);
        return dataUrl;
      }
      return null;
    } catch (error) {
      return null;
    } finally {
      avatarInFlight.delete(avatarUrl);
    }
  })();
  avatarInFlight.set(avatarUrl, fetchPromise);
  return fetchPromise;
};

const preloadImage = (src) => {
  if (!src) {
    return Promise.resolve(false);
  }
  if (imagePreloadCache.has(src)) {
    return imagePreloadCache.get(src);
  }
  const img = new Image();
  const promise = new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  img.src = src;
  imagePreloadCache.set(src, promise);
  return promise;
};

const preloadBuildingImage = (building) => {
  if (building && building.image_url) {
    preloadImage(building.image_url);
  }
};

const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_COOKIES_KEY);
};

const setAuthStatus = (message, tone = "info") => {
  if (!authStatus) {
    return;
  }
  authStatus.textContent = message;
  authStatus.dataset.tone = tone;
};

const showAuthGate = () => {
  if (!authGate) {
    return;
  }
  authGate.classList.remove("is-hidden");
  authGate.setAttribute("aria-hidden", "false");
  document.body.classList.add("auth-locked");
};

const hideAuthGate = () => {
  if (!authGate) {
    return;
  }
  authGate.classList.add("is-hidden");
  authGate.setAttribute("aria-hidden", "true");
  document.body.classList.remove("auth-locked");
};

const getDisplayNameFromUser = (user) =>
  user?.name ||
  user?.full_name ||
  user?.fullName ||
  user?.email ||
  user?.phone ||
  "Пользователь";

const closeBreadcrumbMenus = (exceptMenu = null) => {
  const menus = document.querySelectorAll('[data-role="breadcrumb-menu"]');
  menus.forEach((menu) => {
    if (exceptMenu && menu === exceptMenu) {
      return;
    }
    menu.classList.add("is-hidden");
    const trigger = menu
      .closest('[data-role="breadcrumb-profile"]')
      ?.querySelector('[data-role="breadcrumb-trigger"]');
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
};

const toggleBreadcrumbMenu = (profile) => {
  const menu = profile?.querySelector('[data-role="breadcrumb-menu"]');
  const trigger = profile?.querySelector('[data-role="breadcrumb-trigger"]');
  if (!menu || !trigger) {
    return;
  }
  const isOpen = !menu.classList.contains("is-hidden");
  closeBreadcrumbMenus(menu);
  if (isOpen) {
    menu.classList.add("is-hidden");
    trigger.setAttribute("aria-expanded", "false");
  } else {
    menu.classList.remove("is-hidden");
    trigger.setAttribute("aria-expanded", "true");
  }
};

const updateBreadcrumbProfile = (user) => {
  if (!breadcrumbProfiles || breadcrumbProfiles.length === 0) {
    return;
  }
  if (!user) {
    breadcrumbProfiles.forEach((node) => {
      node.classList.add("is-hidden");
    });
    closeBreadcrumbMenus();
    return;
  }

  const displayName = getDisplayNameFromUser(user);
  const avatarUrl = typeof user.avatar_url === "string" ? user.avatar_url.trim() : "";

  breadcrumbProfiles.forEach((node) => {
    const avatar = node.querySelector(".breadcrumb-avatar");
    const name = node.querySelector(".breadcrumb-name");
    if (name) {
      name.textContent = displayName;
    }
    if (avatar) {
      avatar.alt = displayName;
      if (avatarUrl) {
        avatar.dataset.avatarUrl = avatarUrl;
        const cachedAvatar = getCachedAvatar(avatarUrl);
        if (cachedAvatar) {
          avatar.src = cachedAvatar;
        } else {
          avatar.src = avatarUrl;
          cacheAvatarFromUrl(avatarUrl).then((cached) => {
            if (!cached) {
              return;
            }
            if (avatar.dataset.avatarUrl === avatarUrl) {
              avatar.src = cached;
            }
          });
        }
        avatar.classList.remove("is-hidden");
      } else {
        avatar.removeAttribute("src");
        avatar.removeAttribute("data-avatar-url");
        avatar.classList.add("is-hidden");
      }
    }
    node.classList.remove("is-hidden");
  });
};

const updateAuthUserBlock = (user) => {
  if (!user) {
    if (authUserBlock && authUserName) {
      authUserBlock.classList.add("is-hidden");
      authUserName.textContent = "";
    }
    updateBreadcrumbProfile(null);
    return;
  }

  const displayName = getDisplayNameFromUser(user);
  if (authUserBlock && authUserName) {
    authUserName.textContent = displayName;
    authUserBlock.classList.remove("is-hidden");
  }
  updateBreadcrumbProfile(user);
};

const setAuthStep = (step) => {
  if (!authPhoneForm || !authCodeForm || !authSubtitle) {
    return;
  }
  if (step === "code") {
    authPhoneForm.classList.add("is-hidden");
    authCodeForm.classList.remove("is-hidden");
    authSubtitle.textContent = "Введите код подтверждения из приложения.";
  } else {
    authPhoneForm.classList.remove("is-hidden");
    authCodeForm.classList.add("is-hidden");
    authSubtitle.textContent = "Введите номер телефона для входа в систему.";
  }
  setAuthStatus("");
};

const setAuthLoading = (loading) => {
  if (authPhoneInput) authPhoneInput.disabled = loading;
  if (authCodeInput) authCodeInput.disabled = loading;
  if (requestCodeBtn) requestCodeBtn.disabled = loading;
  if (confirmCodeBtn) confirmCodeBtn.disabled = loading;
  if (backToPhoneBtn) backToPhoneBtn.disabled = loading;
};

const normalizePhoneNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  let phone = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  if (phone && !phone.startsWith("7")) {
    phone = `7${phone}`;
  }
  return phone.slice(0, 11);
};

const formatPhoneNumber = (value) => {
  const phone = normalizePhoneNumber(value);
  if (phone.length === 0) return "";
  if (phone.length <= 1) return phone;
  if (phone.length <= 4) return `${phone.slice(0, 1)} (${phone.slice(1)}`;
  if (phone.length <= 7) return `${phone.slice(0, 1)} (${phone.slice(1, 4)}) ${phone.slice(4)}`;
  if (phone.length <= 9)
    return `${phone.slice(0, 1)} (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
  return `${phone.slice(0, 1)} (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(
    7,
    9
  )}-${phone.slice(9, 11)}`;
};

const getDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

const getDeviceName = () =>
  navigator.userAgent.includes("Macintosh") ? "Apple Macintosh" : "Windows PC";

const parseSetCookieHeader = (rawHeader) => {
  if (!rawHeader) {
    return [];
  }
  const chunks = rawHeader.split(/,(?=[^;]+?=)/);
  return chunks
    .map((chunk) => chunk.split(";")[0].trim())
    .filter((cookie) => cookie && cookie.includes("="));
};

const saveCookiesFromHeader = (rawHeader) => {
  const cookieStrings = parseSetCookieHeader(rawHeader);
  if (cookieStrings.length === 0) {
    return null;
  }
  const cookies = cookieStrings.join("; ");
  setAuthCookies(cookies);
  return cookies;
};

const requestAuthCode = async (phoneNumber) => {
  try {
    const response = await fetch("/api/auth/v2/code/wb-captcha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        deviceid: getDeviceId(),
        devicename: getDeviceName(),
        "wb-apptype": "web",
      },
      credentials: "include",
      body: JSON.stringify({ phone_number: phoneNumber, save_push: true }),
    });

    const data = await response.json().catch(() => ({}));
    const setCookieHeader = response.headers.get("X-Set-Cookie");
    if (setCookieHeader) {
      saveCookiesFromHeader(setCookieHeader);
    }

    if (!response.ok || data?.result !== 0) {
      throw new Error(data?.error || "Не удалось получить код");
    }

    return {
      success: true,
      sticker: data.payload?.sticker,
      ttl: data.payload?.ttl,
    };
  } catch (error) {
    return { success: false, error: error.message || "Не удалось получить код" };
  }
};

const confirmAuthCode = async (code, sticker) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      deviceid: getDeviceId(),
      devicename: getDeviceName(),
      "wb-apptype": "web",
    };

    const savedCookies = getAuthCookies();
    if (savedCookies) {
      headers["X-Cookie"] = savedCookies;
    }

    const response = await fetch("/api/auth/v2/auth", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ code: Number(code), sticker }),
    });

    const data = await response.json().catch(() => ({}));
    const accessToken = data?.access_token || data?.payload?.access_token || data?.data?.access_token;

    const setCookieHeader = response.headers.get("X-Set-Cookie");
    if (setCookieHeader) {
      saveCookiesFromHeader(setCookieHeader);
    }

    if (!response.ok || !accessToken) {
      throw new Error(data?.error || "Неверный код");
    }

    return { success: true, accessToken };
  } catch (error) {
    return { success: false, error: error.message || "Неверный код" };
  }
};

const fetchAuthUserInfo = async (accessToken) => {
  try {
    if (!accessToken || !accessToken.trim()) {
      return { success: false, error: "Токен не предоставлен" };
    }
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      deviceid: getDeviceId(),
      devicename: getDeviceName(),
    };
    const cookies = getAuthCookies();
    if (cookies) {
      headers["X-Cookie"] = cookies;
    }
    const response = await fetch("/api/auth/user/info", {
      headers,
      credentials: "include",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new Error(data?.error || "Не удалось получить информацию о пользователе");
    }
    return { success: true, user: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Не удалось получить информацию о пользователе" };
  }
};

const runAppInit = async () => {
  if (appInitialized) {
    return;
  }
  appInitialized = true;
  await init();
};

const initializeAuth = async () => {
  if (!authGate) {
    await runAppInit();
    return;
  }
  const token = getAuthToken();
  if (!token) {
    showAuthGate();
    return;
  }
  const cachedUser = getUserInfo();
  if (cachedUser) {
    updateAuthUserBlock(cachedUser);
  }
  // Kick off app initialization immediately so key data requests start without delay.
  void runAppInit();
  setAuthLoading(true);
  setAuthStatus("Проверяем авторизацию...");
  const userResult = await fetchAuthUserInfo(token);
  setAuthLoading(false);
  if (userResult.success) {
    setUserInfo(userResult.user);
    updateAuthUserBlock(userResult.user);
    hideAuthGate();
    return;
  }
  clearAuthStorage();
  showAuthGate();
  setAuthStatus("Авторизуйтесь снова.", "error");
};

const apiRequest = async (path, options = {}) => {
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

const setStatus = (message, tone = "info") => {
  statusBox.textContent = message;
  statusBox.dataset.tone = tone;
};

const clearStatus = () => {
  statusBox.textContent = "";
  statusBox.dataset.tone = "";
};

const setBuildingStatus = (message, tone = "info") => {
  if (!buildingStatus) {
    return;
  }
  buildingStatus.textContent = message;
  buildingStatus.dataset.tone = tone;
};

const clearBuildingStatus = () => {
  if (!buildingStatus) {
    return;
  }
  buildingStatus.textContent = "";
  buildingStatus.dataset.tone = "";
};

const setFloorStatus = (message, tone = "info") => {
  if (!floorStatus) {
    return;
  }
  floorStatus.textContent = message;
  floorStatus.dataset.tone = tone;
};

const clearFloorStatus = () => {
  if (!floorStatus) {
    return;
  }
  floorStatus.textContent = "";
  floorStatus.dataset.tone = "";
};

const setSpaceStatus = (message, tone = "info") => {
  if (!spaceStatus) {
    return;
  }
  spaceStatus.textContent = message;
  spaceStatus.dataset.tone = tone;
};

const clearSpaceStatus = () => {
  if (!spaceStatus) {
    return;
  }
  spaceStatus.textContent = "";
  spaceStatus.dataset.tone = "";
};

const setDeskStatus = (message, tone = "info") => {
  if (!deskStatus) {
    return;
  }
  deskStatus.textContent = message;
  deskStatus.dataset.tone = tone;
};

const clearDeskStatus = () => {
  if (!deskStatus) {
    return;
  }
  deskStatus.textContent = "";
  deskStatus.dataset.tone = "";
};

const setSpacePageStatus = (message, tone = "info") => {
  if (!spacePageStatus) {
    return;
  }
  spacePageStatus.textContent = message;
  spacePageStatus.dataset.tone = tone;
};

const clearSpacePageStatus = () => {
  if (!spacePageStatus) {
    return;
  }
  spacePageStatus.textContent = "";
  spacePageStatus.dataset.tone = "";
};

const updateSpaceColorPreview = (color) => {
  if (!spaceColorPreview) {
    return;
  }
  spaceColorPreview.style.background = color || "#60a5fa";
};

const normalizeSpaceKind = (kind) => (kind && spaceKindLabels[kind] ? kind : defaultSpaceKind);

const getSpaceKindLabel = (kind) => (kind && spaceKindLabels[kind] ? spaceKindLabels[kind] : "");

const updateSpaceCapacityVisibility = (kind) => {
  const isMeeting = kind === "meeting";
  if (spaceCapacityFieldRow) {
    spaceCapacityFieldRow.classList.toggle("is-hidden", !isMeeting);
  }
  if (spaceCapacityField) {
    spaceCapacityField.disabled = !isMeeting;
    spaceCapacityField.required = isMeeting;
    if (!isMeeting) {
      spaceCapacityField.value = "";
    }
  }
};

const openSpaceModal = (space = null) => {
  if (!spaceModal) {
    return;
  }
  editingSpace = space;
  spaceModal.classList.add("is-open");
  spaceModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  clearSpaceStatus();
  if (spaceModalTitle) {
    spaceModalTitle.textContent = space ? "Редактировать пространство" : "Новое пространство";
  }
  if (spaceDeleteBtn) {
    spaceDeleteBtn.classList.toggle("is-hidden", !space);
  }
  if (spaceNameField) {
    spaceNameField.value = space?.name || "";
    spaceNameField.focus();
  }
  if (spaceKindField) {
    spaceKindField.value = normalizeSpaceKind(space?.kind);
  }
  if (spaceCapacityField) {
    const capacityValue =
      space && Number.isFinite(Number(space.capacity)) && Number(space.capacity) > 0
        ? String(space.capacity)
        : "";
    spaceCapacityField.value = capacityValue;
  }
  updateSpaceCapacityVisibility(spaceKindField ? spaceKindField.value : defaultSpaceKind);
  if (spaceColorInput) {
    const initialColor = space?.color || getSpaceColor(space) || "#60a5fa";
    spaceColorInput.value = initialColor;
    updateSpaceColorPreview(initialColor);
  }
};

const closeSpaceModal = () => {
  if (!spaceModal) {
    return;
  }
  editingSpace = null;
  spaceModal.classList.remove("is-open");
  spaceModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearSpaceStatus();
  if (spaceForm) {
    spaceForm.reset();
  }
  updateSpaceCapacityVisibility(defaultSpaceKind);
  if (spaceDeleteBtn) {
    spaceDeleteBtn.classList.add("is-hidden");
    spaceDeleteBtn.disabled = false;
  }
  lassoState.pendingPoints = null;
  lassoState.points = [];
};

const openDeskModal = (desk) => {
  if (!deskModal) {
    return;
  }
  if (desk?.id) {
    setSelectedDesk(desk.id);
  }
  editingDesk = desk;
  deskModal.classList.add("is-open");
  deskModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  clearDeskStatus();
  if (deskModalTitle) {
    deskModalTitle.textContent = "Редактировать стол";
  }
  if (deskNameField) {
    deskNameField.value = desk?.label || "";
    deskNameField.focus();
  }
};

const closeDeskModal = () => {
  if (!deskModal) {
    return;
  }
  editingDesk = null;
  deskModal.classList.remove("is-open");
  deskModal.setAttribute("aria-hidden", "true");
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
  clearDeskStatus();
  if (deskForm) {
    deskForm.reset();
  }
};

if (spaceColorInput) {
  updateSpaceColorPreview(spaceColorInput.value);
  spaceColorInput.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    updateSpaceColorPreview(event.target.value);
  });
}

if (spaceColorPreview && spaceColorInput) {
  spaceColorPreview.addEventListener("click", () => {
    spaceColorInput.click();
  });
  spaceColorPreview.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      spaceColorInput.click();
    }
  });
}

if (spaceKindField) {
  spaceKindField.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLSelectElement)) {
      return;
    }
    updateSpaceCapacityVisibility(event.target.value);
  });
}

const showImagePreview = (src) => {
  if (!imagePreview || !imagePreviewImg) {
    return;
  }
  imagePreviewImg.src = src;
  imagePreview.classList.remove("is-hidden");
  if (imageHint) {
    imageHint.classList.add("is-hidden");
  }
};

const clearImagePreview = () => {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  if (!imagePreview || !imagePreviewImg) {
    return;
  }
  imagePreviewImg.src = "";
  imagePreview.classList.add("is-hidden");
  if (imageHint) {
    imageHint.classList.remove("is-hidden");
  }
};

const floorPlanState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  pendingSelectPolygon: null,
  pendingSelectPointerId: null,
  pendingSelectStartX: 0,
  pendingSelectStartY: 0,
  pendingSelectTimerId: null,
};

const spaceSnapshotState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  dragPointerId: null,
  pendingPointerId: null,
  pendingStartX: 0,
  pendingStartY: 0,
};

const clearPendingSelect = () => {
  floorPlanState.pendingSelectPolygon = null;
  floorPlanState.pendingSelectPointerId = null;
  if (floorPlanState.pendingSelectTimerId !== null) {
    clearTimeout(floorPlanState.pendingSelectTimerId);
    floorPlanState.pendingSelectTimerId = null;
  }
};

const applyFloorPlanTransform = () => {
  if (!floorPlanCanvas) {
    return;
  }
  floorPlanCanvas.style.transform = `translate(${floorPlanState.translateX}px, ${floorPlanState.translateY}px) scale(${floorPlanState.scale})`;
};

const resetFloorPlanTransform = () => {
  floorPlanState.scale = 1;
  floorPlanState.translateX = 0;
  floorPlanState.translateY = 0;
  applyFloorPlanTransform();
};

const applySpaceSnapshotTransform = () => {
  if (!spaceSnapshotCanvas) {
    return;
  }
  spaceSnapshotCanvas.style.transform = `translate(${spaceSnapshotState.translateX}px, ${spaceSnapshotState.translateY}px) scale(${spaceSnapshotState.scale})`;
};

const resetSpaceSnapshotTransform = () => {
  spaceSnapshotState.scale = 1;
  spaceSnapshotState.translateX = 0;
  spaceSnapshotState.translateY = 0;
  spaceSnapshotState.isDragging = false;
  spaceSnapshotState.dragPointerId = null;
  spaceSnapshotState.pendingPointerId = null;
  if (spaceSnapshot) {
    spaceSnapshot.classList.remove("is-dragging");
  }
  applySpaceSnapshotTransform();
};

const ensureSpaceLayers = (svg) => {
  if (!svg) {
    return;
  }
  let spacesLayer = svg.querySelector("#spacesLayer");
  if (!spacesLayer) {
    spacesLayer = document.createElementNS(svgNamespace, "g");
    spacesLayer.setAttribute("id", "spacesLayer");
    svg.appendChild(spacesLayer);
  }
  let previewLayer = svg.querySelector("#lassoLayer");
  if (!previewLayer) {
    previewLayer = document.createElementNS(svgNamespace, "g");
    previewLayer.setAttribute("id", "lassoLayer");
    svg.appendChild(previewLayer);
  }
  let handlesLayer = svg.querySelector("#spaceHandlesLayer");
  if (!handlesLayer) {
    handlesLayer = document.createElementNS(svgNamespace, "g");
    handlesLayer.setAttribute("id", "spaceHandlesLayer");
    svg.appendChild(handlesLayer);
  }
  lassoState.svg = svg;
  lassoState.spacesLayer = spacesLayer;
  lassoState.previewLayer = previewLayer;
  lassoState.handlesLayer = handlesLayer;
};

const resetLassoPreview = () => {
  if (lassoState.previewPolygon) {
    lassoState.previewPolygon.remove();
  }
  lassoState.previewPolygon = null;
};

const setLassoActive = (active) => {
  lassoState.active = active;
  if (floorPlanPreview) {
    floorPlanPreview.classList.toggle("is-lasso", active);
  }
  if (addSpaceBtn) {
    addSpaceBtn.textContent = active ? addSpaceBtnActiveIcon : addSpaceBtnIcon;
    addSpaceBtn.setAttribute("aria-label", active ? addSpaceBtnActiveLabel : addSpaceBtnLabel);
    addSpaceBtn.title = active ? addSpaceBtnActiveLabel : addSpaceBtnLabel;
    addSpaceBtn.setAttribute("aria-pressed", String(active));
  }
};

const getSvgPoint = (event) => {
  const svg = lassoState.svg;
  if (!svg) {
    return null;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
};

const updateLassoPreview = (cursorPoint) => {
  if (!lassoState.previewPolygon) {
    return;
  }
  const points = [...lassoState.points];
  if (cursorPoint) {
    points.push(cursorPoint);
  }
  if (points.length === 0) {
    lassoState.previewPolygon.removeAttribute("points");
    return;
  }
  lassoState.previewPolygon.setAttribute(
    "points",
    points.map((point) => `${point.x},${point.y}`).join(" ")
  );
};

const startLassoMode = () => {
  if (!currentFloor) {
    setFloorStatus("Сначала выберите этаж.", "error");
    return;
  }
  if (!isFloorEditing) {
    setFloorStatus("Сначала включите режим редактирования.", "error");
    return;
  }
  if (!hasFloorPlan || !lassoState.svg) {
    setFloorStatus("Сначала загрузите план этажа.", "error");
    return;
  }
  setLassoActive(true);
  clearSpaceSelection();
  ensureSpaceLayers(lassoState.svg);
  lassoState.points = [];
  lassoState.pendingPoints = null;
  resetLassoPreview();
  if (lassoState.previewLayer) {
    const previewPolygon = document.createElementNS(svgNamespace, "polygon");
    previewPolygon.classList.add("lasso-preview");
    lassoState.previewLayer.appendChild(previewPolygon);
    lassoState.previewPolygon = previewPolygon;
  }
  setFloorStatus(
    "Кликните по плану, чтобы поставить точки. Двойной клик — завершить, Esc — отменить.",
    "info"
  );
};

const cancelLassoMode = (message = "") => {
  if (!lassoState.active && lassoState.points.length === 0) {
    return;
  }
  setLassoActive(false);
  lassoState.points = [];
  lassoState.pendingPoints = null;
  resetLassoPreview();
  if (message) {
    setFloorStatus(message, "info");
  }
};

const finishLassoMode = () => {
  if (lassoState.points.length < 3) {
    setFloorStatus("Нужно минимум 3 точки для пространства.", "error");
    return;
  }
  lassoState.pendingPoints = [...lassoState.points];
  setLassoActive(false);
  resetLassoPreview();
  openSpaceModal();
};

const createSpacePolygon = (points, name, color, spaceId = null, spaceKind = "") => {
  if (!lassoState.svg || !lassoState.spacesLayer || points.length < 3) {
    return null;
  }
  const polygon = document.createElementNS(svgNamespace, "polygon");
  polygon.classList.add("space-polygon");
  polygon.setAttribute(
    "points",
    points.map((point) => `${point.x},${point.y}`).join(" ")
  );
  polygon.setAttribute("fill", color);
  polygon.setAttribute("data-space-name", name);
  polygon.setAttribute("data-space-color", color);
  if (spaceId) {
    polygon.setAttribute("data-space-id", String(spaceId));
  }
  if (spaceKind) {
    polygon.setAttribute("data-space-kind", spaceKind);
  }

  lassoState.spacesLayer.appendChild(polygon);
  return { polygon };
};

const escapeSelectorValue = (value) => {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
};

const parsePolygonPoints = (polygon) => {
  const raw = polygon.getAttribute("points");
  if (!raw) {
    return [];
  }
  return raw
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map((value) => Number(value));
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { x, y };
    })
    .filter(Boolean);
};

const stringifyPoints = (points) =>
  points.map((point) => `${point.x},${point.y}`).join(" ");

const normalizeSpacePoints = (points) => {
  if (!Array.isArray(points)) {
    return [];
  }
  return points
    .map((point) => {
      const x = Number(point?.x);
      const y = Number(point?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { x, y };
    })
    .filter(Boolean);
};

const stripEditorArtifacts = (svg) => {
  if (!svg) {
    return;
  }
  const handlesLayer = svg.querySelector("#spaceHandlesLayer");
  if (handlesLayer) {
    handlesLayer.remove();
  }
  svg.querySelectorAll(".space-handle").forEach((handle) => handle.remove());
  svg.querySelectorAll(".space-polygon.is-selected").forEach((polygon) => {
    polygon.classList.remove("is-selected");
  });
  svg.querySelectorAll(".space-label").forEach((label) => label.remove());
  svg.querySelectorAll(".space-polygon title").forEach((title) => title.remove());
};

const stripSpaceOverlays = (svg) => {
  if (!svg) {
    return;
  }
  const spacesLayer = svg.querySelector("#spacesLayer");
  if (spacesLayer) {
    spacesLayer.remove();
  }
  svg.querySelectorAll(".space-polygon").forEach((polygon) => polygon.remove());
  svg.querySelectorAll(".space-label").forEach((label) => label.remove());
};

const getCleanFloorPlanMarkup = () => {
  if (!lassoState.svg) {
    return "";
  }
  const clone = lassoState.svg.cloneNode(true);
  stripEditorArtifacts(clone);
  stripSpaceOverlays(clone);
  return new XMLSerializer().serializeToString(clone);
};

const getSpaceBounds = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((point) => {
    if (!point) {
      return;
    }
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
};

const buildSpaceSnapshotSvg = (planSvgMarkup, points, color = "#60a5fa", spaceId = null) => {
  if (!planSvgMarkup || !points || points.length < 3) {
    return null;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(planSvgMarkup, "image/svg+xml");
  const sourceSvg = doc.querySelector("svg");
  if (!sourceSvg) {
    return null;
  }
  stripEditorArtifacts(sourceSvg);
  stripSpaceOverlays(sourceSvg);
  if (!sourceSvg.hasAttribute("viewBox")) {
    const width = parseFloat(sourceSvg.getAttribute("width"));
    const height = parseFloat(sourceSvg.getAttribute("height"));
    if (Number.isFinite(width) && Number.isFinite(height)) {
      sourceSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
  }
  const bounds = getSpaceBounds(points);
  if (!bounds) {
    return null;
  }
  const padding = Math.max(Math.min(bounds.width, bounds.height) * 0.12, 12);
  const viewBox = [
    bounds.minX - padding,
    bounds.minY - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  ];
  const snapshotSvg = document.createElementNS(svgNamespace, "svg");
  snapshotSvg.setAttribute("viewBox", viewBox.join(" "));
  snapshotSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  snapshotSvg.setAttribute("width", "100%");
  snapshotSvg.setAttribute("height", "100%");

  const defs = document.createElementNS(svgNamespace, "defs");
  const clipPath = document.createElementNS(svgNamespace, "clipPath");
  const clipId = `space-clip-${spaceId || "snapshot"}`;
  clipPath.setAttribute("id", clipId);
  const clipPolygon = document.createElementNS(svgNamespace, "polygon");
  clipPolygon.setAttribute("points", stringifyPoints(points));
  clipPath.appendChild(clipPolygon);
  defs.appendChild(clipPath);
  snapshotSvg.appendChild(defs);
  snapshotSvg.setAttribute("data-clip-id", clipId);

  const planGroup = document.createElementNS(svgNamespace, "g");
  planGroup.setAttribute("clip-path", `url(#${clipId})`);
  Array.from(sourceSvg.childNodes).forEach((node) => {
    planGroup.appendChild(document.importNode(node, true));
  });
  snapshotSvg.appendChild(planGroup);

  const desksLayer = document.createElementNS(svgNamespace, "g");
  desksLayer.setAttribute("id", "spaceDesksLayer");
  desksLayer.setAttribute("clip-path", `url(#${clipId})`);
  snapshotSvg.appendChild(desksLayer);

  return snapshotSvg;
};

const getPolygonLabel = (polygon) => {
  if (!lassoState.spacesLayer) {
    return null;
  }
  const name = polygon.getAttribute("data-space-name");
  if (name) {
    const escapedName = escapeSelectorValue(name);
    const found = lassoState.spacesLayer.querySelector(
      `.space-label[data-space-name="${escapedName}"]`
    );
    if (found) {
      return found;
    }
  }
  const nextElement = polygon.nextElementSibling;
  if (nextElement && nextElement.classList.contains("space-label")) {
    if (name) {
      nextElement.setAttribute("data-space-name", name);
    }
    return nextElement;
  }
  return null;
};

const updatePolygonLabelPosition = (polygon, points) => {
  const label = getPolygonLabel(polygon);
  if (!label || points.length === 0) {
    return;
  }
  const centroid = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= points.length;
  centroid.y /= points.length;
  label.setAttribute("x", centroid.x.toString());
  label.setAttribute("y", centroid.y.toString());
};

const findSpacePolygonByName = (name) => {
  if (!lassoState.spacesLayer || !name) {
    return null;
  }
  const escapedName = escapeSelectorValue(name);
  return lassoState.spacesLayer.querySelector(
    `.space-polygon[data-space-name="${escapedName}"]`
  );
};

const findSpacePolygonById = (id) => {
  if (!lassoState.spacesLayer || !id) {
    return null;
  }
  const escapedId = escapeSelectorValue(String(id));
  return lassoState.spacesLayer.querySelector(
    `.space-polygon[data-space-id="${escapedId}"]`
  );
};

const findSpacePolygon = (space) => {
  if (!space) {
    return null;
  }
  if (space.id) {
    const byId = findSpacePolygonById(space.id);
    if (byId) {
      return byId;
    }
  }
  return findSpacePolygonByName(space.name);
};

const getSpaceColor = (space) => {
  if (space?.color) {
    return space.color;
  }
  const polygon = findSpacePolygon(space);
  if (!polygon) {
    return null;
  }
  return polygon.getAttribute("data-space-color") || polygon.getAttribute("fill");
};

const highlightSpaceListItem = (spaceName, spaceId = null) => {
  if (!floorSpacesList) {
    return;
  }
  const items = floorSpacesList.querySelectorAll(".space-list-item");
  items.forEach((item) => {
    const name = item.dataset.spaceName || "";
    const id = item.dataset.spaceId || "";
    const matchById = spaceId !== null && spaceId !== "" && id === String(spaceId);
    const matchByName = Boolean(spaceName && name === spaceName);
    item.classList.toggle("is-selected", matchById || matchByName);
  });
};

const updateSpaceListColors = () => {
  if (!floorSpacesList) {
    return;
  }
  floorSpacesList.querySelectorAll(".space-list-item").forEach((item) => {
    const id = item.dataset.spaceId ? Number(item.dataset.spaceId) : null;
    const name = item.dataset.spaceName || "";
    const color = getSpaceColor({ id, name }) || "#e2e8f0";
    const dot = item.querySelector(".space-color-dot");
    if (dot) {
      dot.style.background = color;
    }
  });
};

const selectSpaceFromList = (space) => {
  if (!space || !space.name) {
    return;
  }
  if (!isFloorEditing && space.kind === "coworking" && space.id) {
    const buildingId = currentBuilding?.id;
    const floorLevel = currentFloor?.level;
    if (buildingId && Number.isFinite(floorLevel)) {
      window.location.assign(
        `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(
          floorLevel
        )}/spaces/${encodeURIComponent(space.id)}`
      );
      return;
    }
    window.location.assign(`/buildings/${encodeURIComponent(buildingId || "")}`);
    return;
  }
  if (!lassoState.spacesLayer) {
    setFloorStatus("Сначала загрузите план этажа.", "error");
    return;
  }
  const polygon = findSpacePolygon(space);
  if (!polygon) {
    setFloorStatus("Пространство не найдено на плане.", "error");
    return;
  }
  clearFloorStatus();
  selectSpacePolygon(polygon, { showHandles: false });
};

const renderFloorSpaces = (spaces) => {
  if (!floorSpacesList || !floorSpacesEmpty) {
    return;
  }
  currentSpaces = Array.isArray(spaces) ? spaces : [];
  floorSpacesList.innerHTML = "";
  if (currentSpaces.length === 0) {
    floorSpacesEmpty.classList.toggle("is-hidden", !isFloorEditing);
    updateFloorPlanSpacesVisibility();
    return;
  }
  floorSpacesEmpty.classList.add("is-hidden");
  const kindOrder = Object.keys(spaceKindLabels);
  const kindRank = new Map(kindOrder.map((kind, index) => [kind, index]));
  const getSpaceKindGroup = (space) =>
    space?.kind && spaceKindLabels[space.kind] ? space.kind : "";
  const sortedSpaces = [...currentSpaces].sort((left, right) => {
    const leftKind = getSpaceKindGroup(left);
    const rightKind = getSpaceKindGroup(right);
    const leftRank = kindRank.has(leftKind) ? kindRank.get(leftKind) : kindOrder.length;
    const rightRank = kindRank.has(rightKind) ? kindRank.get(rightKind) : kindOrder.length;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    const leftLabel = getSpaceKindLabel(leftKind);
    const rightLabel = getSpaceKindLabel(rightKind);
    if (leftLabel !== rightLabel) {
      return leftLabel.localeCompare(rightLabel, "ru");
    }
    return (left?.name || "").localeCompare(right?.name || "", "ru", { sensitivity: "base" });
  });
  let lastKind = null;
  sortedSpaces.forEach((space) => {
    const kindGroup = getSpaceKindGroup(space);
    if (kindGroup !== lastKind) {
      const heading = document.createElement("div");
      heading.className = "space-kind-heading";
      heading.textContent = spaceKindPluralLabels[kindGroup] || "Без типов";
      floorSpacesList.appendChild(heading);
      lastKind = kindGroup;
    }
    const item = document.createElement("div");
    item.className = "space-list-item";
    item.dataset.spaceId = space.id ? String(space.id) : "";
    item.dataset.spaceName = space.name || "";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "space-select-button";

    const colorDot = document.createElement("span");
    colorDot.className = "space-color-dot";
    colorDot.style.background = getSpaceColor(space) || "#e2e8f0";
    selectButton.appendChild(colorDot);

    const label = document.createElement("span");
    label.className = "space-name";
    label.textContent = space.name || "Без названия";
    selectButton.appendChild(label);

    const kindLabel = getSpaceKindLabel(space.kind);
    if (kindLabel) {
      const kindTag = document.createElement("span");
      kindTag.className = "space-kind-tag";
      kindTag.textContent = kindLabel;
      selectButton.appendChild(kindTag);
    }
    if (space.kind === "meeting") {
      const capacityValue = Number(space.capacity);
      if (Number.isFinite(capacityValue) && capacityValue > 0) {
        const capacityTag = document.createElement("span");
        capacityTag.className = "space-capacity-tag";
        capacityTag.textContent = String(capacityValue);
        selectButton.appendChild(capacityTag);
      }
    }

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "space-edit-button";
    editButton.setAttribute("aria-label", "Редактировать пространство");
    editButton.textContent = "✏";

    selectButton.addEventListener("click", () => selectSpaceFromList(space));
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openSpaceModal(space);
    });
    item.addEventListener("mouseenter", () => {
      const polygon = findSpacePolygon(space);
      if (!polygon) {
        return;
      }
      polygon.classList.add("is-hover");
      updateSpaceTooltipPosition(polygon);
    });
    item.addEventListener("mouseleave", () => {
      const polygon = findSpacePolygon(space);
      if (!polygon) {
        return;
      }
      polygon.classList.remove("is-hover");
      if (spaceTooltipState.polygon === polygon) {
        hideSpaceTooltip();
      }
    });

    item.appendChild(selectButton);
    item.appendChild(editButton);
    floorSpacesList.appendChild(item);
  });
  if (spaceEditState.selectedPolygon) {
  highlightSpaceListItem(
    spaceEditState.selectedPolygon.getAttribute("data-space-name") || "",
    spaceEditState.selectedPolygon.getAttribute("data-space-id") || null
  );
  }
  updateFloorPlanSpacesVisibility();
};

const getDeskDisplayLabel = (desk) => {
  const raw = typeof desk?.label === "string" ? desk.label.trim() : "";
  return raw || "Без названия";
};

const updateDeskListSelection = () => {
  if (!spaceDesksList) {
    return;
  }
  const selectedIds = deskEditState.selectedDeskIds || new Set();
  spaceDesksList.querySelectorAll(".desk-list-item").forEach((item) => {
    const id = item.dataset.deskId || "";
    item.classList.toggle("is-selected", Boolean(id && selectedIds.has(String(id))));
  });
};

const selectDeskFromList = (desk) => {
  if (!desk?.id) {
    return;
  }
  if (!isSpaceEditing) {
    setSpacePageStatus("Сначала включите режим редактирования.", "error");
    return;
  }
  clearSpacePageStatus();
  setSelectedDesk(desk.id);
};

const renderSpaceDeskList = (desks) => {
  if (!spaceDesksList || !spaceDesksEmpty) {
    return;
  }
  const list = Array.isArray(desks) ? desks : [];
  spaceDesksList.innerHTML = "";
  if (list.length === 0) {
    spaceDesksEmpty.classList.toggle("is-hidden", !isSpaceEditing);
    return;
  }
  spaceDesksEmpty.classList.add("is-hidden");
  const sorted = [...list].sort((left, right) => {
    const leftLabel = getDeskDisplayLabel(left);
    const rightLabel = getDeskDisplayLabel(right);
    if (leftLabel !== rightLabel) {
      return leftLabel.localeCompare(rightLabel, "ru", { sensitivity: "base" });
    }
    const leftId = left?.id ? String(left.id) : "";
    const rightId = right?.id ? String(right.id) : "";
    return leftId.localeCompare(rightId, "ru");
  });
  sorted.forEach((desk) => {
    const item = document.createElement("div");
    item.className = "space-list-item desk-list-item";
    item.dataset.deskId = desk.id ? String(desk.id) : "";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "space-select-button";

    const label = document.createElement("span");
    label.className = "space-name";
    label.textContent = getDeskDisplayLabel(desk);
    selectButton.appendChild(label);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "space-edit-button";
    editButton.setAttribute("aria-label", "Редактировать стол");
    editButton.textContent = "✏";

    selectButton.addEventListener("click", () => selectDeskFromList(desk));
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openDeskModal(desk);
    });

    item.appendChild(selectButton);
    item.appendChild(editButton);
    spaceDesksList.appendChild(item);
  });
  updateDeskListSelection();
};

const collectSpacePolygons = () => {
  if (!lassoState.spacesLayer) {
    return [];
  }
  return Array.from(lassoState.spacesLayer.querySelectorAll(".space-polygon")).map((polygon) => ({
    id: polygon.dataset.spaceId ? Number(polygon.dataset.spaceId) : null,
    name: polygon.getAttribute("data-space-name") || "",
    color: polygon.getAttribute("data-space-color") || polygon.getAttribute("fill") || "",
    points: parsePolygonPoints(polygon),
  }));
};

const persistSpaceGeometry = async (space) => {
  if (!space?.id) {
    return;
  }
  const points = normalizeSpacePoints(space.points);
  if (points.length < 3) {
    return;
  }
  await apiRequest(`/api/spaces/${space.id}`, {
    method: "PUT",
    body: JSON.stringify({
      points,
      color: space.color || "",
    }),
  });
};

const syncSpacePolygons = async (spaces, { persistMissing = false } = {}) => {
  if (!lassoState.svg || !lassoState.spacesLayer) {
    return;
  }
  const existing = collectSpacePolygons();
  const byId = new Map(existing.filter((item) => item.id).map((item) => [String(item.id), item]));
  const byName = new Map(existing.filter((item) => item.name).map((item) => [item.name, item]));
  const updated = [];

  spaces.forEach((space) => {
    const normalized = normalizeSpacePoints(space.points);
    if (normalized.length >= 3) {
      space.points = normalized;
      return;
    }
    const fallback =
      (space.id && byId.get(String(space.id))) ||
      (space.name && byName.get(space.name)) ||
      null;
    if (fallback && fallback.points.length >= 3) {
      space.points = fallback.points;
      if (!space.color && fallback.color) {
        space.color = fallback.color;
      }
      if (space.id) {
        updated.push(space);
      }
    }
  });

  clearSpaceSelection();
  lassoState.spacesLayer.querySelectorAll(".space-polygon").forEach((polygon) => polygon.remove());
  lassoState.spacesLayer.querySelectorAll(".space-label").forEach((label) => label.remove());

  spaces.forEach((space) => {
    const points = normalizeSpacePoints(space.points);
    if (points.length < 3 || !space.name) {
      return;
    }
    createSpacePolygon(points, space.name, space.color || "#60a5fa", space.id, space.kind || "");
  });

  updateSpaceListColors();

  if (persistMissing && updated.length > 0) {
    await Promise.all(updated.map((space) => persistSpaceGeometry(space)));
  }
};

const saveSpacePositions = async () => {
  const polygons = collectSpacePolygons();
  const updates = polygons.filter((polygon) => polygon.id && polygon.points.length >= 3);
  if (updates.length === 0) {
    return;
  }
  await Promise.all(
    updates.map((polygon) =>
      apiRequest(`/api/spaces/${polygon.id}`, {
        method: "PUT",
        body: JSON.stringify({
          points: polygon.points,
          color: polygon.color || "",
        }),
      })
    )
  );
  currentSpaces = currentSpaces.map((space) => {
    const updated = updates.find((polygon) => polygon.id === space.id);
    if (!updated) {
      return space;
    }
    return {
      ...space,
      points: updated.points,
      color: updated.color || space.color,
    };
  });
};

const clearSpaceSelection = () => {
  if (spaceEditState.handleElements.length > 0) {
    spaceEditState.handleElements.forEach((handle) => handle.remove());
  }
  if (spaceEditState.selectedPolygon) {
    spaceEditState.selectedPolygon.classList.remove("is-selected");
  }
  spaceEditState.selectedPolygon = null;
  spaceEditState.selectedLabel = null;
  spaceEditState.handleElements = [];
  spaceEditState.points = [];
  spaceEditState.draggingIndex = null;
  spaceEditState.isDragging = false;
  spaceEditState.dragPointerId = null;
  spaceEditState.isPolygonDragging = false;
  spaceEditState.polygonDragPointerId = null;
  spaceEditState.polygonDragStartPoint = null;
  spaceEditState.polygonDragStartPoints = [];
  spaceEditState.isEditingPolygon = false;
  spaceEditState.skipClick = false;
  highlightSpaceListItem("");
};

const rebuildSpaceHandles = () => {
  if (!lassoState.handlesLayer) {
    return;
  }
  spaceEditState.handleElements.forEach((handle) => handle.remove());
  spaceEditState.handleElements = spaceEditState.points.map((point, index) => {
    const handle = document.createElementNS(svgNamespace, "circle");
    handle.classList.add("space-handle");
    handle.setAttribute("cx", point.x.toString());
    handle.setAttribute("cy", point.y.toString());
    handle.setAttribute("r", spaceEditDefaults.handleRadius.toString());
    handle.dataset.index = String(index);
    handle.addEventListener("pointerdown", (event) => {
      if (!isFloorEditing || lassoState.active) {
        return;
      }
      const now = event.timeStamp || Date.now();
      const isDoubleClick =
        spaceEditState.lastHandleClickIndex === index &&
        now - spaceEditState.lastHandleClickTime < 300;
      spaceEditState.lastHandleClickTime = now;
      spaceEditState.lastHandleClickIndex = index;
      if (isDoubleClick) {
        event.preventDefault();
        event.stopPropagation();
        if (spaceEditState.points.length <= 3) {
          setFloorStatus("У пространства должно быть минимум 3 точки.", "error");
          return;
        }
        spaceEditState.points.splice(index, 1);
        updateSelectedPolygon();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      spaceEditState.draggingIndex = index;
      spaceEditState.isDragging = true;
      spaceEditState.dragPointerId = event.pointerId;
      if (floorPlanPreview) {
        floorPlanPreview.setPointerCapture(event.pointerId);
      }
    });
    lassoState.handlesLayer.appendChild(handle);
    return handle;
  });
};

const updateSpaceHandlesPosition = () => {
  if (spaceEditState.handleElements.length === 0) {
    return;
  }
  spaceEditState.handleElements.forEach((handle, index) => {
    const point = spaceEditState.points[index];
    if (!point) {
      return;
    }
    handle.setAttribute("cx", point.x.toString());
    handle.setAttribute("cy", point.y.toString());
  });
};

const updateSelectedPolygon = () => {
  if (!spaceEditState.selectedPolygon) {
    return;
  }
  spaceEditState.selectedPolygon.setAttribute("points", stringifyPoints(spaceEditState.points));
  updatePolygonLabelPosition(spaceEditState.selectedPolygon, spaceEditState.points);
  if (spaceEditState.handleElements.length !== spaceEditState.points.length) {
    rebuildSpaceHandles();
  } else {
    updateSpaceHandlesPosition();
  }
  floorPlanDirty = true;
};

const selectSpacePolygon = (polygon, { showHandles = true } = {}) => {
  const spaceId = polygon?.getAttribute("data-space-id") || "";
  const spaceKind = polygon?.getAttribute("data-space-kind") || "";
  if (!isFloorEditing && spaceKind === "coworking" && spaceId) {
    const buildingId = currentBuilding?.id;
    const floorLevel = currentFloor?.level;
    if (buildingId && Number.isFinite(floorLevel)) {
      window.location.assign(
        `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(
          floorLevel
        )}/spaces/${encodeURIComponent(spaceId)}`
      );
      return;
    }
    window.location.assign(`/buildings/${encodeURIComponent(buildingId || "")}`);
    return;
  }
  clearSpaceSelection();
  spaceEditState.selectedPolygon = polygon;
  spaceEditState.selectedLabel = getPolygonLabel(polygon);
  spaceEditState.points = parsePolygonPoints(polygon);
  polygon.classList.add("is-selected");
  if (showHandles) {
    rebuildSpaceHandles();
  }
  highlightSpaceListItem(
    polygon.getAttribute("data-space-name") || "",
    polygon.getAttribute("data-space-id") || null
  );
};

const distanceToSegment = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.min(Math.max(t, 0), 1);
  const projX = start.x + clamped * dx;
  const projY = start.y + clamped * dy;
  return Math.hypot(point.x - projX, point.y - projY);
};

const findEdgeInsertionIndex = (points, cursorPoint, tolerance = spaceEditDefaults.edgeSnapDistance) => {
  if (points.length < 2) {
    return null;
  }
  let bestIndex = null;
  let bestDistance = Infinity;
  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    const distance = distanceToSegment(cursorPoint, point, nextPoint);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  if (bestDistance <= tolerance) {
    return bestIndex;
  }
  return null;
};

const getEdgeSnapTolerance = () => {
  const scale = floorPlanState.scale || 1;
  const scaled = spaceEditDefaults.edgeSnapDistance / Math.max(scale, 0.1);
  return Math.min(Math.max(scaled, 4), 24);
};

const findSpacePolygonFromEvent = (event) => {
  const target = event.target;
  if (target instanceof SVGElement) {
    const polygonTarget =
      typeof target.closest === "function" ? target.closest(".space-polygon") : null;
    if (polygonTarget && polygonTarget instanceof SVGElement) {
      return polygonTarget;
    }
    if (target.classList.contains("space-polygon")) {
      return target;
    }
  }
  if (typeof event.composedPath === "function") {
    const path = event.composedPath();
    const polygonInPath = path.find(
      (node) => node instanceof SVGElement && node.classList?.contains("space-polygon")
    );
    if (polygonInPath) {
      return polygonInPath;
    }
  }
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    if (hit instanceof SVGElement) {
      const polygonHit =
        typeof hit.closest === "function" ? hit.closest(".space-polygon") : null;
      if (polygonHit && polygonHit instanceof SVGElement) {
        return polygonHit;
      }
      if (hit.classList.contains("space-polygon")) {
        return hit;
      }
    }
  }
  return null;
};

const startPolygonDrag = (event, polygon) => {
  if (!isFloorEditing || lassoState.active) {
    return;
  }
  if (!polygon) {
    return;
  }
  if (!spaceEditState.isEditingPolygon || spaceEditState.selectedPolygon !== polygon) {
    return;
  }
  const point = getSvgPoint(event);
  if (!point) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (spaceEditState.selectedPolygon !== polygon) {
    selectSpacePolygon(polygon);
  }
  spaceEditState.polygonDragPointerId = event.pointerId;
  spaceEditState.polygonDragStartPoint = point;
  spaceEditState.polygonDragStartPoints = spaceEditState.points.map((p) => ({ ...p }));
  spaceEditState.isPolygonDragging = false;
  if (floorPlanPreview) {
    floorPlanPreview.setPointerCapture(event.pointerId);
  }
};

const ensureSpaceTooltip = () => {
  if (!floorPlanPreview) {
    return null;
  }
  if (!spaceTooltipState.element) {
    const tooltip = document.createElement("div");
    tooltip.className = "space-tooltip is-hidden";
    floorPlanPreview.appendChild(tooltip);
    spaceTooltipState.element = tooltip;
  }
  return spaceTooltipState.element;
};

const hideSpaceTooltip = () => {
  const tooltip = ensureSpaceTooltip();
  if (!tooltip) {
    return;
  }
  tooltip.classList.add("is-hidden");
  spaceTooltipState.polygon = null;
};

const getPolygonTopScreenPoint = (polygon) => {
  const points = parsePolygonPoints(polygon);
  if (points.length === 0) {
    return null;
  }
  const svg = polygon.ownerSVGElement;
  if (!svg) {
    return null;
  }
  const matrix = polygon.getScreenCTM();
  if (!matrix) {
    return null;
  }
  const svgPoint = svg.createSVGPoint();
  let best = null;
  points.forEach((point) => {
    svgPoint.x = point.x;
    svgPoint.y = point.y;
    const screenPoint = svgPoint.matrixTransform(matrix);
    if (!best || screenPoint.y < best.y) {
      best = { x: screenPoint.x, y: screenPoint.y };
    }
  });
  return best;
};

const updateSpaceTooltipPosition = (polygon) => {
  const tooltip = ensureSpaceTooltip();
  if (!tooltip || !floorPlanPreview) {
    return;
  }
  const name = polygon.getAttribute("data-space-name") || "";
  if (!name) {
    hideSpaceTooltip();
    return;
  }
  const screenPoint = getPolygonTopScreenPoint(polygon);
  if (!screenPoint) {
    hideSpaceTooltip();
    return;
  }
  const rect = floorPlanPreview.getBoundingClientRect();
  tooltip.style.left = `${screenPoint.x - rect.left}px`;
  tooltip.style.top = `${screenPoint.y - rect.top}px`;
  tooltip.textContent = name;
  tooltip.classList.remove("is-hidden");
  spaceTooltipState.polygon = polygon;
};

const updateSpaceTooltipFromEvent = (event) => {
  const polygon = findSpacePolygonFromEvent(event);
  if (!polygon) {
    hideSpaceTooltip();
    return;
  }
  updateSpaceTooltipPosition(polygon);
};

const bindSpaceInteractions = (svg) => {
  if (!svg || svg.dataset.spaceInteractions === "true") {
    return;
  }
  svg.dataset.spaceInteractions = "true";
  svg.addEventListener("pointerdown", (event) => {
    if (lassoState.active) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const target = event.target;
    const handleTarget =
      target instanceof SVGElement && typeof target.closest === "function"
        ? target.closest(".space-handle")
        : null;
    if (handleTarget || (target instanceof SVGElement && target.classList.contains("space-handle"))) {
      return;
    }
    const polygon = findSpacePolygonFromEvent(event);
    if (!polygon) {
      return;
    }
    startPolygonDrag(event, polygon);
  });
  svg.addEventListener("dblclick", (event) => {
    if (!isFloorEditing || lassoState.active) {
      return;
    }
    clearPendingSelect();
    const polygon = findSpacePolygonFromEvent(event);
    if (polygon) {
      event.preventDefault();
      event.stopPropagation();
      selectSpacePolygon(polygon);
      spaceEditState.isEditingPolygon = true;
    }
  });
  svg.addEventListener("click", (event) => {
    if (!isFloorEditing || lassoState.active) {
      return;
    }
    if (spaceEditState.skipClick) {
      spaceEditState.skipClick = false;
      return;
    }
    const polygon = findSpacePolygonFromEvent(event);
    if (!polygon) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    selectSpacePolygon(polygon, { showHandles: false });
  });
};

const updateFloorPlanActionLabel = () => {
  if (uploadFloorPlanBtn) {
    uploadFloorPlanBtn.textContent = hasFloorPlan ? "Изменить план" : "Загрузить план";
  }
  if (floorPlanActionLabel) {
    floorPlanActionLabel.textContent = hasFloorPlan
      ? "Новый план этажа (изображение)"
      : "План этажа (изображение)";
  }
  if (deleteFloorPlanBtn) {
    deleteFloorPlanBtn.classList.toggle("is-hidden", !hasFloorPlan);
    deleteFloorPlanBtn.setAttribute("aria-hidden", String(!hasFloorPlan));
    deleteFloorPlanBtn.disabled = !hasFloorPlan;
  }
};

const resetFloorEditForm = () => {
  if (floorPlanFile) {
    floorPlanFile.value = "";
  }
  cancelLassoMode();
  closeSpaceModal();
};

const openFloorPlanModal = () => {
  if (!floorPlanModal) {
    return;
  }
  if (!floorPlanModal.classList.contains("is-open")) {
    floorPlanModal.classList.add("is-open");
    floorPlanModal.setAttribute("aria-hidden", "false");
  }
  document.body.classList.add("modal-open");
};

const closeFloorPlanModal = () => {
  if (!floorPlanModal) {
    return;
  }
  floorPlanModal.classList.remove("is-open");
  floorPlanModal.setAttribute("aria-hidden", "true");
  floorPlanModalRequested = false;
  if (
    !buildingModal.classList.contains("is-open") &&
    !(spaceModal && spaceModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
};

const updateFloorPlanSpacesVisibility = () => {
  const hasSpaces = currentSpaces.length > 0;
  if (floorPlanLayout) {
    floorPlanLayout.classList.toggle("has-floor-plan", hasFloorPlan);
    floorPlanLayout.classList.toggle("has-space-list", hasSpaces);
    floorPlanLayout.classList.toggle("is-viewing-spaces", hasSpaces && !isFloorEditing);
  }
  const shouldShowSpaces = (isFloorEditing && hasFloorPlan) || (!isFloorEditing && hasSpaces);
  const shouldShowModal = isFloorEditing && (!hasFloorPlan || floorPlanModalRequested);

  if (shouldShowModal) {
    openFloorPlanModal();
  } else {
    closeFloorPlanModal();
  }

  if (!floorPlanSpaces) {
    return;
  }
  floorPlanSpaces.classList.toggle("is-hidden", !shouldShowSpaces);
  floorPlanSpaces.setAttribute("aria-hidden", String(!shouldShowSpaces));
  if (floorPlanActions) {
    const shouldShowActions = isFloorEditing && !shouldShowModal;
    floorPlanActions.classList.toggle("is-hidden", !shouldShowActions);
    floorPlanActions.setAttribute("aria-hidden", String(!shouldShowActions));
  }
};

const setFloorEditMode = (editing) => {
  isFloorEditing = editing;
  document.body.classList.toggle("floor-editing", editing);
  if (floorPlanLayout) {
    floorPlanLayout.classList.toggle("is-editing", editing);
  }
  if (headerActions) {
    headerActions.classList.toggle("floor-edit-actions", editing);
  }
  updateFloorPlanSpacesVisibility();
  if (cancelFloorEditBtn) {
    cancelFloorEditBtn.classList.toggle("is-hidden", !editing);
  }
  if (cancelFloorEditBtn && headerActions && cancelFloorEditHome?.parent) {
    if (editing) {
      if (!headerActions.contains(cancelFloorEditBtn)) {
        if (editFloorBtn && editFloorBtn.parentElement === headerActions) {
          headerActions.insertBefore(cancelFloorEditBtn, editFloorBtn.nextSibling);
        } else {
          headerActions.appendChild(cancelFloorEditBtn);
        }
      }
    } else if (!cancelFloorEditHome.parent.contains(cancelFloorEditBtn)) {
      if (
        cancelFloorEditHome.nextSibling &&
        cancelFloorEditHome.nextSibling.parentElement === cancelFloorEditHome.parent
      ) {
        cancelFloorEditHome.parent.insertBefore(
          cancelFloorEditBtn,
          cancelFloorEditHome.nextSibling
        );
      } else {
        cancelFloorEditHome.parent.appendChild(cancelFloorEditBtn);
      }
    }
  }
  if (editFloorBtn) {
    editFloorBtn.textContent = editing ? "Сохранить" : "Редактировать";
    editFloorBtn.classList.toggle("primary", editing);
    editFloorBtn.classList.toggle("ghost", !editing);
  }
  if (!editing) {
    clearSpaceSelection();
    resetFloorEditForm();
  }
};

const setDeskPlacementActive = (active) => {
  isDeskPlacementActive = active;
  if (addDeskBtn) {
    addDeskBtn.textContent = active ? addDeskBtnActiveIcon : addDeskBtnIcon;
    addDeskBtn.setAttribute("aria-label", active ? addDeskBtnActiveLabel : addDeskBtnLabel);
    addDeskBtn.title = active ? addDeskBtnActiveLabel : addDeskBtnLabel;
    addDeskBtn.setAttribute("aria-pressed", String(active));
  }
  if (spaceSnapshot) {
    spaceSnapshot.classList.toggle("is-desk-placing", active);
  }
};

const updateDeskClipboardButtons = () => {
  const canEdit = Boolean(currentSpace && currentSpace.kind === "coworking");
  const selectedCount = deskEditState.selectedDeskIds ? deskEditState.selectedDeskIds.size : 0;
  if (copyDeskBtn) {
    copyDeskBtn.classList.toggle("is-hidden", !isSpaceEditing || !canEdit);
    copyDeskBtn.disabled = selectedCount === 0;
  }
  if (pasteDeskBtn) {
    pasteDeskBtn.classList.toggle("is-hidden", !isSpaceEditing || !canEdit);
    pasteDeskBtn.disabled = !copiedDesk || !copiedDesk.desks || copiedDesk.desks.length === 0;
  }
};

const scheduleDeskRender = () => {
  if (pendingDeskRender) {
    return;
  }
  pendingDeskRender = true;
  requestAnimationFrame(() => {
    pendingDeskRender = false;
    renderSpaceDesks(currentDesks);
  });
};

const setSpaceEditMode = (editing) => {
  isSpaceEditing = editing;
  document.body.classList.toggle("space-editing", editing);
  if (spaceLayout) {
    spaceLayout.classList.toggle("is-editing", editing);
  }
  if (spaceDesksPanel) {
    spaceDesksPanel.setAttribute("aria-hidden", String(!editing));
  }
  if (spaceSnapshot) {
    spaceSnapshot.classList.toggle("is-editing", editing);
  }
  if (addDeskBtn) {
    const canEdit = Boolean(currentSpace && currentSpace.kind === "coworking");
    addDeskBtn.classList.toggle("is-hidden", !editing || !canEdit);
  }
  if (deleteDeskBtn) {
    deleteDeskBtn.classList.toggle("is-hidden", !editing);
    const selectedCount = deskEditState.selectedDeskIds ? deskEditState.selectedDeskIds.size : 0;
    deleteDeskBtn.disabled = selectedCount === 0;
  }
  updateDeskClipboardButtons();
  if (shrinkDeskBtn) {
    shrinkDeskBtn.classList.toggle("is-hidden", !editing);
    const selectedCount = deskEditState.selectedDeskIds ? deskEditState.selectedDeskIds.size : 0;
    shrinkDeskBtn.disabled = selectedCount !== 1;
  }
  if (rotateDeskBtn) {
    rotateDeskBtn.classList.toggle("is-hidden", !editing);
    const selectedCount = deskEditState.selectedDeskIds ? deskEditState.selectedDeskIds.size : 0;
    rotateDeskBtn.disabled = selectedCount !== 1;
  }
  if (editSpaceBtn) {
    editSpaceBtn.textContent = editing ? "Сохранить" : "Редактировать";
    editSpaceBtn.classList.toggle("primary", editing);
    editSpaceBtn.classList.toggle("ghost", !editing);
  }
  if (cancelSpaceEditBtn) {
    cancelSpaceEditBtn.classList.toggle("is-hidden", !editing);
  }
  if (spaceSnapshot) {
    scheduleDeskRender();
  }
  renderSpaceDeskList(currentDesks);
  if (!editing) {
    setSelectedDesk(null);
    setDeskPlacementActive(false);
    renderSpaceDesks(currentDesks);
    clearSpacePageStatus();
  }
};

const getSnapshotSvg = () => (spaceSnapshotCanvas ? spaceSnapshotCanvas.querySelector("svg") : null);

const parseViewBox = (svg) => {
  if (!svg) {
    return null;
  }
  const raw = (svg.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
  if (raw.length !== 4 || raw.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return {
    minX: raw[0],
    minY: raw[1],
    width: raw[2],
    height: raw[3],
  };
};

const getDeskDimensions = (desk) => {
  const width = Number.isFinite(desk?.width) && desk.width > 0 ? desk.width : deskPixelWidth;
  const height = Number.isFinite(desk?.height) && desk.height > 0 ? desk.height : deskPixelHeight;
  return { width, height };
};

const getDeskMetrics = (svg, desk) => {
  const viewBox = parseViewBox(svg);
  const rect = svg ? svg.getBoundingClientRect() : null;
  const rectWidth = rect && rect.width ? rect.width : 0;
  const rectHeight = rect && rect.height ? rect.height : 0;
  const dimensions = getDeskDimensions(desk);
  if (!viewBox || rectWidth === 0 || rectHeight === 0) {
    return {
      width: dimensions.width,
      height: dimensions.height,
      scaleX: 1,
      scaleY: 1,
      viewBox,
    };
  }
  const scaleX = viewBox.width / rectWidth;
  const scaleY = viewBox.height / rectHeight;
  return {
    width: dimensions.width,
    height: dimensions.height,
    scaleX,
    scaleY,
    viewBox,
  };
};

const getDeskSnapTolerance = (metrics) => {
  const scaleX = metrics?.scaleX || 1;
  const scaleY = metrics?.scaleY || 1;
  return {
    x: deskSnapDistance * scaleX,
    y: deskSnapDistance * scaleY,
  };
};

const getDeskSnapLines = (deskId) => {
  const xLines = [];
  const yLines = [];
  currentDesks.forEach((desk) => {
    if (!desk || String(desk.id) === String(deskId)) {
      return;
    }
    const dimensions = getDeskDimensions(desk);
    const halfWidth = dimensions.width / 2;
    const halfHeight = dimensions.height / 2;
    xLines.push(desk.x, desk.x - halfWidth, desk.x + halfWidth);
    yLines.push(desk.y, desk.y - halfHeight, desk.y + halfHeight);
  });
  return { xLines, yLines };
};

const snapDeskCenter = (rawX, rawY, desk, metrics) => {
  const tolerance = getDeskSnapTolerance(metrics);
  const { xLines, yLines } = getDeskSnapLines(desk.id);
  if (xLines.length === 0 && yLines.length === 0) {
    return { x: rawX, y: rawY };
  }
  const dimensions = getDeskDimensions(desk);
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  let nextX = rawX;
  let nextY = rawY;
  let bestDx = tolerance.x + 1;
  let bestDy = tolerance.y + 1;
  const xCandidates = [0, halfWidth, -halfWidth];
  const yCandidates = [0, halfHeight, -halfHeight];

  xLines.forEach((line) => {
    xCandidates.forEach((offset) => {
      const candidate = line - offset;
      const delta = Math.abs(candidate - rawX);
      if (delta <= tolerance.x && delta < bestDx) {
        bestDx = delta;
        nextX = candidate;
      }
    });
  });

  yLines.forEach((line) => {
    yCandidates.forEach((offset) => {
      const candidate = line - offset;
      const delta = Math.abs(candidate - rawY);
      if (delta <= tolerance.y && delta < bestDy) {
        bestDy = delta;
        nextY = candidate;
      }
    });
  });

  return { x: nextX, y: nextY };
};

const snapRotation = (rotationDeg) => {
  const steps = [0, 90, 180, 270];
  let closest = rotationDeg;
  let minDelta = deskRotationSnapTolerance + 1;
  steps.forEach((step) => {
    const delta = Math.abs((((rotationDeg - step + 540) % 360) - 180));
    if (delta <= deskRotationSnapTolerance && delta < minDelta) {
      minDelta = delta;
      closest = step;
    }
  });
  return closest;
};

const ensureDeskLayer = (svg) => {
  if (!svg) {
    return null;
  }
  let layer = svg.querySelector("#spaceDesksLayer");
  if (!layer) {
    layer = document.createElementNS(svgNamespace, "g");
    layer.setAttribute("id", "spaceDesksLayer");
    const clipId = svg.getAttribute("data-clip-id");
    if (clipId) {
      layer.setAttribute("clip-path", `url(#${clipId})`);
    }
    svg.appendChild(layer);
  }
  return layer;
};

const ensureDeskOverlayLayer = (svg) => {
  if (!svg) {
    return null;
  }
  let layer = svg.querySelector("#spaceDesksOverlay");
  if (!layer) {
    layer = document.createElementNS(svgNamespace, "g");
    layer.setAttribute("id", "spaceDesksOverlay");
    svg.appendChild(layer);
  }
  return layer;
};

const findDeskById = (deskId) =>
  currentDesks.find((desk) => String(desk.id) === String(deskId)) || null;

const getSelectedDeskIds = () => Array.from(deskEditState.selectedDeskIds || []);

const isDeskSelected = (deskId) =>
  deskEditState.selectedDeskIds ? deskEditState.selectedDeskIds.has(String(deskId)) : false;

const getSelectedDesks = () => getSelectedDeskIds().map(findDeskById).filter(Boolean);

const getDeskRect = (desk) => {
  const dimensions = getDeskDimensions(desk);
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  return {
    left: desk.x - halfWidth,
    right: desk.x + halfWidth,
    top: desk.y - halfHeight,
    bottom: desk.y + halfHeight,
    width: dimensions.width,
    height: dimensions.height,
  };
};

const getGroupBounds = (desks = []) => {
  if (desks.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  desks.forEach((desk) => {
    if (!desk) {
      return;
    }
    const rect = getDeskRect(desk);
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
};

const clampGroupDragDelta = (bounds, groupBounds, deltaX, deltaY) => {
  if (!bounds || !groupBounds) {
    return { deltaX, deltaY };
  }
  const minDeltaX = bounds.minX - groupBounds.minX;
  const maxDeltaX = bounds.minX + bounds.width - groupBounds.maxX;
  const minDeltaY = bounds.minY - groupBounds.minY;
  const maxDeltaY = bounds.minY + bounds.height - groupBounds.maxY;
  return {
    deltaX: Math.min(Math.max(deltaX, minDeltaX), maxDeltaX),
    deltaY: Math.min(Math.max(deltaY, minDeltaY), maxDeltaY),
  };
};

const setSelectedDesk = (deskId, options = {}) => {
  const { toggle = false, additive = false } = options;
  if (!deskEditState.selectedDeskIds) {
    deskEditState.selectedDeskIds = new Set();
  }
  const selectedIds = deskEditState.selectedDeskIds;
  if (!deskId) {
    selectedIds.clear();
    deskEditState.selectedDeskId = null;
  } else {
    const id = String(deskId);
    if (toggle) {
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
        if (deskEditState.selectedDeskId === id) {
          deskEditState.selectedDeskId = selectedIds.values().next().value || null;
        }
      } else {
        selectedIds.add(id);
        deskEditState.selectedDeskId = id;
      }
    } else if (additive) {
      selectedIds.add(id);
      deskEditState.selectedDeskId = id;
    } else {
      selectedIds.clear();
      selectedIds.add(id);
      deskEditState.selectedDeskId = id;
    }
  }
  const svg = getSnapshotSvg();
  if (svg) {
    svg.querySelectorAll(".space-desk").forEach((group) => {
      const id = group.getAttribute("data-desk-id");
      group.classList.toggle("is-selected", Boolean(id && selectedIds.has(String(id))));
    });
  }
  const selectedCount = selectedIds.size;
  if (deleteDeskBtn) {
    deleteDeskBtn.disabled = selectedCount === 0;
  }
  if (shrinkDeskBtn) {
    shrinkDeskBtn.disabled = selectedCount !== 1;
  }
  if (rotateDeskBtn) {
    rotateDeskBtn.disabled = selectedCount !== 1;
  }
  updateDeskClipboardButtons();
  updateDeskListSelection();
  if (isSpaceEditing) {
    renderSpaceDesks(currentDesks);
  }
};

const updateDeskElementPosition = (group, desk, metrics) => {
  if (!group || !desk || !metrics) {
    return;
  }
  const rect = group.querySelector(".space-desk-shape");
  const label = group.querySelector(".space-desk-label");
  const width = metrics.width;
  const height = metrics.height;
  const rotation = Number.isFinite(desk.rotation) ? desk.rotation : 0;
  if (rect) {
    rect.setAttribute("x", String(desk.x - width / 2));
    rect.setAttribute("y", String(desk.y - height / 2));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", String(Math.min(width, height) * 0.1));
  }
  if (label) {
    label.setAttribute("x", String(desk.x));
    label.setAttribute("y", String(desk.y));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("transform", `rotate(${-rotation} ${desk.x} ${desk.y})`);
  }
  const handlesGroup = group.querySelector(".desk-handles");
  if (handlesGroup) {
    const handleSize = 10 * ((metrics.scaleX + metrics.scaleY) / 2);
    const handleHalf = handleSize / 2;
    const handleRadius = Math.max(1, Math.min(3, handleSize * 0.2));
    const rotateOffset = 26 * ((metrics.scaleX + metrics.scaleY) / 2);
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const bounds = handlesGroup.querySelector(".desk-bounds");
    if (bounds) {
      bounds.setAttribute("x", String(desk.x - halfWidth));
      bounds.setAttribute("y", String(desk.y - halfHeight));
      bounds.setAttribute("width", String(width));
      bounds.setAttribute("height", String(height));
    }

    const rotateLine = handlesGroup.querySelector(".desk-rotate-line");
    if (rotateLine) {
      rotateLine.setAttribute("x1", String(desk.x));
      rotateLine.setAttribute("y1", String(desk.y - halfHeight));
      rotateLine.setAttribute("x2", String(desk.x));
      rotateLine.setAttribute("y2", String(desk.y - halfHeight - rotateOffset));
    }

    const handlePositions = {
      n: { x: 0, y: -halfHeight },
      ne: { x: halfWidth, y: -halfHeight },
      e: { x: halfWidth, y: 0 },
      se: { x: halfWidth, y: halfHeight },
      s: { x: 0, y: halfHeight },
      sw: { x: -halfWidth, y: halfHeight },
      w: { x: -halfWidth, y: 0 },
      nw: { x: -halfWidth, y: -halfHeight },
    };

    handlesGroup.querySelectorAll(".desk-handle-resize").forEach((handle) => {
      const key = handle.dataset.handle;
      const position = handlePositions[key];
      if (!position) {
        return;
      }
      handle.setAttribute("x", String(desk.x + position.x - handleHalf));
      handle.setAttribute("y", String(desk.y + position.y - handleHalf));
      handle.setAttribute("width", String(handleSize));
      handle.setAttribute("height", String(handleSize));
      handle.setAttribute("rx", String(handleRadius));
      handle.setAttribute("ry", String(handleRadius));
    });

    const rotateHandle = handlesGroup.querySelector(".desk-handle-rotate");
    if (rotateHandle) {
      rotateHandle.setAttribute("x", String(desk.x - handleHalf));
      rotateHandle.setAttribute("y", String(desk.y - halfHeight - rotateOffset - handleHalf));
      rotateHandle.setAttribute("width", String(handleSize));
      rotateHandle.setAttribute("height", String(handleSize));
      rotateHandle.setAttribute("rx", String(handleRadius));
      rotateHandle.setAttribute("ry", String(handleRadius));
    }
  }
  group.setAttribute("transform", `rotate(${rotation} ${desk.x} ${desk.y})`);
};

const getDeskRotationRadians = (desk) =>
  ((Number.isFinite(desk?.rotation) ? desk.rotation : 0) * Math.PI) / 180;

const clampDeskPosition = (x, y, metrics) => {
  if (!metrics?.viewBox && !currentSpaceBounds) {
    return { x, y };
  }
  const bounds = currentSpaceBounds || metrics.viewBox;
  if (!bounds) {
    return { x, y };
  }
  const minX = bounds.minX + metrics.width / 2;
  const maxX = bounds.minX + bounds.width - metrics.width / 2;
  const minY = bounds.minY + metrics.height / 2;
  const maxY = bounds.minY + bounds.height - metrics.height / 2;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
};

const clampDeskCenterToBounds = (x, y, width, height, bounds) => {
  if (!bounds) {
    return { x, y };
  }
  const minX = bounds.minX + width / 2;
  const maxX = bounds.minX + bounds.width - width / 2;
  const minY = bounds.minY + height / 2;
  const maxY = bounds.minY + bounds.height - height / 2;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
};

const normalizeDeskForBounds = (desk, bounds) => {
  const normalized = { ...desk };
  const rawWidth = Number(desk?.width);
  const rawHeight = Number(desk?.height);
  let width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : deskPixelWidth;
  let height = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : deskPixelHeight;
  if (bounds) {
    const minWidth = Math.min(deskMinWidth, bounds.width);
    const minHeight = Math.min(deskMinHeight, bounds.height);
    width = Math.min(width, bounds.width);
    height = Math.min(height, bounds.height);
    width = Math.max(width, minWidth);
    height = Math.max(height, minHeight);
  } else {
    width = Math.max(width, deskMinWidth);
    height = Math.max(height, deskMinHeight);
  }
  const rawX = Number(desk?.x);
  const rawY = Number(desk?.y);
  const fallbackX = bounds ? bounds.minX + bounds.width / 2 : 0;
  const fallbackY = bounds ? bounds.minY + bounds.height / 2 : 0;
  let x = Number.isFinite(rawX) ? rawX : fallbackX;
  let y = Number.isFinite(rawY) ? rawY : fallbackY;
  const clamped = clampDeskCenterToBounds(x, y, width, height, bounds);
  x = clamped.x;
  y = clamped.y;
  const changed = width !== desk.width || height !== desk.height || x !== desk.x || y !== desk.y;
  normalized.width = width;
  normalized.height = height;
  normalized.x = x;
  normalized.y = y;
  return { normalized, changed };
};

const normalizeDesksForCurrentSpace = (desks = []) => {
  if (!currentSpaceBounds) {
    return { desks, updates: [] };
  }
  const updates = [];
  const normalized = desks.map((desk) => {
    const result = normalizeDeskForBounds(desk, currentSpaceBounds);
    if (result.changed && desk?.id) {
      updates.push({
        id: desk.id,
        payload: {
          x: result.normalized.x,
          y: result.normalized.y,
          width: result.normalized.width,
          height: result.normalized.height,
        },
      });
    }
    return result.normalized;
  });
  return { desks: normalized, updates };
};

const persistDeskNormalizationUpdates = async (updates = []) => {
  for (const update of updates) {
    try {
      const updated = await apiRequest(`/api/desks/${update.id}`, {
        method: "PUT",
        body: JSON.stringify(update.payload),
      });
      if (updated) {
        const index = currentDesks.findIndex((desk) => String(desk.id) === String(update.id));
        if (index >= 0) {
          currentDesks[index] = updated;
        }
      }
    } catch (error) {
      setSpacePageStatus(error.message, "error");
    }
  }
  renderSpaceDesks(currentDesks);
};

const updateDeskPositionLocal = (deskId, x, y) => {
  const desk = findDeskById(deskId);
  if (!desk) {
    return;
  }
  desk.x = x;
  desk.y = y;
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const metrics = getDeskMetrics(svg, desk);
  const group = svg.querySelector(`.space-desk[data-desk-id="${String(deskId)}"]`);
  updateDeskElementPosition(group, desk, metrics);
};

const updateDeskDimensionsLocal = (deskId, width, height) => {
  const desk = findDeskById(deskId);
  if (!desk) {
    return;
  }
  desk.width = width;
  desk.height = height;
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const metrics = getDeskMetrics(svg, desk);
  const clamped = clampDeskPosition(desk.x, desk.y, metrics);
  desk.x = clamped.x;
  desk.y = clamped.y;
  const group = svg.querySelector(`.space-desk[data-desk-id="${String(deskId)}"]`);
  updateDeskElementPosition(group, desk, metrics);
};

const renderGroupSelectionOverlay = () => {
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const overlay = ensureDeskOverlayLayer(svg);
  if (!overlay) {
    return;
  }
  overlay.innerHTML = "";
  if (!isSpaceEditing) {
    return;
  }
  const selectedIds = getSelectedDeskIds();
  if (selectedIds.length <= 1) {
    return;
  }
  const selectedDesks = getSelectedDesks();
  const groupBounds = getGroupBounds(selectedDesks);
  if (!groupBounds) {
    return;
  }
  const metrics = getDeskMetrics(svg, null);
  const handles = document.createElementNS(svgNamespace, "g");
  handles.classList.add("desk-handles", "desk-group-handles");

  const bounds = document.createElementNS(svgNamespace, "rect");
  bounds.classList.add("desk-bounds");
  bounds.setAttribute("x", String(groupBounds.minX));
  bounds.setAttribute("y", String(groupBounds.minY));
  bounds.setAttribute("width", String(groupBounds.width));
  bounds.setAttribute("height", String(groupBounds.height));
  handles.appendChild(bounds);

  const handleSize = 10 * ((metrics.scaleX + metrics.scaleY) / 2);
  const handleHalf = handleSize / 2;
  const handleRadius = Math.max(1, Math.min(3, handleSize * 0.2));
  const halfWidth = groupBounds.width / 2;
  const halfHeight = groupBounds.height / 2;
  const handlePositions = {
    n: { x: 0, y: -halfHeight },
    ne: { x: halfWidth, y: -halfHeight },
    e: { x: halfWidth, y: 0 },
    se: { x: halfWidth, y: halfHeight },
    s: { x: 0, y: halfHeight },
    sw: { x: -halfWidth, y: halfHeight },
    w: { x: -halfWidth, y: 0 },
    nw: { x: -halfWidth, y: -halfHeight },
  };

  Object.entries(handlePositions).forEach(([handleKey, position]) => {
    const resizeHandle = document.createElementNS(svgNamespace, "rect");
    resizeHandle.classList.add("desk-handle", "desk-handle-resize", `desk-handle-${handleKey}`);
    resizeHandle.dataset.handle = handleKey;
    resizeHandle.setAttribute("x", String(groupBounds.centerX + position.x - handleHalf));
    resizeHandle.setAttribute("y", String(groupBounds.centerY + position.y - handleHalf));
    resizeHandle.setAttribute("width", String(handleSize));
    resizeHandle.setAttribute("height", String(handleSize));
    resizeHandle.setAttribute("rx", String(handleRadius));
    resizeHandle.setAttribute("ry", String(handleRadius));

    resizeHandle.addEventListener("pointerdown", (event) => {
      if (!isSpaceEditing || isDeskPlacementActive) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const point = getSnapshotPoint(event, svg);
      if (!point) {
        return;
      }
      deskEditState.draggingDeskId = null;
      deskEditState.draggingDeskIds = null;
      deskEditState.transformMode = "group-resize";
      deskEditState.transformHandle = handleKey;
      deskEditState.transformPointerId = event.pointerId;
      deskEditState.groupTransformStartBounds = groupBounds;
      deskEditState.groupTransformStartDesks = new Map(
        selectedDesks.map((item) => [
          String(item.id),
          {
            x: item.x,
            y: item.y,
            width: item.width || deskPixelWidth,
            height: item.height || deskPixelHeight,
          },
        ])
      );
      deskEditState.transformStartX = point.x;
      deskEditState.transformStartY = point.y;
      if (resizeHandle.setPointerCapture) {
        resizeHandle.setPointerCapture(event.pointerId);
      }
    });
    resizeHandle.addEventListener("pointerup", handleDeskPointerEnd);
    resizeHandle.addEventListener("pointercancel", handleDeskPointerEnd);

    handles.appendChild(resizeHandle);
  });

  overlay.appendChild(handles);
};

const renderSpaceDesks = (desks = []) => {
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const layer = ensureDeskLayer(svg);
  if (!layer) {
    return;
  }
  layer.innerHTML = "";
  const metrics = getDeskMetrics(svg, null);
  const selectedIds = getSelectedDeskIds();
  const hasSingleSelection = selectedIds.length === 1;
  const hasMultipleSelection = selectedIds.length > 1;
  desks.forEach((desk) => {
    if (!Number.isFinite(desk?.x) || !Number.isFinite(desk?.y)) {
      return;
    }
    const deskMetrics = getDeskMetrics(svg, desk);
    const rotation = Number.isFinite(desk.rotation) ? desk.rotation : 0;
    const group = document.createElementNS(svgNamespace, "g");
    group.classList.add("space-desk");
    group.setAttribute("data-desk-id", String(desk.id));
    group.classList.toggle("is-selected", isDeskSelected(desk.id));

    const shape = document.createElementNS(svgNamespace, "rect");
    shape.classList.add("space-desk-shape");
    shape.setAttribute("x", String(desk.x - deskMetrics.width / 2));
    shape.setAttribute("y", String(desk.y - deskMetrics.height / 2));
    shape.setAttribute("width", String(deskMetrics.width));
    shape.setAttribute("height", String(deskMetrics.height));
    shape.setAttribute("rx", String(Math.min(deskMetrics.width, deskMetrics.height) * 0.1));

    const label = document.createElementNS(svgNamespace, "text");
    label.classList.add("space-desk-label");
    label.textContent = desk.label || "";
    label.setAttribute("x", String(desk.x));
    label.setAttribute("y", String(desk.y));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("transform", `rotate(${-rotation} ${desk.x} ${desk.y})`);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = desk.label || "Стол";

    group.appendChild(title);
    group.appendChild(shape);
    group.appendChild(label);
    group.setAttribute("transform", `rotate(${rotation} ${desk.x} ${desk.y})`);
    if (isSpaceEditing && hasSingleSelection && isDeskSelected(desk.id)) {
      const handles = document.createElementNS(svgNamespace, "g");
      handles.classList.add("desk-handles");

      const handleSize = 10 * ((deskMetrics.scaleX + deskMetrics.scaleY) / 2);
      const handleHalf = handleSize / 2;
      const handleRadius = Math.max(1, Math.min(3, handleSize * 0.2));
      const rotateOffset = 26 * ((deskMetrics.scaleX + deskMetrics.scaleY) / 2);
      const halfWidth = deskMetrics.width / 2;
      const halfHeight = deskMetrics.height / 2;

      const bounds = document.createElementNS(svgNamespace, "rect");
      bounds.classList.add("desk-bounds");
      bounds.setAttribute("x", String(desk.x - halfWidth));
      bounds.setAttribute("y", String(desk.y - halfHeight));
      bounds.setAttribute("width", String(deskMetrics.width));
      bounds.setAttribute("height", String(deskMetrics.height));
      handles.appendChild(bounds);

      const rotateLine = document.createElementNS(svgNamespace, "line");
      rotateLine.classList.add("desk-rotate-line");
      rotateLine.setAttribute("x1", String(desk.x));
      rotateLine.setAttribute("y1", String(desk.y - halfHeight));
      rotateLine.setAttribute("x2", String(desk.x));
      rotateLine.setAttribute("y2", String(desk.y - halfHeight - rotateOffset));
      handles.appendChild(rotateLine);

      const resizeHandles = {
        n: { x: 0, y: -halfHeight },
        ne: { x: halfWidth, y: -halfHeight },
        e: { x: halfWidth, y: 0 },
        se: { x: halfWidth, y: halfHeight },
        s: { x: 0, y: halfHeight },
        sw: { x: -halfWidth, y: halfHeight },
        w: { x: -halfWidth, y: 0 },
        nw: { x: -halfWidth, y: -halfHeight },
      };

      Object.entries(resizeHandles).forEach(([handleKey, position]) => {
        const resizeHandle = document.createElementNS(svgNamespace, "rect");
        resizeHandle.classList.add("desk-handle", "desk-handle-resize", `desk-handle-${handleKey}`);
        resizeHandle.dataset.handle = handleKey;
        resizeHandle.setAttribute("x", String(desk.x + position.x - handleHalf));
        resizeHandle.setAttribute("y", String(desk.y + position.y - handleHalf));
        resizeHandle.setAttribute("width", String(handleSize));
        resizeHandle.setAttribute("height", String(handleSize));
        resizeHandle.setAttribute("rx", String(handleRadius));
        resizeHandle.setAttribute("ry", String(handleRadius));

        resizeHandle.addEventListener("pointerdown", (event) => {
          if (!isSpaceEditing || isDeskPlacementActive) {
            return;
          }
          event.stopPropagation();
          event.preventDefault();
          const point = getSnapshotPoint(event, svg);
          if (!point) {
            return;
          }
          setSelectedDesk(desk.id);
          deskEditState.draggingDeskId = desk.id;
          deskEditState.draggingPointerId = event.pointerId;
          deskEditState.transformMode = "resize";
          deskEditState.transformHandle = handleKey;
          deskEditState.transformPointerId = event.pointerId;
          deskEditState.transformStartX = point.x;
          deskEditState.transformStartY = point.y;
          deskEditState.transformStartWidth = desk.width || deskPixelWidth;
          deskEditState.transformStartHeight = desk.height || deskPixelHeight;
          deskEditState.transformStartRotation = desk.rotation || 0;
          deskEditState.startX = desk.x;
          deskEditState.startY = desk.y;
          if (resizeHandle.setPointerCapture) {
            resizeHandle.setPointerCapture(event.pointerId);
          }
        });
      resizeHandle.addEventListener("pointerup", handleDeskPointerEnd);
      resizeHandle.addEventListener("pointercancel", handleDeskPointerEnd);

        handles.appendChild(resizeHandle);
      });

      const rotateHandle = document.createElementNS(svgNamespace, "rect");
      rotateHandle.classList.add("desk-handle", "desk-handle-rotate");
      rotateHandle.setAttribute("x", String(desk.x - handleHalf));
      rotateHandle.setAttribute("y", String(desk.y - halfHeight - rotateOffset - handleHalf));
      rotateHandle.setAttribute("width", String(handleSize));
      rotateHandle.setAttribute("height", String(handleSize));
      rotateHandle.setAttribute("rx", String(handleRadius));
      rotateHandle.setAttribute("ry", String(handleRadius));

      rotateHandle.addEventListener("pointerdown", (event) => {
        if (!isSpaceEditing || isDeskPlacementActive) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        const point = getSnapshotPoint(event, svg);
        if (!point) {
          return;
        }
        setSelectedDesk(desk.id);
        deskEditState.draggingDeskId = desk.id;
        deskEditState.draggingPointerId = event.pointerId;
        deskEditState.transformMode = "rotate";
        deskEditState.transformHandle = null;
        deskEditState.transformPointerId = event.pointerId;
        deskEditState.transformStartX = point.x;
        deskEditState.transformStartY = point.y;
        deskEditState.transformStartWidth = desk.width || deskPixelWidth;
        deskEditState.transformStartHeight = desk.height || deskPixelHeight;
        deskEditState.transformStartRotation = desk.rotation || 0;
        deskEditState.startX = desk.x;
        deskEditState.startY = desk.y;
        if (rotateHandle.setPointerCapture) {
          rotateHandle.setPointerCapture(event.pointerId);
        }
      });
      rotateHandle.addEventListener("pointerup", handleDeskPointerEnd);
      rotateHandle.addEventListener("pointercancel", handleDeskPointerEnd);

      handles.appendChild(rotateHandle);
      group.appendChild(handles);
    }
    group.addEventListener("pointerdown", (event) => {
      if (!isSpaceEditing) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const hasModifier = event.shiftKey || event.metaKey || event.ctrlKey;
      if (hasModifier) {
        setSelectedDesk(desk.id, { toggle: true });
        return;
      }
      const isSelected = isDeskSelected(desk.id);
      if (!isSelected) {
        setSelectedDesk(desk.id);
      }
      if (isDeskPlacementActive) {
        return;
      }
      if (event.target && event.target.closest && event.target.closest(".desk-handle")) {
        return;
      }
      const point = getSnapshotPoint(event, svg);
      if (!point) {
        return;
      }
      if (hasMultipleSelection && isSelected) {
        const selectedDesks = getSelectedDesks();
        const groupBounds = getGroupBounds(selectedDesks);
        deskEditState.draggingDeskIds = selectedIds;
        deskEditState.draggingDeskId = null;
        deskEditState.draggingPointerId = event.pointerId;
        deskEditState.groupDragStartPoint = point;
        deskEditState.groupDragBounds = groupBounds;
        deskEditState.groupDragStartPositions = new Map(
          selectedDesks.map((item) => [String(item.id), { x: item.x, y: item.y }])
        );
        deskEditState.hasMoved = false;
      } else {
        deskEditState.draggingDeskIds = null;
        deskEditState.groupDragStartPoint = null;
        deskEditState.groupDragBounds = null;
        deskEditState.groupDragStartPositions = null;
      deskEditState.draggingDeskId = desk.id;
      deskEditState.draggingPointerId = event.pointerId;
      deskEditState.offsetX = point.x - desk.x;
      deskEditState.offsetY = point.y - desk.y;
      deskEditState.startX = desk.x;
      deskEditState.startY = desk.y;
      deskEditState.hasMoved = false;
      deskEditState.transformStartWidth = desk.width || deskPixelWidth;
      deskEditState.transformStartHeight = desk.height || deskPixelHeight;
      deskEditState.transformStartRotation = desk.rotation || 0;
      group.classList.add("is-dragging");
      }
      if (group.setPointerCapture) {
        group.setPointerCapture(event.pointerId);
      }
    });
    group.addEventListener("pointerup", handleDeskPointerEnd);
    group.addEventListener("pointercancel", handleDeskPointerEnd);
    layer.appendChild(group);
  });
  renderGroupSelectionOverlay();
};

const loadSpaceDesks = async (spaceId) => {
  if (!spaceId) {
    currentDesks = [];
    pendingDeskUpdates = new Map();
    setSelectedDesk(null);
    renderSpaceDesks([]);
    return;
  }
  const response = await apiRequest(`/api/spaces/${spaceId}/desks`);
  const rawDesks = Array.isArray(response?.items) ? response.items : [];
  const normalized = normalizeDesksForCurrentSpace(rawDesks);
  currentDesks = normalized.desks;
  pendingDeskUpdates = new Map();
  setSelectedDesk(null);
  renderSpaceDesks(currentDesks);
  renderSpaceDeskList(currentDesks);
  if (normalized.updates.length > 0) {
    await persistDeskNormalizationUpdates(normalized.updates);
  }
};

const getNextDeskLabel = (desks = []) => {
  const used = new Set();
  desks.forEach((desk) => {
    const raw = typeof desk?.label === "string" ? desk.label.trim() : "";
    const match = raw.match(/^Стол\s+(\d+)$/i);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value) && value > 0) {
        used.add(value);
      }
    }
  });
  let candidate = 1;
  while (used.has(candidate)) {
    candidate += 1;
  }
  return `Стол ${candidate}`;
};

const normalizeDeskSizeForBounds = (width, height, bounds) => {
  let nextWidth = width;
  let nextHeight = height;
  if (bounds) {
    const minWidth = Math.min(deskMinWidth, bounds.width);
    const minHeight = Math.min(deskMinHeight, bounds.height);
    nextWidth = Math.min(nextWidth, bounds.width);
    nextHeight = Math.min(nextHeight, bounds.height);
    nextWidth = Math.max(nextWidth, minWidth);
    nextHeight = Math.max(nextHeight, minHeight);
  } else {
    nextWidth = Math.max(nextWidth, deskMinWidth);
    nextHeight = Math.max(nextHeight, deskMinHeight);
  }
  return { width: nextWidth, height: nextHeight };
};

const isDeskAreaFree = (x, y, width, height, excludeDeskId = null) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const left = x - halfWidth;
  const right = x + halfWidth;
  const top = y - halfHeight;
  const bottom = y + halfHeight;
  const shouldExclude = (deskId) => {
    if (!excludeDeskId) {
      return false;
    }
    if (excludeDeskId instanceof Set) {
      return excludeDeskId.has(String(deskId));
    }
    return String(deskId) === String(excludeDeskId);
  };
  return !currentDesks.some((desk) => {
    if (shouldExclude(desk?.id)) {
      return false;
    }
    if (!Number.isFinite(desk?.x) || !Number.isFinite(desk?.y)) {
      return false;
    }
    const dimensions = getDeskDimensions(desk);
    const deskWidth = dimensions.width;
    const deskHeight = dimensions.height;
    const deskLeft = desk.x - deskWidth / 2;
    const deskRight = desk.x + deskWidth / 2;
    const deskTop = desk.y - deskHeight / 2;
    const deskBottom = desk.y + deskHeight / 2;
    const overlaps = left < deskRight && right > deskLeft && top < deskBottom && bottom > deskTop;
    return overlaps;
  });
};

const findFreeDeskPosition = (bounds, width, height, preferredPoint = null, excludeDeskId = null) => {
  if (!bounds) {
    return null;
  }
  const minX = bounds.minX + width / 2;
  const maxX = bounds.minX + bounds.width - width / 2;
  const minY = bounds.minY + height / 2;
  const maxY = bounds.minY + bounds.height - height / 2;
  if (minX > maxX || minY > maxY) {
    return null;
  }
  const step = Math.max(deskSnapDistance * 2, Math.min(width, height) / 2);
  if (preferredPoint) {
    const preferredX = Math.min(Math.max(preferredPoint.x, minX), maxX);
    const preferredY = Math.min(Math.max(preferredPoint.y, minY), maxY);
    if (isDeskAreaFree(preferredX, preferredY, width, height, excludeDeskId)) {
      return { x: preferredX, y: preferredY };
    }
  }
  if (preferredPoint) {
    const preferredX = Math.min(Math.max(preferredPoint.x, minX), maxX);
    const preferredY = Math.min(Math.max(preferredPoint.y, minY), maxY);
    let bestPoint = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const maxOffsetX = Math.max(maxX - preferredX, preferredX - minX);
    const maxOffsetY = Math.max(maxY - preferredY, preferredY - minY);
    const maxStepsX = Math.ceil(maxOffsetX / step);
    const maxStepsY = Math.ceil(maxOffsetY / step);
    for (let dyStep = -maxStepsY; dyStep <= maxStepsY; dyStep += 1) {
      const y = preferredY + dyStep * step;
      if (y < minY || y > maxY) {
        continue;
      }
      for (let dxStep = -maxStepsX; dxStep <= maxStepsX; dxStep += 1) {
        const x = preferredX + dxStep * step;
        if (x < minX || x > maxX) {
          continue;
        }
        if (!isDeskAreaFree(x, y, width, height, excludeDeskId)) {
          continue;
        }
        const dx = x - preferredX;
        const dy = y - preferredY;
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPoint = { x, y };
        }
      }
    }
    if (bestPoint) {
      return bestPoint;
    }
  }
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (isDeskAreaFree(x, y, width, height, excludeDeskId)) {
        return { x, y };
      }
    }
  }
  return null;
};

const getRelativeGroupBounds = (desks = []) => {
  if (!Array.isArray(desks) || desks.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  desks.forEach((desk) => {
    if (!desk) {
      return;
    }
    const width = Number.isFinite(desk.width) ? desk.width : deskPixelWidth;
    const height = Number.isFinite(desk.height) ? desk.height : deskPixelHeight;
    const dx = Number.isFinite(desk.dx) ? desk.dx : 0;
    const dy = Number.isFinite(desk.dy) ? desk.dy : 0;
    const left = dx - width / 2;
    const right = dx + width / 2;
    const top = dy - height / 2;
    const bottom = dy + height / 2;
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
  };
};

const buildCopiedDeskGroup = (desks = []) => {
  const normalized = desks
    .map((desk) => ({
      width: Number.isFinite(desk?.width) ? desk.width : deskPixelWidth,
      height: Number.isFinite(desk?.height) ? desk.height : deskPixelHeight,
      rotation: Number.isFinite(desk?.rotation) ? desk.rotation : 0,
      x: Number.isFinite(desk?.x) ? desk.x : 0,
      y: Number.isFinite(desk?.y) ? desk.y : 0,
    }))
    .filter((desk) => Number.isFinite(desk.x) && Number.isFinite(desk.y));
  if (normalized.length === 0) {
    return null;
  }
  const absBounds = getGroupBounds(normalized);
  if (!absBounds) {
    return null;
  }
  const desksWithOffsets = normalized.map((desk) => ({
    ...desk,
    dx: desk.x - absBounds.centerX,
    dy: desk.y - absBounds.centerY,
  }));
  const relativeBounds = getRelativeGroupBounds(desksWithOffsets);
  if (!relativeBounds) {
    return null;
  }
  return {
    desks: desksWithOffsets,
    bounds: relativeBounds,
    origin: { x: absBounds.centerX, y: absBounds.centerY },
  };
};

const normalizeCopiedGroupForBounds = (group, bounds) => {
  if (!group || !Array.isArray(group.desks) || group.desks.length === 0) {
    return null;
  }
  const desks = group.desks.map((desk) => {
    const size = normalizeDeskSizeForBounds(desk.width, desk.height, bounds);
    return {
      ...desk,
      width: size.width,
      height: size.height,
    };
  });
  const relativeBounds = getRelativeGroupBounds(desks);
  if (!relativeBounds) {
    return null;
  }
  return {
    ...group,
    desks,
    bounds: relativeBounds,
  };
};

const canPlaceCopiedGroup = (bounds, group, centerX, centerY) => {
  if (!bounds || !group || !Array.isArray(group.desks)) {
    return false;
  }
  for (const desk of group.desks) {
    const width = Number.isFinite(desk.width) ? desk.width : deskPixelWidth;
    const height = Number.isFinite(desk.height) ? desk.height : deskPixelHeight;
    const x = centerX + (Number.isFinite(desk.dx) ? desk.dx : 0);
    const y = centerY + (Number.isFinite(desk.dy) ? desk.dy : 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }
    const minX = bounds.minX + width / 2;
    const maxX = bounds.minX + bounds.width - width / 2;
    const minY = bounds.minY + height / 2;
    const maxY = bounds.minY + bounds.height - height / 2;
    if (x < minX || x > maxX || y < minY || y > maxY) {
      return false;
    }
    if (!isDeskAreaFree(x, y, width, height)) {
      return false;
    }
  }
  return true;
};

const findFreeCopiedGroupPosition = (bounds, group, preferredPoint = null) => {
  if (!bounds || !group || !group.bounds) {
    return null;
  }
  const groupBounds = group.bounds;
  if (!Number.isFinite(groupBounds.minX) || !Number.isFinite(groupBounds.maxX)) {
    return null;
  }
  const minX = bounds.minX - groupBounds.minX;
  const maxX = bounds.minX + bounds.width - groupBounds.maxX;
  const minY = bounds.minY - groupBounds.minY;
  const maxY = bounds.minY + bounds.height - groupBounds.maxY;
  if (minX > maxX || minY > maxY) {
    return null;
  }
  const stepBase = Math.min(groupBounds.width || 0, groupBounds.height || 0);
  const step = Math.max(deskSnapDistance * 2, stepBase > 0 ? stepBase / 2 : deskSnapDistance * 2);
  const clampPoint = (point) => ({
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.min(Math.max(point.y, minY), maxY),
  });
  if (preferredPoint) {
    const preferred = clampPoint(preferredPoint);
    if (canPlaceCopiedGroup(bounds, group, preferred.x, preferred.y)) {
      return preferred;
    }
  }
  if (preferredPoint) {
    const preferred = clampPoint(preferredPoint);
    let bestPoint = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const maxOffsetX = Math.max(maxX - preferred.x, preferred.x - minX);
    const maxOffsetY = Math.max(maxY - preferred.y, preferred.y - minY);
    const maxStepsX = Math.ceil(maxOffsetX / step);
    const maxStepsY = Math.ceil(maxOffsetY / step);
    for (let dyStep = -maxStepsY; dyStep <= maxStepsY; dyStep += 1) {
      const y = preferred.y + dyStep * step;
      if (y < minY || y > maxY) {
        continue;
      }
      for (let dxStep = -maxStepsX; dxStep <= maxStepsX; dxStep += 1) {
        const x = preferred.x + dxStep * step;
        if (x < minX || x > maxX) {
          continue;
        }
        if (!canPlaceCopiedGroup(bounds, group, x, y)) {
          continue;
        }
        const distance = Math.hypot(x - preferred.x, y - preferred.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPoint = { x, y };
        }
      }
    }
    if (bestPoint) {
      return bestPoint;
    }
  }
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (canPlaceCopiedGroup(bounds, group, x, y)) {
        return { x, y };
      }
    }
  }
  return null;
};

const findFreeGroupPosition = (bounds, desks = [], preferredPoint = null, excludeDeskIds = null) => {
  if (!bounds || desks.length === 0) {
    return null;
  }
  const groupBounds = getGroupBounds(desks);
  if (!groupBounds) {
    return null;
  }
  const minX = bounds.minX + groupBounds.width / 2;
  const maxX = bounds.minX + bounds.width - groupBounds.width / 2;
  const minY = bounds.minY + groupBounds.height / 2;
  const maxY = bounds.minY + bounds.height - groupBounds.height / 2;
  if (minX > maxX || minY > maxY) {
    return null;
  }
  const step = Math.max(deskSnapDistance * 2, Math.min(groupBounds.width, groupBounds.height) / 4);
  const preferredX = preferredPoint
    ? Math.min(Math.max(preferredPoint.x, minX), maxX)
    : groupBounds.centerX;
  const preferredY = preferredPoint
    ? Math.min(Math.max(preferredPoint.y, minY), maxY)
    : groupBounds.centerY;
  let bestPoint = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const maxOffsetX = Math.max(maxX - preferredX, preferredX - minX);
  const maxOffsetY = Math.max(maxY - preferredY, preferredY - minY);
  const maxStepsX = Math.ceil(maxOffsetX / step);
  const maxStepsY = Math.ceil(maxOffsetY / step);
  for (let dyStep = -maxStepsY; dyStep <= maxStepsY; dyStep += 1) {
    const centerY = preferredY + dyStep * step;
    if (centerY < minY || centerY > maxY) {
      continue;
    }
    for (let dxStep = -maxStepsX; dxStep <= maxStepsX; dxStep += 1) {
      const centerX = preferredX + dxStep * step;
      if (centerX < minX || centerX > maxX) {
        continue;
      }
      const deltaX = centerX - groupBounds.centerX;
      const deltaY = centerY - groupBounds.centerY;
      const fits = desks.every((desk) => {
        const dimensions = getDeskDimensions(desk);
        return isDeskAreaFree(
          desk.x + deltaX,
          desk.y + deltaY,
          dimensions.width,
          dimensions.height,
          excludeDeskIds
        );
      });
      if (!fits) {
        continue;
      }
      const dx = centerX - preferredX;
      const dy = centerY - preferredY;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPoint = { x: centerX, y: centerY };
      }
    }
  }
  return bestPoint;
};

const addDeskToFreeSpot = async () => {
  if (!isSpaceEditing) {
    setSpacePageStatus("Сначала включите режим редактирования.", "error");
    return;
  }
  if (!currentSpace?.id) {
    setSpacePageStatus("Сначала выберите пространство.", "error");
    return;
  }
  const svg = getSnapshotSvg();
  const viewBox = parseViewBox(svg);
  const bounds = currentSpaceBounds || viewBox;
  const normalizedSize = normalizeDeskSizeForBounds(deskPixelWidth, deskPixelHeight, bounds);
  const width = normalizedSize.width;
  const height = normalizedSize.height;
  const position = findFreeDeskPosition(bounds, width, height);
  if (!position) {
    setSpacePageStatus("Нет свободного места для нового стола.", "error");
    return;
  }
  const clamped = clampDeskCenterToBounds(position.x, position.y, width, height, bounds);
  try {
    if (addDeskBtn) {
      addDeskBtn.disabled = true;
    }
    const label = getNextDeskLabel(currentDesks);
    const result = await apiRequest("/api/desks", {
      method: "POST",
      body: JSON.stringify({
        space_id: currentSpace.id,
        label,
        x: clamped.x,
        y: clamped.y,
        width,
        height,
        rotation: 0,
      }),
    });
    if (result) {
      currentDesks = [result, ...currentDesks];
      renderSpaceDesks(currentDesks);
      renderSpaceDeskList(currentDesks);
      setSelectedDesk(result.id);
    }
  } catch (error) {
    setSpacePageStatus(error.message, "error");
  } finally {
    if (addDeskBtn) {
      addDeskBtn.disabled = false;
    }
  }
};

const copySelectedDesk = () => {
  if (!isSpaceEditing) {
    setSpacePageStatus("Сначала включите режим редактирования.", "error");
    return;
  }
  const selectedIds = getSelectedDeskIds();
  if (selectedIds.length === 0) {
    setSpacePageStatus("Выберите стол для копирования.", "error");
    return;
  }
  const desks = selectedIds.map(findDeskById).filter(Boolean);
  if (desks.length === 0) {
    return;
  }
  const group = buildCopiedDeskGroup(desks);
  if (!group) {
    return;
  }
  copiedDesk = group;
  updateDeskClipboardButtons();
};

const pasteCopiedDesk = async () => {
  if (!isSpaceEditing) {
    setSpacePageStatus("Сначала включите режим редактирования.", "error");
    return;
  }
  if (!currentSpace?.id) {
    setSpacePageStatus("Сначала выберите пространство.", "error");
    return;
  }
  if (!copiedDesk) {
    setSpacePageStatus("Нет скопированного стола.", "error");
    return;
  }
  const svg = getSnapshotSvg();
  const viewBox = parseViewBox(svg);
  const bounds = currentSpaceBounds || viewBox;
  const group = normalizeCopiedGroupForBounds(copiedDesk, bounds);
  if (!group) {
    setSpacePageStatus("Нет скопированного стола.", "error");
    return;
  }
  const offset = deskSnapDistance * 2;
  const baseX = Number.isFinite(copiedDesk.origin?.x) ? copiedDesk.origin.x + offset : 0;
  const baseY = Number.isFinite(copiedDesk.origin?.y) ? copiedDesk.origin.y + offset : 0;
  const position = findFreeCopiedGroupPosition(bounds, group, { x: baseX, y: baseY });
  if (!position) {
    setSpacePageStatus("Нет свободного места для вставки стола.", "error");
    return;
  }

  try {
    if (pasteDeskBtn) {
      pasteDeskBtn.disabled = true;
    }
    let workingDesks = currentDesks.slice();
    const payloads = group.desks.map((desk) => {
      const label = getNextDeskLabel(workingDesks);
      workingDesks = [{ label }, ...workingDesks];
      const x = position.x + desk.dx;
      const y = position.y + desk.dy;
      return {
        space_id: currentSpace.id,
        label,
        x,
        y,
        width: desk.width,
        height: desk.height,
        rotation: desk.rotation,
      };
    });
    const result = await apiRequest("/api/desks/bulk", {
      method: "POST",
      body: JSON.stringify({ items: payloads }),
    });
    const created = Array.isArray(result?.items) ? result.items : [];
    if (created.length > 0) {
      currentDesks = [...created, ...currentDesks];
      renderSpaceDesks(currentDesks);
      renderSpaceDeskList(currentDesks);
      setSelectedDesk(created[0].id);
      for (let i = 1; i < created.length; i += 1) {
        setSelectedDesk(created[i].id, { additive: true });
      }
    }
  } catch (error) {
    setSpacePageStatus(error.message, "error");
  } finally {
    if (pasteDeskBtn) {
      pasteDeskBtn.disabled = false;
    }
    updateDeskClipboardButtons();
  }
};

const getSnapshotPoint = (event, svg) => {
  if (!svg) {
    return null;
  }
  if (svg.createSVGPoint && svg.getScreenCTM) {
    const matrix = svg.getScreenCTM();
    if (matrix) {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const transformed = point.matrixTransform(matrix.inverse());
      if (Number.isFinite(transformed.x) && Number.isFinite(transformed.y)) {
        return { x: transformed.x, y: transformed.y };
      }
    }
  }
  const viewBox = parseViewBox(svg);
  if (!viewBox) {
    return null;
  }
  const rect = svg.getBoundingClientRect();
  const x = viewBox.minX + ((event.clientX - rect.left) / rect.width) * viewBox.width;
  const y = viewBox.minY + ((event.clientY - rect.top) / rect.height) * viewBox.height;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
};

const handleSnapshotDeskPlacement = async (event) => {
  if (!isSpaceEditing || !isDeskPlacementActive) {
    return;
  }
  if (!currentSpace?.id) {
    setSpacePageStatus("Сначала выберите пространство.", "error");
    return;
  }
  if (event.target && event.target.closest && event.target.closest(".space-desk")) {
    return;
  }
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const point = getSnapshotPoint(event, svg);
  if (!point) {
    return;
  }
    const metrics = getDeskMetrics(svg, null);
    const clamped = clampDeskPosition(point.x, point.y, metrics);
  try {
    if (addDeskBtn) {
      addDeskBtn.disabled = true;
    }
    const label = getNextDeskLabel(currentDesks);
    const result = await apiRequest("/api/desks", {
      method: "POST",
      body: JSON.stringify({
        space_id: currentSpace.id,
        label,
        x: clamped.x,
        y: clamped.y,
          width: deskPixelWidth,
          height: deskPixelHeight,
          rotation: 0,
      }),
    });
    if (result) {
      currentDesks = [result, ...currentDesks];
      renderSpaceDesks(currentDesks);
      setSpacePageStatus("Стол добавлен.", "success");
    }
  } catch (error) {
    setSpacePageStatus(error.message, "error");
  } finally {
    if (addDeskBtn) {
      addDeskBtn.disabled = false;
    }
  }
};

const handleDeskPointerMove = (event) => {
  if (!isSpaceEditing) {
    return;
  }
  const isDragPointer = deskEditState.draggingPointerId === event.pointerId;
  const isTransformPointer = deskEditState.transformPointerId === event.pointerId;
  if (!isDragPointer && !isTransformPointer) {
    return;
  }
  event.preventDefault();
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const point = getSnapshotPoint(event, svg);
  if (!point) {
    return;
  }
  if (deskEditState.transformMode) {
    if (deskEditState.transformMode === "group-resize") {
      const startBounds = deskEditState.groupTransformStartBounds;
      const startDesks = deskEditState.groupTransformStartDesks;
      if (!startBounds || !startDesks) {
        return;
      }
      const handleKey = deskEditState.transformHandle || "se";
      const affectsX = handleKey.includes("e") || handleKey.includes("w");
      const affectsY = handleKey.includes("n") || handleKey.includes("s");
      const fixedMinX = startBounds.minX;
      const fixedMaxX = startBounds.maxX;
      const fixedMinY = startBounds.minY;
      const fixedMaxY = startBounds.maxY;
      let nextMinX = fixedMinX;
      let nextMaxX = fixedMaxX;
      let nextMinY = fixedMinY;
      let nextMaxY = fixedMaxY;
      if (affectsX) {
        if (handleKey.includes("w")) {
          nextMinX = point.x;
        } else {
          nextMaxX = point.x;
        }
      }
      if (affectsY) {
        if (handleKey.includes("n")) {
          nextMinY = point.y;
        } else {
          nextMaxY = point.y;
        }
      }
      const rawWidth = Math.max(1, nextMaxX - nextMinX);
      const rawHeight = Math.max(1, nextMaxY - nextMinY);
      let scaleX = affectsX ? rawWidth / startBounds.width : 1;
      let scaleY = affectsY ? rawHeight / startBounds.height : 1;
      let minScaleX = 0.01;
      let minScaleY = 0.01;
      startDesks.forEach((value) => {
        const baseWidth = Number.isFinite(value.width) ? value.width : deskPixelWidth;
        const baseHeight = Number.isFinite(value.height) ? value.height : deskPixelHeight;
        if (baseWidth > 0) {
          minScaleX = Math.max(minScaleX, deskMinWidth / baseWidth);
        }
        if (baseHeight > 0) {
          minScaleY = Math.max(minScaleY, deskMinHeight / baseHeight);
        }
      });
      scaleX = Math.max(scaleX, minScaleX);
      scaleY = Math.max(scaleY, minScaleY);
      const nextWidth = startBounds.width * scaleX;
      const nextHeight = startBounds.height * scaleY;
      if (affectsX) {
        if (handleKey.includes("w")) {
          nextMaxX = fixedMaxX;
          nextMinX = nextMaxX - nextWidth;
        } else {
          nextMinX = fixedMinX;
          nextMaxX = nextMinX + nextWidth;
        }
      } else {
        nextMinX = fixedMinX;
        nextMaxX = fixedMaxX;
      }
      if (affectsY) {
        if (handleKey.includes("n")) {
          nextMaxY = fixedMaxY;
          nextMinY = nextMaxY - nextHeight;
        } else {
          nextMinY = fixedMinY;
          nextMaxY = nextMinY + nextHeight;
        }
      } else {
        nextMinY = fixedMinY;
        nextMaxY = fixedMaxY;
      }
      const viewBox = parseViewBox(svg);
      const bounds = currentSpaceBounds || viewBox;
      if (bounds) {
        const maxX = bounds.minX + bounds.width;
        const maxY = bounds.minY + bounds.height;
        let shiftX = 0;
        let shiftY = 0;
        if (nextMinX < bounds.minX) {
          shiftX = bounds.minX - nextMinX;
        } else if (nextMaxX > maxX) {
          shiftX = maxX - nextMaxX;
        }
        if (nextMinY < bounds.minY) {
          shiftY = bounds.minY - nextMinY;
        } else if (nextMaxY > maxY) {
          shiftY = maxY - nextMaxY;
        }
        nextMinX += shiftX;
        nextMaxX += shiftX;
        nextMinY += shiftY;
        nextMaxY += shiftY;
      }
      const nextCenterX = (nextMinX + nextMaxX) / 2;
      const nextCenterY = (nextMinY + nextMaxY) / 2;
      startDesks.forEach((value, deskId) => {
        const desk = findDeskById(deskId);
        if (!desk) {
          return;
        }
        const relX = value.x - startBounds.centerX;
        const relY = value.y - startBounds.centerY;
        const nextX = nextCenterX + relX * scaleX;
        const nextY = nextCenterY + relY * scaleY;
        desk.x = nextX;
        desk.y = nextY;
        desk.width = Math.max(deskMinWidth, value.width * scaleX);
        desk.height = Math.max(deskMinHeight, value.height * scaleY);
        const group = svg.querySelector(`.space-desk[data-desk-id="${String(deskId)}"]`);
        const metrics = getDeskMetrics(svg, desk);
        updateDeskElementPosition(group, desk, metrics);
      });
      renderGroupSelectionOverlay();
      return;
    }
    const desk = findDeskById(deskEditState.selectedDeskId);
    if (!desk) {
      return;
    }
    const metrics = getDeskMetrics(svg, desk);
    if (deskEditState.transformMode === "resize") {
      const handleKey = deskEditState.transformHandle || "se";
      const affectsX = handleKey.includes("e") || handleKey.includes("w");
      const affectsY = handleKey.includes("n") || handleKey.includes("s");
      const dimensions = getDeskDimensions(desk);
      const baseWidthView = dimensions.width;
      const baseHeightView = dimensions.height;
      const baseHalfWidth = baseWidthView / 2;
      const baseHalfHeight = baseHeightView / 2;
      const minWidthView = deskMinWidth;
      const minHeightView = deskMinHeight;
      const dx = point.x - desk.x;
      const dy = point.y - desk.y;
      const rotation = getDeskRotationRadians(desk);
      const localX = dx * Math.cos(rotation) + dy * Math.sin(rotation);
      const localY = -dx * Math.sin(rotation) + dy * Math.cos(rotation);
      let nextWidth = dimensions.width;
      let nextHeight = dimensions.height;
      let centerShiftX = 0;
      let centerShiftY = 0;
      let nextLocalX = localX;
      let nextLocalY = localY;

      if (affectsX) {
        const fixedX = handleKey.includes("e") ? -baseHalfWidth : baseHalfWidth;
        if (handleKey.includes("e")) {
          nextLocalX = Math.max(nextLocalX, fixedX + minWidthView);
        } else {
          nextLocalX = Math.min(nextLocalX, fixedX - minWidthView);
        }
        const nextWidthView = Math.abs(nextLocalX - fixedX);
        nextWidth = Math.max(deskMinWidth, nextWidthView);
        centerShiftX = (nextLocalX + fixedX) / 2;
      }

      if (affectsY) {
        const fixedY = handleKey.includes("s") ? -baseHalfHeight : baseHalfHeight;
        if (handleKey.includes("s")) {
          nextLocalY = Math.max(nextLocalY, fixedY + minHeightView);
        } else {
          nextLocalY = Math.min(nextLocalY, fixedY - minHeightView);
        }
        const nextHeightView = Math.abs(nextLocalY - fixedY);
        nextHeight = Math.max(deskMinHeight, nextHeightView);
        centerShiftY = (nextLocalY + fixedY) / 2;
      }

      const baseCenterX = desk.x;
      const baseCenterY = desk.y;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const deltaX = centerShiftX * cos - centerShiftY * sin;
      const deltaY = centerShiftX * sin + centerShiftY * cos;
      desk.x = baseCenterX + deltaX;
      desk.y = baseCenterY + deltaY;
      updateDeskDimensionsLocal(desk.id, nextWidth, nextHeight);
    }
    if (deskEditState.transformMode === "rotate") {
      const angle = Math.atan2(point.y - desk.y, point.x - desk.x);
      const rotationDeg = ((angle * 180) / Math.PI + 90 + 360) % 360;
      desk.rotation = snapRotation(rotationDeg);
      const group = svg.querySelector(`.space-desk[data-desk-id="${String(desk.id)}"]`);
      const deskMetrics = getDeskMetrics(svg, desk);
      updateDeskElementPosition(group, desk, deskMetrics);
    }
    return;
  }
  if (deskEditState.draggingDeskIds && deskEditState.draggingDeskIds.length > 1) {
    const viewBox = parseViewBox(svg);
    const bounds = currentSpaceBounds || viewBox;
    const deltaX = point.x - deskEditState.groupDragStartPoint.x;
    const deltaY = point.y - deskEditState.groupDragStartPoint.y;
    const clamped = clampGroupDragDelta(bounds, deskEditState.groupDragBounds, deltaX, deltaY);
    deskEditState.draggingDeskIds.forEach((deskId) => {
      const start = deskEditState.groupDragStartPositions.get(String(deskId));
      if (!start) {
        return;
      }
      updateDeskPositionLocal(deskId, start.x + clamped.deltaX, start.y + clamped.deltaY);
    });
    renderGroupSelectionOverlay();
    const moved =
      Math.abs(clamped.deltaX) > 0.5 || Math.abs(clamped.deltaY) > 0.5;
    deskEditState.hasMoved = deskEditState.hasMoved || moved;
    return;
  }
  const desk = findDeskById(deskEditState.draggingDeskId);
  const metrics = getDeskMetrics(svg, desk);
  const rawX = point.x - deskEditState.offsetX;
  const rawY = point.y - deskEditState.offsetY;
  const snapped = snapDeskCenter(rawX, rawY, desk, metrics);
  const clamped = clampDeskPosition(snapped.x, snapped.y, metrics);
  updateDeskPositionLocal(deskEditState.draggingDeskId, clamped.x, clamped.y);
  const moved =
    Math.abs(clamped.x - deskEditState.startX) > 0.5 || Math.abs(clamped.y - deskEditState.startY) > 0.5;
  deskEditState.hasMoved = deskEditState.hasMoved || moved;
};

const finishDeskDrag = async () => {
  const deskId = deskEditState.draggingDeskId;
  const deskIds =
    deskEditState.draggingDeskIds && deskEditState.draggingDeskIds.length > 1
      ? deskEditState.draggingDeskIds
      : deskId
        ? [deskId]
        : [];
  const pointerId = deskEditState.draggingPointerId;
  if (deskIds.length === 0) {
    return;
  }
  const startX = deskEditState.startX;
  const startY = deskEditState.startY;
  const groupStartPositions = deskEditState.groupDragStartPositions;
  deskEditState.draggingDeskId = null;
  deskEditState.draggingDeskIds = null;
  deskEditState.draggingPointerId = null;
  deskEditState.groupDragStartPoint = null;
  deskEditState.groupDragBounds = null;
  deskEditState.groupDragStartPositions = null;
  const svg = getSnapshotSvg();
  if (svg) {
    deskIds.forEach((id) => {
      const group = svg.querySelector(`.space-desk[data-desk-id="${String(id)}"]`);
    if (group) {
      group.classList.remove("is-dragging");
      if (group.releasePointerCapture && pointerId !== null) {
        group.releasePointerCapture(pointerId);
      }
    }
    });
  }
  if (!deskEditState.hasMoved) {
    return;
  }
  deskEditState.hasMoved = false;
  const desks = deskIds.map(findDeskById).filter(Boolean);
  if (desks.length === 0) {
    return;
  }
  const viewBox = parseViewBox(svg);
  const bounds = currentSpaceBounds || viewBox;
  const excludeIds = new Set(deskIds.map(String));
  let hasOverlap = false;
  desks.forEach((desk) => {
    const dimensions = getDeskDimensions(desk);
    if (!isDeskAreaFree(desk.x, desk.y, dimensions.width, dimensions.height, excludeIds)) {
      hasOverlap = true;
    }
  });
  if (hasOverlap) {
    const groupBounds = getGroupBounds(desks);
    const position = findFreeGroupPosition(
      bounds,
      desks,
      groupBounds ? { x: groupBounds.centerX, y: groupBounds.centerY } : null,
      excludeIds
    );
    if (!position) {
      if (deskIds.length > 1 && groupStartPositions) {
        groupStartPositions.forEach((value, id) => {
          updateDeskPositionLocal(id, value.x, value.y);
        });
      } else if (deskId) {
        updateDeskPositionLocal(deskId, startX, startY);
      }
      setSpacePageStatus("Нет свободного места для размещения столов.", "error");
      return;
    }
    const deltaX = position.x - groupBounds.centerX;
    const deltaY = position.y - groupBounds.centerY;
    desks.forEach((desk) => {
      updateDeskPositionLocal(desk.id, desk.x + deltaX, desk.y + deltaY);
    });
  }
  for (const desk of desks) {
    const pendingPayload = pendingDeskUpdates.get(String(desk.id)) || {};
  try {
    const payload = { ...pendingPayload, x: desk.x, y: desk.y };
      const updated = await apiRequest(`/api/desks/${desk.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (updated) {
        const index = currentDesks.findIndex((item) => String(item.id) === String(desk.id));
      if (index >= 0) {
        currentDesks[index] = updated;
      }
      if (Object.keys(pendingPayload).length > 0) {
          pendingDeskUpdates.delete(String(desk.id));
      }
    }
  } catch (error) {
      if (deskIds.length > 1 && groupStartPositions) {
        groupStartPositions.forEach((value, id) => {
          updateDeskPositionLocal(id, value.x, value.y);
        });
      } else if (deskId) {
    updateDeskPositionLocal(deskId, startX, startY);
      }
    setSpacePageStatus(error.message, "error");
      return;
  }
  }
  renderSpaceDesks(currentDesks);
};

const handleDeskPointerEnd = (event) => {
  if (deskEditState.transformMode === "group-resize" && deskEditState.transformPointerId === event.pointerId) {
    const startDesks = deskEditState.groupTransformStartDesks;
    deskEditState.skipSelectionClear = true;
    deskEditState.transformMode = null;
    deskEditState.transformHandle = null;
    deskEditState.transformPointerId = null;
    deskEditState.groupTransformStartBounds = null;
    deskEditState.groupTransformStartDesks = null;
    deskEditState.draggingDeskId = null;
    deskEditState.draggingDeskIds = null;
    deskEditState.draggingPointerId = null;
    if (!startDesks) {
      return;
    }
    startDesks.forEach((value, deskId) => {
      const desk = findDeskById(deskId);
      if (!desk) {
        return;
      }
      const payload = {};
      if (desk.width !== value.width) {
        payload.width = desk.width;
      }
      if (desk.height !== value.height) {
        payload.height = desk.height;
      }
      if (desk.x !== value.x) {
        payload.x = desk.x;
      }
      if (desk.y !== value.y) {
        payload.y = desk.y;
      }
      if (Object.keys(payload).length > 0) {
        queueDeskUpdate(deskId, payload);
      }
    });
    return;
  }
  if (deskEditState.transformMode && deskEditState.transformPointerId === event.pointerId) {
    const deskId = deskEditState.selectedDeskId;
    const desk = findDeskById(deskId);
    deskEditState.skipSelectionClear = true;
    const startWidth = deskEditState.transformStartWidth;
    const startHeight = deskEditState.transformStartHeight;
    const startRotation = deskEditState.transformStartRotation;
    const startX = deskEditState.startX;
    const startY = deskEditState.startY;
    deskEditState.transformMode = null;
    deskEditState.transformHandle = null;
    deskEditState.transformPointerId = null;
    deskEditState.draggingDeskId = null;
    deskEditState.draggingPointerId = null;
    if (!desk || !deskId) {
      return;
    }
    const payload = {};
    if (desk.width !== startWidth) {
      payload.width = desk.width;
    }
    if (desk.height !== startHeight) {
      payload.height = desk.height;
    }
    if (desk.rotation !== startRotation) {
      payload.rotation = desk.rotation;
    }
    if (desk.x !== startX) {
      payload.x = desk.x;
    }
    if (desk.y !== startY) {
      payload.y = desk.y;
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    queueDeskUpdate(deskId, payload);
    return;
  }
  if (deskEditState.draggingPointerId !== event.pointerId) {
    return;
  }
  if (!deskEditState.draggingDeskId && (!deskEditState.draggingDeskIds || deskEditState.draggingDeskIds.length === 0)) {
    return;
  }
  void finishDeskDrag();
};

const finalizeActiveDeskInteraction = async () => {
  if (deskEditState.transformMode === "group-resize") {
    const startDesks = deskEditState.groupTransformStartDesks;
    deskEditState.transformMode = null;
    deskEditState.transformHandle = null;
    deskEditState.transformPointerId = null;
    deskEditState.groupTransformStartBounds = null;
    deskEditState.groupTransformStartDesks = null;
    deskEditState.draggingDeskId = null;
    deskEditState.draggingDeskIds = null;
    deskEditState.draggingPointerId = null;
    if (!startDesks) {
      return;
    }
    startDesks.forEach((value, deskId) => {
      const desk = findDeskById(deskId);
      if (!desk) {
        return;
      }
      const payload = {};
      if (desk.width !== value.width) {
        payload.width = desk.width;
      }
      if (desk.height !== value.height) {
        payload.height = desk.height;
      }
      if (desk.x !== value.x) {
        payload.x = desk.x;
      }
      if (desk.y !== value.y) {
        payload.y = desk.y;
      }
      if (Object.keys(payload).length > 0) {
        queueDeskUpdate(deskId, payload);
      }
    });
    return;
  }
  if (deskEditState.transformMode) {
    const deskId = deskEditState.selectedDeskId;
    const desk = findDeskById(deskId);
    const startWidth = deskEditState.transformStartWidth;
    const startHeight = deskEditState.transformStartHeight;
    const startRotation = deskEditState.transformStartRotation;
    const startX = deskEditState.startX;
    const startY = deskEditState.startY;
    deskEditState.transformMode = null;
    deskEditState.transformHandle = null;
    deskEditState.transformPointerId = null;
    deskEditState.draggingDeskId = null;
    deskEditState.draggingPointerId = null;
    if (!desk || !deskId) {
      return;
    }
    const payload = {};
    if (desk.width !== startWidth) {
      payload.width = desk.width;
    }
    if (desk.height !== startHeight) {
      payload.height = desk.height;
    }
    if (desk.rotation !== startRotation) {
      payload.rotation = desk.rotation;
    }
    if (desk.x !== startX) {
      payload.x = desk.x;
    }
    if (desk.y !== startY) {
      payload.y = desk.y;
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    queueDeskUpdate(deskId, payload);
    return;
  }
  if (deskEditState.draggingDeskId) {
    await finishDeskDrag();
  }
};

const persistDeskUpdate = async (deskId, payload, onRollback) => {
  try {
    const updated = await apiRequest(`/api/desks/${deskId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (updated) {
      const index = currentDesks.findIndex((item) => String(item.id) === String(deskId));
      if (index >= 0) {
        currentDesks[index] = updated;
        renderSpaceDesks(currentDesks);
        setSelectedDesk(deskId);
      }
    }
  } catch (error) {
    if (typeof onRollback === "function") {
      onRollback();
    }
    setSpacePageStatus(error.message, "error");
  }
};

const queueDeskUpdate = (deskId, payload) => {
  if (!deskId) {
    return;
  }
  const existing = pendingDeskUpdates.get(String(deskId)) || {};
  pendingDeskUpdates.set(String(deskId), { ...existing, ...payload });
};

const flushPendingDeskUpdates = async () => {
  const entries = Array.from(pendingDeskUpdates.entries());
  for (const [deskId, payload] of entries) {
    const updated = await apiRequest(`/api/desks/${deskId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (updated) {
      const index = currentDesks.findIndex((item) => String(item.id) === String(deskId));
      if (index >= 0) {
        currentDesks[index] = updated;
      }
    }
    pendingDeskUpdates.delete(deskId);
  }
  renderSpaceDesks(currentDesks);
};

const shrinkSelectedDesk = () => {
  const deskId = deskEditState.selectedDeskId;
  if (!deskId) {
    return;
  }
  const desk = findDeskById(deskId);
  if (!desk) {
    return;
  }
  const previousWidth = desk.width;
  const previousHeight = desk.height;
  const nextWidth = Math.max(deskMinWidth, (desk.width || deskPixelWidth) * deskShrinkFactor);
  const nextHeight = Math.max(deskMinHeight, (desk.height || deskPixelHeight) * deskShrinkFactor);
  desk.width = nextWidth;
  desk.height = nextHeight;
  renderSpaceDesks(currentDesks);
  setSelectedDesk(deskId);
  queueDeskUpdate(deskId, { width: nextWidth, height: nextHeight });
};

const rotateSelectedDesk = () => {
  const deskId = deskEditState.selectedDeskId;
  if (!deskId) {
    return;
  }
  const desk = findDeskById(deskId);
  if (!desk) {
    return;
  }
  const previousRotation = desk.rotation;
  const baseRotation = Number.isFinite(desk.rotation) ? desk.rotation : 0;
  const nextRotation = (baseRotation + deskRotateStep) % 360;
  desk.rotation = nextRotation;
  renderSpaceDesks(currentDesks);
  setSelectedDesk(deskId);
  queueDeskUpdate(deskId, { rotation: nextRotation });
};

const renderFloorPlan = (svgMarkup) => {
  if (!floorPlanPreview || !floorPlanPlaceholder || !floorPlanCanvas) {
    return;
  }
  floorPlanDirty = false;
  clearSpaceSelection();
  hasFloorPlan = Boolean(svgMarkup);
  updateFloorPlanActionLabel();
  updateFloorPlanSpacesVisibility();
  floorPlanCanvas.innerHTML = "";
  if (!svgMarkup) {
    floorPlanPreview.classList.add("is-hidden");
    floorPlanPlaceholder.classList.remove("is-hidden");
    lassoState.svg = null;
    lassoState.spacesLayer = null;
    lassoState.previewLayer = null;
    return;
  }
  floorPlanPreview.classList.remove("is-hidden");
  floorPlanPlaceholder.classList.add("is-hidden");
  floorPlanCanvas.innerHTML = svgMarkup;
  const svg = floorPlanCanvas.querySelector("svg");
  if (svg) {
    stripEditorArtifacts(svg);
    if (!svg.hasAttribute("viewBox")) {
      const width = parseFloat(svg.getAttribute("width"));
      const height = parseFloat(svg.getAttribute("height"));
      if (Number.isFinite(width) && Number.isFinite(height)) {
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      }
    }
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    ensureSpaceLayers(svg);
    bindSpaceInteractions(svg);
  }
  resetFloorPlanTransform();
  updateSpaceListColors();
  if (currentSpaces.length > 0) {
    void syncSpacePolygons(currentSpaces, { persistMissing: true });
  }
};

const setFormMode = (mode) => {
  if (mode === "edit") {
    submitBtn.textContent = "Сохранить";
    modalTitle.textContent = "Редактировать здание";
    if (deleteBuildingBtn) {
      deleteBuildingBtn.classList.remove("is-hidden");
    }
    if (buildingImageInput) {
      buildingImageInput.value = "";
      buildingImageInput.disabled = false;
    }
    if (floorsFields) {
      floorsFields.classList.add("is-hidden");
    }
    if (buildingUndergroundFloorsInput) {
      buildingUndergroundFloorsInput.disabled = true;
    }
    if (buildingAbovegroundFloorsInput) {
      buildingAbovegroundFloorsInput.disabled = true;
    }
    if (currentBuilding && currentBuilding.image_url) {
      showImagePreview(currentBuilding.image_url);
    } else {
      clearImagePreview();
    }
  } else {
    submitBtn.textContent = "Добавить";
    modalTitle.textContent = "Добавить здание";
    if (deleteBuildingBtn) {
      deleteBuildingBtn.classList.add("is-hidden");
    }
    if (buildingImageInput) {
      buildingImageInput.disabled = false;
    }
    if (floorsFields) {
      floorsFields.classList.remove("is-hidden");
    }
    if (buildingUndergroundFloorsInput) {
      buildingUndergroundFloorsInput.disabled = false;
    }
    if (buildingAbovegroundFloorsInput) {
      buildingAbovegroundFloorsInput.disabled = false;
    }
    clearImagePreview();
  }
};

const getBuildingImageUrl = (building) => {
  if (building.image_url) {
    return building.image_url;
  }
  const safeId = Number.isFinite(Number(building.id)) ? Number(building.id) : 0;
  const index = Math.abs(safeId) % fallbackBuildingImages.length;
  return fallbackBuildingImages[index];
};

const renderBuildings = () => {
  if (!buildingsGrid || !emptyState) {
    return;
  }
  buildingsGrid.innerHTML = "";
  if (buildings.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  buildings.forEach((building) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "building-tile";
    tile.style.setProperty("--tile-image", `url("${getBuildingImageUrl(building)}")`);
    const name = document.createElement("strong");
    name.textContent = building.name;
    tile.append(name);
    tile.addEventListener("click", () => {
      clearStatus();
      window.location.assign(`/buildings/${encodeURIComponent(building.id)}`);
    });
    buildingsGrid.appendChild(tile);
  });
};

const setPageMode = (mode) => {
  if (!buildingsPage || !buildingPage) {
    return;
  }
  if (mode === "building") {
    setFloorEditMode(false);
    setSpaceEditMode(false);
    buildingsPage.classList.add("is-hidden");
    buildingPage.classList.remove("is-hidden");
    if (floorPage) {
      floorPage.classList.add("is-hidden");
    }
    if (spacePage) {
      spacePage.classList.add("is-hidden");
    }
    openAddModalBtn.classList.add("is-hidden");
    if (editBuildingBtn) {
      editBuildingBtn.classList.remove("is-hidden");
    }
    if (editFloorBtn) {
      editFloorBtn.classList.add("is-hidden");
    }
    if (editSpaceBtn) {
      editSpaceBtn.classList.add("is-hidden");
    }
    if (pageTitle) {
      pageTitle.textContent = "Здание";
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = "Просмотр этажей и планировок.";
    }
    return;
  }
  if (mode === "floor") {
    setFloorEditMode(false);
    setSpaceEditMode(false);
    buildingsPage.classList.add("is-hidden");
    buildingPage.classList.add("is-hidden");
    if (floorPage) {
      floorPage.classList.remove("is-hidden");
    }
    if (spacePage) {
      spacePage.classList.add("is-hidden");
    }
    openAddModalBtn.classList.add("is-hidden");
    if (editBuildingBtn) {
      editBuildingBtn.classList.add("is-hidden");
    }
    if (editFloorBtn) {
      editFloorBtn.classList.remove("is-hidden");
    }
    if (editSpaceBtn) {
      editSpaceBtn.classList.add("is-hidden");
    }
    if (pageTitle) {
      pageTitle.textContent = "Этаж";
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = "Загрузка плана и данные этажа.";
    }
    return;
  }
  if (mode === "space") {
    setFloorEditMode(false);
    setSpaceEditMode(false);
    buildingsPage.classList.add("is-hidden");
    buildingPage.classList.add("is-hidden");
    if (floorPage) {
      floorPage.classList.add("is-hidden");
    }
    if (spacePage) {
      spacePage.classList.remove("is-hidden");
    }
    openAddModalBtn.classList.add("is-hidden");
    if (editBuildingBtn) {
      editBuildingBtn.classList.add("is-hidden");
    }
    if (editFloorBtn) {
      editFloorBtn.classList.add("is-hidden");
    }
    if (editSpaceBtn) {
      editSpaceBtn.classList.remove("is-hidden");
    }
    if (pageTitle) {
      pageTitle.textContent = "Пространство";
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = "Просмотр коворкинга.";
    }
    return;
  }
  setFloorEditMode(false);
  setSpaceEditMode(false);
  buildingsPage.classList.remove("is-hidden");
  buildingPage.classList.add("is-hidden");
  if (floorPage) {
    floorPage.classList.add("is-hidden");
  }
  if (spacePage) {
    spacePage.classList.add("is-hidden");
  }
  openAddModalBtn.classList.remove("is-hidden");
  if (editBuildingBtn) {
    editBuildingBtn.classList.add("is-hidden");
  }
  if (editFloorBtn) {
    editFloorBtn.classList.add("is-hidden");
  }
  if (pageTitle) {
    pageTitle.textContent = "Офисные здания";
  }
  if (pageSubtitle) {
    pageSubtitle.textContent = "Добавляйте здания и выбирайте нужное из списка.";
  }
};

const renderFloors = (floors) => {
  if (!floorsList || !floorsEmpty) {
    return;
  }
  floorsList.innerHTML = "";
  if (!floors || floors.length === 0) {
    floorsList.classList.add("is-hidden");
    floorsEmpty.classList.remove("is-hidden");
    return;
  }
  floorsList.classList.remove("is-hidden");
  floorsEmpty.classList.add("is-hidden");
  floors.forEach((floor) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "floor-card";

    const header = document.createElement("div");
    header.className = "floor-header";

    const title = document.createElement("div");
    title.className = "floor-title";
    title.textContent = floor.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `Этаж ${floor.level}`;

    header.append(title, badge);

    const meta = document.createElement("div");
    meta.className = "floor-meta";
    const spacesCount = Number.isFinite(floor.spaces_count) ? floor.spaces_count : 0;
    meta.textContent = `Пространств: ${spacesCount}`;

    card.append(header, meta);
    if (currentBuilding) {
      card.addEventListener("click", () => {
        clearBuildingStatus();
        window.location.assign(
          `/buildings/${encodeURIComponent(currentBuilding.id)}/floors/${encodeURIComponent(
            floor.level
          )}`
        );
      });
    }
    floorsList.appendChild(card);
  });
};

const resetForm = (mode = "create") => {
  buildingNameInput.value = "";
  buildingAddressInput.value = "";
  if (buildingUndergroundFloorsInput) {
    buildingUndergroundFloorsInput.value = "0";
  }
  if (buildingAbovegroundFloorsInput) {
    buildingAbovegroundFloorsInput.value = "0";
  }
  if (buildingImageInput) {
    buildingImageInput.value = "";
  }
  editingId = null;
  removeImage = false;
  setFormMode(mode);
};

const openModal = (mode = "create") => {
  buildingModal.classList.add("is-open");
  buildingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setFormMode(mode);
};

const closeModal = () => {
  buildingModal.classList.remove("is-open");
  buildingModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearStatus();
};

const openEditModal = () => {
  if (!currentBuilding) {
    setStatus("Не удалось определить здание для редактирования.", "error");
    return;
  }
  clearStatus();
  buildingNameInput.value = currentBuilding.name || "";
  buildingAddressInput.value = currentBuilding.address || "";
  editingId = currentBuilding.id;
  removeImage = false;
  openModal("edit");
};

const deleteCurrentBuilding = async () => {
  const targetId = editingId || (currentBuilding ? currentBuilding.id : null);
  if (!targetId) {
    setStatus("Не удалось определить здание для удаления.", "error");
    return;
  }
  const confirmed = window.confirm("Удалить здание? Это действие нельзя отменить.");
  if (!confirmed) {
    return;
  }
  if (deleteBuildingBtn) {
    deleteBuildingBtn.disabled = true;
  }
  try {
    await apiRequest(`/api/buildings/${targetId}`, { method: "DELETE" });
    closeModal();
    window.location.assign("/buildings");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    if (deleteBuildingBtn) {
      deleteBuildingBtn.disabled = false;
    }
  }
};

const refreshBuildings = async () => {
  const data = await apiRequest("/api/buildings");
  buildings = Array.isArray(data.items) ? data.items : [];
  buildings.forEach((building) => preloadBuildingImage(building));
};

const getBuildingIdFromPath = () => {
  const match = window.location.pathname.match(/^\/buildings\/(\d+)(?:\/)?$/);
  if (!match) {
    return null;
  }
  const id = Number(match[1]);
  return Number.isNaN(id) ? null : id;
};

const getFloorParamsFromPath = () => {
  const match = window.location.pathname.match(/^\/buildings\/(\d+)\/floors\/(-?\d+)(?:\/)?$/);
  if (!match) {
    return null;
  }
  const buildingID = Number(match[1]);
  const floorNumber = Number(match[2]);
  if (Number.isNaN(buildingID) || Number.isNaN(floorNumber)) {
    return null;
  }
  return { buildingID, floorNumber };
};

const getSpaceParamsFromPath = () => {
  const match = window.location.pathname.match(
    /^\/buildings\/(\d+)\/floors\/(-?\d+)\/spaces\/(\d+)(?:\/)?$/
  );
  if (!match) {
    return null;
  }
  const buildingID = Number(match[1]);
  const floorNumber = Number(match[2]);
  const spaceId = Number(match[3]);
  if (Number.isNaN(buildingID) || Number.isNaN(floorNumber) || Number.isNaN(spaceId)) {
    return null;
  }
  return { buildingID, floorNumber, spaceId };
};

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsText(file);
  });

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });

const getImageSize = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error("Не удалось загрузить изображение."));
    img.src = dataUrl;
  });

const buildSvgWithImage = (dataUrl, width, height) => {
  const safeDataUrl = dataUrl.replace(/"/g, "&quot;");
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}" ` +
    `preserveAspectRatio="xMidYMid meet">` +
    `<image x="0" y="0" width="${safeWidth}" height="${safeHeight}" href="${safeDataUrl}" xlink:href="${safeDataUrl}" />` +
    `</svg>`
  );
};

const normalizeSvgMarkup = (markup) => {
  if (!markup) {
    return "";
  }
  if (!markup.includes("<svg")) {
    return "";
  }
  if (!markup.includes('xmlns="http://www.w3.org/2000/svg"')) {
    return markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return markup;
};

const fileToSvgMarkup = async (file) => {
  if (!file) {
    throw new Error("Файл не выбран.");
  }
  const isSvgFile =
    file.type === "image/svg+xml" || (file.name && file.name.toLowerCase().endsWith(".svg"));
  if (isSvgFile) {
    const raw = await readFileAsText(file);
    const normalized = normalizeSvgMarkup(raw.trim());
    if (!normalized) {
      throw new Error("Не удалось прочитать SVG.");
    }
    return normalized;
  }
  const dataUrl = await readFileAsDataUrl(file);
  const { width, height } = await getImageSize(dataUrl);
  return buildSvgWithImage(dataUrl, width, height);
};

const loadBuildingPage = async (buildingID) => {
  setPageMode("building");
  clearBuildingStatus();
  try {
    await refreshBuildings();
    const building = buildings.find((item) => item.id === buildingID);
    if (!building) {
      currentBuilding = null;
      if (editBuildingBtn) {
        editBuildingBtn.classList.add("is-hidden");
      }
      setBuildingStatus("Здание не найдено.", "error");
      if (pageTitle) {
        pageTitle.textContent = "Здание не найдено";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Проверьте ссылку или вернитесь к списку.";
      }
      renderFloors([]);
      return;
    }
    currentBuilding = building;
    preloadBuildingImage(building);
    if (pageTitle) {
      pageTitle.textContent = building.name;
    }

    const floorsResponse = await apiRequest(`/api/buildings/${buildingID}/floors`);
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    if (floorsCount) {
      floorsCount.textContent = `${floors.length}`;
    }
    renderFloors(floors);
  } catch (error) {
    setBuildingStatus(error.message, "error");
  }
};

const loadFloorSpaces = async (floorID) => {
  if (!floorID) {
    renderFloorSpaces([]);
    return;
  }
  try {
    const spacesResponse = await apiRequest(`/api/floors/${floorID}/spaces`);
    const spaces = Array.isArray(spacesResponse.items) ? spacesResponse.items : [];
    renderFloorSpaces(spaces);
    await syncSpacePolygons(spaces, { persistMissing: true });
  } catch (error) {
    renderFloorSpaces([]);
    setFloorStatus(error.message, "error");
  }
};

const loadFloorPage = async (buildingID, floorNumber) => {
  setPageMode("floor");
  clearFloorStatus();
  renderFloorPlan("");
  renderFloorSpaces([]);
  currentFloor = null;
  try {
    await refreshBuildings();
    const building = buildings.find((item) => item.id === buildingID);
    if (!building) {
      currentBuilding = null;
      setFloorStatus("Здание не найдено.", "error");
      if (pageTitle) {
        pageTitle.textContent = "Здание не найдено";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Проверьте ссылку или вернитесь к списку.";
      }
      return;
    }
    currentBuilding = building;
    preloadBuildingImage(building);
    if (breadcrumbBuilding) {
      breadcrumbBuilding.href = `/buildings/${encodeURIComponent(building.id)}`;
      breadcrumbBuilding.textContent = building.name || "Здание";
    }
    if (pageTitle) {
      pageTitle.textContent = `Этаж ${floorNumber}`;
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = building.name || "";
    }

    const floorsResponse = await apiRequest(`/api/buildings/${buildingID}/floors`);
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    const floor = floors.find((item) => item.level === floorNumber);
    if (!floor) {
      setFloorStatus("Этаж не найден.", "error");
      if (floorTitle) {
        floorTitle.textContent = `Этаж ${floorNumber}`;
      }
      if (floorSubtitle) {
        floorSubtitle.textContent = building.address || "";
      }
      if (floorLevelTag) {
        floorLevelTag.textContent = `Этаж ${floorNumber}`;
      }
      return;
    }
    currentFloor = floor;
    if (floorTitle) {
      floorTitle.textContent = floor.name || `Этаж ${floor.level}`;
    }
    if (floorSubtitle) {
      floorSubtitle.textContent = "";
      floorSubtitle.textContent = "";
    }
    if (floorLevelTag) {
      floorLevelTag.textContent = `Этаж ${floor.level}`;
    }

    const floorDetails = await apiRequest(`/api/floors/${floor.id}`);
    const planSvg = floorDetails && floorDetails.plan_svg ? floorDetails.plan_svg : "";
    currentFloor = { ...floor, plan_svg: planSvg };
    renderFloorPlan(planSvg);
    await loadFloorSpaces(floor.id);
  } catch (error) {
    setFloorStatus(error.message, "error");
  }
};

const renderSpaceSnapshot = (space, floorPlanMarkup) => {
  if (!spaceSnapshot || !spaceSnapshotCanvas || !spaceSnapshotPlaceholder) {
    return;
  }
  spaceSnapshotCanvas.innerHTML = "";
  const points = normalizeSpacePoints(space?.points);
  currentSpaceBounds = points.length >= 3 ? getSpaceBounds(points) : null;
  const snapshotSvg = buildSpaceSnapshotSvg(
    floorPlanMarkup || "",
    points,
    space?.color || "#60a5fa",
    space?.id || null
  );
  if (!snapshotSvg) {
    spaceSnapshotPlaceholder.classList.remove("is-hidden");
    resetSpaceSnapshotTransform();
    return;
  }
  spaceSnapshotPlaceholder.classList.add("is-hidden");
  spaceSnapshotCanvas.appendChild(snapshotSvg);
  resetSpaceSnapshotTransform();
  scheduleDeskRender();
};

const loadSpacePage = async ({ buildingID, floorNumber, spaceId }) => {
  setPageMode("space");
  clearSpacePageStatus();
  if (spaceSnapshotCanvas) {
    spaceSnapshotCanvas.innerHTML = "";
  }
  if (spaceSnapshotPlaceholder) {
    spaceSnapshotPlaceholder.classList.add("is-hidden");
  }
  currentSpace = null;
  currentSpaceBounds = null;
  currentDesks = [];
  pendingDeskUpdates = new Map();
  setSpaceEditMode(false);
  try {
    const space = await apiRequest(`/api/spaces/${spaceId}`);
    if (!space || !space.id) {
      throw new Error("Пространство не найдено.");
    }
    currentSpace = space;
    const floorsResponse = await apiRequest(`/api/buildings/${buildingID}/floors`);
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    const floor = floors.find((item) => item.level === floorNumber) || null;
    if (!floor) {
      throw new Error("Этаж не найден.");
    }
    const floorDetails = await apiRequest(`/api/floors/${floor.id}`);
    const building = await apiRequest(`/api/buildings/${buildingID}`);

    if (spaceBreadcrumbBuilding) {
      const buildingId = building?.id || buildingID || "";
      spaceBreadcrumbBuilding.href = `/buildings/${encodeURIComponent(buildingId)}`;
      spaceBreadcrumbBuilding.textContent = building?.name || "Здание";
    }
    if (spaceBreadcrumbFloor) {
      const buildingId = building?.id || buildingID || "";
      const level = Number.isFinite(floor?.level) ? floor.level : floorNumber;
      spaceBreadcrumbFloor.href = `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(
        level
      )}`;
      spaceBreadcrumbFloor.textContent = Number.isFinite(floor?.level)
        ? `Этаж ${floor.level}`
        : `Этаж ${floorNumber}`;
    }

    const kindLabel = getSpaceKindLabel(space.kind);
    if (spaceName) {
      spaceName.textContent = space.name || "Пространство";
    }
    if (spaceKindTag) {
      spaceKindTag.textContent = kindLabel || "Без типа";
      spaceKindTag.classList.toggle("is-hidden", !kindLabel);
    }
    if (spaceCapacityTag) {
      const capacityValue = Number(space.capacity);
      if (space.kind === "meeting" && Number.isFinite(capacityValue) && capacityValue > 0) {
        spaceCapacityTag.textContent = `Вместимость: ${capacityValue}`;
        spaceCapacityTag.classList.remove("is-hidden");
      } else {
        spaceCapacityTag.classList.add("is-hidden");
        spaceCapacityTag.textContent = "";
      }
    }
    if (spaceIdTag) {
      spaceIdTag.textContent = space.id ? `ID: ${space.id}` : "";
      spaceIdTag.classList.toggle("is-hidden", !space.id);
    }
    if (pageTitle) {
      pageTitle.textContent = space.name || "Пространство";
    }
    if (pageSubtitle) {
      const buildingName = building?.name || "";
      const floorLabel = Number.isFinite(floor?.level) ? `Этаж ${floor.level}` : "";
      const parts = [buildingName, floorLabel].filter(Boolean);
      pageSubtitle.textContent = parts.length > 0 ? parts.join(" · ") : "Просмотр пространства.";
    }

    if (space.kind !== "coworking") {
      if (editSpaceBtn) {
        editSpaceBtn.classList.add("is-hidden");
      }
      setSpacePageStatus("Страница доступна только для коворкингов.", "info");
      if (spaceSnapshotPlaceholder) {
        spaceSnapshotPlaceholder.classList.remove("is-hidden");
      }
      return;
    }

    if (editSpaceBtn) {
      editSpaceBtn.classList.remove("is-hidden");
    }
    renderSpaceSnapshot(space, floorDetails?.plan_svg || "");
    await loadSpaceDesks(space.id);
  } catch (error) {
    setSpacePageStatus(error.message, "error");
    if (spaceSnapshotPlaceholder) {
      spaceSnapshotPlaceholder.classList.remove("is-hidden");
    }
  }
};

buildingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  const name = buildingNameInput.value.trim();
  const address = buildingAddressInput.value.trim();
  if (!name || !address) {
    setStatus("Заполните название и адрес здания.", "error");
    return;
  }

  try {
    let created = false;
    if (editingId) {
      await apiRequest(`/api/buildings/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ name, address }),
      });
      if (buildingImageInput && buildingImageInput.files[0]) {
        const formData = new FormData();
        formData.append("image", buildingImageInput.files[0]);
        await apiRequest(`/api/buildings/${editingId}/image`, {
          method: "POST",
          body: formData,
        });
        removeImage = false;
      } else if (removeImage) {
        const formData = new FormData();
        formData.append("remove", "true");
        await apiRequest(`/api/buildings/${editingId}/image`, {
          method: "POST",
          body: formData,
        });
      }
    } else {
      const undergroundFloorsRaw = buildingUndergroundFloorsInput
        ? buildingUndergroundFloorsInput.value.trim()
        : "";
      const abovegroundFloorsRaw = buildingAbovegroundFloorsInput
        ? buildingAbovegroundFloorsInput.value.trim()
        : "";
      const undergroundFloors = undergroundFloorsRaw === "" ? 0 : Number(undergroundFloorsRaw);
      const abovegroundFloors = abovegroundFloorsRaw === "" ? 0 : Number(abovegroundFloorsRaw);
      if (
        !Number.isFinite(undergroundFloors) ||
        !Number.isFinite(abovegroundFloors) ||
        undergroundFloors < 0 ||
        abovegroundFloors < 0 ||
        !Number.isInteger(undergroundFloors) ||
        !Number.isInteger(abovegroundFloors)
      ) {
        setStatus("Количество этажей должно быть целым числом от 0.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("name", name);
      formData.append("address", address);
      formData.append("underground_floors", String(undergroundFloors));
      formData.append("aboveground_floors", String(abovegroundFloors));
      if (buildingImageInput && buildingImageInput.files[0]) {
        formData.append("image", buildingImageInput.files[0]);
      }
      const result = await apiRequest("/api/buildings", {
        method: "POST",
        body: formData,
      });
      editingId = result.id;
      created = true;
    }
    await refreshBuildings();
    renderBuildings();
    resetForm();
    if (created) {
      closeModal();
      setStatus("Здание добавлено.", "success");
    } else {
      const updated = buildings.find((item) => item.id === editingId);
      if (updated) {
        currentBuilding = updated;
      }
      if (currentBuilding) {
        currentBuilding = { ...currentBuilding, name, address };
      }
      if (buildingTitle) {
        buildingTitle.textContent = name;
      }
      if (buildingAddressText) {
        buildingAddressText.textContent = address;
      }
      if (pageTitle) {
        pageTitle.textContent = name;
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = address;
      }
      closeModal();
      setBuildingStatus("Здание обновлено.", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

openAddModalBtn.addEventListener("click", () => {
  clearStatus();
  resetForm("create");
  openModal("create");
});

if (editBuildingBtn) {
  editBuildingBtn.addEventListener("click", () => {
    openEditModal();
  });
}

if (buildingImageInput) {
  buildingImageInput.addEventListener("change", () => {
    if (buildingImageInput.files && buildingImageInput.files[0]) {
      removeImage = false;
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
      previewObjectUrl = URL.createObjectURL(buildingImageInput.files[0]);
      showImagePreview(previewObjectUrl);
    } else if (!removeImage && currentBuilding && currentBuilding.image_url && editingId) {
      showImagePreview(currentBuilding.image_url);
    } else {
      clearImagePreview();
    }
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    removeImage = true;
    if (buildingImageInput) {
      buildingImageInput.value = "";
    }
    clearImagePreview();
  });
}

if (deleteBuildingBtn) {
  deleteBuildingBtn.addEventListener("click", () => {
    deleteCurrentBuilding();
  });
}

if (editFloorBtn) {
  editFloorBtn.addEventListener("click", async () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    clearFloorStatus();
    if (isFloorEditing) {
      if (floorPlanDirty && lassoState.svg) {
        editFloorBtn.disabled = true;
        try {
          await saveSpacePositions();
          floorPlanDirty = false;
          setFloorStatus("Изменения пространств сохранены.", "success");
        } catch (error) {
          setFloorStatus(error.message, "error");
          return;
        } finally {
          editFloorBtn.disabled = false;
        }
      }
      setFloorEditMode(false);
      return;
    }
    setFloorEditMode(true);
  });
}

if (editSpaceBtn) {
  editSpaceBtn.addEventListener("click", async () => {
    if (!currentSpace) {
      setSpacePageStatus("Сначала выберите пространство.", "error");
      return;
    }
    if (currentSpace.kind !== "coworking") {
      setSpacePageStatus("Редактирование доступно только для коворкингов.", "info");
      return;
    }
    clearSpacePageStatus();
    if (isSpaceEditing) {
      if (editSpaceBtn) {
        editSpaceBtn.disabled = true;
      }
      try {
        await finalizeActiveDeskInteraction();
        if (pendingDeskUpdates.size > 0) {
          await flushPendingDeskUpdates();
          setSpacePageStatus("Изменения столов сохранены.", "success");
        }
        setSpaceEditMode(false);
      } catch (error) {
        setSpacePageStatus(error.message, "error");
      } finally {
        if (editSpaceBtn) {
          editSpaceBtn.disabled = false;
        }
      }
      return;
    }
    setSpaceEditMode(true);
  });
}

if (addDeskBtn) {
  addDeskBtn.addEventListener("click", () => {
    if (!isSpaceEditing) {
      setSpacePageStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    clearSpacePageStatus();
    setDeskPlacementActive(false);
    void addDeskToFreeSpot();
  });
}

if (deleteDeskBtn) {
  deleteDeskBtn.addEventListener("click", async () => {
    if (!isSpaceEditing) {
      setSpacePageStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    const selectedIds = getSelectedDeskIds();
    if (selectedIds.length === 0) {
      setSpacePageStatus("Выберите стол для удаления.", "error");
      return;
    }
    const confirmMessage =
      selectedIds.length === 1 ? "Удалить стол?" : `Удалить выбранные столы (${selectedIds.length})?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    deleteDeskBtn.disabled = true;
    try {
      const numericIds = selectedIds.map((deskId) => Number(deskId)).filter(Number.isFinite);
      if (numericIds.length === 0) {
        setSpacePageStatus("Выберите стол для удаления.", "error");
        return;
      }
      await apiRequest("/api/desks/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids: numericIds }),
      });
      const idSet = new Set(numericIds.map((id) => String(id)));
      currentDesks = currentDesks.filter((desk) => !idSet.has(String(desk.id)));
      numericIds.forEach((id) => pendingDeskUpdates.delete(String(id)));
      renderSpaceDesks(currentDesks);
      renderSpaceDeskList(currentDesks);
      setSelectedDesk(null);
      setSpacePageStatus(
        selectedIds.length === 1 ? "Стол удален." : "Столы удалены.",
        "success"
      );
    } catch (error) {
      setSpacePageStatus(error.message, "error");
    } finally {
      deleteDeskBtn.disabled = false;
    }
  });
}

if (copyDeskBtn) {
  copyDeskBtn.addEventListener("click", () => {
    clearSpacePageStatus();
    copySelectedDesk();
  });
}

if (pasteDeskBtn) {
  pasteDeskBtn.addEventListener("click", () => {
    clearSpacePageStatus();
    void pasteCopiedDesk();
  });
}

if (shrinkDeskBtn) {
  shrinkDeskBtn.addEventListener("click", () => {
    if (!isSpaceEditing) {
      setSpacePageStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    clearSpacePageStatus();
    shrinkSelectedDesk();
  });
}

if (rotateDeskBtn) {
  rotateDeskBtn.addEventListener("click", () => {
    if (!isSpaceEditing) {
      setSpacePageStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    clearSpacePageStatus();
    rotateSelectedDesk();
  });
}

if (spaceSnapshot) {
  spaceSnapshot.addEventListener("click", (event) => {
    void handleSnapshotDeskPlacement(event);
    if (deskEditState.skipSelectionClear) {
      deskEditState.skipSelectionClear = false;
      return;
    }
    if (
      isSpaceEditing &&
      !isDeskPlacementActive &&
      !(event.target && event.target.closest && event.target.closest(".space-desk"))
    ) {
      setSelectedDesk(null);
    }
  });
  spaceSnapshot.addEventListener("pointermove", handleDeskPointerMove);
  spaceSnapshot.addEventListener("pointerup", handleDeskPointerEnd);
  spaceSnapshot.addEventListener("pointercancel", handleDeskPointerEnd);
}

document.addEventListener("keydown", (event) => {
  if (!isSpaceEditing) {
    return;
  }
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }
  const key = event.key ? event.key.toLowerCase() : "";
  const hasModifier = event.metaKey || event.ctrlKey;
  if (hasModifier && key === "c") {
    if (copyDeskBtn && !copyDeskBtn.disabled) {
      event.preventDefault();
      copyDeskBtn.click();
    }
    return;
  }
  if (hasModifier && key === "v") {
    if (pasteDeskBtn && !pasteDeskBtn.disabled) {
      event.preventDefault();
      pasteDeskBtn.click();
    }
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (deleteDeskBtn && !deleteDeskBtn.disabled) {
      deleteDeskBtn.click();
    }
  }
});

if (cancelFloorEditBtn) {
  cancelFloorEditBtn.addEventListener("click", () => {
    setFloorEditMode(false);
  });
}

if (cancelSpaceEditBtn) {
  cancelSpaceEditBtn.addEventListener("click", async () => {
    if (!isSpaceEditing) {
      return;
    }
    if (!currentSpace) {
      setSpacePageStatus("Сначала выберите пространство.", "error");
      return;
    }
    cancelSpaceEditBtn.disabled = true;
    try {
      await finalizeActiveDeskInteraction();
      setSpaceEditMode(false);
      await loadSpaceDesks(currentSpace.id);
      clearSpacePageStatus();
    } catch (error) {
      setSpacePageStatus(error.message, "error");
    } finally {
      cancelSpaceEditBtn.disabled = false;
    }
  });
}

if (openFloorPlanModalBtn) {
  openFloorPlanModalBtn.addEventListener("click", () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    if (!isFloorEditing) {
      setFloorStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    clearFloorStatus();
    floorPlanModalRequested = true;
    updateFloorPlanSpacesVisibility();
  });
}

if (uploadFloorPlanBtn) {
  uploadFloorPlanBtn.addEventListener("click", async () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    if (!isFloorEditing) {
      setFloorStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    if (!floorPlanFile || !floorPlanFile.files || !floorPlanFile.files[0]) {
      setFloorStatus("Выберите изображение с планом.", "error");
      return;
    }
    clearFloorStatus();
    uploadFloorPlanBtn.disabled = true;
    try {
      const svgMarkup = await fileToSvgMarkup(floorPlanFile.files[0]);
      const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
        method: "PUT",
        body: JSON.stringify({ plan_svg: svgMarkup }),
      });
      currentFloor = { ...currentFloor, plan_svg: updated.plan_svg || svgMarkup };
      renderFloorPlan(updated.plan_svg || svgMarkup);
      floorPlanFile.value = "";
      setFloorStatus("План этажа обновлен.", "success");
      closeFloorPlanModal();
    } catch (error) {
      setFloorStatus(error.message, "error");
    } finally {
      uploadFloorPlanBtn.disabled = false;
    }
  });
}

if (deleteFloorPlanBtn) {
  deleteFloorPlanBtn.addEventListener("click", async () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    if (!isFloorEditing) {
      setFloorStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    if (!hasFloorPlan) {
      setFloorStatus("План этажа уже удален.", "error");
      return;
    }
    if (!window.confirm("Удалить план этажа? Пространства будут удалены.")) {
      return;
    }
    clearFloorStatus();
    deleteFloorPlanBtn.disabled = true;
    try {
      const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
        method: "PUT",
        body: JSON.stringify({ plan_svg: "" }),
      });
      currentFloor = { ...currentFloor, plan_svg: updated.plan_svg || "" };
      renderFloorPlan("");
      await loadFloorSpaces(currentFloor.id);
      setFloorStatus("План этажа удален.", "success");
      setFloorEditMode(false);
    } catch (error) {
      setFloorStatus(error.message, "error");
    } finally {
      deleteFloorPlanBtn.disabled = false;
    }
  });
}

if (addSpaceBtn) {
  addSpaceBtn.addEventListener("click", async () => {
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
      return;
    }
    clearFloorStatus();
    startLassoMode();
  });
}

if (spaceForm) {
  spaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentFloor) {
      setSpaceStatus("Сначала выберите этаж.", "error");
      return;
    }
    if (editingSpace && editingSpace.id) {
      const name = spaceNameField ? spaceNameField.value.trim() : "";
      const kind = spaceKindField ? spaceKindField.value : "";
      const capacityRaw = spaceCapacityField ? spaceCapacityField.value.trim() : "";
      const capacity = capacityRaw === "" ? 0 : Number(capacityRaw);
      const color = spaceColorInput && spaceColorInput.value ? spaceColorInput.value : "#60a5fa";
      if (!name) {
        setSpaceStatus("Укажите название пространства.", "error");
        return;
      }
      if (!kind) {
        setSpaceStatus("Выберите тип пространства.", "error");
        return;
      }
      if (kind === "meeting" && (!Number.isFinite(capacity) || capacity <= 0)) {
        setSpaceStatus("Укажите количество человек для переговорки.", "error");
        return;
      }
      clearSpaceStatus();
      if (spaceSaveBtn) {
        spaceSaveBtn.disabled = true;
      }
      try {
        await apiRequest(`/api/spaces/${editingSpace.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            kind,
            capacity: kind === "meeting" ? capacity : 0,
            color,
          }),
        });
        await loadFloorSpaces(currentFloor.id);
        setFloorStatus("Пространство обновлено.", "success");
        closeSpaceModal();
      } catch (error) {
        setSpaceStatus(error.message, "error");
      } finally {
        if (spaceSaveBtn) {
          spaceSaveBtn.disabled = false;
        }
      }
      return;
    }
    const points = lassoState.pendingPoints;
    if (!points || points.length < 3) {
      setSpaceStatus("Сначала выделите область на плане.", "error");
      return;
    }
    const name = spaceNameField ? spaceNameField.value.trim() : "";
    const kind = spaceKindField ? spaceKindField.value : "";
    const capacityRaw = spaceCapacityField ? spaceCapacityField.value.trim() : "";
    const capacity = capacityRaw === "" ? 0 : Number(capacityRaw);
    const color = spaceColorInput && spaceColorInput.value ? spaceColorInput.value : "#60a5fa";
    if (!name) {
      setSpaceStatus("Укажите название пространства.", "error");
      return;
    }
    if (!kind) {
      setSpaceStatus("Выберите тип пространства.", "error");
      return;
    }
    if (kind === "meeting" && (!Number.isFinite(capacity) || capacity <= 0)) {
      setSpaceStatus("Укажите количество человек для переговорки.", "error");
      return;
    }
    clearSpaceStatus();
    if (spaceSaveBtn) {
      spaceSaveBtn.disabled = true;
    }
    let createdElements = null;
    try {
      createdElements = createSpacePolygon(points, name, color, null, kind);
      if (!createdElements || !lassoState.svg) {
        throw new Error("Не удалось создать пространство на плане.");
      }
      const createdSpace = await apiRequest("/api/spaces", {
        method: "POST",
        body: JSON.stringify({
          floor_id: currentFloor.id,
          name,
          kind,
          capacity: kind === "meeting" ? capacity : 0,
          color,
          points,
        }),
      });
      if (createdElements.polygon && createdSpace?.id) {
        createdElements.polygon.setAttribute("data-space-id", String(createdSpace.id));
      }
      const svgMarkup = getCleanFloorPlanMarkup();
      const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
        method: "PUT",
        body: JSON.stringify({ plan_svg: svgMarkup }),
      });
      currentFloor = { ...currentFloor, plan_svg: updated.plan_svg || svgMarkup };
      setFloorStatus("Пространство добавлено.", "success");
      await loadFloorSpaces(currentFloor.id);
      closeSpaceModal();
    } catch (error) {
      if (createdElements) {
        createdElements.polygon.remove();
      }
      setSpaceStatus(error.message, "error");
    } finally {
      if (spaceSaveBtn) {
        spaceSaveBtn.disabled = false;
      }
    }
  });
}

if (spaceDeleteBtn) {
  spaceDeleteBtn.addEventListener("click", async () => {
    if (!editingSpace || !editingSpace.id) {
      setSpaceStatus("Пространство не выбрано.", "error");
      return;
    }
    if (!window.confirm("Удалить пространство?")) {
      return;
    }
    clearSpaceStatus();
    spaceDeleteBtn.disabled = true;
    if (spaceSaveBtn) {
      spaceSaveBtn.disabled = true;
    }
    try {
      await apiRequest(`/api/spaces/${editingSpace.id}`, { method: "DELETE" });
      await loadFloorSpaces(currentFloor?.id);
      setFloorStatus("Пространство удалено.", "success");
      closeSpaceModal();
    } catch (error) {
      setSpaceStatus(error.message, "error");
    } finally {
      spaceDeleteBtn.disabled = false;
      if (spaceSaveBtn) {
        spaceSaveBtn.disabled = false;
      }
    }
  });
}

if (deskForm) {
  deskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingDesk || !editingDesk.id) {
      setDeskStatus("Не удалось определить стол для редактирования.", "error");
      return;
    }
    const label = deskNameField ? deskNameField.value.trim() : "";
    if (!label) {
      setDeskStatus("Укажите название стола.", "error");
      return;
    }
    clearDeskStatus();
    if (deskSaveBtn) {
      deskSaveBtn.disabled = true;
    }
    try {
      const updated = await apiRequest(`/api/desks/${editingDesk.id}`, {
        method: "PUT",
        body: JSON.stringify({ label }),
      });
      const nextDesk = updated || { ...editingDesk, label };
      const index = currentDesks.findIndex((desk) => String(desk.id) === String(nextDesk.id));
      if (index >= 0) {
        currentDesks[index] = nextDesk;
      }
      renderSpaceDesks(currentDesks);
      renderSpaceDeskList(currentDesks);
      setSelectedDesk(nextDesk.id);
      setSpacePageStatus("Название стола обновлено.", "success");
      closeDeskModal();
    } catch (error) {
      setDeskStatus(error.message, "error");
    } finally {
      if (deskSaveBtn) {
        deskSaveBtn.disabled = false;
      }
    }
  });
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

if (spaceSnapshot && spaceSnapshotCanvas) {
  const minScale = 0.5;
  const maxScale = 4;
  spaceSnapshot.addEventListener("wheel", (event) => {
    if (!spaceSnapshotCanvas.firstElementChild) {
      return;
    }
    event.preventDefault();
    const rect = spaceSnapshot.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(spaceSnapshotState.scale * zoomFactor, minScale, maxScale);
    if (nextScale === spaceSnapshotState.scale) {
      return;
    }
    const offsetX = (cursorX - spaceSnapshotState.translateX) / spaceSnapshotState.scale;
    const offsetY = (cursorY - spaceSnapshotState.translateY) / spaceSnapshotState.scale;
    spaceSnapshotState.scale = nextScale;
    spaceSnapshotState.translateX = cursorX - offsetX * nextScale;
    spaceSnapshotState.translateY = cursorY - offsetY * nextScale;
    applySpaceSnapshotTransform();
  });

  spaceSnapshot.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!spaceSnapshotCanvas.firstElementChild) {
      return;
    }
    if (isDeskPlacementActive || deskEditState.draggingDeskId || deskEditState.transformMode) {
      return;
    }
    if (event.target && event.target.closest && event.target.closest(".space-desk, .desk-handle")) {
      return;
    }
    spaceSnapshotState.pendingPointerId = event.pointerId;
    spaceSnapshotState.pendingStartX = event.clientX;
    spaceSnapshotState.pendingStartY = event.clientY;
    if (spaceSnapshot.setPointerCapture) {
      spaceSnapshot.setPointerCapture(event.pointerId);
    }
  });

  spaceSnapshot.addEventListener("pointermove", (event) => {
    if (
      spaceSnapshotState.pendingPointerId !== event.pointerId &&
      !spaceSnapshotState.isDragging
    ) {
      return;
    }
    if (spaceSnapshotState.pendingPointerId !== null && !spaceSnapshotState.isDragging) {
      const dx = event.clientX - spaceSnapshotState.pendingStartX;
      const dy = event.clientY - spaceSnapshotState.pendingStartY;
      if (Math.hypot(dx, dy) < 3) {
        return;
      }
      spaceSnapshotState.isDragging = true;
      spaceSnapshotState.dragStartX = spaceSnapshotState.pendingStartX;
      spaceSnapshotState.dragStartY = spaceSnapshotState.pendingStartY;
      spaceSnapshotState.dragOriginX = spaceSnapshotState.translateX;
      spaceSnapshotState.dragOriginY = spaceSnapshotState.translateY;
      spaceSnapshotState.dragPointerId = event.pointerId;
      spaceSnapshotState.pendingPointerId = null;
      spaceSnapshot.classList.add("is-dragging");
    }
    if (!spaceSnapshotState.isDragging) {
      return;
    }
    event.preventDefault();
    spaceSnapshotState.translateX =
      spaceSnapshotState.dragOriginX + (event.clientX - spaceSnapshotState.dragStartX);
    spaceSnapshotState.translateY =
      spaceSnapshotState.dragOriginY + (event.clientY - spaceSnapshotState.dragStartY);
    applySpaceSnapshotTransform();
  });

  const endSnapshotDrag = (event) => {
    if (!spaceSnapshotState.isDragging && spaceSnapshotState.pendingPointerId === null) {
      return;
    }
    if (spaceSnapshotState.isDragging) {
      spaceSnapshot.classList.remove("is-dragging");
    }
    const pointerId =
      spaceSnapshotState.dragPointerId ?? spaceSnapshotState.pendingPointerId ?? event?.pointerId ?? null;
    if (pointerId !== null && spaceSnapshot.releasePointerCapture) {
      try {
        spaceSnapshot.releasePointerCapture(pointerId);
      } catch {
        // Ignore release errors for stale pointers.
      }
    }
    spaceSnapshotState.isDragging = false;
    spaceSnapshotState.dragPointerId = null;
    spaceSnapshotState.pendingPointerId = null;
  };

  spaceSnapshot.addEventListener("pointerup", endSnapshotDrag);
  spaceSnapshot.addEventListener("pointercancel", endSnapshotDrag);
}

if (floorPlanPreview && floorPlanCanvas) {
  const minScale = 0.5;
  const maxScale = 4;
  floorPlanPreview.addEventListener("wheel", (event) => {
    if (!floorPlanCanvas.firstElementChild) {
      return;
    }
    event.preventDefault();
    const rect = floorPlanPreview.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(floorPlanState.scale * zoomFactor, minScale, maxScale);
    if (nextScale === floorPlanState.scale) {
      return;
    }
    const offsetX = (cursorX - floorPlanState.translateX) / floorPlanState.scale;
    const offsetY = (cursorY - floorPlanState.translateY) / floorPlanState.scale;
    floorPlanState.scale = nextScale;
    floorPlanState.translateX = cursorX - offsetX * nextScale;
    floorPlanState.translateY = cursorY - offsetY * nextScale;
    applyFloorPlanTransform();
    if (!floorPlanState.isDragging && spaceTooltipState.polygon) {
      updateSpaceTooltipPosition(spaceTooltipState.polygon);
    }
  });

  floorPlanPreview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!floorPlanCanvas.firstElementChild) {
      return;
    }
    hideSpaceTooltip();
    if (lassoState.active) {
      event.preventDefault();
      const point = getSvgPoint(event);
      if (point) {
        lassoState.points.push(point);
        updateLassoPreview();
      }
      return;
    }
    const target = event.target;
    const handleTarget =
      target instanceof SVGElement && typeof target.closest === "function"
        ? target.closest(".space-handle")
        : null;
    if (handleTarget || (target instanceof SVGElement && target.classList.contains("space-handle"))) {
      return;
    }
    const polygon = findSpacePolygonFromEvent(event);
    if (polygon) {
      if (isFloorEditing) {
        startPolygonDrag(event, polygon);
        if (spaceEditState.polygonDragPointerId !== null) {
          return;
        }
      }
      floorPlanState.pendingSelectPolygon = polygon;
      floorPlanState.pendingSelectPointerId = event.pointerId;
      floorPlanState.pendingSelectStartX = event.clientX;
      floorPlanState.pendingSelectStartY = event.clientY;
      floorPlanPreview.setPointerCapture(event.pointerId);
      return;
    }
    floorPlanState.isDragging = true;
    floorPlanState.dragStartX = event.clientX;
    floorPlanState.dragStartY = event.clientY;
    floorPlanState.dragOriginX = floorPlanState.translateX;
    floorPlanState.dragOriginY = floorPlanState.translateY;
    floorPlanPreview.classList.add("is-dragging");
    floorPlanPreview.setPointerCapture(event.pointerId);
  });

  floorPlanPreview.addEventListener("pointermove", (event) => {
    if (!floorPlanState.isDragging && !spaceEditState.isDragging && !lassoState.active) {
      updateSpaceTooltipFromEvent(event);
    } else if (spaceTooltipState.polygon) {
      hideSpaceTooltip();
    }
    if (floorPlanState.pendingSelectPolygon && !floorPlanState.isDragging) {
      const dx = event.clientX - floorPlanState.pendingSelectStartX;
      const dy = event.clientY - floorPlanState.pendingSelectStartY;
      if (Math.hypot(dx, dy) > 3) {
        floorPlanState.isDragging = true;
        floorPlanState.dragStartX = floorPlanState.pendingSelectStartX;
        floorPlanState.dragStartY = floorPlanState.pendingSelectStartY;
        floorPlanState.dragOriginX = floorPlanState.translateX;
        floorPlanState.dragOriginY = floorPlanState.translateY;
        clearPendingSelect();
        floorPlanPreview.classList.add("is-dragging");
      }
    }
    if (spaceEditState.polygonDragPointerId !== null && spaceEditState.polygonDragStartPoint) {
      const point = getSvgPoint(event);
      if (point) {
        const dx = point.x - spaceEditState.polygonDragStartPoint.x;
        const dy = point.y - spaceEditState.polygonDragStartPoint.y;
        if (!spaceEditState.isPolygonDragging && Math.hypot(dx, dy) < 2) {
          return;
        }
        spaceEditState.isPolygonDragging = true;
        spaceEditState.points = spaceEditState.polygonDragStartPoints.map((start) => ({
          x: start.x + dx,
          y: start.y + dy,
        }));
        updateSelectedPolygon();
      }
      return;
    }
    if (spaceEditState.isDragging) {
      const point = getSvgPoint(event);
      if (point && Number.isInteger(spaceEditState.draggingIndex)) {
        spaceEditState.points[spaceEditState.draggingIndex] = point;
        updateSelectedPolygon();
      }
      return;
    }
    if (lassoState.active) {
      const point = getSvgPoint(event);
      updateLassoPreview(point);
      return;
    }
    if (!floorPlanState.isDragging) {
      return;
    }
    floorPlanState.translateX = floorPlanState.dragOriginX + (event.clientX - floorPlanState.dragStartX);
    floorPlanState.translateY = floorPlanState.dragOriginY + (event.clientY - floorPlanState.dragStartY);
    applyFloorPlanTransform();
  });

  floorPlanPreview.addEventListener("dblclick", (event) => {
    if (lassoState.active) {
      event.preventDefault();
      finishLassoMode();
      return;
    }
    if (!isFloorEditing) {
      return;
    }
    clearPendingSelect();
    const polygon = findSpacePolygonFromEvent(event);
    if (!polygon) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const wasSelected = spaceEditState.selectedPolygon === polygon;
    if (!wasSelected) {
      selectSpacePolygon(polygon);
    }
    spaceEditState.isEditingPolygon = true;
    const point = getSvgPoint(event);
    if (point) {
      const tolerance = getEdgeSnapTolerance();
      const insertionIndex = findEdgeInsertionIndex(spaceEditState.points, point, tolerance);
      if (insertionIndex !== null) {
        spaceEditState.points.splice(insertionIndex + 1, 0, point);
        updateSelectedPolygon();
        return;
      }
    }
    if (wasSelected) {
      clearSpaceSelection();
    }
  });

  const stopDragging = (event) => {
    if (!floorPlanState.isDragging) {
      if (spaceEditState.isDragging) {
        spaceEditState.isDragging = false;
        spaceEditState.draggingIndex = null;
        if (floorPlanPreview && spaceEditState.dragPointerId !== null) {
          floorPlanPreview.releasePointerCapture(spaceEditState.dragPointerId);
        }
        spaceEditState.dragPointerId = null;
      }
      if (spaceEditState.polygonDragPointerId !== null) {
        if (spaceEditState.isPolygonDragging) {
          spaceEditState.skipClick = true;
        }
        if (floorPlanPreview) {
          floorPlanPreview.releasePointerCapture(spaceEditState.polygonDragPointerId);
        }
        spaceEditState.isPolygonDragging = false;
        spaceEditState.polygonDragPointerId = null;
        spaceEditState.polygonDragStartPoint = null;
        spaceEditState.polygonDragStartPoints = [];
      }
      if (
        floorPlanState.pendingSelectPolygon &&
        event &&
        typeof event.pointerId === "number" &&
        floorPlanState.pendingSelectPointerId === event.pointerId
      ) {
        const polygon = floorPlanState.pendingSelectPolygon;
        if (floorPlanPreview) {
          floorPlanPreview.releasePointerCapture(event.pointerId);
        }
        clearPendingSelect();
        floorPlanState.pendingSelectTimerId = window.setTimeout(() => {
          selectSpacePolygon(polygon, { showHandles: false });
          floorPlanState.pendingSelectTimerId = null;
        }, 180);
      }
      return;
    }
    floorPlanState.isDragging = false;
    floorPlanPreview.classList.remove("is-dragging");
    if (event && typeof event.pointerId === "number") {
      floorPlanPreview.releasePointerCapture(event.pointerId);
    }
    if (spaceEditState.isDragging) {
      spaceEditState.isDragging = false;
      spaceEditState.draggingIndex = null;
      spaceEditState.dragPointerId = null;
    }
    if (floorPlanState.pendingSelectPointerId !== null) {
      clearPendingSelect();
    }
    if (spaceEditState.polygonDragPointerId !== null) {
      if (spaceEditState.isPolygonDragging) {
        spaceEditState.skipClick = true;
      }
      spaceEditState.isPolygonDragging = false;
      spaceEditState.polygonDragPointerId = null;
      spaceEditState.polygonDragStartPoint = null;
      spaceEditState.polygonDragStartPoints = [];
    }
  };

  floorPlanPreview.addEventListener("pointerup", stopDragging);
  floorPlanPreview.addEventListener("pointercancel", stopDragging);
  floorPlanPreview.addEventListener("pointerleave", stopDragging);
  floorPlanPreview.addEventListener("pointerleave", hideSpaceTooltip);
}

const handleAuthSuccess = async (token, user) => {
  setAuthToken(token);
  if (user) {
    setUserInfo(user);
  }
  updateAuthUserBlock(user || getUserInfo());
  hideAuthGate();
  setAuthStatus("");
  await runAppInit();
};

if (authPhoneInput) {
  authPhoneInput.addEventListener("input", (event) => {
    authPhoneInput.value = formatPhoneNumber(event.target.value);
    setAuthStatus("");
  });
}

if (authCodeInput) {
  authCodeInput.addEventListener("input", (event) => {
    authCodeInput.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    setAuthStatus("");
  });
}

if (backToPhoneBtn) {
  backToPhoneBtn.addEventListener("click", () => {
    authSticker = null;
    authTTL = null;
    if (authCodeInput) {
      authCodeInput.value = "";
    }
    if (authCodeHint) {
      authCodeHint.classList.add("is-hidden");
      authCodeHint.textContent = "";
    }
    setAuthStep("phone");
  });
}

if (breadcrumbProfiles.length > 0) {
  breadcrumbProfiles.forEach((profile) => {
    const trigger = profile.querySelector('[data-role="breadcrumb-trigger"]');
    const logoutButton = profile.querySelector('[data-role="breadcrumb-logout"]');

    if (trigger) {
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleBreadcrumbMenu(profile);
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeBreadcrumbMenus();
        clearAuthStorage();
        updateAuthUserBlock(null);
        authSticker = null;
        authTTL = null;
        showAuthGate();
        setAuthStep("phone");
        window.location.assign("/buildings");
      });
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (event.target.closest('[data-role="breadcrumb-profile"]')) {
      return;
    }
    closeBreadcrumbMenus();
  });
}

if (authPhoneForm) {
  authPhoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const normalizedPhone = normalizePhoneNumber(authPhoneInput?.value || "");
    if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith("7")) {
      setAuthStatus("Введите корректный номер телефона (11 цифр, начинается с 7).", "error");
      return;
    }

    if (normalizedPhone === "70000000000") {
      authSticker = "test-sticker";
      authTTL = 300;
      if (authCodeHint) {
        authCodeHint.textContent = `Код действителен ${authTTL} секунд`;
        authCodeHint.classList.remove("is-hidden");
      }
      setAuthStep("code");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("Отправляем код...");
    const result = await requestAuthCode(normalizedPhone);
    setAuthLoading(false);

    if (!result.success || !result.sticker) {
      setAuthStatus(result.error || "Не удалось получить код.", "error");
      return;
    }

    authSticker = result.sticker;
    authTTL = result.ttl;
    if (authCodeHint) {
      if (authTTL) {
        authCodeHint.textContent = `Код действителен ${authTTL} секунд`;
        authCodeHint.classList.remove("is-hidden");
      } else {
        authCodeHint.classList.add("is-hidden");
      }
    }
    setAuthStep("code");
  });
}

if (authCodeForm) {
  authCodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const codeValue = authCodeInput?.value.replace(/\D/g, "").slice(0, 6) || "";
    if (codeValue.length !== 6) {
      setAuthStatus("Введите 6-значный код.", "error");
      return;
    }
    if (!authSticker) {
      setAuthStatus("Ошибка: отсутствует sticker. Запросите код заново.", "error");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(authPhoneInput?.value || "");
    if (normalizedPhone === "70000000000" && codeValue === "000000") {
      const testToken = `test-access-token-${Date.now()}`;
      const testUser = { id: 1, name: "Test User", phone: "70000000000" };
      await handleAuthSuccess(testToken, testUser);
      return;
    }

    setAuthLoading(true);
    setAuthStatus("Проверяем код...");
    const authResult = await confirmAuthCode(codeValue, authSticker);
    if (!authResult.success) {
      setAuthLoading(false);
      setAuthStatus(authResult.error || "Неверный код.", "error");
      return;
    }

    const userInfoResult = await fetchAuthUserInfo(authResult.accessToken);
    if (userInfoResult.success) {
      await handleAuthSuccess(authResult.accessToken, userInfoResult.user);
    } else {
      await handleAuthSuccess(authResult.accessToken, null);
    }
    setAuthLoading(false);
  });
}

const init = async () => {
  const spaceParams = getSpaceParamsFromPath();
  if (spaceParams) {
    await loadSpacePage(spaceParams);
    return;
  }
  const floorParams = getFloorParamsFromPath();
  if (floorParams) {
    await loadFloorPage(floorParams.buildingID, floorParams.floorNumber);
    return;
  }
  const buildingID = getBuildingIdFromPath();
  if (buildingID) {
    await loadBuildingPage(buildingID);
    return;
  }
  setPageMode("list");
  try {
    await refreshBuildings();
    renderBuildings();
  } catch (error) {
    setStatus(error.message, "error");
  }
};

buildingModal.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.dataset.modalClose === "true") {
    closeModal();
  }
});

if (spaceModal) {
  spaceModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.modalClose === "true") {
      closeSpaceModal();
    }
  });
}

if (deskModal) {
  deskModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.modalClose === "true") {
      closeDeskModal();
    }
  });
}

if (floorPlanModal) {
  floorPlanModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.modalClose === "true") {
      closeFloorPlanModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBreadcrumbMenus();
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
      return;
    }
    if (deskModal && deskModal.classList.contains("is-open")) {
      closeDeskModal();
      return;
    }
    if (spaceModal && spaceModal.classList.contains("is-open")) {
      closeSpaceModal();
      return;
    }
    if (floorPlanModal && floorPlanModal.classList.contains("is-open")) {
      closeFloorPlanModal();
      return;
    }
    if (buildingModal.classList.contains("is-open")) {
      closeModal();
    }
    return;
  }
  if (event.key === "Enter" && lassoState.active) {
    finishLassoMode();
  }
});

initializeAuth();
