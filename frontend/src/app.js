import {
  setAuthToken,
  getAuthToken,
  setUserInfo,
  getUserInfo,
  setAuthCookies,
  getAuthCookies,
  setSessionClaims,
  getSessionClaims,
  clearAuthStorage,
  getCachedAvatar,
  cacheAvatarData,
} from "./auth.js";

import { makeApiRequest, createCancellableRequest } from "./api.js";

import { createStatusManager } from "./status.js";

import {
  escapeSelectorValue,
  normalizeBookingDate,
  isValidBookingDate,
  formatBookingDate,
  formatBookingWeekday,
  formatSelectedDateTitle,
  getPeopleCountLabel,
  getPeopleCountLimitLabel,
  formatUserNameInitials,
  getBookingUserKey,
  spaceKindLabels,
  spaceKindPluralLabels,
  defaultSpaceKind,
  svgNamespace,
} from "./utils.js";

const buildingForm = document.getElementById("buildingForm");
const buildingNameInput = document.getElementById("buildingName");
const buildingAddressInput = document.getElementById("buildingAddress");
const buildingTimezoneInput = document.getElementById("buildingTimezone");
const buildingImageInput = document.getElementById("buildingImage");
const buildingResponsibleFieldRow = document.getElementById("buildingResponsibleFieldRow");
const buildingResponsibleField = document.getElementById("buildingResponsibleField");
const buildingResponsibleSuggestions = document.querySelector(
  '[data-responsible-suggestions-for="buildingResponsibleField"]'
);
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
const authBoot = document.getElementById("authBoot");
const authBootText = document.getElementById("authBootText");
const authCard = document.getElementById("authCard");
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
const topAlert = document.getElementById("topAlert");
const appHeader = document.querySelector(".app-header");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const buildingsPage = document.getElementById("buildingsPage");
const buildingPage = document.getElementById("buildingPage");
const floorsCount = document.getElementById("floorsCount");
const floorsList = document.getElementById("floorsList");
const floorsEmpty = document.getElementById("floorsEmpty");
const buildingTitle = document.getElementById("buildingTitle");
const buildingAddressText = document.getElementById("buildingAddressText");
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
const spaceKindFilter = document.getElementById("spaceKindFilter");
const spaceKindFilterSlot = document.getElementById("spaceKindFilterSlot");
const spaceKindFilterButtons = spaceKindFilter
  ? Array.from(spaceKindFilter.querySelectorAll("[data-space-kind-filter]"))
  : [];
const addSpaceBtn = document.getElementById("addSpaceBtn");
const spaceModal = document.getElementById("spaceModal");
const spaceModalTitle = document.getElementById("spaceModalTitle");
const spaceForm = document.getElementById("spaceForm");
const spaceNameField = document.getElementById("spaceNameField");
const spaceNameFieldLabel = spaceNameField
  ? spaceNameField.closest(".field")?.querySelector("span")
  : null;
const spaceNameFieldDefaultPlaceholder = spaceNameField
  ? spaceNameField.getAttribute("placeholder") || ""
  : "";
const spaceKindField = document.getElementById("spaceKindField");
const spaceSubdivisionFields = document.getElementById("spaceSubdivisionFields");
const spaceSubdivisionLevel1Field = document.getElementById("spaceSubdivisionLevel1Field");
const spaceSubdivisionLevel2Field = document.getElementById("spaceSubdivisionLevel2Field");
const spaceResponsibleFieldRow = document.getElementById("spaceResponsibleFieldRow");
const spaceResponsibleField = document.getElementById("spaceResponsibleField");
const spaceResponsibleSuggestions = document.querySelector(
  '[data-responsible-suggestions-for="spaceResponsibleField"]'
);
const spaceCapacityFieldRow = document.getElementById("spaceCapacityFieldRow");
const spaceCapacityField = document.getElementById("spaceCapacityField");
const spaceColorInput = document.getElementById("spaceColorInput");
const spaceColorPreview = document.getElementById("spaceColorPreview");
const spaceSaveBtn = document.getElementById("spaceSaveBtn");
const spaceModalCloseBtn = document.getElementById("spaceModalCloseBtn");
const spaceDeleteBtn = document.getElementById("spaceDeleteBtn");
const spaceStatus = document.getElementById("spaceStatus");
const floorInfoModal = document.getElementById("floorInfoModal");
const floorInfoModalTitle = document.getElementById("floorInfoModalTitle");
const floorInfoForm = document.getElementById("floorInfoForm");
const floorInfoNameField = document.getElementById("floorInfoNameField");
const floorInfoResponsibleField = document.getElementById("floorInfoResponsibleField");
const floorInfoResponsibleSuggestions = document.querySelector(
  '[data-responsible-suggestions-for="floorInfoResponsibleField"]'
);
const floorInfoSaveBtn = document.getElementById("floorInfoSaveBtn");
const floorInfoDeleteBtn = document.getElementById("floorInfoDeleteBtn");
const floorInfoStatus = document.getElementById("floorInfoStatus");
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
const spaceSnapshotToggleBtn = document.getElementById("spaceSnapshotToggleBtn");
const spaceSnapshotPlaceholder = document.getElementById("spaceSnapshotPlaceholder");
const spacePageStatus = document.getElementById("spacePageStatus");
const spaceDesksPanel = document.getElementById("spaceDesksPanel");
const spaceDesksList = document.getElementById("spaceDesksList");
const spaceDesksEmpty = document.getElementById("spaceDesksEmpty");
const spaceBookingPanel = document.getElementById("spaceBookingPanel");
const spaceBookingStatus = document.getElementById("spaceBookingStatus");
const spaceDatePicker = document.getElementById("spaceDatePicker");
const spaceAttendeesList = document.getElementById("spaceAttendeesList");
const spaceAttendeesEmpty = document.getElementById("spaceAttendeesEmpty");
const spaceBookingsToggleBtn = document.getElementById("spaceBookingsToggleBtn");
const spaceMapDateTitle = document.getElementById("spaceMapDateTitle");
const spaceBookingsModal = document.getElementById("spaceBookingsModal");
const spaceBookingsModalTitle = document.getElementById("spaceBookingsModalTitle");
const spaceBookingsSection = document.getElementById("spaceBookingsSection");
const spaceBookingsList = document.getElementById("spaceBookingsList");
const spaceBookingsEmpty = document.getElementById("spaceBookingsEmpty");
const spaceBookingsCancelAllBtn = document.getElementById("spaceBookingsCancelAllBtn");
const bookingsTabCoworking = document.getElementById("bookingsTabCoworking");
const bookingsTabMeeting = document.getElementById("bookingsTabMeeting");
const meetingBookingsSection = document.getElementById("meetingBookingsSection");
const meetingBookingsList = document.getElementById("meetingBookingsList");
const meetingBookingsEmpty = document.getElementById("meetingBookingsEmpty");
const adminBookingsModal = document.getElementById("adminBookingsModal");
const adminBookingsModalTitle = document.getElementById("adminBookingsModalTitle");
const adminBookingsList = document.getElementById("adminBookingsList");
const adminBookingsEmpty = document.getElementById("adminBookingsEmpty");
const adminBookingsCancelAllBtn = document.getElementById("adminBookingsCancelAllBtn");
const responsibilitiesModal = document.getElementById("responsibilitiesModal");
const responsibilitiesList = document.getElementById("responsibilitiesList");
const responsibilitiesEmpty = document.getElementById("responsibilitiesEmpty");
const dbDumpModal = document.getElementById("dbDumpModal");
const dbDumpStatus = document.getElementById("dbDumpStatus");
const dbDumpDownloadBtn = document.getElementById("dbDumpDownloadBtn");
const dbDumpUploadBtn = document.getElementById("dbDumpUploadBtn");
const dbDumpUploadInput = document.getElementById("dbDumpUploadInput");
const meetingSearchModal = document.getElementById("meetingSearchModal");
const meetingSearchStatus = document.getElementById("meetingSearchStatus");
const meetingSearchDatePicker = document.getElementById("meetingSearchDatePicker");
const meetingSearchSlots = document.getElementById("meetingSearchSlots");
const meetingSearchList = document.getElementById("meetingSearchList");
const meetingSearchEmpty = document.getElementById("meetingSearchEmpty");
const meetingSearchResultsTitle = document.getElementById("meetingSearchResultsTitle");
const meetingSearchOfficeTime = document.getElementById("meetingSearchOfficeTime");
const meetingBookingModal = document.getElementById("meetingBookingModal");
const meetingBookingModalTitle = document.getElementById("meetingBookingModalTitle");
const meetingBookingModalSubtitle = document.getElementById("meetingBookingModalSubtitle");
const meetingBookingOfficeTime = document.getElementById("meetingBookingOfficeTime");
const meetingBookingStatus = document.getElementById("meetingBookingStatus");
const meetingBookingDatePicker = document.getElementById("meetingBookingDatePicker");
const meetingBookingTimeSlots = document.getElementById("meetingBookingTimeSlots");
const meetingBookingSelection = document.getElementById("meetingBookingSelection");
const meetingBookingSubmitBtn = document.getElementById("meetingBookingSubmitBtn");
const meetingBookingCancelBtn = document.getElementById("meetingBookingCancelBtn");
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
const bookForChoiceModal = document.getElementById("bookForChoiceModal");
const bookForSelfBtn = document.getElementById("bookForSelfBtn");
const bookForOtherBtn = document.getElementById("bookForOtherBtn");
const bookForOtherModal = document.getElementById("bookForOtherModal");
const bookForGuestBtn = document.getElementById("bookForGuestBtn");
const bookForOtherEmployeeField = document.getElementById("bookForOtherEmployeeField");
const bookForOtherSuggestions = document.querySelector(
  '[data-responsible-suggestions-for="bookForOtherEmployeeField"]'
);
const bookForOtherStatus = document.getElementById("bookForOtherStatus");
const bookForOtherSubmitBtn = document.getElementById("bookForOtherSubmitBtn");

let buildings = [];
let editingId = null;
let currentBuilding = null;
let currentFloor = null;
let currentSpace = null;
let editingFloorInfo = null;
let currentSpaces = [];
let currentDesks = [];
let responsibilitiesState = {
  status: "idle",
  data: null,
  error: null,
  loadedAt: 0,
};
let responsibilitiesRequest = null;
let isFloorEditing = false;
let isSpaceEditing = false;
let isDeskPlacementActive = false;
let pendingDeskUpdates = new Map();
let pendingDeskCreates = new Map();
let pendingDeskDeletes = new Set();
let pendingDeskRender = false;
let currentSpaceBounds = null;
let copiedDesk = null;
let tempDeskSequence = 0;
const TEMP_DESK_PREFIX = "tmp-";
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
const bookingState = {
  selectedDate: null,
  currentMonth: new Date(),
  bookingsByDeskId: new Map(),
  myBookings: [],
  myMeetingBookings: [],
  isLoading: false,
  isMyBookingsLoading: false,
  isMyMeetingBookingsLoading: false,
  isListOpen: false,
  activeBookingsTab: "coworking",
  longPressTimer: null,
  longPressTriggered: false,
  adminBookings: [],
  isAdminBookingsOpen: false,
};
const bookForOtherState = {
  desk: null,
  selectedType: null,
  selectedEmployeeId: "",
};
const meetingBookingState = {
  selectedDate: null,
  currentMonth: new Date(),
  selectedSlotStarts: new Set(),
  selectedCancelSlotStarts: new Set(),
  bookings: [],
  space: null,
  isLoading: false,
};
const meetingSearchState = {
  selectedDate: null,
  currentMonth: new Date(),
  selectedSlotStarts: new Set(),
  isLoading: false,
  bookingsCache: new Map(),
};
const meetingSlotTooltipState = {
  element: null,
  slotStart: null,
};
const meetingSlotMinutes = 30;
const meetingSlotStartHour = 8;
const meetingSlotEndHour = 21;
const defaultBuildingTimezone = "Europe/Moscow";
let meetingSearchOfficeTimeTimer = null;
let meetingBookingOfficeTimeTimer = null;
let hasFloorPlan = false;
let removeImage = false;
let previewObjectUrl = null;
let editingSpace = null;
let editingDesk = null;
/* svgNamespace → imported from utils.js */
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
const hoverSpaceLabels = new Map();
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
let floorPlanRasterBlobUrl = null;
let floorPlanEmbeddedRasterTemplate = null;
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
/* spaceKindLabels, spaceKindPluralLabels, defaultSpaceKind → imported from utils.js */
let currentSpaceKindFilter = defaultSpaceKind;
let visibleSpaces = [];
const fallbackBuildingImages = [
  "/assets/buildings/1.png",
  "/assets/buildings/2.png",
  "/assets/buildings/3.png",
];
const cancelFloorEditHome = cancelFloorEditBtn
  ? { parent: cancelFloorEditBtn.parentElement, nextSibling: cancelFloorEditBtn.nextElementSibling }
  : null;
const buildingBreadcrumbActions = document.querySelector(
  '[data-role="breadcrumb-actions"][data-page="building"]'
);
const floorBreadcrumbActions = document.querySelector(
  '[data-role="breadcrumb-actions"][data-page="floor"]'
);
const spaceBreadcrumbActions = document.querySelector(
  '[data-role="breadcrumb-actions"][data-page="space"]'
);
const headerActionsHome = headerActions
  ? { parent: headerActions.parentElement, nextSibling: headerActions.nextElementSibling }
  : null;
const spaceKindFilterHome = spaceKindFilter
  ? { parent: spaceKindFilter.parentElement, nextSibling: spaceKindFilter.nextElementSibling }
  : null;
const addSpaceBtnHome = addSpaceBtn
  ? { parent: addSpaceBtn.parentElement, nextSibling: addSpaceBtn.nextElementSibling }
  : null;

/* AUTH_TOKEN_KEY..AVATAR_CACHE_MAX_ENTRIES → imported from auth.js */
const avatarInFlight = new Map();
const imagePreloadCache = new Map();

let authSticker = null;
let authTTL = null;
let appInitialized = false;
let routeNavigationInProgress = false;
let routeNavigationQueued = false;
const routePrefetchCache = new Map();
const routePrefetchInFlight = new Map();
const API_GET_CACHE_TTL_MS = 5 * 60 * 1000;
const floorSpacesRenderFingerprint = new Map();
const spaceDesksRenderFingerprint = new Map();
let latestSpaceDesksRequestToken = 0;
const deskBookingActionsInFlight = new Set();

/* setAuthToken → imported from auth.js */

const placeHeaderActions = (target) => {
  if (!headerActions) {
    return;
  }
  if (target) {
    if (!target.contains(headerActions)) {
      target.appendChild(headerActions);
    }
    return;
  }
  if (!headerActionsHome?.parent) {
    return;
  }
  if (
    headerActionsHome.nextSibling &&
    headerActionsHome.nextSibling.parentElement === headerActionsHome.parent
  ) {
    headerActionsHome.parent.insertBefore(headerActions, headerActionsHome.nextSibling);
  } else {
    headerActionsHome.parent.appendChild(headerActions);
  }
};

/* getAuthToken..cacheAvatarData → imported from auth.js */

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

/* clearAuthStorage → imported from auth.js */

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
  // Dismiss the boot-time loading overlay so the auth screen is visible.
  document.body.classList.remove("app-loading");
};

const showAuthBoot = (message = "Загрузка...") => {
  showAuthGate();
  if (authBootText) {
    authBootText.textContent = message;
  }
  if (authBoot) {
    authBoot.classList.remove("is-hidden");
  }
  if (authCard) {
    authCard.classList.add("is-hidden");
  }
};

const showAuthLogin = () => {
  showAuthGate();
  if (authBoot) {
    authBoot.classList.add("is-hidden");
  }
  if (authCard) {
    authCard.classList.remove("is-hidden");
  }
};

const hideAuthGate = () => {
  if (!authGate) {
    return;
  }
  authGate.classList.add("is-hidden");
  authGate.setAttribute("aria-hidden", "true");
  document.body.classList.remove("auth-locked");
  // Also dismiss the boot-time loading overlay.
  document.body.classList.remove("app-loading");
};

const hasActiveSession = () => Boolean(getSessionClaims());

const requireActiveSession = (message = "Для продолжения авторизуйтесь.") => {
  if (hasActiveSession()) {
    return true;
  }
  showAuthLogin();
  setAuthStep("phone");
  setAuthStatus(message, "warning");
  return false;
};

const getDisplayNameFromUser = (user) =>
  user?.name ||
  user?.full_name ||
  user?.fullName ||
  user?.email ||
  user?.phone ||
  "Пользователь";

const getUserProfileId = (user) => {
  const directId = String(
    user?.wb_team_profile_id ||
      user?.wbTeamProfileId ||
      user?.profile_id ||
      user?.profileId ||
      user?.employee_id ||
      user?.employeeId ||
      user?.employeeID ||
      user?.wbteam_user_id ||
      user?.wbteamUserId ||
      user?.id ||
      ""
  ).trim();
  if (directId) {
    return directId;
  }
  const profile =
    user?.profile || user?.data?.profile || user?.payload?.profile || null;
  const profileId = String(
    profile?.id ||
      profile?.wb_team_profile_id ||
      profile?.profile_id ||
      profile?.employee_id ||
      profile?.employeeId ||
      ""
  ).trim();
  if (profileId) {
    return profileId;
  }
  const nestedUser =
    user?.user || user?.data?.user || user?.payload?.user || null;
  const nestedId = String(
    nestedUser?.wb_team_profile_id ||
      nestedUser?.wbTeamProfileId ||
      nestedUser?.profile_id ||
      nestedUser?.profileId ||
      nestedUser?.employee_id ||
      nestedUser?.employeeId ||
      nestedUser?.id ||
      ""
  ).trim();
  if (nestedId) {
    return nestedId;
  }
  const nestedProfile = nestedUser?.profile || null;
  return String(
    nestedProfile?.id ||
      nestedProfile?.wb_team_profile_id ||
      nestedProfile?.profile_id ||
      nestedProfile?.employee_id ||
      nestedProfile?.employeeId ||
      ""
  ).trim();
};

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

const getRoleIdFromUser = (user) => {
  const sessionRole = Number(getSessionClaims()?.role);
  if (Number.isFinite(sessionRole) && (sessionRole === 1 || sessionRole === 2)) {
    return sessionRole;
  }
  if (!user) {
    return null;
  }
  const rawRole =
    user.role ??
    user.role_id ??
    user.roleId ??
    user.roleID ??
    user?.data?.role ??
    user?.data?.role_id ??
    user?.data?.roleId ??
    user?.payload?.role ??
    user?.payload?.role_id ??
    user?.payload?.roleId ??
    user?.user?.role ??
    user?.user?.role_id ??
    user?.user?.roleId;
  const role = Number(rawRole);
  return Number.isFinite(role) ? role : null;
};

const isAdminRole = (user) => getRoleIdFromUser(user) === 2;
const isEmployeeRole = (user) => !isAdminRole(user);
const canManageOfficeResources = (user) => isAdminRole(user);

const toggleHidden = (node, hidden) => {
  if (!node) {
    return;
  }
  node.classList.toggle("is-hidden", hidden);
};

const applyRoleRestrictions = (user) => {
  const restricted = !canManageOfficeResources(user);
  document.body.classList.toggle("role-employee", restricted);
  if (!restricted) {
    return;
  }
  const isBuildingPageActive = Boolean(buildingPage && !buildingPage.classList.contains("is-hidden"));
  const isFloorPageActive = Boolean(floorPage && !floorPage.classList.contains("is-hidden"));
  const canManageCurrentFloor =
    isFloorPageActive && canManageFloorResources(user, currentFloor);
  const canManageCurrentBuilding = canManageBuildingResources(user, currentBuilding);
  toggleHidden(openAddModalBtn, true);
  toggleHidden(editBuildingBtn, !isBuildingPageActive || !canManageCurrentBuilding);
  toggleHidden(editFloorBtn, !canManageCurrentFloor);
  toggleHidden(deleteBuildingBtn, true);
  toggleHidden(openFloorPlanModalBtn, !canManageCurrentFloor);
  toggleHidden(addSpaceBtn, !canManageCurrentFloor);
  setFloorEditMode(false);
  setSpaceEditMode(false);
};

const getRoleLabelFromUser = (user) => {
  const role = getRoleIdFromUser(user);
  switch (role) {
    case 1:
      return "Сотрудник";
    case 2:
      return "Администратор";
    default:
      return "";
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
    setDbDumpMenuVisibility(false);
    closeBreadcrumbMenus();
    return;
  }

  const displayName = getDisplayNameFromUser(user);
  const avatarUrl = typeof user.avatar_url === "string" ? user.avatar_url.trim() : "";
  const roleLabel = getRoleLabelFromUser(user);

  breadcrumbProfiles.forEach((node) => {
    const avatar = node.querySelector(".breadcrumb-avatar");
    const name = node.querySelector(".breadcrumb-name");
    const role = node.querySelector(".breadcrumb-role");
    if (name) {
      name.textContent = displayName;
    }
    if (role) {
      role.textContent = roleLabel;
      role.classList.toggle("is-hidden", !roleLabel);
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
  setDbDumpMenuVisibility(isAdminRole(user));
  applyRoleRestrictions(user);
};

const updateAuthUserBlock = (user) => {
  if (!user) {
    if (authUserBlock && authUserName) {
      authUserBlock.classList.add("is-hidden");
      authUserName.textContent = "";
    }
    updateBreadcrumbProfile(null);
    applyRoleRestrictions(null);
    resetResponsibilitiesState();
    return;
  }

  const displayName = getDisplayNameFromUser(user);
  if (authUserBlock && authUserName) {
    authUserName.textContent = displayName;
    authUserBlock.classList.remove("is-hidden");
  }
  updateBreadcrumbProfile(user);
  // Note: fetchResponsibilitiesForUser() is called explicitly after Office-Access-Token is obtained
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
    // Prefer crypto.randomUUID() for high-entropy identifiers; fall back
    // to a timestamp-based ID for older browsers.
    deviceId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

const getDeviceName = () =>
  navigator.userAgent.includes("Macintosh") ? "Apple Macintosh" : "Windows PC";

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

const getCsrfToken = () => getCookieValue("office_csrf_token");
const LOGOUT_REDIRECT_SKIP_KEY = "office_skip_session_restore_once";

const markLogoutRedirect = () => {
  try {
    sessionStorage.setItem(LOGOUT_REDIRECT_SKIP_KEY, "1");
  } catch {
    // Ignore storage access errors (private mode, restricted context).
  }
};

const consumeLogoutRedirectMark = () => {
  try {
    if (sessionStorage.getItem(LOGOUT_REDIRECT_SKIP_KEY) === "1") {
      sessionStorage.removeItem(LOGOUT_REDIRECT_SKIP_KEY);
      return true;
    }
  } catch {
    // Ignore storage access errors and keep default behavior.
  }
  return false;
};

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
    const response = await fetch("/api/v2/auth/code/wb-captcha", {
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

    const response = await fetch("/api/v2/auth/confirm", {
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
      return { success: false, error: "Токен не предоставлен", status: 401 };
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
    const response = await fetch("/api/user/info", {
      headers,
      credentials: "include",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      return {
        success: false,
        status: response.status,
        error: data?.error || "Не удалось получить информацию о пользователе",
      };
    }
    return { success: true, user: data.data || data, status: response.status };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message || "Не удалось получить информацию о пользователе",
    };
  }
};

/**
 * Check whether the session (access token cookie) is still valid.
 * Returns true if we have session claims and `access_exp` is in the future
 * (with a 60-second safety margin).
 */
const isOfficeAccessTokenValid = () => {
  try {
    const session = getSessionClaims();
    if (!session) return false;
    return typeof session.access_exp === "number" && session.access_exp > Date.now() / 1000 + 60;
  } catch {
    return false;
  }
};

/**
 * Returns the session claims (equivalent to the old JWT payload).
 * Claims are stored in memory, populated by backend responses.
 */
const getOfficeAccessTokenPayload = () => {
  return getSessionClaims();
};

/**
 * Extract responsibilities from the in-memory session claims.
 * Returns { buildings: [], floors: [], coworkings: [] } or null if no session/responsibilities.
 */
const getResponsibilitiesFromToken = () => {
  const session = getSessionClaims();
  if (!session) {
    return null;
  }
  const resp = session.responsibilities;
  if (!resp) {
    return null;
  }
  return {
    buildings: Array.isArray(resp.buildings) ? resp.buildings : [],
    floors: Array.isArray(resp.floors) ? resp.floors : [],
    coworkings: Array.isArray(resp.coworkings) ? resp.coworkings : [],
  };
};

const getEmployeeIDFromOfficeAccessToken = () => {
  const session = getSessionClaims();
  const employeeID = String(session?.employee_id ?? "").trim();
  return employeeID || null;
};

/**
 * Check if the refresh token is expiring soon (within 7 days).
 * Uses the refresh_exp from in-memory session claims.
 */
const isRefreshTokenExpiringSoon = () => {
  try {
    const session = getSessionClaims();
    if (!session || !session.refresh_exp) return false;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    return session.refresh_exp < Date.now() / 1000 + sevenDaysInSeconds;
  } catch {
    return false;
  }
};

/**
 * Attempt to refresh the access token using the HttpOnly refresh cookie.
 * The cookie is sent automatically (credentials: "include").
 * Returns true if refresh was successful, false otherwise.
 */
const refreshAccessToken = async () => {
  try {
    const csrfToken = getCsrfToken();
    const headers = {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    };
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers,
      body: "{}",
      credentials: "include",
    });

    if (!response.ok) {
      // Refresh cookie is invalid or expired — clear local session.
      setSessionClaims(null);
      return false;
    }

    const data = await response.json().catch(() => null);
    if (data?.session) {
      setSessionClaims(data.session);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Try to close the server-side session and clear HttpOnly auth cookies.
 * Returns true when logout succeeded on the backend.
 */
const logoutOfficeSession = async () => {
  const sendLogoutRequest = async () => {
    const csrfToken = getCsrfToken();
    const headers = csrfToken ? { "X-CSRF-Token": csrfToken } : {};
    return fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers,
    });
  };

  try {
    let response = await sendLogoutRequest();
    if (response.ok) {
      return true;
    }

    // Legacy sessions might miss a CSRF cookie; /api/auth/session mints it.
    if (response.status === 403) {
      await fetch("/api/auth/session", { method: "GET", credentials: "include" }).catch(() => null);
      response = await sendLogoutRequest();
      return response.ok;
    }
  } catch {
    // Network/transport errors are handled by local logout fallback below.
  }

  return false;
};

const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

let lastUserActivityAt = Date.now();
let refreshInFlight = false;

const markUserActivity = () => {
  lastUserActivityAt = Date.now();
};

const isRecentUserActivity = () => Date.now() - lastUserActivityAt <= ACTIVITY_WINDOW_MS;

/**
 * Start automatic token refresh checking.
 * Checks every 5 minutes if tokens need to be refreshed.
 * Refresh is allowed only after recent user activity (sliding expiration).
 * - Access token: refreshed when expired or about to expire (60s margin)
 * - Refresh token: proactively rotated when expiring within 7 days
 */
const startAutoTokenRefresh = () => {
  const checkAndRefresh = async () => {
    const session = getSessionClaims();
    if (!session) return; // Not logged in
    if (!isRecentUserActivity()) return; // Idle users should not keep extending session lifetime.
    if (refreshInFlight) return;

    const accessTokenValid = isOfficeAccessTokenValid();
    const refreshExpiringSoon = isRefreshTokenExpiringSoon();

    // Scenario 1: Access token expired or invalid → refresh immediately
    if (!accessTokenValid) {
      refreshInFlight = true;
      try {
        await refreshAccessToken();
      } finally {
        refreshInFlight = false;
      }
    }
    // Scenario 2: Access token is valid but refresh token expiring soon → proactively rotate
    else if (refreshExpiringSoon) {
      refreshInFlight = true;
      try {
        await refreshAccessToken();
      } finally {
        refreshInFlight = false;
      }
    }
  };

  const activityEvents = ["click", "keydown", "mousemove", "touchstart", "scroll"];
  for (const eventName of activityEvents) {
    window.addEventListener(eventName, markUserActivity, { passive: true });
  }

  // Check periodically while tab is active.
  setInterval(checkAndRefresh, TOKEN_REFRESH_INTERVAL_MS);

  // Also check when page becomes visible again (user returns to tab)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      markUserActivity();
      checkAndRefresh();
    }
  });
};

/**
 * Request server-signed Office tokens (access + refresh).
 * Tokens are set as HttpOnly cookies by the server — JS never sees them.
 * The backend returns a `session` object with non-sensitive claims that
 * we store in memory for UI logic (role, responsibilities, expiration).
 *
 * Skips the request if a valid session is already active.
 * If session expired, tries to refresh via cookie first.
 */
const fetchOfficeToken = async (accessToken) => {
  try {
    if (!accessToken) {
      return { success: false, error: "Отсутствует внешний токен авторизации." };
    }

    // If we already have a valid session, nothing to do.
    if (isOfficeAccessTokenValid()) {
      return { success: true };
    }

    // Try to refresh existing cookie-based session first.
    const session = getSessionClaims();
    if (session) {
      const refreshed = await refreshAccessToken();
      if (refreshed && isOfficeAccessTokenValid()) {
        return { success: true };
      }
    }

    // Fetch new tokens from scratch.
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    };
    const cookies = getAuthCookies();
    if (cookies) {
      headers["X-Cookie"] = cookies;
    }
    const response = await fetch("/api/auth/office-token", {
      method: "POST",
      headers,
      credentials: "include",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.session) {
      return {
        success: false,
        error: data?.error || "Не удалось открыть office-сессию.",
      };
    }

    setSessionClaims(data.session);
    if (isOfficeAccessTokenValid()) {
      return { success: true };
    }

    return {
      success: false,
      error: "Сервер не подтвердил office-сессию.",
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Не удалось получить office-токен.",
    };
  }
};

const fetchAndStoreWBBand = async (accessToken, user) => {
  try {
    if (!accessToken || !user) {
      return null;
    }
    const profileId = getUserProfileId(user);
    if (!profileId) {
      return null;
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
    const response = await fetch(
      `/api/user/wb-band?wb_team_profile_id=${encodeURIComponent(profileId)}`,
      {
      headers,
      credentials: "include",
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      return null;
    }
    const wbBand = data?.data?.wb_band || data?.wb_band;
    if (wbBand) {
      const nextUser = { ...user, wb_band: wbBand };
      setUserInfo(nextUser);
      updateAuthUserBlock(nextUser);
    }
    return wbBand || null;
  } catch (error) {
    return null;
  }
};

/** Remove the boot-time loading screen once the first meaningful paint is ready. */
const dismissAppLoader = () => {
  document.body.classList.remove("app-loading");
};

const runAppInit = async () => {
  if (appInitialized) {
    return;
  }
  appInitialized = true;
  await init();
  dismissAppLoader();
};

const initializeAuth = async () => {
  const token = getAuthToken();
  const cachedUser = getUserInfo();
  const skipSessionRestore = consumeLogoutRedirectMark();
  if (cachedUser) {
    updateAuthUserBlock(cachedUser);
  } else {
    showAuthBoot("Загрузка...");
  }

  // Restore in-memory session from HttpOnly cookies via backend.
  // On page reload, JS has no access to the cookie values, so we ask
  // the server to validate them and return the non-sensitive claims.
  if (!skipSessionRestore && !getSessionClaims()) {
    try {
      const sessionResp = await fetch("/api/auth/session", {
        credentials: "include",
      });
      if (sessionResp.ok) {
        const sessionData = await sessionResp.json().catch(() => null);
        if (sessionData?.session) {
          setSessionClaims(sessionData.session);
        }
      } else if (sessionResp.status === 401) {
        // Access cookie expired — try refreshing
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          // No valid session at all — need to fetch new tokens
        }
      }
    } catch {
      // Network error — proceed; fetchOfficeToken below will retry
    }
  }

  // If both external auth token and cookie-based office session are absent,
  // we need explicit login.
  if (!token && !getSessionClaims()) {
    if (authGate) {
      showAuthLogin();
      setAuthStep("phone");
      return;
    }
    await runAppInit();
    return;
  }

  // Ensure we have a valid Office Access Token before any API requests.
  // This is a no-op if the stored session is still valid (checked inside).
  if (token) {
    const officeTokenResult = await fetchOfficeToken(token);
    if (!officeTokenResult.success && !getSessionClaims()) {
      clearAuthStorage();
      if (authGate) {
        showAuthLogin();
        setAuthStep("phone");
        setAuthStatus(officeTokenResult.error || "Не удалось создать сессию. Авторизуйтесь снова.", "error");
      }
      return;
    }
  }
  
  // Start automatic token refresh checking only for authenticated session.
  if (getSessionClaims()) {
    startAutoTokenRefresh();
  }

  if (cachedUser) {
    if (authGate) {
      hideAuthGate();
      setAuthStatus("");
    }
    refreshDeskBookingOwnership();
    await runAppInit();
    void fetchResponsibilitiesForUser({ force: true }).catch(() => {
      setResponsibilitiesMenuVisibility(false);
    });
    return;
  }

  // Session is valid, but external token is unavailable (memory-only storage
  // after page reload). Continue without re-fetching profile from upstream.
  if (!token && getSessionClaims()) {
    if (authGate) {
      hideAuthGate();
      setAuthStatus("");
    }
    await runAppInit();
    return;
  }

  if (authGate) {
    setAuthLoading(true);
  }

  const userResult = await fetchAuthUserInfo(token);

  if (authGate) {
    setAuthLoading(false);
  }

  if (userResult.success) {
    setUserInfo(userResult.user);
    updateAuthUserBlock(userResult.user);
    refreshDeskBookingOwnership();
    if (authGate) {
      hideAuthGate();
    }
    await runAppInit();
    void fetchResponsibilitiesForUser({ force: true }).catch(() => {
      setResponsibilitiesMenuVisibility(false);
    });
    return;
  }

  const isUnauthorized = userResult.status === 401 || userResult.status === 403;
  if (isUnauthorized) {
    clearAuthStorage();
    if (authGate) {
      showAuthLogin();
      setAuthStep("phone");
      setAuthStatus("Авторизуйтесь снова.", "error");
    }
    return;
  }

  if (authGate) {
    if (cachedUser) {
      hideAuthGate();
      setAuthStatus("Не удалось проверить авторизацию. Продолжаем работу офлайн.", "warning");
      return;
    }
    hideAuthGate();
    setAuthStatus("Не удалось проверить авторизацию. Повторите попытку позже.", "warning");
  }
  await runAppInit();
};

const shouldBlockEmployeeRequest = (path, options = {}) => {
  if (!isEmployeeRole(getUserInfo())) {
    return false;
  }
  const method = String(options.method || "GET").toUpperCase();
  if (!["POST", "PUT", "DELETE"].includes(method)) {
    return false;
  }
  // Keep only hard-deny rules that are always forbidden for employee role.
  // Contextual permissions (responsible employee, hierarchy access, etc.)
  // are resolved on the backend and may change between requests.
  const target = String(typeof path === "string" ? path : path || "");
  const pathOnly = target.split("?")[0] || "";
  if (method === "POST" && pathOnly === "/api/buildings") {
    return true;
  }
  if ((method === "POST" || method === "PUT") && pathOnly === "/api/users/role") {
    return true;
  }
  return false;
};

const isMutationMethod = (method) => !["GET", "HEAD", "OPTIONS", "TRACE"].includes(String(method || "").toUpperCase());

const normalizeApiCacheKey = (path) => String(path || "").trim();

const isApiCacheEntryFresh = (entry) =>
  Boolean(entry && Number.isFinite(entry.expiresAt) && entry.expiresAt > Date.now());

const getCachedApiResponse = (path) => {
  const cacheKey = normalizeApiCacheKey(path);
  if (!cacheKey) {
    return null;
  }
  const entry = routePrefetchCache.get(cacheKey);
  if (!isApiCacheEntryFresh(entry)) {
    if (entry) {
      routePrefetchCache.delete(cacheKey);
    }
    return null;
  }
  return entry.data;
};

const setCachedApiResponse = (path, data) => {
  const cacheKey = normalizeApiCacheKey(path);
  if (!cacheKey) {
    return;
  }
  routePrefetchCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + API_GET_CACHE_TTL_MS,
  });
};

const clearApiResponseCache = () => {
  routePrefetchCache.clear();
  routePrefetchInFlight.clear();
};

const consumePrefetchedApiResponse = (path) => {
  return getCachedApiResponse(path);
};

const prefetchApiResponse = (path) => {
  const cacheKey = normalizeApiCacheKey(path);
  if (!cacheKey) {
    return Promise.resolve(null);
  }
  const cachedData = getCachedApiResponse(cacheKey);
  if (cachedData !== null) {
    return Promise.resolve(cachedData);
  }
  if (routePrefetchInFlight.has(cacheKey)) {
    return routePrefetchInFlight.get(cacheKey);
  }
  const request = apiRequest(cacheKey)
    .then((data) => {
      setCachedApiResponse(cacheKey, data);
      return data;
    })
    .catch(() => null)
    .finally(() => {
      routePrefetchInFlight.delete(cacheKey);
    });
  routePrefetchInFlight.set(cacheKey, request);
  return request;
};

const loadApiResponse = async (path) => {
  const cacheKey = normalizeApiCacheKey(path);
  const prefetched = consumePrefetchedApiResponse(cacheKey);
  if (prefetched !== null) {
    return prefetched;
  }
  if (routePrefetchInFlight.has(cacheKey)) {
    return routePrefetchInFlight.get(cacheKey);
  }
  const request = apiRequest(cacheKey)
    .then((data) => {
      setCachedApiResponse(cacheKey, data);
      return data;
    })
    .finally(() => {
      routePrefetchInFlight.delete(cacheKey);
    });
  routePrefetchInFlight.set(cacheKey, request);
  return request;
};

const prefetchBuildingRouteData = (buildingId) => {
  const normalizedId = Number(buildingId);
  if (!Number.isFinite(normalizedId)) {
    return;
  }
  void prefetchApiResponse("/api/buildings");
  void prefetchApiResponse(`/api/buildings/${normalizedId}/floors`);
};

const prefetchFloorRouteData = ({ buildingId, floorId }) => {
  prefetchBuildingRouteData(buildingId);
  const normalizedFloorId = Number(floorId);
  if (!Number.isFinite(normalizedFloorId)) {
    return;
  }
  void prefetchApiResponse(`/api/floors/${normalizedFloorId}`);
  void prefetchApiResponse(`/api/floors/${normalizedFloorId}/spaces`);
};

const prefetchSpaceRouteData = ({ buildingId, spaceId, floorId = null, date = null }) => {
  prefetchBuildingRouteData(buildingId);
  const normalizedFloorId = Number(floorId);
  if (Number.isFinite(normalizedFloorId)) {
    void prefetchApiResponse(`/api/floors/${normalizedFloorId}`);
    void prefetchApiResponse(`/api/floors/${normalizedFloorId}/spaces`);
  }
  const normalizedSpaceId = Number(spaceId);
  if (Number.isFinite(normalizedSpaceId)) {
    void prefetchApiResponse(`/api/spaces/${normalizedSpaceId}`);
    void prefetchApiResponse(`/api/spaces/${normalizedSpaceId}/desks`);
    const normalizedDate = normalizeBookingDate(date || bookingState?.selectedDate || "");
    if (normalizedDate) {
      void prefetchApiResponse(
        `/api/spaces/${normalizedSpaceId}/desks?date=${encodeURIComponent(normalizedDate)}`
      );
    }
  }
};

const attachRoutePrefetchHandlers = (element, prefetchFn) => {
  if (!element || typeof prefetchFn !== "function") {
    return;
  }
  const triggerPrefetch = () => {
    prefetchFn();
  };
  element.addEventListener("pointerenter", triggerPrefetch, { passive: true });
  element.addEventListener("focus", triggerPrefetch, { passive: true });
  element.addEventListener(
    "touchstart",
    () => {
      prefetchFn();
    },
    { passive: true, once: true }
  );
};

const apiRequest = async (path, options = {}) => {
  if (shouldBlockEmployeeRequest(path, options)) {
    throw new Error("Недостаточно прав для выполнения действия.");
  }
  const method = String(options?.method || "GET").toUpperCase();
  if (isMutationMethod(method)) {
    // Mutations may affect many dependent entities, so invalidate read cache.
    clearApiResponseCache();
  }
  return makeApiRequest(path, options);
};

/* createCancellableRequest → imported from api.js (now takes requestFn param) */

/* createStatusManager → imported from status.js */

const statusManager = createStatusManager(statusBox);
const setStatus = (message, tone) => statusManager.set(message, tone);
const clearStatus = () => statusManager.clear();

const buildingStatusManager = createStatusManager(buildingStatus);
const setBuildingStatus = (message, tone) => buildingStatusManager.set(message, tone);
const clearBuildingStatus = () => buildingStatusManager.clear();

const floorStatusManager = createStatusManager(floorStatus);
const setFloorStatus = (message, tone) => floorStatusManager.set(message, tone);
const clearFloorStatus = () => floorStatusManager.clear();

const floorInfoStatusManager = createStatusManager(floorInfoStatus);
const setFloorInfoStatus = (message, tone) => floorInfoStatusManager.set(message, tone);
const clearFloorInfoStatus = () => floorInfoStatusManager.clear();

const spaceStatusManager = createStatusManager(spaceStatus);
const setSpaceStatus = (message, tone) => spaceStatusManager.set(message, tone);
const clearSpaceStatus = () => spaceStatusManager.clear();

const deskStatusManager = createStatusManager(deskStatus);
const setDeskStatus = (message, tone) => deskStatusManager.set(message, tone);
const clearDeskStatus = () => deskStatusManager.clear();

const spacePageStatusManager = createStatusManager(spacePageStatus);
const setSpacePageStatus = (message, tone) => spacePageStatusManager.set(message, tone);
const clearSpacePageStatus = () => spacePageStatusManager.clear();

const bookingStatusManager = createStatusManager(spaceBookingStatus);
const setBookingStatus = (message, tone) => bookingStatusManager.set(message, tone);
const clearBookingStatus = () => bookingStatusManager.clear();
const notifyDeskBookingCompletion = (message, tone = "success") => {
  setBookingStatus(message, tone);
  showTopAlert(message, tone);
};

const dbDumpStatusManager = createStatusManager(dbDumpStatus);
const setDbDumpStatus = (message, tone) => dbDumpStatusManager.set(message, tone);
const clearDbDumpStatus = () => dbDumpStatusManager.clear();

let topAlertTimer = null;
let topAlertClearTimer = null;

const hideTopAlert = () => {
  if (!topAlert) {
    return;
  }
  if (topAlertTimer) {
    clearTimeout(topAlertTimer);
    topAlertTimer = null;
  }
  topAlert.classList.remove("is-visible");
  if (topAlertClearTimer) {
    clearTimeout(topAlertClearTimer);
  }
  topAlertClearTimer = setTimeout(() => {
    topAlert.textContent = "";
    topAlert.dataset.tone = "";
  }, 300);
};

const showTopAlert = (message, tone = "success") => {
  if (!topAlert) {
    return;
  }
  topAlert.textContent = message;
  topAlert.dataset.tone = tone;
  topAlert.classList.add("is-visible");
  if (topAlertTimer) {
    clearTimeout(topAlertTimer);
  }
  if (topAlertClearTimer) {
    clearTimeout(topAlertClearTimer);
  }
  topAlertTimer = setTimeout(() => {
    hideTopAlert();
  }, 5000);
};

const updateTopAlertHeight = () => {
  const headerHeight = appHeader?.offsetHeight;
  if (!Number.isFinite(headerHeight) || headerHeight <= 0) {
    return;
  }
  document.documentElement.style.setProperty("--app-header-height", `${headerHeight}px`);
};

/* getBookingUserKey → imported from utils.js */

const getBookingUserEmployeeID = (user) => {
  const direct = String(
    user?.employee_id ||
      user?.employeeId ||
      user?.employeeID ||
      user?.data?.employee_id ||
      user?.data?.employeeId ||
      user?.data?.employeeID ||
      user?.payload?.employee_id ||
      user?.payload?.employeeId ||
      user?.payload?.employeeID ||
      user?.user?.employee_id ||
      user?.user?.employeeId ||
      user?.user?.employeeID ||
      ""
  ).trim();
  if (direct) {
    return direct;
  }
  const profile = user?.profile || user?.data?.profile || user?.payload?.profile || null;
  const profileEmployeeID = String(profile?.employee_id || profile?.employeeId || "").trim();
  if (profileEmployeeID) {
    return profileEmployeeID;
  }
  const nestedUser = user?.user || user?.data?.user || user?.payload?.user || null;
  const nestedEmployeeID = String(
    nestedUser?.employee_id || nestedUser?.employeeId || nestedUser?.employeeID || ""
  ).trim();
  if (nestedEmployeeID) {
    return nestedEmployeeID;
  }
  const nestedProfile = nestedUser?.profile || null;
  return String(nestedProfile?.employee_id || nestedProfile?.employeeId || "").trim();
};

const getBookingUserInfo = () => {
  const user = getUserInfo();
  const key = getBookingUserKey(user);
  const name = getDisplayNameFromUser(user) || key;
  const employeeId = getBookingUserEmployeeID(user);
  return { user, key, name, employeeId };
};

const RESPONSIBILITIES_EMPTY_MESSAGE = "Зон ответственности пока нет.";
const RESPONSIBILITIES_LOADING_MESSAGE = "Загрузка...";
const RESPONSIBILITIES_PATH_SEPARATOR = " • ";

const getEmptyResponsibilities = () => ({ buildings: [], floors: [], coworkings: [] });

const hasResponsibilities = (data) => {
  if (!data) {
    return false;
  }
  const hasBuildings = Array.isArray(data.buildings) && data.buildings.length > 0;
  const hasFloors = Array.isArray(data.floors) && data.floors.length > 0;
  const hasCoworkings = Array.isArray(data.coworkings) && data.coworkings.length > 0;
  return hasBuildings || hasFloors || hasCoworkings;
};

const setResponsibilitiesMenuVisibility = (isVisible) => {
  if (!breadcrumbProfiles || breadcrumbProfiles.length === 0) {
    return;
  }
  breadcrumbProfiles.forEach((profile) => {
    const button = profile.querySelector('[data-role="breadcrumb-responsibilities"]');
    if (button) {
      button.classList.toggle("is-hidden", !isVisible);
    }
  });
};

const setDbDumpMenuVisibility = (isVisible) => {
  if (!breadcrumbProfiles || breadcrumbProfiles.length === 0) {
    return;
  }
  breadcrumbProfiles.forEach((profile) => {
    const button = profile.querySelector('[data-role="breadcrumb-db-dump"]');
    if (button) {
      button.classList.toggle("is-hidden", !isVisible);
    }
  });
};

const setResponsibilitiesEmptyMessage = (message) => {
  if (!responsibilitiesEmpty) {
    return;
  }
  responsibilitiesEmpty.textContent = message;
  responsibilitiesEmpty.classList.remove("is-hidden");
};

const resetResponsibilitiesState = () => {
  responsibilitiesState = {
    status: "idle",
    data: null,
    error: null,
    loadedAt: 0,
  };
  responsibilitiesRequest = null;
  setResponsibilitiesMenuVisibility(false);
};

const getBuildingLabel = (building) => {
  const name = typeof building?.name === "string" ? building.name.trim() : "";
  if (name) {
    return name;
  }
  const id = String(building?.id ?? "").trim();
  return id ? `Здание #${id}` : "Здание";
};

const getFloorLabel = (floor) => {
  const floorName = typeof floor?.floorName === "string" ? floor.floorName.trim() : "";
  if (floorName) {
    return floorName;
  }
  const name = typeof floor?.name === "string" ? floor.name.trim() : "";
  if (name) {
    return name;
  }
  const level = Number(floor?.floorLevel ?? floor?.level);
  if (Number.isFinite(level)) {
    return `Этаж ${level}`;
  }
  const id = String(floor?.id ?? "").trim();
  return id ? `Этаж #${id}` : "Этаж";
};

const getCoworkingLabel = (space) => {
  const name = typeof space?.name === "string" ? space.name.trim() : "";
  if (name) {
    return name;
  }
  const id = String(space?.id ?? "").trim();
  return id ? `Коворкинг #${id}` : "Коворкинг";
};

const joinResponsibilityPath = (parts) =>
  parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(RESPONSIBILITIES_PATH_SEPARATOR);

const normalizeResponsibilitiesFromToken = (tokenResp) => {
  const toArray = (value) => (Array.isArray(value) ? value : []);
  const toOptionalNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };
  const toOptionalString = (value) => {
    const text = String(value ?? "").trim();
    return text || undefined;
  };
  const normalizeID = (value) => {
    const text = String(value ?? "").trim();
    return text || null;
  };
  const normalizeBuilding = (item) => {
    if (item && typeof item === "object") {
      const id = normalizeID(item.id ?? item.building_id ?? item.buildingId);
      if (!id) {
        return null;
      }
      return {
        id,
        name: toOptionalString(item.name),
        address: toOptionalString(item.address),
      };
    }
    const id = normalizeID(item);
    return id ? { id } : null;
  };
  const normalizeFloor = (item) => {
    if (item && typeof item === "object") {
      const id = normalizeID(item.id ?? item.floor_id ?? item.floorId);
      if (!id) {
        return null;
      }
      return {
        id,
        name: toOptionalString(item.name),
        level: toOptionalNumber(item.level),
        floorName: toOptionalString(item.floor_name ?? item.floorName),
        floorLevel: toOptionalNumber(item.floor_level ?? item.floorLevel),
        buildingId: normalizeID(item.building_id ?? item.buildingId),
        buildingName: toOptionalString(item.building_name ?? item.buildingName),
        buildingAddress: toOptionalString(item.building_address ?? item.buildingAddress),
      };
    }
    const id = normalizeID(item);
    return id ? { id } : null;
  };
  const normalizeCoworking = (item) => {
    if (item && typeof item === "object") {
      const id = normalizeID(item.id ?? item.space_id ?? item.spaceId);
      if (!id) {
        return null;
      }
      return {
        id,
        name: toOptionalString(item.name),
        floorId: normalizeID(item.floor_id ?? item.floorId),
        floorName: toOptionalString(item.floor_name ?? item.floorName),
        floorLevel: toOptionalNumber(item.floor_level ?? item.floorLevel),
        buildingId: normalizeID(item.building_id ?? item.buildingId),
        buildingName: toOptionalString(item.building_name ?? item.buildingName),
        buildingAddress: toOptionalString(item.building_address ?? item.buildingAddress),
        subdivisionLevel1: toOptionalString(item.subdivision_level_1 ?? item.subdivisionLevel1),
        subdivisionLevel2: toOptionalString(item.subdivision_level_2 ?? item.subdivisionLevel2),
      };
    }
    const id = normalizeID(item);
    return id ? { id } : null;
  };
  return {
    buildings: toArray(tokenResp?.buildings).map(normalizeBuilding).filter(Boolean),
    floors: toArray(tokenResp?.floors).map(normalizeFloor).filter(Boolean),
    coworkings: toArray(tokenResp?.coworkings).map(normalizeCoworking).filter(Boolean),
  };
};

