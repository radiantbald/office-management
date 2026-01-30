const buildingForm = document.getElementById("buildingForm");
const buildingNameInput = document.getElementById("buildingName");
const buildingAddressInput = document.getElementById("buildingAddress");
const buildingImageInput = document.getElementById("buildingImage");
const submitBtn = document.getElementById("submitBtn");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const editBuildingBtn = document.getElementById("editBuildingBtn");
const editFloorBtn = document.getElementById("editFloorBtn");
const editSpaceBtn = document.getElementById("editSpaceBtn");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewImg = document.getElementById("imagePreviewImg");
const removeImageBtn = document.getElementById("removeImageBtn");
const imageHint = document.getElementById("imageHint");
const buildingModal = document.getElementById("buildingModal");
const headerActions = document.getElementById("headerActions");
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
const spaceCancelBtn = document.getElementById("spaceCancelBtn");
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
const spaceSnapshot = document.getElementById("spaceSnapshot");
const spaceSnapshotPlaceholder = document.getElementById("spaceSnapshotPlaceholder");
const spacePageStatus = document.getElementById("spacePageStatus");
const addDeskBtn = document.getElementById("addDeskBtn");
const deleteDeskBtn = document.getElementById("deleteDeskBtn");
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
const deskEditState = {
  selectedDeskId: null,
  draggingDeskId: null,
  draggingPointerId: null,
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
  hasMoved: false,
  transformMode: null,
  transformPointerId: null,
  transformStartX: 0,
  transformStartY: 0,
  transformStartWidth: 0,
  transformStartHeight: 0,
  transformStartRotation: 0,
};
let hasFloorPlan = false;
let removeImage = false;
let previewObjectUrl = null;
let editingSpace = null;
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
const apiRequest = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    ...options,
    headers,
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

const setSpaceEditMode = (editing) => {
  isSpaceEditing = editing;
  document.body.classList.toggle("space-editing", editing);
  if (spaceSnapshot) {
    spaceSnapshot.classList.toggle("is-editing", editing);
  }
  if (addDeskBtn) {
    const canEdit = Boolean(currentSpace && currentSpace.kind === "coworking");
    addDeskBtn.classList.toggle("is-hidden", !editing || !canEdit);
  }
  if (deleteDeskBtn) {
    deleteDeskBtn.classList.toggle("is-hidden", !editing);
    deleteDeskBtn.disabled = !deskEditState.selectedDeskId;
  }
  if (shrinkDeskBtn) {
    shrinkDeskBtn.classList.toggle("is-hidden", !editing);
    shrinkDeskBtn.disabled = !deskEditState.selectedDeskId;
  }
  if (rotateDeskBtn) {
    rotateDeskBtn.classList.toggle("is-hidden", !editing);
    rotateDeskBtn.disabled = !deskEditState.selectedDeskId;
  }
  if (editSpaceBtn) {
    editSpaceBtn.textContent = editing ? "Сохранить" : "Редактировать";
    editSpaceBtn.classList.toggle("primary", editing);
    editSpaceBtn.classList.toggle("ghost", !editing);
  }
  if (!editing) {
    deskEditState.selectedDeskId = null;
    setDeskPlacementActive(false);
  }
};

const getSnapshotSvg = () => (spaceSnapshot ? spaceSnapshot.querySelector("svg") : null);

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
    width: dimensions.width * scaleX,
    height: dimensions.height * scaleY,
    scaleX,
    scaleY,
    viewBox,
  };
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

const findDeskById = (deskId) =>
  currentDesks.find((desk) => String(desk.id) === String(deskId)) || null;

const setSelectedDesk = (deskId) => {
  deskEditState.selectedDeskId = deskId ? String(deskId) : null;
  const svg = getSnapshotSvg();
  if (svg) {
    svg.querySelectorAll(".space-desk").forEach((group) => {
      const id = group.getAttribute("data-desk-id");
      group.classList.toggle("is-selected", Boolean(deskId && id === String(deskId)));
    });
  }
  if (deleteDeskBtn) {
    deleteDeskBtn.disabled = !deskEditState.selectedDeskId;
  }
  if (shrinkDeskBtn) {
    shrinkDeskBtn.disabled = !deskEditState.selectedDeskId;
  }
  if (rotateDeskBtn) {
    rotateDeskBtn.disabled = !deskEditState.selectedDeskId;
  }
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
  const labelOffset = height / 2 + Math.max(8 * metrics.scaleY, height * 0.2);
  if (rect) {
    rect.setAttribute("x", String(desk.x - width / 2));
    rect.setAttribute("y", String(desk.y - height / 2));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", String(Math.min(width, height) * 0.1));
  }
  if (label) {
    label.setAttribute("x", String(desk.x));
    label.setAttribute("y", String(desk.y - labelOffset));
  }
  const rotation = Number.isFinite(desk.rotation) ? desk.rotation : 0;
  group.setAttribute("transform", `rotate(${rotation} ${desk.x} ${desk.y})`);
};