const getResponsibilityItemID = (item) => String(item?.id ?? "").trim();

const getResponsibilityItemRichness = (item) => {
  if (!item || typeof item !== "object") {
    return 0;
  }
  return Object.values(item).reduce((score, value) => {
    if (typeof value === "string") {
      return value.trim() ? score + 1 : score;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? score + 1 : score;
    }
    return value ? score + 1 : score;
  }, 0);
};

const mergeResponsibilityItems = (apiItems, tokenItems) => {
  const merged = new Map();
  const append = (items) => {
    if (!Array.isArray(items)) {
      return;
    }
    items.forEach((item) => {
      const id = getResponsibilityItemID(item);
      if (!id) {
        return;
      }
      const existing = merged.get(id);
      if (!existing) {
        merged.set(id, item);
        return;
      }
      if (getResponsibilityItemRichness(item) > getResponsibilityItemRichness(existing)) {
        merged.set(id, item);
      }
    });
  };
  append(tokenItems);
  append(apiItems);
  return Array.from(merged.values());
};

const mergeResponsibilitiesData = (apiData, tokenData) => ({
  buildings: mergeResponsibilityItems(apiData?.buildings, tokenData?.buildings),
  floors: mergeResponsibilityItems(apiData?.floors, tokenData?.floors),
  coworkings: mergeResponsibilityItems(apiData?.coworkings, tokenData?.coworkings),
});

/**
 * Expand responsibility IDs to full objects by fetching data from API.
 * Takes { buildings: [id...], floors: [id...], coworkings: [id...] }
 * Returns { buildings: [...], floors: [...], coworkings: [...] } with full objects.
 */
const expandResponsibilitiesFromIDs = async (tokenResp) => {
  const result = {
    buildings: [],
    floors: [],
    coworkings: [],
  };
  const toIDSet = (values) => {
    const set = new Set();
    if (!Array.isArray(values)) {
      return set;
    }
    values.forEach((value) => {
      const normalized = String(value ?? "").trim();
      if (normalized) {
        set.add(normalized);
      }
    });
    return set;
  };
  const toItemsArray = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload?.items)) {
      return payload.items;
    }
    return [];
  };
  const buildingIDSet = toIDSet(tokenResp?.buildings);
  const floorIDSet = toIDSet(tokenResp?.floors);
  const coworkingIDSet = toIDSet(tokenResp?.coworkings);

  // Fetch all entities if we have any IDs
  const needsBuildings = tokenResp.buildings.length > 0;
  const needsFloors = tokenResp.floors.length > 0;
  const needsCoworkings = tokenResp.coworkings.length > 0;

  if (!needsBuildings && !needsFloors && !needsCoworkings) {
    return result;
  }

  try {
    // Bypass client-side "employee write restrictions": this is read-only data for profile UI.
    let allBuildings = null;
    if (needsBuildings || needsFloors || needsCoworkings) {
      const buildingsResponse = await makeApiRequest("/api/buildings");
      allBuildings = toItemsArray(buildingsResponse);
      if (needsBuildings) {
        result.buildings = allBuildings.filter((b) => buildingIDSet.has(String(b?.id ?? "").trim()));
      }
    }

    // Fetch floors via dedicated endpoint: /api/buildings returns only floor IDs.
    if (needsFloors || needsCoworkings) {
      if (Array.isArray(allBuildings)) {
        for (const building of allBuildings) {
          let floors = [];
          try {
            const floorsResponse = await makeApiRequest(`/api/buildings/${building.id}/floors`);
            floors = toItemsArray(floorsResponse);
          } catch (err) {
            // Skip this building if we can't fetch floors
            continue;
          }
          for (const floor of floors) {
            // Add floor data if user is responsible
            if (needsFloors && floorIDSet.has(String(floor?.id ?? "").trim())) {
              result.floors.push({
                id: floor.id,
                name: floor.name,
                level: floor.level,
                buildingId: building.id,
                buildingName: building.name,
                buildingAddress: building.address,
              });
            }

            // Fetch coworkings for this floor if needed
            if (needsCoworkings) {
              try {
                const spacesResponse = await makeApiRequest(`/api/floors/${floor.id}/spaces`);
                const spaces = toItemsArray(spacesResponse);
                if (Array.isArray(spaces)) {
                  for (const space of spaces) {
                    if (
                      space.kind === "coworking" &&
                      coworkingIDSet.has(String(space?.id ?? "").trim())
                    ) {
                      result.coworkings.push({
                        id: space.id,
                        name: space.name,
                        floorId: floor.id,
                        floorName: floor.name,
                        floorLevel: floor.level,
                        buildingId: building.id,
                        buildingName: building.name,
                        buildingAddress: building.address,
                        subdivisionLevel1: space.subdivision_level_1 || "",
                        subdivisionLevel2: space.subdivision_level_2 || "",
                      });
                    }
                  }
                }
              } catch (err) {
                // Skip this floor if we can't fetch spaces
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Return whatever we managed to fetch
  }

  return result;
};

const fetchResponsibilitiesForUser = async ({ force = false } = {}) => {
  if (!force && responsibilitiesState.status === "loaded" && responsibilitiesState.data) {
    return responsibilitiesState.data;
  }
  if (responsibilitiesRequest) {
    return responsibilitiesRequest;
  }

  // Ensure session claims are available (token cookie is set by backend)
  if (!isOfficeAccessTokenValid()) {
    const empty = getEmptyResponsibilities();
    responsibilitiesState = {
      status: "loaded",
      data: empty,
      error: null,
      loadedAt: Date.now(),
    };
    return empty;
  }

  // Read responsibilities directly from Office Access Token.
  const tokenResp = getResponsibilitiesFromToken();
  const tokenData = tokenResp ? normalizeResponsibilitiesFromToken(tokenResp) : getEmptyResponsibilities();
  const employeeIDFromToken = getEmployeeIDFromOfficeAccessToken();
  const employeeID = employeeIDFromToken || getBookingUserEmployeeID(getUserInfo());

  // Build a complete list from API (source of truth) and token (fallback/extra IDs).
  // This keeps labels consistent with page header naming and avoids stale/partial token payloads.
  if (employeeID) {
    try {
      const raw = await apiRequest(`/api/responsibilities?employee_id=${encodeURIComponent(employeeID)}`);
      const apiData = normalizeResponsibilitiesFromToken(raw || {});
      const merged = mergeResponsibilitiesData(apiData, tokenData);
      responsibilitiesState = {
        status: "loaded",
        data: merged,
        error: null,
        loadedAt: Date.now(),
      };
      setResponsibilitiesMenuVisibility(hasResponsibilities(merged));
      return merged;
    } catch (error) {
      // Continue with token data below.
    }
  }

  if (tokenResp) {
    if (hasResponsibilities(tokenData)) {
      responsibilitiesState = {
        status: "loaded",
        data: tokenData,
        error: null,
        loadedAt: Date.now(),
      };
      setResponsibilitiesMenuVisibility(true);
      return tokenData;
    }
  }

  const empty = getEmptyResponsibilities();
  responsibilitiesState = {
    status: "loaded",
    data: empty,
    error: null,
    loadedAt: Date.now(),
  };
  setResponsibilitiesMenuVisibility(false);
  return empty;
};

const bootstrapResponsibilitiesVisibility = async () => {
  try {
    await fetchResponsibilitiesForUser({ force: true });
  } catch {
    setResponsibilitiesMenuVisibility(false);
  }
};

const renderResponsibilitiesList = (data) => {
  if (!responsibilitiesList || !responsibilitiesEmpty) {
    return;
  }
  responsibilitiesList.replaceChildren();
  const hasAny = hasResponsibilities(data);
  if (!hasAny) {
    setResponsibilitiesEmptyMessage(RESPONSIBILITIES_EMPTY_MESSAGE);
    return;
  }
  responsibilitiesEmpty.classList.add("is-hidden");

  const appendSection = (title, items, renderItem) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    const section = document.createElement("div");
    section.className = "responsibilities-section";
    const heading = document.createElement("h3");
    heading.className = "responsibilities-section-title";
    heading.textContent = title;
    section.appendChild(heading);
    items.forEach((item) => {
      const entry = renderItem(item);
      if (entry) {
        section.appendChild(entry);
      }
    });
    responsibilitiesList.appendChild(section);
  };

  appendSection("Здания", data.buildings, (building) => {
    const buildingId = Number(building?.id);
    const title = getBuildingLabel(building);
    const buildingAddress = typeof building?.address === "string" ? building.address.trim() : "";
    const item = document.createElement("div");
    item.className = "responsibilities-item responsibilities-item--clickable";
    const label = document.createElement("div");
    label.className = "responsibilities-item-title";
    label.textContent = title;
    item.appendChild(label);
    if (buildingAddress) {
      const meta = document.createElement("div");
      meta.className = "responsibilities-item-meta";
      meta.textContent = buildingAddress;
      item.appendChild(meta);
    }
    attachRoutePrefetchHandlers(item, () => {
      prefetchBuildingRouteData(buildingId);
    });
    item.addEventListener("click", () => {
      closeResponsibilitiesModal();
      void navigateTo(`/buildings/${encodeURIComponent(building.id)}`);
    });
    return item;
  });

  appendSection("Этажи", data.floors, (floor) => {
    const buildingId = Number(floor?.buildingId);
    const buildingName = typeof floor?.buildingName === "string" ? floor.buildingName.trim() : "";
    const level = Number(floor?.level);
    const floorLabel = Number.isFinite(level) ? `Этаж ${level}` : getFloorLabel(floor);
    const item = document.createElement("div");
    item.className = "responsibilities-item responsibilities-item--clickable";
    const label = document.createElement("div");
    label.className = "responsibilities-item-title";
    label.textContent = floorLabel;
    item.appendChild(label);
    if (buildingName) {
      const meta = document.createElement("div");
      meta.className = "responsibilities-item-meta";
      meta.textContent = buildingName;
      item.appendChild(meta);
    }
    if (floor.buildingId && Number.isFinite(level)) {
      attachRoutePrefetchHandlers(item, () => {
        prefetchFloorRouteData({ buildingId, floorId: floor.id });
      });
      item.addEventListener("click", () => {
        closeResponsibilitiesModal();
        void navigateTo(
          `/buildings/${encodeURIComponent(floor.buildingId)}/floors/${encodeURIComponent(floor.level)}`
        );
      });
    }
    return item;
  });

  appendSection("Коворкинги", data.coworkings, (space) => {
    const buildingId = Number(space?.buildingId);
    const spaceId = Number(space?.id);
    const buildingName = typeof space?.buildingName === "string" ? space.buildingName.trim() : "";
    const floorLevel = Number(space?.floorLevel);
    const floorLabel = Number.isFinite(floorLevel) ? `Этаж ${floorLevel}` : getFloorLabel(space);
    const sub1 = typeof space?.subdivisionLevel1 === "string" ? space.subdivisionLevel1.trim() : "";
    const sub2 = typeof space?.subdivisionLevel2 === "string" ? space.subdivisionLevel2.trim() : "";
    const coworkingName = getCoworkingLabel(space);
    const path = joinResponsibilityPath([buildingName, floorLabel, sub1, sub2]);
    const item = document.createElement("div");
    item.className = "responsibilities-item responsibilities-item--clickable";
    const label = document.createElement("div");
    label.className = "responsibilities-item-title";
    label.textContent = coworkingName;
    item.appendChild(label);
    if (path) {
      const meta = document.createElement("div");
      meta.className = "responsibilities-item-meta";
      meta.textContent = path;
      item.appendChild(meta);
    }
    if (space.buildingId && Number.isFinite(floorLevel) && space.id) {
      attachRoutePrefetchHandlers(item, () => {
        prefetchSpaceRouteData({
          buildingId,
          floorId: space?.floorId,
          spaceId,
        });
      });
      item.addEventListener("click", () => {
        closeResponsibilitiesModal();
        void navigateTo(
          `/buildings/${encodeURIComponent(space.buildingId)}/floors/${encodeURIComponent(
            space.floorLevel
          )}/spaces/${encodeURIComponent(space.id)}`
        );
      });
    }
    return item;
  });
};

const openResponsibilitiesModal = async () => {
  if (!responsibilitiesModal) {
    return;
  }
  responsibilitiesModal.classList.add("is-open");
  responsibilitiesModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (responsibilitiesList) {
    responsibilitiesList.replaceChildren();
  }
  setResponsibilitiesEmptyMessage(RESPONSIBILITIES_LOADING_MESSAGE);
  const data = await fetchResponsibilitiesForUser();
  if (responsibilitiesState.error && responsibilitiesEmpty) {
    setResponsibilitiesEmptyMessage(responsibilitiesState.error.message || "Не удалось загрузить.");
    return;
  }
  renderResponsibilitiesList(data);
};

const closeResponsibilitiesModal = () => {
  if (!responsibilitiesModal) {
    return;
  }
  responsibilitiesModal.classList.remove("is-open");
  responsibilitiesModal.setAttribute("aria-hidden", "true");
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(floorInfoModal && floorInfoModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
};

const openDbDumpModal = () => {
  if (!dbDumpModal) {
    return;
  }
  dbDumpModal.classList.add("is-open");
  dbDumpModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  clearDbDumpStatus();
};

const closeDbDumpModal = () => {
  if (!dbDumpModal) {
    return;
  }
  dbDumpModal.classList.remove("is-open");
  dbDumpModal.setAttribute("aria-hidden", "true");
  clearDbDumpStatus();
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(floorInfoModal && floorInfoModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(adminBookingsModal && adminBookingsModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(responsibilitiesModal && responsibilitiesModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
};

const parseDownloadFileName = (contentDisposition, fallback = "db_dump.sql") => {
  const header = String(contentDisposition || "").trim();
  if (!header) {
    return fallback;
  }
  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/[/\\]/g, "_");
    } catch (_error) {
      // Ignore malformed URI sequence and continue with fallback patterns.
    }
  }
  const asciiMatch = header.match(/filename\s*=\s*"([^"]+)"/i) || header.match(/filename\s*=\s*([^;]+)/i);
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1].trim().replace(/[/\\]/g, "_");
  }
  return fallback;
};

const handleDownloadDbDump = async () => {
  if (!dbDumpDownloadBtn || !dbDumpUploadBtn) {
    return;
  }
  dbDumpDownloadBtn.disabled = true;
  dbDumpUploadBtn.disabled = true;
  setDbDumpStatus("Создаем дамп и готовим скачивание...", "info");
  try {
    const response = await fetch("/api/admin/db-dumps/export", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || "Не удалось создать дамп БД.");
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error("Получен пустой дамп БД.");
    }
    const fileName = parseDownloadFileName(
      response.headers.get("Content-Disposition"),
      `db_dump_${Date.now()}.sql`
    );
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    setDbDumpStatus("Дамп БД создан, сохранен на сервере и скачан.", "success");
  } catch (error) {
    setDbDumpStatus(error.message || "Не удалось скачать дамп БД.", "error");
  } finally {
    dbDumpDownloadBtn.disabled = false;
    dbDumpUploadBtn.disabled = false;
  }
};

const handleUploadDbDump = async (file) => {
  if (!file) {
    return;
  }
  if (!dbDumpDownloadBtn || !dbDumpUploadBtn) {
    return;
  }
  dbDumpDownloadBtn.disabled = true;
  dbDumpUploadBtn.disabled = true;
  setDbDumpStatus("Загружаем дамп в базу данных...", "info");
  try {
    const formData = new FormData();
    formData.append("file", file);
    await apiRequest("/api/admin/db-dumps/import", {
      method: "POST",
      body: formData,
    });
    setDbDumpStatus("Дамп БД успешно загружен.", "success");
  } catch (error) {
    setDbDumpStatus(error.message || "Не удалось загрузить дамп БД.", "error");
  } finally {
    dbDumpDownloadBtn.disabled = false;
    dbDumpUploadBtn.disabled = false;
  }
};

const getSpaceResponsibleEmployeeId = (space) =>
  String(
    space?.responsible_employee_id ||
      space?.responsibleEmployeeId ||
      space?.responsible_employee ||
      space?.responsibleEmployee ||
      ""
  ).trim();

const getBuildingResponsibleEmployeeId = (building) =>
  String(
    building?.responsible_employee_id ||
      building?.responsibleEmployeeId ||
      building?.responsible_employee ||
      building?.responsibleEmployee ||
      ""
  ).trim();

const getFloorResponsibleEmployeeId = (floor) =>
  String(
    floor?.responsible_employee_id ||
      floor?.responsibleEmployeeId ||
      floor?.responsible_employee ||
      floor?.responsibleEmployee ||
      ""
  ).trim();

const isCoworkingResponsible = (user, space) => {
  if (!space || space.kind !== "coworking") {
    return false;
  }
  const employeeId = getBookingUserEmployeeID(user);
  const responsibleId = getSpaceResponsibleEmployeeId(space);
  return Boolean(employeeId && responsibleId && employeeId === responsibleId);
};

const isBuildingResponsible = (user, building) => {
  if (!building) {
    return false;
  }
  const employeeId = getBookingUserEmployeeID(user);
  const responsibleId = getBuildingResponsibleEmployeeId(building);
  return Boolean(employeeId && responsibleId && employeeId === responsibleId);
};

const isFloorResponsible = (user, floor) => {
  if (!floor) {
    return false;
  }
  const employeeId = getBookingUserEmployeeID(user);
  const responsibleId = getFloorResponsibleEmployeeId(floor);
  return Boolean(employeeId && responsibleId && employeeId === responsibleId);
};

const resolveBuildingForFloor = (floor) => {
  if (!floor) {
    return currentBuilding;
  }
  const buildingId = Number(floor?.building_id || floor?.buildingId || 0);
  if (currentBuilding && Number(currentBuilding.id) === buildingId) {
    return currentBuilding;
  }
  if (buildingId && Array.isArray(buildings)) {
    const matched = buildings.find((item) => Number(item?.id) === buildingId);
    if (matched) {
      return matched;
    }
  }
  return currentBuilding;
};

const canManageBuildingResources = (user, building) =>
  canManageOfficeResources(user) || isBuildingResponsible(user, building);

const canManageFloorResources = (user, floor) =>
  canManageOfficeResources(user) ||
  isFloorResponsible(user, floor) ||
  isBuildingResponsible(user, resolveBuildingForFloor(floor));

const resolveFloorForSpace = (space) => {
  if (!space) {
    return currentFloor;
  }
  const floorId = Number(space?.floor_id || space?.floorId || 0);
  if (currentFloor && Number(currentFloor.id) === floorId) {
    return currentFloor;
  }
  return currentFloor && !floorId ? currentFloor : null;
};

const resolveBuildingForSpace = (space) => resolveBuildingForFloor(resolveFloorForSpace(space));

const canManageSpaceResources = (user, space) =>
  canManageOfficeResources(user) ||
  isCoworkingResponsible(user, space) ||
  isFloorResponsible(user, resolveFloorForSpace(space)) ||
  isBuildingResponsible(user, resolveBuildingForSpace(space));

const getActiveSpaceForPermissions = () => editingSpace || currentSpace || null;

const canManageActiveSpaceResources = (user) =>
  canManageSpaceResources(user, getActiveSpaceForPermissions());

const getBookingHeaders = () => {
  return {};
};

/* normalizeBookingDate, isValidBookingDate → imported from utils.js */

const getBookingDateFromLocation = () => {
  const query = window.location.search || "";
  if (!query) {
    return "";
  }
  const params = new URLSearchParams(query);
  const date = normalizeBookingDate(params.get("date"));
  return isValidBookingDate(date) ? date : "";
};

/* formatBookingDate..formatSelectedDateTitle → imported from utils.js */

/* getPeopleCountLabel, getPeopleCountLimitLabel → imported from utils.js */

const updateSpaceMapDateTitle = (raw) => {
  if (!spaceMapDateTitle) {
    return;
  }
  spaceMapDateTitle.textContent = formatSelectedDateTitle(raw);
};

/* formatUserNameInitials → imported from utils.js */

const applyDeskBookingPayload = (desk) => {
  if (!desk) {
    return false;
  }
  const booking = desk?.booking;
  if (!booking || typeof booking.is_booked !== "boolean") {
    desk.bookingStatus = "free";
    desk.bookingUserName = "";
    desk.bookingUserKey = "";
    desk.bookingTenantEmployeeID = "";
    return true;
  }
  if (!booking.is_booked) {
    desk.bookingStatus = "free";
    desk.bookingUserName = "";
    desk.bookingUserKey = "";
    desk.bookingTenantEmployeeID = "";
    return true;
  }
  const user = booking.user || {};
  const userApplierID = String(user.applier_employee_id || user.employee_id || user.employeeId || user.employeeID || "").trim();
  const userKey = userApplierID;
  const userName = String(
    user.user_name || user.userName || user.full_name || user.fullName || userKey || ""
  ).trim();
  const { employeeId: currentEmployeeID } = getBookingUserInfo();
  desk.bookingUserKey = userKey;
  desk.bookingUserName = formatUserNameInitials(userName);
  desk.bookingTenantEmployeeID = String(user.tenant_employee_id || "").trim();
  desk.bookingStatus =
    currentEmployeeID && userKey && userKey === currentEmployeeID ? "my" : "booked";
  return true;
};

const mergeDeskBookingState = (desk, previous = null) => {
  if (!desk) {
    return desk;
  }
  if (applyDeskBookingPayload(desk)) {
    return desk;
  }
  if (previous) {
    desk.bookingStatus = previous.bookingStatus;
    desk.bookingUserName = previous.bookingUserName;
    desk.bookingUserKey = previous.bookingUserKey;
    desk.bookingTenantEmployeeID = previous.bookingTenantEmployeeID;
  }
  return desk;
};

const formatPickerDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isDateNotPast = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate >= today;
};

const getMonthName = (date) => {
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  return months[date.getMonth()];
};

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
  const days = [];
  for (let i = 1; i < adjustedFirstDay; i += 1) {
    days.push(null);
  }
  for (let i = 1; i <= lastDay.getDate(); i += 1) {
    days.push(new Date(year, month, i));
  }
  return days;
};

const renderDatePicker = () => {
  if (!spaceDatePicker) {
    return;
  }
  const currentMonth = bookingState.currentMonth;
  const selectedDate = bookingState.selectedDate;
  const days = getDaysInMonth(currentMonth);

  spaceDatePicker.replaceChildren();

  const header = document.createElement("div");
  header.className = "date-picker-header";

  const prevButton = document.createElement("button");
  prevButton.className = "month-nav-button";
  prevButton.type = "button";
  prevButton.textContent = "‹";
  prevButton.addEventListener("click", () => {
    bookingState.currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    renderDatePicker();
  });

  const title = document.createElement("h2");
  title.textContent = `${getMonthName(currentMonth)} ${currentMonth.getFullYear()}`;

  const nextButton = document.createElement("button");
  nextButton.className = "month-nav-button";
  nextButton.type = "button";
  nextButton.textContent = "›";
  nextButton.addEventListener("click", () => {
    bookingState.currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    renderDatePicker();
  });

  header.appendChild(prevButton);
  header.appendChild(title);
  header.appendChild(nextButton);

  const grid = document.createElement("div");
  grid.className = "date-picker-grid";
  ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach((weekday) => {
    const cell = document.createElement("div");
    cell.className = "weekday-header";
    cell.textContent = weekday;
    grid.appendChild(cell);
  });

  const normalizedSelected = selectedDate ? normalizeBookingDate(selectedDate) : null;

  days.forEach((day, index) => {
    if (!day) {
      const cell = document.createElement("div");
      cell.className = "date-cell empty";
      cell.setAttribute("aria-hidden", "true");
      cell.dataset.index = String(index);
      grid.appendChild(cell);
      return;
    }
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "date-cell";
    const dayFormatted = formatPickerDate(day);
    const isSelected = normalizedSelected === dayFormatted;
    if (isSelected) {
      cell.classList.add("selected");
    }
    if (!isDateNotPast(day)) {
      cell.disabled = true;
    }
    cell.textContent = String(day.getDate());
    cell.addEventListener("click", () => {
      if (!cell.disabled) {
        setBookingSelectedDate(dayFormatted);
      }
    });
    grid.appendChild(cell);
  });

  const footer = document.createElement("div");
  footer.className = "date-picker-footer";
  const todayButton = document.createElement("button");
  todayButton.className = "today-button";
  todayButton.type = "button";
  todayButton.textContent = "Сегодня";
  todayButton.addEventListener("click", () => {
    const today = new Date();
    bookingState.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setBookingSelectedDate(formatPickerDate(today));
  });
  footer.appendChild(todayButton);
  if (spaceBookingsToggleBtn) {
    spaceBookingsToggleBtn.classList.remove("ghost");
    spaceBookingsToggleBtn.classList.add("today-button");
    spaceBookingsToggleBtn.classList.add("bookings-toggle-button");
    footer.appendChild(spaceBookingsToggleBtn);
  }

  if (canManageActiveSpaceResources(getUserInfo())) {
    const adminBookingsBtn = document.createElement("button");
    adminBookingsBtn.type = "button";
    adminBookingsBtn.className = "today-button bookings-toggle-button";
    adminBookingsBtn.textContent = "Бронирования коворкинга";
    adminBookingsBtn.addEventListener("click", () => {
      openAdminBookingsModal();
    });
    footer.appendChild(adminBookingsBtn);
  }

  spaceDatePicker.appendChild(header);
  spaceDatePicker.appendChild(grid);
  spaceDatePicker.appendChild(footer);
};

const setBookingSelectedDate = (date, options = {}) => {
  const { reloadDesks = true } = options;
  const normalized = normalizeBookingDate(date);
  if (!normalized) {
    return;
  }
  clearBookingStatus();
  bookingState.selectedDate = normalized;
  updateSpaceMapDateTitle(normalized);
  const [year, month] = normalized.split("-").map(Number);
  if (
    bookingState.currentMonth.getFullYear() !== year ||
    bookingState.currentMonth.getMonth() !== month - 1
  ) {
    bookingState.currentMonth = new Date(year, month - 1, 1);
  }
  renderDatePicker();
  if (reloadDesks && currentSpace?.id) {
    void loadSpaceDesks(currentSpace.id, { showSnapshotLoading: true });
  }
};

const ensureBookingDate = (options = {}) => {
  if (bookingState.selectedDate) {
    return;
  }
  const today = new Date();
  setBookingSelectedDate(formatPickerDate(today), options);
};

const getMeetingBookingHeaders = () => {
  return {};
};

const meetingBookingStatusManager = createStatusManager(meetingBookingStatus);
const setMeetingBookingStatus = (message, tone) => meetingBookingStatusManager.set(message, tone);
const clearMeetingBookingStatus = () => meetingBookingStatusManager.clear();

const parseMeetingTimeToMinutes = (raw) => {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  let timePart = trimmed;
  if (trimmed.includes(" ")) {
    const pieces = trimmed.split(" ");
    timePart = pieces[pieces.length - 1];
  }
  const match = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
};

const formatMeetingMinutes = (minutes) => {
  const safe = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const formatMeetingDateTime = (date, minutes) => {
  const timePart = formatMeetingMinutes(minutes);
  return `${date} ${timePart}`;
};

const formatOfficeTime = (timezone) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || defaultBuildingTimezone,
    }).format(new Date());
  } catch (error) {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: defaultBuildingTimezone,
    }).format(new Date());
  }
};

const formatOfficeDate = (timezone) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: timezone || defaultBuildingTimezone,
    }).format(new Date());
  } catch (error) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: defaultBuildingTimezone,
    }).format(new Date());
  }
};

const formatOfficeWeekday = (timezone) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      timeZone: timezone || defaultBuildingTimezone,
    }).format(new Date());
  } catch (error) {
    return new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      timeZone: defaultBuildingTimezone,
    }).format(new Date());
  }
};

const getOfficeDateTimeParts = (timezone) => {
  const safeTimezone = timezone || defaultBuildingTimezone;
  try {
    const formatter = new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: safeTimezone,
    });
    const parts = formatter.formatToParts(new Date());
    const values = {};
    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });
    if (!values.year || !values.month || !values.day || !values.hour || !values.minute) {
      return null;
    }
    const hours = Number(values.hour);
    const minutes = Number(values.minute);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      minutes: hours * 60 + minutes,
    };
  } catch (error) {
    return null;
  }
};

const getOfficeDateTimeSnapshot = () => {
  const timezone =
    typeof currentBuilding?.timezone === "string" && currentBuilding.timezone.trim() !== ""
      ? currentBuilding.timezone
      : defaultBuildingTimezone;
  return getOfficeDateTimeParts(timezone) || getOfficeDateTimeParts(defaultBuildingTimezone);
};

const buildMeetingSlots = () => {
  const slots = [];
  for (let hour = meetingSlotStartHour; hour < meetingSlotEndHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += meetingSlotMinutes) {
      slots.push(hour * 60 + minute);
    }
  }
  return slots;
};

const meetingSlotStarts = buildMeetingSlots();

const resetMeetingBookingSelection = () => {
  meetingBookingState.selectedSlotStarts = new Set();
  meetingBookingState.selectedCancelSlotStarts = new Set();
  updateMeetingBookingSelectionSummary();
};

const buildMeetingSlotRanges = (slots) => {
  const ranges = [];
  let rangeStart = null;
  let previous = null;
  slots.forEach((slot) => {
    if (rangeStart === null) {
      rangeStart = slot;
      previous = slot;
      return;
    }
    if (slot === previous + meetingSlotMinutes) {
      previous = slot;
      return;
    }
    ranges.push({
      start: rangeStart,
      end: previous + meetingSlotMinutes,
    });
    rangeStart = slot;
    previous = slot;
  });
  if (rangeStart !== null) {
    ranges.push({
      start: rangeStart,
      end: (previous ?? rangeStart) + meetingSlotMinutes,
    });
  }
  return ranges;
};

const formatMeetingSlotRangesLabel = (slots) =>
  buildMeetingSlotRanges(slots)
    .map((range) => `${formatMeetingMinutes(range.start)}–${formatMeetingMinutes(range.end)}`)
    .join(", ");

const buildMeetingBookingAlertMessage = (space, date, slots, replacedCount = 0) => {
  const meetingName = typeof space?.name === "string" ? space.name.trim() : "";
  const capacityLabel = getPeopleCountLabel(space?.capacity);
  const dateLabel = formatBookingDate(date);
  const timeLabel = formatMeetingSlotRangesLabel(slots);
  const base = meetingName ? `Переговорка "${meetingName}"` : "Переговорка";
  const capacityPart = capacityLabel ? ` на ${capacityLabel}` : "";
  const replacedLine =
    replacedCount > 0
      ? "Предыдущее бронирование на это время отменено."
      : "";
  let whenLine = "";
  if (dateLabel && timeLabel) {
    whenLine = `Дата и время: ${dateLabel}, ${timeLabel}`;
  } else if (dateLabel) {
    whenLine = `Дата: ${dateLabel}`;
  } else if (timeLabel) {
    whenLine = `Время: ${timeLabel}`;
  }
  if (whenLine && replacedLine) {
    return `${base}${capacityPart} забронирована.\n${whenLine}\n${replacedLine}`;
  }
  if (whenLine) {
    return `${base}${capacityPart} забронирована.\n${whenLine}`;
  }
  if (replacedLine) {
    return `${base}${capacityPart} забронирована.\n${replacedLine}`;
  }
  return `${base}${capacityPart} забронирована.`;
};

const updateMeetingBookingSelectionSummary = () => {
  const hasBookingSelection = meetingBookingState.selectedSlotStarts.size > 0;
  const hasCancelSelection = meetingBookingState.selectedCancelSlotStarts.size > 0;
  if (meetingBookingSubmitBtn) {
    meetingBookingSubmitBtn.disabled = !hasBookingSelection;
    meetingBookingSubmitBtn.classList.toggle("is-hidden", hasCancelSelection);
  }
  if (meetingBookingCancelBtn) {
    meetingBookingCancelBtn.disabled = !hasCancelSelection;
    meetingBookingCancelBtn.classList.toggle("is-hidden", !hasCancelSelection);
  }
  if (!meetingBookingSelection) {
    return;
  }
  if (!hasBookingSelection && !hasCancelSelection) {
    meetingBookingSelection.textContent = "Выберите время";
    return;
  }
  if (hasCancelSelection) {
    const slots = Array.from(meetingBookingState.selectedCancelSlotStarts.values()).sort((a, b) => a - b);
    meetingBookingSelection.textContent = `Отмена: ${formatMeetingSlotRangesLabel(slots)}`;
    return;
  }
  const slots = Array.from(meetingBookingState.selectedSlotStarts.values()).sort((a, b) => a - b);
  meetingBookingSelection.textContent = `Бронь: ${formatMeetingSlotRangesLabel(slots)}`;
};

const setMeetingBookingSelectedDate = (date) => {
  const normalized = normalizeBookingDate(date);
  if (!normalized) {
    return;
  }
  clearMeetingBookingStatus();
  meetingBookingState.selectedDate = normalized;
  meetingBookingState.bookings = [];
  const [year, month] = normalized.split("-").map(Number);
  if (
    meetingBookingState.currentMonth.getFullYear() !== year ||
    meetingBookingState.currentMonth.getMonth() !== month - 1
  ) {
    meetingBookingState.currentMonth = new Date(year, month - 1, 1);
  }
  renderMeetingBookingDatePicker();
  resetMeetingBookingSelection();
  renderMeetingTimeSlots();
  if (meetingBookingState.space?.id) {
    void loadMeetingRoomBookings(meetingBookingState.space.id, normalized);
  }
};

const ensureMeetingBookingDate = () => {
  if (meetingBookingState.selectedDate) {
    return;
  }
  const today = new Date();
  setMeetingBookingSelectedDate(formatPickerDate(today));
};

const renderMeetingBookingDatePicker = () => {
  if (!meetingBookingDatePicker) {
    return;
  }
  const currentMonth = meetingBookingState.currentMonth;
  const selectedDate = meetingBookingState.selectedDate;
  const days = getDaysInMonth(currentMonth);

  meetingBookingDatePicker.replaceChildren();

  const header = document.createElement("div");
  header.className = "date-picker-header";

  const prevButton = document.createElement("button");
  prevButton.className = "month-nav-button";
  prevButton.type = "button";
  prevButton.textContent = "‹";
  prevButton.addEventListener("click", () => {
    meetingBookingState.currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    renderMeetingBookingDatePicker();
  });

  const title = document.createElement("h2");
  title.textContent = `${getMonthName(currentMonth)} ${currentMonth.getFullYear()}`;

  const nextButton = document.createElement("button");
  nextButton.className = "month-nav-button";
  nextButton.type = "button";
  nextButton.textContent = "›";
  nextButton.addEventListener("click", () => {
    meetingBookingState.currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    renderMeetingBookingDatePicker();
  });

  header.appendChild(prevButton);
  header.appendChild(title);
  header.appendChild(nextButton);

  const grid = document.createElement("div");
  grid.className = "date-picker-grid";
  ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach((weekday) => {
    const cell = document.createElement("div");
    cell.className = "weekday-header";
    cell.textContent = weekday;
    grid.appendChild(cell);
  });

  const normalizedSelected = selectedDate ? normalizeBookingDate(selectedDate) : null;

  days.forEach((day, index) => {
    if (!day) {
      const cell = document.createElement("div");
      cell.className = "date-cell empty";
      cell.setAttribute("aria-hidden", "true");
      cell.dataset.index = String(index);
      grid.appendChild(cell);
      return;
    }
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "date-cell";
    const dayFormatted = formatPickerDate(day);
    const isSelected = normalizedSelected === dayFormatted;
    if (isSelected) {
      cell.classList.add("selected");
    }
    if (!isDateNotPast(day)) {
      cell.disabled = true;
    }
    cell.textContent = String(day.getDate());
    cell.addEventListener("click", () => {
      if (!cell.disabled) {
        setMeetingBookingSelectedDate(dayFormatted);
      }
    });
    grid.appendChild(cell);
  });

  const footer = document.createElement("div");
  footer.className = "date-picker-footer";
  const todayButton = document.createElement("button");
  todayButton.className = "today-button";
  todayButton.type = "button";
  todayButton.textContent = "Сегодня";
  todayButton.addEventListener("click", () => {
    const today = new Date();
    meetingBookingState.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setMeetingBookingSelectedDate(formatPickerDate(today));
  });
  footer.appendChild(todayButton);

  meetingBookingDatePicker.appendChild(header);
  meetingBookingDatePicker.appendChild(grid);
  meetingBookingDatePicker.appendChild(footer);
};

const meetingSearchStatusManager = createStatusManager(meetingSearchStatus);
const setMeetingSearchStatus = (message, tone) => meetingSearchStatusManager.set(message, tone);
const clearMeetingSearchStatus = () => meetingSearchStatusManager.clear();

const getOfficeTimeLabel = () => {
  const timezone =
    typeof currentBuilding?.timezone === "string" && currentBuilding.timezone.trim() !== ""
      ? currentBuilding.timezone
      : defaultBuildingTimezone;
  return `Время офиса: ${formatOfficeTime(timezone)}, ${formatOfficeWeekday(
    timezone
  )} ${formatOfficeDate(timezone)}`;
};

const updateMeetingSearchOfficeTime = () => {
  if (!meetingSearchOfficeTime) {
    return;
  }
  meetingSearchOfficeTime.textContent = getOfficeTimeLabel();
  if (meetingSearchModal && meetingSearchModal.classList.contains("is-open")) {
    const beforeSize = meetingSearchState.selectedSlotStarts.size;
    ensureMeetingSearchSlots();
    renderMeetingSearchTimeSelectors();
    if (meetingSearchState.selectedSlotStarts.size !== beforeSize) {
      void loadAvailableMeetingRooms();
    }
  }
};

const startMeetingSearchOfficeTimeTicker = () => {
  updateMeetingSearchOfficeTime();
  if (meetingSearchOfficeTimeTimer) {
    clearInterval(meetingSearchOfficeTimeTimer);
  }
  meetingSearchOfficeTimeTimer = setInterval(updateMeetingSearchOfficeTime, 30000);
};

const stopMeetingSearchOfficeTimeTicker = () => {
  if (meetingSearchOfficeTimeTimer) {
    clearInterval(meetingSearchOfficeTimeTimer);
    meetingSearchOfficeTimeTimer = null;
  }
  if (meetingSearchOfficeTime) {
    meetingSearchOfficeTime.textContent = "";
  }
};

const updateMeetingBookingOfficeTime = () => {
  if (!meetingBookingOfficeTime) {
    return;
  }
  meetingBookingOfficeTime.textContent = getOfficeTimeLabel();
  if (meetingBookingModal && meetingBookingModal.classList.contains("is-open")) {
    renderMeetingTimeSlots();
  }
};

const startMeetingBookingOfficeTimeTicker = () => {
  updateMeetingBookingOfficeTime();
  if (meetingBookingOfficeTimeTimer) {
    clearInterval(meetingBookingOfficeTimeTimer);
  }
  meetingBookingOfficeTimeTimer = setInterval(updateMeetingBookingOfficeTime, 30000);
};

const stopMeetingBookingOfficeTimeTicker = () => {
  if (meetingBookingOfficeTimeTimer) {
    clearInterval(meetingBookingOfficeTimeTimer);
    meetingBookingOfficeTimeTimer = null;
  }
  if (meetingBookingOfficeTime) {
    meetingBookingOfficeTime.textContent = "";
  }
};

const ensureMeetingSearchSlots = () => {
  const validSlots = new Set(meetingSlotStarts);
  const selectedDate = meetingSearchState.selectedDate;
  const officeSnapshot = getOfficeDateTimeSnapshot();
  const isOfficeToday = officeSnapshot && selectedDate === officeSnapshot.date;
  const nowMinutes = officeSnapshot?.minutes ?? null;
  meetingSearchState.selectedSlotStarts = new Set(
    Array.from(meetingSearchState.selectedSlotStarts).filter((slot) => {
      if (!validSlots.has(slot)) {
        return false;
      }
      if (!isOfficeToday || nowMinutes === null) {
        return true;
      }
      return slot + meetingSlotMinutes > nowMinutes;
    })
  );
};

const setMeetingSearchSelectedDate = (date) => {
  const normalized = normalizeBookingDate(date);
  if (!normalized) {
    return;
  }
  clearMeetingSearchStatus();
  meetingSearchState.selectedDate = normalized;
  const [year, month] = normalized.split("-").map(Number);
  if (
    meetingSearchState.currentMonth.getFullYear() !== year ||
    meetingSearchState.currentMonth.getMonth() !== month - 1
  ) {
    meetingSearchState.currentMonth = new Date(year, month - 1, 1);
  }
  ensureMeetingSearchSlots();
  renderMeetingSearchDatePicker();
  void loadAvailableMeetingRooms();
};

const renderMeetingSearchDatePicker = () => {
  if (!meetingSearchDatePicker) {
    return;
  }
  const currentMonth = meetingSearchState.currentMonth;
  const selectedDate = meetingSearchState.selectedDate;
  const days = getDaysInMonth(currentMonth);

  meetingSearchDatePicker.replaceChildren();

  const header = document.createElement("div");
  header.className = "date-picker-header";

  const prevButton = document.createElement("button");
  prevButton.className = "month-nav-button";
  prevButton.type = "button";
  prevButton.textContent = "‹";
  prevButton.addEventListener("click", () => {
    meetingSearchState.currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    renderMeetingSearchDatePicker();
  });

  const title = document.createElement("h2");
  title.textContent = `${getMonthName(currentMonth)} ${currentMonth.getFullYear()}`;

  const nextButton = document.createElement("button");
  nextButton.className = "month-nav-button";
  nextButton.type = "button";
  nextButton.textContent = "›";
  nextButton.addEventListener("click", () => {
    meetingSearchState.currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    renderMeetingSearchDatePicker();
  });

  header.appendChild(prevButton);
  header.appendChild(title);
  header.appendChild(nextButton);

  const grid = document.createElement("div");
  grid.className = "date-picker-grid";
  ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach((weekday) => {
    const cell = document.createElement("div");
    cell.className = "weekday-header";
    cell.textContent = weekday;
    grid.appendChild(cell);
  });

  const normalizedSelected = selectedDate ? normalizeBookingDate(selectedDate) : null;

  days.forEach((day, index) => {
    if (!day) {
      const cell = document.createElement("div");
      cell.className = "date-cell empty";
      cell.setAttribute("aria-hidden", "true");
      cell.dataset.index = String(index);
      grid.appendChild(cell);
      return;
    }
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "date-cell";
    const dayFormatted = formatPickerDate(day);
    const isSelected = normalizedSelected === dayFormatted;
    if (isSelected) {
      cell.classList.add("selected");
    }
    if (!isDateNotPast(day)) {
      cell.disabled = true;
    }
    cell.textContent = String(day.getDate());
    cell.addEventListener("click", () => {
      if (!cell.disabled) {
        setMeetingSearchSelectedDate(dayFormatted);
      }
    });
    grid.appendChild(cell);
  });

  const footer = document.createElement("div");
  footer.className = "date-picker-footer";
  const todayButton = document.createElement("button");
  todayButton.className = "today-button";
  todayButton.type = "button";
  todayButton.textContent = "Сегодня";
  todayButton.addEventListener("click", () => {
    const today = new Date();
    meetingSearchState.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setMeetingSearchSelectedDate(formatPickerDate(today));
  });
  footer.appendChild(todayButton);

  meetingSearchDatePicker.appendChild(header);
  meetingSearchDatePicker.appendChild(grid);
  meetingSearchDatePicker.appendChild(footer);
};

const renderMeetingSearchTimeSelectors = () => {
  if (!meetingSearchSlots) {
    return;
  }
  ensureMeetingSearchSlots();
  meetingSearchSlots.replaceChildren();
  const officeSnapshot = getOfficeDateTimeSnapshot();
  const selectedDate = meetingSearchState.selectedDate;
  const isOfficeToday = officeSnapshot && selectedDate === officeSnapshot.date;
  const nowMinutes = officeSnapshot?.minutes ?? null;
  meetingSlotStarts.forEach((startMin) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "meeting-time-slot";
    button.textContent = formatMeetingMinutes(startMin);
    const endMin = startMin + meetingSlotMinutes;
    const isPast = isOfficeToday && nowMinutes !== null && endMin <= nowMinutes;
    if (isPast) {
      button.disabled = true;
    }
    if (meetingSearchState.selectedSlotStarts.has(startMin)) {
      button.classList.add("is-selected");
    }
    button.addEventListener("click", () => {
      const updated = new Set(meetingSearchState.selectedSlotStarts);
      if (updated.has(startMin)) {
        updated.delete(startMin);
      } else {
        updated.add(startMin);
      }
      meetingSearchState.selectedSlotStarts = updated;
      renderMeetingSearchTimeSelectors();
      void loadAvailableMeetingRooms();
    });
    meetingSearchSlots.appendChild(button);
  });
};

const updateMeetingSearchTimeLabel = () => {
  if (meetingSearchResultsTitle) {
    if (meetingSearchState.selectedSlotStarts.size === 0) {
      meetingSearchResultsTitle.textContent = "Свободные переговорки";
    } else {
      const slots = Array.from(meetingSearchState.selectedSlotStarts).sort((a, b) => a - b);
      const label = buildMeetingSlotRanges(slots)
        .map((range) => `${formatMeetingMinutes(range.start)}–${formatMeetingMinutes(range.end)}`)
        .join(", ");
      meetingSearchResultsTitle.textContent = `Свободные переговорки на ${label}`;
    }
  }
  return;
};

const fetchMeetingSearchBookings = async (spaceId, date) => {
  const key = `${spaceId}:${date}`;
  if (meetingSearchState.bookingsCache.has(key)) {
    return meetingSearchState.bookingsCache.get(key) || [];
  }
  const response = await apiRequest(
    `/api/meeting-room-bookings?meeting_room_id=${encodeURIComponent(
      spaceId
    )}&date=${encodeURIComponent(date)}`
  );
  const items = Array.isArray(response?.items) ? response.items : [];
  const bookings = items
    .map((item) => {
      const startMin = parseMeetingTimeToMinutes(item.start_time);
      const endMin = parseMeetingTimeToMinutes(item.end_time);
      if (startMin === null || endMin === null) {
        return null;
      }
      return { startMin, endMin };
    })
    .filter(Boolean);
  meetingSearchState.bookingsCache.set(key, bookings);
  return bookings;
};

const openMeetingBookingFromSearch = (space) => {
  openMeetingBookingModal(space);
  closeMeetingSearchModal();
  if (meetingSearchState.selectedDate) {
    setMeetingBookingSelectedDate(meetingSearchState.selectedDate);
  }
  meetingBookingState.selectedSlotStarts = new Set(meetingSearchState.selectedSlotStarts);
  renderMeetingTimeSlots();
};

const renderMeetingSearchResults = (rooms = []) => {
  if (!meetingSearchList || !meetingSearchEmpty) {
    return;
  }
  meetingSearchList.replaceChildren();
  if (!rooms.length) {
    meetingSearchEmpty.classList.remove("is-hidden");
    return;
  }
  meetingSearchEmpty.classList.add("is-hidden");
  rooms.forEach((room) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "meeting-search-item";

    const main = document.createElement("div");
    main.className = "meeting-search-item-main";

    const title = document.createElement("div");
    title.className = "meeting-search-item-title";
    title.textContent = room.name || "Переговорка";
    main.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meeting-search-item-meta";
    const capacityValue = Number(room?.capacity);
    meta.textContent =
      capacityValue > 0 ? `До ${getPeopleCountLimitLabel(capacityValue)}` : "Вместимость не указана";
    main.appendChild(meta);

    const capacityTag = document.createElement("span");
    capacityTag.className = "space-capacity-tag pill number-pill";
    capacityTag.textContent = capacityValue > 0 ? String(capacityValue) : "—";

    item.appendChild(main);
    item.appendChild(capacityTag);
    item.addEventListener("click", () => openMeetingBookingFromSearch(room));
    meetingSearchList.appendChild(item);
  });
};

const loadAvailableMeetingRooms = async () => {
  if (!meetingSearchList || !meetingSearchEmpty) {
    return;
  }
  const date = meetingSearchState.selectedDate;
  const slots = Array.from(meetingSearchState.selectedSlotStarts);
  const rooms = Array.isArray(currentSpaces)
    ? currentSpaces.filter((space) => space?.kind === "meeting" && space?.id)
    : [];
  updateMeetingSearchTimeLabel();
  if (!date || slots.length === 0) {
    meetingSearchEmpty.textContent = "Выберите дату и время для поиска.";
    renderMeetingSearchResults([]);
    clearMeetingSearchStatus();
    return;
  }
  if (!rooms.length) {
    renderMeetingSearchResults([]);
    setMeetingSearchStatus("На этом этаже нет переговорок.", "info");
    return;
  }
  meetingSearchState.isLoading = true;
  clearMeetingSearchStatus();
  try {
    const results = await Promise.all(
      rooms.map(async (room) => {
        const bookings = await fetchMeetingSearchBookings(room.id, date);
        const isFree = slots.every((slotStart) => {
          const slotEnd = slotStart + meetingSlotMinutes;
          return bookings.every(
            (booking) => slotEnd <= booking.startMin || slotStart >= booking.endMin
          );
        });
        return isFree ? room : null;
      })
    );
    const freeRooms = results.filter(Boolean);
    renderMeetingSearchResults(freeRooms);
    if (!freeRooms.length) {
      meetingSearchEmpty.textContent = "Свободных переговорок нет.";
      clearMeetingSearchStatus();
    }
  } catch (error) {
    renderMeetingSearchResults([]);
    setMeetingSearchStatus(error.message, "error");
  } finally {
    meetingSearchState.isLoading = false;
  }
};

const loadMeetingRoomBookings = async (spaceId, date) => {
  if (!spaceId || !date) {
    return;
  }
  clearMeetingBookingStatus();
  meetingBookingState.isLoading = true;
  try {
    const response = await apiRequest(
      `/api/meeting-room-bookings?meeting_room_id=${encodeURIComponent(
        spaceId
      )}&date=${encodeURIComponent(date)}`
    );
    const items = Array.isArray(response?.items) ? response.items : [];
    meetingBookingState.bookings = items
      .map((item) => {
        const startMin = parseMeetingTimeToMinutes(item.start_time);
        const endMin = parseMeetingTimeToMinutes(item.end_time);
        if (startMin === null || endMin === null) {
          return null;
        }
        return { ...item, startMin, endMin };
      })
      .filter(Boolean);
    renderMeetingTimeSlots();
  } catch (error) {
    setMeetingBookingStatus(error.message, "error");
  } finally {
    meetingBookingState.isLoading = false;
  }
};

const getMeetingSlotStatus = (startMin, endMin) => {
  const { employeeId: currentEmployeeID } = getBookingUserInfo();
  let hasMine = false;
  let hasOther = false;
  meetingBookingState.bookings.forEach((booking) => {
    if (startMin >= booking.endMin || endMin <= booking.startMin) {
      return;
    }
    const bookingEmployeeID = String(
      booking.employee_id || booking.employeeId || booking.employeeID || ""
    ).trim();
    if (currentEmployeeID && bookingEmployeeID && bookingEmployeeID === currentEmployeeID) {
      hasMine = true;
    } else {
      hasOther = true;
    }
  });
  if (hasMine) {
    return "my";
  }
  if (hasOther) {
    return "booked";
  }
  return "free";
};

const isMeetingRangeBooked = (startMin, endMin) => getMeetingSlotStatus(startMin, endMin) !== "free";

const ensureMeetingSlotTooltip = () => {
  if (!meetingBookingTimeSlots) {
    return null;
  }
  if (!meetingSlotTooltipState.element) {
    const tooltip = document.createElement("div");
    tooltip.className = "meeting-slot-tooltip is-hidden";
    meetingBookingTimeSlots.appendChild(tooltip);
    meetingSlotTooltipState.element = tooltip;
  }
  return meetingSlotTooltipState.element;
};

const hideMeetingSlotTooltip = () => {
  const tooltip = ensureMeetingSlotTooltip();
  if (!tooltip) {
    return;
  }
  tooltip.classList.add("is-hidden");
  tooltip.style.left = "";
  tooltip.style.top = "";
  meetingSlotTooltipState.slotStart = null;
};

const getMeetingSlotBooking = (startMin, endMin) => {
  const { employeeId: currentEmployeeID } = getBookingUserInfo();
  for (const booking of meetingBookingState.bookings) {
    if (startMin >= booking.endMin || endMin <= booking.startMin) {
      continue;
    }
    const bookingEmployeeID = String(
      booking.employee_id || booking.employeeId || booking.employeeID || ""
    ).trim();
    if (currentEmployeeID && bookingEmployeeID && bookingEmployeeID === currentEmployeeID) {
      continue;
    }
    return booking;
  }
  return null;
};

const updateMeetingSlotTooltipPosition = (button) => {
  const tooltip = ensureMeetingSlotTooltip();
  if (!tooltip || !meetingBookingTimeSlots) {
    return;
  }
  const containerRect = meetingBookingTimeSlots.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  tooltip.style.left = `${buttonRect.left - containerRect.left + buttonRect.width / 2}px`;
  tooltip.style.top = `${buttonRect.top - containerRect.top}px`;
};

const showMeetingSlotTooltip = (button, booking, startMin) => {
  const tooltip = ensureMeetingSlotTooltip();
  if (!tooltip) {
    return;
  }
  tooltip.replaceChildren();
  const rawName = String(
    booking?.user_name || booking?.userName || booking?.full_name || booking?.fullName || ""
  ).trim();
  const name = formatUserNameInitials(rawName) || rawName;
  const nameEl = document.createElement("span");
  nameEl.className = "meeting-slot-tooltip-name";
  nameEl.textContent = name || "Сотрудник";
  tooltip.appendChild(nameEl);
  const wbBand = String(booking?.wb_band || booking?.wbBand || booking?.wbband || "").trim();
  if (wbBand) {
    const bandLink = document.createElement("a");
    bandLink.className = "meeting-slot-band";
    bandLink.href = `https://band.wb.ru/wb/messages/@${encodeURIComponent(wbBand)}`;
    bandLink.target = "_blank";
    bandLink.rel = "noopener noreferrer";
    bandLink.title = "Написать в WB Band";
    const bandIcon = document.createElement("img");
    bandIcon.src = "/assets/band-logo.png";
    bandIcon.alt = "WB Band";
    bandIcon.className = "meeting-slot-band-icon";
    bandLink.appendChild(bandIcon);
    tooltip.appendChild(bandLink);
  }
  updateMeetingSlotTooltipPosition(button);
  tooltip.classList.remove("is-hidden");
  meetingSlotTooltipState.slotStart = startMin;
};

const renderMeetingTimeSlots = () => {
  if (!meetingBookingTimeSlots) {
    return;
  }
  meetingBookingTimeSlots.replaceChildren();
  meetingSlotTooltipState.element = null;
  meetingSlotTooltipState.slotStart = null;
  const cancelMode = meetingBookingState.selectedCancelSlotStarts.size > 0;
  const validCancelSlots = new Set();
  const validSelectedSlots = new Set();
  const officeSnapshot = getOfficeDateTimeSnapshot();
  const selectedDate = meetingBookingState.selectedDate;
  const isOfficeToday = officeSnapshot && selectedDate === officeSnapshot.date;
  const nowMinutes = officeSnapshot?.minutes ?? null;
  meetingSlotStarts.forEach((startMin) => {
    const endMin = startMin + meetingSlotMinutes;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "meeting-time-slot";
    button.textContent = formatMeetingMinutes(startMin);
    const status = getMeetingSlotStatus(startMin, endMin);
    const isPast = isOfficeToday && nowMinutes !== null && endMin <= nowMinutes;
    if (isPast) {
      button.disabled = true;
    } else if (cancelMode && status !== "my") {
      button.disabled = true;
    }
    if (status === "booked") {
      button.classList.add("is-booked");
    }
    if (status === "my") {
      button.classList.add("is-my");
    }
    if (
      !isPast &&
      !cancelMode &&
      status === "free" &&
      meetingBookingState.selectedSlotStarts.has(startMin)
    ) {
      button.classList.add("is-selected");
      validSelectedSlots.add(startMin);
    }
    if (!isPast && status === "my" && meetingBookingState.selectedCancelSlotStarts.has(startMin)) {
      button.classList.add("is-cancel-selected");
      validCancelSlots.add(startMin);
    }
    button.addEventListener("click", async () => {
      if (isPast) {
        hideMeetingSlotTooltip();
        return;
      }
      if (status === "booked") {
        const booking = getMeetingSlotBooking(startMin, endMin);
        if (meetingSlotTooltipState.slotStart === startMin) {
          hideMeetingSlotTooltip();
          return;
        }
        if (booking) {
          showMeetingSlotTooltip(button, booking, startMin);
        } else {
          hideMeetingSlotTooltip();
        }
        return;
      }
      if (cancelMode && status !== "my") {
        hideMeetingSlotTooltip();
        return;
      }
      clearMeetingBookingStatus();
      hideMeetingSlotTooltip();
      if (status === "my") {
        const updated = new Set(meetingBookingState.selectedCancelSlotStarts);
        if (updated.has(startMin)) {
          updated.delete(startMin);
        } else {
          if (updated.size === 0 && meetingBookingState.selectedSlotStarts.size > 0) {
            meetingBookingState.selectedSlotStarts = new Set();
          }
          updated.add(startMin);
        }
        meetingBookingState.selectedCancelSlotStarts = updated;
      } else {
        if (cancelMode) {
          return;
        }
        const updated = new Set(meetingBookingState.selectedSlotStarts);
        if (updated.has(startMin)) {
          updated.delete(startMin);
        } else {
          updated.add(startMin);
        }
        meetingBookingState.selectedSlotStarts = updated;
      }
      renderMeetingTimeSlots();
    });
    meetingBookingTimeSlots.appendChild(button);
  });
  meetingBookingState.selectedSlotStarts = validSelectedSlots;
  meetingBookingState.selectedCancelSlotStarts = validCancelSlots;
  updateMeetingBookingSelectionSummary();
};

const openMeetingSearchModal = () => {
  if (!meetingSearchModal) {
    return;
  }
  meetingSearchModal.classList.add("is-open");
  meetingSearchModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  clearMeetingSearchStatus();
  startMeetingSearchOfficeTimeTicker();
  if (!meetingSearchState.selectedDate) {
    setMeetingSearchSelectedDate(formatPickerDate(new Date()));
  } else {
    renderMeetingSearchDatePicker();
  }
  renderMeetingSearchTimeSelectors();
  updateMeetingSearchTimeLabel();
  void loadAvailableMeetingRooms();
};

const closeMeetingSearchModal = () => {
  if (!meetingSearchModal) {
    return;
  }
  meetingSearchModal.classList.remove("is-open");
  meetingSearchModal.setAttribute("aria-hidden", "true");
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(responsibilitiesModal && responsibilitiesModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
  clearMeetingSearchStatus();
  stopMeetingSearchOfficeTimeTicker();
};

const openMeetingBookingModal = (space) => {
  if (!meetingBookingModal) {
    return;
  }
  meetingBookingState.space = space || null;
  const meetingName = typeof space?.name === "string" ? space.name.trim() : "";
  if (meetingBookingModalTitle) {
    meetingBookingModalTitle.textContent = meetingName || "Переговорка";
  }
  if (meetingBookingModalSubtitle) {
    const capacityValue = Number(space?.capacity);
    const capacityLabel = getPeopleCountLabel(capacityValue) || "не указано";
    meetingBookingModalSubtitle.textContent = `Переговорная комната на ${capacityLabel}`;
  }
  if (!meetingBookingModal.classList.contains("is-open")) {
    meetingBookingModal.classList.add("is-open");
    meetingBookingModal.setAttribute("aria-hidden", "false");
  }
  document.body.classList.add("modal-open");
  clearMeetingBookingStatus();
  startMeetingBookingOfficeTimeTicker();
  meetingBookingState.bookings = [];
  resetMeetingBookingSelection();
  ensureMeetingBookingDate();
  renderMeetingBookingDatePicker();
  renderMeetingTimeSlots();
  if (meetingBookingState.space?.id && meetingBookingState.selectedDate) {
    void loadMeetingRoomBookings(meetingBookingState.space.id, meetingBookingState.selectedDate);
  }
};

const closeMeetingBookingModal = () => {
  if (!meetingBookingModal) {
    return;
  }
  meetingBookingModal.classList.remove("is-open");
  meetingBookingModal.setAttribute("aria-hidden", "true");
  stopMeetingBookingOfficeTimeTicker();
  hideMeetingSlotTooltip();
  meetingBookingState.space = null;
  resetMeetingBookingSelection();
  meetingSearchState.selectedSlotStarts = new Set();
  updateMeetingSearchTimeLabel();
  renderMeetingSearchTimeSelectors();
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(responsibilitiesModal && responsibilitiesModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
};

const getDeskBookingTitle = (desk) => {
  if (desk.bookingStatus === "booked") {
    const name = desk.bookingUserName || "сотрудник";
    if (canBookForOthers()) {
      return `Занято: ${name}. Нажмите для отмены`;
    }
    return `Занято: ${name}`;
  }
  if (desk.bookingStatus === "my") {
    return "Ваше место";
  }
  return "Свободно. Нажмите для бронирования";
};

const getDeskBookingLabelLine = (desk) => {
  if (desk?.bookingStatus === "booked" || desk?.bookingStatus === "my") {
    const name = typeof desk?.bookingUserName === "string" ? desk.bookingUserName.trim() : "";
    return name || "сотрудник";
  }
  return "";
};

const getDeskLabelLines = (desk) => {
  const label = typeof desk?.label === "string" ? desk.label.trim() : "";
  const bookingLine = getDeskBookingLabelLine(desk);
  if (bookingLine) {
    return label ? [label, bookingLine] : [bookingLine];
  }
  return [label || ""];
};

const setDeskLabelContent = (label, desk) => {
  if (!label) {
    return;
  }
  const lines = getDeskLabelLines(desk);
  label.textContent = "";
  if (lines.length <= 1) {
    label.textContent = lines[0] || "";
    return;
  }
  lines.forEach((line, index) => {
    const tspan = document.createElementNS(svgNamespace, "tspan");
    tspan.setAttribute("x", String(desk.x));
    tspan.setAttribute("dy", index === 0 ? "-0.35em" : "1.2em");
    tspan.textContent = line;
    label.appendChild(tspan);
  });
};

const updateDeskBookingIndicators = (desks = []) => {
  const svg = getSnapshotSvg();
  if (!svg) {
    return false;
  }
  const layer = svg.querySelector("#spaceDesksLayer");
  if (!layer) {
    return false;
  }
  let missingDeskNode = false;
  desks.forEach((desk) => {
    if (!desk?.id) {
      return;
    }
    const deskId = String(desk.id);
    const group = layer.querySelector(`.space-desk[data-desk-id="${deskId}"]`);
    if (!group) {
      missingDeskNode = true;
      return;
    }
    group.classList.toggle("is-booked", desk.bookingStatus === "booked");
    group.classList.toggle("is-my-booking", desk.bookingStatus === "my");
    group.classList.toggle("is-loading", deskBookingActionsInFlight.has(deskId));
    let title = group.querySelector("title");
    if (!title) {
      title = document.createElementNS(svgNamespace, "title");
      group.insertBefore(title, group.firstChild);
    }
    title.textContent = deskBookingActionsInFlight.has(deskId)
      ? "Обновляем бронирование..."
      : getDeskBookingTitle(desk);
    const label = group.querySelector(".space-desk-label");
    if (label) {
      setDeskLabelContent(label, desk);
    }
  });
  return !missingDeskNode;
};

const syncBookingsFromDesks = (desks = []) => {
  const byDesk = new Map();
  desks.forEach((desk) => {
    if (!desk?.id) {
      return;
    }
    const booking = desk?.booking;
    if (!booking?.is_booked) {
      return;
    }
    const user = booking.user || {};
    const userKey = String(user.applier_employee_id || user.employee_id || user.employeeId || user.employeeID || "").trim();
    if (!userKey) {
      return;
    }
    const userName = String(
      user.user_name || user.userName || user.full_name || user.fullName || userKey || ""
    ).trim();
    byDesk.set(String(desk.id), {
      wb_user_id: userKey,
      user_name: formatUserNameInitials(userName),
      tenant_employee_id: String(user.tenant_employee_id || "").trim(),
    });
  });
  bookingState.bookingsByDeskId = byDesk;
};

const applyBookingsToDesks = (bookings = []) => {
  const byDesk = new Map();
  bookings.forEach((booking) => {
    if (booking?.workplace_id) {
      byDesk.set(String(booking.workplace_id), booking);
    }
  });
  bookingState.bookingsByDeskId = byDesk;
  const { employeeId: currentEmployeeID } = getBookingUserInfo();
  currentDesks.forEach((desk) => {
    const booking = byDesk.get(String(desk.id));
    if (!booking) {
      desk.bookingStatus = "free";
      desk.bookingUserName = "";
      desk.bookingUserKey = "";
      desk.bookingTenantEmployeeID = "";
      desk.booking = null;
      return;
    }
    const bookingApplierID = String(booking.applier_employee_id || booking.employee_id || booking.employeeId || "").trim();
    const bookingTenantID = String(booking.tenant_employee_id || "").trim();
    const bookingUserKey = bookingApplierID;
    const bookingUserName = String(booking.user_name || booking.userName || bookingUserKey || "").trim();
    const avatarUrl = String(booking.avatar_url || booking.avatarUrl || "").trim();
    const wbBand = String(booking.wb_band || booking.wbBand || booking.wbband || "").trim();
    desk.bookingUserName = formatUserNameInitials(bookingUserName);
    desk.bookingUserKey = bookingUserKey;
    desk.bookingTenantEmployeeID = bookingTenantID;
    desk.booking = {
      is_booked: true,
      user: {
        wb_user_id: bookingUserKey,
        user_name: bookingUserName,
        applier_employee_id: bookingApplierID,
        tenant_employee_id: bookingTenantID,
        avatar_url: avatarUrl,
        wb_band: wbBand,
      },
    };
    if (currentEmployeeID && bookingUserKey === currentEmployeeID) {
      desk.bookingStatus = "my";
    } else {
      desk.bookingStatus = "booked";
    }
  });
  if (!updateDeskBookingIndicators(currentDesks)) {
    renderSpaceDesks(currentDesks);
  }
};

const refreshDeskBookingOwnership = () => {
  if (!Array.isArray(currentDesks) || currentDesks.length === 0) {
    return;
  }
  let hasUpdates = false;
  currentDesks.forEach((desk) => {
    const previousStatus = desk.bookingStatus;
    applyDeskBookingPayload(desk);
    if (desk.bookingStatus !== previousStatus) {
      hasUpdates = true;
    }
  });
  if (!hasUpdates) {
    return;
  }
  if (!updateDeskBookingIndicators(currentDesks)) {
    renderSpaceDesks(currentDesks);
  }
  renderSpaceDeskList(currentDesks);
  renderSpaceAttendeesList(currentDesks);
};

const loadSpaceBookings = async (spaceId, date) => {
  if (!spaceId || !date) {
    return;
  }
  clearBookingStatus();
  bookingState.isLoading = true;
  try {
    const response = await apiRequest(
      `/api/bookings?space_id=${encodeURIComponent(spaceId)}&date=${encodeURIComponent(date)}`
    );
    const items = Array.isArray(response?.items) ? response.items : [];
    applyBookingsToDesks(items);
  } catch (error) {
    setBookingStatus(error.message, "error");
  } finally {
    bookingState.isLoading = false;
  }
};

const loadMyBookings = async () => {
  if (!spaceBookingsList || !spaceBookingsEmpty) {
    return;
  }
  const headers = getBookingHeaders();
  const shouldKeepRenderedList =
    bookingState.myBookings.length > 0 && spaceBookingsList.childElementCount > 0;
  const previousFingerprint = shouldKeepRenderedList
    ? JSON.stringify(bookingState.myBookings)
    : "";
  bookingState.isMyBookingsLoading = true;
  if (!shouldKeepRenderedList) {
    renderBookingsList();
  }
  try {
    const response = await apiRequest("/api/bookings/me", { headers });
    const bookings = Array.isArray(response?.bookings) ? response.bookings : [];
    bookingState.myBookings = bookings;
  } catch (error) {
    setBookingStatus(error.message, "error");
  } finally {
    bookingState.isMyBookingsLoading = false;
    if (
      !shouldKeepRenderedList ||
      previousFingerprint !== JSON.stringify(bookingState.myBookings)
    ) {
      renderBookingsList();
    }
  }
};

const renderBookingsSkeleton = (listElement) => {
  if (!listElement) {
    return;
  }
  listElement.replaceChildren();
  for (let index = 0; index < 6; index += 1) {
    const item = document.createElement("div");
    item.className = "space-booking-item space-booking-item-skeleton";

    const info = document.createElement("div");
    info.className = "space-booking-info";

    const titleLine = document.createElement("div");
    titleLine.className = "space-booking-skeleton-line is-title";
    const metaLine = document.createElement("div");
    metaLine.className = "space-booking-skeleton-line";
    const accentLine = document.createElement("div");
    accentLine.className = "space-booking-skeleton-line is-accent";

    info.appendChild(titleLine);
    info.appendChild(metaLine);
    info.appendChild(accentLine);

    const action = document.createElement("div");
    action.className = "space-booking-skeleton-action";

    item.appendChild(info);
    item.appendChild(action);
    listElement.appendChild(item);
  }
};

const renderBookingsList = () => {
  if (!spaceBookingsList || !spaceBookingsEmpty) {
    return;
  }
  if (bookingState.isMyBookingsLoading) {
    renderBookingsSkeleton(spaceBookingsList);
    spaceBookingsEmpty.classList.add("is-hidden");
    if (spaceBookingsCancelAllBtn) {
      spaceBookingsCancelAllBtn.classList.add("is-hidden");
    }
    return;
  }
  spaceBookingsList.replaceChildren();
  if (!bookingState.myBookings || bookingState.myBookings.length === 0) {
    spaceBookingsEmpty.classList.remove("is-hidden");
    if (spaceBookingsCancelAllBtn) {
      spaceBookingsCancelAllBtn.classList.add("is-hidden");
    }
    return;
  }
  spaceBookingsEmpty.classList.add("is-hidden");
  if (spaceBookingsCancelAllBtn) {
    spaceBookingsCancelAllBtn.classList.remove("is-hidden");
  }
  const sortedBookings = [...bookingState.myBookings].sort((a, b) => {
    const aDate = normalizeBookingDate(a?.date);
    const bDate = normalizeBookingDate(b?.date);
    if (!aDate && !bDate) {
      return 0;
    }
    if (!aDate) {
      return 1;
    }
    if (!bDate) {
      return -1;
    }
    return aDate.localeCompare(bDate);
  });
  sortedBookings.forEach((booking) => {
    const item = document.createElement("div");
    item.className = "space-booking-item";
    item.tabIndex = 0;
    const info = document.createElement("div");
    info.className = "space-booking-info";
    const date = document.createElement("div");
    date.className = "space-booking-date";
    date.textContent = `${formatBookingWeekday(booking.date)} ${formatBookingDate(booking.date)}`;

    const pathParts = [];
    if (booking.building_name) {
      pathParts.push(booking.building_name);
    }
    if (booking.floor_level != null) {
      pathParts.push(`Этаж ${booking.floor_level}`);
    }
    if (booking.subdivision_level_1) {
      pathParts.push(booking.subdivision_level_1);
    }
    if (booking.subdivision_level_2) {
      pathParts.push(booking.subdivision_level_2);
    }
    const spaceLabel =
      booking?.space_name || (booking?.space_id ? `Пространство ${booking.space_id}` : "");
    if (spaceLabel) {
      pathParts.push(spaceLabel);
    }

    const locationEl = document.createElement("div");
    locationEl.className = "space-booking-location";
    locationEl.textContent = pathParts.join(" · ");

    const desk = document.createElement("div");
    desk.className = "space-booking-desk";
    desk.textContent = booking.desk_label || `Стол ${booking.workplace_id}`;
    info.appendChild(date);
    if (pathParts.length > 0) {
      info.appendChild(locationEl);
    }
    info.appendChild(desk);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "space-booking-cancel";
    cancelBtn.textContent = "Отменить";
    cancelBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void handleCancelBooking(booking);
    });

    const bookingSpaceId = Number(booking?.space_id);
    const bookingBuildingId = Number(booking?.building_id);
    attachRoutePrefetchHandlers(item, () => {
      prefetchSpaceRouteData({
        buildingId: bookingBuildingId,
        floorId: Number(booking?.floor_id),
        spaceId: bookingSpaceId,
        date: normalizeBookingDate(booking?.date),
      });
    });

    item.addEventListener("click", () => {
      const normalizedDate = normalizeBookingDate(booking?.date);
      const bookingFloorLevel = Number(booking?.floor_level);
      if (
        Number.isFinite(bookingSpaceId) &&
        Number.isFinite(bookingBuildingId) &&
        Number.isFinite(bookingFloorLevel) &&
        (!currentSpace || Number(currentSpace.id) !== bookingSpaceId)
      ) {
        const query = isValidBookingDate(normalizedDate)
          ? `?date=${encodeURIComponent(normalizedDate)}`
          : "";
        void navigateTo(
          `/buildings/${encodeURIComponent(bookingBuildingId)}/floors/${encodeURIComponent(
            bookingFloorLevel
          )}/spaces/${encodeURIComponent(bookingSpaceId)}${query}`
        );
        return;
      }
      if (isValidBookingDate(normalizedDate)) {
        setBookingSelectedDate(normalizedDate);
        closeBookingsModal();
      }
    });

    item.appendChild(info);
    item.appendChild(cancelBtn);
    spaceBookingsList.appendChild(item);
  });
};