const getDeskRotationRadians = (desk) =>
  ((Number.isFinite(desk?.rotation) ? desk.rotation : 0) * Math.PI) / 180;

const clampDeskPosition = (x, y, metrics) => {
  if (!metrics?.viewBox) {
    return { x, y };
  }
  const minX = metrics.viewBox.minX + metrics.width / 2;
  const maxX = metrics.viewBox.minX + metrics.viewBox.width - metrics.width / 2;
  const minY = metrics.viewBox.minY + metrics.height / 2;
  const maxY = metrics.viewBox.minY + metrics.viewBox.height - metrics.height / 2;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
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
  desks.forEach((desk) => {
    if (!Number.isFinite(desk?.x) || !Number.isFinite(desk?.y)) {
      return;
    }
    const deskMetrics = getDeskMetrics(svg, desk);
    const labelOffset =
      deskMetrics.height / 2 + Math.max(8 * deskMetrics.scaleY, deskMetrics.height * 0.2);
    const group = document.createElementNS(svgNamespace, "g");
    group.classList.add("space-desk");
    group.setAttribute("data-desk-id", String(desk.id));
    group.classList.toggle("is-selected", String(desk.id) === String(deskEditState.selectedDeskId));

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
    label.setAttribute("y", String(desk.y - labelOffset));
    label.setAttribute("text-anchor", "middle");

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = desk.label || "Стол";

    group.appendChild(title);
    group.appendChild(shape);
    group.appendChild(label);
    const rotation = Number.isFinite(desk.rotation) ? desk.rotation : 0;
    group.setAttribute("transform", `rotate(${rotation} ${desk.x} ${desk.y})`);
    if (isSpaceEditing && String(desk.id) === String(deskEditState.selectedDeskId)) {
      const handles = document.createElementNS(svgNamespace, "g");
      handles.classList.add("desk-handles");

      const handleRadius = 10 * ((deskMetrics.scaleX + deskMetrics.scaleY) / 2);
      const rotateOffset = 26 * ((deskMetrics.scaleX + deskMetrics.scaleY) / 2);

      const resizeHandle = document.createElementNS(svgNamespace, "circle");
      resizeHandle.classList.add("desk-handle", "desk-handle-resize");
      resizeHandle.setAttribute("cx", String(desk.x + deskMetrics.width / 2));
      resizeHandle.setAttribute("cy", String(desk.y + deskMetrics.height / 2));
      resizeHandle.setAttribute("r", String(handleRadius));

      const rotateHandle = document.createElementNS(svgNamespace, "circle");
      rotateHandle.classList.add("desk-handle", "desk-handle-rotate");
      rotateHandle.setAttribute("cx", String(desk.x));
      rotateHandle.setAttribute("cy", String(desk.y - deskMetrics.height / 2 - rotateOffset));
      rotateHandle.setAttribute("r", String(handleRadius));

      resizeHandle.addEventListener("pointerdown", (event) => {
        if (!isSpaceEditing || isDeskPlacementActive) {
          return;
        }
        event.stopPropagation();
        const point = getSnapshotPoint(event, svg);
        if (!point) {
          return;
        }
        setSelectedDesk(desk.id);
        deskEditState.transformMode = "resize";
        deskEditState.transformPointerId = event.pointerId;
        deskEditState.transformStartX = point.x;
        deskEditState.transformStartY = point.y;
        deskEditState.transformStartWidth = desk.width || deskPixelWidth;
        deskEditState.transformStartHeight = desk.height || deskPixelHeight;
        deskEditState.transformStartRotation = desk.rotation || 0;
        if (resizeHandle.setPointerCapture) {
          resizeHandle.setPointerCapture(event.pointerId);
        }
      });

      rotateHandle.addEventListener("pointerdown", (event) => {
        if (!isSpaceEditing || isDeskPlacementActive) {
          return;
        }
        event.stopPropagation();
        const point = getSnapshotPoint(event, svg);
        if (!point) {
          return;
        }
        setSelectedDesk(desk.id);
        deskEditState.transformMode = "rotate";
        deskEditState.transformPointerId = event.pointerId;
        deskEditState.transformStartX = point.x;
        deskEditState.transformStartY = point.y;
        deskEditState.transformStartWidth = desk.width || deskPixelWidth;
        deskEditState.transformStartHeight = desk.height || deskPixelHeight;
        deskEditState.transformStartRotation = desk.rotation || 0;
        if (rotateHandle.setPointerCapture) {
          rotateHandle.setPointerCapture(event.pointerId);
        }
      });

      handles.appendChild(resizeHandle);
      handles.appendChild(rotateHandle);
      group.appendChild(handles);
    }
    group.addEventListener("pointerdown", (event) => {
      if (!isSpaceEditing) {
        return;
      }
      event.stopPropagation();
      setSelectedDesk(desk.id);
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
      if (group.setPointerCapture) {
        group.setPointerCapture(event.pointerId);
      }
    });
    layer.appendChild(group);
  });
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
  currentDesks = Array.isArray(response?.items) ? response.items : [];
  pendingDeskUpdates = new Map();
  setSelectedDesk(null);
  renderSpaceDesks(currentDesks);
};