const loadMyMeetingBookings = async () => {
  if (!meetingBookingsList || !meetingBookingsEmpty) {
    return;
  }
  const headers = getBookingHeaders();
  const shouldKeepRenderedList =
    bookingState.myMeetingBookings.length > 0 && meetingBookingsList.childElementCount > 0;
  const previousFingerprint = shouldKeepRenderedList
    ? JSON.stringify(bookingState.myMeetingBookings)
    : "";
  bookingState.isMyMeetingBookingsLoading = true;
  if (!shouldKeepRenderedList) {
    renderMeetingBookingsList();
  }
  try {
    const response = await apiRequest("/api/meeting-room-bookings/me", { headers });
    const bookings = Array.isArray(response?.bookings) ? response.bookings : [];
    bookingState.myMeetingBookings = bookings;
  } catch (error) {
    setBookingStatus(error.message, "error");
  } finally {
    bookingState.isMyMeetingBookingsLoading = false;
    if (
      !shouldKeepRenderedList ||
      previousFingerprint !== JSON.stringify(bookingState.myMeetingBookings)
    ) {
      renderMeetingBookingsList();
    }
  }
};

const formatMeetingBookingTime = (raw) => {
  if (!raw) {
    return "";
  }
  const parts = String(raw).trim().split(" ");
  if (parts.length < 2) {
    return raw;
  }
  return parts[1];
};

const formatMeetingBookingDate = (raw) => {
  if (!raw) {
    return "";
  }
  const datePart = String(raw).trim().split(" ")[0];
  return formatBookingDate(datePart);
};

const formatMeetingBookingWeekday = (raw) => {
  if (!raw) {
    return "";
  }
  const datePart = String(raw).trim().split(" ")[0];
  return formatBookingWeekday(datePart);
};

const renderMeetingBookingsList = () => {
  if (!meetingBookingsList || !meetingBookingsEmpty) {
    return;
  }
  if (bookingState.isMyMeetingBookingsLoading) {
    renderBookingsSkeleton(meetingBookingsList);
    meetingBookingsEmpty.classList.add("is-hidden");
    if (spaceBookingsCancelAllBtn) {
      spaceBookingsCancelAllBtn.classList.add("is-hidden");
    }
    return;
  }
  meetingBookingsList.replaceChildren();
  if (!bookingState.myMeetingBookings || bookingState.myMeetingBookings.length === 0) {
    meetingBookingsEmpty.classList.remove("is-hidden");
    if (spaceBookingsCancelAllBtn) {
      spaceBookingsCancelAllBtn.classList.add("is-hidden");
    }
    return;
  }
  meetingBookingsEmpty.classList.add("is-hidden");
  if (spaceBookingsCancelAllBtn) {
    spaceBookingsCancelAllBtn.classList.remove("is-hidden");
  }
  const sorted = [...bookingState.myMeetingBookings].sort((a, b) => {
    const aTime = a?.start_time || "";
    const bTime = b?.start_time || "";
    return aTime.localeCompare(bTime);
  });
  sorted.forEach((booking) => {
    const item = document.createElement("div");
    item.className = "space-booking-item";
    item.tabIndex = 0;
    const info = document.createElement("div");
    info.className = "space-booking-info";
    const date = document.createElement("div");
    date.className = "space-booking-date";
    const weekday = formatMeetingBookingWeekday(booking.start_time);
    const dateStr = formatMeetingBookingDate(booking.start_time);
    date.textContent = weekday ? `${weekday} ${dateStr}` : dateStr;
    const startT = formatMeetingBookingTime(booking.start_time);
    const endT = formatMeetingBookingTime(booking.end_time);
    const timeRange = document.createElement("div");
    timeRange.className = "space-booking-space";
    timeRange.textContent = startT && endT ? `${startT} – ${endT}` : "";

    const meetingPathParts = [];
    if (booking.building_name) {
      meetingPathParts.push(booking.building_name);
    }
    if (booking.floor_level != null) {
      meetingPathParts.push(`Этаж ${booking.floor_level}`);
    }

    const meetingLocationEl = document.createElement("div");
    meetingLocationEl.className = "space-booking-location";
    meetingLocationEl.textContent = meetingPathParts.join(" · ");

    const roomEl = document.createElement("div");
    roomEl.className = "space-booking-desk";
    roomEl.textContent = booking.meeting_room_name || `Переговорка ${booking.meeting_room_id}`;

    info.appendChild(date);
    if (timeRange.textContent) {
      info.appendChild(timeRange);
    }
    if (meetingPathParts.length > 0) {
      info.appendChild(meetingLocationEl);
    }
    info.appendChild(roomEl);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "space-booking-cancel";
    cancelBtn.textContent = "Отменить";
    cancelBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void handleCancelMyMeetingBooking(booking);
    });

    item.addEventListener("click", () => {
      const datePart = String(booking.start_time || "").trim().split(" ")[0];
      const space = {
        id: Number(booking.meeting_room_id),
        name: booking.meeting_room_name || "Переговорка",
        kind: "meeting",
      };
      closeBookingsModal();
      openMeetingBookingModal(space);
      if (isValidBookingDate(datePart)) {
        setMeetingBookingSelectedDate(datePart);
      }
    });

    item.appendChild(info);
    item.appendChild(cancelBtn);
    meetingBookingsList.appendChild(item);
  });
};

const handleCancelMyMeetingBooking = async (booking) => {
  const headers = getBookingHeaders();
  const roomName = booking.meeting_room_name || "переговорка";
  const startT = formatMeetingBookingTime(booking.start_time);
  const endT = formatMeetingBookingTime(booking.end_time);
  const dateStr = formatMeetingBookingDate(booking.start_time);
  const confirmed = window.confirm(
    `Вы уверены, что хотите отменить бронирование "${roomName}" на ${dateStr} ${startT}–${endT}?`
  );
  if (!confirmed) {
    return;
  }
  try {
    await apiRequest("/api/meeting-room-bookings", {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        meeting_room_id: Number(booking.meeting_room_id),
        start_time: booking.start_time,
        end_time: booking.end_time,
      }),
    });
    await loadMyMeetingBookings();
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const handleCancelAllMyMeetingBookings = async () => {
  const headers = getBookingHeaders();
  const confirmed = window.confirm(
    "Вы уверены, что хотите отменить все ваши бронирования переговорок?"
  );
  if (!confirmed) {
    return;
  }
  try {
    await apiRequest("/api/meeting-room-bookings/all", { method: "DELETE", headers });
    bookingState.myMeetingBookings = [];
    renderMeetingBookingsList();
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const switchBookingsTab = (tab) => {
  bookingState.activeBookingsTab = tab;
  if (bookingsTabCoworking) {
    bookingsTabCoworking.classList.toggle("is-active", tab === "coworking");
    bookingsTabCoworking.setAttribute("aria-selected", tab === "coworking" ? "true" : "false");
  }
  if (bookingsTabMeeting) {
    bookingsTabMeeting.classList.toggle("is-active", tab === "meeting");
    bookingsTabMeeting.setAttribute("aria-selected", tab === "meeting" ? "true" : "false");
  }
  if (spaceBookingsSection) {
    spaceBookingsSection.classList.toggle("is-hidden", tab !== "coworking");
    spaceBookingsSection.setAttribute("aria-hidden", tab !== "coworking" ? "true" : "false");
  }
  if (meetingBookingsSection) {
    meetingBookingsSection.classList.toggle("is-hidden", tab !== "meeting");
    meetingBookingsSection.setAttribute("aria-hidden", tab !== "meeting" ? "true" : "false");
  }
  if (tab === "coworking") {
    void loadMyBookings();
  } else {
    void loadMyMeetingBookings();
  }
};

const getDeskBookingWbBand = (desk) => {
  const user = desk?.booking?.user || {};
  const raw = user.wb_band || user.wbBand || user.wbband || "";
  return String(raw).trim();
};

const getDeskBookingDisplayName = (desk) => {
  const user = desk?.booking?.user || {};
  const rawName = String(
    user.user_name ||
      user.userName ||
      user.full_name ||
      user.fullName ||
      desk.bookingUserName ||
      ""
  ).trim();
  return formatUserNameInitials(rawName) || desk.bookingUserName || "Сотрудник";
};

const getDeskBookingAvatarUrl = (desk) => {
  const user = desk?.booking?.user || {};
  const raw = user.avatar_url || user.avatarUrl || "";
  return String(raw).trim();
};

const getAttendeeInitials = (name) => {
  if (typeof name !== "string") {
    return "?";
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase() || "?";
  }
  const first = parts[0][0]?.toUpperCase() || "";
  const second = parts[1][0]?.toUpperCase() || "";
  return `${first}${second}` || "?";
};

const collectSpaceAttendees = (desks = [], currentEmployeeID = "") => {
  const list = Array.isArray(desks) ? desks : [];
  const normalizedCurrentUserKey = String(currentEmployeeID || "").trim();
  const attendeesMap = new Map();
  list.forEach((desk) => {
    if (!desk || (desk.bookingStatus !== "booked" && desk.bookingStatus !== "my")) {
      return;
    }
    if (desk.bookingStatus === "my") {
      return;
    }
    const wbBand = getDeskBookingWbBand(desk);
    const userKey = String(desk.bookingUserKey || "").trim();
    if (normalizedCurrentUserKey && userKey && userKey === normalizedCurrentUserKey) {
      return;
    }
    const name = getDeskBookingDisplayName(desk);
    const rawDeskLabel = typeof desk?.label === "string" ? desk.label.trim() : "";
    const deskLabel = rawDeskLabel || (desk?.id ? `Стол ${desk.id}` : "Стол");
    const deskId = desk?.id ? String(desk.id) : "";
    const key = deskId
      ? `desk:${deskId}`
      : `desk-label:${deskLabel}:${userKey || name || wbBand || "unknown"}`;
    if (attendeesMap.has(key)) {
      return;
    }
    const avatarUrl = getDeskBookingAvatarUrl(desk);
    attendeesMap.set(key, {
      key,
      name,
      deskLabel,
      wbBand,
      avatarUrl,
      deskId,
      userKey,
    });
  });
  return Array.from(attendeesMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
};

const buildAttendeeAvatarUrl = (avatarUrl, cacheKey) => {
  const trimmed = String(avatarUrl || "").trim();
  if (!trimmed || !cacheKey) {
    return trimmed;
  }
  if (trimmed.includes("?") || trimmed.includes("#")) {
    return trimmed;
  }
  return `${trimmed}?v=${encodeURIComponent(cacheKey)}`;
};

const hasCurrentUserBookingInSpace = (desks = [], currentEmployeeID = "") => {
  const list = Array.isArray(desks) ? desks : [];
  const normalizedCurrentUserKey = String(currentEmployeeID || "").trim();
  return list.some((desk) => {
    if (!desk) {
      return false;
    }
    if (desk.bookingStatus === "my") {
      return true;
    }
    if (!normalizedCurrentUserKey) {
      return false;
    }
    const userKey = String(desk.bookingUserKey || "").trim();
    return desk.bookingStatus === "booked" && userKey && userKey === normalizedCurrentUserKey;
  });
};

const clearAttendeeListDeskHover = () => {
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  svg.querySelectorAll(".space-desk.is-list-hover").forEach((group) => {
    group.classList.remove("is-list-hover");
  });
};

const setAttendeeDeskHover = (deskId, isHovered) => {
  const normalizedId = String(deskId || "").trim();
  if (!normalizedId) {
    return;
  }
  const svg = getSnapshotSvg();
  if (!svg) {
    return;
  }
  const group = svg.querySelector(`.space-desk[data-desk-id="${normalizedId}"]`);
  if (!group) {
    return;
  }
  group.classList.toggle("is-list-hover", Boolean(isHovered));
};

const renderSpaceAttendeesList = (desks = []) => {
  if (!spaceAttendeesList || !spaceAttendeesEmpty) {
    return;
  }
  clearAttendeeListDeskHover();
  spaceAttendeesList.replaceChildren();
  const { employeeId: currentEmployeeID } = getBookingUserInfo();
  const attendees = collectSpaceAttendees(desks, currentEmployeeID);
  if (attendees.length === 0) {
    const hasCurrentUserBooking = hasCurrentUserBookingInSpace(desks, currentEmployeeID);
    spaceAttendeesEmpty.textContent = hasCurrentUserBooking
      ? "Никто кроме тебя еще не забронировал место на эту дату🥲"
      : "Никто еще не забронировал место на эту дату";
    spaceAttendeesEmpty.classList.remove("is-hidden");
    return;
  }
  spaceAttendeesEmpty.classList.add("is-hidden");
  attendees.forEach((attendee) => {
    const item = document.createElement("div");
    item.className = "space-attendee-item";

    const main = document.createElement("div");
    main.className = "space-attendee-main";

    const avatar = document.createElement("div");
    avatar.className = "space-attendee-avatar";
    const avatarUrl = buildAttendeeAvatarUrl(
      attendee.avatarUrl,
      attendee.userKey || attendee.deskId || attendee.key
    );
    if (avatarUrl) {
      const avatarImg = document.createElement("img");
      avatarImg.alt = attendee.name;
      avatarImg.loading = "lazy";
      avatarImg.src = avatarUrl;
      avatar.appendChild(avatarImg);
    } else {
      avatar.textContent = getAttendeeInitials(attendee.name);
      avatar.setAttribute("aria-hidden", "true");
      avatar.classList.add("is-fallback");
    }

    const info = document.createElement("div");
    info.className = "space-attendee-info";

    const name = document.createElement("div");
    name.className = "space-attendee-name";
    name.textContent = attendee.name;

    const deskLabel = document.createElement("div");
    deskLabel.className = "space-attendee-desk";
    deskLabel.textContent = attendee.deskLabel;

    info.appendChild(name);
    info.appendChild(deskLabel);
    main.appendChild(avatar);
    main.appendChild(info);
    item.appendChild(main);
    if (attendee.deskId) {
      item.addEventListener("mouseenter", () => setAttendeeDeskHover(attendee.deskId, true));
      item.addEventListener("mouseleave", () => setAttendeeDeskHover(attendee.deskId, false));
    }

    if (attendee.wbBand) {
      const bandLink = document.createElement("a");
      bandLink.className = "space-attendee-band";
      bandLink.href = `https://band.wb.ru/wb/messages/@${encodeURIComponent(attendee.wbBand)}`;
      bandLink.target = "_blank";
      bandLink.rel = "noopener noreferrer";
      bandLink.title = "Написать в WB Band";
      const bandIcon = document.createElement("img");
      bandIcon.src = "/assets/band-logo.png";
      bandIcon.alt = "WB Band";
      bandIcon.className = "space-attendee-band-icon";
      bandLink.appendChild(bandIcon);
      item.appendChild(bandLink);
    }

    spaceAttendeesList.appendChild(item);
  });
};

const openBookingsModal = () => {
  if (!spaceBookingsModal) {
    return;
  }
  bookingState.isListOpen = true;
  spaceBookingsModal.classList.add("is-open");
  spaceBookingsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const baseTitle = "Мои бронирования";
  if (spaceBookingsModalTitle) {
    spaceBookingsModalTitle.textContent = baseTitle;
  }
  if (spaceBookingsToggleBtn) {
    spaceBookingsToggleBtn.textContent = baseTitle;
  }
  switchBookingsTab(bookingState.activeBookingsTab || "coworking");
};

const closeBookingsModal = () => {
  if (!spaceBookingsModal) {
    return;
  }
  bookingState.isListOpen = false;
  spaceBookingsModal.classList.remove("is-open");
  spaceBookingsModal.setAttribute("aria-hidden", "true");
  if (spaceBookingsSection) {
    spaceBookingsSection.classList.add("is-hidden");
    spaceBookingsSection.setAttribute("aria-hidden", "true");
  }
  if (meetingBookingsSection) {
    meetingBookingsSection.classList.add("is-hidden");
    meetingBookingsSection.setAttribute("aria-hidden", "true");
  }
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open")) &&
    !(adminBookingsModal && adminBookingsModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
};

const toggleBookingsList = () => {
  if (!spaceBookingsModal || !spaceBookingsToggleBtn) {
    return;
  }
  if (bookingState.isListOpen) {
    closeBookingsModal();
    return;
  }
  openBookingsModal();
};

const handleCancelBooking = async (booking) => {
  const headers = getBookingHeaders();
  const confirmed = window.confirm(
    `Вы уверены, что хотите отменить бронирование стола "${
      booking.desk_label || "стол"
    }" на ${formatBookingDate(booking.date)}?`
  );
  if (!confirmed) {
    return;
  }
  try {
    await apiRequest("/api/bookings", {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        date: normalizeBookingDate(booking.date),
        workplace_id: Number(booking.workplace_id),
      }),
    });
    await loadMyBookings();
    if (currentSpace?.id && bookingState.selectedDate) {
      void loadSpaceDesks(currentSpace.id);
    }
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const handleCancelAllBookings = async () => {
  const headers = getBookingHeaders();
  const confirmed = window.confirm("Вы уверены, что хотите отменить все ваши бронирования?");
  if (!confirmed) {
    return;
  }
  try {
    await apiRequest("/api/bookings/all", { method: "DELETE", headers });
    bookingState.myBookings = [];
    renderBookingsList();
    if (currentSpace?.id && bookingState.selectedDate) {
      void loadSpaceDesks(currentSpace.id);
    }
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const openAdminBookingsModal = () => {
  if (!adminBookingsModal) {
    return;
  }
  bookingState.isAdminBookingsOpen = true;
  adminBookingsModal.classList.add("is-open");
  adminBookingsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (adminBookingsModalTitle) {
    const spaceName = currentSpace?.name || "";
    adminBookingsModalTitle.textContent = spaceName
      ? `Бронирования коворкинга — ${spaceName}`
      : "Бронирования коворкинга";
  }
  void loadAdminBookings();
};

const closeAdminBookingsModal = () => {
  if (!adminBookingsModal) {
    return;
  }
  bookingState.isAdminBookingsOpen = false;
  adminBookingsModal.classList.remove("is-open");
  adminBookingsModal.setAttribute("aria-hidden", "true");
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
};

const loadAdminBookings = async () => {
  if (!adminBookingsList || !adminBookingsEmpty) {
    return;
  }
  const spaceId = currentSpace?.id;
  if (!spaceId) {
    return;
  }
  const headers = getBookingHeaders();
  try {
    const response = await apiRequest(
      `/api/bookings/space-bookings?space_id=${encodeURIComponent(spaceId)}`,
      { headers }
    );
    const bookings = Array.isArray(response?.bookings) ? response.bookings : [];
    bookingState.adminBookings = bookings;
    renderAdminBookingsList();
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const renderAdminBookingsList = () => {
  if (!adminBookingsList || !adminBookingsEmpty) {
    return;
  }
  adminBookingsList.replaceChildren();
  if (!bookingState.adminBookings || bookingState.adminBookings.length === 0) {
    adminBookingsEmpty.classList.remove("is-hidden");
    if (adminBookingsCancelAllBtn) {
      adminBookingsCancelAllBtn.classList.add("is-hidden");
    }
    return;
  }
  adminBookingsEmpty.classList.add("is-hidden");
  if (adminBookingsCancelAllBtn) {
    adminBookingsCancelAllBtn.classList.remove("is-hidden");
  }

  const table = document.createElement("table");
  table.className = "admin-bookings-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headers = ["Дата бронирования", "Кому забронирован", "Кто забронировал", ""];
  headers.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const sortedBookings = [...bookingState.adminBookings].sort((a, b) => {
    const aDate = normalizeBookingDate(a?.date);
    const bDate = normalizeBookingDate(b?.date);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });

  sortedBookings.forEach((booking) => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    row.addEventListener("click", (e) => {
      if (e.target.closest(".admin-booking-cancel-btn")) {
        return;
      }
      const normalized = normalizeBookingDate(booking.date);
      if (normalized) {
        closeAdminBookingsModal();
        setBookingSelectedDate(normalized);
      }
    });

    const dateCell = document.createElement("td");
    dateCell.textContent = formatBookingDate(booking.date);
    row.appendChild(dateCell);

    const applierCell = document.createElement("td");
    const isGuest = String(booking.applier_employee_id || "").trim() === "0";
    if (isGuest) {
      applierCell.textContent = "Гость";
    } else {
      const name = (booking.user_name || "").trim();
      const eid = (booking.applier_employee_id || "").trim();
      if (name && eid) {
        applierCell.textContent = `${name} (${eid})`;
      } else if (name) {
        applierCell.textContent = name;
      } else if (eid) {
        applierCell.textContent = eid;
      } else {
        applierCell.textContent = "—";
      }
    }
    row.appendChild(applierCell);

    const tenantCell = document.createElement("td");
    const tenantName = (booking.tenant_user_name || "").trim();
    const tenantEid = (booking.tenant_employee_id || "").trim();
    if (tenantName && tenantEid) {
      tenantCell.textContent = `${tenantName} (${tenantEid})`;
    } else if (tenantName) {
      tenantCell.textContent = tenantName;
    } else if (tenantEid) {
      tenantCell.textContent = tenantEid;
    } else {
      tenantCell.textContent = "—";
    }
    row.appendChild(tenantCell);

    const cancelCell = document.createElement("td");
    cancelCell.className = "admin-booking-cancel-cell";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "admin-booking-cancel-btn";
    cancelBtn.textContent = "Отменить";
    cancelBtn.addEventListener("click", () => {
      void handleCancelAdminBooking(booking);
    });
    cancelCell.appendChild(cancelBtn);
    row.appendChild(cancelCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  adminBookingsList.appendChild(table);
};

const handleCancelAdminBooking = async (booking) => {
  const confirmed = window.confirm(
    `Отменить бронирование на ${formatBookingDate(booking.date)} (${booking.user_name || booking.applier_employee_id || "сотрудник"})?`
  );
  if (!confirmed) {
    return;
  }
  const headers = getBookingHeaders();
  try {
    await apiRequest("/api/bookings", {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        date: normalizeBookingDate(booking.date),
        workplace_id: Number(booking.workplace_id),
      }),
    });
    await loadAdminBookings();
    if (currentSpace?.id && bookingState.selectedDate) {
      void loadSpaceDesks(currentSpace.id);
    }
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const handleCancelAllAdminBookings = async () => {
  const confirmed = window.confirm("Вы уверены, что хотите отменить все бронирования этого коворкинга?");
  if (!confirmed) {
    return;
  }
  const spaceId = currentSpace?.id;
  if (!spaceId) {
    return;
  }
  const headers = getBookingHeaders();
  try {
    await apiRequest(
      `/api/bookings/space-bookings-all?space_id=${encodeURIComponent(spaceId)}`,
      { method: "DELETE", headers }
    );
    bookingState.adminBookings = [];
    renderAdminBookingsList();
    if (currentSpace?.id && bookingState.selectedDate) {
      void loadSpaceDesks(currentSpace.id);
    }
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const refreshSpaceAfterDeskBookingMutation = () => {
  if (currentSpace?.id) {
    void loadSpaceDesks(currentSpace.id);
  }
  if (bookingState.isListOpen) {
    void loadMyBookings();
  }
};

const isBookingAlreadyCancelledError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("не найден") ||
    message.includes("не существует")
  );
};

const markDeskAsFreeLocally = (deskId) => {
  const desk = findDeskById(deskId);
  if (!desk) {
    return;
  }
  desk.bookingStatus = "free";
  desk.bookingUserName = "";
  desk.bookingUserKey = "";
  desk.bookingTenantEmployeeID = "";
  desk.booking = null;
  if (bookingState.bookingsByDeskId instanceof Map) {
    bookingState.bookingsByDeskId.delete(String(desk.id));
  }
  refreshDeskCollectionsView();
};

const markDeskAsMyLocally = (deskId) => {
  const { key, name, employeeId } = getBookingUserInfo();
  currentDesks.forEach((item) => {
    if (item?.bookingStatus === "my") {
      item.bookingStatus = "free";
      item.bookingUserName = "";
      item.bookingUserKey = "";
      item.bookingTenantEmployeeID = "";
      item.booking = null;
      if (bookingState.bookingsByDeskId instanceof Map) {
        bookingState.bookingsByDeskId.delete(String(item.id));
      }
    }
  });
  const desk = findDeskById(deskId);
  if (!desk) {
    refreshDeskCollectionsView();
    return;
  }
  desk.bookingStatus = "my";
  desk.bookingUserName = formatUserNameInitials(name || key || "Вы");
  desk.bookingUserKey = key;
  desk.bookingTenantEmployeeID = employeeId;
  desk.booking = {
    is_booked: true,
    user: {
      wb_user_id: key,
      user_name: name || key || "Вы",
      applier_employee_id: key,
      tenant_employee_id: employeeId,
    },
  };
  if (!(bookingState.bookingsByDeskId instanceof Map)) {
    bookingState.bookingsByDeskId = new Map();
  }
  bookingState.bookingsByDeskId.set(String(desk.id), {
    workplace_id: Number(desk.id),
    applier_employee_id: key,
    tenant_employee_id: employeeId,
    user_name: name || key || "Вы",
  });
  refreshDeskCollectionsView();
};

const markDeskAsBookedLocally = (deskId, { userName = "Сотрудник", userKey = "" } = {}) => {
  const normalizedUserName = String(userName || "").trim() || "Сотрудник";
  const normalizedUserKey = String(userKey || "").trim();
  const desk = findDeskById(deskId);
  if (!desk) {
    refreshDeskCollectionsView();
    return;
  }
  desk.bookingStatus = "booked";
  desk.bookingUserName = formatUserNameInitials(normalizedUserName);
  desk.bookingUserKey = normalizedUserKey;
  desk.bookingTenantEmployeeID = normalizedUserKey;
  desk.booking = {
    is_booked: true,
    user: {
      applier_employee_id: normalizedUserKey,
      tenant_employee_id: normalizedUserKey,
      user_name: normalizedUserName,
    },
  };
  if (!(bookingState.bookingsByDeskId instanceof Map)) {
    bookingState.bookingsByDeskId = new Map();
  }
  bookingState.bookingsByDeskId.set(String(desk.id), {
    workplace_id: Number(desk.id),
    applier_employee_id: normalizedUserKey,
    tenant_employee_id: normalizedUserKey,
    user_name: normalizedUserName,
  });
  refreshDeskCollectionsView();
};

const resolveDeskActionStatus = (desk) => {
  if (!desk?.id) {
    return "free";
  }
  const status = String(desk.bookingStatus || "free");
  if (status === "my" || status === "booked") {
    const hasLiveBookingPayload = Boolean(desk.booking?.is_booked);
    const hasLiveBookingMapEntry =
      bookingState.bookingsByDeskId instanceof Map &&
      bookingState.bookingsByDeskId.has(String(desk.id));
    if (!hasLiveBookingPayload && !hasLiveBookingMapEntry) {
      return "free";
    }
  }
  return status;
};

const bookDeskForEmployee = async (desk, targetEmployeeId = null) => {
  if (!bookingState.selectedDate) {
    ensureBookingDate();
  }
  const deskId = Number(desk?.id);
  if (!Number.isFinite(deskId)) {
    return;
  }
  if (deskBookingActionsInFlight.has(String(deskId))) {
    return;
  }
  setDeskBookingInFlight(deskId, true);
  const headers = getBookingHeaders();
  try {
    const body = {
      date: bookingState.selectedDate,
      workplace_id: deskId,
    };
    if (targetEmployeeId != null && targetEmployeeId !== "") {
      body.target_employee_id = String(targetEmployeeId);
    }
    const isGuest = targetEmployeeId === "0";
    const isOther = targetEmployeeId != null && targetEmployeeId !== "";
    await apiRequest("/api/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!isOther) {
      markDeskAsMyLocally(deskId);
    } else if (isGuest) {
      markDeskAsBookedLocally(deskId, { userName: "Гость", userKey: "guest" });
    } else {
      markDeskAsBookedLocally(deskId, { userName: "Сотрудник" });
    }
    if (isGuest) {
      notifyDeskBookingCompletion("Место забронировано для гостя.", "success");
    } else if (isOther) {
      notifyDeskBookingCompletion("Место забронировано для сотрудника.", "success");
    } else {
      notifyDeskBookingCompletion("Место успешно забронировано.", "success");
    }
    refreshSpaceAfterDeskBookingMutation();
  } catch (error) {
    notifyDeskBookingCompletion(error.message, "error");
  } finally {
    setDeskBookingInFlight(deskId, false);
  }
};

const canBookForOthers = () => {
  const user = getUserInfo();
  return canManageSpaceResources(user, getActiveSpaceForPermissions());
};

const openBookForChoiceModal = (desk) => {
  if (!bookForChoiceModal) {
    return;
  }
  bookForOtherState.desk = desk;
  bookForChoiceModal.classList.add("is-open");
  bookForChoiceModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const closeBookForChoiceModal = () => {
  if (!bookForChoiceModal) {
    return;
  }
  bookForChoiceModal.classList.remove("is-open");
  bookForChoiceModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const openBookForOtherModal = (desk) => {
  if (!bookForOtherModal) {
    return;
  }
  bookForOtherState.desk = desk;
  bookForOtherState.selectedType = null;
  bookForOtherState.selectedEmployeeId = "";
  if (bookForOtherEmployeeField) {
    bookForOtherEmployeeField.value = "";
    // Re-enable employee picker in case the previous session selected "guest".
    bookForOtherEmployeeField.disabled = false;
  }
  if (bookForOtherStatus) {
    bookForOtherStatus.textContent = "";
    bookForOtherStatus.dataset.tone = "";
  }
  if (bookForOtherSubmitBtn) {
    bookForOtherSubmitBtn.disabled = true;
  }
  if (bookForGuestBtn) {
    bookForGuestBtn.classList.remove("is-selected");
  }
  bookForOtherModal.classList.add("is-open");
  bookForOtherModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  void populateBookForOtherOptions();
};

const closeBookForOtherModal = () => {
  if (!bookForOtherModal) {
    return;
  }
  bookForOtherModal.classList.remove("is-open");
  bookForOtherModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const bookForOtherOptionsCache = { loaded: false, options: [] };

const populateBookForOtherOptions = async () => {
  if (!bookForOtherEmployeeField) {
    return;
  }
  if (bookForOtherOptionsCache.loaded) {
    setResponsibleOptionsForField(bookForOtherEmployeeField, bookForOtherOptionsCache.options);
    return;
  }
  try {
    const result = await apiRequest("/api/users?scope=booking");
    const items = Array.isArray(result?.items) ? result.items : [];
    const normalized = items
      .map((item) => ({
        employee_id: String(item?.employee_id || item?.employeeId || "").trim(),
        full_name: String(item?.full_name || item?.fullName || "").trim(),
      }))
      .filter((item) => item.employee_id);
    const unique = getUniqueResponsibleOptions(normalized);
    bookForOtherOptionsCache.options = unique;
    bookForOtherOptionsCache.loaded = true;
    setResponsibleOptionsForField(bookForOtherEmployeeField, unique);
  } catch (error) {
    setResponsibleOptionsForField(bookForOtherEmployeeField, []);
    showTopAlert("Не удалось загрузить список сотрудников.", "error");
  }
};

const updateBookForOtherSubmitState = () => {
  if (!bookForOtherSubmitBtn) {
    return;
  }
  const type = bookForOtherState.selectedType;
  if (type === "guest") {
    bookForOtherSubmitBtn.disabled = false;
    return;
  }
  if (type === "employee") {
    const raw = normalizeResponsibleValue(bookForOtherEmployeeField?.value);
    const resolved = resolveResponsibleEmployeeId(
      raw,
      getResponsibleOptionsForField(bookForOtherEmployeeField)
    );
    bookForOtherSubmitBtn.disabled = !resolved;
    return;
  }
  bookForOtherSubmitBtn.disabled = true;
};

const handleBookForOtherSubmit = async () => {
  const desk = bookForOtherState.desk;
  if (!desk) {
    return;
  }
  const type = bookForOtherState.selectedType;
  let targetEmployeeId = "";
  if (type === "guest") {
    targetEmployeeId = "0";
  } else if (type === "employee") {
    const raw = normalizeResponsibleValue(bookForOtherEmployeeField?.value);
    const resolved = resolveResponsibleEmployeeId(
      raw,
      getResponsibleOptionsForField(bookForOtherEmployeeField)
    );
    if (!resolved) {
      if (bookForOtherStatus) {
        bookForOtherStatus.textContent = "Выберите сотрудника из списка.";
        bookForOtherStatus.dataset.tone = "error";
      }
      return;
    }
    targetEmployeeId = resolved;
  } else {
    return;
  }
  closeBookForOtherModal();
  await bookDeskForEmployee(desk, targetEmployeeId);
};

const handleDeskBookingClick = async (desk) => {
  if (!bookingState.selectedDate) {
    ensureBookingDate();
  }
  const deskId = Number(desk?.id);
  if (!Number.isFinite(deskId)) {
    return;
  }
  const liveDesk = findDeskById(deskId) || desk;
  if (!liveDesk) {
    return;
  }
  if (deskBookingActionsInFlight.has(String(deskId))) {
    return;
  }
  const headers = getBookingHeaders();
  const status = resolveDeskActionStatus(liveDesk);
  try {
    if (status === "my") {
      const confirmed = window.confirm("Отменить выбор этого стола?");
      if (!confirmed) {
        return;
      }
      setDeskBookingInFlight(deskId, true);
      try {
        await apiRequest("/api/bookings", {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            date: bookingState.selectedDate,
            workplace_id: deskId,
          }),
        });
        markDeskAsFreeLocally(deskId);
        notifyDeskBookingCompletion("Бронирование отменено.", "success");
        refreshSpaceAfterDeskBookingMutation();
        return;
      } catch (error) {
        if (isBookingAlreadyCancelledError(error)) {
          markDeskAsFreeLocally(deskId);
          notifyDeskBookingCompletion("Бронирование уже было отменено.", "info");
          refreshSpaceAfterDeskBookingMutation();
          return;
        }
        throw error;
      } finally {
        setDeskBookingInFlight(deskId, false);
      }
    }
    if (status === "booked" && canBookForOthers()) {
      const bookedName = liveDesk.bookingUserName || "сотрудник";
      const confirmed = window.confirm(
        `Отменить бронирование стола "${liveDesk.label || "стол"}" (${bookedName})?`
      );
      if (!confirmed) {
        return;
      }
      setDeskBookingInFlight(deskId, true);
      try {
        await apiRequest("/api/bookings", {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            date: bookingState.selectedDate,
            workplace_id: deskId,
          }),
        });
        markDeskAsFreeLocally(deskId);
        notifyDeskBookingCompletion("Бронирование отменено.", "success");
        refreshSpaceAfterDeskBookingMutation();
        return;
      } catch (error) {
        if (isBookingAlreadyCancelledError(error)) {
          markDeskAsFreeLocally(deskId);
          notifyDeskBookingCompletion("Бронирование уже было отменено.", "info");
          refreshSpaceAfterDeskBookingMutation();
          return;
        }
        throw error;
      } finally {
        setDeskBookingInFlight(deskId, false);
      }
    }
    if (status !== "free") {
      return;
    }
    if (canBookForOthers()) {
      openBookForChoiceModal(liveDesk);
      return;
    }
    await bookDeskForEmployee(liveDesk);
  } catch (error) {
    notifyDeskBookingCompletion(error.message, "error");
  }
};

const handleMeetingBookingSubmit = async () => {
  const spaceId = meetingBookingState.space?.id;
  const date = meetingBookingState.selectedDate;
  if (!spaceId || !date) {
    setMeetingBookingStatus("Выберите переговорную и дату.", "error");
    return;
  }
  const slots = Array.from(meetingBookingState.selectedSlotStarts.values()).sort((a, b) => a - b);
  if (slots.length === 0) {
    setMeetingBookingStatus("Выберите время бронирования.", "error");
    return;
  }
  const headers = getMeetingBookingHeaders();
  try {
    const failedSlots = [];
    let replacedCount = 0;
    for (const startMin of slots) {
      const endMin = startMin + meetingSlotMinutes;
      try {
        const response = await apiRequest("/api/meeting-room-bookings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            meeting_room_id: Number(spaceId),
            start_time: formatMeetingDateTime(date, startMin),
            end_time: formatMeetingDateTime(date, endMin),
          }),
        });
        if (response?.replacedCount) {
          replacedCount += Number(response.replacedCount) || 0;
        }
      } catch (error) {
        failedSlots.push({ startMin, endMin, message: error.message });
      }
    }
    if (failedSlots.length === 0) {
      const alertMessage = buildMeetingBookingAlertMessage(
        meetingBookingState.space,
        date,
        slots,
        replacedCount
      );
      setMeetingBookingStatus("Переговорка успешно забронирована.", "success");
      showTopAlert(alertMessage, "success");
      resetMeetingBookingSelection();
      closeMeetingBookingModal();
    } else {
      meetingBookingState.selectedSlotStarts = new Set(failedSlots.map((slot) => slot.startMin));
      renderMeetingTimeSlots();
      setMeetingBookingStatus("Часть слотов уже занята, проверьте выделение.", "error");
    }
    if (meetingBookingState.space?.id && meetingBookingState.selectedDate) {
      await loadMeetingRoomBookings(meetingBookingState.space.id, meetingBookingState.selectedDate);
    }
  } catch (error) {
    setMeetingBookingStatus(error.message, "error");
  }
};

const handleCancelMeetingBooking = async (startMin, endMin) => {
  const spaceId = meetingBookingState.space?.id;
  const date = meetingBookingState.selectedDate;
  if (!spaceId || !date) {
    setMeetingBookingStatus("Выберите переговорную и дату.", "error");
    return;
  }
  const headers = getMeetingBookingHeaders();
  const confirmed = window.confirm(
    `Отменить бронирование на ${formatMeetingMinutes(startMin)}–${formatMeetingMinutes(endMin)}?`
  );
  if (!confirmed) {
    return;
  }
  try {
    await apiRequest("/api/meeting-room-bookings", {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        meeting_room_id: Number(spaceId),
        start_time: formatMeetingDateTime(date, startMin),
        end_time: formatMeetingDateTime(date, endMin),
      }),
    });
    setMeetingBookingStatus("Бронирование отменено.", "success");
    if (meetingBookingState.space?.id && meetingBookingState.selectedDate) {
      await loadMeetingRoomBookings(meetingBookingState.space.id, meetingBookingState.selectedDate);
    }
  } catch (error) {
    setMeetingBookingStatus(error.message, "error");
  }
};

const handleCancelMeetingBookings = async () => {
  const spaceId = meetingBookingState.space?.id;
  const date = meetingBookingState.selectedDate;
  const slots = Array.from(meetingBookingState.selectedCancelSlotStarts.values()).sort((a, b) => a - b);
  if (!spaceId || !date) {
    setMeetingBookingStatus("Выберите переговорную и дату.", "error");
    return;
  }
  if (slots.length === 0) {
    setMeetingBookingStatus("Выберите слоты для отмены.", "error");
    return;
  }
  const headers = getMeetingBookingHeaders();
  const label = formatMeetingSlotRangesLabel(slots);
  const confirmed = window.confirm(`Отменить бронирование на ${label}?`);
  if (!confirmed) {
    return;
  }
  try {
    const failedSlots = [];
    for (const startMin of slots) {
      const endMin = startMin + meetingSlotMinutes;
      try {
        await apiRequest("/api/meeting-room-bookings", {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            meeting_room_id: Number(spaceId),
            start_time: formatMeetingDateTime(date, startMin),
            end_time: formatMeetingDateTime(date, endMin),
          }),
        });
      } catch (error) {
        failedSlots.push({ startMin, endMin, message: error.message });
      }
    }
    if (failedSlots.length === 0) {
      setMeetingBookingStatus("Бронирование отменено.", "success");
      meetingBookingState.selectedCancelSlotStarts = new Set();
      renderMeetingTimeSlots();
    } else {
      meetingBookingState.selectedCancelSlotStarts = new Set(
        failedSlots.map((slot) => slot.startMin)
      );
      renderMeetingTimeSlots();
      setMeetingBookingStatus("Часть слотов не удалось отменить, проверьте выделение.", "error");
    }
    if (meetingBookingState.space?.id && meetingBookingState.selectedDate) {
      await loadMeetingRoomBookings(meetingBookingState.space.id, meetingBookingState.selectedDate);
    }
  } catch (error) {
    setMeetingBookingStatus(error.message, "error");
  }
};

const startDeskLongPress = (desk, event) => {
  if (!desk || desk.bookingStatus === "booked") {
    return;
  }
  bookingState.longPressTriggered = false;
  if (bookingState.longPressTimer) {
    clearTimeout(bookingState.longPressTimer);
  }
  bookingState.longPressTimer = setTimeout(() => {
    bookingState.longPressTriggered = true;
    bookingState.longPressTimer = null;
    openWeekCalendar(desk);
    setTimeout(() => {
      bookingState.longPressTriggered = false;
    }, 300);
  }, 1500);

  const cancel = () => {
    if (bookingState.longPressTimer) {
      clearTimeout(bookingState.longPressTimer);
      bookingState.longPressTimer = null;
    }
  };

  if (event?.target) {
    event.target.addEventListener("pointerup", cancel, { once: true });
    event.target.addEventListener("pointercancel", cancel, { once: true });
    event.target.addEventListener("pointerleave", cancel, { once: true });
  }
};

const openWeekCalendar = (desk) => {
  if (!spaceBookingPanel) {
    return;
  }
  const overlay = document.createElement("div");
  overlay.className = "week-calendar-overlay";
  const modal = document.createElement("div");
  modal.className = "week-calendar";
  const header = document.createElement("div");
  header.className = "week-calendar-header";
  const title = document.createElement("h3");
  title.textContent = `Бронирование: ${desk.label || "Стол"}`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "week-calendar-close";
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  header.appendChild(title);
  header.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "week-calendar-content";
  const hint = document.createElement("p");
  hint.className = "week-calendar-hint";
  hint.textContent = "Выберите дни недели для бронирования:";
  const grid = document.createElement("div");
  grid.className = "week-days-grid";
  const weekDayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const selectedDays = new Set();
  weekDayNames.forEach((dayName, index) => {
    const dayIndex = index + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "week-day-button";
    const dayNameEl = document.createElement("div");
    dayNameEl.className = "week-day-name";
    dayNameEl.textContent = dayName;
    button.replaceChildren(dayNameEl);
    button.addEventListener("click", () => {
      if (selectedDays.has(dayIndex)) {
        selectedDays.delete(dayIndex);
        button.classList.remove("selected");
      } else {
        selectedDays.add(dayIndex);
        button.classList.add("selected");
      }
      confirmBtn.disabled = selectedDays.size === 0;
    });
    grid.appendChild(button);
  });
  content.appendChild(hint);
  content.appendChild(grid);

  const footer = document.createElement("div");
  footer.className = "week-calendar-footer";
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "week-calendar-button confirm";
  confirmBtn.textContent = "Забронировать";
  confirmBtn.disabled = true;
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "week-calendar-button cancel";
  cancelBtn.textContent = "Отмена";

  footer.appendChild(confirmBtn);
  footer.appendChild(cancelBtn);

  modal.appendChild(header);
  modal.appendChild(content);
  modal.appendChild(footer);

  const close = () => {
    document.body.classList.remove("modal-open");
    overlay.remove();
    modal.remove();
  };

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  confirmBtn.addEventListener("click", async () => {
    const days = Array.from(selectedDays.values());
    if (days.length === 0) {
      return;
    }
    close();
    await handleWeekBooking(desk, days);
  });

  document.body.classList.add("modal-open");
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  requestAnimationFrame(() => {
    modal.classList.add("week-calendar-visible");
  });
};

const handleWeekBooking = async (desk, selectedDays) => {
  const headers = getBookingHeaders();
  const dates = getWeekDatesForSelectedDays(selectedDays, bookingState.selectedDate);
  if (dates.length === 0) {
    setBookingStatus("Не удалось подобрать даты для бронирования.", "error");
    return;
  }
  try {
    const response = await apiRequest("/api/bookings/multiple", {
      method: "POST",
      headers,
    body: JSON.stringify({
      dates,
      workplace_id: Number(desk.id),
    }),
    });
    const createdCount = response?.createdDates?.length || 0;
    const failedCount = response?.failedDates?.length || 0;
    if (createdCount > 0) {
      alert(`Успешно забронировано на ${createdCount} дат(ы)`);
    }
    if (failedCount > 0 && response.failedDates) {
      alert(
        `Стол "${desk.label}" уже занят другими пользователями на следующие даты: ${response.failedDates
          .map((item) => formatBookingDate(item))
          .join(", ")}.`
      );
    }
    if (currentSpace?.id && bookingState.selectedDate) {
      await loadSpaceDesks(currentSpace.id);
    }
  } catch (error) {
    setBookingStatus(error.message, "error");
  }
};

const getWeekDatesForSelectedDays = (selectedDays, startDate) => {
  const dates = [];
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = start < today ? today : start;
  const dayOfWeek = minDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(minDate);
  weekStart.setDate(minDate.getDate() + mondayOffset);
  const endDate = new Date(minDate);
  endDate.setFullYear(minDate.getFullYear() + 1);
  const selectedSet = new Set(selectedDays);
  let currentWeekStart = new Date(weekStart);
  while (currentWeekStart < endDate) {
    selectedSet.forEach((dayIndex) => {
      const offset = dayIndex === 7 ? 6 : dayIndex - 1;
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + offset);
      if (date >= minDate && date < endDate) {
        dates.push(formatPickerDate(date));
      }
    });
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  return Array.from(new Set(dates)).sort();
};

const updateSpaceColorPreview = (color) => {
  if (!spaceColorPreview) {
    return;
  }
  spaceColorPreview.style.background = color || "#60a5fa";
};

const normalizeSpaceKind = (kind) => (kind && spaceKindLabels[kind] ? kind : defaultSpaceKind);

const getSpaceKindLabel = (kind) => (kind && spaceKindLabels[kind] ? spaceKindLabels[kind] : "");
const getSpaceKindFieldRow = () =>
  spaceKindField ? spaceKindField.closest(".field") : null;
const getSpaceKindValueForModal = (space) =>
  space?.kind ? normalizeSpaceKind(space.kind) : normalizeSpaceKindFilter(currentSpaceKindFilter);
const spaceKindModalCopy = {
  coworking: {
    noun: "коворкинг",
    accusative: "коворкинг",
    genitive: "коворкинга",
    newLabel: "Новый",
    placeholder: "",
  },
  meeting: {
    noun: "переговорка",
    accusative: "переговорку",
    genitive: "переговорки",
    newLabel: "Новая",
    placeholder: "Например, Переговорка 1",
  },
};
const updateSpaceModalCopy = (kind, isEditing) => {
  const copy = kind && spaceKindModalCopy[kind] ? spaceKindModalCopy[kind] : null;
  if (!copy) {
    return;
  }
  if (spaceModalTitle) {
    spaceModalTitle.textContent = isEditing
      ? `Редактировать ${copy.accusative}`
      : `${copy.newLabel} ${copy.noun}`;
  }
  if (spaceNameFieldLabel) {
    spaceNameFieldLabel.textContent = `Название ${copy.genitive}`;
  }
  if (spaceNameField) {
    const nextPlaceholder = copy.placeholder || spaceNameFieldDefaultPlaceholder;
    spaceNameField.setAttribute("placeholder", nextPlaceholder);
  }
};

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

const updateSpaceSubdivisionVisibility = (kind) => {
  const isCoworking = kind === "coworking";
  if (spaceSubdivisionFields) {
    spaceSubdivisionFields.classList.toggle("is-hidden", !isCoworking);
    spaceSubdivisionFields.setAttribute("aria-hidden", String(!isCoworking));
  }
  const shouldDisable = !isCoworking;
  [spaceSubdivisionLevel1Field, spaceSubdivisionLevel2Field].forEach((field) => {
    if (!field) {
      return;
    }
    field.disabled = shouldDisable;
    if (shouldDisable) {
      field.value = "";
    }
  });
};

let coworkingResponsibleOptions = new Map();
let coworkingResponsibleLoading = new Set();
const responsibleOptionsByFieldId = new Map();

const normalizeResponsibleValue = (value) => String(value || "").trim();
const isNumericEmployeeId = (value) => /^\d+$/.test(value);

const buildResponsibleLabel = (item) => {
  const employeeId = String(item?.employee_id || item?.employeeId || "").trim();
  const fullName = String(item?.full_name || item?.fullName || "").trim();
  if (!employeeId) {
    return "";
  }
  if (fullName && fullName !== employeeId) {
    return `${fullName} (${employeeId})`;
  }
  return employeeId;
};

const buildResponsibleLookup = (options) => {
  const lookup = new Map();
  options.forEach((item) => {
    const employeeId = normalizeResponsibleValue(item?.employee_id || item?.employeeId || "");
    if (!employeeId) {
      return;
    }
    const fullName = normalizeResponsibleValue(item?.full_name || item?.fullName || "");
    const label = buildResponsibleLabel(item);
    lookup.set(employeeId.toLowerCase(), employeeId);
    if (fullName) {
      lookup.set(fullName.toLowerCase(), employeeId);
    }
    if (label) {
      lookup.set(label.toLowerCase(), employeeId);
    }
  });
  return lookup;
};

const getResponsibleOptionsForField = (field) => {
  if (!field || !field.id) {
    return [];
  }
  return responsibleOptionsByFieldId.get(field.id) || [];
};

const setResponsibleOptionsForField = (field, options) => {
  if (!field || !field.id) {
    return;
  }
  responsibleOptionsByFieldId.set(field.id, options);
};

const resolveResponsibleEmployeeId = (rawValue, options) => {
  if (!rawValue) {
    return "";
  }
  const lookup = buildResponsibleLookup(options);
  const matched = lookup.get(rawValue.toLowerCase());
  if (matched) {
    return matched;
  }
  if (isNumericEmployeeId(rawValue)) {
    return rawValue;
  }
  return null;
};

const resolveResponsibleEmployeeIdFromField = (field) => {
  const rawValue = normalizeResponsibleValue(field?.value);
  if (!rawValue) {
    return "";
  }
  return resolveResponsibleEmployeeId(rawValue, getResponsibleOptionsForField(field));
};

const getResponsibleDisplayValue = (selectedValue, options) => {
  const normalizedSelected = normalizeResponsibleValue(selectedValue);
  if (!normalizedSelected) {
    return "";
  }
  const matched = options.find(
    (item) => normalizeResponsibleValue(item?.employee_id || item?.employeeId || "") === normalizedSelected
  );
  if (!matched) {
    return normalizedSelected;
  }
  return buildResponsibleLabel(matched) || normalizedSelected;
};

const getUniqueResponsibleOptions = (options) => {
  const unique = new Map();
  options.forEach((item) => {
    const employeeId = normalizeResponsibleValue(item?.employee_id || item?.employeeId || "");
    if (!employeeId) {
      return;
    }
    if (!unique.has(employeeId)) {
      unique.set(employeeId, { employee_id: employeeId, full_name: item?.full_name || item?.fullName || "" });
    }
  });
  return Array.from(unique.values());
};

const filterResponsibleOptions = (options, query) => {
  const normalizedQuery = normalizeResponsibleValue(query).toLowerCase();
  if (!normalizedQuery) {
    return options;
  }
  return options.filter((item) => {
    const employeeId = normalizeResponsibleValue(item?.employee_id || item?.employeeId || "").toLowerCase();
    const fullName = normalizeResponsibleValue(item?.full_name || item?.fullName || "").toLowerCase();
    const label = buildResponsibleLabel(item).toLowerCase();
    return (
      (employeeId && employeeId.includes(normalizedQuery)) ||
      (fullName && fullName.includes(normalizedQuery)) ||
      (label && label.includes(normalizedQuery))
    );
  });
};

const RESPONSIBLE_SUGGESTIONS_LIMIT = 8;

const renderResponsibleSuggestions = (field, suggestionsEl, options) => {
  if (!suggestionsEl) {
    return;
  }
  const normalizedQuery = normalizeResponsibleValue(field?.value);
  const uniqueOptions = getUniqueResponsibleOptions(options);
  const filtered = filterResponsibleOptions(uniqueOptions, normalizedQuery).slice(
    0,
    RESPONSIBLE_SUGGESTIONS_LIMIT
  );
  suggestionsEl.replaceChildren();
  if (!filtered.length) {
    if (!normalizedQuery) {
      suggestionsEl.classList.add("is-hidden");
      return;
    }
    const emptyItem = document.createElement("div");
    emptyItem.className = "responsible-suggestion is-empty";
    emptyItem.textContent = "Сотрудник не найден";
    suggestionsEl.appendChild(emptyItem);
    suggestionsEl.classList.remove("is-hidden");
    return;
  }
  filtered.forEach((item) => {
    const label = buildResponsibleLabel(item);
    if (!label) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "responsible-suggestion";
    button.textContent = label;
    button.dataset.responsibleOption = "true";
    button.dataset.employeeId = normalizeResponsibleValue(item.employee_id || item.employeeId || "");
    suggestionsEl.appendChild(button);
  });
  suggestionsEl.classList.remove("is-hidden");
};

const setupResponsibleAutocomplete = (field, suggestionsEl) => {
  if (!field || !suggestionsEl) {
    return;
  }
  let isPointerDown = false;
  let closeTimeout = null;

  const openSuggestions = () => {
    const options = getResponsibleOptionsForField(field);
    renderResponsibleSuggestions(field, suggestionsEl, options);
  };

  const closeSuggestions = () => {
    suggestionsEl.classList.add("is-hidden");
  };

  field.addEventListener("focus", () => {
    openSuggestions();
  });

  field.addEventListener("input", () => {
    openSuggestions();
  });

  field.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  field.addEventListener("blur", () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    closeTimeout = window.setTimeout(() => {
      if (!isPointerDown) {
        closeSuggestions();
      }
      isPointerDown = false;
    }, 120);
  });

  suggestionsEl.addEventListener("mousedown", (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-responsible-option]") : null;
    if (!target) {
      isPointerDown = true;
      return;
    }
    event.preventDefault();
    const employeeId = normalizeResponsibleValue(target.dataset.employeeId || "");
    const options = getUniqueResponsibleOptions(getResponsibleOptionsForField(field));
    const matched = options.find(
      (item) => normalizeResponsibleValue(item?.employee_id || item?.employeeId || "") === employeeId
    );
    field.value = matched ? buildResponsibleLabel(matched) : target.textContent || "";
    closeSuggestions();
    field.focus();
  });

  document.addEventListener("mousedown", (event) => {
    if (event.target === field || suggestionsEl.contains(event.target)) {
      return;
    }
    closeSuggestions();
  });
};

const fetchCoworkingResponsibleOptions = async (buildingId = null) => {
  const user = getUserInfo();
  const normalizedBuildingId = Number(buildingId) || 0;
  const canRequestAll = canManageOfficeResources(user);
  const cacheKey = canRequestAll ? "admin" : `building-${normalizedBuildingId}`;
  if (!canRequestAll && !normalizedBuildingId) {
    return [];
  }
  if (coworkingResponsibleOptions.has(cacheKey)) {
    return coworkingResponsibleOptions.get(cacheKey);
  }
  if (coworkingResponsibleLoading.has(cacheKey)) {
    return coworkingResponsibleOptions.get(cacheKey) || [];
  }
  coworkingResponsibleLoading.add(cacheKey);
  try {
    const query = !canRequestAll && normalizedBuildingId
      ? `/api/users?building_id=${encodeURIComponent(normalizedBuildingId)}`
      : "/api/users";
    const result = await apiRequest(query);
    const items = Array.isArray(result?.items) ? result.items : [];
    const normalized = items
      .map((item) => ({
        employee_id: String(item?.employee_id || item?.employeeId || "").trim(),
        full_name: String(item?.full_name || item?.fullName || "").trim(),
      }))
      .filter((item) => item.employee_id);
    const unique = getUniqueResponsibleOptions(normalized);
    coworkingResponsibleOptions.set(cacheKey, unique);
  } catch (error) {
    coworkingResponsibleOptions.set(cacheKey, []);
    showTopAlert("Не удалось загрузить список сотрудников.", "error");
  } finally {
    coworkingResponsibleLoading.delete(cacheKey);
  }
  return coworkingResponsibleOptions.get(cacheKey) || [];
};

const getCoworkingResponsibleFloor = (space = null) =>
  resolveFloorForSpace(space) || currentFloor;

const updateSpaceResponsibleVisibility = (kind, space = null) => {
  const floor = getCoworkingResponsibleFloor(space);
  const canAssign = kind === "coworking" && canManageFloorResources(getUserInfo(), floor);
  if (spaceResponsibleFieldRow) {
    spaceResponsibleFieldRow.classList.toggle("is-hidden", !canAssign);
    spaceResponsibleFieldRow.setAttribute("aria-hidden", String(!canAssign));
  }
  if (spaceResponsibleField) {
    spaceResponsibleField.disabled = !canAssign;
    if (!canAssign) {
      spaceResponsibleField.value = "";
    }
  }
};

const populateSpaceResponsibleOptions = async (selectedValue = "", buildingId = null) => {
  if (!spaceResponsibleField) {
    return;
  }
  const options = await fetchCoworkingResponsibleOptions(buildingId);
  setResponsibleOptionsForField(spaceResponsibleField, options);
  spaceResponsibleField.value = getResponsibleDisplayValue(selectedValue, options);
};

const populateFloorInfoResponsibleOptions = async (selectedValue = "", buildingId = null) => {
  if (!floorInfoResponsibleField) {
    return;
  }
  const options = await fetchCoworkingResponsibleOptions(buildingId);
  setResponsibleOptionsForField(floorInfoResponsibleField, options);
  floorInfoResponsibleField.value = getResponsibleDisplayValue(selectedValue, options);
};

const updateBuildingResponsibleVisibility = (user) => {
  const canAssign = canManageOfficeResources(user);
  if (buildingResponsibleFieldRow) {
    buildingResponsibleFieldRow.classList.toggle("is-hidden", !canAssign);
    buildingResponsibleFieldRow.setAttribute("aria-hidden", String(!canAssign));
  }
  if (buildingResponsibleField) {
    buildingResponsibleField.disabled = !canAssign;
    if (!canAssign) {
      buildingResponsibleField.value = "";
    }
  }
};

const populateBuildingResponsibleOptions = async (selectedValue = "") => {
  if (!buildingResponsibleField) {
    return;
  }
  const options = await fetchCoworkingResponsibleOptions();
  setResponsibleOptionsForField(buildingResponsibleField, options);
  buildingResponsibleField.value = getResponsibleDisplayValue(selectedValue, options);
};

const initResponsiblePickers = () => {
  setupResponsibleAutocomplete(buildingResponsibleField, buildingResponsibleSuggestions);
  setupResponsibleAutocomplete(spaceResponsibleField, spaceResponsibleSuggestions);
  setupResponsibleAutocomplete(floorInfoResponsibleField, floorInfoResponsibleSuggestions);
};

initResponsiblePickers();
const openSpaceModal = (space = null) => {
  if (!spaceModal) {
    return;
  }
  const user = getUserInfo();
  if (space) {
    if (!canManageSpaceResources(user, space)) {
      showTopAlert("Недостаточно прав для изменения пространства.", "error");
      return;
    }
  } else if (!canManageFloorResources(user, currentFloor)) {
    showTopAlert("Недостаточно прав для изменения пространства.", "error");
    return;
  }
  editingSpace = space;
  spaceModal.classList.add("is-open");
  spaceModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  clearSpaceStatus();
  if (spaceSaveBtn) {
    toggleHidden(spaceSaveBtn, false);
  }
  if (spaceDeleteBtn) {
    spaceDeleteBtn.classList.toggle("is-hidden", !space);
  }
  if (spaceNameField) {
    spaceNameField.value = space?.name || "";
    spaceNameField.focus();
  }
  if (spaceKindField) {
    const nextKind = getSpaceKindValueForModal(space);
    spaceKindField.value = nextKind;
    spaceKindField.disabled = true;
    const kindRow = getSpaceKindFieldRow();
    if (kindRow) {
      kindRow.classList.add("is-hidden");
      kindRow.setAttribute("aria-hidden", "true");
    }
  }
  if (spaceCapacityField) {
    const capacityValue =
      space && Number.isFinite(Number(space.capacity)) && Number(space.capacity) > 0
        ? String(space.capacity)
        : "";
    spaceCapacityField.value = capacityValue;
  }
  if (spaceSubdivisionLevel1Field) {
    spaceSubdivisionLevel1Field.value = space?.subdivision_level_1 || "";
  }
  if (spaceSubdivisionLevel2Field) {
    spaceSubdivisionLevel2Field.value = space?.subdivision_level_2 || "";
  }
  const currentKind = spaceKindField ? spaceKindField.value : defaultSpaceKind;
  updateSpaceCapacityVisibility(currentKind);
  updateSpaceSubdivisionVisibility(currentKind);
  updateSpaceResponsibleVisibility(currentKind, space);
  updateSpaceModalCopy(currentKind, Boolean(space));
  if (spaceColorInput) {
    const initialColor = space?.color || getSpaceColor(space) || "#60a5fa";
    spaceColorInput.value = initialColor;
    updateSpaceColorPreview(initialColor);
  }
  const floorForModal = getCoworkingResponsibleFloor(space);
  const buildingForModal = resolveBuildingForFloor(floorForModal);
  if (currentKind === "coworking" && canManageFloorResources(user, floorForModal)) {
    const selectedResponsible = getSpaceResponsibleEmployeeId(space);
    void populateSpaceResponsibleOptions(selectedResponsible, buildingForModal?.id);
  } else if (spaceResponsibleField) {
    spaceResponsibleField.value = "";
  }
};

const closeSpaceModal = () => {
  if (!spaceModal) {
    return;
  }
  editingSpace = null;
  spaceModal.classList.remove("is-open");
  spaceModal.setAttribute("aria-hidden", "true");
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
  clearSpaceStatus();
  if (spaceForm) {
    spaceForm.reset();
  }
  updateSpaceCapacityVisibility(defaultSpaceKind);
  updateSpaceSubdivisionVisibility(defaultSpaceKind);
  updateSpaceResponsibleVisibility(defaultSpaceKind);
  if (spaceResponsibleField) {
    spaceResponsibleField.value = "";
  }
  if (spaceDeleteBtn) {
    spaceDeleteBtn.classList.add("is-hidden");
    spaceDeleteBtn.disabled = false;
  }
  lassoState.pendingPoints = null;
  lassoState.points = [];
};

const openFloorInfoModal = (floor) => {
  if (!floorInfoModal) {
    return;
  }
  const user = getUserInfo();
  if (!canManageBuildingResources(user, resolveBuildingForFloor(floor))) {
    showTopAlert("Недостаточно прав для редактирования этажей.", "error");
    return;
  }
  if (!floor) {
    showTopAlert("Не удалось определить этаж для редактирования.", "error");
    return;
  }
  editingFloorInfo = floor;
  clearFloorInfoStatus();
  floorInfoModal.classList.add("is-open");
  floorInfoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (floorInfoNameField) {
    floorInfoNameField.value = floor.name || `Этаж ${floor.level}`;
    floorInfoNameField.focus();
  }
  if (floorInfoModalTitle) {
    floorInfoModalTitle.textContent = `Редактировать ${floor.name || `этаж ${floor.level}`}`;
  }
  if (floorInfoDeleteBtn) {
    floorInfoDeleteBtn.disabled = false;
  }
  const selectedResponsible = getFloorResponsibleEmployeeId(floor);
  const buildingForModal = resolveBuildingForFloor(floor);
  void populateFloorInfoResponsibleOptions(selectedResponsible, buildingForModal?.id);
};

const closeFloorInfoModal = () => {
  if (!floorInfoModal) {
    return;
  }
  editingFloorInfo = null;
  floorInfoModal.classList.remove("is-open");
  floorInfoModal.setAttribute("aria-hidden", "true");
  if (
    !(buildingModal && buildingModal.classList.contains("is-open")) &&
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open"))
  ) {
    document.body.classList.remove("modal-open");
  }
  clearFloorInfoStatus();
  if (floorInfoForm) {
    floorInfoForm.reset();
  }
};

const openDeskModal = (desk) => {
  if (!deskModal) {
    return;
  }
  if (!canManageSpaceResources(getUserInfo(), currentSpace)) {
    showTopAlert("Недостаточно прав для изменения столов.", "error");
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
  if (deskSaveBtn) {
    toggleHidden(deskSaveBtn, false);
  }
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
    !(floorPlanModal && floorPlanModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open"))
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
    updateSpaceSubdivisionVisibility(event.target.value);
    updateSpaceResponsibleVisibility(event.target.value, editingSpace);
    const floorForModal = getCoworkingResponsibleFloor(editingSpace);
    const buildingForModal = resolveBuildingForFloor(floorForModal);
    if (event.target.value === "coworking" && canManageFloorResources(getUserInfo(), floorForModal)) {
      void populateSpaceResponsibleOptions(spaceResponsibleField?.value || "", buildingForModal?.id);
    }
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
  isMoving: false,
  movingTimerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  pendingSelectPolygon: null,
  pendingSelectPointerId: null,
  pendingSelectStartX: 0,
  pendingSelectStartY: 0,
  pendingSelectTimerId: null,
  wheelDeltaY: 0,
  wheelCursorX: 0,
  wheelCursorY: 0,
  wheelFrameId: null,
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
  wheelDeltaY: 0,
  wheelCursorX: 0,
  wheelCursorY: 0,
  wheelFrameId: null,
};

const clearPendingSelect = () => {
  floorPlanState.pendingSelectPolygon = null;
  floorPlanState.pendingSelectPointerId = null;
  if (floorPlanState.pendingSelectTimerId !== null) {
    clearTimeout(floorPlanState.pendingSelectTimerId);
    floorPlanState.pendingSelectTimerId = null;
  }
};

// Mark floor plan as actively navigating — suppresses tooltip hit-testing
// during pan/zoom.  After 150 ms of inactivity tooltips are re-enabled.
const movingSettleMs = 150;

const markFloorPlanFastTransform = () => {
  floorPlanState.isMoving = true;
  if (floorPlanState.movingTimerId !== null) {
    clearTimeout(floorPlanState.movingTimerId);
  }
  floorPlanState.movingTimerId = window.setTimeout(() => {
    floorPlanState.movingTimerId = null;
    floorPlanState.isMoving = false;
  }, movingSettleMs);
};

const markSpaceSnapshotFastTransform = () => {};

const floorPlanWheelZoomSensitivity = 0.006;

const flushFloorPlanWheelZoom = (minScale, maxScale) => {
  floorPlanState.wheelFrameId = null;
  const deltaY = floorPlanState.wheelDeltaY;
  floorPlanState.wheelDeltaY = 0;
  if (!deltaY) {
    return;
  }
  const zoomFactor = Math.exp(-deltaY * floorPlanWheelZoomSensitivity);
  const nextScale = clamp(floorPlanState.scale * zoomFactor, minScale, maxScale);
  if (nextScale === floorPlanState.scale) {
    return;
  }
  const cursorX = floorPlanState.wheelCursorX;
  const cursorY = floorPlanState.wheelCursorY;
  const offsetX = (cursorX - floorPlanState.translateX) / floorPlanState.scale;
  const offsetY = (cursorY - floorPlanState.translateY) / floorPlanState.scale;
  floorPlanState.scale = nextScale;
  floorPlanState.translateX = cursorX - offsetX * nextScale;
  floorPlanState.translateY = cursorY - offsetY * nextScale;
  markFloorPlanFastTransform();
  applyFloorPlanTransform();
  if (spaceTooltipState.polygon) {
    hideSpaceTooltip();
  }
};

const flushSpaceSnapshotWheelZoom = (minScale, maxScale) => {
  spaceSnapshotState.wheelFrameId = null;
  const deltaY = spaceSnapshotState.wheelDeltaY;
  spaceSnapshotState.wheelDeltaY = 0;
  if (!deltaY) {
    return;
  }
  const zoomFactor = Math.exp(-deltaY * 0.004);
  const nextScale = clamp(spaceSnapshotState.scale * zoomFactor, minScale, maxScale);
  if (nextScale === spaceSnapshotState.scale) {
    return;
  }
  const cursorX = spaceSnapshotState.wheelCursorX;
  const cursorY = spaceSnapshotState.wheelCursorY;
  const offsetX = (cursorX - spaceSnapshotState.translateX) / spaceSnapshotState.scale;
  const offsetY = (cursorY - spaceSnapshotState.translateY) / spaceSnapshotState.scale;
  spaceSnapshotState.scale = nextScale;
  spaceSnapshotState.translateX = cursorX - offsetX * nextScale;
  spaceSnapshotState.translateY = cursorY - offsetY * nextScale;
  markSpaceSnapshotFastTransform();
  applySpaceSnapshotTransform();
};

const applyFloorPlanTransform = () => {
  if (!floorPlanCanvas) {
    return;
  }
  const { translateX: tx, translateY: ty, scale: s } = floorPlanState;
  floorPlanCanvas.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
};

const resetFloorPlanTransform = () => {
  floorPlanState.scale = 1;
  floorPlanState.translateX = 0;
  floorPlanState.translateY = 0;
  floorPlanState.wheelDeltaY = 0;
  if (floorPlanState.wheelFrameId !== null) {
    cancelAnimationFrame(floorPlanState.wheelFrameId);
    floorPlanState.wheelFrameId = null;
  }
  applyFloorPlanTransform();
};

const applySpaceSnapshotTransform = () => {
  if (!spaceSnapshotCanvas) {
    return;
  }
  const { translateX: tx, translateY: ty, scale: s } = spaceSnapshotState;
  spaceSnapshotCanvas.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
};

const resetSpaceSnapshotTransform = () => {
  spaceSnapshotState.scale = 1;
  spaceSnapshotState.translateX = 0;
  spaceSnapshotState.translateY = 0;
  spaceSnapshotState.wheelDeltaY = 0;
  if (spaceSnapshotState.wheelFrameId !== null) {
    cancelAnimationFrame(spaceSnapshotState.wheelFrameId);
    spaceSnapshotState.wheelFrameId = null;
  }
  spaceSnapshotState.isDragging = false;
  spaceSnapshotState.dragPointerId = null;
  spaceSnapshotState.pendingPointerId = null;
  if (spaceSnapshot) {
    spaceSnapshot.classList.remove("is-dragging");
  }
  applySpaceSnapshotTransform();
};

const applySpaceSnapshotBackgroundState = (hidden) => {
  const isHidden = Boolean(hidden);
  if (spaceSnapshot) {
    spaceSnapshot.classList.toggle("is-background-hidden", isHidden);
  }
  if (spaceSnapshotToggleBtn) {
    const label = isHidden ? "Показать подложку" : "Скрыть подложку";
    spaceSnapshotToggleBtn.setAttribute("aria-pressed", String(isHidden));
    spaceSnapshotToggleBtn.setAttribute("aria-label", label);
    spaceSnapshotToggleBtn.title = label;
    spaceSnapshotToggleBtn.classList.toggle("is-off", isHidden);
  }
};

const setSpaceSnapshotLoading = (loading) => {
  if (!spaceSnapshot) {
    return;
  }
  const isLoading = Boolean(loading);
  spaceSnapshot.classList.toggle("is-loading", isLoading);
  spaceSnapshot.setAttribute("aria-busy", String(isLoading));
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

const getAxisAlignedPoint = (point, anchor) => {
  if (!point || !anchor) {
    return point;
  }
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: anchor.y };
  }
  return { x: anchor.x, y: point.y };
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
  applySpaceKindFilter({ syncPolygons: true });
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
  applySpaceKindFilter({ syncPolygons: true });
  if (message) {
    setFloorStatus(message, "info");
  }
};

const finishLassoMode = () => {
  if (lassoState.points.length < 3) {
    setFloorStatus("Нужно минимум 3 точки для пространства.", "error");
    return;
  }
  const normalizedPoints = normalizeSpacePoints(lassoState.points);
  const overlappingSpaces = getOverlappingSpaces(normalizedPoints);
  if (overlappingSpaces.length > 0) {
    lassoState.pendingPoints = null;
    cancelLassoMode();
    const uniqueNames = Array.from(new Set(overlappingSpaces));
    const list = uniqueNames.join(", ");
    const message =
      uniqueNames.length === 1
        ? `Пространство пересекается с другим пространством:\n${list}`
        : `Пространство пересекается с другими пространствами:\n${list}`;
    showTopAlert(message, "error");
    return;
  }
  lassoState.pendingPoints = normalizedPoints;
  setLassoActive(false);
  resetLassoPreview();
  applySpaceKindFilter({ syncPolygons: true });
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

/* escapeSelectorValue → imported from utils.js */

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

const arePointsClose = (left, right, epsilon = 0.0001) =>
  Math.abs(left.x - right.x) <= epsilon && Math.abs(left.y - right.y) <= epsilon;

const getPointOrientation = (a, b, c, epsilon = 0.0001) => {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) <= epsilon) {
    return 0;
  }
  return value > 0 ? 1 : 2;
};