const getNextDeskLabel = (desks = []) => {
  const fallback = desks.length + 1;
  return `Стол ${fallback}`;
};

const getSnapshotPoint = (event, svg) => {
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
  if (!deskEditState.draggingDeskId || deskEditState.draggingPointerId !== event.pointerId) {
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
  if (deskEditState.transformMode) {
    const desk = findDeskById(deskEditState.selectedDeskId);
    if (!desk) {
      return;
    }
    const metrics = getDeskMetrics(svg, desk);
    if (deskEditState.transformMode === "resize") {
      const dx = point.x - desk.x;
      const dy = point.y - desk.y;
      const rotation = getDeskRotationRadians(desk);
      const localX = dx * Math.cos(rotation) + dy * Math.sin(rotation);
      const localY = -dx * Math.sin(rotation) + dy * Math.cos(rotation);
      const nextWidth = Math.max(deskMinWidth, Math.abs(localX) * 2 / metrics.scaleX);
      const nextHeight = Math.max(deskMinHeight, Math.abs(localY) * 2 / metrics.scaleY);
      updateDeskDimensionsLocal(desk.id, nextWidth, nextHeight);
    }
    if (deskEditState.transformMode === "rotate") {
      const angle = Math.atan2(point.y - desk.y, point.x - desk.x);
      const rotationDeg = ((angle * 180) / Math.PI + 90 + 360) % 360;
      desk.rotation = rotationDeg;
      const group = svg.querySelector(`.space-desk[data-desk-id="${String(desk.id)}"]`);
      const deskMetrics = getDeskMetrics(svg, desk);
      updateDeskElementPosition(group, desk, deskMetrics);
    }
    return;
  }
  const desk = findDeskById(deskEditState.draggingDeskId);
  const metrics = getDeskMetrics(svg, desk);
  const rawX = point.x - deskEditState.offsetX;
  const rawY = point.y - deskEditState.offsetY;
  const clamped = clampDeskPosition(rawX, rawY, metrics);
  updateDeskPositionLocal(deskEditState.draggingDeskId, clamped.x, clamped.y);
  const moved =
    Math.abs(clamped.x - deskEditState.startX) > 0.5 || Math.abs(clamped.y - deskEditState.startY) > 0.5;
  deskEditState.hasMoved = deskEditState.hasMoved || moved;
};

const finishDeskDrag = async () => {
  const deskId = deskEditState.draggingDeskId;
  const pointerId = deskEditState.draggingPointerId;
  if (!deskId) {
    return;
  }
  const startX = deskEditState.startX;
  const startY = deskEditState.startY;
  deskEditState.draggingDeskId = null;
  deskEditState.draggingPointerId = null;
  const svg = getSnapshotSvg();
  if (svg) {
    const group = svg.querySelector(`.space-desk[data-desk-id="${String(deskId)}"]`);
    if (group) {
      group.classList.remove("is-dragging");
      if (group.releasePointerCapture && pointerId !== null) {
        group.releasePointerCapture(pointerId);
      }
    }
  }
  if (!deskEditState.hasMoved) {
    return;
  }
  deskEditState.hasMoved = false;
  const desk = findDeskById(deskId);
  if (!desk) {
    return;
  }
  try {
    const updated = await apiRequest(`/api/desks/${deskId}`, {
      method: "PUT",
      body: JSON.stringify({ x: desk.x, y: desk.y }),
    });
    if (updated) {
      const index = currentDesks.findIndex((item) => String(item.id) === String(deskId));
      if (index >= 0) {
        currentDesks[index] = updated;
        renderSpaceDesks(currentDesks);
      }
    }
  } catch (error) {
    updateDeskPositionLocal(deskId, startX, startY);
    setSpacePageStatus(error.message, "error");
  }
};

const handleDeskPointerEnd = (event) => {
  if (deskEditState.transformMode && deskEditState.transformPointerId === event.pointerId) {
    const deskId = deskEditState.selectedDeskId;
    const desk = findDeskById(deskId);
    const startWidth = deskEditState.transformStartWidth;
    const startHeight = deskEditState.transformStartHeight;
    const startRotation = deskEditState.transformStartRotation;
    const startX = deskEditState.startX;
    const startY = deskEditState.startY;
    deskEditState.transformMode = null;
    deskEditState.transformPointerId = null;
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
  if (!deskEditState.draggingDeskId || deskEditState.draggingPointerId !== event.pointerId) {
    return;
  }
  void finishDeskDrag();
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
    const spacesCount = Number.isFinite(floor.spacesCount) ? floor.spacesCount : 0;
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
    if (pageTitle) {
      pageTitle.textContent = building.name;
    }

    const floorsResponse = await apiRequest(`/api/buildings/${buildingID}/floors`);
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    const floorsWithSpaces = await Promise.all(
      floors.map(async (floor) => {
        const spacesResponse = await apiRequest(`/api/floors/${floor.id}/spaces`);
        const spaces = Array.isArray(spacesResponse.items) ? spacesResponse.items : [];
        return { ...floor, spacesCount: spaces.length };
      })
    );
    if (floorsCount) {
      floorsCount.textContent = `${floorsWithSpaces.length}`;
    }
    renderFloors(floorsWithSpaces);
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
  if (!spaceSnapshot || !spaceSnapshotPlaceholder) {
    return;
  }
  spaceSnapshot.innerHTML = "";
  const points = normalizeSpacePoints(space?.points);
  const snapshotSvg = buildSpaceSnapshotSvg(
    floorPlanMarkup || "",
    points,
    space?.color || "#60a5fa",
    space?.id || null
  );
  if (!snapshotSvg) {
    spaceSnapshotPlaceholder.classList.remove("is-hidden");
    return;
  }
  spaceSnapshotPlaceholder.classList.add("is-hidden");
  spaceSnapshot.appendChild(snapshotSvg);
  renderSpaceDesks(currentDesks);
};

const loadSpacePage = async ({ buildingID, floorNumber, spaceId }) => {
  setPageMode("space");
  clearSpacePageStatus();
  if (spaceSnapshot) {
    spaceSnapshot.innerHTML = "";
  }
  if (spaceSnapshotPlaceholder) {
    spaceSnapshotPlaceholder.classList.add("is-hidden");
  }
  currentSpace = null;
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
    setDeskPlacementActive(!isDeskPlacementActive);
  });
}

if (deleteDeskBtn) {
  deleteDeskBtn.addEventListener("click", async () => {
    if (!isSpaceEditing) {
      setSpacePageStatus("Сначала включите режим редактирования.", "error");
      return;
    }
    const deskId = deskEditState.selectedDeskId;
    if (!deskId) {
      setSpacePageStatus("Выберите стол для удаления.", "error");
      return;
    }
    if (!window.confirm("Удалить стол?")) {
      return;
    }
    deleteDeskBtn.disabled = true;
    try {
      await apiRequest(`/api/desks/${deskId}`, { method: "DELETE" });
      currentDesks = currentDesks.filter((desk) => String(desk.id) !== String(deskId));
      pendingDeskUpdates.delete(String(deskId));
      renderSpaceDesks(currentDesks);
      setSelectedDesk(null);
      setSpacePageStatus("Стол удален.", "success");
    } catch (error) {
      setSpacePageStatus(error.message, "error");
    } finally {
      deleteDeskBtn.disabled = false;
    }
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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
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

init();