const isPointOnSegment = (a, b, c, epsilon = 0.0001) =>
  Math.min(a.x, c.x) - epsilon <= b.x &&
  b.x <= Math.max(a.x, c.x) + epsilon &&
  Math.min(a.y, c.y) - epsilon <= b.y &&
  b.y <= Math.max(a.y, c.y) + epsilon;

const segmentsIntersect = (p1, p2, q1, q2) => {
  if (arePointsClose(p1, q1) || arePointsClose(p1, q2) || arePointsClose(p2, q1) || arePointsClose(p2, q2)) {
    return true;
  }
  const o1 = getPointOrientation(p1, p2, q1);
  const o2 = getPointOrientation(p1, p2, q2);
  const o3 = getPointOrientation(q1, q2, p1);
  const o4 = getPointOrientation(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }
  if (o1 === 0 && isPointOnSegment(p1, q1, p2)) {
    return true;
  }
  if (o2 === 0 && isPointOnSegment(p1, q2, p2)) {
    return true;
  }
  if (o3 === 0 && isPointOnSegment(q1, p1, q2)) {
    return true;
  }
  if (o4 === 0 && isPointOnSegment(q1, p2, q2)) {
    return true;
  }
  return false;
};

const isPointInsidePolygon = (points, point) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
};

const polygonsIntersect = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }
  if (left.length < 3 || right.length < 3) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    const nextI = (i + 1) % left.length;
    for (let j = 0; j < right.length; j += 1) {
      const nextJ = (j + 1) % right.length;
      if (segmentsIntersect(left[i], left[nextI], right[j], right[nextJ])) {
        return true;
      }
    }
  }
  if (isPointInsidePolygon(left, right[0])) {
    return true;
  }
  if (isPointInsidePolygon(right, left[0])) {
    return true;
  }
  return false;
};

const getOverlappingSpaces = (points) => {
  if (!lassoState.spacesLayer || points.length < 3) {
    return [];
  }
  const overlaps = [];
  lassoState.spacesLayer.querySelectorAll(".space-polygon").forEach((polygon) => {
    const polygonPoints = parsePolygonPoints(polygon);
    if (polygonsIntersect(points, polygonPoints)) {
      overlaps.push(polygon.getAttribute("data-space-name") || "Без названия");
    }
  });
  return overlaps;
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
  // Keep original embedded floor image in saved SVG even if runtime view uses native <img>.
  const hasEmbeddedRaster = Boolean(
    clone.querySelector("image[href^='data:']") || clone.querySelector("image[xlink\\:href^='data:']")
  );
  if (floorPlanEmbeddedRasterTemplate && !hasEmbeddedRaster) {
    clone.insertBefore(floorPlanEmbeddedRasterTemplate.cloneNode(true), clone.firstChild);
  }
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
  planGroup.classList.add("space-snapshot-background");
  planGroup.setAttribute("clip-path", `url(#${clipId})`);
  Array.from(sourceSvg.childNodes).forEach((node) => {
    planGroup.appendChild(document.importNode(node, true));
  });
  snapshotSvg.appendChild(planGroup);

  const outlinePolygon = document.createElementNS(svgNamespace, "polygon");
  outlinePolygon.classList.add("space-snapshot-outline");
  outlinePolygon.setAttribute("points", stringifyPoints(points));
  snapshotSvg.appendChild(outlinePolygon);

  const desksLayer = document.createElementNS(svgNamespace, "g");
  desksLayer.setAttribute("id", "spaceDesksLayer");
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

const coworkingDeskSummaryCache = new Map();
let coworkingDeskSummaryRequestId = 0;

const getCoworkingDeskSummaryKey = (spaceId, date) => `${spaceId}:${date}`;

const getAvailabilityColorPair = (freeCount, totalCount) => {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return { text: "#64748b", background: "#f1f5f9", border: "#e2e8f0" };
  }
  const ratio = Math.min(Math.max(freeCount / totalCount, 0), 1);
  const hue = Math.round(120 * ratio);
  return {
    text: `hsl(${hue}, 70%, 30%)`,
    background: `hsla(${hue}, 70%, 85%, 0.65)`,
    border: `hsla(${hue}, 70%, 45%, 0.35)`,
  };
};

const updateCoworkingAvailabilityTag = (tag, occupiedCount, totalCount, freeCount) => {
  if (!tag) {
    return;
  }
  tag.textContent = `${occupiedCount} / ${totalCount}`;
  const colors = getAvailabilityColorPair(freeCount, totalCount);
  tag.style.color = colors.text;
  tag.style.backgroundColor = colors.background;
  tag.style.borderColor = colors.border;
};

const loadCoworkingDeskSummary = async (spaceId, date) => {
  const cacheKey = getCoworkingDeskSummaryKey(spaceId, date);
  if (coworkingDeskSummaryCache.has(cacheKey)) {
    return coworkingDeskSummaryCache.get(cacheKey);
  }
  const response = await apiRequest(
    `/api/spaces/${encodeURIComponent(spaceId)}/desks?date=${encodeURIComponent(date)}`
  );
  const desks = Array.isArray(response?.items) ? response.items : [];
  let freeCount = 0;
  let occupiedCount = 0;
  desks.forEach((desk) => {
    applyDeskBookingPayload(desk);
    if (desk.bookingStatus === "free") {
      freeCount += 1;
    } else {
      occupiedCount += 1;
    }
  });
  const summary = { freeCount, occupiedCount, totalCount: desks.length };
  coworkingDeskSummaryCache.set(cacheKey, summary);
  return summary;
};

const refreshCoworkingAvailability = async (spaces) => {
  if (!floorSpacesList) {
    return;
  }
  const currentRequestId = ++coworkingDeskSummaryRequestId;
  const date = formatPickerDate(new Date());
  const coworkings = Array.isArray(spaces)
    ? spaces.filter((space) => space?.kind === "coworking" && space?.id)
    : [];
  await Promise.all(
    coworkings.map(async (space) => {
      const item = floorSpacesList.querySelector(
        `.space-list-item[data-space-id="${String(space.id)}"]`
      );
      const tag = item ? item.querySelector(".space-availability-tag") : null;
      if (tag) {
        tag.textContent = "— / —";
        tag.style.color = "";
        tag.style.backgroundColor = "";
        tag.style.borderColor = "";
      }
      try {
        const summary = await loadCoworkingDeskSummary(space.id, date);
        if (!summary || coworkingDeskSummaryRequestId !== currentRequestId) {
          return;
        }
        updateCoworkingAvailabilityTag(
          tag,
          summary.occupiedCount,
          summary.totalCount,
          summary.freeCount
        );
      } catch (error) {
        if (tag) {
          tag.textContent = "— / —";
        }
      }
    })
  );
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
  if (!isFloorEditing && space.kind === "meeting" && space.id) {
    openMeetingBookingModal(space);
    return;
  }
  if (!isFloorEditing && space.kind === "coworking" && space.id) {
    const buildingId = currentBuilding?.id;
    const floorLevel = currentFloor?.level;
    if (buildingId && Number.isFinite(floorLevel)) {
      void navigateTo(
        `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(
          floorLevel
        )}/spaces/${encodeURIComponent(space.id)}`
      );
      return;
    }
    void navigateTo(`/buildings/${encodeURIComponent(buildingId || "")}`);
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

const renderFloorSpacesList = (spaces) => {
  if (!floorSpacesList || !floorSpacesEmpty) {
    return;
  }
  if (!isFloorEditing) {
    restoreAddSpaceBtnHome();
  }
  const spacesToRender = Array.isArray(spaces) ? spaces : [];
  floorSpacesList.replaceChildren();
  const sortByName = (left, right) =>
    (left?.name || "").localeCompare(right?.name || "", "ru", { sensitivity: "base" });
  const createKindHeading = (kindGroup) => {
      const heading = document.createElement("div");
      heading.className = "space-kind-heading";
      const label = document.createElement("span");
      label.className = "space-kind-label";
      label.textContent = spaceKindPluralLabels[kindGroup] || "Без типов";
      heading.appendChild(label);
      const actions = [];
      if (kindGroup === "meeting" && !isFloorEditing) {
        const searchButton = document.createElement("button");
        searchButton.type = "button";
        searchButton.className = "icon-button meeting-search-btn";
        searchButton.setAttribute("aria-label", "Найти свободную переговорку");
        searchButton.title = "Найти свободную переговорку";
        searchButton.textContent = "🔍";
        searchButton.addEventListener("click", () => {
          openMeetingSearchModal();
        });
        actions.push(searchButton);
      }
      if (isFloorEditing && addSpaceBtn) {
        actions.push(addSpaceBtn);
      }
      if (actions.length) {
        heading.classList.add("has-action");
        const actionsWrap = document.createElement("div");
        actionsWrap.className = "space-kind-actions";
        actions.forEach((action) => actionsWrap.appendChild(action));
        heading.appendChild(actionsWrap);
      }
      floorSpacesList.appendChild(heading);
  };
  if (spacesToRender.length === 0) {
    const hasAnySpaces = currentSpaces.length > 0;
    floorSpacesEmpty.textContent = hasAnySpaces
      ? "Пространств этого типа пока нет."
      : "Пространств пока нет.";
    floorSpacesEmpty.classList.remove("is-hidden");
    if (isFloorEditing) {
      createKindHeading(normalizeSpaceKindFilter(currentSpaceKindFilter));
    }
    updateFloorPlanSpacesVisibility();
    return;
  }
  floorSpacesEmpty.classList.add("is-hidden");
  const createSpaceListItem = (space, indentLevel = 0) => {
    const item = document.createElement("div");
    item.className = "space-list-item";
    if (indentLevel > 0) {
      item.classList.add(`subdivision-level-${indentLevel}`);
    }
    item.dataset.spaceId = space.id ? String(space.id) : "";
    item.dataset.spaceName = space.name || "";
    item.dataset.spaceKind = space.kind || "";

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

    if (space.kind === "coworking") {
      const availabilityTag = document.createElement("span");
      availabilityTag.className = "space-availability-tag pill number-pill";
      availabilityTag.textContent = "— / —";
      selectButton.appendChild(availabilityTag);
    }

    let capacityTag = null;
    if (space.kind === "meeting") {
      const capacityValue = Number(space.capacity);
      if (Number.isFinite(capacityValue) && capacityValue > 0) {
        capacityTag = document.createElement("span");
        capacityTag.className = "space-capacity-tag pill number-pill";
        capacityTag.textContent = String(capacityValue);
      }
    }
    if (space.kind === "meeting" && capacityTag) {
      selectButton.appendChild(capacityTag);
    }

    if (space.kind === "coworking" && space.id) {
      attachRoutePrefetchHandlers(selectButton, () => {
        prefetchSpaceRouteData({
          buildingId: currentBuilding?.id,
          floorId: currentFloor?.id,
          spaceId: space.id,
        });
      });
    }

    const canEdit = canManageSpaceResources(getUserInfo(), space);
    const editButton = canEdit ? document.createElement("button") : null;
    if (editButton) {
      editButton.type = "button";
      editButton.className = "space-edit-button";
      editButton.setAttribute("aria-label", "Редактировать пространство");
      editButton.textContent = "✏";
    }

    selectButton.addEventListener("click", () => selectSpaceFromList(space));
    if (editButton) {
      editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openSpaceModal(space);
      });
    }
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
    if (editButton) {
      item.appendChild(editButton);
    }
    return item;
  };
  const getSubdivisionPath = (space) => {
    const level1 = (space?.subdivision_level_1 || "").trim();
    const level2 = (space?.subdivision_level_2 || "").trim();
    if (!level1 && !level2) {
      return ["Общие"];
    }
    const path = [];
    if (level1) {
      path.push(level1);
    } else if (level2) {
      path.push("Общие");
    }
    if (level2) {
      path.push(level2);
    }
    return path;
  };
  const buildSubdivisionTree = (spacesToGroup) => {
    const root = new Map();
    spacesToGroup.forEach((space) => {
      const path = getSubdivisionPath(space);
      let currentNode = root;
      path.forEach((label, index) => {
        if (!currentNode.has(label)) {
          currentNode.set(label, { children: new Map(), spaces: [] });
        }
        const node = currentNode.get(label);
        if (index === path.length - 1) {
          node.spaces.push(space);
        }
        currentNode = node.children;
      });
    });
    return root;
  };
  const getHoverLabelKey = (space) =>
    space?.id ? `id:${space.id}` : `name:${space?.name || ""}`;
  const updateHoverLabelPosition = (label, polygon) => {
    if (!floorPlanPreview || !label || !polygon) {
      return;
    }
    const screenPoint = getPolygonTopScreenPoint(polygon);
    if (!screenPoint) {
      return;
    }
    const rect = floorPlanPreview.getBoundingClientRect();
    label.style.left = `${screenPoint.x - rect.left}px`;
    label.style.top = `${screenPoint.y - rect.top}px`;
  };
  const ensureHoverSpaceLabel = (space, polygon) => {
    if (!floorPlanPreview || !space?.name || !polygon) {
      return;
    }
    const key = getHoverLabelKey(space);
    if (hoverSpaceLabels.has(key)) {
      return;
    }
    const label = document.createElement("div");
    label.className = "space-tooltip space-tooltip--static";
    label.textContent = space.name;
    floorPlanPreview.appendChild(label);
    updateHoverLabelPosition(label, polygon);
    hoverSpaceLabels.set(key, { label, polygon });
  };
  const removeHoverSpaceLabel = (space) => {
    const key = getHoverLabelKey(space);
    const entry = hoverSpaceLabels.get(key);
    if (!entry) {
      return;
    }
    entry.label.remove();
    hoverSpaceLabels.delete(key);
  };
  const showHoverSpaceLabels = (spaces) => {
    spaces.forEach((space) => {
      const polygon = findSpacePolygon(space);
      if (!polygon) {
        return;
      }
      ensureHoverSpaceLabel(space, polygon);
    });
  };
  const hideHoverSpaceLabels = (spaces) => {
    spaces.forEach((space) => {
      removeHoverSpaceLabel(space);
    });
  };
  const collectSubdivisionSpaces = (node) => {
    const collected = [...node.spaces];
    node.children.forEach((childNode) => {
      collected.push(...collectSubdivisionSpaces(childNode));
    });
    return collected;
  };
  const setSubdivisionHoverState = (spaces, shouldHover) => {
    spaces.forEach((space) => {
      const polygon = findSpacePolygon(space);
      if (!polygon) {
        return;
      }
      polygon.classList.toggle("is-hover", shouldHover);
      if (shouldHover) {
        updateSpaceTooltipPosition(polygon);
      } else if (spaceTooltipState.polygon === polygon) {
        hideSpaceTooltip();
      }
    });
    if (shouldHover) {
      showHoverSpaceLabels(spaces);
    } else {
      hideHoverSpaceLabels(spaces);
    }
  };
  const renderSubdivisionTree = (tree, depth = 0) => {
    const labels = Array.from(tree.keys()).sort((left, right) => {
      if (left === "Общие") {
        return right === "Общие" ? 0 : -1;
      }
      if (right === "Общие") {
        return 1;
      }
      return left.localeCompare(right, "ru");
    });
    labels.forEach((label) => {
      const node = tree.get(label);
      const groupSpaces = collectSubdivisionSpaces(node);
      const heading = document.createElement("div");
      heading.className = "space-subdivision-heading";
      heading.textContent = label;
      heading.classList.add(`subdivision-level-${depth + 1}`);
      heading.addEventListener("mouseenter", () => {
        setSubdivisionHoverState(groupSpaces, true);
      });
      heading.addEventListener("mouseleave", () => {
        setSubdivisionHoverState(groupSpaces, false);
      });
      floorSpacesList.appendChild(heading);
      node.spaces.sort(sortByName).forEach((space) => {
        floorSpacesList.appendChild(createSpaceListItem(space, depth + 1));
      });
      renderSubdivisionTree(node.children, depth + 1);
    });
  };

  const coworkingSpaces = spacesToRender.filter((space) => space?.kind === "coworking");
  const meetingSpaces = spacesToRender.filter((space) => space?.kind === "meeting");
  const otherSpaces = spacesToRender.filter(
    (space) => space?.kind !== "coworking" && space?.kind !== "meeting"
  );

  if (coworkingSpaces.length > 0) {
    createKindHeading("coworking");
    const tree = buildSubdivisionTree(coworkingSpaces);
    renderSubdivisionTree(tree);
  }
  if (meetingSpaces.length > 0) {
    createKindHeading("meeting");
    meetingSpaces.sort(sortByName).forEach((space) => {
      floorSpacesList.appendChild(createSpaceListItem(space));
    });
  }
  if (otherSpaces.length > 0) {
    const kinds = Array.from(
      new Set(otherSpaces.map((space) => (space?.kind ? space.kind : "")))
    ).filter((kind) => kind);
    kinds.forEach((kind) => {
      createKindHeading(kind);
      otherSpaces
        .filter((space) => space.kind === kind)
        .sort(sortByName)
        .forEach((space) => {
          floorSpacesList.appendChild(createSpaceListItem(space));
        });
    });
  }

  if (spaceEditState.selectedPolygon) {
  highlightSpaceListItem(
    spaceEditState.selectedPolygon.getAttribute("data-space-name") || "",
    spaceEditState.selectedPolygon.getAttribute("data-space-id") || null
  );
  }
  void refreshCoworkingAvailability(spacesToRender);
  if (meetingSearchModal && meetingSearchModal.classList.contains("is-open")) {
    void loadAvailableMeetingRooms();
  }
  updateFloorPlanSpacesVisibility();
};

const normalizeSpaceKindFilter = (kind) =>
  kind === "coworking" || kind === "meeting" ? kind : defaultSpaceKind;

const getVisibleSpaces = (spaces) => {
  if (!Array.isArray(spaces)) {
    return [];
  }
  const filter = normalizeSpaceKindFilter(currentSpaceKindFilter);
  return spaces.filter((space) => space?.kind === filter);
};

const updateSpaceKindFilterControls = () => {
  if (!spaceKindFilterButtons.length) {
    return;
  }
  const filter = normalizeSpaceKindFilter(currentSpaceKindFilter);
  spaceKindFilterButtons.forEach((button) => {
    const kind = button.dataset.spaceKindFilter || "";
    const isActive = kind === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const updateSpaceKindFilterPlacement = () => {
  if (!spaceKindFilter || !spaceKindFilterSlot || !spaceKindFilterHome?.parent) {
    return;
  }
  if (isFloorEditing) {
    if (spaceKindFilter.parentElement !== spaceKindFilterHome.parent) {
      if (spaceKindFilterHome.nextSibling) {
        spaceKindFilterHome.parent.insertBefore(spaceKindFilter, spaceKindFilterHome.nextSibling);
      } else {
        spaceKindFilterHome.parent.appendChild(spaceKindFilter);
      }
    }
  } else if (spaceKindFilter.parentElement !== spaceKindFilterSlot) {
    spaceKindFilterSlot.appendChild(spaceKindFilter);
  }
};

const restoreAddSpaceBtnHome = () => {
  if (!addSpaceBtn || !addSpaceBtnHome?.parent) {
    return;
  }
  if (addSpaceBtn.parentElement === addSpaceBtnHome.parent) {
    return;
  }
  if (
    addSpaceBtnHome.nextSibling &&
    addSpaceBtnHome.nextSibling.parentElement === addSpaceBtnHome.parent
  ) {
    addSpaceBtnHome.parent.insertBefore(addSpaceBtn, addSpaceBtnHome.nextSibling);
  } else {
    addSpaceBtnHome.parent.appendChild(addSpaceBtn);
  }
};

const placeAddSpaceBtnNextToKindLabel = () => {
  if (!addSpaceBtn || !floorSpacesList) {
    return;
  }
  const heading = floorSpacesList.querySelector(".space-kind-heading");
  if (!heading) {
    return;
  }
  let actions = heading.querySelector(".space-kind-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "space-kind-actions";
    heading.classList.add("has-action");
    heading.appendChild(actions);
  }
  if (!actions.contains(addSpaceBtn)) {
    actions.insertBefore(addSpaceBtn, actions.firstChild);
  }
};

const applySpaceKindFilter = ({ syncPolygons = true, persistMissing = false } = {}) => {
  visibleSpaces = getVisibleSpaces(currentSpaces);
  renderFloorSpacesList(visibleSpaces);
  if (syncPolygons && lassoState.svg && lassoState.spacesLayer) {
    const spacesToSync = lassoState.active ? currentSpaces : visibleSpaces;
    void syncSpacePolygons(Array.isArray(spacesToSync) ? spacesToSync : [], { persistMissing });
  }
  if (spaceEditState.selectedPolygon) {
    const selectedKind = spaceEditState.selectedPolygon.getAttribute("data-space-kind") || "";
    const activeKind = normalizeSpaceKindFilter(currentSpaceKindFilter);
    if (selectedKind && selectedKind !== activeKind) {
      clearSpaceSelection();
    }
  }
};

const setSpaceKindFilter = (kind) => {
  const normalized = normalizeSpaceKindFilter(kind);
  if (normalized === currentSpaceKindFilter) {
    return;
  }
  currentSpaceKindFilter = normalized;
  updateSpaceKindFilterControls();
  applySpaceKindFilter();
};

const renderFloorSpaces = (spaces) => {
  currentSpaces = Array.isArray(spaces) ? spaces : [];
  updateSpaceKindFilterControls();
  applySpaceKindFilter({ syncPolygons: false });
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
  spaceDesksList.replaceChildren();
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

    const canEdit = canManageSpaceResources(getUserInfo(), currentSpace);
    const editButton = canEdit ? document.createElement("button") : null;
    if (editButton) {
      editButton.type = "button";
      editButton.className = "space-edit-button";
      editButton.setAttribute("aria-label", "Редактировать стол");
      editButton.textContent = "✏";
    }

    selectButton.addEventListener("click", () => selectDeskFromList(desk));
    if (editButton) {
      editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openDeskModal(desk);
      });
    }

    item.appendChild(selectButton);
    if (editButton) {
      item.appendChild(editButton);
    }
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
  hoverSpaceLabels.forEach((entry) => {
    entry.label.remove();
  });
  hoverSpaceLabels.clear();

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
  if (!isFloorEditing && spaceKind === "meeting" && spaceId) {
    const space =
      currentSpaces.find((item) => String(item.id) === String(spaceId)) || {
        id: Number(spaceId),
        name: polygon.getAttribute("data-space-name") || "Переговорная",
        kind: "meeting",
      };
    openMeetingBookingModal(space);
    return;
  }
  if (!isFloorEditing && spaceKind === "coworking" && spaceId) {
    const buildingId = currentBuilding?.id;
    const floorLevel = currentFloor?.level;
    if (buildingId && Number.isFinite(floorLevel)) {
      void navigateTo(
        `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(
          floorLevel
        )}/spaces/${encodeURIComponent(spaceId)}`
      );
      return;
    }
    void navigateTo(`/buildings/${encodeURIComponent(buildingId || "")}`);
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

const findSpacePolygonFromEvent = (event, { allowHitTestFallback = true } = {}) => {
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
  if (allowHitTestFallback && typeof event.clientX === "number" && typeof event.clientY === "number") {
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
  const polygon = findSpacePolygonFromEvent(event, { allowHitTestFallback: false });
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
    !(spaceModal && spaceModal.classList.contains("is-open")) &&
    !(deskModal && deskModal.classList.contains("is-open")) &&
    !(spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) &&
    !(meetingBookingModal && meetingBookingModal.classList.contains("is-open")) &&
    !(meetingSearchModal && meetingSearchModal.classList.contains("is-open"))
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
  updateSpaceKindFilterPlacement();
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
  if (editing && !canManageFloorResources(getUserInfo(), currentFloor)) {
    showTopAlert("Недостаточно прав для редактирования этажей.", "error");
    return;
  }
  isFloorEditing = editing;
  document.body.classList.toggle("floor-editing", editing);
  if (floorPlanLayout) {
    floorPlanLayout.classList.toggle("is-editing", editing);
  }
  if (headerActions) {
    headerActions.classList.toggle("floor-edit-actions", editing);
  }
  updateSpaceKindFilterPlacement();
  updateFloorPlanSpacesVisibility();
  applySpaceKindFilter({ syncPolygons: false });
  if (editing) {
    placeAddSpaceBtnNextToKindLabel();
  } else {
    restoreAddSpaceBtnHome();
  }
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
  const canEdit = Boolean(
    currentSpace &&
      currentSpace.kind === "coworking" &&
      canManageSpaceResources(getUserInfo(), currentSpace)
  );
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
  if (editing && !canManageSpaceResources(getUserInfo(), currentSpace)) {
    showTopAlert("Недостаточно прав для редактирования коворкингов.", "error");
    return;
  }
  isSpaceEditing = editing;
  document.body.classList.toggle("space-editing", editing);
  if (spaceLayout) {
    spaceLayout.classList.toggle("is-editing", editing);
  }
  if (spaceDesksPanel) {
    spaceDesksPanel.setAttribute("aria-hidden", String(!editing));
  }
  if (spaceBookingPanel) {
    spaceBookingPanel.classList.toggle("is-hidden", editing);
    spaceBookingPanel.setAttribute("aria-hidden", String(editing));
  }
  if (spaceSnapshot) {
    spaceSnapshot.classList.toggle("is-editing", editing);
    spaceSnapshot.classList.toggle("is-booking", !editing);
    spaceSnapshot.classList.toggle(
      "can-manage-bookings",
      !editing && canBookForOthers()
    );
  }
  if (spaceSnapshotToggleBtn) {
    const canToggleSnapshot = Boolean(
      currentSpace &&
        currentSpace.kind === "coworking" &&
        canManageSpaceResources(getUserInfo(), currentSpace)
    );
    const shouldHideSnapshotToggle = !editing || !canToggleSnapshot;
    spaceSnapshotToggleBtn.classList.toggle("is-hidden", shouldHideSnapshotToggle);
    spaceSnapshotToggleBtn.setAttribute("aria-hidden", String(shouldHideSnapshotToggle));
  }
  if (addDeskBtn) {
    const canEdit = Boolean(
      currentSpace &&
        currentSpace.kind === "coworking" &&
        canManageSpaceResources(getUserInfo(), currentSpace)
    );
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
    if (bookingState.selectedDate) {
      renderDatePicker();
    }
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

const getDeskRotation = (desk) => {
  const rotation = Number(desk?.rotation);
  return Number.isFinite(rotation) ? rotation : 0;
};

const getRotatedDeskHalfExtents = (width, height, rotationDeg = 0) => {
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    halfWidth: (width * cos + height * sin) / 2,
    halfHeight: (width * sin + height * cos) / 2,
  };
};

/**
 * Check if two oriented (rotated) rectangles overlap using the Separating Axis Theorem (SAT).
 * Each rect is { cx, cy, hw, hh, rotation } where hw/hh are half-width/half-height
 * and rotation is in degrees.
 */
const doOBBsOverlap = (a, b) => {
  const aRad = (a.rotation * Math.PI) / 180;
  const bRad = (b.rotation * Math.PI) / 180;

  // Local axes for rectangle A
  const axA = Math.cos(aRad);
  const ayA = Math.sin(aRad);
  const bxA = -Math.sin(aRad);
  const byA = Math.cos(aRad);

  // Local axes for rectangle B
  const axB = Math.cos(bRad);
  const ayB = Math.sin(bRad);
  const bxB = -Math.sin(bRad);
  const byB = Math.cos(bRad);

  // Vector from center A to center B
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;

  // We test 4 separating axes: 2 from A's edges, 2 from B's edges.
  // For each axis, project the distance and half-extents and check for gap.
  const axes = [
    { x: axA, y: ayA }, // A's local X axis (width direction)
    { x: bxA, y: byA }, // A's local Y axis (height direction)
    { x: axB, y: ayB }, // B's local X axis
    { x: bxB, y: byB }, // B's local Y axis
  ];

  for (const axis of axes) {
    // Project center-to-center distance onto axis
    const dist = Math.abs(dx * axis.x + dy * axis.y);

    // Project half-extents of A onto axis
    const projA =
      a.hw * Math.abs(axA * axis.x + ayA * axis.y) +
      a.hh * Math.abs(bxA * axis.x + byA * axis.y);

    // Project half-extents of B onto axis
    const projB =
      b.hw * Math.abs(axB * axis.x + ayB * axis.y) +
      b.hh * Math.abs(bxB * axis.x + byB * axis.y);

    if (dist >= projA + projB) {
      return false; // Found a separating axis → no overlap
    }
  }

  return true; // No separating axis found → overlap
};

/**
 * Constrain desk movement so it never overlaps other desks.
 * Uses axis decomposition so the desk can slide smoothly along edges:
 * when the diagonal from→to is blocked, X and Y are resolved independently.
 * Both orderings (X-then-Y and Y-then-X) are tried; the one that reaches
 * closer to the target wins.
 */
const constrainDeskMovement = (fromX, fromY, toX, toY, width, height, rotationDeg, excludeDeskId) => {
  const isFree = (x, y) => isDeskAreaFree(x, y, width, height, excludeDeskId, rotationDeg);

  // Fast path: target is free — no collision at all
  if (isFree(toX, toY)) {
    return { x: toX, y: toY };
  }

  // If current position already overlaps (shouldn't happen, but be safe), allow move
  if (!isFree(fromX, fromY)) {
    return { x: toX, y: toY };
  }

  // Binary search helper: finds max t in [0,1] where testFn(t) returns true
  const bsearch = (testFn) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      if (testFn(mid)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lo;
  };

  const dx = toX - fromX;
  const dy = toY - fromY;

  // Option A: slide X first (at current Y), then resolve Y
  const tXa = bsearch((t) => isFree(fromX + dx * t, fromY));
  const xA = fromX + dx * tXa;
  const tYa = bsearch((t) => isFree(xA, fromY + dy * t));
  const yA = fromY + dy * tYa;

  // Option B: slide Y first (at current X), then resolve X
  const tYb = bsearch((t) => isFree(fromX, fromY + dy * t));
  const yB = fromY + dy * tYb;
  const tXb = bsearch((t) => isFree(fromX + dx * t, yB));
  const xB = fromX + dx * tXb;

  // Pick whichever result gets closer to the target
  const distA = (xA - toX) ** 2 + (yA - toY) ** 2;
  const distB = (xB - toX) ** 2 + (yB - toY) ** 2;

  return distA <= distB ? { x: xA, y: yA } : { x: xB, y: yB };
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

/**
 * Snap desk center to magnetic lines aligned with each nearby desk's rotated axes.
 * For each other desk, computes snap lines along its local width/height axes
 * (through its center and edges), then checks if the dragged desk's center or
 * projected edges align with those lines.  Picks the smallest correction, and
 * optionally combines a second perpendicular correction for corner alignment.
 */
const snapDeskCenter = (rawX, rawY, desk, metrics) => {
  const tolerance = getDeskSnapTolerance(metrics);
  const snapTol = Math.max(tolerance.x, tolerance.y);

  if (currentDesks.length <= 1) {
    return { x: rawX, y: rawY };
  }

  const dimensions = getDeskDimensions(desk);
  const dragRotation = getDeskRotation(desk);
  const dragHW = dimensions.width / 2;
  const dragHH = dimensions.height / 2;

  // Collect all snap correction candidates.
  // Each: { dx, dy, dist, dirX, dirY }
  //   dx/dy  – correction vector in global coords
  //   dist   – perpendicular distance (lower = closer to the snap line)
  //   dirX/dirY – unit direction of the correction (perpendicular to the snap line)
  const candidates = [];

  currentDesks.forEach((other) => {
    if (!other || String(other.id) === String(desk.id)) {
      return;
    }
    if (!Number.isFinite(other?.x) || !Number.isFinite(other?.y)) {
      return;
    }

    const otherDim = getDeskDimensions(other);
    const otherRot = getDeskRotation(other);
    const otherHW = otherDim.width / 2;
    const otherHH = otherDim.height / 2;
    const rad = (otherRot * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // Transform dragged desk center into other desk's local frame
    const dxG = rawX - other.x;
    const dyG = rawY - other.y;
    const localX = dxG * cosR + dyG * sinR;
    const localY = -dxG * sinR + dyG * cosR;

    // Projected half-extents of dragged desk onto other desk's local axes
    const relRad = ((dragRotation - otherRot) * Math.PI) / 180;
    const cosRel = Math.abs(Math.cos(relRad));
    const sinRel = Math.abs(Math.sin(relRad));
    const projHW = dragHW * cosRel + dragHH * sinRel;
    const projHH = dragHW * sinRel + dragHH * cosRel;

    // --- Snap along other's u-axis (width direction) ---
    // Correction moves the dragged desk along u = (cosR, sinR)
    // Snap lines at: other center, other left edge, other right edge
    const uLines = [0, -otherHW, otherHW];
    // Dragged offsets along u: center, projected left edge, projected right edge
    const uOffsets = [0, -projHW, projHW];

    uLines.forEach((linePos) => {
      uOffsets.forEach((offset) => {
        const target = linePos - offset;
        const delta = Math.abs(localX - target);
        if (delta <= snapTol) {
          const correction = target - localX;
          candidates.push({
            dx: correction * cosR,
            dy: correction * sinR,
            dist: delta,
            dirX: cosR,
            dirY: sinR,
          });
        }
      });
    });

    // --- Snap along other's v-axis (height direction) ---
    // Correction moves the dragged desk along v = (-sinR, cosR)
    const vLines = [0, -otherHH, otherHH];
    const vOffsets = [0, -projHH, projHH];

    vLines.forEach((linePos) => {
      vOffsets.forEach((offset) => {
        const target = linePos - offset;
        const delta = Math.abs(localY - target);
        if (delta <= snapTol) {
          const correction = target - localY;
          candidates.push({
            dx: correction * (-sinR),
            dy: correction * cosR,
            dist: delta,
            dirX: -sinR,
            dirY: cosR,
          });
        }
      });
    });
  });

  if (candidates.length === 0) {
    return { x: rawX, y: rawY };
  }

  // Sort by distance (smallest first)
  candidates.sort((a, b) => a.dist - b.dist);

  // Apply the best (closest) correction
  const best = candidates[0];
  let resultX = rawX + best.dx;
  let resultY = rawY + best.dy;

  // Try to combine with a second correction whose direction is perpendicular
  // to the first one (enables snapping on two axes simultaneously for corner alignment).
  for (let i = 1; i < candidates.length; i++) {
    const second = candidates[i];
    const dot = Math.abs(best.dirX * second.dirX + best.dirY * second.dirY);
    if (dot < 0.15) {
      // Nearly perpendicular — safe to combine
      resultX += second.dx;
      resultY += second.dy;
      break;
    }
  }

  return { x: resultX, y: resultY };
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

const isTempDeskId = (deskId) => String(deskId).startsWith(TEMP_DESK_PREFIX);

const createTempDeskId = () => `${TEMP_DESK_PREFIX}${Date.now()}-${tempDeskSequence++}`;

const getSelectedDeskIds = () => Array.from(deskEditState.selectedDeskIds || []);

const isDeskSelected = (deskId) =>
  deskEditState.selectedDeskIds ? deskEditState.selectedDeskIds.has(String(deskId)) : false;

const getSelectedDesks = () => getSelectedDeskIds().map(findDeskById).filter(Boolean);

const getDeskRect = (desk) => {
  const dimensions = getDeskDimensions(desk);
  const rotation = getDeskRotation(desk);
  const { halfWidth, halfHeight } = getRotatedDeskHalfExtents(
    dimensions.width,
    dimensions.height,
    rotation
  );
  return {
    left: desk.x - halfWidth,
    right: desk.x + halfWidth,
    top: desk.y - halfHeight,
    bottom: desk.y + halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
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
  const rotation = getDeskRotation(desk);
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
    const tspans = label.querySelectorAll("tspan");
    if (tspans.length > 0) {
      tspans.forEach((tspan) => {
        tspan.setAttribute("x", String(desk.x));
      });
    }
  }
  const rotator = group.querySelector(".space-desk-rotator") || group;
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
  rotator.setAttribute("transform", `rotate(${rotation} ${desk.x} ${desk.y})`);
};

const getDeskRotationRadians = (desk) => (getDeskRotation(desk) * Math.PI) / 180;

const clampDeskPosition = (x, y, metrics, rotationDeg = 0) => {
  if (!metrics?.viewBox && !currentSpaceBounds) {
    return { x, y };
  }
  const bounds = currentSpaceBounds || metrics.viewBox;
  if (!bounds) {
    return { x, y };
  }
  const { halfWidth, halfHeight } = getRotatedDeskHalfExtents(
    metrics.width,
    metrics.height,
    rotationDeg
  );
  let minX = bounds.minX + halfWidth;
  let maxX = bounds.minX + bounds.width - halfWidth;
  let minY = bounds.minY + halfHeight;
  let maxY = bounds.minY + bounds.height - halfHeight;
  if (minX > maxX) {
    minX = bounds.minX + bounds.width / 2;
    maxX = minX;
  }
  if (minY > maxY) {
    minY = bounds.minY + bounds.height / 2;
    maxY = minY;
  }
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
};

const clampDeskCenterToBounds = (x, y, width, height, bounds, rotationDeg = 0) => {
  if (!bounds) {
    return { x, y };
  }
  const { halfWidth, halfHeight } = getRotatedDeskHalfExtents(width, height, rotationDeg);
  let minX = bounds.minX + halfWidth;
  let maxX = bounds.minX + bounds.width - halfWidth;
  let minY = bounds.minY + halfHeight;
  let maxY = bounds.minY + bounds.height - halfHeight;
  if (minX > maxX) {
    minX = bounds.minX + bounds.width / 2;
    maxX = minX;
  }
  if (minY > maxY) {
    minY = bounds.minY + bounds.height / 2;
    maxY = minY;
  }
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
  const clamped = clampDeskCenterToBounds(x, y, width, height, bounds, getDeskRotation(desk));
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
          currentDesks[index] = mergeDeskBookingState(updated, currentDesks[index]);
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
  const clamped = clampDeskPosition(desk.x, desk.y, metrics, getDeskRotation(desk));
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
  overlay.replaceChildren();
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
  layer.replaceChildren();
  const metrics = getDeskMetrics(svg, null);
  const selectedIds = getSelectedDeskIds();
  const hasSingleSelection = selectedIds.length === 1;
  const hasMultipleSelection = selectedIds.length > 1;
  desks.forEach((desk) => {
    if (!Number.isFinite(desk?.x) || !Number.isFinite(desk?.y)) {
      return;
    }
    const deskMetrics = getDeskMetrics(svg, desk);
    const rotation = getDeskRotation(desk);
    const deskId = String(desk.id);
    const isDeskActionLoading = deskBookingActionsInFlight.has(deskId);
    const group = document.createElementNS(svgNamespace, "g");
    group.classList.add("space-desk");
    group.setAttribute("data-desk-id", deskId);
    group.classList.toggle("is-selected", isDeskSelected(desk.id));
    group.classList.toggle("is-loading", isDeskActionLoading);
    if (desk.bookingStatus === "booked") {
      group.classList.add("is-booked");
    } else if (desk.bookingStatus === "my") {
      group.classList.add("is-my-booking");
    }
    const rotator = document.createElementNS(svgNamespace, "g");
    rotator.classList.add("space-desk-rotator");

    const shape = document.createElementNS(svgNamespace, "rect");
    shape.classList.add("space-desk-shape");
    shape.setAttribute("x", String(desk.x - deskMetrics.width / 2));
    shape.setAttribute("y", String(desk.y - deskMetrics.height / 2));
    shape.setAttribute("width", String(deskMetrics.width));
    shape.setAttribute("height", String(deskMetrics.height));
    shape.setAttribute("rx", String(Math.min(deskMetrics.width, deskMetrics.height) * 0.1));

    const label = document.createElementNS(svgNamespace, "text");
    label.classList.add("space-desk-label");
    setDeskLabelContent(label, desk);
    label.setAttribute("x", String(desk.x));
    label.setAttribute("y", String(desk.y));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("transform", `rotate(${-rotation} ${desk.x} ${desk.y})`);

    const dotsY = desk.y;
    const loadingDots = document.createElementNS(svgNamespace, "g");
    loadingDots.classList.add("space-desk-loading-dots");
    loadingDots.setAttribute("transform", `rotate(${-rotation} ${desk.x} ${desk.y})`);
    [-8, 0, 8].forEach((offset, index) => {
      const dot = document.createElementNS(svgNamespace, "circle");
      dot.classList.add("space-desk-loading-dot", `dot-${index + 1}`);
      dot.setAttribute("cx", String(desk.x + offset));
      dot.setAttribute("cy", String(dotsY));
      dot.setAttribute("r", "2.5");
      loadingDots.appendChild(dot);
    });

    const title = document.createElementNS(svgNamespace, "title");
    if (isDeskActionLoading) {
      title.textContent = "Обновляем бронирование...";
    } else if (desk.bookingStatus === "booked") {
      title.textContent = `Занято: ${desk.bookingUserName || "сотрудник"}`;
    } else if (desk.bookingStatus === "my") {
      title.textContent = "Ваше место";
    } else {
      title.textContent = "Свободно. Нажмите для бронирования";
    }

    group.appendChild(title);
    rotator.appendChild(shape);
    rotator.appendChild(label);
    rotator.appendChild(loadingDots);
    rotator.setAttribute("transform", `rotate(${rotation} ${desk.x} ${desk.y})`);
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
          deskEditState.transformStartRotation = getDeskRotation(desk);
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
        deskEditState.transformStartRotation = getDeskRotation(desk);
        deskEditState.startX = desk.x;
        deskEditState.startY = desk.y;
        if (rotateHandle.setPointerCapture) {
          rotateHandle.setPointerCapture(event.pointerId);
        }
      });
      rotateHandle.addEventListener("pointerup", handleDeskPointerEnd);
      rotateHandle.addEventListener("pointercancel", handleDeskPointerEnd);

      handles.appendChild(rotateHandle);
      rotator.appendChild(handles);
    }
    group.appendChild(rotator);
    group.addEventListener("pointerdown", (event) => {
      if (!isSpaceEditing) {
        startDeskLongPress(desk, event);
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
      deskEditState.transformStartRotation = getDeskRotation(desk);
      group.classList.add("is-dragging");
      }
      if (group.setPointerCapture) {
        group.setPointerCapture(event.pointerId);
      }
    });
    group.addEventListener("pointerup", handleDeskPointerEnd);
    group.addEventListener("pointercancel", handleDeskPointerEnd);
    group.addEventListener("click", (event) => {
      if (isSpaceEditing) {
        return;
      }
      if (bookingState.longPressTriggered) {
        bookingState.longPressTriggered = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void handleDeskBookingClick(desk);
    });
    layer.appendChild(group);
  });
  renderGroupSelectionOverlay();
};

const getSpaceDesksFingerprintKey = (spaceId, date) =>
  `${Number(spaceId) || 0}:${normalizeBookingDate(date || "") || ""}`;

const buildSpaceDesksFingerprint = (desks = []) => {
  if (!Array.isArray(desks) || desks.length === 0) {
    return "";
  }
  return desks
    .map((desk) =>
      [
        String(desk?.id || ""),
        String(desk?.updated_at ?? desk?.updatedAt ?? ""),
        String(desk?.label || ""),
        String(Number.isFinite(desk?.x) ? desk.x : ""),
        String(Number.isFinite(desk?.y) ? desk.y : ""),
        String(Number.isFinite(desk?.width) ? desk.width : ""),
        String(Number.isFinite(desk?.height) ? desk.height : ""),
        String(Number.isFinite(desk?.rotation) ? desk.rotation : ""),
        String(desk?.bookingStatus || ""),
        String(desk?.bookingUserKey || ""),
        String(desk?.bookingTenantEmployeeID || ""),
      ].join("::")
    )
    .join("|");
};

const refreshDeskCollectionsView = () => {
  if (!updateDeskBookingIndicators(currentDesks)) {
    renderSpaceDesks(currentDesks);
  }
  renderSpaceDeskList(currentDesks);
  renderSpaceAttendeesList(currentDesks);
};

const setDeskBookingInFlight = (deskId, inFlight) => {
  const normalizedDeskId = String(Number(deskId));
  if (!normalizedDeskId || normalizedDeskId === "NaN") {
    return;
  }
  if (inFlight) {
    deskBookingActionsInFlight.add(normalizedDeskId);
  } else {
    deskBookingActionsInFlight.delete(normalizedDeskId);
  }
  if (!updateDeskBookingIndicators(currentDesks)) {
    renderSpaceDesks(currentDesks);
  }
};

const loadSpaceDesks = async (
  spaceId,
  { skipIfUnchanged = false, showSnapshotLoading = false } = {}
) => {
  let shouldHideSnapshotLoadingInFinally = Boolean(showSnapshotLoading);
  if (showSnapshotLoading) {
    setSpaceSnapshotLoading(true);
  }
  try {
    if (!spaceId) {
      currentDesks = [];
      pendingDeskUpdates = new Map();
      pendingDeskCreates = new Map();
      pendingDeskDeletes = new Set();
      setSelectedDesk(null);
      renderSpaceDesks([]);
      renderSpaceDeskList([]);
      renderSpaceAttendeesList([]);
      return;
    }
    const normalizedDate = normalizeBookingDate(bookingState.selectedDate);
    const dateParam = normalizedDate ? `?date=${encodeURIComponent(normalizedDate)}` : "";
    const requestToken = ++latestSpaceDesksRequestToken;
    const response = await loadApiResponse(`/api/spaces/${spaceId}/desks${dateParam}`);
    if (requestToken !== latestSpaceDesksRequestToken) {
      return;
    }
    const rawDesks = Array.isArray(response?.items) ? response.items : [];
    const normalized = normalizeDesksForCurrentSpace(rawDesks);
    normalized.desks.forEach((desk) => {
      applyDeskBookingPayload(desk);
    });
    const fingerprintKey = getSpaceDesksFingerprintKey(spaceId, normalizedDate);
    const nextFingerprint = buildSpaceDesksFingerprint(normalized.desks);
    const previousFingerprint = spaceDesksRenderFingerprint.get(fingerprintKey) || "";
    const shouldSkipRender =
      skipIfUnchanged &&
      previousFingerprint !== "" &&
      nextFingerprint === previousFingerprint &&
      normalized.updates.length === 0;
    if (showSnapshotLoading) {
      // Hide loading before applying fresh desks to avoid shimmer over rendered data.
      setSpaceSnapshotLoading(false);
      shouldHideSnapshotLoadingInFinally = false;
    }
    syncBookingsFromDesks(normalized.desks);
    currentDesks = normalized.desks;
    pendingDeskUpdates = new Map();
    pendingDeskCreates = new Map();
    pendingDeskDeletes = new Set();
    setSelectedDesk(null);
    if (!shouldSkipRender) {
      refreshDeskCollectionsView();
    }
    spaceDesksRenderFingerprint.set(fingerprintKey, nextFingerprint);
    if (normalized.updates.length > 0) {
      await persistDeskNormalizationUpdates(normalized.updates);
    }
  } finally {
    if (shouldHideSnapshotLoadingInFinally) {
      setSpaceSnapshotLoading(false);
    }
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

const isDeskAreaFree = (x, y, width, height, excludeDeskId = null, rotationDeg = 0) => {
  const shouldExclude = (deskId) => {
    if (!excludeDeskId) {
      return false;
    }
    if (excludeDeskId instanceof Set) {
      return excludeDeskId.has(String(deskId));
    }
    return String(deskId) === String(excludeDeskId);
  };
  const candidateOBB = {
    cx: x,
    cy: y,
    hw: width / 2,
    hh: height / 2,
    rotation: rotationDeg,
  };
  return !currentDesks.some((desk) => {
    if (shouldExclude(desk?.id)) {
      return false;
    }
    if (!Number.isFinite(desk?.x) || !Number.isFinite(desk?.y)) {
      return false;
    }
    const dimensions = getDeskDimensions(desk);
    const deskRotation = getDeskRotation(desk);
    const existingOBB = {
      cx: desk.x,
      cy: desk.y,
      hw: dimensions.width / 2,
      hh: dimensions.height / 2,
      rotation: deskRotation,
    };
    return doOBBsOverlap(candidateOBB, existingOBB);
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
    const rotation = Number.isFinite(desk.rotation) ? desk.rotation : 0;
    if (!isDeskAreaFree(x, y, width, height, null, rotation)) {
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
          excludeDeskIds,
          getDeskRotation(desk)
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
  const clamped = clampDeskCenterToBounds(position.x, position.y, width, height, bounds, 0);
  if (addDeskBtn) {
    addDeskBtn.disabled = true;
  }
  const label = getNextDeskLabel(currentDesks);
  addLocalDesk({
    space_id: currentSpace.id,
    label,
    x: clamped.x,
    y: clamped.y,
    width,
    height,
    rotation: 0,
  });
  if (addDeskBtn) {
    addDeskBtn.disabled = false;
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

  if (pasteDeskBtn) {
    pasteDeskBtn.disabled = true;
  }
  let workingDesks = currentDesks.slice();
  const created = group.desks.map((desk) => {
    const label = getNextDeskLabel(workingDesks);
    workingDesks = [{ label }, ...workingDesks];
    const x = position.x + desk.dx;
    const y = position.y + desk.dy;
    return addLocalDesk(
      {
        space_id: currentSpace.id,
        label,
        x,
        y,
        width: desk.width,
        height: desk.height,
        rotation: desk.rotation,
      },
      { select: false }
    );
  });
  if (created.length > 0) {
    setSelectedDesk(created[0].id);
    for (let i = 1; i < created.length; i += 1) {
      setSelectedDesk(created[i].id, { additive: true });
    }
  }
  if (pasteDeskBtn) {
    pasteDeskBtn.disabled = false;
  }
  updateDeskClipboardButtons();
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
    const clamped = clampDeskPosition(point.x, point.y, metrics, 0);
  if (addDeskBtn) {
    addDeskBtn.disabled = true;
  }
  const label = getNextDeskLabel(currentDesks);
  addLocalDesk({
    space_id: currentSpace.id,
    label,
    x: clamped.x,
    y: clamped.y,
    width: deskPixelWidth,
    height: deskPixelHeight,
    rotation: 0,
  });
  setSpacePageStatus("Стол добавлен.", "success");
  if (addDeskBtn) {
    addDeskBtn.disabled = false;
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
      const clamped = clampDeskPosition(desk.x, desk.y, deskMetrics, desk.rotation);
      desk.x = clamped.x;
      desk.y = clamped.y;
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
  const clamped = clampDeskPosition(snapped.x, snapped.y, metrics, getDeskRotation(desk));
  const deskDimensions = getDeskDimensions(desk);
  const deskRotation = getDeskRotation(desk);
  const constrained = constrainDeskMovement(
    desk.x,
    desk.y,
    clamped.x,
    clamped.y,
    deskDimensions.width,
    deskDimensions.height,
    deskRotation,
    String(desk.id)
  );
  updateDeskPositionLocal(deskEditState.draggingDeskId, constrained.x, constrained.y);
  const moved =
    Math.abs(constrained.x - deskEditState.startX) > 0.5 || Math.abs(constrained.y - deskEditState.startY) > 0.5;
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
    if (!isDeskAreaFree(
      desk.x,
      desk.y,
      dimensions.width,
      dimensions.height,
      excludeIds,
      getDeskRotation(desk)
    )) {
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
  if (isSpaceEditing) {
    desks.forEach((desk) => {
      queueDeskUpdate(desk.id, { x: desk.x, y: desk.y });
    });
  } else {
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
            currentDesks[index] = mergeDeskBookingState(updated, currentDesks[index]);
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
        const merged = { ...currentDesks[index], ...updated };
        currentDesks[index] = mergeDeskBookingState(merged, currentDesks[index]);
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

const addLocalDesk = (payload, { select = true } = {}) => {
  const tempId = createTempDeskId();
  const desk = { id: tempId, ...payload };
  pendingDeskCreates.set(String(tempId), { ...payload });
  currentDesks = [desk, ...currentDesks];
  renderSpaceDesks(currentDesks);
  renderSpaceDeskList(currentDesks);
  if (select) {
    setSelectedDesk(tempId);
  }
  return desk;
};

const queueDeskUpdate = (deskId, payload) => {
  if (!deskId) {
    return;
  }
  const deskKey = String(deskId);
  if (pendingDeskCreates.has(deskKey)) {
    const existing = pendingDeskCreates.get(deskKey) || {};
    pendingDeskCreates.set(deskKey, { ...existing, ...payload });
    return;
  }
  if (isTempDeskId(deskKey)) {
    return;
  }
  const existing = pendingDeskUpdates.get(deskKey) || {};
  pendingDeskUpdates.set(deskKey, { ...existing, ...payload });
};

const flushPendingDeskChanges = async () => {
  const hasCreates = pendingDeskCreates.size > 0;
  const hasUpdates = pendingDeskUpdates.size > 0;
  const hasDeletes = pendingDeskDeletes.size > 0;
  if (!hasCreates && !hasUpdates && !hasDeletes) {
    return;
  }
  if (hasCreates) {
    const items = Array.from(pendingDeskCreates.values());
    if (items.length > 0) {
      await apiRequest("/api/desks/bulk", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
    }
    pendingDeskCreates.clear();
  }
  if (hasUpdates) {
    const entries = Array.from(pendingDeskUpdates.entries());
    for (const [deskId, payload] of entries) {
      if (pendingDeskDeletes.has(String(deskId))) {
        pendingDeskUpdates.delete(deskId);
        continue;
      }
      if (isTempDeskId(deskId)) {
        pendingDeskUpdates.delete(deskId);
        continue;
      }
      const updated = await apiRequest(`/api/desks/${deskId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (updated) {
        const index = currentDesks.findIndex((item) => String(item.id) === String(deskId));
        if (index >= 0) {
          const merged = { ...currentDesks[index], ...updated };
          currentDesks[index] = mergeDeskBookingState(merged, currentDesks[index]);
        }
      }
      pendingDeskUpdates.delete(deskId);
    }
    renderSpaceDesks(currentDesks);
  }
  if (hasDeletes) {
    const ids = Array.from(pendingDeskDeletes)
      .map((value) => Number(value))
      .filter(Number.isFinite);
    if (ids.length > 0) {
      await apiRequest("/api/desks/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      });
    }
    pendingDeskDeletes.clear();
  }
  if (currentSpace?.id && (hasCreates || hasDeletes)) {
    await loadSpaceDesks(currentSpace.id);
  }
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
  const previousRotation = getDeskRotation(desk);
  const previousX = desk.x;
  const previousY = desk.y;
  const baseRotation = getDeskRotation(desk);
  const nextRotation = (baseRotation + deskRotateStep) % 360;
  desk.rotation = nextRotation;
  const svg = getSnapshotSvg();
  if (svg) {
    const metrics = getDeskMetrics(svg, desk);
    const clamped = clampDeskPosition(desk.x, desk.y, metrics, desk.rotation);
    desk.x = clamped.x;
    desk.y = clamped.y;
  }
  renderSpaceDesks(currentDesks);
  setSelectedDesk(deskId);
  const payload = { rotation: nextRotation };
  if (desk.x !== previousX) {
    payload.x = desk.x;
  }
  if (desk.y !== previousY) {
    payload.y = desk.y;
  }
  queueDeskUpdate(deskId, payload);
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
  // Release previous blob URL to free memory.
  if (floorPlanRasterBlobUrl) {
    URL.revokeObjectURL(floorPlanRasterBlobUrl);
    floorPlanRasterBlobUrl = null;
  }
  floorPlanEmbeddedRasterTemplate = null;
  floorPlanCanvas.replaceChildren();
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
  const parsedSvgDoc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const parsedSvg = parsedSvgDoc.documentElement;
  if (parsedSvg && parsedSvg.tagName === "svg") {
    floorPlanCanvas.appendChild(document.adoptNode(parsedSvg));
  }
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

    // ── Performance: move heavy raster <image> out of SVG to a native <img>.
    // Native <img> composites on the GPU (like a photo viewer), while SVG
    // <image> goes through the slow SVG rendering pipeline on every frame.
    const embeddedImage = svg.querySelector("image[href^='data:']")
      || svg.querySelector("image[xlink\\:href^='data:']");
    if (embeddedImage) {
      floorPlanEmbeddedRasterTemplate = embeddedImage.cloneNode(true);
      const imgSrc =
        embeddedImage.getAttribute("href") || embeddedImage.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (imgSrc) {
        embeddedImage.remove();
        // Convert data: URL to a Blob URL — browser keeps decoded pixels in memory
        // instead of re-parsing the multi-MB base64 string on every composite.
        let effectiveSrc = imgSrc;
        try {
          const commaIdx = imgSrc.indexOf(",");
          if (commaIdx > 0) {
            const meta = imgSrc.substring(0, commaIdx); // e.g. "data:image/jpeg;base64"
            const mimeMatch = meta.match(/data:([^;,]+)/);
            const mime = mimeMatch ? mimeMatch[1] : "image/png";
            const b64 = imgSrc.substring(commaIdx + 1);
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
              bytes[i] = bin.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mime });
            floorPlanRasterBlobUrl = URL.createObjectURL(blob);
            effectiveSrc = floorPlanRasterBlobUrl;
          }
        } catch {
          // Fallback to the original data URL if conversion fails.
          effectiveSrc = imgSrc;
        }
        const nativeImg = document.createElement("img");
        nativeImg.className = "floor-plan-raster";
        nativeImg.src = effectiveSrc;
        nativeImg.draggable = false;
        nativeImg.alt = "";
        // Insert the native image before the SVG so SVG overlay sits on top.
        floorPlanCanvas.insertBefore(nativeImg, svg);
        // Make the SVG background transparent so the native image shows through.
        svg.style.position = "absolute";
        svg.style.inset = "0";
        svg.style.background = "transparent";
      }
    }

    ensureSpaceLayers(svg);
    bindSpaceInteractions(svg);
  }
  resetFloorPlanTransform();
  updateSpaceListColors();
  if (currentSpaces.length > 0) {
    void syncSpacePolygons(visibleSpaces, { persistMissing: true });
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
      floorsFields.classList.remove("is-hidden");
    }
    if (buildingUndergroundFloorsInput) {
      buildingUndergroundFloorsInput.disabled = false;
    }
    if (buildingAbovegroundFloorsInput) {
      buildingAbovegroundFloorsInput.disabled = false;
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
  if (!buildingsGrid) {
    return;
  }
  buildingsGrid.replaceChildren();
  if (emptyState) {
    emptyState.style.display = buildings.length === 0 ? "block" : "none";
  }
  buildings.forEach((building) => {
    const buildingId = Number(building?.id);
    const buildingTargetId = Number.isFinite(buildingId) ? buildingId : building?.id;
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "building-tile";
    tile.style.setProperty("--tile-image", `url("${getBuildingImageUrl(building)}")`);
    const name = document.createElement("strong");
    name.textContent = building.name;
    tile.append(name);
    attachRoutePrefetchHandlers(tile, () => {
      prefetchBuildingRouteData(buildingId);
    });
    tile.addEventListener("click", () => {
      if (!requireActiveSession("Сессия завершена. Войдите снова, чтобы открыть здание.")) {
        return;
      }
      clearStatus();
      void navigateTo(`/buildings/${encodeURIComponent(buildingTargetId || "")}`);
    });
    buildingsGrid.appendChild(tile);
  });
  if (openAddModalBtn) {
    const isHidden = openAddModalBtn.classList.contains("is-hidden");
    openAddModalBtn.className = `building-tile building-tile-add${isHidden ? " is-hidden" : ""}`;
    openAddModalBtn.type = "button";
    openAddModalBtn.setAttribute("aria-label", "Добавить здание");
    openAddModalBtn.setAttribute("title", "Добавить здание");
    openAddModalBtn.replaceChildren();
    const icon = document.createElement("span");
    icon.className = "building-tile-icon";
    icon.textContent = "+";
    openAddModalBtn.append(icon);
    buildingsGrid.appendChild(openAddModalBtn);
  }
};

const setPageMode = (mode) => {
  if (!buildingsPage || !buildingPage) {
    return;
  }
  const user = getUserInfo();
  const canEdit = canManageOfficeResources(user);
  const canEditBuilding = canManageBuildingResources(user, currentBuilding);
  const canEditSpace = canManageActiveSpaceResources(getUserInfo());
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
      editBuildingBtn.classList.toggle("is-hidden", !canEditBuilding);
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
    placeHeaderActions(buildingBreadcrumbActions);
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
      editFloorBtn.classList.toggle("is-hidden", !canManageFloorResources(user, currentFloor));
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
    placeHeaderActions(floorBreadcrumbActions);
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
      editSpaceBtn.classList.toggle("is-hidden", !canEditSpace);
    }
    if (pageTitle) {
      pageTitle.textContent = "Пространство";
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = "Просмотр коворкинга.";
    }
    placeHeaderActions(spaceBreadcrumbActions);
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
  openAddModalBtn.classList.toggle("is-hidden", !canEdit);
  if (editBuildingBtn) {
    editBuildingBtn.classList.add("is-hidden");
  }
  if (editFloorBtn) {
    editFloorBtn.classList.add("is-hidden");
  }
  if (editSpaceBtn) {
    editSpaceBtn.classList.add("is-hidden");
  }
  if (pageTitle) {
    pageTitle.textContent = "Офисные здания";
  }
  if (pageSubtitle) {
    pageSubtitle.textContent = "Выберите здание из списка.";
  }
  placeHeaderActions(null);
};

const renderFloors = (floors) => {
  if (!floorsList || !floorsEmpty) {
    return;
  }
  floorsList.replaceChildren();
  if (!floors || floors.length === 0) {
    floorsList.classList.add("is-hidden");
    floorsEmpty.classList.remove("is-hidden");
    return;
  }
  floorsList.classList.remove("is-hidden");
  floorsEmpty.classList.add("is-hidden");
  const user = getUserInfo();
  floors.forEach((floor) => {
    const card = document.createElement("div");
    card.className = "floor-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const header = document.createElement("div");
    header.className = "floor-header";

    const title = document.createElement("div");
    title.className = "floor-title";
    title.textContent = floor.name;

    const badge = document.createElement("span");
    badge.className = "badge pill number-pill";
    badge.textContent = `Этаж ${floor.level}`;

    const actions = document.createElement("div");
    actions.className = "floor-actions";
    actions.appendChild(badge);
    if (canManageFloorResources(user, floor)) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-button floor-edit-btn";
      editBtn.setAttribute("aria-label", "Редактировать этаж");
      editBtn.title = "Редактировать этаж";
      editBtn.textContent = "✎";
      editBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openFloorInfoModal(floor);
      });
      actions.appendChild(editBtn);
    }

    header.append(title, actions);

    const meta = document.createElement("div");
    meta.className = "floor-meta";
    const spacesCount = Number.isFinite(floor.spaces_count) ? floor.spaces_count : 0;
    meta.textContent = `Пространств: ${spacesCount}`;

    card.append(header, meta);
    if (currentBuilding) {
      const buildingId = Number(currentBuilding.id);
      attachRoutePrefetchHandlers(card, () => {
        prefetchFloorRouteData({ buildingId, floorId: floor.id });
      });
      const navigateToFloor = () => {
        clearBuildingStatus();
        void navigateTo(
          `/buildings/${encodeURIComponent(currentBuilding.id)}/floors/${encodeURIComponent(
            floor.level
          )}`
        );
      };
      card.addEventListener("click", navigateToFloor);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateToFloor();
        }
      });
    }
    floorsList.appendChild(card);
  });
};

const resetForm = (mode = "create") => {
  buildingNameInput.value = "";
  buildingAddressInput.value = "";
  if (buildingTimezoneInput) {
    buildingTimezoneInput.value = defaultBuildingTimezone;
  }
  if (buildingUndergroundFloorsInput) {
    buildingUndergroundFloorsInput.value = "0";
  }
  if (buildingAbovegroundFloorsInput) {
    buildingAbovegroundFloorsInput.value = "0";
  }
  if (buildingImageInput) {
    buildingImageInput.value = "";
  }
  if (buildingResponsibleField) {
    buildingResponsibleField.value = "";
  }
  editingId = null;
  removeImage = false;
  setFormMode(mode);
};

const getFloorCounts = (floors = []) => {
  let underground = 0;
  let aboveground = 0;
  floors.forEach((floor) => {
    const level = Number(floor?.level);
    if (!Number.isFinite(level)) {
      return;
    }
    if (level < 0) {
      underground += 1;
    } else if (level > 0) {
      aboveground += 1;
    }
  });
  return { underground, aboveground };
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

const openEditModal = async () => {
  if (!currentBuilding) {
    setStatus("Не удалось определить здание для редактирования.", "error");
    return;
  }
  clearStatus();
  buildingNameInput.value = currentBuilding.name || "";
  buildingAddressInput.value = currentBuilding.address || "";
  if (buildingTimezoneInput) {
    buildingTimezoneInput.value = currentBuilding.timezone || defaultBuildingTimezone;
  }
  if (buildingUndergroundFloorsInput || buildingAbovegroundFloorsInput) {
    try {
      const floorsResponse = await apiRequest(`/api/buildings/${currentBuilding.id}/floors`);
      const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
      const { underground, aboveground } = getFloorCounts(floors);
      if (buildingUndergroundFloorsInput) {
        buildingUndergroundFloorsInput.value = String(underground);
      }
      if (buildingAbovegroundFloorsInput) {
        buildingAbovegroundFloorsInput.value = String(aboveground);
      }
    } catch (error) {
      if (buildingUndergroundFloorsInput) {
        buildingUndergroundFloorsInput.value = "0";
      }
      if (buildingAbovegroundFloorsInput) {
        buildingAbovegroundFloorsInput.value = "0";
      }
      setStatus(error.message, "error");
    }
  }
  editingId = currentBuilding.id;
  removeImage = false;
  const responsibleEmployeeID = getBuildingResponsibleEmployeeId(currentBuilding);
  updateBuildingResponsibleVisibility(getUserInfo());
  await populateBuildingResponsibleOptions(responsibleEmployeeID);
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
    await navigateTo("/buildings");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    if (deleteBuildingBtn) {
      deleteBuildingBtn.disabled = false;
    }
  }
};

const refreshBuildings = async ({ allowPrefetch = false } = {}) => {
  const data = allowPrefetch ? await loadApiResponse("/api/buildings") : await apiRequest("/api/buildings");
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

const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось загрузить изображение."));
    img.src = dataUrl;
  });

const maxFloorPlanUploadBytes = 50 * 1024 * 1024;
const pdfJsWorkerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const maxFloorPlanRasterDimension = 5000;
const maxFloorPlanRasterPixels = 18_000_000;
const pdfBaseDpi = 72;
const floorPlanPdfRasterDpi = 250;

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

const getUtf8ByteLength = (value) => new TextEncoder().encode(String(value || "")).length;

const fitImageToRasterBudget = (rawWidth, rawHeight) => {
  const width = Math.max(1, Math.round(rawWidth || 1));
  const height = Math.max(1, Math.round(rawHeight || 1));
  let scale = 1;
  const maxSide = Math.max(width, height);
  if (maxSide > maxFloorPlanRasterDimension) {
    scale = Math.min(scale, maxFloorPlanRasterDimension / maxSide);
  }
  const pixels = width * height;
  if (pixels > maxFloorPlanRasterPixels) {
    scale = Math.min(scale, Math.sqrt(maxFloorPlanRasterPixels / pixels));
  }
  if (scale >= 1) {
    return { width, height };
  }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const ensureFloorPlanPayloadSize = (svgMarkup) => {
  if (getUtf8ByteLength(svgMarkup) > maxFloorPlanUploadBytes) {
    throw new Error("Размер готовой SVG-схемы превышает 50 МБ.");
  }
};

const getPdfJsLib = () => {
  if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== "function") {
    throw new Error("PDF-конвертер временно недоступен. Перезагрузите страницу и попробуйте снова.");
  }
  if (window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfJsWorkerSrc;
  }
  return window.pdfjsLib;
};

const buildSvgWithImage = (dataUrl, width, height) => {
  const safeDataUrl = dataUrl.replace(/"/g, "&quot;");
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}" ` +
    `preserveAspectRatio="xMidYMid meet">` +
    `<image x="0" y="0" width="${safeWidth}" height="${safeHeight}" ` +
    `image-rendering="optimizeQuality" href="${safeDataUrl}" xlink:href="${safeDataUrl}" />` +
    `</svg>`;
  ensureFloorPlanPayloadSize(svgMarkup);
  return svgMarkup;
};

const rasterFileToSvgMarkup = async (file) => {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);
  const width = Math.max(1, Math.round(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Math.round(image.naturalHeight || image.height || 1));
  return buildSvgWithImage(dataUrl, width, height);
};

const pdfFileToSvgMarkup = async (file) => {
  const pdfLib = getPdfJsLib();
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfLib.getDocument({ data: pdfData });
  const pdfDocument = await loadingTask.promise;
  try {
    const page = await pdfDocument.getPage(1);
    const dpiScale = floorPlanPdfRasterDpi / pdfBaseDpi;
    const baseViewport = page.getViewport({ scale: dpiScale });
    const fittedSize = fitImageToRasterBudget(baseViewport.width, baseViewport.height);
    const budgetScale = Math.max(0.1, fittedSize.width / Math.max(1, baseViewport.width));
    const viewport = page.getViewport({ scale: dpiScale * budgetScale });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Не удалось подготовить PDF для обработки.");
    }
    await page.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;
    const imageDataUrl = canvas.toDataURL("image/png");
    return buildSvgWithImage(imageDataUrl, width, height);
  } finally {
    await pdfDocument.destroy();
  }
};

const fileToSvgMarkup = async (file) => {
  if (!file) {
    throw new Error("Файл не выбран.");
  }
  if (file.size > maxFloorPlanUploadBytes) {
    throw new Error("Размер исходного файла не должен превышать 50 МБ.");
  }
  const lowerName = String(file.name || "").toLowerCase();
  const isSvgFile = file.type === "image/svg+xml" || lowerName.endsWith(".svg");
  const isPdfFile = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  if (isSvgFile) {
    const raw = await readFileAsText(file);
    const normalized = normalizeSvgMarkup(raw.trim());
    if (!normalized) {
      throw new Error("Не удалось прочитать SVG.");
    }
    ensureFloorPlanPayloadSize(normalized);
    return normalized;
  }
  if (isPdfFile) {
    return pdfFileToSvgMarkup(file);
  }
  if (file.type.startsWith("image/")) {
    return rasterFileToSvgMarkup(file);
  }
  throw new Error("Поддерживаются только SVG, PNG/JPG и PDF.");
};

const loadBuildingPage = async (buildingID) => {
  setPageMode("building");
  clearBuildingStatus();
  try {
    // Fetch buildings list and floors in parallel — both only need buildingID.
    const [, floorsResponse] = await Promise.all([
      refreshBuildings({ allowPrefetch: true }),
      loadApiResponse(`/api/buildings/${buildingID}/floors`),
    ]);
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

    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    if (floorsCount) {
      floorsCount.textContent = `${floors.length}`;
    }
    renderFloors(floors);
  } catch (error) {
    setBuildingStatus(error.message, "error");
  }
};

const toComparableValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return "";
  }
};

const buildFloorSpacesFingerprint = (spaces) => {
  if (!Array.isArray(spaces) || spaces.length === 0) {
    return "";
  }
  return spaces
    .map((space) => {
      const id = toComparableValue(space?.id);
      const updatedAt = toComparableValue(space?.updated_at ?? space?.updatedAt);
      const name = toComparableValue(space?.name);
      const kind = toComparableValue(space?.kind);
      const color = toComparableValue(space?.color);
      const points = toComparableValue(space?.points);
      return [id, updatedAt, name, kind, color, points].join("::");
    })
    .join("|");
};

const loadFloorSpaces = async (floorID, { prefetchedResponse = null, skipIfUnchanged = false } = {}) => {
  if (!floorID) {
    renderFloorSpaces([]);
    return;
  }
  try {
    const spacesResponse =
      prefetchedResponse === null
        ? await loadApiResponse(`/api/floors/${floorID}/spaces`)
        : prefetchedResponse;
    const spaces = Array.isArray(spacesResponse.items) ? spacesResponse.items : [];
    const nextFingerprint = buildFloorSpacesFingerprint(spaces);
    const prevFingerprint = floorSpacesRenderFingerprint.get(Number(floorID) || 0) || "";
    if (skipIfUnchanged && nextFingerprint && nextFingerprint === prevFingerprint) {
      return;
    }
    renderFloorSpaces(spaces);
    await syncSpacePolygons(visibleSpaces, { persistMissing: true });
    floorSpacesRenderFingerprint.set(Number(floorID) || 0, nextFingerprint);
  } catch (error) {
    renderFloorSpaces([]);
    setFloorStatus(error.message, "error");
  }
};

const loadFloorPage = async (buildingID, floorNumber) => {
  setPageMode("floor");
  clearFloorStatus();
  const previousFloor = currentFloor;
  const previousFloorPlan = String(previousFloor?.plan_svg || "");
  const previousFloorBuildingId = Number(
    previousFloor?.building_id ?? previousFloor?.buildingId
  );
  const hasWarmFloorState =
    Boolean(previousFloor) &&
    previousFloorBuildingId === Number(buildingID) &&
    Number(previousFloor?.level) === Number(floorNumber) &&
    Boolean(previousFloor?.plan_svg) &&
    Boolean(floorPlanCanvas && floorPlanCanvas.firstElementChild);
  if (!hasWarmFloorState) {
    renderFloorPlan("");
    renderFloorSpaces([]);
    currentFloor = null;
  }
  try {
    // Fetch buildings list and floors in parallel — both only need buildingID.
    const [, floorsResponse] = await Promise.all([
      refreshBuildings({ allowPrefetch: true }),
      loadApiResponse(`/api/buildings/${buildingID}/floors`),
    ]);
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

    const floorSpacesPromise = loadApiResponse(`/api/floors/${floor.id}/spaces`);
    const floorDetails = await loadApiResponse(`/api/floors/${floor.id}`);
    // Some API responses can omit `plan_svg` for constrained contexts; keep warm state instead
    // of wiping the map and snapshot on route transitions.
    const planSvg =
      typeof floorDetails?.plan_svg === "string"
        ? floorDetails.plan_svg
        : typeof floor?.plan_svg === "string"
          ? floor.plan_svg
          : hasWarmFloorState
            ? previousFloorPlan
            : "";
    currentFloor = {
      ...floor,
      plan_svg: planSvg,
      responsible_employee_id:
        floorDetails?.responsible_employee_id || floor?.responsible_employee_id || "",
    };
    applyRoleRestrictions(getUserInfo());
    if (editFloorBtn) {
      editFloorBtn.classList.toggle("is-hidden", !canManageFloorResources(getUserInfo(), currentFloor));
    }
    const shouldRerenderPlan = !hasWarmFloorState || planSvg !== String(previousFloor?.plan_svg || "");
    if (shouldRerenderPlan) {
      renderFloorPlan(planSvg);
    }
    await loadFloorSpaces(floor.id, {
      prefetchedResponse: await floorSpacesPromise,
      skipIfUnchanged: hasWarmFloorState,
    });
  } catch (error) {
    setFloorStatus(error.message, "error");
  }
};

const renderSpaceSnapshot = (space, floorPlanMarkup) => {
  if (!spaceSnapshot || !spaceSnapshotCanvas || !spaceSnapshotPlaceholder) {
    return;
  }
  spaceSnapshotCanvas.replaceChildren();
  const points = normalizeSpacePoints(space?.points);
  currentSpaceBounds = points.length >= 3 ? getSpaceBounds(points) : null;
  const snapshotSvg = buildSpaceSnapshotSvg(
    floorPlanMarkup || "",
    points,
    space?.color || "#60a5fa",
    space?.id || null
  );
  const isSnapshotHidden = Boolean(space?.kind === "coworking" && space?.snapshot_hidden);
  applySpaceSnapshotBackgroundState(isSnapshotHidden);
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

const buildSpaceSnapshotFingerprint = (space, floorPlanMarkup = "") => {
  const points = normalizeSpacePoints(space?.points);
  return [
    String(space?.id || ""),
    String(space?.color || ""),
    String(space?.snapshot_hidden ? "1" : "0"),
    JSON.stringify(points),
    String(floorPlanMarkup || ""),
  ].join("::");
};

const loadSpacePage = async ({ buildingID, floorNumber, spaceId }) => {
  setPageMode("space");
  clearSpacePageStatus();
  setSpaceSnapshotLoading(false);
  const expectedBuildingID = Number(buildingID);
  const expectedFloorNumber = Number(floorNumber);
  const expectedSpaceID = Number(spaceId);
  const isStillOnRequestedSpaceRoute = () => {
    const params = getSpaceParamsFromPath();
    if (!params) {
      return false;
    }
    return (
      Number(params.buildingID) === expectedBuildingID &&
      Number(params.floorNumber) === expectedFloorNumber &&
      Number(params.spaceId) === expectedSpaceID
    );
  };
  const initialBookingDate = getBookingDateFromLocation();
  const previousSpace = currentSpace;
  const previousFloorPlan = String(currentFloor?.plan_svg || "");
  const previousFloorBuildingId = Number(
    currentFloor?.building_id ?? currentFloor?.buildingId
  );
  const canReusePreviousFloorPlan =
    Boolean(currentFloor) &&
    previousFloorBuildingId === Number(buildingID) &&
    Number(currentFloor?.level) === Number(floorNumber) &&
    Boolean(previousFloorPlan);
  const normalizedTargetSpaceId = Number(spaceId);
  const hasWarmSpaceState =
    Boolean(previousSpace) &&
    Number(previousSpace?.id) === normalizedTargetSpaceId &&
    Boolean(getSnapshotSvg());
  let desksLoadPromise = null;
  if (!hasWarmSpaceState) {
    if (spaceSnapshotCanvas) {
      spaceSnapshotCanvas.replaceChildren();
    }
    if (spaceSnapshotPlaceholder) {
      spaceSnapshotPlaceholder.classList.add("is-hidden");
    }
    if (spaceSnapshotToggleBtn) {
      spaceSnapshotToggleBtn.classList.add("is-hidden");
      spaceSnapshotToggleBtn.setAttribute("aria-hidden", "true");
    }
    applySpaceSnapshotBackgroundState(false);
    currentSpace = null;
    currentSpaceBounds = null;
    currentDesks = [];
    pendingDeskUpdates = new Map();
    bookingState.selectedDate = null;
    updateSpaceMapDateTitle(null);
    bookingState.currentMonth = new Date();
    bookingState.bookingsByDeskId = new Map();
    bookingState.myBookings = [];
    bookingState.myMeetingBookings = [];
    bookingState.isMyBookingsLoading = false;
    bookingState.isMyMeetingBookingsLoading = false;
    bookingState.isListOpen = false;
    bookingState.activeBookingsTab = "coworking";
    bookingState.adminBookings = [];
    bookingState.isAdminBookingsOpen = false;
    closeBookingsModal();
    closeAdminBookingsModal();
    if (spaceBookingsToggleBtn) {
      spaceBookingsToggleBtn.textContent = "Мои бронирования";
    }
    if (spaceBookingsList) {
      spaceBookingsList.replaceChildren();
    }
    if (spaceBookingsEmpty) {
      spaceBookingsEmpty.classList.add("is-hidden");
    }
    if (meetingBookingsList) {
      meetingBookingsList.replaceChildren();
    }
    if (meetingBookingsEmpty) {
      meetingBookingsEmpty.classList.add("is-hidden");
    }
    if (adminBookingsList) {
      adminBookingsList.replaceChildren();
    }
    if (adminBookingsEmpty) {
      adminBookingsEmpty.classList.add("is-hidden");
    }
    if (spaceAttendeesList) {
      spaceAttendeesList.replaceChildren();
    }
    if (spaceAttendeesEmpty) {
      spaceAttendeesEmpty.classList.add("is-hidden");
    }
  }
  setSpaceEditMode(false);
  try {
    // Fire all independent requests in parallel — they only need URL params.
    const spacePromise = loadApiResponse(`/api/spaces/${spaceId}`);
    const floorsPromise = loadApiResponse(`/api/buildings/${buildingID}/floors`);
    const buildingPromise = loadApiResponse(`/api/buildings/${buildingID}`);

    // Wait for space first (needed for desks kickoff & kind check).
    const space = await spacePromise;
    if (!isStillOnRequestedSpaceRoute()) {
      return;
    }
    if (!space || !space.id) {
      throw new Error("Пространство не найдено.");
    }
    currentSpace = space;
    if (initialBookingDate) {
      setBookingSelectedDate(initialBookingDate, { reloadDesks: false });
    } else {
      ensureBookingDate({ reloadDesks: false });
    }
    if (space.kind === "coworking") {
      // Start desks request immediately; UI rendering can proceed in parallel.
      desksLoadPromise = loadSpaceDesks(space.id, {
        skipIfUnchanged: hasWarmSpaceState,
        showSnapshotLoading: true,
      });
      // If we already have the same floor plan in memory, render snapshot immediately.
      if (!hasWarmSpaceState && canReusePreviousFloorPlan) {
        renderSpaceSnapshot(space, previousFloorPlan);
      }
    }

    // Wait for floors (need floor.id to fetch floor details).
    const floorsResponse = await floorsPromise;
    if (!isStillOnRequestedSpaceRoute()) {
      return;
    }
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    const floor = floors.find((item) => item.level === floorNumber) || null;
    if (!floor) {
      throw new Error("Этаж не найден.");
    }
    const spaceFloorID = Number(space.floor_id ?? space.floorId);
    const routeFloorID = Number(floor.id);
    if (Number.isFinite(spaceFloorID) && Number.isFinite(routeFloorID) && spaceFloorID !== routeFloorID) {
      const canonicalFloor = await loadApiResponse(`/api/floors/${spaceFloorID}`);
      const canonicalBuildingID = Number(canonicalFloor?.building_id ?? canonicalFloor?.buildingId);
      const canonicalLevel = Number(canonicalFloor?.level);
      if (
        Number.isFinite(canonicalBuildingID) &&
        Number.isFinite(canonicalLevel) &&
        Number.isFinite(Number(space.id))
      ) {
        await navigateTo(
          `/buildings/${encodeURIComponent(canonicalBuildingID)}/floors/${encodeURIComponent(
            canonicalLevel
          )}/spaces/${encodeURIComponent(space.id)}`,
          { replace: true }
        );
        return;
      }
      throw new Error("Коворкинг привязан к другому этажу. Обновите страницу и повторите попытку.");
    }

    // Floor details depends on floor.id; building is already in flight — await both together.
    const [floorDetails, building] = await Promise.all([
      loadApiResponse(`/api/floors/${floor.id}`),
      buildingPromise,
    ]);
    if (!isStillOnRequestedSpaceRoute()) {
      return;
    }
    if (building) {
      currentBuilding = building;
      if (Array.isArray(buildings)) {
        const index = buildings.findIndex((item) => Number(item?.id) === Number(building.id));
        if (index >= 0) {
          buildings[index] = building;
        } else {
          buildings.push(building);
        }
      }
    }
    const resolvedFloorPlanSvg =
      typeof floorDetails?.plan_svg === "string"
        ? floorDetails.plan_svg
        : typeof floor?.plan_svg === "string"
          ? floor.plan_svg
          : canReusePreviousFloorPlan
            ? previousFloorPlan
            : "";
    currentFloor = {
      ...floor,
      plan_svg: resolvedFloorPlanSvg,
      responsible_employee_id:
        floorDetails?.responsible_employee_id || floor?.responsible_employee_id || "",
    };

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
      const subdivisionL1 = (space.subdivision_level_1 || "").trim();
      const subdivisionL2 = (space.subdivision_level_2 || "").trim();
      const parts = [buildingName, floorLabel, subdivisionL1, subdivisionL2].filter(Boolean);
      pageSubtitle.textContent = parts.length > 0 ? parts.join(" · ") : "Просмотр пространства.";
    }

    if (space.kind !== "coworking") {
      if (editSpaceBtn) {
        editSpaceBtn.classList.add("is-hidden");
      }
      if (spaceBookingPanel) {
        spaceBookingPanel.classList.add("is-hidden");
        spaceBookingPanel.setAttribute("aria-hidden", "true");
      }
      setSpacePageStatus("Страница доступна только для коворкингов.", "info");
      if (spaceSnapshotPlaceholder) {
        spaceSnapshotPlaceholder.classList.remove("is-hidden");
      }
      return;
    }

    if (editSpaceBtn) {
      editSpaceBtn.classList.toggle(
        "is-hidden",
        !canManageSpaceResources(getUserInfo(), space)
      );
    }
    if (spaceBookingPanel) {
      spaceBookingPanel.classList.remove("is-hidden");
      spaceBookingPanel.setAttribute("aria-hidden", "false");
    }
    const floorPlanMarkup = resolvedFloorPlanSvg;
    const previousSnapshotFingerprint = buildSpaceSnapshotFingerprint(previousSpace, previousFloorPlan);
    const nextSnapshotFingerprint = buildSpaceSnapshotFingerprint(space, floorPlanMarkup);
    if (!hasWarmSpaceState || previousSnapshotFingerprint !== nextSnapshotFingerprint) {
      renderSpaceSnapshot(space, floorPlanMarkup);
    }
    if (spaceSnapshot) {
      spaceSnapshot.classList.toggle("can-manage-bookings", canBookForOthers());
    }
    await (
      desksLoadPromise ||
      loadSpaceDesks(space.id, {
        skipIfUnchanged: hasWarmSpaceState,
        showSnapshotLoading: true,
      })
    );
    if (!isStillOnRequestedSpaceRoute()) {
      return;
    }
  } catch (error) {
    if (!isStillOnRequestedSpaceRoute()) {
      return;
    }
    setSpacePageStatus(error.message, "error");
    if (spaceSnapshotPlaceholder) {
      spaceSnapshotPlaceholder.classList.remove("is-hidden");
    }
  }
};

buildingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = getUserInfo();
  const canEditExisting = canManageBuildingResources(user, currentBuilding);
  const canCreate = canManageOfficeResources(user);
  clearStatus();
  const name = buildingNameInput.value.trim();
  const address = buildingAddressInput.value.trim();
  const timezone = buildingTimezoneInput
    ? buildingTimezoneInput.value.trim()
    : defaultBuildingTimezone;
  let responsibleEmployeeID = "";
  if (buildingResponsibleField && isAdminRole(user)) {
    const resolvedEmployeeId = resolveResponsibleEmployeeIdFromField(buildingResponsibleField);
    if (resolvedEmployeeId === null) {
      setStatus("Выберите сотрудника из списка или укажите employee id числом.", "error");
      return;
    }
    responsibleEmployeeID = resolvedEmployeeId;
  }
  if (!name || !address) {
    setStatus("Заполните название и адрес здания.", "error");
    return;
  }
  if (!timezone) {
    setStatus("Выберите часовой пояс здания.", "error");
    return;
  }
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

  try {
    let created = false;
    if (editingId) {
      if (!canEditExisting) {
        showTopAlert("Недостаточно прав для редактирования зданий.", "error");
        return;
      }
      const payload = {
        name,
        address,
        timezone,
        underground_floors: undergroundFloors,
        aboveground_floors: abovegroundFloors,
      };
      if (isAdminRole(user)) {
        payload.responsible_employee_id = responsibleEmployeeID;
      }
      await apiRequest(`/api/buildings/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
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
      if (!canCreate) {
        showTopAlert("Недостаточно прав для добавления зданий.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("name", name);
      formData.append("address", address);
      formData.append("timezone", timezone);
      formData.append("underground_floors", String(undergroundFloors));
      formData.append("aboveground_floors", String(abovegroundFloors));
      if (isAdminRole(user) && responsibleEmployeeID) {
        formData.append("responsible_employee_id", responsibleEmployeeID);
      }
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
    if (created) {
      resetForm();
      closeModal();
      setStatus("Здание добавлено.", "success");
    } else {
      const updated = buildings.find((item) => item.id === editingId);
      if (updated) {
        currentBuilding = updated;
      }
      if (currentBuilding) {
        currentBuilding = { ...currentBuilding, name, address, timezone };
        if (isAdminRole(user)) {
          currentBuilding.responsible_employee_id = responsibleEmployeeID;
        }
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
      if (currentBuilding) {
        try {
          const floorsResponse = await apiRequest(`/api/buildings/${currentBuilding.id}/floors`);
          const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
          if (floorsCount) {
            floorsCount.textContent = `${floors.length}`;
          }
          renderFloors(floors);
        } catch (error) {
          setBuildingStatus(error.message, "error");
        }
      }
      closeModal();
      resetForm();
      setBuildingStatus("Здание обновлено.", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

openAddModalBtn.addEventListener("click", () => {
  if (!canManageOfficeResources(getUserInfo())) {
    showTopAlert("Недостаточно прав для добавления зданий.", "error");
    return;
  }
  clearStatus();
  resetForm("create");
  updateBuildingResponsibleVisibility(getUserInfo());
  populateBuildingResponsibleOptions();
  openModal("create");
});

if (editBuildingBtn) {
  editBuildingBtn.addEventListener("click", () => {
    if (!canManageBuildingResources(getUserInfo(), currentBuilding)) {
      showTopAlert("Недостаточно прав для редактирования зданий.", "error");
      return;
    }
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
    if (!canManageOfficeResources(getUserInfo())) {
      showTopAlert("Недостаточно прав для удаления зданий.", "error");
      return;
    }
    deleteCurrentBuilding();
  });
}

if (editFloorBtn) {
  editFloorBtn.addEventListener("click", async () => {
    if (!canManageFloorResources(getUserInfo(), currentFloor)) {
      showTopAlert("Недостаточно прав для редактирования этажей.", "error");
      return;
    }
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
    if (!canManageSpaceResources(getUserInfo(), currentSpace)) {
      showTopAlert("Недостаточно прав для редактирования коворкингов.", "error");
      return;
    }
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
        const hasPendingChanges =
          pendingDeskUpdates.size > 0 || pendingDeskCreates.size > 0 || pendingDeskDeletes.size > 0;
        if (hasPendingChanges) {
          await flushPendingDeskChanges();
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

if (spaceSnapshotToggleBtn) {
  spaceSnapshotToggleBtn.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  spaceSnapshotToggleBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentSpace || !currentSpace.id) {
      return;
    }
    if (currentSpace.kind !== "coworking") {
      setSpacePageStatus("Спрятать снепшот можно только для коворкинга.", "error");
      return;
    }
    if (!isSpaceEditing) {
      setSpacePageStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    const previousHidden = Boolean(currentSpace.snapshot_hidden);
    const nextHidden = !previousHidden;
    applySpaceSnapshotBackgroundState(nextHidden);
    spaceSnapshotToggleBtn.disabled = true;
    try {
      const updated = await apiRequest(`/api/spaces/${currentSpace.id}`, {
        method: "PUT",
        body: JSON.stringify({ snapshot_hidden: nextHidden }),
      });
      currentSpace = {
        ...currentSpace,
        snapshot_hidden: Boolean(updated?.snapshot_hidden ?? nextHidden),
      };
      applySpaceSnapshotBackgroundState(currentSpace.snapshot_hidden);
    } catch (error) {
      currentSpace = { ...currentSpace, snapshot_hidden: previousHidden };
      applySpaceSnapshotBackgroundState(previousHidden);
      setSpacePageStatus(error.message, "error");
    } finally {
      spaceSnapshotToggleBtn.disabled = false;
    }
  });
}

if (addDeskBtn) {
  addDeskBtn.addEventListener("click", () => {
    if (!canManageSpaceResources(getUserInfo(), currentSpace)) {
      showTopAlert("Недостаточно прав для добавления столов.", "error");
      return;
    }
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
    if (!canManageSpaceResources(getUserInfo(), currentSpace)) {
      showTopAlert("Недостаточно прав для удаления столов.", "error");
      return;
    }
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
    const idSet = new Set(selectedIds.map(String));
    const remaining = [];
    currentDesks.forEach((desk) => {
      const deskId = String(desk.id);
      if (!idSet.has(deskId)) {
        remaining.push(desk);
        return;
      }
      if (pendingDeskCreates.has(deskId) || isTempDeskId(deskId)) {
        pendingDeskCreates.delete(deskId);
        return;
      }
      pendingDeskDeletes.add(deskId);
      pendingDeskUpdates.delete(deskId);
    });
    currentDesks = remaining;
    renderSpaceDesks(currentDesks);
    renderSpaceDeskList(currentDesks);
    setSelectedDesk(null);
    setSpacePageStatus(
      selectedIds.length === 1 ? "Стол удален." : "Столы удалены.",
      "success"
    );
    deleteDeskBtn.disabled = false;
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

if (spaceBookingsToggleBtn) {
  spaceBookingsToggleBtn.addEventListener("click", () => {
    clearBookingStatus();
    toggleBookingsList();
  });
}

if (spaceBookingsCancelAllBtn) {
  spaceBookingsCancelAllBtn.addEventListener("click", () => {
    clearBookingStatus();
    if (bookingState.activeBookingsTab === "meeting") {
      void handleCancelAllMyMeetingBookings();
    } else {
      void handleCancelAllBookings();
    }
  });
}

if (bookingsTabCoworking) {
  bookingsTabCoworking.addEventListener("click", () => {
    switchBookingsTab("coworking");
  });
}

if (bookingsTabMeeting) {
  bookingsTabMeeting.addEventListener("click", () => {
    switchBookingsTab("meeting");
  });
}

if (adminBookingsCancelAllBtn) {
  adminBookingsCancelAllBtn.addEventListener("click", () => {
    void handleCancelAllAdminBookings();
  });
}

if (adminBookingsModal) {
  adminBookingsModal.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      closeAdminBookingsModal();
    });
  });
}

if (dbDumpModal) {
  dbDumpModal.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      closeDbDumpModal();
    });
  });
}

if (dbDumpDownloadBtn) {
  dbDumpDownloadBtn.addEventListener("click", () => {
    void handleDownloadDbDump();
  });
}

if (dbDumpUploadBtn && dbDumpUploadInput) {
  dbDumpUploadBtn.addEventListener("click", () => {
    dbDumpUploadInput.click();
  });
  dbDumpUploadInput.addEventListener("change", () => {
    const [file] = dbDumpUploadInput.files || [];
    if (!file) {
      return;
    }
    void handleUploadDbDump(file);
    dbDumpUploadInput.value = "";
  });
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
      setFloorStatus("Выберите SVG, PNG/JPG или PDF-файл с планом.", "error");
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
    if (!canManageFloorResources(getUserInfo(), currentFloor)) {
      showTopAlert("Недостаточно прав для добавления пространств.", "error");
      return;
    }
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
      return;
    }
    clearFloorStatus();
    startLassoMode();
  });
}

if (floorInfoForm) {
  floorInfoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getUserInfo();
    if (!canManageBuildingResources(user, resolveBuildingForFloor(editingFloorInfo))) {
      showTopAlert("Недостаточно прав для редактирования этажей.", "error");
      return;
    }
    if (!editingFloorInfo || !editingFloorInfo.id) {
      setFloorInfoStatus("Сначала выберите этаж.", "error");
      return;
    }
    const name = floorInfoNameField ? floorInfoNameField.value.trim() : "";
    const resolvedEmployeeId = resolveResponsibleEmployeeIdFromField(floorInfoResponsibleField);
    if (resolvedEmployeeId === null) {
      setFloorInfoStatus("Выберите сотрудника из списка или укажите employee id числом.", "error");
      return;
    }
    const responsibleEmployeeID = resolvedEmployeeId;
    if (!name) {
      setFloorInfoStatus("Укажите название этажа.", "error");
      return;
    }
    clearFloorInfoStatus();
    if (floorInfoSaveBtn) {
      floorInfoSaveBtn.disabled = true;
    }
    try {
      await apiRequest(`/api/floors/${editingFloorInfo.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          responsible_employee_id: responsibleEmployeeID,
        }),
      });
      if (currentBuilding?.id) {
        await loadBuildingPage(currentBuilding.id);
      }
      closeFloorInfoModal();
      showTopAlert("Этаж обновлен.", "success");
    } catch (error) {
      setFloorInfoStatus(error.message, "error");
    } finally {
      if (floorInfoSaveBtn) {
        floorInfoSaveBtn.disabled = false;
      }
    }
  });
}

if (floorInfoDeleteBtn) {
  floorInfoDeleteBtn.addEventListener("click", async () => {
    const user = getUserInfo();
    if (!canManageBuildingResources(user, resolveBuildingForFloor(editingFloorInfo))) {
      showTopAlert("Недостаточно прав для удаления этажей.", "error");
      return;
    }
    if (!editingFloorInfo || !editingFloorInfo.id) {
      setFloorInfoStatus("Сначала выберите этаж.", "error");
      return;
    }
    const confirmText =
      "Удалить этаж? Пространства будут удалены, а номера остальных этажей сдвинутся.";
    if (!window.confirm(confirmText)) {
      return;
    }
    clearFloorInfoStatus();
    floorInfoDeleteBtn.disabled = true;
    try {
      await apiRequest(`/api/floors/${editingFloorInfo.id}`, {
        method: "DELETE",
      });
      closeFloorInfoModal();
      if (currentBuilding?.id) {
        await loadBuildingPage(currentBuilding.id);
      }
      showTopAlert("Этаж удален.", "success");
    } catch (error) {
      setFloorInfoStatus(error.message, "error");
    } finally {
      floorInfoDeleteBtn.disabled = false;
    }
  });
}

if (spaceKindFilterButtons.length) {
  spaceKindFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSpaceKindFilter(button.dataset.spaceKindFilter || "");
    });
  });
  updateSpaceKindFilterControls();
}

if (spaceForm) {
  spaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getUserInfo();
    const responsibilityFloor = editingSpace
      ? resolveFloorForSpace(editingSpace)
      : currentFloor;
    const canAssignCoworkingResponsible = canManageFloorResources(user, responsibilityFloor);
    if (editingSpace && editingSpace.id) {
      if (!canManageSpaceResources(user, editingSpace)) {
        showTopAlert("Недостаточно прав для изменения пространств.", "error");
        return;
      }
    } else if (!canManageFloorResources(user, currentFloor)) {
      showTopAlert("Недостаточно прав для изменения пространств.", "error");
      return;
    }
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
      let responsibleEmployeeID = "";
      if (kind === "coworking" && canAssignCoworkingResponsible) {
        const resolvedSpaceId = resolveResponsibleEmployeeIdFromField(spaceResponsibleField);
        if (resolvedSpaceId === null) {
          setSpaceStatus("Выберите сотрудника из списка или укажите employee id числом.", "error");
          return;
        }
        responsibleEmployeeID = resolvedSpaceId;
      }
      let subdivisionLevel1 = spaceSubdivisionLevel1Field
        ? spaceSubdivisionLevel1Field.value.trim()
        : "";
      let subdivisionLevel2 = spaceSubdivisionLevel2Field
        ? spaceSubdivisionLevel2Field.value.trim()
        : "";
      if (kind !== "coworking") {
        subdivisionLevel1 = "";
        subdivisionLevel2 = "";
      }
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
        const payload = {
          name,
          kind,
          capacity: kind === "meeting" ? capacity : 0,
          color,
          subdivision_level_1: subdivisionLevel1,
          subdivision_level_2: subdivisionLevel2,
        };
      if (kind === "coworking" && canAssignCoworkingResponsible) {
          payload.responsible_employee_id = responsibleEmployeeID;
        }
        await apiRequest(`/api/spaces/${editingSpace.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
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
    let responsibleEmployeeID = "";
    if (kind === "coworking" && canAssignCoworkingResponsible) {
      const resolvedSpaceId = resolveResponsibleEmployeeIdFromField(spaceResponsibleField);
      if (resolvedSpaceId === null) {
        setSpaceStatus("Выберите сотрудника из списка или укажите employee id числом.", "error");
        return;
      }
      responsibleEmployeeID = resolvedSpaceId;
    }
    let subdivisionLevel1 = spaceSubdivisionLevel1Field
      ? spaceSubdivisionLevel1Field.value.trim()
      : "";
    let subdivisionLevel2 = spaceSubdivisionLevel2Field
      ? spaceSubdivisionLevel2Field.value.trim()
      : "";
    if (kind !== "coworking") {
      subdivisionLevel1 = "";
      subdivisionLevel2 = "";
    }
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
      const payload = {
        floor_id: currentFloor.id,
        name,
        kind,
        capacity: kind === "meeting" ? capacity : 0,
        color,
        subdivision_level_1: subdivisionLevel1,
        subdivision_level_2: subdivisionLevel2,
        points,
      };
    if (kind === "coworking" && canAssignCoworkingResponsible) {
        payload.responsible_employee_id = responsibleEmployeeID;
      }
      const createdSpace = await apiRequest("/api/spaces", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (createdElements.polygon && createdSpace?.id) {
        createdElements.polygon.setAttribute("data-space-id", String(createdSpace.id));
      }
      const svgMarkup = getCleanFloorPlanMarkup();
      const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
        method: "PUT",
        body: JSON.stringify({ plan_svg: svgMarkup }),
      });
      currentFloor = {
        ...currentFloor,
        plan_svg: updated.plan_svg || svgMarkup,
        responsible_employee_id: currentFloor.responsible_employee_id,
      };
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
    if (!canManageSpaceResources(getUserInfo(), editingSpace)) {
      showTopAlert("Недостаточно прав для удаления пространств.", "error");
      return;
    }
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
    if (!canManageSpaceResources(getUserInfo(), currentSpace)) {
      showTopAlert("Недостаточно прав для изменения столов.", "error");
      return;
    }
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
      if (isSpaceEditing) {
        const nextDesk = { ...editingDesk, label };
        const index = currentDesks.findIndex((desk) => String(desk.id) === String(nextDesk.id));
        if (index >= 0) {
          currentDesks[index] = nextDesk;
        }
        queueDeskUpdate(nextDesk.id, { label });
        renderSpaceDesks(currentDesks);
        renderSpaceDeskList(currentDesks);
        setSelectedDesk(nextDesk.id);
        setSpacePageStatus("Название стола обновлено.", "success");
        closeDeskModal();
        return;
      }
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
  const maxScale = 10;
  spaceSnapshot.addEventListener("wheel", (event) => {
    if (!spaceSnapshotCanvas.firstElementChild) {
      return;
    }
    event.preventDefault();
    const rect = spaceSnapshot.getBoundingClientRect();
    spaceSnapshotState.wheelCursorX = event.clientX - rect.left;
    spaceSnapshotState.wheelCursorY = event.clientY - rect.top;
    // Accumulate wheel input and apply zoom at most once per frame.
    spaceSnapshotState.wheelDeltaY += event.deltaY;
    if (spaceSnapshotState.wheelFrameId !== null) {
      return;
    }
    spaceSnapshotState.wheelFrameId = requestAnimationFrame(() => {
      flushSpaceSnapshotWheelZoom(minScale, maxScale);
    });
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
    markSpaceSnapshotFastTransform();
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
    markSpaceSnapshotFastTransform();
    applySpaceSnapshotTransform();
  };

  spaceSnapshot.addEventListener("pointerup", endSnapshotDrag);
  spaceSnapshot.addEventListener("pointercancel", endSnapshotDrag);
}

if (floorPlanPreview && floorPlanCanvas) {
  const minScale = 0.5;
  const maxScale = 10;
  let floorPlanPreviewRect = null;
  const getFloorPlanPreviewRect = () => {
    if (!floorPlanPreviewRect) {
      floorPlanPreviewRect = floorPlanPreview.getBoundingClientRect();
    }
    return floorPlanPreviewRect;
  };
  // Invalidate cached rect on resize/scroll (infrequent).
  const invalidateFloorPlanRect = () => { floorPlanPreviewRect = null; };
  window.addEventListener("resize", invalidateFloorPlanRect);
  window.addEventListener("scroll", invalidateFloorPlanRect, true);

  floorPlanPreview.addEventListener("wheel", (event) => {
    if (!floorPlanCanvas.firstElementChild) {
      return;
    }
    event.preventDefault();
    const rect = getFloorPlanPreviewRect();
    const canvasOffsetX = floorPlanPreview.clientLeft + floorPlanCanvas.offsetLeft;
    const canvasOffsetY = floorPlanPreview.clientTop + floorPlanCanvas.offsetTop;
    floorPlanState.wheelCursorX = event.clientX - rect.left - canvasOffsetX;
    floorPlanState.wheelCursorY = event.clientY - rect.top - canvasOffsetY;
    // Accumulate wheel input and apply zoom at most once per frame.
    floorPlanState.wheelDeltaY += event.deltaY;
    if (floorPlanState.wheelFrameId !== null) {
      return;
    }
    floorPlanState.wheelFrameId = requestAnimationFrame(() => {
      flushFloorPlanWheelZoom(minScale, maxScale);
    });
  });

  floorPlanPreview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!floorPlanCanvas.firstElementChild) {
      return;
    }
    hideSpaceTooltip();
    event.preventDefault();
    if (lassoState.active) {
      event.preventDefault();
      const point = getSvgPoint(event);
      if (point) {
        const anchor = lassoState.points[lassoState.points.length - 1];
        const nextPoint = event.shiftKey ? getAxisAlignedPoint(point, anchor) : point;
        lassoState.points.push(nextPoint);
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
    if (
      !floorPlanState.isMoving &&
      !floorPlanState.isDragging &&
      !spaceEditState.isDragging &&
      !lassoState.active
    ) {
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
      if (!point) {
        updateLassoPreview(null);
        return;
      }
      const anchor = lassoState.points[lassoState.points.length - 1];
      const previewPoint = event.shiftKey ? getAxisAlignedPoint(point, anchor) : point;
      updateLassoPreview(previewPoint);
      return;
    }
    if (!floorPlanState.isDragging) {
      return;
    }
    floorPlanState.translateX = floorPlanState.dragOriginX + (event.clientX - floorPlanState.dragStartX);
    floorPlanState.translateY = floorPlanState.dragOriginY + (event.clientY - floorPlanState.dragStartY);
    markFloorPlanFastTransform();
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
    markFloorPlanFastTransform();
    applyFloorPlanTransform();
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
  refreshDeskBookingOwnership();

  // Obtain office session before making protected API requests.
  const officeTokenResult = await fetchOfficeToken(token);
  if (!officeTokenResult.success || !getSessionClaims()) {
    setSessionClaims(null);
    if (authGate) {
      showAuthLogin();
      setAuthStep("phone");
      setAuthStatus(officeTokenResult.error || "Не удалось открыть office-сессию.", "error");
    }
    return;
  }

  hideAuthGate();
  setAuthStatus("");
  await bootstrapResponsibilitiesVisibility();
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
    const bookingsButton = profile.querySelector('[data-role="breadcrumb-bookings"]');
    const responsibilitiesButton = profile.querySelector(
      '[data-role="breadcrumb-responsibilities"]'
    );
    const dbDumpButton = profile.querySelector('[data-role="breadcrumb-db-dump"]');
    const logoutButton = profile.querySelector('[data-role="breadcrumb-logout"]');

    if (trigger) {
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleBreadcrumbMenu(profile);
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        closeBreadcrumbMenus();
        const isConfirmed = window.confirm("Выйти из аккаунта?");
        if (!isConfirmed) {
          return;
        }
        const logoutSucceeded = await logoutOfficeSession();
        clearAuthStorage();
        updateAuthUserBlock(null);
        buildings = [];
        currentBuilding = null;
        renderBuildings();
        authSticker = null;
        authTTL = null;
        showAuthLogin();
        setAuthStep("phone");
        if (logoutSucceeded) {
          setAuthStatus("Вы вышли из аккаунта.");
        } else {
          setAuthStatus(
            "Сессию на сервере завершить не удалось. Выполнен локальный выход.",
            "warning"
          );
        }
        // Always redirect — even when the backend logout failed (e.g. CSRF
        // mismatch), we must set the skip-flag and navigate away.  Otherwise
        // a page refresh would restore the session from still-valid HttpOnly
        // cookies and the user would never see the login screen.
        markLogoutRedirect();
        window.location.assign("/buildings");
      });
    }

    if (bookingsButton) {
      bookingsButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeBreadcrumbMenus();
        openBookingsModal();
      });
    }

    if (responsibilitiesButton) {
      responsibilitiesButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeBreadcrumbMenus();
        void openResponsibilitiesModal();
      });
    }

    if (dbDumpButton) {
      dbDumpButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeBreadcrumbMenus();
        openDbDumpModal();
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
    await refreshBuildings({ allowPrefetch: true });
    renderBuildings();
  } catch (error) {
    setStatus(error.message, "error");
  }
};

const applyInitialRouteMode = () => {
  if (getSpaceParamsFromPath()) {
    setPageMode("space");
    return;
  }
  if (getFloorParamsFromPath()) {
    setPageMode("floor");
    return;
  }
  if (getBuildingIdFromPath() !== null) {
    setPageMode("building");
    return;
  }
  setPageMode("list");
};

const rerenderCurrentRoute = async () => {
  if (!appInitialized) {
    return;
  }
  if (routeNavigationInProgress) {
    routeNavigationQueued = true;
    return;
  }
  routeNavigationInProgress = true;
  try {
    do {
      routeNavigationQueued = false;
      await init();
    } while (routeNavigationQueued);
  } finally {
    routeNavigationInProgress = false;
  }
};

const navigateTo = async (targetPath, { replace = false } = {}) => {
  const nextUrl = new URL(targetPath, window.location.origin);
  if (nextUrl.origin !== window.location.origin) {
    window.location.assign(nextUrl.toString());
    return;
  }
  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextPath === currentPath) {
    return;
  }
  if (replace) {
    window.history.replaceState(null, "", nextPath);
  } else {
    window.history.pushState(null, "", nextPath);
  }
  await rerenderCurrentRoute();
};

/** Delegated modal-close handler: maps each .modal element to its close function */
const modalCloseMap = new Map([
  [buildingModal, closeModal],
  [spaceModal, closeSpaceModal],
  [deskModal, closeDeskModal],
  [floorPlanModal, closeFloorPlanModal],
  [floorInfoModal, closeFloorInfoModal],
  [spaceBookingsModal, closeBookingsModal],
  [responsibilitiesModal, closeResponsibilitiesModal],
  [meetingBookingModal, closeMeetingBookingModal],
  [meetingSearchModal, closeMeetingSearchModal],
  [bookForChoiceModal, closeBookForChoiceModal],
  [bookForOtherModal, closeBookForOtherModal],
]);

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.modalClose !== "true") return;
  const modal = target.closest(".modal");
  if (modal && modalCloseMap.has(modal)) {
    modalCloseMap.get(modal)();
  }
});

document.addEventListener("click", (event) => {
  if (!meetingBookingModal || !meetingBookingModal.classList.contains("is-open")) {
    return;
  }
  const tooltip = meetingSlotTooltipState.element;
  if (!tooltip || tooltip.classList.contains("is-hidden")) {
    return;
  }
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (tooltip.contains(target)) {
    return;
  }
  if (target.closest(".meeting-time-slot.is-booked")) {
    return;
  }
  hideMeetingSlotTooltip();
});

if (meetingBookingSubmitBtn) {
  meetingBookingSubmitBtn.addEventListener("click", () => {
    void handleMeetingBookingSubmit();
  });
}
if (meetingBookingCancelBtn) {
  meetingBookingCancelBtn.addEventListener("click", () => {
    void handleCancelMeetingBookings();
  });
}

if (bookForSelfBtn) {
  bookForSelfBtn.addEventListener("click", () => {
    const desk = bookForOtherState.desk;
    closeBookForChoiceModal();
    if (desk) {
      void bookDeskForEmployee(desk);
    }
  });
}

if (bookForOtherBtn) {
  bookForOtherBtn.addEventListener("click", () => {
    const desk = bookForOtherState.desk;
    closeBookForChoiceModal();
    if (desk) {
      openBookForOtherModal(desk);
    }
  });
}

if (bookForGuestBtn) {
  bookForGuestBtn.addEventListener("click", () => {
    if (bookForOtherState.selectedType === "guest") {
      bookForOtherState.selectedType = null;
      bookForGuestBtn.classList.remove("is-selected");
    } else {
      bookForOtherState.selectedType = "guest";
      bookForGuestBtn.classList.add("is-selected");
    }
    if (bookForOtherEmployeeField) {
      bookForOtherEmployeeField.value = "";
      bookForOtherEmployeeField.disabled = bookForOtherState.selectedType === "guest";
    }
    updateBookForOtherSubmitState();
  });
}

if (bookForOtherEmployeeField) {
  const handleBookForOtherEmployeeInput = () => {
    if (bookForOtherState.selectedType === "guest") {
      bookForOtherState.selectedType = null;
      if (bookForGuestBtn) {
        bookForGuestBtn.classList.remove("is-selected");
      }
    }
    if (bookForOtherEmployeeField.value.trim()) {
      bookForOtherState.selectedType = "employee";
    }
    updateBookForOtherSubmitState();
  };
  bookForOtherEmployeeField.addEventListener("input", handleBookForOtherEmployeeInput);
  bookForOtherEmployeeField.addEventListener("change", handleBookForOtherEmployeeInput);
  bookForOtherEmployeeField.addEventListener("focus", handleBookForOtherEmployeeInput);
}

if (bookForOtherEmployeeField && bookForOtherSuggestions) {
  setupResponsibleAutocomplete(bookForOtherEmployeeField, bookForOtherSuggestions);
  bookForOtherSuggestions.addEventListener("mousedown", () => {
    requestAnimationFrame(() => {
      if (bookForOtherEmployeeField.value.trim()) {
        bookForOtherState.selectedType = "employee";
        if (bookForGuestBtn) {
          bookForGuestBtn.classList.remove("is-selected");
        }
        updateBookForOtherSubmitState();
      }
    });
  });
}

if (bookForOtherSubmitBtn) {
  bookForOtherSubmitBtn.addEventListener("click", () => {
    void handleBookForOtherSubmit();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBreadcrumbMenus();
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
      return;
    }
    if (bookForOtherModal && bookForOtherModal.classList.contains("is-open")) {
      closeBookForOtherModal();
      return;
    }
    if (bookForChoiceModal && bookForChoiceModal.classList.contains("is-open")) {
      closeBookForChoiceModal();
      return;
    }
    if (meetingSearchModal && meetingSearchModal.classList.contains("is-open")) {
      closeMeetingSearchModal();
      return;
    }
    if (meetingBookingModal && meetingBookingModal.classList.contains("is-open")) {
      closeMeetingBookingModal();
      return;
    }
    if (adminBookingsModal && adminBookingsModal.classList.contains("is-open")) {
      closeAdminBookingsModal();
      return;
    }
    if (dbDumpModal && dbDumpModal.classList.contains("is-open")) {
      closeDbDumpModal();
      return;
    }
    if (spaceBookingsModal && spaceBookingsModal.classList.contains("is-open")) {
      closeBookingsModal();
      return;
    }
    if (responsibilitiesModal && responsibilitiesModal.classList.contains("is-open")) {
      closeResponsibilitiesModal();
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

if (topAlert) {
  updateTopAlertHeight();
  window.addEventListener("resize", () => {
    updateTopAlertHeight();
  });
}

window.addEventListener("popstate", () => {
  void rerenderCurrentRoute();
});

document.addEventListener("click", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  if (event instanceof MouseEvent && event.button !== 0) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const link = target.closest("a[href]");
  if (!link || link.target === "_blank" || link.hasAttribute("download")) {
    return;
  }
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return;
  }
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/buildings")) {
    return;
  }
  event.preventDefault();
  void navigateTo(`${url.pathname}${url.search}${url.hash}`);
});

applyInitialRouteMode();
initializeAuth();
